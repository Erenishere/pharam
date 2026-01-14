const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Salesman = require('../../src/models/Salesman');
const Route = require('../../src/models/Route');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');

/**
 * End-to-End Salesman and Route Management Tests
 * Task 78.5: Test salesman and route management
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Salesman and Route Management', () => {
    let authToken;
    let testUser;
    let testSalesman1, testSalesman2;
    let testRoute;
    let testCustomer;

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
        await Salesman.deleteMany({});
        await Route.deleteMany({});
        await Invoice.deleteMany({});
        await Customer.deleteMany({});
        await User.deleteMany({});

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

        testSalesman1 = await Salesman.create({
            code: 'SM001',
            name: 'John Doe',
            phone: '1234567890',
            commissionRate: 2.5,
            commissionType: 'sales',
            isActive: true
        });

        testSalesman2 = await Salesman.create({
            code: 'SM002',
            name: 'Jane Smith',
            phone: '0987654321',
            commissionRate: 3.0,
            commissionType: 'collection',
            isActive: true
        });

        testRoute = await Route.create({
            code: 'RT001',
            name: 'City Route',
            description: 'Main city area',
            isActive: true
        });

        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890'
        });
    });

    describe('Salesman Assignment', () => {
        it('should assign salesman to invoice', async () => {
            const invoiceData = {
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                items: [],
                totals: { subtotal: 1000, grandTotal: 1000 }
            };

            const response = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invoiceData);

            expect(response.status).toBe(201);
            expect(response.body.data.salesmanId).toBe(testSalesman1._id.toString());
        });

        it('should assign route to salesman', async () => {
            const response = await request(app)
                .patch(`/api/salesmen/${testSalesman1._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    routeId: testRoute._id
                });

            expect(response.status).toBe(200);
            expect(response.body.data.routeId).toBe(testRoute._id.toString());
        });
    });

    describe('Commission Calculation', () => {
        beforeEach(async () => {
            // Create invoices for commission calculation
            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                salesmanId: testSalesman1._id,
                invoiceDate: new Date(),
                items: [],
                totals: { subtotal: 10000, grandTotal: 10000 },
                status: 'confirmed',
                paymentStatus: 'paid',
                createdBy: testUser._id
            });
        });

        it('should calculate commission based on sales', async () => {
            const response = await request(app)
                .get('/api/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('totalCommission');
            // Commission should be 2.5% of 10000 = 250
            expect(response.body.data.totalCommission).toBe(250);
        });

        it('should generate salesman performance report', async () => {
            const response = await request(app)
                .get('/api/reports/salesman-performance')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: testSalesman1._id,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('totalSales');
            expect(response.body.data).toHaveProperty('totalInvoices');
        });
    });

    describe('Complete Salesman Workflow', () => {
        it('should handle complete salesman lifecycle', async () => {
            // Step 1: Create salesman
            const salesmanResponse = await request(app)
                .post('/api/salesmen')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    code: 'SM003',
                    name: 'Test Salesman',
                    phone: '5555555555',
                    commissionRate: 2.0,
                    commissionType: 'sales'
                });

            expect(salesmanResponse.status).toBe(201);
            const salesman = salesmanResponse.body.data;

            // Step 2: Assign route
            await request(app)
                .patch(`/api/salesmen/${salesman._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    routeId: testRoute._id
                });

            // Step 3: Create invoice with salesman
            const invoiceResponse = await request(app)
                .post('/api/invoices/sales')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    customerId: testCustomer._id,
                    salesmanId: salesman._id,
                    items: [],
                    totals: { subtotal: 5000, grandTotal: 5000 }
                });

            expect(invoiceResponse.status).toBe(201);

            // Step 4: Generate commission report
            const commissionResponse = await request(app)
                .get('/api/reports/salesman-commission')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    salesmanId: salesman._id
                });

            expect(commissionResponse.status).toBe(200);
        });
    });
});
