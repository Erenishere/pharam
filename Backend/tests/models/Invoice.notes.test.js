const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Invoice Model Notes/Memo Fields Tests
 * Phase 2 - Requirement 33: Note/Memo Field for Invoices
 * Task 77.1: Add memo field
 */

describe('Invoice Model - Notes/Memo Fields', () => {
    let testUser;
    let testCustomer;
    let testItem;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharam_test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Invoice.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});
        await User.deleteMany({});

        // Create test user
        testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });

        // Create test customer
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890'
        });

        // Create test item
        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Electronics',
            unit: 'piece',
            pricing: {
                costPrice: 100,
                salePrice: 150
            }
        });
    });

    describe('notes field', () => {
        it('should accept valid notes', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                notes: 'This is a test note for the invoice'
            });

            await expect(invoice.save()).resolves.toBeDefined();
            expect(invoice.notes).toBe('This is a test note for the invoice');
        });

        it('should support multi-line notes', async () => {
            const multiLineNotes = `Line 1: Important information
Line 2: Additional details
Line 3: Special instructions`;

            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                notes: multiLineNotes
            });

            await invoice.save();
            expect(invoice.notes).toBe(multiLineNotes);
            expect(invoice.notes.split('\n')).toHaveLength(3);
        });

        it('should trim notes', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                notes: '  Test notes with spaces  '
            });

            await invoice.save();
            expect(invoice.notes).toBe('Test notes with spaces');
        });

        it('should reject notes exceeding 1000 characters', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                notes: 'a'.repeat(1001)
            });

            await expect(invoice.save()).rejects.toThrow();
        });

        it('should allow empty notes', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id
            });

            await expect(invoice.save()).resolves.toBeDefined();
            expect(invoice.notes).toBeUndefined();
        });
    });

    describe('memoNo field', () => {
        it('should accept valid memo number', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                memoNo: 'MEMO-2024-001'
            });

            await expect(invoice.save()).resolves.toBeDefined();
            expect(invoice.memoNo).toBe('MEMO-2024-001');
        });

        it('should trim memo number', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                memoNo: '  MEMO-001  '
            });

            await invoice.save();
            expect(invoice.memoNo).toBe('MEMO-001');
        });

        it('should reject memo number exceeding 50 characters', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                memoNo: 'a'.repeat(51)
            });

            await expect(invoice.save()).rejects.toThrow();
        });

        it('should allow empty memo number', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id
            });

            await expect(invoice.save()).resolves.toBeDefined();
            expect(invoice.memoNo).toBeUndefined();
        });
    });

    describe('Combined notes and memoNo', () => {
        it('should save invoice with both notes and memoNo', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                notes: 'Important delivery instructions',
                memoNo: 'MEMO-2024-001'
            });

            await invoice.save();

            const savedInvoice = await Invoice.findById(invoice._id);
            expect(savedInvoice.notes).toBe('Important delivery instructions');
            expect(savedInvoice.memoNo).toBe('MEMO-2024-001');
        });

        it('should allow notes without memoNo', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                notes: 'Only notes, no memo number'
            });

            await expect(invoice.save()).resolves.toBeDefined();
            expect(invoice.notes).toBe('Only notes, no memo number');
            expect(invoice.memoNo).toBeUndefined();
        });

        it('should allow memoNo without notes', async () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150,
                        lineTotal: 150
                    }
                ],
                totals: {
                    subtotal: 150,
                    grandTotal: 150
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUser._id,
                memoNo: 'MEMO-2024-002'
            });

            await expect(invoice.save()).resolves.toBeDefined();
            expect(invoice.memoNo).toBe('MEMO-2024-002');
            expect(invoice.notes).toBeUndefined();
        });
    });
});
