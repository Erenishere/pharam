const schemeTrackingService = require('../../src/services/schemeTrackingService');
const Invoice = require('../../src/models/Invoice');
const Account = require('../../src/models/Account');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Account');

describe('SchemeTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSchemeQuantities', () => {
    test('should record scheme quantities for invoice items', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', quantity: 12, scheme1Quantity: 0, scheme2Quantity: 0 },
          { itemId: 'item2', quantity: 24, scheme1Quantity: 0, scheme2Quantity: 0 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const schemeItems = [
        { itemId: 'item1', scheme1Quantity: 1, scheme2Quantity: 0 },
        { itemId: 'item2', scheme1Quantity: 2, scheme2Quantity: 0 }
      ];

      const result = await schemeTrackingService.recordSchemeQuantities('invoice123', schemeItems);

      expect(result.invoiceId).toBe('invoice123');
      expect(result.totalScheme1).toBe(3);
      expect(result.totalScheme2).toBe(0);
      expect(mockInvoice.save).toHaveBeenCalled();
    });

    test('should require claim account for scheme2 quantities', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', quantity: 12 }
        ],
        save: jest.fn()
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const schemeItems = [
        { itemId: 'item1', scheme1Quantity: 0, scheme2Quantity: 2 }
        // No claimAccountId
      ];

      await expect(
        schemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('Claim account is required for scheme2');
    });

    test('should validate claim account exists and is active', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', quantity: 12 }
        ],
        save: jest.fn()
      };

      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        isActive: true
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Account.findById.mockResolvedValue(mockAccount);

      const schemeItems = [
        { itemId: 'item1', scheme1Quantity: 0, scheme2Quantity: 2, claimAccountId: 'account123' }
      ];

      const result = await schemeTrackingService.recordSchemeQuantities('invoice123', schemeItems);

      expect(Account.findById).toHaveBeenCalledWith('account123');
      expect(result.totalScheme2).toBe(2);
    });

    test('should throw error if claim account not found', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', quantity: 12 }
        ]
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Account.findById.mockResolvedValue(null);

      const schemeItems = [
        { itemId: 'item1', scheme2Quantity: 2, claimAccountId: 'nonexistent' }
      ];

      await expect(
        schemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('Claim account not found');
    });

    test('should throw error if claim account is not active', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', quantity: 12 }
        ]
      };

      const mockAccount = {
        _id: 'account123',
        name: 'Inactive Account',
        isActive: false
      };

      Invoice.findById.mockResolvedValue(mockInvoice);
      Account.findById.mockResolvedValue(mockAccount);

      const schemeItems = [
        { itemId: 'item1', scheme2Quantity: 2, claimAccountId: 'account123' }
      ];

      await expect(
        schemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('is not active');
    });

    test('should throw error if item not found in invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', quantity: 12 }
        ]
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const schemeItems = [
        { itemId: 'nonexistent', scheme1Quantity: 1 }
      ];

      await expect(
        schemeTrackingService.recordSchemeQuantities('invoice123', schemeItems)
      ).rejects.toThrow('not found in invoice');
    });
  });

  describe('getInvoiceSchemes', () => {
    test('should return scheme summary for invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'INV001',
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            scheme1Quantity: 1,
            scheme2Quantity: 0
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            scheme1Quantity: 2,
            scheme2Quantity: 1
          }
        ],
        claimAccountId: null
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockInvoice)
        })
      });

      const result = await schemeTrackingService.getInvoiceSchemes('invoice123');

      expect(result.invoiceId).toBe('invoice123');
      expect(result.totalScheme1).toBe(3);
      expect(result.totalScheme2).toBe(1);
      expect(result.schemes).toHaveLength(2);
    });

    test('should filter out items without schemes', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'INV001',
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            scheme1Quantity: 1,
            scheme2Quantity: 0
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            scheme1Quantity: 0,
            scheme2Quantity: 0
          }
        ],
        claimAccountId: null
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockInvoice)
        })
      });

      const result = await schemeTrackingService.getInvoiceSchemes('invoice123');

      expect(result.schemes).toHaveLength(1);
      expect(result.schemes[0].itemId).toBe('item1');
    });
  });

  describe('getCustomerSchemesSummary', () => {
    test('should return scheme summary for customer', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
              scheme1Quantity: 1,
              scheme2Quantity: 0
            }
          ]
        },
        {
          _id: 'inv2',
          invoiceDate: new Date('2024-01-20'),
          items: [
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
              scheme1Quantity: 2,
              scheme2Quantity: 1
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await schemeTrackingService.getCustomerSchemesSummary('customer123');

      expect(result.customerId).toBe('customer123');
      expect(result.totalInvoices).toBe(2);
      expect(result.totalScheme1).toBe(3);
      expect(result.totalScheme2).toBe(1);
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

      await schemeTrackingService.getCustomerSchemesSummary('customer123', dateRange);

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

  describe('validateSchemeQuantities', () => {
    test('should validate scheme quantities do not exceed regular quantity', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          scheme1Quantity: 1,
          scheme2Quantity: 0
        }
      ];

      const result = schemeTrackingService.validateSchemeQuantities(items);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject when scheme quantities exceed regular quantity', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          scheme1Quantity: 10,
          scheme2Quantity: 5 // Total 15 > 12
        }
      ];

      const result = schemeTrackingService.validateSchemeQuantities(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('exceeds regular quantity');
    });

    test('should reject negative scheme quantities', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 12,
          scheme1Quantity: -1,
          scheme2Quantity: 0
        }
      ];

      const result = schemeTrackingService.validateSchemeQuantities(items);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cannot be negative');
    });
  });

  describe('separateSchemeItems', () => {
    test('should separate scheme items from regular items', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 13, // 12 regular + 1 scheme
          scheme1Quantity: 1,
          scheme2Quantity: 0
        },
        {
          itemId: 'item2',
          quantity: 10,
          scheme1Quantity: 0,
          scheme2Quantity: 0
        }
      ];

      const result = schemeTrackingService.separateSchemeItems(items);

      expect(result.regularItems).toHaveLength(2);
      expect(result.schemeItems).toHaveLength(1);
      expect(result.regularItems[0].quantity).toBe(12); // 13 - 1 scheme
      expect(result.regularItems[1].quantity).toBe(10);
      expect(result.totalSchemeQuantity).toBe(1);
    });

    test('should handle items with both scheme1 and scheme2', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 15, // 12 regular + 2 scheme1 + 1 scheme2
          scheme1Quantity: 2,
          scheme2Quantity: 1
        }
      ];

      const result = schemeTrackingService.separateSchemeItems(items);

      expect(result.regularItems[0].quantity).toBe(12);
      expect(result.schemeItems[0].scheme1Quantity).toBe(2);
      expect(result.schemeItems[0].scheme2Quantity).toBe(1);
      expect(result.totalSchemeQuantity).toBe(3);
    });

    test('should handle items with only schemes (no regular)', () => {
      const items = [
        {
          itemId: 'item1',
          quantity: 2,
          scheme1Quantity: 1,
          scheme2Quantity: 1
        }
      ];

      const result = schemeTrackingService.separateSchemeItems(items);

      expect(result.regularItems).toHaveLength(0);
      expect(result.schemeItems).toHaveLength(1);
      expect(result.totalRegularQuantity).toBe(0);
      expect(result.totalSchemeQuantity).toBe(2);
    });
  });

  describe('linkSchemeToClaimAccount', () => {
    test('should link scheme to claim account', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        isActive: true
      };

      const mockInvoice = {
        _id: 'invoice123',
        claimAccountId: 'account123'
      };

      Account.findById.mockResolvedValue(mockAccount);
      Invoice.findByIdAndUpdate.mockResolvedValue(mockInvoice);

      const result = await schemeTrackingService.linkSchemeToClaimAccount(
        'invoice123',
        'account123'
      );

      expect(result.claimAccountId).toBe('account123');
      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        'invoice123',
        { claimAccountId: 'account123' },
        { new: true }
      );
    });

    test('should validate claim account before linking', async () => {
      Account.findById.mockResolvedValue(null);

      await expect(
        schemeTrackingService.linkSchemeToClaimAccount('invoice123', 'nonexistent')
      ).rejects.toThrow('Claim account not found');
    });
  });

  describe('getSupplierSchemesSummary', () => {
    test('should return scheme summary for supplier', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
              scheme1Quantity: 2,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await schemeTrackingService.getSupplierSchemesSummary('supplier123');

      expect(result.supplierId).toBe('supplier123');
      expect(result.totalScheme1).toBe(2);
      expect(result.itemBreakdown).toHaveLength(1);
    });
  });
});
