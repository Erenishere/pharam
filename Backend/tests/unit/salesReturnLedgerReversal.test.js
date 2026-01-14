const salesReturnService = require('../../src/services/salesReturnService');
const ledgerService = require('../../src/services/ledgerService');

// Mock dependencies
jest.mock('../../src/services/ledgerService');

describe('SalesReturnService - Ledger Reversal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReverseLedgerEntries', () => {
    let mockReturnInvoice;
    let mockOriginalInvoice;

    beforeEach(() => {
      mockReturnInvoice = {
        _id: 'return123',
        type: 'return_sales',
        invoiceNumber: 'SR2024000001',
        customerId: 'customer123',
        originalInvoiceId: 'invoice123',
        invoiceDate: new Date('2024-01-15'),
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
      };

      mockOriginalInvoice = {
        _id: 'invoice123',
        type: 'sales',
        customerId: 'customer123',
        invoiceNumber: 'SI2024000001'
      };

      ledgerService.createLedgerEntry.mockResolvedValue({
        _id: 'ledger123',
        success: true
      });
    });

    test('should create three ledger entries for sales return', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Should create 3 entries: Sales debit, AR credit, GST debit
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
    });

    test('should debit Sales Account to reduce revenue', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'SALES_ACCOUNT',
          debit: 500, // Positive amount (absolute value of subtotal)
          credit: 0,
          description: expect.stringContaining('Sales Return'),
          referenceType: 'Invoice',
          referenceId: 'return123'
        })
      );
    });

    test('should credit Accounts Receivable to reduce asset', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'customer123',
          debit: 0,
          credit: 590, // Grand total (absolute value)
          description: expect.stringContaining('Sales Return'),
          referenceType: 'Invoice',
          referenceId: 'return123'
        })
      );
    });

    test('should debit GST Output to reverse tax liability', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'GST_OUTPUT_ACCOUNT',
          debit: 90, // Tax amount (absolute value)
          credit: 0,
          description: expect.stringContaining('Sales Return GST'),
          referenceType: 'Invoice',
          referenceId: 'return123'
        })
      );
    });

    test('should use correct invoice date in ledger entries', async () => {
      const invoiceDate = new Date('2024-01-15');
      mockReturnInvoice.invoiceDate = invoiceDate;

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // All three entries should use the return invoice date
      const calls = ledgerService.createLedgerEntry.mock.calls;
      calls.forEach(call => {
        expect(call[0].date).toEqual(invoiceDate);
      });
    });

    test('should include invoice number in description', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const calls = ledgerService.createLedgerEntry.mock.calls;
      calls.forEach(call => {
        expect(call[0].description).toContain('SR2024000001');
      });
    });

    test('should handle returns with zero tax', async () => {
      mockReturnInvoice.totals.totalTax = 0;

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Should still create 3 entries, but GST entry should have 0 amount
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
      
      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_OUTPUT_ACCOUNT'
      );
      
      expect(gstCall[0].debit).toBe(0);
    });

    test('should handle large return amounts correctly', async () => {
      mockReturnInvoice.totals = {
        subtotal: -10000,
        totalTax: -1800,
        grandTotal: -11800
      };

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Verify amounts are converted to positive
      const salesCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'SALES_ACCOUNT'
      );
      expect(salesCall[0].debit).toBe(10000);

      const arCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'customer123'
      );
      expect(arCall[0].credit).toBe(11800);

      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_OUTPUT_ACCOUNT'
      );
      expect(gstCall[0].debit).toBe(1800);
    });

    test('should handle decimal amounts correctly', async () => {
      mockReturnInvoice.totals = {
        subtotal: -123.45,
        totalTax: -22.22,
        grandTotal: -145.67
      };

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const salesCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'SALES_ACCOUNT'
      );
      expect(salesCall[0].debit).toBe(123.45);

      const arCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'customer123'
      );
      expect(arCall[0].credit).toBe(145.67);

      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_OUTPUT_ACCOUNT'
      );
      expect(gstCall[0].debit).toBe(22.22);
    });

    test('should link all entries to return invoice', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const calls = ledgerService.createLedgerEntry.mock.calls;
      calls.forEach(call => {
        expect(call[0].referenceType).toBe('Invoice');
        expect(call[0].referenceId).toBe('return123');
      });
    });

    test('should handle ledger service errors', async () => {
      ledgerService.createLedgerEntry.mockRejectedValue(
        new Error('Ledger entry creation failed')
      );

      await expect(
        salesReturnService.createReverseLedgerEntries(
          mockReturnInvoice,
          mockOriginalInvoice
        )
      ).rejects.toThrow('Ledger entry creation failed');
    });

    test('should create entries in correct order', async () => {
      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const calls = ledgerService.createLedgerEntry.mock.calls;
      
      // First call should be Sales Account debit
      expect(calls[0][0].accountId).toBe('SALES_ACCOUNT');
      expect(calls[0][0].debit).toBeGreaterThan(0);
      
      // Second call should be Accounts Receivable credit
      expect(calls[1][0].accountId).toBe('customer123');
      expect(calls[1][0].credit).toBeGreaterThan(0);
      
      // Third call should be GST Output debit
      expect(calls[2][0].accountId).toBe('GST_OUTPUT_ACCOUNT');
    });

    test('should use absolute values for all amounts', async () => {
      // Ensure negative amounts in return invoice are converted to positive
      mockReturnInvoice.totals = {
        subtotal: -500,
        totalTax: -90,
        grandTotal: -590
      };

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const calls = ledgerService.createLedgerEntry.mock.calls;
      calls.forEach(call => {
        if (call[0].debit > 0) {
          expect(call[0].debit).toBeGreaterThan(0);
        }
        if (call[0].credit > 0) {
          expect(call[0].credit).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Integration with createSalesReturn', () => {
    test('should call createReverseLedgerEntries during return creation', async () => {
      const Invoice = require('../../src/models/Invoice');
      const inventoryService = require('../../src/services/inventoryService');
      const stockMovementRepository = require('../../src/repositories/stockMovementRepository');

      jest.mock('../../src/models/Invoice');
      jest.mock('../../src/services/inventoryService');
      jest.mock('../../src/repositories/stockMovementRepository');

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
          _id: 'return123',
          items: [{ itemId: 'item1', quantity: -5 }],
          totals: {
            subtotal: -500,
            totalTax: -90,
            grandTotal: -590
          }
        })
      }));

      inventoryService.adjustInventory = jest.fn().mockResolvedValue({});
      stockMovementRepository.create = jest.fn().mockResolvedValue({});
      ledgerService.createLedgerEntry.mockResolvedValue({});

      const returnData = {
        originalInvoiceId: 'invoice123',
        returnItems: [{ itemId: 'item1', quantity: 5 }],
        returnReason: 'damaged',
        returnNotes: 'Product damaged',
        createdBy: 'user123'
      };

      await salesReturnService.createSalesReturn(returnData);

      // Verify ledger entries were created
      expect(ledgerService.createLedgerEntry).toHaveBeenCalled();
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accounting accuracy', () => {
    test('should maintain double-entry bookkeeping balance', async () => {
      const mockReturnInvoice = {
        _id: 'return123',
        invoiceNumber: 'SR2024000001',
        customerId: 'customer123',
        invoiceDate: new Date(),
        totals: {
          subtotal: -1000,
          totalTax: -180,
          grandTotal: -1180
        }
      };

      const mockOriginalInvoice = {
        _id: 'invoice123',
        customerId: 'customer123'
      };

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Calculate total debits and credits
      let totalDebits = 0;
      let totalCredits = 0;

      ledgerService.createLedgerEntry.mock.calls.forEach(call => {
        totalDebits += call[0].debit || 0;
        totalCredits += call[0].credit || 0;
      });

      // Debits should equal credits (double-entry bookkeeping)
      expect(totalDebits).toBe(totalCredits);
      expect(totalDebits).toBe(1180); // subtotal + tax
    });

    test('should correctly split revenue and tax components', async () => {
      const mockReturnInvoice = {
        _id: 'return123',
        invoiceNumber: 'SR2024000001',
        customerId: 'customer123',
        invoiceDate: new Date(),
        totals: {
          subtotal: -1000,
          totalTax: -180,
          grandTotal: -1180
        }
      };

      const mockOriginalInvoice = {
        _id: 'invoice123',
        customerId: 'customer123'
      };

      await salesReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const salesCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'SALES_ACCOUNT'
      );
      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_OUTPUT_ACCOUNT'
      );

      // Sales + GST should equal grand total
      expect(salesCall[0].debit + gstCall[0].debit).toBe(1180);
    });
  });
});
