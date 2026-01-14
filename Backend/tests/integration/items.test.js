const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Item = require('../../src/models/Item');
const database = require('../../src/config/database');

describe('Item Management Integration Tests', () => {
  let app;
  let server;
  let adminUser;
  let adminToken;
  let inventoryUser;
  let inventoryToken;
  let testItemId;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});
    await Item.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Create inventory manager user
    inventoryUser = await User.create({
      username: 'inventoryuser',
      email: 'inventory@example.com',
      password: 'password123',
      role: 'inventory_manager',
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

    // Login inventory user
    const inventoryLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'inventoryuser',
        password: 'password123',
      });
    inventoryToken = inventoryLoginResponse.body.data.accessToken;
  }, 60000);

  afterEach(async () => {
    // Clean up test items
    await Item.deleteMany({});
  });

  afterAll(async () => {
    // Clean up all test data
    await User.deleteMany({});
    await Item.deleteMany({});

    // Disconnect database and stop server
    await database.disconnect();
    if (server) {
      await server.stop();
    }
  }, 30000);

  describe('POST /api/items - Create Item', () => {
    it('should create a new item successfully as inventory manager', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'Test Item',
          code: 'ITEM001',
          description: 'Test item description',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
            currency: 'PKR',
          },
          inventory: {
            currentStock: 50,
            minimumStock: 10,
            maximumStock: 200,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Test Item');
      expect(response.body.data).toHaveProperty('code', 'ITEM001');
      expect(response.body.data.pricing).toHaveProperty('costPrice', 100);

      testItemId = response.body.data._id;
    });

    it('should create item without optional fields', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'Simple Item',
          pricing: {
            costPrice: 50,
            salePrice: 75,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Simple Item');
    });

    it('should fail to create item with duplicate code', async () => {
      await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'First Item',
          code: 'DUPLICATE',
          pricing: { costPrice: 100, salePrice: 150 },
        });

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'Second Item',
          code: 'DUPLICATE',
          pricing: { costPrice: 100, salePrice: 150 },
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to create item without pricing', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'No Pricing Item',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create item without authentication', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          name: 'No Auth Item',
          pricing: { costPrice: 100, salePrice: 150 },
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/items - Get All Items', () => {
    beforeEach(async () => {
      // Create test items
      await Item.create([
        {
          name: 'Item A',
          code: 'IA001',
          category: 'Electronics',
          pricing: { costPrice: 100, salePrice: 150 },
          inventory: { currentStock: 50, minimumStock: 10, maximumStock: 100 },
          isActive: true,
        },
        {
          name: 'Item B',
          code: 'IB001',
          category: 'Furniture',
          pricing: { costPrice: 200, salePrice: 300 },
          inventory: { currentStock: 5, minimumStock: 10, maximumStock: 50 },
          isActive: true,
        },
        {
          name: 'Item C',
          code: 'IC001',
          category: 'Electronics',
          pricing: { costPrice: 50, salePrice: 75 },
          inventory: { currentStock: 100, minimumStock: 20, maximumStock: 200 },
          isActive: false,
        },
      ]);
    });

    it('should get all items with pagination', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter items by category', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .query({ category: 'Electronics' })
        .expect(200);

      expect(response.body.data.every((item) => item.category === 'Electronics')).toBe(true);
    });

    it('should search items by keyword', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .query({ keyword: 'Item A' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/items')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/items/low-stock - Get Low Stock Items', () => {
    beforeEach(async () => {
      await Item.create([
        {
          name: 'Low Stock Item',
          code: 'LOW001',
          pricing: { costPrice: 100, salePrice: 150 },
          inventory: { currentStock: 5, minimumStock: 10, maximumStock: 100 },
        },
        {
          name: 'Normal Stock Item',
          code: 'NORM001',
          pricing: { costPrice: 100, salePrice: 150 },
          inventory: { currentStock: 50, minimumStock: 10, maximumStock: 100 },
        },
      ]);
    });

    it('should get low stock items', async () => {
      const response = await request(app)
        .get('/api/items/low-stock')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/items/:id - Get Item by ID', () => {
    beforeEach(async () => {
      const item = await Item.create({
        name: 'Test Item',
        code: 'TEST001',
        pricing: { costPrice: 100, salePrice: 150 },
      });
      testItemId = item._id.toString();
    });

    it('should get item by ID', async () => {
      const response = await request(app)
        .get(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', testItemId);
      expect(response.body.data).toHaveProperty('name', 'Test Item');
    });

    it('should fail with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/items/invalid-id')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to get non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/items/${fakeId}`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('PUT /api/items/:id - Update Item', () => {
    beforeEach(async () => {
      const item = await Item.create({
        name: 'Update Test',
        code: 'UPDATE001',
        pricing: { costPrice: 100, salePrice: 150 },
      });
      testItemId = item._id.toString();
    });

    it('should update item as inventory manager', async () => {
      const response = await request(app)
        .put(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'Updated Item',
          pricing: {
            costPrice: 120,
            salePrice: 180,
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Updated Item');
      expect(response.body.data.pricing).toHaveProperty('costPrice', 120);
    });

    it('should fail to update with duplicate code', async () => {
      await Item.create({
        name: 'Another Item',
        code: 'EXISTING',
        pricing: { costPrice: 100, salePrice: 150 },
      });

      const response = await request(app)
        .put(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          code: 'EXISTING',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to update non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/items/${fakeId}`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          name: 'Should Fail',
        })
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('DELETE /api/items/:id - Delete Item', () => {
    beforeEach(async () => {
      const item = await Item.create({
        name: 'Delete Test',
        code: 'DELETE001',
        pricing: { costPrice: 100, salePrice: 150 },
      });
      testItemId = item._id.toString();
    });

    it('should soft delete item as admin', async () => {
      const response = await request(app)
        .delete(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);
    });

    it('should fail to delete without admin or inventory manager role', async () => {
      // Create a sales user
      const salesUser = await User.create({
        username: 'salesuser',
        email: 'sales@example.com',
        password: 'password123',
        role: 'sales',
        isActive: true,
      });

      const salesLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'salesuser',
          password: 'password123',
        });
      const salesToken = salesLoginResponse.body.data.accessToken;

      const response = await request(app)
        .delete(`/api/items/${testItemId}`)
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/items/:id/stock - Update Item Stock', () => {
    beforeEach(async () => {
      const item = await Item.create({
        name: 'Stock Test',
        code: 'STOCK001',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 50, minimumStock: 10, maximumStock: 100 },
      });
      testItemId = item._id.toString();
    });

    it('should add stock to item', async () => {
      const response = await request(app)
        .patch(`/api/items/${testItemId}/stock`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          quantity: 10,
          operation: 'add',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.inventory.currentStock).toBe(60);
    });

    it('should subtract stock from item', async () => {
      const response = await request(app)
        .patch(`/api/items/${testItemId}/stock`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          quantity: 10,
          operation: 'subtract',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.inventory.currentStock).toBe(40);
    });

    it('should fail to subtract more than available stock', async () => {
      const response = await request(app)
        .patch(`/api/items/${testItemId}/stock`)
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          quantity: 100,
          operation: 'subtract',
        })
        .expect(400);

      expect(response.body.error.message).toContain('Insufficient stock');
    });
  });

  describe('GET /api/items/categories - Get Item Categories', () => {
    beforeEach(async () => {
      await Item.create([
        {
          name: 'Item 1',
          code: 'I001',
          category: 'Electronics',
          pricing: { costPrice: 100, salePrice: 150 },
        },
        {
          name: 'Item 2',
          code: 'I002',
          category: 'Furniture',
          pricing: { costPrice: 200, salePrice: 300 },
        },
        {
          name: 'Item 3',
          code: 'I003',
          category: 'Electronics',
          pricing: { costPrice: 50, salePrice: 75 },
        },
      ]);
    });

    it('should get all item categories', async () => {
      const response = await request(app)
        .get('/api/items/categories')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});
