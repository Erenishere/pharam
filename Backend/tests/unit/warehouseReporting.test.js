const mongoose = require('mongoose');
const ReportService = require('../../src/services/reportService');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');
const StockMovement = require('../../src/models/StockMovement');

describe('Warehouse Dimension Reporting - Task 49', () => {
  let warehouseId1, warehouseId2, itemId1, itemId2, createdBy;

  beforeEach(async () => {
    // Clean up
    await Warehouse.deleteMany({});
    await Item.deleteMany({});
    await StockMovement.deleteMany({});

    createdBy = new mongoose.Types.ObjectId();

    // Create warehouses
    const warehouse1 = await Warehouse.create({
      code: 'WH001',
      name: 'Main Warehouse',
      location: {
        address: '123 Main St',
        city: 'Karachi',
        country: 'Pakistan'
      },
      isActive: true
    });
    warehouseId1 = warehouse1._id;

    const warehouse2 = await Warehouse.create({
      code: 'WH002',
      name: 'Secondary Warehouse',
      location: {
        address: '456 Second St',
        city: 'Lahore',
        country: 'Pakistan'
      },
      isActive: true
    });
    warehouseId2 = warehouse2._id;

    // Create items
    const item1 = await Item.create({
      code: 'ITEM-001',
      name: 'Test Item 1',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 40,
        salePrice: 50,
        sellingPrice: 50,
        mrp: 60
      },
      stock: {
        currentStock: 1000,
        minStock: 10,
        maxStock: 5000
      },
      createdBy
    });
    itemId1 = item1._id;

    const item2 = await Item.create({
      code: 'ITEM-002',
      name: 'Test Item 2',
      category: 'Test Category',
      unit: 'piece',
      pricing: {
        costPrice: 80,
        salePrice: 100,
        sellingPrice: 100,
        mrp: 120
      },
      stock: {
        currentStock: 500,
        minStock: 20,
        maxStock: 2000
      },
      createdBy
    });
    itemId2 = item2._id;
  });

  afterEach(async () => {
    await Warehouse.deleteMany({});
    await Item.deleteMany({});
    await StockMovement.deleteMany({});
  });

  describe('Task 49.1: Warehouse Stock Report', () => {
    test('should generate warehouse stock report for all warehouses', async () => {
      // Add stock movements using opening_balance (doesn't require referenceId)
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId2,
          movementType: 'in',
          quantity: 50,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-16'),
          createdBy
        },
        {
          warehouse: warehouseId2,
          itemId: itemId1,
          movementType: 'in',
          quantity: 75,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-17'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseStockReport();

      expect(report.reportType).toBe('warehouse_stock');
      expect(report.summary.totalWarehouses).toBe(2);
      expect(report.warehouses).toHaveLength(2);
      
      // Check warehouse 1
      const wh1 = report.warehouses.find(w => w.warehouse.code === 'WH001');
      expect(wh1).toBeDefined();
      expect(wh1.itemCount).toBe(2);
      expect(wh1.totalQuantity).toBe(150); // 100 + 50

      // Check warehouse 2
      const wh2 = report.warehouses.find(w => w.warehouse.code === 'WH002');
      expect(wh2).toBeDefined();
      expect(wh2.itemCount).toBe(1);
      expect(wh2.totalQuantity).toBe(75);
    });

    test('should filter stock report by specific warehouse', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId2,
          itemId: itemId1,
          movementType: 'in',
          quantity: 75,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-17'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseStockReport(warehouseId1);

      expect(report.warehouses).toHaveLength(1);
      expect(report.warehouses[0].warehouse.code).toBe('WH001');
      expect(report.warehouses[0].totalQuantity).toBe(100);
    });

    test('should identify low stock items', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 5, // Below minStock of 10
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId2,
          movementType: 'in',
          quantity: 50, // Above minStock of 20
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-16'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseStockReport();

      const wh1 = report.warehouses.find(w => w.warehouse.code === 'WH001');
      expect(wh1.lowStockCount).toBe(1);
      
      const lowStockItem = wh1.items.find(i => i.isLowStock);
      expect(lowStockItem).toBeDefined();
      expect(lowStockItem.item.code).toBe('ITEM-001');
    });

    test('should filter for low stock items only', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 5, // Low stock
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId2,
          movementType: 'in',
          quantity: 50, // Normal stock
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-16'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseStockReport(null, { lowStockOnly: true });

      const wh1 = report.warehouses.find(w => w.warehouse.code === 'WH001');
      expect(wh1.itemCount).toBe(1);
      expect(wh1.items[0].item.code).toBe('ITEM-001');
    });

    test('should calculate net stock after in and out movements', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'out',
          quantity: 30,
          referenceType: 'adjustment',
          movementDate: new Date('2024-01-16'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseStockReport(warehouseId1);

      const wh1 = report.warehouses[0];
      const item = wh1.items.find(i => i.item.code === 'ITEM-001');
      expect(item.quantity).toBe(70); // 100 - 30
    });

    test('should throw error if warehouse not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(
        ReportService.getWarehouseStockReport(nonExistentId)
      ).rejects.toThrow('Warehouse not found');
    });

    test('should handle warehouse with no stock', async () => {
      const report = await ReportService.getWarehouseStockReport(warehouseId1);

      expect(report.warehouses).toHaveLength(1);
      expect(report.warehouses[0].itemCount).toBe(0);
      expect(report.warehouses[0].totalQuantity).toBe(0);
    });
  });

  describe('Task 49.2: Warehouse Movement Report', () => {
    test('should generate warehouse movement report', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'out',
          quantity: 30,
          referenceType: 'adjustment',
          movementDate: new Date('2024-01-16'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId2,
          movementType: 'in',
          quantity: 50,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-17'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.reportType).toBe('warehouse_movement');
      expect(report.warehouse.code).toBe('WH001');
      expect(report.summary.totalMovements).toBe(3);
      expect(report.summary.totalIn).toBe(150); // 100 + 50
      expect(report.summary.totalOut).toBe(30);
      expect(report.summary.netChange).toBe(120); // 150 - 30
    });

    test('should filter movements by item', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId2,
          movementType: 'in',
          quantity: 50,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-16'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { itemId: itemId1 }
      );

      expect(report.summary.totalMovements).toBe(1);
      expect(report.movements[0].item.code).toBe('ITEM-001');
    });

    test('should filter movements by type', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'out',
          quantity: 30,
          referenceType: 'adjustment',
          movementDate: new Date('2024-01-16'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { movementType: 'in' }
      );

      expect(report.summary.totalMovements).toBe(1);
      expect(report.movements[0].movementType).toBe('in');
    });

    test('should group movements by item', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'out',
          quantity: 30,
          referenceType: 'adjustment',
          movementDate: new Date('2024-01-16'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId2,
          movementType: 'in',
          quantity: 50,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-17'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.movementsByItem).toHaveLength(2);
      
      const item1Movements = report.movementsByItem.find(i => i.item.code === 'ITEM-001');
      expect(item1Movements.movementCount).toBe(2);
      expect(item1Movements.totalIn).toBe(100);
      expect(item1Movements.totalOut).toBe(30);
      expect(item1Movements.netChange).toBe(70);
    });

    test('should include transfer movements', async () => {
      // Create transfer out from warehouse 1
      await StockMovement.create({
        warehouse: warehouseId1,
        itemId: itemId1,
        movementType: 'out',
        quantity: 50,
        referenceType: 'warehouse_transfer',
        transferInfo: {
          fromWarehouse: warehouseId1,
          toWarehouse: warehouseId2,
          transferId: new mongoose.Types.ObjectId()
        },
        movementDate: new Date('2024-01-15'),
        createdBy
      });

      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.summary.totalMovements).toBe(1);
      expect(report.summary.transfersOut).toBe(50);
      expect(report.movements[0].transferInfo).toBeDefined();
      expect(report.movements[0].transferInfo.toWarehouse.code).toBe('WH002');
    });

    test('should throw error if warehouse ID not provided', async () => {
      await expect(
        ReportService.getWarehouseMovementReport(
          null,
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )
      ).rejects.toThrow('Warehouse ID is required');
    });

    test('should throw error if dates not provided', async () => {
      await expect(
        ReportService.getWarehouseMovementReport(warehouseId1, null, null)
      ).rejects.toThrow('Start date and end date are required');
    });

    test('should throw error if warehouse not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(
        ReportService.getWarehouseMovementReport(
          nonExistentId,
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )
      ).rejects.toThrow('Warehouse not found');
    });

    test('should handle date range with no movements', async () => {
      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.summary.totalMovements).toBe(0);
      expect(report.movements).toHaveLength(0);
      expect(report.movementsByItem).toHaveLength(0);
    });

    test('should sort movements by date descending', async () => {
      await StockMovement.create([
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-15'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 50,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-20'),
          createdBy
        },
        {
          warehouse: warehouseId1,
          itemId: itemId1,
          movementType: 'in',
          quantity: 25,
          referenceType: 'opening_balance',
          movementDate: new Date('2024-01-10'),
          createdBy
        }
      ]);

      const report = await ReportService.getWarehouseMovementReport(
        warehouseId1,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.movements[0].movementDate).toEqual(new Date('2024-01-20'));
      expect(report.movements[1].movementDate).toEqual(new Date('2024-01-15'));
      expect(report.movements[2].movementDate).toEqual(new Date('2024-01-10'));
    });
  });
});
