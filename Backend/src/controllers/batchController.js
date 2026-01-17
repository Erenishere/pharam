const batchService = require('../services/batchService');

// Error response helper
const errorResponse = (res, status, message, code = 'ERROR') => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  });
};

// Success response helper
const successResponse = (res, data, message, status = 200, pagination = null) => {
  const response = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(status).json(response);
};

/**
 * Create a new batch
 * @route POST /api/batches
 */
const createBatch = async (req, res) => {
  try {
    const batch = await batchService.createBatch({
      ...req.body,
      createdBy: req.user.id
    });
    return successResponse(res, batch, 'Batch created successfully', 201);
  } catch (error) {
    console.error('Create batch error:', error);
    return errorResponse(res, 400, error.message, 'BATCH_CREATE_ERROR');
  }
};

/**
 * Get batch by ID
 * @route GET /api/batches/:id
 */
const getBatch = async (req, res) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    return successResponse(res, batch, 'Batch retrieved successfully');
  } catch (error) {
    console.error('Get batch error:', error);
    if (error.message === 'Batch not found') {
      return errorResponse(res, 404, 'Batch not found', 'BATCH_NOT_FOUND');
    }
    return errorResponse(res, 500, 'Failed to retrieve batch', 'SERVER_ERROR');
  }
};

/**
 * Get all batches with filtering and pagination
 * @route GET /api/batches
 */
const getAllBatches = async (req, res) => {
  try {
    const filters = {};
    const pagination = {};

    // Extract filter parameters
    if (req.query.itemSearch) {
      filters.itemSearch = req.query.itemSearch;
    }

    if (req.query.locationIds) {
      filters.locationIds = req.query.locationIds.split(',');
    }

    if (req.query.supplierIds) {
      filters.supplierIds = req.query.supplierIds.split(',');
    }

    if (req.query.statuses) {
      filters.statuses = req.query.statuses.split(',');
    }

    if (req.query.expiryStart || req.query.expiryEnd) {
      filters.expiryDateRange = {};
      if (req.query.expiryStart) {
        filters.expiryDateRange.start = new Date(req.query.expiryStart);
      }
      if (req.query.expiryEnd) {
        filters.expiryDateRange.end = new Date(req.query.expiryEnd);
      }
    }

    if (req.query.quantityMin || req.query.quantityMax) {
      filters.quantityRange = {};
      if (req.query.quantityMin) {
        filters.quantityRange.min = parseInt(req.query.quantityMin);
      }
      if (req.query.quantityMax) {
        filters.quantityRange.max = parseInt(req.query.quantityMax);
      }
    }

    if (req.query.includeExpired !== undefined) {
      filters.includeExpired = req.query.includeExpired === 'true';
    }

    if (req.query.includeDepleted !== undefined) {
      filters.includeDepleted = req.query.includeDepleted === 'true';
    }

    // Extract pagination parameters
    if (req.query.page) {
      pagination.page = parseInt(req.query.page);
    }

    if (req.query.limit) {
      pagination.limit = parseInt(req.query.limit);
    }

    if (req.query.sortBy) {
      pagination.sortBy = req.query.sortBy;
    }

    if (req.query.sortOrder) {
      pagination.sortOrder = req.query.sortOrder;
    }

    const result = await batchService.getAllBatches(filters, pagination);
    return successResponse(res, result.data, 'Batches retrieved successfully', 200, result.pagination);
  } catch (error) {
    console.error('Get all batches error:', error);
    return errorResponse(res, 500, 'Failed to retrieve batches', 'SERVER_ERROR');
  }
};

/**
 * Update batch
 * @route PUT /api/batches/:id
 */
const updateBatch = async (req, res) => {
  try {
    const batch = await batchService.updateBatch(req.params.id, {
      ...req.body,
      updatedBy: req.user.id
    });
    return successResponse(res, batch, 'Batch updated successfully');
  } catch (error) {
    console.error('Update batch error:', error);
    if (error.message === 'Batch not found') {
      return errorResponse(res, 404, 'Batch not found', 'BATCH_NOT_FOUND');
    }
    return errorResponse(res, 400, error.message, 'BATCH_UPDATE_ERROR');
  }
};

/**
 * Delete batch
 * @route DELETE /api/batches/:id
 */
const deleteBatch = async (req, res) => {
  try {
    await batchService.deleteBatch(req.params.id);
    return successResponse(res, null, 'Batch deleted successfully');
  } catch (error) {
    console.error('Delete batch error:', error);
    if (error.message === 'Batch not found') {
      return errorResponse(res, 404, 'Batch not found', 'BATCH_NOT_FOUND');
    }
    return errorResponse(res, 400, error.message, 'BATCH_DELETE_ERROR');
  }
};

