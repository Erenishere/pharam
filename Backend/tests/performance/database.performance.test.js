/**
 * Database Performance Tests
 * 
 * Tests to verify database query performance and index effectiveness
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invoice = require('../../src/models/Invoice');
const Item = require('../../src/models/Item');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const StockMovement = require('../../src/models/StockMovement');
const LedgerEntry = require('../../src/models/LedgerEntry');
const User = require('../../src/models/User');
const { createOptimizedIndexes, analyzeQueryPerformance } = require('../../src/config/indexOptimization');

let mongoServer;

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  simple_query: 100,
  complex_query: 500,
  aggregation: 1000,
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create optimized indexes
  await createOptimizedIndexes();
  
  // Seed test data
  await seedTestData();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Seed test data for performance testing
 */
async function seedTestData() {
  // Create users
  const users = [];
  for (let i = 0; i < 10; i++) {
    users.push({
      username: `user${i}`,
      email: `user${i}@test.com`,
      password: 'password123',
      role: ['admin', 'sales', 'purchase'][i % 3],
      isActive: true,
    });
  }
  const createdUsers = await User.insertMany(users);

  // Create customers
  const customers = [];
  for (let i = 0; i < 100; i++) {
    customers.push({
      code: `CUST${String(i).padStart(6, '0')}`,
      name: `Customer ${i}`,
      type: 'customer',
      financialInfo: {
        creditLimit: Math.floor(Math.random() * 100000) + 10000,
        paymentTerms: 30,
      },
      isActive: true,
    });
  }
  const createdCustomers = await Customer.insertMany(customers);

  // Create suppliers
  const suppliers = [];
  for (let i = 0; i < 50; i++) {
    suppliers.push({
      code: `SUPP${String(i).padStart(6, '0')}`,
      name: `Supplier ${i}`,
      type: 'supplier',
      financialInfo: {
        paymentTerms: 30,
      },
      isActive: true,
    });
  }
  const createdSuppliers = await Supplier.insertMany(suppliers);

  // Create items
  const items = [];
  const categories = ['Electronics', 'Clothing', 'Food', 'Furniture', 'Books'];
  for (let i = 0; i < 200; i++) {
    items.push({
      code: `ITEM${String(i).padStart(6, '0')}`,
      name: `Item ${i}`,
      category: categories[i % categories.length],
      unit: 'piece',
      pricing: {
        costPrice: Math.floor(Math.random() * 1000) + 100,
        salePrice: Math.floor(Math.random() * 1500) + 200,
      },
      inventory: {
        currentStock: Math.floor(Math.random() * 1000),
        minimumStock: 10,
        maximumStock: 1000,
      },
      isActive: true,
    });
  }
  const createdItems = await Item.insertMany(items);

  // Create invoices
  const invoices = [];
  const statuses = ['draft', 'confirmed', 'paid', 'cancelled'];
  const paymentStatuses = ['pending', 'partial', 'paid'];
  
  for (let i = 0; i < 500; i++) {
    const isSales = i % 2 === 0;
    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 365));
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceItems = [];
    const numItems = Math.floor(Math.random() * 5) + 1;
    
    for (let j = 0; j < numItems; j++) {
      const item = createdItems[Math.floor(Math.random() * createdItems.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unitPrice = item.pricing.salePrice;
      const lineTotal = quantity * unitPrice;
      
      invoiceItems.push({
        itemId: item._id,
        quantity,
        unitPrice,
        discount: 0,
        taxAmount: lineTotal * 0.17,
        lineTotal: lineTotal * 1.17,
      });
    }

    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);

    invoices.push({
      invoiceNumber: `${isSales ? 'SI' : 'PI'}${new Date().getFullYear()}${String(i).padStart(6, '0')}`,
      type: isSales ? 'sales' : 'purchase',
      customerId: isSales ? createdCustomers[Math.floor(Math.random() * createdCustomers.length)]._id : undefined,
      supplierId: !isSales ? createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)]._id : undefined,
      invoiceDate,
      dueDate,
      items: invoiceItems,
      totals: {
        subtotal,
        totalDiscount: 0,
        totalTax,
        grandTotal: subtotal + totalTax,
      },
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
      createdBy: createdUsers[0]._id,
    });
  }
  await Invoice.insertMany(invoices);

  // Create stock movements
  const movements = [];
  for (let i = 0; i < 1000; i++) {
    const movementDate = new Date();
    movementDate.setDate(movementDate.getDate() - Math.floor(Math.random() * 180));
    
    movements.push({
      itemId: createdItems[Math.floor(Math.random() * createdItems.length)]._id,
      movementType: ['in', 'out', 'adjustment'][Math.floor(Math.random() * 3)],
      quantity: Math.floor(Math.random() * 100) + 1,
      referenceType: 'adjustment',
      movementDate,
      createdBy: createdUsers[0]._id,
    });
  }
  await StockMovement.insertMany(movements);

  // Create ledger entries
  const entries = [];
  for (let i = 0; i < 1000; i++) {
    const transactionDate = new Date();
    transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 180));
    
    entries.push({
      accountId: createdCustomers[Math.floor(Math.random() * createdCustomers.length)]._id,
      accountType: 'Customer',
      transactionType: ['debit', 'credit'][Math.floor(Math.random() * 2)],
      amount: Math.floor(Math.random() * 10000) + 100,
      description: `Transaction ${i}`,
      referenceType: 'adjustment',
      transactionDate,
      createdBy: createdUsers[0]._id,
    });
  }
  await LedgerEntry.insertMany(entries);

  console.log('Test data seeded successfully');
}

