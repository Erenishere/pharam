const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');

describe('Advanced Search Integration', () => {
    let token;
    let user;
    let customer;

    beforeEach(async () => {
        await User.deleteMany({});
        await Invoice.deleteMany({});
        await Customer.deleteMany({});

        // Create test user and get token
        user = await User.create({
            username: 'testadmin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
        });

        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'password123'
            });

        token = loginRes.body.token;

        // Create test customer
        customer = await Customer.create({
            name: 'Test Customer',
            code: 'CUST001',
            type: 'customer'
        });

        // Create test invoices
        await Invoice.create([
            {
                type: 'sale',
                customerId: customer._id,
                invoiceNo: 'SI-001',
                invoiceDate: new Date('2024-01-01'),
                status: 'confirmed',
                totals: { grandTotal: 1000 },
                items: [],
                createdBy: user._id
            },
            {
                type: 'sale',
                customerId: customer._id,
                invoiceNo: 'SI-002',
                invoiceDate: new Date('2024-01-02'),
                status: 'draft',
                totals: { grandTotal: 2000 },
                items: [],
                createdBy: user._id
            },
            {
                type: 'sale',
                customerId: customer._id,
                invoiceNo: 'SI-003',
                invoiceDate: new Date('2024-01-03'),
                status: 'confirmed',
                totals: { grandTotal: 3000 },
                notes: 'Important invoice',
                items: [],
                createdBy: user._id
            }
        ]);
    });

    describe('POST /api/v1/invoices/sales/search', () => {
        it('should search invoices with filters', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    filters: [
                        { field: 'status', operator: 'equals', value: 'confirmed' }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.pagination.total).toBe(2);
        });

        it('should search invoices with text search', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    searchText: 'SI-001',
                    searchFields: ['invoiceNo']
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].invoiceNo).toBe('SI-001');
        });

        it('should search invoices with multiple filters', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    filters: [
                        { field: 'status', operator: 'equals', value: 'confirmed' },
                        { field: 'totals.grandTotal', operator: 'gt', value: 2000 }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].invoiceNo).toBe('SI-003');
        });

        it('should search invoices with sorting', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    sort: [
                        { field: 'totals.grandTotal', order: 'desc' }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data[0].totals.grandTotal).toBe(3000);
            expect(res.body.data[2].totals.grandTotal).toBe(1000);
        });

        it('should search invoices with pagination', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    page: 1,
                    limit: 2
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(2);
            expect(res.body.pagination.total).toBe(3);
            expect(res.body.pagination.hasNext).toBe(true);
        });

        it('should search invoices with contains operator', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    filters: [
                        { field: 'invoiceNo', operator: 'contains', value: 'SI' }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(3);
        });

        it('should search invoices with between operator', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    filters: [
                        { field: 'totals.grandTotal', operator: 'between', value: [1500, 2500] }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].invoiceNo).toBe('SI-002');
        });

        it('should search invoices with in operator', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    filters: [
                        { field: 'invoiceNo', operator: 'in', value: ['SI-001', 'SI-003'] }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
        });

        it('should combine text search with filters', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    searchText: 'Important',
                    searchFields: ['notes'],
                    filters: [
                        { field: 'status', operator: 'equals', value: 'confirmed' }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].invoiceNo).toBe('SI-003');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .send({
                    filters: []
                });

            expect(res.status).toBe(401);
        });

        it('should validate filters format', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    filters: 'invalid'
                });

            expect(res.status).toBe(400);
        });

        it('should handle multi-column sorting', async () => {
            const res = await request(app)
                .post('/api/v1/invoices/sales/search')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    sort: [
                        { field: 'status', order: 'asc' },
                        { field: 'totals.grandTotal', order: 'desc' }
                    ]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(3);
        });
    });
});
