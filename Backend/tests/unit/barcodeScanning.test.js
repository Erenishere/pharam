const itemService = require('../../src/services/itemService');
const itemRepository = require('../../src/repositories/itemRepository');
const Batch = require('../../src/models/Batch');

jest.mock('../../src/repositories/itemRepository');
jest.mock('../../src/models/Batch');

describe('Barcode Scanning with Batch Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findItemByBarcode', () => {
    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Product',
      barcode: '1234567890',
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
        currency: 'PKR'
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 500
      },
      isActive: true
    };

    test('should return item with no batches when item has no batches', async () => {
      itemRepository.findByBarcode.mockResolvedValue(mockItem);
      Batch.find.mockResolvedValue([]);

      const result = await itemService.findItemByBarcode('1234567890');

      expect(result).toHaveProperty('_id', 'item123');
      expect(result).toHaveProperty('batches');
      expect(result.batches).toEqual([]);
      expect(result.hasBatches).toBe(false);
      expect(result.requiresBatchSelection).toBe(false);
    });

    test('should return item with single batch when item has one batch', async () => {
      const mockBatch = {
        _id: 'batch123',
        batchNumber: 'BATCH001',
        warehouse: {
          _id: 'warehouse123',
          name: 'Main Warehouse',
          code: 'WH001'
        },
        expiryDate: new Date('2025-12-31'),
        manufacturingDate: new Date('2025-01-01'),
        remainingQuantity: 50,
        unitCost: 100,
        isExpiringSoon: false
      };

      itemRepository.findByBarcode.mockResolvedValue(mockItem);
      Batch.find.mockResolvedValue([mockBatch]);

      const result = await itemService.findItemByBarcode('1234567890');

      expect(result.batches).toHaveLength(1);
      expect(result.batches[0]).toMatchObject({
        batchId: 'batch123',
        batchNumber: 'BATCH001',
        warehouseId: 'warehouse123',
        warehouseName: 'Main Warehouse',
        availableQuantity: 50
      });
      expect(result.hasBatches).toBe(true);
      expect(result.requiresBatchSelection).toBe(false); // Only one batch
    });

    test('should return item with multiple batches and require batch selection', async () => {
      const mockBatches = [
        {
          _id: 'batch123',
          batchNumber: 'BATCH001',
          warehouse: {
            _id: 'warehouse123',
            name: 'Main Warehouse',
            code: 'WH001'
          },
          expiryDate: new Date('2025-12-31'),
          manufacturingDate: new Date('2025-01-01'),
          remainingQuantity: 50,
          unitCost: 100,
          isExpiringSoon: false
        },
        {
          _id: 'batch456',
          batchNumber: 'BATCH002',
          warehouse: {
            _id: 'warehouse456',
            name: 'Secondary Warehouse',
            code: 'WH002'
          },
          expiryDate: new Date('2025-11-30'),
          manufacturingDate: new Date('2025-01-15'),
          remainingQuantity: 30,
          unitCost: 95,
          isExpiringSoon: true
        }
      ];

      itemRepository.findByBarcode.mockResolvedValue(mockItem);
      Batch.find.mockResolvedValue(mockBatches);

      const result = await itemService.findItemByBarcode('1234567890');

      expect(result.batches).toHaveLength(2);
      expect(result.hasBatches).toBe(true);
      expect(result.requiresBatchSelection).toBe(true); // Multiple batches
      expect(result.batches[0].batchNumber).toBe('BATCH001');
      expect(result.batches[1].batchNumber).toBe('BATCH002');
      expect(result.batches[1].isExpiringSoon).toBe(true);
    });

    test('should filter batches by warehouse when warehouseId is provided', async () => {
      const mockBatch = {
        _id: 'batch123',
        batchNumber: 'BATCH001',
        warehouse: {
          _id: 'warehouse123',
          name: 'Main Warehouse',
          code: 'WH001'
        },
        expiryDate: new Date('2025-12-31'),
        manufacturingDate: new Date('2025-01-01'),
        remainingQuantity: 50,
        unitCost: 100,
        isExpiringSoon: false
      };

      itemRepository.findByBarcode.mockResolvedValue(mockItem);
      Batch.findByItemAndWarehouse = jest.fn().mockResolvedValue([mockBatch]);

      const result = await itemService.findItemByBarcode('1234567890', {
        warehouseId: 'warehouse123'
      });

      expect(Batch.findByItemAndWarehouse).toHaveBeenCalledWith(
        'item123',
        'warehouse123'
      );
      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].warehouseId).toBe('warehouse123');
    });

    test('should throw error when barcode is not provided', async () => {
      await expect(itemService.findItemByBarcode('')).rejects.toThrow(
        'Barcode is required'
      );
    });

    test('should throw error when item is not found', async () => {
      itemRepository.findByBarcode.mockResolvedValue(null);

      await expect(itemService.findItemByBarcode('invalid')).rejects.toThrow(
        'Item not found with the provided barcode'
      );
    });

    test('should throw error when item is not active', async () => {
      const inactiveItem = { ...mockItem, isActive: false };
      itemRepository.findByBarcode.mockResolvedValue(inactiveItem);

      await expect(itemService.findItemByBarcode('1234567890')).rejects.toThrow(
        'Item is not active'
      );
    });

    test('should include batch expiry information', async () => {
      const expiryDate = new Date('2025-06-30');
      const mockBatch = {
        _id: 'batch123',
        batchNumber: 'BATCH001',
        warehouse: {
          _id: 'warehouse123',
          name: 'Main Warehouse',
          code: 'WH001'
        },
        expiryDate,
        manufacturingDate: new Date('2025-01-01'),
        remainingQuantity: 50,
        unitCost: 100,
        isExpiringSoon: true
      };

      itemRepository.findByBarcode.mockResolvedValue(mockItem);
      Batch.find.mockResolvedValue([mockBatch]);

      const result = await itemService.findItemByBarcode('1234567890');

      expect(result.batches[0].expiryDate).toEqual(expiryDate);
      expect(result.batches[0].isExpiringSoon).toBe(true);
    });

    test('should include manufacturing date in batch information', async () => {
      const mfgDate = new Date('2025-01-01');
      const mockBatch = {
        _id: 'batch123',
        batchNumber: 'BATCH001',
        warehouse: {
          _id: 'warehouse123',
          name: 'Main Warehouse',
          code: 'WH001'
        },
        expiryDate: new Date('2025-12-31'),
        manufacturingDate: mfgDate,
        remainingQuantity: 50,
        unitCost: 100,
        isExpiringSoon: false
      };

      itemRepository.findByBarcode.mockResolvedValue(mockItem);
      Batch.find.mockResolvedValue([mockBatch]);

      const result = await itemService.findItemByBarcode('1234567890');

      expect(result.batches[0].manufacturingDate).toEqual(mfgDate);
    });
  });
});
