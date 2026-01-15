const itemService = require('../../src/services/itemService');
const itemRepository = require('../../src/repositories/itemRepository');

// Mock the repository
jest.mock('../../src/repositories/itemRepository');

describe('Item Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getItemById', () => {
    it('should return item when found', async () => {
      const mockItem = { _id: '123', name: 'Test Item', code: 'ITEM001' };
      itemRepository.findById.mockResolvedValue(mockItem);

      const result = await itemService.getItemById('123');

      expect(result).toEqual(mockItem);
      expect(itemRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw error when item not found', async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(itemService.getItemById('123')).rejects.toThrow('Item not found');
    });
  });

  describe('getItemByCode', () => {
    it('should return item when found by code', async () => {
      const mockItem = { _id: '123', name: 'Test Item', code: 'ITEM001' };
      itemRepository.findByCode.mockResolvedValue(mockItem);

      const result = await itemService.getItemByCode('ITEM001');

      expect(result).toEqual(mockItem);
      expect(itemRepository.findByCode).toHaveBeenCalledWith('ITEM001');
    });

    it('should throw error when item not found by code', async () => {
      itemRepository.findByCode.mockResolvedValue(null);

      await expect(itemService.getItemByCode('INVALID')).rejects.toThrow('Item not found');
    });
  });

  describe('createItem', () => {
    it('should create item with valid data', async () => {
      const itemData = {
        name: 'New Item',
        code: 'ITEM002',
        pricing: {
          costPrice: 100,
          salePrice: 150,
        },
      };
      const mockCreatedItem = { _id: '456', ...itemData };

      itemRepository.codeExists.mockResolvedValue(false);
      itemRepository.create.mockResolvedValue(mockCreatedItem);

      const result = await itemService.createItem(itemData);

      expect(result).toEqual(mockCreatedItem);
      expect(itemRepository.codeExists).toHaveBeenCalledWith('ITEM002');
      expect(itemRepository.create).toHaveBeenCalledWith(itemData);
    });

    it('should throw error when name is missing', async () => {
      const itemData = { code: 'ITEM002' };

      await expect(itemService.createItem(itemData)).rejects.toThrow('Item name is required');
    });

    it('should throw error when pricing is missing', async () => {
      const itemData = { name: 'New Item' };

      await expect(itemService.createItem(itemData)).rejects.toThrow('Pricing information is required');
    });

    it('should throw error when code already exists', async () => {
      const itemData = {
        name: 'New Item',
        code: 'ITEM002',
        pricing: { costPrice: 100, salePrice: 150 },
      };

      itemRepository.codeExists.mockResolvedValue(true);

      await expect(itemService.createItem(itemData)).rejects.toThrow('Item code already exists');
    });

    it('should throw error for negative prices', async () => {
      const itemData = {
        name: 'New Item',
        pricing: { costPrice: -100, salePrice: 150 },
      };

      await expect(itemService.createItem(itemData)).rejects.toThrow('Prices cannot be negative');
    });

    it('should throw error for negative inventory levels', async () => {
      const itemData = {
        name: 'New Item',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: -10, minimumStock: 5, maximumStock: 100 },
      };

      await expect(itemService.createItem(itemData)).rejects.toThrow('Inventory levels cannot be negative');
    });

    it('should throw error when minimum stock exceeds maximum stock', async () => {
      const itemData = {
        name: 'New Item',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 50, minimumStock: 100, maximumStock: 50 },
      };

      await expect(itemService.createItem(itemData)).rejects.toThrow('Minimum stock cannot be greater than maximum stock');
    });
  });

  describe('updateItem', () => {
    it('should update item with valid data', async () => {
      const existingItem = {
        _id: '123',
        name: 'Old Name',
        code: 'ITEM001',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 50, minimumStock: 10, maximumStock: 100 },
      };
      const updateData = { name: 'New Name' };
      const updatedItem = { ...existingItem, ...updateData };

      itemRepository.findById.mockResolvedValue(existingItem);
      itemRepository.update.mockResolvedValue(updatedItem);

      const result = await itemService.updateItem('123', updateData);

      expect(result).toEqual(updatedItem);
      expect(itemRepository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should throw error when item not found', async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(itemService.updateItem('123', { name: 'New Name' })).rejects.toThrow('Item not found');
    });

    it('should throw error when updating to duplicate code', async () => {
      const existingItem = { _id: '123', name: 'Item', code: 'ITEM001' };
      const updateData = { code: 'ITEM002' };

      itemRepository.findById.mockResolvedValue(existingItem);
      itemRepository.codeExists.mockResolvedValue(true);

      await expect(itemService.updateItem('123', updateData)).rejects.toThrow('Item code already exists');
    });

    it('should throw error for negative prices in update', async () => {
      const existingItem = {
        _id: '123',
        pricing: { costPrice: 100, salePrice: 150 },
      };
      const updateData = { pricing: { costPrice: -50 } };

      itemRepository.findById.mockResolvedValue(existingItem);

      await expect(itemService.updateItem('123', updateData)).rejects.toThrow('Prices cannot be negative');
    });
  });

  describe('deleteItem', () => {
    it('should soft delete item', async () => {
      const mockItem = { _id: '123', name: 'Item', isActive: true };
      const deletedItem = { ...mockItem, isActive: false };

      itemRepository.findById.mockResolvedValue(mockItem);
      itemRepository.delete.mockResolvedValue(deletedItem);

      const result = await itemService.deleteItem('123');

      expect(result).toEqual(deletedItem);
      expect(itemRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw error when item not found', async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(itemService.deleteItem('123')).rejects.toThrow('Item not found');
    });
  });

  describe('updateItemStock', () => {
    it('should add stock to item', async () => {
      const mockItem = {
        _id: '123',
        inventory: { currentStock: 50 },
      };
      const updatedItem = {
        ...mockItem,
        inventory: { currentStock: 60 },
      };

      itemRepository.findById.mockResolvedValue(mockItem);
      itemRepository.updateStock.mockResolvedValue(updatedItem);

      const result = await itemService.updateItemStock('123', 10, 'add');

      expect(result).toEqual(updatedItem);
      expect(itemRepository.updateStock).toHaveBeenCalledWith('123', 10, 'add');
    });

    it('should subtract stock from item', async () => {
      const mockItem = {
        _id: '123',
        inventory: { currentStock: 50 },
      };
      const updatedItem = {
        ...mockItem,
        inventory: { currentStock: 40 },
      };

      itemRepository.findById.mockResolvedValue(mockItem);
      itemRepository.updateStock.mockResolvedValue(updatedItem);

      const result = await itemService.updateItemStock('123', 10, 'subtract');

      expect(result).toEqual(updatedItem);
      expect(itemRepository.updateStock).toHaveBeenCalledWith('123', 10, 'subtract');
    });

    it('should throw error for zero or negative quantity', async () => {
      await expect(itemService.updateItemStock('123', 0, 'add')).rejects.toThrow('Quantity must be greater than zero');
      await expect(itemService.updateItemStock('123', -10, 'add')).rejects.toThrow('Quantity must be greater than zero');
    });

    it('should throw error for invalid operation', async () => {
      await expect(itemService.updateItemStock('123', 10, 'invalid')).rejects.toThrow("Operation must be either 'add' or 'subtract'");
    });

    it('should throw error when subtracting more than available stock', async () => {
      const mockItem = {
        _id: '123',
        inventory: { currentStock: 5 },
      };

      itemRepository.findById.mockResolvedValue(mockItem);

      await expect(itemService.updateItemStock('123', 10, 'subtract')).rejects.toThrow('Insufficient stock');
    });
  });

  describe('checkStockAvailability', () => {
    it('should return true when sufficient stock is available', async () => {
      const mockItem = {
        _id: '123',
        inventory: { currentStock: 50 },
      };

      itemRepository.findById.mockResolvedValue(mockItem);

      const result = await itemService.checkStockAvailability('123', 30);

      expect(result).toBe(true);
    });

    it('should return false when insufficient stock', async () => {
      const mockItem = {
        _id: '123',
        inventory: { currentStock: 10 },
      };

      itemRepository.findById.mockResolvedValue(mockItem);

      const result = await itemService.checkStockAvailability('123', 30);

      expect(result).toBe(false);
    });
  });

  describe('getAllItems', () => {
    it('should return paginated items', async () => {
      const mockItems = [
        { _id: '1', name: 'Item 1' },
        { _id: '2', name: 'Item 2' },
      ];

      itemRepository.search.mockResolvedValue(mockItems);
      itemRepository.count.mockResolvedValue(10);

      const result = await itemService.getAllItems({}, { page: 1, limit: 2 });

      expect(result.items).toEqual(mockItems);
      expect(result.pagination.totalItems).toBe(10);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('getItemsByCategory', () => {
    it('should return items by category', async () => {
      const mockItems = [{ _id: '1', name: 'Item 1', category: 'Electronics' }];
      itemRepository.findByCategory.mockResolvedValue(mockItems);

      const result = await itemService.getItemsByCategory('Electronics');

      expect(result).toEqual(mockItems);
      expect(itemRepository.findByCategory).toHaveBeenCalledWith('Electronics');
    });

    it('should throw error when category is not provided', async () => {
      await expect(itemService.getItemsByCategory()).rejects.toThrow('Category is required');
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items', async () => {
      const mockItems = [{ _id: '1', name: 'Item 1', inventory: { currentStock: 5 } }];
      itemRepository.findLowStockItems.mockResolvedValue(mockItems);

      const result = await itemService.getLowStockItems();

      expect(result).toEqual(mockItems);
      expect(itemRepository.findLowStockItems).toHaveBeenCalled();
    });
  });
});
