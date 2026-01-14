const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Scheme = require('../../src/models/Scheme');

/**
 * End-to-End Reporting Features Tests
 * Task 78.7: Test all reporting features
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Reporting Features', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem;
    let testScheme;

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
        await Scheme.deleteMany({});

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

        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890',
            creditDays: 30
        });

        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Product',
            category: 'Electronics',
            unit: 'piece',
            pricing: { costPrice: 100, salePrice: 150 }
        });

        testScheme = await Scheme.create({
            code: 'SCH001',
            name: 'Test Scheme',
            type: 'quantity',
            minQuantity: 10,
            freeQuantity: 1,
            isActive: true
        });

        // Create test invoices for reporting
        await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [
                {
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500,
                    discount: 5
                }
            ],
            totals: {
                subtotal: 1500,
                discount: 75,
                taxAmount: 270,
                grandTotal: 1695
            },
            dimension: 'Electronics',
            status: 'confirmed',
            paymentStatus: 'pending',
            createdBy: testUser._id
        });
    });

    describe('Dimension-Based Reports', () => {
        it('should generate sales by dimension report', async () => {
            const response = await request(app)
                .get('/api/reports/sales-by-dimension')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter by specific dimension', async () => {
            const response = await request(app)
                .get('/api/reports/sales-by-dimension')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    dimension: 'Electronics',
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('Scheme and Discount Reports', () => {
        it('should generate scheme utilization report', async () => {
            const response = await request(app)
                .get('/api/reports/scheme-utilization')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });

        it('should generate discount summary report', async () => {
            const response = await request(app)
                .get('/api/reports/discount-summary')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('totalDiscount');
        });

        it('should generate trade offer report', async () => {
            const response = await request(app)
                .get('/api/reports/trade-offers')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });
    });

    describe('Tax Reports', () => {
        it('should generate tax breakdown report', async () => {
            const response = await request(app)
                .get('/api/reports/tax-breakdown')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('cgst');
            expect(response.body.data).toHaveProperty('sgst');
            expect(response.body.data).toHaveProperty('igst');
        });

        it('should calculate tax summary by period', async () => {
            const response = await request(app)
                .get('/api/reports/tax-summary')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    period: 'monthly',
                    year: new Date().getFullYear()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });
    });

    describe('Aging and Recovery Reports', () => {
        beforeEach(async () => {
            // Create invoices with different aging
            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                items: [],
                totals: { subtotal: 1000, grandTotal: 1000 },
                status: 'confirmed',
                paymentStatus: 'pending',
                createdBy: testUser._id
            });

            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
                dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                items: [],
                totals: { subtotal: 2000, grandTotal: 2000 },
                status: 'confirmed',
                paymentStatus: 'pending',
                createdBy: testUser._id
            });
        });

        it('should generate aging report with buckets', async () => {
            const response = await request(app)
                .get('/api/reports/aging')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    customerId: testCustomer._id
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('agingBuckets');
            expect(response.body.data.agingBuckets).toHaveProperty('0-30');
            expect(response.body.data.agingBuckets).toHaveProperty('31-60');
            expect(response.body.data.agingBuckets).toHaveProperty('61-90');
            expect(response.body.data.agingBuckets).toHaveProperty('90+');
        });

        it('should calculate overdue amounts', async () => {
            const response = await request(app)
                .get('/api/reports/aging')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    customerId: testCustomer._id
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('totalOverdue');
            expect(response.body.data.totalOverdue).toBeGreaterThan(0);
        });

        it('should generate recovery summary', async () => {
            const response = await request(app)
                .get('/api/reports/recovery-summary')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('totalPending');
            expect(response.body.data).toHaveProperty('totalRecovered');
        });
    });

    describe('Report Accuracy Verification', () => {
        it('should verify sales report totals match invoices', async () => {
            const response = await request(app)
                .get('/api/reports/sales-summary')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);

            // Verify totals
            const invoices = await Invoice.find({
                type: 'sales',
                status: 'confirmed',
                invoiceDate: {
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    $lte: new Date()
                }
            });

            const expectedTotal = invoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
            expect(response.body.data.totalSales).toBe(expectedTotal);
        });
    });

    describe('Complete Reporting Workflow', () => {
        it('should generate all reports for a period', async () => {
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = new Date();

            // Generate all reports
            const reports = [
                '/api/reports/sales-by-dimension',
                '/api/reports/scheme-utilization',
                '/api/reports/discount-summary',
                '/api/reports/tax-breakdown',
                '/api/reports/aging',
                '/api/reports/recovery-summary'
            ];

            for (const reportUrl of reports) {
                const response = await request(app)
                    .get(reportUrl)
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({ startDate, endDate });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            }
        });
    });
});
