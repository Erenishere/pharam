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

/**
 * @swagger
 * /api/batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - batchNumber
 *               - quantity
 *               - unitCost
 *               - manufacturingDate
 *               - expiryDate
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item
 *               batchNumber:
 *                 type: string
 *                 description: Batch/Lot number
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Total quantity in the batch
 *               unitCost:
 *                 type: number
 *                 minimum: 0
 *                 description: Cost per unit
 *               manufacturingDate:
 *                 type: string
 *                 format: date
 *                 description: Manufacturing date (YYYY-MM-DD)
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Expiry date (YYYY-MM-DD)
 *               locationId:
 *                 type: string
 *                 description: ID of the storage location
 *               supplierId:
 *                 type: string
 *                 description: ID of the supplier
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number (e.g., PO number)
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Batch created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, authorize(['admin', 'inventory_manager']), batchController.createBatch);

/**
 * @swagger
 * /api/batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch details
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, batchController.getBatch);

/**
 * @swagger
 * /api/batches/{id}:
 *   put:
 *     summary: Update batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchNumber:
 *                 type: string
 *                 description: Batch/Lot number
 *               manufacturingDate:
 *                 type: string
 *                 format: date
 *                 description: Manufacturing date (YYYY-MM-DD)
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Expiry date (YYYY-MM-DD)
 *               locationId:
 *                 type: string
 *                 description: ID of the storage location
 *               supplierId:
 *                 type: string
 *                 description: ID of the supplier
 *               status:
 *                 type: string
 *                 enum: [active, expired, depleted, quarantined]
 *                 description: Batch status
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, authorize(['admin', 'inventory_manager']), batchController.updateBatch);

/**
 * @swagger
 * /api/batches/{id}:
 *   delete:
 *     summary: Delete a batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch deleted successfully
 *       400:
 *         description: Cannot delete batch with remaining quantity
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, authorize(['admin', 'inventory_manager']), batchController.deleteBatch);

/**
 * @swagger
 * /api/items/{itemId}/batches:
 *   get:
 *     summary: Get batches by item
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, depleted, quarantined]
 *         description: Filter by status
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *         description: Include expired batches
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *         description: Filter by location ID
 *     responses:
 *       200:
 *         description: List of batches
 *       500:
 *         description: Server error
 */
router.get('/items/:itemId/batches', authenticate, batchController.getBatchesByItem);

/**
 * @swagger
 * /api/locations/{locationId}/batches:
 *   get:
 *     summary: Get batches by location
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, depleted, quarantined]
 *         description: Filter by status
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter by item ID
 *     responses:
 *       200:
 *         description: List of batches
 *       500:
 *         description: Server error
 */
router.get('/locations/:locationId/batches', authenticate, batchController.getBatchesByLocation);

/**
 * @swagger
 * /api/batches/expiring-soon:
 *   get:
 *     summary: Get batches expiring soon
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to check for expiry
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *         description: Filter by location ID
 *     responses:
 *       200:
 *         description: List of batches expiring soon
 *       500:
 *         description: Server error
 */
router.get('/batches/expiring-soon', authenticate, batchController.getExpiringBatches);

/**
 * @swagger
 * /api/batches/expired:
 *   get:
 *     summary: Get expired batches
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *         description: Filter by location ID
 *     responses:
 *       200:
 *         description: List of expired batches
 *       500:
 *         description: Server error
 */
router.get('/batches/expired', authenticate, batchController.getExpiredBatches);

/**
 * @swagger
 * /api/batches/{id}/quantity:
 *   patch:
 *     summary: Update batch quantity
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 description: Quantity to add (positive) or remove (negative)
 *               referenceId:
 *                 type: string
 *                 description: Reference ID for the transaction
 *               notes:
 *                 type: string
 *                 description: Notes about the quantity update
 *     responses:
 *       200:
 *         description: Batch quantity updated successfully
 *       400:
 *         description: Invalid quantity or insufficient stock
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/quantity', authenticate, authorize(['admin', 'inventory_manager']), batchController.updateBatchQuantity);

/**
 * @swagger
 * /api/batches/statistics:
 *   get:
 *     summary: Get batch statistics
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter by item ID
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *         description: Filter by location ID
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, depleted, quarantined]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Batch statistics
 *       500:
 *         description: Server error
 */
router.get('/batches/statistics', authenticate, batchController.getBatchStatistics);

/**
 * @swagger
 * /api/items/{itemId}/next-batch-number:
 *   get:
 *     summary: Get next available batch number
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Next batch number
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.get('/items/:itemId/next-batch-number', authenticate, batchController.getNextBatchNumber);

module.exports = router;
