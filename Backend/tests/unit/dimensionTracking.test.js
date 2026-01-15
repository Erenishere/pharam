const dimensionTrackingService = require('../../src/services/dimensionTrackingService');
const Invoice = require('../../src/models/Invoice');

// Mock Invoice model
jest.mock('../../src/models/Invoice');

describe('DimensionTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addDimensionToInvoice', () => {
    test('should add dimension to invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        dimension: null,
        save: jest.fn().mockResolvedValue(true)
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const result = await dimensionTrackingService.addDimensionToInvoice('invoice123', 'PROJECT-001');

      expect(mockInvoice.dimension).toBe('PROJECT-001');
      expect(mockInvoice.save).toHaveBeenCalled();
    });

    test('should validate dimension format', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        save: jest.fn()
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      await expect(
        dimensionTrackingService.addDimensionToInvoice('invoice123', 'INVALID@DIMENSION')
      ).rejects.toThrow('alphanumeric');
    });

    test('should trim whitespace from dimension', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        dimension: null,
        save: jest.fn().mockResolvedValue(true)
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      await dimensionTrackingService.addDimensionToInvoice('invoice123', '  PROJECT-001  ');

      expect(mockInvoice.dimension).toBe('PROJECT-001');
    });

    test('should throw error if invoice not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      await expect(
        dimensionTrackingService.addDimensionToInvoice('nonexistent', 'PROJECT-001')
      ).rejects.toThrow('Invoice not found');
    });

    test('should throw error if dimension is empty', async () => {
      const mockInvoice = { _id: 'invoice123' };
      Invoice.findById.mockResolvedValue(mockInvoice);

      await expect(
        dimensionTrackingService.addDimensionToInvoice('invoice123', '')
      ).rejects.toThrow('Dimension value is required');
    });
  });

  describe('addDimensionToItems', () => {
    test('should add dimension to invoice items', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', dimension: null },
          { itemId: 'item2', dimension: null }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const itemDimensions = [
        { itemId: 'item1', dimension: 'CC-001' },
        { itemId: 'item2', dimension: 'CC-002' }
      ];

      const result = await dimensionTrackingService.addDimensionToItems('invoice123', itemDimensions);

      expect(mockInvoice.items[0].dimension).toBe('CC-001');
      expect(mockInvoice.items[1].dimension).toBe('CC-002');
      expect(mockInvoice.save).toHaveBeenCalled();
    });

    test('should throw error if item not found', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        items: [
          { itemId: 'item1', dimension: null }
        ]
      };

      Invoice.findById.mockResolvedValue(mockInvoice);

      const itemDimensions = [
        { itemId: 'nonexistent', dimension: 'CC-001' }
      ];

      await expect(
        dimensionTrackingService.addDimensionToItems('invoice123', itemDimensions)
      ).rejects.toThrow('not found in invoice');
    });
  });

  describe('getInvoicesByDimension', () => {
    test('should get invoices by dimension', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'INV001',
          dimension: 'PROJECT-001',
          invoiceDate: new Date('2024-01-15')
        },
        {
          _id: 'inv2',
          invoiceNumber: 'INV002',
          dimension: 'PROJECT-001',
          invoiceDate: new Date('2024-01-20')
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await dimensionTrackingService.getInvoicesByDimension('PROJECT-001');

      expect(result).toHaveLength(2);
      expect(result[0].dimension).toBe('PROJECT-001');
    });

    test('should filter by type', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      await dimensionTrackingService.getInvoicesByDimension('PROJECT-001', { type: 'purchase' });

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'purchase'
        })
      );
    });

    test('should filter by date range', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      await dimensionTrackingService.getInvoicesByDimension('PROJECT-001', {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

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

  describe('getDimensionSummary', () => {
    test('should return dimension summary', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          dimension: 'PROJECT-001',
          totals: { grandTotal: 1000 }
        },
        {
          _id: 'inv2',
          dimension: 'PROJECT-001',
          totals: { grandTotal: 2000 }
        },
        {
          _id: 'inv3',
          dimension: 'PROJECT-002',
          totals: { grandTotal: 1500 }
        }
      ];

      Invoice.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const result = await dimensionTrackingService.getDimensionSummary();

      expect(result.summary.totalDimensions).toBe(2);
      expect(result.summary.totalInvoices).toBe(3);
      expect(result.summary.totalAmount).toBe(4500);
      expect(result.dimensions).toHaveLength(2);
    });

    test('should sort dimensions by total amount descending', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          dimension: 'PROJECT-001',
          totals: { grandTotal: 1000 }
        },
        {
          _id: 'inv2',
          dimension: 'PROJECT-002',
          totals: { grandTotal: 5000 }
        }
      ];

      Invoice.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const result = await dimensionTrackingService.getDimensionSummary();

      expect(result.dimensions[0].dimension).toBe('PROJECT-002');
      expect(result.dimensions[0].totalAmount).toBe(5000);
    });
  });

  describe('validateDimension', () => {
    test('should validate valid dimension', () => {
      const result = dimensionTrackingService.validateDimension('PROJECT-001');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid characters', () => {
      const result = dimensionTrackingService.validateDimension('PROJECT@001');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('alphanumeric');
    });

    test('should reject empty dimension', () => {
      const result = dimensionTrackingService.validateDimension('');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('empty');
    });

    test('should reject dimension exceeding 100 characters', () => {
      const longDimension = 'A'.repeat(101);
      const result = dimensionTrackingService.validateDimension(longDimension);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceed 100');
    });

    test('should accept hyphens and underscores', () => {
      const result = dimensionTrackingService.validateDimension('PROJECT-001_CC');

      expect(result.valid).toBe(true);
    });
  });

  describe('getAvailableDimensions', () => {
    test('should return list of available dimensions', async () => {
      Invoice.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['PROJECT-001', 'PROJECT-002', 'CC-001'])
      });

      const result = await dimensionTrackingService.getAvailableDimensions();

      expect(result).toHaveLength(3);
      expect(result).toEqual(['CC-001', 'PROJECT-001', 'PROJECT-002']); // Sorted
    });

    test('should filter by type', async () => {
      Invoice.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['PROJECT-001'])
      });

      await dimensionTrackingService.getAvailableDimensions({ type: 'purchase' });

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'purchase'
        })
      );
    });
  });

  describe('updateDimensionForInvoices', () => {
    test('should update dimension for multiple invoices', async () => {
      Invoice.updateMany.mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2
      });

      const result = await dimensionTrackingService.updateDimensionForInvoices(
        ['inv1', 'inv2'],
        'PROJECT-001'
      );

      expect(result.modifiedCount).toBe(2);
      expect(result.matchedCount).toBe(2);
    });

    test('should validate dimension before updating', async () => {
      await expect(
        dimensionTrackingService.updateDimensionForInvoices(['inv1'], 'INVALID@')
      ).rejects.toThrow('Invalid dimension');
    });

    test('should require invoice IDs', async () => {
      await expect(
        dimensionTrackingService.updateDimensionForInvoices([], 'PROJECT-001')
      ).rejects.toThrow('Invoice IDs are required');
    });
  });

  describe('getItemDimensionSummary', () => {
    test('should return item dimension summary', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          items: [
            {
              itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
              dimension: 'CC-001',
              quantity: 10,
              lineTotal: 1000
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoices)
      });

      const result = await dimensionTrackingService.getItemDimensionSummary();

      expect(result.summary.totalDimensions).toBe(1);
      expect(result.summary.totalItems).toBe(1);
      expect(result.dimensions).toHaveLength(1);
    });
  });
});
