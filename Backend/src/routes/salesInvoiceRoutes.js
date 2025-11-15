const express = require('express');
const { body, param, query } = require('express-validator');
const salesInvoiceController = require('../controllers/salesInvoiceController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate, isValidObjectId } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/invoices/sales/statistics
 * @desc    Get sales statistics
 * @access  Private (Admin, Sales, Accountant)
 */
router.get(
  '/statistics',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  salesInvoiceController.getSalesStatistics,
);

/**
 * @route   GET /api/invoices/sales/number/:invoiceNumber
 * @desc    Get sales invoice by invoice number
 * @access  Private
 */
router.get(
  '/number/:invoiceNumber',
  authenticate,
  [
    param('invoiceNumber')
      .trim()
      .notEmpty()
      .withMessage('Invoice number is required')
      .matches(/^SI\d{10}$/)
      .withMessage('Invalid invoice number format. Expected format: SI + Year + 6 digits'),
    validate,
  ],
  salesInvoiceController.getSalesInvoiceByNumber,
);

/**
 * @route   GET /api/invoices/sales/customer/:customerId
 * @desc    Get sales invoices by customer
 * @access  Private
 */
router.get(
  '/customer/:customerId',
  authenticate,
  [
    param('customerId')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  salesInvoiceController.getSalesInvoicesByCustomer,
);

/**
 * @route   GET /api/invoices/sales
 * @desc    Get all sales invoices with optional filters and pagination
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
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
      .withMessage('Invalid status'),
    query('paymentStatus')
      .optional()
      .isIn(['pending', 'partial', 'paid'])
      .withMessage('Invalid payment status'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateFrom'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateTo'),
    validate,
  ],
  salesInvoiceController.getAllSalesInvoices,
);

/**
 * @route   POST /api/invoices/sales
 * @desc    Create new sales invoice
 * @access  Private (Admin, Sales, Data Entry)
 */
router.post(
  '/',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  [
    body('customerId')
      .notEmpty()
      .withMessage('Customer ID is required')
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    body('invoiceDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid invoice date format'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.itemId')
      .notEmpty()
      .withMessage('Item ID is required for all items')
      .custom(isValidObjectId)
      .withMessage('Invalid item ID format'),
    body('items.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('items.*.unitPrice')
      .isFloat({ min: 0 })
      .withMessage('Unit price must be a positive number'),
    body('items.*.discount')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Discount must be between 0 and 100'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters'),
    validate,
  ],
  salesInvoiceController.createSalesInvoice,
);

/**
 * @route   GET /api/invoices/sales/:id
 * @desc    Get sales invoice by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.getSalesInvoiceById,
);

/**
 * @route   PUT /api/invoices/sales/:id
 * @desc    Update sales invoice
 * @access  Private (Admin, Sales, Data Entry)
 */
router.put(
  '/:id',
  authenticate,
  requireRoles(['admin', 'sales', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('customerId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid customer ID format'),
    body('invoiceDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid invoice date format'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
    body('items')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.itemId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid item ID format'),
    body('items.*.quantity')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Quantity must be greater than 0'),
    body('items.*.unitPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Unit price must be a positive number'),
    body('items.*.discount')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Discount must be between 0 and 100'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters'),
    validate,
  ],
  salesInvoiceController.updateSalesInvoice,
);

/**
 * @route   DELETE /api/invoices/sales/:id
 * @desc    Delete sales invoice (only draft invoices)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.deleteSalesInvoice,
);

/**
 * @route   PATCH /api/invoices/sales/:id/status
 * @desc    Update sales invoice status
 * @access  Private (Admin, Sales, Accountant)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
      .withMessage('Invalid status. Must be one of: draft, confirmed, paid, cancelled'),
    validate,
  ],
  salesInvoiceController.updateInvoiceStatus,
);

/**
 * @route   PATCH /api/invoices/sales/:id/payment-status
 * @desc    Update sales invoice payment status
 * @access  Private (Admin, Accountant)
 */
router.patch(
  '/:id/payment-status',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('paymentStatus')
      .notEmpty()
      .withMessage('Payment status is required')
      .isIn(['pending', 'partial', 'paid'])
      .withMessage('Invalid payment status. Must be one of: pending, partial, paid'),
    validate,
  ],
  salesInvoiceController.updatePaymentStatus,
);

/**
 * @route   PATCH /api/invoices/sales/:id/confirm
 * @desc    Confirm sales invoice and update inventory
 * @access  Private (Admin, Sales, Accountant)
 */
router.patch(
  '/:id/confirm',
  authenticate,
  requireRoles(['admin', 'sales', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.confirmSalesInvoice,
);

/**
 * @route   PATCH /api/invoices/sales/:id/payment
 * @desc    Update invoice payment status
 * @access  Private (Admin, Accountant)
 */
router.patch(
  '/:id/payment',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('paymentStatus')
      .notEmpty()
      .withMessage('Payment status is required')
      .isIn(['pending', 'partial', 'paid'])
      .withMessage('Invalid payment status. Must be one of: pending, partial, paid'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Payment amount must be greater than 0'),
    body('paidAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('paymentMethod')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Payment method cannot exceed 50 characters'),
    body('paymentReference')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Payment reference cannot exceed 100 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.updatePayment,
);

/**
 * @route   POST /api/invoices/sales/:id/mark-paid
 * @desc    Mark invoice as paid
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/mark-paid',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('paidAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('paymentMethod')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Payment method cannot exceed 50 characters'),
    body('paymentReference')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Payment reference cannot exceed 100 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.markInvoiceAsPaid,
);

/**
 * @route   POST /api/invoices/sales/:id/mark-partial-paid
 * @desc    Mark invoice as partially paid
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/mark-partial-paid',
  authenticate,
  requireRoles(['admin', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('amount')
      .notEmpty()
      .withMessage('Payment amount is required')
      .isFloat({ min: 0.01 })
      .withMessage('Payment amount must be greater than 0'),
    body('paidAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid payment date format'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.markInvoiceAsPartiallyPaid,
);

/**
 * @route   PATCH /api/invoices/sales/:id/cancel
 * @desc    Cancel sales invoice and reverse inventory
 * @access  Private (Admin)
 */
router.patch(
  '/:id/cancel',
  authenticate,
  requireRoles(['admin']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason cannot exceed 500 characters'),
    validate,
  ],
  salesInvoiceController.cancelSalesInvoice,
);

/**
 * @route   GET /api/invoices/sales/:id/stock-movements
 * @desc    Get stock movements for an invoice
 * @access  Private
 */
router.get(
  '/:id/stock-movements',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  salesInvoiceController.getInvoiceStockMovements,
);

module.exports = router;
