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

  describe('Print-Related Fields - Phase 2 (Requirement 1.11)', () => {
    it('should accept valid printFormat values', async () => {
      const validFormats = ['standard', 'logo', 'letterhead', 'thermal', 'estimate', 'voucher', 'store_copy', 'tax_invoice', 'warranty_bill'];

      for (const format of validFormats) {
        const invoiceData = {
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
          printFormat: format,
          createdBy: user._id
        };

        const invoice = new Invoice(invoiceData);
        const savedInvoice = await invoice.save();
        expect(savedInvoice.printFormat).toBe(format);
        
        // Clean up for next iteration
        await Invoice.findByIdAndDelete(savedInvoice._id);
      }
    });

    it('should reject invalid printFormat values', async () => {
      const invoiceData = {
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
        printFormat: 'invalid_format',
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow();
    });

    it('should default printFormat to standard', async () => {
      const invoiceData = {
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
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      expect(savedInvoice.printFormat).toBe('standard');
    });

    it('should store warrantyInfo text', async () => {
      const warrantyText = '12 months manufacturer warranty on all electronic components';
      const invoiceData = {
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
        warrantyInfo: warrantyText,
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      expect(savedInvoice.warrantyInfo).toBe(warrantyText);
    });

    it('should validate warrantyInfo maxlength', async () => {
      const longWarranty = 'a'.repeat(501); // Exceeds 500 character limit

      const invoiceData = {
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
        warrantyInfo: longWarranty,
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow();
    });

    it('should store warrantyPaste boolean flag', async () => {
      const invoiceData = {
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
        warrantyInfo: 'Standard warranty applies',
        warrantyPaste: true,
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      expect(savedInvoice.warrantyPaste).toBe(true);
    });

    it('should default warrantyPaste to false', async () => {
      const invoiceData = {
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
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      expect(savedInvoice.warrantyPaste).toBe(false);
    });

    it('should store businessLogo URL', async () => {
      const logoUrl = 'https://example.com/logo.png';
      const invoiceData = {
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
        businessLogo: logoUrl,
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      expect(savedInvoice.businessLogo).toBe(logoUrl);
    });

    it('should store businessLogo as base64 string', async () => {
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const invoiceData = {
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
        businessLogo: base64Logo,
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      expect(savedInvoice.businessLogo).toBe(base64Logo);
    });

    it('should create invoice with all print-related fields', async () => {
      const invoiceData = {
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
        printFormat: 'warranty_bill',
        warrantyInfo: '12 months warranty on all parts and labor',
        warrantyPaste: true,
        businessLogo: 'https://example.com/logo.png',
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();
      
      expect(savedInvoice.printFormat).toBe('warranty_bill');
      expect(savedInvoice.warrantyInfo).toBe('12 months warranty on all parts and labor');
      expect(savedInvoice.warrantyPaste).toBe(true);
      expect(savedInvoice.businessLogo).toBe('https://example.com/logo.png');
    });
  });

  describe('Return Invoice Support - Phase 2', () => {
    let originalSalesInvoice, originalPurchaseInvoice;

    beforeEach(async () => {
      // Create original sales invoice
      originalSalesInvoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount: 5,
          taxAmount: 20,
          lineTotal: 1445
        }],
        totals: {
          subtotal: 1500,
          totalDiscount: 75,
          totalTax: 20,
          grandTotal: 1445
        },
        createdBy: user._id
      });

      // Create original purchase invoice
      originalPurchaseInvoice = await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-001',
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
      });
    });

    it('should create a valid return_sales invoice with originalInvoiceId', async () => {
      const returnInvoiceData = {
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalSalesInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 150,
          discount: 5,
          taxAmount: 6,
          lineTotal: -433.5
        }],
        totals: {
          subtotal: -450,
          totalDiscount: -22.5,
          totalTax: -6,
          grandTotal: -433.5
        },
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: 'Items were damaged during shipping',
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      const savedReturnInvoice = await returnInvoice.save();

      expect(savedReturnInvoice.type).toBe('return_sales');
      expect(savedReturnInvoice.originalInvoiceId.toString()).toBe(originalSalesInvoice._id.toString());
      expect(savedReturnInvoice.returnMetadata.returnReason).toBe('damaged');
      expect(savedReturnInvoice.returnMetadata.returnNotes).toBe('Items were damaged during shipping');
      expect(savedReturnInvoice.invoiceNumber).toMatch(/^SI\d{4}\d{6}$/);
    });

    it('should create a valid return_purchase invoice with originalInvoiceId', async () => {
      const returnInvoiceData = {
        type: 'return_purchase',
        supplierId: supplier._id,
        supplierBillNo: 'RET-SUP-001',
        originalInvoiceId: originalPurchaseInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 2,
          unitPrice: 100,
          discount: 0,
          taxAmount: 4,
          lineTotal: -204
        }],
        totals: {
          subtotal: -200,
          totalDiscount: 0,
          totalTax: -4,
          grandTotal: -204
        },
        returnMetadata: {
          returnReason: 'wrong_item',
          returnNotes: 'Wrong items were delivered',
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      const savedReturnInvoice = await returnInvoice.save();

      expect(savedReturnInvoice.type).toBe('return_purchase');
      expect(savedReturnInvoice.originalInvoiceId.toString()).toBe(originalPurchaseInvoice._id.toString());
      expect(savedReturnInvoice.returnMetadata.returnReason).toBe('wrong_item');
      expect(savedReturnInvoice.supplierBillNo).toBe('RET-SUP-001');
      expect(savedReturnInvoice.invoiceNumber).toMatch(/^PI\d{4}\d{6}$/);
    });

    it('should require originalInvoiceId for return_sales invoice', async () => {
      const returnInvoiceData = {
        type: 'return_sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 150,
          lineTotal: -450
        }],
        totals: { subtotal: -450, grandTotal: -450 },
        returnMetadata: {
          returnReason: 'damaged',
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      await expect(returnInvoice.save()).rejects.toThrow('Original invoice ID is required for return invoices');
    });

    it('should require originalInvoiceId for return_purchase invoice', async () => {
      const returnInvoiceData = {
        type: 'return_purchase',
        supplierId: supplier._id,
        supplierBillNo: 'RET-SUP-002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 2,
          unitPrice: 100,
          lineTotal: -200
        }],
        totals: { subtotal: -200, grandTotal: -200 },
        returnMetadata: {
          returnReason: 'expired',
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      await expect(returnInvoice.save()).rejects.toThrow('Original invoice ID is required for return invoices');
    });

    it('should require returnMetadata for return invoices', async () => {
      const returnInvoiceData = {
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalSalesInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 150,
          lineTotal: -450
        }],
        totals: { subtotal: -450, grandTotal: -450 },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      await expect(returnInvoice.save()).rejects.toThrow('Return metadata is required for return invoices');
    });

    it('should validate returnReason enum values', async () => {
      const returnInvoiceData = {
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalSalesInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 150,
          lineTotal: -450
        }],
        totals: { subtotal: -450, grandTotal: -450 },
        returnMetadata: {
          returnReason: 'invalid_reason',
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      await expect(returnInvoice.save()).rejects.toThrow();
    });

    it('should accept all valid returnReason values', async () => {
      const validReasons = ['damaged', 'expired', 'wrong_item', 'quality_issue', 'other'];

      for (const reason of validReasons) {
        const returnInvoiceData = {
          type: 'return_sales',
          customerId: customer._id,
          originalInvoiceId: originalSalesInvoice._id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [{
            itemId: item._id,
            quantity: 1,
            unitPrice: 150,
            lineTotal: -150
          }],
          totals: { subtotal: -150, grandTotal: -150 },
          returnMetadata: {
            returnReason: reason,
            returnDate: new Date()
          },
          createdBy: user._id
        };

        const returnInvoice = new Invoice(returnInvoiceData);
        const savedInvoice = await returnInvoice.save();
        expect(savedInvoice.returnMetadata.returnReason).toBe(reason);
        
        // Clean up for next iteration
        await Invoice.findByIdAndDelete(savedInvoice._id);
      }
    });

    it('should validate returnNotes maxlength', async () => {
      const longNotes = 'a'.repeat(501); // Exceeds 500 character limit

      const returnInvoiceData = {
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalSalesInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 150,
          lineTotal: -450
        }],
        totals: { subtotal: -450, grandTotal: -450 },
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: longNotes,
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      await expect(returnInvoice.save()).rejects.toThrow();
    });

    it('should allow linking return invoice to original invoice', async () => {
      const returnInvoice = await Invoice.create({
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalSalesInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 150,
          lineTotal: -450
        }],
        totals: { subtotal: -450, grandTotal: -450 },
        returnMetadata: {
          returnReason: 'damaged',
          returnDate: new Date()
        },
        createdBy: user._id
      });

      const populatedReturn = await Invoice.findById(returnInvoice._id).populate('originalInvoiceId');
      expect(populatedReturn.originalInvoiceId._id.toString()).toBe(originalSalesInvoice._id.toString());
      expect(populatedReturn.originalInvoiceId.type).toBe('sales');
    });

    it('should require supplierBillNo for return_purchase invoice', async () => {
      const returnInvoiceData = {
        type: 'return_purchase',
        supplierId: supplier._id,
        originalInvoiceId: originalPurchaseInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 2,
          unitPrice: 100,
          lineTotal: -200
        }],
        totals: { subtotal: -200, grandTotal: -200 },
        returnMetadata: {
          returnReason: 'expired',
          returnDate: new Date()
        },
        createdBy: user._id
      };

      const returnInvoice = new Invoice(returnInvoiceData);
      await expect(returnInvoice.save()).rejects.toThrow('Supplier bill number is required for purchase invoices');
    });
  });
});