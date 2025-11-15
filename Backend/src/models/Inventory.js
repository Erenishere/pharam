const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
inventorySchema.index({ itemId: 1, locationId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
