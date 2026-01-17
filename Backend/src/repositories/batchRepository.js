const Batch = require('../models/Batch');

class BatchRepository {
  /**
   * Create a new batch
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  async create(batchData) {
    const batch = new Batch(batchData);
    return batch.save();
  }

  /**
   * Find batch by ID
   * @param {string} id - Batch ID
   * @returns {Promise<Object|null>} Batch or null if not found
   */
  async findById(id) {
    return Batch.findById(id)
      .populate('item', 'name code')
      .populate('supplier', 'name code')
      .populate('location', 'name code');
  }

  /**
   * Find batch by batch number and item ID
   * @param {string} batchNumber - Batch number
   * @param {string} itemId - Item ID
   * @returns {Promise<Object|null>} Batch or null if not found
   */
  async findByBatchNumber(batchNumber, itemId) {
    return Batch.findOne({ batchNumber, item: itemId })
      .populate('item', 'name code')
      .populate('supplier', 'name code')
      .populate('location', 'name code');
  }

  /**
   * Find batches by item ID
   * @param {string} itemId - Item ID
   * @param {Object} [options] - Options
   * @param {string} [options.status] - Filter by status
   * @param {boolean} [options.includeExpired] - Include expired batches
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of batches
   */
  async findByItemId(itemId, options = {}) {
    const query = { item: itemId };

    if (options.status) {
      query.status = options.status;
    }

    if (!options.includeExpired) {
      query.expiryDate = { $gt: new Date() };
    }

    if (options.locationId) {
      query.location = options.locationId;
    }

    return Batch.find(query)
      .populate('item', 'name code')
      .populate('supplier', 'name code')
      .populate('location', 'name code')
      .sort({ expiryDate: 1 });
  }

  /**
   * Find batches by supplier ID
   * @param {string} supplierId - Supplier ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async findBySupplierId(supplierId, options = {}) {
    const query = { supplier: supplierId };

    if (options.status) {
      query.status = options.status;
    }

    if (options.expiringSoon) {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      query.expiryDate = { $lte: date, $gte: new Date() };
    }

    return Batch.find(query)
      .populate('item', 'name code')
      .populate('location', 'name code')
      .sort({ expiryDate: 1 });
  }

  /**
   * Find batches by location ID
   * @param {string} locationId - Location ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async findByLocationId(locationId, options = {}) {
    const query = { location: locationId };

    if (options.status) {
      query.status = options.status;
    }

    if (options.itemId) {
      query.item = options.itemId;
    }

    if (options.expiringSoon) {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      query.expiryDate = { $lte: date, $gte: new Date() };
    }

    return Batch.find(query)
      .populate('item', 'name code')
      .populate('supplier', 'name code')
      .sort({ expiryDate: 1 });
  }

  /**
   * Find batches expiring soon
   * @param {number} [days=30] - Number of days to check for expiry
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches expiring soon
   */
  async findExpiringSoon(days = 30, options = {}) {
    const date = new Date();
    date.setDate(date.getDate() + days);

    const query = {
      expiryDate: { $lte: date, $gte: new Date() },
      status: 'active',
      remainingQuantity: { $gt: 0 }
    };

    if (options.locationId) {
      query.location = options.locationId;
    }

    return Batch.find(query)
      .populate('item', 'name code')
      .populate('supplier', 'name')
      .populate('location', 'name')
      .sort({ expiryDate: 1 });
  }

  /**
   * Find expired batches
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of expired batches
   */
  async findExpiredBatches(options = {}) {
    const query = {
      expiryDate: { $lte: new Date() },
      status: { $ne: 'expired' },
      remainingQuantity: { $gt: 0 }
    };

    if (options.locationId) {
      query.location = options.locationId;
    }

    return Batch.find(query)
      .populate('item', 'name code')
      .populate('supplier', 'name')
      .populate('location', 'name')
      .sort({ expiryDate: 1 });
  }

