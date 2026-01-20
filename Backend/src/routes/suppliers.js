const express = require('express');
const { body, param, query } = require('express-validator');
const supplierController = require('../controllers/supplierController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate, isValidObjectId } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/suppliers/statistics
 * @desc    Get supplier statistics
 * @access  Private (Admin, Accountant)
 */
router.get(
  '/statistics',
  authenticate,
  requireRoles(['admin', 'accountant']),
  supplierController.getSupplierStatistics,
);

/**
 * @route   GET /api/suppliers/type/:type
 * @desc    Get suppliers by type
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
  supplierController.getSuppliersByType,
);

/**
 * @route   GET /api/suppliers/code/:code
 * @desc    Get supplier by code
 * @access  Private
 */
router.get(
  '/code/:code',
  authenticate,
  [
    param('code')
      .trim()
      .notEmpty()
      .withMessage('Supplier code is required'),
    validate,
  ],
  supplierController.getSupplierByCode,
);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with optional filters and pagination
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
  supplierController.getAllSuppliers,
);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private (Admin, Purchase, Data Entry)
 */
router.post(
  '/',
  authenticate,
  requireRoles(['admin', 'purchase', 'data_entry']),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Supplier name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Supplier name must be between 2 and 200 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Supplier code must be between 1 and 50 characters'),
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
  supplierController.createSupplier,
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
    validate,
  ],
  supplierController.getSupplierById,
);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Admin, Purchase, Data Entry)
 */
router.put(
  '/:id',
  authenticate,
  requireRoles(['admin', 'purchase', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Supplier name must be between 2 and 200 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Supplier code must be between 1 and 50 characters'),
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
  supplierController.updateSupplier,
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
    validate,
  ],
  supplierController.deleteSupplier,
);

/**
 * @route   POST /api/suppliers/:id/restore
 * @desc    Restore soft-deleted supplier
 * @access  Private (Admin)
 */
router.post(
  '/:id/restore',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
    validate,
  ],
  supplierController.restoreSupplier,
);

/**
 * @route   PATCH /api/suppliers/:id/toggle-status
 * @desc    Toggle supplier active status
 * @access  Private (Admin, Purchase)
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  requireRoles(['admin', 'purchase']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
    validate,
  ],
  supplierController.toggleSupplierStatus,
);

module.exports = router;
