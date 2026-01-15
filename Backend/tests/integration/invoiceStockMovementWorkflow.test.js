const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const Invoice = require('../../src/models/Invoice');
const StockMovement = require('../../src/models/StockMovement');
const authService = require('../../src/services/authService');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const purchaseInvoiceService = require('../../src/services/purchaseInvoiceService');

describe('Invoice-Stock Movement Workflow Integration Tests', () => {
  let authToken;
  let testUser;
  let testCustomer;
  let testSupplier;
  let testItem;

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await Invoice.deleteMany({});
    await StockMovement.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    authToken = authService.generateAccessToken({
      userId: testUser._id,
      role: testUser.role,
    });

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST001',
      name: 'Test Customer',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@test.com',
      address: '123 Test St',
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30,
      },
    });

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUPP001',
      name: 'Test Supplier',
      contactPerson: 'Jane Smith',
      phone: '0987654321',
      email: 'supplier@test.com',
      address: '456 Supplier Ave',
      financialInfo: {
        paymentTerms: 30,
      },
    });

    // Create test item with initial stock
    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
      },
      stock: {
        currentStock: 100,
        minStock: 10,
        maxStock: 500,
      },
      tax: {
        gstRate: 18,
        whtRate: 0,
      },
      isActive: true,
    });
  });

  describe('Sales Invoice Stock Movement Workflow', () => {
    it('should create stock movements when sales invoice is confirmed', async () => {
      // Create sales invoice
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount: 0,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      expect(invoice.status).toBe('draft');

      // Confirm invoice
      const result = await salesInvoiceService.confirmSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify invoice is confirmed
      expect(result.invoice.status).toBe('confirmed');

      // Verify stock movements were created
      expect(result.stockMovements).toHaveLength(1);
      expect(result.stockMovements[0].movementType).toBe('out');
      expect(result.stockMovements[0].quantity).toBe(-10);
      expect(result.stockMovements[0].referenceType).toBe('sales_invoice');

      // Verify inventory was updated
      const updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(90);
    });

    it('should reverse stock movements when sales invoice is cancelled', async () => {
      // Create and confirm invoice
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify stock was reduced
      let updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(90);

      // Cancel invoice
      await salesInvoiceService.cancelSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString(),
        'Test cancellation'
      );

      // Verify reversal stock movement was created
      const movements = await StockMovement.find({
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
      });
      expect(movements).toHaveLength(2); // Original + reversal

      // Verify inventory was restored
      updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(100);
    });

    it('should prevent confirmation if insufficient stock', async () => {
      // Create invoice with quantity exceeding stock
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 150, // More than available (100)
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      // Attempt to confirm should fail
      await expect(
        salesInvoiceService.confirmSalesInvoice(
          invoice._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Insufficient stock');

      // Verify no stock movements were created
      const movements = await StockMovement.find({
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
      });
      expect(movements).toHaveLength(0);

      // Verify inventory unchanged
      const updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(100);
    });

    it('should track multiple items in single invoice', async () => {
      // Create another test item
      const testItem2 = await Item.create({
        code: 'ITEM002',
        name: 'Test Item 2',
        category: 'Electronics',
        unit: 'piece',
        pricing: {
          costPrice: 200,
          salePrice: 300,
        },
        stock: {
          currentStock: 50,
          minStock: 5,
          maxStock: 200,
        },
        tax: {
          gstRate: 18,
        },
        isActive: true,
      });

      // Create invoice with multiple items
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
          },
          {
            itemId: testItem2._id,
            quantity: 5,
            unitPrice: 300,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      const result = await salesInvoiceService.confirmSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify stock movements for both items
      expect(result.stockMovements).toHaveLength(2);

      // Verify inventory updated for both items
      const updatedItem1 = await Item.findById(testItem._id);
      const updatedItem2 = await Item.findById(testItem2._id);
      expect(updatedItem1.stock.currentStock).toBe(90);
      expect(updatedItem2.stock.currentStock).toBe(45);
    });
  });

  describe('Purchase Invoice Stock Movement Workflow', () => {
    it('should create stock movements when purchase invoice is confirmed', async () => {
      // Create purchase invoice
      const invoiceData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 50,
            unitPrice: 100,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
            },
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
      expect(invoice.status).toBe('draft');

      // Confirm invoice
      const result = await purchaseInvoiceService.confirmPurchaseInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify invoice is confirmed
      expect(result.invoice.status).toBe('confirmed');

      // Verify stock movements were created
      expect(result.stockMovements).toHaveLength(1);
      expect(result.stockMovements[0].movementType).toBe('in');
      expect(result.stockMovements[0].quantity).toBe(50);
      expect(result.stockMovements[0].referenceType).toBe('purchase_invoice');

      // Verify batch info was recorded
      expect(result.stockMovements[0].batchInfo.batchNumber).toBe('BATCH001');

      // Verify inventory was updated
      const updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(150);
    });

    it('should reverse stock movements when purchase invoice is cancelled', async () => {
      // Create and confirm invoice
      const invoiceData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 50,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
      await purchaseInvoiceService.confirmPurchaseInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify stock was increased
      let updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(150);

      // Cancel invoice
      await purchaseInvoiceService.cancelPurchaseInvoice(
        invoice._id.toString(),
        testUser._id.toString(),
        'Test cancellation'
      );

      // Verify reversal stock movement was created
      const movements = await StockMovement.find({
        referenceType: 'purchase_invoice',
        referenceId: invoice._id,
      });
      expect(movements).toHaveLength(2); // Original + reversal

      // Verify inventory was restored
      updatedItem = await Item.findById(testItem._id);
      expect(updatedItem.stock.currentStock).toBe(100);
    });

    it('should track batch information in stock movements', async () => {
      const invoiceData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 30,
            unitPrice: 100,
            batchInfo: {
              batchNumber: 'BATCH-2024-001',
              manufacturingDate: new Date('2024-01-15'),
              expiryDate: new Date('2025-01-15'),
            },
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
      const result = await purchaseInvoiceService.confirmPurchaseInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify batch info in stock movement
      const movement = result.stockMovements[0];
      expect(movement.batchInfo.batchNumber).toBe('BATCH-2024-001');
      expect(movement.batchInfo.manufacturingDate).toBeDefined();
      expect(movement.batchInfo.expiryDate).toBeDefined();
    });

    it('should handle multiple items with different batches', async () => {
      const testItem2 = await Item.create({
        code: 'ITEM002',
        name: 'Test Item 2',
        category: 'Food',
        unit: 'piece',
        pricing: {
          costPrice: 50,
          salePrice: 75,
        },
        stock: {
          currentStock: 0,
          minStock: 10,
          maxStock: 500,
        },
        tax: {
          gstRate: 18,
        },
        isActive: true,
      });

      const invoiceData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 25,
            unitPrice: 100,
            batchInfo: {
              batchNumber: 'BATCH-A-001',
              expiryDate: new Date('2025-06-01'),
            },
          },
          {
            itemId: testItem2._id,
            quantity: 100,
            unitPrice: 50,
            batchInfo: {
              batchNumber: 'BATCH-B-001',
              expiryDate: new Date('2024-12-31'),
            },
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
      const result = await purchaseInvoiceService.confirmPurchaseInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Verify stock movements for both items
      expect(result.stockMovements).toHaveLength(2);
      expect(result.stockMovements[0].batchInfo.batchNumber).toBe('BATCH-A-001');
      expect(result.stockMovements[1].batchInfo.batchNumber).toBe('BATCH-B-001');

      // Verify inventory updated for both items
      const updatedItem1 = await Item.findById(testItem._id);
      const updatedItem2 = await Item.findById(testItem2._id);
      expect(updatedItem1.stock.currentStock).toBe(125);
      expect(updatedItem2.stock.currentStock).toBe(100);
    });
  });

  describe('Stock Movement Query and Audit Trail', () => {
    it('should retrieve stock movements for a sales invoice', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 15,
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Get stock movements for invoice
      const movements = await salesInvoiceService.getInvoiceStockMovements(
        invoice._id.toString()
      );

      expect(movements).toHaveLength(1);
      expect(movements[0].referenceType).toBe('sales_invoice');
      expect(movements[0].referenceId.toString()).toBe(invoice._id.toString());
    });

    it('should retrieve stock movements for a purchase invoice', async () => {
      const invoiceData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 40,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);
      await purchaseInvoiceService.confirmPurchaseInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Get stock movements for invoice
      const movements = await purchaseInvoiceService.getInvoiceStockMovements(
        invoice._id.toString()
      );

      expect(movements).toHaveLength(1);
      expect(movements[0].referenceType).toBe('purchase_invoice');
      expect(movements[0].referenceId.toString()).toBe(invoice._id.toString());
    });

    it('should track complete audit trail for item', async () => {
      // Purchase invoice
      const purchaseData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 50,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const purchaseInvoice = await purchaseInvoiceService.createPurchaseInvoice(purchaseData);
      await purchaseInvoiceService.confirmPurchaseInvoice(
        purchaseInvoice._id.toString(),
        testUser._id.toString()
      );

      // Sales invoice
      const salesData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 20,
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const salesInvoice = await salesInvoiceService.createSalesInvoice(salesData);
      await salesInvoiceService.confirmSalesInvoice(
        salesInvoice._id.toString(),
        testUser._id.toString()
      );

      // Get all movements for item
      const movements = await StockMovement.find({ itemId: testItem._id }).sort({
        movementDate: 1,
      });

      expect(movements).toHaveLength(2);
      expect(movements[0].movementType).toBe('in'); // Purchase
      expect(movements[1].movementType).toBe('out'); // Sales

      // Verify final stock
      const finalItem = await Item.findById(testItem._id);
      expect(finalItem.stock.currentStock).toBe(130); // 100 + 50 - 20
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should prevent double confirmation of invoice', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );

      // Attempt to confirm again
      await expect(
        salesInvoiceService.confirmSalesInvoice(
          invoice._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Cannot confirm invoice');
    });

    it('should prevent cancellation of paid invoice', async () => {
      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
      await salesInvoiceService.confirmSalesInvoice(
        invoice._id.toString(),
        testUser._id.toString()
      );
      await salesInvoiceService.markInvoiceAsPaid(invoice._id.toString());

      // Attempt to cancel paid invoice
      await expect(
        salesInvoiceService.cancelSalesInvoice(
          invoice._id.toString(),
          testUser._id.toString(),
          'Test'
        )
      ).rejects.toThrow('Cannot cancel paid invoice');
    });

    it('should handle zero stock gracefully', async () => {
      // Reduce stock to zero
      testItem.stock.currentStock = 0;
      await testItem.save();

      const invoiceData = {
        customerId: testCustomer._id,
        items: [
          {
            itemId: testItem._id,
            quantity: 1,
            unitPrice: 150,
          },
        ],
        createdBy: testUser._id,
      };

      const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

      // Should fail due to insufficient stock
      await expect(
        salesInvoiceService.confirmSalesInvoice(
          invoice._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow('Insufficient stock');
    });
  });
});
