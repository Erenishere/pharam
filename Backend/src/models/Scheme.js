const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Scheme name is required'],
    trim: true,
    maxlength: [100, 'Scheme name cannot exceed 100 characters'],
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['scheme1', 'scheme2'],
    required: [true, 'Scheme type is required'],
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company reference is required'],
    index: true
  },
  group: {
    type: String,
    trim: true,
    maxlength: [50, 'Group cannot exceed 50 characters'],
    index: true
  },
  schemeFormat: {
    type: String,
    required: [true, 'Scheme format is required'],
    trim: true,
    maxlength: [50, 'Scheme format cannot exceed 50 characters'],
    description: 'Format like "12+1" for buy 12 get 1 free'
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: [0, 'Discount percent cannot be negative'],
    max: [100, 'Discount percent cannot exceed 100']
  },
  discount2Percent: {
    type: Number,
    default: 0,
    min: [0, 'Discount 2 percent cannot be negative'],
    max: [100, 'Discount 2 percent cannot exceed 100'],
    description: 'Second discount percentage (e.g., 7.69%)'
  },
  to2Percent: {
    type: Number,
    default: 0,
    min: [0, 'TO2 percent cannot be negative'],
    max: [100, 'TO2 percent cannot exceed 100'],
    description: 'Trade Offer 2 percentage for this scheme'
  },
  claimAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    description: 'Account to link scheme claims to'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  applicableItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    description: 'Items this scheme applies to (empty means all items)'
  }],
  applicableCustomers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    description: 'Customers this scheme applies to (empty means all customers)'
  }],
  minimumQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Minimum quantity cannot be negative'],
    description: 'Minimum quantity required to qualify for scheme'
  },
  maximumQuantity: {
    type: Number,
    default: 0,
    description: 'Maximum quantity eligible for scheme (0 = unlimited)'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
schemeSchema.index({ name: 1 }, { unique: true });
schemeSchema.index({ type: 1, isActive: 1 });
schemeSchema.index({ company: 1, isActive: 1 });
schemeSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if scheme is currently active (date-wise)
schemeSchema.virtual('isCurrentlyActive').get(function () {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

// Pre-save middleware
schemeSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date'));
  }
  this.updatedAt = Date.now();
  next();
});

// Static method to get active schemes
schemeSchema.statics.getActiveSchemes = function (companyId = null) {
  const now = new Date();
  const query = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  };

  if (companyId) {
    query.company = companyId;
  }

  return this.find(query).sort({ name: 1 });
};

// Static method to get schemes by type
schemeSchema.statics.getSchemesByType = function (type, companyId = null) {
  const query = { type, isActive: true };

  if (companyId) {
    query.company = companyId;
  }

  return this.find(query).sort({ name: 1 });
};

// Static method to get schemes by group
schemeSchema.statics.getSchemesByGroup = function (group, companyId = null) {
  const query = { group, isActive: true };

  if (companyId) {
    query.company = companyId;
  }

  return this.find(query).sort({ name: 1 });
};

// Instance method to check if item is eligible
schemeSchema.methods.isItemEligible = function (itemId) {
  if (this.applicableItems.length === 0) {
    return true; // All items eligible if no specific items listed
  }
  return this.applicableItems.some(id => id.toString() === itemId.toString());
};

// Instance method to check if customer is eligible
schemeSchema.methods.isCustomerEligible = function (customerId) {
  if (this.applicableCustomers.length === 0) {
    return true; // All customers eligible if no specific customers listed
  }
  return this.applicableCustomers.some(id => id.toString() === customerId.toString());
};

// Instance method to check if quantity qualifies
schemeSchema.methods.qualifiesForScheme = function (quantity) {
  if (quantity < this.minimumQuantity) {
    return false;
  }
  if (this.maximumQuantity > 0 && quantity > this.maximumQuantity) {
    return false;
  }
  return true;
};

const Scheme = mongoose.model('Scheme', schemeSchema);

module.exports = Scheme;
