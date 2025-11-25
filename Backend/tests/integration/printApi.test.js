const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Print API Integration Tests (Task 63)', () => {
    let authToken;
    let invoice, customer, item, user;

    beforeAll(async () => {
        // Create test user
        user = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });

        // Generate auth token
        authToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'test_jwt_secret', { expiresIn: '1h' });
    });

    // No afterAll needed as setup.js handles connection cleanup

    beforeEach(async () => {
        await Invoice.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});

        // Create test data
        customer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            type: 'customer',
            address: '123 Main St',
            city: 'Test City',
            phone: '1234567890'
        });

        item = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Test',
            unit: 'piece',
            pricing: { salePrice: 100, costPrice: 80 },
            stock: { currentStock: 100 }
        });

        invoice = await Invoice.create({
            invoiceNumber: 'INV001',
            type: 'sales',
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            status: 'confirmed',
            paymentStatus: 'pending',
            items: [
                {
                    itemId: item._id,
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }
            ],
            totals: {
                subtotal: 1000,
                totalDiscount: 0,
                totalTax: 0,
                grandTotal: 1000
            },
            createdBy: user._id
        });
    });

    describe('GET /api/print/invoices/:id', () => {
        it('should get print data for invoice', async () => {
            const response = await request(app)
                .get(`/api/print/invoices/${invoice._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.format).toBe('standard');
            expect(response.body.data.invoice.invoiceNumber).toBe('INV001');
            expect(response.body.data.items).toHaveLength(1);
        });

        it('should accept format parameter', async () => {
            const response = await request(app)
                .get(`/api/print/invoices/${invoice._id}`)
                .query({ format: 'thermal' })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.format).toBe('thermal');
            expect(response.body.data.formatting.compactLayout).toBe(true);
        });

        it('should return 404 for non-existent invoice', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/print/invoices/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invoice not found');
        });

        it('should return 400 for invalid format', async () => {
            const response = await request(app)
                .get(`/api/print/invoices/${invoice._id}`)
                .query({ format: 'invalid_format' })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid print format');
        });
    });

    describe('GET /api/print/invoices/:id/pdf', () => {
        it('should return 501 Not Implemented (placeholder)', async () => {
            const response = await request(app)
                .get(`/api/print/invoices/${invoice._id}/pdf`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(501);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('PDF generation not yet implemented');
        });

        it('should return 404 for non-existent invoice', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/print/invoices/${nonExistentId}/pdf`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invoice not found');
        });
    });

    describe('GET /api/print/formats', () => {
        it('should return available formats', async () => {
            const response = await request(app)
                .get('/api/print/formats')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(9);
            expect(response.body.data[0].value).toBe('standard');
        });
    });
});
