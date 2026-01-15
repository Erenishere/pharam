/**
 * Unit Tests for Bilty Fields in Invoice Model
 * Phase 2 - Requirement 22: Bilty (Transport) Management System
 * Task 66.1: Add bilty fields to Invoice
 */

const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock Supplier model to avoid MissingSchemaError
const supplierSchema = new mongoose.Schema({
    name: String,
    contactPerson: String,
    phone: String
});

const Supplier = mongoose.model('Supplier', supplierSchema);

// Mock Customer model
const customerSchema = new mongoose.Schema({
    name: String
});

const Customer = mongoose.model('Customer', customerSchema);

describe('Invoice Model - Bilty Fields (Task 66.1)', () => {
    let mongoServer;

    beforeAll(async () => {
        // Close existing connection if any
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    afterEach(async () => {
        await Invoice.deleteMany({});
    });

    describe('Bilty field validations', () => {
        it('should accept valid bilty fields', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000001',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-001',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                biltyNo: 'BLT-2023-001',
                biltyDate: new Date('2023-12-01'),
                transportCompany: 'ABC Transport Company',
                transportCharges: 5000,
                biltyStatus: 'pending',
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);
            await invoice.save();

            expect(invoice.biltyNo).toBe('BLT-2023-001');
            expect(invoice.transportCompany).toBe('ABC Transport Company');
            expect(invoice.transportCharges).toBe(5000);
            expect(invoice.biltyStatus).toBe('pending');
        });

        it('should have default biltyStatus as pending', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000002',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-002',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                biltyNo: 'BLT-2023-002',
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);
            await invoice.save();

            expect(invoice.biltyStatus).toBe('pending');
        });

        it('should accept biltyStatus as in_transit', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000003',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-003',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                biltyNo: 'BLT-2023-003',
                biltyStatus: 'in_transit',
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);
            await invoice.save();

            expect(invoice.biltyStatus).toBe('in_transit');
        });

        it('should accept biltyStatus as received', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000004',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-004',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                biltyNo: 'BLT-2023-004',
                biltyStatus: 'received',
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);
            await invoice.save();

            expect(invoice.biltyStatus).toBe('received');
        });

        it('should reject invalid biltyStatus', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000005',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-005',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                biltyNo: 'BLT-2023-005',
                biltyStatus: 'invalid_status',
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);

            await expect(invoice.save()).rejects.toThrow();
        });

        it('should enforce biltyNo max length', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000006',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-006',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                biltyNo: 'A'.repeat(51), // Exceeds 50 character limit
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);

            await expect(invoice.save()).rejects.toThrow();
        });

        it('should enforce transportCompany max length', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000007',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-007',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                transportCompany: 'A'.repeat(101), // Exceeds 100 character limit
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);

            await expect(invoice.save()).rejects.toThrow();
        });

        it('should reject negative transport charges', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000008',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-008',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                transportCharges: -100,
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);

            await expect(invoice.save()).rejects.toThrow();
        });

        it('should accept zero transport charges', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000009',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-009',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                transportCharges: 0,
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);
            await invoice.save();

            expect(invoice.transportCharges).toBe(0);
        });

        it('should allow invoice without bilty information', async () => {
            const invoiceData = {
                invoiceNumber: 'PI2023000010',
                type: 'purchase',
                supplierId: new mongoose.Types.ObjectId(),
                supplierBillNo: 'SUP-010',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    grandTotal: 1000
                },
                createdBy: new mongoose.Types.ObjectId()
            };

            const invoice = new Invoice(invoiceData);
            await invoice.save();

            expect(invoice.biltyNo).toBeUndefined();
            expect(invoice.biltyStatus).toBe('pending'); // Default value
        });
    });
});
