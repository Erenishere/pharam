const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const database = require('../../src/config/database');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');

describe('Database Integration Tests', () => {
  let mongoServer;
  let originalEnv;

  beforeAll(async () => {
    // Save original environment
    originalEnv = process.env.NODE_ENV;
    
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_TEST_URI = mongoUri;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    process.env.NODE_ENV = originalEnv;
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const connection = await database.connect();
      expect(connection).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });

    it('should handle connection errors gracefully', async () => {
      // Disconnect first
      await database.disconnect();
      
      // Set invalid URI
      process.env.MONGODB_TEST_URI = 'mongodb://invalid:27017/test';
      
      // Mock process.exit to prevent test from exiting
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await database.connect();
      
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Restore
      mockExit.mockRestore();
      process.env.MONGODB_TEST_URI = mongoServer.getUri();
      await database.connect();
    });

    it('should get connection instance', () => {
      const connection = database.getConnection();
      expect(connection).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      // Clear all collections before each test
      await User.deleteMany({});
      await Customer.deleteMany({});
      await Item.deleteMany({});
    });

    it('should perform CRUD operations on User model', async () => {
      // Create
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });
      expect(user._id).toBeDefined();
      expect(user.username).toBe('testuser');

      // Read
      const foundUser = await User.findById(user._id);
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe('test@example.com');

      // Update
      foundUser.username = 'updateduser';
      await foundUser.save();
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.username).toBe('updateduser');

      // Delete
      await User.findByIdAndDelete(user._id);
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should perform CRUD operations on Customer model', async () => {
      // Create
      const customer = await Customer.create({
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        contactInfo: {
          email: 'customer@example.com',
          city: 'Karachi'
        }
      });
      expect(customer._id).toBeDefined();

      // Read
      const foundCustomer = await Customer.findOne({ code: 'CUST001' });
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer.name).toBe('Test Customer');

      // Update
      foundCustomer.financialInfo.creditLimit = 100000;
      await foundCustomer.save();
      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.financialInfo.creditLimit).toBe(100000);

      // Delete
      await Customer.findByIdAndDelete(customer._id);
      const deletedCustomer = await Customer.findById(customer._id);
      expect(deletedCustomer).toBeNull();
    });

    it('should perform CRUD operations on Item model', async () => {
      // Create
      const item = await Item.create({
        code: 'ITEM001',
        name: 'Test Item',
        category: 'Test Category',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150
        }
      });
      expect(item._id).toBeDefined();

      // Read
      const foundItem = await Item.findOne({ code: 'ITEM001' });
      expect(foundItem).toBeDefined();
      expect(foundItem.name).toBe('Test Item');

      // Update
      foundItem.inventory.currentStock = 500;
      await foundItem.save();
      const updatedItem = await Item.findById(item._id);
      expect(updatedItem.inventory.currentStock).toBe(500);

      // Delete
      await Item.findByIdAndDelete(item._id);
      const deletedItem = await Item.findById(item._id);
      expect(deletedItem).toBeNull();
    });
  });

  describe('Database Transactions', () => {
    it('should support transactions', async () => {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await User.create([{
            username: 'transactionuser',
            email: 'transaction@example.com',
            password: 'password123',
            role: 'admin'
          }], { session });

          const user = await User.findOne({ username: 'transactionuser' }).session(session);
          expect(user).toBeDefined();
        });
      } finally {
        await session.endSession();
      }

      // Verify transaction was committed
      const user = await User.findOne({ username: 'transactionuser' });
      expect(user).toBeDefined();
    });

    it('should rollback failed transactions', async () => {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await User.create([{
            username: 'rollbackuser',
            email: 'rollback@example.com',
            password: 'password123',
            role: 'admin'
          }], { session });

          // Simulate error
          throw new Error('Transaction failed');
        });
      } catch (error) {
        expect(error.message).toBe('Transaction failed');
      } finally {
        await session.endSession();
      }

      // Verify transaction was rolled back
      const user = await User.findOne({ username: 'rollbackuser' });
      expect(user).toBeNull();
    });
  });

  describe('Database Indexes', () => {
    it('should have proper indexes on User model', async () => {
      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('username_1');
      expect(indexes).toHaveProperty('email_1');
    });

    it('should have proper indexes on Customer model', async () => {
      const indexes = await Customer.collection.getIndexes();
      expect(indexes).toHaveProperty('code_1');
    });

    it('should have proper indexes on Item model', async () => {
      const indexes = await Item.collection.getIndexes();
      expect(indexes).toHaveProperty('code_1');
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk inserts efficiently', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'password123',
        role: 'data_entry'
      }));

      const startTime = Date.now();
      await User.insertMany(users);
      const endTime = Date.now();

      const count = await User.countDocuments();
      expect(count).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        User.create({
          username: `concurrent${i}`,
          email: `concurrent${i}@example.com`,
          password: 'password123',
          role: 'data_entry'
        })
      );

      await Promise.all(operations);
      const count = await User.countDocuments();
      expect(count).toBe(10);
    });
  });

  describe('Database Disconnect', () => {
    it('should disconnect from database successfully', async () => {
      await database.disconnect();
      expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
      
      // Reconnect for other tests
      await database.connect();
    });
  });
});
