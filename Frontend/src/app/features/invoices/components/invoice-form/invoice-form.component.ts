import { Component, OnInit, OnDestroy, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { SupplierService } from '../../../suppliers/services/supplier.service';
import { ItemService } from '../../../items/services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice, InvoiceItem } from '../../models/invoice.model';

export interface InvoiceFormData {
  mode: 'create' | 'edit' | 'view';
  type: 'sales' | 'purchase';
  invoice?: Invoice;
}

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  invoiceForm!: FormGroup;
  loading = false;
  saving = false;
  mode: 'create' | 'edit' | 'view' = 'create';
  type: 'sales' | 'purchase' = 'sales';

  customers: any[] = [];
  suppliers: any[] = [];
  items: any[] = [];
  filteredItems: any[] = [];

  displayedColumns = ['item', 'quantity', 'rate', 'discount', 'tax', 'total', 'actions'];

  private destroy$ = new Subject<void>();
  private itemSearch$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private itemService: ItemService,
    private toastService: ToastService,
    @Optional() public dialogRef: MatDialogRef<InvoiceFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: InvoiceFormData
  ) {
    if (data) {
      this.mode = data.mode;
      this.type = data.type;
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupItemSearch();
    
    if (this.data?.invoice && this.mode !== 'create') {
      this.populateForm(this.data.invoice);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.invoiceForm = this.fb.group({
      customerId: [null, this.type === 'sales' ? Validators.required : null],
      supplierId: [null, this.type === 'purchase' ? Validators.required : null],
      invoiceDate: [new Date(), Validators.required],
      dueDate: [this.getDefaultDueDate(), Validators.required],
      supplierBillNo: [''],
      notes: [''],
      items: this.fb.array([], Validators.minLength(1))
    });
  }

  private getDefaultDueDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  get itemsArray(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  private createItemGroup(item?: InvoiceItem): FormGroup {
    return this.fb.group({
      itemId: [item?.itemId || '', Validators.required],
      itemName: [item?.itemName || ''],
      itemCode: [item?.itemCode || ''],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      discount: [item?.discount || 0, [Validators.min(0)]],
      taxAmount: [item?.taxAmount || 0],
      gstRate: [item?.gstRate || 0],
      lineTotal: [item?.lineTotal || 0],
      batchNumber: [''],
      expiryDate: [null],
      warehouseId: ['']
    });
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
    this.calculateTotals();
  }

  onItemSelected(event: any, index: number): void {
    const item = event.option?.value;
    if (item) {
      const itemGroup = this.itemsArray.at(index);
      itemGroup.patchValue({
        itemId: item._id,
        itemName: item.name,
        itemCode: item.code,
        unitPrice: this.type === 'sales' ? item.pricing?.salePrice : item.pricing?.costPrice,
        gstRate: item.tax?.gstRate || 0
      });
      this.calculateLineTotal(index);
    }
  }

  calculateLineTotal(index: number): void {
    const itemGroup = this.itemsArray.at(index);
    const quantity = itemGroup.get('quantity')?.value || 0;
    const unitPrice = itemGroup.get('unitPrice')?.value || 0;
    const discount = itemGroup.get('discount')?.value || 0;
    const gstRate = itemGroup.get('gstRate')?.value || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (gstRate / 100);
    const lineTotal = taxableAmount + taxAmount;

    itemGroup.patchValue({
      taxAmount: Math.round(taxAmount * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100
    });

    this.calculateTotals();
  }

  calculateTotals(): { subtotal: number; totalDiscount: number; totalTax: number; grandTotal: number } {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    this.itemsArray.controls.forEach(control => {
      const quantity = control.get('quantity')?.value || 0;
      const unitPrice = control.get('unitPrice')?.value || 0;
      const discount = control.get('discount')?.value || 0;
      const taxAmount = control.get('taxAmount')?.value || 0;

      const lineSubtotal = quantity * unitPrice;
      const lineDiscount = lineSubtotal * (discount / 100);

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalTax += taxAmount;
    });

    const grandTotal = subtotal - totalDiscount + totalTax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  }

  private loadData(): void {
    this.loading = true;

    if (this.type === 'sales') {
      this.customerService.getCustomers({ isActive: true, limit: 100 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.customers = response.data || [];
          }
        });
    } else {
      this.supplierService.getSuppliers({ isActive: true, limit: 100 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.suppliers = response.data || [];
          }
        });
    }

    this.itemService.getItems({ isActive: true, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.items = response.data || [];
          this.filteredItems = this.items;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  private setupItemSearch(): void {
    this.itemSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        if (!term) {
          this.filteredItems = this.items;
        } else {
          const lowerTerm = term.toLowerCase();
          this.filteredItems = this.items.filter(item =>
            item.name?.toLowerCase().includes(lowerTerm) ||
            item.code?.toLowerCase().includes(lowerTerm)
          );
        }
      });
  }

  onItemSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.itemSearch$.next(value);
  }

  displayItem(item: any): string {
    return item ? `${item.code} - ${item.name}` : '';
  }

  private populateForm(invoice: Invoice): void {
    this.invoiceForm.patchValue({
      customerId: invoice.customerId,
      supplierId: invoice.supplierId,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: new Date(invoice.dueDate),
      supplierBillNo: invoice.supplierBillNo,
      notes: invoice.notes
    });

    this.itemsArray.clear();
    invoice.items?.forEach(item => {
      this.itemsArray.push(this.createItemGroup(item));
    });
  }

  save(): void {
    if (this.invoiceForm.invalid || this.itemsArray.length === 0) {
      this.toastService.error('Please fill all required fields and add at least one item');
      return;
    }

    this.saving = true;
    const formValue = this.invoiceForm.value;
    const totals = this.calculateTotals();

    const invoiceData = {
      ...formValue,
      type: this.type,
      totals,
      items: formValue.items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        gstRate: item.gstRate,
        batchInfo: item.batchNumber ? {
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate
        } : undefined,
        warehouseId: item.warehouseId || undefined
      }))
    };

    const request$ = this.type === 'sales'
      ? (this.mode === 'create'
        ? this.invoiceService.createSalesInvoice(invoiceData)
        : this.invoiceService.updateSalesInvoice(this.data.invoice!._id, invoiceData))
      : (this.mode === 'create'
        ? this.invoiceService.createPurchaseInvoice(invoiceData)
        : this.invoiceService.updatePurchaseInvoice(this.data.invoice!._id, invoiceData));

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          this.toastService.success(`Invoice ${this.mode === 'create' ? 'created' : 'updated'} successfully`);
          this.dialogRef?.close(response.data);
        }
      },
      error: (error) => {
        this.saving = false;
        this.toastService.error(error.message || 'Failed to save invoice');
      }
    });
  }

  cancel(): void {
    this.dialogRef?.close();
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'PKR 0';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  }
}
