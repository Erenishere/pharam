const mongoose = require('mongoose');
const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Tax Breakdown Report Service', () => {
  let testCustomer, testSupplier, testItem, testUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/indus-traders-test');
    }
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      role: 'admin',
      isActive: true
    });

    testCustomer = await Customer.create({
      code: 'CUST001',
      name: 'Test Customer',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@test.com',
      address: 'Test Address',
      city: 'Test City',
      creditLimit: 100000,
      creditDays: 30,
      isActive: true
    });

    testSupplier = await Supplier.create({
      code: 'SUPP001',
      name: 'Test Supplier',
      contactPerson: 'Jane Doe',
      phone: '0987654321',
      email: 'supplier@test.com',
      address: 'Supplier Address',
      city: 'Supplier City',
      creditDays: 30,
      isActive: true
    });

    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      category: 'Test Category',
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150, minPrice: 120 },
      stock: { currentStock: 1000, minStock: 100, maxStock: 5000 },
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('getTaxBreakdownReport', () => {
    test('should generate tax breakdown for sales invoices with GST 18%', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-001',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, lineTotal: 1770 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 270, gst18Total: 270, grandTotal: 1770 }
      });

      const report = await reportService.getTaxBreakdownReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'sales'
      });

      expect(report.reportType).toBe('tax_breakdown');
      expect(report.breakdown.gst.gst18.invoiceCount).toBe(1);
      expect(report.breakdown.gst.gst18.taxableAmount).toBe(1500);
      expect(report.breakdown.gst.gst18.taxAmount).toBe(270);
    });

    test('should generate tax breakdown for purchase invoices with GST 4%', async () => {
      await Invoice.create({
        invoiceNumber: 'PI-001',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        supplierBillNo: 'BILL-001',
        items: [{ itemId: testItem._id, quantity: 20, unitPrice: 100, gstRate: 4, gstAmount: 80, lineTotal: 2080 }],
        totals: { subtotal: 2000, totalDiscount: 0, totalTax: 80, gst4Total: 80, grandTotal: 2080 }
      });

      const report = await reportService.getTaxBreakdownReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'purchase'
      });

      expect(report.breakdown.gst.gst4.invoiceCount).toBe(1);
      expect(report.breakdown.gst.gst4.taxableAmount).toBe(2000);
      expect(report.breakdown.gst.gst4.taxAmount).toBe(80);
    });

    test('should separate advance tax by rate', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-002',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, advanceTaxPercent: 0.5, advanceTaxAmount: 7.5, lineTotal: 1777.5 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 277.5, gst18Total: 270, advanceTaxTotal: 7.5, grandTotal: 1777.5 }
      });

      const report = await reportService.getTaxBreakdownReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'sales'
      });

      expect(report.breakdown.advanceTax.rate0_5.taxAmount).toBe(7.5);
    });

    test('should throw error if start date is missing', async () => {
      await expect(
        reportService.getTaxBreakdownReport({ endDate: new Date('2024-01-31'), invoiceType: 'all' })
      ).rejects.toThrow('Start date and end date are required');
    });
  });

  describe('getTaxComplianceReport', () => {
    test('should generate compliance report with net GST payable', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-003',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, lineTotal: 1770 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 270, gst18Total: 270, grandTotal: 1770 }
      });

      await Invoice.create({
        invoiceNumber: 'PI-002',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        supplierBillNo: 'BILL-002',
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 100, gstRate: 18, gstAmount: 180, lineTotal: 1180 }],
        totals: { subtotal: 1000, totalDiscount: 0, totalTax: 180, gst18Total: 180, grandTotal: 1180 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.reportType).toBe('tax_compliance');
      expect(report.complianceSummary.gst.outputGST.total).toBe(270);
      expect(report.complianceSummary.gst.inputGST.total).toBe(180);
      expect(report.complianceSummary.gst.netGSTPayable).toBe(90);
    });

    test('should include reporting authorities information', async () => {
      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));
      expect(report.reportingAuthorities.SRB).toBe('Sindh Revenue Board');
      expect(report.reportingAuthorities.FBR).toBe('Federal Board of Revenue');
    });
  });
});
