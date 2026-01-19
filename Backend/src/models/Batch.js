const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AppError = require('../utils/appError');

const batchSchema = new Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item reference is required'],
      index: true,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required'],
      index: true,
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      index: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    manufacturingDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['active', 'expired', 'depleted', 'quarantined'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    referenceType: {
      type: String,
      enum: ['PURCHASE_ORDER', 'TRANSFER', 'ADJUSTMENT', 'OTHER'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
batchSchema.index({ batchNumber: 1, item: 1, warehouse: 1 }, { unique: true });
batchSchema.index({ warehouse: 1, expiryDate: 1 });
batchSchema.index({ item: 1, warehouse: 1, status: 1 });
batchSchema.index({ expiryDate: 1, status: 1, remainingQuantity: 1 });
batchSchema.index({ item: 1, expiryDate: 1, remainingQuantity: 1 });

// Virtual for checking if batch is about to expire (within 30 days)
batchSchema.virtual('isExpiringSoon').get(function () {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow && this.status === 'active';
});

/**
 * Check if a batch number exists for an item in a warehouse
 * @param {string} batchNumber - The batch number to check
 * @param {string} itemId - The item ID
 * @param {string} warehouseId - The warehouse ID
 * @param {string} [excludeBatchId] - Optional batch ID to exclude from the check
 * @returns {Promise<boolean>} True if the batch number exists
 */
batchSchema.statics.batchNumberExists = async function (batchNumber, itemId, warehouseId, excludeBatchId = null) {
  const query = {
    batchNumber: new RegExp(`^${batchNumber}$`, 'i'),
    item: itemId,
    warehouse: warehouseId,
  };

  if (excludeBatchId) {
    query._id = { $ne: excludeBatchId };
  }

  const count = await this.countDocuments(query);
  return count > 0;
};

// Method to update remaining quantity
batchSchema.methods.updateRemainingQuantity = async function (quantityChange) {
  const newQuantity = this.remainingQuantity + quantityChange;

  if (newQuantity < 0) {
    throw new Error('Insufficient quantity in batch');
  }

  this.remainingQuantity = newQuantity;

  // Update status if needed
  if (this.remainingQuantity === 0) {
    this.status = 'depleted';
  } else if (this.status === 'depleted' && this.remainingQuantity > 0) {
    this.status = 'active';
  }

  return this.save();
};

// Pre-save hook to update status based on dates and validate data
batchSchema.pre('save', async function (next) {
  const now = new Date();

  // Update status based on dates
  if (this.expiryDate < now) {
    this.status = 'expired';
  } else if (this.manufacturingDate > now) {
    this.status = 'pending';
  } else {
    this.status = 'active';
  }

  // Calculate days until expiry
  const diffTime = this.expiryDate - now;
  this.daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Validate that remaining quantity doesn't exceed total quantity
  if (this.remainingQuantity > this.quantity) {
    return next(new AppError('Remaining quantity cannot exceed total quantity', 400));
  }

  // Validate batch number uniqueness
  if (this.isNew || this.isModified('batchNumber')) {
    const exists = await this.constructor.batchNumberExists(
      this.batchNumber,
      this.item,
      this.warehouse,
      this._id
    );

    if (exists) {
      return next(new AppError('Batch number already exists for this item in the specified warehouse', 400));
    }
  }

  next();
});

/**
 * Get batches expiring soon across all warehouses
 * @param {number} [days=30] - Number of days to look ahead for expiry
 * @param {string} [warehouseId] - Optional warehouse ID to filter by
 * @returns {Promise<Array>} Array of batches expiring soon
 */
batchSchema.statics.getExpiringSoon = function (days = 30, warehouseId = null) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const query = {
    expiryDate: { $lte: date, $gte: new Date() },
    status: { $ne: 'expired' }
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  return this.find(query)
    .populate('item', 'name code')
    .populate('warehouse', 'name code');
};

/**
 * Get expired batches
 * @param {string} [warehouseId] - Optional warehouse ID to filter by
 * @returns {Promise<Array>} Array of expired batches
 */
batchSchema.statics.getExpiredBatches = function (warehouseId = null) {
  const query = {
    expiryDate: { $lt: new Date() },
    status: { $ne: 'expired' }
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  return this.find(query)
    .populate('item', 'name code')
    .populate('warehouse', 'name code');
};

/**
 * Get batches by warehouse and item
 * @param {string} itemId - The item ID
 * @param {string} warehouseId - The warehouse ID
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.includeExpired] - Whether to include expired batches
 * @returns {Promise<Array>} Array of batches
 */
batchSchema.statics.findByItemAndWarehouse = function (itemId, warehouseId, options = {}) {
  const query = {
    item: itemId,
    warehouse: warehouseId,
    remainingQuantity: { $gt: 0 }
  };

  if (!options.includeExpired) {
    query.expiryDate = { $gte: new Date() };
  }

  return this.find(query)
    .sort({ expiryDate: 1 }) // Sort by expiry date (FIFO)
    .populate('item', 'name code unit');
};

/**
 * Get expired items by warehouse
 * @param {string} warehouseId - The warehouse ID
 * @returns {Promise<Array>} Array of expired items with batch details grouped by item
 */
batchSchema.statics.getExpiredItemsByWarehouse = function (warehouseId) {
  return this.aggregate([
    {
      $match: {
        warehouse: new mongoose.Types.ObjectId(warehouseId),
        expiryDate: { $lt: new Date() },
        remainingQuantity: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$item',
        batches: {
          $push: {
            batchId: '$_id',
            batchNumber: '$batchNumber',
            expiryDate: '$expiryDate',
            quantity: '$remainingQuantity',
            unitCost: '$unitCost'
          }
        },
        totalQuantity: { $sum: '$remainingQuantity' },
        totalValue: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } }
      }
    },
    {
      $lookup: {
        from: 'items',
        localField: '_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    { $unwind: '$item' },
    {
      $project: {
        item: {
          _id: '$item._id',
          name: '$item.name',
          code: '$item.code',
          unit: '$item.unit'
        },
        batches: 1,
        totalQuantity: 1,
        totalValue: 1
      }
    },
    { $sort: { 'item.name': 1 } }
  ]);
};

/**
 * Update batch statuses (should be run periodically)
 * @returns {Promise<Object>} Result of the update operation
 */
batchSchema.statics.updateBatchStatuses = async function () {
  const now = new Date();

  // Update expired batches
  const expiredResult = await this.updateMany(
    {
      expiryDate: { $lt: now },
      status: { $ne: 'expired' }
    },
    {
      $set: {
        status: 'expired',
        daysUntilExpiry: 0
      }
    }
  );

  // Update active batches
  const activeResult = await this.updateMany(
    {
      expiryDate: { $gte: now },
      manufacturingDate: { $lte: now },
      status: { $nin: ['active', 'expired'] }
    },
    {
      $set: { status: 'active' },
      $set: {
        daysUntilExpiry: {
          $ceil: {
            $divide: [
              { $subtract: ['$expiryDate', now] },
              1000 * 60 * 60 * 24 // Convert ms to days
            ]
          }
        }
      }
    }
  );

  return {
    expired: expiredResult.modifiedCount,
    activated: activeResult.modifiedCount
  };
};

/**
 * Get stock levels by warehouse for a specific item
 * @param {string} itemId - The item ID
 * @returns {Promise<Array>} Array of warehouses with stock levels for the item
 */
batchSchema.statics.getItemStockByWarehouse = function (itemId) {
  return this.aggregate([
    {
      $match: {
        item: new mongoose.Types.ObjectId(itemId),
        remainingQuantity: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$warehouse',
        totalQuantity: { $sum: '$remainingQuantity' },
        totalValue: { $sum: { $multiply: ['$remainingQuantity', '$unitCost'] } },
        batches: { $sum: 1 },
        expiryDates: { $push: '$expiryDate' },
        minExpiryDate: { $min: '$expiryDate' }
      }
    },
    {
      $lookup: {
        from: 'warehouses',
        localField: '_id',
        foreignField: '_id',
        as: 'warehouse'
      }
    },
    { $unwind: '$warehouse' },
    {
      $project: {
        _id: 0,
        warehouse: {
          _id: '$warehouse._id',
          name: '$warehouse.name',
          code: '$warehouse.code'
        },
        totalQuantity: 1,
        totalValue: 1,
        batches: 1,
        minExpiryDate: 1,
        hasExpiringSoon: {
          $cond: [
            { $lte: ['$minExpiryDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] },
            true,
            false
          ]
        }
      }
    },
    { $sort: { 'warehouse.name': 1 } }
  ]);
};

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
