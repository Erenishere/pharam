import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { InvoiceFilters } from '../../models/invoice-filters.model';
import { InvoiceStatus, PaymentStatus } from '../../models/sales-invoice.model';
import { CustomerService } from '../../../customers/services/customer.service';
import { SalesmanService } from '../../../../core/services/salesman.service';

interface CustomerOption {
    value: string;
    label: string;
    code: string;
}

interface SalesmanOption {
    value: string;
    label: string;
    code: string;
}

interface WarehouseOption {
    value: string;
    label: string;
    code: string;
}

@Component({
    selector: 'app-invoice-filters',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatCheckboxModule,
        MatCardModule,
        MatExpansionModule
    ],
    templateUrl: './invoice-filters.component.html',
    styleUrls: ['./invoice-filters.component.scss']
})
export class InvoiceFiltersComponent implements OnInit, OnDestroy, OnChanges {
    @Input() initialFilters?: InvoiceFilters;
    @Output() filtersChanged = new EventEmitter<InvoiceFilters>();

    filterForm!: FormGroup;
    showAdvancedFilters = false;

    // Options for dropdowns
    customerOptions$!: Observable<CustomerOption[]>;
    salesmanOptions$!: Observable<SalesmanOption[]>;
    warehouseOptions$!: Observable<WarehouseOption[]>;
    filteredCustomers$!: Observable<CustomerOption[]>;

    statusOptions = [
        { value: InvoiceStatus.DRAFT, label: 'Draft' },
        { value: InvoiceStatus.CONFIRMED, label: 'Confirmed' },
        { value: InvoiceStatus.CANCELLED, label: 'Cancelled' }
    ];

    paymentStatusOptions = [
        { value: PaymentStatus.PENDING, label: 'Pending' },
        { value: PaymentStatus.PARTIAL, label: 'Partial' },
        { value: PaymentStatus.PAID, label: 'Paid' }
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private customerService: CustomerService,
        private salesmanService: SalesmanService
    ) {
        this.initializeForm();
    }

