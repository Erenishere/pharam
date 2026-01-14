const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');

describe('Invoice Model - Trade Offers (Requirement 20)', () => {
    let user, customer, item;

    beforeAll(async () => {
        // Connection is handled by tests/setup.js

        user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });

        customer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            type: 'customer',
            address: '123 Main St',
            phone: '1234567890'
        });

        item = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Test',
            unit: 'piece',
            pricing: { salePrice: 100, costPrice: 80 },
            stock: { currentStock: 100 },
            gstRate: 0 // Disable GST for easier calculation
        });
    });

    // No afterAll needed

    beforeEach(async () => {
        await Invoice.deleteMany({});
    });

    it('should calculate TO1 based on percentage', async () => {
        const invoice = new Invoice({
            invoiceNumber: 'INV001',
            type: 'sales',
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: user._id,
            items: [{
                itemId: item._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
                gstRate: 0
            }],
            totals: { subtotal: 1000, grandTotal: 1000 },
            to1Percent: 10 // 10% of 1000 = 100
        });

        await invoice.save();

        expect(invoice.to1Amount).toBe(100);
        expect(invoice.totals.grandTotal).toBe(900); // 1000 - 100
    });

    it('should calculate TO2 based on percentage (compound)', async () => {
        const invoice = new Invoice({
            invoiceNumber: 'INV002',
            type: 'sales',
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: user._id,
            items: [{
                itemId: item._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
                gstRate: 0
            }],
            totals: { subtotal: 1000, grandTotal: 1000 },
            to1Percent: 10, // 100
            to2Percent: 5   // 5% of (1000 - 100) = 45
        });

        await invoice.save();

        expect(invoice.to1Amount).toBe(100);
        expect(invoice.to2Amount).toBe(45);
        expect(invoice.totals.grandTotal).toBe(855); // 1000 - 100 - 45
    });

    it('should use fixed amounts if percentages are 0', async () => {
        const invoice = new Invoice({
            invoiceNumber: 'INV003',
            type: 'sales',
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: user._id,
            items: [{
                itemId: item._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
                gstRate: 0
            }],
            totals: { subtotal: 1000, grandTotal: 1000 },
            to1Amount: 150,
            to2Amount: 50
        });

        await invoice.save();

        expect(invoice.to1Amount).toBe(150);
        expect(invoice.to2Amount).toBe(50);
        expect(invoice.totals.grandTotal).toBe(800); // 1000 - 150 - 50
    });

    it('should recalculate TO amounts when items change', async () => {
        const invoice = new Invoice({
            invoiceNumber: 'INV004',
            type: 'sales',
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: user._id,
            items: [{
                itemId: item._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
                gstRate: 0
            }],
            totals: { subtotal: 1000, grandTotal: 1000 },
            to1Percent: 10
        });

        await invoice.save();
        expect(invoice.to1Amount).toBe(100);

        // Add another item
        invoice.items.push({
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
            gstRate: 0
        });
        // Subtotal becomes 2000

        await invoice.save();

        expect(invoice.totals.subtotal).toBe(2000);
        expect(invoice.to1Amount).toBe(200); // 10% of 2000
        expect(invoice.totals.grandTotal).toBe(1800); // 2000 - 200
    });
});
