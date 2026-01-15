const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../../src/models/Item');

describe('Item Model', () => {
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

  describe('Schema Validation', () => {
    it('should create a valid item', async () => {
      const itemData = {
        code: 'ITEM001',
        name: 'Test Item',
        description: 'A test item',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 100,
          salePrice: 150,
          currency: 'PKR'
        },
        tax: {
          gstRate: 17,
          whtRate: 1,
          taxCategory: 'standard'
        },
        inventory: {
          currentStock: 50,
          minimumStock: 10,
          maximumStock: 100
        }
      };

      const item = new Item(itemData);
      const savedItem = await item.save();

      expect(savedItem.code).toBe(itemData.code);
      expect(savedItem.name).toBe(itemData.name);
      expect(savedItem.category).toBe(itemData.category);
      expect(savedItem.isActive).toBe(true);
    });

    it('should require name', async () => {
      const itemData = {
        code: 'ITEM001',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 }
      };

      const item = new Item(itemData);
      await expect(item.save()).rejects.toThrow('Item name is required');
    });

    it('should validate unit enum', async () => {
      const itemData = {
        name: 'Test Item',
        category: 'Electronics',
        unit: 'invalid_unit',
        pricing: { costPrice: 100, salePrice: 150 }
      };

      const item = new Item(itemData);
      await expect(item.save()).rejects.toThrow();
    });

    it('should enforce unique code', async () => {
      const itemData = {
        code: 'ITEM001',
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 }
      };

      await new Item(itemData).save();

      const duplicateItem = new Item({
        ...itemData,
        name: 'Another Item'
      });

      await expect(duplicateItem.save()).rejects.toThrow();
    });

    it('should auto-generate code if not provided', async () => {
      const itemData = {
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 }
      };

      const item = new Item(itemData);
      await item.save();

      expect(item.code).toMatch(/^ITEM\d{6}$/);
    });
  });

  describe('Virtuals', () => {
    it('should calculate profit margin', async () => {
      const item = new Item({
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 }
      });

      expect(item.profitMargin).toBe(50); // (150-100)/100 * 100 = 50%
    });

    it('should handle zero cost price in profit margin', async () => {
      const item = new Item({
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 0, salePrice: 150 }
      });

      expect(item.profitMargin).toBe(0);
    });

    it('should determine stock status', async () => {
      const outOfStock = new Item({
        name: 'Out of Stock Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 0, minimumStock: 10 }
      });
      expect(outOfStock.stockStatus).toBe('out_of_stock');

      const lowStock = new Item({
        name: 'Low Stock Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 5, minimumStock: 10 }
      });
      expect(lowStock.stockStatus).toBe('low_stock');

      const inStock = new Item({
        name: 'In Stock Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 50, minimumStock: 10, maximumStock: 100 }
      });
      expect(inStock.stockStatus).toBe('in_stock');

      const overStock = new Item({
        name: 'Overstock Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 150, minimumStock: 10, maximumStock: 100 }
      });
      expect(overStock.stockStatus).toBe('overstock');
    });
  });

  describe('Instance Methods', () => {
    let item;

    beforeEach(async () => {
      item = new Item({
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        tax: { gstRate: 17, whtRate: 1 },
        inventory: { currentStock: 50, minimumStock: 10 }
      });
      await item.save();
    });

    it('should check stock availability', () => {
      expect(item.checkStockAvailability(30)).toBe(true);
      expect(item.checkStockAvailability(60)).toBe(false);
    });

    it('should calculate tax amount', () => {
      const taxAmount = item.calculateTaxAmount(1000);
      expect(taxAmount.gst).toBe(170); // 17% of 1000
      expect(taxAmount.wht).toBe(10);  // 1% of 1000
      expect(taxAmount.total).toBe(180);
    });

    it('should update stock - add', async () => {
      await item.updateStock(20, 'add');
      expect(item.inventory.currentStock).toBe(70);
    });

    it('should update stock - subtract', async () => {
      await item.updateStock(20, 'subtract');
      expect(item.inventory.currentStock).toBe(30);
    });

    it('should not allow negative stock when subtracting', async () => {
      await item.updateStock(60, 'subtract');
      expect(item.inventory.currentStock).toBe(0);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Item.create([
        {
          name: 'Low Stock Item',
          category: 'Electronics',
          unit: 'piece',
          pricing: { costPrice: 100, salePrice: 150 },
          inventory: { currentStock: 5, minimumStock: 10 },
          isActive: true
        },
        {
          name: 'Normal Stock Item',
          category: 'Electronics',
          unit: 'piece',
          pricing: { costPrice: 100, salePrice: 150 },
          inventory: { currentStock: 50, minimumStock: 10 },
          isActive: true
        },
        {
          name: 'Furniture Item',
          category: 'Furniture',
          unit: 'piece',
          pricing: { costPrice: 500, salePrice: 750 },
          inventory: { currentStock: 20, minimumStock: 5 },
          isActive: true
        },
        {
          name: 'Expensive Item',
          category: 'Electronics',
          unit: 'piece',
          pricing: { costPrice: 1000, salePrice: 1500 },
          inventory: { currentStock: 10, minimumStock: 2 },
          isActive: true
        }
      ]);
    });

    it('should find low stock items', async () => {
      const lowStockItems = await Item.findLowStockItems();
      expect(lowStockItems).toHaveLength(1);
      expect(lowStockItems[0].name).toBe('Low Stock Item');
    });

    it('should find by category', async () => {
      const electronicsItems = await Item.findByCategory('Electronics');
      expect(electronicsItems).toHaveLength(3);

      const furnitureItems = await Item.findByCategory('Furniture');
      expect(furnitureItems).toHaveLength(1);
    });

    it('should find by price range', async () => {
      const midRangeItems = await Item.findByPriceRange(100, 800);
      expect(midRangeItems).toHaveLength(3); // Excludes the expensive item
    });
  });

  describe('Validation Rules', () => {
    it('should validate minimum stock not greater than maximum stock', async () => {
      const itemData = {
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { minimumStock: 50, maximumStock: 30 }
      };

      const item = new Item(itemData);
      await expect(item.save()).rejects.toThrow('Minimum stock cannot be greater than maximum stock');
    });

    it('should validate negative prices', async () => {
      const itemData = {
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: -100, salePrice: 150 }
      };

      const item = new Item(itemData);
      await expect(item.save()).rejects.toThrow('Cost price cannot be negative');
    });

    it('should validate tax rates range', async () => {
      const itemData = {
        name: 'Test Item',
        category: 'Electronics',
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        tax: { gstRate: 150 }
      };

      const item = new Item(itemData);
      await expect(item.save()).rejects.toThrow('GST rate cannot exceed 100%');
    });
  });
});