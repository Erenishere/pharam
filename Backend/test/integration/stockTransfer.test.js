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

const testWarehouse1 = {
  name: 'Main Warehouse',
  code: 'WH001',
  location: {
    address: '123 Main St',
    city: 'Test City',
    country: 'Test Country'
  },
  isActive: true
};

const testWarehouse2 = {
  name: 'Secondary Warehouse',
  code: 'WH002',
  location: {
    address: '456 Second St',
    city: 'Test City',
    country: 'Test Country'
  },
  isActive: true
};

const testItem = {
  code: 'ITEM001',
  name: 'Test Item',
  unit: 'pcs',
  isActive: true
};

describe('Stock Transfer API', () => {
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

  describe('POST /api/inventory/transfer', () => {
    let warehouse1, warehouse2, item, inventory;

    beforeEach(async () => {
      // Create warehouses
      warehouse1 = await Warehouse.create(testWarehouse1);
      warehouse2 = await Warehouse.create(testWarehouse2);
      
      // Create item
      item = await Item.create(testItem);
      
      // Create inventory in warehouse1
      inventory = await Inventory.create({
        item: item._id,
        warehouse: warehouse1._id,
        quantity: 100,
        available: 100,
        allocated: 0
      });
    });

    it('should transfer stock between warehouses', async () => {
      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 50,
        reason: 'Stock reallocation'
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(res.body.status).to.equal('success');
      expect(res.body.message).to.equal('Stock transferred successfully');
      expect(res.body.data).to.have.property('transfer');
      expect(res.body.data.transfer.quantity).to.equal(50);
      expect(res.body.data.transfer.fromWarehouse.remainingStock).to.equal(50);
      expect(res.body.data.transfer.toWarehouse.newStock).to.equal(50);

      // Verify inventory was updated
      const updatedSourceInventory = await Inventory.findOne({
        item: item._id,
        warehouse: warehouse1._id
      });
      expect(updatedSourceInventory.quantity).to.equal(50);

      const destinationInventory = await Inventory.findOne({
        item: item._id,
        warehouse: warehouse2._id
      });
      expect(destinationInventory).to.exist;
      expect(destinationInventory.quantity).to.equal(50);
    });

    it('should return 400 for missing required fields', async () => {
      const transferData = {
        itemId: item._id.toString(),
        // Missing fromWarehouseId, toWarehouseId, quantity
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(res.body.status).to.equal('error');
    });

    it('should return 400 for insufficient stock', async () => {
      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 150, // More than available (100)
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(res.body.status).to.equal('error');
      expect(res.body.message).to.include('Insufficient stock');
    });

    it('should return 400 when source and destination warehouses are the same', async () => {
      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse1._id.toString(), // Same warehouse
        quantity: 50,
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(res.body.status).to.equal('error');
      expect(res.body.message).to.include('must be different');
    });

    it('should return 404 for non-existent item', async () => {
      const nonExistentItemId = new mongoose.Types.ObjectId();
      const transferData = {
        itemId: nonExistentItemId.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 50,
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(404);

      expect(res.body.status).to.equal('error');
      expect(res.body.message).to.include('not found');
    });

    it('should return 404 for non-existent source warehouse', async () => {
      const nonExistentWarehouseId = new mongoose.Types.ObjectId();
      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: nonExistentWarehouseId.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 50,
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(404);

      expect(res.body.status).to.equal('error');
      expect(res.body.message).to.include('not found');
    });

    it('should return 404 when item not found in source warehouse', async () => {
      // Create inventory only in warehouse2, not warehouse1
      await Inventory.deleteMany({});
      await Inventory.create({
        item: item._id,
        warehouse: warehouse2._id,
        quantity: 100,
        available: 100,
        allocated: 0
      });

      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 50,
      };

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(404);

      expect(res.body.status).to.equal('error');
      expect(res.body.message).to.include('not found in source warehouse');
    });

    it('should create destination inventory if it does not exist', async () => {
      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 30,
      };

      // Verify destination inventory doesn't exist
      let destInventory = await Inventory.findOne({
        item: item._id,
        warehouse: warehouse2._id
      });
      expect(destInventory).to.be.null;

      const res = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(res.body.status).to.equal('success');

      // Verify destination inventory was created
      destInventory = await Inventory.findOne({
        item: item._id,
        warehouse: warehouse2._id
      });
      expect(destInventory).to.exist;
      expect(destInventory.quantity).to.equal(30);
    });

    it('should return 401 without authentication', async () => {
      const transferData = {
        itemId: item._id.toString(),
        fromWarehouseId: warehouse1._id.toString(),
        toWarehouseId: warehouse2._id.toString(),
        quantity: 50,
      };

      await request(app)
        .post('/api/inventory/transfer')
        .send(transferData)
        .expect(401);
    });
  });
});

