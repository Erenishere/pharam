const request = require('supertest');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const { generateToken } = require('../../src/utils/jwt');

describe('Estimate API Integration Tests - Task 75', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem;
    let testEstimate;

    beforeAll(async () => {
        // Create test user
        testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin',
        });

        authToken = generateToken(testUser);

        // Create test customer
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890',
            email: 'customer@test.com',
        });

        // Create test item
        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            unit: 'pcs',
            salePrice: 100,
            purchasePrice: 80,
        });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});
        await Invoice.deleteMany({});
    });

    beforeEach(async () => {
        // Create a test estimate before each test
        testEstimate = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 86400000 * 30),
            status: 'draft',
            estimatePrint: true,
            printFormat: 'estimate',
            expiryDate: new Date(Date.now() + 86400000 * 30), // 30 days from now
            items: [{
                itemId: testItem._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
            }],
            totals: {
                subtotal: 1000,
                grandTotal: 1000,
            },
            createdBy: testUser._id,
        });
    });

    afterEach(async () => {
        await Invoice.deleteMany({});
    });

    describe('POST /api/invoices/sales/:id/convert-estimate - Task 75.3', () => {
        it('should convert estimate to invoice successfully', async () => {
            const response = await request(app)
                .post(`/api/invoices/sales/${testEstimate._id}/convert-estimate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('confirmed');
            expect(response.body.data.estimatePrint).toBe(false);
            expect(response.body.data.expiryDate).toBeUndefined();
            expect(response.body.message).toBe('Estimate converted to invoice successfully');

            // Verify in database
            const updatedInvoice = await Invoice.findById(testEstimate._id);
            expect(updatedInvoice.status).toBe('confirmed');
            expect(updatedInvoice.estimatePrint).toBe(false);
        });

        it('should return 404 when estimate not found', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .post(`/api/invoices/sales/${fakeId}/convert-estimate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('ESTIMATE_NOT_FOUND');
        });

        it('should return 400 when trying to convert non-draft invoice', async () => {
            testEstimate.status = 'confirmed';
            await testEstimate.save();

            const response = await request(app)
                .post(`/api/invoices/sales/${testEstimate._id}/convert-estimate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toContain('Only draft estimates');
        });

        it('should return 400 when trying to convert expired estimate', async () => {
            testEstimate.expiryDate = new Date(Date.now() - 86400000); // Yesterday
            await testEstimate.save();

            const response = await request(app)
                .post(`/api/invoices/sales/${testEstimate._id}/convert-estimate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toContain('Cannot convert expired');
        });

        it('should require authentication', async () => {
            await request(app)
                .post(`/api/invoices/sales/${testEstimate._id}/convert-estimate`)
                .expect(401);
        });
    });

    describe('GET /api/invoices/sales/estimates/pending - Task 75.4', () => {
        it('should return pending estimates', async () => {
            const response = await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.total).toBeGreaterThan(0);
        });

        it('should filter by customer ID', async () => {
            const response = await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .query({ customerId: testCustomer._id.toString() })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            response.body.data.forEach(estimate => {
                expect(estimate.customerId._id).toBe(testCustomer._id.toString());
            });
        });

        it('should support pagination', async () => {
            // Create additional estimates
            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 86400000 * 30),
                status: 'draft',
                estimatePrint: true,
                items: [{
                    itemId: testItem._id,
                    quantity: 5,
                    unitPrice: 100,
                    lineTotal: 500,
                }],
                totals: {
                    subtotal: 500,
                    grandTotal: 500,
                },
                createdBy: testUser._id,
            });

            const response = await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .query({ page: 1, limit: 1 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
        });

        it('should exclude expired estimates by default', async () => {
            // Create an expired estimate
            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 86400000 * 30),
                status: 'draft',
                estimatePrint: true,
                expiryDate: new Date(Date.now() - 86400000), // Yesterday
                items: [{
                    itemId: testItem._id,
                    quantity: 5,
                    unitPrice: 100,
                    lineTotal: 500,
                }],
                totals: {
                    subtotal: 500,
                    grandTotal: 500,
                },
                createdBy: testUser._id,
            });

            const response = await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            // Should only return the non-expired estimate
            const expiredEstimates = response.body.data.filter(est =>
                est.expiryDate && new Date(est.expiryDate) < new Date()
            );
            expect(expiredEstimates.length).toBe(0);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .expect(401);
        });
    });

    describe('GET /api/invoices/sales/estimates/expired - Task 75.5', () => {
        beforeEach(async () => {
            // Create an expired estimate
            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 86400000 * 30),
                status: 'draft',
                estimatePrint: true,
                expiryDate: new Date(Date.now() - 86400000), // Yesterday
                items: [{
                    itemId: testItem._id,
                    quantity: 5,
                    unitPrice: 100,
                    lineTotal: 500,
                }],
                totals: {
                    subtotal: 500,
                    grandTotal: 500,
                },
                createdBy: testUser._id,
            });
        });

        it('should return expired estimates', async () => {
            const response = await request(app)
                .get('/api/invoices/sales/estimates/expired')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            // Verify all returned estimates are expired
            response.body.data.forEach(estimate => {
                expect(new Date(estimate.expiryDate)).toBeLessThan(new Date());
                expect(estimate.status).toBe('draft');
                expect(estimate.estimatePrint).toBe(true);
            });
        });

        it('should filter by customer ID', async () => {
            const response = await request(app)
                .get('/api/invoices/sales/estimates/expired')
                .query({ customerId: testCustomer._id.toString() })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(estimate => {
                expect(estimate.customerId._id).toBe(testCustomer._id.toString());
            });
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/invoices/sales/estimates/expired')
                .query({ page: 1, limit: 10 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/invoices/sales/estimates/expired')
                .expect(401);
        });
    });

    describe('Estimate workflow integration', () => {
        it('should handle complete estimate lifecycle', async () => {
            // 1. Create estimate
            const createResponse = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    customerId: testCustomer._id,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 86400000 * 30),
                    estimatePrint: true,
                    printFormat: 'estimate',
                    expiryDate: new Date(Date.now() + 86400000 * 30),
                    items: [{
                        itemId: testItem._id,
                        quantity: 10,
                        unitPrice: 100,
                    }],
                })
                .expect(201);

            const estimateId = createResponse.body.data._id;

            // 2. Verify it appears in pending estimates
            const pendingResponse = await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const foundEstimate = pendingResponse.body.data.find(e => e._id === estimateId);
            expect(foundEstimate).toBeDefined();

            // 3. Convert to invoice
            const convertResponse = await request(app)
                .post(`/api/invoices/sales/${estimateId}/convert-estimate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(convertResponse.body.data.status).toBe('confirmed');
            expect(convertResponse.body.data.estimatePrint).toBe(false);

            // 4. Verify it no longer appears in pending estimates
            const pendingAfterConvert = await request(app)
                .get('/api/invoices/sales/estimates/pending')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const stillPending = pendingAfterConvert.body.data.find(e => e._id === estimateId);
            expect(stillPending).toBeUndefined();
        });
    });
});
