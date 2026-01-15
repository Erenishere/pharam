const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const database = require('../../src/config/database');

describe('Customer Management Integration Tests', () => {
  let app;
  let server;
  let adminUser;
  let adminToken;
  let salesUser;
  let salesToken;
  let testCustomerId;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});
    await Customer.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Create sales user
    salesUser = await User.create({
      username: 'salesuser',
      email: 'sales@example.com',
      password: 'password123',
      role: 'sales',
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

    // Login sales user
    const salesLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'salesuser',
        password: 'password123',
      });
    salesToken = salesLoginResponse.body.data.accessToken;
  }, 60000);

  afterEach(async () => {
    // Clean up test customers
    await Customer.deleteMany({});
  });

  afterAll(async () => {
    // Clean up all test data
    await User.deleteMany({});
    await Customer.deleteMany({});

    // Disconnect database and stop server
    await database.disconnect();
    if (server) {
      await server.stop();
    }
  }, 30000);

  describe('POST /api/customers - Create Customer', () => {
    it('should create a new customer successfully as sales user', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Test Customer',
          code: 'CUST001',
          type: 'customer',
          contactInfo: {
            email: 'customer@example.com',
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
      expect(response.body).toHaveProperty('message', 'Customer created successfully');
      expect(response.body.data).toHaveProperty('name', 'Test Customer');
      expect(response.body.data).toHaveProperty('code', 'CUST001');
      expect(response.body.data).toHaveProperty('type', 'customer');

      testCustomerId = response.body.data._id;
    });

    it('should create customer without optional fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Simple Customer',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Simple Customer');
    });

    it('should fail to create customer with duplicate code', async () => {
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'First Customer',
          code: 'DUPLICATE',
        });

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Second Customer',
          code: 'DUPLICATE',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to create customer with invalid email', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Invalid Email Customer',
          contactInfo: {
            email: 'invalid-email',
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create customer with negative credit limit', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Negative Credit',
          financialInfo: {
            creditLimit: -1000,
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create customer without authentication', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send({
          name: 'No Auth Customer',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/customers - Get All Customers', () => {
    beforeEach(async () => {
      // Create test customers
      await Customer.create([
        { name: 'Customer A', code: 'CA001', type: 'customer', isActive: true },
        { name: 'Customer B', code: 'CB001', type: 'supplier', isActive: true },
        { name: 'Customer C', code: 'CC001', type: 'both', isActive: false },
      ]);
    });

    it('should get all customers with pagination', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter customers by type', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .query({ type: 'customer' })
        .expect(200);

      expect(response.body.data.every((c) => c.type === 'customer')).toBe(true);
    });

    it('should filter customers by active status', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .query({ isActive: true })
        .expect(200);

      expect(response.body.data.every((c) => c.isActive === true)).toBe(true);
    });

    it('should search customers by keyword', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .query({ search: 'Customer A' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/customers/:id - Get Customer by ID', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Test Customer',
        code: 'TEST001',
      });
      testCustomerId = customer._id.toString();
    });

    it('should get customer by ID', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', testCustomerId);
      expect(response.body.data).toHaveProperty('name', 'Test Customer');
    });

    it('should fail with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-id')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail to get non-existent customer', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/customers/${fakeId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('GET /api/customers/code/:code - Get Customer by Code', () => {
    beforeEach(async () => {
      await Customer.create({
        name: 'Code Test Customer',
        code: 'CODE123',
      });
    });

    it('should get customer by code', async () => {
      const response = await request(app)
        .get('/api/customers/code/CODE123')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('code', 'CODE123');
      expect(response.body.data).toHaveProperty('name', 'Code Test Customer');
    });

    it('should fail to get non-existent customer code', async () => {
      const response = await request(app)
        .get('/api/customers/code/NONEXISTENT')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('PUT /api/customers/:id - Update Customer', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Update Test',
        code: 'UPDATE001',
      });
      testCustomerId = customer._id.toString();
    });

    it('should update customer as sales user', async () => {
      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Updated Customer',
          contactInfo: {
            email: 'updated@example.com',
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Updated Customer');
    });

    it('should fail to update with duplicate code', async () => {
      await Customer.create({
        name: 'Another Customer',
        code: 'EXISTING',
      });

      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          code: 'EXISTING',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to update non-existent customer', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/customers/${fakeId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Should Fail',
        })
        .expect(404);

      expect(response.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('DELETE /api/customers/:id - Delete Customer', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Delete Test',
        code: 'DELETE001',
      });
      testCustomerId = customer._id.toString();
    });

    it('should soft delete customer as admin', async () => {
      const response = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);
    });

    it('should fail to delete without admin role', async () => {
      const response = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/customers/:id/restore - Restore Customer', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Restore Test',
        code: 'RESTORE001',
        isActive: false,
      });
      testCustomerId = customer._id.toString();
    });

    it('should restore soft-deleted customer as admin', async () => {
      const response = await request(app)
        .post(`/api/customers/${testCustomerId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should fail to restore without admin role', async () => {
      const response = await request(app)
        .post(`/api/customers/${testCustomerId}/restore`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/customers/:id/toggle-status - Toggle Customer Status', () => {
    beforeEach(async () => {
      const customer = await Customer.create({
        name: 'Toggle Test',
        code: 'TOGGLE001',
        isActive: true,
      });
      testCustomerId = customer._id.toString();
    });

    it('should toggle customer status as sales user', async () => {
      const response = await request(app)
        .patch(`/api/customers/${testCustomerId}/toggle-status`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);
    });
  });

  describe('GET /api/customers/type/:type - Get Customers by Type', () => {
    beforeEach(async () => {
      await Customer.create([
        { name: 'Customer Type', code: 'CT001', type: 'customer' },
        { name: 'Supplier Type', code: 'ST001', type: 'supplier' },
        { name: 'Both Type', code: 'BT001', type: 'both' },
      ]);
    });

    it('should get customers by type', async () => {
      const response = await request(app)
        .get('/api/customers/type/customer')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.every((c) => c.type === 'customer')).toBe(true);
    });

    it('should fail with invalid type', async () => {
      const response = await request(app)
        .get('/api/customers/type/invalid')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('GET /api/customers/statistics - Get Customer Statistics', () => {
    beforeEach(async () => {
      await Customer.create([
        { name: 'Stat Customer 1', code: 'SC001', type: 'customer', isActive: true },
        { name: 'Stat Customer 2', code: 'SC002', type: 'supplier', isActive: true },
        { name: 'Stat Customer 3', code: 'SC003', type: 'both', isActive: false },
      ]);
    });

    it('should get customer statistics as admin', async () => {
      const response = await request(app)
        .get('/api/customers/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should fail without accountant or admin role', async () => {
      const response = await request(app)
        .get('/api/customers/statistics')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});
