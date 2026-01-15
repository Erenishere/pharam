const mongoose = require('mongoose');
const Item = require('../../src/models/Item');

/**
 * Item Model Warranty Fields Tests
 * Phase 2 - Requirement 32: Warranty Information Management
 * Task 76.5: Auto-populate default warranty
 */

describe('Item Model - Warranty Fields', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharam_test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Item.deleteMany({});
    });

    describe('defaultWarrantyMonths field', () => {
        it('should accept valid warranty months', async () => {
            const item = new Item({
                code: 'TEST001',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyMonths: 12
            });

            await expect(item.save()).resolves.toBeDefined();
            expect(item.defaultWarrantyMonths).toBe(12);
        });

        it('should default to 0 if not provided', async () => {
            const item = new Item({
                code: 'TEST002',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                }
            });

            await item.save();
            expect(item.defaultWarrantyMonths).toBe(0);
        });

        it('should reject negative warranty months', async () => {
            const item = new Item({
                code: 'TEST003',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyMonths: -1
            });

            await expect(item.save()).rejects.toThrow();
        });

        it('should reject non-integer warranty months', async () => {
            const item = new Item({
                code: 'TEST004',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyMonths: 12.5
            });

            await expect(item.save()).rejects.toThrow('Default warranty months must be a whole number');
        });
    });

    describe('defaultWarrantyDetails field', () => {
        it('should accept valid warranty details', async () => {
            const item = new Item({
                code: 'TEST005',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyDetails: 'Manufacturer warranty covering parts and labor'
            });

            await expect(item.save()).resolves.toBeDefined();
            expect(item.defaultWarrantyDetails).toBe('Manufacturer warranty covering parts and labor');
        });

        it('should trim warranty details', async () => {
            const item = new Item({
                code: 'TEST006',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyDetails: '  Warranty details  '
            });

            await item.save();
            expect(item.defaultWarrantyDetails).toBe('Warranty details');
        });

        it('should reject warranty details exceeding 500 characters', async () => {
            const item = new Item({
                code: 'TEST007',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyDetails: 'a'.repeat(501)
            });

            await expect(item.save()).rejects.toThrow();
        });

        it('should allow empty warranty details', async () => {
            const item = new Item({
                code: 'TEST008',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyDetails: ''
            });

            await expect(item.save()).resolves.toBeDefined();
        });
    });

    describe('Combined warranty fields', () => {
        it('should save item with both warranty fields', async () => {
            const item = new Item({
                code: 'TEST009',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyMonths: 24,
                defaultWarrantyDetails: 'Extended 2-year warranty with parts and labor coverage'
            });

            await item.save();

            const savedItem = await Item.findById(item._id);
            expect(savedItem.defaultWarrantyMonths).toBe(24);
            expect(savedItem.defaultWarrantyDetails).toBe('Extended 2-year warranty with parts and labor coverage');
        });

        it('should allow warranty months without details', async () => {
            const item = new Item({
                code: 'TEST010',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyMonths: 12
            });

            await expect(item.save()).resolves.toBeDefined();
            expect(item.defaultWarrantyMonths).toBe(12);
            expect(item.defaultWarrantyDetails).toBeUndefined();
        });

        it('should allow warranty details without months', async () => {
            const item = new Item({
                code: 'TEST011',
                name: 'Test Item',
                category: 'Electronics',
                unit: 'piece',
                pricing: {
                    costPrice: 100,
                    salePrice: 150
                },
                defaultWarrantyDetails: 'Limited warranty'
            });

            await expect(item.save()).resolves.toBeDefined();
            expect(item.defaultWarrantyMonths).toBe(0);
            expect(item.defaultWarrantyDetails).toBe('Limited warranty');
        });
    });
});
