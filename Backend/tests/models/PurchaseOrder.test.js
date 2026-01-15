const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Unit Tests for PurchaseOrder Model
 * Tests for Requirement 10.1 - Task 41.1
 */
describe('PurchaseOrder Model', () => {
  let mongoServer;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

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

  afterAll(async () => {
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await PurchaseOrder.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid purchase order with required fields', async () => {
      const poData = {
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        poDate: new Date('2024-01-15'),
        status: 'draft',
        fulfillmentStatus: 'pending',
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      });

      const po = await PurchaseOrder.create(poData);

      expect(po.poNumber).toBe('PO-2024-001');
      expect(po.supplierId.toString()).toBe(testSupplier._id.toString());
      expect(po.status).toBe('draft');
      expect(po.fulfillmentStatus).toBe('pending');
      expect(po.items).toHaveLength(1);
      expect(po.items[0].quantity).toBe(10);
      expect(po.items[0].unitPrice).toBe(100);
      expect(po.subtotal).toBe(1000);
      expect(po.totalAmount).toBe(1000);
    });

    it('should fail validation when poNumber is missing', async () => {
      const poData = {
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when supplierId is missing', async () => {
      const poData = {
        poNumber: 'PO-2024-002',
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when items array is empty', async () => {
      const poData = {
        poNumber: 'PO-2024-003',
        supplierId: testSupplier._id,
        items: [],
        subtotal: 0,
        totalAmount: 0,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should fail validation when createdBy is missing', async () => {
      const poData = {
        poNumber: 'PO-2024-004',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });
  });

  describe('PO Number Uniqueness', () => {
    it('should enforce unique PO numbers', async () => {
      const poData1 = {
        poNumber: 'PO-2024-005',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      };

      await PurchaseOrder.create(poData1);

      const poData2 = {
        ...poData1,
        supplierId: testSupplier._id,
      };

      await expect(PurchaseOrder.create(poData2)).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status values', async () => {
      const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'cancelled'];

      for (const status of validStatuses) {
        const po = await PurchaseOrder.create({
          poNumber: `PO-STATUS-${status}`,
          supplierId: testSupplier._id,
          status: status,
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100,
              lineTotal: 1000,
            },
          ],
          subtotal: 1000,
          totalAmount: 1000,
          createdBy: testUser._id,
        });

        expect(po.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      const poData = {
        poNumber: 'PO-INVALID-STATUS',
        supplierId: testSupplier._id,
        status: 'invalid_status',
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });
  });

  describe('Fulfillment Status Enum Validation', () => {
    it('should accept valid fulfillment status values', async () => {
      const validStatuses = ['pending', 'partial', 'fulfilled'];

      for (const fulfillmentStatus of validStatuses) {
        const po = await PurchaseOrder.create({
          poNumber: `PO-FULFILL-${fulfillmentStatus}`,
          supplierId: testSupplier._id,
          fulfillmentStatus: fulfillmentStatus,
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100,
              lineTotal: 1000,
            },
          ],
          subtotal: 1000,
          totalAmount: 1000,
          createdBy: testUser._id,
        });

        expect(po.fulfillmentStatus).toBe(fulfillmentStatus);
      }
    });

    it('should reject invalid fulfillment status values', async () => {
      const poData = {
        poNumber: 'PO-INVALID-FULFILL',
        supplierId: testSupplier._id,
        fulfillmentStatus: 'invalid_status',
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });
  });

  describe('Item Validation', () => {
    it('should validate item quantity is greater than 0', async () => {
      const poData = {
        poNumber: 'PO-ITEM-QTY',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 0,
            unitPrice: 100,
            lineTotal: 0,
          },
        ],
        subtotal: 0,
        totalAmount: 0,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should validate item unitPrice is not negative', async () => {
      const poData = {
        poNumber: 'PO-ITEM-PRICE',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: -100,
            lineTotal: -1000,
          },
        ],
        subtotal: -1000,
        totalAmount: -1000,
        createdBy: testUser._id,
      };

      await expect(PurchaseOrder.create(poData)).rejects.toThrow();
    });

    it('should support multiple items in a purchase order', async () => {
      const poData = {
        poNumber: 'PO-MULTI-ITEMS',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
          {
            itemId: testItem2._id,
            quantity: 5,
            unitPrice: 200,
            lineTotal: 1000,
          },
        ],
        subtotal: 2000,
        totalAmount: 2000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items).toHaveLength(2);
      expect(po.items[0].itemId.toString()).toBe(testItem1._id.toString());
      expect(po.items[1].itemId.toString()).toBe(testItem2._id.toString());
      expect(po.subtotal).toBe(2000);
    });
  });

  describe('Pending Quantity Calculation', () => {
    it('should calculate pending quantity on save', async () => {
      const poData = {
        poNumber: 'PO-PENDING-QTY',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
            receivedQuantity: 30,
            lineTotal: 10000,
          },
        ],
        subtotal: 10000,
        totalAmount: 10000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items[0].pendingQuantity).toBe(70);
    });

    it('should set pending quantity to full quantity when nothing received', async () => {
      const poData = {
        poNumber: 'PO-NO-RECEIVED',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
            lineTotal: 10000,
          },
        ],
        subtotal: 10000,
        totalAmount: 10000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.items[0].pendingQuantity).toBe(100);
    });
  });

  describe('Virtual Properties', () => {
    it('should return true for isFullyReceived when all items are received', async () => {
      const poData = {
        poNumber: 'PO-FULLY-RECEIVED',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
            receivedQuantity: 100,
            lineTotal: 10000,
          },
        ],
        subtotal: 10000,
        totalAmount: 10000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isFullyReceived).toBe(true);
    });

    it('should return false for isFullyReceived when items are partially received', async () => {
      const poData = {
        poNumber: 'PO-PARTIAL-RECEIVED',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
            receivedQuantity: 50,
            lineTotal: 10000,
          },
        ],
        subtotal: 10000,
        totalAmount: 10000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isFullyReceived).toBe(false);
    });

    it('should return true for isPartiallyReceived when some items are received', async () => {
      const poData = {
        poNumber: 'PO-PARTIAL-CHECK',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
            receivedQuantity: 50,
            lineTotal: 10000,
          },
        ],
        subtotal: 10000,
        totalAmount: 10000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isPartiallyReceived).toBe(true);
    });

    it('should return false for isPartiallyReceived when nothing is received', async () => {
      const poData = {
        poNumber: 'PO-NO-PARTIAL',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 100,
            unitPrice: 100,
            receivedQuantity: 0,
            lineTotal: 10000,
          },
        ],
        subtotal: 10000,
        totalAmount: 10000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isPartiallyReceived).toBe(false);
    });
  });

  describe('Approval Fields', () => {
    it('should store approval information', async () => {
      const approvalDate = new Date('2024-01-20');
      const poData = {
        poNumber: 'PO-APPROVED',
        supplierId: testSupplier._id,
        status: 'approved',
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
        approvedBy: testUser._id,
        approvedAt: approvalDate,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.approvedBy.toString()).toBe(testUser._id.toString());
      expect(po.approvedAt).toEqual(approvalDate);
    });
  });

  describe('Soft Delete', () => {
    it('should support soft delete with isDeleted flag', async () => {
      const poData = {
        poNumber: 'PO-SOFT-DELETE',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
        isDeleted: true,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.isDeleted).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt timestamps', async () => {
      const poData = {
        poNumber: 'PO-TIMESTAMPS',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        totalAmount: 1000,
        createdBy: testUser._id,
      };

      const po = await PurchaseOrder.create(poData);

      expect(po.createdAt).toBeDefined();
      expect(po.updatedAt).toBeDefined();
      expect(po.createdAt).toBeInstanceOf(Date);
      expect(po.updatedAt).toBeInstanceOf(Date);
    });
  });
});
