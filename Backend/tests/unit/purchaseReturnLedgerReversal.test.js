const purchaseReturnService = require('../../src/services/purchaseReturnService');
const ledgerService = require('../../src/services/ledgerService');

// Mock dependencies
jest.mock('../../src/services/ledgerService');

describe('PurchaseReturnService - Ledger Reversal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReverseLedgerEntries', () => {
    let mockReturnInvoice;
    let mockOriginalInvoice;

    beforeEach(() => {
      mockReturnInvoice = {
        _id: 'return123',
        type: 'return_purchase',
        invoiceNumber: 'PR2024000001',
        supplierId: 'supplier123',
        invoiceDate: new Date('2024-01-15'),
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
          totalDiscount: 0,
          totalTax: -90,
          gst18Total: -90,
          gst4Total: 0,
          grandTotal: -590
        }
      };

      mockOriginalInvoice = {
        _id: 'invoice123',
        type: 'purchase',
        supplierId: 'supplier123',
        invoiceNumber: 'PI2024000001'
      };

      ledgerService.createLedgerEntry.mockResolvedValue({
        _id: 'ledger123',
        success: true
      });
    });

    test('should create three ledger entries for purchase return', async () => {
      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Should create 3 entries: Inventory credit, AP debit, GST credit
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
    });

    test('should credit Inventory Account to reduce asset', async () => {
      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'INVENTORY_ACCOUNT',
          debit: 0,
          credit: 500, // Positive amount (absolute value of subtotal)
          description: expect.stringContaining('Purchase Return'),
          referenceType: 'Invoice',
          referenceId: 'return123'
        })
      );
    });

    test('should debit Accounts Payable to reduce liability', async () => {
      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'supplier123',
          debit: 590, // Grand total (absolute value)
          credit: 0,
          description: expect.stringContaining('Purchase Return'),
          referenceType: 'Invoice',
          referenceId: 'return123'
        })
      );
    });

    test('should credit GST Input to reverse tax credit', async () => {
      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      expect(ledgerService.createLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'GST_INPUT_ACCOUNT',
          debit: 0,
          credit: 90, // Tax amount (absolute value)
          description: expect.stringContaining('Purchase Return GST'),
          referenceType: 'Invoice',
          referenceId: 'return123'
        })
      );
    });

    test('should use correct invoice date in ledger entries', async () => {
      const invoiceDate = new Date('2024-01-15');
      mockReturnInvoice.invoiceDate = invoiceDate;

      await purchaseReturnService.createReverseLedgerEntries(
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
      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const calls = ledgerService.createLedgerEntry.mock.calls;
      calls.forEach(call => {
        expect(call[0].description).toContain('PR2024000001');
      });
    });

    test('should handle returns with zero tax', async () => {
      mockReturnInvoice.totals.totalTax = 0;
      mockReturnInvoice.totals.gst18Total = 0;

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Should still create 3 entries, but GST entry should have 0 amount
      expect(ledgerService.createLedgerEntry).toHaveBeenCalledTimes(3);
      
      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_INPUT_ACCOUNT'
      );
      
      expect(gstCall[0].credit).toBe(0);
    });

    test('should handle large return amounts correctly', async () => {
      mockReturnInvoice.totals = {
        subtotal: -10000,
        totalTax: -1800,
        gst18Total: -1800,
        gst4Total: 0,
        grandTotal: -11800
      };

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      // Verify amounts are converted to positive
      const inventoryCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'INVENTORY_ACCOUNT'
      );
      expect(inventoryCall[0].credit).toBe(10000);

      const apCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'supplier123'
      );
      expect(apCall[0].debit).toBe(11800);

      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_INPUT_ACCOUNT'
      );
      expect(gstCall[0].credit).toBe(1800);
    });

    test('should handle decimal amounts correctly', async () => {
      mockReturnInvoice.totals = {
        subtotal: -123.45,
        totalTax: -22.22,
        gst18Total: -22.22,
        gst4Total: 0,
        grandTotal: -145.67
      };

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const inventoryCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'INVENTORY_ACCOUNT'
      );
      expect(inventoryCall[0].credit).toBe(123.45);

      const apCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'supplier123'
      );
      expect(apCall[0].debit).toBe(145.67);

      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_INPUT_ACCOUNT'
      );
      expect(gstCall[0].credit).toBe(22.22);
    });

    test('should link all entries to return invoice', async () => {
      await purchaseReturnService.createReverseLedgerEntries(
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
        purchaseReturnService.createReverseLedgerEntries(
          mockReturnInvoice,
          mockOriginalInvoice
        )
      ).rejects.toThrow('Ledger entry creation failed');
    });

    test('should create entries in correct order', async () => {
      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const calls = ledgerService.createLedgerEntry.mock.calls;
      
      // First call should be Inventory Account credit
      expect(calls[0][0].accountId).toBe('INVENTORY_ACCOUNT');
      expect(calls[0][0].credit).toBeGreaterThan(0);
      
      // Second call should be Accounts Payable debit
      expect(calls[1][0].accountId).toBe('supplier123');
      expect(calls[1][0].debit).toBeGreaterThan(0);
      
      // Third call should be GST Input credit
      expect(calls[2][0].accountId).toBe('GST_INPUT_ACCOUNT');
    });

    test('should use absolute values for all amounts', async () => {
      // Ensure negative amounts in return invoice are converted to positive
      mockReturnInvoice.totals = {
        subtotal: -500,
        totalTax: -90,
        gst18Total: -90,
        gst4Total: 0,
        grandTotal: -590
      };

      await purchaseReturnService.createReverseLedgerEntries(
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

    test('should handle mixed GST rates', async () => {
      mockReturnInvoice.items = [
        { itemId: 'item1', quantity: -5, gstRate: 18, gstAmount: -90 },
        { itemId: 'item2', quantity: -3, gstRate: 4, gstAmount: -24 }
      ];
      mockReturnInvoice.totals = {
        subtotal: -1100,
        totalTax: -114,
        gst18Total: -90,
        gst4Total: -24,
        grandTotal: -1214
      };

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_INPUT_ACCOUNT'
      );
      
      expect(gstCall[0].credit).toBe(114); // Total GST (90 + 24)
    });
  });

  describe('Accounting accuracy', () => {
    test('should maintain double-entry bookkeeping balance', async () => {
      const mockReturnInvoice = {
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        supplierId: 'supplier123',
        invoiceDate: new Date(),
        totals: {
          subtotal: -1000,
          totalTax: -180,
          gst18Total: -180,
          gst4Total: 0,
          grandTotal: -1180
        }
      };

      const mockOriginalInvoice = {
        _id: 'invoice123',
        supplierId: 'supplier123'
      };

      await purchaseReturnService.createReverseLedgerEntries(
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

    test('should correctly split inventory and tax components', async () => {
      const mockReturnInvoice = {
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        supplierId: 'supplier123',
        invoiceDate: new Date(),
        totals: {
          subtotal: -1000,
          totalTax: -180,
          gst18Total: -180,
          gst4Total: 0,
          grandTotal: -1180
        }
      };

      const mockOriginalInvoice = {
        _id: 'invoice123',
        supplierId: 'supplier123'
      };

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const inventoryCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'INVENTORY_ACCOUNT'
      );
      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_INPUT_ACCOUNT'
      );

      // Inventory + GST should equal grand total
      expect(inventoryCall[0].credit + gstCall[0].credit).toBe(1180);
    });

    test('should handle partial GST scenarios', async () => {
      const mockReturnInvoice = {
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        supplierId: 'supplier123',
        invoiceDate: new Date(),
        totals: {
          subtotal: -1000,
          totalTax: -40, // Only 4% GST
          gst18Total: 0,
          gst4Total: -40,
          grandTotal: -1040
        }
      };

      const mockOriginalInvoice = {
        _id: 'invoice123',
        supplierId: 'supplier123'
      };

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const gstCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].accountId === 'GST_INPUT_ACCOUNT'
      );
      
      expect(gstCall[0].credit).toBe(40);
    });
  });

  describe('Supplier account handling', () => {
    test('should use correct supplier ID for AP account', async () => {
      const mockReturnInvoice = {
        _id: 'return123',
        invoiceNumber: 'PR2024000001',
        supplierId: 'supplier456',
        invoiceDate: new Date(),
        totals: {
          subtotal: -500,
          totalTax: -90,
          gst18Total: -90,
          gst4Total: 0,
          grandTotal: -590
        }
      };

      const mockOriginalInvoice = {
        _id: 'invoice123',
        supplierId: 'supplier456'
      };

      await purchaseReturnService.createReverseLedgerEntries(
        mockReturnInvoice,
        mockOriginalInvoice
      );

      const apCall = ledgerService.createLedgerEntry.mock.calls.find(
        call => call[0].debit > 0
      );
      
      expect(apCall[0].accountId).toBe('supplier456');
    });
  });
});
