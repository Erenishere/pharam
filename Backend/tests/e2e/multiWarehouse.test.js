const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const StockMovement = require('../../src/models/StockMovement');

/**
 * End-to-End Multi-Warehouse Operations Tests
 * Task 78.3: Test multi-warehouse operations
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Multi-Warehouse Operations', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem;
    let warehouse1, warehouse2, warehouse3;

    const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pharam_e2e_test';

    beforeAll(async () => {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Invoice.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});
        await User.deleteMany({});
        await Warehouse.deleteMany({});
        await StockMovement.deleteMany({});

        testUser = await User.create({
            username: 'testadmin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
        });

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'password123' });

        authToken = loginResponse.body.data.token;

        // Create multiple warehouses
        warehouse1 = await Warehouse.create({
            code: 'WH001',
            name: 'Main Warehouse',
            location: 'City Center',
            isActive: true
        });

        warehouse2 = await Warehouse.create({
            code: 'WH002',
            name: 'Branch Warehouse',
            location: 'Suburb',
            isActive: true
        });

        warehouse3 = await Warehouse.create({
            code: 'WH003',
            name: 'Backup Warehouse',
            location: 'Industrial Area',
            isActive: true
        });

        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890'
        });

        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Multi-Warehouse Item',
            category: 'Electronics',
            unit: 'piece',
            pricing: {
                costPrice: 100,
                salePrice: 150
            },
            stock: {
                quantity: 1000
            }
        });
    });

    describe('Warehouse-Specific Invoicing', () => {
        it('should create invoice with different warehouses per item', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 10,
                        unitPrice: 150,
                        warehouseId: warehouse1._id
                    },
                    {
                        itemId: testItem._id,
                        quantity: 5,
                        unitPrice: 150,
                        warehouseId: warehouse2._id
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.data.items).toHaveLength(2);
            expect(response.body.data.items[0].warehouseId).toBe(warehouse1._id.toString());
            expect(response.body.data.items[1].warehouseId).toBe(warehouse2._id.toString());
        });

        it('should verify warehouse-wise stock deduction', async () => {
            // Record initial stock per warehouse
            const initialStock = testItem.stock.quantity;

            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 10,
                        unitPrice: 150,
                        warehouseId: warehouse1._id
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);

            // Confirm invoice to trigger stock movement
            await request(app)
                .patch(`/api/invoices/sales/${response.body.data._id}/confirm`)
                .set('Authorization', `Bearer ${authToken}`);

            // Verify stock movement was recorded
            const stockMovements = await StockMovement.find({
                itemId: testItem._id,
                warehouseId: warehouse1._id
            });

            expect(stockMovements.length).toBeGreaterThan(0);
        });
    });

    describe('Stock Transfer Between Warehouses', () => {
        it('should transfer stock from one warehouse to another', async () => {
            const transferData = {
                itemId: testItem._id,
                fromWarehouseId: warehouse1._id,
                toWarehouseId: warehouse2._id,
                quantity: 50,
                transferDate: new Date(),
                notes: 'Stock rebalancing'
            };

            const response = await request(app)
                .post('/api/stock-movements/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transferData);

            expect(response.status).toBe(201);
            expect(response.body.data.type).toBe('transfer');
            expect(response.body.data.quantity).toBe(50);
        });

        it('should verify source warehouse deduction', async () => {
            const transferData = {
                itemId: testItem._id,
                fromWarehouseId: warehouse1._id,
                toWarehouseId: warehouse2._id,
                quantity: 50
            };

            await request(app)
                .post('/api/stock-movements/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transferData);

            // Verify stock movement records
            const movements = await StockMovement.find({
                itemId: testItem._id,
                warehouseId: warehouse1._id,
                type: 'transfer_out'
            });

            expect(movements.length).toBeGreaterThan(0);
        });

        it('should verify destination warehouse addition', async () => {
            const transferData = {
                itemId: testItem._id,
                fromWarehouseId: warehouse1._id,
                toWarehouseId: warehouse2._id,
                quantity: 50
            };

            await request(app)
                .post('/api/stock-movements/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transferData);

            // Verify stock movement records
            const movements = await StockMovement.find({
                itemId: testItem._id,
                warehouseId: warehouse2._id,
                type: 'transfer_in'
            });

            expect(movements.length).toBeGreaterThan(0);
        });
    });

    describe('Batch Tracking Per Warehouse', () => {
        it('should track batches separately per warehouse', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 10,
                        unitPrice: 150,
                        warehouseId: warehouse1._id,
                        batchNo: 'BATCH-WH1-001'
                    },
                    {
                        itemId: testItem._id,
                        quantity: 5,
                        unitPrice: 150,
                        warehouseId: warehouse2._id,
                        batchNo: 'BATCH-WH2-001'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.data.items[0].batchNo).toBe('BATCH-WH1-001');
            expect(response.body.data.items[1].batchNo).toBe('BATCH-WH2-001');
        });
    });

    describe('Warehouse-Wise Stock Reports', () => {
        it('should generate warehouse-wise stock report', async () => {
            const response = await request(app)
                .get('/api/reports/warehouse-stock')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    warehouseId: warehouse1._id
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });

        it('should verify stock levels per warehouse', async () => {
            // Create some stock movements
            await StockMovement.create({
                itemId: testItem._id,
                warehouseId: warehouse1._id,
                type: 'in',
                quantity: 100,
                date: new Date()
            });

            const response = await request(app)
                .get('/api/reports/warehouse-stock')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    warehouseId: warehouse1._id,
                    itemId: testItem._id
                });

            expect(response.status).toBe(200);
        });
    });

    describe('Complete Multi-Warehouse Workflow', () => {
        it('should handle complete multi-warehouse scenario', async () => {
            // Step 1: Create invoice with items from different warehouses
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 20,
                        unitPrice: 150,
                        warehouseId: warehouse1._id
                    },
                    {
                        itemId: testItem._id,
                        quantity: 10,
                        unitPrice: 150,
                        warehouseId: warehouse2._id
                    }
                ]
            };

            const invoiceResponse = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(invoiceResponse.status).toBe(201);

            // Step 2: Confirm invoice
            const confirmResponse = await request(app)
                .patch(`/api/invoices/sales/${invoiceResponse.body.data._id}/confirm`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(confirmResponse.status).toBe(200);

            // Step 3: Transfer stock between warehouses
            const transferResponse = await request(app)
                .post('/api/stock-movements/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    itemId: testItem._id,
                    fromWarehouseId: warehouse3._id,
                    toWarehouseId: warehouse1._id,
                    quantity: 50
                });

            expect(transferResponse.status).toBe(201);

            // Step 4: Verify all stock movements
            const movements = await StockMovement.find({
                itemId: testItem._id
            });

            expect(movements.length).toBeGreaterThan(0);
        });
    });
});
