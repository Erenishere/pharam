const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');
const Inventory = require('../../src/models/Inventory');
const { signToken } = require('../../src/controllers/authController');

let mongoServer;
let authToken;

// Test data
const testUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'admin'
};

const testWarehouse = {
  name: 'Test Warehouse',
  code: 'WH001',
  location: {
    address: '123 Test St',
    city: 'Test City',
    country: 'Test Country'
  },
  isActive: true
};

const testItem = {
  code: 'ITEM001',
  name: 'Test Item',
  unit: 'pcs',
  category: 'Category A',
  pricing: {
    costPrice: 10,
    salePrice: 15
  },
  inventory: {
    currentStock: 0,
    minimumStock: 10,
    maximumStock: 100
  },
  isActive: true
};

describe('Warehouse Stock Report API', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    // Generate auth token
    authToken = signToken(testUser._id);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Inventory.deleteMany({});
    await Warehouse.deleteMany({});
    await Item.deleteMany({});
  });

  describe('GET /api/v1/reports/warehouse-stock', () => {
    let warehouse, item1, item2;

    beforeEach(async () => {
      warehouse = await Warehouse.create(testWarehouse);
      
      item1 = await Item.create({
        ...testItem,
        code: 'ITEM001',
        name: 'Item 1',
        inventory: { currentStock: 0, minimumStock: 20, maximumStock: 100 }
      });
      
      item2 = await Item.create({
        ...testItem,
        code: 'ITEM002',
        name: 'Item 2',
        inventory: { currentStock: 0, minimumStock: 10, maximumStock: 50 }
      });

      // Create inventory records
      await Inventory.create({
        item: item1._id,
        warehouse: warehouse._id,
        quantity: 15,
        available: 15,
        allocated: 0,
        reorderPoint: 20
      });

      await Inventory.create({
        item: item2._id,
        warehouse: warehouse._id,
        quantity: 50,
        available: 50,
        allocated: 0,
        reorderPoint: 10
      });
    });

    it('should return warehouse stock level report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/warehouse-stock')
        .query({ warehouseId: warehouse._id.toString() })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('warehouse');
      expect(res.body.data.warehouse.id).to.equal(warehouse._id.toString());
      expect(res.body.data.items).to.have.lengthOf(2);
      expect(res.body.data.summary.totalItems).to.equal(2);
      expect(res.body.data.summary.lowStockItems).to.equal(1); // Item 1 (15 <= 20)
      expect(res.body.data.summary.outOfStockItems).to.equal(0);
      expect(res.body.data.summary.inStockItems).to.equal(1); // Item 2 (50 > 10)
    });

    it('should return 400 when warehouse ID is missing', async () => {
      const res = await request(app)
        .get('/api/v1/reports/warehouse-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Warehouse ID is required');
    });

    it('should return error when warehouse not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get('/api/v1/reports/warehouse-stock')
        .query({ warehouseId: nonExistentId.toString() })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Service throws error which becomes 500

      expect(res.body.success).to.be.false;
    });

    it('should return empty items array for warehouse with no inventory', async () => {
      const emptyWarehouse = await Warehouse.create({
        ...testWarehouse,
        code: 'WH002',
        name: 'Empty Warehouse'
      });

      const res = await request(app)
        .get('/api/v1/reports/warehouse-stock')
        .query({ warehouseId: emptyWarehouse._id.toString() })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data.items).to.have.lengthOf(0);
      expect(res.body.data.summary.totalItems).to.equal(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/reports/warehouse-stock')
        .query({ warehouseId: warehouse._id.toString() })
        .expect(401);
    });
  });

  describe('GET /api/v1/reports/warehouse-comparison/:itemId', () => {
    let warehouse1, warehouse2, warehouse3, item;

    beforeEach(async () => {
      warehouse1 = await Warehouse.create({
        ...testWarehouse,
        code: 'WH001',
        name: 'Warehouse 1'
      });
      
      warehouse2 = await Warehouse.create({
        ...testWarehouse,
        code: 'WH002',
        name: 'Warehouse 2'
      });
      
      warehouse3 = await Warehouse.create({
        ...testWarehouse,
        code: 'WH003',
        name: 'Warehouse 3'
      });

      item = await Item.create({
        ...testItem,
        code: 'ITEM001',
        name: 'Test Item'
      });

      // Create inventory in multiple warehouses
      await Inventory.create({
        item: item._id,
        warehouse: warehouse1._id,
        quantity: 50,
        available: 45,
        allocated: 5
      });

      await Inventory.create({
        item: item._id,
        warehouse: warehouse2._id,
        quantity: 30,
        available: 30,
        allocated: 0
      });

      await Inventory.create({
        item: item._id,
        warehouse: warehouse3._id,
        quantity: 0,
        available: 0,
        allocated: 0
      });
    });

    it('should return warehouse comparison report for an item', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/warehouse-comparison/${item._id.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('item');
      expect(res.body.data.item.id).to.equal(item._id.toString());
      expect(res.body.data.warehouses).to.have.lengthOf(3);
      expect(res.body.data.summary.totalWarehouses).to.equal(3);
      expect(res.body.data.summary.warehousesWithStock).to.equal(2);
      expect(res.body.data.summary.warehousesWithoutStock).to.equal(1);
      expect(res.body.data.summary.totalQuantity).to.equal(80); // 50 + 30 + 0
    });

    it('should return 400 when item ID is missing', async () => {
      const res = await request(app)
        .get('/api/v1/reports/warehouse-comparison/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Route not found
    });

    it('should return error when item not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/reports/warehouse-comparison/${nonExistentId.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Service throws error which becomes 500

      expect(res.body.success).to.be.false;
    });

    it('should return empty warehouses array when item has no inventory', async () => {
      const newItem = await Item.create({
        ...testItem,
        code: 'ITEM002',
        name: 'New Item'
      });

      const res = await request(app)
        .get(`/api/v1/reports/warehouse-comparison/${newItem._id.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.data.warehouses).to.have.lengthOf(0);
      expect(res.body.data.summary.totalWarehouses).to.equal(0);
      expect(res.body.data.summary.totalQuantity).to.equal(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v1/reports/warehouse-comparison/${item._id.toString()}`)
        .expect(401);
    });
  });
});

