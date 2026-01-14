const quotationHistoryService = require('../../src/services/quotationHistoryService');
const QuotationHistory = require('../../src/models/QuotationHistory');

// Mock the QuotationHistory model
jest.mock('../../src/models/QuotationHistory');

describe('QuotationHistory Service - Phase 2 (Requirement 18.1, 18.2)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('recordQuotationRate - Task 59.2', () => {
        it('should record quotation rates from sales invoice', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                invoiceNumber: 'INV001',
                type: 'sales',
                customerId: 'customer123',
                invoiceDate: new Date('2024-01-15'),
                notes: 'Test invoice',
                items: [
                    {
                        itemId: 'item1',
                        unitPrice: 100,
                        quantity: 5,
                        discount: 10,
                        gstRate: 18,
                        lineTotal: 500
                    },
                    {
                        itemId: 'item2',
                        unitPrice: 200,
                        quantity: 3,
                        discount: 0,
                        gstRate: 18,
                        lineTotal: 600
                    }
                ]
            };

            QuotationHistory.create = jest.fn()
                .mockResolvedValueOnce({ _id: 'history1' })
                .mockResolvedValueOnce({ _id: 'history2' });

            const result = await quotationHistoryService.recordQuotationRate(mockInvoice);

            expect(result).toHaveLength(2);
            expect(QuotationHistory.create).toHaveBeenCalledTimes(2);
            expect(QuotationHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemId: 'item1',
                    partyId: 'customer123',
                    partyModel: 'Customer',
                    transactionType: 'sales',
                    rate: 100,
                    quantity: 5
                })
            );
        });

        it('should record quotation rates from purchase invoice', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                invoiceNumber: 'PI001',
                type: 'purchase',
                supplierId: 'supplier123',
                invoiceDate: new Date('2024-01-15'),
                items: [
                    {
                        itemId: 'item1',
                        unitPrice: 80,
                        quantity: 10,
                        discount: 5,
                        gstRate: 18,
                        lineTotal: 800
                    }
                ]
            };

            QuotationHistory.create = jest.fn().mockResolvedValue({ _id: 'history1' });

            const result = await quotationHistoryService.recordQuotationRate(mockInvoice);

            expect(result).toHaveLength(1);
            expect(QuotationHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemId: 'item1',
                    partyId: 'supplier123',
                    partyModel: 'Supplier',
                    transactionType: 'purchase',
                    rate: 80,
                    quantity: 10
                })
            );
        });

        it('should throw error when invoice is not provided', async () => {
            await expect(quotationHistoryService.recordQuotationRate(null))
                .rejects.toThrow('Invoice is required');
        });

        it('should throw error when invoice has no items', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                invoiceNumber: 'INV001',
                type: 'sales',
                customerId: 'customer123',
                items: []
            };

            await expect(quotationHistoryService.recordQuotationRate(mockInvoice))
                .rejects.toThrow('Invoice must have at least one item');
        });

        it('should throw error when party ID is missing', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                invoiceNumber: 'INV001',
                type: 'sales',
                items: [{ itemId: 'item1', unitPrice: 100, quantity: 5, lineTotal: 500 }]
            };

            await expect(quotationHistoryService.recordQuotationRate(mockInvoice))
                .rejects.toThrow('Customer ID is required for sales invoice');
        });

        it('should skip items without itemId', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                invoiceNumber: 'INV001',
                type: 'sales',
                customerId: 'customer123',
                invoiceDate: new Date('2024-01-15'),
                items: [
                    { itemId: null, unitPrice: 100, quantity: 5, lineTotal: 500 },
                    { itemId: 'item2', unitPrice: 200, quantity: 3, lineTotal: 600 }
                ]
            };

            QuotationHistory.create = jest.fn().mockResolvedValue({ _id: 'history1' });

            const result = await quotationHistoryService.recordQuotationRate(mockInvoice);

            expect(result).toHaveLength(1);
            expect(QuotationHistory.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('getQuotationHistory - Task 59.3', () => {
        it('should get quotation history for item and party', async () => {
            const mockHistory = [
                {
                    _id: 'history1',
                    itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' },
                    partyId: { _id: 'party1', code: 'PARTY001', name: 'Party 1' },
                    invoiceNumber: 'INV001',
                    transactionType: 'sales',
                    rate: 100,
                    quantity: 5,
                    discount: 10,
                    taxRate: 18,
                    finalRate: 100,
                    transactionDate: new Date('2024-01-15'),
                    notes: 'Test',
                    createdAt: new Date('2024-01-15')
                }
            ];

            QuotationHistory.getHistory = jest.fn().mockResolvedValue(mockHistory);

            const result = await quotationHistoryService.getQuotationHistory('item1', 'party1', 10);

            expect(QuotationHistory.getHistory).toHaveBeenCalledWith('item1', 'party1', 10);
            expect(result).toHaveLength(1);
            expect(result[0].rate).toBe(100);
            expect(result[0].quantity).toBe(5);
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(quotationHistoryService.getQuotationHistory(null, 'party1', 10))
                .rejects.toThrow('Item ID is required');
        });

        it('should throw error when partyId is not provided', async () => {
            await expect(quotationHistoryService.getQuotationHistory('item1', null, 10))
                .rejects.toThrow('Party ID is required');
        });

        it('should throw error when limit is invalid', async () => {
            await expect(quotationHistoryService.getQuotationHistory('item1', 'party1', 0))
                .rejects.toThrow('Limit must be between 1 and 100');

            await expect(quotationHistoryService.getQuotationHistory('item1', 'party1', 101))
                .rejects.toThrow('Limit must be between 1 and 100');
        });

        it('should use default limit of 10', async () => {
            QuotationHistory.getHistory = jest.fn().mockResolvedValue([]);

            await quotationHistoryService.getQuotationHistory('item1', 'party1');

            expect(QuotationHistory.getHistory).toHaveBeenCalledWith('item1', 'party1', 10);
        });
    });

    describe('getLatestRate', () => {
        it('should get latest rate for item and party', async () => {
            const mockLatest = {
                _id: 'history1',
                itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' },
                partyId: { _id: 'party1', code: 'PARTY001', name: 'Party 1' },
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: 100,
                quantity: 5,
                discount: 10,
                taxRate: 18,
                finalRate: 100,
                transactionDate: new Date('2024-01-15'),
                notes: 'Test'
            };

            QuotationHistory.getLatestRate = jest.fn().mockResolvedValue(mockLatest);

            const result = await quotationHistoryService.getLatestRate('item1', 'party1');

            expect(QuotationHistory.getLatestRate).toHaveBeenCalledWith('item1', 'party1');
            expect(result.rate).toBe(100);
            expect(result.invoiceNumber).toBe('INV001');
        });

        it('should return null when no history exists', async () => {
            QuotationHistory.getLatestRate = jest.fn().mockResolvedValue(null);

            const result = await quotationHistoryService.getLatestRate('item1', 'party1');

            expect(result).toBeNull();
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(quotationHistoryService.getLatestRate(null, 'party1'))
                .rejects.toThrow('Item ID is required');
        });

        it('should throw error when partyId is not provided', async () => {
            await expect(quotationHistoryService.getLatestRate('item1', null))
                .rejects.toThrow('Party ID is required');
        });
    });

    describe('getHistoryByType', () => {
        it('should get history by transaction type', async () => {
            const mockHistory = [
                {
                    _id: 'history1',
                    itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' },
                    partyId: { _id: 'party1', code: 'PARTY001', name: 'Party 1' },
                    invoiceNumber: 'INV001',
                    transactionType: 'sales',
                    rate: 100,
                    quantity: 5,
                    discount: 10,
                    taxRate: 18,
                    finalRate: 100,
                    transactionDate: new Date('2024-01-15'),
                    notes: 'Test',
                    createdAt: new Date('2024-01-15')
                }
            ];

            QuotationHistory.getHistoryByType = jest.fn().mockResolvedValue(mockHistory);

            const result = await quotationHistoryService.getHistoryByType('item1', 'sales', 10);

            expect(QuotationHistory.getHistoryByType).toHaveBeenCalledWith('item1', 'sales', 10);
            expect(result).toHaveLength(1);
            expect(result[0].transactionType).toBe('sales');
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(quotationHistoryService.getHistoryByType(null, 'sales', 10))
                .rejects.toThrow('Item ID is required');
        });

        it('should throw error when transactionType is not provided', async () => {
            await expect(quotationHistoryService.getHistoryByType('item1', null, 10))
                .rejects.toThrow('Transaction type is required');
        });

        it('should throw error when transactionType is invalid', async () => {
            await expect(quotationHistoryService.getHistoryByType('item1', 'invalid', 10))
                .rejects.toThrow('Transaction type must be either sales or purchase');
        });
    });

    describe('getItemHistory', () => {
        it('should get all history for an item', async () => {
            const mockHistory = [
                {
                    _id: 'history1',
                    itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' },
                    partyId: { _id: 'party1', code: 'PARTY001', name: 'Party 1' },
                    partyModel: 'Customer',
                    invoiceNumber: 'INV001',
                    transactionType: 'sales',
                    rate: 100,
                    quantity: 5,
                    discount: 10,
                    taxRate: 18,
                    finalRate: 100,
                    transactionDate: new Date('2024-01-15'),
                    notes: 'Test'
                }
            ];

            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis()
            };
            mockChain.populate.mockResolvedValue(mockHistory);

            QuotationHistory.find = jest.fn().mockReturnValue(mockChain);

            const result = await quotationHistoryService.getItemHistory('item1');

            expect(result).toHaveLength(1);
            expect(result[0].itemId).toBeTruthy();
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(quotationHistoryService.getItemHistory(null))
                .rejects.toThrow('Item ID is required');
        });

        it('should apply date filters', async () => {
            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis()
            };
            mockChain.populate.mockResolvedValue([]);

            QuotationHistory.find = jest.fn().mockReturnValue(mockChain);

            await quotationHistoryService.getItemHistory('item1', {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            });

            expect(QuotationHistory.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemId: 'item1',
                    transactionDate: expect.any(Object)
                })
            );
        });
    });

    describe('deleteByInvoice', () => {
        it('should delete quotation history for an invoice', async () => {
            QuotationHistory.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 3 });

            const result = await quotationHistoryService.deleteByInvoice('invoice123');

            expect(QuotationHistory.deleteMany).toHaveBeenCalledWith({ invoiceId: 'invoice123' });
            expect(result.deletedCount).toBe(3);
            expect(result.success).toBe(true);
        });

        it('should throw error when invoiceId is not provided', async () => {
            await expect(quotationHistoryService.deleteByInvoice(null))
                .rejects.toThrow('Invoice ID is required');
        });

        it('should return success false when no records deleted', async () => {
            QuotationHistory.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

            const result = await quotationHistoryService.deleteByInvoice('invoice123');

            expect(result.deletedCount).toBe(0);
            expect(result.success).toBe(false);
        });
    });
});
