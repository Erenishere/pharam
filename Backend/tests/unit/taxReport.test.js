const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Tax Report Service (Requirement 6.5)', () => {
  let mongoServer;
  let customer, supplier, item, user;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    // Create test data
    customer = await Customer.create({
      name: 'Test Customer',
      type: 'customer',
      financialInfo: {
        advanceTaxRate: 0.5,
        isNonFiler: false
      }
    });

    supplier = await Supplier.create({
      name: 'Test Supplier',
      type: 'supplier',
      financialInfo: {
        advanceTaxRate: 0,
        isNonFiler: false
      }
    });

    item = await Item.create({
      name: 'Test Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150 }
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
  });

  describe('getTaxReport', () => {
    it('should generate comprehensive tax report with all tax types', async () => {
      // Create invoices with different tax configurations
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Invoice 1: Sales with 18% GST and 0.5% advance tax
      await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 5,
          taxAmount: 185,
          lineTotal: 1185
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 185,
          grandTotal: 1185,
          gst18Total: 180,
          gst4Total: 0,
          advanceTaxTotal: 5,
          nonFilerGSTTotal: 0
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Invoice 2: Purchase with 4% GST
      await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-001',
        invoiceDate: new Date('2024-06-20'),
        dueDate: new Date('2024-07-20'),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          discount: 0,
          gstRate: 4,
          gstAmount: 20,
          taxAmount: 20,
          lineTotal: 520
        }],
        totals: {
          subtotal: 500,
          totalDiscount: 0,
          totalTax: 20,
          grandTotal: 520,
          gst18Total: 0,
          gst4Total: 20,
          advanceTaxTotal: 0,
          nonFilerGSTTotal: 0
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const report = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'all'
      });

      expect(report.reportType).toBe('comprehensive_tax_report');
      expect(report.period.startDate).toEqual(startDate);
      expect(report.period.endDate).toEqual(endDate);

      // Check GST breakdown
      expect(report.taxBreakdown.gst.gst18.taxAmount).toBe(180);
      expect(report.taxBreakdown.gst.gst4.taxAmount).toBe(20);
      expect(report.taxBreakdown.gst.total.taxAmount).toBe(200);

      // Check Advance Tax breakdown
      expect(report.taxBreakdown.advanceTax.rate0_5.taxAmount).toBe(5);
      expect(report.taxBreakdown.advanceTax.total.taxAmount).toBe(5);

      // Check summary
      expect(report.taxBreakdown.summary.totalInvoices).toBe(2);
      expect(report.taxBreakdown.summary.totalGSTAmount).toBe(200);
      expect(report.taxBreakdown.summary.totalAdvanceTaxAmount).toBe(5);
      expect(report.taxBreakdown.summary.totalTaxAmount).toBe(205);
    });

    it('should separate GST by rate (18% and 4%)', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Create mixed GST invoice
      await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-002',
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            gstAmount: 180,
            taxAmount: 180,
            lineTotal: 1180
          },
          {
            itemId: item._id,
            quantity: 5,
            unitPrice: 100,
            discount: 0,
            gstRate: 4,
            gstAmount: 20,
            taxAmount: 20,
            lineTotal: 520
          }
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 200,
          grandTotal: 1700,
          gst18Total: 180,
          gst4Total: 20,
          advanceTaxTotal: 0,
          nonFilerGSTTotal: 0
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const report = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'purchase'
      });

      expect(report.taxBreakdown.gst.gst18.taxAmount).toBe(180);
      expect(report.taxBreakdown.gst.gst18.invoiceCount).toBe(1);
      expect(report.taxBreakdown.gst.gst4.taxAmount).toBe(20);
      expect(report.taxBreakdown.gst.gst4.invoiceCount).toBe(1);
    });

    it('should separate advance tax by rate (0.5% and 2.5%)', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Create customer with 2.5% advance tax
      const customer2 = await Customer.create({
        name: 'Customer 2',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: false
        }
      });

      // Invoice with 0.5% advance tax
      await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 5,
          taxAmount: 185,
          lineTotal: 1185
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 185,
          grandTotal: 1185,
          gst18Total: 180,
          advanceTaxTotal: 5,
          nonFilerGSTTotal: 0
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Invoice with 2.5% advance tax
      await Invoice.create({
        type: 'sales',
        customerId: customer2._id,
        invoiceDate: new Date('2024-06-20'),
        dueDate: new Date('2024-07-20'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 2.5,
          advanceTaxAmount: 25,
          taxAmount: 205,
          lineTotal: 1205
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 205,
          grandTotal: 1205,
          gst18Total: 180,
          advanceTaxTotal: 25,
          nonFilerGSTTotal: 0
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const report = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'sales'
      });

      expect(report.taxBreakdown.advanceTax.rate0_5.taxAmount).toBe(5);
      expect(report.taxBreakdown.advanceTax.rate0_5.invoiceCount).toBe(1);
      expect(report.taxBreakdown.advanceTax.rate2_5.taxAmount).toBe(25);
      expect(report.taxBreakdown.advanceTax.rate2_5.invoiceCount).toBe(1);
      expect(report.taxBreakdown.advanceTax.total.taxAmount).toBe(30);
    });

    it('should track non-filer GST separately', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Create non-filer customer
      const nonFilerCustomer = await Customer.create({
        name: 'Non-Filer Customer',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: true
        }
      });

      await Invoice.create({
        type: 'sales',
        customerId: nonFilerCustomer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 2.5,
          advanceTaxAmount: 25,
          taxAmount: 206,
          lineTotal: 1206
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 206,
          grandTotal: 1206,
          gst18Total: 180,
          advanceTaxTotal: 25,
          nonFilerGSTTotal: 1
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const report = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'sales'
      });

      expect(report.taxBreakdown.nonFilerGST.taxAmount).toBe(1);
      expect(report.taxBreakdown.nonFilerGST.invoiceCount).toBe(1);
      expect(report.taxBreakdown.summary.totalNonFilerGSTAmount).toBe(1);
    });

    it('should filter by invoice type', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Create sales invoice
      await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          taxAmount: 180,
          lineTotal: 1180
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180,
          gst18Total: 180
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Create purchase invoice
      await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-003',
        invoiceDate: new Date('2024-06-20'),
        dueDate: new Date('2024-07-20'),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          discount: 0,
          gstRate: 4,
          gstAmount: 20,
          taxAmount: 20,
          lineTotal: 520
        }],
        totals: {
          subtotal: 500,
          totalDiscount: 0,
          totalTax: 20,
          grandTotal: 520,
          gst4Total: 20
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Get sales report only
      const salesReport = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'sales'
      });

      expect(salesReport.taxBreakdown.summary.totalInvoices).toBe(1);
      expect(salesReport.taxBreakdown.gst.gst18.taxAmount).toBe(180);
      expect(salesReport.taxBreakdown.gst.gst4.taxAmount).toBe(0);

      // Get purchase report only
      const purchaseReport = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'purchase'
      });

      expect(purchaseReport.taxBreakdown.summary.totalInvoices).toBe(1);
      expect(purchaseReport.taxBreakdown.gst.gst4.taxAmount).toBe(20);
      expect(purchaseReport.taxBreakdown.gst.gst18.taxAmount).toBe(0);
    });

    it('should require start and end dates', async () => {
      await expect(reportService.getTaxReport({})).rejects.toThrow('Start date and end date are required');
    });

    it('should handle empty result set', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const report = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: 'all'
      });

      expect(report.taxBreakdown.summary.totalInvoices).toBe(0);
      expect(report.taxBreakdown.summary.totalTaxAmount).toBe(0);
    });
  });
});
