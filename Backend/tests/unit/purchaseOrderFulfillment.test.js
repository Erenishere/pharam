const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const purchaseOrderService = require('../../src/services/purchaseOrderService');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Unit Tests for PO Fulfillment Tracking
 * Tests for Requirement 10.4, 10.5 - Tasks 43.1, 43.2, 43.3
 */
describe('PO Fulfillment Tracking Service', () => {
  let mongoServer;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testUser;

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
    // Clear collections
    await PurchaseOrder.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    // Create test data
    testSupplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'supplier@test.com',
      address: '123 Test St',
      city: 'Test City',
      isActive: true,
    });

    testItem1 = await Item.create({
      name: 'Test Item 1',
      code: 'ITEM001',
      category: 'Electronics',
      unit: 'pcs',
      purchasePrice: 100,
      salePrice: 150,
      currentStock: 50,
      reorderLevel: 10,
    });

    testItem2 = await Item.create({
      name: 'Test Item 2',
      code: 'ITEM002',
      category: 'Electronics',
      unit: 'pcs',
      purchasePrice: 200,
      salePrice: 300,
      currentStock: 30,
      reorderLevel: 5,
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });
  });

  describe('updatePOFulfillment', () => {
    it('should update received quantities correctly', async () => {
      // Create a PO
      const poData = {
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
          {
            itemId: testItem2._id,
            quantity: 50,
            unitPrice: 200,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      // Simulate receiving partial quantity
      const invoiceItems = [
        {
          itemId: testItem1._id,
          quantity: 30,
        },
        {
          itemId: testItem2._id,
          quantity: 20,
        },
      ];

      const updatedPO = await purchaseOrderService.updatePOFulfillment(po._id, invoiceItems);

      expect(updatedPO.items[0].receivedQuantity).toBe(30);
      expect(updatedPO.items[0].pendingQuantity).toBe(70);
      expect(updatedPO.items[1].receivedQuantity).toBe(20);
      expect(updatedPO.items[1].pendingQuantity).toBe(30);
    });

    it('should update fulfillment status to partial when some items received', async () => {
      const poData = {
        poNumber: 'PO-2024-002',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      const invoiceItems = [
        {
          itemId: testItem1._id,
          quantity: 50,
        },
      ];

      const updatedPO = await purchaseOrderService.updatePOFulfillment(po._id, invoiceItems);

      expect(updatedPO.fulfillmentStatus).toBe('partial');
    });

    it('should update fulfillment status to fulfilled when all items received', async () => {
      const poData = {
        poNumber: 'PO-2024-003',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      const invoiceItems = [
        {
          itemId: testItem1._id,
          quantity: 100,
        },
      ];

      const updatedPO = await purchaseOrderService.updatePOFulfillment(po._id, invoiceItems);

      expect(updatedPO.fulfillmentStatus).toBe('fulfilled');
      expect(updatedPO.items[0].receivedQuantity).toBe(100);
      expect(updatedPO.items[0].pendingQuantity).toBe(0);
    });

    it('should handle multiple partial deliveries', async () => {
      const poData = {
        poNumber: 'PO-2024-004',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      // First delivery
      await purchaseOrderService.updatePOFulfillment(po._id, [
        { itemId: testItem1._id, quantity: 30 },
      ]);

      // Second delivery
      await purchaseOrderService.updatePOFulfillment(po._id, [
        { itemId: testItem1._id, quantity: 40 },
      ]);

      // Third delivery
      const updatedPO = await purchaseOrderService.updatePOFulfillment(po._id, [
        { itemId: testItem1._id, quantity: 30 },
      ]);

      expect(updatedPO.items[0].receivedQuantity).toBe(100);
      expect(updatedPO.items[0].pendingQuantity).toBe(0);
      expect(updatedPO.fulfillmentStatus).toBe('fulfilled');
    });

    it('should throw error if PO not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        purchaseOrderService.updatePOFulfillment(fakeId, [])
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('getPOPendingQuantities', () => {
    it('should return pending quantities for all items', async () => {
      const poData = {
        poNumber: 'PO-2024-005',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
          {
            itemId: testItem2._id,
            quantity: 50,
            unitPrice: 200,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      // Receive partial quantity
      await purchaseOrderService.updatePOFulfillment(po._id, [
        { itemId: testItem1._id, quantity: 30 },
        { itemId: testItem2._id, quantity: 20 },
      ]);

      const result = await purchaseOrderService.getPOPendingQuantities(po._id);

      expect(result.poNumber).toBe('PO-2024-005');
      expect(result.fulfillmentStatus).toBe('partial');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].orderedQuantity).toBe(100);
      expect(result.items[0].receivedQuantity).toBe(30);
      expect(result.items[0].pendingQuantity).toBe(70);
      expect(result.items[1].orderedQuantity).toBe(50);
      expect(result.items[1].receivedQuantity).toBe(20);
      expect(result.items[1].pendingQuantity).toBe(30);
    });

    it('should show zero pending for fully fulfilled PO', async () => {
      const poData = {
        poNumber: 'PO-2024-006',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      await purchaseOrderService.updatePOFulfillment(po._id, [
        { itemId: testItem1._id, quantity: 100 },
      ]);

      const result = await purchaseOrderService.getPOPendingQuantities(po._id);

      expect(result.fulfillmentStatus).toBe('fulfilled');
      expect(result.items[0].pendingQuantity).toBe(0);
    });

    it('should include item details in response', async () => {
      const poData = {
        poNumber: 'PO-2024-007',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      const result = await purchaseOrderService.getPOPendingQuantities(po._id);

      expect(result.items[0].itemName).toBe('Test Item 1');
      expect(result.items[0].itemCode).toBe('ITEM001');
      expect(result.items[0].unitPrice).toBe(100);
    });
  });

  describe('getPOFulfillmentReport', () => {
    beforeEach(async () => {
      // Create multiple POs with different fulfillment statuses
      const po1 = await purchaseOrderService.createPurchaseOrder({
        poNumber: 'PO-2024-010',
        supplierId: testSupplier._id,
        poDate: new Date('2024-01-15'),
        items: [{ itemId: testItem1._id, quantity: 100, unitPrice: 100 }],
        createdBy: testUser._id,
      });
      await purchaseOrderService.approvePurchaseOrder(po1._id, testUser._id);

      const po2 = await purchaseOrderService.createPurchaseOrder({
        poNumber: 'PO-2024-011',
        supplierId: testSupplier._id,
        poDate: new Date('2024-01-20'),
        items: [{ itemId: testItem2._id, quantity: 50, unitPrice: 200 }],
        createdBy: testUser._id,
      });
      await purchaseOrderService.approvePurchaseOrder(po2._id, testUser._id);
      await purchaseOrderService.updatePOFulfillment(po2._id, [
        { itemId: testItem2._id, quantity: 25 },
      ]);

      const po3 = await purchaseOrderService.createPurchaseOrder({
        poNumber: 'PO-2024-012',
        supplierId: testSupplier._id,
        poDate: new Date('2024-01-25'),
        items: [{ itemId: testItem1._id, quantity: 200, unitPrice: 100 }],
        createdBy: testUser._id,
      });
      await purchaseOrderService.approvePurchaseOrder(po3._id, testUser._id);
      await purchaseOrderService.updatePOFulfillment(po3._id, [
        { itemId: testItem1._id, quantity: 200 },
      ]);
    });

    it('should return fulfillment report for all POs', async () => {
      const report = await purchaseOrderService.getPOFulfillmentReport();

      expect(report.reportType).toBe('po_fulfillment');
      expect(report.summary.totalPOs).toBe(3);
      expect(report.summary.pending).toBe(1);
      expect(report.summary.partiallyFulfilled).toBe(1);
      expect(report.summary.fullyFulfilled).toBe(1);
      expect(report.purchaseOrders).toHaveLength(3);
    });

    it('should filter by fulfillment status', async () => {
      const report = await purchaseOrderService.getPOFulfillmentReport({
        fulfillmentStatus: 'partial',
      });

      expect(report.summary.totalPOs).toBe(1);
      expect(report.purchaseOrders[0].fulfillmentStatus).toBe('partial');
    });

    it('should filter by date range', async () => {
      const report = await purchaseOrderService.getPOFulfillmentReport({
        startDate: '2024-01-18',
        endDate: '2024-01-26',
      });

      expect(report.summary.totalPOs).toBe(2);
      expect(report.purchaseOrders.every((po) => po.poDate >= new Date('2024-01-18'))).toBe(true);
    });

    it('should include pending quantities in report', async () => {
      const report = await purchaseOrderService.getPOFulfillmentReport();

      const partialPO = report.purchaseOrders.find((po) => po.fulfillmentStatus === 'partial');
      expect(partialPO).toBeDefined();
      expect(partialPO.items[0].orderedQuantity).toBe(50);
      expect(partialPO.items[0].receivedQuantity).toBe(25);
      expect(partialPO.items[0].pendingQuantity).toBe(25);
    });

    it('should include supplier details', async () => {
      const report = await purchaseOrderService.getPOFulfillmentReport();

      expect(report.purchaseOrders[0].supplier.name).toBe('Test Supplier');
      expect(report.purchaseOrders[0].supplier.code).toBe('SUP001');
    });

    it('should only include approved POs', async () => {
      // Create a draft PO
      await purchaseOrderService.createPurchaseOrder({
        poNumber: 'PO-2024-013',
        supplierId: testSupplier._id,
        items: [{ itemId: testItem1._id, quantity: 100, unitPrice: 100 }],
        createdBy: testUser._id,
      });

      const report = await purchaseOrderService.getPOFulfillmentReport();

      // Should still be 3 (not including the draft)
      expect(report.summary.totalPOs).toBe(3);
    });
  });
});
