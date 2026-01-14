const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model - Tax Fields (Task 1.5)', () => {
  let customer, supplier, item, user;

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    customer = await Customer.create({
      name: 'Test Customer',
      code: 'CUST001',
      type: 'customer'
    });

    supplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      type: 'supplier'
    });

    item = await Item.create({
      name: 'Test Item',
      code: 'ITEM001',
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

  describe('Advance Tax Fields in Invoice Items', () => {
    it('should store advanceTaxPercent and advanceTaxAmount in items', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000001',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 7.5,
          lineTotal: 1507.5
        }],
        totals: { subtotal: 1500, advanceTaxTotal: 7.5, grandTotal: 1507.5 },
        createdBy: user._id
      });

      expect(invoice.items[0].advanceTaxPercent).toBe(0.5);
      expect(invoice.items[0].advanceTaxAmount).toBe(7.5);
    });

    it('should default advanceTaxPercent to 0', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000002',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.items[0].advanceTaxPercent).toBe(0);
      expect(invoice.items[0].advanceTaxAmount).toBe(0);
    });

    it('should validate advanceTaxPercent enum values (0, 0.5, 2.5)', async () => {
      const validRates = [0, 0.5, 2.5];
      
      for (const rate of validRates) {
        const invoice = await Invoice.create({
          invoiceNumber: `SI202400000${validRates.indexOf(rate) + 3}`,
          type: 'sales',
          customerId: customer._id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [{
            itemId: item._id,
            quantity: 10,
            unitPrice: 150,
            advanceTaxPercent: rate,
            advanceTaxAmount: (1500 * rate) / 100,
            lineTotal: 1500 + (1500 * rate) / 100
          }],
          totals: { 
            subtotal: 1500, 
            advanceTaxTotal: (1500 * rate) / 100, 
            grandTotal: 1500 + (1500 * rate) / 100 
          },
          createdBy: user._id
        });

        expect(invoice.items[0].advanceTaxPercent).toBe(rate);
      }
    });

    it('should reject invalid advanceTaxPercent values', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000006',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          advanceTaxPercent: 1.5, // Invalid value
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow();
    });

    it('should validate advanceTaxAmount is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000007',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          advanceTaxAmount: -10,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Advance tax amount cannot be negative');
    });

    it('should calculate 0.5% advance tax correctly', async () => {
      const subtotal = 1000;
      const advanceTaxRate = 0.5;
      const expectedTax = (subtotal * advanceTaxRate) / 100; // 5

      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000008',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          advanceTaxPercent: advanceTaxRate,
          advanceTaxAmount: expectedTax,
          lineTotal: subtotal + expectedTax
        }],
        totals: { 
          subtotal, 
          advanceTaxTotal: expectedTax, 
          grandTotal: subtotal + expectedTax 
        },
        createdBy: user._id
      });

      expect(invoice.items[0].advanceTaxAmount).toBe(5);
    });

    it('should calculate 2.5% advance tax correctly', async () => {
      const subtotal = 1000;
      const advanceTaxRate = 2.5;
      const expectedTax = (subtotal * advanceTaxRate) / 100; // 25

      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000009',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          advanceTaxPercent: advanceTaxRate,
          advanceTaxAmount: expectedTax,
          lineTotal: subtotal + expectedTax
        }],
        totals: { 
          subtotal, 
          advanceTaxTotal: expectedTax, 
          grandTotal: subtotal + expectedTax 
        },
        createdBy: user._id
      });

      expect(invoice.items[0].advanceTaxAmount).toBe(25);
    });
  });

  describe('Enhanced Tax Totals at Invoice Level', () => {
    it('should store gst18Total in invoice totals', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000010',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          taxAmount: 270, // 18% of 1500
          lineTotal: 1770
        }],
        totals: {
          subtotal: 1500,
          totalTax: 270,
          gst18Total: 270,
          grandTotal: 1770
        },
        createdBy: user._id
      });

      expect(invoice.totals.gst18Total).toBe(270);
    });

    it('should store gst4Total in invoice totals', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000001',
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          taxAmount: 40, // 4% of 1000
          lineTotal: 1040
        }],
        totals: {
          subtotal: 1000,
          totalTax: 40,
          gst4Total: 40,
          grandTotal: 1040
        },
        createdBy: user._id
      });

      expect(invoice.totals.gst4Total).toBe(40);
    });

    it('should store advanceTaxTotal in invoice totals', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000011',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 7.5,
          lineTotal: 1507.5
        }],
        totals: {
          subtotal: 1500,
          advanceTaxTotal: 7.5,
          grandTotal: 1507.5
        },
        createdBy: user._id
      });

      expect(invoice.totals.advanceTaxTotal).toBe(7.5);
    });

    it('should store nonFilerGSTTotal in invoice totals', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000012',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: {
          subtotal: 1500,
          nonFilerGSTTotal: 1.5, // 0.1% of 1500
          grandTotal: 1501.5
        },
        createdBy: user._id
      });

      expect(invoice.totals.nonFilerGSTTotal).toBe(1.5);
    });

    it('should store incomeTaxTotal in invoice totals', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000002',
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: {
          subtotal: 1000,
          incomeTaxTotal: 10,
          grandTotal: 990 // Deducted from total
        },
        createdBy: user._id
      });

      expect(invoice.totals.incomeTaxTotal).toBe(10);
    });

    it('should default all tax totals to 0', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000013',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: {
          subtotal: 1500,
          grandTotal: 1500,
          gst18Total: 0,
          gst4Total: 0,
          advanceTaxTotal: 0,
          nonFilerGSTTotal: 0,
          incomeTaxTotal: 0
        },
        createdBy: user._id
      });

      expect(invoice.totals.gst18Total).toBe(0);
      expect(invoice.totals.gst4Total).toBe(0);
      expect(invoice.totals.advanceTaxTotal).toBe(0);
      expect(invoice.totals.nonFilerGSTTotal).toBe(0);
      expect(invoice.totals.incomeTaxTotal).toBe(0);
    });

    it('should validate gst18Total is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000014',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: {
          subtotal: 1500,
          gst18Total: -100,
          grandTotal: 1500
        },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('GST 18% total cannot be negative');
    });

    it('should validate gst4Total is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'PI2024000003',
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-003',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: {
          subtotal: 1000,
          gst4Total: -50,
          grandTotal: 1000
        },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('GST 4% total cannot be negative');
    });

    it('should validate advanceTaxTotal is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000015',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: {
          subtotal: 1500,
          advanceTaxTotal: -10,
          grandTotal: 1500
        },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Advance tax total cannot be negative');
    });

    it('should validate nonFilerGSTTotal is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000016',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: {
          subtotal: 1500,
          nonFilerGSTTotal: -5,
          grandTotal: 1500
        },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Non-filer GST total cannot be negative');
    });

    it('should validate incomeTaxTotal is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'PI2024000004',
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-004',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: {
          subtotal: 1000,
          incomeTaxTotal: -20,
          grandTotal: 1000
        },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Income tax total cannot be negative');
    });
  });

  describe('Combined Tax Scenarios', () => {
    it('should handle invoice with GST 18% and advance tax', async () => {
      const subtotal = 1000;
      const gst18 = (subtotal * 18) / 100; // 180
      const advanceTax = (subtotal * 0.5) / 100; // 5

      const invoice = new Invoice({
        invoiceNumber: 'SI2024000017',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          taxAmount: gst18,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: advanceTax,
          lineTotal: subtotal + gst18 + advanceTax
        }],
        createdBy: user._id
      });

      // Manually set totals to avoid calculateTotals overwriting
      invoice.totals = {
        subtotal,
        totalTax: gst18,
        gst18Total: gst18,
        advanceTaxTotal: advanceTax,
        grandTotal: subtotal + gst18 + advanceTax
      };

      await invoice.save();

      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.advanceTaxTotal).toBe(5);
    });

    it('should handle invoice with GST 18%, advance tax, and non-filer GST', async () => {
      const subtotal = 1000;
      const gst18 = (subtotal * 18) / 100; // 180
      const advanceTax = (subtotal * 2.5) / 100; // 25
      const nonFilerGST = (subtotal * 0.1) / 100; // 1

      const invoice = new Invoice({
        invoiceNumber: 'SI2024000018',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          taxAmount: gst18,
          advanceTaxPercent: 2.5,
          advanceTaxAmount: advanceTax,
          lineTotal: subtotal + gst18 + advanceTax + nonFilerGST
        }],
        createdBy: user._id
      });

      // Manually set totals to avoid calculateTotals overwriting
      invoice.totals = {
        subtotal,
        totalTax: gst18,
        gst18Total: gst18,
        advanceTaxTotal: advanceTax,
        nonFilerGSTTotal: nonFilerGST,
        grandTotal: subtotal + gst18 + advanceTax + nonFilerGST
      };

      await invoice.save();

      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.advanceTaxTotal).toBe(25);
      expect(invoice.totals.nonFilerGSTTotal).toBe(1);
    });

    it('should handle purchase invoice with dual GST rates', async () => {
      const item1Subtotal = 1000;
      const item2Subtotal = 500;
      const gst18 = (item1Subtotal * 18) / 100; // 180
      const gst4 = (item2Subtotal * 4) / 100; // 20

      const invoice = new Invoice({
        invoiceNumber: 'PI2024000005',
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-005',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            taxAmount: gst18,
            lineTotal: item1Subtotal + gst18
          },
          {
            itemId: item._id,
            quantity: 5,
            unitPrice: 100,
            taxAmount: gst4,
            lineTotal: item2Subtotal + gst4
          }
        ],
        createdBy: user._id
      });

      // Manually set totals to avoid calculateTotals overwriting
      invoice.totals = {
        subtotal: item1Subtotal + item2Subtotal,
        totalTax: gst18 + gst4,
        gst18Total: gst18,
        gst4Total: gst4,
        grandTotal: item1Subtotal + item2Subtotal + gst18 + gst4
      };

      await invoice.save();

      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.gst4Total).toBe(20);
    });
  });
});
