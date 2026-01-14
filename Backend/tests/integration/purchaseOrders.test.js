const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Integration Tests for Purchase Order API Endpoints
 * Tests for Requirement 10.1, 10.2 - Task 41.3
 */
describe('Purchase Order API Endpoints', () => {
  let authToken;
  let adminToken;
  let testUser;
  let adminUser;
  let testSupplier;
  let testItem1;
  let testItem2;

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      username: 'purchaseuser',
      email: 'purchase@example.com',
      password: 'password123',
      role: 'purchase',
    });

    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    // Login to get auth tokens
    const purchaseLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'purchaseuser',
        password: 'password123',
      });

    authToken = purchaseLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'adminuser',
        password: 'password123',
      });

    adminToken = adminLogin.body.token;
  });

  beforeEach(async () => {
    // Clear collections
    await PurchaseOrder.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});

    // Create test data
    testSupplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'supplier@test.com',
      address: '123 Test St',
      city: 'Test City',
      isActive: true,
    });

    testItem1 = await Item.create({
      name: 'Test Item 1',
      code: 'ITEM001',
      category: 'Electronics',
      unit: 'pcs',
      purchasePrice: 100,
      salePrice: 150,
      currentStock: 50,
      reorderLevel: 10,
    });

    testItem2 = await Item.create({
      name: 'Test Item 2',
      code: 'ITEM002',
      category: 'Electronics',
      unit: 'pcs',
      purchasePrice: 200,
      salePrice: 300,
      currentStock: 30,
      reorderLevel: 5,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/purchase-orders - Create Purchase Order', () => {
    it('should create a purchase order successfully', async () => {
      const poData = {
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        poDate: '2024-01-15',
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
          {
            itemId: testItem2._id,
            quantity: 5,
            unitPrice: 200,
          },
        ],
        notes: 'Test purchase order',
      };

      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(poData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.poNumber).toBe('PO-2024-001');
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.subtotal).toBe(2000);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.fulfillmentStatus).toBe('pending');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-002',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should return 400 if PO number already exists', async () => {
      const poData = {
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
        ],
      };

      // Create first PO
      await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(poData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(poData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/purchase-orders')
        .send({
          poNumber: 'PO-2024-001',
          supplierId: testSupplier._id,
          items: [],
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/purchase-orders - Get All Purchase Orders', () => {
    beforeEach(async () => {
      // Create test purchase orders
      await PurchaseOrder.create([
        {
          poNumber: 'PO-2024-001',
          supplierId: testSupplier._id,
          poDate: new Date('2024-01-15'),
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100,
              lineTotal: 1000,
            },
          ],
          subtotal: 1000,
          totalAmount: 1000,
          status: 'draft',
          fulfillmentStatus: 'pending',
          createdBy: testUser._id,
        },
        {
          poNumber: 'PO-2024-002',
          supplierId: testSupplier._id,
          poDate: new Date('2024-01-20'),
          items: [
            {
              itemId: testItem2._id,
              quantity: 5,
              unitPrice: 200,
              lineTotal: 1000,
            },
          ],
          subtotal: 1000,
          totalAmount: 1000,
          status: 'approved',
          fulfillmentStatus: 'pending',
          createdBy: testUser._id,
        },
      ]);
    });

    it('should get all purchase orders', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders?status=approved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].poNumber).toBe('PO-2024-002');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders?startDate=2024-01-18&endDate=2024-01-25')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].poNumber).toBe('PO-2024-002');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/purchase-orders?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/v1/purchase-orders/:id - Get Purchase Order by ID', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should get purchase order by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.poNumber).toBe('PO-2024-001');
    });

    it('should return 404 if purchase order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/purchase-orders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/purchase-orders/:id/approve - Approve Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should approve purchase order as admin', async () => {
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${testPO._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approvedAt).toBeDefined();
    });

    it('should return 400 if already approved', async () => {
      // Approve first time
      await request(app)
        .post(`/api/v1/purchase-orders/${testPO._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to approve again
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${testPO._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already approved');
    });

    it('should require admin role', async () => {
      await request(app)
        .post(`/api/v1/purchase-orders/${testPO._id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/purchase-orders/:id - Update Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should update purchase order successfully', async () => {
      const updateData = {
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should return 400 if purchase order is approved', async () => {
      testPO.status = 'approved';
      await testPO.save();

      const response = await request(app)
        .put(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot update');
    });
  });

  describe('DELETE /api/v1/purchase-orders/:id - Delete Purchase Order', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should delete purchase order as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const deletedPO = await PurchaseOrder.findById(testPO._id);
      expect(deletedPO.isDeleted).toBe(true);
    });

    it('should return 400 if purchase order is approved', async () => {
      testPO.status = 'approved';
      await testPO.save();

      const response = await request(app)
        .delete(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot delete');
    });

    it('should require admin role', async () => {
      await request(app)
        .delete(`/api/v1/purchase-orders/${testPO._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });
});
