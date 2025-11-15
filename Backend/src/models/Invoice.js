const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative'],
  },
  lineTotal: {
    type: Number,
    required: [true, 'Line total is required'],
    min: [0, 'Line total cannot be negative'],
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
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Invoice number cannot exceed 50 characters'],
  },
  type: {
    type: String,
    required: [true, 'Invoice type is required'],
    enum: {
      values: ['sales', 'purchase'],
      message: 'Type must be either sales or purchase',
    },
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required() {
      return this.type === 'sales';
    },
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required() {
      return this.type === 'purchase';
    },
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  items: {
    type: [invoiceItemSchema],
    required: [true, 'Invoice must have at least one item'],
    validate: {
      validator(items) {
        return items && items.length > 0;
      },
      message: 'Invoice must contain at least one item',
    },
  },
  totals: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Total discount cannot be negative'],
    },
    totalTax: {
      type: Number,
      default: 0,
      min: [0, 'Total tax cannot be negative'],
    },
    grandTotal: {
      type: Number,
      required: [true, 'Grand total is required'],
      min: [0, 'Grand total cannot be negative'],
    },
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['draft', 'confirmed', 'paid', 'cancelled'],
      message: 'Status must be one of: draft, confirmed, paid, cancelled',
    },
    default: 'draft',
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: {
      values: ['pending', 'partial', 'paid'],
      message: 'Payment status must be one of: pending, partial, paid',
    },
    default: 'pending',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
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
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ type: 1, invoiceDate: -1 });
invoiceSchema.index({ customerId: 1, invoiceDate: -1 });
invoiceSchema.index({ supplierId: 1, invoiceDate: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdBy: 1 });

// Virtual for days until due
invoiceSchema.virtual('daysUntilDue').get(function () {
  const today = new Date();
  const diffTime = this.dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function () {
  return this.dueDate < new Date() && this.paymentStatus !== 'paid';
});

// Instance method to calculate totals
invoiceSchema.methods.calculateTotals = function () {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  this.items.forEach((item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const discountAmount = (itemSubtotal * item.discount) / 100;
    const taxableAmount = itemSubtotal - discountAmount;

    subtotal += itemSubtotal;
    totalDiscount += discountAmount;
    totalTax += item.taxAmount;

    // Update line total
    item.lineTotal = taxableAmount + item.taxAmount;
  });

  this.totals = {
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal: subtotal - totalDiscount + totalTax,
  };

  return this.totals;
};

// Instance method to add item
invoiceSchema.methods.addItem = function (itemData) {
  this.items.push(itemData);
  this.calculateTotals();
  return this;
};

// Instance method to remove item
invoiceSchema.methods.removeItem = function (itemId) {
  this.items = this.items.filter((item) => !item.itemId.equals(itemId));
  this.calculateTotals();
  return this;
};

// Instance method to confirm invoice
invoiceSchema.methods.confirm = function () {
  if (this.status === 'draft') {
    this.status = 'confirmed';
  }
  return this.save();
};

// Instance method to mark as paid
invoiceSchema.methods.markAsPaid = function () {
  this.paymentStatus = 'paid';
  this.status = 'paid';
  return this.save();
};

// Static method to find overdue invoices
invoiceSchema.statics.findOverdueInvoices = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    paymentStatus: { $ne: 'paid' },
    status: { $ne: 'cancelled' },
  });
};

// Static method to find invoices by date range
invoiceSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    invoiceDate: {
      $gte: startDate,
      $lte: endDate,
    },
  });
};

// Static method to generate next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function (type) {
  const prefix = type === 'sales' ? 'SI' : 'PI';
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    type,
    invoiceNumber: new RegExp(`^${prefix}${year}`),
  });
  return `${prefix}${year}${String(count + 1).padStart(6, '0')}`;
};

// Pre-save middleware to generate invoice number
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber && this.isNew) {
    this.invoiceNumber = await this.constructor.generateInvoiceNumber(this.type);
  }

  // Calculate totals before saving
  this.calculateTotals();

  next();
});

// Pre-save validation
invoiceSchema.pre('save', function (next) {
  // Validate due date is not before invoice date
  if (this.dueDate < this.invoiceDate) {
    return next(new Error('Due date cannot be before invoice date'));
  }

  // Validate customer/supplier based on type
  if (this.type === 'sales' && !this.customerId) {
    return next(new Error('Customer ID is required for sales invoices'));
  }

  if (this.type === 'purchase' && !this.supplierId) {
    return next(new Error('Supplier ID is required for purchase invoices'));
  }

  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
