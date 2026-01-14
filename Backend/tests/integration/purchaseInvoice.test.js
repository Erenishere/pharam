const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Purchase Invoice API Integration Tests', () => {
  let authToken;
  let testUser;
  let testSupplier;
  let testItem;
  let testInvoice;

  beforeAll(async () => {
    // Create test user with admin role
    testUser = await User.create({
      username: 'testpurchaseuser',
      email: 'testpurchase@example.com',
      password: 'Test@1234',
      role: 'admin',
      isActive: true,
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'testpurchase@example.com',
        password: 'Test@1234',
      });

    authToken = loginResponse.body.data.accessToken;

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUPP-PI-001',
      name: 'Test Purchase Supplier',
      type: 'supplier',
      contactInfo: {
        phone: '1234567890',
        email: 'supplier@test.com',
        address: '123 Supplier St',
        city: 'Supplier City',
        country: 'Pakistan',
      },
      financialInfo: {
        paymentTerms: 30,
        currency: 'PKR',
      },
      isActive: true,
    });

    // Create test item
    testItem = await Item.create({
      code: 'ITEM-PI-001',
      name: 'Test Purchase Item',
      description: 'Test item for purchase invoice',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 80,
        salePrice: 120,
        currency: 'PKR',
      },
      tax: {
        gstRate: 18,
        whtRate: 2,
        taxCategory: 'standard',
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 5000,
      },
      isActive: true,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Invoice.deleteMany({ createdBy: testUser._id });
    await Supplier.deleteOne({ _id: testSupplier._id });
    await Item.deleteOne({ _id: testItem._id });
    await User.deleteOne({ _id: testUser._id });
  });

  afterEach(async () => {
    // Clean up invoices created during tests (except the main test invoice)
    await Invoice.deleteMany({ 
      createdBy: testUser._id,
      _id: { $ne: testInvoice?._id }
    });
  });

  describe('POST /api/v1/invoices/purchase', () => {
    it('should create a new purchase invoice', async () => {
      const invoiceData = {
        supplierId: testSupplier._id.toString(),
        invoiceDate: new Date().toISOString(),
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 50,
            unitPrice: 80,
            discount: 5,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: new Date('2024-01-01').toISOString(),
              expiryDate: new Date('2025-01-01').toISOString(),
            },
          },
        ],
        notes: 'Test purchase invoice',
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invoiceNumber');
      expect(response.body.data.type).toBe('purchase');
      expect(response.body.data.supplierId).toBe(testSupplier._id.toString());
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.totals).toHaveProperty('grandTotal');

      testInvoice = response.body.data;
    });

    it('should fail to create invoice without supplier ID', async () => {
      const invoiceData = {
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 10,
            unitPrice: 80,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      // Validation middleware returns errors array
      expect(response.body.errors || response.body.error || response.body.success === false).toBeTruthy();
    });

    it('should fail to create invoice without items', async () => {
      const invoiceData = {
        supplierId: testSupplier._id.toString(),
        items: [],
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      // Validation middleware returns errors array
      expect(response.body.errors || response.body.error || response.body.success === false).toBeTruthy();
    });

    it('should fail to create invoice with inactive supplier', async () => {
      const inactiveSupplier = await Supplier.create({
        code: 'SUPP-INACTIVE',
        name: 'Inactive Supplier',
        type: 'supplier',
        isActive: false,
      });

      const invoiceData = {
        supplierId: inactiveSupplier._id.toString(),
        items: [
          {
            itemId: testItem._id.toString(),
            quantity: 10,
            unitPrice: 80,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not active');

      await Supplier.deleteOne({ _id: inactiveSupplier._id });
    });
  });

  describe('GET /api/v1/invoices/purchase', () => {
    beforeEach(async () => {
      // Create a test invoice for GET tests
      if (!testInvoice) {
        const invoice = await Invoice.create({
          invoiceNumber: 'PI2024000001',
          type: 'purchase',
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [
            {
              itemId: testItem._id,
              quantity: 20,
              unitPrice: 80,
              discount: 0,
              taxAmount: 288,
              lineTotal: 1888,
            },
          ],
          totals: {
            subtotal: 1600,
            totalDiscount: 0,
            totalTax: 288,
            grandTotal: 1888,
          },
          status: 'draft',
          paymentStatus: 'pending',
          createdBy: testUser._id,
        });
        testInvoice = invoice;
      }
    });

    it('should get all purchase invoices with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('totalItems');
      expect(response.body.pagination).toHaveProperty('currentPage');
    });

    it('should filter purchase invoices by status', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'draft' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(invoice => {
        expect(invoice.status).toBe('draft');
      });
    });

    it('should filter purchase invoices by supplier', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ supplierId: testSupplier._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/invoices/purchase/:id', () => {
    it('should get purchase invoice by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/invoices/purchase/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testInvoice._id.toString());
      expect(response.body.data.type).toBe('purchase');
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/invoices/purchase/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/invoices/purchase/supplier/:supplierId', () => {
    it('should get purchase invoices by supplier', async () => {
      const response = await request(app)
        .get(`/api/v1/invoices/purchase/supplier/${testSupplier._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('PUT /api/v1/invoices/purchase/:id', () => {
    it('should update draft purchase invoice', async () => {
      const updateData = {
        notes: 'Updated purchase invoice notes',
      };

      const response = await request(app)
        .put(`/api/v1/invoices/purchase/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated purchase invoice notes');
    });

    it('should fail to update non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v1/invoices/purchase/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/invoices/purchase/:id/confirm', () => {
    it('should confirm draft purchase invoice', async () => {
      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${testInvoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');

      // Verify inventory was updated
      const updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.inventory.currentStock).toBeGreaterThan(100);
    });

    it('should fail to confirm already confirmed invoice', async () => {
      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${testInvoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/invoices/purchase/:id/mark-paid', () => {
    it('should mark confirmed invoice as paid', async () => {
      const paymentData = {
        paidAt: new Date().toISOString(),
        paymentMethod: 'Bank Transfer',
        paymentReference: 'REF123',
      };

      const response = await request(app)
        .post(`/api/v1/invoices/purchase/${testInvoice._id}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentStatus).toBe('paid');
    });
  });

  describe('PATCH /api/v1/invoices/purchase/:id/cancel', () => {
    it('should cancel purchase invoice', async () => {
      // Create a new draft invoice to cancel
      const newInvoice = await Invoice.create({
        invoiceNumber: 'PI2024000099',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 80,
            discount: 0,
            taxAmount: 144,
            lineTotal: 944,
          },
        ],
        totals: {
          subtotal: 800,
          totalDiscount: 0,
          totalTax: 144,
          grandTotal: 944,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });

      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${newInvoice._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should fail to cancel paid invoice', async () => {
      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${testInvoice._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test' })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/invoices/purchase/:id', () => {
    it('should delete draft purchase invoice', async () => {
      // Create a new draft invoice to delete
      const newInvoice = await Invoice.create({
        invoiceNumber: 'PI2024000098',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem._id,
            quantity: 5,
            unitPrice: 80,
            discount: 0,
            taxAmount: 72,
            lineTotal: 472,
          },
        ],
        totals: {
          subtotal: 400,
          totalDiscount: 0,
          totalTax: 72,
          grandTotal: 472,
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id,
      });

      const response = await request(app)
        .delete(`/api/v1/invoices/purchase/${newInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify invoice was deleted
      const deletedInvoice = await Invoice.findById(newInvoice._id);
      expect(deletedInvoice).toBeNull();
    });

    it('should fail to delete confirmed invoice', async () => {
      const response = await request(app)
        .delete(`/api/v1/invoices/purchase/${testInvoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/invoices/purchase/statistics', () => {
    it('should get purchase statistics', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/purchase/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
