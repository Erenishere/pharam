const stockMovementService = require('../../src/services/stockMovementService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');
const Item = require('../../src/models/Item');

jest.mock('../../src/repositories/stockMovementRepository');
jest.mock('../../src/models/Item');

describe('StockMovementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordMovement', () => {
    it('should record a stock movement successfully', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        name: 'Test Item',
        stock: { currentStock: 100 },
      };

      const movementData = {
        itemId: 'item123',
        movementType: 'in',
        quantity: 50,
        referenceType: 'purchase_invoice',
        referenceId: 'invoice123',
        notes: 'Purchase from supplier',
      };

      const mockMovement = {
        _id: 'movement123',
        ...movementData,
        quantity: 50,
        createdBy: 'user123',
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      stockMovementRepository.create = jest.fn().mockResolvedValue(mockMovement);

      const result = await stockMovementService.recordMovement(movementData, 'user123');

      expect(Item.findById).toHaveBeenCalledWith('item123');
      expect(stockMovementRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockMovement);
    });

    it('should throw error if item not found', async () => {
      Item.findById = jest.fn().mockResolvedValue(null);

      await expect(
        stockMovementService.recordMovement(
          {
            itemId: 'invalid',
            movementType: 'in',
            quantity: 50,
            referenceType: 'purchase_invoice',
          },
          'user123'
        )
      ).rejects.toThrow('Item not found');
    });

    it('should throw error if quantity is zero', async () => {
      const mockItem = { _id: 'item123' };
      Item.findById = jest.fn().mockResolvedValue(mockItem);

      await expect(
        stockMovementService.recordMovement(
          {
            itemId: 'item123',
            movementType: 'in',
            quantity: 0,
            referenceType: 'purchase_invoice',
          },
          'user123'
        )
      ).rejects.toThrow('Quantity must be a non-zero number');
    });

    it('should normalize quantity for outward movement', async () => {
      const mockItem = { _id: 'item123', stock: { currentStock: 100 } };
      const mockMovement = { _id: 'movement123', quantity: -50 };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      stockMovementRepository.create = jest.fn().mockResolvedValue(mockMovement);

      await stockMovementService.recordMovement(
        {
          itemId: 'item123',
          movementType: 'out',
          quantity: 50,
          referenceType: 'sales_invoice',
        },
        'user123'
      );

      const createCall = stockMovementRepository.create.mock.calls[0][0];
      expect(createCall.quantity).toBe(-50);
    });
  });

  describe('recordAdjustment', () => {
    it('should record stock adjustment', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        stock: { currentStock: 100 },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockMovement = {
        _id: 'movement123',
        itemId: 'item123',
        movementType: 'adjustment',
        quantity: 10,
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      stockMovementRepository.create = jest.fn().mockResolvedValue(mockMovement);

      const result = await stockMovementService.recordAdjustment(
        'item123',
        10,
        'Stock count adjustment',
        'user123'
      );

      expect(result).toEqual(mockMovement);
      expect(Item.findById).toHaveBeenCalledWith('item123');
    });

    it('should throw error for zero adjustment', async () => {
      const mockItem = { _id: 'item123' };
      Item.findById = jest.fn().mockResolvedValue(mockItem);

      await expect(
        stockMovementService.recordAdjustment('item123', 0, 'Test', 'user123')
      ).rejects.toThrow('Adjustment quantity cannot be zero');
    });
  });

  describe('recordCorrection', () => {
    it('should record stock correction', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        stock: { currentStock: 100 },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockMovement = {
        _id: 'movement123',
        itemId: 'item123',
        movementType: 'adjustment',
        quantity: -10,
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      stockMovementRepository.create = jest.fn().mockResolvedValue(mockMovement);

      const result = await stockMovementService.recordCorrection(
        'item123',
        90,
        'Physical count',
        'user123'
      );

      expect(result).toEqual(mockMovement);
      const createCall = stockMovementRepository.create.mock.calls[0][0];
      expect(createCall.quantity).toBe(-10);
    });

    it('should throw error if no correction needed', async () => {
      const mockItem = {
        _id: 'item123',
        stock: { currentStock: 100 },
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);

      await expect(
        stockMovementService.recordCorrection('item123', 100, 'Test', 'user123')
      ).rejects.toThrow('No correction needed');
    });
  });

  describe('getMovementById', () => {
    it('should get movement by ID', async () => {
      const mockMovement = {
        _id: 'movement123',
        itemId: 'item123',
        quantity: 50,
      };

      stockMovementRepository.findById = jest.fn().mockResolvedValue(mockMovement);

      const result = await stockMovementService.getMovementById('movement123');

      expect(result).toEqual(mockMovement);
      expect(stockMovementRepository.findById).toHaveBeenCalledWith('movement123');
    });

    it('should throw error if movement not found', async () => {
      stockMovementRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(stockMovementService.getMovementById('invalid')).rejects.toThrow(
        'Stock movement not found'
      );
    });
  });

  describe('getMovements', () => {
    it('should get movements with pagination', async () => {
      const mockMovements = [
        { _id: 'movement1', quantity: 50 },
        { _id: 'movement2', quantity: 30 },
      ];

      stockMovementRepository.findAll = jest.fn().mockResolvedValue(mockMovements);
      stockMovementRepository.count = jest.fn().mockResolvedValue(100);

      const result = await stockMovementService.getMovements({}, { page: 1, limit: 50 });

      expect(result.movements).toEqual(mockMovements);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 100,
        pages: 2,
      });
    });
  });

  describe('getMovementsByItem', () => {
    it('should get movements for an item', async () => {
      const mockMovements = [
        { _id: 'movement1', itemId: 'item123' },
        { _id: 'movement2', itemId: 'item123' },
      ];

      stockMovementRepository.findByItem = jest.fn().mockResolvedValue(mockMovements);

      const result = await stockMovementService.getMovementsByItem('item123', 50);

      expect(result).toEqual(mockMovements);
      expect(stockMovementRepository.findByItem).toHaveBeenCalledWith('item123', 50);
    });
  });

  describe('getMovementsByDateRange', () => {
    it('should get movements by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockMovements = [{ _id: 'movement1' }];

      stockMovementRepository.findByDateRange = jest.fn().mockResolvedValue(mockMovements);

      const result = await stockMovementService.getMovementsByDateRange(startDate, endDate);

      expect(result).toEqual(mockMovements);
      expect(stockMovementRepository.findByDateRange).toHaveBeenCalledWith(
        startDate,
        endDate,
        {}
      );
    });

    it('should throw error if dates are missing', async () => {
      await expect(stockMovementService.getMovementsByDateRange(null, null)).rejects.toThrow(
        'Start date and end date are required'
      );
    });
  });

  describe('getItemMovementHistory', () => {
    it('should get item movement history with summary', async () => {
      const mockMovements = [{ _id: 'movement1' }];
      const mockSummary = [{ _id: 'in', totalQuantity: 100, count: 5 }];
      const mockBalance = 150;

      stockMovementRepository.findByDateRange = jest.fn().mockResolvedValue(mockMovements);
      stockMovementRepository.getMovementsSummary = jest.fn().mockResolvedValue(mockSummary);
      stockMovementRepository.calculateStockBalance = jest.fn().mockResolvedValue(mockBalance);

      const result = await stockMovementService.getItemMovementHistory('item123', 30);

      expect(result).toHaveProperty('itemId', 'item123');
      expect(result).toHaveProperty('currentBalance', 150);
      expect(result).toHaveProperty('movements', mockMovements);
      expect(result).toHaveProperty('summary', mockSummary);
    });
  });

  describe('getStockBalance', () => {
    it('should get stock balance for an item', async () => {
      stockMovementRepository.calculateStockBalance = jest.fn().mockResolvedValue(150);

      const result = await stockMovementService.getStockBalance('item123');

      expect(result).toBe(150);
      expect(stockMovementRepository.calculateStockBalance).toHaveBeenCalledWith(
        'item123',
        expect.any(Date)
      );
    });
  });

  describe('getExpiredBatches', () => {
    it('should get expired batches', async () => {
      const mockExpiredBatches = [
        {
          _id: 'movement1',
          batchInfo: { batchNumber: 'BATCH001', expiryDate: new Date('2023-01-01') },
        },
      ];

      stockMovementRepository.findExpiredBatches = jest
        .fn()
        .mockResolvedValue(mockExpiredBatches);

      const result = await stockMovementService.getExpiredBatches();

      expect(result).toEqual(mockExpiredBatches);
    });
  });

  describe('getMovementStatistics', () => {
    it('should get movement statistics', async () => {
      const mockStats = {
        totalMovements: 100,
        inward: { count: 50, quantity: 1000 },
        outward: { count: 40, quantity: 800 },
        adjustment: { count: 10, quantity: 50 },
      };

      stockMovementRepository.getStatistics = jest.fn().mockResolvedValue(mockStats);

      const result = await stockMovementService.getMovementStatistics(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toEqual(mockStats);
    });
  });

  describe('getItemWiseMovementReport', () => {
    it('should get item-wise movement report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockReport = [
        {
          itemCode: 'ITEM001',
          itemName: 'Test Item',
          inwardQuantity: 100,
          outwardQuantity: 50,
          netMovement: 50,
        },
      ];

      stockMovementRepository.getItemWiseSummary = jest.fn().mockResolvedValue(mockReport);

      const result = await stockMovementService.getItemWiseMovementReport(startDate, endDate);

      expect(result).toEqual(mockReport);
      expect(stockMovementRepository.getItemWiseSummary).toHaveBeenCalledWith(
        startDate,
        endDate
      );
    });

    it('should throw error if dates are missing', async () => {
      await expect(
        stockMovementService.getItemWiseMovementReport(null, null)
      ).rejects.toThrow('Start date and end date are required');
    });
  });

  describe('validateStockAvailability', () => {
    it('should validate stock availability - sufficient stock', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        name: 'Test Item',
        stock: { currentStock: 100 },
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);

      const result = await stockMovementService.validateStockAvailability('item123', 50);

      expect(result).toEqual({
        itemId: 'item123',
        itemCode: 'ITEM001',
        itemName: 'Test Item',
        currentStock: 100,
        requiredQuantity: 50,
        isAvailable: true,
        shortfall: 0,
      });
    });

    it('should validate stock availability - insufficient stock', async () => {
      const mockItem = {
        _id: 'item123',
        code: 'ITEM001',
        name: 'Test Item',
        stock: { currentStock: 30 },
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);

      const result = await stockMovementService.validateStockAvailability('item123', 50);

      expect(result.isAvailable).toBe(false);
      expect(result.shortfall).toBe(20);
    });
  });

  describe('getLowStockItems', () => {
    it('should get low stock items with movement summary', async () => {
      const mockItems = [
        {
          _id: 'item1',
          code: 'ITEM001',
          name: 'Test Item 1',
          category: 'Electronics',
          stock: { currentStock: 5, minStock: 10, maxStock: 100 },
        },
      ];

      const mockSummary = [{ _id: 'out', totalQuantity: 50, count: 10 }];

      Item.find = jest.fn().mockResolvedValue(mockItems);
      stockMovementRepository.getMovementsSummary = jest.fn().mockResolvedValue(mockSummary);

      const result = await stockMovementService.getLowStockItems(30);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('item');
      expect(result[0]).toHaveProperty('stock');
      expect(result[0]).toHaveProperty('recentMovements');
    });
  });

  describe('recordMultipleMovements', () => {
    it('should record multiple movements', async () => {
      const movementsData = [
        {
          itemId: 'item1',
          movementType: 'in',
          quantity: 50,
          referenceType: 'purchase_invoice',
        },
        {
          itemId: 'item2',
          movementType: 'out',
          quantity: 30,
          referenceType: 'sales_invoice',
        },
      ];

      const mockCreatedMovements = [
        { _id: 'movement1', ...movementsData[0] },
        { _id: 'movement2', ...movementsData[1] },
      ];

      stockMovementRepository.createMany = jest.fn().mockResolvedValue(mockCreatedMovements);

      const result = await stockMovementService.recordMultipleMovements(
        movementsData,
        'user123'
      );

      expect(result).toEqual(mockCreatedMovements);
      expect(stockMovementRepository.createMany).toHaveBeenCalled();
    });
  });
});
