const rateSuggestionService = require('../../src/services/rateSuggestionService');
const quotationHistoryService = require('../../src/services/quotationHistoryService');
const purchaseOrderService = require('../../src/services/purchaseOrderService');
const Invoice = require('../../src/models/Invoice');

// Mock dependencies
jest.mock('../../src/services/quotationHistoryService');
jest.mock('../../src/services/purchaseOrderService');
jest.mock('../../src/models/Invoice');

describe('Rate Suggestion Service - Phase 2 (Requirement 18.4, 18.5)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getRateSuggestions - Task 61.1', () => {
        const mockItemId = 'item123';
        const mockPartyId = 'party123';

        it('should get rate suggestions for sales transaction', async () => {
            const mockQuotationHistory = [
                {
                    finalRate: 100,
                    quantity: 10,
                    transactionDate: new Date('2024-01-15'),
                    invoiceNumber: 'INV001'
                },
                {
                    finalRate: 95,
                    quantity: 5,
                    transactionDate: new Date('2024-01-10'),
                    invoiceNumber: 'INV002'
                }
            ];

            quotationHistoryService.getQuotationHistory = jest.fn().mockResolvedValue(mockQuotationHistory);

            const result = await rateSuggestionService.getRateSuggestions(
                mockItemId,
                mockPartyId,
                'sales'
            );

            expect(quotationHistoryService.getQuotationHistory).toHaveBeenCalledWith(
                mockItemId,
                mockPartyId,
                5
            );

            expect(result.quotationHistory).toBeTruthy();
            expect(result.quotationHistory.latestRate).toBe(100);
            expect(result.quotationHistory.history).toHaveLength(2);
            expect(result.recommendedRate).toBeTruthy();
            expect(result.recommendedRate.rate).toBe(100);
            expect(result.recommendedRate.source).toBe('quotation_history');
        });

        it('should get rate suggestions for purchase transaction with PO rate', async () => {
            const mockQuotationHistory = [
                {
                    finalRate: 80,
                    quantity: 50,
                    transactionDate: new Date('2024-01-10'),
                    invoiceNumber: 'PI001'
                }
            ];

            const mockPORate = {
                latestRate: {
                    unitPrice: 75,
                    quantity: 100,
                    pendingQuantity: 50,
                    poNumber: 'PO001',
                    poDate: new Date('2024-01-20')
                },
                history: [
                    {
                        unitPrice: 75,
                        quantity: 100,
                        pendingQuantity: 50,
                        poNumber: 'PO001',
                        poDate: new Date('2024-01-20')
                    }
                ]
            };

            quotationHistoryService.getQuotationHistory = jest.fn().mockResolvedValue(mockQuotationHistory);
            purchaseOrderService.getPORate = jest.fn().mockResolvedValue(mockPORate);

            const result = await rateSuggestionService.getRateSuggestions(
                mockItemId,
                mockPartyId,
                'purchase'
            );

            expect(purchaseOrderService.getPORate).toHaveBeenCalledWith(mockItemId, mockPartyId);
            expect(result.poRate).toBeTruthy();
            expect(result.poRate.rate).toBe(75);
            expect(result.recommendedRate.rate).toBe(75);
            expect(result.recommendedRate.source).toBe('po');
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(rateSuggestionService.getRateSuggestions(null, mockPartyId, 'sales'))
                .rejects.toThrow('Item ID is required');
        });

        it('should throw error when partyId is not provided', async () => {
            await expect(rateSuggestionService.getRateSuggestions(mockItemId, null, 'sales'))
                .rejects.toThrow('Party ID is required');
        });

        it('should throw error when transactionType is not provided', async () => {
            await expect(rateSuggestionService.getRateSuggestions(mockItemId, mockPartyId, null))
                .rejects.toThrow('Transaction type is required');
        });

        it('should throw error when transactionType is invalid', async () => {
            await expect(rateSuggestionService.getRateSuggestions(mockItemId, mockPartyId, 'invalid'))
                .rejects.toThrow('Transaction type must be either sales or purchase');
        });

        it('should handle when no quotation history exists', async () => {
            quotationHistoryService.getQuotationHistory = jest.fn().mockResolvedValue([]);

            const result = await rateSuggestionService.getRateSuggestions(
                mockItemId,
                mockPartyId,
                'sales'
            );

            expect(result.quotationHistory).toBeNull();
            expect(result.recommendedRate).toBeNull();
        });

        it('should handle when quotation history service fails', async () => {
            quotationHistoryService.getQuotationHistory = jest.fn().mockRejectedValue(
                new Error('Database error')
            );

            const result = await rateSuggestionService.getRateSuggestions(
                mockItemId,
                mockPartyId,
                'sales'
            );

            // Should not throw, just return null for quotation history
            expect(result.quotationHistory).toBeNull();
        });

        it('should handle when PO rate service fails', async () => {
            quotationHistoryService.getQuotationHistory = jest.fn().mockResolvedValue([]);
            purchaseOrderService.getPORate = jest.fn().mockRejectedValue(
                new Error('Database error')
            );

            const result = await rateSuggestionService.getRateSuggestions(
                mockItemId,
                mockPartyId,
                'purchase'
            );

            // Should not throw, just return null for PO rate
            expect(result.poRate).toBeNull();
        });
    });

    describe('getItemTransactionHistory - Task 61.2', () => {
        const mockItemId = 'item123';
        const mockPartyId = 'party123';

        it('should get item transaction history', async () => {
            const mockInvoices = [
                {
                    _id: 'inv1',
                    invoiceNumber: 'INV001',
                    invoiceDate: new Date('2024-01-15'),
                    type: 'sales',
                    customerId: {
                        _id: mockPartyId,
                        code: 'CUST001',
                        name: 'Customer 1'
                    },
                    paymentStatus: 'paid',
                    items: [
                        {
                            itemId: {
                                _id: mockItemId,
                                code: 'ITEM001',
                                name: 'Test Item',
                                unit: 'pcs'
                            },
                            quantity: 10,
                            unitPrice: 100,
                            discount: 5,
                            gstRate: 18,
                            lineTotal: 1000
                        }
                    ]
                },
                {
                    _id: 'inv2',
                    invoiceNumber: 'INV002',
                    invoiceDate: new Date('2024-01-10'),
                    type: 'sales',
                    customerId: {
                        _id: mockPartyId,
                        code: 'CUST001',
                        name: 'Customer 1'
                    },
                    paymentStatus: 'pending',
                    items: [
                        {
                            itemId: {
                                _id: mockItemId,
                                code: 'ITEM001',
                                name: 'Test Item',
                                unit: 'pcs'
                            },
                            quantity: 5,
                            unitPrice: 95,
                            discount: 0,
                            gstRate: 18,
                            lineTotal: 475
                        }
                    ]
                }
            ];

            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockInvoices)
            });

            const result = await rateSuggestionService.getItemTransactionHistory(
                mockItemId,
                mockPartyId
            );

            expect(result.transactions).toHaveLength(2);
            expect(result.count).toBe(2);
            expect(result.statistics.totalTransactions).toBe(2);
            expect(result.statistics.totalQuantity).toBe(15);
            expect(result.statistics.averageRate).toBe(97.5);
            expect(result.statistics.minRate).toBe(95);
            expect(result.statistics.maxRate).toBe(100);
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(rateSuggestionService.getItemTransactionHistory(null, mockPartyId))
                .rejects.toThrow('Item ID is required');
        });

        it('should throw error when partyId is not provided', async () => {
            await expect(rateSuggestionService.getItemTransactionHistory(mockItemId, null))
                .rejects.toThrow('Party ID is required');
        });

        it('should throw error when limit is invalid', async () => {
            await expect(rateSuggestionService.getItemTransactionHistory(mockItemId, mockPartyId, { limit: 0 }))
                .rejects.toThrow('Limit must be between 1 and 100');

            await expect(rateSuggestionService.getItemTransactionHistory(mockItemId, mockPartyId, { limit: 101 }))
                .rejects.toThrow('Limit must be between 1 and 100');
        });

        it('should use default limit of 10', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            await rateSuggestionService.getItemTransactionHistory(mockItemId, mockPartyId);

            const limitCall = Invoice.find().limit;
            expect(limitCall).toHaveBeenCalledWith(10);
        });

        it('should apply date filters', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            await rateSuggestionService.getItemTransactionHistory(mockItemId, mockPartyId, {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            });

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    invoiceDate: expect.any(Object)
                })
            );
        });

        it('should return empty statistics when no transactions', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            const result = await rateSuggestionService.getItemTransactionHistory(
                mockItemId,
                mockPartyId
            );

            expect(result.transactions).toHaveLength(0);
            expect(result.statistics.totalTransactions).toBe(0);
            expect(result.statistics.totalQuantity).toBe(0);
            expect(result.statistics.averageRate).toBe(0);
        });

        it('should handle invoices where item is not found', async () => {
            const mockInvoices = [
                {
                    _id: 'inv1',
                    invoiceNumber: 'INV001',
                    invoiceDate: new Date('2024-01-15'),
                    type: 'sales',
                    customerId: {
                        _id: mockPartyId,
                        code: 'CUST001',
                        name: 'Customer 1'
                    },
                    items: [
                        {
                            itemId: {
                                _id: 'differentItem',
                                code: 'ITEM002',
                                name: 'Different Item',
                                unit: 'pcs'
                            },
                            quantity: 10,
                            unitPrice: 100,
                            lineTotal: 1000
                        }
                    ]
                }
            ];

            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockInvoices)
            });

            const result = await rateSuggestionService.getItemTransactionHistory(
                mockItemId,
                mockPartyId
            );

            expect(result.transactions).toHaveLength(0);
        });
    });
});
