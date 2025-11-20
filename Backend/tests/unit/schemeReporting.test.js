const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');

// Mock Invoice model
jest.mock('../../src/models/Invoice');

describe('ReportService - Scheme Reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSchemeAnalysis', () => {
    test('should generate scheme analysis report', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 13,
              unitPrice: 100,
              scheme1Quantity: 1,
              scheme2Quantity: 0
            }
          ]
        },
        {
          _id: 'inv2',
          type: 'sales',
          invoiceDate: new Date('2024-01-20'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 27,
              unitPrice: 100,
              scheme1Quantity: 2,
              scheme2Quantity: 1
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.reportType).toBe('scheme_analysis');
      expect(result.summary.totalScheme1Quantity).toBe(3);
      expect(result.summary.totalScheme2Quantity).toBe(1);
      expect(result.summary.totalSchemeQuantity).toBe(4);
    });

    test('should calculate scheme values correctly', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 13,
              unitPrice: 100,
              scheme1Quantity: 1,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.summary.totalScheme1Value).toBe(100); // 1 * 100
      expect(result.summary.totalScheme2Value).toBe(0);
      expect(result.summary.totalSchemeValue).toBe(100);
    });

    test('should separate scheme1 and scheme2', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 15,
              unitPrice: 100,
              scheme1Quantity: 2,
              scheme2Quantity: 1
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.schemeByType.scheme1.totalQuantity).toBe(2);
      expect(result.schemeByType.scheme2.totalQuantity).toBe(1);
      expect(result.schemeByType.scheme1.totalValue).toBe(200);
      expect(result.schemeByType.scheme2.totalValue).toBe(100);
    });

    test('should aggregate by item', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 13,
              unitPrice: 100,
              scheme1Quantity: 1,
              scheme2Quantity: 0
            },
            {
              itemId: { _id: 'item2', code: 'I002', name: 'Item 2' },
              quantity: 25,
              unitPrice: 200,
              scheme1Quantity: 2,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.schemeByItem).toHaveLength(2);
      expect(result.schemeByItem[0].itemCode).toBe('I002'); // Sorted by value descending
      expect(result.schemeByItem[0].totalValue).toBe(400); // 2 * 200
      expect(result.schemeByItem[1].itemCode).toBe('I001');
      expect(result.schemeByItem[1].totalValue).toBe(100); // 1 * 100
    });

    test('should count invoices with schemes', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 13,
              unitPrice: 100,
              scheme1Quantity: 1,
              scheme2Quantity: 0
            }
          ]
        },
        {
          _id: 'inv2',
          type: 'sales',
          invoiceDate: new Date('2024-01-20'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 25,
              unitPrice: 100,
              scheme1Quantity: 0,
              scheme2Quantity: 2
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.schemeByType.scheme1.invoiceCount).toBe(1);
      expect(result.schemeByType.scheme2.invoiceCount).toBe(1);
    });

    test('should filter by customer', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        customerId: 'customer123',
        invoiceType: 'sales'
      };

      await reportService.getSchemeAnalysis(params);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer123'
        })
      );
    });

    test('should filter by supplier for purchase invoices', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        supplierId: 'supplier123',
        invoiceType: 'purchase'
      };

      await reportService.getSchemeAnalysis(params);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'purchase',
          supplierId: 'supplier123'
        })
      );
    });

    test('should exclude cancelled invoices', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([])
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      await reportService.getSchemeAnalysis(params);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $ne: 'cancelled' }
        })
      );
    });

    test('should handle invoices with no schemes', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              scheme1Quantity: 0,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.summary.totalSchemeQuantity).toBe(0);
      expect(result.summary.totalSchemeValue).toBe(0);
      expect(result.schemeByItem).toHaveLength(0);
    });

    test('should require start and end dates', async () => {
      const params = {
        invoiceType: 'sales'
      };

      await expect(
        reportService.getSchemeAnalysis(params)
      ).rejects.toThrow('Start date and end date are required');
    });

    test('should handle multiple items in single invoice', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 13,
              unitPrice: 100,
              scheme1Quantity: 1,
              scheme2Quantity: 0
            },
            {
              itemId: { _id: 'item2', code: 'I002', name: 'Item 2' },
              quantity: 25,
              unitPrice: 200,
              scheme1Quantity: 2,
              scheme2Quantity: 0
            },
            {
              itemId: { _id: 'item3', code: 'I003', name: 'Item 3' },
              quantity: 15,
              unitPrice: 150,
              scheme1Quantity: 0,
              scheme2Quantity: 1
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.summary.totalScheme1Quantity).toBe(3);
      expect(result.summary.totalScheme2Quantity).toBe(1);
      expect(result.schemeByItem).toHaveLength(3);
    });

    test('should round values to 2 decimal places', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'sales',
          invoiceDate: new Date('2024-01-15'),
          items: [
            {
              itemId: { _id: 'item1', code: 'I001', name: 'Item 1' },
              quantity: 13,
              unitPrice: 33.33,
              scheme1Quantity: 1,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices)
      });

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeAnalysis(params);

      expect(result.summary.totalScheme1Value).toBe(33.33);
      expect(result.summary.totalSchemeValue).toBe(33.33);
    });
  });
});
