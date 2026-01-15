const mongoose = require('mongoose');
const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Tax Compliance Report Service', () => {
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

  describe('getTaxComplianceReport', () => {
    test('should calculate net GST payable correctly', async () => {
      // Sales invoice (Output GST)
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

      // Purchase invoice (Input GST)
      await Invoice.create({
        invoiceNumber: 'PI-001',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        supplierBillNo: 'BILL-001',
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 100, gstRate: 18, gstAmount: 180, lineTotal: 1180 }],
        totals: { subtotal: 1000, totalDiscount: 0, totalTax: 180, gst18Total: 180, grandTotal: 1180 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.complianceSummary.gst.outputGST.total).toBe(270);
      expect(report.complianceSummary.gst.inputGST.total).toBe(180);
      expect(report.complianceSummary.gst.netGSTPayable).toBe(90);
    });

    test('should separate GST by rate (18% and 4%)', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-002',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [
          { itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, lineTotal: 1770 },
          { itemId: testItem._id, quantity: 10, unitPrice: 100, gstRate: 4, gstAmount: 40, lineTotal: 1040 }
        ],
        totals: { subtotal: 2500, totalDiscount: 0, totalTax: 310, gst18Total: 270, gst4Total: 40, grandTotal: 2810 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.complianceSummary.gst.outputGST.gst18).toBe(270);
      expect(report.complianceSummary.gst.outputGST.gst4).toBe(40);
      expect(report.detailedBreakdowns.salesGST18.taxAmount).toBe(270);
      expect(report.detailedBreakdowns.salesGST4.taxAmount).toBe(40);
    });

    test('should include advance tax in compliance summary', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-003',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, advanceTaxPercent: 0.5, advanceTaxAmount: 7.5, lineTotal: 1777.5 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 277.5, gst18Total: 270, advanceTaxTotal: 7.5, grandTotal: 1777.5 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.complianceSummary.advanceTax.rate0_5.collected).toBe(7.5);
      expect(report.complianceSummary.advanceTax.total.collected).toBe(7.5);
    });

    test('should include non-filer GST in compliance summary', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-004',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, lineTotal: 1770 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 271.5, gst18Total: 270, nonFilerGSTTotal: 1.5, grandTotal: 1771.5 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.complianceSummary.nonFilerGST.collected).toBe(1.5);
      expect(report.complianceSummary.nonFilerGST.invoiceCount).toBe(1);
    });

    test('should include income tax in compliance summary', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-005',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, lineTotal: 1770 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 352.5, gst18Total: 270, incomeTaxTotal: 82.5, grandTotal: 1852.5 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.complianceSummary.incomeTax.collected).toBe(82.5);
      expect(report.complianceSummary.incomeTax.invoiceCount).toBe(1);
    });

    test('should include reporting authorities (SRB/FBR)', async () => {
      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.reportingAuthorities).toBeDefined();
      expect(report.reportingAuthorities.SRB).toBe('Sindh Revenue Board');
      expect(report.reportingAuthorities.FBR).toBe('Federal Board of Revenue');
    });

    test('should include compliance notes', async () => {
      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.notes).toBeDefined();
      expect(Array.isArray(report.notes)).toBe(true);
      expect(report.notes.length).toBeGreaterThan(0);
      expect(report.notes).toContain('This report is prepared for tax compliance purposes');
      expect(report.notes).toContain('Net GST Payable = Output GST - Input GST');
    });

    test('should calculate total tax collected and payable', async () => {
      // Sales with GST, advance tax, and non-filer GST
      await Invoice.create({
        invoiceNumber: 'SI-006',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, advanceTaxPercent: 0.5, advanceTaxAmount: 7.5, lineTotal: 1777.5 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 279, gst18Total: 270, advanceTaxTotal: 7.5, nonFilerGSTTotal: 1.5, grandTotal: 1779 }
      });

      // Purchase with GST
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

      expect(report.complianceSummary.totalTax.collected).toBeGreaterThan(0);
      expect(report.complianceSummary.totalTax.paid).toBeGreaterThan(0);
      expect(report.complianceSummary.totalTax.netPayable).toBeGreaterThan(0);
    });

    test('should provide detailed breakdowns for compliance', async () => {
      await Invoice.create({
        invoiceNumber: 'SI-007',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        createdBy: testUser._id,
        items: [{ itemId: testItem._id, quantity: 10, unitPrice: 150, gstRate: 18, gstAmount: 270, lineTotal: 1770 }],
        totals: { subtotal: 1500, totalDiscount: 0, totalTax: 270, gst18Total: 270, grandTotal: 1770 }
      });

      const report = await reportService.getTaxComplianceReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.detailedBreakdowns).toBeDefined();
      expect(report.detailedBreakdowns.salesGST18).toBeDefined();
      expect(report.detailedBreakdowns.salesGST4).toBeDefined();
      expect(report.detailedBreakdowns.purchaseGST18).toBeDefined();
      expect(report.detailedBreakdowns.purchaseGST4).toBeDefined();
    });

    test('should throw error if start date is missing', async () => {
      await expect(
        reportService.getTaxComplianceReport(null, new Date('2024-01-31'))
      ).rejects.toThrow('Start date and end date are required');
    });

    test('should throw error if end date is missing', async () => {
      await expect(
        reportService.getTaxComplianceReport(new Date('2024-01-01'), null)
      ).rejects.toThrow('Start date and end date are required');
    });
  });
});
