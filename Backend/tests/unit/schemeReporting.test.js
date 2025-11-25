const mongoose = require('mongoose');
const ReportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');

describe('Scheme Dimension Reporting - Task 48', () => {
  let customerId, itemId1, itemId2, createdBy;

  beforeEach(async () => {
    // Clean up
    await Invoice.deleteMany({});
    await Item.deleteMany({});

    // Create dummy IDs
    customerId = new mongoose.Types.ObjectId();
    createdBy = new mongoose.Types.ObjectId();

    // Create actual Item documents
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
        minStock: 10,
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

  describe('Task 48.1: Scheme Analysis Report', () => {
    test('should generate scheme report with scheme1 and scheme2 quantities', async () => {
      // Create invoices with scheme quantities
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
            lineTotal: 5900,
            scheme1Quantity: 10, // Regular bonus
            scheme2Quantity: 5   // Claim-based
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 0,
            totalTax: 900,
            grandTotal: 5900
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
            lineTotal: 5900,
            scheme1Quantity: 5,
            scheme2Quantity: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 0,
            totalTax: 900,
            grandTotal: 5900
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getSchemeReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.reportType).toBe('scheme_analysis');
      expect(report.summary.totalScheme1Quantity).toBe(15); // 10 + 5
      expect(report.summary.totalScheme2Quantity).toBe(5);
      expect(report.summary.totalSchemeQuantity).toBe(20);
      expect(report.schemeByType.scheme1.invoiceCount).toBe(2);
      expect(report.schemeByType.scheme2.invoiceCount).toBe(1);
    });

    test('should calculate scheme values correctly', async () => {
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
          lineTotal: 5900,
          scheme1Quantity: 10,
          scheme2Quantity: 5
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

      const report = await ReportService.getSchemeReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Scheme1: 10 qty * 50 price = 500
      // Scheme2: 5 qty * 50 price = 250
      expect(report.summary.totalScheme1Value).toBe(500);
      expect(report.summary.totalScheme2Value).toBe(250);
      expect(report.summary.totalSchemeValue).toBe(750);
    });

    test('should group schemes by item', async () => {
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
            lineTotal: 5900,
            scheme1Quantity: 10,
            scheme2Quantity: 5
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 0,
            totalTax: 900,
            grandTotal: 5900
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
            itemId: itemId1,
            quantity: 50,
            unitPrice: 50,
            discount: 0,
            taxAmount: 450,
            lineTotal: 2950,
            scheme1Quantity: 5,
            scheme2Quantity: 2
          }],
          totals: {
            subtotal: 2500,
            totalDiscount: 0,
            totalTax: 450,
            grandTotal: 2950
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const report = await ReportService.getSchemeReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.schemeByItem).toHaveLength(1);
      expect(report.schemeByItem[0].scheme1Quantity).toBe(15); // 10 + 5
      expect(report.schemeByItem[0].scheme2Quantity).toBe(7);  // 5 + 2
      expect(report.schemeByItem[0].totalSchemeQuantity).toBe(22);
    });

    test('should filter by invoice type', async () => {
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
            lineTotal: 5900,
            scheme1Quantity: 10,
            scheme2Quantity: 0
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 0,
            totalTax: 900,
            grandTotal: 5900
          },
          status: 'confirmed',
          createdBy
        },
        {
          invoiceNumber: 'PINV-001',
          type: 'purchase',
          supplierId: customerId, // Reusing as supplier ID
          supplierBillNo: 'SBILL-001',
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          items: [{
            itemId: itemId1,
            quantity: 50,
            unitPrice: 40,
            discount: 0,
            taxAmount: 360,
            lineTotal: 2360,
            scheme1Quantity: 5,
            scheme2Quantity: 0
          }],
          totals: {
            subtotal: 2000,
            totalDiscount: 0,
            totalTax: 360,
            grandTotal: 2360
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const salesReport = await ReportService.getSchemeReport(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { invoiceType: 'sales' }
      );

      const purchaseReport = await ReportService.getSchemeReport(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { invoiceType: 'purchase' }
      );

      expect(salesReport.summary.totalScheme1Quantity).toBe(10);
      expect(purchaseReport.summary.totalScheme1Quantity).toBe(5);
    });

    test('should handle invoices without schemes', async () => {
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
          // No scheme quantities
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

      const report = await ReportService.getSchemeReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.summary.totalScheme1Quantity).toBe(0);
      expect(report.summary.totalScheme2Quantity).toBe(0);
      expect(report.schemeByItem).toHaveLength(0);
    });

    test('should throw error if dates not provided', async () => {
      await expect(
        ReportService.getSchemeReport(null, null)
      ).rejects.toThrow('Start date and end date are required');
    });
  });

  describe('Task 48.2: Scheme Comparison Report', () => {
    test('should compare scheme performance across two periods', async () => {
      // Period 1: January
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
            lineTotal: 5900,
            scheme1Quantity: 10,
            scheme2Quantity: 5
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 0,
            totalTax: 900,
            grandTotal: 5900
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      // Period 2: February (increased schemes)
      await Invoice.create([
        {
          invoiceNumber: 'INV-002',
          type: 'sales',
          customerId,
          invoiceDate: new Date('2024-02-15'),
          dueDate: new Date('2024-03-15'),
          items: [{
            itemId: itemId1,
            quantity: 100,
            unitPrice: 50,
            discount: 0,
            taxAmount: 900,
            lineTotal: 5900,
            scheme1Quantity: 15, // Increased from 10
            scheme2Quantity: 8   // Increased from 5
          }],
          totals: {
            subtotal: 5000,
            totalDiscount: 0,
            totalTax: 900,
            grandTotal: 5900
          },
          status: 'confirmed',
          createdBy
        }
      ]);

      const comparison = await ReportService.getSchemeComparison(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );

      expect(comparison.reportType).toBe('scheme_comparison');
      expect(comparison.period1.summary.totalScheme1Quantity).toBe(10);
      expect(comparison.period2.summary.totalScheme1Quantity).toBe(15);
      expect(comparison.comparison.scheme1.quantityChange).toBe(5);
      expect(comparison.comparison.scheme1.quantityChangePercent).toBe(50);
      expect(comparison.comparison.scheme1.trend).toBe('increasing');
    });

    test('should detect decreasing trend', async () => {
      // Period 1: January (higher schemes)
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
          lineTotal: 5900,
          scheme1Quantity: 20,
          scheme2Quantity: 10
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

      // Period 2: February (lower schemes)
      await Invoice.create({
        invoiceNumber: 'INV-002',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-02-15'),
        dueDate: new Date('2024-03-15'),
        items: [{
          itemId: itemId1,
          quantity: 100,
          unitPrice: 50,
          discount: 0,
          taxAmount: 900,
          lineTotal: 5900,
          scheme1Quantity: 10, // Decreased from 20
          scheme2Quantity: 5   // Decreased from 10
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

      const comparison = await ReportService.getSchemeComparison(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );

      expect(comparison.comparison.scheme1.quantityChange).toBe(-10);
      expect(comparison.comparison.scheme1.quantityChangePercent).toBe(-50);
      expect(comparison.comparison.scheme1.trend).toBe('decreasing');
    });

    test('should detect stable trend', async () => {
      // Period 1: January
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
          lineTotal: 5900,
          scheme1Quantity: 100,
          scheme2Quantity: 50
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

      // Period 2: February (slight increase, within 10%)
      await Invoice.create({
        invoiceNumber: 'INV-002',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-02-15'),
        dueDate: new Date('2024-03-15'),
        items: [{
          itemId: itemId1,
          quantity: 100,
          unitPrice: 50,
          discount: 0,
          taxAmount: 900,
          lineTotal: 5900,
          scheme1Quantity: 105, // 5% increase
          scheme2Quantity: 52   // 4% increase
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

      const comparison = await ReportService.getSchemeComparison(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );

      expect(comparison.comparison.scheme1.trend).toBe('stable');
      expect(comparison.comparison.scheme2.trend).toBe('stable');
    });

    test('should calculate value changes correctly', async () => {
      // Period 1
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
          lineTotal: 5900,
          scheme1Quantity: 10, // Value: 10 * 50 = 500
          scheme2Quantity: 5   // Value: 5 * 50 = 250
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

      // Period 2
      await Invoice.create({
        invoiceNumber: 'INV-002',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-02-15'),
        dueDate: new Date('2024-03-15'),
        items: [{
          itemId: itemId1,
          quantity: 100,
          unitPrice: 50,
          discount: 0,
          taxAmount: 900,
          lineTotal: 5900,
          scheme1Quantity: 20, // Value: 20 * 50 = 1000
          scheme2Quantity: 10  // Value: 10 * 50 = 500
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

      const comparison = await ReportService.getSchemeComparison(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );

      expect(comparison.comparison.scheme1.valueChange).toBe(500); // 1000 - 500
      expect(comparison.comparison.scheme2.valueChange).toBe(250); // 500 - 250
      expect(comparison.comparison.total.valueChange).toBe(750);   // 1500 - 750
    });

    test('should handle zero values in first period', async () => {
      // Period 1: No schemes
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
          // No schemes
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

      // Period 2: With schemes
      await Invoice.create({
        invoiceNumber: 'INV-002',
        type: 'sales',
        customerId,
        invoiceDate: new Date('2024-02-15'),
        dueDate: new Date('2024-03-15'),
        items: [{
          itemId: itemId1,
          quantity: 100,
          unitPrice: 50,
          discount: 0,
          taxAmount: 900,
          lineTotal: 5900,
          scheme1Quantity: 10,
          scheme2Quantity: 5
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

      const comparison = await ReportService.getSchemeComparison(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        new Date('2024-02-01'),
        new Date('2024-02-29')
      );

      // Should not throw error and should show 0% change when dividing by zero
      expect(comparison.comparison.scheme1.quantityChangePercent).toBe(0);
      expect(comparison.comparison.scheme2.quantityChangePercent).toBe(0);
    });

    test('should throw error if period dates not provided', async () => {
      await expect(
        ReportService.getSchemeComparison(null, null, null, null)
      ).rejects.toThrow('All period dates are required');
    });
  });
});
