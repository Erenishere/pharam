/**
 * Database Index Optimization Configuration
 * 
 * This file contains compound indexes and optimization strategies
 * for common query patterns in the Indus Traders backend system.
 * 
 * These indexes are created in addition to the basic indexes defined
 * in individual model files to optimize complex queries and aggregations.
 */

const mongoose = require('mongoose');

/**
 * Create optimized compound indexes for all models
 * This should be called during application startup
 */
async function createOptimizedIndexes() {
  try {
    const db = mongoose.connection.db;

    // Invoice compound indexes for common query patterns
    await db.collection('invoices').createIndex(
      { type: 1, status: 1, invoiceDate: -1 },
      { name: 'idx_invoice_type_status_date' }
    );

    await db.collection('invoices').createIndex(
      { customerId: 1, status: 1, paymentStatus: 1 },
      { name: 'idx_invoice_customer_status' }
    );

    await db.collection('invoices').createIndex(
      { supplierId: 1, status: 1, paymentStatus: 1 },
      { name: 'idx_invoice_supplier_status' }
    );

    await db.collection('invoices').createIndex(
      { status: 1, dueDate: 1 },
      { name: 'idx_invoice_status_duedate' }
    );

    await db.collection('invoices').createIndex(
      { paymentStatus: 1, dueDate: 1 },
      { name: 'idx_invoice_payment_duedate' }
    );

    // Item compound indexes for inventory queries
    await db.collection('items').createIndex(
      { category: 1, isActive: 1, 'inventory.currentStock': 1 },
      { name: 'idx_item_category_active_stock' }
    );

    await db.collection('items').createIndex(
      { isActive: 1, 'inventory.currentStock': 1, 'inventory.minimumStock': 1 },
      { name: 'idx_item_active_stock_levels' }
    );

    // Stock movement compound indexes for reporting
    await db.collection('stockmovements').createIndex(
      { itemId: 1, movementType: 1, movementDate: -1 },
      { name: 'idx_stock_item_type_date' }
    );

    await db.collection('stockmovements').createIndex(
      { movementDate: -1, movementType: 1 },
      { name: 'idx_stock_date_type' }
    );

    await db.collection('stockmovements').createIndex(
      { referenceType: 1, referenceId: 1, itemId: 1 },
      { name: 'idx_stock_reference_item' }
    );

    // Ledger entry compound indexes for account queries
    await db.collection('ledgerentries').createIndex(
      { accountId: 1, accountType: 1, transactionDate: -1 },
      { name: 'idx_ledger_account_type_date' }
    );

    await db.collection('ledgerentries').createIndex(
      { transactionDate: -1, transactionType: 1, accountType: 1 },
      { name: 'idx_ledger_date_type_account' }
    );

    await db.collection('ledgerentries').createIndex(
      { accountId: 1, transactionType: 1, transactionDate: -1 },
      { name: 'idx_ledger_account_transtype_date' }
    );

    // Cash receipt compound indexes
    await db.collection('cashreceipts').createIndex(
      { customerId: 1, status: 1, receiptDate: -1 },
      { name: 'idx_receipt_customer_status_date' }
    );

    await db.collection('cashreceipts').createIndex(
      { status: 1, paymentMethod: 1, receiptDate: -1 },
      { name: 'idx_receipt_status_method_date' }
    );

    // Cash payment compound indexes
    await db.collection('cashpayments').createIndex(
      { supplierId: 1, status: 1, paymentDate: -1 },
      { name: 'idx_payment_supplier_status_date' }
    );

    await db.collection('cashpayments').createIndex(
      { status: 1, paymentMethod: 1, paymentDate: -1 },
      { name: 'idx_payment_status_method_date' }
    );

    // Customer/Supplier compound indexes
    await db.collection('customers').createIndex(
      { type: 1, isActive: 1, 'financialInfo.creditLimit': -1 },
      { name: 'idx_customer_type_active_credit' }
    );

    await db.collection('suppliers').createIndex(
      { type: 1, isActive: 1, 'financialInfo.paymentTerms': 1 },
      { name: 'idx_supplier_type_active_terms' }
    );

    // Batch compound indexes
    await db.collection('batches').createIndex(
      { item: 1, status: 1, expiryDate: 1 },
      { name: 'idx_batch_item_status_expiry' }
    );

    await db.collection('batches').createIndex(
      { status: 1, expiryDate: 1, remainingQuantity: 1 },
      { name: 'idx_batch_status_expiry_qty' }
    );

    // Tax config compound indexes
    await db.collection('taxconfigs').createIndex(
      { type: 1, isActive: 1, effectiveFrom: 1, effectiveTo: 1 },
      { name: 'idx_tax_type_active_dates' }
    );

    // Bank reconciliation compound indexes
    await db.collection('bankreconciliations').createIndex(
      { 'bankAccount.accountNumber': 1, reconciliationDate: -1 },
      { name: 'idx_recon_account_date' }
    );

    await db.collection('bankreconciliations').createIndex(
      { status: 1, reconciliationDate: -1 },
      { name: 'idx_recon_status_date' }
    );

    // User compound indexes
    await db.collection('users').createIndex(
      { role: 1, isActive: 1, lastLogin: -1 },
      { name: 'idx_user_role_active_login' }
    );

    console.log('✓ All optimized compound indexes created successfully');
  } catch (error) {
    console.error('Error creating optimized indexes:', error);
    throw error;
  }
}

/**
 * Get index statistics for a collection
 */
async function getIndexStats(collectionName) {
  try {
    const db = mongoose.connection.db;
    const stats = await db.collection(collectionName).stats();
    const indexes = await db.collection(collectionName).indexes();

    return {
      collection: collectionName,
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      indexes: indexes.map(idx => ({
        name: idx.name,
        keys: idx.key,
        unique: idx.unique || false,
      })),
    };
  } catch (error) {
    console.error(`Error getting stats for ${collectionName}:`, error);
    return null;
  }
}

/**
 * Analyze query performance
 */
async function analyzeQueryPerformance(model, query, options = {}) {
  try {
    const explain = await model.find(query, null, options).explain('executionStats');
    
    return {
      executionTimeMs: explain.executionStats.executionTimeMs,
      totalDocsExamined: explain.executionStats.totalDocsExamined,
      totalKeysExamined: explain.executionStats.totalKeysExamined,
      nReturned: explain.executionStats.nReturned,
      indexUsed: explain.executionStats.executionStages.indexName || 'COLLSCAN',
      efficient: explain.executionStats.totalDocsExamined === explain.executionStats.nReturned,
    };
  } catch (error) {
    console.error('Error analyzing query:', error);
    return null;
  }
}

/**
 * Get all collection statistics
 */
async function getAllIndexStats() {
  const collections = [
    'users',
    'customers',
    'suppliers',
    'items',
    'invoices',
    'stockmovements',
    'ledgerentries',
    'cashreceipts',
    'cashpayments',
    'batches',
    'taxconfigs',
    'bankreconciliations',
  ];

  const stats = [];
  for (const collection of collections) {
    const stat = await getIndexStats(collection);
    if (stat) {
      stats.push(stat);
    }
  }

  return stats;
}

module.exports = {
  createOptimizedIndexes,
  getIndexStats,
  analyzeQueryPerformance,
  getAllIndexStats,
};
