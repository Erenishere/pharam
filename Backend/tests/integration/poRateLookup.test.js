const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Item = require('../../src/models/Item');
const Supplier = require('../../src/models/Supplier');
const User = require('../../src/models/User');

describe('PO Rate Lookup API Integration Tests (Task 60.2, Requirement 18.3)', () => {
    let mongoServer;
    let authToken;
    let item, supplier, user;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create test user
        user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });

        // Generate auth token (simplified - in real app would use proper JWT)
        authToken = 'test-token';
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await PurchaseOrder.deleteMany({});
        await Item.deleteMany({});
        await Supplier.deleteMany({});

        // Create test data
        item = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Test',
            pricing: { salePrice: 100, costPrice: 80, purchasePrice: 75 },
            stock: { currentStock: 100 }
        });

        supplier = await Supplier.create({
            code: 'SUP001',
            name: 'Test Supplier',
            type: 'supplier',
            contactPerson: 'John Doe',
            phone: '1234567890'
        });

        // Create approved purchase orders
        await PurchaseOrder.create([
            {
                poNumber: 'PO001',
                supplierId: supplier._id,
                poDate: new Date('2024-01-20'),
                status: 'approved',
                fulfillmentStatus: 'pending',
                items: [
                    {
                        itemId: item._id,
                        quantity: 100,
                        unitPrice: 50,
                        receivedQuantity: 0,
                        pendingQuantity: 100,
                        lineTotal: 5000
                    }
                ],
                subtotal: 5000,
                totalAmount: 5000,
                createdBy: user._id,
                isDeleted: false
            },
            {
                poNumber: 'PO002',
                supplierId: supplier._id,
                poDate: new Date('2024-01-10'),
                status: 'approved',
                fulfillmentStatus: 'fulfilled',
                items: [
                    {
                        itemId: item._id,
                        quantity: 50,
                        unitPrice: 48,
                        receivedQuantity: 50,
                        pendingQuantity: 0,
                        lineTotal: 2400
                    }
                ],
                subtotal: 2400,
                totalAmount: 2400,
                createdBy: user._id,
                isDeleted: false
            }
        ]);
    });

    describe('GET /api/purchase-orders/rate-lookup', () => {
        it('should get PO rate for item and supplier', async () => {
            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeTruthy();
            expect(response.body.data.latestRate).toBeTruthy();
            expect(response.body.data.latestRate.poNumber).toBe('PO001');
            expect(response.body.data.latestRate.unitPrice).toBe(50);
            expect(response.body.data.history).toHaveLength(2);
            expect(response.body.data.count).toBe(2);
        });

        it('should return latest rate first', async () => {
            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.latestRate.poNumber).toBe('PO001'); // Latest PO
            expect(response.body.data.history[0].poNumber).toBe('PO001');
            expect(response.body.data.history[1].poNumber).toBe('PO002');
        });

        it('should include pending quantities', async () => {
            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.latestRate.quantity).toBe(100);
            expect(response.body.data.latestRate.receivedQuantity).toBe(0);
            expect(response.body.data.latestRate.pendingQuantity).toBe(100);
        });

        it('should return 400 when itemId is missing', async () => {
            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Item ID is required');
        });

        it('should return 400 when supplierId is missing', async () => {
            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Supplier ID is required');
        });

        it('should return 404 when no PO found', async () => {
            const newItem = await Item.create({
                code: 'ITEM002',
                name: 'New Item',
                category: 'Test',
                pricing: { salePrice: 100, costPrice: 80, purchasePrice: 75 },
                stock: { currentStock: 100 }
            });

            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: newItem._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('No purchase order found for this item and supplier combination');
        });

        it('should only return approved POs', async () => {
            // Create a draft PO
            await PurchaseOrder.create({
                poNumber: 'PO003',
                supplierId: supplier._id,
                poDate: new Date('2024-01-25'),
                status: 'draft',
                fulfillmentStatus: 'pending',
                items: [
                    {
                        itemId: item._id,
                        quantity: 200,
                        unitPrice: 55,
                        receivedQuantity: 0,
                        pendingQuantity: 200,
                        lineTotal: 11000
                    }
                ],
                subtotal: 11000,
                totalAmount: 11000,
                createdBy: user._id,
                isDeleted: false
            });

            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            // Should still return only 2 approved POs, not the draft one
            expect(response.body.data.count).toBe(2);
            expect(response.body.data.latestRate.poNumber).not.toBe('PO003');
        });

        it('should not return deleted POs', async () => {
            // Soft delete one PO
            await PurchaseOrder.updateOne(
                { poNumber: 'PO001' },
                { isDeleted: true }
            );

            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.count).toBe(1);
            expect(response.body.data.latestRate.poNumber).toBe('PO002');
        });

        it('should include supplier and item details', async () => {
            const response = await request(app)
                .get('/api/purchase-orders/rate-lookup')
                .query({ itemId: item._id.toString(), supplierId: supplier._id.toString() })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.latestRate.supplier).toBeTruthy();
            expect(response.body.data.latestRate.supplier.name).toBe('Test Supplier');
            expect(response.body.data.latestRate.supplier.code).toBe('SUP001');
            expect(response.body.data.latestRate.item).toBeTruthy();
            expect(response.body.data.latestRate.item.name).toBe('Test Item');
            expect(response.body.data.latestRate.item.code).toBe('ITEM001');
        });
    });
});
