const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const QuotationHistory = require('../../src/models/QuotationHistory');
const Item = require('../../src/models/Item');
const Customer = require('../../src/models/Customer');

describe('QuotationHistory Model - Phase 2 (Requirement 18.1, 18.2)', () => {
    let mongoServer;

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
        await QuotationHistory.deleteMany({});
        await Item.deleteMany({});
        await Customer.deleteMany({});
    });

    describe('Schema Validation', () => {
        it('should create a valid quotation history record', async () => {
            const item = await Item.create({
                code: 'ITEM001',
                name: 'Test Item',
                category: 'Test',
                pricing: { salePrice: 100, costPrice: 80 },
                stock: { currentStock: 10 }
            });

            const customer = await Customer.create({
                code: 'CUST001',
                name: 'Test Customer',
                type: 'customer'
            });

            const historyData = {
                itemId: item._id,
                partyId: customer._id,
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: 100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            const history = await QuotationHistory.create(historyData);

            expect(history.itemId).toEqual(item._id);
            expect(history.partyId).toEqual(customer._id);
            expect(history.partyModel).toBe('Customer');
            expect(history.transactionType).toBe('sales');
            expect(history.rate).toBe(100);
            expect(history.quantity).toBe(5);
        });

        it('should require itemId', async () => {
            const historyData = {
                partyId: new mongoose.Types.ObjectId(),
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: 100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow('Item ID is required');
        });

        it('should require partyId', async () => {
            const historyData = {
                itemId: new mongoose.Types.ObjectId(),
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: 100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow('Party ID is required');
        });

        it('should require transactionType', async () => {
            const historyData = {
                itemId: new mongoose.Types.ObjectId(),
                partyId: new mongoose.Types.ObjectId(),
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                rate: 100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow('Transaction type is required');
        });

        it('should validate transactionType enum', async () => {
            const historyData = {
                itemId: new mongoose.Types.ObjectId(),
                partyId: new mongoose.Types.ObjectId(),
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'invalid',
                rate: 100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow();
        });

        it('should validate partyModel enum', async () => {
            const historyData = {
                itemId: new mongoose.Types.ObjectId(),
                partyId: new mongoose.Types.ObjectId(),
                partyModel: 'InvalidModel',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: 100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow();
        });

        it('should not allow negative rate', async () => {
            const historyData = {
                itemId: new mongoose.Types.ObjectId(),
                partyId: new mongoose.Types.ObjectId(),
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: -100,
                quantity: 5,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow('Rate cannot be negative');
        });

        it('should not allow zero or negative quantity', async () => {
            const historyData = {
                itemId: new mongoose.Types.ObjectId(),
                partyId: new mongoose.Types.ObjectId(),
                partyModel: 'Customer',
                invoiceId: new mongoose.Types.ObjectId(),
                invoiceNumber: 'INV001',
                transactionType: 'sales',
                rate: 100,
                quantity: 0,
                transactionDate: new Date(),
                finalRate: 100
            };

            await expect(QuotationHistory.create(historyData))
                .rejects.toThrow('Quantity must be greater than 0');
        });
    });

    describe('Static Methods', () => {
        let item, customer;

        beforeEach(async () => {
            item = await Item.create({
                code: 'ITEM001',
                name: 'Test Item',
                category: 'Test',
                pricing: { salePrice: 100, costPrice: 80 },
                stock: { currentStock: 10 }
            });

            customer = await Customer.create({
                code: 'CUST001',
                name: 'Test Customer',
                type: 'customer'
            });

            // Create multiple history records
            await QuotationHistory.create([
                {
                    itemId: item._id,
                    partyId: customer._id,
                    partyModel: 'Customer',
                    invoiceId: new mongoose.Types.ObjectId(),
                    invoiceNumber: 'INV001',
                    transactionType: 'sales',
                    rate: 100,
                    quantity: 5,
                    transactionDate: new Date('2024-01-01'),
                    finalRate: 100
                },
                {
                    itemId: item._id,
                    partyId: customer._id,
                    partyModel: 'Customer',
                    invoiceId: new mongoose.Types.ObjectId(),
                    invoiceNumber: 'INV002',
                    transactionType: 'sales',
                    rate: 110,
                    quantity: 3,
                    transactionDate: new Date('2024-01-15'),
                    finalRate: 110
                },
                {
                    itemId: item._id,
                    partyId: customer._id,
                    partyModel: 'Customer',
                    invoiceId: new mongoose.Types.ObjectId(),
                    invoiceNumber: 'INV003',
                    transactionType: 'sales',
                    rate: 105,
                    quantity: 10,
                    transactionDate: new Date('2024-01-30'),
                    finalRate: 105
                }
            ]);
        });

        it('should get history for item and party', async () => {
            const history = await QuotationHistory.getHistory(item._id, customer._id, 10);

            expect(history).toHaveLength(3);
            // Should be sorted by transaction date descending
            expect(history[0].rate).toBe(105); // Latest
            expect(history[1].rate).toBe(110);
            expect(history[2].rate).toBe(100); // Oldest
        });

        it('should limit history results', async () => {
            const history = await QuotationHistory.getHistory(item._id, customer._id, 2);

            expect(history).toHaveLength(2);
            expect(history[0].rate).toBe(105);
            expect(history[1].rate).toBe(110);
        });

        it('should get latest rate for item and party', async () => {
            const latest = await QuotationHistory.getLatestRate(item._id, customer._id);

            expect(latest).toBeTruthy();
            expect(latest.rate).toBe(105); // Latest transaction
            expect(latest.invoiceNumber).toBe('INV003');
        });

        it('should get history by transaction type', async () => {
            const history = await QuotationHistory.getHistoryByType(item._id, 'sales', 10);

            expect(history).toHaveLength(3);
            history.forEach(record => {
                expect(record.transactionType).toBe('sales');
            });
        });

        it('should return empty array when no history exists', async () => {
            const newItem = await Item.create({
                code: 'ITEM002',
                name: 'New Item',
                category: 'Test',
                pricing: { salePrice: 100, costPrice: 80 },
                stock: { currentStock: 10 }
            });

            const history = await QuotationHistory.getHistory(newItem._id, customer._id, 10);

            expect(history).toHaveLength(0);
        });
    });

    describe('Indexes', () => {
        it('should have compound index on itemId, partyId, and transactionDate', async () => {
            const indexes = await QuotationHistory.collection.getIndexes();

            const compoundIndex = Object.keys(indexes).find(key =>
                key.includes('itemId') && key.includes('partyId') && key.includes('transactionDate')
            );

            expect(compoundIndex).toBeTruthy();
        });

        it('should have index on itemId', async () => {
            const indexes = await QuotationHistory.collection.getIndexes();

            expect(indexes.itemId_1).toBeTruthy();
        });

        it('should have index on partyId', async () => {
            const indexes = await QuotationHistory.collection.getIndexes();

            expect(indexes.partyId_1).toBeTruthy();
        });
    });
});
