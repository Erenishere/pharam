/**
 * Unit Tests for Income Tax Service
 * Phase 2 - Requirement 23: Income Tax Calculation (5.5%)
 * Tasks 67.2, 67.3, 67.4, 67.5
 */

const incomeTaxService = require('../../src/services/incomeTaxService');
const Invoice = require('../../src/models/Invoice');
const ledgerService = require('../../src/services/ledgerService');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/services/ledgerService');

describe('Income Tax Service - Phase 2 (Requirement 23)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateIncomeTax - Task 67.2', () => {
        it('should calculate 5.5% income tax on amount', () => {
            const amount = 10000;
            const result = incomeTaxService.calculateIncomeTax(amount);
            expect(result).toBe(550); // 5.5% of 10000
        });

        it('should calculate income tax for different amounts', () => {
            expect(incomeTaxService.calculateIncomeTax(1000)).toBe(55);
            expect(incomeTaxService.calculateIncomeTax(5000)).toBe(275);
            expect(incomeTaxService.calculateIncomeTax(20000)).toBe(1100);
        });

        it('should return 0 for zero amount', () => {
            const result = incomeTaxService.calculateIncomeTax(0);
            expect(result).toBe(0);
        });

        it('should return 0 for negative amount', () => {
            const result = incomeTaxService.calculateIncomeTax(-1000);
            expect(result).toBe(0);
        });

        it('should return 0 for null amount', () => {
            const result = incomeTaxService.calculateIncomeTax(null);
            expect(result).toBe(0);
        });

        it('should handle decimal amounts correctly', () => {
            const amount = 10500.50;
            const result = incomeTaxService.calculateIncomeTax(amount);
            expect(result).toBeCloseTo(577.53, 2);
        });
    });

    describe('applyIncomeTaxToInvoice - Task 67.3', () => {
        let mockInvoice;

        beforeEach(() => {
            mockInvoice = {
                invoiceNumber: 'INV-001',
                incomeTax: 0,
                totals: {
                    subtotal: 10000,
                    grandTotal: 10000,
                    incomeTaxTotal: 0
                }
            };
        });

        it('should apply income tax to invoice', () => {
            const taxableAmount = 10000;
            const result = incomeTaxService.applyIncomeTaxToInvoice(mockInvoice, taxableAmount);

            expect(result.incomeTax).toBe(550); // 5.5% of 10000
            expect(result.totals.incomeTaxTotal).toBe(550);
        });

        it('should set income tax to 0 for zero taxable amount', () => {
            const result = incomeTaxService.applyIncomeTaxToInvoice(mockInvoice, 0);

            expect(result.incomeTax).toBe(0);
            expect(result.totals.incomeTaxTotal).toBe(0);
        });

        it('should set income tax to 0 for negative taxable amount', () => {
            const result = incomeTaxService.applyIncomeTaxToInvoice(mockInvoice, -1000);

            expect(result.incomeTax).toBe(0);
            expect(result.totals.incomeTaxTotal).toBe(0);
        });

        it('should throw error if invoice is not provided', () => {
            expect(() => {
                incomeTaxService.applyIncomeTaxToInvoice(null, 10000);
            }).toThrow('Invoice is required');
        });

        it('should handle invoice without totals object', () => {
            const invoiceWithoutTotals = {
                invoiceNumber: 'INV-002',
                incomeTax: 0
            };

            const result = incomeTaxService.applyIncomeTaxToInvoice(invoiceWithoutTotals, 10000);

            expect(result.incomeTax).toBe(550);
        });
    });

    describe('createIncomeTaxLedgerEntries - Task 67.4', () => {
        let mockInvoice;

        beforeEach(() => {
            mockInvoice = {
                _id: 'invoice123',
                invoiceNumber: 'INV-001',
                customerId: 'customer123',
                incomeTax: 550,
                totals: {
                    incomeTaxTotal: 550
                }
            };

            ledgerService.createDoubleEntry = jest.fn().mockResolvedValue({
                debit: { accountId: 'incomeTaxAccount', amount: 550 },
                credit: { accountId: 'customer123', amount: 550 }
            });
        });

        it('should create ledger entries for income tax', async () => {
            const result = await incomeTaxService.createIncomeTaxLedgerEntries(
                mockInvoice,
                'incomeTaxAccount',
                'user123'
            );

            expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
                { accountId: 'incomeTaxAccount', accountType: 'Account' },
                { accountId: 'customer123', accountType: 'Customer' },
                550,
                'Income Tax (5.5%) - Invoice INV-001',
                'invoice',
                'invoice123',
                'user123'
            );

            expect(result.totalAmount).toBe(550);
            expect(result.entries).toHaveLength(1);
        });

        it('should use supplier account for purchase invoices', async () => {
            mockInvoice.customerId = null;
            mockInvoice.supplierId = 'supplier123';

            await incomeTaxService.createIncomeTaxLedgerEntries(
                mockInvoice,
                'incomeTaxAccount',
                'user123'
            );

            expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
                expect.anything(),
                { accountId: 'supplier123', accountType: 'Supplier' },
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            );
        });

        it('should not create entries if income tax is zero', async () => {
            mockInvoice.incomeTax = 0;
            mockInvoice.totals.incomeTaxTotal = 0;

            const result = await incomeTaxService.createIncomeTaxLedgerEntries(
                mockInvoice,
                'incomeTaxAccount',
                'user123'
            );

            expect(ledgerService.createDoubleEntry).not.toHaveBeenCalled();
            expect(result.totalAmount).toBe(0);
            expect(result.entries).toHaveLength(0);
        });

        it('should throw error if invoice is not provided', async () => {
            await expect(
                incomeTaxService.createIncomeTaxLedgerEntries(null, 'incomeTaxAccount', 'user123')
            ).rejects.toThrow('Invoice is required');
        });

        it('should throw error if user ID is not provided', async () => {
            await expect(
                incomeTaxService.createIncomeTaxLedgerEntries(mockInvoice, 'incomeTaxAccount', null)
            ).rejects.toThrow('User ID is required');
        });

        it('should throw error if income tax account ID is not provided when income tax exists', async () => {
            await expect(
                incomeTaxService.createIncomeTaxLedgerEntries(mockInvoice, null, 'user123')
            ).rejects.toThrow('Income tax account ID is required when income tax is applied');
        });

        it('should throw error if invoice has no customer or supplier', async () => {
            mockInvoice.customerId = null;
            mockInvoice.supplierId = null;

            await expect(
                incomeTaxService.createIncomeTaxLedgerEntries(mockInvoice, 'incomeTaxAccount', 'user123')
            ).rejects.toThrow('Invoice must have either a customer or supplier');
        });
    });

    describe('getIncomeTaxReport - Task 67.5', () => {
        it('should generate income tax report', async () => {
            const mockInvoices = [
                {
                    invoiceNumber: 'INV-001',
                    invoiceDate: new Date('2023-12-01'),
                    type: 'sales',
                    customerId: { _id: 'customer1', name: 'Customer A' },
                    incomeTax: 550,
                    totals: { incomeTaxTotal: 550, subtotal: 10000, grandTotal: 10550 }
                },
                {
                    invoiceNumber: 'INV-002',
                    invoiceDate: new Date('2023-12-02'),
                    type: 'sales',
                    customerId: { _id: 'customer1', name: 'Customer A' },
                    incomeTax: 275,
                    totals: { incomeTaxTotal: 275, subtotal: 5000, grandTotal: 5275 }
                },
                {
                    invoiceNumber: 'INV-003',
                    invoiceDate: new Date('2023-12-03'),
                    type: 'purchase',
                    supplierId: { _id: 'supplier1', name: 'Supplier B' },
                    incomeTax: 1100,
                    totals: { incomeTaxTotal: 1100, subtotal: 20000, grandTotal: 21100 }
                }
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(mockInvoices)
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            const result = await incomeTaxService.getIncomeTaxReport({
                startDate: '2023-12-01',
                endDate: '2023-12-31'
            });

            expect(result.totalIncomeTax).toBe(1925); // 550 + 275 + 1100
            expect(result.invoiceCount).toBe(3);
            expect(result.incomeTaxRate).toBe(5.5);
            expect(result.accountBreakdown).toHaveLength(2); // 1 customer, 1 supplier
        });

        it('should filter by customer ID', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue([])
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            await incomeTaxService.getIncomeTaxReport(
                { startDate: '2023-12-01', endDate: '2023-12-31' },
                { customerId: 'customer123' }
            );

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerId: 'customer123'
                })
            );
        });

        it('should filter by supplier ID', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue([])
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            await incomeTaxService.getIncomeTaxReport(
                { startDate: '2023-12-01', endDate: '2023-12-31' },
                { supplierId: 'supplier123' }
            );

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    supplierId: 'supplier123'
                })
            );
        });

        it('should throw error if date range is not provided', async () => {
            await expect(
                incomeTaxService.getIncomeTaxReport(null)
            ).rejects.toThrow('Date range with startDate and endDate is required');
        });

        it('should throw error if startDate is missing', async () => {
            await expect(
                incomeTaxService.getIncomeTaxReport({ endDate: '2023-12-31' })
            ).rejects.toThrow('Date range with startDate and endDate is required');
        });

        it('should throw error if endDate is missing', async () => {
            await expect(
                incomeTaxService.getIncomeTaxReport({ startDate: '2023-12-01' })
            ).rejects.toThrow('Date range with startDate and endDate is required');
        });
    });

    describe('getIncomeTaxSummary', () => {
        it('should generate income tax summary', async () => {
            const mockInvoices = [
                {
                    invoiceNumber: 'INV-001',
                    invoiceDate: new Date('2023-12-01'),
                    type: 'sales',
                    customerId: { _id: 'customer1', name: 'Customer A' },
                    incomeTax: 550,
                    totals: { incomeTaxTotal: 550, subtotal: 10000, grandTotal: 10550 }
                },
                {
                    invoiceNumber: 'INV-002',
                    invoiceDate: new Date('2023-12-02'),
                    type: 'sales',
                    customerId: { _id: 'customer1', name: 'Customer A' },
                    incomeTax: 450,
                    totals: { incomeTaxTotal: 450, subtotal: 8000, grandTotal: 8450 }
                }
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(mockInvoices)
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            const result = await incomeTaxService.getIncomeTaxSummary({
                startDate: '2023-12-01',
                endDate: '2023-12-31'
            });

            expect(result.totalIncomeTax).toBe(1000);
            expect(result.invoiceCount).toBe(2);
            expect(result.incomeTaxRate).toBe(5.5);
            expect(result.averageIncomeTaxPerInvoice).toBe(500);
            expect(result.accountCount).toBe(1);
        });
    });
});
