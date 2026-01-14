const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const PurchaseOrder = require('../../src/models/PurchaseOrder');
const Invoice = require('../../src/models/Invoice');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Account = require('../../src/models/Account');

/**
 * Integration Tests for PO to Invoice Conversion API
 * Tests for Requirement 10.2, 10.3 - Task 42.2
 */
describe('PO to Invoice Conversion API Endpoint', () => {
  let authToken;
  let adminToken;
  let testUser;
  let adminUser;
  let testSupplier;
  let testItem1;
  let testItem2;
  let testInventoryAccount;
  let testPayableAccount;
  let testGSTAccount;

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      username: 'purchaseuser',
      email: 'purchase@example.com',
      password: 'password123',
      role: 'purchase',
    });

    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    // Login to get auth tokens
    const purchaseLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'purchaseuser',
        password: 'password123',
      });

    authToken = purchaseLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'adminuser',
        password: 'password123',
      });

    adminToken = adminLogin.body.token;
  });

  beforeEach(async () => {
    // Clear collections
    await PurchaseOrder.deleteMany({});
    await Invoice.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
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
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/purchase-orders/:id/convert-to-invoice', () => {
    it('should convert approved PO to invoice successfully', async () => {
      // Create a PO
      const poResponse = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-001',
          supplierId: testSupplier._id,
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
          notes: 'Test PO',
        });

      const poId = poResponse.body.data._id;

      // Approve the PO
      await request(app)
        .post(`/api/v1/purchase-orders/${poId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Convert to invoice
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${poId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierBillNo: 'BILL-001',
          invoiceDate: '2024-01-20',
          gstRate: 18,
          notes: 'Converted invoice',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceType).toBe('purchase');
      expect(response.body.data.poNumber).toBe('PO-2024-001');
      expect(response.body.data.poId).toBe(poId);
      expect(response.body.data.supplierBillNo).toBe('BILL-001');
      expect(response.body.data.items).toHaveLength(2);
    });

    it('should return 400 if PO is not approved', async () => {
      // Create a draft PO
      const poResponse = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-002',
          supplierId: testSupplier._id,
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100,
            },
          ],
        });

      const poId = poResponse.body.data._id;

      // Try to convert without approval
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${poId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierBillNo: 'BILL-002',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be approved');
    });

    it('should auto-populate invoice with PO details', async () => {
      // Create and approve a PO
      const poResponse = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-003',
          supplierId: testSupplier._id,
          items: [
            {
              itemId: testItem1._id,
              quantity: 15,
              unitPrice: 110,
            },
          ],
        });

      const poId = poResponse.body.data._id;

      await request(app)
        .post(`/api/v1/purchase-orders/${poId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Convert without additional data
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${poId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expect(response.body.data.poNumber).toBe('PO-2024-003');
      expect(response.body.data.poId).toBe(poId);
      expect(response.body.data.supplierBillNo).toContain('PO-');
      expect(response.body.data.notes).toContain('Converted from PO');
    });

    it('should link invoice to PO via poId field', async () => {
      // Create and approve a PO
      const poResponse = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-004',
          supplierId: testSupplier._id,
          items: [
            {
              itemId: testItem1._id,
              quantity: 20,
              unitPrice: 100,
            },
          ],
        });

      const poId = poResponse.body.data._id;

      await request(app)
        .post(`/api/v1/purchase-orders/${poId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Convert to invoice
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${poId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierBillNo: 'BILL-004',
        })
        .expect(201);

      // Verify link
      expect(response.body.data.poId).toBe(poId);

      // Query invoice by PO
      const invoice = await Invoice.findOne({ poId: poId });
      expect(invoice).toBeDefined();
      expect(invoice._id.toString()).toBe(response.body.data._id);
    });

    it('should support additional invoice fields', async () => {
      // Create and approve a PO
      const poResponse = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-005',
          supplierId: testSupplier._id,
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100,
            },
          ],
        });

      const poId = poResponse.body.data._id;

      await request(app)
        .post(`/api/v1/purchase-orders/${poId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Convert with additional fields
      const response = await request(app)
        .post(`/api/v1/purchase-orders/${poId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierBillNo: 'BILL-005',
          dimension: 'Project-A',
          biltyNo: 'BLT-001',
          biltyDate: '2024-01-18',
          transportCompany: 'Fast Transport',
          transportCharges: 500,
          notes: 'Custom invoice notes',
        })
        .expect(201);

      expect(response.body.data.dimension).toBe('Project-A');
      expect(response.body.data.biltyNo).toBe('BLT-001');
      expect(response.body.data.transportCompany).toBe('Fast Transport');
      expect(response.body.data.transportCharges).toBe(500);
    });

    it('should return 400 if PO not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/v1/purchase-orders/${fakeId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierBillNo: 'BILL-999',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/purchase-orders/123/convert-to-invoice')
        .send({
          supplierBillNo: 'BILL-001',
        })
        .expect(401);
    });

    it('should require purchase or admin role', async () => {
      // Create a user with different role
      const salesUser = await User.create({
        username: 'salesuser',
        email: 'sales@example.com',
        password: 'password123',
        role: 'sales',
      });

      const salesLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'salesuser',
          password: 'password123',
        });

      const salesToken = salesLogin.body.token;

      // Create and approve a PO
      const poResponse = await request(app)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-2024-006',
          supplierId: testSupplier._id,
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100,
            },
          ],
        });

      const poId = poResponse.body.data._id;

      await request(app)
        .post(`/api/v1/purchase-orders/${poId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to convert with sales role
      await request(app)
        .post(`/api/v1/purchase-orders/${poId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          supplierBillNo: 'BILL-006',
        })
        .expect(403);

      await User.deleteOne({ _id: salesUser._id });
    });
  });
});