  /**
   * Find all batches with filtering and pagination
   * @param {Object} [filters] - Filter criteria
   * @param {Object} [pagination] - Pagination options
   * @returns {Promise<Object>} Object with batches array and pagination info
   */
  async findAll(filters = {}, pagination = {}) {
    const query = {};

    // Apply filters
    if (filters.itemSearch) {
      // Search in item name or code
      const itemRegex = new RegExp(filters.itemSearch, 'i');
      query.$or = [
        { 'item.name': itemRegex },
        { 'item.code': itemRegex }
      ];
    }

    if (filters.locationIds && filters.locationIds.length > 0) {
      query.location = { $in: filters.locationIds };
    }

    if (filters.supplierIds && filters.supplierIds.length > 0) {
      query.supplier = { $in: filters.supplierIds };
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    if (filters.expiryDateRange) {
      const expiryQuery = {};
      if (filters.expiryDateRange.start) {
        expiryQuery.$gte = new Date(filters.expiryDateRange.start);
      }
      if (filters.expiryDateRange.end) {
        expiryQuery.$lte = new Date(filters.expiryDateRange.end);
      }
      if (Object.keys(expiryQuery).length > 0) {
        query.expiryDate = expiryQuery;
      }
    }

    if (filters.quantityRange) {
      const quantityQuery = {};
      if (filters.quantityRange.min !== undefined) {
        quantityQuery.$gte = filters.quantityRange.min;
      }
      if (filters.quantityRange.max !== undefined) {
        quantityQuery.$lte = filters.quantityRange.max;
      }
      if (Object.keys(quantityQuery).length > 0) {
        query.remainingQuantity = quantityQuery;
      }
    }

    if (!filters.includeExpired) {
      query.status = { ...query.status, $ne: 'expired' };
    }

    if (!filters.includeDepleted) {
      query.remainingQuantity = { ...query.remainingQuantity, $gt: 0 };
    }

    // Pagination setup
    const page = pagination.page || 1;
    const limit = pagination.limit || 25;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = pagination.sortBy || 'expiryDate';
    const sortOrder = pagination.sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };

    // Execute query with aggregation for item search
    let aggregationPipeline = [];

    // Lookup items for search
    aggregationPipeline.push({
      $lookup: {
        from: 'items',
        localField: 'item',
        foreignField: '_id',
        as: 'item'
      }
    });

    aggregationPipeline.push({
      $unwind: '$item'
    });

    // Lookup locations
    aggregationPipeline.push({
      $lookup: {
        from: 'locations',
        localField: 'location',
        foreignField: '_id',
        as: 'location'
      }
    });

    aggregationPipeline.push({
      $unwind: { path: '$location', preserveNullAndEmptyArrays: true }
    });

    // Lookup suppliers
    aggregationPipeline.push({
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplier'
      }
    });

    aggregationPipeline.push({
      $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true }
    });

    // Apply filters
    if (Object.keys(query).length > 0) {
      // Handle item search specially
      if (filters.itemSearch) {
        const itemRegex = new RegExp(filters.itemSearch, 'i');
        const itemSearchQuery = {
          $or: [
            { 'item.name': itemRegex },
            { 'item.code': itemRegex }
          ]
        };
        delete query.$or;
        aggregationPipeline.push({ $match: itemSearchQuery });

        // Apply other filters
        const otherFilters = { ...query };
        if (Object.keys(otherFilters).length > 0) {
          aggregationPipeline.push({ $match: otherFilters });
        }
      } else {
        aggregationPipeline.push({ $match: query });
      }
    }

    // Get total count
    const countPipeline = [...aggregationPipeline, { $count: 'total' }];
    const countResult = await Batch.aggregate(countPipeline);
    const totalItems = countResult.length > 0 ? countResult[0].total : 0;

    // Add sorting, skip, and limit
    aggregationPipeline.push({ $sort: sort });
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    // Execute main query
    const batches = await Batch.aggregate(aggregationPipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: batches,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Update batch
   * @param {string} id - Batch ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated batch or null if not found
   */
  async update(id, updateData) {
    return Batch.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('item', 'name code')
      .populate('supplier', 'name code')
      .populate('location', 'name code');
  }

  /**
   * Update batch quantity
   * @param {string} id - Batch ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @returns {Promise<Object|null>} Updated batch or null if not found
   */
  async updateQuantity(id, quantity) {
    const batch = await Batch.findById(id);
    if (!batch) {
      return null;
    }

    await batch.updateRemainingQuantity(quantity);
    return this.findById(id);
  }

  /**
   * Delete batch
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Deleted batch
   */
  async delete(id) {
    return Batch.findByIdAndDelete(id);
  }

  /**
   * Get batch statistics
   * @param {Object} [filters] - Filter criteria
   * @returns {Promise<Object>} Batch statistics
   */
  async getStatistics(filters = {}) {
    const matchStage = {};

    if (filters.itemId) {
      matchStage.item = filters.itemId;
    }

    if (filters.locationId) {
      matchStage.location = filters.locationId;
    }

    if (filters.supplierId) {
      matchStage.supplier = filters.supplierId;
    }

    if (filters.status) {
      matchStage.status = filters.status;
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const result = await Batch.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalRemaining: { $sum: '$remainingQuantity' },
          totalCost: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
          totalValue: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$expiryDate', thirtyDaysFromNow] },
                    { $gt: ['$expiryDate', now] },
                    { $gt: ['$remainingQuantity', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          expired: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$expiryDate', now] },
                    { $gt: ['$remainingQuantity', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          active: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$expiryDate', now] },
                    { $gt: ['$remainingQuantity', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          depleted: {
            $sum: {
              $cond: [
                { $lte: ['$remainingQuantity', 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalBatches: 1,
          totalQuantity: 1,
          totalRemaining: 1,
          totalCost: { $round: ['$totalCost', 2] },
          totalValue: { $round: ['$totalValue', 2] },
          expiringSoon: 1,
          expired: 1,
          active: 1,
          depleted: 1
        }
      }
    ]);

    return result[0] || {
      totalBatches: 0,
      totalQuantity: 0,
      totalRemaining: 0,
      totalCost: 0,
      totalValue: 0,
      expiringSoon: 0,
      expired: 0,
      active: 0,
      depleted: 0
    };
  }

  /**
   * Update batch statuses (should be run periodically)
   * @returns {Promise<Object>} Update result
   */
  async updateBatchStatuses() {
    return Batch.updateBatchStatuses();
  }
}

module.exports = new BatchRepository();
