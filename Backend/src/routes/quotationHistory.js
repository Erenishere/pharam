const express = require('express');
const router = express.Router();
const quotationHistoryController = require('../controllers/quotationHistoryController');

/**
 * QuotationHistory Routes
 * Phase 2 - Requirement 18.1, 18.2
 * Task 59.4
 */

// Get quotation history for item and party
// GET /api/quotation-history?itemId=xxx&partyId=yyy&limit=10
router.get('/', quotationHistoryController.getQuotationHistory);

// Get latest quotation rate for item and party
// GET /api/quotation-history/latest?itemId=xxx&partyId=yyy
router.get('/latest', quotationHistoryController.getLatestRate);

// Get quotation history by transaction type
// GET /api/quotation-history/by-type?itemId=xxx&transactionType=sales&limit=10
router.get('/by-type', quotationHistoryController.getHistoryByType);

// Get all history for an item
// GET /api/quotation-history/item/:itemId?limit=50&startDate=xxx&endDate=yyy
router.get('/item/:itemId', quotationHistoryController.getItemHistory);

module.exports = router;
