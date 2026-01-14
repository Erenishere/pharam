const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model - Scheme and Discount Fields (Task 1.4)', () => {
  let customer, item, user;

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    customer = await Customer.create({
      name: 'Test Customer',
      code: 'CUST001',
      type: 'customer'
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

  describe('Scheme Quantity Fields', () => {
    it('should store scheme1Quantity and scheme2Quantity', async () => {
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

    it('should default scheme quantities to 0', async () => {
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

      expect(invoice.items[0].scheme1Quantity).toBe(0);
      expect(invoice.items[0].scheme2Quantity).toBe(0);
    });

    it('should validate scheme1Quantity is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000003',
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

    it('should validate scheme2Quantity is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000004',
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
  });

  describe('Discount Fields', () => {
    it('should store multi-level discount fields', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000005',
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

    it('should default discount fields to 0', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000006',
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

    it('should validate discount1Percent is non-negative', async () => {
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
          discount1Percent: -5,
          lineTotal: 1500
        }],
        totals: { subtotal: 1500, grandTotal: 1500 },
        createdBy: user._id
      });

      await expect(invoice.save()).rejects.toThrow('Discount 1 percent cannot be negative');
    });

    it('should validate discount1Percent does not exceed 100%', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000008',
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

    it('should validate discount1Amount is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000009',
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

    it('should validate discount2Percent is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000010',
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
        invoiceNumber: 'SI2024000011',
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

    it('should validate discount2Amount is non-negative', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'SI2024000012',
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
  });

  describe('Combined Scheme and Discount Scenarios', () => {
    it('should handle combined schemes and discounts', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000013',
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: item._id,
          quantity: 12,
          unitPrice: 100,
          scheme1Quantity: 1,
          scheme2Quantity: 0,
          discount1Percent: 5,
          discount1Amount: 60,
          discount2Percent: 2,
          discount2Amount: 22.8,
          lineTotal: 1117.2
        }],
        totals: { subtotal: 1200, totalDiscount: 82.8, grandTotal: 1117.2 },
        createdBy: user._id
      });

      expect(invoice.items[0].quantity).toBe(12);
      expect(invoice.items[0].scheme1Quantity).toBe(1);
      expect(invoice.items[0].discount1Percent).toBe(5);
      expect(invoice.items[0].discount2Percent).toBe(2);
    });

    it('should allow zero values for all scheme and discount fields', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'SI2024000014',
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
      expect(invoice.items[0].discount2Percent).toBe(0);
    });
  });
});
