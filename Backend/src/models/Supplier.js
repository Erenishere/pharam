const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Supplier code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Supplier code cannot exceed 20 characters'],
  },
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    maxlength: [200, 'Supplier name cannot exceed 200 characters'],
  },
  type: {
    type: String,
    required: [true, 'Supplier type is required'],
    enum: {
      values: ['customer', 'supplier', 'both'],
      message: 'Type must be one of: customer, supplier, both',
    },
    default: 'supplier',
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
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
supplierSchema.index({ code: 1 }, { unique: true });
supplierSchema.index({ name: 1 });
supplierSchema.index({ type: 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ 'contactInfo.city': 1 });
supplierSchema.index({ 'financialInfo.paymentTerms': 1 });

// Virtual for full contact info
supplierSchema.virtual('fullAddress').get(function () {
  const parts = [];
  if (this.contactInfo.address) parts.push(this.contactInfo.address);
  if (this.contactInfo.city) parts.push(this.contactInfo.city);
  if (this.contactInfo.country) parts.push(this.contactInfo.country);
  return parts.join(', ');
});

// Instance method to check if supplier allows credit purchases
supplierSchema.methods.allowsCreditPurchases = function () {
  return this.financialInfo.creditLimit > 0;
};

// Instance method to get payment due date
supplierSchema.methods.getPaymentDueDate = function (invoiceDate = new Date()) {
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + this.financialInfo.paymentTerms);
  return dueDate;
};

// Static method to find suppliers with payment terms
supplierSchema.statics.findByPaymentTerms = function (maxTerms = 30) {
  return this.find({
    type: { $in: ['supplier', 'both'] },
    'financialInfo.paymentTerms': { $lte: maxTerms },
    isActive: true,
  });
};

// Static method to find by type
supplierSchema.statics.findByType = function (type) {
  return this.find({ type, isActive: true });
};

// Pre-save middleware to generate code if not provided
supplierSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.code = `SUPP${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
