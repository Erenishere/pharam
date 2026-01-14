const mongoose = require('mongoose');
const ReportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');

describe('Discount Dimension Reporting - Task 50', () => {
  let customerId, itemId1, itemId2, claimAccountId, createdBy;

  beforeEach(async () => {
    // Clean up
    await Invoice.deleteMany({});
    await Item.deleteMany({});

    createdBy = new mongoose.Types.ObjectId();
    customerId = new mongoose.Types.ObjectId();
    claimAccountId = new mongoose.Types.ObjectId();

    // Create items
    const item1 = await Item.create({
      code: 'ITEM-001',
      name: 'Test Item 1',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 40,
        salePrice: 50,
        sellingPrice: 50,
        mrp: 60
      },
      stock: {
        currentStock: 1000,
        minStock: 10,
        maxStock: 5000
      },
      createdBy
    });
    itemId1 = item1._id;

    const item2 = await Item.create({
      code: 'ITEM-002',
      name: 'Test Item 2',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 80,
        salePrice: 100,
        sellingPrice: 100,
        mrp: 120
      },
      stock: {
        currentStock: 500,
        minStock: 20,
        maxStock: 2000
      },
      createdBy
    });
    itemId2 = item2._id;
  });

  afterEach(async () => {
    await Invoice.deleteMany({});
    await Item.deleteMany({});
  });

  describe('Task 50.1: Discount Analysis Report', () => {
    test('should generate discount analysis report with discount1 and discount2', async () => {
      // Create invoices with discounts
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4600,
            discount1Percent: 10,
            discount1Amount: 500,
            discount2Percent: 0,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 500,
            totalTax: 900,
            grandTotal: 5400
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          claimAccountId,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4600,
            discount1Percent: 0,
            discount1Amount: 0,
            discount2Percent: 5,
            discount2Amount: 250
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 250,
            totalTax: 900,
            grandTotal: 5650
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountAnalysis(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.reportType).toBe('discount_breakdown');
      expect(report.breakdown.discount1.invoiceCount).toBe(1);
      expect(report.breakdown.discount1.totalAmount).toBe(500);
      expect(report.breakdown.discount2.invoiceCount).toBe(1);
      expect(report.breakdown.discount2.totalAmount).toBe(250);
      expect(report.breakdown.total.totalAmount).toBe(750);
    });

    test('should filter by discount type', async () => {
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4600,
            discount1Amount: 500,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 500,
            totalTax: 900,
            grandTotal: 5400
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4750,
            discount1Amount: 0,
            discount2Amount: 250
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 250,
            totalTax: 900,
            grandTotal: 5650
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountAnalysis(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { discountType: 'discount1' }
      );

      expect(report.breakdown.discount1.invoiceCount).toBe(1);
      expect(report.breakdown.discount2.invoiceCount).toBe(0);
    });

    test('should group discount2 by claim account', async () => {
      const claimAccount2 = new mongoose.Types.ObjectId();

      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          claimAccountId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4750,
            discount1Amount: 0,
            discount2Amount: 250
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 250,
            totalTax: 900,
            grandTotal: 5650
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          claimAccountId: claimAccount2,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4850,
            discount1Amount: 0,
            discount2Amount: 150
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 150,
            totalTax: 900,
            grandTotal: 5750
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountAnalysis(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.breakdown.discount2.byClaimAccount).toHaveLength(2);
      expect(report.breakdown.discount2.totalAmount).toBe(400);
    });

    test('should throw error if dates not provided', async () => {
      await expect(
        ReportService.getDiscountAnalysis(null, null)
      ).rejects.toThrow('Start date and end date are required');
    });

    test('should handle invoices without discounts', async () => {
      await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        items: [{
          itemId: itemId1,
          quantity: 100,
          unitPrice: 50,
          discount: 0,
          taxAmount: 900,
          lineTotal: 5900
          // No discounts
        }],
        totals: {
          subtotal: 5000,
          totalDiscount: 0,
          totalTax: 900,
          grandTotal: 5900
        },
        status: 'confirmed',
        createdBy
      });

      const report = await ReportService.getDiscountAnalysis(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.breakdown.discount1.invoiceCount).toBe(0);
      expect(report.breakdown.discount2.invoiceCount).toBe(0);
      expect(report.breakdown.total.totalAmount).toBe(0);
    });
  });

  describe('Task 50.2: Discount Trend Report', () => {
    test('should generate discount trend report grouped by month', async () => {
      // Create invoices across multiple months
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4600,
            discount1Amount: 400,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 400,
            totalTax: 900,
            grandTotal: 5500
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-02-15'),
          dueDate: new Date('2024-03-15'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4400,
            discount1Amount: 600,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 600,
            totalTax: 900,
            grandTotal: 5300
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-02-29')
      );

      expect(report.reportType).toBe('discount_trend');
      expect(report.groupBy).toBe('month');
      expect(report.trendData).toHaveLength(2);
      expect(report.trendData[0].period).toBe('2024-01');
      expect(report.trendData[1].period).toBe('2024-02');
    });

    test('should detect increasing trend', async () => {
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4800,
            discount1Amount: 200,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 200,
            totalTax: 900,
            grandTotal: 5700
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-02-15'),
          dueDate: new Date('2024-03-15'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4100,
            discount1Amount: 900,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 900,
            totalTax: 900,
            grandTotal: 4900
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-02-29')
      );

      expect(report.trends.discount1).toBe('increasing');
    });

    test('should detect decreasing trend', async () => {
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4100,
            discount1Amount: 900,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 900,
            totalTax: 900,
            grandTotal: 4900
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-02-15'),
          dueDate: new Date('2024-03-15'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4800,
            discount1Amount: 200,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 200,
            totalTax: 900,
            grandTotal: 5700
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-02-29')
      );

      expect(report.trends.discount1).toBe('decreasing');
    });

    test('should detect stable trend', async () => {
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4500,
            discount1Amount: 500,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 500,
            totalTax: 900,
            grandTotal: 5400
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-02-15'),
          dueDate: new Date('2024-03-15'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4475,
            discount1Amount: 525,
            discount2Amount: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 525,
            totalTax: 900,
            grandTotal: 5375
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-02-29')
      );

      expect(report.trends.discount1).toBe('stable');
    });

    test('should calculate summary statistics', async () => {
      await Invoice.create([
        {
          invoiceNumber: 'INV-001',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4600,
            discount1Amount: 400,
            discount2Amount: 100
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 500,
            totalTax: 900,
            grandTotal: 5400
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-02-15'),
          dueDate: new Date('2024-03-15'),
          items: [{
            itemId: itemId2,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            taxAmount: 900,
            lineTotal: 4400,
            discount1Amount: 600,
            discount2Amount: 200
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 800,
            totalTax: 900,
            grandTotal: 5100
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-02-29')
      );

      expect(report.summary.totalPeriods).toBe(2);
      expect(report.summary.discount1.totalAmount).toBe(1000);
      expect(report.summary.discount2.totalAmount).toBe(300);
      expect(report.summary.discount1.averagePerPeriod).toBe(500);
      expect(report.summary.discount2.averagePerPeriod).toBe(150);
    });

    test('should support different grouping periods', async () => {
      await Invoice.create({
        invoiceNumber: 'INV-001',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        items: [{
          itemId: itemId1,
          quantity: 100,
          unitPrice: 50,
          discount: 0,
          taxAmount: 900,
          lineTotal: 4600,
          discount1Amount: 400,
          discount2Amount: 0
        }],
        totals: {
          subtotal: 5000,
          totalDiscount: 400,
          totalTax: 900,
          grandTotal: 5500
        },
        status: 'confirmed',
        createdBy
      });

      const reportDay = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { groupBy: 'day' }
      );

      expect(reportDay.groupBy).toBe('day');
      expect(reportDay.trendData[0].period).toBe('2024-01-15');
    });

    test('should throw error if dates not provided', async () => {
      await expect(
        ReportService.getDiscountTrend(null, null)
      ).rejects.toThrow('Start date and end date are required');
    });

    test('should handle period with no discounts', async () => {
      const report = await ReportService.getDiscountTrend(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.trendData).toHaveLength(0);
      expect(report.summary.totalPeriods).toBe(0);
      expect(report.summary.total.totalAmount).toBe(0);
    });
  });
});
