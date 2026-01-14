const express = require('express');
const router = express.Router();
const accountsController = require('../controllers/accountsController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Accounts Routes
 * All routes require authentication
 * Most routes require accountant or admin role
 */

// Ledger entries routes
router.get(
  '/ledger',
  authenticate,
  authorize(['accountant', 'admin']),
  accountsController.getLedgerEntries
);

router.get(
  '/ledger/:id',
  authenticate,
  authorize(['accountant', 'admin']),
  accountsController.getLedgerEntryById
);

// Account balance routes
router.get(
  '/balance/:accountId',
  authenticate,
  authorize(['accountant', 'admin', 'sales', 'purchase']),
  accountsController.getAccountBalance
);

router.post(
  '/balances',
  authenticate,
  authorize(['accountant', 'admin']),
  accountsController.getAccountBalances
);

// Account statement route
router.get(
  '/statement/:accountId',
  authenticate,
  authorize(['accountant', 'admin', 'sales', 'purchase']),
  accountsController.getAccountStatement
);

// Receivables routes
router.get(
  '/receivables/aging',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  accountsController.getReceivablesAging
);

router.get(
  '/receivables/summary/:customerId',
  authenticate,
  authorize(['accountant', 'admin', 'sales']),
  accountsController.getCustomerReceivablesSummary
);

// Payables routes
router.get(
  '/payables',
  authenticate,
  authorize(['accountant', 'admin', 'purchase']),
  accountsController.getSupplierPayables
);

router.get(
  '/payables/summary/:supplierId',
  authenticate,
  authorize(['accountant', 'admin', 'purchase']),
  accountsController.getSupplierPayablesSummary
);

// Financial reports routes
router.get(
  '/trial-balance',
  authenticate,
  authorize(['accountant', 'admin']),
  accountsController.getTrialBalance
);

router.get(
  '/summary/:accountType',
  authenticate,
  authorize(['accountant', 'admin']),
  accountsController.getLedgerSummary
);

module.exports = router;
