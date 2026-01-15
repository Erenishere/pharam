const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const itemService = require('../../src/services/itemService');
const Item = require('../../src/models/Item');
const Batch = require('../../src/models/Batch');
const Warehouse = require('../../src/models/Warehouse');

/**
 * Unit Tests for Barcode Lookup Service
 * Tests for Requirement 13.1, 13.2 - Task 46.2
 */
describe('Barcode Lookup Service', () => {
  let mongoServer;
  let testItem;
  let testWarehouse;

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

  describe('findItemByBarcode', () => {
    it('should find item by barcode', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      expect(result).toBeDefined();
      expect(result.code).toBe('ITEM001');
      expect(result.name).toBe('Test Item');
    });

    it('should return item details with stock information', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      expect(result.currentStock).toBeDefined();
      expect(result.pricing).toBeDefined();
      expect(result.pricing.salePrice).toBe(150);
    });

    it('should return batch information', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      expect(result.batches).toBeDefined();
      expect(result.batches).toHaveLength(2);
    });

    it('should include batch details', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      const batch = result.batches[0];
      expect(batch.batchNumber).toBeDefined();
      expect(batch.availableQuantity).toBeDefined();
      expect(batch.expiryDate).toBeDefined();
      expect(batch.warehouseName).toBeDefined();
    });

    it('should sort batches by expiry date (FIFO)', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      const batch1Date = new Date(result.batches[0].expiryDate);
      const batch2Date = new Date(result.batches[1].expiryDate);
      expect(batch2Date.getTime()).toBeGreaterThanOrEqual(batch1Date.getTime());
    });

    it('should throw error if barcode not provided', async () => {
      await expect(itemService.findItemByBarcode('')).rejects.toThrow('Barcode is required');
    });

    it('should throw error if item not found', async () => {
      await expect(itemService.findItemByBarcode('9999999999999')).rejects.toThrow(
        'Item not found with the provided barcode'
      );
    });

    it('should throw error if item is inactive', async () => {
      testItem.isActive = false;
      await testItem.save();

      await expect(itemService.findItemByBarcode('1234567890123')).rejects.toThrow(
        'Item is not active'
      );
    });

    it('should filter batches by warehouse when warehouseId provided', async () => {
      // Create another warehouse
      const warehouse2 = await Warehouse.create({
        name: 'Secondary Warehouse',
        code: 'WH002',
        location: 'Test Location 2',
        isActive: true,
      });

      // Create batch in second warehouse
      await Batch.create({
        batchNumber: 'BATCH003',
        item: testItem._id,
        warehouse: warehouse2._id,
        quantity: 25,
        remainingQuantity: 25,
        unitCost: 100,
        manufacturingDate: new Date('2024-03-01'),
        expiryDate: new Date('2025-10-31'),
        status: 'active',
      });

      const result = await itemService.findItemByBarcode('1234567890123', {
        warehouseId: testWarehouse._id,
      });

      expect(result.batches).toHaveLength(2);
      expect(result.batches.every((b) => b.warehouseId.toString() === testWarehouse._id.toString())).toBe(true);
    });

    it('should only return active batches with stock', async () => {
      // Create expired batch
      await Batch.create({
        batchNumber: 'BATCH_EXPIRED',
        item: testItem._id,
        warehouse: testWarehouse._id,
        quantity: 20,
        remainingQuantity: 20,
        unitCost: 100,
        manufacturingDate: new Date('2023-01-01'),
        expiryDate: new Date('2023-12-31'), // Expired
        status: 'active',
      });

      // Create batch with no stock
      await Batch.create({
        batchNumber: 'BATCH_EMPTY',
        item: testItem._id,
        warehouse: testWarehouse._id,
        quantity: 30,
        remainingQuantity: 0, // No stock
        unitCost: 100,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        status: 'active',
      });

      const result = await itemService.findItemByBarcode('1234567890123');

      // Should only return the 2 valid batches
      expect(result.batches).toHaveLength(2);
      expect(result.batches.every((b) => b.availableQuantity > 0)).toBe(true);
    });

    it('should include pack size information', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      expect(result.packSize).toBe(12);
    });

    it('should handle items without batches', async () => {
      // Create item without batches
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

      const result = await itemService.findItemByBarcode('9876543210987');

      expect(result.code).toBe('ITEM002');
      expect(result.batches).toHaveLength(0);
    });

    it('should handle barcodes with leading/trailing spaces', async () => {
      const result = await itemService.findItemByBarcode('  1234567890123  ');

      expect(result).toBeDefined();
      expect(result.code).toBe('ITEM001');
    });
  });

  describe('Barcode lookup with stock information', () => {
    it('should return current stock levels', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      expect(result.currentStock).toBe(100);
    });

    it('should indicate low stock status', async () => {
      testItem.inventory.currentStock = 5; // Below minimum of 10
      await testItem.save();

      const result = await itemService.findItemByBarcode('1234567890123');

      expect(result.currentStock).toBe(5);
      expect(result.stockStatus).toBe('low_stock');
    });

    it('should show available quantity across all batches', async () => {
      const result = await itemService.findItemByBarcode('1234567890123');

      const totalBatchQty = result.batches.reduce((sum, b) => sum + b.availableQuantity, 0);
      expect(totalBatchQty).toBe(80); // 50 + 30
    });
  });

  describe('Barcode lookup performance', () => {
    it('should handle multiple items with different barcodes', async () => {
      // Create multiple items
      await Item.create([
        {
          code: 'ITEM003',
          name: 'Item 3',
          category: 'Electronics',
          unit: 'piece',
          pricing: { costPrice: 100, salePrice: 150 },
          barcode: '1111111111111',
          isActive: true,
        },
        {
          code: 'ITEM004',
          name: 'Item 4',
          category: 'Electronics',
          unit: 'piece',
          pricing: { costPrice: 100, salePrice: 150 },
          barcode: '2222222222222',
          isActive: true,
        },
      ]);

      const result1 = await itemService.findItemByBarcode('1111111111111');
      const result2 = await itemService.findItemByBarcode('2222222222222');

      expect(result1.code).toBe('ITEM003');
      expect(result2.code).toBe('ITEM004');
    });
  });
});
