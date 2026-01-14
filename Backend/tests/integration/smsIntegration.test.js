const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../src/app');
const User = require('../../src/models/User');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const SMSLog = require('../../src/models/SMSLog');

// Mock Twilio
jest.mock('twilio', () => {
    return jest.fn(() => ({
        messages: {
            create: jest.fn().mockResolvedValue({
                sid: 'SM_test_123',
                status: 'sent'
            })
        }
    }));
});

describe('SMS Integration', () => {
    let token;
    let user;

    beforeEach(async () => {
        await User.deleteMany({});
        await Invoice.deleteMany({});
        await Customer.deleteMany({});
        await Supplier.deleteMany({});
        await SMSLog.deleteMany({});

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

        // Set environment variables for Twilio
        process.env.TWILIO_ACCOUNT_SID = 'test_sid';
        process.env.TWILIO_AUTH_TOKEN = 'test_token';
        process.env.TWILIO_PHONE_NUMBER = '+14155552671';
    });

    describe('GET /api/v1/sms/templates', () => {
        it('should return SMS templates', async () => {
            const res = await request(app)
                .get('/api/v1/sms/templates')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/v1/sms/templates');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/v1/sms/send', () => {
        it('should send SMS with custom message', async () => {
            const res = await request(app)
                .post('/api/v1/sms/send')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    phoneNumber: '+923001234567',
                    message: 'Test message',
                    recipientType: 'other'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.phoneNumber).toBe('+923001234567');
            expect(res.body.data.message).toBe('Test message');
        });

        it('should send SMS with template', async () => {
            const res = await request(app)
                .post('/api/v1/sms/send')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    phoneNumber: '+923001234567',
                    templateId: 'invoice_reminder',
                    variables: {
                        customerName: 'John Doe',
                        invoiceNo: 'INV-001',
                        amount: '5000'
                    },
                    recipientType: 'other'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.message).toContain('John Doe');
            expect(res.body.data.message).toContain('INV-001');
        });

        it('should validate phone number format', async () => {
            const res = await request(app)
                .post('/api/v1/sms/send')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    phoneNumber: 'invalid',
                    message: 'Test message'
                });

            expect(res.status).toBe(500); // Service throws error
        });

        it('should require phone number', async () => {
            const res = await request(app)
                .post('/api/v1/sms/send')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    message: 'Test message'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/sms/history/:accountId', () => {
        it('should return SMS history for an account', async () => {
            const accountId = new mongoose.Types.ObjectId();

            await SMSLog.create({
                recipientType: 'customer',
                recipientId: accountId,
                phoneNumber: '+923001234567',
                message: 'Test message',
                status: 'sent',
                sentBy: user._id
            });

            const res = await request(app)
                .get(`/api/v1/sms/history/${accountId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.history).toHaveLength(1);
            expect(res.body.data.stats.total).toBe(1);
        });
    });

    describe('POST /api/invoices/sales/:id/send-sms', () => {
        it('should send SMS for sales invoice', async () => {
            const customer = await Customer.create({
                name: 'Test Customer',
                code: 'CUST001',
                type: 'customer',
                phoneNumber: '+923001234567'
            });

            const invoice = await Invoice.create({
                type: 'sale',
                customerId: customer._id,
                invoiceNo: 'SI-001',
                invoiceDate: new Date(),
                items: [],
                totals: { grandTotal: 5000 },
                status: 'confirmed',
                createdBy: user._id
            });

            const res = await request(app)
                .post(`/api/v1/invoices/sales/${invoice._id}/send-sms`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    templateId: 'invoice_reminder'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.phoneNumber).toBe('+923001234567');
        });

        it('should return error if customer has no phone number', async () => {
            const customer = await Customer.create({
                name: 'Test Customer',
                code: 'CUST001',
                type: 'customer'
                // No phone number
            });

            const invoice = await Invoice.create({
                type: 'sale',
                customerId: customer._id,
                invoiceNo: 'SI-001',
                invoiceDate: new Date(),
                items: [],
                totals: { grandTotal: 5000 },
                status: 'confirmed',
                createdBy: user._id
            });

            const res = await request(app)
                .post(`/api/v1/invoices/sales/${invoice._id}/send-sms`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    message: 'Test message'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('no phone number');
        });
    });

    describe('POST /api/invoices/purchase/:id/send-sms', () => {
        it('should send SMS for purchase invoice', async () => {
            const supplier = await Supplier.create({
                name: 'Test Supplier',
                code: 'SUP001',
                type: 'supplier',
                phoneNumber: '+923001234567'
            });

            const invoice = await Invoice.create({
                type: 'purchase',
                supplierId: supplier._id,
                invoiceNo: 'PI-001',
                invoiceDate: new Date(),
                items: [],
                totals: { grandTotal: 10000 },
                status: 'confirmed',
                createdBy: user._id
            });

            const res = await request(app)
                .post(`/api/v1/invoices/purchase/${invoice._id}/send-sms`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    message: 'Your purchase order has been received'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.phoneNumber).toBe('+923001234567');
        });
    });
});
