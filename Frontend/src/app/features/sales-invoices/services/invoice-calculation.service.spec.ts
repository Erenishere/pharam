/**
 * Invoice Calculation Service Unit Tests
 * 
 * This test suite covers all business logic calculations for sales invoices
 * including tax calculations, discounts, totals, and validation.
 */

import { TestBed } from '@angular/core/testing';
import { InvoiceCalculationService } from './invoice-calculation.service';
import {
    InvoiceItem,
    InvoiceTotals,
    DiscountType,
    SalesInvoice,
    CreateInvoiceRequest,
    PaymentStatus,
    InvoiceStatus,
    PaymentMethod
} from '../models';

describe('InvoiceCalculationService', () => {
    let service: InvoiceCalculationService;

    // Mock data
    const mockItem: Partial<InvoiceItem> = {
        itemId: 'item1',
        quantity: 10,
        unitPrice: 100,
        discount: 10,
        discountType: DiscountType.PERCENTAGE,
        item: {
            _id: 'item1',
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Electronics',
            unit: 'pcs',
            sellingPrice: 100,
            gstRate: 17,
            whtRate: 1,
            isActive: true
        }
    };

    const mockInvoice: SalesInvoice = {
        _id: '1',
        invoiceNumber: 'INV-001',
        customerId: 'customer1',
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        items: [],
        totals: {
            subtotal: 1000,
            discountAmount: 100,
            taxableAmount: 900,
            gstAmount: 153,
            whtAmount: 9,
            grandTotal: 1044
        },
        payment: {
            paymentStatus: PaymentStatus.PENDING,
            paidAmount: 0,
            remainingAmount: 1044,
            paymentHistory: []
        },
        status: InvoiceStatus.CONFIRMED,
        warehouseId: 'warehouse1',
        previousBalance: 0,
        totalBalance: 1044,
        creditLimitExceeded: false,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        createdBy: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [InvoiceCalculationService]
        });
        service = TestBed.inject(InvoiceCalculationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Item Calculations', () => {
        it('should calculate item total with percentage discount', () => {
            const item: Partial<InvoiceItem> = {
                quantity: 10,
                unitPrice: 100,
                discount: 10,
                discountType: DiscountType.PERCENTAGE,
                item: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Item',
                    category: 'Electronics',
                    unit: 'pcs',
                    sellingPrice: 100,
                    gstRate: 17,
                    whtRate: 1,
                    isActive: true
                }
            };

            const total = service.calculateItemTotal(item);

            // Subtotal: 10 * 100 = 1000
            // Discount: 1000 * 10% = 100
            // Taxable: 1000 - 100 = 900
            // GST: 900 * 17% = 153
            // WHT: 900 * 1% = 9
            // Total: 900 + 153 - 9 = 1044
            expect(total).toBe(1044);
        });

        it('should calculate item total with amount discount', () => {
            const item: Partial<InvoiceItem> = {
                quantity: 5,
                unitPrice: 200,
                discount: 50,
                discountType: DiscountType.AMOUNT,
                item: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Item',
                    category: 'Electronics',
                    unit: 'pcs',
                    sellingPrice: 200,
                    gstRate: 17,
                    whtRate: 0,
                    isActive: true
                }
            };

            const total = service.calculateItemTotal(item);

            // Subtotal: 5 * 200 = 1000
            // Discount: 50 (amount)
            // Taxable: 1000 - 50 = 950
            // GST: 950 * 17% = 161.5
            // WHT: 950 * 0% = 0
            // Total: 950 + 161.5 - 0 = 1111.5
            expect(total).toBe(1111.5);
        });

        it('should return 0 for invalid item data', () => {
            const invalidItem: Partial<InvoiceItem> = {
                quantity: 0,
                unitPrice: 100
            };

            const total = service.calculateItemTotal(invalidItem);
            expect(total).toBe(0);
        });

        it('should calculate item discount correctly', () => {
            const percentageDiscount = service.calculateItemDiscount(1000, 10, DiscountType.PERCENTAGE);
            expect(percentageDiscount).toBe(100);

            const amountDiscount = service.calculateItemDiscount(1000, 150, DiscountType.AMOUNT);
            expect(amountDiscount).toBe(150);

            const excessiveAmountDiscount = service.calculateItemDiscount(1000, 1500, DiscountType.AMOUNT);
            expect(excessiveAmountDiscount).toBe(1000); // Should not exceed subtotal
        });

        it('should calculate item tax correctly', () => {
            const taxableAmount = 1000;
            const item: Partial<InvoiceItem> = {
                item: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Item',
                    category: 'Electronics',
                    unit: 'pcs',
                    sellingPrice: 100,
                    gstRate: 17,
                    whtRate: 1,
                    isActive: true
                }
            };

            const tax = service.calculateItemTax(taxableAmount, item);

            // GST: 1000 * 17% = 170
            // WHT: 1000 * 1% = 10
            // Net Tax: 170 - 10 = 160
            expect(tax).toBe(160);
        });
    });

    describe('Invoice Calculations', () => {
        it('should calculate complete invoice totals', () => {
            const items: Partial<InvoiceItem>[] = [
                {
                    quantity: 10,
                    unitPrice: 100,
                    discount: 5,
                    discountType: DiscountType.PERCENTAGE,
                    item: {
                        _id: 'item1',
                        code: 'ITEM001',
                        name: 'Test Item 1',
                        category: 'Electronics',
                        unit: 'pcs',
                        sellingPrice: 100,
                        gstRate: 17,
                        whtRate: 1,
                        isActive: true
                    }
                },
                {
                    quantity: 5,
                    unitPrice: 200,
                    discount: 10,
                    discountType: DiscountType.AMOUNT,
                    item: {
                        _id: 'item2',
                        code: 'ITEM002',
                        name: 'Test Item 2',
                        category: 'Electronics',
                        unit: 'pcs',
                        sellingPrice: 200,
                        gstRate: 17,
                        whtRate: 1,
                        isActive: true
                    }
                }
            ];

            const totals = service.calculateInvoiceTotals(items, DiscountType.PERCENTAGE, 5);

            expect(totals.subtotal).toBe(2000); // (10*100) + (5*200)
            expect(totals.discountAmount).toBe(100); // 5% of 2000
            expect(totals.taxableAmount).toBe(1900); // 2000 - 100
            expect(totals.gstAmount).toBeCloseTo(323, 0); // Approximately 17% of taxable amounts
            expect(totals.whtAmount).toBeCloseTo(19, 0); // Approximately 1% of taxable amounts
            expect(totals.grandTotal).toBeCloseTo(2204, 0); // 1900 + 323 - 19
        });

        it('should calculate invoice discount correctly', () => {
            const percentageDiscount = service.calculateInvoiceDiscount(2000, 10, DiscountType.PERCENTAGE);
            expect(percentageDiscount).toBe(200);

            const amountDiscount = service.calculateInvoiceDiscount(2000, 300, DiscountType.AMOUNT);
            expect(amountDiscount).toBe(300);

            const zeroDiscount = service.calculateInvoiceDiscount(2000, 0, DiscountType.PERCENTAGE);
            expect(zeroDiscount).toBe(0);
        });
    });

    describe('Payment Calculations', () => {
        it('should validate payment amount correctly', () => {
            const validPayment = service.validatePaymentAmount(500, mockInvoice);
            expect(validPayment.isValid).toBe(true);
            expect(validPayment.remainingAmount).toBe(544);

            const excessivePayment = service.validatePaymentAmount(2000, mockInvoice);
            expect(excessivePayment.isValid).toBe(false);
            expect(excessivePayment.error).toContain('cannot exceed remaining amount');

            const zeroPayment = service.validatePaymentAmount(0, mockInvoice);
            expect(zeroPayment.isValid).toBe(false);
            expect(zeroPayment.error).toContain('must be greater than zero');
        });

        it('should calculate payment status correctly', () => {
            expect(service.calculatePaymentStatus(0, 1000)).toBe(PaymentStatus.PENDING);
            expect(service.calculatePaymentStatus(500, 1000)).toBe(PaymentStatus.PARTIAL);
            expect(service.calculatePaymentStatus(1000, 1000)).toBe(PaymentStatus.PAID);
            expect(service.calculatePaymentStatus(1200, 1000)).toBe(PaymentStatus.PAID);
        });

        it('should calculate remaining amount correctly', () => {
            expect(service.calculateRemainingAmount(1000, 300)).toBe(700);
            expect(service.calculateRemainingAmount(1000, 1000)).toBe(0);
            expect(service.calculateRemainingAmount(1000, 1200)).toBe(0); // Should not be negative
        });
    });

    describe('Credit Limit Validation', () => {
        it('should check credit limit correctly', () => {
            const withinLimit = service.checkCreditLimit(10000, 5000, 3000);
            expect(withinLimit.isExceeded).toBe(false);
            expect(withinLimit.availableCredit).toBe(5000);

            const exceededLimit = service.checkCreditLimit(10000, 8000, 5000);
            expect(exceededLimit.isExceeded).toBe(true);
            expect(exceededLimit.availableCredit).toBe(2000);
            expect(exceededLimit.excessAmount).toBe(3000);

            const noCreditLimit = service.checkCreditLimit(0, 5000, 3000);
            expect(noCreditLimit.isExceeded).toBe(false);
            expect(noCreditLimit.availableCredit).toBe(Infinity);
        });
    });

    describe('Date Calculations', () => {
        it('should calculate due date correctly', () => {
            const invoiceDate = new Date('2024-01-01');
            const dueDate = service.calculateDueDate(invoiceDate, 30);

            expect(dueDate.getDate()).toBe(31);
            expect(dueDate.getMonth()).toBe(0); // January
            expect(dueDate.getFullYear()).toBe(2024);
        });

        it('should check if invoice is overdue', () => {
            const pastDueDate = new Date('2023-12-01');
            const futureDueDate = new Date('2025-12-01');

            expect(service.isInvoiceOverdue(pastDueDate, PaymentStatus.PENDING)).toBe(true);
            expect(service.isInvoiceOverdue(futureDueDate, PaymentStatus.PENDING)).toBe(false);
            expect(service.isInvoiceOverdue(pastDueDate, PaymentStatus.PAID)).toBe(false);
        });

        it('should calculate days overdue correctly', () => {
            const today = new Date();
            const pastDate = new Date(today.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5 days ago
            const futureDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000)); // 5 days from now

            expect(service.calculateDaysOverdue(pastDate)).toBe(5);
            expect(service.calculateDaysOverdue(futureDate)).toBe(0);
        });
    });

    describe('Validation', () => {
        it('should validate invoice items correctly', () => {
            const validItems: Partial<InvoiceItem>[] = [
                {
                    itemId: 'item1',
                    quantity: 10,
                    unitPrice: 100,
                    discount: 5,
                    discountType: DiscountType.PERCENTAGE
                }
            ];

            const validation = service.validateInvoiceItems(validItems);
            expect(validation.isValid).toBe(true);
            expect(validation.errors.length).toBe(0);
        });

        it('should detect invalid invoice items', () => {
            const invalidItems: Partial<InvoiceItem>[] = [
                {
                    itemId: '',
                    quantity: 0,
                    unitPrice: -100,
                    discount: 150,
                    discountType: DiscountType.PERCENTAGE
                }
            ];

            const validation = service.validateInvoiceItems(invalidItems);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors).toContain('Item 1: Item selection is required');
            expect(validation.errors).toContain('Item 1: Quantity must be greater than zero');
            expect(validation.errors).toContain('Item 1: Percentage discount cannot exceed 100%');
        });

        it('should validate complete invoice correctly', () => {
            const validInvoice: CreateInvoiceRequest = {
                customerId: 'customer1',
                invoiceDate: new Date('2024-01-01'),
                dueDate: new Date('2024-01-31'),
                warehouseId: 'warehouse1',
                items: [
                    {
                        itemId: 'item1',
                        quantity: 10,
                        unitPrice: 100,
                        discount: 5,
                        discountType: DiscountType.PERCENTAGE
                    }
                ],
                discountType: DiscountType.PERCENTAGE,
                discountValue: 5
            };

            const validation = service.validateInvoice(validInvoice);
            expect(validation.isValid).toBe(true);
            expect(validation.errors.length).toBe(0);
        });

        it('should detect invalid invoice data', () => {
            const invalidInvoice: CreateInvoiceRequest = {
                customerId: '',
                invoiceDate: new Date('2024-01-31'),
                dueDate: new Date('2024-01-01'), // Due date before invoice date
                warehouseId: '',
                items: [],
                discountType: DiscountType.PERCENTAGE,
                discountValue: 150 // Invalid percentage
            };

            const validation = service.validateInvoice(invalidInvoice);
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Customer selection is required');
            expect(validation.errors).toContain('Due date cannot be earlier than invoice date');
            expect(validation.errors).toContain('Warehouse selection is required');
            expect(validation.errors).toContain('At least one item is required');
            expect(validation.errors).toContain('Percentage discount cannot exceed 100%');
        });

        it('should validate customer credit correctly', () => {
            const validCredit = service.validateCustomerCredit(
                'customer1',
                10000,
                5000,
                3000,
                30
            );
            expect(validCredit.isValid).toBe(true);
            expect(validCredit.warnings.length).toBe(0);
            expect(validCredit.errors.length).toBe(0);

            const exceededCredit = service.validateCustomerCredit(
                'customer1',
                10000,
                8000,
                5000,
                0
            );
            expect(exceededCredit.isValid).toBe(false);
            expect(exceededCredit.errors).toContain(jasmine.stringMatching(/Credit limit exceeded/));
            expect(exceededCredit.warnings).toContain(jasmine.stringMatching(/no payment terms/));
        });
    });

    describe('Aging Analysis', () => {
        it('should calculate aging analysis correctly', () => {
            const today = new Date();
            const invoiceDate = new Date(today.getTime() - (45 * 24 * 60 * 60 * 1000)); // 45 days ago
            const dueDate = new Date(today.getTime() - (15 * 24 * 60 * 60 * 1000)); // 15 days ago (overdue)

            const aging = service.calculateAgingAnalysis(invoiceDate, dueDate, PaymentStatus.PENDING);

            expect(aging.daysOutstanding).toBe(45);
            expect(aging.isOverdue).toBe(true);
            expect(aging.agingCategory).toBe('1-30');
        });

        it('should categorize aging correctly', () => {
            const today = new Date();
            const invoiceDate = new Date(today.getTime() - (100 * 24 * 60 * 60 * 1000)); // 100 days ago
            const dueDate = new Date(today.getTime() - (70 * 24 * 60 * 60 * 1000)); // 70 days ago (overdue)

            const aging = service.calculateAgingAnalysis(invoiceDate, dueDate, PaymentStatus.PENDING);

            expect(aging.agingCategory).toBe('61-90');
            expect(aging.isOverdue).toBe(true);
        });

        it('should handle current invoices', () => {
            const today = new Date();
            const invoiceDate = new Date(today.getTime() - (10 * 24 * 60 * 60 * 1000)); // 10 days ago
            const dueDate = new Date(today.getTime() + (20 * 24 * 60 * 60 * 1000)); // 20 days from now

            const aging = service.calculateAgingAnalysis(invoiceDate, dueDate, PaymentStatus.PENDING);

            expect(aging.agingCategory).toBe('current');
            expect(aging.isOverdue).toBe(false);
        });
    });

    describe('Utility Functions', () => {
        it('should calculate total balance correctly', () => {
            const totalBalance = service.calculateTotalBalance(1000, 500);
            expect(totalBalance).toBe(1500);

            const totalBalanceWithZero = service.calculateTotalBalance(1000, 0);
            expect(totalBalance).toBe(1500);
        });

        it('should format currency correctly', () => {
            const formatted = service.formatCurrency(1234.56);
            expect(formatted).toContain('1,234.56');
            expect(formatted).toContain('PKR');
        });

        it('should format percentage correctly', () => {
            const formatted = service.formatPercentage(15.5);
            expect(formatted).toBe('15.50%');
        });

        it('should round to two decimal places correctly', () => {
            // Using reflection to test private method
            const roundMethod = (service as any).roundToTwoDecimals;

            expect(roundMethod(10.123456)).toBe(10.12);
            expect(roundMethod(10.126)).toBe(10.13);
            expect(roundMethod(10)).toBe(10);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty items array', () => {
            const totals = service.calculateInvoiceTotals([], DiscountType.PERCENTAGE, 0);

            expect(totals.subtotal).toBe(0);
            expect(totals.discountAmount).toBe(0);
            expect(totals.taxableAmount).toBe(0);
            expect(totals.gstAmount).toBe(0);
            expect(totals.whtAmount).toBe(0);
            expect(totals.grandTotal).toBe(0);
        });

        it('should handle items without tax rates', () => {
            const itemWithoutTax: Partial<InvoiceItem> = {
                quantity: 10,
                unitPrice: 100,
                discount: 0,
                discountType: DiscountType.PERCENTAGE,
                item: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Item',
                    category: 'Electronics',
                    unit: 'pcs',
                    sellingPrice: 100,
                    gstRate: 0,
                    whtRate: 0,
                    isActive: true
                }
            };

            const total = service.calculateItemTotal(itemWithoutTax);
            expect(total).toBe(1000); // No tax applied
        });

        it('should handle negative discount values', () => {
            const discount = service.calculateItemDiscount(1000, -10, DiscountType.PERCENTAGE);
            expect(discount).toBe(0);
        });

        it('should handle zero subtotal for discount calculation', () => {
            const discount = service.calculateInvoiceDiscount(0, 10, DiscountType.PERCENTAGE);
            expect(discount).toBe(0);
        });
    });
});