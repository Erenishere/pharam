const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const batchController = require('../controllers/batchController');

/**
 * @swagger
 * tags:
 *   name: Batches
 *   description: Batch and expiry management
 */

// Specific routes MUST come before parameterized routes (/:id)
router.get('/statistics', authenticate, batchController.getBatchStatistics);
router.get('/expiring-soon', authenticate, batchController.getExpiringBatches);
router.get('/expired', authenticate, batchController.getExpiredBatches);

// Base routes (assuming mounted at /api/v1/batches)
router.post('/', authenticate, authorize(['admin', 'inventory_manager']), batchController.createBatch);
router.get('/', authenticate, batchController.getAllBatches);
router.get('/:id', authenticate, batchController.getBatch);
router.put('/:id', authenticate, authorize(['admin', 'inventory_manager']), batchController.updateBatch);
router.delete('/:id', authenticate, authorize(['admin', 'inventory_manager']), batchController.deleteBatch);
router.patch('/:id/quantity', authenticate, authorize(['admin', 'inventory_manager']), batchController.updateBatchQuantity);

module.exports = router;
