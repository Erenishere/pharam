const request = require('supertest');
const Server = require('../../src/server');
const TaxConfig = require('../../src/models/TaxConfig');
const User = require('../../src/models/User');
const { generateToken } = require('../../src/services/authService');
const database = require('../../src/config/database');

describe('Tax API Integration Tests', () => {
  let app;
  let server;
  let authToken;
  let adminToken;
  let adminUser;
  let regularUser;
  let testTaxConfig;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});
    await TaxConfig.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      username: 'taxadmin',
      email: 'taxadmin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });
    adminToken = generateToken(adminUser);

    // Create regular user
    regularUser = await User.create({
      username: 'taxuser',
      email: 'taxuser@test.com',
      password: 'password123',
      role: 'sales',
      isActive: true,
    });
    authToken = generateToken(regularUser);

    // Create test tax configuration
    testTaxConfig = await TaxConfig.create({
      name: 'GST 18%',
      code: 'GST18',
      type: 'GST',
      rate: 0.18,
      description: 'Standard GST rate',
      category: 'standard',
      isActive: true,
      effectiveFrom: new Date(),
      createdBy: adminUser._id,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await TaxConfig.deleteMany({});
    await database.disconnect();
  });

  describe('POST /api/tax/config', () => {
    it('should create a new tax configuration (admin only)', async () => {
      const taxData = {
        name: 'WHT 4%',
        code: 'WHT4',
        type: 'WHT',
        rate: 0.04,
        description: 'Standard Withholding Tax',
        category: 'standard',
        applicableOn: 'both',
      };

      const response = await request(app)
        .post('/api/tax/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taxData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('WHT4');
      expect(response.body.data.rate).toBe(0.04);
    });

    it('should reject creation by non-admin user', async () => {
      const taxData = {
        name: 'Test Tax',
        code: 'TEST',
        type: 'GST',
        rate: 0.10,
      };

      const response = await request(app)
        .post('/api/tax/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taxData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate tax code', async () => {
      const taxData = {
        name: 'Duplicate GST',
        code: 'GST18', // Already exists
        type: 'GST',
        rate: 0.17,
      };

      const response = await request(app)
        .post('/api/tax/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(taxData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/tax/config', () => {
    it('should get all tax configurations', async () => {
      const response = await request(app)
        .get('/api/tax/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter tax configurations by type', async () => {
      const response = await request(app)
        .get('/api/tax/config?type=GST')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(tax => tax.type === 'GST')).toBe(true);
    });
  });

  describe('GET /api/tax/config/:id', () => {
    it('should get tax configuration by ID', async () => {
      const response = await request(app)
        .get(`/api/tax/config/${testTaxConfig._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('GST18');
    });

    it('should return 404 for non-existent tax config', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tax/config/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tax/config/:id', () => {
    it('should update tax configuration (admin only)', async () => {
      const updateData = {
        rate: 0.17,
        description: 'Updated GST rate',
      };

      const response = await request(app)
        .put(`/api/tax/config/${testTaxConfig._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rate).toBe(0.17);
    });
  });

  describe('POST /api/tax/calculate', () => {
    it('should calculate tax for a single amount', async () => {
      const calcData = {
        amount: 10000,
        taxCode: 'GST18',
        isInclusive: false,
        quantity: 1,
      };

      const response = await request(app)
        .post('/api/tax/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(calcData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.taxableAmount).toBe(10000);
      expect(response.body.data.taxAmount).toBe(1800);
      expect(response.body.data.grossAmount).toBe(11800);
    });

    it('should handle inclusive pricing', async () => {
      const calcData = {
        amount: 11800,
        taxCode: 'GST18',
        isInclusive: true,
        quantity: 1,
      };

      const response = await request(app)
        .post('/api/tax/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(calcData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.taxableAmount).toBeCloseTo(10000, 0);
      expect(response.body.data.grossAmount).toBe(11800);
    });
  });

  describe('POST /api/tax/calculate-gst', () => {
    it('should calculate GST', async () => {
      const calcData = {
        amount: 10000,
        gstCode: 'GST18',
        isInclusive: false,
        quantity: 1,
      };

      const response = await request(app)
        .post('/api/tax/calculate-gst')
        .set('Authorization', `Bearer ${authToken}`)
        .send(calcData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.taxAmount).toBe(1800);
    });
  });

  describe('POST /api/tax/calculate-item', () => {
    it('should calculate tax for invoice item', async () => {
      const itemData = {
        unitPrice: 1000,
        quantity: 10,
        taxCodes: 'GST18',
        taxInclusive: false,
        discount: 10,
      };

      const response = await request(app)
        .post('/api/tax/calculate-item')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subtotal).toBe(10000);
      expect(response.body.data.discountAmount).toBe(1000);
      expect(response.body.data.taxableAmount).toBe(9000);
      expect(response.body.data.taxAmount).toBe(1620);
    });
  });

  describe('POST /api/tax/calculate-invoice', () => {
    it('should calculate taxes for multiple items', async () => {
      const invoiceData = {
        items: [
          {
            unitPrice: 1000,
            quantity: 5,
            taxCodes: 'GST18',
            taxInclusive: false,
            discount: 0,
          },
          {
            unitPrice: 2000,
            quantity: 3,
            taxCodes: 'GST18',
            taxInclusive: false,
            discount: 10,
          },
        ],
      };

      const response = await request(app)
        .post('/api/tax/calculate-invoice')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSubtotal).toBe(11000);
      expect(response.body.data.totalDiscount).toBe(600);
      expect(response.body.data.items).toHaveLength(2);
    });
  });

  describe('GET /api/tax/rates', () => {
    it('should get all active tax rates', async () => {
      const response = await request(app)
        .get('/api/tax/rates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by tax type', async () => {
      const response = await request(app)
        .get('/api/tax/rates?type=GST')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(tax => tax.type === 'GST')).toBe(true);
    });
  });

  describe('GET /api/tax/statistics', () => {
    it('should get tax statistics', async () => {
      const response = await request(app)
        .get('/api/tax/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/tax/report', () => {
    it('should generate tax report', async () => {
      const reportData = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        taxType: 'GST',
        format: 'json',
      };

      const response = await request(app)
        .post('/api/tax/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBeDefined();
    });

    it('should reject report generation without dates', async () => {
      const reportData = {
        taxType: 'GST',
      };

      const response = await request(app)
        .post('/api/tax/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/tax/config/:id/activate', () => {
    it('should activate tax configuration', async () => {
      const response = await request(app)
        .patch(`/api/tax/config/${testTaxConfig._id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('PATCH /api/tax/config/:id/deactivate', () => {
    it('should deactivate tax configuration', async () => {
      const response = await request(app)
        .patch(`/api/tax/config/${testTaxConfig._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });
});
