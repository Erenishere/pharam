const express = require('express');
const { body, param, query } = require('express-validator');
const purchaseInvoiceController = require('../controllers/purchaseInvoiceController');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate, isValidObjectId } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/invoices/purchase/statistics
 * @desc    Get purchase statistics
 * @access  Private (Admin, Purchase, Accountant)
 */
router.get(
  '/statistics',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant']),
  purchaseInvoiceController.getPurchaseStatistics,
);

/**
 * @route   GET /api/invoices/purchase/number/:invoiceNumber
 * @desc    Get purchase invoice by invoice number
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
      .matches(/^PI\d{10}$/)
      .withMessage('Invalid invoice number format. Expected format: PI + Year + 6 digits'),
    validate,
  ],
  purchaseInvoiceController.getPurchaseInvoiceByNumber,
);

/**
 * @route   GET /api/invoices/purchase/supplier/:supplierId
 * @desc    Get purchase invoices by supplier
 * @access  Private
 */
router.get(
  '/supplier/:supplierId',
  authenticate,
  [
    param('supplierId')
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    validate,
  ],
  purchaseInvoiceController.getPurchaseInvoicesBySupplier,
);

/**
 * @route   GET /api/invoices/purchase
 * @desc    Get all purchase invoices with optional filters and pagination
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
  purchaseInvoiceController.getAllPurchaseInvoices,
);

/**
 * @route   POST /api/invoices/purchase
 * @desc    Create new purchase invoice
 * @access  Private (Admin, Purchase, Data Entry)
 */
router.post(
  '/',
  authenticate,
  requireRoles(['admin', 'purchase', 'data_entry']),
  [
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
    body('items.*.batchInfo.batchNumber')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Batch number cannot exceed 50 characters'),
    body('items.*.batchInfo.manufacturingDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid manufacturing date format'),
    body('items.*.batchInfo.expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters'),
    validate,
  ],
  purchaseInvoiceController.createPurchaseInvoice,
);

/**
 * @route   GET /api/invoices/purchase/:id
 * @desc    Get purchase invoice by ID
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
  purchaseInvoiceController.getPurchaseInvoiceById,
);

/**
 * @route   PUT /api/invoices/purchase/:id
 * @desc    Update purchase invoice
 * @access  Private (Admin, Purchase, Data Entry)
 */
router.put(
  '/:id',
  authenticate,
  requireRoles(['admin', 'purchase', 'data_entry']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('supplierId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Invalid supplier ID format'),
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
    body('items.*.batchInfo.batchNumber')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Batch number cannot exceed 50 characters'),
    body('items.*.batchInfo.manufacturingDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid manufacturing date format'),
    body('items.*.batchInfo.expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters'),
    validate,
  ],
  purchaseInvoiceController.updatePurchaseInvoice,
);

/**
 * @route   DELETE /api/invoices/purchase/:id
 * @desc    Delete purchase invoice (only draft invoices)
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
  purchaseInvoiceController.deletePurchaseInvoice,
);

/**
 * @route   PATCH /api/invoices/purchase/:id/status
 * @desc    Update purchase invoice status
 * @access  Private (Admin, Purchase, Accountant)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant']),
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
  purchaseInvoiceController.updateInvoiceStatus,
);

/**
 * @route   PATCH /api/invoices/purchase/:id/payment-status
 * @desc    Update purchase invoice payment status
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
  purchaseInvoiceController.updatePaymentStatus,
);

/**
 * @route   PATCH /api/invoices/purchase/:id/confirm
 * @desc    Confirm purchase invoice and update inventory
 * @access  Private (Admin, Purchase, Accountant)
 */
router.patch(
  '/:id/confirm',
  authenticate,
  requireRoles(['admin', 'purchase', 'accountant']),
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    validate,
  ],
  purchaseInvoiceController.confirmPurchaseInvoice,
);

/**
 * @route   PATCH /api/invoices/purchase/:id/payment
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
  purchaseInvoiceController.updatePayment,
);

/**
 * @route   POST /api/invoices/purchase/:id/mark-paid
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
  purchaseInvoiceController.markInvoiceAsPaid,
);

/**
 * @route   POST /api/invoices/purchase/:id/mark-partial-paid
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
  purchaseInvoiceController.markInvoiceAsPartiallyPaid,
);

/**
 * @route   PATCH /api/invoices/purchase/:id/cancel
 * @desc    Cancel purchase invoice and reverse inventory
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
  purchaseInvoiceController.cancelPurchaseInvoice,
);

/**
 * @route   GET /api/invoices/purchase/:id/stock-movements
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
  purchaseInvoiceController.getInvoiceStockMovements,
);

/**
 * @route   POST /api/invoices/purchase/:id/send-sms
 * @desc    Send SMS for purchase invoice
 * @access  Private
 */
router.post(
  '/:id/send-sms',
  authenticate,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid invoice ID format'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    body('templateId')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Template ID cannot be empty'),
    validate,
  ],
  require('../controllers/smsController').sendInvoiceSMS,
);

module.exports = router;

/**
 * @swagger
 * /api/purchase-invoices/return:
 *   post:
 *     summary: Create a purchase return invoice
 *     tags: [Purchase Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalInvoiceId
 *               - returnItems
 *               - returnReason
 *             properties:
 *               originalInvoiceId:
 *                 type: string
 *                 description: ID of the original purchase invoice
 *               returnItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               returnReason:
 *                 type: string
 *                 enum: [damaged, expired, wrong_item, quality_issue, other]
 *               returnNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase return created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/return', authenticate, requireRoles(['admin', 'purchase_manager']), purchaseInvoiceController.createPurchaseReturn);

/**
 * @swagger
 * /api/purchase-invoices/{id}/returnable:
 *   get:
 *     summary: Get returnable items for a purchase invoice
 *     tags: [Purchase Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase invoice ID
 *     responses:
 *       200:
 *         description: Returnable items retrieved successfully
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/returnable', authenticate, purchaseInvoiceController.getReturnableItems);

/**
 * @swagger
 * /api/purchase-invoices/{id}/validate-return:
 *   post:
 *     summary: Validate return quantities for a purchase invoice
 *     tags: [Purchase Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - returnItems
 *             properties:
 *               returnItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *     responses:
 *       200:
 *         description: Validation result
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/:id/validate-return', authenticate, purchaseInvoiceController.validateReturn);
