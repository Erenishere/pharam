const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Notes Search Integration Tests
 * Phase 2 - Requirement 33: Note/Memo Field for Invoices
 * Task 77.3: Implement notes search
 */

describe('Notes Search Integration Tests', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem;
    let invoice1, invoice2, invoice3;

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

        // Create test item
        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Electronics',
            unit: 'piece',
            pricing: {
                costPrice: 100,
                salePrice: 150
            }
        });

        // Create test invoices with different notes
        invoice1 = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [
                {
                    itemId: testItem._id,
                    quantity: 1,
                    unitPrice: 150,
                    lineTotal: 150
                }
            ],
            totals: {
                subtotal: 150,
                grandTotal: 150
            },
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: testUser._id,
            notes: 'Urgent delivery required before Friday',
            memoNo: 'MEMO-001'
        });

        invoice2 = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [
                {
                    itemId: testItem._id,
                    quantity: 2,
                    unitPrice: 150,
                    lineTotal: 300
                }
            ],
            totals: {
                subtotal: 300,
                grandTotal: 300
            },
            status: 'confirmed',
            paymentStatus: 'pending',
            createdBy: testUser._id,
            notes: 'Customer requested special packaging',
            memoNo: 'MEMO-002'
        });

        invoice3 = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [
                {
                    itemId: testItem._id,
                    quantity: 3,
                    unitPrice: 150,
                    lineTotal: 450
                }
            ],
            totals: {
                subtotal: 450,
                grandTotal: 450
            },
            status: 'confirmed',
            paymentStatus: 'paid',
            createdBy: testUser._id,
            notes: 'Standard delivery instructions',
            memoNo: 'MEMO-003'
        });
    });

    describe('POST /api/invoices/sales/search - Notes search', () => {
        it('should search invoices by notes content', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'delivery',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);

            // Should find invoice1 and invoice3 which contain "delivery"
            const invoiceIds = response.body.data.map(inv => inv._id.toString());
            expect(invoiceIds).toContain(invoice1._id.toString());
            expect(invoiceIds).toContain(invoice3._id.toString());
        });

        it('should search invoices by specific keyword in notes', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'urgent',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0]._id).toBe(invoice1._id.toString());
            expect(response.body.data[0].notes).toContain('Urgent');
        });

        it('should search invoices by notes with case insensitivity', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'PACKAGING',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0]._id).toBe(invoice2._id.toString());
        });

        it('should return empty results for non-existent notes content', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'nonexistent',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(0);
        });

        it('should search across both invoiceNo and notes', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'delivery',
                    searchFields: ['invoiceNo', 'notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Should find invoices with "delivery" in notes
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        });

        it('should combine notes search with filters', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'delivery',
                    searchFields: ['notes'],
                    filters: [
                        {
                            field: 'status',
                            operator: 'equals',
                            value: 'confirmed'
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Should only find invoice3 (confirmed status with "delivery" in notes)
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0]._id).toBe(invoice3._id.toString());
            expect(response.body.data[0].status).toBe('confirmed');
        });

        it('should support pagination with notes search', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'delivery',
                    searchFields: ['notes'],
                    page: 1,
                    limit: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
        });

        it('should require authentication for notes search', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .send({
                    searchText: 'delivery',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(401);
        });
    });

    describe('Notes filtering', () => {
        it('should filter invoices with notes using contains operator', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    filters: [
                        {
                            field: 'notes',
                            operator: 'contains',
                            value: 'special'
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0]._id).toBe(invoice2._id.toString());
        });

        it('should filter invoices by memoNo', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    filters: [
                        {
                            field: 'memoNo',
                            operator: 'equals',
                            value: 'MEMO-002'
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].memoNo).toBe('MEMO-002');
        });
    });

    describe('Notes display in search results', () => {
        it('should include notes in search results', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'urgent',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.data[0]).toHaveProperty('notes');
            expect(response.body.data[0].notes).toBe('Urgent delivery required before Friday');
        });

        it('should include memoNo in search results', async () => {
            const response = await request(app)
                .post('/api/invoices/sales/search')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    searchText: 'urgent',
                    searchFields: ['notes']
                });

            expect(response.status).toBe(200);
            expect(response.body.data[0]).toHaveProperty('memoNo');
            expect(response.body.data[0].memoNo).toBe('MEMO-001');
        });
    });
});
