const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  movementType: {
    type: String,
    required: [true, 'Movement type is required'],
    enum: {
      values: ['in', 'out', 'adjustment'],
      message: 'Movement type must be one of: in, out, adjustment',
    },
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    validate: {
      validator(value) {
        return value !== 0;
      },
      message: 'Quantity cannot be zero',
    },
  },
  referenceType: {
    type: String,
    required: [true, 'Reference type is required'],
    enum: {
      values: ['sales_invoice', 'purchase_invoice', 'adjustment', 'opening_balance', 'transfer'],
      message: 'Reference type must be one of: sales_invoice, purchase_invoice, adjustment, opening_balance, transfer',
    },
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required() {
      return ['sales_invoice', 'purchase_invoice'].includes(this.referenceType);
    },
  },
  batchInfo: {
    batchNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Batch number cannot exceed 50 characters'],
    },
    expiryDate: {
      type: Date,
    },
    manufacturingDate: {
      type: Date,
    },
  },
  movementDate: {
    type: Date,
    required: [true, 'Movement date is required'],
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
});

// Indexes
stockMovementSchema.index({ itemId: 1, movementDate: -1 });
stockMovementSchema.index({ movementType: 1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });
stockMovementSchema.index({ movementDate: -1 });
stockMovementSchema.index({ createdBy: 1 });
stockMovementSchema.index({ 'batchInfo.batchNumber': 1 });
stockMovementSchema.index({ 'batchInfo.expiryDate': 1 });

// Virtual for absolute quantity (always positive)
stockMovementSchema.virtual('absoluteQuantity').get(function () {
  return Math.abs(this.quantity);
});

// Virtual for movement direction
stockMovementSchema.virtual('direction').get(function () {
  if (this.movementType === 'in') return 'inward';
  if (this.movementType === 'out') return 'outward';
  return this.quantity > 0 ? 'inward' : 'outward';
});

// Instance method to get movement description
stockMovementSchema.methods.getMovementDescription = function () {
  const descriptions = {
    sales_invoice: 'Sale to customer',
    purchase_invoice: 'Purchase from supplier',
    adjustment: 'Stock adjustment',
    opening_balance: 'Opening balance',
    transfer: 'Stock transfer',
  };

  return descriptions[this.referenceType] || 'Unknown movement';
};

// Instance method to check if batch is expired
stockMovementSchema.methods.isBatchExpired = function () {
  if (!this.batchInfo.expiryDate) return false;
  return this.batchInfo.expiryDate < new Date();
};

// Static method to find movements by item
stockMovementSchema.statics.findByItem = function (itemId, limit = 50) {
  return this.find({ itemId })
    .sort({ movementDate: -1 })
    .limit(limit)
    .populate('itemId', 'code name')
    .populate('createdBy', 'username');
};

// Static method to find movements by date range
stockMovementSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    movementDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ movementDate: -1 });
};

// Static method to find movements by reference
stockMovementSchema.statics.findByReference = function (referenceType, referenceId) {
  return this.find({ referenceType, referenceId });
};

// Static method to calculate stock balance for an item
stockMovementSchema.statics.calculateStockBalance = async function (itemId, asOfDate = new Date()) {
  const movements = await this.find({
    itemId,
    movementDate: { $lte: asOfDate },
  }).sort({ movementDate: 1 });

  let balance = 0;
  movements.forEach((movement) => {
    if (movement.movementType === 'in' || (movement.movementType === 'adjustment' && movement.quantity > 0)) {
      balance += Math.abs(movement.quantity);
    } else if (movement.movementType === 'out' || (movement.movementType === 'adjustment' && movement.quantity < 0)) {
      balance -= Math.abs(movement.quantity);
    }
  });

  return Math.max(0, balance); // Ensure balance is never negative
};

// Static method to find expired batches
stockMovementSchema.statics.findExpiredBatches = function () {
  return this.find({
    'batchInfo.expiryDate': { $lt: new Date() },
    movementType: 'in', // Only consider inward movements for expired stock
  }).populate('itemId', 'code name');
};

// Static method to get stock movements summary
stockMovementSchema.statics.getMovementsSummary = async function (itemId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        itemId: new mongoose.Types.ObjectId(itemId),
        movementDate: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$movementType',
        totalQuantity: { $sum: '$quantity' },
        count: { $sum: 1 },
      },
    },
  ]);

  return summary;
};

// Pre-save validation
stockMovementSchema.pre('save', function (next) {
  // Validate batch dates
  if (this.batchInfo.manufacturingDate && this.batchInfo.expiryDate) {
    if (this.batchInfo.manufacturingDate > this.batchInfo.expiryDate) {
      return next(new Error('Manufacturing date cannot be after expiry date'));
    }
  }

  // Validate movement date is not in the future
  if (this.movementDate > new Date()) {
    return next(new Error('Movement date cannot be in the future'));
  }

  // Ensure quantity sign matches movement type for non-adjustment movements
  if (this.movementType === 'in' && this.quantity < 0) {
    this.quantity = Math.abs(this.quantity);
  } else if (this.movementType === 'out' && this.quantity > 0) {
    this.quantity = -Math.abs(this.quantity);
  }

  next();
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);
