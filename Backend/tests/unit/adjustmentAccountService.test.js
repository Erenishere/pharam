const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const adjustmentAccountService = require('../../src/services/adjustmentAccountService');
const Account = require('../../src/models/Account');
const Invoice = require('../../src/models/Invoice');
const LedgerEntry = require('../../src/models/LedgerEntry');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');

/**
 * Unit Tests for Adjustment Account Service
 * Tests for Requirement 11.2, 11.3, 11.4 - Tasks 44.2, 44.3, 44.4
 */
describe('Adjustment Account Service', () => {
  let mongoServer;
  let testAdjustmentAccount;
  let testClaimAccount;
  let testCustomer;
  let testItem;
  let testInventoryAccount;
  let testReceivableAccount;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await Invoice.deleteMany({});
    await Account.deleteMany({});
    await LedgerEntry.deleteMany({});
    await Customer.deleteMany({});
    await Item.deleteMany({});

    // Create test accounts
    testInventoryAccount = await Account.create({
      name: 'Inventory',
      code: 'INV-001',
      type: 'asset',
      category: 'current_asset',
      isActive: true,
      balance: 0,
    });

    testReceivableAccount = await Account.create({
      name: 'Accounts Receivable',
      code: 'AR-001',
      type: 'asset',
      category: 'current_asset',
      isActive: true,
      balance: 0,
    });

    testAdjustmentAccount = await Account.create({
      name: 'Discount Adjustment',
      code: 'ADJ-001',
      type: 'expense',
      category: 'operating_expense',
      isActive: true,
      balance: 0,
    });

    testClaimAccount = await Account.create({
      name: 'Promotional Claims',
      code: 'CLAIM-001',
      type: 'expense',
      category: 'operating_expense',
      isActive: true,
      balance: 0,
    });

    // Create test customer
    testCustomer = await Customer.create({
      name: 'Test Customer',
      code: 'CUST001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@test.com',
      address: '123 Test St',
      city: 'Test City',
      isActive: true,
      accountId: testReceivableAccount._id,
    });

    // Create test item
    testItem = await Item.create({
      name: 'Test Item',
      code: 'ITEM001',
      category: 'Electronics',
      unit: 'pcs',
      purchasePrice: 100,
      salePrice: 150,
      currentStock: 100,
      reorderLevel: 10,
      inventoryAccountId: testInventoryAccount._id,
    });
  });

  describe('createAdjustmentEntries', () => {
    it('should create adjustment entry for discount', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-001',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Percent: 10,
            discount1Amount: 150,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      const entries = await adjustmentAccountService.createAdjustmentEntries(invoice);

      expect(entries).toHaveLength(1);
      expect(entries[0].accountId.toString()).toBe(testAdjustmentAccount._id.toString());
      expect(entries[0].debit).toBe(150);
      expect(entries[0].credit).toBe(0);
      expect(entries[0].transactionType).toBe('adjustment');
    });

    it('should create claim entry for scheme', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-002',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            scheme2Quantity: 2,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
        claimAccountId: testClaimAccount._id,
      });

      const entries = await adjustmentAccountService.createAdjustmentEntries(invoice);

      expect(entries).toHaveLength(1);
      expect(entries[0].accountId.toString()).toBe(testClaimAccount._id.toString());
      expect(entries[0].debit).toBe(300); // 2 * 150
      expect(entries[0].credit).toBe(0);
      expect(entries[0].transactionType).toBe('scheme_claim');
    });

    it('should create both adjustment and claim entries', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-003',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
            scheme2Quantity: 2,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
        adjustmentAccountId: testAdjustmentAccount._id,
        claimAccountId: testClaimAccount._id,
      });

      const entries = await adjustmentAccountService.createAdjustmentEntries(invoice);

      expect(entries).toHaveLength(2);
      expect(entries[0].transactionType).toBe('adjustment');
      expect(entries[1].transactionType).toBe('scheme_claim');
    });

    it('should handle multiple discounts on items', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-004',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
            discount2Amount: 50,
          },
        ],
        subtotal: 1500,
        totalAmount: 1300,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      const entries = await adjustmentAccountService.createAdjustmentEntries(invoice);

      expect(entries).toHaveLength(1);
      expect(entries[0].debit).toBe(200); // 150 + 50
    });

    it('should not create entries if no adjustment account', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-005',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
      });

      const entries = await adjustmentAccountService.createAdjustmentEntries(invoice);

      expect(entries).toHaveLength(0);
    });

    it('should throw error if adjustment account not found', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-006',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
        adjustmentAccountId: new mongoose.Types.ObjectId(),
      });

      await expect(adjustmentAccountService.createAdjustmentEntries(invoice)).rejects.toThrow(
        'Adjustment account not found'
      );
    });

    it('should throw error if adjustment account is inactive', async () => {
      testAdjustmentAccount.isActive = false;
      await testAdjustmentAccount.save();

      const invoice = await Invoice.create({
        invoiceNumber: 'INV-007',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      await expect(adjustmentAccountService.createAdjustmentEntries(invoice)).rejects.toThrow(
        'is not active'
      );
    });
  });

  describe('getAdjustmentAccountReport', () => {
    beforeEach(async () => {
      // Create test invoices and entries
      const invoice1 = await Invoice.create({
        invoiceNumber: 'INV-010',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      await adjustmentAccountService.createAdjustmentEntries(invoice1);

      const invoice2 = await Invoice.create({
        invoiceNumber: 'INV-011',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-20'),
        items: [
          {
            itemId: testItem._id,
            quantity: 5,
            unitPrice: 150,
            lineTotal: 750,
            discount1Amount: 75,
          },
        ],
        subtotal: 750,
        totalAmount: 675,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      await adjustmentAccountService.createAdjustmentEntries(invoice2);
    });

    it('should generate adjustment account report', async () => {
      const report = await adjustmentAccountService.getAdjustmentAccountReport(
        testAdjustmentAccount._id
      );

      expect(report.reportType).toBe('adjustment_account');
      expect(report.account.name).toBe('Discount Adjustment');
      expect(report.summary.totalEntries).toBe(2);
      expect(report.summary.totalDebit).toBe(225); // 150 + 75
      expect(report.summary.balance).toBe(225);
      expect(report.entries).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      const report = await adjustmentAccountService.getAdjustmentAccountReport(
        testAdjustmentAccount._id,
        {
          startDate: '2024-01-18',
          endDate: '2024-01-25',
        }
      );

      expect(report.summary.totalEntries).toBe(1);
      expect(report.entries[0].invoiceNumber).toBe('INV-011');
    });

    it('should throw error if account not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        adjustmentAccountService.getAdjustmentAccountReport(fakeId)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('reconcileAdjustments', () => {
    beforeEach(async () => {
      // Create invoices with entries
      const invoice1 = await Invoice.create({
        invoiceNumber: 'INV-020',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Amount: 150,
          },
        ],
        subtotal: 1500,
        totalAmount: 1350,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      await adjustmentAccountService.createAdjustmentEntries(invoice1);

      // Create invoice without entries (unmatched)
      await Invoice.create({
        invoiceNumber: 'INV-021',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-20'),
        items: [
          {
            itemId: testItem._id,
            quantity: 5,
            unitPrice: 150,
            lineTotal: 750,
            discount1Amount: 75,
          },
        ],
        subtotal: 750,
        totalAmount: 675,
        adjustmentAccountId: testAdjustmentAccount._id,
      });
    });

    it('should reconcile adjustments', async () => {
      const report = await adjustmentAccountService.reconcileAdjustments(
        testAdjustmentAccount._id
      );

      expect(report.reportType).toBe('adjustment_reconciliation');
      expect(report.summary.totalInvoices).toBe(2);
      expect(report.summary.matchedInvoices).toBe(1);
      expect(report.summary.unmatchedInvoices).toBe(1);
      expect(report.matched).toHaveLength(1);
      expect(report.unmatched).toHaveLength(1);
    });

    it('should identify unmatched invoices', async () => {
      const report = await adjustmentAccountService.reconcileAdjustments(
        testAdjustmentAccount._id
      );

      expect(report.unmatched[0].invoiceNumber).toBe('INV-021');
      expect(report.unmatched[0].reason).toBe('No ledger entry found');
    });

    it('should filter by date range', async () => {
      const report = await adjustmentAccountService.reconcileAdjustments(
        testAdjustmentAccount._id,
        {
          startDate: '2024-01-18',
          endDate: '2024-01-25',
        }
      );

      expect(report.summary.totalInvoices).toBe(1);
      expect(report.summary.unmatchedInvoices).toBe(1);
    });
  });
});
