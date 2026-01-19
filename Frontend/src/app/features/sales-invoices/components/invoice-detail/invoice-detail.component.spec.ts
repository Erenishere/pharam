/**
 * Invoice Detail Component Tests
 * 
 * This file contains unit tests for the InvoiceDetailComponent.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';

import { InvoiceDetailComponent } from './invoice-detail.component';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SalesInvoice, InvoiceStatus, PaymentStatus } from '../../models';

describe('InvoiceDetailComponent', () => {
    let component: InvoiceDetailComponent;
    let fixture: ComponentFixture<InvoiceDetailComponent>;
    let mockSalesInvoiceService: jasmine.SpyObj<SalesInvoiceService>;
    let mockToastService: jasmine.SpyObj<ToastService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    const mockInvoice: SalesInvoice = {
        _id: '1',
        invoiceNumber: 'INV-001',
        customerId: 'customer1',
        customer: {
            _id: 'customer1',
            name: 'Test Customer',
            code: 'CUST001',
            email: 'test@customer.com',
            phone: '+92-300-1234567',
            address: 'Test Address',
            creditLimit: 100000,
            currentBalance: 5000,
            isActive: true
        },
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        items: [
            {
                _id: 'item1',
                itemId: 'item1',
                item: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Item',
                    description: 'Test Description',
                    category: 'Medicine',
                    unit: 'Tablet',
                    sellingPrice: 10,
                    gstRate: 17,
                    whtRate: 0,
                    isActive: true
                },
                quantity: 10,
                unitPrice: 10,
                discount: 0,
                discountType: 'percentage' as any,
                taxAmount: 17,
                totalAmount: 117
            }
        ],
        totals: {
            subtotal: 100,
            discountAmount: 0,
            taxableAmount: 100,
            gstAmount: 17,
            whtAmount: 0,
            grandTotal: 117
        },
        payment: {
            paymentStatus: PaymentStatus.PENDING,
            paidAmount: 0,
            remainingAmount: 117,
            paymentHistory: []
        },
        status: InvoiceStatus.DRAFT,
        warehouseId: 'warehouse1',
        warehouse: {
            _id: 'warehouse1',
            name: 'Main Warehouse',
            code: 'WH001',
            location: 'Karachi',
            isActive: true
        },
        salesmanId: 'salesman1',
        salesman: {
            _id: 'salesman1',
            name: 'Test Salesman',
            code: 'SM001',
            email: 'salesman@test.com',
            phone: '+92-300-7654321',
            isActive: true
        },
        notes: 'Test notes',
        previousBalance: 5000,
        totalBalance: 5117,
        creditLimitExceeded: false,
        discountType: 'percentage' as any,
        discountValue: 0,
        stockMovements: [],
        history: [],
        createdBy: 'testuser',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
    };

    beforeEach(async () => {
        const salesInvoiceServiceSpy = jasmine.createSpyObj('SalesInvoiceService', [
            'getInvoiceById',
            'confirmInvoice',
            'cancelInvoice',
            'markAsPaid',
            'markAsPartialPaid',
            'printInvoice',
            'getInvoicePDF',
            'sendSMSNotification'
        ]);
        const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);
        const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
            currentUser: { role: 'admin', name: 'Test User' }
        });
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                InvoiceDetailComponent,
                NoopAnimationsModule
            ],
            providers: [
                { provide: SalesInvoiceService, useValue: salesInvoiceServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: MatDialog, useValue: dialogSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            data: { invoice: mockInvoice },
                            paramMap: {
                                get: (key: string) => key === 'id' ? '1' : null
                            }
                        }
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(InvoiceDetailComponent);
        component = fixture.componentInstance;
        mockSalesInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
        mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load invoice data from route resolver', () => {
        fixture.detectChanges();
        expect(component.invoice$.value).toEqual(mockInvoice);
    });

    it('should check permissions correctly for admin user', () => {
        fixture.detectChanges();
        expect(component.canEdit).toBe(true);
        expect(component.canConfirm).toBe(true);
        expect(component.canCancel).toBe(true);
        expect(component.canManagePayments).toBe(true);
        expect(component.canPrint).toBe(true);
        expect(component.canExport).toBe(true);
    });

    it('should determine if invoice can be edited', () => {
        fixture.detectChanges();
        expect(component.canEditInvoice()).toBe(true);

        // Change status to confirmed
        const confirmedInvoice = { ...mockInvoice, status: InvoiceStatus.CONFIRMED };
        component.invoice$.next(confirmedInvoice);
        expect(component.canEditInvoice()).toBe(false);
    });

    it('should determine if invoice can be confirmed', () => {
        fixture.detectChanges();
        expect(component.canConfirmInvoice()).toBe(true);

        // Change status to confirmed
        const confirmedInvoice = { ...mockInvoice, status: InvoiceStatus.CONFIRMED };
        component.invoice$.next(confirmedInvoice);
        expect(component.canConfirmInvoice()).toBe(false);
    });

    it('should determine if payments can be managed', () => {
        fixture.detectChanges();
        expect(component.canManageInvoicePayments()).toBe(false); // Draft invoice

        // Change to confirmed invoice
        const confirmedInvoice = {
            ...mockInvoice,
            status: InvoiceStatus.CONFIRMED,
            payment: { ...mockInvoice.payment, paymentStatus: PaymentStatus.PENDING }
        };
        component.invoice$.next(confirmedInvoice);
        expect(component.canManageInvoicePayments()).toBe(true);

        // Change to paid invoice
        const paidInvoice = {
            ...confirmedInvoice,
            payment: { ...confirmedInvoice.payment, paymentStatus: PaymentStatus.PAID }
        };
        component.invoice$.next(paidInvoice);
        expect(component.canManageInvoicePayments()).toBe(false);
    });

    it('should get correct status colors', () => {
        expect(component.getStatusColor(InvoiceStatus.DRAFT)).toBe('accent');
        expect(component.getStatusColor(InvoiceStatus.CONFIRMED)).toBe('primary');
        expect(component.getStatusColor(InvoiceStatus.CANCELLED)).toBe('warn');
    });

    it('should get correct payment status colors', () => {
        expect(component.getPaymentStatusColor(PaymentStatus.PENDING)).toBe('warn');
        expect(component.getPaymentStatusColor(PaymentStatus.PARTIAL)).toBe('accent');
        expect(component.getPaymentStatusColor(PaymentStatus.PAID)).toBe('primary');
    });

    it('should navigate to edit invoice', () => {
        fixture.detectChanges();
        component.editInvoice();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/sales-invoices/edit', '1']);
    });

    it('should navigate back to invoice list', () => {
        component.goBack();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/sales-invoices']);
    });

    it('should format currency correctly', () => {
        const formatted = component.formatCurrency(1000);
        expect(formatted).toContain('1,000');
        expect(formatted).toContain('PKR');
    });

    it('should format date correctly', () => {
        const date = new Date('2024-01-15');
        const formatted = component.formatDate(date);
        expect(formatted).toContain('Jan');
        expect(formatted).toContain('15');
        expect(formatted).toContain('2024');
    });

    it('should format date and time correctly', () => {
        const date = new Date('2024-01-15T10:30:00');
        const formatted = component.formatDateTime(date);
        expect(formatted).toContain('Jan');
        expect(formatted).toContain('15');
        expect(formatted).toContain('2024');
        expect(formatted).toContain('10:30');
    });

    it('should handle refresh data', () => {
        mockSalesInvoiceService.getInvoiceById.and.returnValue(of({
            success: true,
            data: mockInvoice
        }));

        fixture.detectChanges();
        component.refreshData();

        expect(mockSalesInvoiceService.getInvoiceById).toHaveBeenCalledWith('1');
        expect(mockToastService.success).toHaveBeenCalledWith('Data refreshed successfully');
    });
});