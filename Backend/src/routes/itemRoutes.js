const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item management and retrieval
 */

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items with filtering and pagination
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Items per page (max 100)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field and direction (e.g., 'name:asc' or 'price:desc')
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword (searches in name, description, and code)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter low stock items
 *     responses:
 *       200:
 *         description: List of items with pagination info
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, itemController.getAllItems);

/**
 * @swagger
 * /api/items/scan-barcode:
 *   post:
 *     summary: Scan barcode to find item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barcode
 *             properties:
 *               barcode:
 *                 type: string
 *                 description: Item barcode
 *     responses:
 *       200:
 *         description: Item found with stock details
 *       400:
 *         description: Barcode is required or item is not active
 *       404:
 *         description: Item not found with the provided barcode
 *       500:
 *         description: Internal server error
 */
router.post('/scan-barcode', authenticate, itemController.scanBarcode);

/**
 * @swagger
 * /api/items/low-stock:
 *   get:
 *     summary: Get low stock items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of low stock items
 *       500:
 *         description: Internal server error
 */
router.get('/low-stock', authenticate, itemController.getLowStockItems);

/**
 * @swagger
 * /api/items/categories:
 *   get:
 *     summary: Get all item categories
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of item categories
 *       500:
 *         description: Internal server error
 */
router.get('/categories', authenticate, itemController.getItemCategories);

/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item data
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, itemController.getItemById);

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pricing
 *             properties:
 *               code:
 *                 type: string
 *                 description: Unique item code
 *               name:
 *                 type: string
 *                 description: Item name
 *               description:
 *                 type: string
 *                 description: Item description
 *               category:
 *                 type: string
 *                 description: Item category
 *               pricing:
 *                 type: object
 *                 required:
 *                   - costPrice
 *                   - salePrice
 *                 properties:
 *                   costPrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Cost price of the item
 *                   salePrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Selling price of the item
 *               inventory:
 *                 type: object
 *                 properties:
 *                   currentStock:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                   minimumStock:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                   maximumStock:
 *                     type: number
 *                     minimum: 0
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, authorize(['admin', 'inventory_manager']), itemController.createItem);

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update an existing item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Unique item code
 *               name:
 *                 type: string
 *                 description: Item name
 *               description:
 *                 type: string
 *                 description: Item description
 *               category:
 *                 type: string
 *                 description: Item category
 *               pricing:
 *                 type: object
 *                 properties:
 *                   costPrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Cost price of the item
 *                   salePrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Selling price of the item
 *               inventory:
 *                 type: object
 *                 properties:
 *                   currentStock:
 *                     type: number
 *                     minimum: 0
 *                   minimumStock:
 *                     type: number
 *                     minimum: 0
 *                   maximumStock:
 *                     type: number
 *                     minimum: 0
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, authorize(['admin', 'inventory_manager']), itemController.updateItem);

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete an item (soft delete)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, authorize(['admin', 'inventory_manager']), itemController.deleteItem);

/**
 * @swagger
 * /api/items/{id}/stock:
 *   patch:
 *     summary: Update item stock
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
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
 *                 minimum: 0
 *                 description: Quantity to add or subtract
 *               operation:
 *                 type: string
 *                 enum: [add, subtract]
 *                 default: add
 *                 description: Whether to add or subtract the quantity
 *     responses:
 *       200:
 *         description: Item stock updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/stock', authenticate, authorize(['admin', 'inventory_manager']), itemController.updateItemStock);

/**
 * @swagger
 * /api/inventory/transfer:
 *   post:
 *     summary: Transfer stock between warehouses
 *     tags: [Items]
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
 *               - fromWarehouseId
 *               - toWarehouseId
 *               - quantity
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item to transfer
 *               fromWarehouseId:
 *                 type: string
 *                 description: Source warehouse ID
 *               toWarehouseId:
 *                 type: string
 *                 description: Destination warehouse ID
 *               quantity:
 *                 type: number
 *                 minimum: 0.0001
 *                 description: Quantity to transfer
 *               reason:
 *                 type: string
 *                 description: Optional reason for the transfer
 *     responses:
 *       201:
 *         description: Stock transferred successfully
 *       400:
 *         description: Invalid input or insufficient stock
 *       404:
 *         description: Warehouse or item not found
 */
router.post('/transfer', authenticate, authorize(['admin', 'inventory_manager']), itemController.transferStock);

module.exports = router;
