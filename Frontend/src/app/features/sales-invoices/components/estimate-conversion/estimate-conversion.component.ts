/**
 * Estimate Conversion Component
 * 
 * This component handles the conversion of estimates to invoices.
 * It displays pending estimates and provides conversion functionality.
 */

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { Estimate, SalesInvoice } from '../../models/sales-invoice.model';
import { PaginatedApiResponse } from '../../models/api-response.model';

@Component({
    selector: 'app-estimate-conversion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDialogModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule
    ],
    templateUrl: './estimate-conversion.component.html',
    styleUrls: ['./estimate-conversion.component.scss']
})
export class EstimateConversionComponent implements OnInit, OnDestroy {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    displayedColumns: string[] = [
        'estimateNumber',
        'customer',
        'estimateDate',
        'validUntil',
        'totalAmount',
        'status',
        'actions'
    ];

    dataSource = new MatTableDataSource<Estimate>([]);
    filterForm: FormGroup;

    isLoading = false;
    totalCount = 0;
    pageSize = 10;
    currentPage = 0;

    private destroy$ = new Subject<void>();

    constructor(
        private salesInvoiceService: SalesInvoiceService,
        private fb: FormBuilder,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        this.filterForm = this.createFilterForm();
    }

    ngOnInit(): void {
        this.setupFilterSubscription();
        this.loadEstimates();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        // Handle pagination changes
        this.paginator.page
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.currentPage = this.paginator.pageIndex;
                this.pageSize = this.paginator.pageSize;
                this.loadEstimates();
            });

        // Handle sort changes
        this.sort.sortChange
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.paginator.pageIndex = 0;
                this.currentPage = 0;
                this.loadEstimates();
            });
    }

    /**
     * Create filter form
     */
    private createFilterForm(): FormGroup {
        return this.fb.group({
            search: [''],
            status: ['pending'],
            dateFrom: [null],
            dateTo: [null]
        });
    }

    /**
     * Setup filter form subscription
     */
    private setupFilterSubscription(): void {
        this.filterForm.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.paginator.pageIndex = 0;
                this.currentPage = 0;
                this.loadEstimates();
            });
    }

    /**
     * Load estimates from API
     */
    loadEstimates(): void {
        this.isLoading = true;

        const filters = this.filterForm.value;
        const params = {
            page: this.currentPage + 1,
            limit: this.pageSize,
            sortBy: this.sort.active || 'estimateDate',
            sortOrder: this.sort.direction || 'desc',
            ...filters
        };

        this.salesInvoiceService.getPendingEstimates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: PaginatedApiResponse<Estimate>) => {
                    this.dataSource.data = response.data;
                    this.totalCount = response.pagination.totalItems;
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error loading estimates:', error);
                    this.showError('Failed to load estimates. Please try again.');
                    this.isLoading = false;
                }
            });
    }

    /**
     * Convert estimate to invoice
     */
    convertToInvoice(estimate: Estimate): void {
        // Check if estimate is expired
        if (this.isEstimateExpired(estimate)) {
            this.showError('Cannot convert expired estimate to invoice.');
            return;
        }

        // Check if estimate is already converted
        if (estimate.status === 'converted') {
            this.showError('This estimate has already been converted to an invoice.');
            return;
        }

        this.isLoading = true;

        this.salesInvoiceService.convertEstimateToInvoice(estimate._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.showSuccess(`Estimate ${estimate.estimateNumber} successfully converted to invoice ${response.data.invoiceNumber}`);
                    this.loadEstimates(); // Refresh the list
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error converting estimate:', error);
                    this.showError(error.userMessage || 'Failed to convert estimate. Please try again.');
                    this.isLoading = false;
                }
            });
    }

    /**
     * Check if estimate is expired
     */
    isEstimateExpired(estimate: Estimate): boolean {
        const today = new Date();
        const validUntil = new Date(estimate.validUntil);
        return validUntil < today;
    }

    /**
     * Get status chip color
     */
    getStatusColor(status: string): string {
        switch (status) {
            case 'pending':
                return 'primary';
            case 'accepted':
                return 'accent';
            case 'expired':
                return 'warn';
            case 'converted':
                return '';
            default:
                return '';
        }
    }

    /**
     * Get days until expiry
     */
    getDaysUntilExpiry(validUntil: Date): number {
        const today = new Date();
        const expiry = new Date(validUntil);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if conversion is allowed
     */
    canConvert(estimate: Estimate): boolean {
        return estimate.status === 'pending' && !this.isEstimateExpired(estimate);
    }

    /**
     * Clear all filters
     */
    clearFilters(): void {
        this.filterForm.reset({
            search: '',
            status: 'pending',
            dateFrom: null,
            dateTo: null
        });
    }

    /**
     * Refresh estimates list
     */
    refresh(): void {
        this.loadEstimates();
    }

    /**
     * Show success message
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }
}