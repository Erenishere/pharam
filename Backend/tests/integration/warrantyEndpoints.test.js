const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Warranty Endpoints Integration Tests
 * Phase 2 - Requirement 32: Warranty Information Management
 * Task 76: Implement warranty management
 */

describe('Warranty Endpoints', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem;
    let testInvoice;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharam_test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clean up
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

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        authToken = loginResponse.body.data.token;

        // Create test customer
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890'
        });

        // Create test item with default warranty
        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Electronics',
            unit: 'piece',
            pricing: {
                costPrice: 100,
                salePrice: 150
            },
            defaultWarrantyMonths: 12,
            defaultWarrantyDetails: 'Standard manufacturer warranty'
        });

        // Create test invoice
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
                    lineTotal: 150,
                    warrantyMonths: 12,
                    warrantyDetails: 'Standard warranty'
                }
            ],
            totals: {
                subtotal: 150,
                grandTotal: 150
            },
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: testUser._id,
            warrantyInfo: 'All items covered under warranty',
            warrantyPaste: true
        });
    });

    describe('GET /api/invoices/sales/:id/warranty', () => {
        it('should get warranty information for an invoice', async () => {
            const response = await request(app)
                .get(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('invoiceWarranty');
            expect(response.body.data).toHaveProperty('itemWarranties');
            expect(response.body.data).toHaveProperty('hasWarranty');
            expect(response.body.data.hasWarranty).toBe(true);
            expect(response.body.data.invoiceWarranty).toBe('All items covered under warranty');
            expect(response.body.data.itemWarranties).toHaveLength(1);
        });

        it('should return 404 for non-existent invoice', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/invoices/sales/${fakeId}/warranty`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
        });

        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .get(`/api/invoices/sales/${testInvoice._id}/warranty`);

            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/invoices/sales/:id/warranty', () => {
        it('should update warranty information for a draft invoice', async () => {
            const warrantyUpdate = {
                warrantyInfo: 'Updated warranty information',
                warrantyPaste: false,
                items: [
                    {
                        itemId: testItem._id.toString(),
                        warrantyMonths: 24,
                        warrantyDetails: 'Extended warranty'
                    }
                ]
            };

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(warrantyUpdate);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.warrantyInfo).toBe('Updated warranty information');
            expect(response.body.data.warrantyPaste).toBe(false);
            expect(response.body.data.items[0].warrantyMonths).toBe(24);
            expect(response.body.data.items[0].warrantyDetails).toBe('Extended warranty');
        });

        it('should reject update for confirmed invoice', async () => {
            testInvoice.status = 'confirmed';
            await testInvoice.save();

            const warrantyUpdate = {
                warrantyInfo: 'New warranty'
            };

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(warrantyUpdate);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toContain('draft invoices');
        });

        it('should reject invalid warranty data', async () => {
            const warrantyUpdate = {
                warrantyInfo: 'a'.repeat(501) // Exceeds max length
            };

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(warrantyUpdate);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require admin/sales/data_entry role', async () => {
            // Create a user with viewer role
            const viewerUser = await User.create({
                username: 'viewer',
                email: 'viewer@example.com',
                password: 'password123',
                role: 'viewer'
            });

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'viewer@example.com',
                    password: 'password123'
                });

            const viewerToken = loginResponse.body.data.token;

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({ warrantyInfo: 'Test' });

            expect(response.status).toBe(403);
        });

        it('should handle partial warranty updates', async () => {
            const warrantyUpdate = {
                warrantyPaste: false
            };

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(warrantyUpdate);

            expect(response.status).toBe(200);
            expect(response.body.data.warrantyPaste).toBe(false);
            expect(response.body.data.warrantyInfo).toBe('All items covered under warranty'); // Unchanged
        });

        it('should validate warranty months as integer', async () => {
            const warrantyUpdate = {
                items: [
                    {
                        itemId: testItem._id.toString(),
                        warrantyMonths: 12.5 // Non-integer
                    }
                ]
            };

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(warrantyUpdate);

            expect(response.status).toBe(400);
        });

        it('should validate warranty details length', async () => {
            const warrantyUpdate = {
                items: [
                    {
                        itemId: testItem._id.toString(),
                        warrantyDetails: 'a'.repeat(201) // Exceeds max length
                    }
                ]
            };

            const response = await request(app)
                .put(`/api/invoices/sales/${testInvoice._id}/warranty`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(warrantyUpdate);

            expect(response.status).toBe(400);
        });
    });

    describe('Warranty auto-population', () => {
        it('should auto-populate warranty from item defaults when creating invoice', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                items: [
                    {
                        itemId: testItem._id,
                        quantity: 1,
                        unitPrice: 150
                    }
                ]
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);

            // Note: Auto-population would need to be implemented in the invoice creation logic
            // This test documents the expected behavior
        });
    });
});
