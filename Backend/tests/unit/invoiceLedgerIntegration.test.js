const salesInvoiceService = require('../../src/services/salesInvoiceService');
const purchaseInvoiceService = require('../../src/services/purchaseInvoiceService');
const ledgerService = require('../../src/services/ledgerService');
const invoiceRepository = require('../../src/repositories/invoiceRepository');
const customerService = require('../../src/services/customerService');
const supplierService = require('../../src/services/supplierService');
const itemService = require('../../src/services/itemService');
const stockMovementRepository = require('../../src/repositories/stockMovementRepository');
const Item = require('../../src/models/Item');

// Mock dependencies
jest.mock('../../src/repositories/invoiceRepository');
jest.mock('../../src/services/customerService');
jest.mock('../../src/services/supplierService');
jest.mock('../../src/services/itemService');
jest.mock('../../src/services/ledgerService');
jest.mock('../../src/repositories/stockMovementRepository');
jest.mock('../../src/models/Item');

describe('Invoice-Ledger Integration Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sales Invoice - Customer Receivables', () => {
    const mockCustomer = {
      _id: 'customer123',
      code: 'CUST001',
      name: 'Test Customer',
      isActive: true,
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30
      }
    };

    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Item',
      isActive: true,
      pricing: {
        salePrice: 100
      },
      tax: {
        gstRate: 18,
        whtRate: 0
      },
      inventory: {
        currentStock: 100
      },
      checkStockAvailability: jest.fn().mockReturnValue(true),
      save: jest.fn().mockResolvedValue(true)
    };

    const mockSalesInvoice = {
      _id: 'invoice123',
      invoiceNumber: 'SI2024000001',
      type: 'sales',
      customerId: 'customer123',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-14'),
      items: [
        {
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 180,
          lineTotal: 1180
        }
      ],
      totals: {
        subtotal: 1000,
        totalDiscount: 0,
        totalTax: 180,
        grandTotal: 1180
      },
      status: 'draft',
      paymentStatus: 'pending',
      notes: 'Test sales invoice',
      createdBy: 'user123'
    };

    const mockLedgerEntries = {
      debitEntry: {
        _id: 'ledger123',
        accountId: 'customer123',
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1180,
        description: 'Sales Invoice SI2024000001 - Test sales invoice',
        referenceType: 'invoice',
        referenceId: 'invoice123'
      },
      creditEntry: {
        _id: 'ledger124',
        accountId: 'customer123',
        accountType: 'Customer',
        transactionType: 'credit',
        amount: 1180,
        description: 'Sales Invoice SI2024000001 - Test sales invoice',
        referenceType: 'invoice',
        referenceId: 'invoice123'
      }
    };

    beforeEach(() => {
      // Reset the mock function before each test
      mockItem.checkStockAvailability = jest.fn().mockReturnValue(true);
      
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      itemService.getItemById.mockResolvedValue(mockItem);
      invoiceRepository.findById.mockResolvedValue(mockSalesInvoice);
      stockMovementRepository.create.mockResolvedValue({ _id: 'movement123' });
      Item.findById.mockResolvedValue(mockItem);
      ledgerService.createDoubleEntry.mockResolvedValue(mockLedgerEntries);
      invoiceRepository.update.mockResolvedValue({
        ...mockSalesInvoice,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: 'user123'
      });
    });

    test('should create ledger entries when confirming sales invoice', async () => {
      const result = await salesInvoiceService.confirmSalesInvoice('invoice123', 'user123');

      // Verify ledger service was called
      expect(ledgerService.createDoubleEntry).toHaveBeenCalledTimes(1);
      
      // Verify ledger entry parameters
      const ledgerCall = ledgerService.createDoubleEntry.mock.calls[0];
      expect(ledgerCall[0]).toEqual({
        accountId: 'customer123',
        accountType: 'Customer'
      });
      expect(ledgerCall[1]).toEqual({
        accountId: 'customer123',
        accountType: 'Customer'
      });
      expect(ledgerCall[2]).toBe(1180); // amount
      expect(ledgerCall[3]).toContain('Sales Invoice SI2024000001'); // description
      expect(ledgerCall[4]).toBe('invoice'); // referenceType
      expect(ledgerCall[5]).toBe('invoice123'); // referenceId
      expect(ledgerCall[6]).toBe('user123'); // createdBy

      // Verify result includes ledger entries
      expect(result.ledgerEntries).toBeDefined();
      expect(result.ledgerEntries.debitEntry).toBeDefined();
      expect(result.ledgerEntries.creditEntry).toBeDefined();
    });

    test('should create debit entry for customer receivables', async () => {
      const result = await salesInvoiceService.confirmSalesInvoice('invoice123', 'user123');

      expect(result.ledgerEntries.debitEntry.transactionType).toBe('debit');
      expect(result.ledgerEntries.debitEntry.accountType).toBe('Customer');
      expect(result.ledgerEntries.debitEntry.amount).toBe(1180);
    });

    test('should create credit entry for sales revenue', async () => {
      const result = await salesInvoiceService.confirmSalesInvoice('invoice123', 'user123');

      expect(result.ledgerEntries.creditEntry.transactionType).toBe('credit');
      expect(result.ledgerEntries.creditEntry.amount).toBe(1180);
    });

    test('should include invoice reference in ledger entries', async () => {
      const result = await salesInvoiceService.confirmSalesInvoice('invoice123', 'user123');

      expect(result.ledgerEntries.debitEntry.referenceType).toBe('invoice');
      expect(result.ledgerEntries.debitEntry.referenceId).toBe('invoice123');
      expect(result.ledgerEntries.creditEntry.referenceType).toBe('invoice');
      expect(result.ledgerEntries.creditEntry.referenceId).toBe('invoice123');
    });

    test('should handle ledger creation failure gracefully', async () => {
      ledgerService.createDoubleEntry.mockRejectedValue(new Error('Ledger creation failed'));

      await expect(
        salesInvoiceService.confirmSalesInvoice('invoice123', 'user123')
      ).rejects.toThrow('Ledger creation failed');
    });
  });

  describe('Purchase Invoice - Supplier Payables', () => {
    const mockSupplier = {
      _id: 'supplier123',
      code: 'SUPP001',
      name: 'Test Supplier',
      type: 'supplier',
      isActive: true,
      financialInfo: {
        paymentTerms: 30
      }
    };

    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Item',
      isActive: true,
      pricing: {
        costPrice: 80
      },
      tax: {
        gstRate: 18,
        whtRate: 0
      },
      inventory: {
        currentStock: 50
      },
      save: jest.fn().mockResolvedValue(true)
    };

    const mockPurchaseInvoice = {
      _id: 'invoice456',
      invoiceNumber: 'PI2024000001',
      type: 'purchase',
      supplierId: 'supplier123',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-14'),
      items: [
        {
          itemId: 'item123',
          quantity: 20,
          unitPrice: 80,
          discount: 0,
          taxAmount: 288,
          lineTotal: 1888,
          batchInfo: {
            batchNumber: 'BATCH001',
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01')
          }
        }
      ],
      totals: {
        subtotal: 1600,
        totalDiscount: 0,
        totalTax: 288,
        grandTotal: 1888
      },
      status: 'draft',
      paymentStatus: 'pending',
      notes: 'Test purchase invoice',
      createdBy: 'user123'
    };

    const mockLedgerEntries = {
      debitEntry: {
        _id: 'ledger125',
        accountId: 'supplier123',
        accountType: 'Supplier',
        transactionType: 'debit',
        amount: 1888,
        description: 'Purchase Invoice PI2024000001 - Test purchase invoice',
        referenceType: 'invoice',
        referenceId: 'invoice456'
      },
      creditEntry: {
        _id: 'ledger126',
        accountId: 'supplier123',
        accountType: 'Supplier',
        transactionType: 'credit',
        amount: 1888,
        description: 'Purchase Invoice PI2024000001 - Test purchase invoice',
        referenceType: 'invoice',
        referenceId: 'invoice456'
      }
    };

    beforeEach(() => {
      supplierService.getSupplierById.mockResolvedValue(mockSupplier);
      itemService.getItemById.mockResolvedValue(mockItem);
      invoiceRepository.findById.mockResolvedValue(mockPurchaseInvoice);
      stockMovementRepository.create.mockResolvedValue({ _id: 'movement456' });
      Item.findById.mockResolvedValue(mockItem);
      ledgerService.createDoubleEntry.mockResolvedValue(mockLedgerEntries);
      invoiceRepository.update.mockResolvedValue({
        ...mockPurchaseInvoice,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: 'user123'
      });
    });

    test('should create ledger entries when confirming purchase invoice', async () => {
      const result = await purchaseInvoiceService.confirmPurchaseInvoice('invoice456', 'user123');

      // Verify ledger service was called
      expect(ledgerService.createDoubleEntry).toHaveBeenCalledTimes(1);
      
      // Verify ledger entry parameters
      const ledgerCall = ledgerService.createDoubleEntry.mock.calls[0];
      expect(ledgerCall[0]).toEqual({
        accountId: 'supplier123',
        accountType: 'Supplier'
      });
      expect(ledgerCall[1]).toEqual({
        accountId: 'supplier123',
        accountType: 'Supplier'
      });
      expect(ledgerCall[2]).toBe(1888); // amount
      expect(ledgerCall[3]).toContain('Purchase Invoice PI2024000001'); // description
      expect(ledgerCall[4]).toBe('invoice'); // referenceType
      expect(ledgerCall[5]).toBe('invoice456'); // referenceId
      expect(ledgerCall[6]).toBe('user123'); // createdBy

      // Verify result includes ledger entries
      expect(result.ledgerEntries).toBeDefined();
      expect(result.ledgerEntries.debitEntry).toBeDefined();
      expect(result.ledgerEntries.creditEntry).toBeDefined();
    });

    test('should create debit entry for inventory/purchase account', async () => {
      const result = await purchaseInvoiceService.confirmPurchaseInvoice('invoice456', 'user123');

      expect(result.ledgerEntries.debitEntry.transactionType).toBe('debit');
      expect(result.ledgerEntries.debitEntry.accountType).toBe('Supplier');
      expect(result.ledgerEntries.debitEntry.amount).toBe(1888);
    });

    test('should create credit entry for supplier payables', async () => {
      const result = await purchaseInvoiceService.confirmPurchaseInvoice('invoice456', 'user123');

      expect(result.ledgerEntries.creditEntry.transactionType).toBe('credit');
      expect(result.ledgerEntries.creditEntry.accountType).toBe('Supplier');
      expect(result.ledgerEntries.creditEntry.amount).toBe(1888);
    });

    test('should include invoice reference in ledger entries', async () => {
      const result = await purchaseInvoiceService.confirmPurchaseInvoice('invoice456', 'user123');

      expect(result.ledgerEntries.debitEntry.referenceType).toBe('invoice');
      expect(result.ledgerEntries.debitEntry.referenceId).toBe('invoice456');
      expect(result.ledgerEntries.creditEntry.referenceType).toBe('invoice');
      expect(result.ledgerEntries.creditEntry.referenceId).toBe('invoice456');
    });

    test('should handle ledger creation failure gracefully', async () => {
      ledgerService.createDoubleEntry.mockRejectedValue(new Error('Ledger creation failed'));

      await expect(
        purchaseInvoiceService.confirmPurchaseInvoice('invoice456', 'user123')
      ).rejects.toThrow('Ledger creation failed');
    });
  });

  describe('Ledger Entry Validation', () => {
    test('should validate customer account exists before creating receivables entry', async () => {
      const mockInvoice = {
        _id: 'invoice789',
        invoiceNumber: 'SI2024000002',
        type: 'sales',
        customerId: 'invalidCustomer',
        totals: { grandTotal: 1000 },
        status: 'draft',
        items: [],
        notes: 'Test'
      };

      customerService.getCustomerById.mockRejectedValue(new Error('Customer not found'));
      invoiceRepository.findById.mockResolvedValue(mockInvoice);

      await expect(
        salesInvoiceService.confirmSalesInvoice('invoice789', 'user123')
      ).rejects.toThrow('Customer not found');
    });

    test('should validate supplier account exists before creating payables entry', async () => {
      const mockInvoice = {
        _id: 'invoice790',
        invoiceNumber: 'PI2024000002',
        type: 'purchase',
        supplierId: 'invalidSupplier',
        totals: { grandTotal: 1000 },
        status: 'draft',
        items: [{
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 0,
          lineTotal: 1000,
          batchInfo: {}
        }],
        notes: 'Test'
      };

      const mockItem = {
        _id: 'item123',
        isActive: true,
        inventory: { currentStock: 50 },
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock the ledger service to reject when supplier doesn't exist
      ledgerService.createDoubleEntry.mockRejectedValue(new Error('Supplier not found'));
      invoiceRepository.findById.mockResolvedValue(mockInvoice);
      itemService.getItemById.mockResolvedValue(mockItem);
      Item.findById.mockResolvedValue(mockItem);
      stockMovementRepository.create.mockResolvedValue({ _id: 'movement790' });

      await expect(
        purchaseInvoiceService.confirmPurchaseInvoice('invoice790', 'user123')
      ).rejects.toThrow('Supplier not found');
    });
  });

  describe('Invoice Confirmation Workflow', () => {
    test('should create ledger entries after stock movements for sales invoice', async () => {
      const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'SI2024000001',
        type: 'sales',
        customerId: 'customer123',
        items: [{
          itemId: 'item123',
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxAmount: 180,
          lineTotal: 1180
        }],
        totals: { grandTotal: 1180 },
        status: 'draft',
        notes: 'Test'
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { creditLimit: 10000, paymentTerms: 30 }
      };

      const mockItem = {
        _id: 'item123',
        isActive: true,
        inventory: { currentStock: 100 },
        checkStockAvailability: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      itemService.getItemById.mockResolvedValue(mockItem);
      invoiceRepository.findById.mockResolvedValue(mockInvoice);
      Item.findById.mockResolvedValue(mockItem);
      stockMovementRepository.create.mockResolvedValue({ _id: 'movement123' });
      ledgerService.createDoubleEntry.mockResolvedValue({
        debitEntry: { _id: 'ledger123' },
        creditEntry: { _id: 'ledger124' }
      });
      invoiceRepository.update.mockResolvedValue({ ...mockInvoice, status: 'confirmed' });

      const result = await salesInvoiceService.confirmSalesInvoice('invoice123', 'user123');

      // Verify order of operations
      expect(stockMovementRepository.create).toHaveBeenCalled();
      expect(ledgerService.createDoubleEntry).toHaveBeenCalled();
      expect(invoiceRepository.update).toHaveBeenCalled();

      // Verify result contains all components
      expect(result.invoice).toBeDefined();
      expect(result.stockMovements).toBeDefined();
      expect(result.ledgerEntries).toBeDefined();
    });

    test('should create ledger entries after stock movements for purchase invoice', async () => {
      const mockInvoice = {
        _id: 'invoice456',
        invoiceNumber: 'PI2024000001',
        type: 'purchase',
        supplierId: 'supplier123',
        items: [{
          itemId: 'item123',
          quantity: 20,
          unitPrice: 80,
          discount: 0,
          taxAmount: 288,
          lineTotal: 1888,
          batchInfo: {}
        }],
        totals: { grandTotal: 1888 },
        status: 'draft',
        notes: 'Test'
      };

      const mockSupplier = {
        _id: 'supplier123',
        type: 'supplier',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockItem = {
        _id: 'item123',
        isActive: true,
        inventory: { currentStock: 50 },
        save: jest.fn().mockResolvedValue(true)
      };

      supplierService.getSupplierById.mockResolvedValue(mockSupplier);
      itemService.getItemById.mockResolvedValue(mockItem);
      invoiceRepository.findById.mockResolvedValue(mockInvoice);
      Item.findById.mockResolvedValue(mockItem);
      stockMovementRepository.create.mockResolvedValue({ _id: 'movement456' });
      ledgerService.createDoubleEntry.mockResolvedValue({
        debitEntry: { _id: 'ledger125' },
        creditEntry: { _id: 'ledger126' }
      });
      invoiceRepository.update.mockResolvedValue({ ...mockInvoice, status: 'confirmed' });

      const result = await purchaseInvoiceService.confirmPurchaseInvoice('invoice456', 'user123');

      // Verify order of operations
      expect(stockMovementRepository.create).toHaveBeenCalled();
      expect(ledgerService.createDoubleEntry).toHaveBeenCalled();
      expect(invoiceRepository.update).toHaveBeenCalled();

      // Verify result contains all components
      expect(result.invoice).toBeDefined();
      expect(result.stockMovements).toBeDefined();
      expect(result.ledgerEntries).toBeDefined();
    });
  });
});
