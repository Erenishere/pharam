const StockMovement = require('../models/StockMovement');

/**
 * Stock Movement Repository
 * Handles database operations for stock movements
 */
class StockMovementRepository {
  /**
   * Create a new stock movement
   * @param {Object} movementData - Stock movement data
   * @returns {Promise<Object>} Created stock movement
   */
  async create(movementData) {
    const movement = new StockMovement(movementData);
    return await movement.save();
  }

  /**
   * Create multiple stock movements
   * @param {Array} movementsData - Array of stock movement data
   * @returns {Promise<Array>} Created stock movements
   */
  async createMany(movementsData) {
    return await StockMovement.insertMany(movementsData);
  }

  /**
   * Find stock movement by ID
   * @param {String} id - Movement ID
   * @returns {Promise<Object>} Stock movement
   */
  async findById(id) {
    return await StockMovement.findById(id)
      .populate('itemId', 'code name category unit')
      .populate('createdBy', 'username email');
  }

  /**
   * Find all stock movements with filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options (limit, skip, sort)
   * @returns {Promise<Array>} Stock movements
   */
  async findAll(filters = {}, options = {}) {
    const { limit = 50, skip = 0, sort = { movementDate: -1 } } = options;

    return await StockMovement.find(filters)
      .populate('itemId', 'code name category unit')
      .populate('createdBy', 'username email')
      .sort(sort)
      .limit(limit)
      .skip(skip);
  }

  /**
   * Find stock movements by item
   * @param {String} itemId - Item ID
   * @param {Number} limit - Maximum number of records
   * @returns {Promise<Array>} Stock movements
   */
  async findByItem(itemId, limit = 50) {
    return await StockMovement.findByItem(itemId, limit);
  }

  /**
   * Find stock movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} additionalFilters - Additional filters
   * @returns {Promise<Array>} Stock movements
   */
  async findByDateRange(startDate, endDate, additionalFilters = {}) {
    const query = {
      movementDate: { $gte: startDate, $lte: endDate },
      ...additionalFilters,
    };

    return await StockMovement.find(query)
      .populate('itemId', 'code name category unit')
      .populate('createdBy', 'username email')
      .sort({ movementDate: -1 });
  }

  /**
   * Find stock movements by reference
   * @param {String} referenceType - Reference type
   * @param {String} referenceId - Reference ID
   * @returns {Promise<Array>} Stock movements
   */
  async findByReference(referenceType, referenceId) {
    return await StockMovement.findByReference(referenceType, referenceId);
  }

  /**
   * Find stock movements by batch number
   * @param {String} batchNumber - Batch number
   * @returns {Promise<Array>} Stock movements
   */
  async findByBatchNumber(batchNumber) {
    return await StockMovement.find({ 'batchInfo.batchNumber': batchNumber })
      .populate('itemId', 'code name category unit')
      .sort({ movementDate: -1 });
  }

  /**
   * Find expired batches
   * @returns {Promise<Array>} Expired batch movements
   */
  async findExpiredBatches() {
    return await StockMovement.findExpiredBatches();
  }

  /**
   * Calculate stock balance for an item
   * @param {String} itemId - Item ID
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Number>} Stock balance
   */
  async calculateStockBalance(itemId, asOfDate = new Date()) {
    return await StockMovement.calculateStockBalance(itemId, asOfDate);
  }

  /**
   * Get movements summary for an item
   * @param {String} itemId - Item ID
   * @param {Number} days - Number of days to look back
   * @returns {Promise<Array>} Movements summary
   */
  async getMovementsSummary(itemId, days = 30) {
    return await StockMovement.getMovementsSummary(itemId, days);
  }

  /**
   * Get stock movement statistics
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Movement statistics
   */
  async getStatistics(filters = {}) {
    const stats = await StockMovement.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$movementType',
          totalQuantity: { $sum: { $abs: '$quantity' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      totalMovements: 0,
      inward: { count: 0, quantity: 0 },
      outward: { count: 0, quantity: 0 },
      adjustment: { count: 0, quantity: 0 },
    };

    stats.forEach((stat) => {
      result.totalMovements += stat.count;
      if (stat._id === 'in') {
        result.inward = { count: stat.count, quantity: stat.totalQuantity };
      } else if (stat._id === 'out') {
        result.outward = { count: stat.count, quantity: stat.totalQuantity };
      } else if (stat._id === 'adjustment') {
        result.adjustment = { count: stat.count, quantity: stat.totalQuantity };
      }
    });

    return result;
  }

  /**
   * Get item-wise movement summary
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Item-wise summary
   */
  async getItemWiseSummary(startDate, endDate) {
    return await StockMovement.aggregate([
      {
        $match: {
          movementDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$itemId',
          inwardQuantity: {
            $sum: {
              $cond: [{ $eq: ['$movementType', 'in'] }, { $abs: '$quantity' }, 0],
            },
          },
          outwardQuantity: {
            $sum: {
              $cond: [{ $eq: ['$movementType', 'out'] }, { $abs: '$quantity' }, 0],
            },
          },
          adjustmentQuantity: {
            $sum: {
              $cond: [{ $eq: ['$movementType', 'adjustment'] }, '$quantity', 0],
            },
          },
          movementCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      {
        $unwind: '$item',
      },
      {
        $project: {
          itemCode: '$item.code',
          itemName: '$item.name',
          category: '$item.category',
          inwardQuantity: 1,
          outwardQuantity: 1,
          adjustmentQuantity: 1,
          netMovement: {
            $add: [
              '$inwardQuantity',
              { $multiply: ['$outwardQuantity', -1] },
              '$adjustmentQuantity',
            ],
          },
          movementCount: 1,
        },
      },
      {
        $sort: { movementCount: -1 },
      },
    ]);
  }

  /**
   * Count stock movements
   * @param {Object} filters - Query filters
   * @returns {Promise<Number>} Count of movements
   */
  async count(filters = {}) {
    return await StockMovement.countDocuments(filters);
  }

  /**
   * Delete stock movement by ID
   * @param {String} id - Movement ID
   * @returns {Promise<Object>} Deleted movement
   */
  async deleteById(id) {
    return await StockMovement.findByIdAndDelete(id);
  }

  /**
   * Delete stock movements by reference
   * @param {String} referenceType - Reference type
   * @param {String} referenceId - Reference ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByReference(referenceType, referenceId) {
    return await StockMovement.deleteMany({ referenceType, referenceId });
  }
}

module.exports = new StockMovementRepository();
