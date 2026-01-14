const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const CashReceipt = require('../../src/models/CashReceipt');
const CashPayment = require('../../src/models/CashPayment');

describe('Cash Book API Integration Tests', () => {
  let adminToken;
  let accountantToken;
  let salesToken;
  let testUser;
  let testCustomer;
  let testSupplier;
  let testReceipt;
  let testPayment;

  beforeAll(async () => {
    // Create test users
    const adminUser = await User.create({
      username: 'admincashbook',
      email: 'admincashbook@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    const accountantUser = await User.create({
      username: 'accountantcashbook',
      email: 'accountantcashbook@test.com',
      password: 'password123',
      role: 'accountant',
      isActive: true,
    });

    const salesUser = await User.create({
      username: 'salescashbook',
      email: 'salescashbook@test.com',
      password: 'password123',
      role: 'sales',
      isActive: true,
    });

    testUser = adminUser;

    // Login users
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admincashbook', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const accountantLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'accountantcashbook', password: 'password123' });
    accountantToken = accountantLogin.body.data.accessToken;

    const salesLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'salescashbook', password: 'password123' });
    salesToken = salesLogin.body.data.accessToken;

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST-CB-001',
      name: 'Test Customer Cashbook',
      type: 'customer',
      contactInfo: {
        phone: '1234567890',
        email: 'customer@test.com',
      },
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30,
      },
      isActive: true,
    });

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUPP-CB-001',
      name: 'Test Supplier Cashbook',
      type: 'supplier',
      contactInfo: {
        phone: '0987654321',
        email: 'supplier@test.com',
      },
      financialInfo: {
        paymentTerms: 30,
      },
      isActive: true,
    });

    // Create test receipt
    testReceipt = await CashReceipt.create({
      receiptNumber: 'CR-TEST-001',
      customerId: testCustomer._id,
      amount: 5000,
      paymentMethod: 'cash',
      receiptDate: new Date(),
      status: 'pending',
      createdBy: testUser._id,
    });

    // Create test payment
    testPayment = await CashPayment.create({
      paymentNumber: 'CP-TEST-001',
      supplierId: testSupplier._id,
      amount: 3000,
      paymentMethod: 'cash',
      paymentDate: new Date(),
      status: 'pending',
      createdBy: testUser._id,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({
      username: { $in: ['admincashbook', 'accountantcashbook', 'salescashbook'] },
    });
    await Customer.deleteOne({ _id: testCustomer._id });
    await Supplier.deleteOne({ _id: testSupplier._id });
    await CashReceipt.deleteMany({ customerId: testCustomer._id });
    await CashPayment.deleteMany({ supplierId: testSupplier._id });
  });

  describe('POST /api/v1/cashbook/receipts - Create Cash Receipt', () => {
    it('should create cash receipt as accountant', async () => {
      const receiptData = {
        customerId: testCustomer._id,
        amount: 10000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'TXN123456',
        receiptDate: new Date(),
        description: 'Test receipt',
      };

      const response = await request(app)
        .post('/api/v1/cashbook/receipts')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send(receiptData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.receipt).toHaveProperty('receiptNumber');
      expect(response.body.data.receipt.amount).toBe(10000);
    });

    it('should fail without authentication', async () => {
      await request(app).post('/api/v1/cashbook/receipts').send({}).expect(401);
    });

    it('should fail with invalid customer ID', async () => {
      const receiptData = {
        customerId: 'invalid',
        amount: 5000,
        paymentMethod: 'cash',
      };

      const response = await request(app)
        .post('/api/v1/cashbook/receipts')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send(receiptData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/cashbook/receipts - Get All Cash Receipts', () => {
    it('should get all cash receipts', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/receipts')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('receipts');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter receipts by customer', async () => {
      const response = await request(app)
        .get(`/api/v1/cashbook/receipts?customerId=${testCustomer._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow sales user to view receipts', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/receipts')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/cashbook/receipts/:id - Get Cash Receipt by ID', () => {
    it('should get cash receipt by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/cashbook/receipts/${testReceipt._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.receipt._id).toBe(testReceipt._id.toString());
    });

    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/receipts/invalid')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/cashbook/receipts/:id/clear - Clear Cash Receipt', () => {
    it('should clear pending receipt', async () => {
      const response = await request(app)
        .post(`/api/v1/cashbook/receipts/${testReceipt._id}/clear`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.receipt.status).toBe('cleared');
    });
  });

  describe('POST /api/v1/cashbook/payments - Create Cash Payment', () => {
    it('should create cash payment as accountant', async () => {
      const paymentData = {
        supplierId: testSupplier._id,
        amount: 15000,
        paymentMethod: 'cheque',
        bankDetails: {
          chequeNumber: 'CHQ123456',
          chequeDate: new Date(),
        },
        paymentDate: new Date(),
        description: 'Test payment',
      };

      const response = await request(app)
        .post('/api/v1/cashbook/payments')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payment).toHaveProperty('paymentNumber');
      expect(response.body.data.payment.amount).toBe(15000);
    });

    it('should fail without authentication', async () => {
      await request(app).post('/api/v1/cashbook/payments').send({}).expect(401);
    });
  });

  describe('GET /api/v1/cashbook/payments - Get All Cash Payments', () => {
    it('should get all cash payments', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/payments')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payments');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter payments by supplier', async () => {
      const response = await request(app)
        .get(`/api/v1/cashbook/payments?supplierId=${testSupplier._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/cashbook/balance - Get Cash Book Balance', () => {
    it('should get cash book balance', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/balance')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalReceipts');
      expect(response.body.data).toHaveProperty('totalPayments');
      expect(response.body.data).toHaveProperty('balance');
    });

    it('should get balance as of specific date', async () => {
      const asOfDate = new Date().toISOString();
      const response = await request(app)
        .get(`/api/v1/cashbook/balance?asOfDate=${asOfDate}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/cashbook/summary - Get Cash Book Summary', () => {
    it('should get cash book summary', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/cashbook/summary?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('openingBalance');
      expect(response.body.data).toHaveProperty('receipts');
      expect(response.body.data).toHaveProperty('payments');
      expect(response.body.data).toHaveProperty('closingBalance');
    });

    it('should fail without date range', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/summary')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Start date and end date are required');
    });
  });

  describe('GET /api/v1/cashbook/cash-flow - Get Cash Flow Statement', () => {
    it('should get cash flow statement', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/cashbook/cash-flow?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cashFlowFromOperations');
      expect(response.body.data).toHaveProperty('cashBalance');
    });
  });

  describe('GET /api/v1/cashbook/daily - Get Daily Cash Book', () => {
    it('should get daily cash book', async () => {
      const date = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/cashbook/daily?date=${date}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('date');
      expect(response.body.data).toHaveProperty('openingBalance');
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('closingBalance');
    });

    it('should fail without date', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/daily')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Date is required');
    });
  });

  describe('GET /api/v1/cashbook/receipts/pending - Get Pending Receipts', () => {
    it('should get pending receipts', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/receipts/pending')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('receipts');
      expect(Array.isArray(response.body.data.receipts)).toBe(true);
    });
  });

  describe('GET /api/v1/cashbook/payments/pending - Get Pending Payments', () => {
    it('should get pending payments', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/payments/pending')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payments');
      expect(Array.isArray(response.body.data.payments)).toBe(true);
    });
  });

  describe('GET /api/v1/cashbook/receipts/statistics - Get Receipt Statistics', () => {
    it('should get receipt statistics', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/receipts/statistics')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalReceipts');
      expect(response.body.data).toHaveProperty('totalAmount');
    });
  });

  describe('GET /api/v1/cashbook/payments/statistics - Get Payment Statistics', () => {
    it('should get payment statistics', async () => {
      const response = await request(app)
        .get('/api/v1/cashbook/payments/statistics')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPayments');
      expect(response.body.data).toHaveProperty('totalAmount');
    });
  });
});
