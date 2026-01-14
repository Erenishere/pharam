const exportService = require('../../src/services/exportService');
const analyticsService = require('../../src/services/analyticsService');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const cashBookService = require('../../src/services/cashBookService');
const ledgerService = require('../../src/services/ledgerService');

jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Item');
jest.mock('../../src/services/cashBookService');
jest.mock('../../src/services/ledgerService');

describe('Export and Analytics Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Export Service', () => {
    describe('exportToCSV', () => {
      it('should export data to CSV format', () => {
        const data = [
          { name: 'Item 1', price: 100, quantity: 10 },
          { name: 'Item 2', price: 200, quantity: 5 },
        ];

        const columns = [
          { key: 'name', label: 'Name' },
          { key: 'price', label: 'Price' },
          { key: 'quantity', label: 'Quantity' },
        ];

        const csv = exportService.exportToCSV(data, columns);

        expect(csv).toContain('Name,Price,Quantity');
        expect(csv).toContain('Item 1,100,10');
        expect(csv).toContain('Item 2,200,5');
      });

      it('should throw error with no data', () => {
        expect(() => exportService.exportToCSV([], [])).toThrow('No data to export');
      });
    });

    describe('exportToExcel', () => {
      it('should export data to Excel format', () => {
        const data = [{ name: 'Item 1', price: 100 }];
        const columns = [
          { key: 'name', label: 'Name' },
          { key: 'price', label: 'Price' },
        ];

        const excel = exportService.exportToExcel(data, columns, 'TestSheet');

        expect(excel.sheetName).toBe('TestSheet');
        expect(excel.headers).toEqual(['Name', 'Price']);
        expect(excel.data).toHaveLength(1);
      });
    });

    describe('exportToPDF', () => {
      it('should export data to PDF format', () => {
        const reportData = { reportType: 'sales', summary: { total: 10000 } };
        const pdf = exportService.exportToPDF(reportData, { title: 'Sales Report' });

        expect(pdf.format).toBe('pdf');
        expect(pdf.title).toBe('Sales Report');
        expect(pdf.content).toEqual(reportData);
      });
    });
  });

  describe('Analytics Service', () => {
    describe('getDashboardSummary', () => {
      it('should get dashboard summary', async () => {
        Invoice.aggregate = jest.fn()
          .mockResolvedValueOnce([{ total: 10000, count: 5 }])
          .mockResolvedValueOnce([{ total: 50000, count: 25 }])
          .mockResolvedValueOnce([{ total: 100000, count: 50 }])
          .mockResolvedValueOnce([{ total: 5000, count: 3 }])
          .mockResolvedValueOnce([{ total: 30000, count: 15 }]);

        cashBookService.getCashBookBalance = jest.fn().mockResolvedValue({
          balance: 50000,
          totalReceipts: 100000,
          totalPayments: 50000,
        });

        ledgerService.getCustomerReceivablesAging = jest.fn().mockResolvedValue({
          summary: { total: 30000, days1to30: 5000, days31to60: 3000, days61to90: 2000, over90: 1000 },
        });

        ledgerService.getSupplierPayables = jest.fn().mockResolvedValue({
          summary: { total: 20000, overdue: 5000 },
        });

        Item.countDocuments = jest.fn().mockResolvedValue(5);

        const dashboard = await analyticsService.getDashboardSummary();

        expect(dashboard.sales).toBeDefined();
        expect(dashboard.purchases).toBeDefined();
        expect(dashboard.cash).toBeDefined();
        expect(dashboard.accounts).toBeDefined();
        expect(dashboard.inventory).toBeDefined();
      });
    });

    describe('getSalesTrends', () => {
      it('should get sales trends', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const mockInvoices = [
          {
            invoiceDate: new Date('2024-01-15'),
            totals: { grandTotal: 10000 },
          },
        ];

        Invoice.find = jest.fn().mockResolvedValue(mockInvoices);

        const trends = await analyticsService.getSalesTrends(startDate, endDate, 'daily');

        expect(trends.interval).toBe('daily');
        expect(trends.trends).toBeDefined();
        expect(trends.summary.totalSales).toBe(10000);
      });
    });

    describe('getTopCustomers', () => {
      it('should get top customers', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const mockResult = [
          { _id: 'cust1', totalAmount: 50000, invoiceCount: 10 },
          { _id: 'cust2', totalAmount: 30000, invoiceCount: 5 },
        ];

        Invoice.aggregate = jest.fn().mockResolvedValue(mockResult);
        Invoice.populate = jest.fn().mockResolvedValue(mockResult);

        const topCustomers = await analyticsService.getTopCustomers(startDate, endDate, 10);

        expect(topCustomers).toHaveLength(2);
        expect(topCustomers[0].totalAmount).toBe(50000);
      });
    });

    describe('getTopSellingItems', () => {
      it('should get top selling items', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const mockInvoices = [
          {
            items: [
              { itemId: 'item1', quantity: 10, lineTotal: 1000 },
              { itemId: 'item2', quantity: 5, lineTotal: 500 },
            ],
          },
        ];

        const mockItems = [
          { _id: 'item1', code: 'ITEM001', name: 'Item 1' },
          { _id: 'item2', code: 'ITEM002', name: 'Item 2' },
        ];

        Invoice.find = jest.fn().mockResolvedValue(mockInvoices);
        Item.find = jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockItems),
        });

        const topItems = await analyticsService.getTopSellingItems(startDate, endDate, 10);

        expect(topItems).toBeDefined();
        expect(Array.isArray(topItems)).toBe(true);
      });
    });
  });
});
