const cashReceiptService = require('../../src/services/cashReceiptService');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');

// Mock dependencies
jest.mock('../../src/models/CashReceipt');
jest.mock('../../src/models/Customer');

describe('Cash Receipt Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCashReceipt', () => {
    it('should create a cash receipt with valid data', async () => {
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

      const result = await cashReceiptService.createCashReceipt(receiptData);

      expect(Customer.findById).toHaveBeenCalledWith('customer123');
      expect(mockReceipt.save).toHaveBeenCalled();
      expect(mockReceipt.populate).toHaveBeenCalledWith('customerId', 'code name contactInfo');
    });

    it('should throw error if customer ID is missing', async () => {
      const receiptData = {
        amount: 5000,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      await expect(cashReceiptService.createCashReceipt(receiptData)).rejects.toThrow(
        'Customer ID is required'
      );
    });

    it('should throw error if amount is zero or negative', async () => {
      const receiptData = {
        customerId: 'customer123',
        amount: 0,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      await expect(cashReceiptService.createCashReceipt(receiptData)).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should throw error if payment method is missing', async () => {
      const receiptData = {
        customerId: 'customer123',
        amount: 5000,
        createdBy: 'user123',
      };

      await expect(cashReceiptService.createCashReceipt(receiptData)).rejects.toThrow(
        'Payment method is required'
      );
    });

    it('should throw error if customer not found', async () => {
      const receiptData = {
        customerId: 'customer123',
        amount: 5000,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      Customer.findById = jest.fn().mockResolvedValue(null);

      await expect(cashReceiptService.createCashReceipt(receiptData)).rejects.toThrow(
        'Customer not found'
      );
    });

    it('should throw error if customer is not active', async () => {
      const receiptData = {
        customerId: 'customer123',
        amount: 5000,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: false,
      };

      Customer.findById = jest.fn().mockResolvedValue(mockCustomer);

      await expect(cashReceiptService.createCashReceipt(receiptData)).rejects.toThrow(
        'Customer is not active'
      );
    });
  });

  describe('getCashReceiptById', () => {
    it('should get cash receipt by ID', async () => {
      const mockReceipt = {
        _id: 'receipt123',
        receiptNumber: 'CR2024000001',
        amount: 5000,
      };

      CashReceipt.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockReceipt),
        }),
      });

      const result = await cashReceiptService.getCashReceiptById('receipt123');

      expect(CashReceipt.findById).toHaveBeenCalledWith('receipt123');
      expect(result).toEqual(mockReceipt);
    });

    it('should throw error if receipt not found', async () => {
      CashReceipt.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(cashReceiptService.getCashReceiptById('invalid')).rejects.toThrow(
        'Cash receipt not found'
      );
    });
  });

  describe('getAllCashReceipts', () => {
    it('should get all cash receipts with pagination', async () => {
      const mockReceipts = [
        { _id: 'receipt1', amount: 5000 },
        { _id: 'receipt2', amount: 3000 },
      ];

      CashReceipt.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReceipts),
      });

      CashReceipt.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await cashReceiptService.getAllCashReceipts({}, { page: 1, limit: 50 });

      expect(result.receipts).toEqual(mockReceipts);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('should filter receipts by customer ID', async () => {
      const mockReceipts = [{ _id: 'receipt1', customerId: 'customer123' }];

      CashReceipt.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReceipts),
      });

      CashReceipt.countDocuments = jest.fn().mockResolvedValue(1);

      await cashReceiptService.getAllCashReceipts({ customerId: 'customer123' });

      expect(CashReceipt.find).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'customer123' })
      );
    });

    it('should filter receipts by status', async () => {
      const mockReceipts = [{ _id: 'receipt1', status: 'cleared' }];

      CashReceipt.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockReceipts),
      });

      CashReceipt.countDocuments = jest.fn().mockResolvedValue(1);

      await cashReceiptService.getAllCashReceipts({ status: 'cleared' });

      expect(CashReceipt.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'cleared' }));
    });
  });

  describe('updateCashReceipt', () => {
    it('should update cash receipt', async () => {
      const mockReceipt = {
        _id: 'receipt123',
        status: 'pending',
        amount: 5000,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      CashReceipt.findById = jest.fn().mockResolvedValue(mockReceipt);

      const updateData = { amount: 6000, description: 'Updated description' };
      const result = await cashReceiptService.updateCashReceipt('receipt123', updateData);

      expect(mockReceipt.amount).toBe(6000);
      expect(mockReceipt.description).toBe('Updated description');
      expect(mockReceipt.save).toHaveBeenCalled();
    });

    it('should throw error if receipt not found', async () => {
      CashReceipt.findById = jest.fn().mockResolvedValue(null);

      await expect(
        cashReceiptService.updateCashReceipt('invalid', { amount: 6000 })
      ).rejects.toThrow('Cash receipt not found');
    });

    it('should throw error if trying to update cleared receipt', async () => {
      const mockReceipt = {
        _id: 'receipt123',
        status: 'cleared',
      };

      CashReceipt.findById = jest.fn().mockResolvedValue(mockReceipt);

      await expect(
        cashReceiptService.updateCashReceipt('receipt123', { amount: 6000 })
      ).rejects.toThrow('Cannot update cleared receipt');
    });
  });

  describe('clearCashReceipt', () => {
    it('should clear cash receipt', async () => {
      const mockReceipt = {
        _id: 'receipt123',
        status: 'pending',
        clearReceipt: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      CashReceipt.findById = jest.fn().mockResolvedValue(mockReceipt);

      await cashReceiptService.clearCashReceipt('receipt123');

      expect(mockReceipt.clearReceipt).toHaveBeenCalled();
    });

    it('should throw error if receipt not found', async () => {
      CashReceipt.findById = jest.fn().mockResolvedValue(null);

      await expect(cashReceiptService.clearCashReceipt('invalid')).rejects.toThrow(
        'Cash receipt not found'
      );
    });
  });

  describe('cancelCashReceipt', () => {
    it('should cancel cash receipt', async () => {
      const mockReceipt = {
        _id: 'receipt123',
        status: 'pending',
        cancelReceipt: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      CashReceipt.findById = jest.fn().mockResolvedValue(mockReceipt);

      await cashReceiptService.cancelCashReceipt('receipt123');

      expect(mockReceipt.cancelReceipt).toHaveBeenCalled();
    });
  });

  describe('getReceiptsByDateRange', () => {
    it('should get receipts by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockReceipts = [{ _id: 'receipt1' }, { _id: 'receipt2' }];

      CashReceipt.findByDateRange = jest.fn().mockResolvedValue(mockReceipts);

      const result = await cashReceiptService.getReceiptsByDateRange(startDate, endDate);

      expect(CashReceipt.findByDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(mockReceipts);
    });

    it('should throw error if dates are missing', async () => {
      await expect(cashReceiptService.getReceiptsByDateRange(null, new Date())).rejects.toThrow(
        'Start date and end date are required'
      );
    });

    it('should throw error if start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      await expect(cashReceiptService.getReceiptsByDateRange(startDate, endDate)).rejects.toThrow(
        'Start date must be before end date'
      );
    });
  });

  describe('getPendingReceipts', () => {
    it('should get pending receipts', async () => {
      const mockReceipts = [
        { _id: 'receipt1', status: 'pending' },
        { _id: 'receipt2', status: 'pending' },
      ];

      CashReceipt.findPendingReceipts = jest.fn().mockResolvedValue(mockReceipts);

      const result = await cashReceiptService.getPendingReceipts();

      expect(CashReceipt.findPendingReceipts).toHaveBeenCalled();
      expect(result).toEqual(mockReceipts);
    });
  });

  describe('getReceiptStatistics', () => {
    it('should get receipt statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      CashReceipt.countDocuments = jest.fn().mockResolvedValue(10);
      CashReceipt.aggregate = jest
        .fn()
        .mockResolvedValueOnce([
          { _id: 'pending', count: 5, totalAmount: 25000 },
          { _id: 'cleared', count: 5, totalAmount: 25000 },
        ])
        .mockResolvedValueOnce([
          { _id: 'cash', count: 7, totalAmount: 35000 },
          { _id: 'cheque', count: 3, totalAmount: 15000 },
        ])
        .mockResolvedValueOnce([{ _id: null, total: 50000 }]);

      const result = await cashReceiptService.getReceiptStatistics(startDate, endDate);

      expect(result.totalReceipts).toBe(10);
      expect(result.totalAmount).toBe(50000);
      expect(result.byStatus.pending.count).toBe(5);
      expect(result.byPaymentMethod.cash.count).toBe(7);
    });
  });
});
