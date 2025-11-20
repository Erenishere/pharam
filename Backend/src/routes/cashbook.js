const express = require('express');
const router = express.Router();
const cashBookController = require('../controllers/cashBookController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Cash Book Routes
 * All routes require authentication
 * Most routes require accountant, admin, or relevant role
 */

// Cash Receipt Routes
router.post(
  '/receipts',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  cashBookController.createCashReceipt
);

router.get(
  '/receipts',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  cashBookController.getAllCashReceipts
);

router.get(
  '/receipts/pending',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getPendingReceipts
);

router.get(
  '/receipts/statistics',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getReceiptStatistics
);

router.get(
  '/receipts/:id',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  cashBookController.getCashReceiptById
);

router.put(
  '/receipts/:id',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.updateCashReceipt
);

router.post(
  '/receipts/:id/clear',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.clearCashReceipt
);

router.post(
  '/receipts/:id/cancel',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.cancelCashReceipt
);

// Phase 2: Post-Dated Cheque Routes (Requirement 7.1, 7.2, 7.3, 7.4, 7.5)
router.post(
  '/receipts/post-dated-cheque',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  cashBookController.recordPostDatedCheque
);

router.post(
  '/receipts/:id/clear-cheque',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.clearCheque
);

router.post(
  '/receipts/:id/bounce-cheque',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.bounceCheque
);

router.get(
  '/receipts/pending-cheques',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getPendingCheques
);

// Phase 2: Invoice Payment Application Routes (Requirement 8.1, 8.3)
router.post(
  '/receipts/apply-to-invoices',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  cashBookController.applyPaymentToInvoices
);

router.get(
  '/customers/:customerId/pending-invoices',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  cashBookController.getPendingInvoices
);

// Cash Payment Routes
router.post(
  '/payments',
  authenticate,
  authorize(['accountant', 'admin', 'purchase']),
  cashBookController.createCashPayment
);

router.get(
  '/payments',
  authenticate,
  authorize(['accountant', 'admin', 'purchase']),
  cashBookController.getAllCashPayments
);

router.get(
  '/payments/pending',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getPendingPayments
);

router.get(
  '/payments/statistics',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getPaymentStatistics
);

router.get(
  '/payments/:id',
  authenticate,
  authorize(['accountant', 'admin', 'purchase']),
  cashBookController.getCashPaymentById
);

router.put(
  '/payments/:id',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.updateCashPayment
);

router.post(
  '/payments/:id/clear',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.clearCashPayment
);

router.post(
  '/payments/:id/cancel',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.cancelCashPayment
);

// Cash Book Reports Routes
router.get(
  '/balance',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getCashBookBalance
);

router.get(
  '/summary',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getCashBookSummary
);

router.get(
  '/cash-flow',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getCashFlowStatement
);

router.get(
  '/daily',
  authenticate,
  authorize(['accountant', 'admin']),
  cashBookController.getDailyCashBook
);

module.exports = router;
