const supplierService = require('../../src/services/supplierService');
const supplierRepository = require('../../src/repositories/supplierRepository');

// Mock the repository
jest.mock('../../src/repositories/supplierRepository');

describe('Supplier Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupplierById', () => {
    it('should return supplier when found', async () => {
      const mockSupplier = { _id: '123', name: 'Test Supplier', code: 'SUPP001' };
      supplierRepository.findById.mockResolvedValue(mockSupplier);

      const result = await supplierService.getSupplierById('123');

      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw error when supplier not found', async () => {
      supplierRepository.findById.mockResolvedValue(null);

      await expect(supplierService.getSupplierById('123')).rejects.toThrow('Supplier not found');
    });
  });

  describe('getSupplierByCode', () => {
    it('should return supplier when found by code', async () => {
      const mockSupplier = { _id: '123', name: 'Test Supplier', code: 'SUPP001' };
      supplierRepository.findByCode.mockResolvedValue(mockSupplier);

      const result = await supplierService.getSupplierByCode('SUPP001');

      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.findByCode).toHaveBeenCalledWith('SUPP001');
    });

    it('should throw error when supplier not found by code', async () => {
      supplierRepository.findByCode.mockResolvedValue(null);

      await expect(supplierService.getSupplierByCode('INVALID')).rejects.toThrow('Supplier not found');
    });
  });

  describe('createSupplier', () => {
    it('should create supplier with valid data', async () => {
      const supplierData = {
        name: 'New Supplier',
        code: 'SUPP002',
        type: 'supplier',
      };
      const mockCreatedSupplier = { _id: '456', ...supplierData };

      supplierRepository.codeExists.mockResolvedValue(false);
      supplierRepository.create.mockResolvedValue(mockCreatedSupplier);

      const result = await supplierService.createSupplier(supplierData);

      expect(result).toEqual(mockCreatedSupplier);
      expect(supplierRepository.codeExists).toHaveBeenCalledWith('SUPP002');
      expect(supplierRepository.create).toHaveBeenCalledWith(supplierData);
    });

    it('should throw error when name is missing', async () => {
      const supplierData = { code: 'SUPP002' };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Supplier name is required');
    });

    it('should throw error when code already exists', async () => {
      const supplierData = {
        name: 'New Supplier',
        code: 'SUPP002',
      };

      supplierRepository.codeExists.mockResolvedValue(true);

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Supplier code already exists');
    });

    it('should throw error for invalid type', async () => {
      const supplierData = {
        name: 'New Supplier',
        type: 'invalid',
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Invalid type');
    });

    it('should throw error for negative credit limit', async () => {
      const supplierData = {
        name: 'New Supplier',
        financialInfo: {
          creditLimit: -1000,
        },
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Credit limit cannot be negative');
    });

    it('should throw error for invalid payment terms', async () => {
      const supplierData = {
        name: 'New Supplier',
        financialInfo: {
          paymentTerms: 400,
        },
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Payment terms must be between 0 and 365 days');
    });

    it('should throw error for invalid email format', async () => {
      const supplierData = {
        name: 'New Supplier',
        contactInfo: {
          email: 'invalid-email',
        },
      };

      await expect(supplierService.createSupplier(supplierData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier with valid data', async () => {
      const existingSupplier = { _id: '123', name: 'Old Name', code: 'SUPP001' };
      const updateData = { name: 'New Name' };
      const updatedSupplier = { ...existingSupplier, ...updateData };

      supplierRepository.findById.mockResolvedValue(existingSupplier);
      supplierRepository.update.mockResolvedValue(updatedSupplier);

      const result = await supplierService.updateSupplier('123', updateData);

      expect(result).toEqual(updatedSupplier);
      expect(supplierRepository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should throw error when supplier not found', async () => {
      supplierRepository.findById.mockResolvedValue(null);

      await expect(supplierService.updateSupplier('123', { name: 'New Name' })).rejects.toThrow('Supplier not found');
    });

    it('should throw error when updating to duplicate code', async () => {
      const existingSupplier = { _id: '123', name: 'Supplier', code: 'SUPP001' };
      const updateData = { code: 'SUPP002' };

      supplierRepository.findById.mockResolvedValue(existingSupplier);
      supplierRepository.codeExists.mockResolvedValue(true);

      await expect(supplierService.updateSupplier('123', updateData)).rejects.toThrow('Supplier code already exists');
    });
  });

  describe('deleteSupplier', () => {
    it('should soft delete supplier', async () => {
      const mockSupplier = { _id: '123', name: 'Supplier', isActive: true };
      const deletedSupplier = { ...mockSupplier, isActive: false };

      supplierRepository.findById.mockResolvedValue(mockSupplier);
      supplierRepository.softDelete.mockResolvedValue(deletedSupplier);

      const result = await supplierService.deleteSupplier('123');

      expect(result).toEqual(deletedSupplier);
      expect(supplierRepository.softDelete).toHaveBeenCalledWith('123');
    });

    it('should throw error when supplier not found', async () => {
      supplierRepository.findById.mockResolvedValue(null);

      await expect(supplierService.deleteSupplier('123')).rejects.toThrow('Supplier not found');
    });
  });

  describe('calculatePaymentDueDate', () => {
    it('should calculate payment due date', async () => {
      const invoiceDate = new Date('2024-01-01');
      const dueDate = new Date('2024-01-31');
      const mockSupplier = {
        _id: '123',
        name: 'Supplier',
        financialInfo: { paymentTerms: 30 },
        getPaymentDueDate: jest.fn().mockReturnValue(dueDate),
      };

      supplierRepository.findById.mockResolvedValue(mockSupplier);

      const result = await supplierService.calculatePaymentDueDate('123', invoiceDate);

      expect(result).toEqual(dueDate);
      expect(mockSupplier.getPaymentDueDate).toHaveBeenCalledWith(invoiceDate);
    });
  });

  describe('validateType', () => {
    it('should pass for valid types', () => {
      expect(() => supplierService.validateType('customer')).not.toThrow();
      expect(() => supplierService.validateType('supplier')).not.toThrow();
      expect(() => supplierService.validateType('both')).not.toThrow();
    });

    it('should throw error for invalid type', () => {
      expect(() => supplierService.validateType('invalid')).toThrow('Invalid type');
    });
  });

  describe('getAllSuppliers', () => {
    it('should return paginated suppliers', async () => {
      const mockSuppliers = [
        { _id: '1', name: 'Supplier 1' },
        { _id: '2', name: 'Supplier 2' },
      ];

      supplierRepository.search.mockResolvedValue(mockSuppliers);
      supplierRepository.count.mockResolvedValue(10);

      const result = await supplierService.getAllSuppliers({}, { page: 1, limit: 2 });

      expect(result.suppliers).toEqual(mockSuppliers);
      expect(result.pagination.totalItems).toBe(10);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('searchSuppliers', () => {
    it('should search suppliers with keyword', async () => {
      const mockSuppliers = [{ _id: '1', name: 'Test Supplier' }];
      supplierRepository.search.mockResolvedValue(mockSuppliers);

      const result = await supplierService.searchSuppliers('Test');

      expect(result).toEqual(mockSuppliers);
      expect(supplierRepository.search).toHaveBeenCalledWith('Test', {});
    });

    it('should throw error for empty keyword', async () => {
      await expect(supplierService.searchSuppliers('')).rejects.toThrow('Search keyword is required');
      await expect(supplierService.searchSuppliers('   ')).rejects.toThrow('Search keyword is required');
    });
  });

  describe('getSuppliersByPaymentTerms', () => {
    it('should get suppliers by payment terms', async () => {
      const mockSuppliers = [{ _id: '1', name: 'Supplier 1' }];
      supplierRepository.findByPaymentTerms.mockResolvedValue(mockSuppliers);

      const result = await supplierService.getSuppliersByPaymentTerms(30);

      expect(result).toEqual(mockSuppliers);
      expect(supplierRepository.findByPaymentTerms).toHaveBeenCalledWith(30);
    });

    it('should throw error for invalid payment terms', async () => {
      await expect(supplierService.getSuppliersByPaymentTerms(-1)).rejects.toThrow('Payment terms must be between 0 and 365 days');
      await expect(supplierService.getSuppliersByPaymentTerms(400)).rejects.toThrow('Payment terms must be between 0 and 365 days');
    });
  });

  describe('bulkCreateSuppliers', () => {
    it('should create multiple suppliers', async () => {
      const suppliersData = [
        { name: 'Supplier 1', code: 'S001' },
        { name: 'Supplier 2', code: 'S002' },
      ];
      const mockCreated = suppliersData.map((s, i) => ({ _id: `${i}`, ...s }));

      supplierRepository.codeExists.mockResolvedValue(false);
      supplierRepository.bulkCreate.mockResolvedValue(mockCreated);

      const result = await supplierService.bulkCreateSuppliers(suppliersData);

      expect(result).toEqual(mockCreated);
      expect(supplierRepository.bulkCreate).toHaveBeenCalledWith(suppliersData);
    });

    it('should throw error for empty array', async () => {
      await expect(supplierService.bulkCreateSuppliers([])).rejects.toThrow('Suppliers data must be a non-empty array');
    });

    it('should throw error for duplicate codes in batch', async () => {
      const suppliersData = [
        { name: 'Supplier 1', code: 'DUP' },
        { name: 'Supplier 2', code: 'DUP' },
      ];

      await expect(supplierService.bulkCreateSuppliers(suppliersData)).rejects.toThrow('Duplicate code in batch');
    });
  });
});
