const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model - Print Fields (Task 75)', () => {
    describe('estimatePrint field - Task 75.1', () => {
        it('should have default value of false', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                invoiceDate: new Date(),
                dueDate: new Date(),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.estimatePrint).toBe(false);
        });

        it('should accept boolean values', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                estimatePrint: true,
                invoiceDate: new Date(),
                dueDate: new Date(),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.estimatePrint).toBe(true);
        });
    });

    describe('expiryDate field - Task 75.5', () => {
        it('should be optional', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                invoiceDate: new Date(),
                dueDate: new Date(),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.expiryDate).toBeUndefined();
        });

        it('should accept date values', () => {
            const expiryDate = new Date('2024-12-31');
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                invoiceDate: new Date('2024-01-01'),
                dueDate: new Date('2024-01-31'),
                expiryDate,
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.expiryDate).toEqual(expiryDate);
        });

        it('should validate that expiryDate is after invoiceDate', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                invoiceDate: new Date('2024-12-31'),
                dueDate: new Date('2025-01-31'),
                expiryDate: new Date('2024-01-01'), // Before invoice date
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            const validationError = invoice.validateSync();
            expect(validationError).toBeDefined();
            expect(validationError.errors.expiryDate).toBeDefined();
            expect(validationError.errors.expiryDate.message).toBe('Expiry date must be after invoice date');
        });

        it('should allow expiryDate equal to invoiceDate', () => {
            const date = new Date('2024-01-01');
            const invoice = new Invoice({
                invoiceNumber: 'SI2024000001',
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                invoiceDate: date,
                dueDate: new Date('2024-01-31'),
                expiryDate: date,
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            const validationError = invoice.validateSync();
            expect(validationError).toBeUndefined();
        });
    });

    describe('isExpired virtual property - Task 75.5', () => {
        it('should return false when estimatePrint is false', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                estimatePrint: false,
                status: 'draft',
                invoiceDate: new Date(),
                dueDate: new Date(),
                expiryDate: new Date(Date.now() - 86400000), // Yesterday
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.isExpired).toBe(false);
        });

        it('should return false when expiryDate is not set', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                estimatePrint: true,
                status: 'draft',
                invoiceDate: new Date(),
                dueDate: new Date(),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.isExpired).toBe(false);
        });

        it('should return true when estimate is expired', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                estimatePrint: true,
                status: 'draft',
                invoiceDate: new Date('2024-01-01'),
                dueDate: new Date('2024-01-31'),
                expiryDate: new Date(Date.now() - 86400000), // Yesterday
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.isExpired).toBe(true);
        });

        it('should return false when estimate is not yet expired', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                estimatePrint: true,
                status: 'draft',
                invoiceDate: new Date(),
                dueDate: new Date(),
                expiryDate: new Date(Date.now() + 86400000), // Tomorrow
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.isExpired).toBe(false);
        });

        it('should return false when estimate is confirmed', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                estimatePrint: true,
                status: 'confirmed',
                invoiceDate: new Date(),
                dueDate: new Date(),
                expiryDate: new Date(Date.now() - 86400000), // Yesterday
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.isExpired).toBe(false);
        });
    });

    describe('printFormat field', () => {
        it('should have default value of standard', () => {
            const invoice = new Invoice({
                type: 'sales',
                customerId: new mongoose.Types.ObjectId(),
                invoiceDate: new Date(),
                dueDate: new Date(),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                }],
                totals: {
                    subtotal: 100,
                    grandTotal: 100,
                },
                createdBy: new mongoose.Types.ObjectId(),
            });

            expect(invoice.printFormat).toBe('standard');
        });

        it('should accept valid print format values', () => {
            const validFormats = [
                'standard', 'logo', 'letterhead', 'thermal',
                'estimate', 'voucher', 'store_copy', 'tax_invoice', 'warranty_bill'
            ];

            validFormats.forEach(format => {
                const invoice = new Invoice({
                    type: 'sales',
                    customerId: new mongoose.Types.ObjectId(),
                    printFormat: format,
                    invoiceDate: new Date(),
                    dueDate: new Date(),
                    items: [{
                        itemId: new mongoose.Types.ObjectId(),
                        quantity: 1,
                        unitPrice: 100,
                        lineTotal: 100,
                    }],
                    totals: {
                        subtotal: 100,
                        grandTotal: 100,
                    },
                    createdBy: new mongoose.Types.ObjectId(),
                });

                expect(invoice.printFormat).toBe(format);
            });
        });
    });
});
