const purchaseReturnService = require('../../src/services/purchaseReturnService');
const Invoice = require('../../src/models/Invoice');

// Mock Invoice model
jest.mock('../../src/models/Invoice');

describe('PurchaseReturnService - getReturnableItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReturnableItems', () => {
    test('should return list of returnable items', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 100
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            quantity: 5,
            unitPrice: 200
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result).toHaveLength(2);
      expect(result[0].itemName).toBe('Item 1');
      expect(result[0].availableForReturn).toBe(10);
      expect(result[1].itemName).toBe('Item 2');
      expect(result[1].availableForReturn).toBe(5);
    });

    test('should calculate available quantity after existing returns', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 100
          }
        ]
      };

      const mockExistingReturn = {
        items: [
          {
            itemId: 'item1',
            quantity: -3 // Already returned 3
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([mockExistingReturn]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result[0].alreadyReturned).toBe(3);
      expect(result[0].availableForReturn).toBe(7); // 10 - 3
    });

    test('should handle multiple existing returns', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 100
          }
        ]
      };

      const mockReturns = [
        {
          items: [
            { itemId: 'item1', quantity: -3 }
          ]
        },
        {
          items: [
            { itemId: 'item1', quantity: -2 }
          ]
        }
      ];

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue(mockReturns);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result[0].alreadyReturned).toBe(5); // 3 + 2
      expect(result[0].availableForReturn).toBe(5); // 10 - 5
    });

    test('should exclude items with no available quantity', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 100
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            quantity: 5,
            unitPrice: 200
          }
        ]
      };

      const mockExistingReturn = {
        items: [
          { itemId: 'item2', quantity: -5 } // Fully returned
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([mockExistingReturn]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result).toHaveLength(1);
      expect(result[0].itemCode).toBe('I001');
    });

    test('should include unit price in returnable items', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 150.50
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result[0].unitPrice).toBe(150.50);
    });

    test('should throw error if invoice not found', async () => {
      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await expect(
        purchaseReturnService.getReturnableItems('nonexistent')
      ).rejects.toThrow('Original invoice not found');
    });

    test('should throw error if invoice is not purchase type', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'sales',
        items: []
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      await expect(
        purchaseReturnService.getReturnableItems('invoice123')
      ).rejects.toThrow('Can only get returnable items for purchase invoices');
    });

    test('should exclude cancelled returns from calculation', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 100
          }
        ]
      };

      const mockReturns = [
        {
          status: 'confirmed',
          items: [
            { itemId: 'item1', quantity: -3 }
          ]
        },
        {
          status: 'cancelled',
          items: [
            { itemId: 'item1', quantity: -2 }
          ]
        }
      ];

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([mockReturns[0]]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result[0].alreadyReturned).toBe(3); // Only confirmed return counted
      expect(result[0].availableForReturn).toBe(7);
    });

    test('should handle items with multiple returns', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 20,
            unitPrice: 100
          }
        ]
      };

      const mockReturns = [
        {
          items: [
            { itemId: 'item1', quantity: -5 }
          ]
        },
        {
          items: [
            { itemId: 'item1', quantity: -3 }
          ]
        },
        {
          items: [
            { itemId: 'item1', quantity: -2 }
          ]
        }
      ];

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue(mockReturns);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result[0].alreadyReturned).toBe(10); // 5 + 3 + 2
      expect(result[0].availableForReturn).toBe(10); // 20 - 10
      expect(result[0].canReturn).toBe(true);
    });

    test('should set canReturn to false when no quantity available', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 5,
            unitPrice: 100
          }
        ]
      };

      const mockExistingReturn = {
        items: [
          { itemId: 'item1', quantity: -5 }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([mockExistingReturn]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result).toHaveLength(0); // Filtered out
    });

    test('should handle invoice with multiple items and mixed returns', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Item 1', code: 'I001' },
            quantity: 10,
            unitPrice: 100
          },
          {
            itemId: { _id: 'item2', name: 'Item 2', code: 'I002' },
            quantity: 20,
            unitPrice: 200
          },
          {
            itemId: { _id: 'item3', name: 'Item 3', code: 'I003' },
            quantity: 15,
            unitPrice: 150
          }
        ]
      };

      const mockReturns = [
        {
          items: [
            { itemId: 'item1', quantity: -5 },
            { itemId: 'item2', quantity: -10 }
          ]
        },
        {
          items: [
            { itemId: 'item2', quantity: -5 }
          ]
        }
      ];

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue(mockReturns);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result).toHaveLength(3);
      expect(result[0].availableForReturn).toBe(5); // item1: 10 - 5
      expect(result[1].availableForReturn).toBe(5); // item2: 20 - 15
      expect(result[2].availableForReturn).toBe(15); // item3: 15 - 0
    });

    test('should populate item details correctly', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        items: [
          {
            itemId: { _id: 'item1', name: 'Test Item', code: 'TEST001' },
            quantity: 10,
            unitPrice: 99.99
          }
        ]
      };

      Invoice.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      Invoice.find.mockResolvedValue([]);

      const result = await purchaseReturnService.getReturnableItems('invoice123');

      expect(result[0].itemId).toBe('item1');
      expect(result[0].itemName).toBe('Test Item');
      expect(result[0].itemCode).toBe('TEST001');
      expect(result[0].originalQuantity).toBe(10);
      expect(result[0].unitPrice).toBe(99.99);
    });
  });
});
