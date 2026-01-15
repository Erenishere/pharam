const express = require('express');
const stockMovementController = require('../controllers/stockMovementController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All stock movement routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/stock-movements
 * @desc    Get all stock movements with filtering and pagination
 * @access  Private
 * @query   itemId, movementType, referenceType, startDate, endDate, page, limit, sortBy, sortOrder
 */
router.get('/', stockMovementController.getMovements);

/**
 * @route   GET /api/v1/stock-movements/statistics
 * @desc    Get stock movement statistics
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/statistics', stockMovementController.getMovementStatistics);

/**
 * @route   GET /api/v1/stock-movements/item-wise-report
 * @desc    Get item-wise movement report
 * @access  Private
 * @query   startDate (required), endDate (required)
 */
router.get('/item-wise-report', stockMovementController.getItemWiseMovementReport);

/**
 * @route   GET /api/v1/stock-movements/expired-batches
 * @desc    Get expired batches
 * @access  Private
 */
router.get('/expired-batches', stockMovementController.getExpiredBatches);

/**
 * @route   GET /api/v1/stock-movements/low-stock
 * @desc    Get low stock items with movement data
 * @access  Private
 * @query   days (optional, default: 30)
 */
router.get('/low-stock', stockMovementController.getLowStockItems);

/**
 * @route   GET /api/v1/stock-movements/validate-availability
 * @desc    Validate stock availability
 * @access  Private
 * @query   itemId (required), quantity (required)
 */
router.get('/validate-availability', stockMovementController.validateStockAvailability);

/**
 * @route   GET /api/v1/stock-movements/by-date-range
 * @desc    Get stock movements by date range
 * @access  Private
 * @query   startDate (required), endDate (required), itemId, movementType
 */
router.get('/by-date-range', stockMovementController.getMovementsByDateRange);

/**
 * @route   GET /api/v1/stock-movements/:id
 * @desc    Get stock movement by ID
 * @access  Private
 */
router.get('/:id', stockMovementController.getMovementById);

/**
 * @route   GET /api/v1/stock-movements/item/:itemId
 * @desc    Get stock movements for a specific item
 * @access  Private
 * @query   limit (optional, default: 50)
 */
router.get('/item/:itemId', stockMovementController.getMovementsByItem);

/**
 * @route   GET /api/v1/stock-movements/item/:itemId/history
 * @desc    Get stock movement history for an item
 * @access  Private
 * @query   days (optional, default: 30)
 */
router.get('/item/:itemId/history', stockMovementController.getItemMovementHistory);

/**
 * @route   GET /api/v1/stock-movements/item/:itemId/balance
 * @desc    Get stock balance for an item
 * @access  Private
 * @query   asOfDate (optional, defaults to today)
 */
router.get('/item/:itemId/balance', stockMovementController.getStockBalance);

/**
 * @route   POST /api/v1/stock-movements/adjustment
 * @desc    Record stock adjustment
 * @access  Private
 * @body    itemId (required), quantity (required), reason (required)
 */
router.post('/adjustment', stockMovementController.recordAdjustment);

/**
 * @route   POST /api/v1/stock-movements/correction
 * @desc    Record stock correction based on physical count
 * @access  Private
 * @body    itemId (required), actualStock (required), reason (required)
 */
router.post('/correction', stockMovementController.recordCorrection);

module.exports = router;
