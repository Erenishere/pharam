const StockTransferService = require('../services/stockTransferService');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * @swagger
 * tags:
 *   name: Stock Transfers
 *   description: Stock transfer management
 */

/**
 * @swagger
 * /api/stock-transfers:
 *   post:
 *     summary: Create a new stock transfer
 *     tags: [Stock Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromWarehouse
 *               - toWarehouse
 *               - items
 *             properties:
 *               fromWarehouse:
 *                 type: string
 *                 description: Source warehouse ID
 *               toWarehouse:
 *                 type: string
 *                 description: Destination warehouse ID
 *               transferDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the transfer occurred (defaults to now)
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number for the transfer
 *               notes:
 *                 type: string
 *                 description: Optional notes about the transfer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - quantity
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       description: ID of the item to transfer
 *                     quantity:
 *                       type: number
 *                       minimum: 0.0001
 *                       description: Quantity to transfer
 *                     batchInfo:
 *                       type: object
 *                       properties:
 *                         batchNumber:
 *                           type: string
 *                           description: Batch number (required if item is batch tracked)
 *                         expiryDate:
 *                           type: string
 *                           format: date
 *                           description: Expiry date of the batch
 *     responses:
 *       201:
 *         description: Stock transfer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockTransfer'
 *       400:
 *         description: Invalid input or insufficient stock
 *       404:
 *         description: Warehouse or item not found
 */
const createTransfer = catchAsync(async (req, res, next) => {
  const transferData = {
    ...req.body,
    createdBy: req.user.id,
  };

  const transfer = await StockTransferService.createTransfer(transferData);
  
  res.status(201).json({
    status: 'success',
    data: {
      transfer,
    },
  });
});

/**
 * @swagger
 * /api/stock-transfers/{id}:
 *   get:
 *     summary: Get a stock transfer by ID
 *     tags: [Stock Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     responses:
 *       200:
 *         description: Stock transfer details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockTransfer'
 *       404:
 *         description: Transfer not found
 */
const getTransfer = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const transfer = await StockTransferService.getTransferById(id);
  
  if (!transfer) {
    return next(new AppError('No transfer found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      transfer,
    },
  });
});

/**
 * @swagger
 * /api/stock-transfers:
 *   get:
 *     summary: Get all stock transfers with filtering
 *     tags: [Stock Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromWarehouse
 *         schema:
 *           type: string
 *         description: Filter by source warehouse ID
 *       - in: query
 *         name: toWarehouse
 *         schema:
 *           type: string
 *         description: Filter by destination warehouse ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by transfer date (start)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by transfer date (end)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_transit, completed, cancelled, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of stock transfers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: object
 *                   properties:
 *                     transfers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StockTransfer'
 */
const getTransfers = catchAsync(async (req, res, next) => {
  const { fromWarehouse, toWarehouse, startDate, endDate, status, page = 1, limit = 10 } = req.query;
  
  const filters = {};
  if (fromWarehouse) filters.fromWarehouse = fromWarehouse;
  if (toWarehouse) filters.toWarehouse = toWarehouse;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (status) filters.status = status;
  
  const result = await StockTransferService.getTransfers(
    filters,
    parseInt(page, 10),
    parseInt(limit, 10)
  );
  
  res.status(200).json({
    status: 'success',
    results: result.data.length,
    data: {
      transfers: result.data,
      pagination: result.pagination,
    },
  });
});

/**
 * @swagger
 * /api/stock-transfers/{id}/status:
 *   patch:
 *     summary: Update transfer status
 *     tags: [Stock Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_transit, completed, cancelled, rejected]
 *                 description: New status
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockTransfer'
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Transfer not found
 */
const updateTransferStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const transfer = await StockTransferService.updateTransferStatus(
    id,
    status,
    req.user.id
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      transfer,
    },
  });
});

module.exports = {
  createTransfer,
  getTransfer,
  getTransfers,
  updateTransferStatus,
};
