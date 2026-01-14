const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model - Tax Calculation (Requirement 6.1, 6.2, 6.3, 6.4)', () => {
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
        advanceTaxRate: 0,
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

  describe('GST Calculation (Requirement 6.1, 6.2)', () => {
    it('should calculate 18% GST correctly for sales invoice', async () => {
      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1180
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.items[0].gstAmount).toBe(180); // 18% of 1000
      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.gst4Total).toBe(0);
    });

    it('should calculate 4% GST correctly for purchase invoice', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 4,
          lineTotal: 1040
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 40,
          grandTotal: 1040
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.items[0].gstAmount).toBe(40); // 4% of 1000
      expect(invoice.totals.gst4Total).toBe(40);
      expect(invoice.totals.gst18Total).toBe(0);
    });

    it('should handle mixed GST rates in single invoice', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            lineTotal: 1180
          },
          {
            itemId: item._id,
            quantity: 5,
            unitPrice: 100,
            discount: 0,
            gstRate: 4,
            lineTotal: 520
          }
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 200,
          grandTotal: 1700
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.totals.gst18Total).toBe(180); // 18% of 1000
      expect(invoice.totals.gst4Total).toBe(20); // 4% of 500
      expect(invoice.totals.totalTax).toBe(200);
    });
  });

  describe('Advance Tax Calculation (Requirement 6.3)', () => {
    it('should calculate 0.5% advance tax for registered customer', async () => {
      // Update customer with advance tax rate
      customer.financialInfo.advanceTaxRate = 0.5;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1185
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 185,
          grandTotal: 1185
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.items[0].advanceTaxPercent).toBe(0.5);
      expect(invoice.items[0].advanceTaxAmount).toBe(5); // 0.5% of 1000
      expect(invoice.totals.advanceTaxTotal).toBe(5);
      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.totalTax).toBe(185); // GST + Advance Tax
    });

    it('should calculate 2.5% advance tax for unregistered customer', async () => {
      // Update customer with higher advance tax rate
      customer.financialInfo.advanceTaxRate = 2.5;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1205
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 205,
          grandTotal: 1205
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.items[0].advanceTaxPercent).toBe(2.5);
      expect(invoice.items[0].advanceTaxAmount).toBe(25); // 2.5% of 1000
      expect(invoice.totals.advanceTaxTotal).toBe(25);
      expect(invoice.totals.totalTax).toBe(205); // GST + Advance Tax
    });

    it('should not calculate advance tax when rate is 0', async () => {
      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1180
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.totals.advanceTaxTotal).toBe(0);
      expect(invoice.totals.totalTax).toBe(180); // Only GST
    });
  });

  describe('Non-Filer GST Calculation (Requirement 6.4)', () => {
    it('should calculate 0.1% non-filer GST for non-filer customer', async () => {
      // Mark customer as non-filer
      customer.financialInfo.isNonFiler = true;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1181
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 181,
          grandTotal: 1181
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.totals.nonFilerGSTTotal).toBe(1); // 0.1% of 1000
      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.totalTax).toBe(181); // GST + Non-filer GST
    });

    it('should not calculate non-filer GST for registered filer', async () => {
      // Ensure customer is not a non-filer
      customer.financialInfo.isNonFiler = false;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1180
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.totals.nonFilerGSTTotal).toBe(0);
      expect(invoice.totals.totalTax).toBe(180); // Only GST
    });
  });

  describe('Combined Tax Scenarios', () => {
    it('should calculate all taxes for non-filer with advance tax', async () => {
      // Set customer as non-filer with advance tax
      customer.financialInfo.advanceTaxRate = 2.5;
      customer.financialInfo.isNonFiler = true;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1206
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 206,
          grandTotal: 1206
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.totals.gst18Total).toBe(180); // 18% of 1000
      expect(invoice.items[0].advanceTaxAmount).toBe(25); // 2.5% of 1000
      expect(invoice.totals.advanceTaxTotal).toBe(25);
      expect(invoice.totals.nonFilerGSTTotal).toBe(1); // 0.1% of 1000
      expect(invoice.totals.totalTax).toBe(206); // 180 + 25 + 1
    });

    it('should calculate taxes correctly with discounts applied', async () => {
      // Set customer with advance tax
      customer.financialInfo.advanceTaxRate = 0.5;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 10, // 10% discount
          gstRate: 18,
          lineTotal: 1066.5
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 100,
          totalTax: 166.5,
          grandTotal: 1066.5
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      const taxableAmount = 900; // 1000 - 100 (discount)
      expect(invoice.totals.subtotal).toBe(1000);
      expect(invoice.totals.totalDiscount).toBe(100);
      expect(invoice.items[0].gstAmount).toBe(162); // 18% of 900
      expect(invoice.items[0].advanceTaxAmount).toBe(4.5); // 0.5% of 900
      expect(invoice.totals.totalTax).toBe(166.5);
    });

    it('should handle multiple items with different tax configurations', async () => {
      // Set customer with advance tax and non-filer status
      customer.financialInfo.advanceTaxRate = 0.5;
      customer.financialInfo.isNonFiler = true;
      await customer.save();

      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            lineTotal: 1185.5
          },
          {
            itemId: item._id,
            quantity: 5,
            unitPrice: 200,
            discount: 0,
            gstRate: 18,
            lineTotal: 1185.5
          }
        ],
        totals: {
          subtotal: 2000,
          totalDiscount: 0,
          totalTax: 371,
          grandTotal: 2371
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      // Item 1: 1000 taxable
      expect(invoice.items[0].gstAmount).toBe(180); // 18% of 1000
      expect(invoice.items[0].advanceTaxAmount).toBe(5); // 0.5% of 1000

      // Item 2: 1000 taxable
      expect(invoice.items[1].gstAmount).toBe(180); // 18% of 1000
      expect(invoice.items[1].advanceTaxAmount).toBe(5); // 0.5% of 1000

      // Totals
      expect(invoice.totals.gst18Total).toBe(360); // 180 + 180
      expect(invoice.totals.advanceTaxTotal).toBe(10); // 5 + 5
      expect(invoice.totals.nonFilerGSTTotal).toBe(2); // 0.1% of 2000
      expect(invoice.totals.totalTax).toBe(372); // 360 + 10 + 2
    });
  });

  describe('Purchase Invoice Tax Calculation', () => {
    it('should calculate taxes for purchase invoice with supplier advance tax', async () => {
      // Set supplier with advance tax
      supplier.financialInfo.advanceTaxRate = 0.5;
      await supplier.save();

      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-003',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          lineTotal: 1185
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 185,
          grandTotal: 1185
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.items[0].gstAmount).toBe(180); // 18% of 1000
      expect(invoice.items[0].advanceTaxAmount).toBe(5); // 0.5% of 1000
      expect(invoice.totals.advanceTaxTotal).toBe(5);
      expect(invoice.totals.totalTax).toBe(185);
    });
  });
});
