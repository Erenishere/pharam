const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const StockMovement = require('../../src/models/StockMovement');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('StockMovement Model', () => {
  let mongoServer;
  let item, user;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await StockMovement.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    // Create test data
    item = await Item.create({
      name: 'Test Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150 }
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid stock movement', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'purchase_invoice',
        referenceId: new mongoose.Types.ObjectId(),
        batchInfo: {
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          manufacturingDate: new Date()
        },
        movementDate: new Date(),
        notes: 'Initial stock',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      const savedMovement = await movement.save();

      expect(savedMovement.itemId.toString()).toBe(item._id.toString());
      expect(savedMovement.movementType).toBe('in');
      expect(savedMovement.quantity).toBe(50);
    });

    it('should require itemId', async () => {
      const movementData = {
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Item ID is required');
    });

    it('should validate movement type enum', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'invalid_type',
        quantity: 50,
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow();
    });

    it('should not allow zero quantity', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 0,
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Quantity cannot be zero');
    });

    it('should require referenceId for invoice movements', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'sales_invoice',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    it('should calculate absolute quantity', () => {
      const movement = new StockMovement({
        itemId: item._id,
        movementType: 'out',
        quantity: -25,
        referenceType: 'adjustment',
        createdBy: user._id
      });

      expect(movement.absoluteQuantity).toBe(25);
    });

    it('should determine movement direction', () => {
      const inMovement = new StockMovement({
        itemId: item._id,
        movementType: 'in',
        quantity: 25,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(inMovement.direction).toBe('inward');

      const outMovement = new StockMovement({
        itemId: item._id,
        movementType: 'out',
        quantity: -25,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(outMovement.direction).toBe('outward');

      const adjustmentIn = new StockMovement({
        itemId: item._id,
        movementType: 'adjustment',
        quantity: 10,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(adjustmentIn.direction).toBe('inward');

      const adjustmentOut = new StockMovement({
        itemId: item._id,
        movementType: 'adjustment',
        quantity: -10,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(adjustmentOut.direction).toBe('outward');
    });
  });

  describe('Instance Methods', () => {
    let movement;

    beforeEach(() => {
      movement = new StockMovement({
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'purchase_invoice',
        batchInfo: {
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        createdBy: user._id
      });
    });

    it('should get movement description', () => {
      expect(movement.getMovementDescription()).toBe('Purchase from supplier');

      movement.referenceType = 'sales_invoice';
      expect(movement.getMovementDescription()).toBe('Sale to customer');

      movement.referenceType = 'adjustment';
      expect(movement.getMovementDescription()).toBe('Stock adjustment');
    });

    it('should check if batch is expired', () => {
      expect(movement.isBatchExpired()).toBe(false);

      // Set expiry date to yesterday
      movement.batchInfo.expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(movement.isBatchExpired()).toBe(true);

      // No expiry date
      movement.batchInfo.expiryDate = null;
      expect(movement.isBatchExpired()).toBe(false);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await StockMovement.create([
        {
          itemId: item._id,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: yesterday,
          createdBy: user._id
        },
        {
          itemId: item._id,
          movementType: 'out',
          quantity: -30,
          referenceType: 'sales_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          movementDate: new Date(),
          createdBy: user._id
        },
        {
          itemId: item._id,
          movementType: 'in',
          quantity: 20,
          referenceType: 'purchase_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          movementDate: new Date(),
          batchInfo: {
            batchNumber: 'EXPIRED001',
            expiryDate: yesterday
          },
          createdBy: user._id
        }
      ]);
    });

    it('should find movements by item', async () => {
      const movements = await StockMovement.findByItem(item._id);
      expect(movements).toHaveLength(3);
      expect(movements[0].movementDate).toBeInstanceOf(Date);
    });

    it('should find movements by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const movements = await StockMovement.findByDateRange(yesterday, tomorrow);
      expect(movements).toHaveLength(3);
    });

    it('should find movements by reference', async () => {
      const movements = await StockMovement.findByReference('opening_balance');
      expect(movements).toHaveLength(1);
    });

    it('should calculate stock balance', async () => {
      const balance = await StockMovement.calculateStockBalance(item._id);
      expect(balance).toBe(90); // 100 - 30 + 20
    });

    it('should find expired batches', async () => {
      const expiredBatches = await StockMovement.findExpiredBatches();
      expect(expiredBatches).toHaveLength(1);
      expect(expiredBatches[0].batchInfo.batchNumber).toBe('EXPIRED001');
    });

    it('should get movements summary', async () => {
      const summary = await StockMovement.getMovementsSummary(item._id, 30);
      expect(summary).toHaveLength(2); // 'in' and 'out' movements
      
      const inSummary = summary.find(s => s._id === 'in');
      expect(inSummary.totalQuantity).toBe(120); // 100 + 20
      expect(inSummary.count).toBe(2);

      const outSummary = summary.find(s => s._id === 'out');
      expect(outSummary.totalQuantity).toBe(-30);
      expect(outSummary.count).toBe(1);
    });
  });

  describe('Pre-save Validation', () => {
    it('should validate manufacturing date before expiry date', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        batchInfo: {
          manufacturingDate: new Date(),
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        },
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Manufacturing date cannot be after expiry date');
    });

    it('should validate movement date is not in future', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        movementDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Movement date cannot be in the future');
    });

    it('should adjust quantity sign based on movement type', async () => {
      const inMovement = new StockMovement({
        itemId: item._id,
        movementType: 'in',
        quantity: -50, // Negative quantity for 'in' movement
        referenceType: 'adjustment',
        createdBy: user._id
      });

      await inMovement.save();
      expect(inMovement.quantity).toBe(50); // Should be converted to positive

      const outMovement = new StockMovement({
        itemId: item._id,
        movementType: 'out',
        quantity: 30, // Positive quantity for 'out' movement
        referenceType: 'adjustment',
        createdBy: user._id
      });

      await outMovement.save();
      expect(outMovement.quantity).toBe(-30); // Should be converted to negative
    });
  });
});