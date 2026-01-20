import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { CashBookService } from '../services/cashbook.service';
import { CustomerService } from '../../customers/services/customer.service';
import { SupplierService } from '../../suppliers/services/supplier.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CashReceipt, CashPayment, CashBookQueryParams } from '../models/cashbook.model';

@Component({
  selector: 'app-cashbook',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatCardModule
  ],
  templateUrl: './cashbook.component.html',
  styleUrls: ['./cashbook.component.scss']
})
export class CashBookComponent implements OnInit, OnDestroy {
  activeTab = 0;
  
  receiptColumns = ['receiptNumber', 'receiptDate', 'customerName', 'amount', 'paymentMethod', 'status', 'actions'];
  paymentColumns = ['paymentNumber', 'paymentDate', 'supplierName', 'amount', 'paymentMethod', 'status', 'actions'];
  
  receiptsDataSource = new MatTableDataSource<CashReceipt>([]);
  paymentsDataSource = new MatTableDataSource<CashPayment>([]);
  
  loading = false;
  showReceiptForm = false;
  showPaymentForm = false;
  editingReceipt: CashReceipt | null = null;
  editingPayment: CashPayment | null = null;
  
  receiptForm!: FormGroup;
  paymentForm!: FormGroup;
  
  customers: any[] = [];
  suppliers: any[] = [];
  
  searchControl = new FormControl('');
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  selectedStatus = '';
  
  totalReceipts = 0;
  totalPayments = 0;
  pageSize = 10;
  pageIndex = 0;
  
  summary = {
    balance: 0,
    todayReceipts: 0,
    todayPayments: 0,
    pendingCheques: 0
  };
  
  paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'online', label: 'Online' }
  ];
  
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'cleared', label: 'Cleared' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cashBookService: CashBookService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadData();
    this.loadCustomers();
    this.loadSuppliers();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.receiptForm = this.fb.group({
      customerId: ['', Validators.required],
      receiptDate: [new Date(), Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      paymentMethod: ['cash', Validators.required],
      postDatedCheque: [false],
      bankDetails: this.fb.group({
        bankName: [''],
        chequeNumber: [''],
        chequeDate: [null],
        accountNumber: ['']
      }),
      notes: ['']
    });

    this.paymentForm = this.fb.group({
      supplierId: ['', Validators.required],
      paymentDate: [new Date(), Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      paymentMethod: ['cash', Validators.required],
      bankDetails: this.fb.group({
        bankName: [''],
        chequeNumber: [''],
        accountNumber: ['']
      }),
      notes: ['']
    });
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });
  }

  loadData(): void {
    this.loadReceipts();
    this.loadPayments();
    this.loadSummary();
  }

  loadReceipts(): void {
    this.loading = true;
    const params: CashBookQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };
    if (this.dateFrom) params.startDate = this.dateFrom.toISOString();
    if (this.dateTo) params.endDate = this.dateTo.toISOString();
    if (this.selectedStatus) params.status = this.selectedStatus;

    this.cashBookService.getReceipts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.receiptsDataSource.data = response.data || [];
          this.totalReceipts = response.pagination?.totalItems || 0;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toastService.error('Failed to load receipts');
        }
      });
  }

  loadPayments(): void {
    const params: CashBookQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };
    if (this.dateFrom) params.startDate = this.dateFrom.toISOString();
    if (this.dateTo) params.endDate = this.dateTo.toISOString();
    if (this.selectedStatus) params.status = this.selectedStatus;

    this.cashBookService.getPayments(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.paymentsDataSource.data = response.data || [];
          this.totalPayments = response.pagination?.totalItems || 0;
        },
        error: () => {
          this.toastService.error('Failed to load payments');
        }
      });
  }

  loadSummary(): void {
    this.cashBookService.getCashBookBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.summary.balance = response.data?.balance || 0;
          }
        }
      });

    this.cashBookService.getReceiptStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.summary.todayReceipts = response.data.todayTotal || 0;
            this.summary.pendingCheques = response.data.pendingCheques || 0;
          }
        }
      });

    this.cashBookService.getPaymentStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.summary.todayPayments = response.data.todayTotal || 0;
          }
        }
      });
  }

  loadCustomers(): void {
    this.customerService.getCustomers({ isActive: true, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.customers = response.data || [];
        }
      });
  }

  loadSuppliers(): void {
    this.supplierService.getSuppliers({ isActive: true, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.suppliers = response.data || [];
        }
      });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.dateFrom = null;
    this.dateTo = null;
    this.selectedStatus = '';
    this.pageIndex = 0;
    this.loadData();
  }

  openReceiptForm(receipt?: CashReceipt): void {
    this.editingReceipt = receipt || null;
    if (receipt) {
      this.receiptForm.patchValue({
        customerId: receipt.customerId,
        receiptDate: new Date(receipt.receiptDate),
        amount: receipt.amount,
        paymentMethod: receipt.paymentMethod,
        postDatedCheque: receipt.postDatedCheque,
        bankDetails: receipt.bankDetails,
        notes: receipt.notes
      });
    } else {
      this.receiptForm.reset({
        receiptDate: new Date(),
        paymentMethod: 'cash',
        postDatedCheque: false
      });
    }
    this.showReceiptForm = true;
  }

  openPaymentForm(payment?: CashPayment): void {
    this.editingPayment = payment || null;
    if (payment) {
      this.paymentForm.patchValue({
        supplierId: payment.supplierId,
        paymentDate: new Date(payment.paymentDate),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        bankDetails: payment.bankDetails,
        notes: payment.notes
      });
    } else {
      this.paymentForm.reset({
        paymentDate: new Date(),
        paymentMethod: 'cash'
      });
    }
    this.showPaymentForm = true;
  }

  saveReceipt(): void {
    if (this.receiptForm.invalid) {
      this.toastService.error('Please fill all required fields');
      return;
    }

    const formValue = this.receiptForm.value;
    const request$ = this.editingReceipt
      ? this.cashBookService.updateReceipt(this.editingReceipt._id, formValue)
      : this.cashBookService.createReceipt(formValue);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(`Receipt ${this.editingReceipt ? 'updated' : 'created'} successfully`);
          this.showReceiptForm = false;
          this.editingReceipt = null;
          this.loadData();
        }
      },
      error: (error) => {
        this.toastService.error(error.message || 'Failed to save receipt');
      }
    });
  }

  savePayment(): void {
    if (this.paymentForm.invalid) {
      this.toastService.error('Please fill all required fields');
      return;
    }

    const formValue = this.paymentForm.value;
    const request$ = this.editingPayment
      ? this.cashBookService.updatePayment(this.editingPayment._id, formValue)
      : this.cashBookService.createPayment(formValue);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(`Payment ${this.editingPayment ? 'updated' : 'created'} successfully`);
          this.showPaymentForm = false;
          this.editingPayment = null;
          this.loadData();
        }
      },
      error: (error) => {
        this.toastService.error(error.message || 'Failed to save payment');
      }
    });
  }

  clearReceipt(receipt: CashReceipt): void {
    this.cashBookService.clearReceipt(receipt._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Receipt cleared');
            this.loadData();
          }
        },
        error: () => this.toastService.error('Failed to clear receipt')
      });
  }

  async cancelReceipt(receipt: CashReceipt): Promise<void> {
    const confirmed = await this.toastService.confirm('Cancel this receipt?', 'Confirm', 'Yes', 'No');
    if (!confirmed) return;

    this.cashBookService.cancelReceipt(receipt._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Receipt cancelled');
            this.loadData();
          }
        },
        error: () => this.toastService.error('Failed to cancel receipt')
      });
  }

  clearPayment(payment: CashPayment): void {
    this.cashBookService.clearPayment(payment._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Payment cleared');
            this.loadData();
          }
        },
        error: () => this.toastService.error('Failed to clear payment')
      });
  }

  async cancelPayment(payment: CashPayment): Promise<void> {
    const confirmed = await this.toastService.confirm('Cancel this payment?', 'Confirm', 'Yes', 'No');
    if (!confirmed) return;

    this.cashBookService.cancelPayment(payment._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Payment cancelled');
            this.loadData();
          }
        },
        error: () => this.toastService.error('Failed to cancel payment')
      });
  }

  cancelForm(): void {
    this.showReceiptForm = false;
    this.showPaymentForm = false;
    this.editingReceipt = null;
    this.editingPayment = null;
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadData();
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': 'accent',
      'cleared': 'primary',
      'cancelled': 'warn'
    };
    return colors[status] || '';
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return 'PKR 0';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK');
  }
}
