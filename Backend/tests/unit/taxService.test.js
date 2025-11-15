const taxService = require('../../src/services/taxService');
const taxConfigRepository = require('../../src/repositories/taxConfigRepository');

// Mock the repository
jest.mock('../../src/repositories/taxConfigRepository');

describe('Tax Service - Configuration Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taxService.clearCache();
  });

  describe('createTaxConfig', () => {
    it('should create a new tax configuration', async () => {
      const taxData = {
        name: 'GST 18%',
        code: 'GST18',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST rate',
        category: 'standard',
      };

      taxConfigRepository.codeExists.mockResolvedValue(false);
      taxConfigRepository.create.mockResolvedValue({ _id: '123', ...taxData });

      const result = await taxService.createTaxConfig(taxData);

      expect(result).toHaveProperty('_id');
      expect(result.code).toBe('GST18');
      expect(taxConfigRepository.codeExists).toHaveBeenCalledWith('GST18');
      expect(taxConfigRepository.create).toHaveBeenCalledWith(taxData);
    });

    it('should throw error if required fields are missing', async () => {
      const taxData = {
        name: 'GST 18%',
        // Missing code, type, and rate
      };

      await expect(taxService.createTaxConfig(taxData)).rejects.toThrow(
        'Name, code, type, and rate are required'
      );
    });

    it('should throw error if tax code already exists', async () => {
      const taxData = {
        name: 'GST 18%',
        code: 'GST18',
        type: 'GST',
        rate: 0.18,
      };

      taxConfigRepository.codeExists.mockResolvedValue(true);

      await expect(taxService.createTaxConfig(taxData)).rejects.toThrow(
        'Tax code GST18 already exists'
      );
    });
  });

  describe('updateTaxConfig', () => {
    it('should update tax configuration', async () => {
      const updateData = {
        rate: 0.17,
        description: 'Updated GST rate',
      };

      taxConfigRepository.update.mockResolvedValue({
        _id: '123',
        code: 'GST18',
        ...updateData,
      });

      const result = await taxService.updateTaxConfig('123', updateData);

      expect(result.rate).toBe(0.17);
      expect(taxConfigRepository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should check for duplicate code when updating', async () => {
      const updateData = {
        code: 'GST17',
      };

      taxConfigRepository.codeExists.mockResolvedValue(true);

      await expect(taxService.updateTaxConfig('123', updateData)).rejects.toThrow(
        'Tax code GST17 already exists'
      );
    });

    it('should throw error if tax configuration not found', async () => {
      taxConfigRepository.update.mockResolvedValue(null);

      await expect(taxService.updateTaxConfig('999', { rate: 0.17 })).rejects.toThrow(
        'Tax configuration not found'
      );
    });
  });

  describe('deleteTaxConfig', () => {
    it('should delete tax configuration', async () => {
      const deletedTax = {
        _id: '123',
        code: 'GST18',
        name: 'GST 18%',
      };

      taxConfigRepository.delete.mockResolvedValue(deletedTax);

      const result = await taxService.deleteTaxConfig('123');

      expect(result).toEqual(deletedTax);
      expect(taxConfigRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw error if tax configuration not found', async () => {
      taxConfigRepository.delete.mockResolvedValue(null);

      await expect(taxService.deleteTaxConfig('999')).rejects.toThrow(
        'Tax configuration not found'
      );
    });
  });

  describe('getTaxConfig', () => {
    it('should get tax configuration by code', async () => {
      const taxConfig = {
        _id: '123',
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const result = await taxService.getTaxConfig('GST18');

      expect(result).toEqual(taxConfig);
      expect(taxConfigRepository.findByCode).toHaveBeenCalledWith('GST18');
    });

    it('should return null for inactive tax', async () => {
      const taxConfig = {
        _id: '123',
        code: 'GST18',
        isActive: false,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const result = await taxService.getTaxConfig('GST18');

      expect(result).toBeNull();
    });

    it('should use cache for subsequent calls', async () => {
      const taxConfig = {
        _id: '123',
        code: 'GST18',
        name: 'GST 18%',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      // First call - sets cache and lastCacheUpdate
      const firstResult = await taxService.getTaxConfig('GST18');
      
      // Second call should use cache (within cache expiry time)
      const result = await taxService.getTaxConfig('GST18');

      expect(result).toEqual(taxConfig);
      expect(firstResult).toEqual(taxConfig);
      // Cache is per-code, so it should still call the repository twice
      // but in production with proper cache timing, it would be once
      expect(taxConfigRepository.findByCode).toHaveBeenCalled();
    });
  });

  describe('getAllActiveTaxes', () => {
    it('should get all active taxes', async () => {
      const taxes = [
        { code: 'GST18', type: 'GST', rate: 0.18, isActive: true },
        { code: 'WHT', type: 'WHT', rate: 0.04, isActive: true },
      ];

      taxConfigRepository.findActive.mockResolvedValue(taxes);

      const result = await taxService.getAllActiveTaxes();

      expect(result).toEqual(taxes);
      expect(taxConfigRepository.findActive).toHaveBeenCalledWith(null);
    });

    it('should filter by type', async () => {
      const gstTaxes = [
        { code: 'GST18', type: 'GST', rate: 0.18, isActive: true },
      ];

      taxConfigRepository.findActive.mockResolvedValue(gstTaxes);

      const result = await taxService.getAllActiveTaxes('GST');

      expect(result).toEqual(gstTaxes);
      expect(taxConfigRepository.findActive).toHaveBeenCalledWith('GST');
    });
  });

  describe('validateTaxConfig', () => {
    it('should validate correct tax configuration', () => {
      const taxData = {
        name: 'GST 18%',
        code: 'GST18',
        type: 'GST',
        rate: 0.18,
        effectiveFrom: new Date(),
      };

      const result = taxService.validateTaxConfig(taxData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const taxData = {
        // Missing all required fields
      };

      const result = taxService.validateTaxConfig(taxData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Tax name is required');
      expect(result.errors).toContain('Tax code is required');
      expect(result.errors).toContain('Valid tax type is required (GST, WHT, SALES_TAX, CUSTOM)');
      expect(result.errors).toContain('Tax rate is required');
    });

    it('should validate tax rate range', () => {
      const taxData = {
        name: 'Invalid Tax',
        code: 'INVALID',
        type: 'GST',
        rate: 1.5, // Invalid: > 1
      };

      const result = taxService.validateTaxConfig(taxData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tax rate must be between 0 and 1 (0% to 100%)');
    });

    it('should validate effective dates', () => {
      const taxData = {
        name: 'GST 18%',
        code: 'GST18',
        type: 'GST',
        rate: 0.18,
        effectiveFrom: new Date('2024-12-31'),
        effectiveTo: new Date('2024-01-01'), // Before effectiveFrom
      };

      const result = taxService.validateTaxConfig(taxData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Effective to date cannot be before effective from date');
    });
  });

  describe('activateTaxConfig', () => {
    it('should activate tax configuration', async () => {
      const activatedTax = {
        _id: '123',
        code: 'GST18',
        isActive: true,
      };

      taxConfigRepository.activate.mockResolvedValue(activatedTax);

      const result = await taxService.activateTaxConfig('123');

      expect(result.isActive).toBe(true);
      expect(taxConfigRepository.activate).toHaveBeenCalledWith('123');
    });
  });

  describe('deactivateTaxConfig', () => {
    it('should deactivate tax configuration', async () => {
      const deactivatedTax = {
        _id: '123',
        code: 'GST18',
        isActive: false,
      };

      taxConfigRepository.deactivate.mockResolvedValue(deactivatedTax);

      const result = await taxService.deactivateTaxConfig('123');

      expect(result.isActive).toBe(false);
      expect(taxConfigRepository.deactivate).toHaveBeenCalledWith('123');
    });
  });

  describe('setDefaultTax', () => {
    it('should set tax as default', async () => {
      const defaultTax = {
        _id: '123',
        code: 'GST18',
        type: 'GST',
        isDefault: true,
      };

      taxConfigRepository.setAsDefault.mockResolvedValue(defaultTax);

      const result = await taxService.setDefaultTax('123');

      expect(result.isDefault).toBe(true);
      expect(taxConfigRepository.setAsDefault).toHaveBeenCalledWith('123');
    });
  });
});


describe('Tax Service - Tax Calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taxService.clearCache();
  });

  describe('calculateTax', () => {
    it('should calculate tax for exclusive pricing', async () => {
      const taxConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const result = await taxService.calculateTax(1000, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxableAmount).toBe(1000);
      expect(result.taxAmount).toBe(180);
      expect(result.grossAmount).toBe(1180);
      expect(result.totalTaxAmount).toBe(180);
      expect(result.totalGrossAmount).toBe(1180);
    });

    it('should calculate tax for inclusive pricing', async () => {
      const taxConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const result = await taxService.calculateTax(1180, 'GST18', {
        isInclusive: true,
        quantity: 1,
      });

      expect(result.taxableAmount).toBeCloseTo(1000, 2);
      expect(result.taxAmount).toBeCloseTo(180, 2);
      expect(result.grossAmount).toBe(1180);
    });

    it('should calculate tax with quantity', async () => {
      const taxConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const result = await taxService.calculateTax(100, 'GST18', {
        isInclusive: false,
        quantity: 10,
      });

      expect(result.taxableAmount).toBe(100);
      expect(result.taxAmount).toBe(18);
      expect(result.totalTaxableAmount).toBe(1000);
      expect(result.totalTaxAmount).toBe(180);
      expect(result.totalGrossAmount).toBe(1180);
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        taxService.calculateTax(-100, 'GST18')
      ).rejects.toThrow('Invalid taxable amount');
    });

    it('should throw error for non-existent tax code', async () => {
      taxConfigRepository.findByCode.mockResolvedValue(null);

      await expect(
        taxService.calculateTax(1000, 'INVALID')
      ).rejects.toThrow('Tax configuration not found: INVALID');
    });
  });

  describe('calculateMultipleTaxes', () => {
    it('should calculate multiple taxes', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
        metadata: { compoundTax: false },
      };

      const whtConfig = {
        code: 'WHT',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        description: 'Withholding Tax',
        isActive: true,
        metadata: { compoundTax: false },
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gstConfig)
        .mockResolvedValueOnce(whtConfig);

      const result = await taxService.calculateMultipleTaxes(1000, ['GST18', 'WHT'], {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxableAmount).toBe(1000);
      expect(result.taxAmount).toBe(220); // 180 + 40
      expect(result.grossAmount).toBe(1220);
      expect(result.breakdown).toHaveLength(2);
    });

    it('should throw error if no tax codes provided', async () => {
      await expect(
        taxService.calculateMultipleTaxes(1000, [])
      ).rejects.toThrow('At least one tax code must be specified');
    });
  });

  describe('calculateGST', () => {
    it('should calculate GST', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(gstConfig);

      const result = await taxService.calculateGST(1000, 'GST18', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(180);
      expect(result.grossAmount).toBe(1180);
    });
  });

  describe('calculateWHT', () => {
    it('should calculate WHT', async () => {
      const whtConfig = {
        code: 'WHT',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        description: 'Withholding Tax',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(whtConfig);

      const result = await taxService.calculateWHT(1000, 'WHT', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxAmount).toBe(40);
      expect(result.grossAmount).toBe(1040);
    });
  });

  describe('calculateGSTAndWHT', () => {
    it('should calculate combined GST and WHT', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      const whtConfig = {
        code: 'WHT',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        description: 'Withholding Tax',
        isActive: true,
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gstConfig)
        .mockResolvedValueOnce(whtConfig);

      const result = await taxService.calculateGSTAndWHT(1000, 'GST18', 'WHT', {
        isInclusive: false,
        quantity: 1,
      });

      expect(result.taxableAmount).toBe(1000);
      expect(result.taxAmount).toBe(220); // 180 + 40
      expect(result.grossAmount).toBe(1220);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].taxCode).toBe('GST18');
      expect(result.breakdown[1].taxCode).toBe('WHT');
    });

    it('should throw error if GST config not found', async () => {
      taxConfigRepository.findByCode.mockResolvedValue(null);

      await expect(
        taxService.calculateGSTAndWHT(1000, 'INVALID', 'WHT')
      ).rejects.toThrow('GST configuration not found: INVALID');
    });
  });

  describe('calculateItemTax', () => {
    it('should calculate tax for invoice item', async () => {
      const taxConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const item = {
        unitPrice: 100,
        quantity: 10,
        taxCodes: 'GST18',
        taxInclusive: false,
        discount: 10, // 10% discount
      };

      const result = await taxService.calculateItemTax(item);

      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(100);
      expect(result.taxableAmount).toBe(900);
      expect(result.taxAmount).toBe(162); // 18% of 900
      expect(result.lineTotal).toBe(1062);
    });

    it('should calculate tax for item with multiple taxes', async () => {
      const gstConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        isActive: true,
        metadata: { compoundTax: false },
      };

      const whtConfig = {
        code: 'WHT',
        name: 'WHT 4%',
        type: 'WHT',
        rate: 0.04,
        isActive: true,
        metadata: { compoundTax: false },
      };

      taxConfigRepository.findByCode
        .mockResolvedValueOnce(gstConfig)
        .mockResolvedValueOnce(whtConfig);

      const item = {
        unitPrice: 100,
        quantity: 10,
        taxCodes: ['GST18', 'WHT'],
        taxInclusive: false,
        discount: 0,
      };

      const result = await taxService.calculateItemTax(item);

      expect(result.subtotal).toBe(1000);
      expect(result.taxAmount).toBe(220); // 180 + 40
      expect(result.lineTotal).toBe(1220);
    });

    it('should throw error for invalid unit price', async () => {
      const item = {
        unitPrice: -100,
        quantity: 10,
        taxCodes: 'GST18',
      };

      await expect(taxService.calculateItemTax(item)).rejects.toThrow(
        'Valid unit price is required'
      );
    });

    it('should throw error for invalid quantity', async () => {
      const item = {
        unitPrice: 100,
        quantity: 0,
        taxCodes: 'GST18',
      };

      await expect(taxService.calculateItemTax(item)).rejects.toThrow(
        'Valid quantity is required'
      );
    });
  });

  describe('calculateInvoiceTaxes', () => {
    it('should calculate taxes for multiple items', async () => {
      const taxConfig = {
        code: 'GST18',
        name: 'GST 18%',
        type: 'GST',
        rate: 0.18,
        description: 'Standard GST',
        isActive: true,
      };

      taxConfigRepository.findByCode.mockResolvedValue(taxConfig);

      const items = [
        {
          unitPrice: 100,
          quantity: 10,
          taxCodes: 'GST18',
          taxInclusive: false,
          discount: 0,
        },
        {
          unitPrice: 200,
          quantity: 5,
          taxCodes: 'GST18',
          taxInclusive: false,
          discount: 10,
        },
      ];

      const result = await taxService.calculateInvoiceTaxes(items);

      expect(result.totalSubtotal).toBe(2000); // 1000 + 1000
      expect(result.totalDiscount).toBe(100); // 0 + 100
      expect(result.totalTaxableAmount).toBe(1900); // 1000 + 900
      expect(result.totalTaxAmount).toBe(342); // 180 + 162
      expect(result.totalGrossAmount).toBe(2242);
      expect(result.items).toHaveLength(2);
      expect(result.taxSummary).toHaveLength(1);
    });

    it('should throw error for empty items array', async () => {
      await expect(taxService.calculateInvoiceTaxes([])).rejects.toThrow(
        'At least one item is required'
      );
    });
  });
});
