const inventoryService = require('../../src/services/inventoryService');
const inventoryRepository = require('../../src/repositories/inventoryRepository');
const itemService = require('../../src/services/itemService');

// Mock the dependencies
jest.mock('../../src/repositories/inventoryRepository');
jest.mock('../../src/services/itemService');

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
});
