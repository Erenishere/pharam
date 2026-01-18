import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { SuppliersComponent } from './suppliers.component';
import { SupplierService } from './services/supplier.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Supplier, SupplierStatistics, PaginatedResponse, ApiResponse } from './models/supplier.model';
import { UserRole } from '../../core/models/user.model';

/**
 * End-to-End Tests for Supplier Module
 * 
 * This test suite covers all supplier operations:
 * - Loading supplier list on page load
 * - Pagination (change page, change page size)
 * - Search functionality
 * - Type filter
 * - Status filter
 * - Create supplier flow
 * - Edit supplier flow
 * - Delete supplier flow
 * - Restore supplier flow
 * - Toggle status
 * - View supplier details
 * - Statistics display
 * - Permission-based UI
 * - Error scenarios
 * 
 * Requirements: All requirements
 */
describe('SuppliersComponent - End-to-End Tests', () => {
    let component: SuppliersComponent;
    let fixture: ComponentFixture<SuppliersComponent>;
    let supplierService: jasmine.SpyObj<SupplierService>;
    let toastService: jasmine.SpyObj<ToastService>;
    let authService: jasmine.SpyObj<AuthService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let httpMock: HttpTestingController;

    // Mock data
    const mockSuppliers: Supplier[] = [
        {
            _id: '1',
            code: 'SUP001',
            name: 'Test Supplier 1',
            type: 'supplier',
            contactInfo: {
                phone: '1234567890',
                email: 'supplier1@test.com',
                address: '123 Test St',
                city: 'Test City',
                country: 'Pakistan'
            },
            financialInfo: {
                creditLimit: 100000,
                paymentTerms: 30,
                whtPercent: 0,
                creditDays: 30,
                currency: 'PKR',
                advanceTaxRate: 0,
                isNonFiler: false
            },
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
            _id: '2',
            code: 'CUST001',
            name: 'Test Customer 1',
            type: 'customer',
            contactInfo: {
                phone: '0987654321',
                email: 'customer1@test.com',
                city: 'Test City 2',
                country: 'Pakistan'
            },
            financialInfo: {
                creditLimit: 50000,
                paymentTerms: 15,
                whtPercent: 0,
                creditDays: 15,
                currency: 'PKR',
                advanceTaxRate: 0,
                isNonFiler: false
            },
            isActive: false,
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z'
        }
    ];

    const mockPaginatedResponse: PaginatedResponse<Supplier> = {
        success: true,
        data: mockSuppliers,
        pagination: {
            totalItems: 2,
            totalPages: 1,
            currentPage: 1,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPreviousPage: false,
            nextPage: null,
            previousPage: null
        },
        message: 'Suppliers retrieved successfully',
        timestamp: '2024-01-01T00:00:00.000Z'
    };

    const mockStatistics: SupplierStatistics = {
        total: 2,
        active: 1,
        inactive: 1,
        byType: {
            customer: 1,
            supplier: 1,
            both: 0
        },
        totalCreditLimit: 150000,
        averagePaymentTerms: 22.5
    };

    const mockUser = {
        _id: '1',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        isActive: true
    };

    beforeEach(async () => {
        const supplierServiceSpy = jasmine.createSpyObj('SupplierService', [
            'getSuppliers',
            'getSuppliersByType',
            'getSupplierByCode',
            'getSupplierById',
            'createSupplier',
            'updateSupplier',
            'deleteSupplier',
            'restoreSupplier',
            'toggleSupplierStatus',
            'getStatistics'
        ]);

        const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);
        const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
            currentUser$: of(mockUser)
        });
        const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                SuppliersComponent,
                HttpClientTestingModule,
                BrowserAnimationsModule
            ],
            providers: [
                { provide: SupplierService, useValue: supplierServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: MatDialog, useValue: dialogSpy }
            ]
        }).compileComponents();

        supplierService = TestBed.inject(SupplierService) as jasmine.SpyObj<SupplierService>;
        toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
        httpMock = TestBed.inject(HttpTestingController);

        // Default spy returns
        supplierService.getSuppliers.and.returnValue(of(mockPaginatedResponse));
        supplierService.getStatistics.and.returnValue(of({
            success: true,
            data: mockStatistics,
            message: 'Statistics retrieved',
            timestamp: '2024-01-01T00:00:00.000Z'
        }));

        fixture = TestBed.createComponent(SuppliersComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        httpMock.verify();
    });

    // Test 1: Loading supplier list on page load
    describe('Loading supplier list on page load', () => {
        it('should load suppliers on component initialization', () => {
            fixture.detectChanges();

            expect(supplierService.getSuppliers).toHaveBeenCalled();
            expect(component.dataSource.data).toEqual(mockSuppliers);
            expect(component.totalSuppliers).toBe(2);
            expect(component.loading).toBe(false);
        });

        it('should display loading state while fetching suppliers', () => {
            component.loading = true;
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const spinner = compiled.querySelector('mat-spinner');
            expect(spinner).toBeTruthy();
        });

        it('should handle empty supplier list', () => {
            const emptyResponse: PaginatedResponse<Supplier> = {
                ...mockPaginatedResponse,
                data: [],
                pagination: { ...mockPaginatedResponse.pagination, totalItems: 0 }
            };
            supplierService.getSuppliers.and.returnValue(of(emptyResponse));

            fixture.detectChanges();

            expect(component.dataSource.data.length).toBe(0);
            expect(component.totalSuppliers).toBe(0);
        });
    });

    // Test 2: Pagination
    describe('Pagination', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should change page when paginator page is changed', () => {
            const newPageIndex = 1;
            component.onPageChange({ pageIndex: newPageIndex, pageSize: 10, length: 20 });

            expect(component.pageIndex).toBe(newPageIndex);
            expect(supplierService.getSuppliers).toHaveBeenCalledWith(
                jasmine.objectContaining({ page: newPageIndex + 1 })
            );
        });

        it('should change page size and reset to first page', () => {
            component.pageIndex = 2;
            const newPageSize = 25;
            component.onPageChange({ pageIndex: 2, pageSize: newPageSize, length: 100 });

            expect(component.pageSize).toBe(newPageSize);
            expect(component.pageIndex).toBe(0);
            expect(supplierService.getSuppliers).toHaveBeenCalledWith(
                jasmine.objectContaining({ page: 1, limit: newPageSize })
            );
        });

        it('should maintain page size options', () => {
            expect(component.pageSizeOptions).toEqual([10, 25, 50, 100]);
        });
    });

    // Test 3: Search functionality
    describe('Search functionality', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should search suppliers by name or general search', (done) => {
            const searchTerm = 'Test Supplier';
            component.searchControl.setValue(searchTerm);

            setTimeout(() => {
                expect(supplierService.getSuppliers).toHaveBeenCalledWith(
                    jasmine.objectContaining({ search: searchTerm })
                );
                done();
            }, 400);
        });

        it('should search by code when code pattern is detected', (done) => {
            const supplierCode = 'SUP001';
            supplierService.getSupplierByCode.and.returnValue(of({
                success: true,
                data: mockSuppliers[0],
                message: 'Supplier found',
                timestamp: '2024-01-01T00:00:00.000Z'
            }));

            component.searchControl.setValue(supplierCode);

            setTimeout(() => {
                expect(supplierService.getSupplierByCode).toHaveBeenCalledWith(supplierCode);
                expect(component.dataSource.data.length).toBe(1);
                expect(component.dataSource.data[0].code).toBe(supplierCode);
                done();
            }, 400);
        });

        it('should show not found message when supplier code does not exist', (done) => {
            const nonExistentCode = 'SUP999';
            supplierService.getSupplierByCode.and.returnValue(
                throwError(() => ({ originalError: { status: 404 }, message: 'Not found' }))
            );

            component.searchControl.setValue(nonExistentCode);

            setTimeout(() => {
                expect(toastService.info).toHaveBeenCalledWith(
                    jasmine.stringContaining('No supplier found')
                );
                expect(component.dataSource.data.length).toBe(0);
                done();
            }, 400);
        });

        it('should clear search and reload full list', () => {
            component.searchControl.setValue('test');
            component.clearSearch();

            expect(component.searchControl.value).toBe('');
            expect(supplierService.getSuppliers).toHaveBeenCalled();
        });
    });

    // Test 4: Type filter
    describe('Type filter', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should filter suppliers by type', () => {
            component.selectedType = 'supplier';
            component.onTypeFilterChange();

            expect(supplierService.getSuppliers).toHaveBeenCalledWith(
                jasmine.objectContaining({ type: 'supplier' })
            );
            expect(component.pageIndex).toBe(0);
        });

        it('should show all types when filter is cleared', () => {
            component.selectedType = '';
            component.onTypeFilterChange();

            expect(supplierService.getSuppliers).toHaveBeenCalled();
        });

        it('should have correct type options', () => {
            expect(component.types).toEqual([
                { value: '', label: 'All Types' },
                { value: 'customer', label: 'Customer' },
                { value: 'supplier', label: 'Supplier' },
                { value: 'both', label: 'Both' }
            ]);
        });
    });

    // Test 5: Status filter
    describe('Status filter', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should filter active suppliers', () => {
            component.selectedStatus = 'true';
            component.onStatusFilterChange();

            expect(supplierService.getSuppliers).toHaveBeenCalledWith(
                jasmine.objectContaining({ isActive: true })
            );
            expect(component.pageIndex).toBe(0);
        });

        it('should filter inactive suppliers', () => {
            component.selectedStatus = 'false';
            component.onStatusFilterChange();

            expect(supplierService.getSuppliers).toHaveBeenCalledWith(
                jasmine.objectContaining({ isActive: false })
            );
        });
    });

    // Test 6: Create supplier flow
    describe('Create supplier flow', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should open create dialog when add button is clicked', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(null));
            dialog.open.and.returnValue(dialogRefSpy);

            component.openCreateDialog();

            expect(dialog.open).toHaveBeenCalled();
        });

        it('should refresh list after successful creation', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of({ success: true }));
            dialog.open.and.returnValue(dialogRefSpy);

            component.openCreateDialog();

            expect(toastService.success).toHaveBeenCalledWith('Supplier created successfully');
            expect(supplierService.getSuppliers).toHaveBeenCalled();
        });

        it('should refresh statistics after creation if visible', () => {
            component.showStatistics = true;
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of({ success: true }));
            dialog.open.and.returnValue(dialogRefSpy);

            component.openCreateDialog();

            expect(supplierService.getStatistics).toHaveBeenCalled();
        });
    });

    // Test 7: Edit supplier flow
    describe('Edit supplier flow', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should open edit dialog with supplier data', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(null));
            dialog.open.and.returnValue(dialogRefSpy);

            component.openEditDialog(mockSuppliers[0]);

            expect(dialog.open).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    data: { supplier: mockSuppliers[0] }
                })
            );
        });

        it('should refresh list after successful update', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of({ success: true }));
            dialog.open.and.returnValue(dialogRefSpy);

            component.openEditDialog(mockSuppliers[0]);

            expect(toastService.success).toHaveBeenCalledWith('Supplier updated successfully');
            expect(supplierService.getSuppliers).toHaveBeenCalled();
        });
    });

    // Test 8: Delete supplier flow
    describe('Delete supplier flow', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should show confirmation dialog before deleting', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(false));
            dialog.open.and.returnValue(dialogRefSpy);

            component.confirmDelete(mockSuppliers[0]);

            expect(dialog.open).toHaveBeenCalled();
        });

        it('should delete supplier when confirmed', () => {
            supplierService.deleteSupplier.and.returnValue(of({
                success: true,
                data: null,
                message: 'Deleted',
                timestamp: '2024-01-01T00:00:00.000Z'
            }));

            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(true));
            dialog.open.and.returnValue(dialogRefSpy);

            component.confirmDelete(mockSuppliers[0]);

            expect(supplierService.deleteSupplier).toHaveBeenCalledWith(mockSuppliers[0]._id);
            expect(toastService.success).toHaveBeenCalledWith('Supplier deleted successfully');
        });

        it('should not delete when cancelled', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(false));
            dialog.open.and.returnValue(dialogRefSpy);

            component.confirmDelete(mockSuppliers[0]);

            expect(supplierService.deleteSupplier).not.toHaveBeenCalled();
        });

        it('should handle delete error', () => {
            supplierService.deleteSupplier.and.returnValue(
                throwError(() => ({ message: 'Delete failed', originalError: { status: 500 } }))
            );

            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(true));
            dialog.open.and.returnValue(dialogRefSpy);

            component.confirmDelete(mockSuppliers[0]);

            expect(toastService.error).toHaveBeenCalled();
        });
    });

    // Test 9: Restore supplier flow
    describe('Restore supplier flow', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should restore inactive supplier', () => {
            supplierService.restoreSupplier.and.returnValue(of({
                success: true,
                data: { ...mockSuppliers[1], isActive: true },
                message: 'Restored',
                timestamp: '2024-01-01T00:00:00.000Z'
            }));

            component.restoreSupplier(mockSuppliers[1]);

            expect(supplierService.restoreSupplier).toHaveBeenCalledWith(mockSuppliers[1]._id);
            expect(toastService.success).toHaveBeenCalledWith('Supplier restored successfully');
            expect(supplierService.getSuppliers).toHaveBeenCalled();
        });

        it('should handle restore error', () => {
            supplierService.restoreSupplier.and.returnValue(
                throwError(() => ({ message: 'Restore failed', originalError: { status: 500 } }))
            );

            component.restoreSupplier(mockSuppliers[1]);

            expect(toastService.error).toHaveBeenCalled();
        });

        it('should refresh statistics after restore if visible', () => {
            component.showStatistics = true;
            supplierService.restoreSupplier.and.returnValue(of({
                success: true,
                data: { ...mockSuppliers[1], isActive: true },
                message: 'Restored',
                timestamp: '2024-01-01T00:00:00.000Z'
            }));

            component.restoreSupplier(mockSuppliers[1]);

            expect(supplierService.getStatistics).toHaveBeenCalled();
        });
    });

    // Test 10: Toggle status
    describe('Toggle status', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should toggle supplier status optimistically', () => {
            const supplier = { ...mockSuppliers[0] };
            const originalStatus = supplier.isActive;

            supplierService.toggleSupplierStatus.and.returnValue(of({
                success: true,
                data: { ...supplier, isActive: !originalStatus },
                message: 'Toggled',
                timestamp: '2024-01-01T00:00:00.000Z'
            }));

            const event = { stopPropagation: jasmine.createSpy('stopPropagation') };
            component.toggleStatus(supplier, event);

            expect(event.stopPropagation).toHaveBeenCalled();
            expect(supplierService.toggleSupplierStatus).toHaveBeenCalledWith(supplier._id);
        });

        it('should revert status on toggle error', () => {
            const supplier = { ...mockSuppliers[0] };
            const originalStatus = supplier.isActive;

            supplierService.toggleSupplierStatus.and.returnValue(
                throwError(() => ({ message: 'Toggle failed', originalError: { status: 500 } }))
            );

            const event = { stopPropagation: jasmine.createSpy('stopPropagation') };
            component.toggleStatus(supplier, event);

            expect(supplier.isActive).toBe(originalStatus);
            expect(toastService.error).toHaveBeenCalled();
        });

        it('should show success message with correct status text', () => {
            const supplier = { ...mockSuppliers[0], isActive: false };

            supplierService.toggleSupplierStatus.and.returnValue(of({
                success: true,
                data: { ...supplier, isActive: true },
                message: 'Toggled',
                timestamp: '2024-01-01T00:00:00.000Z'
            }));

            const event = { stopPropagation: jasmine.createSpy('stopPropagation') };
            component.toggleStatus(supplier, event);

            expect(toastService.success).toHaveBeenCalledWith(
                jasmine.stringContaining('activated')
            );
        });
    });

    // Test 11: View supplier details
    describe('View supplier details', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should open detail dialog with supplier data', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of(null));
            dialog.open.and.returnValue(dialogRefSpy);

            component.openDetailDialog(mockSuppliers[0]);

            expect(dialog.open).toHaveBeenCalledWith(
                jasmine.anything(),
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        supplier: mockSuppliers[0]
                    })
                })
            );
        });

        it('should navigate to edit from detail dialog', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of({ action: 'edit', supplier: mockSuppliers[0] }));
            dialog.open.and.returnValue(dialogRefSpy);

            spyOn(component, 'openEditDialog');
            component.openDetailDialog(mockSuppliers[0]);

            expect(component.openEditDialog).toHaveBeenCalledWith(mockSuppliers[0]);
        });

        it('should trigger delete from detail dialog', () => {
            const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
            dialogRefSpy.afterClosed.and.returnValue(of({ action: 'delete', supplier: mockSuppliers[0] }));
            dialog.open.and.returnValue(dialogRefSpy);

            spyOn(component, 'confirmDelete');
            component.openDetailDialog(mockSuppliers[0]);

            expect(component.confirmDelete).toHaveBeenCalledWith(mockSuppliers[0]);
        });
    });

    // Test 12: Statistics display
    describe('Statistics display', () => {
        it('should load statistics for admin users', () => {
            fixture.detectChanges();

            expect(component.showStatistics).toBe(true);
            expect(supplierService.getStatistics).toHaveBeenCalled();
            expect(component.statistics).toEqual(mockStatistics);
        });

        it('should not load statistics for non-admin/non-accountant users', () => {
            const purchaseUser = { ...mockUser, role: UserRole.PURCHASE };
            Object.defineProperty(authService, 'currentUser$', {
                get: () => of(purchaseUser)
            });

            const newFixture = TestBed.createComponent(SuppliersComponent);
            const newComponent = newFixture.componentInstance;
            newFixture.detectChanges();

            expect(newComponent.showStatistics).toBe(false);
        });

        it('should load statistics for accountant users', () => {
            const accountantUser = { ...mockUser, role: UserRole.ACCOUNTANT };
            Object.defineProperty(authService, 'currentUser$', {
                get: () => of(accountantUser)
            });

            const newFixture = TestBed.createComponent(SuppliersComponent);
            const newComponent = newFixture.componentInstance;
            newFixture.detectChanges();

            expect(newComponent.showStatistics).toBe(true);
        });

        it('should handle statistics loading error', () => {
            supplierService.getStatistics.and.returnValue(
                throwError(() => ({ message: 'Statistics failed', originalError: { status: 500 } }))
            );

            fixture.detectChanges();

            expect(component.statisticsError).toBeTruthy();
        });

        it('should retry loading statistics', () => {
            component.statisticsError = 'Previous error';
            component.retryLoadStatistics();

            expect(component.statisticsError).toBeNull();
            expect(supplierService.getStatistics).toHaveBeenCalled();
        });
    });

    // Test 13: Permission-based UI
    describe('Permission-based UI', () => {
        it('should set all permissions for admin role', () => {
            fixture.detectChanges();

            expect(component.canCreate).toBe(true);
            expect(component.canEdit).toBe(true);
            expect(component.canDelete).toBe(true);
            expect(component.canRestore).toBe(true);
            expect(component.canToggleStatus).toBe(true);
            expect(component.showStatistics).toBe(true);
        });

        it('should set limited permissions for purchase role', () => {
            const purchaseUser = { ...mockUser, role: UserRole.PURCHASE };
            Object.defineProperty(authService, 'currentUser$', {
                get: () => of(purchaseUser)
            });

            const newFixture = TestBed.createComponent(SuppliersComponent);
            const newComponent = newFixture.componentInstance;
            newFixture.detectChanges();

            expect(newComponent.canCreate).toBe(true);
            expect(newComponent.canEdit).toBe(true);
            expect(newComponent.canDelete).toBe(false);
            expect(newComponent.canRestore).toBe(false);
            expect(newComponent.canToggleStatus).toBe(true);
            expect(newComponent.showStatistics).toBe(false);
        });

        it('should set limited permissions for data entry role', () => {
            const dataEntryUser = { ...mockUser, role: UserRole.DATA_ENTRY };
            Object.defineProperty(authService, 'currentUser$', {
                get: () => of(dataEntryUser)
            });

            const newFixture = TestBed.createComponent(SuppliersComponent);
            const newComponent = newFixture.componentInstance;
            newFixture.detectChanges();

            expect(newComponent.canCreate).toBe(true);
            expect(newComponent.canEdit).toBe(true);
            expect(newComponent.canDelete).toBe(false);
            expect(newComponent.canRestore).toBe(false);
            expect(newComponent.canToggleStatus).toBe(false);
            expect(newComponent.showStatistics).toBe(false);
        });

        it('should set view-only permissions for accountant role', () => {
            const accountantUser = { ...mockUser, role: UserRole.ACCOUNTANT };
            Object.defineProperty(authService, 'currentUser$', {
                get: () => of(accountantUser)
            });

            const newFixture = TestBed.createComponent(SuppliersComponent);
            const newComponent = newFixture.componentInstance;
            newFixture.detectChanges();

            expect(newComponent.canCreate).toBe(false);
            expect(newComponent.canEdit).toBe(false);
            expect(newComponent.canDelete).toBe(false);
            expect(newComponent.canRestore).toBe(false);
            expect(newComponent.canToggleStatus).toBe(false);
            expect(newComponent.showStatistics).toBe(true);
        });
    });

    // Test 14: Error scenarios
    describe('Error scenarios', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should handle network errors when loading suppliers', () => {
            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Network error', originalError: { status: 0 } }))
            );

            component.loadSuppliers();

            expect(component.error).toBeTruthy();
            expect(toastService.error).toHaveBeenCalled();
            expect(component.loading).toBe(false);
        });

        it('should handle 401 unauthorized errors', () => {
            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Unauthorized', originalError: { status: 401 } }))
            );

            component.loadSuppliers();

            expect(toastService.error).toHaveBeenCalledWith(
                jasmine.stringContaining('session has expired')
            );
        });

        it('should handle 403 forbidden errors', () => {
            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Forbidden', originalError: { status: 403 } }))
            );

            component.loadSuppliers();

            expect(toastService.error).toHaveBeenCalledWith(
                jasmine.stringContaining('do not have permission')
            );
        });

        it('should handle 404 not found errors', () => {
            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Not found', originalError: { status: 404 } }))
            );

            component.loadSuppliers();

            expect(toastService.error).toHaveBeenCalledWith(
                jasmine.stringContaining('not found')
            );
        });

        it('should handle 500 server errors', () => {
            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Server error', originalError: { status: 500 } }))
            );

            component.loadSuppliers();

            expect(toastService.error).toHaveBeenCalledWith(
                jasmine.stringContaining('server error')
            );
        });

        it('should handle validation errors (422)', () => {
            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Validation failed', originalError: { status: 422 } }))
            );

            component.loadSuppliers();

            expect(toastService.error).toHaveBeenCalledWith('Validation failed');
        });

        it('should retry loading suppliers after error', () => {
            component.error = 'Previous error';
            component.retryLoadSuppliers();

            expect(component.error).toBeNull();
            expect(supplierService.getSuppliers).toHaveBeenCalled();
        });

        it('should check for offline status', () => {
            spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);

            supplierService.getSuppliers.and.returnValue(
                throwError(() => ({ message: 'Network error', originalError: { status: 0 } }))
            );

            component.loadSuppliers();

            expect(toastService.error).toHaveBeenCalledWith(
                jasmine.stringContaining('No internet connection')
            );
        });
    });

    // Test 15: Additional functionality tests
    describe('Additional functionality', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should format dates correctly', () => {
            const dateString = '2024-01-15T10:30:00.000Z';
            const formatted = component.formatDate(dateString);

            expect(formatted).toBeTruthy();
            expect(typeof formatted).toBe('string');
        });

        it('should get correct chip color for supplier types', () => {
            expect(component.getTypeChipColor('customer')).toBe('primary');
            expect(component.getTypeChipColor('supplier')).toBe('accent');
            expect(component.getTypeChipColor('both')).toBe('warn');
            expect(component.getTypeChipColor('unknown')).toBe('');
        });

        it('should get correct status chip color', () => {
            expect(component.getStatusChipColor(true)).toBe('primary');
            expect(component.getStatusChipColor(false)).toBe('warn');
        });

        it('should get correct status label', () => {
            expect(component.getStatusLabel(true)).toBe('Active');
            expect(component.getStatusLabel(false)).toBe('Inactive');
        });

        it('should track pending actions', () => {
            const supplierId = 'test-id';
            const action = 'delete';

            expect(component.isActionPending(supplierId, action)).toBe(false);

            component['setActionPending'](supplierId, action, true);
            expect(component.isActionPending(supplierId, action)).toBe(true);

            component['setActionPending'](supplierId, action, false);
            expect(component.isActionPending(supplierId, action)).toBe(false);
        });

        it('should update paginator state correctly', () => {
            component.totalSuppliers = 100;
            component.pageSize = 25;
            component.pageIndex = 2;

            component['updatePaginatorState']();

            // Paginator should be updated if it exists
            if (component.paginator) {
                expect(component.paginator.length).toBe(100);
                expect(component.paginator.pageSize).toBe(25);
                expect(component.paginator.pageIndex).toBe(2);
            }
        });

        it('should clean up subscriptions on destroy', () => {
            spyOn(component['destroy$'], 'next');
            spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(component['destroy$'].next).toHaveBeenCalled();
            expect(component['destroy$'].complete).toHaveBeenCalled();
        });
    });
});
