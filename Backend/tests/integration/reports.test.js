const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const Invoice = require('../../src/models/Invoice');
const authService = require('../../src/services/authService');

describe('Reports API Integration Tests', () => {
  let authToken;
  let testUser;
  let testCustomer;
  let testSupplier;
  let testItem;
  let salesInvoice;
  let purchaseInvoice;

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await Invoice.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'reportuser',
      email: 'report@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    authToken = authService.generateAccessToken({
      userId: testUser._id,
      role: testUser.role,
    });

    // Create test customer
    testCustomer = await Customer.create({
      code: 'CUST001',
      name: 'Test Customer',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@test.com',
      address: '123 Test St',
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30,
      },
    });

    // Create test supplier
    testSupplier = await Supplier.create({
      code: 'SUPP001',
      name: 'Test Supplier',
      contactPerson: 'Jane Smith',
      phone: '0987654321',
      email: 'supplier@test.com',
      address: '456 Supplier Ave',
      financialInfo: {
        paymentTerms: 30,
      },
    });

    // Create test item
    testItem = await Item.create({
      code: 'ITEM001',
      name: 'Test Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
      },
      stock: {
        currentStock: 100,
        minStock: 10,
        maxStock: 500,
      },
      isActive: true,
    });

    // Create test sales invoice
    salesInvoice = await Invoice.create({
      invoiceNumber: 'SI-001',
      type: 'sales',
      customerId: testCustomer._id,
      invoiceDate: new Date('2024-01-15'),
      items: [
        {
          itemId: testItem._id,
          quantity: 10,
          unitPrice: 150,
          discount: 0,
          taxRate: 18,
          taxAmount: 270,
          lineTotal: 1770,
        },
      ],
      totals: {
        subtotal: 1500,
        totalDiscount: 0,
        totalTax: 270,
        grandTotal: 1770,
      },
      status: 'confirmed',
    });

    // Create test purchase invoice
    purchaseInvoice = await Invoice.create({
      invoiceNumber: 'PI-001',
      type: 'purchase',
      supplierId: testSupplier._id,
      invoiceDate: new Date('2024-01-10'),
      items: [
        {
          itemId: testItem._id,
          quantity: 20,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
          taxAmount: 360,
          lineTotal: 2360,
        },
      ],
      totals: {
        subtotal: 2000,
        totalDiscount: 0,
        totalTax: 360,
        grandTotal: 2360,
      },
      status: 'confirmed',
    });
  });

  describe('GET /api/v1/reports/sales', () => {
    it('should generate sales report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'sales');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary.totalInvoices).toBe(1);
      expect(response.body.data.summary.totalAmount).toBe(1770);
    });

    it('should filter sales report by customer', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          customerId: testCustomer._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.invoices).toHaveLength(1);
    });

    it('should group sales report by customer', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          groupBy: 'customer',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0]).toHaveProperty('customer');
    });

    it('should export sales report as CSV', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'csv',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should return 400 if dates are missing', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/reports/purchase', () => {
    it('should generate purchase report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'purchase');
      expect(response.body.data.summary.totalInvoices).toBe(1);
      expect(response.body.data.summary.totalAmount).toBe(2360);
    });

    it('should filter purchase report by supplier', async () => {
      const response = await request(app)
        .get('/api/v1/reports/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          supplierId: testSupplier._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.invoices).toHaveLength(1);
    });
  });

  describe('GET /api/v1/reports/inventory', () => {
    it('should generate inventory report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'inventory');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should filter inventory by category', async () => {
      const response = await request(app)
        .get('/api/v1/reports/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'Electronics' });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should filter low stock items', async () => {
      // Update item to have low stock
      await Item.findByIdAndUpdate(testItem._id, {
        'stock.currentStock': 5,
      });

      const response = await request(app)
        .get('/api/v1/reports/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ lowStockOnly: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /api/v1/reports/financial/profit-loss', () => {
    it('should generate profit & loss statement', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'profit_loss');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('costOfGoodsSold');
      expect(response.body.data).toHaveProperty('grossProfit');
      expect(response.body.data).toHaveProperty('netProfit');
    });

    it('should export profit & loss as PDF', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'pdf',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('GET /api/v1/reports/financial/balance-sheet', () => {
    it('should generate balance sheet', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/balance-sheet')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ asOfDate: '2024-01-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'balance_sheet');
      expect(response.body.data).toHaveProperty('assets');
      expect(response.body.data).toHaveProperty('liabilities');
      expect(response.body.data).toHaveProperty('equity');
    });

    it('should return 400 if asOfDate is missing', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/balance-sheet')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/reports/financial/cash-flow', () => {
    it('should generate cash flow statement', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'cash_flow');
    });
  });

  describe('GET /api/v1/reports/financial/tax-compliance', () => {
    it('should generate tax compliance report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/tax-compliance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'tax_compliance');
      expect(response.body.data).toHaveProperty('salesTax');
      expect(response.body.data).toHaveProperty('purchaseTax');
      expect(response.body.data).toHaveProperty('netTaxLiability');
    });
  });

  describe('GET /api/v1/reports/financial/summary', () => {
    it('should generate financial summary', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'financial_summary');
      expect(response.body.data).toHaveProperty('profitability');
      expect(response.body.data).toHaveProperty('liquidity');
      expect(response.body.data).toHaveProperty('cashFlow');
      expect(response.body.data).toHaveProperty('taxation');
    });
  });

  describe('GET /api/v1/reports/analytics/dashboard', () => {
    it('should get dashboard summary', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sales');
      expect(response.body.data).toHaveProperty('purchases');
      expect(response.body.data).toHaveProperty('cash');
      expect(response.body.data).toHaveProperty('accounts');
      expect(response.body.data).toHaveProperty('inventory');
    });
  });

  describe('GET /api/v1/reports/analytics/sales-trends', () => {
    it('should get sales trends', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/sales-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          interval: 'daily',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('summary');
    });
  });

  describe('GET /api/v1/reports/analytics/top-customers', () => {
    it('should get top customers', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/top-customers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/reports/analytics/top-items', () => {
    it('should get top selling items', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/top-items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/reports/analytics/revenue-by-category', () => {
    it('should get revenue by category', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/revenue-by-category')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/reports/analytics/profit-margins', () => {
    it('should get profit margins', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/profit-margins')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('grossProfit');
      expect(response.body.data).toHaveProperty('profitMargin');
    });
  });

  describe('GET /api/v1/reports/analytics/collection-efficiency', () => {
    it('should get payment collection efficiency', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/collection-efficiency')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('collectionEfficiency');
      expect(response.body.data).toHaveProperty('totalReceivables');
    });
  });

  describe('GET /api/v1/reports/analytics/inventory-turnover', () => {
    it('should get inventory turnover', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/inventory-turnover')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('turnoverRatio');
      expect(response.body.data).toHaveProperty('daysInInventory');
    });
  });

  describe('GET /api/v1/reports/analytics/kpis', () => {
    it('should get real-time KPIs', async () => {
      const response = await request(app)
        .get('/api/v1/reports/analytics/kpis')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sales');
      expect(response.body.data).toHaveProperty('profitability');
      expect(response.body.data).toHaveProperty('efficiency');
    });
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(401);
    });
  });
});
