const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Customer = require('../../src/models/Customer');

describe('Customer Model', () => {
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
    await Customer.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid customer', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        contactInfo: {
          phone: '123456789',
          email: 'customer@example.com',
          address: '123 Test Street',
          city: 'Karachi',
          country: 'Pakistan'
        },
        financialInfo: {
          creditLimit: 50000,
          paymentTerms: 30,
          taxNumber: 'TAX123456',
          currency: 'PKR'
        }
      };

      const customer = new Customer(customerData);
      const savedCustomer = await customer.save();

      expect(savedCustomer.code).toBe(customerData.code);
      expect(savedCustomer.name).toBe(customerData.name);
      expect(savedCustomer.type).toBe(customerData.type);
      expect(savedCustomer.isActive).toBe(true);
    });

    it('should require name', async () => {
      const customerData = {
        code: 'CUST001',
        type: 'customer'
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Customer name is required');
    });

    it('should validate type enum', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        type: 'invalid_type'
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        contactInfo: {
          email: 'invalid-email'
        }
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Please enter a valid email');
    });

    it('should enforce unique code', async () => {
      const customerData = {
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer'
      };

      await new Customer(customerData).save();

      const duplicateCustomer = new Customer({
        ...customerData,
        name: 'Another Customer'
      });

      await expect(duplicateCustomer.save()).rejects.toThrow();
    });

    it('should auto-generate code if not provided', async () => {
      const customerData = {
        name: 'Test Customer',
        type: 'customer'
      };

      const customer = new Customer(customerData);
      await customer.save();

      expect(customer.code).toMatch(/^CUST\d{6}$/);
    });
  });

  describe('Virtuals', () => {
    it('should generate full address virtual', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        contactInfo: {
          address: '123 Test Street',
          city: 'Karachi',
          country: 'Pakistan'
        }
      });

      expect(customer.fullAddress).toBe('123 Test Street, Karachi, Pakistan');
    });

    it('should handle partial address in virtual', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        contactInfo: {
          city: 'Karachi'
        }
      });

      expect(customer.fullAddress).toBe('Karachi');
    });
  });

  describe('Instance Methods', () => {
    let customer;

    beforeEach(async () => {
      customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        financialInfo: {
          creditLimit: 50000
        }
      });
      await customer.save();
    });

    it('should check credit availability', () => {
      expect(customer.checkCreditAvailability(30000)).toBe(true);
      expect(customer.checkCreditAvailability(60000)).toBe(false);
    });

    it('should get available credit', () => {
      expect(customer.getAvailableCredit()).toBe(50000);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Customer.create([
        {
          name: 'Customer 1',
          type: 'customer',
          financialInfo: { creditLimit: 100000 },
          isActive: true
        },
        {
          name: 'Customer 2',
          type: 'customer',
          financialInfo: { creditLimit: 25000 },
          isActive: true
        },
        {
          name: 'Supplier 1',
          type: 'supplier',
          financialInfo: { creditLimit: 75000 },
          isActive: true
        },
        {
          name: 'Inactive Customer',
          type: 'customer',
          financialInfo: { creditLimit: 50000 },
          isActive: false
        }
      ]);
    });

    it('should find customers with credit limit', async () => {
      const customers = await Customer.findWithCreditLimit(50000);
      expect(customers).toHaveLength(2); // Customer 1 and Supplier 1
    });

    it('should find by type', async () => {
      const customers = await Customer.findByType('customer');
      expect(customers).toHaveLength(2); // Only active customers

      const suppliers = await Customer.findByType('supplier');
      expect(suppliers).toHaveLength(1);
    });
  });

  describe('Validation Rules', () => {
    it('should validate credit limit is not negative', async () => {
      const customerData = {
        name: 'Test Customer',
        financialInfo: {
          creditLimit: -1000
        }
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Credit limit cannot be negative');
    });

    it('should validate payment terms range', async () => {
      const customerData = {
        name: 'Test Customer',
        financialInfo: {
          paymentTerms: 400
        }
      };

      const customer = new Customer(customerData);
      await expect(customer.save()).rejects.toThrow('Payment terms cannot exceed 365 days');
    });
  });

  describe('Account-Based Tax Determination - Phase 2 (Requirement 6.3, 6.4)', () => {
    describe('Advance Tax Rate', () => {
      it('should return 0% advance tax rate by default', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer'
        });
        await customer.save();

        expect(customer.getAdvanceTaxRate()).toBe(0);
      });

      it('should return 0.5% advance tax rate when set', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await customer.save();

        expect(customer.getAdvanceTaxRate()).toBe(0.5);
      });

      it('should return 2.5% advance tax rate when set', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 2.5
          }
        });
        await customer.save();

        expect(customer.getAdvanceTaxRate()).toBe(2.5);
      });

      it('should validate advance tax rate enum values', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 5.0 // Invalid value
          }
        });

        await expect(customer.save()).rejects.toThrow();
      });
    });

    describe('Non-Filer Status', () => {
      it('should return false for non-filer status by default', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer'
        });
        await customer.save();

        expect(customer.isNonFilerAccount()).toBe(false);
      });

      it('should return true when customer is marked as non-filer', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: true
          }
        });
        await customer.save();

        expect(customer.isNonFilerAccount()).toBe(true);
      });
    });

    describe('Advance Tax Calculation', () => {
      it('should calculate 0% advance tax when rate is 0', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(0);
      });

      it('should calculate 0.5% advance tax correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(50); // 0.5% of 10000
      });

      it('should calculate 2.5% advance tax correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 2.5
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBe(250); // 2.5% of 10000
      });

      it('should handle decimal amounts correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5
          }
        });
        await customer.save();

        const amount = 12345.67;
        const advanceTax = customer.calculateAdvanceTax(amount);
        expect(advanceTax).toBeCloseTo(61.73, 2); // 0.5% of 12345.67
      });
    });

    describe('Non-Filer GST Calculation', () => {
      it('should return 0 for non-filer GST when customer is not a non-filer', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: false
          }
        });
        await customer.save();

        const amount = 10000;
        const nonFilerGST = customer.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBe(0);
      });

      it('should calculate 0.1% non-filer GST correctly', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: true
          }
        });
        await customer.save();

        const amount = 10000;
        const nonFilerGST = customer.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBe(10); // 0.1% of 10000
      });

      it('should handle decimal amounts for non-filer GST', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            isNonFiler: true
          }
        });
        await customer.save();

        const amount = 12345.67;
        const nonFilerGST = customer.calculateNonFilerGST(amount);
        expect(nonFilerGST).toBeCloseTo(12.35, 2); // 0.1% of 12345.67
      });
    });

    describe('Combined Tax Scenarios', () => {
      it('should handle customer with both advance tax and non-filer status', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 2.5,
            isNonFiler: true
          }
        });
        await customer.save();

        const amount = 10000;
        const advanceTax = customer.calculateAdvanceTax(amount);
        const nonFilerGST = customer.calculateNonFilerGST(amount);

        expect(advanceTax).toBe(250); // 2.5% of 10000
        expect(nonFilerGST).toBe(10); // 0.1% of 10000
        expect(advanceTax + nonFilerGST).toBe(260);
      });

      it('should handle registered filer with advance tax', async () => {
        const customer = new Customer({
          name: 'Test Customer',
          type: 'customer',
          financialInfo: {
            advanceTaxRate: 0.5,
            isNonFiler: false
          }
        });
        await customer.save();

        const amount = 10000;
      });
    });
  });

  describe('Route Assignment - Phase 2 (Requirement 17.2)', () => {
    let route;

    beforeEach(async () => {
      // Create a mock route for testing
      const Route = require('../../src/models/Route');
      const User = require('../../src/models/User');

      // Create a user first (required for route creation)
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });

      route = await Route.create({
        code: 'RT001',
        name: 'Test Route',
        description: 'Test route for customer assignment',
        createdBy: user._id,
        isActive: true
      });
    });

    afterEach(async () => {
      const Route = require('../../src/models/Route');
      const User = require('../../src/models/User');
      await Route.deleteMany({});
      await User.deleteMany({});
    });

    it('should allow assigning a valid route to customer', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: route._id
      });
      await customer.save();

      expect(customer.routeId).toEqual(route._id);
    });

    it('should allow null routeId (no route assigned)', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: null
      });
      await customer.save();

      expect(customer.routeId).toBeNull();
    });

    it('should default routeId to null if not provided', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer'
      });
      await customer.save();

      expect(customer.routeId).toBeNull();
    });

    it('should populate route information when queried', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: route._id
      });
      await customer.save();

      const populatedCustomer = await Customer.findById(customer._id).populate('routeId');
      expect(populatedCustomer.routeId.code).toBe('RT001');
      expect(populatedCustomer.routeId.name).toBe('Test Route');
    });

    it('should allow updating route assignment', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: null
      });
      await customer.save();

      customer.routeId = route._id;
      await customer.save();

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.routeId).toEqual(route._id);
    });

    it('should allow removing route assignment', async () => {
      const customer = new Customer({
        name: 'Test Customer',
        type: 'customer',
        routeId: route._id
      });
      await customer.save();

      customer.routeId = null;
      await customer.save();

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.routeId).toBeNull();
    });
  });
});