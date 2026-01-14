const purchaseOrderService = require('../../src/services/purchaseOrderService');
const PurchaseOrder = require('../../src/models/PurchaseOrder');

// Mock the PurchaseOrder model
jest.mock('../../src/models/PurchaseOrder');

describe('PurchaseOrder Service - PO Rate Lookup (Task 60.1, Requirement 18.3)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getPORate', () => {
        const mockItemId = 'item123';
        const mockSupplierId = 'supplier123';

        it('should get PO rate for item and supplier', async () => {
            const mockPOs = [
                {
                    _id: 'po1',
                    poNumber: 'PO001',
                    poDate: new Date('2024-01-20'),
                    supplierId: {
                        _id: mockSupplierId,
                        name: 'Test Supplier',
                        code: 'SUP001'
                    },
                    items: [
                        {
                            itemId: {
                                _id: mockItemId,
                                name: 'Test Item',
                                code: 'ITEM001',
                                unit: 'pcs'
                            },
                            quantity: 100,
                            unitPrice: 50,
                            receivedQuantity: 50,
                            pendingQuantity: 50,
                            lineTotal: 5000
                        }
                    ]
                },
                {
                    _id: 'po2',
                    poNumber: 'PO002',
                    poDate: new Date('2024-01-10'),
                    supplierId: {
                        _id: mockSupplierId,
                        name: 'Test Supplier',
                        code: 'SUP001'
                    },
                    items: [
                        {
                            itemId: {
                                _id: mockItemId,
                                name: 'Test Item',
                                code: 'ITEM001',
                                unit: 'pcs'
                            },
                            quantity: 50,
                            unitPrice: 48,
                            receivedQuantity: 50,
                            pendingQuantity: 0,
                            lineTotal: 2400
                        }
                    ]
                }
            ];

            PurchaseOrder.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockPOs)
            });

            const result = await purchaseOrderService.getPORate(mockItemId, mockSupplierId);

            expect(PurchaseOrder.find).toHaveBeenCalledWith({
                supplierId: mockSupplierId,
                status: 'approved',
                isDeleted: false,
                'items.itemId': mockItemId
            });

            expect(result).toBeTruthy();
            expect(result.latestRate).toBeTruthy();
            expect(result.latestRate.poNumber).toBe('PO001');
            expect(result.latestRate.unitPrice).toBe(50);
            expect(result.history).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should return null when no PO found', async () => {
            PurchaseOrder.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            const result = await purchaseOrderService.getPORate(mockItemId, mockSupplierId);

            expect(result).toBeNull();
        });

        it('should throw error when itemId is not provided', async () => {
            await expect(purchaseOrderService.getPORate(null, mockSupplierId))
                .rejects.toThrow('Item ID is required');
        });

        it('should throw error when supplierId is not provided', async () => {
            await expect(purchaseOrderService.getPORate(mockItemId, null))
                .rejects.toThrow('Supplier ID is required');
        });

        it('should handle POs where item is not found in items array', async () => {
            const mockPOs = [
                {
                    _id: 'po1',
                    poNumber: 'PO001',
                    poDate: new Date('2024-01-20'),
                    supplierId: {
                        _id: mockSupplierId,
                        name: 'Test Supplier',
                        code: 'SUP001'
                    },
                    items: [
                        {
                            itemId: {
                                _id: 'differentItem',
                                name: 'Different Item',
                                code: 'ITEM002',
                                unit: 'pcs'
                            },
                            quantity: 100,
                            unitPrice: 50,
                            receivedQuantity: 0,
                            pendingQuantity: 100,
                            lineTotal: 5000
                        }
                    ]
                }
            ];

            PurchaseOrder.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockPOs)
            });

            const result = await purchaseOrderService.getPORate(mockItemId, mockSupplierId);

            expect(result).toBeNull();
        });

        it('should include pending quantities in the result', async () => {
            const mockPOs = [
                {
                    _id: 'po1',
                    poNumber: 'PO001',
                    poDate: new Date('2024-01-20'),
                    supplierId: {
                        _id: mockSupplierId,
                        name: 'Test Supplier',
                        code: 'SUP001'
                    },
                    items: [
                        {
                            itemId: {
                                _id: mockItemId,
                                name: 'Test Item',
                                code: 'ITEM001',
                                unit: 'pcs'
                            },
                            quantity: 100,
                            unitPrice: 50,
                            receivedQuantity: 30,
                            pendingQuantity: 70,
                            lineTotal: 5000
                        }
                    ]
                }
            ];

            PurchaseOrder.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockPOs)
            });

            const result = await purchaseOrderService.getPORate(mockItemId, mockSupplierId);

            expect(result.latestRate.quantity).toBe(100);
            expect(result.latestRate.receivedQuantity).toBe(30);
            expect(result.latestRate.pendingQuantity).toBe(70);
        });

        it('should limit results to 5 POs', async () => {
            PurchaseOrder.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            await purchaseOrderService.getPORate(mockItemId, mockSupplierId);

            const limitCall = PurchaseOrder.find().limit;
            expect(limitCall).toHaveBeenCalledWith(5);
        });

        it('should sort by poDate and createdAt descending', async () => {
            PurchaseOrder.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });

            await purchaseOrderService.getPORate(mockItemId, mockSupplierId);

            const sortCall = PurchaseOrder.find().sort;
            expect(sortCall).toHaveBeenCalledWith({ poDate: -1, createdAt: -1 });
        });
    });
});
