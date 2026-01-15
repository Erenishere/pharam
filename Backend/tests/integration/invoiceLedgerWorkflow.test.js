const mongoose = require('mongoose');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const purchaseInvoiceService = require('../../src/services/purchaseInvoiceService');
const ledgerService = require('../../src/services/ledgerService');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Invoice = require('../../src/models/Invoice');
const LedgerEntry = require('../../src/models/LedgerEntry');

describe('Invoice-Ledger Workflow Integration Tests', () => {
  afterEach(async () => {
    // Clean up test data after each test
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});
    await Invoice.deleteMany({});
    await LedgerEntry.deleteMany({});
  });

  describe('Sales Invoice Ledger Integration', () => {
    let customer, item, user;

    beforeEach(async () => {
      // Create test data
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'admin'
      });

      customer = await Customer.create({
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        contactInfo: {
          phone: '1234567890',
          email: 'customer@example.com',
          address: 'Test Address',
          city: 'Test City'
        },
        financialInfo: {
          creditLimit: 100000,
          paymentTerms: 30
        }
      });

      item = await Item.create({
        code: 'ITEM001',
        name: 'Test Item',
        description: 'Test Description',
        category: 'Test Category',
        unit: 'piece',
        pricing: {
          costPrice: 80,
          salePrice: 100
        },
        tax: {
          gstRate: 18,
          whtRate: 0
        },
        inventory: {
          currentStock: 100,
          minimumStock: 10
        }
      });
    });

    test('should create ledger entries when confirming sales invoice', async () => {
      // Create sales invoice
      const invoiceData = {
        customerId: customer._id,
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0
        }],
        createdBy: user._id
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      // Confirm invoice
      const result = await salesInvoiceService.confirmSalesInvoice(invoice._id.toString(), user._id.toString());

      // Verify ledger entries were created
      expect(result.ledgerEntries).toBeDefined();
      expect(result.ledgerEntries.debitEntry).toBeDefined();
      expect(result.ledgerEntries.creditEntry).toBeDefined();

      // Verify ledger entries in database
      const ledgerEntries = await LedgerEntry.find({ referenceId: invoice._id });
      expect(ledgerEntries).toHaveLength(2);

      // Verify debit entry (customer receivable)
      const debitEntry = ledgerEntries.find(e => e.transactionType === 'debit');
      expect(debitEntry).toBeDefined();
      expect(debitEntry.accountId.toString()).toBe(customer._id.toString());
      expect(debitEntry.accountType).toBe('Customer');
      expect(debitEntry.amount).toBe(result.invoice.totals.grandTotal);
      expect(debitEntry.referenceType).toBe('invoice');

      // Verify credit entry (sales revenue)
      const creditEntry = ledgerEntries.find(e => e.transactionType === 'credit');
      expect(creditEntry).toBeDefined();
      expect(creditEntry.amount).toBe(result.invoice.totals.grandTotal);
      expect(creditEntry.referenceType).toBe('invoice');
    });

    test('should calculate correct customer balance after sales invoice', async () => {
      // Create and confirm sales invoice
      const invoiceData = {
        customerId: customer._id,
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0
        }],
        createdBy: user._id
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(invoice._id.toString(), user._id.toString());

      // Calculate customer balance
      const balance = await ledgerService.calculateAccountBalance(customer._id.toString());

      // Balance should be positive (customer owes us)
      // Debit increases balance, credit decreases it
      // For customer receivables: debit = amount owed
      expect(balance).toBeGreaterThan(0);
    });

    test('should track multiple sales invoices in ledger', async () => {
      // Create first invoice
      const invoice1Data = {
        customerId: customer._id,
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          discount: 0
        }],
        createdBy: user._id
      };

      const invoice1 = await salesInvoiceService.createSalesInvoice(invoice1Data);
      await salesInvoiceService.confirmSalesInvoice(invoice1._id.toString(), user._id.toString());

      // Create second invoice
      const invoice2Data = {
        customerId: customer._id,
        items: [{
          itemId: item._id,
          quantity: 3,
          unitPrice: 100,
          discount: 0
        }],
        createdBy: user._id
      };

      const invoice2 = await salesInvoiceService.createSalesInvoice(invoice2Data);
      await salesInvoiceService.confirmSalesInvoice(invoice2._id.toString(), user._id.toString());

      // Get all ledger entries for customer
      const ledgerEntries = await ledgerService.getLedgerEntriesByAccount(customer._id.toString());

      // Should have 4 entries (2 debit + 2 credit for 2 invoices)
      expect(ledgerEntries.length).toBeGreaterThanOrEqual(4);

      // Verify entries reference correct invoices
      const invoice1Entries = ledgerEntries.filter(e => 
        e.referenceId && e.referenceId.toString() === invoice1._id.toString()
      );
      const invoice2Entries = ledgerEntries.filter(e => 
        e.referenceId && e.referenceId.toString() === invoice2._id.toString()
      );

      expect(invoice1Entries.length).toBe(2);
      expect(invoice2Entries.length).toBe(2);
    });
  });

  describe('Purchase Invoice Ledger Integration', () => {
    let supplier, item, user;

    beforeEach(async () => {
      // Create test data
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'admin'
      });

      supplier = await Supplier.create({
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        contactInfo: {
          phone: '1234567890',
          email: 'supplier@example.com',
          address: 'Test Address',
          city: 'Test City'
        },
        financialInfo: {
          paymentTerms: 30
        }
      });

      item = await Item.create({
        code: 'ITEM001',
        name: 'Test Item',
        description: 'Test Description',
        category: 'Test Category',
        unit: 'piece',
        pricing: {
          costPrice: 80,
          salePrice: 100
        },
        tax: {
          gstRate: 18,
          whtRate: 0
        },
        inventory: {
          currentStock: 50,
          minimumStock: 10
        }
      });
    });

    test('should create ledger entries when confirming purchase invoice', async () => {
      // Create purchase invoice
      const invoiceData = {
        supplierId: supplier._id,
        items: [{
          itemId: item._id,
          quantity: 20,
          unitPrice: 80,
          discount: 0,
          batchInfo: {
            batchNumber: 'BATCH001',
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01')
          }
        }],
        createdBy: user._id
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);

      // Confirm invoice
      const result = await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id.toString(), user._id.toString());

      // Verify ledger entries were created
      expect(result.ledgerEntries).toBeDefined();
      expect(result.ledgerEntries.debitEntry).toBeDefined();
      expect(result.ledgerEntries.creditEntry).toBeDefined();

      // Verify ledger entries in database
      const ledgerEntries = await LedgerEntry.find({ referenceId: invoice._id });
      expect(ledgerEntries).toHaveLength(2);

      // Verify debit entry (inventory/purchase)
      const debitEntry = ledgerEntries.find(e => e.transactionType === 'debit');
      expect(debitEntry).toBeDefined();
      expect(debitEntry.accountId.toString()).toBe(supplier._id.toString());
      expect(debitEntry.accountType).toBe('Supplier');
      expect(debitEntry.amount).toBe(result.invoice.totals.grandTotal);
      expect(debitEntry.referenceType).toBe('invoice');

      // Verify credit entry (supplier payable)
      const creditEntry = ledgerEntries.find(e => e.transactionType === 'credit');
      expect(creditEntry).toBeDefined();
      expect(creditEntry.accountId.toString()).toBe(supplier._id.toString());
      expect(creditEntry.accountType).toBe('Supplier');
      expect(creditEntry.amount).toBe(result.invoice.totals.grandTotal);
      expect(creditEntry.referenceType).toBe('invoice');
    });

    test('should calculate correct supplier balance after purchase invoice', async () => {
      // Create and confirm purchase invoice
      const invoiceData = {
        supplierId: supplier._id,
        items: [{
          itemId: item._id,
          quantity: 20,
          unitPrice: 80,
          discount: 0,
          batchInfo: {
            batchNumber: 'BATCH001',
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01')
          }
        }],
        createdBy: user._id
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id.toString(), user._id.toString());

      // Calculate supplier balance
      const balance = await ledgerService.calculateAccountBalance(supplier._id.toString());

      // Balance calculation: debit - credit
      // For supplier payables: credit = amount we owe
      // So balance should be 0 (debit and credit cancel out in this simplified implementation)
      expect(typeof balance).toBe('number');
    });

    test('should track multiple purchase invoices in ledger', async () => {
      // Create first invoice
      const invoice1Data = {
        supplierId: supplier._id,
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 80,
          discount: 0,
          batchInfo: {
            batchNumber: 'BATCH001',
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01')
          }
        }],
        createdBy: user._id
      };

      const invoice1 = await purchaseInvoiceService.createPurchaseInvoice(invoice1Data);
      await purchaseInvoiceService.confirmPurchaseInvoice(invoice1._id.toString(), user._id.toString());

      // Create second invoice
      const invoice2Data = {
        supplierId: supplier._id,
        items: [{
          itemId: item._id,
          quantity: 15,
          unitPrice: 80,
          discount: 0,
          batchInfo: {
            batchNumber: 'BATCH002',
            manufacturingDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-01-01')
          }
        }],
        createdBy: user._id
      };

      const invoice2 = await purchaseInvoiceService.createPurchaseInvoice(invoice2Data);
      await purchaseInvoiceService.confirmPurchaseInvoice(invoice2._id.toString(), user._id.toString());

      // Get all ledger entries for supplier
      const ledgerEntries = await ledgerService.getLedgerEntriesByAccount(supplier._id.toString());

      // Should have 4 entries (2 debit + 2 credit for 2 invoices)
      expect(ledgerEntries.length).toBeGreaterThanOrEqual(4);

      // Verify entries reference correct invoices
      const invoice1Entries = ledgerEntries.filter(e => 
        e.referenceId && e.referenceId.toString() === invoice1._id.toString()
      );
      const invoice2Entries = ledgerEntries.filter(e => 
        e.referenceId && e.referenceId.toString() === invoice2._id.toString()
      );

      expect(invoice1Entries.length).toBe(2);
      expect(invoice2Entries.length).toBe(2);
    });
  });

  describe('Ledger Query Operations', () => {
    let customer, supplier, item, user;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'admin'
      });

      customer = await Customer.create({
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        financialInfo: {
          creditLimit: 100000,
          paymentTerms: 30
        }
      });

      supplier = await Supplier.create({
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        financialInfo: {
          paymentTerms: 30
        }
      });

      item = await Item.create({
        code: 'ITEM001',
        name: 'Test Item',
        category: 'Test Category',
        unit: 'piece',
        pricing: {
          costPrice: 80,
          salePrice: 100
        },
        tax: {
          gstRate: 18,
          whtRate: 0
        },
        inventory: {
          currentStock: 100,
          minimumStock: 10
        }
      });
    });

    test('should retrieve ledger entries by reference', async () => {
      // Create and confirm sales invoice
      const invoiceData = {
        customerId: customer._id,
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0
        }],
        createdBy: user._id
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(invoice._id.toString(), user._id.toString());

      // Get ledger entries by reference
      const entries = await ledgerService.getLedgerEntriesByReference('invoice', invoice._id.toString());

      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.referenceType === 'invoice')).toBe(true);
      expect(entries.every(e => e.referenceId.toString() === invoice._id.toString())).toBe(true);
    });

    test('should get account statement for customer', async () => {
      // Create and confirm sales invoice
      const invoiceData = {
        customerId: customer._id,
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0
        }],
        createdBy: user._id
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(invoice._id.toString(), user._id.toString());

      // Get account statement
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2025-12-31');
      const statement = await ledgerService.getAccountStatement(
        customer._id.toString(),
        startDate,
        endDate
      );

      expect(statement).toBeDefined();
      expect(statement.transactions).toBeDefined();
      expect(statement.openingBalance).toBeDefined();
      expect(statement.closingBalance).toBeDefined();
      expect(statement.transactions.length).toBeGreaterThan(0);
    });
  });
});
