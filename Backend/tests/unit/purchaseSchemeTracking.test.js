const purchaseSchemeTrackingService = require('../../src/services/purchaseSchemeTracking');
const Invoice = require('../../src/models/Invoice');
const Account = require('../../src/models/Account');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Account');

describe('PurchaseSchemeTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSchemeQuantities', () => {
    test('should record scheme quantities for invoice items', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          { itemId: 'item1', quantity: 12, schemeQuantity: 0 },
          { itemId: 'item2', quantity: 24, schemeQuantity: 0 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const schemeItems = [
        { itemId: 'item1', schemeQuantity: 1 },
        { itemId: 'item2', schemeQuantity: 2 }
      ];

      const result = await purchaseSchemeTrackingService.recordSchemeQuantities('invoice123', schemeItems);

      expect(result.invoiceId).toBe('invoice123');
      expect(result.totalSchemeQuantity).toBe(3);
      expect(mockInvoice.save).toHaveBeenCalled();
    });

    test('should validate scheme quantity does not exceed regular quantity', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          { itemId: 'item1', quantity: 10 }
        ]
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const schemeItems = [
        { itemId: 'item1', schemeQuantity: 15 } // Exceeds regular quantity
      ];

      await expect(
        purchaseSchemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('cannot exceed regular quantity');
    });

    test('should validate claim account if provided', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          { itemId: 'item1', quantity: 12 }
        ]
      };

      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        isActive: true
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Account.findById.mockResolvedValue(mockAccount);

      const schemeItems = [
        { itemId: 'item1', schemeQuantity: 2, claimAccountId: 'account123' }
      ];

      const result = await purchaseSchemeTrackingService.recordSchemeQuantities('invoice123', schemeItems);

      expect(Account.findById).toHaveBeenCalledWith('account123');
      expect(result.totalSchemeQuantity).toBe(2);
    });

    test('should throw error if claim account not found', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          { itemId: 'item1', quantity: 12 }
        ]
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Account.findById.mockResolvedValue(null);

      const schemeItems = [
        { itemId: 'item1', schemeQuantity: 2, claimAccountId: 'nonexistent' }
      ];

      await expect(
        purchaseSchemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('Claim account not found');
    });

    test('should throw error if invoice not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      const schemeItems = [
        { itemId: 'item1', schemeQuantity: 1 }
      ];

      await expect(
        purchaseSchemeTrackingService.recordSchemeQuantities('nonexistent', schemeItems)
      ).rejects.toThrow('Invoice not found');
    });

    test('should throw error if invoice is not purchase type', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'sales',
        items: []
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const schemeItems = [
        { itemId: 'item1', schemeQuantity: 1 }
      ];

      await expect(
        purchaseSchemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('Can only record schemes for purchase invoices');
    });
  });

  describe('getInvoiceSchemes', () => {
    test('should return scheme summary for invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'PI001',
        invoiceDate: new Date('2024-01-15'),
        supplierId: 'supplier123',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 12,
            schemeQuantity: 1
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            quantity: 24,
            schemeQuantity: 2
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockInvoice)
        })
      });

      const result = await purchaseSchemeTrackingService.getInvoiceSchemes('invoice123');

      expect(result.invoiceId).toBe('invoice123');
      expect(result.totalSchemeQuantity).toBe(3);
      expect(result.schemes).toHaveLength(2);
    });

    test('should calculate scheme percentage', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'PI001',
        invoiceDate: new Date('2024-01-15'),
        supplierId: 'supplier123',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            schemeQuantity: 1
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockInvoice)
        })
      });

      const result = await purchaseSchemeTrackingService.getInvoiceSchemes('invoice123');

      expect(result.schemes[0].schemePercentage).toBe('10.00');
    });

    test('should filter out items without schemes', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'PI001',
        invoiceDate: new Date('2024-01-15'),
        supplierId: 'supplier123',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 12,
            schemeQuantity: 1
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            quantity: 24,
            schemeQuantity: 0
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockInvoice)
        })
      });

      const result = await purchaseSchemeTrackingService.getInvoiceSchemes('invoice123');

      expect(result.schemes).toHaveLength(1);
      expect(result.itemsWithScheme).toBe(1);
    });
  });

  describe('validateSchemeQuantities', () => {
    test('should validate scheme quantities do not exceed regular quantity', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          schemeQuantity: 1
        }
      ];

      const result = purchaseSchemeTrackingService.validateSchemeQuantities(items);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject when scheme quantities exceed regular quantity', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          schemeQuantity: 15
        }
      ];

      const result = purchaseSchemeTrackingService.validateSchemeQuantities(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('exceeds regular quantity');
    });

    test('should reject negative scheme quantities', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          schemeQuantity: -1
        }
      ];

      const result = purchaseSchemeTrackingService.validateSchemeQuantities(items);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cannot be negative');
    });
  });

  describe('separateSchemeItems', () => {
    test('should separate scheme items from regular items', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 13,
          schemeQuantity: 1
        },
        {
          itemId: 'item2',
          quantity: 10,
          schemeQuantity: 0
        }
      ];

      const result = purchaseSchemeTrackingService.separateSchemeItems(items);

      expect(result.regularItems).toHaveLength(2);
      expect(result.schemeItems).toHaveLength(1);
      expect(result.regularItems[0].quantity).toBe(12); // 13 - 1 scheme
      expect(result.regularItems[1].quantity).toBe(10);
      expect(result.totalSchemeQuantity).toBe(1);
    });

    test('should handle items with only schemes', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 2,
          schemeQuantity: 2
        }
      ];

      const result = purchaseSchemeTrackingService.separateSchemeItems(items);

      expect(result.regularItems).toHaveLength(0);
      expect(result.schemeItems).toHaveLength(1);
      expect(result.totalSchemeQuantity).toBe(2);
    });
  });

  describe('getSupplierSchemesSummary', () => {
    test('should return scheme summary for supplier', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceDate: new Date('2024-01-15'),
          supplierId: 'supplier123',
          items: [
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
              quantity: 12,
              schemeQuantity: 1
            }
          ]
        },
        {
          _id: 'inv2',
          invoiceDate: new Date('2024-01-20'),
          supplierId: 'supplier123',
          items: [
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
              quantity: 24,
              schemeQuantity: 2
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await purchaseSchemeTrackingService.getSupplierSchemesSummary('supplier123');

      expect(result.supplierId).toBe('supplier123');
      expect(result.totalInvoices).toBe(2);
      expect(result.totalSchemeQuantity).toBe(3);
      expect(result.itemBreakdown).toHaveLength(1);
    });

    test('should filter by date range', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      await purchaseSchemeTrackingService.getSupplierSchemesSummary('supplier123', dateRange);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });
  });

  describe('getSchemeAnalysis', () => {
    test('should return scheme analysis for date range', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'supplier123', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 12,
              schemeQuantity: 1
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await purchaseSchemeTrackingService.getSchemeAnalysis({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.summary.totalSchemeQuantity).toBe(1);
      expect(result.itemBreakdown).toHaveLength(1);
    });

    test('should require start and end dates', async () => {
      await expect(
        purchaseSchemeTrackingService.getSchemeAnalysis({})
      ).rejects.toThrow('Start date and end date are required');
    });
  });
});
