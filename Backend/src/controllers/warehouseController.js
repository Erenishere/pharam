const warehouseService = require('../services/warehouseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * @swagger
 * tags:
 *   name: Warehouses
 *   description: Warehouse management endpoints
 */

/**
 * @swagger
 * /api/warehouses:
 *   post:
 *     summary: Create a new warehouse
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Warehouse'
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
const createWarehouse = catchAsync(async (req, res, next) => {
  const warehouse = await warehouseService.createWarehouse(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      warehouse,
    },
  });
});

/**
 * @swagger
 * /api/warehouses/{id}:
 *   get:
 *     summary: Get a warehouse by ID
 *     tags: [Warehouses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Warehouse details
 *       404:
 *         description: Warehouse not found
 */
const getWarehouse = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const warehouse = await warehouseService.getWarehouseById(id, {
    populateInventory: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      warehouse,
    },
  });
});

/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Warehouses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (name, code, or location)
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of warehouses
 */
const getAllWarehouses = catchAsync(async (req, res, next) => {
  const { search, city, country, isActive } = req.query;
  const { page, limit } = req.query;

  const result = await warehouseService.getAllWarehouses(
    { search, city, country, isActive },
    { page, limit }
  );

  res.status(200).json({
    status: 'success',
    pagination: result.pagination,
    data: {
      warehouses: result.data,
    },
  });
});

/**
 * @swagger
 * /api/warehouses/{id}:
 *   put:
 *     summary: Update a warehouse (full update)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Warehouse'
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Warehouse not found
 *   patch:
 *     summary: Update a warehouse (partial update)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Warehouse'
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Warehouse not found
 */
const updateWarehouse = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const warehouse = await warehouseService.updateWarehouse(id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      warehouse,
    },
  });
});

/**
 * @swagger
 * /api/warehouses/{id}:
 *   delete:
 *     summary: Delete a warehouse
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     responses:
 *       204:
 *         description: Warehouse deleted successfully
 *       400:
 *         description: Cannot delete warehouse with inventory
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Warehouse not found
 */
const deleteWarehouse = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  await warehouseService.deleteWarehouse(id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * @swagger
 * /api/warehouses/{id}/toggle-status:
 *   patch:
 *     summary: Toggle warehouse active status
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Warehouse ID
 *     responses:
 *       200:
 *         description: Warehouse status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Warehouse not found
 */
const toggleWarehouseStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const warehouse = await warehouseService.toggleWarehouseStatus(id);

  res.status(200).json({
    status: 'success',
    data: {
      warehouse,
    },
  });
});

/**
 * @swagger
 * /api/warehouses/statistics:
 *   get:
 *     summary: Get warehouse statistics
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouse statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WarehouseStatistics'
 */
const getWarehouseStatistics = catchAsync(async (req, res, next) => {
  const statistics = await warehouseService.getWarehouseStatistics();

  res.status(200).json({
    status: 'success',
    data: {
      statistics,
    },
  });
});

module.exports = {
  createWarehouse,
  getWarehouse,
  getAllWarehouses,
  updateWarehouse,
  deleteWarehouse,
  toggleWarehouseStatus,
  getWarehouseStatistics,
};
