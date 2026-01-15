const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Item');

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSalesReport', () => {
    it('should generate sales report with valid parameters', async () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'date',
      };

      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceDate: new Date('2024-01-15'),
          customerId: { _id: 'cust1', code: 'CUST001', name: 'Customer 1' },
          items: [{ itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' }, quantity: 10, lineTotal: 1000 }],
          totals: { grandTotal: 1000, totalDiscount: 0, totalTax: 0 },
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices),
      });

      const report = await reportService.generateSalesReport(params);

      expect(report.reportType).toBe('sales');
      expect(report.summary.totalInvoices).toBe(1);
      expect(report.summary.totalAmount).toBe(1000);
    });

    it('should throw error without date range', async () => {
      await expect(reportService.generateSalesReport({})).rejects.toThrow(
        'Start date and end date are required'
      );
    });
  });

  describe('generatePurchaseReport', () => {
    it('should generate purchase report with valid parameters', async () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'date',
      };

      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'supp1', code: 'SUPP001', name: 'Supplier 1' },
          items: [{ itemId: { _id: 'item1', code: 'ITEM001', name: 'Item 1' }, quantity: 10, lineTotal: 1000 }],
          totals: { grandTotal: 1000, totalDiscount: 0, totalTax: 0 },
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockInvoices),
      });

      const report = await reportService.generatePurchaseReport(params);

      expect(report.reportType).toBe('purchase');
      expect(report.summary.totalInvoices).toBe(1);
      expect(report.summary.totalAmount).toBe(1000);
    });
  });

  describe('generateInventoryReport', () => {
    it('should generate inventory report', async () => {
      const mockItems = [
        {
          _id: 'item1',
          code: 'ITEM001',
          name: 'Item 1',
          category: 'Category A',
          stock: { currentStock: 100, minStock: 10 },
          pricing: { costPrice: 50, salePrice: 75 },
        },
        {
          _id: 'item2',
          code: 'ITEM002',
          name: 'Item 2',
          category: 'Category A',
          stock: { currentStock: 5, minStock: 10 },
          pricing: { costPrice: 30, salePrice: 45 },
        },
      ];

      Item.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockItems),
      });

      const report = await reportService.generateInventoryReport({});

      expect(report.reportType).toBe('inventory');
      expect(report.summary.totalItems).toBe(2);
      expect(report.summary.lowStockItems).toBe(1);
    });

    it('should filter low stock items', async () => {
      const mockItems = [
        {
          _id: 'item1',
          code: 'ITEM001',
          name: 'Item 1',
          category: 'Category A',
          stock: { currentStock: 5, minStock: 10 },
          pricing: { costPrice: 50, salePrice: 75 },
        },
      ];

      Item.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockItems),
      });

      const report = await reportService.generateInventoryReport({ lowStockOnly: true });

      expect(report.items.length).toBe(1);
    });
  });
});
