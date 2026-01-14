/**
 * End-to-End Workflow Integration Tests
 * 
 * Tests complete business workflows from start to finish
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');

let mongoServer;
let server;
let app;
let authToken;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  server = new Server();
  app = server.getApp();

  // Create test user
  testUser = await User.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    isActive: true,
  });

  // Login
  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123',
    });

  authToken = loginResponse.body.data.token;
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  if (server) {
    await server.stop();
  }
});

describe('E2E Workflow Tests', () => {
  describe('Complete Sales Workflow', () => {
    let customer;
    let item;
    let invoice;
    let receipt;

    test('should complete full sales cycle', async () => {
      // Step 1: Create customer
      const customerResponse = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'CUST000001',
          name: 'Test Customer Ltd',
          type: 'customer',
          contactInfo: {
            phone: '+92-300-1234567',
            email: 'customer@test.com',
            city: 'Karachi',
          },
          financialInfo: {
            creditLimit: 100000,
            paymentTerms: 30,
            currency: 'PKR',
          },
        });

      expect(customerResponse.status).toBe(201);
      customer = customerResponse.body.data;
      expect(customer).toHaveProperty('_id');

      // Step 2: Create item
      const itemResponse = await request(app)
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'ITEM000001',
          name: 'Test Product',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
            currency: 'PKR',
          },
          tax: {
            gstRate: 17,
            whtRate: 0,
          },
          inventory: {
            currentStock: 100,
            minimumStock: 10,
            maximumStock: 1000,
          },
        });

      expect(itemResponse.status).toBe(201);
      item = itemResponse.body.data;

      // Step 3: Create sales invoice
      const invoiceResponse = await request(app)
        .post('/api/v1/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer._id,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              itemId: item._id,
              quantity: 10,
              unitPrice: item.pricing.salePrice,
              discount: 0,
              taxAmount: item.pricing.salePrice * 10 * 0.17,
            },
          ],
        });

      expect(invoiceResponse.status).toBe(201);
      invoice = invoiceResponse.body.data;
      expect(invoice.status).toBe('draft');

      // Step 4: Confirm invoice
      const confirmResponse = await request(app)
        .post(`/api/v1/invoices/sales/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.data.status).toBe('confirmed');

      // Step 5: Verify inventory was updated
      const itemCheck = await request(app)
        .get(`/api/v1/items/${item._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(itemCheck.body.data.inventory.currentStock).toBe(90);

      // Step 6: Record cash receipt
      const receiptResponse = await request(app)
        .post('/api/v1/cashbook/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer._id,
          amount: invoice.totals.grandTotal,
          paymentMethod: 'cash',
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          receiptDate: new Date().toISOString(),
        });

      expect(receiptResponse.status).toBe(201);
      receipt = receiptResponse.body.data;

      // Step 7: Mark invoice as paid
      const paidResponse = await request(app)
        .put(`/api/v1/invoices/sales/${invoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentStatus: 'paid',
          status: 'paid',
        });

      expect(paidResponse.status).toBe(200);
      expect(paidResponse.body.data.paymentStatus).toBe('paid');

      // Step 8: Verify account balance
      const balanceResponse = await request(app)
        .get(`/api/v1/accounts/balance/${customer._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.data.balance).toBe(0);
    }, 30000);
  });

  describe('Complete Purchase Workflow', () => {
    let supplier;
    let item;
    let purchaseInvoice;

    test('should complete full purchase cycle', async () => {
      // Step 1: Create supplier
      const supplierResponse = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'SUPP000001',
          name: 'Test Supplier Ltd',
          type: 'supplier',
          contactInfo: {
            phone: '+92-300-7654321',
            email: 'supplier@test.com',
            city: 'Lahore',
          },
          financialInfo: {
            paymentTerms: 30,
            currency: 'PKR',
          },
        });

      expect(supplierResponse.status).toBe(201);
      supplier = supplierResponse.body.data;

      // Step 2: Create item with low stock
      const itemResponse = await request(app)
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'ITEM000002',
          name: 'Purchase Test Product',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 80,
            salePrice: 120,
            currency: 'PKR',
          },
          inventory: {
            currentStock: 5,
            minimumStock: 10,
            maximumStock: 100,
          },
        });

      expect(itemResponse.status).toBe(201);
      item = itemResponse.body.data;

      // Step 3: Verify item is in low stock
      const lowStockResponse = await request(app)
        .get('/api/v1/items/low-stock')
        .set('Authorization', `Bearer ${authToken}`);

      expect(lowStockResponse.status).toBe(200);
      const lowStockItem = lowStockResponse.body.data.find(i => i._id === item._id);
      expect(lowStockItem).toBeDefined();

      // Step 4: Create purchase invoice
      const purchaseResponse = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: supplier._id,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              itemId: item._id,
              quantity: 50,
              unitPrice: item.pricing.costPrice,
              discount: 0,
              taxAmount: item.pricing.costPrice * 50 * 0.17,
              batchInfo: {
                batchNumber: `BATCH${Date.now()}`,
                manufacturingDate: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              },
            },
          ],
        });

      expect(purchaseResponse.status).toBe(201);
      purchaseInvoice = purchaseResponse.body.data;

      // Step 5: Confirm purchase
      const confirmResponse = await request(app)
        .post(`/api/v1/invoices/purchase/${purchaseInvoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(confirmResponse.status).toBe(200);

      // Step 6: Verify inventory was updated
      const itemCheck = await request(app)
        .get(`/api/v1/items/${item._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(itemCheck.body.data.inventory.currentStock).toBe(55);

      // Step 7: Record payment
      const paymentResponse = await request(app)
        .post('/api/v1/cashbook/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: supplier._id,
          amount: purchaseInvoice.totals.grandTotal,
          paymentMethod: 'bank_transfer',
          referenceNumber: 'TXN123456',
          description: `Payment for invoice ${purchaseInvoice.invoiceNumber}`,
          paymentDate: new Date().toISOString(),
        });

      expect(paymentResponse.status).toBe(201);
    }, 30000);
  });

  describe('Reporting Workflow', () => {
    test('should generate comprehensive reports', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      // Sales report
      const salesReport = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate, endDate });

      expect(salesReport.status).toBe(200);
      expect(salesReport.body.data).toHaveProperty('summary');

      // Purchase report
      const purchaseReport = await request(app)
        .get('/api/v1/reports/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate, endDate });

      expect(purchaseReport.status).toBe(200);
      expect(purchaseReport.body.data).toHaveProperty('summary');

      // Inventory report
      const inventoryReport = await request(app)
        .get('/api/v1/reports/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(inventoryReport.status).toBe(200);
      expect(inventoryReport.body.data).toHaveProperty('summary');

      // Financial report
      const financialReport = await request(app)
        .get('/api/v1/reports/financial')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'profit_loss', startDate, endDate });

      expect(financialReport.status).toBe(200);
      expect(financialReport.body.data).toHaveProperty('revenue');
    }, 30000);
  });

  describe('System Health and Monitoring', () => {
    test('should provide system health status', async () => {
      const healthResponse = await request(app)
        .get('/api/v1/monitoring/health');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.data).toHaveProperty('status');
      expect(healthResponse.body.data).toHaveProperty('uptime');
    });

    test('should provide performance metrics', async () => {
      const metricsResponse = await request(app)
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body.data).toHaveProperty('requests');
      expect(metricsResponse.body.data).toHaveProperty('responseTimes');
    });

    test('should provide cache statistics', async () => {
      const cacheResponse = await request(app)
        .get('/api/v1/monitoring/metrics/cache')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cacheResponse.status).toBe(200);
      expect(cacheResponse.body.data).toHaveProperty('short');
      expect(cacheResponse.body.data).toHaveProperty('medium');
      expect(cacheResponse.body.data).toHaveProperty('long');
    });
  });

  describe('Error Handling and Validation', () => {
    test('should handle invalid invoice creation', async () => {
      const response = await request(app)
        .post('/api/v1/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should prevent negative inventory', async () => {
      // Create item with low stock
      const item = await Item.create({
        code: 'ITEM999',
        name: 'Low Stock Item',
        category: 'Test',
        unit: 'piece',
        pricing: { costPrice: 10, salePrice: 15 },
        inventory: { currentStock: 5, minimumStock: 10, maximumStock: 100 },
        isActive: true,
      });

      const customer = await Customer.create({
        code: 'CUST999',
        name: 'Test Customer',
        type: 'customer',
        isActive: true,
      });

      // Try to sell more than available
      const response = await request(app)
        .post('/api/v1/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer._id,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              itemId: item._id,
              quantity: 10, // More than available
              unitPrice: 15,
              discount: 0,
              taxAmount: 0,
            },
          ],
        });

      // Should either reject or create as draft
      if (response.status === 201) {
        // If created, confirming should fail
        const confirmResponse = await request(app)
          .post(`/api/v1/invoices/sales/${response.body.data._id}/confirm`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(confirmResponse.status).toBeGreaterThanOrEqual(400);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
