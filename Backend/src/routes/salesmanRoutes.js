const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesmanController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Salesman Routes
 * All routes require authentication
 */

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
