const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const inventoryService = require('../../src/services/inventoryService');
const Item = require('../../src/models/Item');

/**
 * Unit Tests for Inventory Box/Unit Functionality
 * Tests for Requirement 12.4 - Task 45.4
 */
describe('Inventory Service - Box/Unit Functionality', () => {
  let mongoServer;
  let testItem;

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
    await Item.deleteMany({});

    // Create test item with packSize
    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      category: 'Electronics',
      unit: 'box',
      pricing: {
        costPrice: 100,
        salePrice: 150,
      },
      inventory: {
        currentStock: 100, // 100 units
        minimumStock: 10,
        maximumStock: 1000,
      },
      packSize: 12, // 12 units per box
    });
  });

  describe('adjustInventoryBoxUnit', () => {
    it('should increase inventory using box quantity', async () => {
      const result = await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        5, // 5 boxes
        0, // 0 units
        'increase',
        'Stock received'
      );

      expect(result.inventory.currentStock).toBe(160); // 100 + (5 * 12)
      expect(result.conversionDetails.boxQuantity).toBe(5);
      expect(result.conversionDetails.unitQuantity).toBe(0);
      expect(result.conversionDetails.packSize).toBe(12);
      expect(result.conversionDetails.totalUnits).toBe(60);
    });

    it('should increase inventory using unit quantity', async () => {
      const result = await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        0, // 0 boxes
        15, // 15 units
        'increase',
        'Stock received'
      );

      expect(result.inventory.currentStock).toBe(115); // 100 + 15
      expect(result.conversionDetails.totalUnits).toBe(15);
    });

    it('should increase inventory using both box and unit quantities', async () => {
      const result = await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        3, // 3 boxes
        5, // 5 units
        'increase',
        'Stock received'
      );

      expect(result.inventory.currentStock).toBe(141); // 100 + (3 * 12) + 5
      expect(result.conversionDetails.totalUnits).toBe(41);
    });

    it('should decrease inventory using box quantity', async () => {
      const result = await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        2, // 2 boxes
        0,
        'decrease',
        'Stock sold'
      );

      expect(result.inventory.currentStock).toBe(76); // 100 - (2 * 12)
    });

    it('should decrease inventory using both box and unit quantities', async () => {
      const result = await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        2, // 2 boxes
        5, // 5 units
        'decrease',
        'Stock sold'
      );

      expect(result.inventory.currentStock).toBe(71); // 100 - (2 * 12) - 5
    });

    it('should throw error if insufficient stock', async () => {
      await expect(
        inventoryService.adjustInventoryBoxUnit(
          testItem._id,
          10, // 10 boxes = 120 units, but only 100 available
          0,
          'decrease',
          'Stock sold'
        )
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw error for negative quantities', async () => {
      await expect(
        inventoryService.adjustInventoryBoxUnit(
          testItem._id,
          -5,
          0,
          'increase',
          'Test'
        )
      ).rejects.toThrow('Box and unit quantities cannot be negative');
    });

    it('should throw error if both quantities are zero', async () => {
      await expect(
        inventoryService.adjustInventoryBoxUnit(
          testItem._id,
          0,
          0,
          'increase',
          'Test'
        )
      ).rejects.toThrow('At least one of box quantity or unit quantity must be greater than 0');
    });

    it('should throw error if item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        inventoryService.adjustInventoryBoxUnit(
          fakeId,
          5,
          0,
          'increase',
          'Test'
        )
      ).rejects.toThrow('Item not found');
    });

    it('should use default packSize of 1 if not set', async () => {
      const itemWithoutPackSize = await Item.create({
        code: 'ITEM002',
        name: 'Test Item 2',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        inventory: {
          currentStock: 50,
        },
        // No packSize specified, should default to 1
      });

      const result = await inventoryService.adjustInventoryBoxUnit(
        itemWithoutPackSize._id,
        5, // 5 boxes
        0,
        'increase',
        'Stock received'
      );

      expect(result.inventory.currentStock).toBe(55); // 50 + (5 * 1)
      expect(result.conversionDetails.packSize).toBe(1);
    });
  });

  describe('getStockBoxUnit', () => {
    it('should return stock in box/unit format', async () => {
      const result = await inventoryService.getStockBoxUnit(testItem._id);

      expect(result.itemId.toString()).toBe(testItem._id.toString());
      expect(result.itemCode).toBe('ITEM001');
      expect(result.itemName).toBe('Test Item');
      expect(result.packSize).toBe(12);
      expect(result.currentStockUnits).toBe(100);
      expect(result.currentStockBoxes).toBe(8); // 100 / 12 = 8 boxes
      expect(result.currentStockRemainingUnits).toBe(4); // 100 % 12 = 4 units
      expect(result.displayString).toBe('8 Boxes + 4 Units');
    });

    it('should handle exact box quantities', async () => {
      testItem.inventory.currentStock = 120; // Exactly 10 boxes
      await testItem.save();

      const result = await inventoryService.getStockBoxUnit(testItem._id);

      expect(result.currentStockBoxes).toBe(10);
      expect(result.currentStockRemainingUnits).toBe(0);
      expect(result.displayString).toBe('10 Boxes');
    });

    it('should handle less than one box', async () => {
      testItem.inventory.currentStock = 8; // Less than 1 box
      await testItem.save();

      const result = await inventoryService.getStockBoxUnit(testItem._id);

      expect(result.currentStockBoxes).toBe(0);
      expect(result.currentStockRemainingUnits).toBe(8);
      expect(result.displayString).toBe('8 Units');
    });

    it('should handle zero stock', async () => {
      testItem.inventory.currentStock = 0;
      await testItem.save();

      const result = await inventoryService.getStockBoxUnit(testItem._id);

      expect(result.currentStockBoxes).toBe(0);
      expect(result.currentStockRemainingUnits).toBe(0);
      expect(result.displayString).toBe('0');
    });

    it('should include stock status', async () => {
      const result = await inventoryService.getStockBoxUnit(testItem._id);

      expect(result.stockStatus).toBeDefined();
      expect(['in_stock', 'low_stock', 'out_of_stock', 'overstock']).toContain(
        result.stockStatus
      );
    });

    it('should include minimum and maximum stock', async () => {
      const result = await inventoryService.getStockBoxUnit(testItem._id);

      expect(result.minimumStock).toBe(10);
      expect(result.maximumStock).toBe(1000);
    });

    it('should throw error if item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(inventoryService.getStockBoxUnit(fakeId)).rejects.toThrow('Item not found');
    });

    it('should use default packSize of 1 if not set', async () => {
      const itemWithoutPackSize = await Item.create({
        code: 'ITEM003',
        name: 'Test Item 3',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        inventory: {
          currentStock: 25,
        },
      });

      const result = await inventoryService.getStockBoxUnit(itemWithoutPackSize._id);

      expect(result.packSize).toBe(1);
      expect(result.currentStockBoxes).toBe(25);
      expect(result.currentStockRemainingUnits).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple box/unit transactions', async () => {
      // Initial stock: 100 units (8 boxes + 4 units)

      // Add 3 boxes + 5 units
      await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        3,
        5,
        'increase',
        'Purchase'
      );

      let stock = await inventoryService.getStockBoxUnit(testItem._id);
      expect(stock.currentStockUnits).toBe(141); // 100 + 36 + 5

      // Sell 2 boxes + 3 units
      await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        2,
        3,
        'decrease',
        'Sale'
      );

      stock = await inventoryService.getStockBoxUnit(testItem._id);
      expect(stock.currentStockUnits).toBe(114); // 141 - 24 - 3
      expect(stock.currentStockBoxes).toBe(9); // 114 / 12
      expect(stock.currentStockRemainingUnits).toBe(6); // 114 % 12
    });

    it('should maintain accuracy across conversions', async () => {
      // Add exactly 5 boxes
      await inventoryService.adjustInventoryBoxUnit(
        testItem._id,
        5,
        0,
        'increase',
        'Purchase'
      );

      const stock = await inventoryService.getStockBoxUnit(testItem._id);
      
      // Should be able to convert back accurately
      const totalUnits = stock.currentStockBoxes * stock.packSize + stock.currentStockRemainingUnits;
      expect(totalUnits).toBe(stock.currentStockUnits);
    });
  });
});
