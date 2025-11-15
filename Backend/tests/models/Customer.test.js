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
});