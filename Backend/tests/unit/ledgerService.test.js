const ledgerService = require('../../src/services/ledgerService');
const ledgerRepository = require('../../src/repositories/ledgerRepository');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');

// Mock the repository and models
jest.mock('../../src/repositories/ledgerRepository');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Supplier');

describe('Ledger Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLedgerEntry', () => {
    test('should create a ledger entry with valid data', async () => {
      const entryData = {
        accountId: 'account123',
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'invoice',
        referenceId: 'invoice123',
        createdBy: 'user123',
      };

      const mockCustomer = { _id: 'account123', isActive: true };
      Customer.findById.mockResolvedValue(mockCustomer);

      const mockEntry = { ...entryData, _id: 'entry123' };
      ledgerRepository.create.mockResolvedValue(mockEntry);

      const result = await ledgerService.createLedgerEntry(entryData);

      expect(Customer.findById).toHaveBeenCalledWith('account123');
      expect(ledgerRepository.create).toHaveBeenCalledWith(entryData);
      expect(result).toEqual(mockEntry);
    });

    test('should throw error if account ID is missing', async () => {
      const entryData = {
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'invoice',
        createdBy: 'user123',
      };

      await expect(ledgerService.createLedgerEntry(entryData)).rejects.toThrow('Account ID is required');
    });

    test('should throw error if amount is zero or negative', async () => {
      const entryData = {
        accountId: 'account123',
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 0,
        description: 'Test entry',
        referenceType: 'invoice',
        createdBy: 'user123',
      };

      await expect(ledgerService.createLedgerEntry(entryData)).rejects.toThrow('Amount must be greater than 0');
    });

    test('should throw error if customer is not active', async () => {
      const entryData = {
        accountId: 'account123',
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'invoice',
        createdBy: 'user123',
      };

      const mockCustomer = { _id: 'account123', isActive: false };
      Customer.findById.mockResolvedValue(mockCustomer);

      await expect(ledgerService.createLedgerEntry(entryData)).rejects.toThrow('Customer is not active');
    });

    test('should throw error if customer not found', async () => {
      const entryData = {
        accountId: 'account123',
        accountType: 'Customer',
        transactionType: 'debit',
        amount: 1000,
        description: 'Test entry',
        referenceType: 'invoice',
        createdBy: 'user123',
      };

      Customer.findById.mockResolvedValue(null);

      await expect(ledgerService.createLedgerEntry(entryData)).rejects.toThrow('Customer not found');
    });
  });

  describe('createDoubleEntry', () => {
    test('should create double entry with valid data', async () => {
      const debitAccount = { accountId: 'customer123', accountType: 'Customer' };
      const creditAccount = { accountId: 'supplier123', accountType: 'Supplier' };
      const amount = 5000;
      const description = 'Payment transaction';
      const referenceType = 'payment';
      const referenceId = 'payment123';
      const createdBy = 'user123';

      const mockCustomer = { _id: 'customer123', isActive: true };
      const mockSupplier = { _id: 'supplier123', isActive: true };

      Customer.findById.mockResolvedValue(mockCustomer);
      Supplier.findById.mockResolvedValue(mockSupplier);

      const mockResult = {
        debitEntry: { _id: 'debit123', ...debitAccount, amount },
        creditEntry: { _id: 'credit123', ...creditAccount, amount },
      };

      ledgerRepository.createDoubleEntry.mockResolvedValue(mockResult);

      const result = await ledgerService.createDoubleEntry(
        debitAccount,
        creditAccount,
        amount,
        description,
        referenceType,
        referenceId,
        createdBy
      );

      expect(Customer.findById).toHaveBeenCalledWith('customer123');
      expect(Supplier.findById).toHaveBeenCalledWith('supplier123');
      expect(ledgerRepository.createDoubleEntry).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    test('should throw error if debit account is invalid', async () => {
      const debitAccount = null;
      const creditAccount = { accountId: 'supplier123', accountType: 'Supplier' };

      await expect(
        ledgerService.createDoubleEntry(debitAccount, creditAccount, 1000, 'Test', 'payment', 'ref123', 'user123')
      ).rejects.toThrow('Valid debit account details are required');
    });

    test('should throw error if amount is invalid', async () => {
      const debitAccount = { accountId: 'customer123', accountType: 'Customer' };
      const creditAccount = { accountId: 'supplier123', accountType: 'Supplier' };

      await expect(
        ledgerService.createDoubleEntry(debitAccount, creditAccount, -100, 'Test', 'payment', 'ref123', 'user123')
      ).rejects.toThrow('Amount must be greater than 0');
    });
  });

  describe('calculateAccountBalance', () => {
    test('should calculate account balance', async () => {
      const accountId = 'account123';
      const asOfDate = new Date('2024-12-31');
      const mockBalance = 15000;

      ledgerRepository.calculateAccountBalance.mockResolvedValue(mockBalance);

      const result = await ledgerService.calculateAccountBalance(accountId, asOfDate);

      expect(ledgerRepository.calculateAccountBalance).toHaveBeenCalledWith(accountId, asOfDate);
      expect(result).toBe(mockBalance);
    });
  });

  describe('getAccountStatement', () => {
    test('should get account statement with valid parameters', async () => {
      const accountId = 'account123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockStatement = {
        openingBalance: 10000,
        transactions: [
          { _id: 'txn1', amount: 5000, transactionType: 'debit', runningBalance: 15000 },
          { _id: 'txn2', amount: 2000, transactionType: 'credit', runningBalance: 13000 },
        ],
        closingBalance: 13000,
      };

      ledgerRepository.getAccountStatement.mockResolvedValue(mockStatement);

      const result = await ledgerService.getAccountStatement(accountId, startDate, endDate);

      expect(ledgerRepository.getAccountStatement).toHaveBeenCalledWith(accountId, startDate, endDate);
      expect(result).toEqual(mockStatement);
    });

    test('should throw error if account ID is missing', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await expect(ledgerService.getAccountStatement(null, startDate, endDate)).rejects.toThrow(
        'Account ID is required'
      );
    });

    test('should throw error if start date is after end date', async () => {
      const accountId = 'account123';
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      await expect(ledgerService.getAccountStatement(accountId, startDate, endDate)).rejects.toThrow(
        'Start date must be before end date'
      );
    });
  });

  describe('getAllLedgerEntries', () => {
    test('should get paginated ledger entries', async () => {
      const filters = { accountType: 'Customer' };
      const options = { page: 1, limit: 10 };

      const mockEntries = [
        { _id: 'entry1', amount: 1000 },
        { _id: 'entry2', amount: 2000 },
      ];

      ledgerRepository.search.mockResolvedValue(mockEntries);
      ledgerRepository.count.mockResolvedValue(25);

      const result = await ledgerService.getAllLedgerEntries(filters, options);

      expect(result.entries).toEqual(mockEntries);
      expect(result.pagination.totalItems).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });

  describe('getTrialBalance', () => {
    test('should get trial balance', async () => {
      const asOfDate = new Date('2024-12-31');

      const mockTrialBalance = [
        {
          accountId: { _id: 'acc1', name: 'Account 1' },
          accountType: 'Customer',
          debitTotal: 10000,
          creditTotal: 5000,
          balance: 5000,
        },
        {
          accountId: { _id: 'acc2', name: 'Account 2' },
          accountType: 'Supplier',
          debitTotal: 3000,
          creditTotal: 8000,
          balance: -5000,
        },
      ];

      ledgerRepository.getTrialBalance.mockResolvedValue(mockTrialBalance);

      const result = await ledgerService.getTrialBalance(asOfDate);

      expect(result.asOfDate).toEqual(asOfDate);
      expect(result.accounts).toEqual(mockTrialBalance);
      expect(result.totals.totalDebits).toBe(13000);
      expect(result.totals.totalCredits).toBe(13000);
      expect(result.totals.difference).toBe(0);
    });
  });

  describe('reverseLedgerEntries', () => {
    test('should reverse ledger entries', async () => {
      const referenceType = 'invoice';
      const referenceId = 'invoice123';
      const reason = 'Invoice cancelled';
      const createdBy = 'user123';

      const mockOriginalEntries = [
        {
          _id: 'entry1',
          accountId: 'account1',
          accountType: 'Customer',
          transactionType: 'debit',
          amount: 1000,
          description: 'Original entry',
          currency: 'PKR',
          exchangeRate: 1,
        },
        {
          _id: 'entry2',
          accountId: 'account2',
          accountType: 'Supplier',
          transactionType: 'credit',
          amount: 1000,
          description: 'Original entry',
          currency: 'PKR',
          exchangeRate: 1,
        },
      ];

      ledgerRepository.findByReference.mockResolvedValue(mockOriginalEntries);

      const mockCustomer = { _id: 'account1', isActive: true };
      const mockSupplier = { _id: 'account2', isActive: true };

      Customer.findById.mockResolvedValue(mockCustomer);
      Supplier.findById.mockResolvedValue(mockSupplier);

      const mockReversalEntry = { _id: 'reversal1', transactionType: 'credit', amount: 1000 };
      ledgerRepository.create.mockResolvedValue(mockReversalEntry);

      const result = await ledgerService.reverseLedgerEntries(referenceType, referenceId, reason, createdBy);

      expect(ledgerRepository.findByReference).toHaveBeenCalledWith(referenceType, referenceId);
      expect(result).toHaveLength(2);
    });

    test('should throw error if no entries found', async () => {
      ledgerRepository.findByReference.mockResolvedValue([]);

      await expect(
        ledgerService.reverseLedgerEntries('invoice', 'invoice123', 'Test', 'user123')
      ).rejects.toThrow('No ledger entries found for the given reference');
    });
  });

  describe('getLedgerSummaryByAccountType', () => {
    test('should get ledger summary by account type', async () => {
      const accountType = 'Customer';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockSummary = [
        { _id: 'debit', totalAmount: 50000, count: 10 },
        { _id: 'credit', totalAmount: 30000, count: 5 },
      ];

      ledgerRepository.getSummaryByAccountType.mockResolvedValue(mockSummary);

      const result = await ledgerService.getLedgerSummaryByAccountType(accountType, startDate, endDate);

      expect(result.accountType).toBe(accountType);
      expect(result.totalDebits).toBe(50000);
      expect(result.totalCredits).toBe(30000);
      expect(result.netBalance).toBe(20000);
      expect(result.debitCount).toBe(10);
      expect(result.creditCount).toBe(5);
    });

    test('should throw error if account type is missing', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await expect(ledgerService.getLedgerSummaryByAccountType(null, startDate, endDate)).rejects.toThrow(
        'Account type is required'
      );
    });
  });
});
