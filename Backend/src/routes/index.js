const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const customerRoutes = require('./customers');
const supplierRoutes = require('./suppliers');
const itemRoutes = require('./itemRoutes');
const batchRoutes = require('./batchRoutes');
// const taxRoutes = require('./taxRoutes');
const salesInvoiceRoutes = require('./salesInvoiceRoutes');
const purchaseInvoiceRoutes = require('./purchaseInvoiceRoutes');
const accountsRoutes = require('./accounts');
const cashbookRoutes = require('./cashbook');
const reportRoutes = require('./reportRoutes');
const stockMovementRoutes = require('./stockMovementRoutes');
const monitoringRoutes = require('./monitoring');
const warehouseRoutes = require('./warehouseRoutes');
const schemeRoutes = require('./schemeRoutes');
const salesmanRoutes = require('./salesmanRoutes');

const router = express.Router();

// API version and info
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'Indus Traders Backend API',
    version: '1.0.0',
    message: 'API is running successfully',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      customers: '/api/customers',
      suppliers: '/api/suppliers',
      items: '/api/items',
      batches: '/api/batches',
      tax: '/api/tax',
      salesInvoices: '/api/invoices/sales',
      purchaseInvoices: '/api/invoices/purchase',
      accounts: '/api/accounts',
      cashbook: '/api/cashbook',
      reports: '/api/reports',
      stockMovements: '/api/stock-movements',
      warehouses: '/api/warehouses',
      schemes: '/api/schemes',
    },
  });
});

// Mount API Routes
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/customers', customerRoutes);
router.use('/v1/suppliers', supplierRoutes);
router.use('/v1/items', itemRoutes);
router.use('/v1', batchRoutes); // Batch routes are mounted at root to support nested routes
// router.use('/v1/tax', taxRoutes); // Tax calculation routes
router.use('/v1/invoices/sales', salesInvoiceRoutes); // Sales invoice routes
router.use('/v1/invoices/purchase', purchaseInvoiceRoutes); // Purchase invoice routes
router.use('/v1/purchase-invoices', purchaseInvoiceRoutes); // Alternative purchase invoice routes for returns
router.use('/v1/accounts', accountsRoutes); // Accounts and ledger routes
router.use('/v1/cashbook', cashbookRoutes); // Cash book routes
router.use('/v1/reports', reportRoutes); // Reporting and analytics routes
router.use('/v1/stock-movements', stockMovementRoutes); // Stock movement routes
router.use('/v1/monitoring', monitoringRoutes); // Monitoring and health check routes
router.use('/warehouses', warehouseRoutes); // Warehouse routes (mounted at /api/warehouses to match task requirements)
router.use('/inventory', itemRoutes); // Inventory routes (mounted at /api/inventory to support /api/inventory/transfer)
router.use('/schemes', schemeRoutes); // Scheme routes (mounted at /api/schemes)
router.use('/v1/salesmen', salesmanRoutes); // Salesman routes

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
