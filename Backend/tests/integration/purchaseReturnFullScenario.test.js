const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const Supplier = require('../../src/models/Supplier');
const StockMovement = require('../../src/models/StockMovement');
const User = require('../../src/models/User');
const LedgerEntry = require('../../src/models/LedgerEntry');
const Warehouse = require('../../src/models/Warehouse');
const purchaseInvoiceService = require('../../src/services/purchaseInvoiceService');
const purchaseReturnService = require('../../src/services/purchaseReturnService');

describe('Purchase Return - Full Return Scenario (Task 16.3)', () => {
  let authToken;
  let testUser;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testItem3;
  let testWarehouse;

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

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });
    
    if (loginResponse.body && loginResponse.body.data && loginResponse.body.data.token) {
      authToken = loginResponse.body.data.token;
    } else {
      // Generate a mock token for testing
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { userId: testUser._id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET || 'test_jwt_secret',
        { expiresIn: '1h' }
      );
    }
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Invoice.deleteMany({});
    await Item.deleteMany({});
    await Supplier.deleteMany({});
    await StockMovement.deleteMany({});
    await LedgerEntry.deleteMany({});
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

    // Create test items with stock
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

    testItem3 = await Item.create({
      code: 'ITEM003',
      name: 'Test Product 3',
      description: 'Third test product',
      category: 'Components',
      unit: 'piece',
      pricing: {
        costPrice: 25,
        salePrice: 40,
        currency: 'PKR'
      },
      tax: {
        gstRate: 4,
        whtRate: 0,
        taxCategory: 'standard'
      },
      inventory: {
        currentStock: 0,
        minimumStock: 20,
        maximumStock: 1000
      },
      isActive: true
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Task 16.3: Full Return Scenario', () => {
    test('should create purchase invoice with multiple items', async () => {
      // Create purchase invoice with 3 items using service directly
      const invoiceData = {
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
            warehouseId: testWarehouse._id
          },
          {
            itemId: testItem2._id,
            quantity: 30,
            unitPrice: 50,
            discount: 0,
            gstRate: 18,
            warehouseId: testWarehouse._id
          },
          {
            itemId: testItem3._id,
            quantity: 100,
            unitPrice: 25,
            discount: 0,
            gstRate: 4,
            warehouseId: testWarehouse._id
          }
        ],
        createdBy: testUser._id
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);

      expect(invoice).toBeDefined();
      expect(invoice.type).toBe('purchase');
      expect(invoice.invoiceNumber).toBeDefined();
      expect(invoice.items).toHaveLength(3);
      expect(invoice.status).toBe('draft');

      // Verify totals calculation
      expect(invoice.totals.subtotal).toBe(7500); // 5000 + 1500 + 2500
      expect(invoice.totals.totalTax).toBeGreaterThan(0);
      expect(invoice.totals.grandTotal).toBeGreaterThan(0);

      return invoice._id;
    });

    test('should confirm purchase invoice and update inventory', async () => {
      // Create purchase invoice
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
          },
          {
            itemId: testItem2._id,
            quantity: 30,
            unitPrice: 50,
            discount: 0,
            gstRate: 18,
            gstAmount: 270,
            taxAmount: 270,
            lineTotal: 1770,
            warehouseId: testWarehouse._id
          },
          {
            itemId: testItem3._id,
            quantity: 100,
            unitPrice: 25,
            discount: 0,
            gstRate: 4,
            gstAmount: 100,
            taxAmount: 100,
            lineTotal: 2600,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 7500,
          totalDiscount: 0,
          totalTax: 1270,
          gst18Total: 1170,
          gst4Total: 100,
          grandTotal: 8770
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm the invoice using service
      const confirmedInvoice = await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      expect(confirmedInvoice).toBeDefined();
      expect(confirmedInvoice.status).toBe('confirmed');

      // Verify inventory updated for all items
      const item1 = await Item.findById(testItem1._id);
      const item2 = await Item.findById(testItem2._id);
      const item3 = await Item.findById(testItem3._id);

      expect(item1.inventory.currentStock).toBe(50);
      expect(item2.inventory.currentStock).toBe(30);
      expect(item3.inventory.currentStock).toBe(100);

      // Verify stock movements created
      const movements = await StockMovement.find({ 
        referenceType: 'purchase_invoice',
        referenceId: invoice._id
      });
      expect(movements.length).toBe(3);

      return invoice._id;
    });

    test('should return all items from invoice and verify complete reversal', async () => {
      // Step 1: Create and confirm purchase invoice
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
          },
          {
            itemId: testItem2._id,
            quantity: 30,
            unitPrice: 50,
            discount: 0,
            gstRate: 18,
            gstAmount: 270,
            taxAmount: 270,
            lineTotal: 1770,
            warehouseId: testWarehouse._id
          },
          {
            itemId: testItem3._id,
            quantity: 100,
            unitPrice: 25,
            discount: 0,
            gstRate: 4,
            gstAmount: 100,
            taxAmount: 100,
            lineTotal: 2600,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 7500,
          totalDiscount: 0,
          totalTax: 1270,
          gst18Total: 1170,
          gst4Total: 100,
          grandTotal: 8770
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice using service
      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      // Verify inventory after confirmation
      let item1 = await Item.findById(testItem1._id);
      let item2 = await Item.findById(testItem2._id);
      let item3 = await Item.findById(testItem3._id);

      expect(item1.inventory.currentStock).toBe(50);
      expect(item2.inventory.currentStock).toBe(30);
      expect(item3.inventory.currentStock).toBe(100);

      // Step 2: Create return for ALL items using service
      const returnData = {
        originalInvoiceId: invoice._id,
        returnItems: [
          {
            itemId: testItem1._id,
            quantity: 50 // Return all
          },
          {
            itemId: testItem2._id,
            quantity: 30 // Return all
          },
          {
            itemId: testItem3._id,
            quantity: 100 // Return all
          }
        ],
        returnReason: 'quality_issue',
        returnNotes: 'Full return - quality issues with all items',
        createdBy: testUser._id
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);
      expect(returnInvoice.type).toBe('return_purchase');
      expect(returnInvoice.originalInvoiceId).toBe(invoice._id.toString());
      expect(returnInvoice.items).toHaveLength(3);

      // Step 3: Verify complete inventory reversal
      item1 = await Item.findById(testItem1._id);
      item2 = await Item.findById(testItem2._id);
      item3 = await Item.findById(testItem3._id);

      expect(item1.inventory.currentStock).toBe(0); // 50 - 50 = 0
      expect(item2.inventory.currentStock).toBe(0); // 30 - 30 = 0
      expect(item3.inventory.currentStock).toBe(0); // 100 - 100 = 0

      // Step 4: Verify stock movements for return
      const returnMovements = await StockMovement.find({ 
        referenceType: 'purchase_return',
        referenceId: returnInvoice._id
      });
      expect(returnMovements.length).toBe(3);

      // Verify each return movement is negative (reversal)
      returnMovements.forEach(movement => {
        expect(movement.quantity).toBeLessThan(0);
        expect(movement.movementType).toBe('return_to_supplier');
      });

      // Step 5: Verify ledger entries for return
      const returnLedgerEntries = await LedgerEntry.find({
        referenceType: 'purchase_return',
        referenceId: returnInvoice._id
      });

      // Should have entries for inventory credit, payables debit, and GST credit
      expect(returnLedgerEntries.length).toBeGreaterThanOrEqual(3);

      // Step 6: Verify return invoice totals are negative
      expect(returnInvoice.totals.subtotal).toBeLessThan(0);
      expect(returnInvoice.totals.totalTax).toBeLessThan(0);
      expect(returnInvoice.totals.grandTotal).toBeLessThan(0);

      // Verify GST breakdown is negative
      expect(returnInvoice.totals.gst18Total).toBeLessThan(0);
      expect(returnInvoice.totals.gst4Total).toBeLessThan(0);

      // Step 7: Verify supplier balance adjustment
      // (This would require checking supplier payables, implementation depends on your system)
      const updatedSupplier = await Supplier.findById(testSupplier._id);
      expect(updatedSupplier).toBeDefined();

      // Step 8: Verify original invoice link is maintained
      const updatedOriginalInvoice = await Invoice.findById(invoice._id);
      expect(updatedOriginalInvoice.originalInvoiceId).toBeUndefined(); // Original shouldn't have this
      
      const updatedReturnInvoice = await Invoice.findById(returnInvoice._id);
      expect(updatedReturnInvoice.originalInvoiceId.toString()).toBe(invoice._id.toString());
    });

    test('should verify complete reversal of inventory and ledger after full return', async () => {
      // Create and confirm purchase invoice
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
          },
          {
            itemId: testItem2._id,
            quantity: 30,
            unitPrice: 50,
            discount: 0,
            gstRate: 18,
            gstAmount: 270,
            taxAmount: 270,
            lineTotal: 1770,
            warehouseId: testWarehouse._id
          },
          {
            itemId: testItem3._id,
            quantity: 100,
            unitPrice: 25,
            discount: 0,
            gstRate: 4,
            gstAmount: 100,
            taxAmount: 100,
            lineTotal: 2600,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 7500,
          totalDiscount: 0,
          totalTax: 1270,
          gst18Total: 1170,
          gst4Total: 100,
          grandTotal: 8770
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice using service
      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      // Get ledger entries after confirmation
      const confirmationLedgerEntries = await LedgerEntry.find({
        referenceType: 'purchase_invoice',
        referenceId: invoice._id
      });

      const confirmationLedgerCount = confirmationLedgerEntries.length;
      expect(confirmationLedgerCount).toBeGreaterThan(0);

      // Create full return using service
      const returnData = {
        originalInvoiceId: invoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 50 },
          { itemId: testItem2._id, quantity: 30 },
          { itemId: testItem3._id, quantity: 100 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged',
        createdBy: testUser._id
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      // Get ledger entries after return
      const returnLedgerEntries = await LedgerEntry.find({
        referenceType: 'purchase_return',
        referenceId: returnInvoice._id
      });

      const returnLedgerCount = returnLedgerEntries.length;
      expect(returnLedgerCount).toBeGreaterThan(0);

      // Verify ledger entries are reverse of original
      // For each confirmation entry, there should be a corresponding reverse entry
      confirmationLedgerEntries.forEach(confirmEntry => {
        const reverseEntry = returnLedgerEntries.find(
          entry => entry.accountId.toString() === confirmEntry.accountId.toString()
        );

        if (reverseEntry) {
          // Debit and credit should be swapped
          if (confirmEntry.debit > 0) {
            expect(reverseEntry.credit).toBeGreaterThan(0);
          }
          if (confirmEntry.credit > 0) {
            expect(reverseEntry.debit).toBeGreaterThan(0);
          }
        }
      });

      // Verify all inventory is back to zero
      const item1 = await Item.findById(testItem1._id);
      const item2 = await Item.findById(testItem2._id);
      const item3 = await Item.findById(testItem3._id);

      expect(item1.inventory.currentStock).toBe(0);
      expect(item2.inventory.currentStock).toBe(0);
      expect(item3.inventory.currentStock).toBe(0);

      // Verify total stock movements (in + out for each item)
      const allMovements = await StockMovement.find({
        itemId: { $in: [testItem1._id, testItem2._id, testItem3._id] }
      });

      // Should have 6 movements total: 3 for purchase + 3 for return
      expect(allMovements.length).toBe(6);

      // Verify movements balance out
      const item1Movements = allMovements.filter(m => m.itemId.toString() === testItem1._id.toString());
      const item1Total = item1Movements.reduce((sum, m) => sum + m.quantity, 0);
      expect(item1Total).toBe(0);

      const item2Movements = allMovements.filter(m => m.itemId.toString() === testItem2._id.toString());
      const item2Total = item2Movements.reduce((sum, m) => sum + m.quantity, 0);
      expect(item2Total).toBe(0);

      const item3Movements = allMovements.filter(m => m.itemId.toString() === testItem3._id.toString());
      const item3Total = item3Movements.reduce((sum, m) => sum + m.quantity, 0);
      expect(item3Total).toBe(0);
    });

    test('should verify supplier balance is fully adjusted after full return', async () => {
      // Create and confirm purchase invoice
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
          },
          {
            itemId: testItem2._id,
            quantity: 30,
            unitPrice: 50,
            discount: 0,
            gstRate: 18,
            gstAmount: 270,
            taxAmount: 270,
            lineTotal: 1770,
            warehouseId: testWarehouse._id
          },
          {
            itemId: testItem3._id,
            quantity: 100,
            unitPrice: 25,
            discount: 0,
            gstRate: 4,
            gstAmount: 100,
            taxAmount: 100,
            lineTotal: 2600,
            warehouseId: testWarehouse._id
          }
        ],
        totals: {
          subtotal: 7500,
          totalDiscount: 0,
          totalTax: 1270,
          gst18Total: 1170,
          gst4Total: 100,
          grandTotal: 8770
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice
      // Confirm invoice using service
      await purchaseInvoiceService.confirmPurchaseInvoice(invoice._id, testUser._id);

      // Get supplier payables after confirmation
      const supplierLedgerAfterConfirm = await LedgerEntry.find({
        accountId: testSupplier._id,
        referenceType: 'purchase_invoice',
        referenceId: invoice._id
      });

      let payablesAfterConfirm = 0;
      supplierLedgerAfterConfirm.forEach(entry => {
        if (entry.credit > 0) {
          payablesAfterConfirm += entry.credit;
        }
      });

      expect(payablesAfterConfirm).toBe(8770); // Full invoice amount

      // Create full return using service
      const returnData = {
        originalInvoiceId: invoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 50 },
          { itemId: testItem2._id, quantity: 30 },
          { itemId: testItem3._id, quantity: 100 }
        ],
        returnReason: 'expired',
        returnNotes: 'All items expired',
        createdBy: testUser._id
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      // Get supplier payables after return
      const supplierLedgerAfterReturn = await LedgerEntry.find({
        accountId: testSupplier._id,
        referenceType: 'purchase_return',
        referenceId: returnInvoice._id
      });

      let payablesAfterReturn = 0;
      supplierLedgerAfterReturn.forEach(entry => {
        if (entry.debit > 0) {
          payablesAfterReturn += entry.debit;
        }
      });

      expect(payablesAfterReturn).toBe(8770); // Full return amount (debit to reduce payables)

      // Verify net payables is zero
      const allSupplierLedger = await LedgerEntry.find({
        accountId: testSupplier._id,
        $or: [
          { referenceType: 'purchase_invoice', referenceId: invoice._id },
          { referenceType: 'purchase_return', referenceId: returnInvoice._id }
        ]
      });

      let netPayables = 0;
      allSupplierLedger.forEach(entry => {
        netPayables += (entry.credit || 0) - (entry.debit || 0);
      });

      expect(netPayables).toBe(0); // Should be fully adjusted
    });
  });
});
