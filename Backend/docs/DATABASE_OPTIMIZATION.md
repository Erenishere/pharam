# Database Optimization Guide

## Overview

This document describes the database optimization strategies implemented in the Indus Traders backend system, including indexing strategies, query optimization, and performance monitoring.

## Index Strategy

### Basic Indexes

Each model has basic indexes defined in its schema file for:
- Unique fields (codes, numbers, emails)
- Frequently queried single fields
- Foreign key references

### Compound Indexes

Compound indexes are created for common query patterns that involve multiple fields. These are defined in `src/config/indexOptimization.js`.

#### Invoice Indexes

```javascript
// Type, status, and date - for filtered invoice lists
{ type: 1, status: 1, invoiceDate: -1 }

// Customer with status - for customer invoice history
{ customerId: 1, status: 1, paymentStatus: 1 }

// Supplier with status - for supplier invoice history
{ supplierId: 1, status: 1, paymentStatus: 1 }

// Status and due date - for overdue invoice queries
{ status: 1, dueDate: 1 }
{ paymentStatus: 1, dueDate: 1 }
```

#### Item Indexes

```javascript
// Category, active status, and stock - for inventory reports
{ category: 1, isActive: 1, 'inventory.currentStock': 1 }

// Active status with stock levels - for low stock alerts
{ isActive: 1, 'inventory.currentStock': 1, 'inventory.minimumStock': 1 }
```

#### Stock Movement Indexes

```javascript
// Item, type, and date - for item movement history
{ itemId: 1, movementType: 1, movementDate: -1 }

// Date and type - for movement reports
{ movementDate: -1, movementType: 1 }

// Reference with item - for invoice-related movements
{ referenceType: 1, referenceId: 1, itemId: 1 }
```

#### Ledger Entry Indexes

```javascript
// Account, type, and date - for account statements
{ accountId: 1, accountType: 1, transactionDate: -1 }

// Date, transaction type, and account type - for financial reports
{ transactionDate: -1, transactionType: 1, accountType: 1 }

// Account with transaction type - for balance calculations
{ accountId: 1, transactionType: 1, transactionDate: -1 }
```

#### Cash Transaction Indexes

```javascript
// Customer/Supplier with status and date
{ customerId: 1, status: 1, receiptDate: -1 }
{ supplierId: 1, status: 1, paymentDate: -1 }

// Status, payment method, and date - for cash flow reports
{ status: 1, paymentMethod: 1, receiptDate: -1 }
{ status: 1, paymentMethod: 1, paymentDate: -1 }
```

#### Batch Indexes

```javascript
// Item, status, and expiry - for batch tracking
{ item: 1, status: 1, expiryDate: 1 }

// Status, expiry, and quantity - for expiry alerts
{ status: 1, expiryDate: 1, remainingQuantity: 1 }
```

## Query Optimization Best Practices

### 1. Use Projection

Only select the fields you need:

```javascript
// Bad
const invoices = await Invoice.find({ customerId });

// Good
const invoices = await Invoice.find({ customerId })
  .select('invoiceNumber invoiceDate totals.grandTotal status');
```

### 2. Use Lean Queries

For read-only operations, use `.lean()` to get plain JavaScript objects:

```javascript
// Returns Mongoose documents (slower)
const items = await Item.find({ category: 'Electronics' });

// Returns plain objects (faster)
const items = await Item.find({ category: 'Electronics' }).lean();
```

### 3. Limit Results

Always use `.limit()` for list queries:

```javascript
const recentInvoices = await Invoice.find({ type: 'sales' })
  .sort({ invoiceDate: -1 })
  .limit(50);
```

### 4. Use Aggregation for Complex Queries

For complex calculations, use aggregation pipelines:

```javascript
const salesSummary = await Invoice.aggregate([
  {
    $match: {
      type: 'sales',
      status: 'confirmed',
      invoiceDate: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: '$customerId',
      totalSales: { $sum: '$totals.grandTotal' },
      invoiceCount: { $sum: 1 }
    }
  },
  {
    $sort: { totalSales: -1 }
  }
]);
```

### 5. Avoid $where and $regex on Large Collections

These operations can't use indexes effectively:

```javascript
// Bad - full collection scan
const items = await Item.find({
  $where: 'this.inventory.currentStock < this.inventory.minimumStock'
});

// Good - uses index
const items = await Item.find({
  $expr: { $lt: ['$inventory.currentStock', '$inventory.minimumStock'] }
});
```

## Performance Monitoring

### Analyzing Query Performance

Use the `analyzeQueryPerformance` utility to check if queries are using indexes:

```javascript
const { analyzeQueryPerformance } = require('./config/indexOptimization');

const performance = await analyzeQueryPerformance(
  Invoice,
  { type: 'sales', status: 'confirmed' },
  { sort: { invoiceDate: -1 }, limit: 50 }
);

console.log(performance);
// {
//   executionTimeMs: 5,
//   totalDocsExamined: 50,
//   totalKeysExamined: 50,
//   nReturned: 50,
//   indexUsed: 'idx_invoice_type_status_date',
//   efficient: true
// }
```

### Getting Index Statistics

Check index usage and collection statistics:

```javascript
const { getAllIndexStats } = require('./config/indexOptimization');

const stats = await getAllIndexStats();
console.log(stats);
```

### MongoDB Explain

Use MongoDB's explain to analyze queries:

```javascript
const explain = await Invoice.find({ type: 'sales' })
  .explain('executionStats');

console.log(explain.executionStats);
```

## Performance Targets

### Query Performance Targets

- **Simple queries** (single field lookup): < 100ms
- **Complex queries** (multiple fields, joins): < 500ms
- **Aggregations**: < 1000ms
- **Bulk operations**: < 2000ms

### Index Efficiency

A query is considered efficient when:
- `totalDocsExamined` ≈ `nReturned` (minimal document scanning)
- An index is used (not COLLSCAN)
- Execution time is within targets

## Maintenance

### Regular Index Maintenance

1. **Monitor slow queries**: Enable MongoDB slow query log
2. **Review index usage**: Check which indexes are being used
3. **Remove unused indexes**: Indexes have a write cost
4. **Update statistics**: Run `db.collection.stats()` periodically

### Index Rebuild

If performance degrades, rebuild indexes:

```javascript
// In MongoDB shell
db.invoices.reIndex();
```

Or programmatically:

```javascript
await mongoose.connection.db.collection('invoices').reIndex();
```

## Testing

Performance tests are located in `tests/performance/database.performance.test.js`.

Run performance tests:

```bash
npm run test:performance
```

## Common Query Patterns

### 1. Invoice Queries

```javascript
// Get customer invoices with pagination
const invoices = await Invoice.find({
  customerId,
  status: { $ne: 'cancelled' }
})
  .sort({ invoiceDate: -1 })
  .skip(page * limit)
  .limit(limit)
  .lean();

// Get overdue invoices
const overdueInvoices = await Invoice.find({
  dueDate: { $lt: new Date() },
  paymentStatus: { $ne: 'paid' },
  status: 'confirmed'
})
  .populate('customerId', 'code name')
  .lean();
```

### 2. Inventory Queries

```javascript
// Get low stock items
const lowStockItems = await Item.find({
  $expr: { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] },
  isActive: true
})
  .select('code name inventory')
  .lean();

// Get items by category with stock
const items = await Item.find({
  category,
  isActive: true,
  'inventory.currentStock': { $gt: 0 }
})
  .sort({ name: 1 })
  .lean();
```

### 3. Ledger Queries

```javascript
// Get account statement
const entries = await LedgerEntry.find({
  accountId,
  transactionDate: { $gte: startDate, $lte: endDate }
})
  .sort({ transactionDate: -1 })
  .populate('createdBy', 'username')
  .lean();

// Calculate account balance
const balance = await LedgerEntry.calculateAccountBalance(accountId);
```

### 4. Stock Movement Queries

```javascript
// Get item movement history
const movements = await StockMovement.find({
  itemId,
  movementDate: { $gte: startDate }
})
  .sort({ movementDate: -1 })
  .populate('itemId', 'code name')
  .lean();
```

## Troubleshooting

### Slow Queries

1. **Check if index is being used**:
   ```javascript
   const explain = await Model.find(query).explain('executionStats');
   console.log(explain.executionStats.executionStages);
   ```

2. **Look for COLLSCAN**: If you see `COLLSCAN`, the query is scanning the entire collection

3. **Add appropriate index**: Create a compound index for the query pattern

4. **Use projection**: Select only needed fields

### High Memory Usage

1. **Use cursor for large result sets**:
   ```javascript
   const cursor = Model.find(query).cursor();
   for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
     // Process doc
   }
   ```

2. **Use aggregation with $limit early in pipeline**

3. **Implement pagination**

### Write Performance Issues

1. **Too many indexes**: Each index slows down writes
2. **Review and remove unused indexes**
3. **Use bulk operations for multiple writes**:
   ```javascript
   await Model.bulkWrite([
     { insertOne: { document: doc1 } },
     { updateOne: { filter: {}, update: {} } }
   ]);
   ```

## Resources

- [MongoDB Indexing Strategies](https://docs.mongodb.com/manual/indexes/)
- [Mongoose Performance Tips](https://mongoosejs.com/docs/guide.html#indexes)
- [MongoDB Explain Plans](https://docs.mongodb.com/manual/reference/explain-results/)
