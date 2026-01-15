const express = require('express');
const router = express.Router();
const recoverySummaryController = require('../controllers/recoverySummaryController');
const { protect } = require('../middleware/auth');

/**
 * Recovery Summary Routes
 * Phase 2 - Requirement 15: Cash Recovery Summary System
 * Task 52.3: Create recovery summary API endpoints
 */

// Apply authentication middleware to all routes
router.use(protect);

// Statistics endpoint (must be before /:id route)
router.get('/statistics', recoverySummaryController.getRecoveryStatistics);

// Print endpoint
router.get('/:id/print', recoverySummaryController.getRecoverySummaryPrint);

// CRUD routes
router
    .route('/')
    .post(recoverySummaryController.createRecoverySummary)
    .get(recoverySummaryController.getRecoverySummaries);

router
    .route('/:id')
    .get(recoverySummaryController.getRecoverySummaryById)
    .put(recoverySummaryController.updateRecoverySummary)
    .delete(recoverySummaryController.deleteRecoverySummary);

module.exports = router;
