const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const Supplier = require('../../src/models/Supplier');
const StockMovement = require('../../src/models/StockMovement');
const User = require('../../src/models/User');
const LedgerEntry = require('../../src/models/LedgerEntry');

describe('Purchase Return Workflow Integration Tests', () => {
  let authToken;
  let testUser;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testItem3;

  beforeAll(async () => {
    const bcrypt = require('bcryptjs');
    
    // Create test user for authentication
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

  beforeEach(async () => {
    // Clear collections before each test
    await Invoice.deleteMany({});
    await Item.deleteMany({});
    await Supplier.deleteMany({});
    await StockMovement.deleteMany({});
    await LedgerEntry.deleteMany({});

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
        creditLimit: 0,
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
        currentStock: 50,
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
        currentStock: 30,
        minimumStock: 5,
        maximumStock: 200
      },
      isActive: true
    });

    testItem3 = await Item.create({
      code: 'ITEM003',
      name: 'Test Product 3',
      description: 'Third test product',
      category: 'Tools',
      unit: 'piece',
      pricing: {
        costPrice: 75,
        salePrice: 120,
        currency: 'PKR'
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
        taxCategory: 'standard'
      },
      inventory: {
        currentStock: 40,
        minimumStock: 8,
        maximumStock: 300
      },
      isActive: true
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  /**
   * Helper function to create and confirm a purchase invoice
   */
  async function createAndConfirmPurchaseInvoice(items) {
    // Create purchase invoice
    const invoiceData = {
      supplierId: testSupplier._id,
      supplierBillNo: `BILL-${Date.now()}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: items,
      notes: 'Test purchase invoice'
    };

    const createResponse = await request(app)
      .post('/api/v1/invoices/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invoiceData)
      .expect(201);

    const invoice = createResponse.body.data;

    // Confirm the invoice
    const confirmResponse = await request(app)
      .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    return confirmResponse.body.data;
  }

  /**
   * Task 16.1: Create end-to-end purchase return integration test
   */
  describe('16.1 End-to-End Purchase Return Integration Test', () => {
    test('should create purchase invoice, verify inventory increase, create return, and verify reversal', async () => {
      // Step 1: Create purchase invoice with multiple items
      const purchaseItems = [
        {
          itemId: testItem1._id,
          quantity: 20,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        },
        {
          itemId: testItem2._id,
          quantity: 15,
          unitPrice: 50,
          discount: 0,
          gstRate: 18
        }
      ];

      const confirmedInvoice = await createAndConfirmPurchaseInvoice(purchaseItems);

      expect(confirmedInvoice.status).toBe('confirmed');
      expect(confirmedInvoice.type).toBe('purchase');

      // Step 2: Verify inventory increase
      const item1AfterPurchase = await Item.findById(testItem1._id);
      const item2AfterPurchase = await Item.findById(testItem2._id);

      expect(item1AfterPurchase.inventory.currentStock).toBe(70); // 50 + 20
      expect(item2AfterPurchase.inventory.currentStock).toBe(45); // 30 + 15

      // Step 3: Verify ledger entries for purchase
      const purchaseLedgerEntries = await LedgerEntry.find({
        referenceId: confirmedInvoice._id,
        referenceType: 'invoice'
      });

      expect(purchaseLedgerEntries.length).toBeGreaterThan(0);

      // Step 4: Create return invoice for some items
      const returnData = {
        originalInvoiceId: confirmedInvoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 10 // Return half of item1
          },
          {
            itemId: testItem2._id,
            quantity: 5 // Return 1/3 of item2
          }
        ],
        returnReason: 'damaged',
        returnNotes: 'Items received damaged'
      };

      const returnResponse = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(returnData)
        .expect(201);

      const returnInvoice = returnResponse.body.data;

      expect(returnInvoice.type).toBe('return_purchase');
      expect(returnInvoice.originalInvoiceId.toString()).toBe(confirmedInvoice._id.toString());
      expect(returnInvoice.status).toBe('confirmed');

      // Step 5: Verify inventory decrease after return
      const item1AfterReturn = await Item.findById(testItem1._id);
      const item2AfterReturn = await Item.findById(testItem2._id);

      expect(item1AfterReturn.inventory.currentStock).toBe(60); // 70 - 10
      expect(item2AfterReturn.inventory.currentStock).toBe(40); // 45 - 5

      // Step 6: Verify reverse ledger entries
      const returnLedgerEntries = await LedgerEntry.find({
        referenceId: returnInvoice._id,
        referenceType: 'Invoice'
      });

      expect(returnLedgerEntries.length).toBeGreaterThan(0);

      // Step 7: Verify supplier balance adjustment
      // The return should reduce the amount owed to supplier
      expect(returnInvoice.totals.grandTotal).toBeLessThan(0); // Negative for return

      // Step 8: Verify original invoice link is maintained
      expect(returnInvoice.originalInvoiceId).toBeDefined();
      expect(returnInvoice.returnMetadata).toBeDefined();
      expect(returnInvoice.returnMetadata.returnReason).toBe('damaged');
      expect(returnInvoice.returnMetadata.returnNotes).toBe('Items received damaged');

      // Step 9: Verify stock movements
      const stockMovements = await StockMovement.find({
        itemId: { $in: [testItem1._id, testItem2._id] }
      }).sort({ createdAt: 1 });

      // Should have 4 movements: 2 for purchase (in), 2 for return (out)
      expect(stockMovements.length).toBe(4);

      const purchaseMovements = stockMovements.filter(m => m.movementType === 'in');
      const returnMovements = stockMovements.filter(m => m.movementType === 'return_to_supplier');

      expect(purchaseMovements.length).toBe(2);
      expect(returnMovements.length).toBe(2);
    });
  });

  /**
   * Task 16.2: Test partial return scenarios
   */
  describe('16.2 Partial Return Scenarios', () => {
    test('should handle multiple partial returns correctly', async () => {
      // Step 1: Create purchase invoice with 3 items
      const purchaseItems = [
        {
          itemId: testItem1._id,
          quantity: 30,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        },
        {
          itemId: testItem2._id,
          quantity: 20,
          unitPrice: 50,
          discount: 0,
          gstRate: 18
        },
        {
          itemId: testItem3._id,
          quantity: 25,
          unitPrice: 75,
          discount: 0,
          gstRate: 18
        }
      ];

      const confirmedInvoice = await createAndConfirmPurchaseInvoice(purchaseItems);

      // Verify initial inventory increase
      const item1Initial = await Item.findById(testItem1._id);
      const item2Initial = await Item.findById(testItem2._id);
      const item3Initial = await Item.findById(testItem3._id);

      expect(item1Initial.inventory.currentStock).toBe(80); // 50 + 30
      expect(item2Initial.inventory.currentStock).toBe(50); // 30 + 20
      expect(item3Initial.inventory.currentStock).toBe(65); // 40 + 25

      // Step 2: First return - return 2 items
      const firstReturnData = {
        originalInvoiceId: confirmedInvoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 15
          },
          {
            itemId: testItem2._id,
            quantity: 10
          }
        ],
        returnReason: 'quality_issue',
        returnNotes: 'First partial return'
      };

      const firstReturnResponse = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstReturnData)
        .expect(201);

      expect(firstReturnResponse.body.success).toBe(true);

      // Verify inventory after first return
      const item1AfterFirst = await Item.findById(testItem1._id);
      const item2AfterFirst = await Item.findById(testItem2._id);
      const item3AfterFirst = await Item.findById(testItem3._id);

      expect(item1AfterFirst.inventory.currentStock).toBe(65); // 80 - 15
      expect(item2AfterFirst.inventory.currentStock).toBe(40); // 50 - 10
      expect(item3AfterFirst.inventory.currentStock).toBe(65); // Unchanged

      // Step 3: Get remaining returnable quantity
      const returnableResponse = await request(app)
        .get(`/api/v1/purchase-invoices/${confirmedInvoice._id}/returnable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const returnableItems = returnableResponse.body.data;

      expect(returnableItems.length).toBe(3);

      const item1Returnable = returnableItems.find(
        item => item.itemId.toString() === testItem1._id.toString()
      );
      const item2Returnable = returnableItems.find(
        item => item.itemId.toString() === testItem2._id.toString()
      );
      const item3Returnable = returnableItems.find(
        item => item.itemId.toString() === testItem3._id.toString()
      );

      expect(item1Returnable.availableForReturn).toBe(15); // 30 - 15
      expect(item2Returnable.availableForReturn).toBe(10); // 20 - 10
      expect(item3Returnable.availableForReturn).toBe(25); // 25 - 0

      // Step 4: Second return - return 1 more item
      const secondReturnData = {
        originalInvoiceId: confirmedInvoice._id,
        returnItems: [
          {
            itemId: testItem3._id,
            quantity: 10
          }
        ],
        returnReason: 'wrong_item',
        returnNotes: 'Second partial return'
      };

      const secondReturnResponse = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(secondReturnData)
        .expect(201);

      expect(secondReturnResponse.body.success).toBe(true);

      // Verify inventory after second return
      const item1AfterSecond = await Item.findById(testItem1._id);
      const item2AfterSecond = await Item.findById(testItem2._id);
      const item3AfterSecond = await Item.findById(testItem3._id);

      expect(item1AfterSecond.inventory.currentStock).toBe(65); // Unchanged from first return
      expect(item2AfterSecond.inventory.currentStock).toBe(40); // Unchanged from first return
      expect(item3AfterSecond.inventory.currentStock).toBe(55); // 65 - 10

      // Step 5: Verify all quantities are tracked correctly
      const finalReturnableResponse = await request(app)
        .get(`/api/v1/purchase-invoices/${confirmedInvoice._id}/returnable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const finalReturnableItems = finalReturnableResponse.body.data;

      const item1FinalReturnable = finalReturnableItems.find(
        item => item.itemId.toString() === testItem1._id.toString()
      );
      const item2FinalReturnable = finalReturnableItems.find(
        item => item.itemId.toString() === testItem2._id.toString()
      );
      const item3FinalReturnable = finalReturnableItems.find(
        item => item.itemId.toString() === testItem3._id.toString()
      );

      expect(item1FinalReturnable.availableForReturn).toBe(15); // Still 15
      expect(item2FinalReturnable.availableForReturn).toBe(10); // Still 10
      expect(item3FinalReturnable.availableForReturn).toBe(15); // 25 - 10

      // Verify all return invoices are linked to original
      const allReturns = await Invoice.find({
        type: 'return_purchase',
        originalInvoiceId: confirmedInvoice._id
      });

      expect(allReturns.length).toBe(2);
    });
  });

  /**
   * Task 16.3: Test full return scenario
   */
  describe('16.3 Full Return Scenario', () => {
    test('should handle complete return of all items', async () => {
      // Step 1: Create purchase invoice
      const purchaseItems = [
        {
          itemId: testItem1._id,
          quantity: 25,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        },
        {
          itemId: testItem2._id,
          quantity: 15,
          unitPrice: 50,
          discount: 0,
          gstRate: 18
        }
      ];

      const confirmedInvoice = await createAndConfirmPurchaseInvoice(purchaseItems);

      // Verify initial inventory
      const item1Initial = await Item.findById(testItem1._id);
      const item2Initial = await Item.findById(testItem2._id);

      expect(item1Initial.inventory.currentStock).toBe(75); // 50 + 25
      expect(item2Initial.inventory.currentStock).toBe(45); // 30 + 15

      // Get initial ledger entries count
      const initialLedgerEntries = await LedgerEntry.find({
        referenceId: confirmedInvoice._id,
        referenceType: 'invoice'
      });

      const initialLedgerCount = initialLedgerEntries.length;

      // Step 2: Return all items from invoice
      const fullReturnData = {
        originalInvoiceId: confirmedInvoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 25 // Full quantity
          },
          {
            itemId: testItem2._id,
            quantity: 15 // Full quantity
          }
        ],
        returnReason: 'quality_issue',
        returnNotes: 'Complete return due to quality issues'
      };

      const returnResponse = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fullReturnData)
        .expect(201);

      const returnInvoice = returnResponse.body.data;

      expect(returnInvoice.type).toBe('return_purchase');
      expect(returnInvoice.status).toBe('confirmed');

      // Step 3: Verify complete reversal of inventory
      const item1AfterReturn = await Item.findById(testItem1._id);
      const item2AfterReturn = await Item.findById(testItem2._id);

      expect(item1AfterReturn.inventory.currentStock).toBe(50); // Back to original
      expect(item2AfterReturn.inventory.currentStock).toBe(30); // Back to original

      // Step 4: Verify reverse ledger entries
      const returnLedgerEntries = await LedgerEntry.find({
        referenceId: returnInvoice._id,
        referenceType: 'Invoice'
      });

      expect(returnLedgerEntries.length).toBeGreaterThan(0);

      // Step 5: Verify supplier balance is fully adjusted
      // Return invoice total should be negative of original (excluding any differences)
      expect(returnInvoice.totals.grandTotal).toBeLessThan(0);
      expect(Math.abs(returnInvoice.totals.grandTotal)).toBeCloseTo(
        confirmedInvoice.totals.grandTotal,
        2
      );

      // Step 6: Verify no more items are returnable
      const returnableResponse = await request(app)
        .get(`/api/v1/purchase-invoices/${confirmedInvoice._id}/returnable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const returnableItems = returnableResponse.body.data;

      returnableItems.forEach(item => {
        expect(item.availableForReturn).toBe(0);
      });

      // Step 7: Verify stock movements
      const stockMovements = await StockMovement.find({
        itemId: { $in: [testItem1._id, testItem2._id] }
      }).sort({ createdAt: 1 });

      // Should have 4 movements: 2 for purchase (in), 2 for return (out)
      expect(stockMovements.length).toBe(4);

      const returnMovements = stockMovements.filter(m => m.movementType === 'return_to_supplier');
      expect(returnMovements.length).toBe(2);

      // Verify return movement quantities
      const item1ReturnMovement = returnMovements.find(
        m => m.itemId.toString() === testItem1._id.toString()
      );
      const item2ReturnMovement = returnMovements.find(
        m => m.itemId.toString() === testItem2._id.toString()
      );

      expect(item1ReturnMovement.quantity).toBe(25);
      expect(item2ReturnMovement.quantity).toBe(15);
    });
  });

  /**
   * Task 16.4: Test return validation edge cases
   */
  describe('16.4 Return Validation Edge Cases', () => {
    test('should fail when return quantity exceeds original quantity', async () => {
      // Create purchase invoice
      const purchaseItems = [
        {
          itemId: testItem1._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        }
      ];

      const confirmedInvoice = await createAndConfirmPurchaseInvoice(purchaseItems);

      // Try to return more than purchased
      const invalidReturnData = {
        originalInvoiceId: confirmedInvoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 15 // More than the 10 purchased
          }
        ],
        returnReason: 'damaged',
        returnNotes: 'Invalid return attempt'
      };

      const response = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReturnData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('exceeds');
    });

    test('should fail when returning non-existent item', async () => {
      // Create purchase invoice
      const purchaseItems = [
        {
          itemId: testItem1._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        }
      ];

      const confirmedInvoice = await createAndConfirmPurchaseInvoice(purchaseItems);

      // Try to return item that wasn't in the invoice
      const invalidReturnData = {
        originalInvoiceId: confirmedInvoice._id,
        returnItems: [
          {
            itemId: testItem2._id, // This item wasn't in the original invoice
            quantity: 5
          }
        ],
        returnReason: 'damaged',
        returnNotes: 'Invalid item return'
      };

      const response = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReturnData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should fail when returning from non-existent invoice', async () => {
      const fakeInvoiceId = new mongoose.Types.ObjectId();

      const invalidReturnData = {
        originalInvoiceId: fakeInvoiceId,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 5
          }
        ],
        returnReason: 'damaged',
        returnNotes: 'Invalid invoice return'
      };

      const response = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReturnData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should fail when trying to return from sales invoice', async () => {
      // Create a sales invoice instead of purchase
      const customer = await require('../../src/models/Customer').create({
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        contactInfo: {
          phone: '1234567890',
          email: 'customer@test.com',
          address: '123 Test St',
          city: 'Karachi',
          country: 'Pakistan'
        },
        financialInfo: {
          creditLimit: 10000,
          paymentTerms: 30,
          currency: 'PKR'
        },
        isActive: true
      });

      const salesInvoiceData = {
        customerId: customer._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 5,
            unitPrice: 150,
            discount: 0
          }
        ],
        notes: 'Test sales invoice'
      };

      const salesResponse = await request(app)
        .post('/api/v1/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(salesInvoiceData)
        .expect(201);

      const salesInvoice = salesResponse.body.data;

      // Confirm the sales invoice
      await request(app)
        .patch(`/api/v1/invoices/sales/${salesInvoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to create purchase return from sales invoice
      const invalidReturnData = {
        originalInvoiceId: salesInvoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 2
          }
        ],
        returnReason: 'damaged',
        returnNotes: 'Invalid return type'
      };

      const response = await request(app)
        .post('/api/v1/purchase-invoices/return')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReturnData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('purchase');
    });

    test('should provide appropriate error messages for validation failures', async () => {
      // Create purchase invoice
      const purchaseItems = [
        {
          itemId: testItem1._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        }
      ];

      const confirmedInvoice = await createAndConfirmPurchaseInvoice(purchaseItems);

      // Test validation endpoint
      const validationData = {
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 15 // Exceeds available
          }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/purchase-invoices/${confirmedInvoice._id}/validate-return`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toBeDefined();
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });
  });
});