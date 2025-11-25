const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Item code cannot exceed 20 characters'],
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [200, 'Item name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    maxlength: [20, 'Unit cannot exceed 20 characters'],
    enum: {
      values: ['piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'pack', 'dozen'],
      message: 'Unit must be one of: piece, kg, gram, liter, ml, meter, cm, box, pack, dozen',
    },
  },
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    salePrice: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: [0, 'Sale price cannot be negative'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'PKR',
      maxlength: [3, 'Currency code must be 3 characters'],
    },
  },
  tax: {
    gstRate: {
      type: Number,
      default: 0,
      min: [0, 'GST rate cannot be negative'],
      max: [100, 'GST rate cannot exceed 100%'],
    },
    whtRate: {
      type: Number,
      default: 0,
      min: [0, 'WHT rate cannot be negative'],
      max: [100, 'WHT rate cannot exceed 100%'],
    },
    taxCategory: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax category cannot exceed 50 characters'],
      default: 'standard',
    },
  },
  inventory: {
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Current stock cannot be negative'],
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock cannot be negative'],
    },
    maximumStock: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative'],
    },
  },
  // Phase 2 - Barcode Integration (Requirement 13.1 - Task 46.1)
  barcode: {
    type: String,
    trim: true,
    sparse: true, // Allows null/undefined but enforces uniqueness when present
    unique: true,
    maxlength: [50, 'Barcode cannot exceed 50 characters'],
  },
  // Phase 2 - Box/Unit System (Requirement 12.4 - Task 45.1)
  packSize: {
    type: Number,
    default: 1,
    min: [1, 'Pack size must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Pack size must be a whole number',
    },
  },
  // Phase 2 - Warranty Management (Requirement 32 - Task 76.5)
  defaultWarrantyMonths: {
    type: Number,
    default: 0,
    min: [0, 'Default warranty months cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Default warranty months must be a whole number',
    },
  },
  defaultWarrantyDetails: {
    type: String,
    trim: true,
    maxlength: [500, 'Default warranty details cannot exceed 500 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
itemSchema.index({ code: 1 }, { unique: true });
itemSchema.index({ name: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ isActive: 1 });
itemSchema.index({ 'inventory.currentStock': 1 });
itemSchema.index({ 'pricing.salePrice': 1 });
// Phase 2 indexes
itemSchema.index({ barcode: 1 }, { unique: true, sparse: true }); // Sparse allows null but enforces uniqueness
itemSchema.index({ packSize: 1 });

// Virtual for profit margin
itemSchema.virtual('profitMargin').get(function () {
  if (this.pricing.costPrice === 0) return 0;
  return ((this.pricing.salePrice - this.pricing.costPrice) / this.pricing.costPrice) * 100;
});

// Virtual for stock status
itemSchema.virtual('stockStatus').get(function () {
  if (this.inventory.currentStock <= 0) return 'out_of_stock';
  if (this.inventory.currentStock <= this.inventory.minimumStock) return 'low_stock';
  if (this.inventory.currentStock >= this.inventory.maximumStock) return 'overstock';
  return 'in_stock';
});

// Instance method to check stock availability
itemSchema.methods.checkStockAvailability = function (quantity) {
  return this.inventory.currentStock >= quantity;
};

// Instance method to calculate tax amount
itemSchema.methods.calculateTaxAmount = function (baseAmount) {
  const gstAmount = (baseAmount * this.tax.gstRate) / 100;
  const whtAmount = (baseAmount * this.tax.whtRate) / 100;
  return {
    gst: gstAmount,
    wht: whtAmount,
    total: gstAmount + whtAmount,
  };
};

// Instance method to update stock
itemSchema.methods.updateStock = function (quantity, operation = 'add') {
  if (operation === 'add') {
    this.inventory.currentStock += quantity;
  } else if (operation === 'subtract') {
    this.inventory.currentStock = Math.max(0, this.inventory.currentStock - quantity);
  }
  return this.save();
};

// Static method to find low stock items
itemSchema.statics.findLowStockItems = function () {
  return this.find({
    $expr: { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] },
    isActive: true,
  });
};

// Static method to find by category
itemSchema.statics.findByCategory = function (category) {
  return this.find({ category, isActive: true });
};

// Static method to find items in price range
itemSchema.statics.findByPriceRange = function (minPrice, maxPrice) {
  return this.find({
    'pricing.salePrice': { $gte: minPrice, $lte: maxPrice },
    isActive: true,
  });
};

// Pre-save middleware to generate code if not provided
itemSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `ITEM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Pre-save validation for stock levels
itemSchema.pre('save', function (next) {
  if (this.inventory.minimumStock > this.inventory.maximumStock) {
    return next(new Error('Minimum stock cannot be greater than maximum stock'));
  }
  if (this.pricing.costPrice > this.pricing.salePrice) {
    console.warn(`Item ${this.code}: Cost price is higher than sale price`);
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema);