describe('Database Performance Tests', () => {
  describe('Invoice Query Performance', () => {
    test('should efficiently query invoices by type and date', async () => {
      const startTime = Date.now();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      
      const invoices = await Invoice.find({
        type: 'sales',
        invoiceDate: { $gte: startDate },
      }).limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(invoices.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simple_query);
    });

    test('should efficiently query invoices by customer and status', async () => {
      const startTime = Date.now();
      
      const customer = await Customer.findOne();
      const invoices = await Invoice.find({
        customerId: customer._id,
        status: 'confirmed',
      }).limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simple_query);
    });

    test('should efficiently find overdue invoices', async () => {
      const startTime = Date.now();
      
      const invoices = await Invoice.find({
        dueDate: { $lt: new Date() },
        paymentStatus: { $ne: 'paid' },
        status: { $ne: 'cancelled' },
      }).limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complex_query);
    });
  });

  describe('Item and Inventory Query Performance', () => {
    test('should efficiently find low stock items', async () => {
      const startTime = Date.now();
      
      const items = await Item.find({
        $expr: { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] },
        isActive: true,
      }).limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complex_query);
    });

    test('should efficiently query items by category', async () => {
      const startTime = Date.now();
      
      const items = await Item.find({
        category: 'Electronics',
        isActive: true,
      }).limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(items.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simple_query);
    });
  });

  describe('Stock Movement Query Performance', () => {
    test('should efficiently query stock movements by item', async () => {
      const startTime = Date.now();
      
      const item = await Item.findOne();
      const movements = await StockMovement.find({
        itemId: item._id,
      })
        .sort({ movementDate: -1 })
        .limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simple_query);
    });

    test('should efficiently query stock movements by date range', async () => {
      const startTime = Date.now();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const movements = await StockMovement.find({
        movementDate: {
          $gte: startDate,
          $lte: new Date(),
        },
      }).limit(100);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simple_query);
    });
  });

  describe('Ledger Entry Query Performance', () => {
    test('should efficiently query ledger entries by account', async () => {
      const startTime = Date.now();
      
      const customer = await Customer.findOne();
      const entries = await LedgerEntry.find({
        accountId: customer._id,
      })
        .sort({ transactionDate: -1 })
        .limit(50);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.simple_query);
    });

    test('should efficiently calculate account balance', async () => {
      const startTime = Date.now();
      
      const customer = await Customer.findOne();
      const balance = await LedgerEntry.calculateAccountBalance(customer._id);
      
      const executionTime = Date.now() - startTime;
      
      expect(typeof balance).toBe('number');
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complex_query);
    });
  });

  describe('Aggregation Performance', () => {
    test('should efficiently aggregate sales by customer', async () => {
      const startTime = Date.now();
      
      const results = await Invoice.aggregate([
        {
          $match: {
            type: 'sales',
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$customerId',
            totalSales: { $sum: '$totals.grandTotal' },
            invoiceCount: { $sum: 1 },
          },
        },
        {
          $sort: { totalSales: -1 },
        },
        {
          $limit: 10,
        },
      ]);
      
      const executionTime = Date.now() - startTime;
      
      expect(results.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregation);
    });

    test('should efficiently aggregate stock movements by item', async () => {
      const startTime = Date.now();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const results = await StockMovement.aggregate([
        {
          $match: {
            movementDate: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              itemId: '$itemId',
              movementType: '$movementType',
            },
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 },
          },
        },
        {
          $limit: 50,
        },
      ]);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregation);
    });
  });

  describe('Concurrent Query Performance', () => {
    test('should handle multiple concurrent queries efficiently', async () => {
      const startTime = Date.now();
      
      const queries = [
        Invoice.find({ type: 'sales' }).limit(10),
        Item.find({ isActive: true }).limit(10),
        Customer.find({ isActive: true }).limit(10),
        StockMovement.find({}).sort({ movementDate: -1 }).limit(10),
        LedgerEntry.find({}).sort({ transactionDate: -1 }).limit(10),
      ];
      
      const results = await Promise.all(queries);
      
      const executionTime = Date.now() - startTime;
      
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complex_query);
    });
  });
});
