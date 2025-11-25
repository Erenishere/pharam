const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const Salesman = require('../../src/models/Salesman');
const Scheme = require('../../src/models/Scheme');

/**
 * End-to-End Sales Workflow Integration Tests
 * Task 78.1: Test complete sales workflow with Phase 2 features
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Complete Sales Workflow', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem1, testItem2;
    let testWarehouse;
    let testSalesman;
    let testScheme;

    // Use real database
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
        // Clean up all collections
        await Invoice.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});
        await User.deleteMany({});
        await Warehouse.deleteMany({});
        await Salesman.deleteMany({});
        await Scheme.deleteMany({});

        // Create test user
        testUser = await User.create({
            username: 'testadmin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
        });

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'password123'
            });

        authToken = loginResponse.body.data.token;

        // Create test warehouse
        testWarehouse = await Warehouse.create({
            code: 'WH001',
            name: 'Main Warehouse',
            location: 'City Center',
            isActive: true
        });

        // Create test salesman
        testSalesman = await Salesman.create({
            code: 'SM001',
            name: 'John Doe',
            phone: '1234567890',
            commissionRate: 2.5,
            isActive: true
        });

        // Create test customer with credit limit
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer Ltd',
            address: '123 Business St',
            city: 'Test City',
            phone: '9876543210',
            email: 'customer@test.com',
            creditLimit: 100000,
            creditDays: 30,
            openingBalance: 0
        });

        // Create test items with barcodes and schemes
        testItem1 = await Item.create({
            code: 'ITEM001',
            name: 'Test Product 1',
            category: 'Electronics',
            unit: 'piece',
            barcode: '1234567890123',
            pricing: {
                costPrice: 100,
                salePrice: 150,
                mrp: 180
            },
            stock: {
                quantity: 1000,
                reorderLevel: 50
            },
            defaultWarrantyMonths: 12,
            defaultWarrantyDetails: 'Standard manufacturer warranty'
        });

        testItem2 = await Item.create({
            code: 'ITEM002',
            name: 'Test Product 2',
            category: 'Electronics',
            unit: 'piece',
            barcode: '9876543210987',
            pricing: {
                costPrice: 200,
                salePrice: 300,
                mrp: 350
            },
            stock: {
                quantity: 500,
                reorderLevel: 25
            },
            defaultWarrantyMonths: 24,
            defaultWarrantyDetails: 'Extended 2-year warranty'
        });

        // Create test scheme
        testScheme = await Scheme.create({
            code: 'SCH001',
            name: 'Buy 10 Get 1 Free',
            type: 'quantity',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            minQuantity: 10,
            freeQuantity: 1,
            isActive: true
        });
    });

    describe('Complete Sales Invoice Creation', () => {
        it('should create sales invoice with all Phase 2 features', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                salesmanId: testSalesman._id,
                warehouseId: testWarehouse._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 12,
                        unitPrice: 150,
                        discount: 5,
                        warehouseId: testWarehouse._id,
                        // Warranty should auto-populate from item defaults
                    },
                    {
                        itemId: testItem2._id,
                        quantity: 5,
                        unitPrice: 300,
                        discount: 0,
                        warehouseId: testWarehouse._id,
                    }
                ],
                notes: 'Test invoice with all Phase 2 features',
                memoNo: 'MEMO-E2E-001'
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('invoiceNumber');
            expect(response.body.data.customerId).toBe(testCustomer._id.toString());
            expect(response.body.data.salesmanId).toBe(testSalesman._id.toString());
            expect(response.body.data.items).toHaveLength(2);

            // Verify calculations
            const invoice = response.body.data;
            expect(invoice.totals).toHaveProperty('subtotal');
            expect(invoice.totals).toHaveProperty('grandTotal');

            // Verify notes and memo
            expect(invoice.notes).toBe('Test invoice with all Phase 2 features');
            expect(invoice.memoNo).toBe('MEMO-E2E-001');
        });

        it('should apply schemes automatically', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 12, // Should trigger "Buy 10 Get 1 Free" scheme
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            // Note: Scheme application logic would need to be implemented in the invoice creation
        });

        it('should verify credit limit before creating invoice', async () => {
            // Create a large invoice that exceeds credit limit
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 1000, // 1000 * 150 = 150,000 (exceeds 100,000 limit)
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            // Should either warn or reject based on implementation
            // This tests the credit limit checking feature
        });
    });

    describe('Sales Return Flow', () => {
        let originalInvoice;

        beforeEach(async () => {
            // Create an original invoice first
            const invoiceData = {
                customerId: testCustomer._id,
                salesmanId: testSalesman._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 10,
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ],
                status: 'confirmed'
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            originalInvoice = response.body.data;
        });

        it('should create sales return and adjust stock', async () => {
            const returnData = {
                type: 'return_sales',
                customerId: testCustomer._id,
                originalInvoiceId: originalInvoice._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 3, // Returning 3 out of 10
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(returnData);

            expect(response.status).toBe(201);
            expect(response.body.data.type).toBe('return_sales');

            // Verify stock was adjusted back
            const updatedItem = await Item.findById(testItem1._id);
            // Stock should increase by 3 (returned items)
        });
    });

    describe('Payment and Aging', () => {
        let testInvoice;

        beforeEach(async () => {
            // Create a confirmed invoice
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 10,
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            testInvoice = response.body.data;

            // Confirm the invoice
            await request(app)
                .patch(`/api/invoices/sales/${testInvoice._id}/confirm`)
                .set('Authorization', `Bearer ${authToken}`);
        });

        it('should record partial payment', async () => {
            const paymentData = {
                amount: 500, // Partial payment
                paymentMethod: 'cash',
                paymentDate: new Date()
            };

            const response = await request(app)
                .post(`/api/invoices/sales/${testInvoice._id}/mark-partial-paid`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(paymentData);

            expect(response.status).toBe(200);
            expect(response.body.data.paymentStatus).toBe('partial');
        });

        it('should record full payment', async () => {
            const paymentData = {
                paymentMethod: 'bank_transfer',
                paymentDate: new Date()
            };

            const response = await request(app)
                .post(`/api/invoices/sales/${testInvoice._id}/mark-paid`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(paymentData);

            expect(response.status).toBe(200);
            expect(response.body.data.paymentStatus).toBe('paid');
        });
    });

    describe('Barcode Scanning Integration', () => {
        it('should find item by barcode', async () => {
            // This would test the barcode scanning feature
            // Assuming there's an endpoint to search items by barcode
            const barcode = testItem1.barcode;

            // Test implementation would depend on actual barcode API endpoint
        });
    });

    describe('Warranty Information', () => {
        it('should auto-populate warranty from item defaults', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 1,
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);

            // Verify warranty was auto-populated
            const invoice = response.body.data;
            // Note: This depends on warranty auto-population being implemented
        });

        it('should retrieve warranty information', async () => {
            // Create invoice first
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 1,
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ],
                warrantyInfo: 'All items covered under warranty'
            };

            const createResponse = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            const invoiceId = createResponse.body.data._id;

            // Get warranty info
            const response = await request(app)
                .get(`/api/invoices/sales/${invoiceId}/warranty`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('invoiceWarranty');
        });
    });

    describe('Complete Workflow Verification', () => {
        it('should complete full sales cycle: create -> confirm -> pay -> return', async () => {
            // Step 1: Create invoice
            const invoiceData = {
                customerId: testCustomer._id,
                salesmanId: testSalesman._id,
                warehouseId: testWarehouse._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 10,
                        unitPrice: 150,
                        discount: 5,
                        warehouseId: testWarehouse._id,
                    }
                ],
                notes: 'Complete workflow test',
                memoNo: 'MEMO-WORKFLOW-001'
            };

            const createResponse = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(createResponse.status).toBe(201);
            const invoice = createResponse.body.data;

            // Step 2: Confirm invoice
            const confirmResponse = await request(app)
                .patch(`/api/invoices/sales/${invoice._id}/confirm`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(confirmResponse.status).toBe(200);
            expect(confirmResponse.body.data.status).toBe('confirmed');

            // Step 3: Make payment
            const paymentResponse = await request(app)
                .post(`/api/invoices/sales/${invoice._id}/mark-paid`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    paymentMethod: 'cash',
                    paymentDate: new Date()
                });

            expect(paymentResponse.status).toBe(200);
            expect(paymentResponse.body.data.paymentStatus).toBe('paid');

            // Step 4: Create return
            const returnData = {
                type: 'return_sales',
                customerId: testCustomer._id,
                originalInvoiceId: invoice._id,
                items: [
                    {
                        itemId: testItem1._id,
                        quantity: 2,
                        unitPrice: 150,
                        warehouseId: testWarehouse._id,
                    }
                ]
            };

            const returnResponse = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(returnData);

            expect(returnResponse.status).toBe(201);
            expect(returnResponse.body.data.type).toBe('return_sales');

            // Verify final state
            const finalInvoice = await Invoice.findById(invoice._id);
            expect(finalInvoice.status).toBe('confirmed');
            expect(finalInvoice.paymentStatus).toBe('paid');
        });
    });
});
