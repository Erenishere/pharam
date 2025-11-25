const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invoice = require('../../src/models/Invoice');
const Account = require('../../src/models/Account');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');

/**
 * Unit Tests for Adjustment Account Fields in Invoice Model
 * Tests for Requirement 11.1 - Task 44.1
 */
describe('Invoice Model - Adjustment Account Fields', () => {
  let mongoServer;
  let testAdjustmentAccount;
  let testClaimAccount;
  let testCustomer;
  let testSupplier;
  let testItem;
  let testInventoryAccount;
  let testReceivableAccount;
  let testPayableAccount;

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
    await Invoice.deleteMany({});
    await Account.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});

    // Create test accounts
    testInventoryAccount = await Account.create({
      name: 'Inventory',
      code: 'INV-001',
      type: 'asset',
      category: 'current_asset',
      isActive: true,
    });

    testReceivableAccount = await Account.create({
      name: 'Accounts Receivable',
      code: 'AR-001',
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

    testAdjustmentAccount = await Account.create({
      name: 'Discount Adjustment',
      code: 'ADJ-001',
      type: 'expense',
      category: 'operating_expense',
      isActive: true,
    });

    testClaimAccount = await Account.create({
      name: 'Promotional Claims',
      code: 'CLAIM-001',
      type: 'expense',
      category: 'operating_expense',
      isActive: true,
    });

    // Create test customer
    testCustomer = await Customer.create({
      name: 'Test Customer',
      code: 'CUST001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@test.com',
      address: '123 Test St',
      city: 'Test City',
      isActive: true,
      accountId: testReceivableAccount._id,
    });

    // Create test supplier
    testSupplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      contactPerson: 'Jane Doe',
      phone: '0987654321',
      email: 'supplier@test.com',
      address: '456 Test Ave',
      city: 'Test City',
      isActive: true,
      accountId: testPayableAccount._id,
    });

    // Create test item
    testItem = await Item.create({
      name: 'Test Item',
      code: 'ITEM001',
      category: 'Electronics',
      unit: 'pcs',
      purchasePrice: 100,
      salePrice: 150,
      currentStock: 100,
      reorderLevel: 10,
      inventoryAccountId: testInventoryAccount._id,
    });
  });

  describe('adjustmentAccountId field', () => {
    it('should allow setting adjustmentAccountId on sales invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-001',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      expect(invoice.adjustmentAccountId).toBeDefined();
      expect(invoice.adjustmentAccountId.toString()).toBe(testAdjustmentAccount._id.toString());
    });

    it('should populate adjustmentAccountId with account details', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-002',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      const populatedInvoice = await Invoice.findById(invoice._id).populate(
        'adjustmentAccountId'
      );

      expect(populatedInvoice.adjustmentAccountId.name).toBe('Discount Adjustment');
      expect(populatedInvoice.adjustmentAccountId.code).toBe('ADJ-001');
    });

    it('should allow null adjustmentAccountId', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-003',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
      });

      expect(invoice.adjustmentAccountId).toBeUndefined();
    });

    it('should validate adjustmentAccountId is a valid ObjectId', async () => {
      await expect(
        Invoice.create({
          invoiceNumber: 'INV-004',
          invoiceType: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: testItem._id,
              quantity: 10,
              unitPrice: 150,
              lineTotal: 1500,
            },
          ],
          subtotal: 1500,
          totalAmount: 1500,
          adjustmentAccountId: 'invalid-id',
        })
      ).rejects.toThrow();
    });
  });

  describe('claimAccountId field', () => {
    it('should allow setting claimAccountId on sales invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-005',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            scheme2Quantity: 2,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
        claimAccountId: testClaimAccount._id,
      });

      expect(invoice.claimAccountId).toBeDefined();
      expect(invoice.claimAccountId.toString()).toBe(testClaimAccount._id.toString());
    });

    it('should populate claimAccountId with account details', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-006',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            scheme2Quantity: 2,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
        claimAccountId: testClaimAccount._id,
      });

      const populatedInvoice = await Invoice.findById(invoice._id).populate('claimAccountId');

      expect(populatedInvoice.claimAccountId.name).toBe('Promotional Claims');
      expect(populatedInvoice.claimAccountId.code).toBe('CLAIM-001');
    });

    it('should allow null claimAccountId', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-007',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
      });

      expect(invoice.claimAccountId).toBeUndefined();
    });

    it('should validate claimAccountId is a valid ObjectId', async () => {
      await expect(
        Invoice.create({
          invoiceNumber: 'INV-008',
          invoiceType: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: testItem._id,
              quantity: 10,
              unitPrice: 150,
              lineTotal: 1500,
            },
          ],
          subtotal: 1500,
          totalAmount: 1500,
          claimAccountId: 'invalid-id',
        })
      ).rejects.toThrow();
    });
  });

  describe('Both adjustment and claim accounts', () => {
    it('should allow both adjustmentAccountId and claimAccountId on same invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-009',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
            discount1Percent: 5,
            discount1Amount: 75,
            scheme2Quantity: 2,
          },
        ],
        subtotal: 1500,
        totalAmount: 1425,
        adjustmentAccountId: testAdjustmentAccount._id,
        claimAccountId: testClaimAccount._id,
      });

      expect(invoice.adjustmentAccountId.toString()).toBe(testAdjustmentAccount._id.toString());
      expect(invoice.claimAccountId.toString()).toBe(testClaimAccount._id.toString());
    });

    it('should populate both accounts correctly', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-010',
        invoiceType: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            lineTotal: 1500,
          },
        ],
        subtotal: 1500,
        totalAmount: 1500,
        adjustmentAccountId: testAdjustmentAccount._id,
        claimAccountId: testClaimAccount._id,
      });

      const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('adjustmentAccountId')
        .populate('claimAccountId');

      expect(populatedInvoice.adjustmentAccountId.name).toBe('Discount Adjustment');
      expect(populatedInvoice.claimAccountId.name).toBe('Promotional Claims');
    });
  });

  describe('Purchase invoices with adjustment accounts', () => {
    it('should allow adjustmentAccountId on purchase invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PINV-001',
        invoiceType: 'purchase',
        supplierId: testSupplier._id,
        supplierBillNo: 'BILL-001',
        invoiceDate: new Date(),
        items: [
          {
            itemId: testItem._id,
            quantity: 50,
            unitPrice: 100,
            lineTotal: 5000,
            gstRate: 18,
          },
        ],
        subtotal: 5000,
        totalAmount: 5000,
        adjustmentAccountId: testAdjustmentAccount._id,
      });

      expect(invoice.adjustmentAccountId).toBeDefined();
      expect(invoice.adjustmentAccountId.toString()).toBe(testAdjustmentAccount._id.toString());
    });
  });
});
