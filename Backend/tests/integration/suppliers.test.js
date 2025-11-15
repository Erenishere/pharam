const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Supplier = require('../../src/models/Supplier');
const database = require('../../src/config/database');

describe('Supplier Management Integration Tests', () => {
  let app;
  let server;
  let adminUser;
  let adminToken;
  let purchaseUser;
  let purchaseToken;
  let testSupplierId;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});
    await Supplier.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Create purchase user
    purchaseUser = await User.create({
      username: 'purchaseuser',
      email: 'purchase@example.com',
      password: 'password123',
      role: 'purchase',
      isActive: true,
    });

    // Login admin user
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'adminuser',
        password: 'password123',
      });
    adminToken = adminLoginResponse.body.data.accessToken;

    // Login purchase user
    const purchaseLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'purchaseuser',
        password: 'password123',
      });
    purchaseToken = purchaseLoginResponse.body.data.accessToken;
  }, 60000);

  afterEach(async () => {
    // Clean up test suppliers
    await Supplier.deleteMany({});
  });

  afterAll(async () => {
    // Clean up all test data
    await User.deleteMany({});
    await Supplier.deleteMany({});

    // Disconnect database and stop server
    await database.disconnect();
    if (server) {
      await server.stop();
    }
  }, 30000);

  describe('POST /api/suppliers - Create Supplier', () => {
    it('should create a new supplier successfully as purchase user', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Test Supplier',
          code: 'SUPP001',
          type: 'supplier',
          contactInfo: {
            email: 'supplier@example.com',
            phone: '+92-300-1234567',
            address: '123 Main St',
            city: 'Karachi',
            country: 'Pakistan',
          },
          financialInfo: {
            creditLimit: 100000,
            paymentTerms: 30,
            currency: 'PKR',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Supplier created successfully');
      expect(response.body.data).toHaveProperty('name', 'Test Supplier');
      expect(response.body.data).toHaveProperty('code', 'SUPP001');
      expect(response.body.data).toHaveProperty('type', 'supplier');

      testSupplierId = response.body.data._id;
    });

    it('should create supplier without optional fields', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Simple Supplier',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Simple Supplier');
    });

    it('should fail to create supplier with duplicate code', async () => {
      await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'First Supplier',
          code: 'DUPLICATE',
        });

      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Second Supplier',
          code: 'DUPLICATE',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to create supplier with invalid email', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Invalid Email Supplier',
          contactInfo: {
            email: 'invalid-email',
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create supplier with negative credit limit', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Negative Credit',
          financialInfo: {
            creditLimit: -1000,
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create supplier without authentication', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .send({
          name: 'No Auth Supplier',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/suppliers - Get All Suppliers', () => {
    beforeEach(async () => {
      // Create test suppliers
      await Supplier.create([
        { name: 'Supplier A', code: 'SA001', type: 'supplier', isActive: true },
        { name: 'Supplier B', code: 'SB001', type: 'customer', isActive: true },
        { name: 'Supplier C', code: 'SC001', type: 'both', isActive: false },
      ]);
    });

    it('should get all suppliers with pagination', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter suppliers by type', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .query({ type: 'supplier' })
        .expect(200);

      expect(response.body.data.every((s) => s.type === 'supplier')).toBe(true);
    });

    it('should filter suppliers by active status', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .query({ isActive: true })
        .expect(200);

      expect(response.body.data.every((s) => s.isActive === true)).toBe(true);
    });

    it('should search suppliers by keyword', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .query({ search: 'Supplier A' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/suppliers/:id - Get Supplier by ID', () => {
    beforeEach(async () => {
      const supplier = await Supplier.create({
        name: 'Test Supplier',
        code: 'TEST001',
      });
      testSupplierId = supplier._id.toString();
    });

    it('should get supplier by ID', async () => {
      const response = await request(app)
        .get(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', testSupplierId);
      expect(response.body.data).toHaveProperty('name', 'Test Supplier');
    });

    it('should fail with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/suppliers/invalid-id')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail to get non-existent supplier', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/suppliers/${fakeId}`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('SUPPLIER_NOT_FOUND');
    });
  });

  describe('GET /api/suppliers/code/:code - Get Supplier by Code', () => {
    beforeEach(async () => {
      await Supplier.create({
        name: 'Code Test Supplier',
        code: 'CODE123',
      });
    });

    it('should get supplier by code', async () => {
      const response = await request(app)
        .get('/api/suppliers/code/CODE123')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('code', 'CODE123');
      expect(response.body.data).toHaveProperty('name', 'Code Test Supplier');
    });

    it('should fail to get non-existent supplier code', async () => {
      const response = await request(app)
        .get('/api/suppliers/code/NONEXISTENT')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('SUPPLIER_NOT_FOUND');
    });
  });

  describe('PUT /api/suppliers/:id - Update Supplier', () => {
    beforeEach(async () => {
      const supplier = await Supplier.create({
        name: 'Update Test',
        code: 'UPDATE001',
      });
      testSupplierId = supplier._id.toString();
    });

    it('should update supplier as purchase user', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Updated Supplier',
          contactInfo: {
            email: 'updated@example.com',
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Updated Supplier');
    });

    it('should fail to update with duplicate code', async () => {
      await Supplier.create({
        name: 'Another Supplier',
        code: 'EXISTING',
      });

      const response = await request(app)
        .put(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          code: 'EXISTING',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to update non-existent supplier', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/suppliers/${fakeId}`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .send({
          name: 'Should Fail',
        })
        .expect(404);

      expect(response.body.error.code).toBe('SUPPLIER_NOT_FOUND');
    });
  });

  describe('DELETE /api/suppliers/:id - Delete Supplier', () => {
    beforeEach(async () => {
      const supplier = await Supplier.create({
        name: 'Delete Test',
        code: 'DELETE001',
      });
      testSupplierId = supplier._id.toString();
    });

    it('should soft delete supplier as admin', async () => {
      const response = await request(app)
        .delete(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);
    });

    it('should fail to delete without admin role', async () => {
      const response = await request(app)
        .delete(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/suppliers/:id/restore - Restore Supplier', () => {
    beforeEach(async () => {
      const supplier = await Supplier.create({
        name: 'Restore Test',
        code: 'RESTORE001',
        isActive: false,
      });
      testSupplierId = supplier._id.toString();
    });

    it('should restore soft-deleted supplier as admin', async () => {
      const response = await request(app)
        .post(`/api/suppliers/${testSupplierId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should fail to restore without admin role', async () => {
      const response = await request(app)
        .post(`/api/suppliers/${testSupplierId}/restore`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/suppliers/:id/toggle-status - Toggle Supplier Status', () => {
    beforeEach(async () => {
      const supplier = await Supplier.create({
        name: 'Toggle Test',
        code: 'TOGGLE001',
        isActive: true,
      });
      testSupplierId = supplier._id.toString();
    });

    it('should toggle supplier status as purchase user', async () => {
      const response = await request(app)
        .patch(`/api/suppliers/${testSupplierId}/toggle-status`)
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);
    });
  });

  describe('GET /api/suppliers/type/:type - Get Suppliers by Type', () => {
    beforeEach(async () => {
      await Supplier.create([
        { name: 'Supplier Type', code: 'ST001', type: 'supplier' },
        { name: 'Customer Type', code: 'CT001', type: 'customer' },
        { name: 'Both Type', code: 'BT001', type: 'both' },
      ]);
    });

    it('should get suppliers by type', async () => {
      const response = await request(app)
        .get('/api/suppliers/type/supplier')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.every((s) => s.type === 'supplier')).toBe(true);
    });

    it('should fail with invalid type', async () => {
      const response = await request(app)
        .get('/api/suppliers/type/invalid')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('GET /api/suppliers/statistics - Get Supplier Statistics', () => {
    beforeEach(async () => {
      await Supplier.create([
        { name: 'Stat Supplier 1', code: 'SS001', type: 'supplier', isActive: true },
        { name: 'Stat Supplier 2', code: 'SS002', type: 'customer', isActive: true },
        { name: 'Stat Supplier 3', code: 'SS003', type: 'both', isActive: false },
      ]);
    });

    it('should get supplier statistics as admin', async () => {
      const response = await request(app)
        .get('/api/suppliers/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should fail without accountant or admin role', async () => {
      const response = await request(app)
        .get('/api/suppliers/statistics')
        .set('Authorization', `Bearer ${purchaseToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});