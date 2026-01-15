const bankReconciliationService = require('../../src/services/bankReconciliationService');
const BankReconciliation = require('../../src/models/BankReconciliation');
const CashReceipt = require('../../src/models/CashReceipt');
const CashPayment = require('../../src/models/CashPayment');
const cashBookService = require('../../src/services/cashBookService');

// Mock dependencies
jest.mock('../../src/models/BankReconciliation');
jest.mock('../../src/models/CashReceipt');
jest.mock('../../src/models/CashPayment');
jest.mock('../../src/services/cashBookService');

describe('Bank Reconciliation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBankReconciliation', () => {
    it('should create bank reconciliation with valid data', async () => {
      const reconciliationData = {
        bankAccount: {
          accountName: 'Business Account',
          accountNumber: '1234567890',
          bankName: 'ABC Bank',
        },
        statementPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
        openingBalance: {
          bookBalance: 10000,
          bankBalance: 10000,
        },
        closingBalance: {
          bookBalance: 15000,
          bankBalance: 15000,
        },
        createdBy: 'user123',
      };

      const mockReconciliation = {
        _id: 'recon123',
        reconciliationNumber: 'BR202401000001',
        ...reconciliationData,
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      cashBookService.getCashBookBalance = jest.fn().mockResolvedValue({ balance: 15000 });
      BankReconciliation.mockImplementation(() => mockReconciliation);

      const result = await bankReconciliationService.createBankReconciliation(reconciliationData);

      expect(mockReconciliation.save).toHaveBeenCalled();
      expect(mockReconciliation.populate).toHaveBeenCalledWith('createdBy', 'username email');
    });

    it('should throw error if bank account is missing', async () => {
      const reconciliationData = {
        statementPeriod: {
          startDate: new Date(),
          endDate: new Date(),
        },
        createdBy: 'user123',
      };

      await expect(
        bankReconciliationService.createBankReconciliation(reconciliationData)
      ).rejects.toThrow('Bank account information is required');
    });

    it('should throw error if statement period is missing', async () => {
      const reconciliationData = {
        bankAccount: {
          accountName: 'Test',
          accountNumber: '123',
          bankName: 'Bank',
        },
        createdBy: 'user123',
      };

      await expect(
        bankReconciliationService.createBankReconciliation(reconciliationData)
      ).rejects.toThrow('Statement period is required');
    });
  });

  describe('getBankReconciliationById', () => {
    it('should get bank reconciliation by ID', async () => {
      const mockReconciliation = {
        _id: 'recon123',
        reconciliationNumber: 'BR202401000001',
      };

      BankReconciliation.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockReconciliation),
        }),
      });

      const result = await bankReconciliationService.getBankReconciliationById('recon123');

      expect(BankReconciliation.findById).toHaveBeenCalledWith('recon123');
      expect(result).toEqual(mockReconciliation);
    });

    it('should throw error if reconciliation not found', async () => {
      BankReconciliation.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        bankReconciliationService.getBankReconciliationById('invalid')
      ).rejects.toThrow('Bank reconciliation not found');
    });
  });

  describe('getAllBankReconciliations', () => {
    it('should get all bank reconciliations with pagination', async () => {
      const mockReconciliations = [
        { _id: 'recon1', reconciliationNumber: 'BR202401000001' },
        { _id: 'recon2', reconciliationNumber: 'BR202401000002' },
      ];

      BankReconciliation.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReconciliations),
      });

      BankReconciliation.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await bankReconciliationService.getAllBankReconciliations(
        {},
        { page: 1, limit: 50 }
      );

      expect(result.reconciliations).toEqual(mockReconciliations);
      expect(result.pagination.totalItems).toBe(2);
    });

    it('should filter reconciliations by status', async () => {
      BankReconciliation.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      BankReconciliation.countDocuments = jest.fn().mockResolvedValue(0);

      await bankReconciliationService.getAllBankReconciliations({ status: 'completed' });

      expect(BankReconciliation.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  describe('matchTransactions', () => {
    it('should match transactions with bank statement', async () => {
      const mockReconciliation = {
        _id: 'recon123',
        status: 'draft',
        statementPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockReceipts = [
        {
          _id: 'receipt1',
          receiptNumber: 'CR2024000001',
          amount: 5000,
          receiptDate: new Date('2024-01-15'),
        },
      ];

      const mockPayments = [
        {
          _id: 'payment1',
          paymentNumber: 'CP2024000001',
          amount: 3000,
          paymentDate: new Date('2024-01-20'),
        },
      ];

      const bankStatementItems = [
        {
          type: 'credit',
          amount: 5000,
          date: new Date('2024-01-15'),
          reference: 'DEP001',
        },
        {
          type: 'debit',
          amount: 3000,
          date: new Date('2024-01-20'),
          reference: 'CHQ001',
        },
      ];

      BankReconciliation.findById = jest.fn().mockResolvedValue(mockReconciliation);
      CashReceipt.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReceipts),
      });
      CashPayment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPayments),
      });

      const result = await bankReconciliationService.matchTransactions(
        'recon123',
        bankStatementItems
      );

      expect(mockReconciliation.items.length).toBeGreaterThan(0);
      expect(mockReconciliation.save).toHaveBeenCalled();
    });

    it('should throw error if reconciliation not found', async () => {
      BankReconciliation.findById = jest.fn().mockResolvedValue(null);

      await expect(
        bankReconciliationService.matchTransactions('invalid', [])
      ).rejects.toThrow('Bank reconciliation not found');
    });

    it('should throw error if reconciliation is not draft', async () => {
      const mockReconciliation = {
        _id: 'recon123',
        status: 'completed',
      };

      BankReconciliation.findById = jest.fn().mockResolvedValue(mockReconciliation);

      await expect(
        bankReconciliationService.matchTransactions('recon123', [])
      ).rejects.toThrow('Can only match transactions for draft reconciliations');
    });
  });

  describe('completeBankReconciliation', () => {
    it('should complete bank reconciliation', async () => {
      const mockReconciliation = {
        _id: 'recon123',
        status: 'draft',
        complete: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      BankReconciliation.findById = jest.fn().mockResolvedValue(mockReconciliation);

      await bankReconciliationService.completeBankReconciliation('recon123');

      expect(mockReconciliation.complete).toHaveBeenCalled();
    });

    it('should throw error if reconciliation not found', async () => {
      BankReconciliation.findById = jest.fn().mockResolvedValue(null);

      await expect(
        bankReconciliationService.completeBankReconciliation('invalid')
      ).rejects.toThrow('Bank reconciliation not found');
    });
  });

  describe('approveBankReconciliation', () => {
    it('should approve bank reconciliation', async () => {
      const mockReconciliation = {
        _id: 'recon123',
        status: 'completed',
        approve: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      BankReconciliation.findById = jest.fn().mockResolvedValue(mockReconciliation);

      await bankReconciliationService.approveBankReconciliation('recon123', 'user123');

      expect(mockReconciliation.approve).toHaveBeenCalledWith('user123');
    });
  });

  describe('getReconciliationReport', () => {
    it('should generate reconciliation report', async () => {
      const mockReconciliation = {
        _id: 'recon123',
        reconciliationNumber: 'BR202401000001',
        bankAccount: {
          accountName: 'Business Account',
          accountNumber: '1234567890',
          bankName: 'ABC Bank',
        },
        reconciliationDate: new Date(),
        statementPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
        openingBalance: {
          bookBalance: 10000,
          bankBalance: 10000,
        },
        closingBalance: {
          bookBalance: 15000,
          bankBalance: 15000,
        },
        summary: {
          matchedItems: 10,
          unmatchedItems: 2,
          discrepancies: 1,
        },
        items: [
          { status: 'matched' },
          { status: 'matched' },
          { status: 'unmatched' },
          { status: 'discrepancy' },
        ],
        status: 'completed',
        isReconciled: false,
      };

      BankReconciliation.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockReconciliation),
        }),
      });

      const report = await bankReconciliationService.getReconciliationReport('recon123');

      expect(report).toHaveProperty('reconciliationNumber');
      expect(report).toHaveProperty('balances');
      expect(report).toHaveProperty('matchedItems');
      expect(report).toHaveProperty('unmatchedItems');
      expect(report).toHaveProperty('discrepancies');
      expect(report.matchedItems.length).toBe(2);
      expect(report.unmatchedItems.length).toBe(1);
      expect(report.discrepancies.length).toBe(1);
    });
  });

  describe('getReconciliationStatistics', () => {
    it('should get reconciliation statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      BankReconciliation.countDocuments = jest.fn().mockResolvedValue(5);
      BankReconciliation.aggregate = jest
        .fn()
        .mockResolvedValueOnce([
          { _id: 'draft', count: 2 },
          { _id: 'completed', count: 3 },
        ])
        .mockResolvedValueOnce([
          {
            _id: null,
            totalMatched: 50,
            totalUnmatched: 10,
            totalDiscrepancies: 5,
            totalDiscrepancyAmount: 500,
          },
        ]);

      const stats = await bankReconciliationService.getReconciliationStatistics(
        startDate,
        endDate
      );

      expect(stats.totalReconciliations).toBe(5);
      expect(stats.byStatus.draft).toBe(2);
      expect(stats.byStatus.completed).toBe(3);
      expect(stats.summary.totalMatched).toBe(50);
    });
  });
});
