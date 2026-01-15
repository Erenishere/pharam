const analyticsService = require('../../src/services/analyticsService');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const cashBookService = require('../../src/services/cashBookService');
const ledgerService = require('../../src/services/ledgerService');

jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Item');
jest.mock('../../src/services/cashBookService');
jest.mock('../../src/services/ledgerService');

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should return comprehensive dashboard summary', async () => {
      // Mock data
      Invoice.aggregate = jest.fn()
        .mockResolvedValueOnce([{ total: 5000, count: 10 }]) // today sales
        .mockResolvedValueOnce([{ total: 50000, count: 100 }]) // month sales
        .mockResolvedValueOnce([{ total: 200000, count: 500 }]) // year sales
        .mockResolvedValueOnce([{ total: 3000, count: 5 }]) // today purchases
        .mockResolvedValueOnce([{ total: 30000, count: 50 }]); // month purchases

      Item.countDocuments = jest.fn().mockResolvedValue(15);

      cashBookService.getCashBookBalance = jest.fn().mockResolvedValue({
        balance: 100000,
        totalReceipts: 150000,
        totalPayments: 50000,
      });

      ledgerService.getCustomerReceivablesAging = jest.fn().mockResolvedValue({
        summary: {
          total: 75000,
          current: 50000,
          days1to30: 15000,
          days31to60: 5000,
          days61to90: 3000,
          over90: 2000,
        },
      });

      ledgerService.getSupplierPayables = jest.fn().mockResolvedValue({
        summary: {
          total: 40000,
          overdue: 10000,
        },
      });

      const result = await analyticsService.getDashboardSummary();

      expect(result).toHaveProperty('sales');
      expect(result.sales.today).toEqual({ total: 5000, count: 10 });
      expect(result.sales.thisMonth).toEqual({ total: 50000, count: 100 });
      expect(result.sales.thisYear).toEqual({ total: 200000, count: 500 });

      expect(result).toHaveProperty('purchases');
      expect(result.purchases.today).toEqual({ total: 3000, count: 5 });

      expect(result).toHaveProperty('cash');
      expect(result.cash.balance).toBe(100000);

      expect(result).toHaveProperty('accounts');
      expect(result.accounts.receivables).toBe(75000);
      expect(result.accounts.overdueReceivables).toBe(25000);

      expect(result).toHaveProperty('inventory');
      expect(result.inventory.lowStockItems).toBe(15);

      expect(result).toHaveProperty('generatedAt');
    });
  });

  describe('getSalesTrends', () => {
    it('should return daily sales trends', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const mockInvoices = [
        {
          invoiceDate: new Date('2024-01-01'),
          totals: { grandTotal: 1000 },
        },
        {
          invoiceDate: new Date('2024-01-01'),
          totals: { grandTotal: 1500 },
        },
        {
          invoiceDate: new Date('2024-01-02'),
          totals: { grandTotal: 2000 },
        },
      ];

      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await analyticsService.getSalesTrends(startDate, endDate, 'daily');

      expect(result.interval).toBe('daily');
      expect(result.period).toEqual({ startDate, endDate });
      expect(result.trends).toHaveLength(2);
      expect(result.trends[0]).toMatchObject({
        period: '2024-01-01',
        totalAmount: 2500,
        invoiceCount: 2,
      });
      expect(result.summary.totalSales).toBe(4500);
      expect(result.summary.invoiceCount).toBe(3);
    });

    it('should return weekly sales trends', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-14');

      const mockInvoices = [
        {
          invoiceDate: new Date('2024-01-02'),
          totals: { grandTotal: 1000 },
        },
        {
          invoiceDate: new Date('2024-01-09'),
          totals: { grandTotal: 2000 },
        },
      ];

      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await analyticsService.getSalesTrends(startDate, endDate, 'weekly');

      expect(result.interval).toBe('weekly');
      expect(result.trends.length).toBeGreaterThan(0);
    });

    it('should return monthly sales trends', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');

      const mockInvoices = [
        {
          invoiceDate: new Date('2024-01-15'),
          totals: { grandTotal: 5000 },
        },
        {
          invoiceDate: new Date('2024-02-15'),
          totals: { grandTotal: 6000 },
        },
      ];

      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

      const result = await analyticsService.getSalesTrends(startDate, endDate, 'monthly');

      expect(result.interval).toBe('monthly');
      expect(result.trends).toHaveLength(2);
      expect(result.trends[0].period).toBe('2024-01');
      expect(result.trends[1].period).toBe('2024-02');
    });

    it('should throw error when dates are missing', async () => {
      await expect(analyticsService.getSalesTrends(null, new Date())).rejects.toThrow(
        'Start date and end date are required'
      );
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers by revenue', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockAggregateResult = [
        {
          _id: { _id: 'customer1', code: 'C001', name: 'Customer 1' },
          totalAmount: 50000,
          invoiceCount: 25,
        },
        {
          _id: { _id: 'customer2', code: 'C002', name: 'Customer 2' },
          totalAmount: 40000,
          invoiceCount: 20,
        },
      ];

      Invoice.aggregate = jest.fn().mockResolvedValue(mockAggregateResult);
      Invoice.populate = jest.fn().mockResolvedValue(mockAggregateResult);

      const result = await analyticsService.getTopCustomers(startDate, endDate, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        customer: expect.objectContaining({ name: 'Customer 1' }),
        totalAmount: 50000,
        invoiceCount: 25,
      });
    });

    it('should limit results to specified number', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      Invoice.aggregate = jest.fn().mockResolvedValue([]);
      Invoice.populate = jest.fn().mockResolvedValue([]);

      await analyticsService.getTopCustomers(startDate, endDate, 5);

      expect(Invoice.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $limit: 5 }),
        ])
      );
    });
  });

  describe('getTopSellingItems', () => {
    it('should return top selling items by revenue', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockInvoices = [
        {
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              lineTotal: 5000,
            },
            {
              itemId: 'item2',
              quantity: 5,
              lineTotal: 3000,
            },
          ],
        },
        {
          items: [
            {
              itemId: 'item1',
              quantity: 15,
              lineTotal: 7500,
            },
          ],
        },
      ];

      const mockItems = [
        { _id: 'item1', code: 'ITEM-001', name: 'Item 1', category: 'Electronics' },
        { _id: 'item2', code: 'ITEM-002', name: 'Item 2', category: 'Furniture' },
      ];

      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);
      Item.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockItems),
      });

      const result = await analyticsService.getTopSellingItems(startDate, endDate, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        item: expect.objectContaining({ name: 'Item 1' }),
        quantity: 25,
        revenue: 12500,
        invoiceCount: 2,
      });
    });
  });

  describe('getRevenueByCategory', () => {
    it('should return revenue breakdown by category', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockInvoices = [
        {
          items: [
            {
              itemId: { category: 'Electronics' },
              quantity: 10,
              lineTotal: 5000,
            },
            {
              itemId: { category: 'Furniture' },
              quantity: 5,
              lineTotal: 3000,
            },
          ],
        },
        {
          items: [
            {
              itemId: { category: 'Electronics' },
              quantity: 8,
              lineTotal: 4000,
            },
          ],
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await analyticsService.getRevenueByCategory(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        category: 'Electronics',
        revenue: 9000,
        quantity: 18,
      });
      expect(result[1]).toMatchObject({
        category: 'Furniture',
        revenue: 3000,
        quantity: 5,
      });
    });

    it('should handle items without category', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockInvoices = [
        {
          items: [
            {
              itemId: null,
              quantity: 5,
              lineTotal: 1000,
            },
          ],
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoices),
      });

      const result = await analyticsService.getRevenueByCategory(startDate, endDate);

      expect(result[0].category).toBe('Uncategorized');
    });
  });

  describe('getProfitMargins', () => {
    it('should calculate profit margins correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockSalesInvoices = [
        { totals: { grandTotal: 10000 } },
        { totals: { grandTotal: 15000 } },
      ];

      const mockPurchaseInvoices = [
        { totals: { grandTotal: 6000 } },
        { totals: { grandTotal: 9000 } },
      ];

      Invoice.find = jest.fn()
        .mockResolvedValueOnce(mockSalesInvoices)
        .mockResolvedValueOnce(mockPurchaseInvoices);

      const result = await analyticsService.getProfitMargins(startDate, endDate);

      expect(result.totalRevenue).toBe(25000);
      expect(result.totalCost).toBe(15000);
      expect(result.grossProfit).toBe(10000);
      expect(result.profitMargin).toBe(40);
      expect(result.salesCount).toBe(2);
      expect(result.purchaseCount).toBe(2);
    });

    it('should handle zero revenue', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      Invoice.find = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await analyticsService.getProfitMargins(startDate, endDate);

      expect(result.totalRevenue).toBe(0);
      expect(result.profitMargin).toBe(0);
    });
  });

  describe('getPaymentCollectionEfficiency', () => {
    it('should calculate collection efficiency', async () => {
      const asOfDate = new Date('2024-12-31');

      ledgerService.getCustomerReceivablesAging = jest.fn().mockResolvedValue({
        summary: {
          total: 100000,
          current: 70000,
          days1to30: 15000,
          days31to60: 8000,
          days61to90: 4000,
          over90: 3000,
        },
      });

      const result = await analyticsService.getPaymentCollectionEfficiency(asOfDate);

      expect(result.totalReceivables).toBe(100000);
      expect(result.currentReceivables).toBe(70000);
      expect(result.overdueReceivables).toBe(30000);
      expect(result.collectionEfficiency).toBe(70);
      expect(result.agingBreakdown).toBeDefined();
    });

    it('should handle zero receivables', async () => {
      ledgerService.getCustomerReceivablesAging = jest.fn().mockResolvedValue({
        summary: {
          total: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
        },
      });

      const result = await analyticsService.getPaymentCollectionEfficiency();

      expect(result.collectionEfficiency).toBe(100);
    });
  });

  describe('getInventoryTurnover', () => {
    it('should calculate inventory turnover ratio', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockInvoices = [
        {
          items: [
            { itemId: 'item1', quantity: 100 },
            { itemId: 'item2', quantity: 50 },
          ],
        },
      ];

      const mockItems = [
        {
          _id: 'item1',
          pricing: { costPrice: 50 },
          stock: { currentStock: 200 },
        },
        {
          _id: 'item2',
          pricing: { costPrice: 100 },
          stock: { currentStock: 100 },
        },
      ];

      Invoice.find = jest.fn().mockResolvedValue(mockInvoices);
      Item.find = jest.fn().mockResolvedValue(mockItems);

      const result = await analyticsService.getInventoryTurnover(startDate, endDate);

      expect(result.costOfGoodsSold).toBe(10000); // 100*50 + 50*100
      expect(result.averageInventoryValue).toBe(20000); // 200*50 + 100*100
      expect(result.turnoverRatio).toBeGreaterThan(0);
      expect(result.daysInInventory).toBeGreaterThan(0);
    });

    it('should handle zero inventory value', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      Invoice.find = jest.fn().mockResolvedValue([]);
      Item.find = jest.fn().mockResolvedValue([]);

      const result = await analyticsService.getInventoryTurnover(startDate, endDate);

      expect(result.turnoverRatio).toBe(0);
      expect(result.daysInInventory).toBe(0);
    });
  });

  describe('getRealTimeKPIs', () => {
    it('should return comprehensive real-time KPIs', async () => {
      // Mock all dependencies
      Invoice.aggregate = jest.fn().mockResolvedValue([{ total: 1000, count: 10 }]);
      Invoice.find = jest.fn().mockResolvedValue([]);
      Item.countDocuments = jest.fn().mockResolvedValue(5);
      Item.find = jest.fn().mockResolvedValue([]);

      cashBookService.getCashBookBalance = jest.fn().mockResolvedValue({
        balance: 50000,
        totalReceipts: 100000,
        totalPayments: 50000,
      });

      ledgerService.getCustomerReceivablesAging = jest.fn().mockResolvedValue({
        summary: {
          total: 75000,
          current: 50000,
          days1to30: 15000,
          days31to60: 5000,
          days61to90: 3000,
          over90: 2000,
        },
      });

      ledgerService.getSupplierPayables = jest.fn().mockResolvedValue({
        summary: {
          total: 40000,
          overdue: 10000,
        },
      });

      const result = await analyticsService.getRealTimeKPIs();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('sales');
      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('cash');
      expect(result).toHaveProperty('accounts');
      expect(result).toHaveProperty('inventory');
      expect(result).toHaveProperty('profitability');
      expect(result).toHaveProperty('efficiency');
      expect(result.profitability).toHaveProperty('grossProfit');
      expect(result.profitability).toHaveProperty('profitMargin');
      expect(result.efficiency).toHaveProperty('collectionEfficiency');
      expect(result.efficiency).toHaveProperty('inventoryTurnover');
    });
  });
});
