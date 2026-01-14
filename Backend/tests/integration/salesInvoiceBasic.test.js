const salesInvoiceController = require('../../src/controllers/salesInvoiceController');
const salesInvoiceService = require('../../src/services/salesInvoiceService');

describe('Sales Invoice Controller Unit Tests', () => {
  describe('Controller Functions', () => {
    it('should have all required controller functions', () => {
      expect(salesInvoiceController.getAllSalesInvoices).toBeDefined();
      expect(salesInvoiceController.getSalesInvoiceById).toBeDefined();
      expect(salesInvoiceController.getSalesInvoiceByNumber).toBeDefined();
      expect(salesInvoiceController.getSalesInvoicesByCustomer).toBeDefined();
      expect(salesInvoiceController.createSalesInvoice).toBeDefined();
      expect(salesInvoiceController.updateSalesInvoice).toBeDefined();
      expect(salesInvoiceController.deleteSalesInvoice).toBeDefined();
      expect(salesInvoiceController.updateInvoiceStatus).toBeDefined();
      expect(salesInvoiceController.updatePaymentStatus).toBeDefined();
      expect(salesInvoiceController.getSalesStatistics).toBeDefined();
    });
  });

  describe('Service Functions', () => {
    it('should have all required service functions', () => {
      expect(salesInvoiceService.createSalesInvoice).toBeDefined();
      expect(salesInvoiceService.getSalesInvoiceById).toBeDefined();
      expect(salesInvoiceService.getSalesInvoiceByNumber).toBeDefined();
      expect(salesInvoiceService.getAllSalesInvoices).toBeDefined();
      expect(salesInvoiceService.getSalesInvoicesByCustomer).toBeDefined();
      expect(salesInvoiceService.updateSalesInvoice).toBeDefined();
      expect(salesInvoiceService.deleteSalesInvoice).toBeDefined();
      expect(salesInvoiceService.getSalesStatistics).toBeDefined();
    });
  });
});
