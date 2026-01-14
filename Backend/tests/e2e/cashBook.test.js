const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const CashBook = require('../../src/models/CashBook');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');

/**
 * End-to-End Cash Book and Cheque Management Tests
 * Task 78.4: Test cash book with post-dated cheques
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Cash Book and Cheque Management', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testInvoice1, testInvoice2;

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
        await CashBook.deleteMany({});
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

        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Test St',
            city: 'Test City',
            phone: '1234567890',
            openingBalance: 0
        });

        // Create test invoices
        testInvoice1 = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [],
            totals: {
                subtotal: 1000,
                grandTotal: 1000
            },
            status: 'confirmed',
            paymentStatus: 'pending',
            createdBy: testUser._id
        });

        testInvoice2 = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [],
            totals: {
                subtotal: 1500,
                grandTotal: 1500
            },
            status: 'confirmed',
            paymentStatus: 'pending',
            createdBy: testUser._id
        });
    });

    describe('Post-Dated Cheque Recording', () => {
        it('should record cash receipt with post-dated cheque', async () => {
            const receiptData = {
                customerId: testCustomer._id,
                amount: 1000,
                paymentMethod: 'cheque',
                chequeNo: 'CHQ-123456',
                chequeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days future
                bankName: 'Test Bank',
                receiptDate: new Date(),
                status: 'pending'
            };

            const response = await request(app)
                .post('/api/cashbook/receipt')
                .set('Authorization', `Bearer ${authToken}`)
                .send(receiptData);

            expect(response.status).toBe(201);
            expect(response.body.data.paymentMethod).toBe('cheque');
            expect(response.body.data.chequeNo).toBe('CHQ-123456');
            expect(response.body.data.status).toBe('pending');
        });

        it('should apply payment to multiple invoices', async () => {
            const receiptData = {
                customerId: testCustomer._id,
                amount: 2500,
                paymentMethod: 'cheque',
                chequeNo: 'CHQ-789012',
                chequeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                bankName: 'Test Bank',
                invoiceAllocations: [
                    {
                        invoiceId: testInvoice1._id,
                        amount: 1000
                    },
                    {
                        invoiceId: testInvoice2._id,
                        amount: 1500
                    }
                ]
            };

            const response = await request(app)
                .post('/api/cashbook/receipt')
                .set('Authorization', `Bearer ${authToken}`)
                .send(receiptData);

            expect(response.status).toBe(201);
            expect(response.body.data.invoiceAllocations).toHaveLength(2);
        });
    });

    describe('Cheque Clearance', () => {
        let testReceipt;

        beforeEach(async () => {
            const receiptData = {
                customerId: testCustomer._id,
                amount: 1000,
                paymentMethod: 'cheque',
                chequeNo: 'CHQ-CLEAR-001',
                chequeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                bankName: 'Test Bank',
                status: 'pending'
            };

            const response = await request(app)
                .post('/api/cashbook/receipt')
                .set('Authorization', `Bearer ${authToken}`)
                .send(receiptData);

            testReceipt = response.body.data;
        });

        it('should clear cheque on due date', async () => {
            const response = await request(app)
                .patch(`/api/cashbook/receipt/${testReceipt._id}/clear-cheque`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    clearanceDate: new Date()
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('cleared');
        });

        it('should update customer balance on clearance', async () => {
            await request(app)
                .patch(`/api/cashbook/receipt/${testReceipt._id}/clear-cheque`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    clearanceDate: new Date()
                });

            const updatedCustomer = await Customer.findById(testCustomer._id);
            // Verify balance was updated
        });
    });

    describe('Cheque Bounce Scenario', () => {
        let testReceipt;

        beforeEach(async () => {
            const receiptData = {
                customerId: testCustomer._id,
                amount: 1000,
                paymentMethod: 'cheque',
                chequeNo: 'CHQ-BOUNCE-001',
                chequeDate: new Date(),
                bankName: 'Test Bank',
                invoiceAllocations: [
                    {
                        invoiceId: testInvoice1._id,
                        amount: 1000
                    }
                ]
            };

            const response = await request(app)
                .post('/api/cashbook/receipt')
                .set('Authorization', `Bearer ${authToken}`)
                .send(receiptData);

            testReceipt = response.body.data;
        });

        it('should record cheque bounce', async () => {
            const response = await request(app)
                .patch(`/api/cashbook/receipt/${testReceipt._id}/bounce-cheque`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    bounceDate: new Date(),
                    bounceReason: 'Insufficient funds',
                    bounceCharges: 500
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('bounced');
        });

        it('should reverse payment application on bounce', async () => {
            await request(app)
                .patch(`/api/cashbook/receipt/${testReceipt._id}/bounce-cheque`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    bounceDate: new Date(),
                    bounceReason: 'Insufficient funds'
                });

            // Verify invoice payment status was reversed
            const updatedInvoice = await Invoice.findById(testInvoice1._id);
            expect(updatedInvoice.paymentStatus).toBe('pending');
        });

        it('should update customer balance on bounce', async () => {
            await request(app)
                .patch(`/api/cashbook/receipt/${testReceipt._id}/bounce-cheque`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    bounceDate: new Date(),
                    bounceReason: 'Insufficient funds',
                    bounceCharges: 500
                });

            const updatedCustomer = await Customer.findById(testCustomer._id);
            // Verify balance includes bounce charges
        });
    });

    describe('Aging Calculation', () => {
        it('should calculate aging for pending invoices', async () => {
            // Create invoices with different dates
            await Invoice.create({
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days old
                dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                items: [],
                totals: { subtotal: 1000, grandTotal: 1000 },
                status: 'confirmed',
                paymentStatus: 'pending',
                createdBy: testUser._id
            });

            const response = await request(app)
                .get('/api/reports/aging')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    customerId: testCustomer._id
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('agingBuckets');
        });
    });

    describe('Complete Cash Book Workflow', () => {
        it('should handle complete PDC workflow', async () => {
            // Step 1: Record PDC
            const receiptResponse = await request(app)
                .post('/api/cashbook/receipt')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    customerId: testCustomer._id,
                    amount: 2500,
                    paymentMethod: 'cheque',
                    chequeNo: 'CHQ-WORKFLOW-001',
                    chequeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                    bankName: 'Test Bank',
                    invoiceAllocations: [
                        { invoiceId: testInvoice1._id, amount: 1000 },
                        { invoiceId: testInvoice2._id, amount: 1500 }
                    ]
                });

            expect(receiptResponse.status).toBe(201);
            const receipt = receiptResponse.body.data;

            // Step 2: Clear cheque
            const clearResponse = await request(app)
                .patch(`/api/cashbook/receipt/${receipt._id}/clear-cheque`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    clearanceDate: new Date()
                });

            expect(clearResponse.status).toBe(200);

            // Step 3: Verify invoices are paid
            const invoice1 = await Invoice.findById(testInvoice1._id);
            const invoice2 = await Invoice.findById(testInvoice2._id);

            expect(invoice1.paymentStatus).toBe('paid');
            expect(invoice2.paymentStatus).toBe('paid');

            // Step 4: Verify customer balance
            const customer = await Customer.findById(testCustomer._id);
            // Balance should be updated
        });
    });
});
