const purchaseReturnService = require('../../src/services/purchaseReturnService');
const inventoryService = require('../../src/services/inventoryService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');

// Mock dependencies
jest.mock('../../src/services/inventoryService');
jest.mock('../../src/repositories/stockMovementRepository');

describe('PurchaseReturnService - Inventory Reversal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reverseInventory', () => {
    test('should decrease inventory for each returned item', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -5,
          unitPrice: 100
        },
        {
          itemId: 'item2',
          quantity: -3,
          unitPrice: 200
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({
        _id: 'item1',
        inventory: { currentStock: 95 }
      });
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      // Verify inventory was decreased for each item
      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        5,
        'decrease',
        'Purchase return'
      );

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item2',
        3,
        'decrease',
        'Purchase return'
      );
    });

    test('should create stock movement records with type return_to_supplier', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -5,
          unitPrice: 100
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({
        _id: 'movement1',
        itemId: 'item1',
        movementType: 'return_to_supplier',
        quantity: -5
      });

      await purchaseReturnService.reverseInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1',
          movementType: 'return_to_supplier',
          quantity: -5,
          reference: 'Purchase Return',
          notes: 'Item returned to supplier'
        })
      );
    });

    test('should handle negative quantities correctly', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -10, // Negative quantity in return invoice
          unitPrice: 100
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      // Should convert negative to positive for inventory decrease
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        10, // Positive quantity
        'decrease',
        'Purchase return'
      );
    });

    test('should create stock movement with negative quantity', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -7,
          unitPrice: 100
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: -7 // Negative quantity for stock movement
        })
      );
    });

    test('should process multiple items in sequence', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 },
        { itemId: 'item2', quantity: -3 },
        { itemId: 'item3', quantity: -8 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(3);
      expect(stockMovementRepository.create).toHaveBeenCalledTimes(3);
    });

    test('should include current date in stock movement', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      const beforeDate = new Date();
      await purchaseReturnService.reverseInventory(returnItems);
      const afterDate = new Date();

      const createCall = stockMovementRepository.create.mock.calls[0][0];
      const movementDate = createCall.date;

      expect(movementDate).toBeInstanceOf(Date);
      expect(movementDate.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(movementDate.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });

    test('should handle inventory adjustment errors', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockRejectedValue(
        new Error('Inventory update failed')
      );

      await expect(
        purchaseReturnService.reverseInventory(returnItems)
      ).rejects.toThrow('Inventory update failed');
    });

    test('should handle stock movement creation errors', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockRejectedValue(
        new Error('Stock movement creation failed')
      );

      await expect(
        purchaseReturnService.reverseInventory(returnItems)
      ).rejects.toThrow('Stock movement creation failed');
    });

    test('should not process items with zero quantity', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 },
        { itemId: 'item2', quantity: 0 }, // Should be skipped
        { itemId: 'item3', quantity: -3 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      // Should only process items with non-zero quantities
      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(inventoryService.adjustInventory).not.toHaveBeenCalledWith(
        'item2',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test('should use correct operation type for inventory adjustment', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'decrease', // Should be decrease for purchase return
        expect.anything()
      );
    });

    test('should include proper reference in stock movement', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'Purchase Return'
        })
      );
    });

    test('should include descriptive notes in stock movement', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Item returned to supplier'
        })
      );
    });

    test('should handle large quantities', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -1000 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        1000,
        'decrease',
        'Purchase return'
      );
    });

    test('should handle decimal quantities', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5.5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        5.5,
        'decrease',
        'Purchase return'
      );
    });
  });

  describe('Integration with createPurchaseReturn', () => {
    test('should call reverseInventory during return creation', async () => {
      const Invoice = require('../../src/models/Invoice');
      const ledgerService = require('../../src/services/ledgerService');

      jest.mock('../../src/models/Invoice');
      jest.mock('../../src/services/ledgerService');

      const mockOriginalInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        supplierId: 'supplier123',
        items: [
          { itemId: 'item1', quantity: 10, unitPrice: 100 }
        ]
      };

      Invoice.findById = jest.fn().mockResolvedValue(mockOriginalInvoice);
      Invoice.find = jest.fn().mockResolvedValue([]);
      Invoice.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({
          items: [{ itemId: 'item1', quantity: -5 }]
        })
      }));

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry = jest.fn().mockResolvedValue({});

      const returnData = {
        originalInvoiceId: 'invoice123',
        returnItems: [{ itemId: 'item1', quantity: 5 }],
        returnReason: 'damaged',
        returnNotes: 'Product damaged',
        createdBy: 'user123'
      };

      await purchaseReturnService.createPurchaseReturn(returnData);

      // Verify inventory reversal was called
      expect(inventoryService.adjustInventory).toHaveBeenCalled();
      expect(stockMovementRepository.create).toHaveBeenCalled();
    });
  });

  describe('Stock movement details', () => {
    test('should include proper item ID in stock movement', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1'
        })
      );
    });

    test('should track movement type as return_to_supplier', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'return_to_supplier'
        })
      );
    });
  });

  describe('Batch processing', () => {
    test('should handle batch of 10 items', async () => {
      const returnItems = Array.from({ length: 10 }, (_, i) => ({
        itemId: `item${i}`,
        quantity: -(i + 1)
      }));

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(10);
      expect(stockMovementRepository.create).toHaveBeenCalledTimes(10);
    });

    test('should handle batch of 50 items', async () => {
      const returnItems = Array.from({ length: 50 }, (_, i) => ({
        itemId: `item${i}`,
        quantity: -5
      }));

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await purchaseReturnService.reverseInventory(returnItems);

      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(50);
      expect(stockMovementRepository.create).toHaveBeenCalledTimes(50);
    });
  });
});
