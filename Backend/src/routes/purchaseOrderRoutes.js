const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Purchase Order Routes
 * Phase 2 - Requirement 10: Purchase Order Integration
 * Task 41.3: Create PurchaseOrder API endpoints
 */

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/purchase-orders
 * @desc    Create a new purchase order
 * @access  Private (Admin, Purchase)
 */
router.post('/', authorize('admin', 'purchase'), purchaseOrderController.createPurchaseOrder);

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders with filters
 * @access  Private
 */
router.get('/', purchaseOrderController.getPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/rate-lookup
 * @desc    Get PO rate for an item and supplier
 * @access  Private
 * Phase 2 - Requirement 18.3 - Task 60.2
 */
router.get('/rate-lookup', purchaseOrderController.getPORate);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

/**
 * @route   POST /api/purchase-orders/:id/approve
 * @desc    Approve a purchase order
 * @access  Private (Admin only)
 */
router.post('/:id/approve', authorize('admin'), purchaseOrderController.approvePurchaseOrder);

/**
 * @route   PUT /api/purchase-orders/:id
 * @desc    Update a purchase order
 * @access  Private (Admin, Purchase)
 */
router.put('/:id', authorize('admin', 'purchase'), purchaseOrderController.updatePurchaseOrder);

/**
 * @route   DELETE /api/purchase-orders/:id
 * @desc    Delete a purchase order (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', authorize('admin'), purchaseOrderController.deletePurchaseOrder);

/**
 * @route   POST /api/purchase-orders/:id/convert-to-invoice
 * @desc    Convert purchase order to invoice
 * @access  Private (Admin, Purchase)
 * Phase 2 - Requirement 10.2, 10.3 - Task 42.2
 */
router.post(
  '/:id/convert-to-invoice',
  authorize('admin', 'purchase'),
  purchaseOrderController.convertPOToInvoice
);

module.exports = router;
