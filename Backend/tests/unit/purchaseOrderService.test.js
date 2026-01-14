const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const purchaseOrderService = require('../../src/services/purchaseOrderService');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

/**
 * Unit Tests for PurchaseOrder Service
 * Tests for Requirement 10.1, 10.2 - Task 41.2
 */
describe('PurchaseOrder Service', () => {
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

  describe('createPurchaseOrder', () => {
    it('should create a purchase order successfully', async () => {
      const poData = {
        poNumber: 'PO-2024-001',
        supplierId: testSupplier._id,
        poDate: new Date('2024-01-15'),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
          {
            itemId: testItem2._id,
            quantity: 5,
            unitPrice: 200,
          },
        ],
        notes: 'Test purchase order',
        createdBy: testUser._id,
      };

      const result = await purchaseOrderService.createPurchaseOrder(poData);

      expect(result).toBeDefined();
      expect(result.poNumber).toBe('PO-2024-001');
      expect(result.supplierId._id.toString()).toBe(testSupplier._id.toString());
      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBe(2000); // (10 * 100) + (5 * 200)
      expect(result.totalAmount).toBe(2000);
      expect(result.status).toBe('draft');
      expect(result.fulfillmentStatus).toBe('pending');
      expect(result.items[0].lineTotal).toBe(1000);
      expect(result.items[1].lineTotal).toBe(1000);
      expect(result.items[0].pendingQuantity).toBe(10);
      expect(result.items[1].pendingQuantity).toBe(5);
    });

    it('should throw error if supplier not found', async () => {
      const poData = {
        poNumber: 'PO-2024-002',
        supplierId: new mongoose.Types.ObjectId(),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await expect(purchaseOrderService.createPurchaseOrder(poData)).rejects.toThrow(
        'Supplier not found'
      );
    });

    it('should throw error if item not found', async () => {
      const poData = {
        poNumber: 'PO-2024-003',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 10,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      await expect(purchaseOrderService.createPurchaseOrder(poData)).rejects.toThrow(
        'One or more items not found'
      );
    });

    it('should calculate line totals correctly', async () => {
      const poData = {
        poNumber: 'PO-2024-004',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 15,
            unitPrice: 120,
          },
        ],
        createdBy: testUser._id,
      };

      const result = await purchaseOrderService.createPurchaseOrder(poData);

      expect(result.items[0].lineTotal).toBe(1800); // 15 * 120
      expect(result.subtotal).toBe(1800);
      expect(result.totalAmount).toBe(1800);
    });
  });

  describe('getPurchaseOrders', () => {
    beforeEach(async () => {
      // Create multiple purchase orders
      await PurchaseOrder.create([
        {
          poNumber: 'PO-2024-001',
          supplierId: testSupplier._id,
          poDate: new Date('2024-01-15'),
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
          status: 'draft',
          fulfillmentStatus: 'pending',
          createdBy: testUser._id,
        },
        {
          poNumber: 'PO-2024-002',
          supplierId: testSupplier._id,
          poDate: new Date('2024-01-20'),
          items: [
            {
              itemId: testItem2._id,
              quantity: 5,
              unitPrice: 200,
              lineTotal: 1000,
            },
          ],
          subtotal: 1000,
          totalAmount: 1000,
          status: 'approved',
          fulfillmentStatus: 'pending',
          createdBy: testUser._id,
        },
      ]);
    });

    it('should get all purchase orders', async () => {
      const result = await purchaseOrderService.getPurchaseOrders();

      expect(result.purchaseOrders).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      const result = await purchaseOrderService.getPurchaseOrders({ status: 'approved' });

      expect(result.purchaseOrders).toHaveLength(1);
      expect(result.purchaseOrders[0].poNumber).toBe('PO-2024-002');
    });

    it('should filter by date range', async () => {
      const result = await purchaseOrderService.getPurchaseOrders({
        startDate: '2024-01-18',
        endDate: '2024-01-25',
      });

      expect(result.purchaseOrders).toHaveLength(1);
      expect(result.purchaseOrders[0].poNumber).toBe('PO-2024-002');
    });

    it('should support pagination', async () => {
      const result = await purchaseOrderService.getPurchaseOrders({
        page: 1,
        limit: 1,
      });

      expect(result.purchaseOrders).toHaveLength(1);
      expect(result.pagination.pages).toBe(2);
    });
  });

  describe('getPurchaseOrderById', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
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
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should get purchase order by ID', async () => {
      const result = await purchaseOrderService.getPurchaseOrderById(testPO._id);

      expect(result).toBeDefined();
      expect(result.poNumber).toBe('PO-2024-001');
      expect(result.supplierId._id.toString()).toBe(testSupplier._id.toString());
    });

    it('should throw error if purchase order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(purchaseOrderService.getPurchaseOrderById(fakeId)).rejects.toThrow(
        'Purchase order not found'
      );
    });

    it('should not return soft deleted purchase orders', async () => {
      testPO.isDeleted = true;
      await testPO.save();

      await expect(purchaseOrderService.getPurchaseOrderById(testPO._id)).rejects.toThrow(
        'Purchase order not found'
      );
    });
  });

  describe('approvePurchaseOrder', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
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
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should approve purchase order successfully', async () => {
      const result = await purchaseOrderService.approvePurchaseOrder(testPO._id, testUser._id);

      expect(result.status).toBe('approved');
      expect(result.approvedBy._id.toString()).toBe(testUser._id.toString());
      expect(result.approvedAt).toBeDefined();
    });

    it('should throw error if already approved', async () => {
      await purchaseOrderService.approvePurchaseOrder(testPO._id, testUser._id);

      await expect(
        purchaseOrderService.approvePurchaseOrder(testPO._id, testUser._id)
      ).rejects.toThrow('Purchase order is already approved');
    });

    it('should throw error if purchase order is cancelled', async () => {
      testPO.status = 'cancelled';
      await testPO.save();

      await expect(
        purchaseOrderService.approvePurchaseOrder(testPO._id, testUser._id)
      ).rejects.toThrow('Cannot approve cancelled purchase order');
    });

    it('should throw error if purchase order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        purchaseOrderService.approvePurchaseOrder(fakeId, testUser._id)
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('updatePurchaseOrder', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
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
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should update purchase order successfully', async () => {
      const updateData = {
        notes: 'Updated notes',
        items: [
          {
            itemId: testItem1._id,
            quantity: 15,
            unitPrice: 110,
          },
        ],
      };

      const result = await purchaseOrderService.updatePurchaseOrder(testPO._id, updateData);

      expect(result.notes).toBe('Updated notes');
      expect(result.items[0].quantity).toBe(15);
      expect(result.items[0].unitPrice).toBe(110);
      expect(result.subtotal).toBe(1650); // 15 * 110
    });

    it('should throw error if purchase order is approved', async () => {
      testPO.status = 'approved';
      await testPO.save();

      await expect(
        purchaseOrderService.updatePurchaseOrder(testPO._id, { notes: 'Test' })
      ).rejects.toThrow('Cannot update approved purchase order');
    });

    it('should throw error if purchase order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        purchaseOrderService.updatePurchaseOrder(fakeId, { notes: 'Test' })
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('deletePurchaseOrder', () => {
    let testPO;

    beforeEach(async () => {
      testPO = await PurchaseOrder.create({
        poNumber: 'PO-2024-001',
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
        status: 'draft',
        fulfillmentStatus: 'pending',
        createdBy: testUser._id,
      });
    });

    it('should soft delete purchase order successfully', async () => {
      const result = await purchaseOrderService.deletePurchaseOrder(testPO._id);

      expect(result.message).toBe('Purchase order deleted successfully');

      const deletedPO = await PurchaseOrder.findById(testPO._id);
      expect(deletedPO.isDeleted).toBe(true);
    });

    it('should throw error if purchase order is approved', async () => {
      testPO.status = 'approved';
      await testPO.save();

      await expect(purchaseOrderService.deletePurchaseOrder(testPO._id)).rejects.toThrow(
        'Cannot delete approved purchase order'
      );
    });

    it('should throw error if purchase order not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(purchaseOrderService.deletePurchaseOrder(fakeId)).rejects.toThrow(
        'Purchase order not found'
      );
    });
  });
});
