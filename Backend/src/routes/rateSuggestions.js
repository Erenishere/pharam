const express = require('express');
const router = express.Router();
const rateSuggestionController = require('../controllers/rateSuggestionController');

/**
 * Rate Suggestion Routes
 * Phase 2 - Requirement 18.4, 18.5
 * Task 61: Implement rate copying functionality
 */

// Get rate suggestions for invoice item
// GET /api/rate-suggestions?itemId=xxx&partyId=yyy&transactionType=sales
router.get('/', rateSuggestionController.getRateSuggestions);

// Get item transaction history with a party
// GET /api/rate-suggestions/transaction-history?itemId=xxx&partyId=yyy&limit=10
router.get('/transaction-history', rateSuggestionController.getItemTransactionHistory);

module.exports = router;
