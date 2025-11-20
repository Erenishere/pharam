const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Company = require('../../src/models/Company');
const Scheme = require('../../src/models/Scheme');
const database = require('../../src/config/database');

describe('Scheme Management Integration Tests', () => {
  let app;
  let server;
  let adminUser;
  let adminToken;
  let testCompany;
  let testSchemeId;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Scheme.deleteMany({});

    // Create test company
    testCompany = await Company.create({
      name: 'Test Company',
      code: 'TC001',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@company.com',
      gstin: '27AABCU9603R1ZX',
      isActive: true
    });

    // Create admin user
    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Login admin user
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
      });

    adminToken = adminLoginResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Scheme.deleteMany({});
    
    // Close database connection
    await mongoose.connection.close();
    
    // Close server
    if (server) {
      await server.close();
    }
  });

  describe('POST /api/schemes', () => {
    it('should create a new scheme successfully', async () => {
      const schemeData = {
        name: 'Test Scheme 1',
        type: 'scheme1',
        company: testCompany._id,
        schemeFormat: '12+1',
        discountPercent: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      };

      const response = await request(app)
        .post('/api/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(schemeData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.scheme).toBeDefined();
      expect(response.body.data.scheme.name).toBe('Test Scheme 1');
      expect(response.body.data.scheme.type).toBe('scheme1');
      expect(response.body.data.scheme.schemeFormat).toBe('12+1');

      testSchemeId = response.body.data.scheme._id;
    });

    it('should fail to create scheme with duplicate name', async () => {
      const schemeData = {
        name: 'Test Scheme 1', // Same name as before
        type: 'scheme2',
        company: testCompany._id,
        schemeFormat: '10+2',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      };

      const response = await request(app)
        .post('/api/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(schemeData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });

    it('should fail to create scheme without required fields', async () => {
      const schemeData = {
        name: 'Incomplete Scheme',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(schemeData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/schemes', () => {
    beforeAll(async () => {
      // Create additional test schemes
      await Scheme.create([
        {
          name: 'Test Scheme 2',
          type: 'scheme2',
          company: testCompany._id,
          schemeFormat: '10+2',
          claimAccountId: new mongoose.Types.ObjectId(),
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          isActive: true
        },
        {
          name: 'Inactive Scheme',
          type: 'scheme1',
          company: testCompany._id,
          schemeFormat: '5+1',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          isActive: false
        }
      ]);
    });

    it('should get all schemes', async () => {
      const response = await request(app)
        .get('/api/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter schemes by type', async () => {
      const response = await request(app)
        .get('/api/schemes?type=scheme1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(scheme => {
        expect(scheme.type).toBe('scheme1');
      });
    });

    it('should filter schemes by active status', async () => {
      const response = await request(app)
        .get('/api/schemes?isActive=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(scheme => {
        expect(scheme.isActive).toBe(false);
      });
    });

    it('should filter schemes by current only', async () => {
      const response = await request(app)
        .get('/api/schemes?currentOnly=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      const now = new Date();
      response.body.data.forEach(scheme => {
        expect(scheme.isActive).toBe(true);
        expect(new Date(scheme.startDate)).toBeLessThanOrEqual(now);
        expect(new Date(scheme.endDate)).toBeGreaterThanOrEqual(now);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/schemes?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/schemes/:id', () => {
    it('should get scheme by ID', async () => {
      const response = await request(app)
        .get(`/api/schemes/${testSchemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.scheme).toBeDefined();
      expect(response.body.data.scheme._id).toBe(testSchemeId);
      expect(response.body.data.scheme.name).toBe('Test Scheme 1');
    });

    it('should return 404 for non-existent scheme', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/schemes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/schemes/company/:companyId', () => {
    it('should get schemes by company ID', async () => {
      const response = await request(app)
        .get(`/api/schemes/company/${testCompany._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(scheme => {
        expect(scheme.company._id).toBe(testCompany._id.toString());
      });
    });

    it('should filter schemes by type for company', async () => {
      const response = await request(app)
        .get(`/api/schemes/company/${testCompany._id}?type=scheme1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(scheme => {
        expect(scheme.company._id).toBe(testCompany._id.toString());
        expect(scheme.type).toBe('scheme1');
      });
    });

    it('should return empty array for non-existent company', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/schemes/company/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('PUT /api/schemes/:id', () => {
    it('should update scheme successfully', async () => {
      const updateData = {
        name: 'Updated Test Scheme 1',
        discountPercent: 10,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/schemes/${testSchemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.scheme).toBeDefined();
      expect(response.body.data.scheme.name).toBe('Updated Test Scheme 1');
      expect(response.body.data.scheme.discountPercent).toBe(10);
      expect(response.body.data.scheme.description).toBe('Updated description');
    });

    it('should fail to update scheme with duplicate name', async () => {
      const updateData = {
        name: 'Test Scheme 2' // Name of another existing scheme
      };

      const response = await request(app)
        .put(`/api/schemes/${testSchemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });

    it('should return 404 for non-existent scheme', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/schemes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/schemes/:id', () => {
    it('should delete scheme successfully', async () => {
      // Create a scheme to delete
      const schemeToDelete = await Scheme.create({
        name: 'Scheme to Delete',
        type: 'scheme1',
        company: testCompany._id,
        schemeFormat: '8+2',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/schemes/${schemeToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      expect(response.body.status).toBe('success');

      // Verify scheme is deleted
      const deletedScheme = await Scheme.findById(schemeToDelete._id);
      expect(deletedScheme).toBeNull();
    });

    it('should return 404 for non-existent scheme', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/schemes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/schemes/:id/qualify', () => {
    let testItem;
    let testCustomer;

    beforeAll(async () => {
      const Item = require('../../src/models/Item');
      const Customer = require('../../src/models/Customer');

      testItem = await Item.create({
        code: 'TEST001',
        name: 'Test Item',
        description: 'Test item for scheme qualification',
        unit: 'PCS',
        packSize: 1,
        mrp: 100,
        purchaseRate: 80,
        saleRate: 90,
        isActive: true
      });

      testCustomer = await Customer.create({
        code: 'CUST001',
        name: 'Test Customer',
        contactPerson: 'Test Contact',
        phone: '1234567890',
        email: 'customer@example.com',
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        gstin: '27AABCU9603R1ZX',
        isActive: true
      });
    });

    afterAll(async () => {
      await Item.deleteMany({ code: 'TEST001' });
      await Customer.deleteMany({ code: 'CUST001' });
    });

    it('should check scheme qualification successfully', async () => {
      const qualificationData = {
        itemId: testItem._id,
        customerId: testCustomer._id,
        quantity: 15 // More than minimum for 12+1 scheme
      };

      const response = await request(app)
        .post(`/api/schemes/${testSchemeId}/qualify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(qualificationData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.qualifies).toBe(true);
      expect(response.body.data.schemeId).toBe(testSchemeId);
      expect(response.body.data.schemeName).toBe('Updated Test Scheme 1');
    });

    it('should fail qualification with insufficient quantity', async () => {
      const qualificationData = {
        itemId: testItem._id,
        customerId: testCustomer._id,
        quantity: 5 // Less than minimum for 12+1 scheme
      };

      const response = await request(app)
        .post(`/api/schemes/${testSchemeId}/qualify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(qualificationData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.qualifies).toBe(false);
      expect(response.body.data.reasons).toContain('Minimum quantity');
    });

    it('should return 400 for missing required fields', async () => {
      const qualificationData = {
        // Missing required fields
      };

      const response = await request(app)
        .post(`/api/schemes/${testSchemeId}/qualify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(qualificationData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });
  });

  describe('POST /api/schemes/applicable', () => {
    let testItem;
    let testCustomer;

    beforeAll(async () => {
      const Item = require('../../src/models/Item');
      const Customer = require('../../src/models/Customer');

      testItem = await Item.create({
        code: 'TEST002',
        name: 'Test Item 2',
        description: 'Test item for applicable schemes',
        unit: 'PCS',
        packSize: 1,
        mrp: 200,
        purchaseRate: 160,
        saleRate: 180,
        isActive: true
      });

      testCustomer = await Customer.create({
        code: 'CUST002',
        name: 'Test Customer 2',
        contactPerson: 'Test Contact 2',
        phone: '0987654321',
        email: 'customer2@example.com',
        address: 'Test Address 2',
        city: 'Test City',
        state: 'Test State',
        gstin: '27AABCU9603R1ZY',
        isActive: true
      });
    });

    afterAll(async () => {
      await Item.deleteMany({ code: 'TEST002' });
      await Customer.deleteMany({ code: 'CUST002' });
    });

    it('should get applicable schemes for item and customer', async () => {
      const applicableData = {
        itemId: testItem._id,
        customerId: testCustomer._id,
        companyId: testCompany._id
      };

      const response = await request(app)
        .post('/api/schemes/applicable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(applicableData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      // Should return schemes that are active and apply to this item/customer
    });

    it('should return 400 for missing required fields', async () => {
      const applicableData = {
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/schemes/applicable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(applicableData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });
  });

  describe('POST /api/schemes/:id/calculate-bonus', () => {
    it('should calculate scheme bonus successfully', async () => {
      const bonusData = {
        quantity: 25 // For 12+1 scheme: 25 / 12 = 2 complete sets, 2 * 1 = 2 bonus
      };

      const response = await request(app)
        .post(`/api/schemes/${testSchemeId}/calculate-bonus`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bonusData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.schemeId).toBe(testSchemeId);
      expect(response.body.data.schemeFormat).toBe('12+1');
      expect(response.body.data.purchasedQuantity).toBe(25);
      expect(response.body.data.buyQuantity).toBe(12);
      expect(response.body.data.bonusQuantity).toBe(1);
      expect(response.body.data.completeSets).toBe(2);
      expect(response.body.data.totalBonusQuantity).toBe(2);
      expect(response.body.data.totalQuantityWithBonus).toBe(27);
    });

    it('should return 400 for invalid quantity', async () => {
      const bonusData = {
        quantity: -5 // Invalid negative quantity
      };

      const response = await request(app)
        .post(`/api/schemes/${testSchemeId}/calculate-bonus`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bonusData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Valid quantity is required');
    });

    it('should return 404 for non-existent scheme', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/schemes/${nonExistentId}/calculate-bonus`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 10 })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Test GET /api/schemes without token
      const response = await request(app)
        .get('/api/schemes')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Please log in');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/schemes')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid token');
    });
  });
});