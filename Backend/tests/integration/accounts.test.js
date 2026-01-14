const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const LedgerEntry = require('../../src/models/LedgerEntry');

describe('Accounts API Integration Tests', () => {
  let adminToken;
  let accountantToken;
  let salesToken;
  let testUser;
  let testCustomer;
  let testSupplier;
  let testItem;
  let testInvoice;

  beforeAll(async () => {
    // Create test users
    const adminUser = await User.create({
      username: 'adminaccounts',
      email: 'adminaccounts@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    const accountantUser = await User.create({
      username: 'accountantuser',
      email: 'accountant@test.com',
      password: 'password123',
      role: 'accountant',
      isActive: true,
    });

    const salesUser = await User.create({
      username: 'salesaccounts',
      email: 'salesaccounts@test.com',
      password: 'password123',
      role: 'sales',
      isActive: true,
    });

    testUser = adminUser;

    // Login users
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'adminaccounts', password: 'password123' });
    adminToken = adminLogin.body.data.accessToken;

    const accountantLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'accountantuser', password: 'password123' });
    accountantToken = accountantLogin.body.data.accessToken;

    const salesLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'salesaccounts', password: 'password123' });
    salesToken = salesLogin.body.data.accessToken;

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST-ACC-001',
      name: 'Test Customer Accounts',
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
      code: 'SUPP-ACC-001',
      name: 'Test Supplier Accounts',
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

    // Create test item
    testItem = await Item.create({
      code: 'ITEM-ACC-001',
      name: 'Test Item Accounts',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 80,
        salePrice: 100,
        currency: 'PKR',
      },
      stock: {
        currentStock: 1000,
        minStock: 10,
      },
      isActive: true,
    });

    // Create test invoice
    testInvoice = await Invoice.create({
      invoiceNumber: 'SI-ACC-001',
      type: 'sales',
      customerId: testCustomer._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          itemId: testItem._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 0,
          lineTotal: 1000,
        },
      ],
      totals: {
        subtotal: 1000,
        totalDiscount: 0,
        totalTax: 0,
        grandTotal: 1000,
      },
      status: 'confirmed',
      paymentStatus: 'pending',
      createdBy: testUser._id,
    });

    // Create test ledger entries
    await LedgerEntry.create({
      accountId: testCustomer._id,
      accountType: 'Customer',
      transactionType: 'debit',
      amount: 1000,
      description: 'Sales Invoice SI-ACC-001',
      referenceType: 'invoice',
      referenceId: testInvoice._id,
      transactionDate: new Date(),
      createdBy: testUser._id,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ username: { $in: ['adminaccounts', 'accountantuser', 'salesaccounts'] } });
    await Customer.deleteOne({ _id: testCustomer._id });
    await Supplier.deleteOne({ _id: testSupplier._id });
    await Item.deleteOne({ _id: testItem._id });
    await Invoice.deleteOne({ _id: testInvoice._id });
    await LedgerEntry.deleteMany({ accountId: { $in: [testCustomer._id, testSupplier._id] } });
  });

  describe('GET /api/v1/accounts/ledger - Get Ledger Entries', () => {
    it('should get ledger entries as accountant', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/ledger')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('entries');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.entries)).toBe(true);
    });

    it('should filter ledger entries by account ID', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/ledger?accountId=${testCustomer._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entries.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/v1/accounts/ledger')
        .expect(401);
    });

    it('should fail without accountant role', async () => {
      const dataEntryUser = await User.create({
        username: 'dataentryaccounts',
        email: 'dataentry@test.com',
        password: 'password123',
        role: 'data_entry',
        isActive: true,
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'dataentryaccounts', password: 'password123' });

      await request(app)
        .get('/api/v1/accounts/ledger')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .expect(403);

      await User.deleteOne({ _id: dataEntryUser._id });
    });
  });

  describe('GET /api/v1/accounts/balance/:accountId - Get Account Balance', () => {
    it('should get account balance', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/balance/${testCustomer._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('accountId');
      expect(response.body.data).toHaveProperty('asOfDate');
      expect(typeof response.body.data.balance).toBe('number');
    });

    it('should get account balance as of specific date', async () => {
      const asOfDate = new Date().toISOString();
      const response = await request(app)
        .get(`/api/v1/accounts/balance/${testCustomer._id}?asOfDate=${asOfDate}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBeDefined();
    });

    it('should allow sales user to check customer balance', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/balance/${testCustomer._id}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/accounts/balances - Get Multiple Account Balances', () => {
    it('should get balances for multiple accounts', async () => {
      const response = await request(app)
        .post('/api/v1/accounts/balances')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({
          accountIds: [testCustomer._id.toString(), testSupplier._id.toString()],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balances');
      expect(typeof response.body.data.balances).toBe('object');
    });

    it('should fail with empty account IDs array', async () => {
      const response = await request(app)
        .post('/api/v1/accounts/balances')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ accountIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without account IDs', async () => {
      const response = await request(app)
        .post('/api/v1/accounts/balances')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/accounts/statement/:accountId - Get Account Statement', () => {
    it('should generate account statement', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/accounts/statement/${testCustomer._id}`)
        .query({
          accountType: 'Customer',
          startDate,
          endDate,
        })
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('account');
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('balances');
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('summary');
    });

    it('should fail without account type', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/accounts/statement/${testCustomer._id}`)
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account type is required');
    });

    it('should fail without date range', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/statement/${testCustomer._id}`)
        .query({ accountType: 'Customer' })
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/accounts/receivables/aging - Get Receivables Aging', () => {
    it('should generate receivables aging report', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/receivables/aging')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('asOfDate');
      expect(response.body.data).toHaveProperty('customers');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.customers)).toBe(true);
    });

    it('should filter aging report by customer', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/receivables/aging?customerId=${testCustomer._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow sales user to view receivables aging', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/receivables/aging')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/accounts/receivables/summary/:customerId - Get Customer Receivables Summary', () => {
    it('should get customer receivables summary', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/receivables/summary/${testCustomer._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('customer');
      expect(response.body.data).toHaveProperty('receivables');
      expect(response.body.data).toHaveProperty('ledgerBalance');
      expect(response.body.data).toHaveProperty('availableCredit');
    });

    it('should fail with invalid customer ID', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/receivables/summary/invalid-id')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/accounts/payables - Get Supplier Payables', () => {
    it('should generate supplier payables report', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/payables')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('asOfDate');
      expect(response.body.data).toHaveProperty('suppliers');
      expect(response.body.data).toHaveProperty('summary');
      expect(Array.isArray(response.body.data.suppliers)).toBe(true);
    });

    it('should filter payables by supplier', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/payables?supplierId=${testSupplier._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/accounts/payables/summary/:supplierId - Get Supplier Payables Summary', () => {
    it('should get supplier payables summary', async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/payables/summary/${testSupplier._id}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('supplier');
      expect(response.body.data).toHaveProperty('payables');
      expect(response.body.data).toHaveProperty('ledgerBalance');
    });

    it('should fail with invalid supplier ID', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/payables/summary/invalid-id')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/accounts/trial-balance - Get Trial Balance', () => {
    it('should get trial balance', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/trial-balance')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('asOfDate');
      expect(response.body.data).toHaveProperty('accounts');
      expect(response.body.data).toHaveProperty('totals');
      expect(Array.isArray(response.body.data.accounts)).toBe(true);
    });

    it('should get trial balance as of specific date', async () => {
      const asOfDate = new Date().toISOString();
      const response = await request(app)
        .get(`/api/v1/accounts/trial-balance?asOfDate=${asOfDate}`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail without accountant role', async () => {
      await request(app)
        .get('/api/v1/accounts/trial-balance')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/accounts/summary/:accountType - Get Ledger Summary', () => {
    it('should get ledger summary by account type', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/v1/accounts/summary/Customer')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accountType');
      expect(response.body.data).toHaveProperty('totalDebits');
      expect(response.body.data).toHaveProperty('totalCredits');
      expect(response.body.data).toHaveProperty('netBalance');
    });

    it('should fail without date range', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/summary/Customer')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Start date and end date are required');
    });
  });
});
