const mongoose = require('mongoose');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');

describe('Account-based Tax Determination', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
  });

  describe('Customer Tax Fields', () => {
    it('should create customer with default tax settings', async () => {
      const customer = await Customer.create({
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
      });

      expect(customer.financialInfo.advanceTaxRate).toBe(0);
      expect(customer.financialInfo.isNonFiler).toBe(false);
    });

    it('should create customer with 0.5% advance tax rate', async () => {
      const customer = await Customer.create({
        code: 'CUST002',
        name: 'Registered Customer',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 0.5,
          isNonFiler: false,
        },
      });

      expect(customer.financialInfo.advanceTaxRate).toBe(0.5);
      expect(customer.financialInfo.isNonFiler).toBe(false);
    });

    it('should create customer with 2.5% advance tax rate', async () => {
      const customer = await Customer.create({
        code: 'CUST003',
        name: 'Unregistered Customer',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: false,
        },
      });

      expect(customer.financialInfo.advanceTaxRate).toBe(2.5);
      expect(customer.financialInfo.isNonFiler).toBe(false);
    });

    it('should create customer marked as non-filer', async () => {
      const customer = await Customer.create({
        code: 'CUST004',
        name: 'Non-Filer Customer',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 0.5,
          isNonFiler: true,
        },
      });

      expect(customer.financialInfo.advanceTaxRate).toBe(0.5);
      expect(customer.financialInfo.isNonFiler).toBe(true);
    });

    it('should reject invalid advance tax rate', async () => {
      await expect(
        Customer.create({
          code: 'CUST005',
          name: 'Invalid Tax Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 5.0,
          },
        })
      ).rejects.toThrow();
    });

    it('should allow updating tax settings', async () => {
      const customer = await Customer.create({
        code: 'CUST006',
        name: 'Update Tax Customer',
        type: 'customer',
      });

      customer.financialInfo.advanceTaxRate = 2.5;
      customer.financialInfo.isNonFiler = true;
      await customer.save();

      const updated = await Customer.findById(customer._id);
      expect(updated.financialInfo.advanceTaxRate).toBe(2.5);
      expect(updated.financialInfo.isNonFiler).toBe(true);
    });
  });

  describe('Supplier Tax Fields', () => {
    it('should create supplier with default tax settings', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP001',
        name: 'Test Supplier',
        type: 'supplier',
      });

      expect(supplier.financialInfo.advanceTaxRate).toBe(0);
      expect(supplier.financialInfo.isNonFiler).toBe(false);
    });

    it('should create supplier with 0.5% advance tax rate', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP002',
        name: 'Registered Supplier',
        type: 'supplier',
        financialInfo: {
          advanceTaxRate: 0.5,
          isNonFiler: false,
        },
      });

      expect(supplier.financialInfo.advanceTaxRate).toBe(0.5);
      expect(supplier.financialInfo.isNonFiler).toBe(false);
    });

    it('should create supplier with 2.5% advance tax rate', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP003',
        name: 'Unregistered Supplier',
        type: 'supplier',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: false,
        },
      });

      expect(supplier.financialInfo.advanceTaxRate).toBe(2.5);
      expect(supplier.financialInfo.isNonFiler).toBe(false);
    });

    it('should create supplier marked as non-filer', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP004',
        name: 'Non-Filer Supplier',
        type: 'supplier',
        financialInfo: {
          advanceTaxRate: 0.5,
          isNonFiler: true,
        },
      });

      expect(supplier.financialInfo.advanceTaxRate).toBe(0.5);
      expect(supplier.financialInfo.isNonFiler).toBe(true);
    });

    it('should reject invalid advance tax rate', async () => {
      await expect(
        Supplier.create({
          code: 'SUPP005',
          name: 'Invalid Tax Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 3.0,
          },
        })
      ).rejects.toThrow();
    });

    it('should allow updating tax settings', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP006',
        name: 'Update Tax Supplier',
        type: 'supplier',
      });

      supplier.financialInfo.advanceTaxRate = 2.5;
      supplier.financialInfo.isNonFiler = true;
      await supplier.save();

      const updated = await Supplier.findById(supplier._id);
      expect(updated.financialInfo.advanceTaxRate).toBe(2.5);
      expect(updated.financialInfo.isNonFiler).toBe(true);
    });
  });

  describe('Tax Rate Validation', () => {
    it('should only allow 0, 0.5, or 2.5 for customer advance tax rate', async () => {
      const validRates = [0, 0.5, 2.5];
      
      for (const rate of validRates) {
        const customer = await Customer.create({
          code: `CUST_RATE_${rate}`,
          name: `Customer ${rate}%`,
          type: 'customer',
          financialInfo: {
            advanceTaxRate: rate,
          },
        });
        expect(customer.financialInfo.advanceTaxRate).toBe(rate);
      }
    });

    it('should only allow 0, 0.5, or 2.5 for supplier advance tax rate', async () => {
      const validRates = [0, 0.5, 2.5];
      
      for (const rate of validRates) {
        const supplier = await Supplier.create({
          code: `SUPP_RATE_${rate}`,
          name: `Supplier ${rate}%`,
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: rate,
          },
        });
        expect(supplier.financialInfo.advanceTaxRate).toBe(rate);
      }
    });

    it('should reject negative advance tax rate', async () => {
      await expect(
        Customer.create({
          code: 'CUST_NEG',
          name: 'Negative Tax Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: -1,
          },
        })
      ).rejects.toThrow();
    });

    it('should reject advance tax rate above 2.5', async () => {
      await expect(
        Supplier.create({
          code: 'SUPP_HIGH',
          name: 'High Tax Supplier',
          type: 'supplier',
          financialInfo: {
            advanceTaxRate: 10,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Non-Filer Flag', () => {
    it('should handle non-filer flag as boolean', async () => {
      const customer = await Customer.create({
        code: 'CUST_BOOL',
        name: 'Boolean Test Customer',
        type: 'customer',
        financialInfo: {
          isNonFiler: true,
        },
      });

      expect(typeof customer.financialInfo.isNonFiler).toBe('boolean');
      expect(customer.financialInfo.isNonFiler).toBe(true);
    });

    it('should default non-filer to false', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP_DEFAULT',
        name: 'Default Non-Filer Supplier',
        type: 'supplier',
      });

      expect(supplier.financialInfo.isNonFiler).toBe(false);
    });

    it('should allow toggling non-filer status', async () => {
      const customer = await Customer.create({
        code: 'CUST_TOGGLE',
        name: 'Toggle Customer',
        type: 'customer',
        financialInfo: {
          isNonFiler: false,
        },
      });

      customer.financialInfo.isNonFiler = true;
      await customer.save();

      let updated = await Customer.findById(customer._id);
      expect(updated.financialInfo.isNonFiler).toBe(true);

      updated.financialInfo.isNonFiler = false;
      await updated.save();

      updated = await Customer.findById(customer._id);
      expect(updated.financialInfo.isNonFiler).toBe(false);
    });
  });

  describe('Combined Tax Settings', () => {
    it('should handle registered filer (0.5% rate, not non-filer)', async () => {
      const customer = await Customer.create({
        code: 'CUST_REG_FILER',
        name: 'Registered Filer',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 0.5,
          isNonFiler: false,
        },
      });

      expect(customer.financialInfo.advanceTaxRate).toBe(0.5);
      expect(customer.financialInfo.isNonFiler).toBe(false);
    });

    it('should handle unregistered account (2.5% rate)', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP_UNREG',
        name: 'Unregistered Account',
        type: 'supplier',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: false,
        },
      });

      expect(supplier.financialInfo.advanceTaxRate).toBe(2.5);
      expect(supplier.financialInfo.isNonFiler).toBe(false);
    });

    it('should handle non-filer with advance tax', async () => {
      const customer = await Customer.create({
        code: 'CUST_NONFILER_TAX',
        name: 'Non-Filer with Tax',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 0.5,
          isNonFiler: true,
        },
      });

      expect(customer.financialInfo.advanceTaxRate).toBe(0.5);
      expect(customer.financialInfo.isNonFiler).toBe(true);
    });

    it('should handle no advance tax but non-filer', async () => {
      const supplier = await Supplier.create({
        code: 'SUPP_NONFILER_NOTAX',
        name: 'Non-Filer No Tax',
        type: 'supplier',
        financialInfo: {
          advanceTaxRate: 0,
          isNonFiler: true,
        },
      });

      expect(supplier.financialInfo.advanceTaxRate).toBe(0);
      expect(supplier.financialInfo.isNonFiler).toBe(true);
    });
  });
});
