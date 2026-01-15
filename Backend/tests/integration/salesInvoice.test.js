const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Sales Invoice API Integration Tests', () => {
  let authToken;
  let testUser;
  let testCustomer;
  let testItem;
  let testInvoice;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testinvoiceuser',
      email: 'testinvoice@example.com',
      password: 'Test@1234',
      role: 'sales',
      isActive: true,
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testinvoice@example.com',
        password: 'Test@1234',
      });

    authToken = loginResponse.body.data.token;

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST-INV-001',
      name: 'Test Invoice Customer',
      type: 'customer',
      contactInfo: {
        phone: '1234567890',
        email: 'customer@test.com',
        address: '123 Test St',
        city: 'Test City',
        country: 'Pakistan',
      },
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30,
        currency: 'PKR',
      },
      isActive: true,
    });

    // Create test item
    testItem = await Item.create({
      code: 'ITEM-INV-001',
      name: 'Test Invoice Item',
      description: 'Test item for invoice',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
        currency: 'PKR',
      },
      tax: {
        gstRate: 17,
        whtRate: 0,
        taxCategory: 'standard',
      },
      inventory: {
        currentStock: 1000,
        minimumStock: 10,
        maximumStock: 5000,
      },
      isActive: true,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Invoice.deleteMany({ createdBy: testUser._id });
    await Customer.deleteOne({ _id: testCustomer._id });
    await Item.deleteOne({ _id: testItem._id });
    await User.deleteOne({ _id: testUser._id });
  });

  afterEach(async () => {
    // Clean up invoices created during tests
    await Invoice.deleteMany({ 
      createdBy: testUser._id,
      _id: { $ne: testInvoice?._id }
    });
  });

  describe('POST /api/invoices/sales', () => {
    it('should create a new sales invoice', async () => {
      const invoiceData = {
        customerId: testCustomer._id.toString(),
        invoiceDate: new Date().toISOString(),
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 10,
            unitPrice: 150,
            discount: 5,
          },
        ],
        notes: 'Test invoice',
      };

      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invoiceNumber');
      expect(response.body.data.type).toBe('sales');
      expect(response.body.data.customerId).toBeDefined();
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.paymentStatus).toBe('pending');

      testInvoice = response.body.data;
    });

    it('should fail to create invoice without authentication', async () => {
      const invoiceData = {
        customerId: testCustomer._id.toString(),
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 10,
            unitPrice: 150,
          },
        ],
      };

      await request(app)
        .post('/api/invoices/sales')
        .send(invoiceData)
        .expect(401);
    });

    it('should fail to create invoice without customer ID', async () => {
      const invoiceData = {
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 10,
            unitPrice: 150,
          },
        ],
      };

      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create invoice without items', async () => {
      const invoiceData = {
        customerId: testCustomer._id.toString(),
        items: [],
      };

      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create invoice with insufficient stock', async () => {
      const invoiceData = {
        customerId: testCustomer._id.toString(),
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 10000, // More than available stock
            unitPrice: 150,
          },
        ],
      };

      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient stock');
    });
  });

  describe('GET /api/invoices/sales', () => {
    beforeEach(async () => {
      // Create a test invoice
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000001',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should get all sales invoices', async () => {
      const response = await request(app)
        .get('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should get sales invoices with pagination', async () => {
      const response = await request(app)
        .get('/api/invoices/sales?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.itemsPerPage).toBe(5);
    });

    it('should filter sales invoices by status', async () => {
      const response = await request(app)
        .get('/api/invoices/sales?status=draft')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter sales invoices by customer', async () => {
      const response = await request(app)
        .get(`/api/invoices/sales?customerId=${testCustomer._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/invoices/sales/:id', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000002',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should get sales invoice by ID', async () => {
      const response = await request(app)
        .get(`/api/invoices/sales/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testInvoice._id.toString());
      expect(response.body.data.type).toBe('sales');
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/invoices/sales/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/invoices/sales/number/:invoiceNumber', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000003',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should get sales invoice by invoice number', async () => {
      const response = await request(app)
        .get(`/api/invoices/sales/number/${testInvoice.invoiceNumber}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceNumber).toBe(testInvoice.invoiceNumber);
    });
  });

  describe('GET /api/invoices/sales/customer/:customerId', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000004',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should get sales invoices by customer', async () => {
      const response = await request(app)
        .get(`/api/invoices/sales/customer/${testCustomer._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('PUT /api/invoices/sales/:id', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000005',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should update sales invoice', async () => {
      const updateData = {
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/invoices/sales/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should fail to update confirmed invoice', async () => {
      // Update invoice status to confirmed
      testInvoice.status = 'confirmed';
      await testInvoice.save();

      const updateData = {
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/invoices/sales/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Cannot update');
    });
  });

  describe('PATCH /api/invoices/sales/:id/status', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000006',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should update invoice status', async () => {
      const response = await request(app)
        .patch(`/api/invoices/sales/${testInvoice._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/invoices/sales/${testInvoice._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/invoices/sales/:id/payment-status', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000007',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should update payment status', async () => {
      const response = await request(app)
        .patch(`/api/invoices/sales/${testInvoice._id}/payment-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentStatus: 'paid' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/invoices/sales/:id', () => {
    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000008',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755,
          },
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });

      // Update user role to admin for delete operation
      testUser.role = 'admin';
      await testUser.save();

      // Get new token with admin role
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testinvoice@example.com',
          password: 'Test@1234',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should delete draft invoice', async () => {
      const response = await request(app)
        .delete(`/api/invoices/sales/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail to delete confirmed invoice', async () => {
      testInvoice.status = 'confirmed';
      await testInvoice.save();

      const response = await request(app)
        .delete(`/api/invoices/sales/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Cannot delete');
    });
  });

  describe('GET /api/invoices/sales/statistics', () => {
    it('should get sales statistics', async () => {
      const response = await request(app)
        .get('/api/invoices/sales/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
