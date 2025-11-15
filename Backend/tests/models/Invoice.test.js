const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model', () => {
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
      type: 'customer'
    });

    supplier = await Supplier.create({
      name: 'Test Supplier',
      type: 'supplier'
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

  describe('Schema Validation', () => {
    it('should create a valid sales invoice', async () => {
      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount: 5,
          taxAmount: 20,
          lineTotal: 1445 // (10 * 150) - (1500 * 0.05) + 20
        }],
        totals: {
          subtotal: 1500,
          totalDiscount: 75,
          totalTax: 20,
          grandTotal: 1445
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();

      expect(savedInvoice.type).toBe('sales');
      expect(savedInvoice.customerId.toString()).toBe(customer._id.toString());
      expect(savedInvoice.status).toBe('draft');
      expect(savedInvoice.paymentStatus).toBe('pending');
      expect(savedInvoice.invoiceNumber).toMatch(/^SI\d{4}\d{6}$/);
    });

    it('should create a valid purchase invoice', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          discount: 0,
          taxAmount: 10,
          lineTotal: 510
        }],
        totals: {
          subtotal: 500,
          totalDiscount: 0,
          totalTax: 10,
          grandTotal: 510
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();

      expect(savedInvoice.type).toBe('purchase');
      expect(savedInvoice.supplierId.toString()).toBe(supplier._id.toString());
      expect(savedInvoice.invoiceNumber).toMatch(/^PI\d{4}\d{6}$/);
    });

    it('should require customer for sales invoice', async () => {
      const invoiceData = {
        type: 'sales',
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
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow('Customer ID is required for sales invoices');
    });

    it('should require supplier for purchase invoice', async () => {
      const invoiceData = {
        type: 'purchase',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          lineTotal: 500
        }],
        totals: { subtotal: 500, grandTotal: 500 },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow('Supplier ID is required for purchase invoices');
    });

    it('should require at least one item', async () => {
      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [],
        totals: { subtotal: 0, grandTotal: 0 },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow('Invoice must contain at least one item');
    });

    it('should validate due date is not before invoice date', async () => {
      const invoiceData = {
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow('Due date cannot be before invoice date');
    });
  });

  describe('Virtuals', () => {
    let invoice;

    beforeEach(async () => {
      invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });
    });

    it('should calculate days until due', () => {
      expect(invoice.daysUntilDue).toBe(5);
    });

    it('should determine overdue status', () => {
      expect(invoice.isOverdue).toBe(false);

      // Set due date to yesterday
      invoice.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(invoice.isOverdue).toBe(true);

      // Mark as paid
      invoice.paymentStatus = 'paid';
      expect(invoice.isOverdue).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    let invoice;

    beforeEach(async () => {
      invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount: 10,
          taxAmount: 20,
          lineTotal: 1370
        }],
        totals: { subtotal: 1500, totalDiscount: 150, totalTax: 20, grandTotal: 1370 },
        createdBy: user._id
      });
      await invoice.save();
    });

    it('should calculate totals correctly', () => {
      const totals = invoice.calculateTotals();
      expect(totals.subtotal).toBe(1500);
      expect(totals.totalDiscount).toBe(150);
      expect(totals.totalTax).toBe(20);
      expect(totals.grandTotal).toBe(1370);
    });

    it('should add item', () => {
      const newItem = {
        itemId: item._id,
        quantity: 5,
        unitPrice: 100,
        discount: 0,
        taxAmount: 10,
        lineTotal: 510
      };

      invoice.addItem(newItem);
      expect(invoice.items).toHaveLength(2);
    });

    it('should remove item', () => {
      invoice.removeItem(item._id);
      expect(invoice.items).toHaveLength(0);
    });

    it('should confirm invoice', async () => {
      await invoice.confirm();
      expect(invoice.status).toBe('confirmed');
    });

    it('should mark as paid', async () => {
      await invoice.markAsPaid();
      expect(invoice.paymentStatus).toBe('paid');
      expect(invoice.status).toBe('paid');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const overdueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      await Invoice.create([
        {
          type: 'sales',
          customerId: customer._id,
          invoiceDate: new Date(),
          dueDate: overdueDate,
          items: [{ itemId: item._id, quantity: 1, unitPrice: 100, lineTotal: 100 }],
          totals: { subtotal: 100, grandTotal: 100 },
          paymentStatus: 'pending',
          createdBy: user._id
        },
        {
          type: 'sales',
          customerId: customer._id,
          invoiceDate: new Date(),
          dueDate: futureDate,
          items: [{ itemId: item._id, quantity: 1, unitPrice: 100, lineTotal: 100 }],
          totals: { subtotal: 100, grandTotal: 100 },
          paymentStatus: 'pending',
          createdBy: user._id
        },
        {
          type: 'purchase',
          supplierId: supplier._id,
          invoiceDate: new Date(),
          dueDate: overdueDate,
          items: [{ itemId: item._id, quantity: 1, unitPrice: 100, lineTotal: 100 }],
          totals: { subtotal: 100, grandTotal: 100 },
          paymentStatus: 'paid',
          createdBy: user._id
        }
      ]);
    });

    it('should find overdue invoices', async () => {
      const overdueInvoices = await Invoice.findOverdueInvoices();
      expect(overdueInvoices).toHaveLength(1); // Only the unpaid overdue invoice
    });

    it('should find invoices by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const invoices = await Invoice.findByDateRange(yesterday, tomorrow);
      expect(invoices).toHaveLength(3); // All invoices created today
    });

    it('should generate invoice number', async () => {
      const salesNumber = await Invoice.generateInvoiceNumber('sales');
      expect(salesNumber).toMatch(/^SI\d{4}\d{6}$/);

      const purchaseNumber = await Invoice.generateInvoiceNumber('purchase');
      expect(purchaseNumber).toMatch(/^PI\d{4}\d{6}$/);
    });
  });
});