    ngOnInit(): void {
        this.loadFilterOptions();
        this.setupFormSubscriptions();
        this.applyInitialFilters();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['initialFilters'] && changes['initialFilters'].currentValue) {
            this.applyInitialFilters();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeForm(): void {
        this.filterForm = this.fb.group({
            search: [''],
            customerId: [''],
            customerSearch: [''],
            salesmanId: [''],
            warehouseId: [''],
            status: [[]],
            paymentStatus: [[]],
            dateFrom: [null],
            dateTo: [null],
            amountFrom: [null],
            amountTo: [null]
        });
    }

    private loadFilterOptions(): void {
        // Load customer options for dropdown
        this.customerOptions$ = this.customerService.getCustomers({ limit: 100, isActive: true }).pipe(
            map(response => response.success ? response.data.map(customer => ({
                value: customer._id,
                label: customer.name,
                code: customer.code
            })) : []),
            catchError(() => of([]))
        );

        // Setup customer autocomplete for search
        this.filteredCustomers$ = this.filterForm.get('customerSearch')!.valueChanges.pipe(
            startWith(''),
            debounceTime(300),
            distinctUntilChanged(),
            map(value => {
                const searchTerm = typeof value === 'string' ? value : (value?.label || '');
                return this.filterCustomers(searchTerm);
            })
        );

        // Load salesman options (mock for now since we don't have a full salesman service)
        this.salesmanOptions$ = of([
            { value: '1', label: 'John Smith', code: 'SM001' },
            { value: '2', label: 'Jane Doe', code: 'SM002' },
            { value: '3', label: 'Mike Johnson', code: 'SM003' }
        ]);

        // Load warehouse options (mock for now)
        this.warehouseOptions$ = of([
            { value: '1', label: 'Main Warehouse', code: 'WH001' },
            { value: '2', label: 'Secondary Warehouse', code: 'WH002' },
            { value: '3', label: 'Distribution Center', code: 'WH003' }
        ]);
    }

    private setupFormSubscriptions(): void {
        // Auto-apply filters on form changes (debounced)
        this.filterForm.valueChanges.pipe(
            takeUntil(this.destroy$),
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(() => {
            this.applyFilters();
        });
    }

    private filterCustomers(searchTerm: string): CustomerOption[] {
        if (!searchTerm || searchTerm.length < 2) {
            return [];
        }

        // This would normally call the customer service to search customers
        // For now, return empty array - will be implemented when customer search API is available
        return [];
    }

    displayCustomerFn(customer: CustomerOption): string {
        return customer ? customer.label : '';
    }

    onCustomerSelected(customer: CustomerOption): void {
        if (customer) {
            this.filterForm.patchValue({
                customerId: customer.value,
                customerSearch: customer
            }, { emitEvent: false });
            this.applyFilters();
        }
    }

    clearCustomerSelection(): void {
        this.filterForm.patchValue({
            customerId: '',
            customerSearch: ''
        }, { emitEvent: false });
        this.applyFilters();
    }

    applyFilters(): void {
        const formValue = this.filterForm.value;

        const filters: InvoiceFilters = {
            search: formValue.search || undefined,
            customerId: formValue.customerId || undefined,
            salesmanId: formValue.salesmanId || undefined,
            warehouseId: formValue.warehouseId || undefined,
            status: formValue.status && formValue.status.length > 0 ? formValue.status : undefined,
            paymentStatus: formValue.paymentStatus && formValue.paymentStatus.length > 0 ? formValue.paymentStatus : undefined,
            dateFrom: formValue.dateFrom || undefined,
            dateTo: formValue.dateTo || undefined,
            amountFrom: formValue.amountFrom || undefined,
            amountTo: formValue.amountTo || undefined
        };

        // Remove undefined values
        Object.keys(filters).forEach(key => {
            if (filters[key as keyof InvoiceFilters] === undefined) {
                delete filters[key as keyof InvoiceFilters];
            }
        });

        this.filtersChanged.emit(filters);
    }

    clearFilters(): void {
        this.filterForm.reset({
            search: '',
            customerId: '',
            customerSearch: '',
            salesmanId: '',
            warehouseId: '',
            status: [],
            paymentStatus: [],
            dateFrom: null,
            dateTo: null,
            amountFrom: null,
            amountTo: null
        });

        this.applyFilters();
    }

    private applyInitialFilters(): void {
        if (!this.initialFilters) {
            return;
        }

        const formValue: any = {
            search: this.initialFilters.search || '',
            customerId: this.initialFilters.customerId || '',
            salesmanId: this.initialFilters.salesmanId || '',
            warehouseId: this.initialFilters.warehouseId || '',
            status: this.initialFilters.status || [],
            paymentStatus: this.initialFilters.paymentStatus || [],
            dateFrom: this.initialFilters.dateFrom || null,
            dateTo: this.initialFilters.dateTo || null,
            amountFrom: this.initialFilters.amountFrom || null,
            amountTo: this.initialFilters.amountTo || null
        };

        // Update form without triggering change events
        this.filterForm.patchValue(formValue, { emitEvent: false });

        // Show advanced filters if any advanced filters are set
        if (this.hasAdvancedFilters(this.initialFilters)) {
            this.showAdvancedFilters = true;
        }
    }

    private hasAdvancedFilters(filters: InvoiceFilters): boolean {
        return !!(
            filters.customerId ||
            filters.salesmanId ||
            filters.warehouseId ||
            (filters.status && filters.status.length > 0) ||
            (filters.paymentStatus && filters.paymentStatus.length > 0) ||
            filters.dateFrom ||
            filters.dateTo ||
            filters.amountFrom !== undefined ||
            filters.amountTo !== undefined
        );
    }

    toggleAdvancedFilters(): void {
        this.showAdvancedFilters = !this.showAdvancedFilters;
    }

    // Preset date range methods
    setDateRange(preset: string): void {
        const today = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        switch (preset) {
            case 'today':
                startDate = endDate = new Date(today);
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = endDate = yesterday;
                break;
            case 'thisWeek':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startDate = startOfWeek;
                endDate = new Date(today);
                break;
            case 'lastWeek':
                const lastWeekStart = new Date(today);
                lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
                const lastWeekEnd = new Date(lastWeekStart);
                lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
                startDate = lastWeekStart;
                endDate = lastWeekEnd;
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
                break;
            case 'lastMonth':
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                startDate = lastMonth;
                endDate = lastMonthEnd;
                break;
        }

        if (startDate && endDate) {
            this.filterForm.patchValue({
                dateFrom: startDate,
                dateTo: endDate
            });
        }
    }
}