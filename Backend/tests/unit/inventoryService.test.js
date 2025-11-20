const inventoryService = require('../../src/services/inventoryService');
const inventoryRepository = require('../../src/repositories/inventoryRepository');
const itemService = require('../../src/services/itemService');

// Mock the dependencies
jest.mock('../../src/repositories/inventoryRepository');
jest.mock('../../src/services/itemService');
jest.mock('../../src/models/Warehouse');
jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/Item');

describe('Inventory Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getItemStock', () => {
    it('should return total stock for an item', async () => {
      inventoryRepository.getTotalStock.mockResolvedValue(100);

      const result = await inventoryService.getItemStock('item123');

      expect(result).toBe(100);
      expect(inventoryRepository.getTotalStock).toHaveBeenCalledWith('item123');
    });
  });

  describe('getItemStockByLocation', () => {
    it('should return stock levels by location', async () => {
      const mockStockLevels = [
        { location: 'loc1', quantity: 50 },
        { location: 'loc2', quantity: 30 },
      ];
      inventoryRepository.getStockByLocation.mockResolvedValue(mockStockLevels);

      const result = await inventoryService.getItemStockByLocation('item123');

      expect(result).toEqual(mockStockLevels);
      expect(inventoryRepository.getStockByLocation).toHaveBeenCalledWith('item123');
    });
  });

  describe('addStock', () => {
    it('should add stock to inventory', async () => {
      const mockItem = { _id: 'item123', name: 'Test Item' };
      const mockInventory = { item: 'item123', location: 'loc1', quantity: 110 };

      itemService.getItemById.mockResolvedValue(mockItem);
      inventoryRepository.updateQuantity.mockResolvedValue(mockInventory);

      const result = await inventoryService.addStock('item123', 'loc1', 10);

      expect(result).toEqual(mockInventory);
      expect(itemService.getItemById).toHaveBeenCalledWith('item123');
      expect(inventoryRepository.updateQuantity).toHaveBeenCalledWith('item123', 'loc1', 10, undefined);
    });

    it('should throw error for zero or negative quantity', async () => {
      await expect(inventoryService.addStock('item123', 'loc1', 0)).rejects.toThrow('Quantity must be greater than zero');
      await expect(inventoryService.addStock('item123', 'loc1', -10)).rejects.toThrow('Quantity must be greater than zero');
    });
  });

  describe('removeStock', () => {
    it('should remove stock from inventory', async () => {
      const mockInventory = { item: 'item123', location: 'loc1', quantity: 90 };

      inventoryRepository.getTotalStock.mockResolvedValue(100);
      inventoryRepository.updateQuantity.mockResolvedValue(mockInventory);

      const result = await inventoryService.removeStock('item123', 'loc1', 10);

      expect(result).toEqual(mockInventory);
      expect(inventoryRepository.updateQuantity).toHaveBeenCalledWith('item123', 'loc1', -10, undefined);
    });

    it('should throw error when insufficient stock', async () => {
      inventoryRepository.getTotalStock.mockResolvedValue(5);

      await expect(inventoryService.removeStock('item123', 'loc1', 10)).rejects.toThrow('Insufficient stock available');
    });

    it('should throw error for zero or negative quantity', async () => {
      await expect(inventoryService.removeStock('item123', 'loc1', 0)).rejects.toThrow('Quantity must be greater than zero');
    });
  });

  describe('transferStock', () => {
    it('should transfer stock between locations', async () => {
      const mockResult = { success: true };

      inventoryRepository.getTotalStock.mockResolvedValue(100);
      inventoryRepository.transferInventory.mockResolvedValue(mockResult);

      const result = await inventoryService.transferStock('item123', 'loc1', 'loc2', 10);

      expect(result).toEqual(mockResult);
      expect(inventoryRepository.transferInventory).toHaveBeenCalledWith('item123', 'loc1', 'loc2', 10, undefined);
    });

    it('should throw error when source and destination are same', async () => {
      await expect(inventoryService.transferStock('item123', 'loc1', 'loc1', 10)).rejects.toThrow('Source and destination locations must be different');
    });

    it('should throw error when insufficient stock in source', async () => {
      inventoryRepository.getTotalStock.mockResolvedValue(5);

      await expect(inventoryService.transferStock('item123', 'loc1', 'loc2', 10)).rejects.toThrow('Insufficient stock available in source location');
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock to new quantity', async () => {
      const currentInventory = { item: 'item123', location: 'loc1', quantity: 50 };
      const updatedInventory = { item: 'item123', location: 'loc1', quantity: 75 };

      inventoryRepository.findByItemAndLocation.mockResolvedValue(currentInventory);
      inventoryRepository.updateQuantity.mockResolvedValue(updatedInventory);

      const result = await inventoryService.adjustStock('item123', 'loc1', 75);

      expect(result).toEqual(updatedInventory);
      expect(inventoryRepository.updateQuantity).toHaveBeenCalledWith('item123', 'loc1', 25, undefined);
    });

    it('should throw error for negative quantity', async () => {
      await expect(inventoryService.adjustStock('item123', 'loc1', -10)).rejects.toThrow('Quantity cannot be negative');
    });

    it('should return current inventory when no change', async () => {
      const currentInventory = { item: 'item123', location: 'loc1', quantity: 50 };

      inventoryRepository.findByItemAndLocation.mockResolvedValue(currentInventory);

      const result = await inventoryService.adjustStock('item123', 'loc1', 50);

      expect(result).toEqual(currentInventory);
      expect(inventoryRepository.updateQuantity).not.toHaveBeenCalled();
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items', async () => {
      const mockLowStockItems = [
        { item: 'item1', quantity: 5, minimumStock: 10 },
        { item: 'item2', quantity: 3, minimumStock: 10 },
      ];

      inventoryRepository.getLowStockItems.mockResolvedValue(mockLowStockItems);

      const result = await inventoryService.getLowStockItems();

      expect(result).toEqual(mockLowStockItems);
      expect(inventoryRepository.getLowStockItems).toHaveBeenCalledWith(undefined);
    });

    it('should filter low stock items by location', async () => {
      const mockStockByLocation = [
        { item: 'item1', quantity: 5, minimumStock: 10 },
        { item: 'item2', quantity: 15, minimumStock: 10 },
      ];

      inventoryRepository.getStockByLocation.mockResolvedValue(mockStockByLocation);

      const result = await inventoryService.getLowStockItems({ locationId: 'loc1' });

      expect(result).toHaveLength(1);
      expect(result[0].item).toBe('item1');
    });
  });

  describe('getMovementHistory', () => {
    it('should return inventory movement history', async () => {
      const mockHistory = [
        { item: 'item1', quantity: 10, type: 'STOCK_IN' },
        { item: 'item1', quantity: -5, type: 'STOCK_OUT' },
      ];

      inventoryRepository.getMovementHistory.mockResolvedValue(mockHistory);

      const result = await inventoryService.getMovementHistory({ itemId: 'item1' }, 100);

      expect(result).toEqual(mockHistory);
      expect(inventoryRepository.getMovementHistory).toHaveBeenCalledWith({ itemId: 'item1' }, 100);
    });
  });

  describe('getInventoryValuation', () => {
    it('should return inventory valuation', async () => {
      const mockValuation = {
        totalValue: 50000,
        itemCount: 100,
      };

      inventoryRepository.getInventoryValuation.mockResolvedValue(mockValuation);

      const result = await inventoryService.getInventoryValuation();

      expect(result).toEqual(mockValuation);
      expect(inventoryRepository.getInventoryValuation).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getWarehouseStockLevels', () => {
    const Warehouse = require('../../src/models/Warehouse');
    const Inventory = require('../../src/models/Inventory');

    it('should return warehouse stock levels with low stock indicators', async () => {
      const mockWarehouse = {
        _id: 'warehouse123',
        code: 'WH001',
        name: 'Main Warehouse',
        location: { city: 'Test City' }
      };

      const mockInventoryRecords = [
        {
          _id: 'inv1',
          item: {
            _id: 'item1',
            code: 'ITEM001',
            name: 'Item 1',
            unit: 'pcs',
            category: 'Category A',
            pricing: { costPrice: 10 },
            inventory: { minimumStock: 20, maximumStock: 100 },
            isActive: true
          },
          quantity: 15,
          available: 15,
          allocated: 0,
          reorderPoint: 20,
          lastUpdated: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          _id: 'inv2',
          item: {
            _id: 'item2',
            code: 'ITEM002',
            name: 'Item 2',
            unit: 'pcs',
            category: 'Category B',
            pricing: { costPrice: 25 },
            inventory: { minimumStock: 10, maximumStock: 50 },
            isActive: true
          },
          quantity: 0,
          available: 0,
          allocated: 0,
          reorderPoint: 10,
          lastUpdated: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          _id: 'inv3',
          item: {
            _id: 'item3',
            code: 'ITEM003',
            name: 'Item 3',
            unit: 'pcs',
            category: 'Category A',
            pricing: { costPrice: 15 },
            inventory: { minimumStock: 5, maximumStock: 200 },
            isActive: true
          },
          quantity: 50,
          available: 50,
          allocated: 0,
          reorderPoint: 5,
          lastUpdated: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInventoryRecords)
        })
      });

      const result = await inventoryService.getWarehouseStockLevels('warehouse123');

      expect(result).toHaveProperty('warehouse');
      expect(result.warehouse.id).toBe('warehouse123');
      expect(result.items).toHaveLength(3);
      expect(result.summary.totalItems).toBe(3);
      expect(result.summary.lowStockItems).toBe(1); // Item 1 (15 <= 20)
      expect(result.summary.outOfStockItems).toBe(1); // Item 2 (0)
      expect(result.summary.inStockItems).toBe(1); // Item 3 (50 > 5)

      // Check low stock indicators
      const item1 = result.items.find(item => item.itemCode === 'ITEM001');
      expect(item1.isLowStock).toBe(true);
      expect(item1.isOutOfStock).toBe(false);
      expect(item1.stockStatus).toBe('low_stock');

      const item2 = result.items.find(item => item.itemCode === 'ITEM002');
      expect(item2.isLowStock).toBe(true);
      expect(item2.isOutOfStock).toBe(true);
      expect(item2.stockStatus).toBe('out_of_stock');

      const item3 = result.items.find(item => item.itemCode === 'ITEM003');
      expect(item3.isLowStock).toBe(false);
      expect(item3.isOutOfStock).toBe(false);
      expect(item3.stockStatus).toBe('in_stock');
    });

    it('should throw error when warehouse ID is not provided', async () => {
      await expect(inventoryService.getWarehouseStockLevels(null)).rejects.toThrow('Warehouse ID is required');
      await expect(inventoryService.getWarehouseStockLevels(undefined)).rejects.toThrow('Warehouse ID is required');
      await expect(inventoryService.getWarehouseStockLevels('')).rejects.toThrow('Warehouse ID is required');
    });

    it('should throw error when warehouse not found', async () => {
      Warehouse.findById = jest.fn().mockResolvedValue(null);

      await expect(inventoryService.getWarehouseStockLevels('invalid')).rejects.toThrow('Warehouse not found');
    });

    it('should return empty items array when warehouse has no inventory', async () => {
      const mockWarehouse = {
        _id: 'warehouse123',
        code: 'WH001',
        name: 'Empty Warehouse',
        location: { city: 'Test City' }
      };

      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      const result = await inventoryService.getWarehouseStockLevels('warehouse123');

      expect(result.items).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.totalValue).toBe(0);
      expect(result.summary.lowStockItems).toBe(0);
      expect(result.summary.outOfStockItems).toBe(0);
      expect(result.summary.inStockItems).toBe(0);
    });

    it('should calculate stock value correctly', async () => {
      const mockWarehouse = {
        _id: 'warehouse123',
        code: 'WH001',
        name: 'Test Warehouse',
        location: { city: 'Test City' }
      };

      const mockInventoryRecords = [
        {
          _id: 'inv1',
          item: {
            _id: 'item1',
            code: 'ITEM001',
            name: 'Item 1',
            unit: 'pcs',
            category: 'Category A',
            pricing: { costPrice: 10 },
            inventory: { minimumStock: 5, maximumStock: 100 },
            isActive: true
          },
          quantity: 20,
          available: 20,
          allocated: 0,
          reorderPoint: 5,
          lastUpdated: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      Warehouse.findById = jest.fn().mockResolvedValue(mockWarehouse);
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInventoryRecords)
        })
      });

      const result = await inventoryService.getWarehouseStockLevels('warehouse123');

      expect(result.items[0].stockValue).toBe(200); // 20 * 10
      expect(result.summary.totalValue).toBe(200);
    });
  });

  describe('compareWarehouseStock', () => {
    const Item = require('../../src/models/Item');
    const Inventory = require('../../src/models/Inventory');

    it('should return stock comparison across all warehouses for an item', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        name: 'Test Item',
        unit: 'pcs',
        category: 'Category A',
        pricing: { costPrice: 10 },
        inventory: { minimumStock: 5, maximumStock: 100 }
      };

      const mockInventoryRecords = [
        {
          _id: 'inv1',
          warehouse: {
            _id: 'wh1',
            code: 'WH001',
            name: 'Warehouse 1',
            location: { city: 'City A' },
            isActive: true
          },
          quantity: 50,
          available: 45,
          allocated: 5,
          reorderPoint: 10,
          lastUpdated: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          _id: 'inv2',
          warehouse: {
            _id: 'wh2',
            code: 'WH002',
            name: 'Warehouse 2',
            location: { city: 'City B' },
            isActive: true
          },
          quantity: 30,
          available: 30,
          allocated: 0,
          reorderPoint: 10,
          lastUpdated: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        },
        {
          _id: 'inv3',
          warehouse: {
            _id: 'wh3',
            code: 'WH003',
            name: 'Warehouse 3',
            location: { city: 'City C' },
            isActive: true
          },
          quantity: 0,
          available: 0,
          allocated: 0,
          reorderPoint: 10,
          lastUpdated: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03')
        }
      ];

      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInventoryRecords)
        })
      });

      const result = await inventoryService.compareWarehouseStock('item123');

      expect(result).toHaveProperty('item');
      expect(result.item.id).toBe('item123');
      expect(result.warehouses).toHaveLength(3);
      expect(result.summary.totalWarehouses).toBe(3);
      expect(result.summary.warehousesWithStock).toBe(2);
      expect(result.summary.warehousesWithoutStock).toBe(1);
      expect(result.summary.totalQuantity).toBe(80); // 50 + 30 + 0
      expect(result.summary.totalValue).toBe(800); // 80 * 10
      expect(result.summary.largestStock).toBe(50);
      expect(result.summary.smallestStock).toBe(0);
      expect(result.summary.averageStockPerWarehouse).toBeCloseTo(26.67, 2);
    });

    it('should throw error when item ID is not provided', async () => {
      await expect(inventoryService.compareWarehouseStock(null)).rejects.toThrow('Item ID is required');
      await expect(inventoryService.compareWarehouseStock(undefined)).rejects.toThrow('Item ID is required');
      await expect(inventoryService.compareWarehouseStock('')).rejects.toThrow('Item ID is required');
    });

    it('should throw error when item not found', async () => {
      itemService.getItemById = jest.fn().mockResolvedValue(null);

      await expect(inventoryService.compareWarehouseStock('invalid')).rejects.toThrow('Item not found');
    });

    it('should return empty warehouses array when item has no inventory', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        name: 'Test Item',
        unit: 'pcs',
        category: 'Category A',
        pricing: { costPrice: 10 },
        inventory: { minimumStock: 5, maximumStock: 100 }
      };

      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      const result = await inventoryService.compareWarehouseStock('item123');

      expect(result.warehouses).toHaveLength(0);
      expect(result.summary.totalWarehouses).toBe(0);
      expect(result.summary.totalQuantity).toBe(0);
      expect(result.summary.totalValue).toBe(0);
    });

    it('should calculate summary statistics correctly', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        name: 'Test Item',
        unit: 'pcs',
        category: 'Category A',
        pricing: { costPrice: 20 },
        inventory: { minimumStock: 10, maximumStock: 200 }
      };

      const mockInventoryRecords = [
        {
          _id: 'inv1',
          warehouse: {
            _id: 'wh1',
            code: 'WH001',
            name: 'Warehouse 1',
            location: { city: 'City A' },
            isActive: true
          },
          quantity: 100,
          available: 100,
          allocated: 0,
          reorderPoint: 10,
          lastUpdated: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          _id: 'inv2',
          warehouse: {
            _id: 'wh2',
            code: 'WH002',
            name: 'Warehouse 2',
            location: { city: 'City B' },
            isActive: true
          },
          quantity: 50,
          available: 50,
          allocated: 0,
          reorderPoint: 10,
          lastUpdated: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        }
      ];

      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
      Inventory.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInventoryRecords)
        })
      });

      const result = await inventoryService.compareWarehouseStock('item123');

      expect(result.summary.totalQuantity).toBe(150);
      expect(result.summary.totalAvailable).toBe(150);
      expect(result.summary.totalAllocated).toBe(0);
      expect(result.summary.totalValue).toBe(3000); // 150 * 20
      expect(result.summary.largestStock).toBe(100);
      expect(result.summary.smallestStock).toBe(50);
      expect(result.summary.averageStockPerWarehouse).toBe(75);
    });
  });
});
