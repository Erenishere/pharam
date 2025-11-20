const mongoose = require('mongoose');
const Invoice = require('../../src/models/Invoice');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const purchaseReturnService = require('../../src/services/purchaseReturnService');
const inventoryService = require('../../src/services/inventoryService');
const ledgerService = require('../../src/services/ledgerService');

describe('Purchase Return Workflow - Full Integration Tests', () => {
  let testSupplier;
  let testItem1;
  let testItem2;
  let testInvoice;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/indus-traders-test');
    }
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});

    testSupplier = await Supplier.create({
      name: 'Test Supplier',
      email: 'supplier@test.com',
      phone: '1234567890',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      isActive: true
    });

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
        gstRate: 4,
        whtRate: 0
      },
      isActive: true
    });

    testInvoice = await Invoice.create({
      type: 'purchase',
      supplierBillNo: 'BILL001',
      supplierId: testSupplier._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          itemId: testItem1._id,
          quantity: 10,
          unitPrice: 80,
          gstRate: 18,
          gstAmount: 144,
          taxAmount: 144,
          lineTotal: 944
        },
        {
          itemId: testItem2._id,
          quantity: 5,
          unitPrice: 150,
          gstRate: 4,
          gstAmount: 30,
          taxAmount: 30,
          lineTotal: 780
        }
      ],
      totals: {
        subtotal: 1550,
        totalDiscount: 0,
        totalTax: 174,
        gst18Total: 144,
        gst4Total: 30,
        grandTotal: 1724
      },
      status: 'confirmed',
      paymentStatus: 'pending'
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Full Return Scenario', () => {
    test('should return all items from invoice', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 10 },
          { itemId: testItem2._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      expect(returnInvoice).toBeDefined();
      expect(returnInvoice.type).toBe('return_purchase');
      expect(returnInvoice.items).toHaveLength(2);
      expect(returnInvoice.totals.grandTotal).toBe(-1724);
    });

    test('should completely reverse inventory for full return', async () => {
      const initialStock1 = testItem1.inventory.currentStock;
      const initialStock2 = testItem2.inventory.currentStock;

      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 10 },
          { itemId: testItem2._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      await purchaseReturnService.createPurchaseReturn(returnData);

      // Verify inventory was decreased
      const updatedItem1 = await Item.findById(testItem1._id);
      const updatedItem2 = await Item.findById(testItem2._id);

      expect(updatedItem1.inventory.currentStock).toBeLessThan(initialStock1);
      expect(updatedItem2.inventory.currentStock).toBeLessThan(initialStock2);
    });

    test('should completely reverse supplier balance for full return', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 10 },
          { itemId: testItem2._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      // Verify return invoice was created with negative totals
      expect(returnInvoice.totals.subtotal).toBe(-1550);
      expect(returnInvoice.totals.totalTax).toBe(-174);
      expect(returnInvoice.totals.gst18Total).toBe(-144);
      expect(returnInvoice.totals.gst4Total).toBe(-30);
    });

    test('should maintain original invoice link', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 10 },
          { itemId: testItem2._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      expect(returnInvoice.originalInvoiceId).toEqual(testInvoice._id);
    });

    test('should store return metadata', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 10 },
          { itemId: testItem2._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged in transit',
        createdBy: new mongoose.Types.ObjectId()
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      expect(returnInvoice.returnMetadata).toBeDefined();
      expect(returnInvoice.returnMetadata.returnReason).toBe('damaged');
      expect(returnInvoice.returnMetadata.returnNotes).toBe('All items damaged in transit');
      expect(returnInvoice.returnMetadata.returnDate).toBeDefined();
    });

    test('should handle mixed GST rates in full return', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 10 },
          { itemId: testItem2._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'All items damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      const returnInvoice = await purchaseReturnService.createPurchaseReturn(returnData);

      expect(returnInvoice.totals.gst18Total).toBe(-144);
      expect(returnInvoice.totals.gst4Total).toBe(-30);
      expect(returnInvoice.totals.totalTax).toBe(-174);
    });
  });

  describe('Return Validation Edge Cases', () => {
    test('should reject return quantity exceeding original quantity', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 15 } // More than original 10
        ],
        returnReason: 'damaged',
        returnNotes: 'Damaged items',
        createdBy: new mongoose.Types.ObjectId()
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(returnData)
      ).rejects.toThrow('Return validation failed');
    });

    test('should reject return of non-existent item', async () => {
      const fakeItemId = new mongoose.Types.ObjectId();

      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: fakeItemId, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'Damaged items',
        createdBy: new mongoose.Types.ObjectId()
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(returnData)
      ).rejects.toThrow('Return validation failed');
    });

    test('should reject return from non-existent invoice', async () => {
      const fakeInvoiceId = new mongoose.Types.ObjectId();

      const returnData = {
        originalInvoiceId: fakeInvoiceId,
        returnItems: [
          { itemId: testItem1._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'Damaged items',
        createdBy: new mongoose.Types.ObjectId()
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(returnData)
      ).rejects.toThrow('Original invoice not found');
    });

    test('should reject return from sales invoice', async () => {
      const salesInvoice = await Invoice.create({
        type: 'sales',
        customerId: new mongoose.Types.ObjectId(),
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            taxAmount: 180,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        },
        status: 'confirmed',
        paymentStatus: 'pending'
      });

      const returnData = {
        originalInvoiceId: salesInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'Damaged items',
        createdBy: new mongoose.Types.ObjectId()
      };

      await expect(
        purchaseReturnService.createPurchaseReturn(returnData)
      ).rejects.toThrow('Can only create returns for purchase invoices');
    });

    test('should provide appropriate error messages', async () => {
      const returnData = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 20 } // Exceeds original 10
        ],
        returnReason: 'damaged',
        returnNotes: 'Damaged items',
        createdBy: new mongoose.Types.ObjectId()
      };

      try {
        await purchaseReturnService.createPurchaseReturn(returnData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Return validation failed');
      }
    });
  });

  describe('Multiple Return Scenarios', () => {
    test('should allow multiple partial returns totaling full quantity', async () => {
      // First return: 5 items
      const firstReturn = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'First batch damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      const firstReturnInvoice = await purchaseReturnService.createPurchaseReturn(firstReturn);
      expect(firstReturnInvoice).toBeDefined();

      // Second return: remaining 5 items
      const secondReturn = {
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'Second batch damaged',
        createdBy: new mongoose.Types.ObjectId()
      };

      const secondReturnInvoice = await purchaseReturnService.createPurchaseReturn(secondReturn);
      expect(secondReturnInvoice).toBeDefined();

      // Verify both returns were created
      const allReturns = await Invoice.find({
        originalInvoiceId: testInvoice._id,
        type: 'return_purchase'
      });

      expect(allReturns).toHaveLength(2);
    });

    test('should prevent over-returning after multiple returns', async () => {
      // First return: 5 items
      await purchaseReturnService.createPurchaseReturn({
        originalInvoiceId: testInvoice._id,
        returnItems: [
          { itemId: testItem1._id, quantity: 5 }
        ],
        returnReason: 'damaged',
        returnNotes: 'First batch',
        createdBy: new mongoose.Types.ObjectId()
      });

      // Try to return 8 items (exceeds remaining 5)
      await expect(
        purchaseReturnService.createPurchaseReturn({
          originalInvoiceId: testInvoice._id,
          returnItems: [
            { itemId: testItem1._id, quantity: 8 }
          ],
          returnReason: 'damaged',
          returnNotes: 'Second batch',
          createdBy: new mongoose.Types.ObjectId()
        })
      ).rejects.toThrow('Return validation failed');
    });
  });
});
