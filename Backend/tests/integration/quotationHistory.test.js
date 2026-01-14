const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const QuotationHistory = require('../../src/models/QuotationHistory');
const Item = require('../../src/models/Item');
const Customer = require('../../src/models/Customer');

describe('QuotationHistory API Integration Tests - Phase 2 (Requirement 18.1, 18.2)', () => {
    let mongoServer;
    let item, customer;

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

        // Create test data
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

        // Create history records
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

    describe('GET /api/quotation-history - Task 59.4', () => {
        it('should get quotation history for item and party', async () => {
            const response = await request(app)
                .get('/api/quotation-history')
                .query({ itemId: item._id.toString(), partyId: customer._id.toString() });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.count).toBe(3);
            // Should be sorted by date descending
            expect(response.body.data[0].rate).toBe(105);
            expect(response.body.data[1].rate).toBe(110);
            expect(response.body.data[2].rate).toBe(100);
        });

        it('should limit results', async () => {
            const response = await request(app)
                .get('/api/quotation-history')
                .query({
                    itemId: item._id.toString(),
                    partyId: customer._id.toString(),
                    limit: 2
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
        });

        it('should return 400 when itemId is missing', async () => {
            const response = await request(app)
                .get('/api/quotation-history')
                .query({ partyId: customer._id.toString() });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Item ID is required');
        });

        it('should return 400 when partyId is missing', async () => {
            const response = await request(app)
                .get('/api/quotation-history')
                .query({ itemId: item._id.toString() });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Party ID is required');
        });
    });

    describe('GET /api/quotation-history/latest', () => {
        it('should get latest quotation rate', async () => {
            const response = await request(app)
                .get('/api/quotation-history/latest')
                .query({ itemId: item._id.toString(), partyId: customer._id.toString() });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.rate).toBe(105); // Latest rate
            expect(response.body.data.invoiceNumber).toBe('INV003');
        });

        it('should return 404 when no history exists', async () => {
            const newItem = await Item.create({
                code: 'ITEM002',
                name: 'New Item',
                category: 'Test',
                pricing: { salePrice: 100, costPrice: 80 },
                stock: { currentStock: 10 }
            });

            const response = await request(app)
                .get('/api/quotation-history/latest')
                .query({ itemId: newItem._id.toString(), partyId: customer._id.toString() });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('No quotation history found for this item and party');
        });

        it('should return 400 when itemId is missing', async () => {
            const response = await request(app)
                .get('/api/quotation-history/latest')
                .query({ partyId: customer._id.toString() });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/quotation-history/by-type', () => {
        it('should get history by transaction type', async () => {
            const response = await request(app)
                .get('/api/quotation-history/by-type')
                .query({
                    itemId: item._id.toString(),
                    transactionType: 'sales'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            response.body.data.forEach(record => {
                expect(record.transactionType).toBe('sales');
            });
        });

        it('should return 400 when itemId is missing', async () => {
            const response = await request(app)
                .get('/api/quotation-history/by-type')
                .query({ transactionType: 'sales' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return 400 when transactionType is missing', async () => {
            const response = await request(app)
                .get('/api/quotation-history/by-type')
                .query({ itemId: item._id.toString() });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/quotation-history/item/:itemId', () => {
        it('should get all history for an item', async () => {
            const response = await request(app)
                .get(`/api/quotation-history/item/${item._id.toString()}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
        });

        it('should apply date filters', async () => {
            const response = await request(app)
                .get(`/api/quotation-history/item/${item._id.toString()}`)
                .query({
                    startDate: '2024-01-10',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Should only return records within date range
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should apply limit', async () => {
            const response = await request(app)
                .get(`/api/quotation-history/item/${item._id.toString()}`)
                .query({ limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
        });

        it('should return empty array when no history exists', async () => {
            const newItem = await Item.create({
                code: 'ITEM002',
                name: 'New Item',
                category: 'Test',
                pricing: { salePrice: 100, costPrice: 80 },
                stock: { currentStock: 10 }
            });

            const response = await request(app)
                .get(`/api/quotation-history/item/${newItem._id.toString()}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(0);
        });
    });
});
