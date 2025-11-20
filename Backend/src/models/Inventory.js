const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required'],
    index: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse reference is required'],
    index: true,
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  allocated: {
    type: Number,
    default: 0,
    min: [0, 'Allocated quantity cannot be negative'],
  },
  available: {
    type: Number,
    default: 0,
    min: [0, 'Available quantity cannot be negative'],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  reorderPoint: {
    type: Number,
    default: 0,
    min: [0, 'Reorder point cannot be negative'],
  },
  lastCounted: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for available quantity (calculated field)
inventorySchema.virtual('availableQuantity').get(function() {
  return Math.max(0, this.quantity - this.allocated);
});

// Indexes
inventorySchema.index(
  { item: 1, warehouse: 1, location: 1 },
  { unique: true, name: 'item_warehouse_location_unique' }
);

// Compound index for common queries
inventorySchema.index({ warehouse: 1, item: 1 });
inventorySchema.index({ item: 1, quantity: 1 });
inventorySchema.index({ warehouse: 1, quantity: 1 });

// Pre-save hook to update available quantity
inventorySchema.pre('save', function(next) {
  this.available = Math.max(0, this.quantity - this.allocated);
  this.lastUpdated = Date.now();
  next();
});

/**
 * Check if there's sufficient stock available
 * @param {number} requiredQuantity - The quantity needed
 * @returns {boolean} True if sufficient stock is available
 */
inventorySchema.methods.hasSufficientStock = function(requiredQuantity) {
  return this.available >= requiredQuantity;
};

/**
 * Allocate stock
 * @param {number} quantity - Quantity to allocate
 * @returns {boolean} True if allocation was successful
 */
inventorySchema.methods.allocate = function(quantity) {
  if (this.available < quantity) {
    return false;
  }
  this.allocated += quantity;
  return true;
};

/**
 * Release allocated stock
 * @param {number} quantity - Quantity to release
 * @returns {boolean} True if release was successful
 */
inventorySchema.methods.release = function(quantity) {
  if (this.allocated < quantity) {
    return false;
  }
  this.allocated -= quantity;
  return true;
};

/**
 * Add to stock
 * @param {number} quantity - Quantity to add
 */
inventorySchema.methods.addStock = function(quantity) {
  this.quantity += quantity;
};

/**
 * Remove from stock
 * @param {number} quantity - Quantity to remove
 * @returns {boolean} True if removal was successful
 */
inventorySchema.methods.removeStock = function(quantity) {
  if (this.quantity < quantity) {
    return false;
  }
  this.quantity -= quantity;
  return true;
};

// Static method to get inventory for an item in a warehouse
inventorySchema.statics.findByItemAndWarehouse = async function(itemId, warehouseId, locationId = null) {
  const query = { item: itemId, warehouse: warehouseId };
  if (locationId) {
    query.location = locationId;
  }
  return this.findOne(query);
};

// Static method to get all inventory for a warehouse
inventorySchema.statics.findByWarehouse = function(warehouseId, options = {}) {
  const query = { warehouse: warehouseId };
  
  if (options.itemId) {
    query.item = options.itemId;
  }
  
  if (options.locationId) {
    query.location = options.locationId;
  }
  
  if (options.lowStock) {
    query.quantity = { $lte: options.lowStockThreshold || 10 };
  }
  
  if (options.onlyAvailable) {
    query.quantity = { $gt: 0 };
  }
  
  return this.find(query).populate('item', 'name code unit');
};

// Static method to get total stock across all warehouses
inventorySchema.statics.getTotalStock = function(itemId) {
  return this.aggregate([
    { $match: { item: new mongoose.Types.ObjectId(itemId) } },
    { $group: { _id: null, total: { $sum: '$quantity' } } }
  ]).then(results => results[0]?.total || 0);
};

module.exports = mongoose.model('Inventory', inventorySchema);
