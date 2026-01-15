const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Salesman = require('../../src/models/Salesman');
const Invoice = require('../../src/models/Invoice');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Integration Tests for Commission Report API Endpoint
 * Tests for Requirement 9.5 - Task 40.2
 */
describe('Commission Report API Endpoint', () => {
    let authToken;
    let testUser;
    let testSalesman1;
    let testSalesman2;
    let testCustomer;
    let testItem;

    beforeAll(async () => {
        // Create test user for authentication
        testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'admin'
        });

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                username: 'testuser',
                password: 'password123'
            });

        authToken = loginResponse.body.token;
    });

    beforeEach(async () => {
        // Create test data
        testSalesman1 = await Salesman.create({
            code: 'SM001',
            name: 'John Doe',
            phone: '1234567890',
            email: 'john@example.com',
            commissionRate: 5,
            isActive: true
        });

        testSalesman2 = await Salesman.create({
            code: 'SM002',
            name: 'Jane Smith',
            phone: '0987654321',
            email: 'jane@example.com',
            commissionRate: 3,
            isActive: true
        });

        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            phone: '1234567890',
            address: 'Test Address',
            city: 'Test City',
            isActive: true
        });

        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Item',
            category: 'Test Category',
            unit: 'PCS',
            pricing: {
                costPrice: 100,
                salePrice: 150,
                mrp: 200
            },
            stock: {
                currentStock: 1000,
                minStock: 10,
                maxStock: 5000
            },
            isActive: true
        });

        // Create test invoices
        await Invoice.create({
            invoiceNumber: 'INV-001',
            type: 'sales',
            invoiceDate: new Date('2024-01-15'),
            customerId: testCustomer._id,
            salesmanId: testSalesman1._id,
            items: [{
                itemId: testItem._id,
                quantity: 10,
                unitPrice: 150,
                lineTotal: 1500
            }],
            totals: {
                subtotal: 1500,
                totalDiscount: 0,
                totalTax: 0,
                grandTotal: 1500
            },
            status: 'confirmed'
        });

        await Invoice.create({
            invoiceNumber: 'INV-002',
            type: 'sales',
            invoiceDate: new Date('2024-01-16'),
            customerId: testCustomer._id,
            salesmanId: testSalesman2._id,
            items: [{
                itemId: testItem._id,
                quantity: 20,
                unitPrice: 150,
                lineTotal: 3000
            }],
            totals: {
                subtotal: 3000,
                totalDiscount: 0,
                totalTax: 0,
                grandTotal: 3000
            },
            status: 'confirmed'
        });

        // Create test cash receipts
        await CashReceipt.create({
            receiptNumber: 'REC-001',
            receiptDate: new Date('2024-01-15'),
            customerId: testCustomer._id,
            salesmanId: testSalesman1._id,
            amount: 2000,
            paymentMethod: 'cash',
            status: 'cleared'
        });

        await CashReceipt.create({
            receiptNumber: 'REC-002',
            receiptDate: new Date('2024-01-16'),
            customerId: testCustomer._id,
            salesmanId: testSalesman2._id,
            amount: 1500,
            paymentMethod: 'cash',
            status: 'cleared'
        });
    });

    afterEach(async () => {
        await Salesman.deleteMany({});
        await Invoice.deleteMany({});
        await CashReceipt.deleteMany({});
        await Customer.deleteMany({});
        await Item.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
    });

    describe('GET /api/v1/reports/salesman-commission', () => {
        it('should return commission report for a specific salesman', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.reportType).toBe('salesman_commission');
            expect(response.body.data.salesmanId).toBe(testSalesman1._id.toString());
            expect(response.body.data.commissionDetails).toHaveLength(1);

            const commission = response.body.data.commissionDetails[0];
            expect(commission.salesmanCode).toBe('SM001');
            expect(commission.sales.totalSales).toBe(1500);
            expect(commission.sales.commission).toBe(75); // 5% of 1500
            expect(commission.collections.totalCollections).toBe(2000);
            expect(commission.collections.commission).toBe(100); // 5% of 2000
            expect(commission.totalCommission).toBe(175);
        });

        it('should return commission report for all salesmen when no salesmanId provided', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.summary.totalSalesmen).toBe(2);
            expect(response.body.data.commissionDetails).toHaveLength(2);

            // Should be sorted by total commission descending
            expect(response.body.data.commissionDetails[0].salesmanCode).toBe('SM001');
            expect(response.body.data.commissionDetails[1].salesmanCode).toBe('SM002');
        });

        it('should calculate commission based on sales only when commissionBasis is sales', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    commissionBasis: 'sales'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.sales.commission).toBe(75);
            expect(commission.collections.commission).toBe(0);
            expect(commission.totalCommission).toBe(75);
        });

        it('should calculate commission based on collections only when commissionBasis is collections', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    commissionBasis: 'collections'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.sales.commission).toBe(0);
            expect(commission.collections.commission).toBe(100);
            expect(commission.totalCommission).toBe(100);
        });

        it('should use custom sales commission rate when provided', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    commissionBasis: 'sales',
                    salesCommissionRate: '10'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.sales.commissionRate).toBe(10);
            expect(commission.sales.commission).toBe(150); // 10% of 1500
        });

        it('should use custom collections commission rate when provided', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    commissionBasis: 'collections',
                    collectionsCommissionRate: '7'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.collections.commissionRate).toBe(7);
            expect(commission.collections.commission).toBe(140); // 7% of 2000
        });

        it('should return 400 when startDate is missing', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Start date and end date are required');
        });

        it('should return 400 when endDate is missing', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2024-01-01'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Start date and end date are required');
        });

        it('should return 400 when invalid commissionBasis is provided', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    commissionBasis: 'invalid'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Commission basis must be one of');
        });

        it('should return 401 when no authentication token is provided', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .query({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(401);
        });

        it('should include correct summary totals', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            const summary = response.body.data.summary;
            expect(summary.totalSalesmen).toBe(2);

            // SM001: 5% of (1500 + 2000) = 175
            // SM002: 3% of (3000 + 1500) = 135
            expect(summary.totalSalesCommission).toBe(120); // 75 + 90
            expect(summary.totalCollectionsCommission).toBe(145); // 100 + 45
            expect(summary.totalCommission).toBe(265); // 175 + 135
        });

        it('should filter by date range correctly', async () => {
            // Create invoice outside date range
            await Invoice.create({
                invoiceNumber: 'INV-003',
                type: 'sales',
                invoiceDate: new Date('2024-02-15'),
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [{
                    itemId: testItem._id,
                    quantity: 100,
                    unitPrice: 150,
                    lineTotal: 15000
                }],
                totals: {
                    subtotal: 15000,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 15000
                },
                status: 'confirmed'
            });

            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            // Should only include INV-001 (1500), not INV-003 (15000)
            expect(commission.sales.totalSales).toBe(1500);
            expect(commission.sales.commission).toBe(75);
        });

        it('should handle salesman with no sales or collections', async () => {
            // Create a new salesman with no activity
            const newSalesman = await Salesman.create({
                code: 'SM003',
                name: 'New Salesman',
                commissionRate: 5,
                isActive: true
            });

            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: newSalesman._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.sales.totalSales).toBe(0);
            expect(commission.collections.totalCollections).toBe(0);
            expect(commission.totalCommission).toBe(0);
        });

        it('should include period information in response', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.period).toBeDefined();
            expect(response.body.data.period.startDate).toBe('2024-01-01');
            expect(response.body.data.period.endDate).toBe('2024-01-31');
        });

        it('should include generatedAt timestamp in response', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.generatedAt).toBeDefined();
            expect(new Date(response.body.data.generatedAt)).toBeInstanceOf(Date);
        });

        it('should include salesman details in commission breakdown', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.salesmanId).toBeDefined();
            expect(commission.salesmanCode).toBe('SM001');
            expect(commission.salesmanName).toBe('John Doe');
            expect(commission.commissionRate).toBe(5);
        });

        it('should include invoice and receipt counts', async () => {
            const response = await request(app)
                .get('/api/v1/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id.toString(),
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                });

            expect(response.status).toBe(200);
            const commission = response.body.data.commissionDetails[0];
            expect(commission.sales.invoiceCount).toBe(1);
            expect(commission.collections.receiptCount).toBe(1);
        });
    });
});
