const batchService = require('../../src/services/batchService');
const batchRepository = require('../../src/repositories/batchRepository');
const itemService = require('../../src/services/itemService');
const inventoryService = require('../../src/services/inventoryService');

// Mock the dependencies
jest.mock('../../src/repositories/batchRepository');
jest.mock('../../src/services/itemService');
jest.mock('../../src/services/inventoryService');

describe('Batch Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBatch', () => {
    it('should create batch with valid data', async () => {
      const batchData = {
        itemId: 'item123',
        batchNumber: 'BATCH001',
        quantity: 100,
        unitCost: 50,
        locationId: 'loc1',
      };
      const mockItem = { _id: 'item123', name: 'Test Item', code: 'ITEM001' };
      const mockCreatedBatch = {
        _id: 'batch123',
        ...batchData,
        batchNumber: 'BATCH001',
        remainingQuantity: 100,
        totalCost: 5000,
        status: 'active',
      };

      itemService.getItemById.mockResolvedValue(mockItem);
      batchRepository.findByBatchNumber.mockResolvedValue(null);
      batchRepository.create.mockResolvedValue(mockCreatedBatch);
      batchRepository.findById.mockResolvedValue(mockCreatedBatch);
      inventoryService.addStock.mockResolvedValue({});

      const result = await batchService.createBatch(batchData);

      expect(result).toEqual(mockCreatedBatch);
      expect(itemService.getItemById).toHaveBeenCalledWith('item123');
      expect(batchRepository.findByBatchNumber).toHaveBeenCalledWith('BATCH001', 'item123');
    });

    it('should throw error for missing required fields', async () => {
      await expect(batchService.createBatch({})).rejects.toThrow('Missing required fields');
    });

    it('should throw error for duplicate batch number', async () => {
      const batchData = {
        itemId: 'item123',
        batchNumber: 'BATCH001',
        quantity: 100,
        unitCost: 50,
      };
      const mockItem = { _id: 'item123', name: 'Test Item' };
      const existingBatch = { _id: 'existing', batchNumber: 'BATCH001' };

      itemService.getItemById.mockResolvedValue(mockItem);
      batchRepository.findByBatchNumber.mockResolvedValue(existingBatch);

      await expect(batchService.createBatch(batchData)).rejects.toThrow('already exists');
    });
  });

  describe('getBatchById', () => {
    it('should return batch when found', async () => {
      const mockBatch = { _id: 'batch123', batchNumber: 'BATCH001' };
      batchRepository.findById.mockResolvedValue(mockBatch);

      const result = await batchService.getBatchById('batch123');

      expect(result).toEqual(mockBatch);
      expect(batchRepository.findById).toHaveBeenCalledWith('batch123');
    });

    it('should throw error when batch not found', async () => {
      batchRepository.findById.mockResolvedValue(null);

      await expect(batchService.getBatchById('batch123')).rejects.toThrow('Batch not found');
    });
  });

  describe('getBatchByNumber', () => {
    it('should return batch when found by number', async () => {
      const mockBatch = { _id: 'batch123', batchNumber: 'BATCH001' };
      batchRepository.findByBatchNumber.mockResolvedValue(mockBatch);

      const result = await batchService.getBatchByNumber('BATCH001', 'item123');

      expect(result).toEqual(mockBatch);
      expect(batchRepository.findByBatchNumber).toHaveBeenCalledWith('BATCH001', 'item123');
    });

    it('should throw error when batch not found', async () => {
      batchRepository.findByBatchNumber.mockResolvedValue(null);

      await expect(batchService.getBatchByNumber('BATCH001', 'item123')).rejects.toThrow('Batch not found');
    });
  });

  describe('updateBatch', () => {
    it('should update batch with valid data', async () => {
      const existingBatch = {
        _id: 'batch123',
        batchNumber: 'BATCH001',
        quantity: 100,
        unitCost: 50,
      };
      const updateData = { unitCost: 55 };
      const updatedBatch = { ...existingBatch, unitCost: 55, totalCost: 5500 };

      batchRepository.findById.mockResolvedValue(existingBatch);
      batchRepository.update.mockResolvedValue(updatedBatch);

      const result = await batchService.updateBatch('batch123', updateData);

      expect(result).toEqual(updatedBatch);
    });

    it('should throw error for invalid expiry date', async () => {
      const existingBatch = {
        _id: 'batch123',
        manufacturingDate: new Date('2024-01-01'),
      };
      const updateData = { expiryDate: new Date('2023-12-01') };

      batchRepository.findById.mockResolvedValue(existingBatch);

      await expect(batchService.updateBatch('batch123', updateData)).rejects.toThrow('Expiry date must be after manufacturing date');
    });

    it('should throw error for invalid manufacturing date', async () => {
      const existingBatch = {
        _id: 'batch123',
        expiryDate: new Date('2024-12-01'),
      };
      const updateData = { manufacturingDate: new Date('2025-01-01') };

      batchRepository.findById.mockResolvedValue(existingBatch);

      await expect(batchService.updateBatch('batch123', updateData)).rejects.toThrow('Manufacturing date must be before expiry date');
    });
  });

  describe('deleteBatch', () => {
    it('should delete batch with zero remaining quantity', async () => {
      const mockBatch = { _id: 'batch123', remainingQuantity: 0 };
      batchRepository.findById.mockResolvedValue(mockBatch);
      batchRepository.delete.mockResolvedValue({ success: true });

      const result = await batchService.deleteBatch('batch123');

      expect(result).toEqual({ success: true });
      expect(batchRepository.delete).toHaveBeenCalledWith('batch123');
    });

    it('should throw error when batch has remaining quantity', async () => {
      const mockBatch = { _id: 'batch123', remainingQuantity: 50 };
      batchRepository.findById.mockResolvedValue(mockBatch);

      await expect(batchService.deleteBatch('batch123')).rejects.toThrow('Cannot delete batch with remaining quantity');
    });
  });

  describe('getExpiringBatches', () => {
    it('should return batches expiring soon', async () => {
      const mockBatches = [
        { _id: 'batch1', expiryDate: new Date('2024-02-01') },
        { _id: 'batch2', expiryDate: new Date('2024-02-15') },
      ];
      batchRepository.findExpiringSoon.mockResolvedValue(mockBatches);

      const result = await batchService.getExpiringBatches({ days: 30 });

      expect(result).toEqual(mockBatches);
      expect(batchRepository.findExpiringSoon).toHaveBeenCalledWith(30, { locationId: undefined });
    });
  });

  describe('getExpiredBatches', () => {
    it('should return expired batches', async () => {
      const mockBatches = [
        { _id: 'batch1', expiryDate: new Date('2023-12-01') },
      ];
      batchRepository.findExpiredBatches.mockResolvedValue(mockBatches);

      const result = await batchService.getExpiredBatches();

      expect(result).toEqual(mockBatches);
      expect(batchRepository.findExpiredBatches).toHaveBeenCalledWith({ locationId: undefined });
    });
  });

  describe('updateBatchQuantity', () => {
    it('should update batch quantity', async () => {
      const mockBatch = {
        _id: 'batch123',
        item: { _id: 'item123' },
        location: 'loc1',
        remainingQuantity: 100,
      };
      const updatedBatch = { ...mockBatch, remainingQuantity: 110 };

      batchRepository.findById.mockResolvedValueOnce(mockBatch);
      batchRepository.updateQuantity.mockResolvedValue({});
      batchRepository.findById.mockResolvedValueOnce(updatedBatch);
      inventoryService.addStock.mockResolvedValue({});

      const result = await batchService.updateBatchQuantity('batch123', 10);

      expect(result).toEqual(updatedBatch);
      expect(batchRepository.updateQuantity).toHaveBeenCalledWith('batch123', 10);
    });

    it('should throw error when removing more than available', async () => {
      const mockBatch = {
        _id: 'batch123',
        remainingQuantity: 5,
      };

      batchRepository.findById.mockResolvedValue(mockBatch);

      await expect(batchService.updateBatchQuantity('batch123', -10)).rejects.toThrow('Insufficient quantity in batch');
    });
  });

  describe('getBatchStatistics', () => {
    it('should return batch statistics', async () => {
      const mockStats = {
        total: 100,
        active: 80,
        expired: 10,
        expiringSoon: 10,
      };
      batchRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await batchService.getBatchStatistics();

      expect(result).toEqual(mockStats);
      expect(batchRepository.getStatistics).toHaveBeenCalledWith({});
    });
  });

  describe('getNextBatchNumber', () => {
    it('should generate next batch number', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001' };
      itemService.getItemById.mockResolvedValue(mockItem);
      batchRepository.findByItemId.mockResolvedValue([]);

      const result = await batchService.getNextBatchNumber('item123');

      expect(result).toMatch(/^ITEM001-\d{8}-001$/);
    });
  });

  describe('getBatchesByItem', () => {
    it('should return batches for an item', async () => {
      const mockBatches = [
        { _id: 'batch1', item: 'item123' },
        { _id: 'batch2', item: 'item123' },
      ];
      batchRepository.findByItemId.mockResolvedValue(mockBatches);

      const result = await batchService.getBatchesByItem('item123');

      expect(result).toEqual(mockBatches);
      expect(batchRepository.findByItemId).toHaveBeenCalledWith('item123', {});
    });
  });

  describe('getBatchesByLocation', () => {
    it('should return batches for a location', async () => {
      const mockBatches = [
        { _id: 'batch1', location: 'loc1' },
      ];
      batchRepository.findByLocationId.mockResolvedValue(mockBatches);

      const result = await batchService.getBatchesByLocation('loc1');

      expect(result).toEqual(mockBatches);
      expect(batchRepository.findByLocationId).toHaveBeenCalledWith('loc1', {});
    });
  });

  describe('updateBatchStatuses', () => {
    it('should update batch statuses', async () => {
      const mockResult = { modifiedCount: 5 };
      batchRepository.updateBatchStatuses.mockResolvedValue(mockResult);

      const result = await batchService.updateBatchStatuses();

      expect(result).toEqual(mockResult);
      expect(batchRepository.updateBatchStatuses).toHaveBeenCalled();
    });
  });

  describe('getExpiredItemsByWarehouse', () => {
    it('should return expired items grouped by warehouse', async () => {
      const mockExpiredItems = [
        {
          item: {
            _id: 'item123',
            name: 'Test Item 1',
            code: 'ITEM001',
            unit: 'pcs'
          },
          batches: [
            {
              batchId: 'batch1',
              batchNumber: 'BATCH001',
              expiryDate: new Date('2023-12-01'),
              quantity: 50,
              unitCost: 10
            }
          ],
          totalQuantity: 50,
          totalValue: 500
        }
      ];

      // Mock the Batch model
      const Batch = require('../../src/models/Batch');
      Batch.getExpiredItemsByWarehouse = jest.fn().mockResolvedValue(mockExpiredItems);

      const result = await batchService.getExpiredItemsByWarehouse('warehouse123');

      expect(result).toEqual(mockExpiredItems);
      expect(Batch.getExpiredItemsByWarehouse).toHaveBeenCalledWith('warehouse123');
    });

    it('should throw error when warehouse ID is not provided', async () => {
      await expect(batchService.getExpiredItemsByWarehouse(null)).rejects.toThrow('Warehouse ID is required');
      await expect(batchService.getExpiredItemsByWarehouse(undefined)).rejects.toThrow('Warehouse ID is required');
      await expect(batchService.getExpiredItemsByWarehouse('')).rejects.toThrow('Warehouse ID is required');
    });

    it('should return empty array when no expired items found', async () => {
      const Batch = require('../../src/models/Batch');
      Batch.getExpiredItemsByWarehouse = jest.fn().mockResolvedValue([]);

      const result = await batchService.getExpiredItemsByWarehouse('warehouse123');

      expect(result).toEqual([]);
      expect(Batch.getExpiredItemsByWarehouse).toHaveBeenCalledWith('warehouse123');
    });

    it('should group multiple expired batches by item', async () => {
      const mockExpiredItems = [
        {
          item: {
            _id: 'item123',
            name: 'Test Item 1',
            code: 'ITEM001',
            unit: 'pcs'
          },
          batches: [
            {
              batchId: 'batch1',
              batchNumber: 'BATCH001',
              expiryDate: new Date('2023-12-01'),
              quantity: 30,
              unitCost: 10
            },
            {
              batchId: 'batch2',
              batchNumber: 'BATCH002',
              expiryDate: new Date('2023-11-15'),
              quantity: 20,
              unitCost: 12
            }
          ],
          totalQuantity: 50,
          totalValue: 540
        }
      ];

      const Batch = require('../../src/models/Batch');
      Batch.getExpiredItemsByWarehouse = jest.fn().mockResolvedValue(mockExpiredItems);

      const result = await batchService.getExpiredItemsByWarehouse('warehouse123');

      expect(result).toEqual(mockExpiredItems);
      expect(result[0].batches).toHaveLength(2);
      expect(result[0].totalQuantity).toBe(50);
    });
  });
});
