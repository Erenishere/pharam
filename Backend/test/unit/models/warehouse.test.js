const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Warehouse = require('../../../src/models/Warehouse');
const { expect } = require('chai');

let mongoServer;

// Test data
const testWarehouse = {
  name: 'Main Warehouse',
  location: {
    address: '123 Main St',
    city: 'New York',
    country: 'USA',
    postalCode: '10001'
  },
  contact: {
    phone: '+1234567890',
    email: 'warehouse@example.com'
  },
  capacity: 1000,
  isActive: true
};

describe('Warehouse Model', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Warehouse.deleteMany({});
  });

  it('should save a warehouse with all required fields', async () => {
    const warehouse = new Warehouse(testWarehouse);
    const savedWarehouse = await warehouse.save();
    
    expect(savedWarehouse._id).to.exist;
    expect(savedWarehouse.code).to.exist;
    expect(savedWarehouse.name).to.equal(testWarehouse.name);
    expect(savedWarehouse.isActive).to.be.true;
  });

  it('should generate a unique code if not provided', async () => {
    const warehouse = new Warehouse(testWarehouse);
    await warehouse.save();
    
    expect(warehouse.code).to.match(/^WH\d{4}$/);
  });

  it('should not allow duplicate codes', async () => {
    const warehouse1 = new Warehouse(testWarehouse);
    await warehouse1.save();
    
    const warehouse2 = new Warehouse({
      ...testWarehouse,
      name: 'Second Warehouse'
    });
    
    try {
      await warehouse2.save();
      throw new Error('Should have failed with duplicate code');
    } catch (error) {
      expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
    }
  });

  it('should validate required fields', async () => {
    const warehouse = new Warehouse({});
    
    try {
      await warehouse.validate();
      throw new Error('Validation should have failed');
    } catch (error) {
      expect(error.errors['name']).to.exist;
      expect(error.errors['location.address']).to.exist;
      expect(error.errors['location.city']).to.exist;
      expect(error.errors['location.country']).to.exist;
    }
  });

  it('should validate email format', async () => {
    const warehouse = new Warehouse({
      ...testWarehouse,
      contact: { email: 'invalid-email' }
    });
    
    try {
      await warehouse.validate();
      throw new Error('Validation should have failed');
    } catch (error) {
      expect(error.errors['contact.email']).to.exist;
    }
  });

  it('should have timestamps', async () => {
    const warehouse = new Warehouse(testWarehouse);
    await warehouse.save();
    
    expect(warehouse.createdAt).to.exist;
    expect(warehouse.updatedAt).to.exist;
  });
});
