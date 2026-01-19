import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';

import {
    SalesInvoice,
    InvoiceStatus,
    PaymentStatus
} from '../../models/sales-invoice.model';
import {
    InvoiceFilters,
    InvoiceQueryParams
} from '../../models/invoice-filters.model';
import { PaginatedApiResponse } from '../../models/api-response.model';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { CacheService } from '../../services/cache.service';
import { PerformanceService } from '../../services/performance.service';
import { InvoiceFiltersComponent } from '../invoice-filters/invoice-filters.component';
import { InvoiceStatisticsComponent } from '../invoice-statistics/invoice-statistics.component';
import { PaymentDialogComponent } from '../payment-dialog/payment-dialog.component';
import { StatusDialogComponent } from '../status-dialog/status-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserRole } from '../../../../core/models/user.model';

@Component({
    selector: 'app-invoice-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatTooltipModule,
        MatMenuModule,
        MatCheckboxModule,
        MatSnackBarModule,
        MatDialogModule,
        MatDividerModule,
        RouterModule,
        ScrollingModule,
        InvoiceFiltersComponent,
        InvoiceStatisticsComponent
    ],
    template: `
        <div class="invoice-list-container">
            <!-- Page Header -->
            <div class="invoice-header">
                <h1>Sales Invoices</h1>
                <div class="header-actions">
                    <button 
                        mat-raised-button 
                        color="primary" 
                        routerLink="/sales-invoices/create"
                        *ngIf="canCreate">
                        <mat-icon>add</mat-icon>
                        Create Invoice
                    </button>
                    <button 
                        mat-button 
                        [matMenuTriggerFor]="actionsMenu"
                        *ngIf="canExport || canBulkOperations">
                        <mat-icon>more_vert</mat-icon>
                        Actions
                    </button>
                    <mat-menu #actionsMenu="matMenu">
                        <button mat-menu-item (click)="exportInvoices()" *ngIf="canExport">
                            <mat-icon>download</mat-icon>
                            Export to Excel
                        </button>
                        <button mat-menu-item (click)="exportInvoicesPDF()" *ngIf="canExport">
                            <mat-icon>picture_as_pdf</mat-icon>
                            Export to PDF
                        </button>
                        <mat-divider *ngIf="canExport && canBulkOperations"></mat-divider>
                        <button mat-menu-item (click)="bulkConfirm()" *ngIf="canBulkOperations && hasSelectedInvoices()">
                            <mat-icon>check_circle</mat-icon>
                            Bulk Confirm
                        </button>
                        <button mat-menu-item (click)="bulkCancel()" *ngIf="canBulkOperations && hasSelectedInvoices()">
                            <mat-icon>cancel</mat-icon>
                            Bulk Cancel
                        </button>
                    </mat-menu>
                </div>
            </div>

            <!-- Statistics Section -->
            <app-invoice-statistics 
                *ngIf="showStatistics"
                class="statistics-section">
            </app-invoice-statistics>

            <!-- Filters Section -->
            <app-invoice-filters 
                [initialFilters]="currentFilters"
                (filtersChanged)="onFiltersChanged($event)">
            </app-invoice-filters>

            <!-- Desktop Table View -->
            <mat-card class="table-card" *ngIf="!isMobile">
                <mat-card-content>
                    <div class="table-container">
                        <table mat-table [dataSource]="dataSource" matSort class="invoice-table" (matSortChange)="onSortChange($event)">
                            
                            <!-- Selection Column -->
                            <ng-container matColumnDef="select" *ngIf="canBulkOperations">
                                <th mat-header-cell *matHeaderCellDef>
                                    <mat-checkbox 
                                        (change)="$event ? masterToggle() : null"
                                        [checked]="selection.hasValue() && isAllSelected()"
                                        [indeterminate]="selection.hasValue() && !isAllSelected()"
                                        [aria-label]="checkboxLabel()">
                                    </mat-checkbox>
                                </th>
                                <td mat-cell *matCellDef="let invoice">
                                    <mat-checkbox 
                                        (click)="$event.stopPropagation()"
                                        (change)="$event ? selection.toggle(invoice) : null"
                                        [checked]="selection.isSelected(invoice)"
                                        [aria-label]="checkboxLabel(invoice)">
                                    </mat-checkbox>
                                </td>
                            </ng-container>

                            <!-- Invoice Number Column -->
                            <ng-container matColumnDef="invoiceNumber">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Invoice Number</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <a [routerLink]="['/sales-invoices/detail', invoice._id]" class="invoice-link">
                                        {{ invoice.invoiceNumber }}
                                    </a>
                                </td>
                            </ng-container>

                            <!-- Customer Column -->
                            <ng-container matColumnDef="customer">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Customer</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <div class="customer-info">
                                        <div class="customer-name">{{ invoice.customer?.name || 'N/A' }}</div>
                                        <div class="customer-code">{{ invoice.customer?.code || 'N/A' }}</div>
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Invoice Date Column -->
                            <ng-container matColumnDef="invoiceDate">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Invoice Date</th>
                                <td mat-cell *matCellDef="let invoice">
                                    {{ invoice.invoiceDate | date:'dd/MM/yyyy' }}
                                </td>
                            </ng-container>

                            <!-- Due Date Column -->
                            <ng-container matColumnDef="dueDate">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Due Date</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <div class="due-date" [class]="getDueDateClass(invoice.dueDate)">
                                        {{ invoice.dueDate | date:'dd/MM/yyyy' }}
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Total Amount Column -->
                            <ng-container matColumnDef="totalAmount">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Total Amount</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <div class="amount">
                                        {{ invoice.totals.grandTotal | currency:'PKR':'symbol':'1.2-2' }}
                                    </div>
                                </td>
                            </ng-container>

                            <!-- Status Column -->
                            <ng-container matColumnDef="status">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <mat-chip [class]="'status-' + invoice.status">
                                        {{ getStatusLabel(invoice.status) }}
                                    </mat-chip>
                                </td>
                            </ng-container>

                            <!-- Payment Status Column -->
                            <ng-container matColumnDef="paymentStatus">
                                <th mat-header-cell *matHeaderCellDef mat-sort-header>Payment Status</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <mat-chip [class]="'payment-' + invoice.payment.paymentStatus">
                                        {{ getPaymentStatusLabel(invoice.payment.paymentStatus) }}
                                    </mat-chip>
                                </td>
                            </ng-container>

                            <!-- Actions Column -->
                            <ng-container matColumnDef="actions">
                                <th mat-header-cell *matHeaderCellDef>Actions</th>
                                <td mat-cell *matCellDef="let invoice">
                                    <button 
                                        mat-icon-button 
                                        [routerLink]="['/sales-invoices/detail', invoice._id]" 
                                        matTooltip="View Details">
                                        <mat-icon>visibility</mat-icon>
                                    </button>
                                    <button 
                                        mat-icon-button 
                                        [routerLink]="['/sales-invoices/edit', invoice._id]" 
                                        matTooltip="Edit Invoice"
                                        *ngIf="canEdit && invoice.status === 'draft'">
                                        <mat-icon>edit</mat-icon>
                                    </button>
                                    <button 
                                        mat-icon-button 
                                        [matMenuTriggerFor]="invoiceMenu" 
                                        matTooltip="More Actions">
                                        <mat-icon>more_vert</mat-icon>
                                    </button>
                                    <mat-menu #invoiceMenu="matMenu">
                                        <button mat-menu-item (click)="confirmInvoice(invoice)" *ngIf="canConfirm && invoice.status === 'draft'">
                                            <mat-icon>check_circle</mat-icon>
                                            Confirm
                                        </button>
                                        <button mat-menu-item (click)="cancelInvoice(invoice)" *ngIf="canCancel && invoice.status !== 'cancelled'">
                                            <mat-icon>cancel</mat-icon>
                                            Cancel
                                        </button>
                                        <button mat-menu-item (click)="recordPayment(invoice)" *ngIf="canRecordPayment && invoice.status === 'confirmed'">
                                            <mat-icon>payment</mat-icon>
                                            Record Payment
                                        </button>
                                        <button mat-menu-item (click)="printInvoice(invoice)">
                                            <mat-icon>print</mat-icon>
                                            Print
                                        </button>
                                        <button mat-menu-item (click)="downloadPDF(invoice)">
                                            <mat-icon>picture_as_pdf</mat-icon>
                                            Download PDF
                                        </button>
                                        <button mat-menu-item (click)="deleteInvoice(invoice)" *ngIf="canDelete && invoice.status === 'draft'">
                                            <mat-icon>delete</mat-icon>
                                            Delete
                                        </button>
                                    </mat-menu>
                                </td>
                            </ng-container>

                            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                            <tr mat-row *matRowDef="let row; columns: displayedColumns;" (click)="onRowClick(row)"></tr>
                        </table>

                        <!-- Loading Spinner -->
                        <div *ngIf="loading" class="loading-container">
                            <mat-spinner diameter="50"></mat-spinner>
                            <p>Loading invoices...</p>
                        </div>

                        <!-- No Data Message -->
                        <div *ngIf="!loading && dataSource.data.length === 0" class="no-data">
                            <mat-icon>receipt_long</mat-icon>
                            <p>No invoices found</p>
                            <button mat-raised-button color="primary" routerLink="/sales-invoices/create" *ngIf="canCreate">
                                Create First Invoice
                            </button>
                        </div>

                        <!-- Error Message -->
                        <div *ngIf="error && !loading" class="error-container">
                            <mat-icon>error</mat-icon>
                            <p>{{ error }}</p>
                            <button mat-button color="primary" (click)="retryLoad()">
                                <mat-icon>refresh</mat-icon>
                                Retry
                            </button>
                        </div>
                    </div>

                    <!-- Paginator -->
                    <mat-paginator 
                        [length]="totalItems"
                        [pageSize]="pageSize"
                        [pageSizeOptions]="[10, 25, 50, 100]"
                        [pageIndex]="currentPage"
                        (page)="onPageChange($event)"
                        showFirstLastButtons>
                    </mat-paginator>
                </mat-card-content>
            </mat-card>

            <!-- Mobile Card View -->
            <div class="mobile-view" *ngIf="isMobile">
                <!-- Loading Spinner for Mobile -->
                <div *ngIf="loading" class="loading-container">
                    <mat-spinner diameter="50"></mat-spinner>
                    <p>Loading invoices...</p>
                </div>

                <!-- No Data Message for Mobile -->
                <div *ngIf="!loading && dataSource.data.length === 0" class="no-data">
                    <mat-icon>receipt_long</mat-icon>
                    <p>No invoices found</p>
                    <button mat-raised-button color="primary" routerLink="/sales-invoices/create" *ngIf="canCreate">
                        Create First Invoice
                    </button>
                </div>

                <!-- Error Message for Mobile -->
                <div *ngIf="error && !loading" class="error-container">
                    <mat-icon>error</mat-icon>
                    <p>{{ error }}</p>
                    <button mat-button color="primary" (click)="retryLoad()">
                        <mat-icon>refresh</mat-icon>
                        Retry
                    </button>
                </div>

                <!-- Invoice Cards with Virtual Scrolling -->
                <cdk-virtual-scroll-viewport 
                    *ngIf="optimizedConfig.enableVirtualScroll && dataSource.data.length > 20"
                    [itemSize]="virtualScrollConfig.itemSize"
                    class="virtual-scroll-viewport">
                    <div *cdkVirtualFor="let invoice of dataSource.data; trackBy: trackByInvoiceId" class="invoice-card">
                        <mat-card (click)="onRowClick(invoice)">
                            <mat-card-header>
                                <div class="card-header">
                                    <div class="invoice-number">
                                        <a [routerLink]="['/sales-invoices/detail', invoice._id]" class="invoice-link">
                                            {{ invoice.invoiceNumber }}
                                        </a>
                                    </div>
                                    <div class="status-chips">
                                        <mat-chip [class]="'status-' + invoice.status" class="status-chip">
                                            {{ getStatusLabel(invoice.status) }}
                                        </mat-chip>
                                        <mat-chip [class]="'payment-' + invoice.payment.paymentStatus" class="payment-chip">
                                            {{ getPaymentStatusLabel(invoice.payment.paymentStatus) }}
                                        </mat-chip>
                                    </div>
                                </div>
                            </mat-card-header>
                            <mat-card-content>
                                <div class="card-details">
                                    <div class="detail-row">
                                        <span class="label">Customer:</span>
                                        <span class="value">{{ invoice.customer?.name || 'N/A' }}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="label">Date:</span>
                                        <span class="value">{{ invoice.invoiceDate | date:'dd/MM/yyyy' }}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="label">Due Date:</span>
                                        <span class="value" [class]="getDueDateClass(invoice.dueDate)">
                                            {{ invoice.dueDate | date:'dd/MM/yyyy' }}
                                        </span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="label">Amount:</span>
                                        <span class="value amount">
                                            {{ invoice.totals.grandTotal | currency:'PKR':'symbol':'1.2-2' }}
                                        </span>
                                    </div>
                                </div>
                            </mat-card-content>
                            <mat-card-actions>
                                <button mat-button [routerLink]="['/sales-invoices/detail', invoice._id]">
                                    <mat-icon>visibility</mat-icon>
                                    View
                                </button>
                                <button mat-button [routerLink]="['/sales-invoices/edit', invoice._id]" 
                                        *ngIf="canEdit && invoice.status === 'draft'">
                                    <mat-icon>edit</mat-icon>
                                    Edit
                                </button>
                                <button mat-button [matMenuTriggerFor]="mobileMenu">
                                    <mat-icon>more_vert</mat-icon>
                                    More
                                </button>
                                <mat-menu #mobileMenu="matMenu">
                                    <button mat-menu-item (click)="confirmInvoice(invoice)" *ngIf="canConfirm && invoice.status === 'draft'">
                                        <mat-icon>check_circle</mat-icon>
                                        Confirm
                                    </button>
                                    <button mat-menu-item (click)="cancelInvoice(invoice)" *ngIf="canCancel && invoice.status !== 'cancelled'">
                                        <mat-icon>cancel</mat-icon>
                                        Cancel
                                    </button>
                                    <button mat-menu-item (click)="recordPayment(invoice)" *ngIf="canRecordPayment && invoice.status === 'confirmed'">
                                        <mat-icon>payment</mat-icon>
                                        Record Payment
                                    </button>
                                    <button mat-menu-item (click)="printInvoice(invoice)">
                                        <mat-icon>print</mat-icon>
                                        Print
                                    </button>
                                    <button mat-menu-item (click)="downloadPDF(invoice)">
                                        <mat-icon>picture_as_pdf</mat-icon>
                                        Download PDF
                                    </button>
                                </mat-menu>
                            </mat-card-actions>
                        </mat-card>
                    </div>
                </cdk-virtual-scroll-viewport>

                <!-- Regular Invoice Cards (fallback) -->
                <div *ngIf="!optimizedConfig.enableVirtualScroll || dataSource.data.length <= 20">
                    <div *ngFor="let invoice of dataSource.data; trackBy: trackByInvoiceId" class="invoice-card">
                    <mat-card (click)="onRowClick(invoice)">
                        <mat-card-header>
                            <div class="card-header">
                                <div class="invoice-number">
                                    <a [routerLink]="['/sales-invoices/detail', invoice._id]" class="invoice-link">
                                        {{ invoice.invoiceNumber }}
                                    </a>
                                </div>
                                <div class="status-chips">
                                    <mat-chip [class]="'status-' + invoice.status" class="status-chip">
                                        {{ getStatusLabel(invoice.status) }}
                                    </mat-chip>
                                    <mat-chip [class]="'payment-' + invoice.payment.paymentStatus" class="payment-chip">
                                        {{ getPaymentStatusLabel(invoice.payment.paymentStatus) }}
                                    </mat-chip>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="card-details">
                                <div class="detail-row">
                                    <span class="label">Customer:</span>
                                    <span class="value">{{ invoice.customer?.name || 'N/A' }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Date:</span>
                                    <span class="value">{{ invoice.invoiceDate | date:'dd/MM/yyyy' }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Due Date:</span>
                                    <span class="value" [class]="getDueDateClass(invoice.dueDate)">
                                        {{ invoice.dueDate | date:'dd/MM/yyyy' }}
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Amount:</span>
                                    <span class="value amount">
                                        {{ invoice.totals.grandTotal | currency:'PKR':'symbol':'1.2-2' }}
                                    </span>
                                </div>
                            </div>
                        </mat-card-content>
                        <mat-card-actions>
                            <button mat-button [routerLink]="['/sales-invoices/detail', invoice._id]">
                                <mat-icon>visibility</mat-icon>
                                View
                            </button>
                            <button mat-button [routerLink]="['/sales-invoices/edit', invoice._id]" 
                                    *ngIf="canEdit && invoice.status === 'draft'">
                                <mat-icon>edit</mat-icon>
                                Edit
                            </button>
                            <button mat-button [matMenuTriggerFor]="mobileMenu">
                                <mat-icon>more_vert</mat-icon>
                                More
                            </button>
                            <mat-menu #mobileMenu="matMenu">
                                <button mat-menu-item (click)="confirmInvoice(invoice)" *ngIf="canConfirm && invoice.status === 'draft'">
                                    <mat-icon>check_circle</mat-icon>
                                    Confirm
                                </button>
                                <button mat-menu-item (click)="cancelInvoice(invoice)" *ngIf="canCancel && invoice.status !== 'cancelled'">
                                    <mat-icon>cancel</mat-icon>
                                    Cancel
                                </button>
                                <button mat-menu-item (click)="recordPayment(invoice)" *ngIf="canRecordPayment && invoice.status === 'confirmed'">
                                    <mat-icon>payment</mat-icon>
                                    Record Payment
                                </button>
                                <button mat-menu-item (click)="printInvoice(invoice)">
                                    <mat-icon>print</mat-icon>
                                    Print
                                </button>
                                <button mat-menu-item (click)="downloadPDF(invoice)">
                                    <mat-icon>picture_as_pdf</mat-icon>
                                    Download PDF
                                </button>
                            </mat-menu>
                        </mat-card-actions>
                    </mat-card>
                </div>

                <!-- Mobile Pagination -->
                <mat-card *ngIf="!loading && dataSource.data.length > 0" class="pagination-card">
                    <mat-paginator 
                        [length]="totalItems"
                        [pageSize]="pageSize"
                        [pageSizeOptions]="[10, 25, 50]"
                        [pageIndex]="currentPage"
                        (page)="onPageChange($event)"
                        showFirstLastButtons>
                    </mat-paginator>
                </mat-card>
            </div>
        </div>
    `,
    styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // Table configuration
    displayedColumns: string[] = ['invoiceNumber', 'customer', 'invoiceDate', 'dueDate', 'totalAmount', 'status', 'paymentStatus', 'actions'];
    dataSource = new MatTableDataSource<SalesInvoice>([]);
    selection = new SelectionModel<SalesInvoice>(true, []);

    // Performance optimizations
    trackByInvoice: any;
    virtualScrollConfig: any;
    optimizedConfig: any;

    // State management
    loading = false;
    error: string | null = null;
    totalItems = 0;
    pageSize = 10; // Default value, will be updated in ngOnInit
    currentPage = 0;
    isMobile = false;

    // Permissions
    canCreate = false;
    canEdit = false;
    canDelete = false;
    canConfirm = false;
    canCancel = false;
    canRecordPayment = false;
    canExport = false;
    canBulkOperations = false;
    showStatistics = false;

    // Filters and sorting
    currentFilters: InvoiceFilters = {};
    private currentSort: Sort = { active: 'invoiceDate', direction: 'desc' };
    private destroy$ = new Subject<void>();

    constructor(
        private salesInvoiceService: SalesInvoiceService,
        private cacheService: CacheService,
        private performanceService: PerformanceService,
        private router: Router,
        private route: ActivatedRoute,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {
        this.checkScreenSize();
    }

    ngOnInit(): void {
        // Initialize performance optimizations
        this.trackByInvoice = this.performanceService.createTrackByFunction<SalesInvoice>(invoice => invoice._id);
        this.virtualScrollConfig = this.performanceService.getVirtualScrollConfig('invoiceList');
        this.optimizedConfig = this.performanceService.getOptimizedConfig();

        // Update pageSize after optimizedConfig is initialized
        this.pageSize = this.optimizedConfig.pageSize;

        this.checkPermissions();
        this.loadFiltersFromUrl();
        this.loadInvoices();
        this.setupResponsiveListener();
    }

    ngAfterViewInit(): void {
        // Initialize sort after view init
        if (this.sort) {
            this.sort.active = this.currentSort.active;
            this.sort.direction = this.currentSort.direction;
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load invoices from the API with caching
     */
    private loadInvoices(): void {
        const endTiming = this.performanceService.startTiming('invoiceListLoad');
        this.loading = true;
        this.error = null;
        this.cdr.markForCheck();

        const queryParams: InvoiceQueryParams = {
            ...this.currentFilters,
            page: this.currentPage + 1, // API expects 1-based page numbers
            limit: this.pageSize,
            sortBy: this.currentSort.active,
            sortOrder: this.currentSort.direction || 'desc'
        };

        // Generate cache key for this request
        const cacheKey = this.cacheService.generateKey('invoices', queryParams);

        this.cacheService.get(
            cacheKey,
            'invoiceList',
            () => this.performanceService.measureApiCall(
                this.salesInvoiceService.getInvoices(queryParams),
                'getInvoices'
            )
        )
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading invoices:', error);
                    this.error = error.userMessage || 'Failed to load invoices. Please try again.';
                    this.cdr.markForCheck();
                    return of({
                        success: false,
                        data: [],
                        pagination: {
                            currentPage: 1,
                            totalPages: 0,
                            totalItems: 0,
                            pageSize: this.pageSize
                        }
                    } as PaginatedApiResponse<SalesInvoice>);
                })
            )
            .subscribe(response => {
                endTiming();
                this.loading = false;
                if (response.success) {
                    this.dataSource.data = response.data;
                    if (response.pagination) {
                        this.totalItems = response.pagination.totalItems;
                        this.currentPage = response.pagination.currentPage - 1; // Convert back to 0-based
                    }
                    this.selection.clear();
                } else {
                    this.dataSource.data = [];
                    this.totalItems = 0;
                    this.error = 'Failed to load invoices.';
                }
                this.cdr.markForCheck();
            });
    }

    /**
     * Handle filter changes with cache invalidation
     */
    onFiltersChanged(filters: InvoiceFilters): void {
        this.currentFilters = filters;
        this.currentPage = 0;

        // Invalidate related cache entries
        this.cacheService.clearByPattern('invoices:.*');

        this.updateUrlParams();
        this.loadInvoices();
    }

    /**
     * Handle page changes
     */
    onPageChange(event: PageEvent): void {
        this.currentPage = event.pageIndex;
        this.pageSize = event.pageSize;
        this.updateUrlParams();
        this.loadInvoices();
    }

    /**
     * Handle sort changes
     */
    onSortChange(sort: Sort): void {
        this.currentSort = sort;
        this.currentPage = 0;
        this.updateUrlParams();
        this.loadInvoices();
    }

    /**
     * Handle row clicks
     */
    onRowClick(invoice: SalesInvoice): void {
        this.router.navigate(['/sales-invoices/detail', invoice._id]);
    }

    /**
     * Track by function for invoice iteration (optimized for OnPush)
     */
    trackByInvoiceId(index: number, invoice: SalesInvoice): string {
        return invoice._id;
    }

    /**
     * Get status label
     */
    getStatusLabel(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.DRAFT:
                return 'Draft';
            case InvoiceStatus.CONFIRMED:
                return 'Confirmed';
            case InvoiceStatus.CANCELLED:
                return 'Cancelled';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get payment status label
     */
    getPaymentStatusLabel(status: PaymentStatus): string {
        switch (status) {
            case PaymentStatus.PENDING:
                return 'Pending';
            case PaymentStatus.PARTIAL:
                return 'Partial';
            case PaymentStatus.PAID:
                return 'Paid';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get due date CSS class
     */
    getDueDateClass(dueDate: Date): string {
        const today = new Date();
        const due = new Date(dueDate);
        const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
            return 'overdue';
        } else if (daysUntilDue <= 3) {
            return 'due-soon';
        } else if (daysUntilDue <= 7) {
            return 'due-warning';
        } else {
            return 'normal';
        }
    }

    /**
     * Retry loading invoices
     */
    retryLoad(): void {
        this.loadInvoices();
    }

    /**
     * Check user permissions based on role
     */
    private checkPermissions(): void {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
            // No user logged in, disable all actions
            this.canCreate = false;
            this.canEdit = false;
            this.canDelete = false;
            this.canConfirm = false;
            this.canCancel = false;
            this.canRecordPayment = false;
            this.canExport = false;
            this.canBulkOperations = false;
            this.showStatistics = false;
            return;
        }

        const userRole = currentUser.role as UserRole;

        switch (userRole) {
            case UserRole.ADMIN:
                // Admin has all permissions
                this.canCreate = true;
                this.canEdit = true;
                this.canDelete = true;
                this.canConfirm = true;
                this.canCancel = true;
                this.canRecordPayment = true;
                this.canExport = true;
                this.canBulkOperations = true;
                this.showStatistics = true;
                break;

            case UserRole.SALES:
                // Sales can create, edit drafts, confirm, and record payments
                this.canCreate = true;
                this.canEdit = true;
                this.canDelete = false; // Sales cannot delete
                this.canConfirm = true;
                this.canCancel = false; // Sales cannot cancel confirmed invoices
                this.canRecordPayment = true;
                this.canExport = true;
                this.canBulkOperations = false; // No bulk operations for sales
                this.showStatistics = true;
                break;

            case UserRole.ACCOUNTANT:
                // Accountant can record payments, view statistics, and export
                this.canCreate = false;
                this.canEdit = false;
                this.canDelete = false;
                this.canConfirm = false;
                this.canCancel = true; // Accountant can cancel for corrections
                this.canRecordPayment = true;
                this.canExport = true;
                this.canBulkOperations = false;
                this.showStatistics = true;
                break;

            case UserRole.DATA_ENTRY:
                // Data entry can create and edit drafts only
                this.canCreate = true;
                this.canEdit = true;
                this.canDelete = false;
                this.canConfirm = false;
                this.canCancel = false;
                this.canRecordPayment = false;
                this.canExport = false;
                this.canBulkOperations = false;
                this.showStatistics = false;
                break;

            case UserRole.INVENTORY:
                // Inventory has read-only access
                this.canCreate = false;
                this.canEdit = false;
                this.canDelete = false;
                this.canConfirm = false;
                this.canCancel = false;
                this.canRecordPayment = false;
                this.canExport = true; // Can export for inventory tracking
                this.canBulkOperations = false;
                this.showStatistics = false;
                break;

            default:
                // Default to read-only access
                this.canCreate = false;
                this.canEdit = false;
                this.canDelete = false;
                this.canConfirm = false;
                this.canCancel = false;
                this.canRecordPayment = false;
                this.canExport = false;
                this.canBulkOperations = false;
                this.showStatistics = false;
                break;
        }

        // Update displayed columns based on permissions
        this.updateDisplayedColumns();
    }

    /**
     * Update displayed columns based on permissions
     */
    private updateDisplayedColumns(): void {
        this.displayedColumns = ['invoiceNumber', 'customer', 'invoiceDate', 'dueDate', 'totalAmount', 'status', 'paymentStatus', 'actions'];

        if (this.canBulkOperations) {
            this.displayedColumns = ['select', ...this.displayedColumns];
        }
    }

    /**
     * Load filters from URL query parameters
     */
    private loadFiltersFromUrl(): void {
        const params = this.route.snapshot.queryParams;

        this.currentFilters = {};

        if (params['search']) {
            this.currentFilters.search = params['search'];
        }

        if (params['customerId']) {
            this.currentFilters.customerId = params['customerId'];
        }

        if (params['salesmanId']) {
            this.currentFilters.salesmanId = params['salesmanId'];
        }

        if (params['warehouseId']) {
            this.currentFilters.warehouseId = params['warehouseId'];
        }

        if (params['status']) {
            this.currentFilters.status = params['status'].split(',') as InvoiceStatus[];
        }

        if (params['paymentStatus']) {
            this.currentFilters.paymentStatus = params['paymentStatus'].split(',') as PaymentStatus[];
        }

        if (params['dateFrom']) {
            this.currentFilters.dateFrom = new Date(params['dateFrom']);
        }

        if (params['dateTo']) {
            this.currentFilters.dateTo = new Date(params['dateTo']);
        }

        if (params['amountFrom']) {
            this.currentFilters.amountFrom = parseFloat(params['amountFrom']);
        }

        if (params['amountTo']) {
            this.currentFilters.amountTo = parseFloat(params['amountTo']);
        }

        // Load pagination and sorting from URL
        if (params['page']) {
            this.currentPage = parseInt(params['page']) - 1; // Convert to 0-based
        }

        if (params['pageSize']) {
            this.pageSize = parseInt(params['pageSize']);
        }

        if (params['sortBy']) {
            this.currentSort.active = params['sortBy'];
        }

        if (params['sortOrder']) {
            this.currentSort.direction = params['sortOrder'] as 'asc' | 'desc';
        }
    }

    /**
     * Update URL parameters with current state
     */
    private updateUrlParams(): void {
        const queryParams: any = {};

        // Add filter parameters
        if (this.currentFilters.search) {
            queryParams['search'] = this.currentFilters.search;
        }

        if (this.currentFilters.customerId) {
            queryParams['customerId'] = this.currentFilters.customerId;
        }

        if (this.currentFilters.salesmanId) {
            queryParams['salesmanId'] = this.currentFilters.salesmanId;
        }

        if (this.currentFilters.warehouseId) {
            queryParams['warehouseId'] = this.currentFilters.warehouseId;
        }

        if (this.currentFilters.status && this.currentFilters.status.length > 0) {
            queryParams['status'] = this.currentFilters.status.join(',');
        }

        if (this.currentFilters.paymentStatus && this.currentFilters.paymentStatus.length > 0) {
            queryParams['paymentStatus'] = this.currentFilters.paymentStatus.join(',');
        }

        if (this.currentFilters.dateFrom) {
            queryParams['dateFrom'] = this.currentFilters.dateFrom.toISOString();
        }

        if (this.currentFilters.dateTo) {
            queryParams['dateTo'] = this.currentFilters.dateTo.toISOString();
        }

        if (this.currentFilters.amountFrom !== undefined) {
            queryParams['amountFrom'] = this.currentFilters.amountFrom.toString();
        }

        if (this.currentFilters.amountTo !== undefined) {
            queryParams['amountTo'] = this.currentFilters.amountTo.toString();
        }

        // Add pagination parameters
        if (this.currentPage > 0) {
            queryParams['page'] = (this.currentPage + 1).toString(); // Convert to 1-based
        }

        if (this.pageSize !== 25) { // Only add if different from default
            queryParams['pageSize'] = this.pageSize.toString();
        }

        // Add sorting parameters
        if (this.currentSort.active !== 'invoiceDate') { // Only add if different from default
            queryParams['sortBy'] = this.currentSort.active;
        }

        if (this.currentSort.direction !== 'desc') { // Only add if different from default
            queryParams['sortOrder'] = this.currentSort.direction;
        }

        // Update URL without triggering navigation
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'replace'
        });
    }

    /**
     * Check screen size for responsive design
     */
    private checkScreenSize(): void {
        this.isMobile = window.innerWidth < 768;
    }

    /**
     * Setup responsive listener
     */
    private setupResponsiveListener(): void {
        window.addEventListener('resize', () => {
            this.checkScreenSize();
        });
    }

    // Selection methods for bulk operations
    isAllSelected(): boolean {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle(): void {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.data.forEach(row => this.selection.select(row));
    }

    checkboxLabel(row?: SalesInvoice): string {
        if (!row) {
            return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
        }
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.invoiceNumber}`;
    }

    hasSelectedInvoices(): boolean {
        return this.selection.selected.length > 0;
    }

    // Action methods
    confirmInvoice(invoice: SalesInvoice): void {
        if (!this.canConfirm) {
            this.showErrorMessage('You do not have permission to confirm invoices.');
            return;
        }

        if (invoice.status !== InvoiceStatus.DRAFT) {
            this.showErrorMessage('Only draft invoices can be confirmed.');
            return;
        }

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                title: 'Confirm Invoice',
                message: `Are you sure you want to confirm invoice ${invoice.invoiceNumber}?`,
                action: 'confirm',
                invoice: invoice
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                this.salesInvoiceService.confirmInvoice(invoice._id, result.reason ? { reason: result.reason } : undefined)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response) => {
                            this.loading = false;
                            if (response.success) {
                                this.showSuccessMessage(`Invoice ${invoice.invoiceNumber} confirmed successfully.`);
                                this.loadInvoices(); // Refresh the list
                            } else {
                                this.showErrorMessage('Failed to confirm invoice.');
                            }
                        },
                        error: (error) => {
                            this.loading = false;
                            this.showErrorMessage(error.userMessage || 'Failed to confirm invoice.');
                        }
                    });
            }
        });
    }

    cancelInvoice(invoice: SalesInvoice): void {
        if (!this.canCancel) {
            this.showErrorMessage('You do not have permission to cancel invoices.');
            return;
        }

        if (invoice.status === InvoiceStatus.CANCELLED) {
            this.showErrorMessage('Invoice is already cancelled.');
            return;
        }

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                title: 'Cancel Invoice',
                message: `Are you sure you want to cancel invoice ${invoice.invoiceNumber}?`,
                action: 'cancel',
                invoice: invoice,
                requireReason: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                this.salesInvoiceService.cancelInvoice(invoice._id, { reason: result.reason })
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response) => {
                            this.loading = false;
                            if (response.success) {
                                this.showSuccessMessage(`Invoice ${invoice.invoiceNumber} cancelled successfully.`);
                                this.loadInvoices(); // Refresh the list
                            } else {
                                this.showErrorMessage('Failed to cancel invoice.');
                            }
                        },
                        error: (error) => {
                            this.loading = false;
                            this.showErrorMessage(error.userMessage || 'Failed to cancel invoice.');
                        }
                    });
            }
        });
    }

    recordPayment(invoice: SalesInvoice): void {
        if (!this.canRecordPayment) {
            this.showErrorMessage('You do not have permission to record payments.');
            return;
        }

        if (invoice.status !== InvoiceStatus.CONFIRMED) {
            this.showErrorMessage('Payments can only be recorded for confirmed invoices.');
            return;
        }

        if (invoice.payment.paymentStatus === PaymentStatus.PAID) {
            this.showErrorMessage('Invoice is already fully paid.');
            return;
        }

        const dialogRef = this.dialog.open(PaymentDialogComponent, {
            width: '500px',
            data: {
                invoice: invoice,
                remainingAmount: invoice.payment.remainingAmount
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                const paymentService = result.amount >= invoice.payment.remainingAmount
                    ? this.salesInvoiceService.markAsPaid(invoice._id, result)
                    : this.salesInvoiceService.markAsPartialPaid(invoice._id, result);

                paymentService
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response) => {
                            this.loading = false;
                            if (response.success) {
                                this.showSuccessMessage(`Payment recorded successfully for invoice ${invoice.invoiceNumber}.`);
                                this.loadInvoices(); // Refresh the list
                            } else {
                                this.showErrorMessage('Failed to record payment.');
                            }
                        },
                        error: (error) => {
                            this.loading = false;
                            this.showErrorMessage(error.userMessage || 'Failed to record payment.');
                        }
                    });
            }
        });
    }

    printInvoice(invoice: SalesInvoice): void {
        this.loading = true;
        this.salesInvoiceService.printInvoice(invoice._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    this.loading = false;
                    // Create blob URL and trigger print
                    const url = window.URL.createObjectURL(blob);
                    const printWindow = window.open(url, '_blank');
                    if (printWindow) {
                        printWindow.onload = () => {
                            printWindow.print();
                            window.URL.revokeObjectURL(url);
                        };
                    } else {
                        this.showErrorMessage('Unable to open print window. Please check your popup blocker.');
                        window.URL.revokeObjectURL(url);
                    }
                },
                error: (error) => {
                    this.loading = false;
                    this.showErrorMessage(error.userMessage || 'Failed to print invoice.');
                }
            });
    }

    downloadPDF(invoice: SalesInvoice): void {
        this.loading = true;
        this.salesInvoiceService.getInvoicePDF(invoice._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    this.loading = false;
                    // Create blob URL and trigger download
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `invoice-${invoice.invoiceNumber}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    this.showSuccessMessage(`Invoice ${invoice.invoiceNumber} downloaded successfully.`);
                },
                error: (error) => {
                    this.loading = false;
                    this.showErrorMessage(error.userMessage || 'Failed to download invoice PDF.');
                }
            });
    }

    deleteInvoice(invoice: SalesInvoice): void {
        if (!this.canDelete) {
            this.showErrorMessage('You do not have permission to delete invoices.');
            return;
        }

        if (invoice.status !== InvoiceStatus.DRAFT) {
            this.showErrorMessage('Only draft invoices can be deleted.');
            return;
        }

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                title: 'Delete Invoice',
                message: `Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
                action: 'delete',
                invoice: invoice,
                requireReason: false
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                this.salesInvoiceService.deleteInvoice(invoice._id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response) => {
                            this.loading = false;
                            if (response.success) {
                                this.showSuccessMessage(`Invoice ${invoice.invoiceNumber} deleted successfully.`);
                                this.loadInvoices(); // Refresh the list
                            } else {
                                this.showErrorMessage('Failed to delete invoice.');
                            }
                        },
                        error: (error) => {
                            this.loading = false;
                            this.showErrorMessage(error.userMessage || 'Failed to delete invoice.');
                        }
                    });
            }
        });
    }

    exportInvoices(): void {
        if (!this.canExport) {
            this.showErrorMessage('You do not have permission to export invoices.');
            return;
        }

        this.loading = true;
        const queryParams: InvoiceQueryParams = {
            ...this.currentFilters,
            page: 1,
            limit: 10000, // Export all matching records
            sortBy: this.currentSort.active,
            sortOrder: this.currentSort.direction || 'desc'
        };

        this.salesInvoiceService.exportInvoices(queryParams, 'excel')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.loading = false;
                    if (response.success) {
                        // Trigger download
                        const link = document.createElement('a');
                        link.href = response.downloadUrl;
                        link.download = response.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        this.showSuccessMessage('Invoices exported successfully.');
                    } else {
                        this.showErrorMessage('Failed to export invoices.');
                    }
                },
                error: (error) => {
                    this.loading = false;
                    this.showErrorMessage(error.userMessage || 'Failed to export invoices.');
                }
            });
    }

    exportInvoicesPDF(): void {
        if (!this.canExport) {
            this.showErrorMessage('You do not have permission to export invoices.');
            return;
        }

        this.loading = true;
        const queryParams: InvoiceQueryParams = {
            ...this.currentFilters,
            page: 1,
            limit: 10000, // Export all matching records
            sortBy: this.currentSort.active,
            sortOrder: this.currentSort.direction || 'desc'
        };

        this.salesInvoiceService.exportInvoices(queryParams, 'pdf')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.loading = false;
                    if (response.success) {
                        // Trigger download
                        const link = document.createElement('a');
                        link.href = response.downloadUrl;
                        link.download = response.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        this.showSuccessMessage('Invoices exported to PDF successfully.');
                    } else {
                        this.showErrorMessage('Failed to export invoices to PDF.');
                    }
                },
                error: (error) => {
                    this.loading = false;
                    this.showErrorMessage(error.userMessage || 'Failed to export invoices to PDF.');
                }
            });
    }

    bulkConfirm(): void {
        if (!this.canBulkOperations) {
            this.showErrorMessage('You do not have permission to perform bulk operations.');
            return;
        }

        const selectedInvoices = this.selection.selected;
        if (selectedInvoices.length === 0) {
            this.showErrorMessage('Please select invoices to confirm.');
            return;
        }

        // Check if all selected invoices are drafts
        const nonDraftInvoices = selectedInvoices.filter(invoice => invoice.status !== InvoiceStatus.DRAFT);
        if (nonDraftInvoices.length > 0) {
            this.showErrorMessage('Only draft invoices can be confirmed. Please review your selection.');
            return;
        }

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                title: 'Bulk Confirm Invoices',
                message: `Are you sure you want to confirm ${selectedInvoices.length} selected invoices?`,
                action: 'bulk-confirm',
                invoices: selectedInvoices
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                const invoiceIds = selectedInvoices.map(invoice => invoice._id);

                this.salesInvoiceService.bulkConfirm(invoiceIds)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response) => {
                            this.loading = false;
                            if (response.success) {
                                this.showSuccessMessage(`${response.successful} invoices confirmed successfully.`);
                                if (response.failed > 0) {
                                    this.showErrorMessage(`${response.failed} invoices failed to confirm.`);
                                }
                                this.selection.clear();
                                this.loadInvoices(); // Refresh the list
                            } else {
                                this.showErrorMessage('Bulk confirm operation failed.');
                            }
                        },
                        error: (error) => {
                            this.loading = false;
                            this.showErrorMessage(error.userMessage || 'Bulk confirm operation failed.');
                        }
                    });
            }
        });
    }

    bulkCancel(): void {
        if (!this.canBulkOperations) {
            this.showErrorMessage('You do not have permission to perform bulk operations.');
            return;
        }

        const selectedInvoices = this.selection.selected;
        if (selectedInvoices.length === 0) {
            this.showErrorMessage('Please select invoices to cancel.');
            return;
        }

        // Check if any selected invoices are already cancelled
        const cancelledInvoices = selectedInvoices.filter(invoice => invoice.status === InvoiceStatus.CANCELLED);
        if (cancelledInvoices.length > 0) {
            this.showErrorMessage('Some selected invoices are already cancelled. Please review your selection.');
            return;
        }

        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                title: 'Bulk Cancel Invoices',
                message: `Are you sure you want to cancel ${selectedInvoices.length} selected invoices?`,
                action: 'bulk-cancel',
                invoices: selectedInvoices,
                requireReason: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                const invoiceIds = selectedInvoices.map(invoice => invoice._id);

                this.salesInvoiceService.bulkCancel(invoiceIds, result.reason)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response) => {
                            this.loading = false;
                            if (response.success) {
                                this.showSuccessMessage(`${response.successful} invoices cancelled successfully.`);
                                if (response.failed > 0) {
                                    this.showErrorMessage(`${response.failed} invoices failed to cancel.`);
                                }
                                this.selection.clear();
                                this.loadInvoices(); // Refresh the list
                            } else {
                                this.showErrorMessage('Bulk cancel operation failed.');
                            }
                        },
                        error: (error) => {
                            this.loading = false;
                            this.showErrorMessage(error.userMessage || 'Bulk cancel operation failed.');
                        }
                    });
            }
        });
    }

    /**
     * Show success message
     */
    private showSuccessMessage(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Show error message
     */
    private showErrorMessage(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 7000,
            panelClass: ['error-snackbar']
        });
    }
}