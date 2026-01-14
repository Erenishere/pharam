const mongoose = require('mongoose');
const ReportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Salesman = require('../../src/models/Salesman');
const CashReceipt = require('../../src/models/CashReceipt');

describe('Salesman Dimension Reporting - Task 47.1', () => {
  let salesmanId1, salesmanId2, customerId, createdBy;

  beforeEach(async () => {
    // Clean up
    await Invoice.deleteMany({});
    await Salesman.deleteMany({});

    // Create a dummy user ID for createdBy
    createdBy = new mongoose.Types.ObjectId();

    // Create test salesmen
    const salesman1 = await Salesman.create({
      code: 'SM001',
      name: 'John Doe',
      commissionRate: 2.5,
      isActive: true,
      createdBy
    });
    salesmanId1 = salesman1._id;

    const salesman2 = await Salesman.create({
      code: 'SM002',
      name: 'Jane Smith',
      commissionRate: 3.0,
      isActive: true,
      createdBy
    });
    salesmanId2 = salesman2._id;

    // Create a dummy customer ID
    customerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Invoice.deleteMany({});
    await Salesman.deleteMany({});
  });

  describe('Sales Report with Salesman Dimension', () => {
    test('should generate sales report grouped by salesman', async () => {
      // Create invoices for different salesmen
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          salesmanId: salesmanId1,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 18,
            lineTotal: 1018
          }],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 18,
            grandTotal: 1018
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          salesmanId: salesmanId1,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            discount: 0,
            taxAmount: 180,
            lineTotal: 1180
          }],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 180,
            grandTotal: 1180
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-003',
          type: 'sales',
          customerId,
          salesmanId: salesmanId2,
          invoiceDate: new Date('2024-01-25'),
          dueDate: new Date('2024-02-25'),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 8,
            unitPrice: 150,
            discount: 0,
            taxAmount: 21.6,
            lineTotal: 1221.6
          }],
          totals: {
            subtotal: 1200,
            totalDiscount: 0,
            totalTax: 21.6,
            grandTotal: 1221.6
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.generateSalesReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        groupBy: 'salesman'
      });

      expect(report.reportType).toBe('sales');
      expect(report.summary.totalInvoices).toBe(3);
      expect(report.data).toHaveLength(2); // Two salesmen

      // Find salesman1's data
      const salesman1Data = report.data.find(d => 
        d.salesman._id.toString() === salesmanId1.toString()
      );
      expect(salesman1Data).toBeDefined();
      expect(salesman1Data.invoiceCount).toBe(2);
      expect(salesman1Data.totalAmount).toBe(2360); // 1180 + 1180
      expect(salesman1Data.totalSubtotal).toBe(2000);

      // Find salesman2's data
      const salesman2Data = report.data.find(d => 
        d.salesman._id.toString() === salesmanId2.toString()
      );
      expect(salesman2Data).toBeDefined();
      expect(salesman2Data.invoiceCount).toBe(1);
      expect(salesman2Data.totalAmount).toBe(1416); // 1200 + 216 (18% tax)
    });

    test('should filter sales report by specific salesman', async () => {
      // Create invoices for different salesmen
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          salesmanId: salesmanId1,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 18,
            lineTotal: 1018
          }],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 18,
            grandTotal: 1018
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          salesmanId: salesmanId2,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 5,
            unitPrice: 200,
            discount: 0,
            taxAmount: 18,
            lineTotal: 1018
          }],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 18,
            grandTotal: 1018
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.generateSalesReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        salesmanId: salesmanId1
      });

      expect(report.summary.totalInvoices).toBe(1);
      expect(report.invoices).toHaveLength(1);
      expect(report.invoices[0].salesmanId._id.toString()).toBe(salesmanId1.toString());
    });

    test('should handle invoices without salesman assignment', async () => {
      // Create invoice without salesman
      await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 18,
          lineTotal: 1018
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 18,
          grandTotal: 1018
        },
        status: 'confirmed',
        createdBy
      });

      const report = await ReportService.generateSalesReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        groupBy: 'salesman'
      });

      expect(report.data).toHaveLength(1);
      expect(report.data[0].salesman.name).toBe('Unassigned');
      expect(report.data[0].invoiceCount).toBe(1);
    });

    test('should populate salesman details in report', async () => {
      await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'sales',
        customerId,
        salesmanId: salesmanId1,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 18,
          lineTotal: 1018
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 18,
          grandTotal: 1018
        },
        status: 'confirmed',
        createdBy
      });

      const report = await ReportService.generateSalesReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        salesmanId: salesmanId1
      });

      expect(report.invoices[0].salesmanId).toBeDefined();
      expect(report.invoices[0].salesmanId.code).toBe('SM001');
      expect(report.invoices[0].salesmanId.name).toBe('John Doe');
      expect(report.invoices[0].salesmanId.commissionRate).toBe(2.5);
    });
  });

  describe('Salesman Performance Dashboard - Task 47.2', () => {
    test('should generate salesman dashboard with sales and collections', async () => {
      // Create sales invoices
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          salesmanId: salesmanId1,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 18,
            lineTotal: 1018
          }],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 18,
            grandTotal: 1018
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const dashboard = await ReportService.getSalesmanDashboard(
        salesmanId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(dashboard.reportType).toBe('salesman_dashboard');
      expect(dashboard.salesmanId.toString()).toBe(salesmanId1.toString());
      expect(dashboard.salesman.code).toBe('SM001');
      expect(dashboard.salesman.name).toBe('John Doe');
      expect(dashboard.summary.totalSales).toBe(1180);
      expect(dashboard.summary.invoiceCount).toBe(1);
      expect(dashboard.recentInvoices).toHaveLength(1);
    });

    test('should use current month as default period', async () => {
      const now = new Date();
      const expectedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const dashboard = await ReportService.getSalesmanDashboard(salesmanId1);

      expect(dashboard.period.startDate.getMonth()).toBe(expectedStartDate.getMonth());
      expect(dashboard.period.startDate.getFullYear()).toBe(expectedStartDate.getFullYear());
    });

    test('should throw error if salesman ID not provided', async () => {
      await expect(
        ReportService.getSalesmanDashboard(null)
      ).rejects.toThrow('Salesman ID is required');
    });

    test('should throw error if salesman not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(
        ReportService.getSalesmanDashboard(nonExistentId)
      ).rejects.toThrow('Salesman not found');
    });

    test('should include performance metrics in dashboard', async () => {
      await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'sales',
        customerId,
        salesmanId: salesmanId1,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        items: [{
          itemId: new mongoose.Types.ObjectId(),
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 18,
          lineTotal: 1018
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 18,
          grandTotal: 1018
        },
        status: 'confirmed',
        createdBy
      });

      const dashboard = await ReportService.getSalesmanDashboard(
        salesmanId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(dashboard.summary.salesTarget).toBeDefined();
      expect(dashboard.summary.collectionsTarget).toBeDefined();
      expect(dashboard.summary.salesAchievement).toBeDefined();
      expect(dashboard.summary.collectionsAchievement).toBeDefined();
    });

    test('should limit recent invoices to 10', async () => {
      // Create 15 invoices
      const invoices = [];
      for (let i = 1; i <= 15; i++) {
        invoices.push({
          invoiceNumber: `INV-${String(i).padStart(3, '0')}`,
          type: 'sales',
          customerId,
          salesmanId: salesmanId1,
          invoiceDate: new Date(`2024-01-${String(i).padStart(2, '0')}`),
          dueDate: new Date(`2024-02-${String(i).padStart(2, '0')}`),
          items: [{
            itemId: new mongoose.Types.ObjectId(),
            quantity: 1,
            unitPrice: 100,
            discount: 0,
            taxAmount: 18,
            lineTotal: 118
          }],
          totals: {
            subtotal: 100,
            totalDiscount: 0,
            totalTax: 18,
            grandTotal: 118
          },
          status: 'confirmed',
          createdBy
        });
      }
      await Invoice.create(invoices);

      const dashboard = await ReportService.getSalesmanDashboard(
        salesmanId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(dashboard.recentInvoices).toHaveLength(10);
      expect(dashboard.summary.invoiceCount).toBe(15);
    });
  });
});
