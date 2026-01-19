const mongoose = require('mongoose');
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
      .populate('location', 'name code')
      .lean();
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
      .populate('location', 'name code')
      .lean();
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
      .sort({ expiryDate: 1 })
      .lean();
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
      .sort({ expiryDate: 1 })
      .lean();
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
      .sort({ expiryDate: 1 })
      .lean();
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
      .sort({ expiryDate: 1 })
      .lean();
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
      .sort({ expiryDate: 1 })
      .lean();
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

    // Lookup locations (warehouses)
    aggregationPipeline.push({
      $lookup: {
        from: 'warehouses',
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
      matchStage.item = new mongoose.Types.ObjectId(filters.itemId);
    }

    if (filters.locationIds && filters.locationIds.length > 0) {
      matchStage.location = { $in: filters.locationIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (filters.locationId) {
      matchStage.location = new mongoose.Types.ObjectId(filters.locationId);
    }

    if (filters.supplierIds && filters.supplierIds.length > 0) {
      matchStage.supplier = { $in: filters.supplierIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (filters.supplierId) {
      matchStage.supplier = new mongoose.Types.ObjectId(filters.supplierId);
    }

    if (filters.status) {
      matchStage.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) {
        matchStage.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchStage.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    const [mainStats, statusDist, locationDist, supplierDist, expiryTrend, expiryAlerts, lowStockStats, ageStats] = await Promise.all([
      Batch.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalBatches: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalRemaining: { $sum: '$remainingQuantity' },
            totalCost: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
            totalValue: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } },
            expiredBatches: {
              $sum: {
                $cond: [{ $lte: ['$expiryDate', now] }, 1, 0]
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
            expiredBatches: 1
          }
        }
      ]),
      Batch.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            value: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } }
          }
        },
        {
          $project: {
            _id: 0,
            status: '$_id',
            count: 1,
            value: { $round: ['$value', 2] }
          }
        }
      ]),
      Batch.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'warehouses',
            localField: 'location',
            foreignField: '_id',
            as: 'locationInfo'
          }
        },
        { $unwind: { path: '$locationInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$location',
            locationName: { $first: { $ifNull: ['$locationInfo.name', 'Unassigned'] } },
            batchCount: { $sum: 1 },
            totalQuantity: { $sum: '$remainingQuantity' },
            totalValue: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } }
          }
        },
        {
          $project: {
            _id: 0,
            locationId: '$_id',
            locationName: 1,
            batchCount: 1,
            totalQuantity: 1,
            totalValue: { $round: ['$totalValue', 2] }
          }
        }
      ]),
      Batch.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplier',
            foreignField: '_id',
            as: 'supplierInfo'
          }
        },
        { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$supplier',
            supplierName: { $first: { $ifNull: ['$supplierInfo.name', 'Unassigned'] } },
            batchCount: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } }
          }
        },
        {
          $project: {
            _id: 0,
            supplierId: '$_id',
            supplierName: 1,
            batchCount: 1,
            totalValue: { $round: ['$totalValue', 2] }
          }
        }
      ]),
      Batch.aggregate([
        {
          $match: {
            ...matchStage,
            expiryDate: { $lte: new Date(new Date().setFullYear(now.getFullYear() + 1)) }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$expiryDate' }
            },
            expiringCount: {
              $sum: { $cond: [{ $and: [{ $gt: ['$expiryDate', now] }, { $gt: ['$remainingQuantity', 0] }] }, 1, 0] }
            },
            expiredCount: {
              $sum: { $cond: [{ $and: [{ $lte: ['$expiryDate', now] }, { $gt: ['$remainingQuantity', 0] }] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            expiringCount: 1,
            expiredCount: 1
          }
        }
      ]),
      Batch.aggregate([
        { $match: { ...matchStage, remainingQuantity: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            in7Days: {
              $sum: { $cond: [{ $and: [{ $lte: ['$expiryDate', sevenDaysFromNow] }, { $gt: ['$expiryDate', now] }] }, 1, 0] }
            },
            in30Days: {
              $sum: { $cond: [{ $and: [{ $lte: ['$expiryDate', thirtyDaysFromNow] }, { $gt: ['$expiryDate', now] }] }, 1, 0] }
            },
            in90Days: {
              $sum: { $cond: [{ $and: [{ $lte: ['$expiryDate', ninetyDaysFromNow] }, { $gt: ['$expiryDate', now] }] }, 1, 0] }
            }
          }
        }
      ]),
      Batch.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$item',
            totalRemaining: { $sum: '$remainingQuantity' }
          }
        },
        {
          $lookup: {
            from: 'items',
            localField: '_id',
            foreignField: '_id',
            as: 'itemInfo'
          }
        },
        { $unwind: '$itemInfo' },
        {
          $match: {
            $expr: { $lt: ['$totalRemaining', { $ifNull: ['$itemInfo.inventory.minimumStock', 0] }] }
          }
        },
        { $count: 'lowStockCount' }
      ]),
      Batch.aggregate([
        { $match: { ...matchStage, manufacturingDate: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgAge: {
              $avg: {
                $divide: [
                  { $subtract: [now, '$manufacturingDate'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      ])
    ]);

    const stats = mainStats[0] || {
      totalBatches: 0,
      totalQuantity: 0,
      totalRemaining: 0,
      totalCost: 0,
      totalValue: 0,
      expiredBatches: 0
    };

    const finalStats = {
      ...stats,
      lowStockAlerts: lowStockStats[0]?.lowStockCount || 0,
      averageBatchAge: Math.round(ageStats[0]?.avgAge || 0),
      batchesByStatus: statusDist,
      batchesByLocation: locationDist,
      valueBySupplier: supplierDist,
      expiryAnalytics: {
        expiringIn7Days: expiryAlerts[0]?.in7Days || 0,
        expiringIn30Days: expiryAlerts[0]?.in30Days || 0,
        expiringIn90Days: expiryAlerts[0]?.in90Days || 0,
        expiredBatches: stats.expiredBatches,
        expiryTrend: expiryTrend
      },
      fifoCompliance: {
        overallCompliance: 100, // Placeholder
        itemCategories: [],
        oldestBatches: []
      }
    };

    return this._roundObjectAmounts(finalStats);
  }

  /**
   * Recursively round all numbers in an object to 2 decimal places
   * @param {Object} obj - Object to round
   * @returns {Object} Object with rounded numbers
   * @private
   */
  _roundObjectAmounts(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number') return Math.round(obj * 100) / 100;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this._roundObjectAmounts(item));
    }

    const roundedObj = {};
    Object.keys(obj).forEach(key => {
      roundedObj[key] = this._roundObjectAmounts(obj[key]);
    });
    return roundedObj;
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
