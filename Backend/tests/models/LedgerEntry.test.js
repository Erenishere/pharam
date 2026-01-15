const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const LedgerEntry = require('../../src/models/LedgerEntry');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');

describe('LedgerEntry Model', () => {
  let mongoServer;
  let customer, user;

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
    await LedgerEntry.deleteMany({});
    await Customer.deleteMany({});
    await User.deleteMany({});

    // Create test data
    customer = await Customer.create({
      name: 'Test Customer',
      type: 'customer'
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid ledger entry', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Sales invoice payment',
        referenceType: 'invoice',
        referenceId: new mongoose.Types.ObjectId(),
        transactionDate: new Date(),
        currency: 'PKR',
        exchangeRate: 1,
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      const savedEntry = await entry.save();

      expect(savedEntry.accountId.toString()).toBe(customer._id.toString());
      expect(savedEntry.accountType).toBe('Customer');
      expect(savedEntry.transactionType).toBe('debit');
      expect(savedEntry.amount).toBe(1000);
    });

    it('should require accountId', async () => {
      const entryData = {
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow('Account ID is required');
    });

    it('should validate account type enum', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'InvalidType',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow();
    });

    it('should validate transaction type enum', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'invalid_type',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow();
    });

    it('should require positive amount', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 0,
        description: 'Test entry',
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow('Amount must be greater than 0');
    });

    it('should require referenceId for invoice transactions', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Invoice entry',
        referenceType: 'invoice',
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    it('should calculate base amount', () => {
      const entry = new LedgerEntry({
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'adjustment',
        currency: 'USD',
        exchangeRate: 280,
        createdBy: user._id
      });

      expect(entry.baseAmount).toBe(280000); // 1000 * 280
    });

    it('should calculate signed amount', () => {
      const debitEntry = new LedgerEntry({
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(debitEntry.signedAmount).toBe(1000);

      const creditEntry = new LedgerEntry({
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'credit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(creditEntry.signedAmount).toBe(-1000);
    });
  });

  describe('Instance Methods', () => {
    let entry;

    beforeEach(async () => {
      entry = new LedgerEntry({
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Sales invoice',
        referenceType: 'invoice',
        referenceId: new mongoose.Types.ObjectId(),
        createdBy: user._id
      });
      await entry.save();
    });

    it('should get transaction description', () => {
      expect(entry.getTransactionDescription()).toBe('Invoice transaction');

      entry.referenceType = 'payment';
      expect(entry.getTransactionDescription()).toBe('Payment received/made');

      entry.referenceType = 'unknown_type';
      expect(entry.getTransactionDescription()).toBe('Unknown transaction');
    });

    it('should create reverse entry', () => {
      const reverseEntry = entry.createReverseEntry('Correction needed');
      
      expect(reverseEntry.accountId.toString()).toBe(entry.accountId.toString());
      expect(reverseEntry.accountType).toBe(entry.accountType);
      expect(reverseEntry.transactionType).toBe('credit'); // Opposite of original debit
      expect(reverseEntry.amount).toBe(entry.amount);
      expect(reverseEntry.description).toContain('Correction needed');
      expect(reverseEntry.referenceType).toBe('adjustment');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();

      await LedgerEntry.create([
        {
          accountId: customer._id,
          accountType: 'Customer',
          transactionType: 'debit',
          amount: 1000,
          description: 'Opening balance',
          referenceType: 'opening_balance',
          transactionDate: yesterday,
          createdBy: user._id
        },
        {
          accountId: customer._id,
          accountType: 'Customer',
          transactionType: 'credit',
          amount: 500,
          description: 'Payment received',
          referenceType: 'payment',
          referenceId: new mongoose.Types.ObjectId(),
          transactionDate: today,
          createdBy: user._id
        },
        {
          accountId: customer._id,
          accountType: 'Customer',
          transactionType: 'debit',
          amount: 750,
          description: 'New invoice',
          referenceType: 'invoice',
          referenceId: new mongoose.Types.ObjectId(),
          transactionDate: today,
          createdBy: user._id
        }
      ]);
    });

    it('should find entries by account', async () => {
      const entries = await LedgerEntry.findByAccount(customer._id);
      expect(entries).toHaveLength(3);
      expect(entries[0].transactionDate).toBeInstanceOf(Date);
    });

    it('should calculate account balance', async () => {
      const balance = await LedgerEntry.calculateAccountBalance(customer._id);
      expect(balance).toBe(1250); // 1000 - 500 + 750
    });

    it('should find entries by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const entries = await LedgerEntry.findByDateRange(yesterday, tomorrow);
      expect(entries).toHaveLength(3);

      const todayEntries = await LedgerEntry.findByDateRange(today, tomorrow);
      expect(todayEntries).toHaveLength(2);
    });

    it('should find entries by reference', async () => {
      const invoiceEntries = await LedgerEntry.findByReference('invoice');
      expect(invoiceEntries).toHaveLength(1);

      const paymentEntries = await LedgerEntry.findByReference('payment');
      expect(paymentEntries).toHaveLength(1);
    });

    it('should get account statement', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const statement = await LedgerEntry.getAccountStatement(customer._id, today, tomorrow);
      
      expect(statement.openingBalance).toBe(1000); // Balance as of start of today
      expect(statement.transactions).toHaveLength(2); // Today's transactions
      expect(statement.closingBalance).toBe(1250); // Final balance
      
      // Check running balance calculation
      expect(statement.transactions[1].runningBalance).toBe(1250);
    });

    it('should create double entry', async () => {
      const debitAccount = { accountId: customer._id, accountType: 'Customer' };
      const creditAccount = { accountId: user._id, accountType: 'User' };
      
      await LedgerEntry.createDoubleEntry(
        debitAccount,
        creditAccount,
        500,
        'Test double entry',
        'adjustment',
        null,
        user._id
      );

      const debitEntries = await LedgerEntry.find({
        accountId: customer._id,
        transactionType: 'debit',
        amount: 500
      });
      expect(debitEntries).toHaveLength(1);

      const creditEntries = await LedgerEntry.find({
        accountId: user._id,
        transactionType: 'credit',
        amount: 500
      });
      expect(creditEntries).toHaveLength(1);
    });
  });

  describe('Pre-save Validation', () => {
    it('should validate transaction date is not in future', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Future entry',
        referenceType: 'adjustment',
        transactionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow('Transaction date cannot be in the future');
    });

    it('should validate amount is positive', async () => {
      const entryData = {
        accountId: customer._id,
        accountType: 'Customer',
        transactionType: 'debit',
        amount: -100,
        description: 'Negative amount',
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const entry = new LedgerEntry(entryData);
      await expect(entry.save()).rejects.toThrow('Amount must be greater than zero');
    });
  });
});