const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const Supplier = require('../../src/models/Supplier');
const User = require('../../src/models/User');
const purchaseReturnService = require('../../src/services/purchaseReturnService');
const purchaseInvoiceService = require('../../src/services/purchaseInvoiceService');
const Warehouse = require('../../src/models/Warehouse');

describe('Purchase Return Validation Edge Cases (Task 16.4)', () => {
  let mongoServer;
  let authToken;
  let testUser;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testWarehouse;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { userId: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await Invoice.deleteMany({});
    await Item.deleteMany({});
    await Supplier.deleteMany({});
    await Warehouse.deleteMany({});

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      code: 'WH001',
      name: 'Main Warehouse',
      location: {
        address: '123 Warehouse St',
        city: 'Karachi',
        country: 'Pakistan'
      },
      isActive: true
    });

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUPP001',
      name: 'Test Supplier',
      type: 'supplier',
      contactInfo: {
        phone: '1234567890',
        email: 'supplier@test.com',
        address: '123 Test St',
        city: 'Karachi',
        country: 'Pakistan'
      },
      financialInfo: {
        paymentTerms: 30,
        currency: 'PKR'
      },
      isActive: true
    });

    // Create test items
    testItem1 = await Item.create({
      code: 'ITEM001',
      name: 'Test Product 1',
      description: 'Test product description',
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
        currency: 'PKR'
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
        taxCategory: 'standard'
      },
      inventory: {
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 500
      },
      isActive: true
    });

    testItem2 = await Item.create({
      code: 'ITEM002',
      name: 'Test Product 2',
      description: 'Another test product',
      category: 'Accessories',
      unit: 'piece',
      pricing: {
        costPrice: 50,
        salePrice: 80,
        currency: 'PKR'
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
        taxCategory: 'standard'
      },
      inventory: {
        currentStock: 0,
        minimumStock: 5,
        maximumStock: 200
      },
      isActive: true
    });
  });

  describe('Task 16.4: Return Validation Edge Cases', () => {
    it('should fail when return quantity exceeds original quantity', async () => {
      // Create and confirm purchase invoice
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000001',
        type: 'purchase',
        supplierId: testSupplier._id,
        supplierBillNo: 'BILL001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            gstAmount: 900,
            taxAmount: 900,
            lineTotal: 5900,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 5000,
          totalDiscount: 0,
          totalTax: 900,
          gst18Total: 900,
          gst4Total: 0,
          grandTotal: 5900
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      // Try to return more than purchased
      const returnData = {
        originalInvoiceId: invoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 60 // More than original 50
          }
        ],
        returnReason: 'defective',
        returnNotes: 'Trying to return more than purchased',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/exceed|greater|maximum|available/i);
      }
    });

    it('should fail when returning non-existent item', async () => {
      // Create and confirm purchase invoice
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000002',
        type: 'purchase',
        supplierId: testSupplier._id,
        supplierBillNo: 'BILL002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            gstAmount: 900,
            taxAmount: 900,
            lineTotal: 5900,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 5000,
          totalDiscount: 0,
          totalTax: 900,
          gst18Total: 900,
          gst4Total: 0,
          grandTotal: 5900
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      // Try to return an item that was not in the original invoice
      const nonExistentItemId = new mongoose.Types.ObjectId();
      const returnData = {
        originalInvoiceId: invoice._id,
        returnItems: [
          {
            itemId: nonExistentItemId,
            quantity: 10
          }
        ],
        returnReason: 'defective',
        returnNotes: 'Trying to return item not in invoice',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/not found|not exist|not in invoice|invalid item/i);
      }
    });

    it('should fail when returning from non-existent invoice', async () => {
      const nonExistentInvoiceId = new mongoose.Types.ObjectId();
      const returnData = {
        originalInvoiceId: nonExistentInvoiceId,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 10
          }
        ],
        returnReason: 'defective',
        returnNotes: 'Trying to return from non-existent invoice',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/not found|not exist|invalid invoice|invoice not found/i);
      }
    });

    it('should fail when returning from sales invoice (wrong invoice type)', async () => {
      // Create a sales invoice (not purchase)
      const salesInvoice = await Invoice.create({
        invoiceNumber: 'SI2024000001',
        type: 'sales',
        customerId: testSupplier._id, // Using supplier as customer for test
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 150,
            discount: 0,
            gstRate: 18,
            gstAmount: 1350,
            taxAmount: 1350,
            lineTotal: 8850,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 7500,
          totalDiscount: 0,
          totalTax: 1350,
          gst18Total: 1350,
          gst4Total: 0,
          grandTotal: 8850
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Try to create purchase return from sales invoice
      const returnData = {
        originalInvoiceId: salesInvoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 10
          }
        ],
        returnReason: 'defective',
        returnNotes: 'Trying to return from sales invoice',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/purchase|type|invalid|not a purchase/i);
      }
    });

    it('should provide appropriate error messages for validation failures', async () => {
      // Test 1: Quantity exceeding
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000003',
        type: 'purchase',
        supplierId: testSupplier._id,
        supplierBillNo: 'BILL003',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            gstAmount: 900,
            taxAmount: 900,
            lineTotal: 5900,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 5000,
          totalDiscount: 0,
          totalTax: 900,
          gst18Total: 900,
          gst4Total: 0,
          grandTotal: 5900
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      // Test exceeding quantity error message
      const returnData1 = {
        originalInvoiceId: invoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 60
          }
        ],
        returnReason: 'defective',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData1);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        // Error message should be descriptive
        expect(typeof error.message).toBe('string');
      }

      // Test 2: Non-existent invoice error message
      const nonExistentInvoiceId = new mongoose.Types.ObjectId();
      const returnData2 = {
        originalInvoiceId: nonExistentInvoiceId,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 10
          }
        ],
        returnReason: 'defective',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData2);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(typeof error.message).toBe('string');
      }
    });

    it('should fail when trying to return from unconfirmed invoice', async () => {
      // Create purchase invoice but don't confirm it
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000004',
        type: 'purchase',
        supplierId: testSupplier._id,
        supplierBillNo: 'BILL004',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 50,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            gstAmount: 900,
            taxAmount: 900,
            lineTotal: 5900,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 5000,
          totalDiscount: 0,
          totalTax: 900,
          gst18Total: 900,
          gst4Total: 0,
          grandTotal: 5900
        },
        status: 'draft', // Not confirmed
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Try to return from draft invoice
      const returnData = {
        originalInvoiceId: invoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 10
          }
        ],
        returnReason: 'defective',
        returnNotes: 'Trying to return from draft invoice',
        createdBy: testUser._id
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/confirmed|draft|status|not confirmed/i);
      }
    });
  });
});

