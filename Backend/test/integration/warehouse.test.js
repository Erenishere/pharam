const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Warehouse = require('../../src/models/Warehouse');
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
  location: {
    address: '123 Test St',
    city: 'Test City',
    country: 'Test Country'
  },
  contact: {
    phone: '1234567890',
    email: 'test@warehouse.com'
  },
  isActive: true
};

describe('Warehouse API', () => {
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
    await Warehouse.deleteMany({});
  });

  describe('POST /api/warehouses', () => {
    it('should create a new warehouse', async () => {
      const res = await request(app)
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWarehouse)
        .expect(201);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.warehouse).to.have.property('_id');
      expect(res.body.data.warehouse.name).to.equal(testWarehouse.name);
      expect(res.body.data.warehouse.code).to.match(/^WH\d{4}$/);
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }) // Invalid data
        .expect(400);

      expect(res.body.status).to.equal('error');
    });
  });

  describe('GET /api/warehouses', () => {
    beforeEach(async () => {
      // Create test warehouses
      await Warehouse.create([
        { ...testWarehouse, name: 'Warehouse 1' },
        { ...testWarehouse, name: 'Warehouse 2', isActive: false },
        { ...testWarehouse, name: 'Another Warehouse' }
      ]);
    });

    it('should get all warehouses', async () => {
      const res = await request(app)
        .get('/api/warehouses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.warehouses).to.have.lengthOf(3);
    });

    it('should filter warehouses by search term', async () => {
      const res = await request(app)
        .get('/api/warehouses?search=Another')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.warehouses).to.have.lengthOf(1);
      expect(res.body.data.warehouses[0].name).to.equal('Another Warehouse');
    });

    it('should filter warehouses by active status', async () => {
      const res = await request(app)
        .get('/api/warehouses?isActive=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.warehouses).to.have.lengthOf(1);
      expect(res.body.data.warehouses[0].name).to.equal('Warehouse 2');
    });
  });

  describe('GET /api/warehouses/:id', () => {
    let warehouse;

    beforeEach(async () => {
      warehouse = await Warehouse.create(testWarehouse);
    });

    it('should get a warehouse by ID', async () => {
      const res = await request(app)
        .get(`/api/warehouses/${warehouse._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.warehouse._id).to.equal(warehouse._id.toString());
    });

    it('should return 404 for non-existent warehouse', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/warehouses/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.status).to.equal('error');
      expect(res.body.message).to.equal('Warehouse not found');
    });
  });

  describe('PUT /api/warehouses/:id', () => {
    let warehouse;

    beforeEach(async () => {
      warehouse = await Warehouse.create(testWarehouse);
    });

    it('should update a warehouse using PUT', async () => {
      const updateData = { name: 'Updated Warehouse Name' };
      
      const res = await request(app)
        .put(`/api/warehouses/${warehouse._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.warehouse.name).to.equal(updateData.name);
    });

    it('should not allow updating the warehouse code via PUT', async () => {
      const updateData = { code: 'NEWCODE' };
      
      const res = await request(app)
        .put(`/api/warehouses/${warehouse._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // The code should remain unchanged
      expect(res.body.data.warehouse.code).to.equal(warehouse.code);
    });
  });

  describe('PATCH /api/warehouses/:id', () => {
    let warehouse;

    beforeEach(async () => {
      warehouse = await Warehouse.create(testWarehouse);
    });

    it('should update a warehouse', async () => {
      const updateData = { name: 'Updated Warehouse Name' };
      
      const res = await request(app)
        .patch(`/api/warehouses/${warehouse._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.warehouse.name).to.equal(updateData.name);
    });

    it('should not allow updating the warehouse code', async () => {
      const updateData = { code: 'NEWCODE' };
      
      const res = await request(app)
        .patch(`/api/warehouses/${warehouse._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // The code should remain unchanged
      expect(res.body.data.warehouse.code).to.equal(warehouse.code);
    });
  });

  describe('DELETE /api/warehouses/:id', () => {
    let warehouse;

    beforeEach(async () => {
      warehouse = await Warehouse.create(testWarehouse);
    });

    it('should delete a warehouse', async () => {
      await request(app)
        .delete(`/api/warehouses/${warehouse._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify the warehouse is deleted
      const deletedWarehouse = await Warehouse.findById(warehouse._id);
      expect(deletedWarehouse).to.be.null;
    });
  });

  describe('PATCH /api/warehouses/:id/toggle-status', () => {
    let warehouse;

    beforeEach(async () => {
      warehouse = await Warehouse.create(testWarehouse);
    });

    it('should toggle warehouse status', async () => {
      const originalStatus = warehouse.isActive;
      
      const res = await request(app)
        .patch(`/api/warehouses/${warehouse._id}/toggle-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.warehouse.isActive).to.equal(!originalStatus);
    });
  });

  describe('GET /api/warehouses/statistics', () => {
    it('should return warehouse statistics', async () => {
      // Mock the statistics data
      const mockStats = [
        { name: 'Warehouse 1', itemCount: 10, totalStock: 100, totalValue: 5000 },
        { name: 'Warehouse 2', itemCount: 5, totalStock: 50, totalValue: 2500 }
      ];
      
      // Mock the aggregate method
      Warehouse.aggregate = () => ({
        exec: () => Promise.resolve(mockStats)
      });

      const res = await request(app)
        .get('/api/warehouses/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.status).to.equal('success');
      expect(res.body.data.statistics).to.be.an('array');
      expect(res.body.data.statistics).to.have.lengthOf(2);
    });
  });
});
