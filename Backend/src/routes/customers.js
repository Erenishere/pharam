const express = require('express');
const { body, param, query } = require('express-validator');
const customerController = require('../controllers/customerController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate, isValidObjectId } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/customers/statistics
 * @desc    Get customer statistics
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/statistics',
  authenticate,
  requireRoles(['admin', 'accountant']),
  customerController.getCustomerStatistics,
);

/**
 * @route   GET /api/customers/type/:type
 * @desc    Get customers by type
 * @access  Private
 */
router.get(
  '/type/:type',
  authenticate,
  [
    param('type')
      .isIn(['customer', 'supplier', 'both'])
      .withMessage('Invalid type. Must be one of: customer, supplier, both'),
    validate,
  ],
  customerController.getCustomersByType,
);

/**
 * @route   GET /api/customers/code/:code
 * @desc    Get customer by code
 * @access  Private
 */
router.get(
  '/code/:code',
  authenticate,
  [
    param('code')
      .trim()
      .notEmpty()
      .withMessage('Customer code is required'),
    validate,
  ],
  customerController.getCustomerByCode,
);

/**
 * @route   GET /api/customers
 * @desc    Get all customers with optional filters and pagination
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('type')
      .optional()
      .isIn(['customer', 'supplier', 'both'])
      .withMessage('Invalid type'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search keyword must not be empty'),
    validate,
  ],
  customerController.getAllCustomers,
);

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private (Admin, Sales, Data Entry)
 */
router.post(
  '/',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Customer name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Customer name must be between 2 and 200 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Customer code must be between 1 and 50 characters'),
    body('type')
      .optional()
      .isIn(['customer', 'supplier', 'both'])
      .withMessage('Invalid type. Must be one of: customer, supplier, both'),
    body('contactInfo.email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('contactInfo.phone')
      .optional()
      .trim(),
    body('financialInfo.creditLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number'),
    body('financialInfo.paymentTerms')
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage('Payment terms must be between 0 and 365 days'),
    validate,
  ],
  customerController.createCustomer,
);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    validate,
  ],
  customerController.getCustomerById,
);

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private (Admin, Sales, Data Entry)
 */
router.put(
  '/:id',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Customer name must be between 2 and 200 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Customer code must be between 1 and 50 characters'),
    body('type')
      .optional()
      .isIn(['customer', 'supplier', 'both'])
      .withMessage('Invalid type. Must be one of: customer, supplier, both'),
    body('contactInfo.email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('financialInfo.creditLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number'),
    body('financialInfo.paymentTerms')
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage('Payment terms must be between 0 and 365 days'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    validate,
  ],
  customerController.updateCustomer,
);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    validate,
  ],
  customerController.deleteCustomer,
);

/**
 * @route   POST /api/customers/:id/restore
 * @desc    Restore soft-deleted customer
 * @access  Private (Admin)
 */
router.post(
  '/:id/restore',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    validate,
  ],
  customerController.restoreCustomer,
);

/**
 * @route   PATCH /api/customers/:id/toggle-status
 * @desc    Toggle customer active status
 * @access  Private (Admin, Sales)
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  requireRoles(['admin', 'sales']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    validate,
  ],
  customerController.toggleCustomerStatus,
);

module.exports = router;
