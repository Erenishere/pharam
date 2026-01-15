const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Tax Summary Report API (Requirement 6.5)', () => {
  let mongoServer;
  let authToken;
  let customer, supplier, item, user;

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
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    // Create test user and get auth token
    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginRes.body.token;

    // Create test data
    customer = await Customer.create({
      name: 'Test Customer',
      type: 'customer',
      financialInfo: {
        advanceTaxRate: 0.5,
        isNonFiler: false
      }
    });

    supplier = await Supplier.create({
      name: 'Test Supplier',
      type: 'supplier',
      financialInfo: {
        advanceTaxRate: 0,
        isNonFiler: false
      }
    });

    item = await Item.create({
      name: 'Test Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150 }
    });
  });

  describe('GET /api/reports/tax-summary', () => {
    it('should return comprehensive tax report with all tax types', async () => {
      // Create test invoices
      await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 5,
          taxAmount: 185,
          lineTotal: 1185
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 185,
          grandTotal: 1185,
          gst18Total: 180,
          advanceTaxTotal: 5,
          nonFilerGSTTotal: 0
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const res = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          invoiceType: 'all'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportType).toBe('comprehensive_tax_report');
      expect(res.body.data.taxBreakdown).toBeDefined();
      expect(res.body.data.taxBreakdown.gst).toBeDefined();
      expect(res.body.data.taxBreakdown.advanceTax).toBeDefined();
      expect(res.body.data.taxBreakdown.nonFilerGST).toBeDefined();
      expect(res.body.data.taxBreakdown.summary).toBeDefined();
    });

    it('should require start and end dates', async () => {
      const res = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Start date and end date are required');
    });

    it('should filter by invoice type', async () => {
      // Create sales invoice
      await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          taxAmount: 180,
          lineTotal: 1180
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180,
          gst18Total: 180
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Create purchase invoice
      await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-001',
        invoiceDate: new Date('2024-06-20'),
        dueDate: new Date('2024-07-20'),
        items: [{
          itemId: item._id,
          quantity: 5,
          unitPrice: 100,
          discount: 0,
          gstRate: 4,
          gstAmount: 20,
          taxAmount: 20,
          lineTotal: 520
        }],
        totals: {
          subtotal: 500,
          totalDiscount: 0,
          totalTax: 20,
          grandTotal: 520,
          gst4Total: 20
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Get sales report only
      const salesRes = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          invoiceType: 'sales'
        });

      expect(salesRes.status).toBe(200);
      expect(salesRes.body.data.taxBreakdown.summary.totalInvoices).toBe(1);
      expect(salesRes.body.data.taxBreakdown.gst.gst18.taxAmount).toBe(180);

      // Get purchase report only
      const purchaseRes = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          invoiceType: 'purchase'
        });

      expect(purchaseRes.status).toBe(200);
      expect(purchaseRes.body.data.taxBreakdown.summary.totalInvoices).toBe(1);
      expect(purchaseRes.body.data.taxBreakdown.gst.gst4.taxAmount).toBe(20);
    });

    it('should separate GST by rate', async () => {
      await Invoice.create({
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUPP-002',
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            gstAmount: 180,
            taxAmount: 180,
            lineTotal: 1180
          },
          {
            itemId: item._id,
            quantity: 5,
            unitPrice: 100,
            discount: 0,
            gstRate: 4,
            gstAmount: 20,
            taxAmount: 20,
            lineTotal: 520
          }
        ],
        totals: {
          subtotal: 1500,
          totalDiscount: 0,
          totalTax: 200,
          grandTotal: 1700,
          gst18Total: 180,
          gst4Total: 20
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const res = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          invoiceType: 'purchase'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.taxBreakdown.gst.gst18.taxAmount).toBe(180);
      expect(res.body.data.taxBreakdown.gst.gst4.taxAmount).toBe(20);
      expect(res.body.data.taxBreakdown.gst.total.taxAmount).toBe(200);
    });

    it('should separate advance tax by rate', async () => {
      // Create customer with 2.5% advance tax
      const customer2 = await Customer.create({
        name: 'Customer 2',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: false
        }
      });

      // Invoice with 0.5% advance tax
      await Invoice.create({
        type: 'sales',
        customerId: customer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 0.5,
          advanceTaxAmount: 5,
          taxAmount: 185,
          lineTotal: 1185
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 185,
          grandTotal: 1185,
          gst18Total: 180,
          advanceTaxTotal: 5
        },
        status: 'confirmed',
        createdBy: user._id
      });

      // Invoice with 2.5% advance tax
      await Invoice.create({
        type: 'sales',
        customerId: customer2._id,
        invoiceDate: new Date('2024-06-20'),
        dueDate: new Date('2024-07-20'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 2.5,
          advanceTaxAmount: 25,
          taxAmount: 205,
          lineTotal: 1205
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 205,
          grandTotal: 1205,
          gst18Total: 180,
          advanceTaxTotal: 25
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const res = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          invoiceType: 'sales'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.taxBreakdown.advanceTax.rate0_5.taxAmount).toBe(5);
      expect(res.body.data.taxBreakdown.advanceTax.rate2_5.taxAmount).toBe(25);
      expect(res.body.data.taxBreakdown.advanceTax.total.taxAmount).toBe(30);
    });

    it('should track non-filer GST separately', async () => {
      // Create non-filer customer
      const nonFilerCustomer = await Customer.create({
        name: 'Non-Filer Customer',
        type: 'customer',
        financialInfo: {
          advanceTaxRate: 2.5,
          isNonFiler: true
        }
      });

      await Invoice.create({
        type: 'sales',
        customerId: nonFilerCustomer._id,
        invoiceDate: new Date('2024-06-15'),
        dueDate: new Date('2024-07-15'),
        items: [{
          itemId: item._id,
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          gstRate: 18,
          gstAmount: 180,
          advanceTaxPercent: 2.5,
          advanceTaxAmount: 25,
          taxAmount: 206,
          lineTotal: 1206
        }],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 206,
          grandTotal: 1206,
          gst18Total: 180,
          advanceTaxTotal: 25,
          nonFilerGSTTotal: 1
        },
        status: 'confirmed',
        createdBy: user._id
      });

      const res = await request(app)
        .get('/api/reports/tax-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          invoiceType: 'sales'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.taxBreakdown.nonFilerGST.taxAmount).toBe(1);
      expect(res.body.data.taxBreakdown.summary.totalNonFilerGSTAmount).toBe(1);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/reports/tax-summary')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(res.status).toBe(401);
    });
  });
});
