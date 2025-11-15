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
      // Additional endpoints will be added as they are implemented
      // reports: '/api/reports'
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
