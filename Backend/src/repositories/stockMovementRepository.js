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
    return movement.save();
  }

  /**
   * Create multiple stock movements in bulk
   * @param {Array} movementsData - Array of stock movement data
   * @returns {Promise<Array>} Created stock movements
   */
  async createBulk(movementsData) {
    return StockMovement.insertMany(movementsData);
  }

  /**
   * Find stock movement by ID
   * @param {string} id - Movement ID
   * @returns {Promise<Object>} Stock movement
   */
  async findById(id) {
    return StockMovement.findById(id)
      .populate('itemId', 'code name unit')
      .populate('createdBy', 'username email');
  }

  /**
   * Find stock movements by item
   * @param {string} itemId - Item ID
   * @param {number} limit - Maximum number of records
   * @returns {Promise<Array>} Stock movements
   */
  async findByItem(itemId, limit = 50) {
    return StockMovement.findByItem(itemId, limit);
  }

  /**
   * Find stock movements by reference
   * @param {string} referenceType - Reference type (e.g., 'sales_invoice')
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Array>} Stock movements
   */
  async findByReference(referenceType, referenceId) {
    return StockMovement.findByReference(referenceType, referenceId);
  }

  /**
   * Find stock movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Stock movements
   */
  async findByDateRange(startDate, endDate) {
    return StockMovement.findByDateRange(startDate, endDate);
  }

  /**
   * Calculate stock balance for an item
   * @param {string} itemId - Item ID
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<number>} Stock balance
   */
  async calculateStockBalance(itemId, asOfDate = new Date()) {
    return StockMovement.calculateStockBalance(itemId, asOfDate);
  }

  /**
   * Find expired batches
   * @returns {Promise<Array>} Expired batches
   */
  async findExpiredBatches() {
    return StockMovement.findExpiredBatches();
  }

  /**
   * Get movements summary for an item
   * @param {string} itemId - Item ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Movements summary
   */
  async getMovementsSummary(itemId, days = 30) {
    return StockMovement.getMovementsSummary(itemId, days);
  }

  /**
   * Search stock movements with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Stock movements
   */
  async search(filters = {}, options = {}) {
    const query = StockMovement.find(filters)
      .populate('itemId', 'code name unit')
      .populate('createdBy', 'username');

    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ movementDate: -1 });
    }

    if (options.limit) {
      query.limit(parseInt(options.limit, 10));
    }

    if (options.skip) {
      query.skip(parseInt(options.skip, 10));
    }

    return query.exec();
  }

  /**
   * Count stock movements matching filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count
   */
  async count(filters = {}) {
    return StockMovement.countDocuments(filters);
  }

  /**
   * Delete stock movements by reference
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByReference(referenceType, referenceId) {
    return StockMovement.deleteMany({ referenceType, referenceId });
  }
}

module.exports = new StockMovementRepository();
