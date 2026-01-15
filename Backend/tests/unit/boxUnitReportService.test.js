const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const boxUnitReportService = require('../../src/services/boxUnitReportService');
const Item = require('../../src/models/Item');

/**
 * Unit Tests for Box/Unit Report Service
 * Tests for Requirement 12.5 - Task 45.5
 */
describe('Box/Unit Report Service', () => {
  let mongoServer;
  let testItems;

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

    // Create test items
    testItems = await Item.create([
      {
        code: 'ITEM001',
        name: 'Test Item 1',
        category: 'Electronics',
        unit: 'box',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 125, minimumStock: 20, maximumStock: 500 },
        packSize: 12,
        isActive: true,
      },
      {
        code: 'ITEM002',
        name: 'Test Item 2',
        category: 'Electronics',
        unit: 'box',
        pricing: { costPrice: 200, salePrice: 300 },
        inventory: { currentStock: 15, minimumStock: 20, maximumStock: 200 },
        packSize: 10,
        isActive: true,
      },
      {
        code: 'ITEM003',
        name: 'Test Item 3',
        category: 'Furniture',
        unit: 'piece',
        pricing: { costPrice: 500, salePrice: 750 },
        inventory: { currentStock: 50, minimumStock: 10, maximumStock: 100 },
        packSize: 1,
        isActive: true,
      },
    ]);
  });

  describe('getBoxUnitStockReport', () => {
    it('should generate stock report for all items', async () => {
      const report = await boxUnitReportService.getBoxUnitStockReport();

      expect(report.reportType).toBe('box_unit_stock');
      expect(report.items).toHaveLength(3);
      expect(report.summary.totalItems).toBe(3);
    });

    it('should show correct box/unit breakdown', async () => {
      const report = await boxUnitReportService.getBoxUnitStockReport();

      const item1 = report.items.find((i) => i.code === 'ITEM001');
      expect(item1.currentStock.units).toBe(125);
      expect(item1.currentStock.boxes).toBe(10); // 125 / 12 = 10 boxes
      expect(item1.currentStock.remainingUnits).toBe(5); // 125 % 12 = 5 units
      expect(item1.currentStock.display).toBe('10 Boxes + 5 Units');
    });

    it('should identify low stock items', async () => {
      const report = await boxUnitReportService.getBoxUnitStockReport();

      const item2 = report.items.find((i) => i.code === 'ITEM002');
      expect(item2.isLowStock).toBe(true); // 15 <= 20
      expect(report.summary.lowStockItems).toBe(1);
    });

    it('should filter by category', async () => {
      const report = await boxUnitReportService.getBoxUnitStockReport({
        category: 'Electronics',
      });

      expect(report.items).toHaveLength(2);
      expect(report.items.every((i) => i.category === 'Electronics')).toBe(true);
    });

    it('should filter by low stock', async () => {
      const report = await boxUnitReportService.getBoxUnitStockReport({
        lowStock: true,
      });

      expect(report.items).toHaveLength(1);
      expect(report.items[0].code).toBe('ITEM002');
      expect(report.items[0].isLowStock).toBe(true);
    });

    it('should exclude inactive items by default', async () => {
      // Make one item inactive
      await Item.findOneAndUpdate({ code: 'ITEM003' }, { isActive: false });

      const report = await boxUnitReportService.getBoxUnitStockReport();

      expect(report.items).toHaveLength(2);
      expect(report.items.every((i) => i.isActive)).toBe(true);
    });

    it('should include inactive items when requested', async () => {
      await Item.findOneAndUpdate({ code: 'ITEM003' }, { isActive: false });

      const report = await boxUnitReportService.getBoxUnitStockReport({
        includeInactive: true,
      });

      expect(report.items).toHaveLength(3);
    });
  });

  describe('getItemBoxUnitStock', () => {
    it('should get detailed stock for specific item', async () => {
      const result = await boxUnitReportService.getItemBoxUnitStock(testItems[0]._id);

      expect(result.code).toBe('ITEM001');
      expect(result.packSize).toBe(12);
      expect(result.currentStock.units).toBe(125);
      expect(result.currentStock.boxes).toBe(10);
      expect(result.currentStock.remainingUnits).toBe(5);
    });

    it('should show minimum stock in box/unit format', async () => {
      const result = await boxUnitReportService.getItemBoxUnitStock(testItems[0]._id);

      expect(result.minimumStock.units).toBe(20);
      expect(result.minimumStock.boxes).toBe(1); // 20 / 12 = 1 box
      expect(result.minimumStock.remainingUnits).toBe(8); // 20 % 12 = 8 units
    });

    it('should show maximum stock in box/unit format', async () => {
      const result = await boxUnitReportService.getItemBoxUnitStock(testItems[0]._id);

      expect(result.maximumStock.units).toBe(500);
      expect(result.maximumStock.boxes).toBe(41); // 500 / 12 = 41 boxes
      expect(result.maximumStock.remainingUnits).toBe(8); // 500 % 12 = 8 units
    });

    it('should determine stock status correctly', async () => {
      const result1 = await boxUnitReportService.getItemBoxUnitStock(testItems[0]._id);
      expect(result1.stockStatus).toBe('in_stock');

      const result2 = await boxUnitReportService.getItemBoxUnitStock(testItems[1]._id);
      expect(result2.stockStatus).toBe('low_stock');
    });

    it('should throw error if item not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(boxUnitReportService.getItemBoxUnitStock(fakeId)).rejects.toThrow(
        'Item not found'
      );
    });
  });

  describe('getBoxUnitStockComparison', () => {
    it('should compare stock across multiple items', async () => {
      const itemIds = [testItems[0]._id, testItems[1]._id];

      const report = await boxUnitReportService.getBoxUnitStockComparison(itemIds);

      expect(report.reportType).toBe('box_unit_comparison');
      expect(report.itemCount).toBe(2);
      expect(report.items).toHaveLength(2);
    });

    it('should show box/unit breakdown for each item', async () => {
      const itemIds = [testItems[0]._id, testItems[1]._id];

      const report = await boxUnitReportService.getBoxUnitStockComparison(itemIds);

      const item1 = report.items.find((i) => i.code === 'ITEM001');
      expect(item1.currentStockUnits).toBe(125);
      expect(item1.currentStockBoxes).toBe(10);
      expect(item1.remainingUnits).toBe(5);

      const item2 = report.items.find((i) => i.code === 'ITEM002');
      expect(item2.currentStockUnits).toBe(15);
      expect(item2.currentStockBoxes).toBe(1);
      expect(item2.remainingUnits).toBe(5);
    });

    it('should throw error if no item IDs provided', async () => {
      await expect(boxUnitReportService.getBoxUnitStockComparison([])).rejects.toThrow(
        'At least one item ID is required'
      );
    });

    it('should handle items with different pack sizes', async () => {
      const itemIds = testItems.map((i) => i._id);

      const report = await boxUnitReportService.getBoxUnitStockComparison(itemIds);

      expect(report.items[0].packSize).toBe(12);
      expect(report.items[1].packSize).toBe(10);
      expect(report.items[2].packSize).toBe(1);
    });
  });

  describe('getStockStatus', () => {
    it('should return out_of_stock for zero stock', () => {
      const status = boxUnitReportService.getStockStatus(0, 10, 100);
      expect(status).toBe('out_of_stock');
    });

    it('should return low_stock when at or below minimum', () => {
      const status1 = boxUnitReportService.getStockStatus(10, 10, 100);
      expect(status1).toBe('low_stock');

      const status2 = boxUnitReportService.getStockStatus(5, 10, 100);
      expect(status2).toBe('low_stock');
    });

    it('should return overstock when at or above maximum', () => {
      const status1 = boxUnitReportService.getStockStatus(100, 10, 100);
      expect(status1).toBe('overstock');

      const status2 = boxUnitReportService.getStockStatus(150, 10, 100);
      expect(status2).toBe('overstock');
    });

    it('should return in_stock for normal levels', () => {
      const status = boxUnitReportService.getStockStatus(50, 10, 100);
      expect(status).toBe('in_stock');
    });
  });
});
