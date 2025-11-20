const cashReceiptService = require('../../src/services/cashReceiptService');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');
const Salesman = require('../../src/models/Salesman');
const ledgerService = require('../../src/services/ledgerService');

// Mock dependencies
jest.mock('../../src/models/CashReceipt');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Salesman');
jest.mock('../../src/services/ledgerService');

describe('Cash Receipt Service - Salesman Assignment Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSalesman', () => {
    it('should validate and return active salesman', async () => {
      const mockSalesman = {
        _id: 'salesman123',
        code: 'SM001',
        name: 'John Doe',
        isActive: true,
        commissionRate: 5
      };

      Salesman.findById = jest.fn().mockResolvedValue(mockSalesman);

      const result = await cashReceiptService.validateSalesman('salesman123');

      expect(Salesman.findById).toHaveBeenCalledWith('salesman123');
      expect(result).toEqual(mockSalesman);
    });

    it('should throw error if salesman ID is not provided', async () => {
      await expect(cashReceiptService.validateSalesman(null))
        .rejects.toThrow('Salesman ID is required');
    });

    it('should throw error if salesman not found', async () => {
      Salesman.findById = jest.fn().mockResolvedValue(null);

      await expect(cashReceiptService.validateSalesman('invalid123'))
        .rejects.toThrow('Salesman not found: invalid123');
    });

    it('should throw error if salesman is not active', async () => {
      const mockInactiveSalesman = {
        _id: 'salesman123',
        code: 'SM001',
        name: 'John Doe',
        isActive: false,
        commissionRate: 5
      };

      Salesman.findById = jest.fn().mockResolvedValue(mockInactiveSalesman);

      await expect(cashReceiptService.validateSalesman('salesman123'))
        .rejects.toThrow('Salesman John Doe is not active');
    });
  });

  describe('createCashReceipt with salesman', () => {
    const mockCustomer = {
      _id: 'customer123',
      code: 'CUST001',
      name: 'Test Customer',
      isActive: true
    };

    const mockSalesman = {
      _id: 'salesman123',
      code: 'SM001',
      name: 'John Doe',
      isActive: true,
      commissionRate: 5
    };

    const mockReceipt = {
      _id: 'receipt123',
      receiptNumber: 'RCP-2024-001',
      customerId: 'customer123',
      amount: 1000,
      paymentMethod: 'cash',
      salesmanId: 'salesman123',
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockReturnThis()
    };

    const validReceiptData = {
      customerId: 'customer123',
      amount: 1000,
      paymentMethod: 'cash',
      createdBy: 'user123',
      salesmanId: 'salesman123'
    };

    beforeEach(() => {
      Customer.findById = jest.fn().mockResolvedValue(mockCustomer);
      Salesman.findById = jest.fn().mockResolvedValue(mockSalesman);
      CashReceipt.mockImplementation(() => mockReceipt);
      ledgerService.createDoubleEntry = jest.fn().mockResolvedValue(true);
    });

    it('should create cash receipt with valid salesman', async () => {
      const receipt = await cashReceiptService.createCashReceipt(validReceiptData);

      expect(Salesman.findById).toHaveBeenCalledWith('salesman123');
      expect(mockReceipt.save).toHaveBeenCalled();
      expect(receipt).toBeDefined();
    });

    it('should create cash receipt without salesman when not provided', async () => {
      const dataWithoutSalesman = { ...validReceiptData };
      delete dataWithoutSalesman.salesmanId;

      const receipt = await cashReceiptService.createCashReceipt(dataWithoutSalesman);

      expect(Salesman.findById).not.toHaveBeenCalled();
      expect(mockReceipt.save).toHaveBeenCalled();
    });

    it('should throw error if salesman is invalid', async () => {
      Salesman.findById = jest.fn().mockResolvedValue(null);

      await expect(cashReceiptService.createCashReceipt(validReceiptData))
        .rejects.toThrow('Salesman not found');
    });

    it('should throw error if salesman is inactive', async () => {
      const inactiveSalesman = { ...mockSalesman, isActive: false };
      Salesman.findById = jest.fn().mockResolvedValue(inactiveSalesman);

      await expect(cashReceiptService.createCashReceipt(validReceiptData))
        .rejects.toThrow('Salesman John Doe is not active');
    });

    it('should link salesman to receipt for commission tracking', async () => {
      const receipt = await cashReceiptService.createCashReceipt(validReceiptData);

      expect(Salesman.findById).toHaveBeenCalledWith('salesman123');
      expect(mockReceipt.save).toHaveBeenCalled();
      // The receipt should have salesmanId in the data passed to CashReceipt constructor
      expect(CashReceipt).toHaveBeenCalledWith(expect.objectContaining({
        salesmanId: 'salesman123'
      }));
    });
  });
});
