const customerService = require('../../src/services/customerService');
const customerRepository = require('../../src/repositories/customerRepository');

// Mock the repository
jest.mock('../../src/repositories/customerRepository');

describe('Customer Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerById', () => {
    it('should return customer when found', async () => {
      const mockCustomer = { _id: '123', name: 'Test Customer', code: 'CUST001' };
      customerRepository.findById.mockResolvedValue(mockCustomer);

      const result = await customerService.getCustomerById('123');

      expect(result).toEqual(mockCustomer);
      expect(customerRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw error when customer not found', async () => {
      customerRepository.findById.mockResolvedValue(null);

      await expect(customerService.getCustomerById('123')).rejects.toThrow('Customer not found');
    });
  });

  describe('getCustomerByCode', () => {
    it('should return customer when found by code', async () => {
      const mockCustomer = { _id: '123', name: 'Test Customer', code: 'CUST001' };
      customerRepository.findByCode.mockResolvedValue(mockCustomer);

      const result = await customerService.getCustomerByCode('CUST001');

      expect(result).toEqual(mockCustomer);
      expect(customerRepository.findByCode).toHaveBeenCalledWith('CUST001');
    });

    it('should throw error when customer not found by code', async () => {
      customerRepository.findByCode.mockResolvedValue(null);

      await expect(customerService.getCustomerByCode('INVALID')).rejects.toThrow('Customer not found');
    });
  });

  describe('createCustomer', () => {
    it('should create customer with valid data', async () => {
      const customerData = {
        name: 'New Customer',
        code: 'CUST002',
        type: 'customer',
      };
      const mockCreatedCustomer = { _id: '456', ...customerData };

      customerRepository.codeExists.mockResolvedValue(false);
      customerRepository.create.mockResolvedValue(mockCreatedCustomer);

      const result = await customerService.createCustomer(customerData);

      expect(result).toEqual(mockCreatedCustomer);
      expect(customerRepository.codeExists).toHaveBeenCalledWith('CUST002');
      expect(customerRepository.create).toHaveBeenCalledWith(customerData);
    });

    it('should throw error when name is missing', async () => {
      const customerData = { code: 'CUST002' };

      await expect(customerService.createCustomer(customerData)).rejects.toThrow('Customer name is required');
    });

    it('should throw error when code already exists', async () => {
      const customerData = {
        name: 'New Customer',
        code: 'CUST002',
      };

      customerRepository.codeExists.mockResolvedValue(true);

      await expect(customerService.createCustomer(customerData)).rejects.toThrow('Customer code already exists');
    });

    it('should throw error for invalid type', async () => {
      const customerData = {
        name: 'New Customer',
        type: 'invalid',
      };

      await expect(customerService.createCustomer(customerData)).rejects.toThrow('Invalid type');
    });

    it('should throw error for negative credit limit', async () => {
      const customerData = {
        name: 'New Customer',
        financialInfo: {
          creditLimit: -1000,
        },
      };

      await expect(customerService.createCustomer(customerData)).rejects.toThrow('Credit limit cannot be negative');
    });

    it('should throw error for invalid payment terms', async () => {
      const customerData = {
        name: 'New Customer',
        financialInfo: {
          paymentTerms: 400,
        },
      };

      await expect(customerService.createCustomer(customerData)).rejects.toThrow('Payment terms must be between 0 and 365 days');
    });

    it('should throw error for invalid email format', async () => {
      const customerData = {
        name: 'New Customer',
        contactInfo: {
          email: 'invalid-email',
        },
      };

      await expect(customerService.createCustomer(customerData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('updateCustomer', () => {
    it('should update customer with valid data', async () => {
      const existingCustomer = { _id: '123', name: 'Old Name', code: 'CUST001' };
      const updateData = { name: 'New Name' };
      const updatedCustomer = { ...existingCustomer, ...updateData };

      customerRepository.findById.mockResolvedValue(existingCustomer);
      customerRepository.update.mockResolvedValue(updatedCustomer);

      const result = await customerService.updateCustomer('123', updateData);

      expect(result).toEqual(updatedCustomer);
      expect(customerRepository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should throw error when customer not found', async () => {
      customerRepository.findById.mockResolvedValue(null);

      await expect(customerService.updateCustomer('123', { name: 'New Name' })).rejects.toThrow('Customer not found');
    });

    it('should throw error when updating to duplicate code', async () => {
      const existingCustomer = { _id: '123', name: 'Customer', code: 'CUST001' };
      const updateData = { code: 'CUST002' };

      customerRepository.findById.mockResolvedValue(existingCustomer);
      customerRepository.codeExists.mockResolvedValue(true);

      await expect(customerService.updateCustomer('123', updateData)).rejects.toThrow('Customer code already exists');
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer', async () => {
      const mockCustomer = { _id: '123', name: 'Customer', isActive: true };
      const deletedCustomer = { ...mockCustomer, isActive: false };

      customerRepository.findById.mockResolvedValue(mockCustomer);
      customerRepository.softDelete.mockResolvedValue(deletedCustomer);

      const result = await customerService.deleteCustomer('123');

      expect(result).toEqual(deletedCustomer);
      expect(customerRepository.softDelete).toHaveBeenCalledWith('123');
    });

    it('should throw error when customer not found', async () => {
      customerRepository.findById.mockResolvedValue(null);

      await expect(customerService.deleteCustomer('123')).rejects.toThrow('Customer not found');
    });
  });

  describe('validateCreditLimit', () => {
    it('should pass validation when within credit limit', async () => {
      const mockCustomer = {
        _id: '123',
        name: 'Customer',
        financialInfo: { creditLimit: 10000 },
        checkCreditAvailability: jest.fn().mockReturnValue(true),
      };

      customerRepository.findById.mockResolvedValue(mockCustomer);

      const result = await customerService.validateCreditLimit('123', 5000);

      expect(result).toBe(true);
      expect(mockCustomer.checkCreditAvailability).toHaveBeenCalledWith(5000);
    });

    it('should throw error when exceeding credit limit', async () => {
      const mockCustomer = {
        _id: '123',
        name: 'Customer',
        financialInfo: { creditLimit: 10000 },
        checkCreditAvailability: jest.fn().mockReturnValue(false),
      };

      customerRepository.findById.mockResolvedValue(mockCustomer);

      await expect(customerService.validateCreditLimit('123', 15000)).rejects.toThrow('Transaction amount exceeds customer credit limit');
    });
  });

  describe('validateType', () => {
    it('should pass for valid types', () => {
      expect(() => customerService.validateType('customer')).not.toThrow();
      expect(() => customerService.validateType('supplier')).not.toThrow();
      expect(() => customerService.validateType('both')).not.toThrow();
    });

    it('should throw error for invalid type', () => {
      expect(() => customerService.validateType('invalid')).toThrow('Invalid type');
    });
  });

  describe('getAllCustomers', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [
        { _id: '1', name: 'Customer 1' },
        { _id: '2', name: 'Customer 2' },
      ];

      customerRepository.search.mockResolvedValue(mockCustomers);
      customerRepository.count.mockResolvedValue(10);

      const result = await customerService.getAllCustomers({}, { page: 1, limit: 2 });

      expect(result.customers).toEqual(mockCustomers);
      expect(result.pagination.totalItems).toBe(10);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('searchCustomers', () => {
    it('should search customers with keyword', async () => {
      const mockCustomers = [{ _id: '1', name: 'Test Customer' }];
      customerRepository.search.mockResolvedValue(mockCustomers);

      const result = await customerService.searchCustomers('Test');

      expect(result).toEqual(mockCustomers);
      expect(customerRepository.search).toHaveBeenCalledWith('Test', {});
    });

    it('should throw error for empty keyword', async () => {
      await expect(customerService.searchCustomers('')).rejects.toThrow('Search keyword is required');
      await expect(customerService.searchCustomers('   ')).rejects.toThrow('Search keyword is required');
    });
  });

  describe('bulkCreateCustomers', () => {
    it('should create multiple customers', async () => {
      const customersData = [
        { name: 'Customer 1', code: 'C001' },
        { name: 'Customer 2', code: 'C002' },
      ];
      const mockCreated = customersData.map((c, i) => ({ _id: `${i}`, ...c }));

      customerRepository.codeExists.mockResolvedValue(false);
      customerRepository.bulkCreate.mockResolvedValue(mockCreated);

      const result = await customerService.bulkCreateCustomers(customersData);

      expect(result).toEqual(mockCreated);
      expect(customerRepository.bulkCreate).toHaveBeenCalledWith(customersData);
    });

    it('should throw error for empty array', async () => {
      await expect(customerService.bulkCreateCustomers([])).rejects.toThrow('Customers data must be a non-empty array');
    });

    it('should throw error for duplicate codes in batch', async () => {
      const customersData = [
        { name: 'Customer 1', code: 'DUP' },
        { name: 'Customer 2', code: 'DUP' },
      ];

      await expect(customerService.bulkCreateCustomers(customersData)).rejects.toThrow('Duplicate code in batch');
    });
  });
});
