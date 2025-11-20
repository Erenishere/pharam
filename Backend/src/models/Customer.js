const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Customer code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Customer code cannot exceed 20 characters'],
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters'],
  },
  type: {
    type: String,
    required: [true, 'Customer type is required'],
    enum: {
      values: ['customer', 'supplier', 'both'],
      message: 'Type must be one of: customer, supplier, both',
    },
    default: 'customer',
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'Pakistan',
    },
  },
  financialInfo: {
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative'],
    },
    paymentTerms: {
      type: Number,
      default: 30,
      min: [0, 'Payment terms cannot be negative'],
      max: [365, 'Payment terms cannot exceed 365 days'],
    },
    taxNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax number cannot exceed 50 characters'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'PKR',
      maxlength: [3, 'Currency code must be 3 characters'],
    },
    // Phase 2 - Account-based tax determination (Requirement 6.3, 6.4)
    advanceTaxRate: {
      type: Number,
      enum: [0, 0.5, 2.5],
      default: 0,
    },
    isNonFiler: {
      type: Boolean,
      default: false,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
customerSchema.index({ code: 1 }, { unique: true });
customerSchema.index({ name: 1 });
customerSchema.index({ type: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ 'contactInfo.city': 1 });
customerSchema.index({ 'financialInfo.creditLimit': 1 });

// Virtual for full contact info
customerSchema.virtual('fullAddress').get(function () {
  const parts = [];
  if (this.contactInfo.address) parts.push(this.contactInfo.address);
  if (this.contactInfo.city) parts.push(this.contactInfo.city);
  if (this.contactInfo.country) parts.push(this.contactInfo.country);
  return parts.join(', ');
});

// Instance method to check credit availability
customerSchema.methods.checkCreditAvailability = function (amount) {
  return this.financialInfo.creditLimit >= amount;
};

// Instance method to get available credit
customerSchema.methods.getAvailableCredit = function () {
  // This would need to be calculated with actual receivables
  // For now, returning the credit limit
  return this.financialInfo.creditLimit;
};

// Phase 2 - Instance method to get advance tax rate (Requirement 6.3)
customerSchema.methods.getAdvanceTaxRate = function () {
  return this.financialInfo.advanceTaxRate || 0;
};

// Phase 2 - Instance method to check if customer is non-filer (Requirement 6.4)
customerSchema.methods.isNonFilerAccount = function () {
  return this.financialInfo.isNonFiler === true;
};

// Phase 2 - Instance method to calculate advance tax amount (Requirement 6.3)
customerSchema.methods.calculateAdvanceTax = function (amount) {
  const rate = this.getAdvanceTaxRate();
  return (amount * rate) / 100;
};

// Phase 2 - Instance method to calculate non-filer GST amount (Requirement 6.4)
customerSchema.methods.calculateNonFilerGST = function (amount) {
  if (this.isNonFilerAccount()) {
    return (amount * 0.1) / 100; // 0.1% additional GST for non-filers
  }
  return 0;
};

// Static method to find customers with credit limit
customerSchema.statics.findWithCreditLimit = function (minLimit = 0) {
  return this.find({
    type: { $in: ['customer', 'both'] },
    'financialInfo.creditLimit': { $gte: minLimit },
    isActive: true,
  });
};

// Static method to find by type
customerSchema.statics.findByType = function (type) {
  return this.find({ type, isActive: true });
};

// Pre-save middleware to generate code if not provided
customerSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
