const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model - Phase 2 Enhancements', () => {
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

  describe('Return Invoice Support (Requirement 1.1, 1.9)', () => {
    it('should create a return_sales invoice', async () => {
      // First create original sales invoice
      const originalInvoice = await Invoice.create({
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

      // Create return invoice
      const returnInvoice = new Invoice({
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 150,
          lineTotal: -750
        }],
        totals: { subtotal: -750, grandTotal: -750 },
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: 'Item arrived damaged',
          returnDate: new Date()
        },
        createdBy: user._id
      });

      const savedReturn = await returnInvoice.save();
      expect(savedReturn.type).toBe('return_sales');
      expect(savedReturn.originalInvoiceId.toString()).toBe(originalInvoice._id.toString());
      expect(savedReturn.returnMetadata.returnReason).toBe('damaged');
    });

    it('should create a return_purchase invoice', async () => {
      const originalInvoice = await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: { subtotal: 1000, grandTotal: 1000 },
        createdBy: user._id
      });

      const returnInvoice = new Invoice({
        type: 'return_purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP001-RET',
        originalInvoiceId: originalInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          lineTotal: -500
        }],
        totals: { subtotal: -500, grandTotal: -500 },
        returnMetadata: {
          returnReason: 'quality_issue',
          returnNotes: 'Poor quality',
          returnDate: new Date()
        },
        createdBy: user._id
      });

      const savedReturn = await returnInvoice.save();
      expect(savedReturn.type).toBe('return_purchase');
      expect(savedReturn.originalInvoiceId.toString()).toBe(originalInvoice._id.toString());
    });

    it('should require originalInvoiceId for return invoices', async () => {
      const returnInvoice = new Invoice({
        type: 'return_sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 150,
          lineTotal: -750
        }],
        totals: { subtotal: -750, grandTotal: -750 },
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: 'Item arrived damaged',
          returnDate: new Date()
        },
        createdBy: user._id
      });

      await expect(returnInvoice.save()).rejects.toThrow('Original invoice ID is required for return invoices');
    });

    it('should require returnMetadata for return invoices', async () => {
      const originalInvoice = await Invoice.create({
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

      const returnInvoice = new Invoice({
        type: 'return_sales',
        customerId: customer._id,
        originalInvoiceId: originalInvoice._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 150,
          lineTotal: -750
        }],
        totals: { subtotal: -750, grandTotal: -750 },
        createdBy: user._id
      });

      await expect(returnInvoice.save()).rejects.toThrow('Return metadata is required for return invoices');
    });

    it('should validate return reason enum', async () => {
      const originalInvoice = await Invoice.create({
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

      const validReasons = ['damaged', 'expired', 'wrong_item', 'quality_issue', 'other'];
      
      for (const reason of validReasons) {
        const returnInvoice = new Invoice({
          type: 'return_sales',
          customerId: customer._id,
          originalInvoiceId: originalInvoice._id,
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
            returnNotes: 'Test return',
            returnDate: new Date()
          },
          createdBy: user._id
        });

        const saved = await returnInvoice.save();
        expect(saved.returnMetadata.returnReason).toBe(reason);
      }
    });
  });

  describe('Sales-Specific Phase 2 Fields (Requirement 1.10, 1.11)', () => {
    it('should store salesman ID', async () => {
      const salesmanId = new mongoose.Types.ObjectId();
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        salesmanId,
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

      expect(invoice.salesmanId.toString()).toBe(salesmanId.toString());
    });

    it('should store PO number and ID', async () => {
      const poId = new mongoose.Types.ObjectId();
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        poNumber: 'PO-2024-001',
        poId,
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

      expect(invoice.poNumber).toBe('PO-2024-001');
      expect(invoice.poId.toString()).toBe(poId.toString());
    });

    it('should store adjustment and claim account IDs', async () => {
      const adjustmentAccountId = new mongoose.Types.ObjectId();
      const claimAccountId = new mongoose.Types.ObjectId();
      
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        adjustmentAccountId,
        claimAccountId,
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

      expect(invoice.adjustmentAccountId.toString()).toBe(adjustmentAccountId.toString());
      expect(invoice.claimAccountId.toString()).toBe(claimAccountId.toString());
    });

    it('should store memo number and credit days', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        memoNo: 'MEMO-001',
        creditDays: 30,
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

      expect(invoice.memoNo).toBe('MEMO-001');
      expect(invoice.creditDays).toBe(30);
    });

    it('should store warranty information', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        warrantyInfo: '12 months warranty on parts and labor',
        warrantyPaste: true,
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

      expect(invoice.warrantyInfo).toBe('12 months warranty on parts and labor');
      expect(invoice.warrantyPaste).toBe(true);
    });

    it('should store business logo', async () => {
      const logoUrl = 'https://example.com/logo.png';
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        businessLogo: logoUrl,
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

      expect(invoice.businessLogo).toBe(logoUrl);
    });

    it('should validate poNumber maxlength', async () => {
      const longPoNumber = 'a'.repeat(51); // Exceeds 50 character limit

      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        poNumber: longPoNumber,
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

      await expect(invoice.save()).rejects.toThrow('PO number cannot exceed 50 characters');
    });

    it('should validate memoNo maxlength', async () => {
      const longMemoNo = 'a'.repeat(51); // Exceeds 50 character limit

      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        memoNo: longMemoNo,
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

      await expect(invoice.save()).rejects.toThrow('Memo number cannot exceed 50 characters');
    });

    it('should validate creditDays is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        creditDays: -10,
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

      await expect(invoice.save()).rejects.toThrow('Credit days cannot be negative');
    });

    it('should validate warrantyInfo maxlength', async () => {
      const longWarrantyInfo = 'a'.repeat(501); // Exceeds 500 character limit

      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        warrantyInfo: longWarrantyInfo,
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

      await expect(invoice.save()).rejects.toThrow('Warranty info cannot exceed 500 characters');
    });

    it('should default warrantyPaste to false', async () => {
      const invoice = await Invoice.create({
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

      expect(invoice.warrantyPaste).toBe(false);
    });

    it('should default creditDays to 0', async () => {
      const invoice = await Invoice.create({
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

      expect(invoice.creditDays).toBe(0);
    });
  });

  describe('Box/Unit Quantity Support (Requirement 1.4, 1.3)', () => {
    it('should store box and unit quantities in items', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          boxQuantity: 2,
          unitQuantity: 5,
          boxRate: 500,
          unitRate: 50,
          lineTotal: 1250
        }],
        totals: { subtotal: 1250, grandTotal: 1250 },
        createdBy: user._id
      });

      expect(invoice.items[0].boxQuantity).toBe(2);
      expect(invoice.items[0].unitQuantity).toBe(5);
      expect(invoice.items[0].boxRate).toBe(500);
      expect(invoice.items[0].unitRate).toBe(50);
    });

    it('should validate box and unit quantities are non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          boxQuantity: -1,
          unitQuantity: 5,
          boxRate: 500,
          unitRate: 50,
          lineTotal: 1250
        }],
        totals: { subtotal: 1250, grandTotal: 1250 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Box quantity cannot be negative');
    });

    it('should store carton quantity at invoice level', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        cartonQty: 5,
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

      expect(invoice.cartonQty).toBe(5);
    });

    it('should validate unit quantities are non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          boxQuantity: 2,
          unitQuantity: -5,
          boxRate: 500,
          unitRate: 50,
          lineTotal: 1250
        }],
        totals: { subtotal: 1250, grandTotal: 1250 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Unit quantity cannot be negative');
    });

    it('should validate box rate is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          boxQuantity: 2,
          unitQuantity: 5,
          boxRate: -500,
          unitRate: 50,
          lineTotal: 1250
        }],
        totals: { subtotal: 1250, grandTotal: 1250 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Box rate cannot be negative');
    });

    it('should validate unit rate is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          boxQuantity: 2,
          unitQuantity: 5,
          boxRate: 500,
          unitRate: -50,
          lineTotal: 1250
        }],
        totals: { subtotal: 1250, grandTotal: 1250 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Unit rate cannot be negative');
    });

    it('should validate carton quantity is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        cartonQty: -5,
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

      await expect(invoice.save()).rejects.toThrow('Carton quantity cannot be negative');
    });

    it('should default box and unit quantities to 0', async () => {
      const invoice = await Invoice.create({
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

      expect(invoice.items[0].boxQuantity).toBe(0);
      expect(invoice.items[0].unitQuantity).toBe(0);
      expect(invoice.items[0].boxRate).toBe(0);
      expect(invoice.items[0].unitRate).toBe(0);
    });

    it('should default cartonQty to 0', async () => {
      const invoice = await Invoice.create({
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

      expect(invoice.cartonQty).toBe(0);
    });

    it('should calculate line total with box and unit quantities', async () => {
      // Line total = (boxQty × boxRate) + (unitQty × unitRate)
      // = (2 × 500) + (5 × 50) = 1000 + 250 = 1250
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          boxQuantity: 2,
          unitQuantity: 5,
          boxRate: 500,
          unitRate: 50,
          lineTotal: 1250
        }],
        totals: { subtotal: 1250, grandTotal: 1250 },
        createdBy: user._id
      });

      const expectedLineTotal = (2 * 500) + (5 * 50);
      expect(invoice.items[0].lineTotal).toBe(expectedLineTotal);
    });
  });

  describe('Scheme and Discount Fields (Requirement 1.5, 1.6)', () => {
    it('should store scheme quantities in items', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          scheme1Quantity: 2,
          scheme2Quantity: 1,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.items[0].scheme1Quantity).toBe(2);
      expect(invoice.items[0].scheme2Quantity).toBe(1);
    });

    it('should validate scheme quantities are non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          scheme1Quantity: -1,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Scheme 1 quantity cannot be negative');
    });

    it('should store multi-level discount fields in items', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount1Percent: 5,
          discount1Amount: 75,
          discount2Percent: 2,
          discount2Amount: 28.5,
          lineTotal: 1396.5
        }],
        totals: { subtotal: 1500, totalDiscount: 103.5, grandTotal: 1396.5 },
        createdBy: user._id
      });

      expect(invoice.items[0].discount1Percent).toBe(5);
      expect(invoice.items[0].discount1Amount).toBe(75);
      expect(invoice.items[0].discount2Percent).toBe(2);
      expect(invoice.items[0].discount2Amount).toBe(28.5);
    });

    it('should validate discount percentages are within range', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount1Percent: 150,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 1 percent cannot exceed 100%');
    });

    it('should validate scheme2Quantity is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          scheme2Quantity: -2,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Scheme 2 quantity cannot be negative');
    });

    it('should validate discount1Amount is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount1Amount: -50,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 1 amount cannot be negative');
    });

    it('should validate discount2Amount is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount2Amount: -30,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 2 amount cannot be negative');
    });

    it('should validate discount1Percent is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount1Percent: -5,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 1 percent cannot be negative');
    });

    it('should validate discount2Percent is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount2Percent: -3,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 2 percent cannot be negative');
    });

    it('should validate discount2Percent does not exceed 100%', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          discount2Percent: 120,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 2 percent cannot exceed 100%');
    });

    it('should default scheme quantities to 0', async () => {
      const invoice = await Invoice.create({
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

      expect(invoice.items[0].scheme1Quantity).toBe(0);
      expect(invoice.items[0].scheme2Quantity).toBe(0);
    });

    it('should default discount fields to 0', async () => {
      const invoice = await Invoice.create({
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

      expect(invoice.items[0].discount1Percent).toBe(0);
      expect(invoice.items[0].discount1Amount).toBe(0);
      expect(invoice.items[0].discount2Percent).toBe(0);
      expect(invoice.items[0].discount2Amount).toBe(0);
    });

    it('should handle combined schemes and discounts', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 12,
          unitPrice: 100,
          scheme1Quantity: 1, // Buy 12 get 1 free
          scheme2Quantity: 0,
          discount1Percent: 5,
          discount1Amount: 60, // 5% of 1200
          discount2Percent: 2,
          discount2Amount: 22.8, // 2% of (1200 - 60)
          lineTotal: 1117.2 // 1200 - 60 - 22.8
        }],
        totals: { subtotal: 1200, totalDiscount: 82.8, grandTotal: 1117.2 },
        createdBy: user._id
      });

      expect(invoice.items[0].quantity).toBe(12);
      expect(invoice.items[0].scheme1Quantity).toBe(1);
      expect(invoice.items[0].discount1Percent).toBe(5);
      expect(invoice.items[0].discount2Percent).toBe(2);
      expect(invoice.items[0].lineTotal).toBe(1117.2);
    });

    it('should handle claim-based scheme (scheme2) with discount2', async () => {
      const claimAccountId = new mongoose.Types.ObjectId();
      
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        claimAccountId, // Required for claim-based discounts/schemes
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 24,
          unitPrice: 100,
          scheme1Quantity: 2, // Regular scheme
          scheme2Quantity: 1, // Claim-based scheme
          discount1Percent: 5,
          discount1Amount: 120,
          discount2Percent: 7.69, // Claim-based discount
          discount2Amount: 175.4,
          lineTotal: 2104.6
        }],
        totals: { subtotal: 2400, totalDiscount: 295.4, grandTotal: 2104.6 },
        createdBy: user._id
      });

      expect(invoice.items[0].scheme2Quantity).toBe(1);
      expect(invoice.items[0].discount2Percent).toBe(7.69);
      expect(invoice.claimAccountId.toString()).toBe(claimAccountId.toString());
    });

    it('should allow zero values for all scheme and discount fields', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          scheme1Quantity: 0,
          scheme2Quantity: 0,
          discount1Percent: 0,
          discount1Amount: 0,
          discount2Percent: 0,
          discount2Amount: 0,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.items[0].scheme1Quantity).toBe(0);
      expect(invoice.items[0].scheme2Quantity).toBe(0);
      expect(invoice.items[0].discount1Percent).toBe(0);
      expect(invoice.items[0].discount1Amount).toBe(0);
      expect(invoice.items[0].discount2Percent).toBe(0);
      expect(invoice.items[0].discount2Amount).toBe(0);
    });

    it('should store scheme and discount data for purchase invoices', async () => {
      const invoice = await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-2024-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 50,
          unitPrice: 80,
          scheme1Quantity: 5, // Supplier bonus
          discount1Percent: 10,
          discount1Amount: 400,
          discount2Percent: 5,
          discount2Amount: 180,
          lineTotal: 3420
        }],
        totals: { subtotal: 4000, totalDiscount: 580, grandTotal: 3420 },
        createdBy: user._id
      });

      expect(invoice.items[0].scheme1Quantity).toBe(5);
      expect(invoice.items[0].discount1Percent).toBe(10);
      expect(invoice.items[0].discount2Percent).toBe(5);
    });
  });

  describe('Tax Fields (Requirement 1.7, 1.8)', () => {
    it('should store advance tax in items', async () => {
      const invoice = await Invoice.create({
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

    it('should validate advance tax percent enum values', async () => {
      const validRates = [0, 0.5, 2.5];
      
      for (const rate of validRates) {
        const invoice = await Invoice.create({
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
          totals: { subtotal: 1500, advanceTaxTotal: (1500 * rate) / 100, grandTotal: 1500 + (1500 * rate) / 100 },
          createdBy: user._id
        });

        expect(invoice.items[0].advanceTaxPercent).toBe(rate);
      }
    });

    it('should store enhanced tax totals at invoice level', async () => {
      const invoice = await Invoice.create({
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
          totalTax: 270,
          gst18Total: 270,
          gst4Total: 0,
          advanceTaxTotal: 7.5,
          nonFilerGSTTotal: 1.5,
          incomeTaxTotal: 0,
          grandTotal: 1778.5
        },
        createdBy: user._id
      });

      expect(invoice.totals.gst18Total).toBe(270);
      expect(invoice.totals.gst4Total).toBe(0);
      expect(invoice.totals.advanceTaxTotal).toBe(7.5);
      expect(invoice.totals.nonFilerGSTTotal).toBe(1.5);
      expect(invoice.totals.incomeTaxTotal).toBe(0);
    });

    it('should validate tax totals are non-negative', async () => {
      const invoice = new Invoice({
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
  });

  describe('Purchase-Specific Fields (Requirement 2.1, 2.3, 2.6)', () => {
    it('should require supplier bill number for purchase invoices', async () => {
      const invoice = new Invoice({
        type: 'purchase',
        supplierId: supplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: { subtotal: 1000, grandTotal: 1000 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Supplier bill number is required for purchase invoices');
    });

    it('should store supplier bill number for purchase invoices', async () => {
      const invoice = await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-2024-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: { subtotal: 1000, grandTotal: 1000 },
        createdBy: user._id
      });

      expect(invoice.supplierBillNo).toBe('SUP-2024-001');
    });

    it('should store dimension information', async () => {
      const invoice = await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-2024-001',
        dimension: 'Project-A',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: { subtotal: 1000, grandTotal: 1000 },
        createdBy: user._id
      });

      expect(invoice.dimension).toBe('Project-A');
    });

    it('should store bilty information', async () => {
      const biltyDate = new Date();
      const invoice = await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-2024-001',
        biltyNo: 'BILTY-001',
        biltyDate,
        transportCompany: 'Fast Transport',
        transportCharges: 500,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          lineTotal: 1000
        }],
        totals: { subtotal: 1000, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.biltyNo).toBe('BILTY-001');
      expect(invoice.biltyDate).toEqual(biltyDate);
      expect(invoice.transportCompany).toBe('Fast Transport');
      expect(invoice.transportCharges).toBe(500);
    });
  });

  describe('Trade Offers (Requirement 20)', () => {
    it('should store trade offer percentages and amounts', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        to1Percent: 5,
        to1Amount: 75,
        to2Percent: 2,
        to2Amount: 28.5,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, totalDiscount: 103.5, grandTotal: 1396.5 },
        createdBy: user._id
      });

      expect(invoice.to1Percent).toBe(5);
      expect(invoice.to1Amount).toBe(75);
      expect(invoice.to2Percent).toBe(2);
      expect(invoice.to2Amount).toBe(28.5);
    });

    it('should validate trade offer percentages are within range', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        to1Percent: 150,
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

      await expect(invoice.save()).rejects.toThrow('TO1 percent cannot exceed 100%');
    });
  });

  describe('Print Formats (Requirement 19)', () => {
    it('should store print format', async () => {
      const formats = ['standard', 'logo', 'letterhead', 'thermal', 'estimate', 'voucher', 'store_copy', 'tax_invoice', 'warranty_bill'];
      
      for (const format of formats) {
        const invoice = await Invoice.create({
          type: 'sales',
          customerId: customer._id,
          printFormat: format,
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

        expect(invoice.printFormat).toBe(format);
      }
    });

    it('should store estimate print flag', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        estimatePrint: true,
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

      expect(invoice.estimatePrint).toBe(true);
    });
  });

  describe('Warehouse and Dimension Tracking (Requirement 3, 24)', () => {
    it('should store warehouse ID in items', async () => {
      const warehouseId = new mongoose.Types.ObjectId();
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          warehouseId,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.items[0].warehouseId.toString()).toBe(warehouseId.toString());
    });

    it('should store dimension in items', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          dimension: 'Department-A',
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.items[0].dimension).toBe('Department-A');
    });
  });

  describe('Warranty Information (Requirement 32)', () => {
    it('should store warranty information in items', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          warrantyMonths: 12,
          warrantyDetails: 'Full warranty on parts and labor',
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      expect(invoice.items[0].warrantyMonths).toBe(12);
      expect(invoice.items[0].warrantyDetails).toBe('Full warranty on parts and labor');
    });

    it('should validate warranty months is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          warrantyMonths: -1,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Warranty months cannot be negative');
    });
  });

  describe('Income Tax (Requirement 23)', () => {
    it('should store income tax at invoice level', async () => {
      const invoice = await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        incomeTax: 82.5,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 150,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, incomeTaxTotal: 82.5, grandTotal: 1582.5 },
        createdBy: user._id
      });

      expect(invoice.incomeTax).toBe(82.5);
      expect(invoice.totals.incomeTaxTotal).toBe(82.5);
    });

    it('should validate income tax is non-negative', async () => {
      const invoice = new Invoice({
        type: 'sales',
        customerId: customer._id,
        incomeTax: -50,
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

      await expect(invoice.save()).rejects.toThrow('Income tax cannot be negative');
    });
  });

  describe('Indexes for Phase 2 Features', () => {
    it('should have index on originalInvoiceId', async () => {
      const indexes = Invoice.collection.getIndexes();
      const hasIndex = Object.values(indexes).some(index => 
        index.key && index.key.originalInvoiceId === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have compound index on supplierBillNo and supplierId', async () => {
      const indexes = Invoice.collection.getIndexes();
      const hasIndex = Object.values(indexes).some(index => 
        index.key && index.key.supplierBillNo === 1 && index.key.supplierId === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on dimension', async () => {
      const indexes = Invoice.collection.getIndexes();
      const hasIndex = Object.values(indexes).some(index => 
        index.key && index.key.dimension === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on salesmanId', async () => {
      const indexes = Invoice.collection.getIndexes();
      const hasIndex = Object.values(indexes).some(index => 
        index.key && index.key.salesmanId === 1
      );
      expect(hasIndex).toBe(true);
    });

    it('should have index on poId', async () => {
      const indexes = Invoice.collection.getIndexes();
      const hasIndex = Object.values(indexes).some(index => 
        index.key && index.key.poId === 1
      );
      expect(hasIndex).toBe(true);
    });
  });
});
