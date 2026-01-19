/**
 * Payment Dialog Component Unit Tests
 * 
 * This file contains comprehensive unit tests for the PaymentDialogComponent
 * covering payment form validation, amount calculations, and payment processing.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { of, throwError } from 'rxjs';

import { PaymentDialogComponent, PaymentDialogData } from './payment-dialog.component';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { InvoiceCalculationService } from '../../services/invoice-calculation.service';
import { SalesInvoice, PaymentStatus, PaymentMethod, PaymentRequest } from '../../models';

describe('PaymentDialogComponent', () => {
    let component: PaymentDialogComponent;
    let fixture: ComponentFixture<PaymentDialogComponent>;
    let mockSalesInvoiceService: jasmine.SpyObj<SalesInvoiceService>;
    let mockCalculationService: jasmine.SpyObj<InvoiceCalculationService>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<PaymentDialogComponent>>;

    const mockInvoice: SalesInvoice = {
        _id: '1',
        invoiceNumber: 'INV-001',
        customerId: 'customer1',
        customer: {
            _id: 'customer1',
            name: 'Test Customer',
            code: 'CUST001',
            email: 'test@example.com',
            phone: '+92 300 1234567',
            address: 'Test Address',
            creditLimit: 100000,
            currentBalance: 5000,
            isActive: true
        },
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-01'),
        items: [],
        totals: {
            subtotal: 1000,
            discountAmount: 0,
            taxableAmount: 1000,
            gstAmount: 170,
            whtAmount: 0,
            grandTotal: 1170
        },
        payment: {
            paymentStatus: PaymentStatus.PENDING,
            paidAmount: 0,
            remainingAmount: 1170,
            paymentHistory: [
                {
                    _id: 'payment1',
                    amount: 500,
                    paymentMethod: PaymentMethod.CASH,
                    paymentDate: new Date('2024-01-15'),
                    reference: 'CASH-001',
                    notes: 'Partial payment'
                }
            ]
        },
        status: 'confirmed',
        warehouseId: 'warehouse1',
        previousBalance: 0,
        totalBalance: 1170,
        creditLimitExceeded: false,
        discountType: 'percentage',
        discountValue: 0,
        createdBy: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    const mockDialogData: PaymentDialogData = {
        invoice: mockInvoice,
        mode: 'payment'
    };

    beforeEach(async () => {
        const salesInvoiceServiceSpy = jasmine.createSpyObj('SalesInvoiceService', [
            'markAsPaid',
            'markAsPartialPaid'
        ]);
        const calculationServiceSpy = jasmine.createSpyObj('InvoiceCalculationService', [
            'validatePaymentAmount',
            'calculatePaymentStatus',
            'calculateRemainingAmount'
        ]);
        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [
                PaymentDialogComponent,
                ReactiveFormsModule,
                NoopAnimationsModule,
                MatCardModule,
                MatButtonModule,
                MatInputModule,
                MatSelectModule,
                MatDatepickerModule,
                MatNativeDateModule,
                MatIconModule,
                MatTableModule,
                MatDividerModule,
                MatSnackBarModule
            ],
            providers: [
                { provide: SalesInvoiceService, useValue: salesInvoiceServiceSpy },
                { provide: InvoiceCalculationService, useValue: calculationServiceSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PaymentDialogComponent);
        component = fixture.componentInstance;
        mockSalesInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
        mockCalculationService = TestBed.inject(InvoiceCalculationService) as jasmine.SpyObj<InvoiceCalculationService>;
        mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<PaymentDialogComponent>>;

        // Setup default mock responses
        mockCalculationService.validatePaymentAmount.and.returnValue({
            isValid: true,
            remainingAmount: 670,
            error: null
        });
        mockCalculationService.calculatePaymentStatus.and.returnValue(PaymentStatus.PARTIAL);
        mockCalculationService.calculateRemainingAmount.and.returnValue(670);
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize form with default values', () => {
            expect(component.paymentForm.get('amount')?.value).toBe(1170);
            expect(component.paymentForm.get('paymentMethod')?.value).toBe(PaymentMethod.CASH);
            expect(component.paymentForm.get('paymentDate')?.value).toBeInstanceOf(Date);
            expect(component.paymentForm.get('reference')?.value).toBe('');
            expect(component.paymentForm.get('notes')?.value).toBe('');
        });

        it('should set remaining amount correctly', () => {
            expect(component.remainingAmount).toBe(1170);
        });

        it('should load payment history', () => {
            expect(component.paymentHistory.length).toBe(1);
            expect(component.paymentHistory[0].amount).toBe(500);
        });

        it('should setup form subscriptions', () => {
            spyOn(component, 'validatePayment' as any);

            component.paymentForm.get('amount')?.setValue(500);

            expect(component['validatePayment']).toHaveBeenCalled();
        });
    });

    describe('Form Validation', () => {
        it('should validate required fields', () => {
            const form = component.paymentForm;

            form.get('amount')?.setValue('');
            form.get('paymentMethod')?.setValue('');
            form.get('paymentDate')?.setValue('');

            expect(form.invalid).toBeTruthy();
            expect(form.get('amount')?.hasError('required')).toBeTruthy();
            expect(form.get('paymentMethod')?.hasError('required')).toBeTruthy();
            expect(form.get('paymentDate')?.hasError('required')).toBeTruthy();
        });

        it('should validate minimum payment amount', () => {
            const amountControl = component.paymentForm.get('amount');

            amountControl?.setValue(0);
            expect(amountControl?.hasError('min')).toBeTruthy();

            amountControl?.setValue(-100);
            expect(amountControl?.hasError('min')).toBeTruthy();

            amountControl?.setValue(100);
            expect(amountControl?.hasError('min')).toBeFalsy();
        });

        it('should validate maximum payment amount', () => {
            mockCalculationService.validatePaymentAmount.and.returnValue({
                isValid: false,
                remainingAmount: 1170,
                error: 'Payment amount cannot exceed remaining amount'
            });

            const amountControl = component.paymentForm.get('amount');
            amountControl?.setValue(2000);

            component['validatePayment']();

            expect(component.paymentError).toBe('Payment amount cannot exceed remaining amount');
        });

        it('should validate payment date not in future', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            const dateControl = component.paymentForm.get('paymentDate');
            dateControl?.setValue(futureDate);

            expect(dateControl?.hasError('futureDate')).toBeTruthy();
        });

        it('should require reference for bank transfer', () => {
            component.paymentForm.patchValue({
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                reference: ''
            });

            expect(component.paymentForm.get('reference')?.hasError('required')).toBeTruthy();
        });

        it('should require reference for cheque', () => {
            component.paymentForm.patchValue({
                paymentMethod: PaymentMethod.CHEQUE,
                reference: ''
            });

            expect(component.paymentForm.get('reference')?.hasError('required')).toBeTruthy();
        });
    });

    describe('Payment Amount Calculations', () => {
        it('should calculate remaining amount after payment', () => {
            component.paymentForm.get('amount')?.setValue(500);

            const remaining = component.calculateRemainingAfterPayment();

            expect(remaining).toBe(670);
        });

        it('should determine if payment is full payment', () => {
            component.paymentForm.get('amount')?.setValue(1170);

            expect(component.isFullPayment()).toBe(true);

            component.paymentForm.get('amount')?.setValue(500);

            expect(component.isFullPayment()).toBe(false);
        });

        it('should set full payment amount', () => {
            component.setFullPayment();

            expect(component.paymentForm.get('amount')?.value).toBe(1170);
        });

        it('should set partial payment amount', () => {
            component.setPartialPayment(500);

            expect(component.paymentForm.get('amount')?.value).toBe(500);
        });

        it('should get payment method display text', () => {
            expect(component.getPaymentMethodDisplay(PaymentMethod.CASH)).toBe('Cash');
            expect(component.getPaymentMethodDisplay(PaymentMethod.BANK_TRANSFER)).toBe('Bank Transfer');
            expect(component.getPaymentMethodDisplay(PaymentMethod.CHEQUE)).toBe('Cheque');
            expect(component.getPaymentMethodDisplay(PaymentMethod.CREDIT_CARD)).toBe('Credit Card');
        });
    });

    describe('Payment Processing', () => {
        beforeEach(() => {
            component.paymentForm.patchValue({
                amount: 500,
                paymentMethod: PaymentMethod.CASH,
                paymentDate: new Date('2024-01-20'),
                reference: 'CASH-002',
                notes: 'Test payment'
            });
        });

        it('should process full payment successfully', () => {
            component.paymentForm.get('amount')?.setValue(1170);

            const mockResponse = {
                success: true,
                data: {
                    ...mockInvoice,
                    payment: {
                        ...mockInvoice.payment,
                        paymentStatus: PaymentStatus.PAID,
                        paidAmount: 1170,
                        remainingAmount: 0
                    }
                }
            };

            mockSalesInvoiceService.markAsPaid.and.returnValue(of(mockResponse));

            component.processPayment();

            expect(mockSalesInvoiceService.markAsPaid).toHaveBeenCalledWith('1', jasmine.objectContaining({
                amount: 1170,
                paymentMethod: PaymentMethod.CASH,
                paymentDate: jasmine.any(Date),
                reference: 'CASH-002',
                notes: 'Test payment'
            }));
            expect(mockDialogRef.close).toHaveBeenCalledWith(mockResponse.data);
        });

        it('should process partial payment successfully', () => {
            const mockResponse = {
                success: true,
                data: {
                    ...mockInvoice,
                    payment: {
                        ...mockInvoice.payment,
                        paymentStatus: PaymentStatus.PARTIAL,
                        paidAmount: 500,
                        remainingAmount: 670
                    }
                }
            };

            mockSalesInvoiceService.markAsPartialPaid.and.returnValue(of(mockResponse));

            component.processPayment();

            expect(mockSalesInvoiceService.markAsPartialPaid).toHaveBeenCalledWith('1', jasmine.objectContaining({
                amount: 500,
                paymentMethod: PaymentMethod.CASH,
                paymentDate: jasmine.any(Date),
                reference: 'CASH-002',
                notes: 'Test payment'
            }));
            expect(mockDialogRef.close).toHaveBeenCalledWith(mockResponse.data);
        });

        it('should handle payment processing error', () => {
            const error = { userMessage: 'Payment processing failed' };
            mockSalesInvoiceService.markAsPartialPaid.and.returnValue(throwError(() => error));
            spyOn(component, 'showError' as any);

            component.processPayment();

            expect(component.isProcessing).toBe(false);
            expect(component['showError']).toHaveBeenCalledWith('Payment processing failed');
        });

        it('should not process payment with invalid form', () => {
            component.paymentForm.get('amount')?.setValue('');

            component.processPayment();

            expect(mockSalesInvoiceService.markAsPaid).not.toHaveBeenCalled();
            expect(mockSalesInvoiceService.markAsPartialPaid).not.toHaveBeenCalled();
        });
    });

    describe('Payment History', () => {
        it('should display payment history correctly', () => {
            expect(component.paymentHistory.length).toBe(1);

            const payment = component.paymentHistory[0];
            expect(payment.amount).toBe(500);
            expect(payment.paymentMethod).toBe(PaymentMethod.CASH);
            expect(payment.reference).toBe('CASH-001');
        });

        it('should calculate total paid amount', () => {
            const totalPaid = component.getTotalPaidAmount();

            expect(totalPaid).toBe(500);
        });

        it('should format payment date correctly', () => {
            const date = new Date('2024-01-15');
            const formatted = component.formatPaymentDate(date);

            expect(formatted).toContain('Jan');
            expect(formatted).toContain('15');
            expect(formatted).toContain('2024');
        });

        it('should format currency correctly', () => {
            const formatted = component.formatCurrency(1500);

            expect(formatted).toContain('1,500');
            expect(formatted).toContain('PKR');
        });
    });

    describe('Dialog Actions', () => {
        it('should close dialog without saving', () => {
            component.cancel();

            expect(mockDialogRef.close).toHaveBeenCalledWith(null);
        });

        it('should confirm cancel when form is dirty', () => {
            spyOn(window, 'confirm').and.returnValue(false);

            component.paymentForm.markAsDirty();
            component.cancel();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockDialogRef.close).not.toHaveBeenCalled();
        });

        it('should allow cancel when form is pristine', () => {
            component.cancel();

            expect(mockDialogRef.close).toHaveBeenCalledWith(null);
        });
    });

    describe('Payment Method Handling', () => {
        it('should show reference field for bank transfer', () => {
            component.paymentForm.get('paymentMethod')?.setValue(PaymentMethod.BANK_TRANSFER);

            expect(component.requiresReference()).toBe(true);
        });

        it('should show reference field for cheque', () => {
            component.paymentForm.get('paymentMethod')?.setValue(PaymentMethod.CHEQUE);

            expect(component.requiresReference()).toBe(true);
        });

        it('should hide reference field for cash', () => {
            component.paymentForm.get('paymentMethod')?.setValue(PaymentMethod.CASH);

            expect(component.requiresReference()).toBe(false);
        });

        it('should get reference label for payment method', () => {
            expect(component.getReferenceLabel(PaymentMethod.BANK_TRANSFER)).toBe('Transaction Reference');
            expect(component.getReferenceLabel(PaymentMethod.CHEQUE)).toBe('Cheque Number');
            expect(component.getReferenceLabel(PaymentMethod.CREDIT_CARD)).toBe('Transaction ID');
            expect(component.getReferenceLabel(PaymentMethod.CASH)).toBe('Reference');
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            fixture.detectChanges();

            const amountInput = fixture.nativeElement.querySelector('input[formControlName="amount"]');
            expect(amountInput.getAttribute('aria-label')).toBeTruthy();

            const methodSelect = fixture.nativeElement.querySelector('mat-select[formControlName="paymentMethod"]');
            expect(methodSelect.getAttribute('aria-label')).toBeTruthy();
        });

        it('should support keyboard navigation', () => {
            fixture.detectChanges();

            const buttons = fixture.nativeElement.querySelectorAll('button');
            buttons.forEach((button: HTMLElement) => {
                expect(button.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });

        it('should announce payment validation errors', () => {
            component.paymentError = 'Payment amount exceeds remaining balance';
            fixture.detectChanges();

            const errorElement = fixture.nativeElement.querySelector('[role="alert"]');
            expect(errorElement).toBeTruthy();
            expect(errorElement.textContent).toContain('Payment amount exceeds remaining balance');
        });
    });

    describe('Edge Cases', () => {
        it('should handle invoice with no payment history', () => {
            const invoiceWithoutHistory = {
                ...mockInvoice,
                payment: {
                    ...mockInvoice.payment,
                    paymentHistory: []
                }
            };

            component.data.invoice = invoiceWithoutHistory;
            component.ngOnInit();

            expect(component.paymentHistory.length).toBe(0);
            expect(component.getTotalPaidAmount()).toBe(0);
        });

        it('should handle fully paid invoice', () => {
            const paidInvoice = {
                ...mockInvoice,
                payment: {
                    ...mockInvoice.payment,
                    paymentStatus: PaymentStatus.PAID,
                    paidAmount: 1170,
                    remainingAmount: 0
                }
            };

            component.data.invoice = paidInvoice;
            component.ngOnInit();

            expect(component.remainingAmount).toBe(0);
            expect(component.paymentForm.get('amount')?.value).toBe(0);
        });
    });
});