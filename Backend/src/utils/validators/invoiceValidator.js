const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../../middleware/validation');

/**
 * Invoice Validator
 * Express-validator rules for invoice endpoints
 */

/**
 * Validation rules for creating a sales invoice
 */
const createSalesInvoiceRules = [
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
    .withMessage('Invalid due date format')
    .custom((value, { req }) => {
      if (req.body.invoiceDate && value) {
        const invoiceDate = new Date(req.body.invoiceDate);
        const dueDate = new Date(value);
        if (dueDate < invoiceDate) {
          throw new Error('Due date must be after invoice date');
        }
      }
      return true;
    }),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid item ID format'),

  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than zero'),

  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be zero or greater'),

  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),

  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

/**
 * Validation rules for creating a purchase invoice
 */
const createPurchaseInvoiceRules = [
  body('supplierId')
    .notEmpty()
    .withMessage('Supplier ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid supplier ID format'),

  body('invoiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid invoice date format'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format')
    .custom((value, { req }) => {
      if (req.body.invoiceDate && value) {
        const invoiceDate = new Date(req.body.invoiceDate);
        const dueDate = new Date(value);
        if (dueDate < invoiceDate) {
          throw new Error('Due date must be after invoice date');
        }
      }
      return true;
    }),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid item ID format'),

  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than zero'),

  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be zero or greater'),

  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),

  body('items.*.batchInfo.batchNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Batch number must be between 1 and 50 characters'),

  body('items.*.batchInfo.manufacturingDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid manufacturing date format'),

  body('items.*.batchInfo.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format')
    .custom((value, { req }) => {
      const itemIndex = req.body.items.findIndex(
        (item) => item.batchInfo?.expiryDate === value
      );
      if (itemIndex !== -1) {
        const item = req.body.items[itemIndex];
        if (item.batchInfo?.manufacturingDate) {
          const mfgDate = new Date(item.batchInfo.manufacturingDate);
          const expDate = new Date(value);
          if (expDate <= mfgDate) {
            throw new Error('Expiry date must be after manufacturing date');
          }
        }
      }
      return true;
    }),

  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

/**
 * Validation rules for updating an invoice
 */
const updateInvoiceRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),

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
    .withMessage('At least one item is required if items are provided'),

  body('items.*.itemId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid item ID format'),

  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than zero'),

  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be zero or greater'),

  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),

  body('status')
    .optional()
    .isIn(['draft', 'confirmed', 'paid', 'cancelled'])
    .withMessage('Invalid status value'),

  body('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid'])
    .withMessage('Invalid payment status value'),

  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

/**
 * Validation rules for confirming an invoice
 */
const confirmInvoiceRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),
];

/**
 * Validation rules for marking invoice as paid
 */
const markInvoiceAsPaidRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),

  body('paidAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid payment date format'),

  body('paymentMethod')
    .optional()
    .isString()
    .trim()
    .isIn(['cash', 'bank_transfer', 'cheque', 'credit_card', 'other'])
    .withMessage('Invalid payment method'),

  body('paymentReference')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment reference must not exceed 100 characters'),

  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

/**
 * Validation rules for marking invoice as partially paid
 */
const markInvoiceAsPartiallyPaidRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),

  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than zero'),

  body('paidAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid payment date format'),

  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

/**
 * Validation rules for cancelling an invoice
 */
const cancelInvoiceRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),

  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Cancellation reason must be between 5 and 500 characters'),
];

/**
 * Validation rules for getting invoice by ID
 */
const getInvoiceByIdRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),
];

/**
 * Validation rules for getting invoices with filters
 */
const getInvoicesRules = [
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
    .withMessage('Invalid status value'),

  query('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid'])
    .withMessage('Invalid payment status value'),

  query('customerId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid customer ID format'),

  query('supplierId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid supplier ID format'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        if (endDate < startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  query('sortBy')
    .optional()
    .isString()
    .isIn(['invoiceDate', 'dueDate', 'grandTotal', 'createdAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isString()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * Validation rules for deleting an invoice
 */
const deleteInvoiceRules = [
  param('id')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid invoice ID format'),
];

module.exports = {
  createSalesInvoiceRules,
  createPurchaseInvoiceRules,
  updateInvoiceRules,
  confirmInvoiceRules,
  markInvoiceAsPaidRules,
  markInvoiceAsPartiallyPaidRules,
  cancelInvoiceRules,
  getInvoiceByIdRules,
  getInvoicesRules,
  deleteInvoiceRules,
};
