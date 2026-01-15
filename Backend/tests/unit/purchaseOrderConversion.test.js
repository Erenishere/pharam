const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const purchaseOrderService = require('../../src/services/purchaseOrderService');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Invoice = require('../../src/models/Invoice');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Account = require('../../src/models/Account');

/**
 * Unit Tests for PO to Invoice Conversion
 * Tests for Requirement 10.2, 10.3 - Task 42.1
 */
describe('PO to Invoice Conversion Service', () => {
  let mongoServer;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testUser;
  let testInventoryAccount;
  let testPayableAccount;
  let testGSTAccount;

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
    await Invoice.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});
    await Account.deleteMany({});

    // Create test accounts
    testInventoryAccount = await Account.create({
      name: 'Inventory',
      code: 'INV-001',
      type: 'asset',
      category: 'current_asset',
      isActive: true,
    });

    testPayableAccount = await Account.create({
      name: 'Accounts Payable',
      code: 'AP-001',
      type: 'liability',
      category: 'current_liability',
      isActive: true,
    });

    testGSTAccount = await Account.create({
      name: 'GST Input',
      code: 'GST-IN-001',
      type: 'asset',
      category: 'current_asset',
      isActive: true,
    });

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
      accountId: testPayableAccount._id,
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
      inventoryAccountId: testInventoryAccount._id,
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
      inventoryAccountId: testInventoryAccount._id,
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });
  });

  describe('convertPOToInvoice', () => {
    it('should convert approved PO to invoice successfully', async () => {
      // Create and approve a PO
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

      const po = await purchaseOrderService.createPurchaseOrder(poData);
      await purchaseOrderService.approvePurchaseOrder(po._id, testUser._id);

      // Convert to invoice
      const invoice = await purchaseOrderService.convertPOToInvoice(po._id, {
        supplierBillNo: 'BILL-001',
        invoiceDate: new Date('2024-01-20'),
        gstRate: 18,
      });

      expect(invoice).toBeDefined();
      expect(invoice.invoiceType).toBe('purchase');
      expect(invoice.supplierId.toString()).toBe(testSupplier._id.toString());
      expect(invoice.poNumber).toBe('PO-2024-001');
      expect(invoice.poId.toString()).toBe(po._id.toString());
      expect(invoice.supplierBillNo).toBe('BILL-001');
      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[0].quantity).toBe(10);
      expect(invoice.items[1].quantity).toBe(5);
    });

    it('should throw error if PO is not approved', async () => {
      // Create a draft PO
      const poData = {
        poNumber: 'PO-2024-002',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);

      // Try to convert without approval
      await expect(
        purchaseOrderService.convertPOToInvoice(po._id)
      ).rejects.toThrow('Purchase order must be approved before conversion to invoice');
    });

    it('should auto-populate invoice with PO details', async () => {
      // Create and approve a PO
      const poData = {
        poNumber: 'PO-2024-003',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 15,
            unitPrice: 110,
          },
        ],
        notes: 'Test PO for conversion',
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);
      await purchaseOrderService.approvePurchaseOrder(po._id, testUser._id);

      // Convert to invoice without additional data
      const invoice = await purchaseOrderService.convertPOToInvoice(po._id);

      expect(invoice.poNumber).toBe('PO-2024-003');
      expect(invoice.poId.toString()).toBe(po._id.toString());
      expect(invoice.supplierBillNo).toBe('PO-PO-2024-003'); // Auto-generated
      expect(invoice.notes).toContain('Converted from PO: PO-2024-003');
      expect(invoice.items[0].quantity).toBe(15);
      expect(invoice.items[0].unitPrice).toBe(110);
    });

    it('should link invoice to PO via poId field', async () => {
      // Create and approve a PO
      const poData = {
        poNumber: 'PO-2024-004',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);
      await purchaseOrderService.approvePurchaseOrder(po._id, testUser._id);

      // Convert to invoice
      const invoice = await purchaseOrderService.convertPOToInvoice(po._id, {
        supplierBillNo: 'BILL-004',
      });

      // Verify link
      expect(invoice.poId).toBeDefined();
      expect(invoice.poId.toString()).toBe(po._id.toString());

      // Verify we can query invoice by PO
      const foundInvoice = await Invoice.findOne({ poId: po._id });
      expect(foundInvoice).toBeDefined();
      expect(foundInvoice._id.toString()).toBe(invoice._id.toString());
    });

    it('should support additional invoice fields during conversion', async () => {
      // Create and approve a PO
      const poData = {
        poNumber: 'PO-2024-005',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);
      await purchaseOrderService.approvePurchaseOrder(po._id, testUser._id);

      // Convert with additional fields
      const invoice = await purchaseOrderService.convertPOToInvoice(po._id, {
        supplierBillNo: 'BILL-005',
        dimension: 'Project-A',
        biltyNo: 'BLT-001',
        biltyDate: new Date('2024-01-18'),
        transportCompany: 'Fast Transport',
        transportCharges: 500,
        notes: 'Custom notes for invoice',
      });

      expect(invoice.dimension).toBe('Project-A');
      expect(invoice.biltyNo).toBe('BLT-001');
      expect(invoice.transportCompany).toBe('Fast Transport');
      expect(invoice.transportCharges).toBe(500);
      expect(invoice.notes).toBe('Custom notes for invoice');
    });

    it('should use pending quantity for conversion', async () => {
      // Create and approve a PO
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
      await purchaseOrderService.approvePurchaseOrder(po._id, testUser._id);

      // Convert to invoice
      const invoice = await purchaseOrderService.convertPOToInvoice(po._id, {
        supplierBillNo: 'BILL-006',
      });

      // Should use full pending quantity (100)
      expect(invoice.items[0].quantity).toBe(100);
    });

    it('should throw error if PO not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        purchaseOrderService.convertPOToInvoice(fakeId)
      ).rejects.toThrow('Purchase order not found');
    });

    it('should apply default GST rate if not specified', async () => {
      // Create and approve a PO
      const poData = {
        poNumber: 'PO-2024-007',
        supplierId: testSupplier._id,
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
          },
        ],
        createdBy: testUser._id,
      };

      const po = await purchaseOrderService.createPurchaseOrder(poData);
      await purchaseOrderService.approvePurchaseOrder(po._id, testUser._id);

      // Convert without specifying GST rate
      const invoice = await purchaseOrderService.convertPOToInvoice(po._id, {
        supplierBillNo: 'BILL-007',
      });

      // Should default to 18%
      expect(invoice.items[0].gstRate).toBe(18);
    });
  });
});
