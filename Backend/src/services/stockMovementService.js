const stockMovementRepository = require('../repositories/stockMovementRepository');
const Item = require('../models/Item');

/**
 * Stock Movement Service
 * Handles business logic for stock movements
 */
class StockMovementService {
  /**
   * Record a stock movement
   * @param {Object} movementData - Movement data
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object>} Created movement
   */
  async recordMovement(movementData, userId) {
    const { itemId, movementType, quantity, referenceType, referenceId, batchInfo, movementDate, notes } =
      movementData;

    // Validate item exists
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Validate quantity
    if (!quantity || quantity === 0) {
      throw new Error('Quantity must be a non-zero number');
    }

    // Prepare movement data
    const movement = {
      itemId,
      movementType,
      quantity: this._normalizeQuantity(quantity, movementType),
      referenceType,
      referenceId,
      batchInfo,
      movementDate: movementDate || new Date(),
      notes,
      createdBy: userId,
    };

    // Create movement
    const createdMovement = await stockMovementRepository.create(movement);

    // Update item stock if not already updated by invoice workflow
    if (referenceType === 'adjustment' || referenceType === 'opening_balance') {
      await this._updateItemStock(itemId, movementType, Math.abs(quantity));
    }

    return createdMovement;
  }

  /**
   * Record multiple stock movements
   * @param {Array} movementsData - Array of movement data
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Array>} Created movements
   */
  async recordMultipleMovements(movementsData, userId) {
    const movements = movementsData.map((data) => ({
      ...data,
      quantity: this._normalizeQuantity(data.quantity, data.movementType),
      movementDate: data.movementDate || new Date(),
      createdBy: userId,
    }));

    return await stockMovementRepository.createMany(movements);
  }

  /**
   * Record stock adjustment
   * @param {String} itemId - Item ID
   * @param {Number} adjustmentQuantity - Adjustment quantity (positive or negative)
   * @param {String} reason - Reason for adjustment
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object>} Created movement
   */
  async recordAdjustment(itemId, adjustmentQuantity, reason, userId) {
    if (adjustmentQuantity === 0) {
      throw new Error('Adjustment quantity cannot be zero');
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Determine movement type based on adjustment
    const movementType = 'adjustment';

    const movement = await this.recordMovement(
      {
        itemId,
        movementType,
        quantity: adjustmentQuantity,
        referenceType: 'adjustment',
        notes: reason,
      },
      userId
    );

    return movement;
  }

  /**
   * Record stock correction
   * @param {String} itemId - Item ID
   * @param {Number} actualStock - Actual stock count
   * @param {String} reason - Reason for correction
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object>} Created movement
   */
  async recordCorrection(itemId, actualStock, reason, userId) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentStock = item.stock.currentStock;
    const difference = actualStock - currentStock;

    if (difference === 0) {
      throw new Error('No correction needed - stock matches actual count');
    }

    const correctionReason = `Stock correction: ${reason}. Previous: ${currentStock}, Actual: ${actualStock}, Difference: ${difference}`;

    return await this.recordAdjustment(itemId, difference, correctionReason, userId);
  }

  /**
   * Get stock movement by ID
   * @param {String} id - Movement ID
   * @returns {Promise<Object>} Stock movement
   */
  async getMovementById(id) {
    const movement = await stockMovementRepository.findById(id);
    if (!movement) {
      throw new Error('Stock movement not found');
    }
    return movement;
  }

