const cashPaymentService = require('../../src/services/cashPaymentService');
const CashPayment = require('../../src/models/CashPayment');
const Supplier = require('../../src/models/Supplier');

// Mock dependencies
jest.mock('../../src/models/CashPayment');
jest.mock('../../src/models/Supplier');

describe('Cash Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCashPayment', () => {
    it('should create a cash payment with valid data', async () => {
      const paymentData = {
        supplierId: 'supplier123',
        amount: 10000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'TXN123456',
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

      const result = await cashPaymentService.createCashPayment(paymentData);

      expect(Supplier.findById).toHaveBeenCalledWith('supplier123');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockPayment.populate).toHaveBeenCalledWith('supplierId', 'code name contactInfo');
    });

    it('should throw error if supplier ID is missing', async () => {
      const paymentData = {
        amount: 10000,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      await expect(cashPaymentService.createCashPayment(paymentData)).rejects.toThrow(
        'Supplier ID is required'
      );
    });

    it('should throw error if amount is zero or negative', async () => {
      const paymentData = {
        supplierId: 'supplier123',
        amount: -100,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      await expect(cashPaymentService.createCashPayment(paymentData)).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should throw error if payment method is missing', async () => {
      const paymentData = {
        supplierId: 'supplier123',
        amount: 10000,
        createdBy: 'user123',
      };

      await expect(cashPaymentService.createCashPayment(paymentData)).rejects.toThrow(
        'Payment method is required'
      );
    });

    it('should throw error if supplier not found', async () => {
      const paymentData = {
        supplierId: 'supplier123',
        amount: 10000,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      Supplier.findById = jest.fn().mockResolvedValue(null);

      await expect(cashPaymentService.createCashPayment(paymentData)).rejects.toThrow(
        'Supplier not found'
      );
    });

    it('should throw error if supplier is not active', async () => {
      const paymentData = {
        supplierId: 'supplier123',
        amount: 10000,
        paymentMethod: 'cash',
        createdBy: 'user123',
      };

      const mockSupplier = {
        _id: 'supplier123',
        isActive: false,
      };

      Supplier.findById = jest.fn().mockResolvedValue(mockSupplier);

      await expect(cashPaymentService.createCashPayment(paymentData)).rejects.toThrow(
        'Supplier is not active'
      );
    });
  });

  describe('getCashPaymentById', () => {
    it('should get cash payment by ID', async () => {
      const mockPayment = {
        _id: 'payment123',
        paymentNumber: 'CP2024000001',
        amount: 10000,
      };

      CashPayment.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockPayment),
        }),
      });

      const result = await cashPaymentService.getCashPaymentById('payment123');

      expect(CashPayment.findById).toHaveBeenCalledWith('payment123');
      expect(result).toEqual(mockPayment);
    });

    it('should throw error if payment not found', async () => {
      CashPayment.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(cashPaymentService.getCashPaymentById('invalid')).rejects.toThrow(
        'Cash payment not found'
      );
    });
  });

  describe('getAllCashPayments', () => {
    it('should get all cash payments with pagination', async () => {
      const mockPayments = [
        { _id: 'payment1', amount: 10000 },
        { _id: 'payment2', amount: 5000 },
      ];

      CashPayment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockPayments),
      });

      CashPayment.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await cashPaymentService.getAllCashPayments({}, { page: 1, limit: 50 });

      expect(result.payments).toEqual(mockPayments);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('should filter payments by supplier ID', async () => {
      const mockPayments = [{ _id: 'payment1', supplierId: 'supplier123' }];

      CashPayment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockPayments),
      });

      CashPayment.countDocuments = jest.fn().mockResolvedValue(1);

      await cashPaymentService.getAllCashPayments({ supplierId: 'supplier123' });

      expect(CashPayment.find).toHaveBeenCalledWith(
        expect.objectContaining({ supplierId: 'supplier123' })
      );
    });

    it('should filter payments by status', async () => {
      const mockPayments = [{ _id: 'payment1', status: 'cleared' }];

      CashPayment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockPayments),
      });

      CashPayment.countDocuments = jest.fn().mockResolvedValue(1);

      await cashPaymentService.getAllCashPayments({ status: 'cleared' });

      expect(CashPayment.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'cleared' }));
    });
  });

  describe('updateCashPayment', () => {
    it('should update cash payment', async () => {
      const mockPayment = {
        _id: 'payment123',
        status: 'pending',
        amount: 10000,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      CashPayment.findById = jest.fn().mockResolvedValue(mockPayment);

      const updateData = { amount: 12000, description: 'Updated description' };
      const result = await cashPaymentService.updateCashPayment('payment123', updateData);

      expect(mockPayment.amount).toBe(12000);
      expect(mockPayment.description).toBe('Updated description');
      expect(mockPayment.save).toHaveBeenCalled();
    });

    it('should throw error if payment not found', async () => {
      CashPayment.findById = jest.fn().mockResolvedValue(null);

      await expect(
        cashPaymentService.updateCashPayment('invalid', { amount: 12000 })
      ).rejects.toThrow('Cash payment not found');
    });

    it('should throw error if trying to update cleared payment', async () => {
      const mockPayment = {
        _id: 'payment123',
        status: 'cleared',
      };

      CashPayment.findById = jest.fn().mockResolvedValue(mockPayment);

      await expect(
        cashPaymentService.updateCashPayment('payment123', { amount: 12000 })
      ).rejects.toThrow('Cannot update cleared payment');
    });
  });

  describe('clearCashPayment', () => {
    it('should clear cash payment', async () => {
      const mockPayment = {
        _id: 'payment123',
        status: 'pending',
        clearPayment: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      CashPayment.findById = jest.fn().mockResolvedValue(mockPayment);

      await cashPaymentService.clearCashPayment('payment123');

      expect(mockPayment.clearPayment).toHaveBeenCalled();
    });

    it('should throw error if payment not found', async () => {
      CashPayment.findById = jest.fn().mockResolvedValue(null);

      await expect(cashPaymentService.clearCashPayment('invalid')).rejects.toThrow(
        'Cash payment not found'
      );
    });
  });

  describe('cancelCashPayment', () => {
    it('should cancel cash payment', async () => {
      const mockPayment = {
        _id: 'payment123',
        status: 'pending',
        cancelPayment: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
      };

      CashPayment.findById = jest.fn().mockResolvedValue(mockPayment);

      await cashPaymentService.cancelCashPayment('payment123');

      expect(mockPayment.cancelPayment).toHaveBeenCalled();
    });
  });

  describe('getPaymentsByDateRange', () => {
    it('should get payments by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockPayments = [{ _id: 'payment1' }, { _id: 'payment2' }];

      CashPayment.findByDateRange = jest.fn().mockResolvedValue(mockPayments);

      const result = await cashPaymentService.getPaymentsByDateRange(startDate, endDate);

      expect(CashPayment.findByDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(mockPayments);
    });

    it('should throw error if dates are missing', async () => {
      await expect(cashPaymentService.getPaymentsByDateRange(null, new Date())).rejects.toThrow(
        'Start date and end date are required'
      );
    });

    it('should throw error if start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');

      await expect(cashPaymentService.getPaymentsByDateRange(startDate, endDate)).rejects.toThrow(
        'Start date must be before end date'
      );
    });
  });

  describe('getPendingPayments', () => {
    it('should get pending payments', async () => {
      const mockPayments = [
        { _id: 'payment1', status: 'pending' },
        { _id: 'payment2', status: 'pending' },
      ];

      CashPayment.findPendingPayments = jest.fn().mockResolvedValue(mockPayments);

      const result = await cashPaymentService.getPendingPayments();

      expect(CashPayment.findPendingPayments).toHaveBeenCalled();
      expect(result).toEqual(mockPayments);
    });
  });

  describe('getPaymentStatistics', () => {
    it('should get payment statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      CashPayment.countDocuments = jest.fn().mockResolvedValue(15);
      CashPayment.aggregate = jest
        .fn()
        .mockResolvedValueOnce([
          { _id: 'pending', count: 8, totalAmount: 80000 },
          { _id: 'cleared', count: 7, totalAmount: 70000 },
        ])
        .mockResolvedValueOnce([
          { _id: 'cash', count: 10, totalAmount: 100000 },
          { _id: 'bank_transfer', count: 5, totalAmount: 50000 },
        ])
        .mockResolvedValueOnce([{ _id: null, total: 150000 }]);

      const result = await cashPaymentService.getPaymentStatistics(startDate, endDate);

      expect(result.totalPayments).toBe(15);
      expect(result.totalAmount).toBe(150000);
      expect(result.byStatus.pending.count).toBe(8);
      expect(result.byPaymentMethod.cash.count).toBe(10);
    });
  });
});
