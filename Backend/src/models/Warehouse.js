const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Warehouse code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Warehouse code cannot exceed 10 characters'],
  },
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [100, 'Warehouse name cannot exceed 100 characters'],
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters'],
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },
  },
  contact: {
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  capacity: {
    type: Number,
    min: [0, 'Capacity cannot be negative'],
    description: 'Total storage capacity in cubic meters',
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  openingHours: {
    type: String,
    trim: true,
    maxlength: [100, 'Opening hours cannot exceed 100 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
warehouseSchema.index({ code: 1 }, { unique: true });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ 'location.city': 1, 'location.country': 1 });
warehouseSchema.index({ isActive: 1 });

// Virtual for inventory items in this warehouse
warehouseSchema.virtual('inventoryItems', {
  ref: 'Inventory',
  localField: '_id',
  foreignField: 'warehouse',
  justOne: false,
});

// Pre-save middleware to generate code if not provided
warehouseSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `WH${String(count + 1).padStart(4, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Method to check if warehouse has available capacity
warehouseSchema.methods.hasAvailableCapacity = function(requiredSpace) {
  if (!this.capacity) return true; // If capacity is not set, assume unlimited
  return this.usedCapacity + requiredSpace <= this.capacity;
};

// Static method to find warehouses by location
warehouseSchema.statics.findByLocation = function(city, country) {
  return this.find({
    'location.city': new RegExp(city, 'i'),
    'location.country': new RegExp(country, 'i'),
    isActive: true,
  });
};

// Static method to get warehouse statistics
warehouseSchema.statics.getStatistics = async function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'inventories',
        localField: '_id',
        foreignField: 'warehouse',
        as: 'inventory',
      },
    },
    {
      $project: {
        name: 1,
        code: 1,
        location: 1,
        itemCount: { $size: '$inventory' },
        totalStock: { $sum: '$inventory.quantity' },
        totalValue: {
          $sum: {
            $map: {
              input: '$inventory',
              as: 'inv',
              in: { $multiply: ['$$inv.quantity', '$$inv.unitCost'] },
            },
          },
        },
      },
    },
    { $sort: { name: 1 } },
  ]);
};

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

module.exports = Warehouse;
