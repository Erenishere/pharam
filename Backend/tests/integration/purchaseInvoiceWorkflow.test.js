const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const Supplier = require('../../src/models/Supplier');
const StockMovement = require('../../src/models/StockMovement');
const User = require('../../src/models/User');

describe('Purchase Invoice Workflow with Inventory Integration', () => {
  let authToken;
  let testUser;
  let testSupplier;
  let testItem1;
  let testItem2;

  beforeAll(async () => {
    const bcrypt = require('bcryptjs');
    
    // Create test user for authentication with properly hashed password
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'admin', // Admin role to access all endpoints
      isActive: true
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });
    
    // For now, skip authentication if login fails
    if (loginResponse.body && loginResponse.body.data && loginResponse.body.data.token) {
      authToken = loginResponse.body.data.token;
    } else {
      // Generate a mock token for testing purposes
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

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUP001',
      name: 'Test Supplier',
      type: 'supplier',
      contactInfo: {
        phone: '1234567890',
        email: 'supplier@test.com',
        address: '456 Supplier St',
        city: 'Lahore',
        country: 'Pakistan'
      },
      financialInfo: {
        creditLimit: 0,
        paymentTerms: 30,
        currency: 'PKR'
      },
      isActive: true
    });

    // Create test items with initial stock
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
        gstRate: 17,
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
        gstRate: 17,
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
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Purchase Invoice Creation and Confirmation Workflow', () => {
    test('should create draft purchase invoice without affecting inventory', async () => {
      const invoiceData = {
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
            discount: 0
          }
        ],
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.invoiceNumber).toBeDefined();
      expect(response.body.data.invoiceNumber).toMatch(/^PI\d{10}$/);

      // Verify inventory not affected
      const item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(50);

      // Verify no stock movements created
      const movements = await StockMovement.find({ itemId: testItem1._id });
      expect(movements.length).toBe(0);
    });

    test('should confirm purchase invoice and increase inventory', async () => {
      // Create draft invoice first
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000001',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
            discount: 0,
            taxAmount: 340,
            lineTotal: 2340
          }
        ],
        totals: {
          subtotal: 2000,
          totalDiscount: 0,
          totalTax: 340,
          grandTotal: 2340
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm the invoice
      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');

      // Verify inventory increased
      const item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(70); // 50 + 20

      // Verify stock movement created
      const movements = await StockMovement.find({ 
        itemId: testItem1._id,
        referenceType: 'purchase_invoice',
        referenceId: invoice._id
      });
      expect(movements.length).toBe(1);
      expect(movements[0].movementType).toBe('in');
      expect(movements[0].quantity).toBe(20); // Positive for inward movement
    });

    test('should confirm purchase invoice with multiple items and update all inventory', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000002',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 25,
            unitPrice: 100,
            discount: 0,
            taxAmount: 425,
            lineTotal: 2925
          },
          {
            itemId: testItem2._id,
            quantity: 40,
            unitPrice: 50,
            discount: 0,
            taxAmount: 340,
            lineTotal: 2340
          }
        ],
        totals: {
          subtotal: 4500,
          totalDiscount: 0,
          totalTax: 765,
          grandTotal: 5265
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify both items updated
      const item1 = await Item.findById(testItem1._id);
      const item2 = await Item.findById(testItem2._id);
      expect(item1.inventory.currentStock).toBe(75); // 50 + 25
      expect(item2.inventory.currentStock).toBe(70); // 30 + 40

      // Verify stock movements for both items
      const movements = await StockMovement.find({ 
        referenceType: 'purchase_invoice',
        referenceId: invoice._id
      });
      expect(movements.length).toBe(2);
    });

    test('should prevent confirmation of already confirmed invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000003',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 170,
            lineTotal: 1170
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 170,
          grandTotal: 1170
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm first time
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to confirm again
      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Only draft invoices can be confirmed');

      // Verify inventory only increased once
      const item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(60); // 50 + 10, not 70
    });
  });

  describe('Batch Creation from Purchase Invoices', () => {
    test('should create batch information when provided in purchase invoice', async () => {
      const mfgDate = new Date('2024-01-01');
      const expDate = new Date('2025-12-31');

      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000004',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 30,
            unitPrice: 100,
            discount: 0,
            taxAmount: 510,
            lineTotal: 3510,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: mfgDate,
              expiryDate: expDate
            }
          }
        ],
        totals: {
          subtotal: 3000,
          totalDiscount: 0,
          totalTax: 510,
          grandTotal: 3510
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify stock movement includes batch info
      const movement = await StockMovement.findOne({ 
        itemId: testItem1._id,
        referenceId: invoice._id
      });

      expect(movement).toBeDefined();
      expect(movement.batchInfo.batchNumber).toBe('BATCH001');
      expect(new Date(movement.batchInfo.manufacturingDate)).toEqual(mfgDate);
      expect(new Date(movement.batchInfo.expiryDate)).toEqual(expDate);
    });

    test('should validate batch dates during invoice creation', async () => {
      const invoiceData = {
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
            discount: 0,
            batchInfo: {
              batchNumber: 'BATCH002',
              manufacturingDate: new Date('2025-01-01'),
              expiryDate: new Date('2024-01-01') // Expiry before manufacturing
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Expiry date must be after manufacturing date');
    });

    test('should handle purchase invoice without batch information', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000005',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 15,
            unitPrice: 100,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755
          }
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 255,
          grandTotal: 1755
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify stock movement created without batch info
      const movement = await StockMovement.findOne({ 
        itemId: testItem1._id,
        referenceId: invoice._id
      });

      expect(movement).toBeDefined();
      expect(movement.batchInfo).toBeDefined();
      expect(movement.batchInfo.batchNumber).toBeUndefined();
    });
  });

  describe('Purchase Invoice Status Transitions', () => {
    test('should transition from draft to confirmed to paid', async () => {
      // Create draft invoice
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000006',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 170,
            lineTotal: 1170
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 170,
          grandTotal: 1170
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice
      const confirmResponse = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(confirmResponse.body.data.status).toBe('confirmed');
      expect(confirmResponse.body.data.paymentStatus).toBe('pending');

      // Mark as paid
      const paidResponse = await request(app)
        .post(`/api/v1/invoices/purchase/${invoice._id}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          paymentMethod: 'bank_transfer',
          paymentReference: 'TXN123456'
        })
        .expect(200);

      expect(paidResponse.body.data.paymentStatus).toBe('paid');
    });

    test('should allow cancellation of draft invoice without inventory impact', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000007',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
            discount: 0,
            taxAmount: 340,
            lineTotal: 2340
          }
        ],
        totals: {
          subtotal: 2000,
          totalDiscount: 0,
          totalTax: 340,
          grandTotal: 2340
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Supplier cancelled order' })
        .expect(200);

      expect(response.body.data.status).toBe('cancelled');

      // Verify inventory unchanged
      const item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(50);

      // Verify no stock movements
      const movements = await StockMovement.find({ referenceId: invoice._id });
      expect(movements.length).toBe(0);
    });

    test('should cancel confirmed invoice and reverse inventory', async () => {
      // Create and confirm invoice
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000008',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
            discount: 0,
            taxAmount: 340,
            lineTotal: 2340
          }
        ],
        totals: {
          subtotal: 2000,
          totalDiscount: 0,
          totalTax: 340,
          grandTotal: 2340
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm first
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify stock increased
      let item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(70); // 50 + 20

      // Cancel invoice
      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Defective goods returned' })
        .expect(200);

      expect(response.body.data.status).toBe('cancelled');

      // Verify inventory restored
      item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(50); // Back to original

      // Verify reversal stock movement created
      const movements = await StockMovement.find({ 
        itemId: testItem1._id,
        referenceId: invoice._id
      });
      expect(movements.length).toBe(2); // Original in + reversal out
      expect(movements.some(m => m.movementType === 'out')).toBe(true);
    });

    test('should prevent cancellation of paid invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000009',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 170,
            lineTotal: 1170
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 170,
          grandTotal: 1170
        },
        status: 'confirmed',
        paymentStatus: 'paid',
        createdBy: testUser._id
      });

      const response = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CANNOT_CANCEL_PAID_INVOICE');
    });
  });

  describe('Stock Movement Tracking for Purchase Invoices', () => {
    test('should create detailed stock movement records on confirmation', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000010',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 25,
            unitPrice: 100,
            discount: 0,
            taxAmount: 425,
            lineTotal: 2925,
            batchInfo: {
              batchNumber: 'BATCH003',
              expiryDate: new Date('2025-12-31'),
              manufacturingDate: new Date('2024-01-01')
            }
          }
        ],
        totals: {
          subtotal: 2500,
          totalDiscount: 0,
          totalTax: 425,
          grandTotal: 2925
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const movement = await StockMovement.findOne({ 
        itemId: testItem1._id,
        referenceId: invoice._id
      });

      expect(movement).toBeDefined();
      expect(movement.movementType).toBe('in');
      expect(movement.quantity).toBe(25); // Positive for inward movement
      expect(movement.referenceType).toBe('purchase_invoice');
      expect(movement.batchInfo.batchNumber).toBe('BATCH003');
      expect(movement.createdBy.toString()).toBe(testUser._id.toString());
      expect(movement.notes).toContain('Purchase invoice');
      expect(movement.notes).toContain(invoice.invoiceNumber);
    });

    test('should retrieve stock movements for a purchase invoice', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000011',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 15,
            unitPrice: 100,
            discount: 0,
            taxAmount: 255,
            lineTotal: 1755
          },
          {
            itemId: testItem2._id,
            quantity: 10,
            unitPrice: 50,
            discount: 0,
            taxAmount: 85,
            lineTotal: 585
          }
        ],
        totals: {
          subtotal: 2000,
          totalDiscount: 0,
          totalTax: 340,
          grandTotal: 2340
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get stock movements
      const response = await request(app)
        .get(`/api/v1/invoices/purchase/${invoice._id}/stock-movements`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(m => m.movementType === 'in')).toBe(true);
    });

    test('should track reversal stock movements on cancellation', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000012',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 30,
            unitPrice: 100,
            discount: 0,
            taxAmount: 510,
            lineTotal: 3510
          }
        ],
        totals: {
          subtotal: 3000,
          totalDiscount: 0,
          totalTax: 510,
          grandTotal: 3510
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Cancel invoice
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Quality issues' })
        .expect(200);

      // Get all stock movements
      const movements = await StockMovement.find({ 
        itemId: testItem1._id,
        referenceId: invoice._id
      }).sort({ createdAt: 1 });

      expect(movements).toHaveLength(2);
      
      // First movement: inward (purchase)
      expect(movements[0].movementType).toBe('in');
      expect(movements[0].quantity).toBe(30);
      
      // Second movement: outward (reversal) - quantity is negative for outward
      expect(movements[1].movementType).toBe('out');
      expect(Math.abs(movements[1].quantity)).toBe(30);
      expect(movements[1].notes).toContain('Reversal');
      expect(movements[1].notes).toContain('cancelled');
    });
  });

  describe('Complete Purchase Workflow Integration', () => {
    test('should handle complete purchase workflow: create, confirm, pay', async () => {
      // Step 1: Create draft invoice
      const createResponse = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [
            {
              itemId: testItem1._id,
              quantity: 50,
              unitPrice: 100,
              discount: 5,
              batchInfo: {
                batchNumber: 'BATCH004',
                manufacturingDate: new Date('2024-01-01'),
                expiryDate: new Date('2025-12-31')
              }
            }
          ],
          notes: 'Bulk purchase order'
        })
        .expect(201);

      const invoiceId = createResponse.body.data._id;
      expect(createResponse.body.data.status).toBe('draft');

      // Verify inventory not changed yet
      let item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(50);

      // Step 2: Confirm invoice
      const confirmResponse = await request(app)
        .patch(`/api/v1/invoices/purchase/${invoiceId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(confirmResponse.body.data.status).toBe('confirmed');

      // Verify inventory increased
      item = await Item.findById(testItem1._id);
      expect(item.inventory.currentStock).toBe(100); // 50 + 50

      // Verify stock movement created with batch info
      const movements = await StockMovement.find({ referenceId: invoiceId });
      expect(movements).toHaveLength(1);
      expect(movements[0].batchInfo.batchNumber).toBe('BATCH004');

      // Step 3: Mark as paid
      const paymentResponse = await request(app)
        .post(`/api/v1/invoices/purchase/${invoiceId}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethod: 'cash',
          paymentReference: 'CASH-001',
          notes: 'Paid in full'
        })
        .expect(200);

      expect(paymentResponse.body.data.paymentStatus).toBe('paid');

      // Verify final state
      const finalInvoice = await Invoice.findById(invoiceId);
      expect(finalInvoice.status).toBe('confirmed');
      expect(finalInvoice.paymentStatus).toBe('paid');
    });

    test('should handle purchase with multiple batches', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000013',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 20,
            unitPrice: 100,
            discount: 0,
            taxAmount: 340,
            lineTotal: 2340,
            batchInfo: {
              batchNumber: 'BATCH005',
              manufacturingDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-06-30')
            }
          },
          {
            itemId: testItem2._id,
            quantity: 15,
            unitPrice: 50,
            discount: 0,
            taxAmount: 127.5,
            lineTotal: 877.5,
            batchInfo: {
              batchNumber: 'BATCH006',
              manufacturingDate: new Date('2024-02-01'),
              expiryDate: new Date('2025-08-31')
            }
          }
        ],
        totals: {
          subtotal: 2750,
          totalDiscount: 0,
          totalTax: 467.5,
          grandTotal: 3217.5
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify both items updated
      const item1 = await Item.findById(testItem1._id);
      const item2 = await Item.findById(testItem2._id);
      expect(item1.inventory.currentStock).toBe(70); // 50 + 20
      expect(item2.inventory.currentStock).toBe(45); // 30 + 15

      // Verify stock movements with different batches
      const movements = await StockMovement.find({ 
        referenceId: invoice._id 
      }).sort({ itemId: 1 });

      expect(movements).toHaveLength(2);
      expect(movements[0].batchInfo.batchNumber).toBe('BATCH005');
      expect(movements[1].batchInfo.batchNumber).toBe('BATCH006');
    });

    test('should prevent payment before confirmation', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000014',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 170,
            lineTotal: 1170
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 170,
          grandTotal: 1170
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      const response = await request(app)
        .post(`/api/v1/invoices/purchase/${invoice._id}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethod: 'bank_transfer'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Confirm the invoice first');
    });

    test('should handle partial payment workflow', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000015',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 170,
            lineTotal: 1170
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 170,
          grandTotal: 1170
        },
        status: 'draft',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      // Confirm invoice
      await request(app)
        .patch(`/api/v1/invoices/purchase/${invoice._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Make partial payment
      const partialResponse = await request(app)
        .post(`/api/v1/invoices/purchase/${invoice._id}/mark-partial-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          notes: 'First installment'
        })
        .expect(200);

      expect(partialResponse.body.data.paymentStatus).toBe('partial');

      // Complete payment
      const fullResponse = await request(app)
        .post(`/api/v1/invoices/purchase/${invoice._id}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethod: 'bank_transfer',
          notes: 'Final payment'
        })
        .expect(200);

      expect(fullResponse.body.data.paymentStatus).toBe('paid');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should prevent modification of confirmed invoice items', async () => {
      const invoice = await Invoice.create({
        invoiceNumber: 'PI2024000016',
        type: 'purchase',
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxAmount: 170,
            lineTotal: 1170
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 170,
          grandTotal: 1170
        },
        status: 'confirmed',
        paymentStatus: 'pending',
        createdBy: testUser._id
      });

      const response = await request(app)
        .put(`/api/v1/invoices/purchase/${invoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              itemId: testItem1._id,
              quantity: 20, // Try to change quantity
              unitPrice: 100
            }
          ]
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CANNOT_MODIFY_CONFIRMED_INVOICE');
    });

    test('should validate supplier is active before creating invoice', async () => {
      // Deactivate supplier
      await Supplier.findByIdAndUpdate(testSupplier._id, { isActive: false });

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100
            }
          ]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not active');

      // Reactivate for other tests
      await Supplier.findByIdAndUpdate(testSupplier._id, { isActive: true });
    });

    test('should validate item is active before creating invoice', async () => {
      // Deactivate item
      await Item.findByIdAndUpdate(testItem1._id, { isActive: false });

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: 100
            }
          ]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not active');

      // Reactivate for other tests
      await Item.findByIdAndUpdate(testItem1._id, { isActive: true });
    });

    test('should handle discount calculations correctly', async () => {
      const invoiceData = {
        supplierId: testSupplier._id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: testItem1._id,
            quantity: 10,
            unitPrice: 100,
            discount: 10 // 10% discount
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      const invoice = response.body.data;
      const expectedSubtotal = 10 * 100; // 1000
      const expectedDiscount = expectedSubtotal * 0.1; // 100
      const expectedTaxableAmount = expectedSubtotal - expectedDiscount; // 900
      const expectedTax = expectedTaxableAmount * 0.17; // 153

      expect(invoice.totals.subtotal).toBe(expectedSubtotal);
      expect(invoice.totals.totalDiscount).toBe(expectedDiscount);
      expect(invoice.totals.totalTax).toBeCloseTo(expectedTax, 2);
    });

    test('should validate quantity is positive', async () => {
      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: testItem1._id,
              quantity: -10, // Negative quantity
              unitPrice: 100
            }
          ]
        });

      expect(response.status).toBe(400);
      // Validation middleware returns errors array, not success field
      expect(response.body.errors || response.body.error).toBeDefined();
    });

    test('should validate unit price is non-negative', async () => {
      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: testItem1._id,
              quantity: 10,
              unitPrice: -100 // Negative price
            }
          ]
        });

      expect(response.status).toBe(400);
      // Validation middleware returns errors array, not success field
      expect(response.body.errors || response.body.error).toBeDefined();
    });

    test('should handle invoice with zero tax items', async () => {
      // Create item with zero tax
      const zeroTaxItem = await Item.create({
        code: 'ITEM003',
        name: 'Zero Tax Item',
        category: 'Exempt',
        unit: 'piece',
        pricing: {
          costPrice: 50,
          salePrice: 75,
          currency: 'PKR'
        },
        tax: {
          gstRate: 0,
          whtRate: 0,
          taxCategory: 'exempt'
        },
        inventory: {
          currentStock: 100,
          minimumStock: 10,
          maximumStock: 500
        },
        isActive: true
      });

      const response = await request(app)
        .post('/api/v1/invoices/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: testSupplier._id,
          invoiceDate: new Date(),
          items: [
            {
              itemId: zeroTaxItem._id,
              quantity: 10,
              unitPrice: 50,
              discount: 0
            }
          ]
        })
        .expect(201);

      expect(response.body.data.totals.totalTax).toBe(0);
      expect(response.body.data.totals.grandTotal).toBe(500); // 10 * 50
    });
  });
});
