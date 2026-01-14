const salesInvoiceService = require('../../src/services/salesInvoiceService');
const invoiceRepository = require('../../src/repositories/invoiceRepository');
const customerService = require('../../src/services/customerService');
const itemService = require('../../src/services/itemService');
const Salesman = require('../../src/models/Salesman');

// Mock dependencies
jest.mock('../../src/repositories/invoiceRepository');
jest.mock('../../src/services/customerService');
jest.mock('../../src/services/itemService');
jest.mock('../../src/models/Salesman');

describe('Sales Invoice Service - Salesman Assignment Tests', () => {
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

      const result = await salesInvoiceService.validateSalesman('salesman123');

      expect(Salesman.findById).toHaveBeenCalledWith('salesman123');
      expect(result).toEqual(mockSalesman);
    });

    it('should throw error if salesman ID is not provided', async () => {
      await expect(salesInvoiceService.validateSalesman(null))
        .rejects.toThrow('Salesman ID is required');
    });

    it('should throw error if salesman not found', async () => {
      Salesman.findById = jest.fn().mockResolvedValue(null);

      await expect(salesInvoiceService.validateSalesman('invalid123'))
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

      await expect(salesInvoiceService.validateSalesman('salesman123'))
        .rejects.toThrow('Salesman John Doe is not active');
    });
  });

  describe('createSalesInvoice with salesman - validation only', () => {
    const mockSalesman = {
      _id: 'salesman123',
      code: 'SM001',
      name: 'John Doe',
      isActive: true,
      commissionRate: 5
    };

    it('should call validateSalesman when salesmanId is provided', async () => {
      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { creditLimit: 100000, paymentTerms: 30, currentBalance: 0 }
      };

      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: true,
        pricing: { salePrice: 100 },
        tax: { gstRate: 18, whtRate: 0 },
        inventory: { currentStock: 1000 },
        checkStockAvailability: jest.fn().mockReturnValue(true)
      };

      customerService.getCustomerById = jest.fn().mockResolvedValue(mockCustomer);
      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
      Salesman.findById = jest.fn().mockResolvedValue(mockSalesman);
      invoiceRepository.generateInvoiceNumber = jest.fn().mockResolvedValue('INV-2024-001');
      invoiceRepository.create = jest.fn().mockImplementation(data => Promise.resolve({ _id: 'invoice123', ...data }));

      const validInvoiceData = {
        customerId: 'customer123',
        items: [{ itemId: 'item123', quantity: 10, unitPrice: 100 }],
        createdBy: 'user123',
        salesmanId: 'salesman123'
      };

      const invoice = await salesInvoiceService.createSalesInvoice(validInvoiceData);

      expect(Salesman.findById).toHaveBeenCalledWith('salesman123');
      expect(invoice.salesmanId).toBe('salesman123');
    });

    it('should not call validateSalesman when salesmanId is not provided', async () => {
      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { creditLimit: 100000, paymentTerms: 30, currentBalance: 0 }
      };

      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: true,
        pricing: { salePrice: 100 },
        tax: { gstRate: 18, whtRate: 0 },
        inventory: { currentStock: 1000 },
        checkStockAvailability: jest.fn().mockReturnValue(true)
      };

      customerService.getCustomerById = jest.fn().mockResolvedValue(mockCustomer);
      itemService.getItemById = jest.fn().mockResolvedValue(mockItem);
      invoiceRepository.generateInvoiceNumber = jest.fn().mockResolvedValue('INV-2024-001');
      invoiceRepository.create = jest.fn().mockImplementation(data => Promise.resolve({ _id: 'invoice123', ...data }));

      const validInvoiceData = {
        customerId: 'customer123',
        items: [{ itemId: 'item123', quantity: 10, unitPrice: 100 }],
        createdBy: 'user123'
      };

      const invoice = await salesInvoiceService.createSalesInvoice(validInvoiceData);

      expect(Salesman.findById).not.toHaveBeenCalled();
      expect(invoice.salesmanId).toBeNull();
    });

    it('should throw error if salesman is invalid', async () => {
      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { creditLimit: 100000, paymentTerms: 30, currentBalance: 0 }
      };

      customerService.getCustomerById = jest.fn().mockResolvedValue(mockCustomer);
      Salesman.findById = jest.fn().mockResolvedValue(null);

      const validInvoiceData = {
        customerId: 'customer123',
        items: [{ itemId: 'item123', quantity: 10, unitPrice: 100 }],
        createdBy: 'user123',
        salesmanId: 'invalid123'
      };

      await expect(salesInvoiceService.createSalesInvoice(validInvoiceData))
        .rejects.toThrow('Salesman not found');
    });

    it('should throw error if salesman is inactive', async () => {
      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { creditLimit: 100000, paymentTerms: 30, currentBalance: 0 }
      };

      const inactiveSalesman = { ...mockSalesman, isActive: false };
      
      customerService.getCustomerById = jest.fn().mockResolvedValue(mockCustomer);
      Salesman.findById = jest.fn().mockResolvedValue(inactiveSalesman);

      const validInvoiceData = {
        customerId: 'customer123',
        items: [{ itemId: 'item123', quantity: 10, unitPrice: 100 }],
        createdBy: 'user123',
        salesmanId: 'salesman123'
      };

      await expect(salesInvoiceService.createSalesInvoice(validInvoiceData))
        .rejects.toThrow('Salesman John Doe is not active');
    });
  });
});
