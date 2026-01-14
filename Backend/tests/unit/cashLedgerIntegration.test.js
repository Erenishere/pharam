const cashReceiptService = require('../../src/services/cashReceiptService');
const cashPaymentService = require('../../src/services/cashPaymentService');
const cashBookService = require('../../src/services/cashBookService');
const ledgerService = require('../../src/services/ledgerService');
const CashReceipt = require('../../src/models/CashReceipt');
const CashPayment = require('../../src/models/CashPayment');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');

// Mock dependencies
jest.mock('../../src/models/CashReceipt');
jest.mock('../../src/models/CashPayment');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Supplier');
jest.mock('../../src/services/ledgerService');

describe('Cash-Ledger Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cash Receipt with Ledger Integration', () => {
    it('should create ledger entries when creating cash receipt', async () => {
      const receiptData = {
        customerId: 'customer123',
        amount: 5000,
        paymentMethod: 'cash',
        receiptDate: new Date(),
        createdBy: 'user123',
      };

      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
      };

      const mockReceipt = {
        _id: 'receipt123',
        receiptNumber: 'CR2024000001',
        ...receiptData,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      Customer.findById = jest.fn().mockResolvedValue(mockCustomer);
      CashReceipt.mockImplementation(() => mockReceipt);
      ledgerService.createDoubleEntry = jest.fn().mockResolvedValue({
        debitEntry: { _id: 'debit1' },
        creditEntry: { _id: 'credit1' },
      });

      await cashReceiptService.createCashReceipt(receiptData);

      // Verify ledger entries were created
      expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'CASH_ACCOUNT',
          accountType: 'Asset',
        }),
        expect.objectContaining({
          accountId: 'customer123',
          accountType: 'Customer',
        }),
        5000,
        expect.stringContaining('Cash receipt'),
        'cash_receipt',
        'receipt123',
        'user123'
      );
    });

    it('should create correct ledger entries for different payment methods', async () => {
      const receiptData = {
        customerId: 'customer123',
        amount: 10000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'TXN123',
        receiptDate: new Date(),
        createdBy: 'user123',
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
      };

      const mockReceipt = {
        _id: 'receipt123',
        receiptNumber: 'CR2024000001',
        ...receiptData,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      Customer.findById = jest.fn().mockResolvedValue(mockCustomer);
      CashReceipt.mockImplementation(() => mockReceipt);
      ledgerService.createDoubleEntry = jest.fn().mockResolvedValue({});

      await cashReceiptService.createCashReceipt(receiptData);

      expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        10000,
        expect.any(String),
        'cash_receipt',
        'receipt123',
        'user123'
      );
    });
  });

  describe('Cash Payment with Ledger Integration', () => {
    it('should create ledger entries when creating cash payment', async () => {
      const paymentData = {
        supplierId: 'supplier123',
        amount: 15000,
        paymentMethod: 'cheque',
        bankDetails: {
          chequeNumber: 'CHQ123',
        },
        paymentDate: new Date(),
        createdBy: 'user123',
      };

      const mockSupplier = {
        _id: 'supplier123',
        code: 'SUPP001',
        name: 'Test Supplier',
        isActive: true,
      };

      const mockPayment = {
        _id: 'payment123',
        paymentNumber: 'CP2024000001',
        ...paymentData,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      Supplier.findById = jest.fn().mockResolvedValue(mockSupplier);
      CashPayment.mockImplementation(() => mockPayment);
      ledgerService.createDoubleEntry = jest.fn().mockResolvedValue({
        debitEntry: { _id: 'debit1' },
        creditEntry: { _id: 'credit1' },
      });

      await cashPaymentService.createCashPayment(paymentData);

      // Verify ledger entries were created
      expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'supplier123',
          accountType: 'Supplier',
        }),
        expect.objectContaining({
          accountId: 'CASH_ACCOUNT',
          accountType: 'Asset',
        }),
        15000,
        expect.stringContaining('Cash payment'),
        'cash_payment',
        'payment123',
        'user123'
      );
    });
  });

  describe('Cash Book Balance Tracking', () => {
    it('should calculate cash book balance correctly', async () => {
      const asOfDate = new Date('2024-01-31');

      CashReceipt.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 50000 }]);
      CashPayment.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 30000 }]);

      const balance = await cashBookService.getCashBookBalance(asOfDate);

      expect(balance.totalReceipts).toBe(50000);
      expect(balance.totalPayments).toBe(30000);
      expect(balance.balance).toBe(20000);
      expect(balance.asOfDate).toEqual(asOfDate);
    });

    it('should handle zero receipts and payments', async () => {
      CashReceipt.aggregate = jest.fn().mockResolvedValue([]);
      CashPayment.aggregate = jest.fn().mockResolvedValue([]);

      const balance = await cashBookService.getCashBookBalance(new Date());

      expect(balance.totalReceipts).toBe(0);
      expect(balance.totalPayments).toBe(0);
      expect(balance.balance).toBe(0);
    });
  });

  describe('Cash Book Summary', () => {
    it('should generate cash book summary for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockReceipts = [
        { _id: 'r1', amount: 5000, receiptDate: new Date('2024-01-15') },
        { _id: 'r2', amount: 3000, receiptDate: new Date('2024-01-20') },
      ];

      const mockPayments = [
        { _id: 'p1', amount: 4000, paymentDate: new Date('2024-01-10') },
        { _id: 'p2', amount: 2000, paymentDate: new Date('2024-01-25') },
      ];

      // Mock opening balance and statistics
      CashReceipt.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ _id: null, total: 10000 }]) // Opening receipts
        .mockResolvedValueOnce([{ _id: 'pending', count: 1, totalAmount: 5000 }]) // Status breakdown
        .mockResolvedValueOnce([{ _id: 'cash', count: 2, totalAmount: 8000 }]) // Payment method breakdown
        .mockResolvedValueOnce([{ _id: null, total: 8000 }]) // Total amount
        .mockResolvedValueOnce([{ _id: null, total: 18000 }]); // Closing receipts

      CashPayment.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ _id: null, total: 5000 }]) // Opening payments
        .mockResolvedValueOnce([{ _id: 'cleared', count: 1, totalAmount: 6000 }]) // Status breakdown
        .mockResolvedValueOnce([{ _id: 'cash', count: 2, totalAmount: 6000 }]) // Payment method breakdown
        .mockResolvedValueOnce([{ _id: null, total: 6000 }]) // Total amount
        .mockResolvedValueOnce([{ _id: null, total: 11000 }]); // Closing payments

      CashReceipt.findByDateRange = jest.fn().mockResolvedValue(mockReceipts);
      CashPayment.findByDateRange = jest.fn().mockResolvedValue(mockPayments);

      CashReceipt.countDocuments = jest.fn().mockResolvedValue(2);
      CashPayment.countDocuments = jest.fn().mockResolvedValue(2);

      const summary = await cashBookService.getCashBookSummary(startDate, endDate);

      expect(summary.period.startDate).toEqual(startDate);
      expect(summary.period.endDate).toEqual(endDate);
      expect(summary.receipts.count).toBe(2);
      expect(summary.payments.count).toBe(2);
    });

    it('should throw error if dates are missing', async () => {
      await expect(cashBookService.getCashBookSummary(null, new Date())).rejects.toThrow(
        'Start date and end date are required'
      );
    });

    it('should throw error if start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      await expect(cashBookService.getCashBookSummary(startDate, endDate)).rejects.toThrow(
        'Start date must be before end date'
      );
    });
  });

  describe('Cash Flow Statement', () => {
    it('should generate cash flow statement', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock all required data
      CashReceipt.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ _id: null, total: 10000 }]) // Opening receipts
        .mockResolvedValueOnce([{ _id: 'cleared', count: 5, totalAmount: 50000 }]) // Status breakdown
        .mockResolvedValueOnce([{ _id: 'cash', count: 5, totalAmount: 50000 }]) // Payment method breakdown
        .mockResolvedValueOnce([{ _id: null, total: 50000 }]) // Total amount
        .mockResolvedValueOnce([{ _id: null, total: 60000 }]); // Closing receipts

      CashPayment.aggregate = jest
        .fn()
        .mockResolvedValueOnce([{ _id: null, total: 5000 }]) // Opening payments
        .mockResolvedValueOnce([{ _id: 'cleared', count: 3, totalAmount: 30000 }]) // Status breakdown
        .mockResolvedValueOnce([{ _id: 'cash', count: 3, totalAmount: 30000 }]) // Payment method breakdown
        .mockResolvedValueOnce([{ _id: null, total: 30000 }]) // Total amount
        .mockResolvedValueOnce([{ _id: null, total: 35000 }]); // Closing payments

      CashReceipt.findByDateRange = jest.fn().mockResolvedValue([]);
      CashPayment.findByDateRange = jest.fn().mockResolvedValue([]);
      CashReceipt.countDocuments = jest.fn().mockResolvedValue(5);
      CashPayment.countDocuments = jest.fn().mockResolvedValue(3);

      const statement = await cashBookService.getCashFlowStatement(startDate, endDate);

      expect(statement.period.startDate).toEqual(startDate);
      expect(statement.period.endDate).toEqual(endDate);
      expect(statement.cashFlowFromOperations).toBeDefined();
      expect(statement.cashBalance).toBeDefined();
      expect(statement.cashBalance.openingBalance).toBeDefined();
      expect(statement.cashBalance.closingBalance).toBeDefined();
    });
  });

  describe('Daily Cash Book', () => {
    it('should generate daily cash book entries', async () => {
      const date = new Date('2024-01-15');

      const mockReceipts = [
        {
          _id: 'r1',
          receiptNumber: 'CR2024000001',
          amount: 5000,
          receiptDate: new Date('2024-01-15T10:00:00'),
          customerId: { code: 'CUST001', name: 'Customer 1' },
          paymentMethod: 'cash',
          status: 'cleared',
        },
      ];

      const mockPayments = [
        {
          _id: 'p1',
          paymentNumber: 'CP2024000001',
          amount: 3000,
          paymentDate: new Date('2024-01-15T14:00:00'),
          supplierId: { code: 'SUPP001', name: 'Supplier 1' },
          paymentMethod: 'cheque',
          status: 'pending',
        },
      ];

      CashReceipt.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 10000 }]);
      CashPayment.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 5000 }]);
      CashReceipt.findByDateRange = jest.fn().mockResolvedValue(mockReceipts);
      CashPayment.findByDateRange = jest.fn().mockResolvedValue(mockPayments);

      const dailyBook = await cashBookService.getDailyCashBook(date);

      expect(dailyBook.date).toEqual(date);
      expect(dailyBook.openingBalance).toBe(5000);
      expect(dailyBook.transactions).toHaveLength(2);
      expect(dailyBook.totals.receipts).toBe(5000);
      expect(dailyBook.totals.payments).toBe(3000);
      expect(dailyBook.closingBalance).toBe(7000);
    });

    it('should throw error if date is missing', async () => {
      await expect(cashBookService.getDailyCashBook(null)).rejects.toThrow('Date is required');
    });
  });

  describe('Cash Book with Running Balance', () => {
    it('should calculate running balance for transactions', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockReceipts = [
        {
          _id: 'r1',
          receiptNumber: 'CR2024000001',
          amount: 5000,
          receiptDate: new Date('2024-01-10'),
          customerId: { code: 'CUST001' },
          paymentMethod: 'cash',
          status: 'cleared',
        },
      ];

      const mockPayments = [
        {
          _id: 'p1',
          paymentNumber: 'CP2024000001',
          amount: 3000,
          paymentDate: new Date('2024-01-15'),
          supplierId: { code: 'SUPP001' },
          paymentMethod: 'cash',
          status: 'cleared',
        },
      ];

      CashReceipt.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 10000 }]);
      CashPayment.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 5000 }]);
      CashReceipt.findByDateRange = jest.fn().mockResolvedValue(mockReceipts);
      CashPayment.findByDateRange = jest.fn().mockResolvedValue(mockPayments);

      const result = await cashBookService.getCashBookWithRunningBalance(startDate, endDate);

      expect(result.openingBalance).toBe(5000);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].balance).toBe(10000); // 5000 + 5000
      expect(result.transactions[1].balance).toBe(7000); // 10000 - 3000
      expect(result.closingBalance).toBe(7000);
    });
  });
});
