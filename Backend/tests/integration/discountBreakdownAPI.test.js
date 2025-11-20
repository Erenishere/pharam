const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Account = require('../../src/models/Account');
const Item = require('../../src/models/Item');
const authService = require('../../src/services/authService');

describe('Discount Breakdown API Integration Tests', () => {
  let authToken;
  let testUser;
  let testCustomer;
  let testSupplier;
  let testItem;
  let claimAccount1;
  let claimAccount2;

  beforeAll(async () => {

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    // Generate auth token directly
    authToken = authService.generateAccessToken({
      userId: testUser._id,
      role: testUser.role,
    });

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST001',
      name: 'Test Customer',
      type: 'customer',
      isActive: true,
      contactInfo: {
        phone: '1234567890',
        email: 'customer@test.com'
      },
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30
      }
    });

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUPP001',
      name: 'Test Supplier',
      type: 'supplier',
      isActive: true,
      contactInfo: {
        phone: '0987654321',
        email: 'supplier@test.com'
      },
      financialInfo: {
        paymentTerms: 30
      }
    });

    // Create test item
    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      category: 'Test Category',
      unit: 'piece',
      isActive: true,
      inventory: {
        currentStock: 1000,
        minStock: 10
      },
      pricing: {
        costPrice: 100,
        salePrice: 150
      },
      tax: {
        gstRate: 18
      }
    });

    // Create claim accounts
    claimAccount1 = await Account.create({
      name: 'Marketing Claims',
      code: 'CLAIM001',
      accountType: 'adjustment',
      isActive: true
    });

    claimAccount2 = await Account.create({
      name: 'Purchase Claims',
      code: 'CLAIM002',
      accountType: 'expense',
      isActive: true
    });
  });

  afterAll(async () => {
    // Cleanup is handled by global setup
  });

  beforeEach(async () => {
    // Clear invoices before each test
    await Invoice.deleteMany({});
  });

  describe('GET /api/reports/discount-breakdown', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 without required date parameters', async () => {
      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Start date and end date are required');
    });

    it('should return discount breakdown report with all invoices', async () => {
      // Create test invoices
      await Invoice.create({
        invoiceNumber: 'SI2024000001',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        items: [{
          itemId: testItem._id,
          quantity: 10,
          unitPrice: 150,
          discount1Amount: 100,
          discount2Amount: 50,
          taxAmount: 153.9,
          lineTotal: 1008.9
        }],
        claimAccountId: claimAccount1._id,
        totals: {
          subtotal: 1500,
          totalDiscount: 150,
          totalTax: 153.9,
          grandTotal: 1503.9
        },
        createdBy: testUser._id
      });

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'discount_breakdown');
      expect(response.body.data).toHaveProperty('breakdown');
      expect(response.body.data.breakdown.total).toMatchObject({
        invoiceCount: 1,
        totalDiscount1: 100,
        totalDiscount2: 50,
        grandTotalDiscount: 150
      });
    });

    it('should filter by invoice type (sales)', async () => {
      // Create sales and purchase invoices
      await Invoice.create([
        {
          invoiceNumber: 'SI2024000001',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          status: 'confirmed',
          items: [{
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount1Amount: 100,
            discount2Amount: 0,
            taxAmount: 162,
            lineTotal: 1062
          }],
          totals: {
            subtotal: 1500,
            totalDiscount: 100,
            totalTax: 162,
            grandTotal: 1562
          },
          createdBy: testUser._id
        },
        {
          invoiceNumber: 'PI2024000001',
          type: 'purchase',
          supplierId: testSupplier._id,
          supplierBillNo: 'BILL001',
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          status: 'confirmed',
          items: [{
            itemId: testItem._id,
            quantity: 20,
            unitPrice: 100,
            discount1Amount: 200,
            discount2Amount: 0,
            taxAmount: 324,
            lineTotal: 2124
          }],
          totals: {
            subtotal: 2000,
            totalDiscount: 200,
            totalTax: 324,
            grandTotal: 2124
          },
          createdBy: testUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          invoiceType: 'sales'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.total.invoiceCount).toBe(1);
      expect(response.body.data.breakdown.total.totalDiscount1).toBe(100);
      expect(response.body.data.breakdown.discount1.byInvoiceType.sales.invoiceCount).toBe(1);
      expect(response.body.data.breakdown.discount1.byInvoiceType.purchase.invoiceCount).toBe(0);
    });

    it('should filter by discount type (discount2)', async () => {
      // Create invoices with different discount types
      await Invoice.create([
        {
          invoiceNumber: 'SI2024000001',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          status: 'confirmed',
          claimAccountId: claimAccount1._id,
          items: [{
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount1Amount: 100,
            discount2Amount: 50,
            taxAmount: 153.9,
            lineTotal: 1008.9
          }],
          totals: {
            subtotal: 1500,
            totalDiscount: 150,
            totalTax: 153.9,
            grandTotal: 1503.9
          },
          createdBy: testUser._id
        },
        {
          invoiceNumber: 'SI2024000002',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          status: 'confirmed',
          items: [{
            itemId: testItem._id,
            quantity: 5,
            unitPrice: 150,
            discount1Amount: 75,
            discount2Amount: 0,
            taxAmount: 121.5,
            lineTotal: 796.5
          }],
          totals: {
            subtotal: 750,
            totalDiscount: 75,
            totalTax: 121.5,
            grandTotal: 796.5
          },
          createdBy: testUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          discountType: 'discount2'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.discount2.invoiceCount).toBe(1); // Only invoice with discount2
      expect(response.body.data.breakdown.discount2.totalAmount).toBe(50);
    });

    it('should filter by claim account', async () => {
      // Create invoices with different claim accounts
      await Invoice.create([
        {
          invoiceNumber: 'SI2024000001',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          status: 'confirmed',
          claimAccountId: claimAccount1._id,
          items: [{
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount1Amount: 100,
            discount2Amount: 50,
            taxAmount: 153.9,
            lineTotal: 1008.9
          }],
          totals: {
            subtotal: 1500,
            totalDiscount: 150,
            totalTax: 153.9,
            grandTotal: 1503.9
          },
          createdBy: testUser._id
        },
        {
          invoiceNumber: 'SI2024000002',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          status: 'confirmed',
          claimAccountId: claimAccount2._id,
          items: [{
            itemId: testItem._id,
            quantity: 5,
            unitPrice: 150,
            discount1Amount: 50,
            discount2Amount: 25,
            taxAmount: 108.75,
            lineTotal: 733.75
          }],
          totals: {
            subtotal: 750,
            totalDiscount: 75,
            totalTax: 108.75,
            grandTotal: 733.75
          },
          createdBy: testUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          claimAccountId: claimAccount1._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.total.invoiceCount).toBe(1);
      expect(response.body.data.breakdown.discount2.byClaimAccount).toHaveLength(1);
      expect(response.body.data.breakdown.discount2.byClaimAccount[0].accountNumber).toBe('CLAIM001');
    });

    it('should include claim account breakdown', async () => {
      // Create invoice with claim account
      await Invoice.create({
        invoiceNumber: 'SI2024000001',
        type: 'sales',
        customerId: testCustomer._id,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        claimAccountId: claimAccount1._id,
        items: [{
          itemId: testItem._id,
          quantity: 10,
          unitPrice: 150,
          discount1Amount: 100,
          discount2Amount: 50,
          taxAmount: 153.9,
          lineTotal: 1008.9
        }],
        totals: {
          subtotal: 1500,
          totalDiscount: 150,
          totalTax: 153.9,
          grandTotal: 1503.9
        },
        createdBy: testUser._id
      });

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.discount2.byClaimAccount).toHaveLength(1);
      expect(response.body.data.breakdown.discount2.byClaimAccount[0]).toMatchObject({
        claimAccountName: 'Marketing Claims',
        accountNumber: 'CLAIM001',
        totalAmount: 50,
        invoiceCount: 1
      });
    });

    it('should exclude cancelled invoices', async () => {
      // Create confirmed and cancelled invoices
      await Invoice.create([
        {
          invoiceNumber: 'SI2024000001',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          status: 'confirmed',
          items: [{
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount1Amount: 100,
            discount2Amount: 0,
            taxAmount: 162,
            lineTotal: 1062
          }],
          totals: {
            subtotal: 1500,
            totalDiscount: 100,
            totalTax: 162,
            grandTotal: 1562
          },
          createdBy: testUser._id
        },
        {
          invoiceNumber: 'SI2024000002',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          status: 'cancelled',
          items: [{
            itemId: testItem._id,
            quantity: 5,
            unitPrice: 150,
            discount1Amount: 75,
            discount2Amount: 0,
            taxAmount: 121.5,
            lineTotal: 796.5
          }],
          totals: {
            subtotal: 750,
            totalDiscount: 75,
            totalTax: 121.5,
            grandTotal: 796.5
          },
          createdBy: testUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.total.invoiceCount).toBe(1); // Only confirmed invoice
      expect(response.body.data.breakdown.total.grandTotalDiscount).toBe(100);
    });

    it('should return empty report when no invoices match criteria', async () => {
      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.total).toMatchObject({
        invoiceCount: 0,
        totalDiscount1: 0,
        totalDiscount2: 0,
        grandTotalDiscount: 0
      });
      expect(response.body.data.breakdown.discount1.invoices).toHaveLength(0);
      expect(response.body.data.breakdown.discount2.invoices).toHaveLength(0);
      expect(response.body.data.breakdown.discount2.byClaimAccount).toHaveLength(0);
    });

    it('should handle multiple invoices with mixed discount types', async () => {
      // Create multiple invoices with different discount combinations
      await Invoice.create([
        {
          invoiceNumber: 'SI2024000001',
          type: 'sales',
          customerId: testCustomer._id,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          status: 'confirmed',
          claimAccountId: claimAccount1._id,
          items: [{
            itemId: testItem._id,
            quantity: 10,
            unitPrice: 150,
            discount1Amount: 100,
            discount2Amount: 50,
            taxAmount: 153.9,
            lineTotal: 1008.9
          }],
          totals: {
            subtotal: 1500,
            totalDiscount: 150,
            totalTax: 153.9,
            grandTotal: 1503.9
          },
          createdBy: testUser._id
        },
        {
          invoiceNumber: 'PI2024000001',
          type: 'purchase',
          supplierId: testSupplier._id,
          supplierBillNo: 'BILL001',
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          status: 'confirmed',
          claimAccountId: claimAccount2._id,
          items: [{
            itemId: testItem._id,
            quantity: 20,
            unitPrice: 100,
            discount1Amount: 150,
            discount2Amount: 75,
            taxAmount: 324,
            lineTotal: 2124
          }],
          totals: {
            subtotal: 2000,
            totalDiscount: 225,
            totalTax: 324,
            grandTotal: 2124
          },
          createdBy: testUser._id
        }
      ]);

      const response = await request(app)
        .get('/api/v1/reports/discount-breakdown')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.breakdown.total).toMatchObject({
        invoiceCount: 2,
        totalDiscount1: 250,
        totalDiscount2: 125,
        grandTotalDiscount: 375
      });
      expect(response.body.data.breakdown.discount1.invoiceCount).toBe(2);
      expect(response.body.data.breakdown.discount2.invoiceCount).toBe(2);
      expect(response.body.data.breakdown.discount2.byClaimAccount).toHaveLength(2);
    });
  });
});
