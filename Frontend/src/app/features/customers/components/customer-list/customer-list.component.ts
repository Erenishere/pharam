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
import { CustomerService } from '../../services/customer.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Customer, CustomerType, CustomerFilters } from '../../../../core/models/customer.model';
import { CustomerFormDialogComponent } from '../customer-form/customer-form-dialog.component';
import { CustomerDetailDialogComponent } from '../customer-detail/customer-detail-dialog.component';

@Component({
    selector: 'app-customer-list',
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
        MatDialogModule
    ],
    templateUrl: './customer-list.component.html',
    styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    displayedColumns: string[] = ['code', 'name', 'email', 'phone', 'type', 'status', 'createdAt', 'actions'];
    dataSource = new MatTableDataSource<Customer>([]);

    searchControl = new FormControl('');
    selectedType: string = '';
    showDeleted = false;

    totalCustomers = 0;
    pageSize = 10;
    pageIndex = 0;

    loading = false;
    types = Object.values(CustomerType);

    private destroy$ = new Subject<void>();
    private pendingActions = new Map<string, boolean>();

    constructor(
        private customerService: CustomerService,
        private toastService: ToastService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadCustomers();
        this.setupSearch();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewInit(): void {
        // Don't connect paginator to data source since we're using server-side pagination
        this.dataSource.sort = this.sort;
    }

    setupSearch(): void {
        this.searchControl.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.pageIndex = 0;
                if (this.paginator) {
                    this.paginator.pageIndex = 0;
                }
                this.loadCustomers();
            });
    }

    loadCustomers(): void {
        console.log('[CustomerListComponent] Loading customers...');
        console.log('[CustomerListComponent] showDeleted:', this.showDeleted);
        this.loading = true;

        const filters: CustomerFilters = {
            page: this.pageIndex + 1,
            limit: this.pageSize,
            search: this.searchControl.value || undefined,
        };

        // ✅ Apply type filter ONLY when specific type is selected
        if (this.selectedType) {
            filters.type = this.selectedType;
        }

        // ✅ Apply deleted filter ONLY when toggle is ON
        if (this.showDeleted) {
            filters.isActive = false;
        }



        console.log('[CustomerListComponent] Filters:', filters);

        this.customerService.getCustomers(filters)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('[CustomerListComponent] Customers loaded successfully:', response);
                    if (response.success) {
                        // Always show all customers - no frontend filtering
                        let customersToShow = response.data || [];

                        console.log('[CustomerListComponent] Showing ALL customers from backend without any filtering');
                        console.log('[CustomerListComponent] Original data count:', response.data?.length);
                        console.log('[CustomerListComponent] Final data count:', customersToShow.length);
                        console.log('[CustomerListComponent] Customer types:', customersToShow.map(customer => ({ name: customer.name, type: customer.type })));

                        this.dataSource.data = customersToShow;

                        // Handle pagination data with correct backend field names
                        if (response.pagination) {
                            // Backend returns 'totalItems', not 'total'
                            this.totalCustomers = response.pagination.totalItems || response.pagination.total || 0;
                        } else {
                            this.totalCustomers = customersToShow.length;
                            console.warn('[CustomerListComponent] No pagination found, using data length as fallback');
                        }

                        // Update paginator properties manually for server-side pagination
                        this.updatePaginatorState();

                        console.log('[CustomerListComponent] Pagination info:', {
                            total: this.totalCustomers,
                            currentPage: this.pageIndex,
                            pageSize: this.pageSize,
                            loadedCustomers: this.dataSource.data.length,
                            backendPagination: response.pagination,
                            fullResponse: response
                        });
                    } else {
                        console.error('[CustomerListComponent] Response success=false');
                        this.toastService.error('Failed to load customers');
                    }
                    this.loading = false;
                },
                error: (error: any) => {
                    console.error('[CustomerListComponent] Full error object:', error);
                    console.error('[CustomerListComponent] Error status:', error.status);
                    console.error('[CustomerListComponent] Error message:', error.message);
                    console.error('[CustomerListComponent] Error URL:', error.url);

                    let errorMessage = 'Failed to load customers';
                    if (error.status === 0) {
                        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
                    } else if (error.status === 404) {
                        errorMessage = 'Customer endpoint not found. Please check if the backend has customer routes.';
                    } else if (error.status === 401) {
                        errorMessage = 'Unauthorized. Please login again.';
                    } else if (error.status === 500) {
                        errorMessage = 'Server error. Please check the backend logs.';
                    } else if (error.error?.message) {
                        errorMessage = error.error.message;
                    }

                    this.toastService.error(errorMessage);
                    this.loading = false;
                }
            });
    }

    onPageChange(event: any): void {
        console.log('[CustomerListComponent] Page change event:', event);

        // If page size changed, reset to first page
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            // Only page index changed
            this.pageIndex = event.pageIndex;
        }

        this.loadCustomers();
    }

    onTypeFilterChange(type: string): void {
        this.selectedType = type;
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadCustomers();
    }

    toggleShowDeleted(): void {
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadCustomers();
    }

    isActionPending(customerId: string, action: string): boolean {
        return this.pendingActions.get(`${customerId}-${action}`) || false;
    }

    setActionPending(customerId: string, action: string, pending: boolean): void {
        if (pending) {
            this.pendingActions.set(`${customerId}-${action}`, true);
        } else {
            this.pendingActions.delete(`${customerId}-${action}`);
        }
    }

    toggleCustomerStatus(customer: Customer, event: any): void {
        event.stopPropagation();
        const actionKey = 'toggle-status';
        this.setActionPending(customer._id, actionKey, true);

        const originalStatus = customer.isActive;
        customer.isActive = !customer.isActive;

        this.customerService.toggleCustomerStatus(customer._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success(`Customer ${customer.isActive ? 'activated' : 'deactivated'} successfully`);
                        const index = this.dataSource.data.findIndex(c => c._id === customer._id);
                        if (index !== -1) {
                            this.dataSource.data[index] = response.data;
                            this.dataSource.data = [...this.dataSource.data];
                        }
                    }
                    this.setActionPending(customer._id, actionKey, false);
                },
                error: (error: any) => {
                    customer.isActive = originalStatus;
                    this.dataSource.data = [...this.dataSource.data];
                    this.toastService.error(error.userMessage || 'Failed to update customer status');
                    this.setActionPending(customer._id, actionKey, false);
                }
            });
    }

    async deleteCustomer(customer: Customer): Promise<void> {
        const confirmed = await this.toastService.confirm(
            `This will permanently delete the customer "${customer.name}". This action cannot be undone.`,
            'Delete Customer?',
            'Yes, delete it',
            'Cancel'
        );

        if (!confirmed) {
            return;
        }

        const actionKey = 'delete';
        this.setActionPending(customer._id, actionKey, true);

        this.customerService.deleteCustomer(customer._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success('Customer deleted successfully');
                        this.loadCustomers();
                    }
                    this.setActionPending(customer._id, actionKey, false);
                },
                error: (error: any) => {
                    this.toastService.error(error.userMessage || 'Failed to delete customer');
                    this.setActionPending(customer._id, actionKey, false);
                }
            });
    }

    restoreCustomer(customer: Customer): void {
        const actionKey = 'restore';
        this.setActionPending(customer._id, actionKey, true);

        this.customerService.restoreCustomer(customer._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success('Customer restored successfully');
                        this.loadCustomers();
                    }
                    this.setActionPending(customer._id, actionKey, false);
                },
                error: (error: any) => {
                    this.toastService.error(error.userMessage || 'Failed to restore customer');
                    this.setActionPending(customer._id, actionKey, false);
                }
            });
    }

    openCreateCustomerDialog(): void {
        const dialogRef = this.dialog.open(CustomerFormDialogComponent, {
            width: '500px',
            disableClose: false,
            data: { customer: null }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('[CustomerListComponent] Customer created:', result);
                this.toastService.success(`Customer "${result.name}" created successfully!`);
                this.loadCustomers();
            }
        });
    }

    viewCustomerDetail(customer: Customer): void {
        this.dialog.open(CustomerDetailDialogComponent, {
            width: '600px',
            disableClose: false,
            data: customer
        });
    }

    editCustomer(customer: Customer): void {
        const dialogRef = this.dialog.open(CustomerFormDialogComponent, {
            width: '500px',
            disableClose: false,
            data: { customer }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('[CustomerListComponent] Customer updated:', result);
                this.toastService.success(`Customer "${result.name}" updated successfully!`);
                this.loadCustomers();
            }
        });
    }

    formatDate(date: string): string {
        return new Date(date).toLocaleDateString();
    }

    private updatePaginatorState(): void {
        if (this.paginator) {
            // Force update paginator properties
            this.paginator.length = this.totalCustomers;
            this.paginator.pageSize = this.pageSize;
            this.paginator.pageIndex = this.pageIndex;
            // Note: Removed private property access as it's not accessible
        }
    }
}