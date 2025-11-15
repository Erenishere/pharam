const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
      required: true,
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
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      index: true,
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

// Index for batch number and item combination (should be unique)
batchSchema.index({ batchNumber: 1, item: 1 }, { unique: true });

// Index for expiry date and status for faster queriesatchSchema.index({ expiryDate: 1, status: 1 });

// Virtual for checking if batch is about to expire (within 30 days)
batchSchema.virtual('isExpiringSoon').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow && this.status === 'active';
});

// Static method to check if a batch number is already in use for an item
batchSchema.statics.batchNumberExists = async function(batchNumber, itemId, excludeBatchId = null) {
  const query = { batchNumber, item: itemId };
  if (excludeBatchId) {
    query._id = { $ne: excludeBatchId };
  }
  const count = await this.countDocuments(query);
  return count > 0;
};

// Method to update remaining quantity
batchSchema.methods.updateRemainingQuantity = async function(quantityChange) {
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

// Pre-save hook to update status based on dates
batchSchema.pre('save', function(next) {
  const now = new Date();
  
  // Update status based on expiry date
  if (this.expiryDate <= now) {
    this.status = 'expired';
  } else if (this.status === 'expired' && this.expiryDate > now) {
    this.status = 'active';
  }
  
  // Ensure remaining quantity doesn't exceed total quantity
  if (this.remainingQuantity > this.quantity) {
    this.remainingQuantity = this.quantity;
  }
  
  next();
});

// Static method to get batches expiring soon
batchSchema.statics.getExpiringSoon = function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  return this.find({
    expiryDate: { $lte: date },
    status: 'active',
    remainingQuantity: { $gt: 0 }
  }).sort({ expiryDate: 1 });
};

// Static method to get expired batches
batchSchema.statics.getExpiredBatches = function() {
  return this.find({
    expiryDate: { $lte: new Date() },
    status: { $ne: 'expired' },
    remainingQuantity: { $gt: 0 }
  });
};

// Static method to update batch statuses (should be run periodically)
batchSchema.statics.updateBatchStatuses = async function() {
  const now = new Date();
  
  // Mark batches as expired
  await this.updateMany(
    {
      expiryDate: { $lte: now },
      status: 'active'
    },
    {
      $set: { status: 'expired' }
    }
  );
  
  // Mark depleted batches
  await this.updateMany(
    {
      remainingQuantity: 0,
      status: { $nin: ['depleted', 'expired'] }
    },
    {
      $set: { status: 'depleted' }
    }
  );
};

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
