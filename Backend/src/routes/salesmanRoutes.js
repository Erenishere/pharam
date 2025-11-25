const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesmanController');
const salesmanSelfServiceController = require('../controllers/salesmanSelfServiceController');
const { authenticate, authorize, requireSales } = require('../middleware/auth');

/**
 * Salesman Routes
 * All routes require authentication
 */

// ========================================
// SALESMAN SELF-SERVICE ROUTES (sales role)
// ========================================

/**
 * @route   GET /api/v1/salesmen/me
 * @desc    Get logged-in salesman's profile
 * @access  Private (sales role)
 */
router.get('/me', authenticate, requireSales, salesmanSelfServiceController.getMyProfile);

/**
 * @route   GET /api/v1/salesmen/my-invoices
 * @desc    Get logged-in salesman's invoices
 * @access  Private (sales role)
 */
router.get('/my-invoices', authenticate, requireSales, salesmanSelfServiceController.getMyInvoices);

/**
 * @route   GET /api/v1/salesmen/my-commission
 * @desc    Get logged-in salesman's commission
 * @access  Private (sales role)
 */
router.get('/my-commission', authenticate, requireSales, salesmanSelfServiceController.getMyCommission);

/**
 * @route   GET /api/v1/salesmen/my-performance
 * @desc    Get logged-in salesman's performance stats
 * @access  Private (sales role)
 */
router.get('/my-performance', authenticate, requireSales, salesmanSelfServiceController.getMyPerformance);

// ========================================
// ADMIN ROUTES (admin/sales role)
// ========================================

// Create salesman
router.post(
  '/',
  authenticate,
  authorize(['admin', 'sales']),
  salesmanController.createSalesman
);

// Get all salesmen
router.get(
  '/',
  authenticate,
  salesmanController.getAllSalesmen
);

// Get salesman by code
router.get(
  '/code/:code',
  authenticate,
  salesmanController.getSalesmanByCode
);

// Get salesman by ID
router.get(
  '/:id',
  authenticate,
  salesmanController.getSalesmanById
);

// Update salesman
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'sales']),
  salesmanController.updateSalesman
);

// Delete salesman
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  salesmanController.deleteSalesman
);

module.exports = router;
