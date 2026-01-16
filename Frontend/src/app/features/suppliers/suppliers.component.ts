import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SupplierService } from './services/supplier.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Supplier, SupplierQueryParams, SupplierStatistics } from './models/supplier.model';
import { UserRole } from '../../core/models/user.model';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { SupplierDetailComponent } from './components/supplier-detail/supplier-detail.component';
import { SupplierStatsComponent } from './components/supplier-stats/supplier-stats.component';

/**
 * Suppliers Component
 * 
 * Main component for displaying and managing suppliers.
 * Provides list view with pagination, filtering, search, and CRUD operations.
 * 
 * Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1, 9.2, 9.3, 9.4
 */
@Component({
    selector: 'app-suppliers',
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
        MatSlideToggleModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        SupplierStatsComponent
    ],
    templateUrl: './suppliers.component.html',
    styleUrl: './suppliers.component.scss'
})
export class SuppliersComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // Table configuration
    displayedColumns: string[] = ['code', 'name', 'type', 'phone', 'email', 'city', 'isActive', 'actions'];
    dataSource = new MatTableDataSource<Supplier>([]);

    // Filter controls
    searchControl = new FormControl('');
    selectedType: string = '';
    showInactive = false;

    // Pagination
    totalSuppliers = 0;
    pageSize = 10;
    pageIndex = 0;
    pageSizeOptions = [10, 25, 50, 100];

    // State
    loading = false;
    error: string | null = null;

    // Type options for filter
    types = [
        { value: '', label: 'All Types' },
        { value: 'customer', label: 'Customer' },
        { value: 'supplier', label: 'Supplier' },
        { value: 'both', label: 'Both' }
    ];

    // Permission flags
    canCreate = false;
    canEdit = false;
    canDelete = false;
    canRestore = false;
    canToggleStatus = false;

    // Statistics
    statistics: SupplierStatistics | null = null;
    statisticsLoading = false;
    statisticsError: string | null = null;
    showStatistics = false;

    private destroy$ = new Subject<void>();
    private pendingActions = new Map<string, boolean>();

    constructor(
        private supplierService: SupplierService,
        private toastService: ToastService,
        private authService: AuthService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.checkPermissions();
        this.loadSuppliers();
        this.setupSearch();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewInit(): void {
        // Connect sort to data source
        this.dataSource.sort = this.sort;
    }

    /**
     * Check user permissions based on role
     * Requirements: 3.1, 4.1, 5.5, 6.5, 7.5, 11.5
     */
    private checkPermissions(): void {
        this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
            if (user) {
                const role = user.role;

                // Admin has all permissions
                if (role === UserRole.ADMIN) {
                    this.canCreate = true;
                    this.canEdit = true;
                    this.canDelete = true;
                    this.canRestore = true;
                    this.canToggleStatus = true;
                    this.showStatistics = true;
                }
                // Purchase role can create, edit, and toggle status
                else if (role === UserRole.PURCHASE) {
                    this.canCreate = true;
                    this.canEdit = true;
                    this.canDelete = false;
                    this.canRestore = false;
                    this.canToggleStatus = true;
                    this.showStatistics = false;
                }
                // Data entry can create and edit
                else if (role === UserRole.DATA_ENTRY) {
                    this.canCreate = true;
                    this.canEdit = true;
                    this.canDelete = false;
                    this.canRestore = false;
                    this.canToggleStatus = false;
                    this.showStatistics = false;
                }
                // Accountant can view statistics
                else if (role === UserRole.ACCOUNTANT) {
                    this.canCreate = false;
                    this.canEdit = false;
                    this.canDelete = false;
                    this.canRestore = false;
                    this.canToggleStatus = false;
                    this.showStatistics = true;
                }
                // Other roles have read-only access
                else {
                    this.canCreate = false;
                    this.canEdit = false;
                    this.canDelete = false;
                    this.canRestore = false;
                    this.canToggleStatus = false;
                    this.showStatistics = false;
                }

                // Load statistics if user has permission
                if (this.showStatistics) {
                    this.loadStatistics();
                }
            }
        });
    }

    /**
     * Setup search with debounce
     * Requirements: 2.4, 10.1, 10.2
     */
    private setupSearch(): void {
        this.searchControl.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((searchValue) => {
                this.pageIndex = 0;
                if (this.paginator) {
                    this.paginator.pageIndex = 0;
                }
                // Always use loadSuppliers which handles search parameter
                this.loadSuppliers();
            });
    }

    /**
     * Check if the search term looks like a supplier code
     * Supplier codes typically are alphanumeric and may contain hyphens or underscores
     * 
     * Requirements: 10.1
     */
    private isSupplierCode(searchTerm: string): boolean {
        // Match patterns like: SUP001, CUST-123, SUP_001, etc.
        // Code format: starts with letters, may contain numbers, hyphens, underscores
        const codePattern = /^[A-Z]{2,}[-_]?\d+$/i;
        return codePattern.test(searchTerm);
    }

    /**
     * Search for a supplier by code
     * 
     * @param code - The supplier code to search for
     * @private
     * 
     * Requirements: 10.2, 10.3, 10.4
     */
    private searchByCode(code: string): void {
        this.loading = true;
        this.error = null;

        this.supplierService.getSupplierByCode(code)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.loading = false;

                    if (response.success && response.data) {
                        // Display single supplier result
                        this.dataSource.data = [response.data];
                        this.totalSuppliers = 1;
                        this.updatePaginatorState();
                        this.toastService.success(`Supplier found: ${response.data.name}`);
                        this.error = null;
                    } else {
                        // No supplier found
                        this.dataSource.data = [];
                        this.totalSuppliers = 0;
                        this.updatePaginatorState();
                        this.toastService.info(`No supplier found with code: ${code}`);
                    }
                },
                error: (error: any) => {
                    console.error('[SuppliersComponent] Error searching by code:', error);
                    this.loading = false;

                    // If 404, show not found message
                    if (error.originalError?.status === 404) {
                        this.dataSource.data = [];
                        this.totalSuppliers = 0;
                        this.updatePaginatorState();
                        this.toastService.info(`No supplier found with code: ${code}`);
                    } else {
                        // Other errors
                        this.error = this.getUserFriendlyErrorMessage(error, 'searching for supplier');
                        this.toastService.error(this.error);
                    }
                }
            });
    }

    /**
     * Clear search and reload full list
     * 
     * Resets the search control and reloads the complete supplier list
     * 
     * Requirements: 10.4
     */
    clearSearch(): void {
        this.searchControl.setValue('', { emitEvent: false });
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadSuppliers();
    }

    /**
     * Load supplier statistics
     * Requirements: 11.1, 11.2, 11.3, 11.4
     */
    loadStatistics(): void {
        console.log('[SuppliersComponent] Loading statistics...');
        this.statisticsLoading = true;
        this.statisticsError = null;

        this.supplierService.getStatistics()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('[SuppliersComponent] Statistics loaded successfully:', response);
                    if (response.success) {
                        this.statistics = response.data;
                        this.statisticsError = null;
                    } else {
                        this.statisticsError = 'Failed to load statistics';
                    }
                    this.statisticsLoading = false;
                },
                error: (error: any) => {
                    console.error('[SuppliersComponent] Error loading statistics:', error);
                    this.statisticsError = this.getUserFriendlyErrorMessage(error, 'loading statistics');
                    this.statisticsLoading = false;
                }
            });
    }

    /**
     * Retry loading statistics after an error
     * Requirements: 11.2
     */
    retryLoadStatistics(): void {
        this.statisticsError = null;
        this.loadStatistics();
    }

    /**
     * Load suppliers from API with current filters
     * Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8
     */
    loadSuppliers(): void {
        console.log('[SuppliersComponent] Loading suppliers...');
        this.loading = true;
        this.error = null;

        const params: SupplierQueryParams = {
            page: this.pageIndex + 1,
            limit: this.pageSize,
            search: this.searchControl.value || undefined,
        };

        // Apply type filter if selected
        if (this.selectedType && this.selectedType.trim() !== '') {
            params.type = this.selectedType as 'customer' | 'supplier' | 'both';
            console.log('[SuppliersComponent] Adding type filter:', this.selectedType);
        }

        // Apply status filter based on toggle
        // When showInactive is true, only show inactive suppliers (isActive = false)
        // When showInactive is false, show all suppliers (no filter)
        if (this.showInactive) {
            params.isActive = false;
            console.log('[SuppliersComponent] Showing only inactive suppliers');
        } else {
            console.log('[SuppliersComponent] Showing all suppliers');
        }

        console.log('[SuppliersComponent] Final params:', params);

        this.supplierService.getSuppliers(params)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('[SuppliersComponent] Suppliers loaded successfully:', response);
                    if (response.success) {
                        this.dataSource.data = response.data || [];

                        // Handle pagination
                        if (response.pagination) {
                            this.totalSuppliers = response.pagination.totalItems || 0;
                        } else {
                            this.totalSuppliers = this.dataSource.data.length;
                        }

                        this.updatePaginatorState();

                        console.log('[SuppliersComponent] Pagination info:', {
                            total: this.totalSuppliers,
                            currentPage: this.pageIndex,
                            pageSize: this.pageSize,
                            loadedSuppliers: this.dataSource.data.length
                        });

                        this.error = null;
                    } else {
                        console.error('[SuppliersComponent] Response success=false');
                        this.error = 'Failed to load suppliers';
                        this.toastService.error(this.error);
                    }
                    this.loading = false;
                },
                error: (error: any) => {
                    console.error('[SuppliersComponent] Error loading suppliers:', error);

                    this.error = this.getUserFriendlyErrorMessage(error, 'loading suppliers');
                    this.toastService.error(this.error);
                    this.loading = false;
                }
            });
    }

    /**
     * Handle page change event
     * Requirements: 2.6
     */
    onPageChange(event: any): void {
        console.log('[SuppliersComponent] Page change event:', event);

        // If page size changed, reset to first page
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
        }

        this.loadSuppliers();
    }

    /**
     * Handle type filter change
     * Requirements: 2.5, 9.1, 9.2, 9.3
     */
    onTypeFilterChange(): void {
        console.log('[SuppliersComponent] Type filter changed to:', this.selectedType);
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadSuppliers();
    }

    /**
     * Toggle show inactive suppliers
     * Requirements: 2.5
     */
    toggleShowInactive(): void {
        console.log('[SuppliersComponent] Toggle show inactive:', this.showInactive);
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadSuppliers();
    }

    /**
     * Check if an action is pending for a supplier
     */
    isActionPending(supplierId: string, action: string): boolean {
        return this.pendingActions.get(`${supplierId}-${action}`) || false;
    }

    /**
     * Set action pending state
     */
    private setActionPending(supplierId: string, action: string, pending: boolean): void {
        if (pending) {
            this.pendingActions.set(`${supplierId}-${action}`, true);
        } else {
            this.pendingActions.delete(`${supplierId}-${action}`);
        }
    }

    /**
     * Format date for display
     */
    formatDate(date: string): string {
        return new Date(date).toLocaleDateString();
    }

    /**
     * Update paginator state for server-side pagination
     */
    private updatePaginatorState(): void {
        if (this.paginator) {
            this.paginator.length = this.totalSuppliers;
            this.paginator.pageSize = this.pageSize;
            this.paginator.pageIndex = this.pageIndex;
        }
    }

    /**
     * Get chip color based on supplier type
     */
    getTypeChipColor(type: string): string {
        switch (type) {
            case 'customer':
                return 'primary';
            case 'supplier':
                return 'accent';
            case 'both':
                return 'warn';
            default:
                return '';
        }
    }

    /**
     * Get status chip color
     */
    getStatusChipColor(isActive: boolean): string {
        return isActive ? 'primary' : 'warn';
    }

    /**
     * Get status label
     */
    getStatusLabel(isActive: boolean): string {
        return isActive ? 'Active' : 'Inactive';
    }

    /**
     * Open dialog to create a new supplier
     * Requirements: 3.1, 3.6, 3.7
     */
    openCreateDialog(): void {
        const dialogRef = this.dialog.open(SupplierFormComponent, {
            width: '500px',
            disableClose: false,
            data: {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.success) {
                this.toastService.success('Supplier created successfully');
                this.loadSuppliers();
                // Refresh statistics if visible
                if (this.showStatistics) {
                    this.loadStatistics();
                }
            }
        });
    }

    /**
     * Open dialog to edit an existing supplier
     * Requirements: 4.1, 4.2, 4.5, 4.6, 4.7
     */
    openEditDialog(supplier: Supplier): void {
        const dialogRef = this.dialog.open(SupplierFormComponent, {
            width: '500px',
            disableClose: false,
            data: { supplier }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.success) {
                this.toastService.success('Supplier updated successfully');
                this.loadSuppliers();
                // Refresh statistics if visible
                if (this.showStatistics) {
                    this.loadStatistics();
                }
            }
        });
    }

    /**
     * Open dialog to view supplier details
     * Requirements: 8.1, 8.2, 8.3, 8.4
     */
    openDetailDialog(supplier: Supplier): void {
        const dialogRef = this.dialog.open(SupplierDetailComponent, {
            width: '600px',
            disableClose: false,
            data: {
                supplier,
                canEdit: this.canEdit,
                canDelete: this.canDelete
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.action === 'edit') {
                // Navigate to edit dialog
                this.openEditDialog(result.supplier);
            } else if (result?.action === 'delete') {
                // Trigger delete confirmation
                this.confirmDelete(result.supplier);
            }
        });
    }

    /**
     * Confirm and delete a supplier
     * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
     */
    async confirmDelete(supplier: Supplier): Promise<void> {
        const confirmed = await this.toastService.confirm(
            `This will permanently delete the supplier "${supplier.name}" (${supplier.code}). This action cannot be undone.`,
            'Delete Supplier?',
            'Yes, delete it',
            'Cancel'
        );

        if (!confirmed) {
            return;
        }

        this.deleteSupplier(supplier);
    }

    /**
     * Delete a supplier (soft delete)
     * Requirements: 5.2, 5.3, 5.4
     */
    private deleteSupplier(supplier: Supplier): void {
        const supplierId = supplier._id;
        this.setActionPending(supplierId, 'delete', true);

        this.supplierService.deleteSupplier(supplierId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.setActionPending(supplierId, 'delete', false);
                    if (response.success) {
                        this.toastService.success('Supplier deleted successfully');
                        this.loadSuppliers();
                        // Refresh statistics if visible
                        if (this.showStatistics) {
                            this.loadStatistics();
                        }
                    } else {
                        this.toastService.error('Failed to delete supplier');
                    }
                },
                error: (error: any) => {
                    this.setActionPending(supplierId, 'delete', false);
                    const errorMessage = this.getUserFriendlyErrorMessage(error, 'deleting supplier');
                    this.toastService.error(errorMessage);
                }
            });
    }

    /**
     * Restore a soft-deleted supplier
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
     */
    restoreSupplier(supplier: Supplier): void {
        const supplierId = supplier._id;
        this.setActionPending(supplierId, 'restore', true);

        this.supplierService.restoreSupplier(supplierId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.setActionPending(supplierId, 'restore', false);
                    if (response.success) {
                        this.toastService.success('Supplier restored successfully');
                        this.loadSuppliers();
                        // Refresh statistics if visible
                        if (this.showStatistics) {
                            this.loadStatistics();
                        }
                    } else {
                        this.toastService.error('Failed to restore supplier');
                    }
                },
                error: (error: any) => {
                    this.setActionPending(supplierId, 'restore', false);
                    const errorMessage = this.getUserFriendlyErrorMessage(error, 'restoring supplier');
                    this.toastService.error(errorMessage);
                }
            });
    }

    /**
     * Toggle supplier active status
     * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
     */
    toggleStatus(supplier: Supplier, event: any): void {
        // Prevent event propagation
        event.stopPropagation();

        const supplierId = supplier._id;
        const previousStatus = supplier.isActive;
        const newStatus = !previousStatus;

        // Optimistically update UI
        supplier.isActive = newStatus;
        this.setActionPending(supplierId, 'toggle', true);

        this.supplierService.toggleSupplierStatus(supplierId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.setActionPending(supplierId, 'toggle', false);
                    if (response.success) {
                        // Update with actual response data
                        const updatedSupplier = response.data;
                        supplier.isActive = updatedSupplier.isActive;

                        const statusText = updatedSupplier.isActive ? 'activated' : 'deactivated';
                        this.toastService.success(`Supplier ${statusText} successfully`);
                        // Refresh statistics if visible
                        if (this.showStatistics) {
                            this.loadStatistics();
                        }
                    } else {
                        // Revert on failure
                        supplier.isActive = previousStatus;
                        this.toastService.error('Failed to toggle supplier status');
                    }
                },
                error: (error: any) => {
                    // Revert on error
                    supplier.isActive = previousStatus;
                    this.setActionPending(supplierId, 'toggle', false);
                    const errorMessage = this.getUserFriendlyErrorMessage(error, 'toggling supplier status');
                    this.toastService.error(errorMessage);
                }
            });
    }

    /**
     * Retry loading suppliers after an error
     * Requirements: 2.8
     */
    retryLoadSuppliers(): void {
        this.error = null;
        this.loadSuppliers();
    }

    /**
     * Get user-friendly error message based on error type
     * Requirements: 2.8, 3.8, 4.7, 5.4, 6.4, 7.4, 8.4, 9.4, 12.5
     */
    private getUserFriendlyErrorMessage(error: any, operation: string): string {
        // Network errors
        if (!navigator.onLine) {
            return 'No internet connection. Please check your network and try again.';
        }

        // Check for specific HTTP status codes
        if (error.originalError?.status) {
            const status = error.originalError.status;

            switch (status) {
                case 0:
                    return 'Unable to connect to the server. Please check your internet connection.';
                case 400:
                    return error.message || 'Invalid request. Please check your input and try again.';
                case 401:
                    return 'Your session has expired. Please log in again.';
                case 403:
                    return 'You do not have permission to perform this action.';
                case 404:
                    return 'The requested resource was not found.';
                case 409:
                    return error.message || 'A conflict occurred. The resource may already exist.';
                case 422:
                    return error.message || 'Validation failed. Please check your input.';
                case 500:
                    return 'A server error occurred. Please try again later.';
                case 503:
                    return 'The service is temporarily unavailable. Please try again later.';
                default:
                    if (status >= 500) {
                        return 'A server error occurred. Please try again later.';
                    }
            }
        }

        // Use error message if available
        if (error.message) {
            return error.message;
        }

        // Default fallback message
        return `An error occurred while ${operation}. Please try again.`;
    }
}
