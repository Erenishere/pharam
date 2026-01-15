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
import { UserService } from '../../services/user.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { User, UserRole, UserFilters } from '../../../../core/models/user.model';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';
import { UserDetailDialogComponent } from '../user-detail-dialog/user-detail-dialog.component';

@Component({
    selector: 'app-user-list',
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
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss'
})

export class UserListComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    displayedColumns: string[] = ['username', 'email', 'role', 'status', 'createdAt', 'actions'];
    dataSource = new MatTableDataSource<User>([]);

    searchControl = new FormControl('');
    selectedRole: string = '';
    showDeleted = false;

    totalUsers = 0;
    pageSize = 10;
    pageIndex = 0;

    loading = false;
    roles = Object.values(UserRole);

    private destroy$ = new Subject<void>();
    private pendingActions = new Map<string, boolean>();

    constructor(
        private userService: UserService,
        private toastService: ToastService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadUsers();
        this.setupSearch();
    }

    ngAfterViewInit(): void {
        // Don't connect paginator to data source since we're using server-side pagination
        // The paginator will be controlled manually through the component properties
        this.dataSource.sort = this.sort;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
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
                this.loadUsers();
            });
    }

    loadUsers(): void {
        console.log('[UserListComponent] Loading users...');
        console.log('[UserListComponent] showDeleted:', this.showDeleted);
        this.loading = true;

        const filters: UserFilters = {
            page: this.pageIndex + 1,
            limit: this.pageSize,
            search: this.searchControl.value || undefined,
            role: this.selectedRole || undefined,
            // When showDeleted is true, show only deleted users (isActive: false)
            // When showDeleted is false, show all users (don't filter by isActive)
            ...(this.showDeleted ? { isActive: false } : {})
        };

        console.log('[UserListComponent] Filters:', filters);

        this.userService.getUsers(filters)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('[UserListComponent] Users loaded successfully:', response);
                    if (response.success) {
                        this.dataSource.data = response.data || [];

                        // Handle pagination data with fallbacks
                        if (response.pagination && typeof response.pagination.total === 'number') {
                            this.totalUsers = response.pagination.total;
                        } else {
                            // Fallback: use the length of returned data if pagination is missing
                            this.totalUsers = this.dataSource.data.length;
                            console.warn('[UserListComponent] No pagination.total found, using data length as fallback');
                        }

                        // Update paginator properties manually for server-side pagination
                        this.updatePaginatorState();

                        console.log('[UserListComponent] Pagination info:', {
                            total: this.totalUsers,
                            currentPage: this.pageIndex,
                            pageSize: this.pageSize,
                            loadedUsers: this.dataSource.data.length,
                            backendPagination: response.pagination,
                            fullResponse: response
                        });
                    } else {
                        console.error('[UserListComponent] Response success=false');
                        this.toastService.error('Failed to load users');
                    }
                    this.loading = false;
                },
                error: (error: any) => {
                    console.error('[UserListComponent] Error loading users:', error);
                    let errorMessage = 'Failed to load users';
                    if (error.status === 0) {
                        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
                    } else if (error.status === 401) {
                        errorMessage = 'Unauthorized. Please login again.';
                    } else if (error.error?.message) {
                        errorMessage = error.error.message;
                    }
                    this.toastService.error(errorMessage);
                    this.loading = false;
                }
            });
    }

    onPageChange(event: any): void {
        console.log('[UserListComponent] Page change event:', event);

        // If page size changed, reset to first page
        if (this.pageSize !== event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            // Only page index changed
            this.pageIndex = event.pageIndex;
        }

        this.loadUsers();
    }

    onRoleFilterChange(role: string): void {
        this.selectedRole = role;
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadUsers();
    }

    toggleShowDeleted(): void {
        this.pageIndex = 0;
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadUsers();
    }

    isActionPending(userId: string, action: string): boolean {
        return this.pendingActions.get(`${userId}-${action}`) || false;
    }

    setActionPending(userId: string, action: string, pending: boolean): void {
        if (pending) {
            this.pendingActions.set(`${userId}-${action}`, true);
        } else {
            this.pendingActions.delete(`${userId}-${action}`);
        }
    }

    toggleUserStatus(user: User, event: any): void {
        event.stopPropagation();
        const actionKey = 'toggle-status';
        this.setActionPending(user._id, actionKey, true);

        const originalStatus = user.isActive;
        user.isActive = !user.isActive;

        this.userService.toggleUserStatus(user._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success(`User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
                        const index = this.dataSource.data.findIndex(u => u._id === user._id);
                        if (index !== -1) {
                            this.dataSource.data[index] = response.data;
                            this.dataSource.data = [...this.dataSource.data];
                        }
                    }
                    this.setActionPending(user._id, actionKey, false);
                },
                error: (error: any) => {
                    user.isActive = originalStatus;
                    this.dataSource.data = [...this.dataSource.data];
                    this.toastService.error(error.userMessage || 'Failed to update user status');
                    this.setActionPending(user._id, actionKey, false);
                }
            });
    }

    updateUserRole(user: User, newRole: string): void {
        const actionKey = 'update-role';
        this.setActionPending(user._id, actionKey, true);

        const originalRole = user.role;
        user.role = newRole;

        this.userService.updateUserRole(user._id, newRole)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success('User role updated successfully');
                        const index = this.dataSource.data.findIndex(u => u._id === user._id);
                        if (index !== -1) {
                            this.dataSource.data[index] = response.data;
                            this.dataSource.data = [...this.dataSource.data];
                        }
                    }
                    this.setActionPending(user._id, actionKey, false);
                },
                error: (error: any) => {
                    user.role = originalRole;
                    this.dataSource.data = [...this.dataSource.data];
                    this.toastService.error(error.userMessage || 'Failed to update user role');
                    this.setActionPending(user._id, actionKey, false);
                }
            });
    }

    async deleteUser(user: User): Promise<void> {
        const confirmed = await this.toastService.confirm(
            `This will permanently delete the user "${user.username}". This action cannot be undone.`,
            'Delete User?',
            'Yes, delete it',
            'Cancel'
        );

        if (!confirmed) {
            return;
        }

        const actionKey = 'delete';
        this.setActionPending(user._id, actionKey, true);

        this.userService.deleteUser(user._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success('User deleted successfully');
                        this.loadUsers();
                    }
                    this.setActionPending(user._id, actionKey, false);
                },
                error: (error: any) => {
                    this.toastService.error(error.userMessage || 'Failed to delete user');
                    this.setActionPending(user._id, actionKey, false);
                }
            });
    }

    restoreUser(user: User): void {
        const actionKey = 'restore';
        this.setActionPending(user._id, actionKey, true);

        this.userService.restoreUser(user._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success('User restored successfully');
                        this.loadUsers();
                    }
                    this.setActionPending(user._id, actionKey, false);
                },
                error: (error: any) => {
                    this.toastService.error(error.userMessage || 'Failed to restore user');
                    this.setActionPending(user._id, actionKey, false);
                }
            });
    }

    async resetPassword(user: User): Promise<void> {
        const confirmed = await this.toastService.confirm(
            `A password reset email will be sent to ${user.email}`,
            'Reset Password?',
            'Yes, send email',
            'Cancel'
        );

        if (!confirmed) {
            return;
        }

        const actionKey = 'reset-password';
        this.setActionPending(user._id, actionKey, true);

        this.userService.resetUserPassword(user._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.toastService.success(response.message || 'Password reset email sent');
                    }
                    this.setActionPending(user._id, actionKey, false);
                },
                error: (error: any) => {
                    this.toastService.error(error.userMessage || 'Failed to reset password');
                    this.setActionPending(user._id, actionKey, false);
                }
            });
    }

    openCreateUserDialog(): void {
        const dialogRef = this.dialog.open(UserFormDialogComponent, {
            width: '500px',
            disableClose: false,
            data: { user: null }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('[UserListComponent] User created:', result);
                this.toastService.success(`User "${result.username}" created successfully!`);
                this.loadUsers();
            }
        });
    }

    viewUserDetail(user: User): void {
        this.dialog.open(UserDetailDialogComponent, {
            width: '600px',
            disableClose: false,
            data: user
        });
    }

    editUser(user: User): void {
        const dialogRef = this.dialog.open(UserFormDialogComponent, {
            width: '500px',
            disableClose: false,
            data: { user }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('[UserListComponent] User updated:', result);
                this.toastService.success(`User "${result.username}" updated successfully!`);
                this.loadUsers();
            }
        });
    }

    formatDate(date: string): string {
        return new Date(date).toLocaleDateString();
    }

    private updatePaginatorState(): void {
        if (this.paginator) {
            // Force update paginator properties
            this.paginator.length = this.totalUsers;
            this.paginator.pageSize = this.pageSize;
            this.paginator.pageIndex = this.pageIndex;

            // Note: Removed private property access as it's not accessible
        }
    }
}
