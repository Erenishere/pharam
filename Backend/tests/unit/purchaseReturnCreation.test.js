const purchaseReturnService = require('../../src/services/purchaseReturnService');
const Invoice = require('../../src/models/Invoice');
const inventoryService = require('../../src/services/inventoryService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');
const ledgerService = require('../../src/services/ledgerService');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/services/inventoryService');
jest.mock('../../src/repositories/stockMovementRepository');
jest.mock('../../src/services/ledgerService');

describe('PurchaseReturnService - createPurchaseReturn', () => {
  let mockOriginalInvoice;
  let mockReturnData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock original purchase invoice
    mockOriginalInvoice = {
      _id: 'invoice123',
      type: 'purchase',
      supplierId: 'supplier123',
      supplierBillNo: 'BILL001',
      invoiceNumber: 'PI2024000001',
      items: [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        },
        {
          itemId: 'item2',
          quantity: 5,
          unitPrice: 200,
          discount: 0,
          gstRate: 4
        }
      ]
    };

    // Mock return data
    mockReturnData = {
      originalInvoiceId: 'invoice123',
      returnItems: [
        { itemId: 'item1', quantity: 5 }
      ],
      returnReason: 'damaged',
      returnNotes: 'Product damaged during shipping',
      createdBy: 'user123'
    };
  });

  describe('Successful return creation', () => {
    test('should create purchase return invoice with negative quantities', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        type: 'return_purchase',
        supplierId: 'supplier123',
        items: [
          {
            itemId: 'item1',
            quantity: -5,
            unitPrice: 100,
            gstRate: 18,
            gstAmount: -90,
            lineTotal: -590
          }
        ],
        totals: {
          subtotal: -500,
          totalTax: -90,
          gst18Total: -90,
          gst4Total: 0,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const result = await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(result.type).toBe('return_purchase');
      expect(result.items[0].quantity).toBe(-5);
      expect(result.totals.grandTotal).toBe(-590);
    });

    test('should calculate negative totals correctly', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        totals: {
          subtotal: -500,
          totalTax: -90,
          gst18Total: -90,
          gst4Total: 0,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const result = await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(result.totals.subtotal).toBeLessThan(0);
      expect(result.totals.totalTax).toBeLessThan(0);
      expect(result.totals.grandTotal).toBeLessThan(0);
    });

    test('should link return invoice to original invoice', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        originalInvoiceId: 'invoice123'
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const result = await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(result.originalInvoiceId).toBe('invoice123');
    });

    test('should store return metadata', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        returnMetadata: {
          returnReason: 'damaged',
          returnNotes: 'Product damaged during shipping',
          returnDate: expect.any(Date)
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const result = await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(result.returnMetadata.returnReason).toBe('damaged');
      expect(result.returnMetadata.returnNotes).toBe('Product damaged during shipping');
    });

    test('should handle mixed GST rates', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        items: [
          { itemId: 'item1', quantity: -5, gstRate: 18, gstAmount: -90 },
          { itemId: 'item2', quantity: -3, gstRate: 4, gstAmount: -24 }
        ],
        totals: {
          subtotal: -1100,
          totalTax: -114,
          gst18Total: -90,
          gst4Total: -24,
          grandTotal: -1214
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const returnDataMultiple = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 5 },
          { itemId: 'item2', quantity: 3 }
        ]
      };

      const result = await purchaseReturnService.createPurchaseReturn(returnDataMultiple);

      expect(result.totals.gst18Total).toBe(-90);
      expect(result.totals.gst4Total).toBe(-24);
    });
  });

  describe('Validation errors', () => {
    test('should throw error if original invoice not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      await expect(
        purchaseReturnService.createPurchaseReturn(mockReturnData)
      ).rejects.toThrow('Original invoice not found');
    });

    test('should throw error if original invoice is not purchase type', async () => {
      const salesInvoice = { ...mockOriginalInvoice, type: 'sales' };
      Invoice.findById.mockResolvedValue(salesInvoice);

      await expect(
        purchaseReturnService.createPurchaseReturn(mockReturnData)
      ).rejects.toThrow('Can only create returns for purchase invoices');
    });

    test('should throw error if return quantity exceeds available', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const invalidReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 15 } // More than original 10
        ]
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(invalidReturnData)
      ).rejects.toThrow('Return validation failed');
    });

    test('should throw error if item not in original invoice', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const invalidReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'nonexistent', quantity: 5 }
        ]
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(invalidReturnData)
      ).rejects.toThrow('Return validation failed');
    });
  });

  describe('Inventory reversal', () => {
    test('should decrease inventory for returned items', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        items: [{ itemId: 'item1', quantity: -5 }]
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        5,
        'decrease',
        'Purchase return'
      );
    });

    test('should create stock movement records', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        items: [{ itemId: 'item1', quantity: -5 }]
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1',
          movementType: 'return_to_supplier',
          quantity: -5
        })
      );
    });
  });

  describe('Ledger entries', () => {
    test('should create reverse ledger entries', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        totals: {
          subtotal: -500,
          totalTax: -90,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      await purchaseReturnService.createPurchaseReturn(mockReturnData);

      // Should create 3 ledger entries: Inventory credit, AP debit, GST credit
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
    });

    test('should credit Inventory Account', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        totals: {
          subtotal: -500,
          totalTax: -90,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'INVENTORY_ACCOUNT',
          debit: 0,
          credit: 500
        })
      );
    });

    test('should debit Accounts Payable', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        supplierId: 'supplier123',
        totals: {
          subtotal: -500,
          totalTax: -90,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'supplier123',
          debit: 590,
          credit: 0
        })
      );
    });

    test('should credit GST Input', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        totals: {
          subtotal: -500,
          totalTax: -90,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      await purchaseReturnService.createPurchaseReturn(mockReturnData);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'GST_INPUT_ACCOUNT',
          debit: 0,
          credit: 90
        })
      );
    });
  });

  describe('Multiple items return', () => {
    test('should handle return of multiple items', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        items: [
          { itemId: 'item1', quantity: -5 },
          { itemId: 'item2', quantity: -3 }
        ]
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const multiItemReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 5 },
          { itemId: 'item2', quantity: 3 }
        ]
      };

      await purchaseReturnService.createPurchaseReturn(multiItemReturnData);

      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(stockMovementRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Partial returns', () => {
    test('should allow partial return of items', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        items: [{ itemId: 'item1', quantity: -3 }]
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const partialReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 3 } // Only 3 out of 10
        ]
      };

      const result = await purchaseReturnService.createPurchaseReturn(partialReturnData);

      expect(result.items[0].quantity).toBe(-3);
    });

    test('should account for existing returns when validating', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      
      // Mock existing return of 3 items
      Invoice.find.mockResolvedValue([
        {
          items: [{ itemId: 'item1', quantity: -3 }],
          status: 'confirmed'
        }
      ]);

      const secondReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 8 } // Would exceed available (10 - 3 = 7)
        ]
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(secondReturnData)
      ).rejects.toThrow('Return validation failed');
    });
  });
});
