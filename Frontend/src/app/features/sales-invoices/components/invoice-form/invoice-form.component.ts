/**
 * Invoice Form Component
 * 
 * This component handles creating and editing sales invoices with comprehensive
 * form validation, real-time calculations, and dynamic item management.
 */

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map, switchMap } from 'rxjs/operators';

import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { InvoiceCalculationService } from '../../services/invoice-calculation.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { ToastService } from '../../../../shared/services/toast.service';

import {
    SalesInvoice,
    CreateInvoiceRequest,
    UpdateInvoiceRequest,
    InvoiceItem,
    InvoiceTotals,
    InvoiceStatus,
    DiscountType,
    Item,
    Warehouse,
    Salesman
} from '../../models';
import { Customer } from '../../../../core/models/customer.model';

@Component({
    selector: 'app-invoice-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatTableModule,
        MatTooltipModule,
        MatDividerModule,
        MatSlideToggleModule
    ],
    templateUrl: './invoice-form.component.html',
    styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
    @Input() invoice: SalesInvoice | null = null;
    @Input() isEditMode = false;
    @Output() formSubmit = new EventEmitter<CreateInvoiceRequest | UpdateInvoiceRequest>();
    @Output() formCancel = new EventEmitter<void>();
    @Output() draftSave = new EventEmitter<CreateInvoiceRequest | UpdateInvoiceRequest>();
    @Output() formSuccess = new EventEmitter<SalesInvoice>();
    @Output() formError = new EventEmitter<string>();

    invoiceForm!: FormGroup;
    totals$ = new BehaviorSubject<InvoiceTotals>({
        subtotal: 0,
        discountAmount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        whtAmount: 0,
        grandTotal: 0
    });

    // Loading states
    loading = false;
    saving = false;
    loadingCustomers = false;
    loadingItems = false;
    loadingWarehouses = false;
    loadingSalesmen = false;

    // Autocomplete observables
    filteredCustomers$!: Observable<Customer[]>;
    filteredItems$!: Observable<Item[]>;
    filteredWarehouses$!: Observable<Warehouse[]>;
    filteredSalesmen$!: Observable<Salesman[]>;

    // Data arrays
    customers: Customer[] = [];
    items: Item[] = [];
    warehouses: Warehouse[] = [];
    salesmen: Salesman[] = [];

    // Form validation
    formErrors: { [key: string]: string } = {};
    itemErrors: { [key: number]: { [key: string]: string } } = {};

    // Enums for template
    DiscountType = DiscountType;
    InvoiceStatus = InvoiceStatus;

    // Table columns for items
    itemColumns = ['item', 'quantity', 'unitPrice', 'discount', 'total', 'actions'];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private salesInvoiceService: SalesInvoiceService,
        private calculationService: InvoiceCalculationService,
        private customerService: CustomerService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.initializeForm();
        this.loadInitialData();
        this.setupFormSubscriptions();
        this.setupAutocomplete();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize the reactive form with validation
     */
    private initializeForm(): void {
        this.invoiceForm = this.fb.group({
            customerId: ['', [Validators.required], [this.customerExistsValidator.bind(this)]],
            customerSearch: [''],
            invoiceDate: [new Date(), [Validators.required]],
            dueDate: ['', [Validators.required]],
            warehouseId: ['', [Validators.required]],
            salesmanId: [''],
            items: this.fb.array([], [Validators.required, this.minItemsValidator]),
            notes: [''],
            discountType: [DiscountType.PERCENTAGE],
            discountValue: [0, [Validators.min(0)]],
            previousBalance: [0, [Validators.min(0)]]
        });

        // Add custom validators
        this.invoiceForm.get('discountValue')?.addValidators([this.discountValidator.bind(this)]);
        this.invoiceForm.get('dueDate')?.addValidators([this.dueDateValidator.bind(this)]);

        // Pre-populate form if editing
        if (this.isEditMode && this.invoice) {
            this.populateFormForEdit();
        } else {
            // Add initial empty item for new invoice
            this.addItem();
        }
    }

    /**
     * Load initial data for dropdowns
     */
    private loadInitialData(): void {
        // Load customers
        this.loadingCustomers = true;
        this.customerService.getCustomers({ limit: 100, isActive: true })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.customers = response.data;
                    }
                    this.loadingCustomers = false;
                },
                error: (error) => {
                    console.error('Failed to load customers:', error);
                    this.loadingCustomers = false;
                }
            });

        // TODO: Load items, warehouses, and salesmen when services are available
        // For now, using mock data
        this.items = this.getMockItems();
        this.warehouses = this.getMockWarehouses();
        this.salesmen = this.getMockSalesmen();
    }

    /**
     * Setup form subscriptions for real-time calculations
     */
    private setupFormSubscriptions(): void {
        // Subscribe to form changes for real-time calculations
        this.invoiceForm.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(() => {
                this.calculateTotals();
                this.validateForm();
                this.validateCustomerCredit(); // Real-time credit validation
            });

        // Subscribe to customer selection changes
        this.invoiceForm.get('customerId')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((customerId) => {
                if (customerId) {
                    this.onCustomerSelected(customerId);
                }
            });

        // Subscribe to items array changes
        this.itemsFormArray.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                debounceTime(200)
            )
            .subscribe(() => {
                this.calculateTotals();
                this.validateItems();
            });

        // Subscribe to totals changes for additional validations
        this.totals$.pipe(
            takeUntil(this.destroy$),
            debounceTime(100)
        ).subscribe((totals) => {
            // Perform any additional validations based on totals
            this.validateInvoiceTotals(totals);
        });
    }

    /**
     * Setup autocomplete functionality
     */
    private setupAutocomplete(): void {
        // Customer autocomplete
        this.filteredCustomers$ = this.invoiceForm.get('customerSearch')!.valueChanges
            .pipe(
                startWith(''),
                debounceTime(300),
                distinctUntilChanged(),
                map(value => this.filterCustomers(value || ''))
            );

        // Items autocomplete will be setup per item row
        this.filteredItems$ = new Observable(observer => {
            observer.next(this.items);
        });

        this.filteredWarehouses$ = new Observable(observer => {
            observer.next(this.warehouses);
        });

        this.filteredSalesmen$ = new Observable(observer => {
            observer.next(this.salesmen);
        });
    }

    /**
     * Get items form array
     */
    get itemsFormArray(): FormArray {
        return this.invoiceForm.get('items') as FormArray;
    }

    /**
     * Add new item to the form array
     */
    addItem(): void {
        const itemGroup = this.fb.group({
            itemId: ['', [Validators.required]],
            itemSearch: [''],
            quantity: [1, [Validators.required, Validators.min(0.01)]],
            unitPrice: [0, [Validators.required, Validators.min(0.01)]],
            discount: [0, [Validators.min(0)]],
            discountType: [DiscountType.PERCENTAGE],
            batchNumber: [''],
            expiryDate: [''],
            notes: ['']
        });

        // Add custom validators
        itemGroup.get('discount')?.addValidators([this.itemDiscountValidator.bind(this)]);

        this.itemsFormArray.push(itemGroup);

        // Setup item-specific subscriptions
        this.setupItemSubscriptions(this.itemsFormArray.length - 1);
    }

    /**
     * Remove item from form array
     */
    removeItem(index: number): void {
        if (this.itemsFormArray.length > 1) {
            this.itemsFormArray.removeAt(index);
            delete this.itemErrors[index];
            this.calculateTotals();
        }
    }

    /**
     * Setup subscriptions for individual item
     */
    private setupItemSubscriptions(index: number): void {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;

        // Subscribe to item selection
        itemGroup.get('itemId')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((itemId) => {
                if (itemId) {
                    this.onItemSelected(index, itemId);
                }
            });

        // Subscribe to quantity and price changes
        combineLatest([
            itemGroup.get('quantity')!.valueChanges.pipe(startWith(itemGroup.get('quantity')?.value)),
            itemGroup.get('unitPrice')!.valueChanges.pipe(startWith(itemGroup.get('unitPrice')?.value)),
            itemGroup.get('discount')!.valueChanges.pipe(startWith(itemGroup.get('discount')?.value)),
            itemGroup.get('discountType')!.valueChanges.pipe(startWith(itemGroup.get('discountType')?.value))
        ])
            .pipe(
                takeUntil(this.destroy$),
                debounceTime(200)
            )
            .subscribe(() => {
                this.calculateItemTotal(index);
            });
    }

    /**
     * Handle customer selection
     */
    onCustomerSelected(customerId: string): void {
        const customer = this.customers.find(c => c._id === customerId);
        if (customer) {
            // Update customer search display
            this.invoiceForm.get('customerSearch')?.setValue(customer.name, { emitEvent: false });

            // Set due date based on customer payment terms (default 30 days)
            this.updateDueDateFromCustomer(customer);

            // Set previous balance
            this.invoiceForm.get('previousBalance')?.setValue(customer.currentBalance || 0, { emitEvent: false });

            // Validate credit limit
            setTimeout(() => this.validateCustomerCredit(), 100); // Allow form to update first
        }
    }

    /**
     * Handle item selection
     */
    onItemSelected(index: number, itemId: string): void {
        const item = this.items.find(i => i._id === itemId);
        if (item) {
            const itemGroup = this.itemsFormArray.at(index) as FormGroup;

            // Update item search display
            itemGroup.get('itemSearch')?.setValue(`${item.name} (${item.code})`, { emitEvent: false });

            // Set unit price from item
            itemGroup.get('unitPrice')?.setValue(item.sellingPrice, { emitEvent: false });

            // Set default discount if item has special pricing
            const defaultDiscount = (item as any).defaultDiscount || 0;
            if (defaultDiscount > 0) {
                itemGroup.get('discount')?.setValue(defaultDiscount, { emitEvent: false });
                itemGroup.get('discountType')?.setValue(DiscountType.PERCENTAGE, { emitEvent: false });
            }

            // Check if item requires batch tracking
            if (this.itemRequiresBatch(item)) {
                this.showBatchFields(index, true);
            } else {
                this.showBatchFields(index, false);
            }

            // Validate item availability
            this.validateItemAvailability(index, item);

            // Calculate item total
            this.calculateItemTotal(index);
        }
    }

    /**
     * Check if item requires batch tracking
     */
    private itemRequiresBatch(item: Item): boolean {
        // Items in certain categories might require batch tracking
        const batchRequiredCategories = ['Medicine', 'Supplement', 'Vaccine'];
        return batchRequiredCategories.includes(item.category) || (item as any).requiresBatch === true;
    }

    /**
     * Show/hide batch fields for item
     */
    private showBatchFields(index: number, show: boolean): void {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;

        if (show) {
            // Make batch fields required if needed
            itemGroup.get('batchNumber')?.setValidators([Validators.required]);
            itemGroup.get('expiryDate')?.setValidators([Validators.required]);
        } else {
            // Remove validators and clear values
            itemGroup.get('batchNumber')?.clearValidators();
            itemGroup.get('expiryDate')?.clearValidators();
            itemGroup.get('batchNumber')?.setValue('');
            itemGroup.get('expiryDate')?.setValue('');
        }

        itemGroup.get('batchNumber')?.updateValueAndValidity();
        itemGroup.get('expiryDate')?.updateValueAndValidity();

        // Store batch requirement flag for template
        (itemGroup as any)._requiresBatch = show;
    }

    /**
     * Validate item availability in selected warehouse
     */
    private validateItemAvailability(index: number, item: Item): void {
        const warehouseId = this.invoiceForm.get('warehouseId')?.value;
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;

        if (warehouseId && item) {
            // TODO: Call actual inventory service to check availability
            // For now, using mock availability check
            const mockAvailableQuantity = this.getMockItemAvailability(item._id, warehouseId);

            // Store available quantity for validation
            (itemGroup as any)._availableQuantity = mockAvailableQuantity;

            // Add quantity validator based on availability
            const quantityControl = itemGroup.get('quantity');
            if (quantityControl) {
                quantityControl.setValidators([
                    Validators.required,
                    Validators.min(0.01),
                    this.quantityAvailabilityValidator.bind(this, mockAvailableQuantity)
                ]);
                quantityControl.updateValueAndValidity();
            }

            // Show availability info
            if (mockAvailableQuantity <= 0) {
                this.itemErrors[index] = this.itemErrors[index] || {};
                this.itemErrors[index]['availability'] = 'Item is out of stock';
            } else if (mockAvailableQuantity < 10) {
                // Show low stock warning
                console.warn(`Low stock for ${item.name}: ${mockAvailableQuantity} remaining`);
            }
        }
    }

    /**
     * Get mock item availability (to be replaced with actual service call)
     */
    private getMockItemAvailability(itemId: string, warehouseId: string): number {
        // Mock availability data
        const mockAvailability: { [key: string]: { [key: string]: number } } = {
            '1': { '1': 100, '2': 50 }, // Item 1 availability in warehouses
            '2': { '1': 25, '2': 75 },  // Item 2 availability in warehouses
            '3': { '1': 200, '2': 150 } // Item 3 availability in warehouses
        };

        return mockAvailability[itemId]?.[warehouseId] || 0;
    }

    /**
     * Check if item requires batch for template
     */
    itemRequiresBatchDisplay(index: number): boolean {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        return (itemGroup as any)._requiresBatch || false;
    }

    /**
     * Get available quantity for item display
     */
    getItemAvailableQuantity(index: number): number {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        return (itemGroup as any)._availableQuantity || 0;
    }

    /**
     * Duplicate item row
     */
    duplicateItem(index: number): void {
        const sourceGroup = this.itemsFormArray.at(index) as FormGroup;
        const sourceValue = sourceGroup.value;

        // Create new item with same values but reset quantity
        const newItemGroup = this.fb.group({
            itemId: [sourceValue.itemId, [Validators.required]],
            itemSearch: [sourceValue.itemSearch],
            quantity: [1, [Validators.required, Validators.min(0.01)]],
            unitPrice: [sourceValue.unitPrice, [Validators.required, Validators.min(0.01)]],
            discount: [sourceValue.discount, [Validators.min(0)]],
            discountType: [sourceValue.discountType],
            batchNumber: [''], // Reset batch info
            expiryDate: [''],
            notes: [sourceValue.notes]
        });

        // Add custom validators
        newItemGroup.get('discount')?.addValidators([this.itemDiscountValidator.bind(this)]);

        this.itemsFormArray.insert(index + 1, newItemGroup);

        // Setup subscriptions for new item
        this.setupItemSubscriptions(index + 1);

        // If original item required batch, set up batch requirements for new item
        if ((sourceGroup as any)._requiresBatch) {
            this.showBatchFields(index + 1, true);
        }
    }

    /**
     * Move item up in the list
     */
    moveItemUp(index: number): void {
        if (index > 0) {
            const item = this.itemsFormArray.at(index);
            this.itemsFormArray.removeAt(index);
            this.itemsFormArray.insert(index - 1, item);
        }
    }

    /**
     * Move item down in the list
     */
    moveItemDown(index: number): void {
        if (index < this.itemsFormArray.length - 1) {
            const item = this.itemsFormArray.at(index);
            this.itemsFormArray.removeAt(index);
            this.itemsFormArray.insert(index + 1, item);
        }
    }

    /**
     * Calculate totals for individual item
     */
    calculateItemTotal(index: number): void {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        const itemData = itemGroup.value;

        if (itemData.quantity && itemData.unitPrice) {
            const item = this.items.find(i => i._id === itemData.itemId);
            const itemWithDetails = {
                ...itemData,
                item,
                quantity: Number(itemData.quantity),
                unitPrice: Number(itemData.unitPrice),
                discount: Number(itemData.discount || 0)
            };

            const total = this.calculationService.calculateItemTotal(itemWithDetails);

            // Store calculated total and individual components for display
            (itemGroup as any)._calculatedTotal = total;
            (itemGroup as any)._subtotal = itemData.quantity * itemData.unitPrice;
            (itemGroup as any)._discountAmount = this.calculationService.calculateItemDiscount(
                itemData.quantity * itemData.unitPrice,
                itemData.discount || 0,
                itemData.discountType || DiscountType.PERCENTAGE
            );
            (itemGroup as any)._taxAmount = this.calculationService.calculateItemTax(
                (itemData.quantity * itemData.unitPrice) - (itemGroup as any)._discountAmount,
                itemWithDetails
            );
        } else {
            // Reset calculated values if required fields are empty
            (itemGroup as any)._calculatedTotal = 0;
            (itemGroup as any)._subtotal = 0;
            (itemGroup as any)._discountAmount = 0;
            (itemGroup as any)._taxAmount = 0;
        }
    }

    /**
     * Calculate invoice totals
     */
    private calculateTotals(): void {
        const formValue = this.invoiceForm.value;
        const items = formValue.items || [];

        // Convert form items to calculation format with proper type conversion
        const calculationItems = items.map((item: any) => {
            const itemDetails = this.items.find(i => i._id === item.itemId);
            return {
                ...item,
                item: itemDetails,
                quantity: Number(item.quantity || 0),
                unitPrice: Number(item.unitPrice || 0),
                discount: Number(item.discount || 0),
                discountType: item.discountType || DiscountType.PERCENTAGE
            };
        }).filter((item: any) => item.quantity > 0 && item.unitPrice > 0); // Only include valid items

        const totals = this.calculationService.calculateInvoiceTotals(
            calculationItems,
            formValue.discountType || DiscountType.PERCENTAGE,
            Number(formValue.discountValue || 0)
        );

        // Add previous balance to create total balance
        const previousBalance = Number(formValue.previousBalance || 0);
        const totalBalance = this.calculationService.calculateTotalBalance(totals.grandTotal, previousBalance);

        // Emit updated totals with additional balance information
        this.totals$.next({
            ...totals,
            totalBalance,
            previousBalance
        } as any);
    }

    /**
     * Get calculated total for item display
     */
    getItemTotal(index: number): number {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        return (itemGroup as any)._calculatedTotal || 0;
    }

    /**
     * Get item subtotal (before discount and tax)
     */
    getItemSubtotal(index: number): number {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        return (itemGroup as any)._subtotal || 0;
    }

    /**
     * Get item discount amount
     */
    getItemDiscountAmount(index: number): number {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        return (itemGroup as any)._discountAmount || 0;
    }

    /**
     * Get item tax amount
     */
    getItemTaxAmount(index: number): number {
        const itemGroup = this.itemsFormArray.at(index) as FormGroup;
        return (itemGroup as any)._taxAmount || 0;
    }

    /**
     * Validate customer credit limit in real-time
     */
    private validateCustomerCredit(): void {
        const customerId = this.invoiceForm.get('customerId')?.value;
        const customer = this.customers.find(c => c._id === customerId);

        if (customer) {
            const currentTotals = this.totals$.value;
            const creditValidation = this.calculationService.validateCustomerCredit(
                customerId,
                customer.creditLimit || 0,
                customer.currentBalance || 0,
                currentTotals.grandTotal,
                (customer as any).paymentTerms
            );

            if (!creditValidation.isValid) {
                // Show credit limit warning
                this.formErrors['creditLimit'] = creditValidation.errors.join(', ');
            } else {
                delete this.formErrors['creditLimit'];
            }

            if (creditValidation.warnings.length > 0) {
                // Show warnings but don't prevent submission
                console.warn('Customer credit warnings:', creditValidation.warnings);
            }
        }
    }

    /**
     * Update due date based on customer payment terms
     */
    private updateDueDateFromCustomer(customer: Customer): void {
        const invoiceDate = this.invoiceForm.get('invoiceDate')?.value;
        if (invoiceDate && customer) {
            const paymentTerms = (customer as any).paymentTerms || 30;
            const dueDate = this.calculationService.calculateDueDate(invoiceDate, paymentTerms);
            this.invoiceForm.get('dueDate')?.setValue(dueDate, { emitEvent: false });
        }
    }

    /**
     * Validate invoice totals for business rules
     */
    private validateInvoiceTotals(totals: InvoiceTotals): void {
        // Check for minimum invoice amount (if required)
        const minInvoiceAmount = 0; // Can be configured
        if (totals.grandTotal < minInvoiceAmount) {
            this.formErrors['minAmount'] = `Invoice amount must be at least ${minInvoiceAmount}`;
        } else {
            delete this.formErrors['minAmount'];
        }

        // Check for maximum invoice amount (if required)
        const maxInvoiceAmount = 1000000; // Can be configured
        if (totals.grandTotal > maxInvoiceAmount) {
            this.formErrors['maxAmount'] = `Invoice amount cannot exceed ${maxInvoiceAmount}`;
        } else {
            delete this.formErrors['maxAmount'];
        }

        // Validate discount percentage doesn't exceed 100%
        if (totals.subtotal > 0) {
            const discountPercentage = (totals.discountAmount / totals.subtotal) * 100;
            if (discountPercentage > 100) {
                this.formErrors['discountExceeded'] = 'Total discount cannot exceed 100%';
            } else {
                delete this.formErrors['discountExceeded'];
            }
        }
    }

    /**
     * Filter customers for autocomplete
     */
    private filterCustomers(value: string): Customer[] {
        const filterValue = value.toLowerCase();
        return this.customers.filter(customer =>
            customer.name.toLowerCase().includes(filterValue) ||
            customer.code.toLowerCase().includes(filterValue)
        );
    }

    /**
     * Filter items for autocomplete
     */
    filterItems(value: string): Item[] {
        const filterValue = value.toLowerCase();
        return this.items.filter(item =>
            item.name.toLowerCase().includes(filterValue) ||
            item.code.toLowerCase().includes(filterValue)
        );
    }

    /**
     * Display function for customer autocomplete
     */
    displayCustomer(customer: Customer): string {
        return customer ? `${customer.name} (${customer.code})` : '';
    }

    /**
     * Display function for item autocomplete
     */
    displayItem(item: Item): string {
        return item ? `${item.name} (${item.code})` : '';
    }

    /**
     * Populate form for editing
     */
    private populateFormForEdit(): void {
        if (!this.invoice) return;

        this.invoiceForm.patchValue({
            customerId: this.invoice.customerId,
            invoiceDate: new Date(this.invoice.invoiceDate),
            dueDate: new Date(this.invoice.dueDate),
            warehouseId: this.invoice.warehouseId,
            salesmanId: this.invoice.salesmanId,
            notes: this.invoice.notes,
            discountType: this.invoice.discountType,
            discountValue: this.invoice.discountValue,
            previousBalance: this.invoice.previousBalance
        });

        // Clear existing items and add invoice items
        this.itemsFormArray.clear();
        this.invoice.items.forEach((item, index) => {
            const itemGroup = this.fb.group({
                itemId: [item.itemId, [Validators.required]],
                itemSearch: [item.item?.name || ''],
                quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
                unitPrice: [item.unitPrice, [Validators.required, Validators.min(0.01)]],
                discount: [item.discount, [Validators.min(0)]],
                discountType: [item.discountType],
                batchNumber: [item.batchInfo?.batchNumber || ''],
                expiryDate: [item.batchInfo?.expiryDate || ''],
                notes: [item.notes || '']
            });

            this.itemsFormArray.push(itemGroup);
            this.setupItemSubscriptions(index);
        });

        // Set customer search display
        if (this.invoice.customer) {
            this.invoiceForm.get('customerSearch')?.setValue(this.invoice.customer.name);
        }
    }

    /**
     * Validate entire form
     */
    private validateForm(): void {
        this.formErrors = {};

        // Validate main form fields
        Object.keys(this.invoiceForm.controls).forEach(key => {
            const control = this.invoiceForm.get(key);
            if (control && control.invalid && (control.dirty || control.touched)) {
                this.formErrors[key] = this.getErrorMessage(key, control.errors);
            }
        });
    }

    /**
     * Validate items array
     */
    private validateItems(): void {
        this.itemErrors = {};

        this.itemsFormArray.controls.forEach((itemGroup, index) => {
            const errors: { [key: string]: string } = {};

            Object.keys(itemGroup.value).forEach(key => {
                const control = itemGroup.get(key);
                if (control && control.invalid && (control.dirty || control.touched)) {
                    errors[key] = this.getErrorMessage(key, control.errors);
                }
            });

            if (Object.keys(errors).length > 0) {
                this.itemErrors[index] = errors;
            }
        });
    }

    /**
     * Get error message for form control
     */
    private getErrorMessage(fieldName: string, errors: any): string {
        if (errors?.required) {
            return `${this.getFieldLabel(fieldName)} is required`;
        }
        if (errors?.min) {
            return `${this.getFieldLabel(fieldName)} must be greater than ${errors.min.min}`;
        }
        if (errors?.max) {
            return `${this.getFieldLabel(fieldName)} must be less than ${errors.max.max}`;
        }
        if (errors?.email) {
            return 'Please enter a valid email address';
        }
        if (errors?.customerNotExists) {
            return 'Selected customer does not exist';
        }
        if (errors?.invalidDiscount) {
            return errors.invalidDiscount;
        }
        if (errors?.invalidDueDate) {
            return errors.invalidDueDate;
        }
        if (errors?.quantityExceeded) {
            return errors.quantityExceeded;
        }
        if (errors?.pattern) {
            return `${this.getFieldLabel(fieldName)} format is invalid`;
        }
        if (errors?.minlength) {
            return `${this.getFieldLabel(fieldName)} must be at least ${errors.minlength.requiredLength} characters`;
        }
        if (errors?.maxlength) {
            return `${this.getFieldLabel(fieldName)} cannot exceed ${errors.maxlength.requiredLength} characters`;
        }
        return 'Invalid value';
    }

    /**
     * Get field label for error messages
     */
    private getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            customerId: 'Customer',
            invoiceDate: 'Invoice Date',
            dueDate: 'Due Date',
            warehouseId: 'Warehouse',
            salesmanId: 'Salesman',
            items: 'Items',
            itemId: 'Item',
            quantity: 'Quantity',
            unitPrice: 'Unit Price',
            discount: 'Discount',
            discountValue: 'Invoice Discount'
        };
        return labels[fieldName] || fieldName;
    }

    /**
     * Submit form
     */
    onSubmit(): void {
        // Mark all fields as touched to show validation errors
        this.markFormGroupTouched(this.invoiceForm);

        // Perform comprehensive validation
        const validationResult = this.performComprehensiveValidation();

        if (validationResult.isValid) {
            this.saving = true;
            const formData = this.prepareFormData();

            // Perform final business rule validation
            const businessValidation = this.validateBusinessRules(formData);

            if (businessValidation.isValid) {
                this.formSubmit.emit(formData);
            } else {
                this.saving = false;
                this.toastService.error(businessValidation.errors.join(', '));
            }
        } else {
            this.toastService.error('Please fix form errors before submitting');

            // Scroll to first error
            this.scrollToFirstError();
        }
    }

    /**
     * Save as draft
     */
    onSaveDraft(): void {
        // Allow saving draft with minimal validation
        const formData = this.prepareFormData();

        // Only validate critical fields for draft
        const criticalValidation = this.validateCriticalFields();

        if (criticalValidation.isValid) {
            this.draftSave.emit(formData);
        } else {
            this.toastService.error(criticalValidation.errors.join(', '));
        }
    }

    /**
     * Perform comprehensive validation
     */
    private performComprehensiveValidation(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate main form
        this.validateForm();
        if (Object.keys(this.formErrors).length > 0) {
            errors.push(...Object.values(this.formErrors));
        }

        // Validate items
        this.validateItems();
        Object.values(this.itemErrors).forEach(itemError => {
            errors.push(...Object.values(itemError));
        });

        // Validate using calculation service
        const formValue = this.invoiceForm.value;
        const formData = this.prepareFormData();

        // Convert to CreateInvoiceRequest format for validation
        const validationData: CreateInvoiceRequest = {
            customerId: formData.customerId || '',
            invoiceDate: formData.invoiceDate || new Date(),
            dueDate: formData.dueDate || new Date(),
            warehouseId: formData.warehouseId || '',
            salesmanId: formData.salesmanId,
            items: formData.items || [],
            notes: formData.notes,
            discountType: formData.discountType || DiscountType.PERCENTAGE,
            discountValue: formData.discountValue || 0
        };

        const invoiceValidation = this.calculationService.validateInvoice(validationData);
        if (!invoiceValidation.isValid) {
            errors.push(...invoiceValidation.errors);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate critical fields for draft saving
     */
    private validateCriticalFields(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Customer is required even for draft
        if (!this.invoiceForm.get('customerId')?.value) {
            errors.push('Customer selection is required');
        }

        // At least one item is required
        if (this.itemsFormArray.length === 0) {
            errors.push('At least one item is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate business rules
     */
    private validateBusinessRules(formData: CreateInvoiceRequest | UpdateInvoiceRequest): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check customer credit limit
        const customerId = formData.customerId;
        const customer = this.customers.find(c => c._id === customerId);

        if (customer && customerId) {
            const totals = this.totals$.value;
            const creditValidation = this.calculationService.validateCustomerCredit(
                customerId,
                customer.creditLimit || 0,
                customer.currentBalance || 0,
                totals.grandTotal
            );

            if (!creditValidation.isValid) {
                errors.push(...creditValidation.errors);
            }
        }

        // Validate item quantities against availability
        if (formData.items) {
            formData.items.forEach((item, index) => {
                const availableQuantity = this.getItemAvailableQuantity(index);
                if (item.quantity > availableQuantity) {
                    const itemDetails = this.items.find(i => i._id === item.itemId);
                    errors.push(`Insufficient stock for ${itemDetails?.name}: ${item.quantity} requested, ${availableQuantity} available`);
                }
            });
        }

        // Validate due date is not in the past
        if (formData.dueDate) {
            const dueDate = new Date(formData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dueDate < today) {
                errors.push('Due date cannot be in the past');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Mark all form controls as touched
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);

            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            } else if (control instanceof FormArray) {
                control.controls.forEach(arrayControl => {
                    if (arrayControl instanceof FormGroup) {
                        this.markFormGroupTouched(arrayControl);
                    } else {
                        arrayControl.markAsTouched();
                    }
                });
            } else {
                control?.markAsTouched();
            }
        });
    }

    /**
     * Scroll to first error
     */
    private scrollToFirstError(): void {
        setTimeout(() => {
            const firstError = document.querySelector('.mat-form-field-invalid, .mat-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    /**
     * Cancel form
     */
    onCancel(): void {
        // Check if form has unsaved changes
        if (this.invoiceForm.dirty) {
            const confirmCancel = confirm('You have unsaved changes. Are you sure you want to cancel?');
            if (!confirmCancel) {
                return;
            }
        }

        this.formCancel.emit();
    }

    /**
     * Handle form submission success
     */
    onFormSuccess(invoice: SalesInvoice): void {
        this.saving = false;
        this.toastService.success(
            this.isEditMode ? 'Invoice updated successfully' : 'Invoice created successfully'
        );
        this.formSuccess.emit(invoice);
    }

    /**
     * Handle form submission error
     */
    onFormError(error: string): void {
        this.saving = false;
        this.toastService.error(error);
        this.formError.emit(error);
    }

    /**
     * Reset form to initial state
     */
    resetForm(): void {
        this.invoiceForm.reset();
        this.itemsFormArray.clear();
        this.addItem(); // Add one empty item
        this.formErrors = {};
        this.itemErrors = {};
        this.totals$.next({
            subtotal: 0,
            discountAmount: 0,
            taxableAmount: 0,
            gstAmount: 0,
            whtAmount: 0,
            grandTotal: 0
        });
    }

    /**
     * Check if form has unsaved changes
     */
    hasUnsavedChanges(): boolean {
        return this.invoiceForm.dirty;
    }

    /**
     * Get form validation summary
     */
    getValidationSummary(): { isValid: boolean; errorCount: number; errors: string[] } {
        const validation = this.performComprehensiveValidation();
        return {
            isValid: validation.isValid,
            errorCount: validation.errors.length,
            errors: validation.errors
        };
    }

    /**
     * Prepare form data for submission
     */
    private prepareFormData(): CreateInvoiceRequest | UpdateInvoiceRequest {
        const formValue = this.invoiceForm.value;

        const items = formValue.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            discountType: item.discountType,
            batchInfo: item.batchNumber ? {
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate
            } : undefined,
            notes: item.notes
        }));

        return {
            customerId: formValue.customerId,
            invoiceDate: formValue.invoiceDate,
            dueDate: formValue.dueDate,
            warehouseId: formValue.warehouseId,
            salesmanId: formValue.salesmanId,
            items,
            notes: formValue.notes,
            discountType: formValue.discountType,
            discountValue: formValue.discountValue || 0
        };
    }

    // Custom Validators

    /**
     * Validator to check if customer exists
     */
    private customerExistsValidator(control: AbstractControl): Observable<any> {
        if (!control.value) {
            return new Observable(observer => observer.next(null));
        }

        return new Observable(observer => {
            const exists = this.customers.some(c => c._id === control.value);
            observer.next(exists ? null : { customerNotExists: true });
        });
    }

    /**
     * Validator for quantity availability
     */
    private quantityAvailabilityValidator(availableQuantity: number) {
        return (control: AbstractControl): any => {
            const requestedQuantity = Number(control.value);

            if (requestedQuantity > availableQuantity) {
                return {
                    quantityExceeded: `Only ${availableQuantity} units available in stock`
                };
            }

            return null;
        };
    }

    /**
     * Validator for minimum items
     */
    private minItemsValidator(control: AbstractControl): any {
        const items = control.value;
        if (!items || items.length === 0) {
            return { required: true };
        }
        return null;
    }

    /**
     * Validator for discount value
     */
    private discountValidator(control: AbstractControl): any {
        const discountValue = control.value;
        const discountType = this.invoiceForm?.get('discountType')?.value;

        if (discountValue < 0) {
            return { invalidDiscount: 'Discount cannot be negative' };
        }

        if (discountType === DiscountType.PERCENTAGE && discountValue > 100) {
            return { invalidDiscount: 'Percentage discount cannot exceed 100%' };
        }

        return null;
    }

    /**
     * Validator for item discount
     */
    private itemDiscountValidator(control: AbstractControl): any {
        const discount = control.value;
        const parent = control.parent;

        if (!parent) return null;

        const discountType = parent.get('discountType')?.value;

        if (discount < 0) {
            return { invalidDiscount: 'Discount cannot be negative' };
        }

        if (discountType === DiscountType.PERCENTAGE && discount > 100) {
            return { invalidDiscount: 'Percentage discount cannot exceed 100%' };
        }

        return null;
    }

    /**
     * Validator for due date
     */
    private dueDateValidator(control: AbstractControl): any {
        const dueDate = control.value;
        const invoiceDate = this.invoiceForm?.get('invoiceDate')?.value;

        if (dueDate && invoiceDate && new Date(dueDate) < new Date(invoiceDate)) {
            return { invalidDueDate: 'Due date cannot be earlier than invoice date' };
        }

        return null;
    }

    // Mock data methods (to be replaced with actual service calls)

    private getMockItems(): Item[] {
        return [
            {
                _id: '1',
                code: 'ITEM001',
                name: 'Paracetamol 500mg',
                description: 'Pain relief medication',
                category: 'Medicine',
                unit: 'Tablet',
                sellingPrice: 2.50,
                gstRate: 17,
                whtRate: 0,
                isActive: true
            },
            {
                _id: '2',
                code: 'ITEM002',
                name: 'Amoxicillin 250mg',
                description: 'Antibiotic medication',
                category: 'Medicine',
                unit: 'Capsule',
                sellingPrice: 5.00,
                gstRate: 17,
                whtRate: 0,
                isActive: true
            },
            {
                _id: '3',
                code: 'ITEM003',
                name: 'Vitamin C 1000mg',
                description: 'Vitamin supplement',
                category: 'Supplement',
                unit: 'Tablet',
                sellingPrice: 1.25,
                gstRate: 17,
                whtRate: 0,
                isActive: true
            }
        ];
    }

    private getMockWarehouses(): Warehouse[] {
        return [
            {
                _id: '1',
                name: 'Main Warehouse',
                code: 'WH001',
                location: 'Karachi',
                isActive: true
            },
            {
                _id: '2',
                name: 'Secondary Warehouse',
                code: 'WH002',
                location: 'Lahore',
                isActive: true
            }
        ];
    }

    private getMockSalesmen(): Salesman[] {
        return [
            {
                _id: '1',
                name: 'Ahmed Ali',
                code: 'SM001',
                email: 'ahmed@company.com',
                phone: '+92-300-1234567',
                isActive: true
            },
            {
                _id: '2',
                name: 'Sara Khan',
                code: 'SM002',
                email: 'sara@company.com',
                phone: '+92-300-7654321',
                isActive: true
            }
        ];
    }
}