  /**
   * Get stock movements with filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Movements and pagination info
   */
  async getMovements(filters = {}, options = {}) {
    const { page = 1, limit = 50, sortBy = 'movementDate', sortOrder = 'desc' } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [movements, total] = await Promise.all([
      stockMovementRepository.findAll(filters, { limit, skip, sort }),
      stockMovementRepository.count(filters),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get stock movements for an item
   * @param {String} itemId - Item ID
   * @param {Number} limit - Maximum number of records
   * @returns {Promise<Array>} Stock movements
   */
  async getMovementsByItem(itemId, limit = 50) {
    return await stockMovementRepository.findByItem(itemId, limit);
  }

  /**
   * Get stock movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Stock movements
   */
  async getMovementsByDateRange(startDate, endDate, filters = {}) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    return await stockMovementRepository.findByDateRange(startDate, endDate, filters);
  }

  /**
   * Get stock movements by reference
   * @param {String} referenceType - Reference type
   * @param {String} referenceId - Reference ID
   * @returns {Promise<Array>} Stock movements
   */
  async getMovementsByReference(referenceType, referenceId) {
    return await stockMovementRepository.findByReference(referenceType, referenceId);
  }

  /**
   * Get stock movement history for an item
   * @param {String} itemId - Item ID
   * @param {Number} days - Number of days to look back
   * @returns {Promise<Object>} Movement history with summary
   */
  async getItemMovementHistory(itemId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const [movements, summary, currentBalance] = await Promise.all([
      stockMovementRepository.findByDateRange(startDate, endDate, { itemId }),
      stockMovementRepository.getMovementsSummary(itemId, days),
      stockMovementRepository.calculateStockBalance(itemId),
    ]);

    return {
      itemId,
      period: { startDate, endDate, days },
      currentBalance,
      movements,
      summary,
    };
  }

  /**
   * Get stock balance for an item
   * @param {String} itemId - Item ID
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Number>} Stock balance
   */
  async getStockBalance(itemId, asOfDate = new Date()) {
    return await stockMovementRepository.calculateStockBalance(itemId, asOfDate);
  }

  /**
   * Get expired batches
   * @returns {Promise<Array>} Expired batch movements
   */
  async getExpiredBatches() {
    return await stockMovementRepository.findExpiredBatches();
  }

  /**
   * Get stock movement statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Movement statistics
   */
  async getMovementStatistics(startDate, endDate) {
    const filters = {};
    if (startDate && endDate) {
      filters.movementDate = { $gte: startDate, $lte: endDate };
    }

    return await stockMovementRepository.getStatistics(filters);
  }

  /**
   * Get item-wise movement report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Item-wise movement summary
   */
  async getItemWiseMovementReport(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    return await stockMovementRepository.getItemWiseSummary(startDate, endDate);
  }

  /**
   * Validate stock availability
   * @param {String} itemId - Item ID
   * @param {Number} requiredQuantity - Required quantity
   * @returns {Promise<Object>} Validation result
   */
  async validateStockAvailability(itemId, requiredQuantity) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentStock = item.stock.currentStock;
    const isAvailable = currentStock >= requiredQuantity;

    return {
      itemId,
      itemCode: item.code,
      itemName: item.name,
      currentStock,
      requiredQuantity,
      isAvailable,
      shortfall: isAvailable ? 0 : requiredQuantity - currentStock,
    };
  }

  /**
   * Get low stock items based on movements
   * @param {Number} days - Number of days to analyze
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockItems(days = 30) {
    const items = await Item.find({
      isActive: true,
      $expr: { $lte: ['$stock.currentStock', '$stock.minStock'] },
    });

    const itemsWithMovements = await Promise.all(
      items.map(async (item) => {
        const summary = await stockMovementRepository.getMovementsSummary(item._id, days);
        return {
          item: {
            id: item._id,
            code: item.code,
            name: item.name,
            category: item.category,
          },
          stock: {
            current: item.stock.currentStock,
            min: item.stock.minStock,
            max: item.stock.maxStock,
          },
          recentMovements: summary,
        };
      })
    );

    return itemsWithMovements;
  }

  /**
   * Normalize quantity based on movement type
   * @private
   */
  _normalizeQuantity(quantity, movementType) {
    const absQuantity = Math.abs(quantity);

    if (movementType === 'in') {
      return absQuantity;
    } else if (movementType === 'out') {
      return -absQuantity;
    }

    // For adjustments, keep the sign as provided
    return quantity;
  }

  /**
   * Update item stock
   * @private
   */
  async _updateItemStock(itemId, movementType, quantity) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (movementType === 'in') {
      item.stock.currentStock += quantity;
    } else if (movementType === 'out') {
      item.stock.currentStock -= quantity;
      if (item.stock.currentStock < 0) {
        item.stock.currentStock = 0;
      }
    } else if (movementType === 'adjustment') {
      item.stock.currentStock += quantity;
      if (item.stock.currentStock < 0) {
        item.stock.currentStock = 0;
      }
    }

    await item.save();
    return item;
  }
}

module.exports = new StockMovementService();
