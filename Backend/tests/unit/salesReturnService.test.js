const salesReturnService = require('../../src/services/salesReturnService');
const Invoice = require('../../src/models/Invoice');
const inventoryService = require('../../src/services/inventoryService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');
const ledgerService = require('../../src/services/ledgerService');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/services/inventoryService');
jest.mock('../../src/repositories/stockMovementRepository');
jest.mock('../../src/services/ledgerService');

describe('SalesReturnService - createSalesReturn', () => {
  let mockOriginalInvoice;
  let mockReturnData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock original sales invoice
    mockOriginalInvoice = {
      _id: 'invoice123',
      type: 'sales',
      customerId: 'customer123',
      invoiceNumber: 'SI2024000001',
      items: [
        {
          itemId: 'item1',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 180,
          lineTotal: 1180
        },
        {
          itemId: 'item2',
          quantity: 5,
          unitPrice: 200,
          discount: 0,
          taxAmount: 180,
          lineTotal: 1180
        }
      ],
      totals: {
        subtotal: 1500,
        totalDiscount: 0,
        totalTax: 360,
        grandTotal: 1860
      }
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
    test('should create sales return invoice with negative quantities', async () => {
      // Mock Invoice.findById to return original invoice
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);

      // Mock Invoice.find to return no existing returns
      Invoice.find.mockResolvedValue([]);

      // Mock Invoice constructor and save
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        type: 'return_sales',
        customerId: 'customer123',
        originalInvoiceId: 'invoice123',
        items: [
          {
            itemId: 'item1',
            quantity: -5,
            unitPrice: 100,
            taxAmount: -90,
            lineTotal: -590
          }
        ],
        totals: {
          subtotal: -500,
          totalDiscount: 0,
          totalTax: -90,
          grandTotal: -590
        }
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      // Mock inventory and ledger services
      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      // Execute
      const result = await salesReturnService.createSalesReturn(mockReturnData);

      // Verify
      expect(Invoice.findById).toHaveBeenCalledWith('invoice123');
      expect(mockSave).toHaveBeenCalled();
      expect(result.type).toBe('return_sales');
      expect(result.originalInvoiceId).toBe('invoice123');
    });

    test('should calculate negative totals correctly', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
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

      const result = await salesReturnService.createSalesReturn(mockReturnData);

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

      const result = await salesReturnService.createSalesReturn(mockReturnData);

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

      const result = await salesReturnService.createSalesReturn(mockReturnData);

      expect(result.returnMetadata.returnReason).toBe('damaged');
      expect(result.returnMetadata.returnNotes).toBe('Product damaged during shipping');
    });
  });

  describe('Validation errors', () => {
    test('should throw error if original invoice not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      await expect(
        salesReturnService.createSalesReturn(mockReturnData)
      ).rejects.toThrow('Original invoice not found');
    });

    test('should throw error if original invoice is not sales type', async () => {
      const purchaseInvoice = { ...mockOriginalInvoice, type: 'purchase' };
      Invoice.findById.mockResolvedValue(purchaseInvoice);

      await expect(
        salesReturnService.createSalesReturn(mockReturnData)
      ).rejects.toThrow('Can only create returns for sales invoices');
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
        salesReturnService.createSalesReturn(invalidReturnData)
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
        salesReturnService.createSalesReturn(invalidReturnData)
      ).rejects.toThrow('Return validation failed');
    });
  });

  describe('Inventory reversal', () => {
    test('should increase inventory for returned items', async () => {
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

      await salesReturnService.createSalesReturn(mockReturnData);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'item1',
        5,
        'increase',
        'Sales return'
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

      await salesReturnService.createSalesReturn(mockReturnData);

      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item1',
          movementType: 'return_from_customer',
          quantity: 5
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
        invoiceNumber: 'SR2024000001',
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

      await salesReturnService.createSalesReturn(mockReturnData);

      // Should create 3 ledger entries: Sales debit, AR credit, GST debit
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
    });

    test('should debit Sales Account to reduce revenue', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'SR2024000001',
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

      await salesReturnService.createSalesReturn(mockReturnData);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'SALES_ACCOUNT',
          debit: 500,
          credit: 0
        })
      );
    });

    test('should credit Accounts Receivable to reduce asset', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'SR2024000001',
        customerId: 'customer123',
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

      await salesReturnService.createSalesReturn(mockReturnData);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'customer123',
          debit: 0,
          credit: 590
        })
      );
    });

    test('should debit GST Output to reverse tax liability', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const mockSave = jest.fn().mockResolvedValue({
        _id: 'return123',
        invoiceNumber: 'SR2024000001',
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

      await salesReturnService.createSalesReturn(mockReturnData);

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'GST_OUTPUT_ACCOUNT',
          debit: 90,
          credit: 0
        })
      );
    });
  });

  describe('Multiple items return', () => {
    test('should handle return of multiple items', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const multiItemReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 5 },
          { itemId: 'item2', quantity: 3 }
        ]
      };

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

      await salesReturnService.createSalesReturn(multiItemReturnData);

      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(stockMovementRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Partial returns', () => {
    test('should allow partial return of items', async () => {
      Invoice.findById.mockResolvedValue(mockOriginalInvoice);
      Invoice.find.mockResolvedValue([]);

      const partialReturnData = {
        ...mockReturnData,
        returnItems: [
          { itemId: 'item1', quantity: 3 } // Only 3 out of 10
        ]
      };

      const mockSave = jest.fn().mockResolvedValue({
        items: [{ itemId: 'item1', quantity: -3 }]
      });

      Invoice.mockImplementation(() => ({
        save: mockSave
      }));

      inventoryService.adjustInventory.mockResolvedValue(true);
      stockMovementRepository.create.mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const result = await salesReturnService.createSalesReturn(partialReturnData);

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
        salesReturnService.createSalesReturn(secondReturnData)
      ).rejects.toThrow('Return validation failed');
    });
  });
});
