const salesReturnService = require('../../src/services/salesReturnService');
const inventoryService = require('../../src/services/inventoryService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');

// Mock dependencies
jest.mock('../../src/services/inventoryService');
jest.mock('../../src/repositories/stockMovementRepository');

describe('SalesReturnService - Inventory Reversal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reverseSalesInventory', () => {
    test('should increase inventory for each returned item', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -5,
          unitPrice: 100,
          taxAmount: -90,
          lineTotal: -590
        },
        {
          itemId: 'item2',
          quantity: -3,
          unitPrice: 200,
          taxAmount: -108,
          lineTotal: -708
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({
        _id: 'item1',
        inventory: { currentStock: 105 }
      });
      stockMovementRepository.create.mockResolvedValue({});

      await salesReturnService.reverseSalesInventory(returnItems);

      // Verify inventory was increased for each item
      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        5,
        'increase',
        'Sales return'
      );

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item2',
        3,
        'increase',
        'Sales return'
      );
    });

    test('should create stock movement records with type return_from_customer', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -5,
          unitPrice: 100,
          taxAmount: -90,
          lineTotal: -590
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({
        _id: 'movement1',
        itemId: 'item1',
        movementType: 'return_from_customer',
        quantity: 5
      });

      await salesReturnService.reverseSalesInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1',
          movementType: 'return_from_customer',
          quantity: 5,
          reference: 'Sales Return',
          notes: 'Item returned by customer'
        })
      );
    });

    test('should handle negative quantities correctly', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -10, // Negative quantity in return invoice
          unitPrice: 100,
          taxAmount: -180,
          lineTotal: -1180
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await salesReturnService.reverseSalesInventory(returnItems);

      // Should convert negative to positive for inventory increase
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        10, // Positive quantity
        'increase',
        'Sales return'
      );
    });

    test('should create stock movement with positive quantity', async () => {
      const returnItems = [
        {
          itemId: 'item1',
          quantity: -7,
          unitPrice: 100,
          taxAmount: -126,
          lineTotal: -826
        }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await salesReturnService.reverseSalesInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 7 // Positive quantity for stock movement
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

      await salesReturnService.reverseSalesInventory(returnItems);

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
      await salesReturnService.reverseSalesInventory(returnItems);
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
        salesReturnService.reverseSalesInventory(returnItems)
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
        salesReturnService.reverseSalesInventory(returnItems)
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

      await salesReturnService.reverseSalesInventory(returnItems);

      // Should only process items with non-zero quantities
      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(inventoryService.adjustInventory).not.toHaveBeenCalledWith(
        'item2',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('Integration with createSalesReturn', () => {
    test('should call reverseSalesInventory during return creation', async () => {
      const Invoice = require('../../src/models/Invoice');
      const ledgerService = require('../../src/services/ledgerService');

      jest.mock('../../src/models/Invoice');
      jest.mock('../../src/services/ledgerService');

      const mockOriginalInvoice = {
        _id: 'invoice123',
        type: 'sales',
        customerId: 'customer123',
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

      await salesReturnService.createSalesReturn(returnData);

      // Verify inventory reversal was called
      expect(inventoryService.adjustInventory).toHaveBeenCalled();
      expect(stockMovementRepository.create).toHaveBeenCalled();
    });
  });

  describe('Stock movement details', () => {
    test('should include proper reference in stock movement', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await salesReturnService.reverseSalesInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'Sales Return'
        })
      );
    });

    test('should include descriptive notes in stock movement', async () => {
      const returnItems = [
        { itemId: 'item1', quantity: -5 }
      ];

      inventoryService.adjustInventory.mockResolvedValue({});
      stockMovementRepository.create.mockResolvedValue({});

      await salesReturnService.reverseSalesInventory(returnItems);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Item returned by customer'
        })
      );
    });
  });
});
