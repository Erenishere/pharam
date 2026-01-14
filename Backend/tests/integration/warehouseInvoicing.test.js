const mongoose = require('mongoose');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const Warehouse = require('../../src/models/Warehouse');
const inventoryService = require('../../src/services/inventoryService');

describe('Warehouse-based Invoicing Integration Tests', () => {
  let testCustomer;
  let testItem1;
  let testItem2;
  let warehouse1;
  let warehouse2;
  let testUser;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/indus-traders-test');
    }
  });

  beforeEach(async () => {
    // Clear collections
    await Customer.deleteMany({});
    await Item.deleteMany({});
    await Warehouse.deleteMany({});

    // Create test customer
    testCustomer = await Customer.create({
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '1234567890',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30
      },
      isActive: true
    });

    // Create test warehouses
    warehouse1 = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH001',
      location: 'Location 1',
      isActive: true
    });

    warehouse2 = await Warehouse.create({
      name: 'Secondary Warehouse',
      code: 'WH002',
      location: 'Location 2',
      isActive: true
    });

    // Create test items
    testItem1 = await Item.create({
      name: 'Test Item 1',
      code: 'ITEM001',
      category: 'Test Category',
      unitOfMeasure: 'pcs',
      sellingPrice: 100,
      purchasePrice: 80,
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 500
      },
      tax: {
        gstRate: 18,
        whtRate: 0
      },
      isActive: true
    });

    testItem2 = await Item.create({
      name: 'Test Item 2',
      code: 'ITEM002',
      category: 'Test Category',
      unitOfMeasure: 'pcs',
      sellingPrice: 200,
      purchasePrice: 150,
      inventory: {
        currentStock: 50,
        minimumStock: 5,
        maximumStock: 200
      },
      tax: {
        gstRate: 18,
        whtRate: 0
      },
      isActive: true
    });

    testUser = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Invoice creation with warehouse selection', () => {
    test('should create invoice with warehouseId per item', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            discount: 0,
            warehouseId: warehouse1._id
          },
          {
            itemId: testItem2._id,
            quantity: 3,
            unitPrice: 200,
            discount: 0,
            warehouseId: warehouse2._id
          }
        ],
        createdBy: testUser
      };

      // Mock warehouse stock
      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValueOnce({ availableQuantity: 50 })
        .mockResolvedValueOnce({ availableQuantity: 30 });

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(invoice).toBeDefined();
      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[0].warehouseId.toString()).toBe(warehouse1._id.toString());
      expect(invoice.items[1].warehouseId.toString()).toBe(warehouse2._id.toString());
    });

    test('should validate warehouse exists', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            warehouseId: new mongoose.Types.ObjectId() // Non-existent warehouse
          }
        ],
        createdBy: testUser
      };

      await expect(
        salesInvoiceService.createSalesInvoice(invoiceData)
      ).rejects.toThrow('Warehouse not found');
    });

    test('should validate warehouse is active', async () => {
      // Create inactive warehouse
      const inactiveWarehouse = await Warehouse.create({
        name: 'Inactive Warehouse',
        code: 'WH003',
        location: 'Location 3',
        isActive: false
      });

      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            warehouseId: inactiveWarehouse._id
          }
        ],
        createdBy: testUser
      };

      await expect(
        salesInvoiceService.createSalesInvoice(invoiceData)
      ).rejects.toThrow('is not active');
    });

    test('should check stock availability in selected warehouse', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100, // More than available
            unitPrice: 100,
            warehouseId: warehouse1._id
          }
        ],
        createdBy: testUser
      };

      // Mock insufficient warehouse stock
      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValue({ availableQuantity: 10 });

      await expect(
        salesInvoiceService.createSalesInvoice(invoiceData)
      ).rejects.toThrow('Insufficient stock');
    });

    test('should allow invoice without warehouse selection', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            discount: 0
            // No warehouseId specified
          }
        ],
        createdBy: testUser
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(invoice).toBeDefined();
      expect(invoice.items[0].warehouseId).toBeNull();
    });

    test('should handle mixed items with and without warehouse', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            warehouseId: warehouse1._id
          },
          {
            itemId: testItem2._id,
            quantity: 3,
            unitPrice: 200
            // No warehouse specified
          }
        ],
        createdBy: testUser
      };

      // Mock warehouse stock for first item
      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValue({ availableQuantity: 50 });

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(invoice).toBeDefined();
      expect(invoice.items[0].warehouseId.toString()).toBe(warehouse1._id.toString());
      expect(invoice.items[1].warehouseId).toBeNull();
    });
  });

  describe('Stock validation by warehouse', () => {
    test('should validate stock in correct warehouse', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            warehouseId: warehouse1._id
          }
        ],
        createdBy: testUser
      };

      const getWarehouseStockSpy = jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValue({ availableQuantity: 50 });

      await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(getWarehouseStockSpy).toHaveBeenCalledWith(
        testItem1._id.toString(),
        warehouse1._id.toString()
      );
    });

    test('should provide detailed error message for insufficient warehouse stock', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 100,
            warehouseId: warehouse1._id
          }
        ],
        createdBy: testUser
      };

      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValue({ availableQuantity: 10 });

      await expect(
        salesInvoiceService.createSalesInvoice(invoiceData)
      ).rejects.toThrow(/Available: 10, Requested: 50/);
    });

    test('should include warehouse name in error message', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 100,
            warehouseId: warehouse1._id
          }
        ],
        createdBy: testUser
      };

      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValue({ availableQuantity: 10 });

      await expect(
        salesInvoiceService.createSalesInvoice(invoiceData)
      ).rejects.toThrow(/Main Warehouse/);
    });
  });

  describe('Multiple warehouses in single invoice', () => {
    test('should allow different warehouses for different items', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            warehouseId: warehouse1._id
          },
          {
            itemId: testItem2._id,
            quantity: 3,
            unitPrice: 200,
            warehouseId: warehouse2._id
          }
        ],
        createdBy: testUser
      };

      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValueOnce({ availableQuantity: 50 })
        .mockResolvedValueOnce({ availableQuantity: 30 });

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(invoice.items[0].warehouseId.toString()).toBe(warehouse1._id.toString());
      expect(invoice.items[1].warehouseId.toString()).toBe(warehouse2._id.toString());
    });

    test('should validate stock in each warehouse separately', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            warehouseId: warehouse1._id
          },
          {
            itemId: testItem1._id, // Same item, different warehouse
            quantity: 3,
            unitPrice: 100,
            warehouseId: warehouse2._id
          }
        ],
        createdBy: testUser
      };

      const getWarehouseStockSpy = jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValueOnce({ availableQuantity: 50 })
        .mockResolvedValueOnce({ availableQuantity: 30 });

      await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(getWarehouseStockSpy).toHaveBeenCalledTimes(2);
      expect(getWarehouseStockSpy).toHaveBeenCalledWith(
        testItem1._id.toString(),
        warehouse1._id.toString()
      );
      expect(getWarehouseStockSpy).toHaveBeenCalledWith(
        testItem1._id.toString(),
        warehouse2._id.toString()
      );
    });
  });

  describe('Warehouse data persistence', () => {
    test('should persist warehouseId in invoice items', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100,
            warehouseId: warehouse1._id
          }
        ],
        createdBy: testUser
      };

      jest.spyOn(inventoryService, 'getWarehouseStock')
        .mockResolvedValue({ availableQuantity: 50 });

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      // Retrieve invoice from database
      const Invoice = require('../../src/models/Invoice');
      const savedInvoice = await Invoice.findById(invoice._id);

      expect(savedInvoice.items[0].warehouseId.toString()).toBe(warehouse1._id.toString());
    });

    test('should persist null warehouseId when not specified', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 100
          }
        ],
        createdBy: testUser
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      const Invoice = require('../../src/models/Invoice');
      const savedInvoice = await Invoice.findById(invoice._id);

      expect(savedInvoice.items[0].warehouseId).toBeNull();
    });
  });
});
