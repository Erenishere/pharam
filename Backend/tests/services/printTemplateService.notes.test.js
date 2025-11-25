const printTemplateService = require('../../src/services/printTemplateService');
const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Print Template Service Notes Tests
 * Phase 2 - Requirement 33: Note/Memo Field for Invoices
 * Task 77.2: Include notes on printout
 */

describe('PrintTemplateService - Notes/Memo', () => {
    let testInvoice;
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

    describe('Notes in print data', () => {
        it('should include notes in invoice print data', async () => {
            testInvoice = await Invoice.create({
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
                notes: 'Important delivery instructions for this invoice'
            });

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.invoice).toHaveProperty('notes');
            expect(printData.invoice.notes).toBe('Important delivery instructions for this invoice');
        });

        it('should include memoNo in invoice print data', async () => {
            testInvoice = await Invoice.create({
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

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.invoice).toHaveProperty('memoNo');
            expect(printData.invoice.memoNo).toBe('MEMO-2024-001');
        });

        it('should include both notes and memoNo in print data', async () => {
            testInvoice = await Invoice.create({
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
                notes: 'Delivery instructions',
                memoNo: 'MEMO-2024-001'
            });

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.invoice.notes).toBe('Delivery instructions');
            expect(printData.invoice.memoNo).toBe('MEMO-2024-001');
        });

        it('should handle invoice without notes', async () => {
            testInvoice = await Invoice.create({
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

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.invoice).toHaveProperty('notes');
            expect(printData.invoice.notes).toBeUndefined();
        });
    });

    describe('Notes metadata flags', () => {
        it('should set hasNotes flag when notes exist', async () => {
            testInvoice = await Invoice.create({
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
                notes: 'Test notes'
            });

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.metadata.hasNotes).toBe(true);
            expect(printData.metadata.showNotesProminent).toBe(true);
        });

        it('should set hasMemoNo flag when memoNo exists', async () => {
            testInvoice = await Invoice.create({
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
                memoNo: 'MEMO-001'
            });

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.metadata.hasMemoNo).toBe(true);
            expect(printData.metadata.showNotesProminent).toBe(true);
        });

        it('should set flags to false when no notes or memoNo', async () => {
            testInvoice = await Invoice.create({
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

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            expect(printData.metadata.hasNotes).toBe(false);
            expect(printData.metadata.hasMemoNo).toBe(false);
            expect(printData.metadata.showNotesProminent).toBe(false);
        });

        it('should handle empty string notes correctly', async () => {
            testInvoice = await Invoice.create({
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
                notes: '   '  // Only whitespace
            });

            const printData = await printTemplateService.generatePrintData(testInvoice._id);

            // Should be false because trimmed string is empty
            expect(printData.metadata.hasNotes).toBe(false);
            expect(printData.metadata.showNotesProminent).toBe(false);
        });
    });

    describe('Notes in different print formats', () => {
        beforeEach(async () => {
            testInvoice = await Invoice.create({
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
                notes: 'Test notes for all formats',
                memoNo: 'MEMO-001'
            });
        });

        it('should include notes in standard format', async () => {
            const printData = await printTemplateService.generatePrintData(testInvoice._id, 'standard');

            expect(printData.invoice.notes).toBe('Test notes for all formats');
            expect(printData.invoice.memoNo).toBe('MEMO-001');
        });

        it('should include notes in logo format', async () => {
            const printData = await printTemplateService.generatePrintData(testInvoice._id, 'logo');

            expect(printData.invoice.notes).toBe('Test notes for all formats');
            expect(printData.invoice.memoNo).toBe('MEMO-001');
        });

        it('should include notes in thermal format', async () => {
            const printData = await printTemplateService.generatePrintData(testInvoice._id, 'thermal');

            expect(printData.invoice.notes).toBe('Test notes for all formats');
            expect(printData.invoice.memoNo).toBe('MEMO-001');
        });

        it('should include notes in tax_invoice format', async () => {
            const printData = await printTemplateService.generatePrintData(testInvoice._id, 'tax_invoice');

            expect(printData.invoice.notes).toBe('Test notes for all formats');
            expect(printData.invoice.memoNo).toBe('MEMO-001');
        });
    });
});
