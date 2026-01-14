const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../../src/models/Item');

/**
 * Unit Tests for Item Model - Barcode and PackSize Fields
 * Tests for Requirements 13.1 (Task 46.1) and 12.4 (Task 45.1)
 */
describe('Item Model - Barcode and PackSize Fields', () => {
  let mongoServer;

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
  });

  describe('Barcode field (Task 46.1)', () => {
    it('should allow creating item with barcode', async () => {
      const item = await Item.create({
        code: 'ITEM001',
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '1234567890123',
      });

      expect(item.barcode).toBe('1234567890123');
    });

    it('should allow creating item without barcode', async () => {
      const item = await Item.create({
        code: 'ITEM002',
        name: 'Test Item 2',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
      });

      expect(item.barcode).toBeUndefined();
    });

    it('should enforce unique barcode', async () => {
      await Item.create({
        code: 'ITEM003',
        name: 'Test Item 3',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '1234567890123',
      });

      await expect(
        Item.create({
          code: 'ITEM004',
          name: 'Test Item 4',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
          },
          barcode: '1234567890123', // Duplicate barcode
        })
      ).rejects.toThrow();
    });

    it('should allow multiple items without barcode (sparse index)', async () => {
      const item1 = await Item.create({
        code: 'ITEM005',
        name: 'Test Item 5',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
      });

      const item2 = await Item.create({
        code: 'ITEM006',
        name: 'Test Item 6',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
      });

      expect(item1.barcode).toBeUndefined();
      expect(item2.barcode).toBeUndefined();
    });

    it('should trim barcode whitespace', async () => {
      const item = await Item.create({
        code: 'ITEM007',
        name: 'Test Item 7',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '  1234567890123  ',
      });

      expect(item.barcode).toBe('1234567890123');
    });

    it('should enforce barcode max length', async () => {
      const longBarcode = '1'.repeat(51);

      await expect(
        Item.create({
          code: 'ITEM008',
          name: 'Test Item 8',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
          },
          barcode: longBarcode,
        })
      ).rejects.toThrow(/cannot exceed 50 characters/);
    });

    it('should allow updating barcode', async () => {
      const item = await Item.create({
        code: 'ITEM009',
        name: 'Test Item 9',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '1111111111111',
      });

      item.barcode = '2222222222222';
      await item.save();

      const updated = await Item.findById(item._id);
      expect(updated.barcode).toBe('2222222222222');
    });

    it('should allow removing barcode', async () => {
      const item = await Item.create({
        code: 'ITEM010',
        name: 'Test Item 10',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '3333333333333',
      });

      item.barcode = undefined;
      await item.save();

      const updated = await Item.findById(item._id);
      expect(updated.barcode).toBeUndefined();
    });
  });

  describe('PackSize field (Task 45.1)', () => {
    it('should default packSize to 1', async () => {
      const item = await Item.create({
        code: 'ITEM011',
        name: 'Test Item 11',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
      });

      expect(item.packSize).toBe(1);
    });

    it('should allow setting custom packSize', async () => {
      const item = await Item.create({
        code: 'ITEM012',
        name: 'Test Item 12',
        category: 'Electronics',
        unit: 'box',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        packSize: 12,
      });

      expect(item.packSize).toBe(12);
    });

    it('should enforce packSize minimum of 1', async () => {
      await expect(
        Item.create({
          code: 'ITEM013',
          name: 'Test Item 13',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
          },
          packSize: 0,
        })
      ).rejects.toThrow(/must be at least 1/);
    });

    it('should reject negative packSize', async () => {
      await expect(
        Item.create({
          code: 'ITEM014',
          name: 'Test Item 14',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
          },
          packSize: -5,
        })
      ).rejects.toThrow(/must be at least 1/);
    });

    it('should enforce packSize to be integer', async () => {
      await expect(
        Item.create({
          code: 'ITEM015',
          name: 'Test Item 15',
          category: 'Electronics',
          unit: 'piece',
          pricing: {
            costPrice: 100,
            salePrice: 150,
          },
          packSize: 12.5,
        })
      ).rejects.toThrow(/must be a whole number/);
    });

    it('should allow updating packSize', async () => {
      const item = await Item.create({
        code: 'ITEM016',
        name: 'Test Item 16',
        category: 'Electronics',
        unit: 'box',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        packSize: 10,
      });

      item.packSize = 20;
      await item.save();

      const updated = await Item.findById(item._id);
      expect(updated.packSize).toBe(20);
    });

    it('should support large pack sizes', async () => {
      const item = await Item.create({
        code: 'ITEM017',
        name: 'Test Item 17',
        category: 'Electronics',
        unit: 'box',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        packSize: 1000,
      });

      expect(item.packSize).toBe(1000);
    });
  });

  describe('Combined barcode and packSize', () => {
    it('should allow item with both barcode and packSize', async () => {
      const item = await Item.create({
        code: 'ITEM018',
        name: 'Test Item 18',
        category: 'Electronics',
        unit: 'box',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '4444444444444',
        packSize: 24,
      });

      expect(item.barcode).toBe('4444444444444');
      expect(item.packSize).toBe(24);
    });

    it('should find item by barcode', async () => {
      await Item.create({
        code: 'ITEM019',
        name: 'Test Item 19',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
        barcode: '5555555555555',
        packSize: 6,
      });

      const found = await Item.findOne({ barcode: '5555555555555' });
      expect(found).toBeDefined();
      expect(found.code).toBe('ITEM019');
      expect(found.packSize).toBe(6);
    });
  });
});
