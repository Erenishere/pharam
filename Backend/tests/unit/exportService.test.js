const exportService = require('../../src/services/exportService');

describe('ExportService', () => {
  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const data = [
        { name: 'Item 1', price: 100, quantity: 5 },
        { name: 'Item 2', price: 200, quantity: 3 },
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
        { key: 'quantity', label: 'Quantity' },
      ];

      const csv = exportService.exportToCSV(data, columns);

      expect(csv).toContain('Name,Price,Quantity');
      expect(csv).toContain('Item 1,100,5');
      expect(csv).toContain('Item 2,200,3');
    });

    it('should handle nested properties', () => {
      const data = [
        { item: { name: 'Product 1' }, pricing: { amount: 150 } },
      ];

      const columns = [
        { key: 'item.name', label: 'Item Name' },
        { key: 'pricing.amount', label: 'Amount' },
      ];

      const csv = exportService.exportToCSV(data, columns);

      expect(csv).toContain('Item Name,Amount');
      expect(csv).toContain('Product 1,150');
    });

    it('should escape CSV special characters', () => {
      const data = [
        { name: 'Item, with comma', description: 'Has "quotes"' },
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ];

      const csv = exportService.exportToCSV(data, columns);

      expect(csv).toContain('"Item, with comma"');
      expect(csv).toContain('"Has ""quotes"""');
    });

    it('should throw error when no data provided', () => {
      const columns = [{ key: 'name', label: 'Name' }];

      expect(() => exportService.exportToCSV([], columns)).toThrow('No data to export');
      expect(() => exportService.exportToCSV(null, columns)).toThrow('No data to export');
    });

    it('should handle missing values', () => {
      const data = [
        { name: 'Item 1', price: null },
        { name: 'Item 2' },
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
      ];

      const csv = exportService.exportToCSV(data, columns);

      expect(csv).toContain('Item 1,');
      expect(csv).toContain('Item 2,');
    });
  });

  describe('exportToExcel', () => {
    it('should export data to Excel format', async () => {
      const data = [
        { name: 'Item 1', price: 100, quantity: 5 },
        { name: 'Item 2', price: 200, quantity: 3 },
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
        { key: 'quantity', label: 'Quantity' },
      ];

      const buffer = await exportService.exportToExcel(data, columns, 'Test Sheet');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle nested properties in Excel', async () => {
      const data = [
        { item: { name: 'Product 1' }, pricing: { amount: 150 } },
      ];

      const columns = [
        { key: 'item.name', label: 'Item Name' },
        { key: 'pricing.amount', label: 'Amount' },
      ];

      const buffer = await exportService.exportToExcel(data, columns);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should throw error when no data provided for Excel', async () => {
      const columns = [{ key: 'name', label: 'Name' }];

      await expect(exportService.exportToExcel([], columns)).rejects.toThrow('No data to export');
      await expect(exportService.exportToExcel(null, columns)).rejects.toThrow('No data to export');
    });
  });

  describe('exportToPDF', () => {
    it('should export data to PDF format', async () => {
      const reportData = {
        summary: {
          totalSales: 5000,
          totalPurchases: 3000,
          profit: 2000,
        },
        data: [
          { name: 'Item 1', amount: 100 },
          { name: 'Item 2', amount: 200 },
        ],
        columns: [
          { key: 'name', label: 'Name', width: 200 },
          { key: 'amount', label: 'Amount', width: 100 },
        ],
      };

      const buffer = await exportService.exportToPDF(reportData, {
        title: 'Sales Report',
        orientation: 'portrait',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should handle PDF without summary', async () => {
      const reportData = {
        data: [{ name: 'Item 1', amount: 100 }],
        columns: [
          { key: 'name', label: 'Name', width: 200 },
          { key: 'amount', label: 'Amount', width: 100 },
        ],
      };

      const buffer = await exportService.exportToPDF(reportData);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle landscape orientation', async () => {
      const reportData = {
        data: [{ name: 'Item 1' }],
        columns: [{ key: 'name', label: 'Name', width: 200 }],
      };

      const buffer = await exportService.exportToPDF(reportData, {
        orientation: 'landscape',
      });

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('formatReportForExport', () => {
    it('should format sales report for CSV export', async () => {
      const report = {
        reportType: 'sales',
        invoices: [
          {
            invoiceNumber: 'INV-001',
            invoiceDate: new Date('2024-01-01'),
            customerId: { name: 'Customer 1' },
            totals: { grandTotal: 1000 },
            status: 'paid',
          },
        ],
      };

      const result = await exportService.formatReportForExport(report, 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('Invoice Number');
      expect(result).toContain('INV-001');
    });

    it('should format purchase report for Excel export', async () => {
      const report = {
        reportType: 'purchase',
        invoices: [
          {
            invoiceNumber: 'PUR-001',
            invoiceDate: new Date('2024-01-01'),
            supplierId: { name: 'Supplier 1' },
            totals: { grandTotal: 2000 },
            status: 'confirmed',
          },
        ],
      };

      const result = await exportService.formatReportForExport(report, 'excel');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should format inventory report for PDF export', async () => {
      const report = {
        reportType: 'inventory',
        items: [
          {
            code: 'ITEM-001',
            name: 'Product 1',
            category: 'Electronics',
            stock: { currentStock: 50 },
            pricing: { salePrice: 100 },
          },
        ],
      };

      const result = await exportService.formatReportForExport(report, 'pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw error for unsupported format', async () => {
      const report = {
        reportType: 'sales',
        invoices: [],
      };

      await expect(exportService.formatReportForExport(report, 'xml')).rejects.toThrow(
        'Unsupported export format: xml'
      );
    });

    it('should throw error when report data is missing', async () => {
      await expect(exportService.formatReportForExport(null, 'csv')).rejects.toThrow(
        'Report data is required'
      );
    });
  });

  describe('_getColumnsForReportType', () => {
    it('should return correct columns for sales report', () => {
      const columns = exportService._getColumnsForReportType('sales');

      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'invoiceNumber' }),
          expect.objectContaining({ key: 'customerId.name' }),
        ])
      );
    });

    it('should return correct columns for purchase report', () => {
      const columns = exportService._getColumnsForReportType('purchase');

      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'invoiceNumber' }),
          expect.objectContaining({ key: 'supplierId.name' }),
        ])
      );
    });

    it('should return correct columns for inventory report', () => {
      const columns = exportService._getColumnsForReportType('inventory');

      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'code' }),
          expect.objectContaining({ key: 'name' }),
          expect.objectContaining({ key: 'stock.currentStock' }),
        ])
      );
    });

    it('should return default columns for unknown report type', () => {
      const columns = exportService._getColumnsForReportType('unknown');

      expect(columns).toEqual([{ key: 'data', label: 'Data' }]);
    });
  });

  describe('_flattenReportData', () => {
    it('should flatten invoice data', () => {
      const report = {
        invoices: [{ id: 1 }, { id: 2 }],
      };

      const result = exportService._flattenReportData(report);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should flatten item data', () => {
      const report = {
        items: [{ code: 'A' }, { code: 'B' }],
      };

      const result = exportService._flattenReportData(report);

      expect(result).toEqual([{ code: 'A' }, { code: 'B' }]);
    });

    it('should flatten profit/loss report', () => {
      const report = {
        reportType: 'profit_loss',
        revenue: { netSales: 10000 },
        costOfGoodsSold: { netPurchases: 6000 },
        grossProfit: { amount: 4000 },
        netProfit: { amount: 3000 },
      };

      const result = exportService._flattenReportData(report);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ description: 'Revenue', amount: 10000 }),
          expect.objectContaining({ description: 'Net Profit', amount: 3000 }),
        ])
      );
    });

    it('should return empty array for unknown structure', () => {
      const report = {
        reportType: 'unknown',
      };

      const result = exportService._flattenReportData(report);

      expect(result).toEqual([]);
    });
  });
});
