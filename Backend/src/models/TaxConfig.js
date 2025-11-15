const mongoose = require('mongoose');

const taxConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tax name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Tax name cannot exceed 100 characters'],
  },
  code: {
    type: String,
    required: [true, 'Tax code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Tax code cannot exceed 20 characters'],
  },
  type: {
    type: String,
    required: [true, 'Tax type is required'],
    enum: {
      values: ['GST', 'WHT', 'SALES_TAX', 'CUSTOM'],
      message: 'Tax type must be one of: GST, WHT, SALES_TAX, CUSTOM',
    },
  },
  rate: {
    type: Number,
    required: [true, 'Tax rate is required'],
    min: [0, 'Tax rate cannot be negative'],
    max: [1, 'Tax rate cannot exceed 100% (1.0)'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  applicableOn: {
    type: String,
    enum: {
      values: ['sales', 'purchase', 'both'],
      message: 'Applicable on must be one of: sales, purchase, both',
    },
    default: 'both',
  },
  effectiveFrom: {
    type: Date,
    required: [true, 'Effective from date is required'],
    default: Date.now,
  },
  effectiveTo: {
    type: Date,
  },
  metadata: {
    srbCompliant: {
      type: Boolean,
      default: false,
    },
    fbrCompliant: {
      type: Boolean,
      default: false,
    },
    compoundTax: {
      type: Boolean,
      default: false,
    },
    taxOnTax: {
      type: Boolean,
      default: false,
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
taxConfigSchema.index({ code: 1 }, { unique: true });
taxConfigSchema.index({ type: 1, isActive: 1 });
taxConfigSchema.index({ category: 1 });
taxConfigSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
taxConfigSchema.index({ isDefault: 1 });

// Virtual for checking if tax is currently effective
taxConfigSchema.virtual('isCurrentlyEffective').get(function () {
  const now = new Date();
  const isAfterStart = this.effectiveFrom <= now;
  const isBeforeEnd = !this.effectiveTo || this.effectiveTo >= now;
  return this.isActive && isAfterStart && isBeforeEnd;
});

// Static method to find active taxes
taxConfigSchema.statics.findActiveTaxes = function (type = null) {
  const query = { isActive: true };
  if (type) {
    query.type = type;
  }
  return this.find(query).sort({ type: 1, rate: 1 });
};

// Static method to find effective taxes for a date
taxConfigSchema.statics.findEffectiveTaxes = function (date = new Date(), type = null) {
  const query = {
    isActive: true,
    effectiveFrom: { $lte: date },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: null },
      { effectiveTo: { $gte: date } },
    ],
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query).sort({ type: 1, rate: 1 });
};

// Static method to get default tax by type
taxConfigSchema.statics.getDefaultTax = function (type) {
  return this.findOne({
    type,
    isActive: true,
    isDefault: true,
  });
};

// Static method to find tax by category
taxConfigSchema.statics.findByCategory = function (category) {
  return this.find({
    category,
    isActive: true,
  });
};

// Instance method to activate tax
taxConfigSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Instance method to deactivate tax
taxConfigSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Instance method to set as default
taxConfigSchema.methods.setAsDefault = async function () {
  // Remove default flag from other taxes of same type
  await this.constructor.updateMany(
    { type: this.type, _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  this.isDefault = true;
  return this.save();
};

// Pre-save validation
taxConfigSchema.pre('save', function (next) {
  // Validate effective dates
  if (this.effectiveTo && this.effectiveTo < this.effectiveFrom) {
    return next(new Error('Effective to date cannot be before effective from date'));
  }
  
  // Ensure code is uppercase
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  
  next();
});

// Pre-save middleware to ensure only one default per type
taxConfigSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { type: this.type, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('TaxConfig', taxConfigSchema);
