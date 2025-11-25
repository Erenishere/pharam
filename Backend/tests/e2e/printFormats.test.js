const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * End-to-End Print Formats Tests
 * Task 78.6: Test all print formats
 * 
 * Uses REAL database for accurate testing
 */

describe('E2E: Print Formats', () => {
    let authToken;
    let testUser;
    let testCustomer;
    let testItem;
    let testInvoice;

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
            phone: '1234567890'
        });

        testItem = await Item.create({
            code: 'ITEM001',
            name: 'Test Product',
            category: 'Electronics',
            unit: 'piece',
            pricing: { costPrice: 100, salePrice: 150 },
            defaultWarrantyMonths: 12,
            defaultWarrantyDetails: 'Standard warranty'
        });

        testInvoice = await Invoice.create({
            type: 'sales',
            customerId: testCustomer._id,
            invoiceDate: new Date(),
            items: [
                {
                    itemId: testItem._id,
                    quantity: 10,
                    unitPrice: 150,
                    lineTotal: 1500,
                    warrantyMonths: 12,
                    warrantyDetails: 'Standard warranty'
                }
            ],
            totals: { subtotal: 1500, grandTotal: 1500 },
            status: 'confirmed',
            paymentStatus: 'pending',
            createdBy: testUser._id,
            notes: 'Test invoice for print formats',
            memoNo: 'MEMO-001',
            warrantyInfo: 'All items covered under warranty'
        });
    });

    describe('Standard Print Format', () => {
        it('should generate standard format print data', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'standard' });

            expect(response.status).toBe(200);
            expect(response.body.data.format).toBe('standard');
            expect(response.body.data.invoice).toBeDefined();
            expect(response.body.data.items).toBeDefined();
        });
    });

    describe('Logo Format', () => {
        it('should include logo in logo format', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'logo' });

            expect(response.status).toBe(200);
            expect(response.body.data.metadata.includeLogo).toBe(true);
        });
    });

    describe('Thermal Format', () => {
        it('should generate compact thermal format', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'thermal' });

            expect(response.status).toBe(200);
            expect(response.body.data.format).toBe('thermal');
        });
    });

    describe('Warranty Bill Format', () => {
        it('should include warranty information in warranty_bill format', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'warranty_bill' });

            expect(response.status).toBe(200);
            expect(response.body.data.metadata.includeWarranty).toBe(true);
            expect(response.body.data.invoice.warrantyInfo).toBeDefined();
            expect(response.body.data.items[0].warrantyMonths).toBe(12);
        });
    });

    describe('Estimate/Quotation Format', () => {
        beforeEach(async () => {
            testInvoice.estimatePrint = true;
            await testInvoice.save();
        });

        it('should generate estimate format', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'estimate' });

            expect(response.status).toBe(200);
            expect(response.body.data.metadata.isEstimate).toBe(true);
            expect(response.body.data.metadata.documentLabel).toContain('ESTIMATE');
        });
    });

    describe('Tax Invoice Format', () => {
        it('should generate tax invoice format', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'tax_invoice' });

            expect(response.status).toBe(200);
            expect(response.body.data.metadata.isTaxInvoice).toBe(true);
        });
    });

    describe('Store Copy Format', () => {
        it('should generate store copy format', async () => {
            const response = await request(app)
                .get(`/api/print/invoice/${testInvoice._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({ format: 'store_copy' });

            expect(response.status).toBe(200);
            expect(response.body.data.metadata.isStoreCopy).toBe(true);
        });
    });

    describe('Notes and Memo Display', () => {
        it('should include notes in all formats', async () => {
            const formats = ['standard', 'logo', 'thermal', 'warranty_bill', 'tax_invoice'];

            for (const format of formats) {
                const response = await request(app)
                    .get(`/api/print/invoice/${testInvoice._id}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({ format });

                expect(response.status).toBe(200);
                expect(response.body.data.invoice.notes).toBe('Test invoice for print formats');
                expect(response.body.data.invoice.memoNo).toBe('MEMO-001');
                expect(response.body.data.metadata.hasNotes).toBe(true);
                expect(response.body.data.metadata.hasMemoNo).toBe(true);
            }
        });
    });
});