/**
 * Get batches by item
 * @route GET /api/items/:itemId/batches
 */
const getBatchesByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, includeExpired, locationId } = req.query;

    const batches = await batchService.getBatchesByItem(itemId, {
      status,
      includeExpired: includeExpired === 'true',
      locationId
    });

    return successResponse(res, batches, 'Batches retrieved successfully');
  } catch (error) {
    console.error('Get batches by item error:', error);
    return errorResponse(res, 500, 'Failed to retrieve batches', 'SERVER_ERROR');
  }
};

/**
 * Get batches by location
 * @route GET /api/locations/:locationId/batches
 */
const getBatchesByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { status, itemId } = req.query;

    const batches = await batchService.getBatchesByLocation(locationId, {
      status,
      itemId
    });

    return successResponse(res, batches, 'Batches retrieved successfully');
  } catch (error) {
    console.error('Get batches by location error:', error);
    return errorResponse(res, 500, 'Failed to retrieve batches', 'SERVER_ERROR');
  }
};

/**
 * Get batches expiring soon
 * @route GET /api/batches/expiring-soon
 */
const getExpiringBatches = async (req, res) => {
  try {
    const { days = 30, locationId } = req.query;
    const batches = await batchService.getExpiringBatches({
      days: parseInt(days, 10),
      locationId
    });

    return successResponse(res, batches, 'Expiring batches retrieved successfully');
  } catch (error) {
    console.error('Get expiring batches error:', error);
    return errorResponse(res, 500, 'Failed to retrieve expiring batches', 'SERVER_ERROR');
  }
};

/**
 * Get expired batches
 * @route GET /api/batches/expired
 */
const getExpiredBatches = async (req, res) => {
  try {
    const { locationId } = req.query;
    const batches = await batchService.getExpiredBatches({ locationId });
    return successResponse(res, batches, 'Expired batches retrieved successfully');
  } catch (error) {
    console.error('Get expired batches error:', error);
    return errorResponse(res, 500, 'Failed to retrieve expired batches', 'SERVER_ERROR');
  }
};

/**
 * Update batch quantity
 * @route PATCH /api/batches/:id/quantity
 */
const updateBatchQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, referenceId, notes } = req.body;

    if (quantity === undefined || quantity === 0) {
      return errorResponse(res, 400, 'Quantity is required and cannot be zero', 'INVALID_QUANTITY');
    }

    const batch = await batchService.updateBatchQuantity(id, parseFloat(quantity), {
      referenceId,
      notes,
      userId: req.user.id
    });

    return successResponse(res, batch, 'Batch quantity updated successfully');
  } catch (error) {
    console.error('Update batch quantity error:', error);
    if (error.message === 'Batch not found') {
      return errorResponse(res, 404, 'Batch not found', 'BATCH_NOT_FOUND');
    }
    if (error.message === 'Insufficient quantity in batch') {
      return errorResponse(res, 400, error.message, 'INSUFFICIENT_QUANTITY');
    }
    return errorResponse(res, 500, 'Failed to update batch quantity', 'SERVER_ERROR');
  }
};

/**
 * Get batch statistics
 * @route GET /api/batches/statistics
 */
const getBatchStatistics = async (req, res) => {
  try {
    const { itemId, locationId, supplierId, status } = req.query;
    const stats = await batchService.getBatchStatistics({
      itemId,
      locationId,
      supplierId,
      status
    });

    return successResponse(res, stats, 'Batch statistics retrieved successfully');
  } catch (error) {
    console.error('Get batch statistics error:', error);
    return errorResponse(res, 500, 'Failed to retrieve batch statistics', 'SERVER_ERROR');
  }
};

/**
 * Get next available batch number
 * @route GET /api/items/:itemId/next-batch-number
 */
const getNextBatchNumber = async (req, res) => {
  try {
    const { itemId } = req.params;
    const batchNumber = await batchService.getNextBatchNumber(itemId);
    return successResponse(res, { batchNumber }, 'Next batch number generated successfully');
  } catch (error) {
    console.error('Get next batch number error:', error);
    if (error.message === 'Item not found') {
      return errorResponse(res, 404, 'Item not found', 'ITEM_NOT_FOUND');
    }
    return errorResponse(res, 500, 'Failed to generate batch number', 'SERVER_ERROR');
  }
};

module.exports = {
  createBatch,
  getBatch,
  getAllBatches,
  updateBatch,
  deleteBatch,
  getBatchesByItem,
  getBatchesByLocation,
  getExpiringBatches,
  getExpiredBatches,
  updateBatchQuantity,
  getBatchStatistics,
  getNextBatchNumber
};
