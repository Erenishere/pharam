const stockTransferService = require('../../src/services/stockTransferService');
const Inventory = require('../../src/models/Inventory');
const StockMovement = require('../../src/models/StockMovement');
const Warehouse = require('../../src/models/Warehouse');
const Item = require('../../src/models/Item');

jest.mock('../../src/models/Inventory');
jest.mock('../../src/models/StockMovement');
jest.mock('../../src/models/Warehouse');
jest.mock('../../src/models/Item');

describe('Stock Transfer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transferStock', () => {
    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Product'
    };

    const mockFromWarehouse = {
      _id: 'wh1',
      code: 'WH001',
      name: 'Warehouse 1'
    };

    const mockToWarehouse = {
      _id: 'wh2',
      code: 'WH002',
      name: 'Warehouse 2'
    };

    test('should transfer stock successfully', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 100,
        allocated: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      const destinationInventory = {
        _id: 'inv2',
        item: 'item123',
        warehouse: 'wh2',
        quantity: 50,
        allocated: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn()
        .mockResolvedValueOnce(sourceInventory)
        .mockResolvedValueOnce(destinationInventory);
      StockMovement.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'mov1' })
        .mockResolvedValueOnce({ _id: 'mov2' });

      const result = await stockTransferService.transferStock({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        reason: 'Stock rebalancing',
        createdBy: 'user123'
      });

      expect(result.success).toBe(true);
      expect(result.transfer.quantity).toBe(20);
      expect(sourceInventory.quantity).toBe(80);
      expect(destinationInventory.quantity).toBe(70);
      expect(sourceInventory.save).toHaveBeenCalled();
      expect(destinationInventory.save).toHaveBeenCalled();
    });

    test('should throw error when item not found', async () => {
      Item.findById = jest.fn().mockResolvedValue(null);

      await expect(
        stockTransferService.transferStock({
          itemId: 'invalid',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'wh2',
          quantity: 20
        })
      ).rejects.toThrow('Item not found');
    });

    test('should throw error when source warehouse not found', async () => {
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn().mockResolvedValueOnce(null);

      await expect(
        stockTransferService.transferStock({
          itemId: 'item123',
          fromWarehouseId: 'invalid',
          toWarehouseId: 'wh2',
          quantity: 20
        })
      ).rejects.toThrow('Source warehouse not found');
    });

    test('should throw error when destination warehouse not found', async () => {
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(null);

      await expect(
        stockTransferService.transferStock({
          itemId: 'item123',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'invalid',
          quantity: 20
        })
      ).rejects.toThrow('Destination warehouse not found');
    });

    test('should throw error when warehouses are the same', async () => {
      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn().mockResolvedValue(mockFromWarehouse);

      await expect(
        stockTransferService.transferStock({
          itemId: 'item123',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'wh1',
          quantity: 20
        })
      ).rejects.toThrow('Source and destination warehouses must be different');
    });

    test('should throw error when quantity is invalid', async () => {
      await expect(
        stockTransferService.transferStock({
          itemId: 'item123',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'wh2',
          quantity: 0
        })
      ).rejects.toThrow('Transfer quantity must be greater than 0');
    });

    test('should throw error when insufficient stock', async () => {
      const sourceInventory = {
        _id: 'inv1',
        item: 'item123',
        warehouse: 'wh1',
        quantity: 10,
        allocated: 0
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn().mockResolvedValueOnce(sourceInventory);

      await expect(
        stockTransferService.transferStock({
          itemId: 'item123',
          fromWarehouseId: 'wh1',
          toWarehouseId: 'wh2',
          quantity: 20
        })
      ).rejects.toThrow('Insufficient stock');
    });

    test('should create stock movement records', async () => {
      const sourceInventory = {
        _id: 'inv1',
        quantity: 100,
        allocated: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      const destinationInventory = {
        _id: 'inv2',
        quantity: 50,
        allocated: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockFromWarehouse)
        .mockResolvedValueOnce(mockToWarehouse);
      Inventory.findOne = jest.fn()
        .mockResolvedValueOnce(sourceInventory)
        .mockResolvedValueOnce(destinationInventory);
      StockMovement.create = jest.fn()
        .mockResolvedValueOnce({ _id: 'mov1' })
        .mockResolvedValueOnce({ _id: 'mov2' });

      await stockTransferService.transferStock({
        itemId: 'item123',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        quantity: 20,
        createdBy: 'user123'
      });

      expect(StockMovement.create).toHaveBeenCalledTimes(2);
      expect(StockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'transfer_out',
          quantity: 20
        })
      );
      expect(StockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'transfer_in',
          quantity: 20
        })
      );
    });
  });

  describe('validateTransfer', () => {
    test('should validate successful transfer', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { quantity: 100 };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        20
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid transfer', async () => {
      Item.findById = jest.fn().mockResolvedValue(null);
      Warehouse.findById = jest.fn().mockResolvedValue(null);

      const result = await stockTransferService.validateTransfer(
        'invalid',
        'invalid',
        'invalid',
        0
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect insufficient stock', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { quantity: 10 };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        20
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Insufficient stock'));
    });

    test('should prevent negative stock by validating exact quantity', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };
      const mockInventory = { quantity: 50 };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(mockInventory);

      // Try to transfer exact available quantity - should be valid
      const result1 = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        50
      );
      expect(result1.isValid).toBe(true);

      // Try to transfer more than available - should prevent negative stock
      const result2 = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        51
      );
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain(expect.stringContaining('Insufficient stock'));
    });

    test('should validate source warehouse exists', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(null) // Source warehouse not found
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransfer(
        'item123',
        'invalid',
        'wh2',
        20
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source warehouse not found');
    });

    test('should validate destination warehouse exists', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(null); // Destination warehouse not found

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'invalid',
        20
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Destination warehouse not found');
    });

    test('should validate item exists in source warehouse', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);
      Inventory.findOne = jest.fn().mockResolvedValue(null); // Item not in source warehouse

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        20
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item not found in source warehouse');
    });

    test('should validate warehouses are different', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse = { _id: 'wh1', code: 'WH001', name: 'WH1' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse)
        .mockResolvedValueOnce(mockWarehouse);

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh1', // Same warehouse
        20
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source and destination warehouses must be different');
    });

    test('should validate quantity is greater than zero', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        0 // Invalid quantity
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transfer quantity must be greater than 0');
    });

    test('should validate negative quantity', async () => {
      const mockItem = { _id: 'item123', code: 'ITEM001', name: 'Test' };
      const mockWarehouse1 = { _id: 'wh1', code: 'WH001', name: 'WH1' };
      const mockWarehouse2 = { _id: 'wh2', code: 'WH002', name: 'WH2' };

      Item.findById = jest.fn().mockResolvedValue(mockItem);
      Warehouse.findById = jest.fn()
        .mockResolvedValueOnce(mockWarehouse1)
        .mockResolvedValueOnce(mockWarehouse2);

      const result = await stockTransferService.validateTransfer(
        'item123',
        'wh1',
        'wh2',
        -10 // Negative quantity
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transfer quantity must be greater than 0');
    });
  });
});
