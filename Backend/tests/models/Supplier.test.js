const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Supplier = require('../../src/models/Supplier');

describe('Supplier Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Supplier.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid supplier', async () => {
      const supplierData = {
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        contactInfo: {
          phone: '+92-300-1234567',
          email: 'supplier@example.com',
          address: '123 Main Street',
          city: 'Karachi',
          country: 'Pakistan'
        },
        financialInfo: {
          creditLimit: 100000,
          paymentTerms: 30,
          taxNumber: 'TAX123456',
          currency: 'PKR'
        }
      };

      const supplier = new Supplier(supplierData);
      const savedSupplier = await supplier.save();

      expect(savedSupplier.code).toBe(supplierData.code);
      expect(savedSupplier.name).toBe(supplierData.name);
      expect(savedSupplier.type).toBe(supplierData.type);
      expect(savedSupplier.isActive).toBe(true);
      expect(savedSupplier.contactInfo.email).toBe(supplierData.contactInfo.email);
      expect(savedSupplier.financialInfo.creditLimit).toBe(supplierData.financialInfo.creditLimit);
    });

    it('should require supplier code', async () => {
      const supplierData = {
        name: 'Test Supplier',
        type: 'supplier'
      };

      const supplier = new Supplier(supplierData);
      await expect(supplier.save()).rejects.toThrow('Supplier code is required');
    });

    it('should require supplier name', async () => {
      const supplierData = {
        code: 'SUPP001',
        type: 'supplier'
      };

      const supplier = new Supplier(supplierData);
      await expect(supplier.save()).rejects.toThrow('Supplier name is required');
    });

    it('should validate type enum', async () => {
      const supplierData = {
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'invalid_type'
      };

      const supplier = new Supplier(supplierData);
      await expect(supplier.save()).rejects.toThrow();
    });

    it('should enforce unique supplier code', async () => {
      const supplierData = {
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier'
      };

      await new Supplier(supplierData).save();

      const duplicateSupplier = new Supplier({
        ...supplierData,
        name: 'Another Supplier'
      });

      await expect(duplicateSupplier.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const supplierData = {
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        contactInfo: {
          email: 'invalid-email'
        }
      };

      const supplier = new Supplier(supplierData);
      await expect(supplier.save()).rejects.toThrow('Please enter a valid email');
    });

    it('should set default values', async () => {
      const supplierData = {
        code: 'SUPP001',
        name: 'Test Supplier'
      };

      const supplier = new Supplier(supplierData);
      const savedSupplier = await supplier.save();

      expect(savedSupplier.type).toBe('supplier');
      expect(savedSupplier.isActive).toBe(true);
      expect(savedSupplier.financialInfo.creditLimit).toBe(0);
      expect(savedSupplier.financialInfo.paymentTerms).toBe(30);
      expect(savedSupplier.financialInfo.currency).toBe('PKR');
      expect(savedSupplier.contactInfo.country).toBe('Pakistan');
    });

    it('should validate payment terms range', async () => {
      const supplierData = {
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        financialInfo: {
          paymentTerms: 400
        }
      };

      const supplier = new Supplier(supplierData);
      await expect(supplier.save()).rejects.toThrow();
    });
  });

  describe('Auto-generated Code', () => {
    it('should auto-generate code if not provided', async () => {
      const supplierData = {
        name: 'Test Supplier',
        type: 'supplier'
      };

      const supplier = new Supplier(supplierData);
      const savedSupplier = await supplier.save();

      expect(savedSupplier.code).toBeDefined();
      expect(savedSupplier.code).toMatch(/^SUPP\d{6}$/);
    });

    it('should not override provided code', async () => {
      const supplierData = {
        code: 'CUSTOM001',
        name: 'Test Supplier',
        type: 'supplier'
      };

      const supplier = new Supplier(supplierData);
      const savedSupplier = await supplier.save();

      expect(savedSupplier.code).toBe('CUSTOM001');
    });
  });

  describe('Virtual Properties', () => {
    it('should generate full address', async () => {
      const supplier = new Supplier({
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        contactInfo: {
          address: '123 Main Street',
          city: 'Karachi',
          country: 'Pakistan'
        }
      });

      expect(supplier.fullAddress).toBe('123 Main Street, Karachi, Pakistan');
    });

    it('should handle partial address', async () => {
      const supplier = new Supplier({
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        contactInfo: {
          city: 'Karachi'
        }
      });

      expect(supplier.fullAddress).toBe('Karachi, Pakistan');
    });
  });

  describe('Instance Methods', () => {
    let supplier;

    beforeEach(async () => {
      supplier = new Supplier({
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
        financialInfo: {
          creditLimit: 50000,
          paymentTerms: 45
        }
      });
      await supplier.save();
    });

    it('should check if supplier allows credit purchases', () => {
      expect(supplier.allowsCreditPurchases()).toBe(true);

      supplier.financialInfo.creditLimit = 0;
      expect(supplier.allowsCreditPurchases()).toBe(false);
    });

    it('should calculate payment due date', () => {
      const invoiceDate = new Date('2024-01-01');
      const dueDate = supplier.getPaymentDueDate(invoiceDate);

      const expectedDate = new Date('2024-02-15'); // 45 days later
      expect(dueDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should use current date if no invoice date provided', () => {
      const dueDate = supplier.getPaymentDueDate();
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() + 45);

      expect(dueDate.toDateString()).toBe(expectedDate.toDateString());
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Supplier.create([
        {
          code: 'SUPP001',
          name: 'Supplier 1',
          type: 'supplier',
          financialInfo: { paymentTerms: 15 },
          isActive: true
        },
        {
          code: 'SUPP002',
          name: 'Supplier 2',
          type: 'supplier',
          financialInfo: { paymentTerms: 45 },
          isActive: true
        },
        {
          code: 'SUPP003',
          name: 'Supplier 3',
          type: 'both',
          financialInfo: { paymentTerms: 30 },
          isActive: true
        },
        {
          code: 'SUPP004',
          name: 'Supplier 4',
          type: 'supplier',
          financialInfo: { paymentTerms: 20 },
          isActive: false
        }
      ]);
    });

    it('should find suppliers by payment terms', async () => {
      const suppliers = await Supplier.findByPaymentTerms(30);
      expect(suppliers).toHaveLength(3);
      expect(suppliers.every(s => s.financialInfo.paymentTerms <= 30)).toBe(true);
      expect(suppliers.every(s => s.isActive)).toBe(true);
    });

    it('should find suppliers by type', async () => {
      const suppliers = await Supplier.findByType('supplier');
      expect(suppliers).toHaveLength(2);
      expect(suppliers.every(s => s.type === 'supplier')).toBe(true);
      expect(suppliers.every(s => s.isActive)).toBe(true);

      const bothType = await Supplier.findByType('both');
      expect(bothType).toHaveLength(1);
      expect(bothType[0].code).toBe('SUPP003');
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes', async () => {
      const indexes = await Supplier.collection.getIndexes();
      
      expect(indexes).toHaveProperty('code_1');
      expect(indexes.code_1).toEqual([['code', 1]]);
    });
  });

  describe('Account-Based Tax Determination - Phase 2 (Requirement 6.3, 6.4)', () => {
    describe('Advance Tax Rate', () => {
      it('should return 0% advance tax rate by default', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier'
        });
        await supplier.save();

        expect(supplier.getAdvanceTaxRate()).toBe(0);
      });

      it('should return 0.5% advance tax rate when set', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await supplier.save();

        expect(supplier.getAdvanceTaxRate()).toBe(0.5);
      });

      it('should return 2.5% advance tax rate when set', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 2.5
          }
        });
        await supplier.save();

        expect(supplier.getAdvanceTaxRate()).toBe(2.5);
      });

      it('should validate advance tax rate enum values', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 5.0 // Invalid value
          }
        });

        await expect(supplier.save()).rejects.toThrow();
      });
    });

    describe('Non-Filer Status', () => {
      it('should return false for non-filer status by default', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier'
        });
        await supplier.save();

        expect(supplier.isNonFilerAccount()).toBe(false);
      });

      it('should return true when supplier is marked as non-filer', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            isNonFiler: true
          }
        });
        await supplier.save();

        expect(supplier.isNonFilerAccount()).toBe(true);
      });
    });

    describe('Advance Tax Calculation', () => {
      it('should calculate 0% advance tax when rate is 0', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 0
          }
        });
        await supplier.save();

        const amount = 10000;
        const advanceTax = supplier.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(0);
      });

      it('should calculate 0.5% advance tax correctly', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await supplier.save();

        const amount = 10000;
        const advanceTax = supplier.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(50); // 0.5% of 10000
      });

      it('should calculate 2.5% advance tax correctly', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 2.5
          }
        });
        await supplier.save();

        const amount = 10000;
        const advanceTax = supplier.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(250); // 2.5% of 10000
      });

      it('should handle decimal amounts correctly', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await supplier.save();

        const amount = 12345.67;
        const advanceTax = supplier.calculateAdvanceTax(amount);
        expect(advanceTax).toBeCloseTo(61.73, 2); // 0.5% of 12345.67
      });
    });

    describe('Non-Filer GST Calculation', () => {
      it('should return 0 for non-filer GST when supplier is not a non-filer', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            isNonFiler: false
          }
        });
        await supplier.save();

        const amount = 10000;
        const nonFilerGST = supplier.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBe(0);
      });

      it('should calculate 0.1% non-filer GST correctly', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            isNonFiler: true
          }
        });
        await supplier.save();

        const amount = 10000;
        const nonFilerGST = supplier.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBe(10); // 0.1% of 10000
      });

      it('should handle decimal amounts for non-filer GST', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            isNonFiler: true
          }
        });
        await supplier.save();

        const amount = 12345.67;
        const nonFilerGST = supplier.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBeCloseTo(12.35, 2); // 0.1% of 12345.67
      });
    });

    describe('Combined Tax Scenarios', () => {
      it('should handle supplier with both advance tax and non-filer status', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 2.5,
            isNonFiler: true
          }
        });
        await supplier.save();

        const amount = 10000;
        const advanceTax = supplier.calculateAdvanceTax(amount);
        const nonFilerGST = supplier.calculateNonFilerGST(amount);

        expect(advanceTax).toBe(250); // 2.5% of 10000
        expect(nonFilerGST).toBe(10); // 0.1% of 10000
        expect(advanceTax + nonFilerGST).toBe(260);
      });

      it('should handle registered filer with advance tax', async () => {
        const supplier = new Supplier({
          code: 'SUPP001',
          name: 'Test Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 0.5,
            isNonFiler: false
          }
        });
        await supplier.save();

        const amount = 10000;
        const advanceTax = supplier.calculateAdvanceTax(amount);
        const nonFilerGST = supplier.calculateNonFilerGST(amount);

        expect(advanceTax).toBe(50); // 0.5% of 10000
        expect(nonFilerGST).toBe(0); // No non-filer GST
      });
    });
  });
});
