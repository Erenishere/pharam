const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Item = require('../../src/models/Item');
const Batch = require('../../src/models/Batch');
const Warehouse = require('../../src/models/Warehouse');
const User = require('../../src/models/User');

/**
 * Integration Tests for Barcode Scanning API Endpoint
 * Tests for Requirement 13.1, 13.4 - Task 46.3
 */
describe('Barcode Scanning API Endpoint', () => {
  let authToken;
  let testUser;
  let testItem;
  let testWarehouse;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'sales',
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'password123',
      });

    authToken = loginResponse.body.token;
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    await Batch.deleteMany({});
    await Warehouse.deleteMany({});

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH001',
      location: 'Test Location',
      isActive: true,
    });

    // Create test item with barcode
    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 500,
      },
      barcode: '1234567890123',
      packSize: 12,
      isActive: true,
    });

    // Create test batches
    await Batch.create([
      {
        batchNumber: 'BATCH001',
        item: testItem._id,
        warehouse: testWarehouse._id,
        quantity: 50,
        remainingQuantity: 50,
        unitCost: 100,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        status: 'active',
      },
      {
        batchNumber: 'BATCH002',
        item: testItem._id,
        warehouse: testWarehouse._id,
        quantity: 50,
        remainingQuantity: 30,
        unitCost: 100,
        manufacturingDate: new Date('2024-02-01'),
        expiryDate: new Date('2025-11-30'),
        status: 'active',
      },
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/items/scan-barcode', () => {
    it('should scan barcode and return item details', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('ITEM001');
      expect(response.body.data.name).toBe('Test Item');
    });

    it('should return item with stock information', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      expect(response.body.data.currentStock).toBe(100);
      expect(response.body.data.pricing.salePrice).toBe(150);
    });

    it('should return batch information', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      expect(response.body.data.batches).toBeDefined();
      expect(response.body.data.batches).toHaveLength(2);
    });

    it('should return 400 if barcode not provided', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Barcode is required');
    });

    it('should return 404 if item not found', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '9999999999999' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 if item is inactive', async () => {
      testItem.isActive = false;
      await testItem.save();

      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not active');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/items/scan-barcode')
        .send({ barcode: '1234567890123' })
        .expect(401);
    });

    it('should filter batches by warehouse when warehouseId provided', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          barcode: '1234567890123',
          warehouseId: testWarehouse._id,
        })
        .expect(200);

      expect(response.body.data.batches).toHaveLength(2);
    });

    it('should handle barcode with spaces', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '  1234567890123  ' })
        .expect(200);

      expect(response.body.data.code).toBe('ITEM001');
    });

    it('should return pack size information', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      expect(response.body.data.packSize).toBe(12);
    });

    it('should handle items without batches', async () => {
      const itemNoBatch = await Item.create({
        code: 'ITEM002',
        name: 'Item Without Batch',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 50,
          salePrice: 75,
        },
        inventory: {
          currentStock: 25,
        },
        barcode: '9876543210987',
        isActive: true,
      });

      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '9876543210987' })
        .expect(200);

      expect(response.body.data.code).toBe('ITEM002');
      expect(response.body.data.batches).toHaveLength(0);
    });

    it('should return batch details with expiry information', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      const batch = response.body.data.batches[0];
      expect(batch.batchNumber).toBeDefined();
      expect(batch.expiryDate).toBeDefined();
      expect(batch.availableQuantity).toBeDefined();
      expect(batch.warehouseName).toBeDefined();
    });

    it('should handle multiple concurrent scans', async () => {
      const promises = [
        request(app)
          .post('/api/v1/items/scan-barcode')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ barcode: '1234567890123' }),
        request(app)
          .post('/api/v1/items/scan-barcode')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ barcode: '1234567890123' }),
        request(app)
          .post('/api/v1/items/scan-barcode')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ barcode: '1234567890123' }),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.code).toBe('ITEM001');
      });
    });
  });

  describe('Barcode scanning with batch selection', () => {
    it('should return multiple batches for selection', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      expect(response.body.data.batches).toHaveLength(2);
      expect(response.body.data.batches[0].batchNumber).toBeDefined();
      expect(response.body.data.batches[1].batchNumber).toBeDefined();
    });

    it('should sort batches by expiry date (FIFO)', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      const batches = response.body.data.batches;
      const date1 = new Date(batches[0].expiryDate);
      const date2 = new Date(batches[1].expiryDate);
      
      expect(date2.getTime()).toBeGreaterThanOrEqual(date1.getTime());
    });

    it('should include warehouse information in batch details', async () => {
      const response = await request(app)
        .post('/api/v1/items/scan-barcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '1234567890123' })
        .expect(200);

      const batch = response.body.data.batches[0];
      expect(batch.warehouseName).toBe('Main Warehouse');
      expect(batch.warehouseCode).toBe('WH001');
    });
  });
});
