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
  // Phase 2 - Warehouse tracking (Requirement 3)
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  // Phase 2 - Box/Unit quantities (Requirement 12)
  boxQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Box quantity cannot be negative'],
  },
  unitQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Unit quantity cannot be negative'],
  },
  boxRate: {
    type: Number,
    default: 0,
    min: [0, 'Box rate cannot be negative'],
  },
  unitRate: {
    type: Number,
    default: 0,
    min: [0, 'Unit rate cannot be negative'],
  },
  // Phase 2 - Scheme tracking (Requirement 4)
  scheme1Quantity: {
    type: Number,
    default: 0,
    min: [0, 'Scheme 1 quantity cannot be negative'],
  },
  scheme2Quantity: {
    type: Number,
    default: 0,
    min: [0, 'Scheme 2 quantity cannot be negative'],
  },
  // Phase 2 - Advanced discounts (Requirement 5)
  discount1Percent: {
    type: Number,
    default: 0,
    min: [0, 'Discount 1 percent cannot be negative'],
    max: [100, 'Discount 1 percent cannot exceed 100%'],
  },
  discount1Amount: {
    type: Number,
    default: 0,
    min: [0, 'Discount 1 amount cannot be negative'],
  },
  discount2Percent: {
    type: Number,
    default: 0,
    min: [0, 'Discount 2 percent cannot be negative'],
    max: [100, 'Discount 2 percent cannot exceed 100%'],
  },
  discount2Amount: {
    type: Number,
    default: 0,
    min: [0, 'Discount 2 amount cannot be negative'],
  },
  // Phase 2 - Advance tax (Requirement 6)
  advanceTaxPercent: {
    type: Number,
    enum: [0, 0.5, 2.5],
    default: 0,
  },
  advanceTaxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Advance tax amount cannot be negative'],
  },
  // Phase 2 - Dual GST rate support (Requirement 2.2)
  gstRate: {
    type: Number,
    enum: [0, 4, 18],
    default: 18,
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: [0, 'GST amount cannot be negative'],
  },
  // Phase 2 - Dimension tracking (Requirement 24)
  dimension: {
    type: String,
    trim: true,
    maxlength: [100, 'Dimension cannot exceed 100 characters'],
  },
  // Phase 2 - Warranty per item (Requirement 32)
  warrantyMonths: {
    type: Number,
    min: [0, 'Warranty months cannot be negative'],
    default: 0,
  },
  warrantyDetails: {
    type: String,
    trim: true,
    maxlength: [200, 'Warranty details cannot exceed 200 characters'],
  },
  // Phase 2 - Carton quantity per item (Requirement 28)
  cartonQty: {
    type: Number,
    default: 0,
    min: [0, 'Carton quantity cannot be negative'],
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
      values: ['sales', 'purchase', 'return_sales', 'return_purchase'],
      message: 'Type must be one of: sales, purchase, return_sales, return_purchase',
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
      return this.type === 'purchase' || this.type === 'return_purchase';
    },
  },
  // Phase 2 - Return invoice support (Requirement 1.1, 1.9)
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required() {
      return this.type === 'return_sales' || this.type === 'return_purchase';
    },
  },
  returnMetadata: {
    returnReason: {
      type: String,
      enum: ['damaged', 'expired', 'wrong_item', 'quality_issue', 'other'],
    },
    returnNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Return notes cannot exceed 500 characters'],
    },
    returnDate: {
      type: Date,
    },
  },
  // Phase 2 - Sales-specific fields (Requirement 1.10, 1.11)
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
  },
  poNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'PO number cannot exceed 50 characters'],
  },
  poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },
  adjustmentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  claimAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  memoNo: {
    type: String,
    trim: true,
    maxlength: [50, 'Memo number cannot exceed 50 characters'],
  },
  creditDays: {
    type: Number,
    default: 0,
    min: [0, 'Credit days cannot be negative'],
  },
  warrantyInfo: {
    type: String,
    trim: true,
    maxlength: [500, 'Warranty info cannot exceed 500 characters'],
  },
  warrantyPaste: {
    type: Boolean,
    default: false,
  },
  businessLogo: {
    type: String,
    trim: true,
  },
  // Phase 2 - Purchase-specific fields (Requirement 2.1, 2.3, 2.6)
  supplierBillNo: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier bill number cannot exceed 100 characters'],
    required() {
      return this.type === 'purchase' || this.type === 'return_purchase';
    },
  },
  dimension: {
    type: String,
    trim: true,
    maxlength: [100, 'Dimension cannot exceed 100 characters'],
  },
  biltyNo: {
    type: String,
    trim: true,
    maxlength: [50, 'Bilty number cannot exceed 50 characters'],
  },
  biltyDate: {
    type: Date,
  },
  transportCompany: {
    type: String,
    trim: true,
    maxlength: [100, 'Transport company cannot exceed 100 characters'],
  },
  transportCharges: {
    type: Number,
    default: 0,
    min: [0, 'Transport charges cannot be negative'],
  },
  biltyStatus: {
    type: String,
    enum: {
      values: ['pending', 'in_transit', 'received'],
      message: 'Bilty status must be one of: pending, in_transit, received',
    },
    default: 'pending',
  },
  // Phase 2 - Trade offers (Requirement 20)
  to1Percent: {
    type: Number,
    default: 0,
    min: [0, 'TO1 percent cannot be negative'],
    max: [100, 'TO1 percent cannot exceed 100%'],
  },
  to1Amount: {
    type: Number,
    default: 0,
    min: [0, 'TO1 amount cannot be negative'],
  },
  to2Percent: {
    type: Number,
    default: 0,
    min: [0, 'TO2 percent cannot be negative'],
    max: [100, 'TO2 percent cannot exceed 100%'],
  },
  to2Amount: {
    type: Number,
    default: 0,
    min: [0, 'TO2 amount cannot be negative'],
  },
  // Phase 2 - Income tax (Requirement 23)
  incomeTax: {
    type: Number,
    default: 0,
    min: [0, 'Income tax cannot be negative'],
  },
  // Phase 2 - Carton quantity (Requirement 28)
  cartonQty: {
    type: Number,
    default: 0,
    min: [0, 'Carton quantity cannot be negative'],
  },
  // Phase 2 - Previous balance display (Requirement 29)
  previousBalance: {
    type: Number,
    default: 0,
    min: [0, 'Previous balance cannot be negative'],
  },
  totalBalance: {
    type: Number,
    default: 0,
    min: [0, 'Total balance cannot be negative'],
  },
  creditLimitExceeded: {
    type: Boolean,
    default: false,
  },
  availableCredit: {
    type: Number,
    default: 0,
  },
  creditLimitWarning: {
    type: String,
    trim: true,
  },
  // Phase 2 - Estimate/Quotation (Requirement 31)
  estimatePrint: {
    type: Boolean,
    default: false,
  },
  expiryDate: {
    type: Date,
    validate: {
      validator(value) {
        // Only validate if expiryDate is provided
        if (!value) return true;
        // Expiry date must be after invoice date
        return !this.invoiceDate || value >= this.invoiceDate;
      },
      message: 'Expiry date must be after invoice date',
    },
  },
  printFormat: {
    type: String,
    enum: ['standard', 'logo', 'letterhead', 'thermal', 'estimate', 'voucher', 'store_copy', 'tax_invoice', 'warranty_bill'],
    default: 'standard',
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
    // Phase 2 - Enhanced tax breakdown (Requirement 6, 7, 8)
    gst18Total: {
      type: Number,
      default: 0,
      min: [0, 'GST 18% total cannot be negative'],
    },
    gst4Total: {
      type: Number,
      default: 0,
      min: [0, 'GST 4% total cannot be negative'],
    },
    advanceTaxTotal: {
      type: Number,
      default: 0,
      min: [0, 'Advance tax total cannot be negative'],
    },
    nonFilerGSTTotal: {
      type: Number,
      default: 0,
      min: [0, 'Non-filer GST total cannot be negative'],
    },
    incomeTaxTotal: {
      type: Number,
      default: 0,
      min: [0, 'Income tax total cannot be negative'],
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

// Indexes (unique indexes already handled by schema 'unique: true')
invoiceSchema.index({ type: 1, invoiceDate: -1 });
invoiceSchema.index({ customerId: 1, invoiceDate: -1 });
invoiceSchema.index({ supplierId: 1, invoiceDate: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdBy: 1 });
invoiceSchema.index({ originalInvoiceId: 1 });
invoiceSchema.index({ supplierBillNo: 1, supplierId: 1 });
invoiceSchema.index({ dimension: 1 });
invoiceSchema.index({ salesmanId: 1 });
invoiceSchema.index({ poId: 1 });
invoiceSchema.index({ expiryDate: 1 });

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

// Virtual for expired estimate status (Task 75.5)
invoiceSchema.virtual('isExpired').get(function () {
  // Only estimates can expire
  if (!this.estimatePrint || !this.expiryDate) {
    return false;
  }
  return this.expiryDate < new Date() && this.status === 'draft';
});

// Phase 2 - Instance method to calculate all applicable taxes (Requirement 6.1, 6.2, 6.3, 6.4)
invoiceSchema.methods.calculateTotals = async function () {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let gst18Total = 0;
  let gst4Total = 0;
  let advanceTaxTotal = 0;
  let nonFilerGSTTotal = 0;

  // Get customer/supplier for account-based tax determination
  let account = null;
  if (this.customerId) {
    const Customer = mongoose.model('Customer');
    account = await Customer.findById(this.customerId);
  } else if (this.supplierId) {
    const Supplier = mongoose.model('Supplier');
    account = await Supplier.findById(this.supplierId);
  }

  this.items.forEach((item) => {
    let itemSubtotal;

    // Phase 2: Calculate subtotal using box/unit quantities if provided
    if ((item.boxQuantity && item.boxQuantity > 0) || (item.unitQuantity && item.unitQuantity > 0)) {
      // Use box/unit calculation: (boxQty × boxRate) + (unitQty × unitRate)
      const boxTotal = (item.boxQuantity || 0) * (item.boxRate || 0);
      const unitTotal = (item.unitQuantity || 0) * (item.unitRate || 0);
      itemSubtotal = boxTotal + unitTotal;
    } else {
      // Fallback to standard calculation
      itemSubtotal = item.quantity * item.unitPrice;
    }

    const discountAmount = (itemSubtotal * item.discount) / 100;
    const taxableAmount = itemSubtotal - discountAmount;

    subtotal += itemSubtotal;
    totalDiscount += discountAmount;

    // Phase 2: Calculate GST based on rate (Requirement 6.1, 6.2)
    if (item.gstRate && item.gstRate > 0) {
      const gstAmount = (taxableAmount * item.gstRate) / 100;
      item.gstAmount = gstAmount;

      // Separate GST by rate (Requirement 2.2, 2.7)
      if (item.gstRate === 18) {
        gst18Total += gstAmount;
      } else if (item.gstRate === 4) {
        gst4Total += gstAmount;
      }
    }

    // Phase 2: Calculate advance tax based on account registration (Requirement 6.3)
    if (account && account.getAdvanceTaxRate) {
      const advanceTaxRate = account.getAdvanceTaxRate();
      if (advanceTaxRate > 0) {
        const advanceTaxAmount = account.calculateAdvanceTax(taxableAmount);
        item.advanceTaxPercent = advanceTaxRate;
        item.advanceTaxAmount = advanceTaxAmount;
        advanceTaxTotal += advanceTaxAmount;
      }
    }

    // Phase 2: Calculate non-filer GST if applicable (Requirement 6.4)
    if (account && account.isNonFilerAccount && account.isNonFilerAccount()) {
      const nonFilerGSTAmount = account.calculateNonFilerGST(taxableAmount);
      nonFilerGSTTotal += nonFilerGSTAmount;
    }

    // Calculate total tax for this item
    const itemTaxAmount = (item.gstAmount || 0) + (item.advanceTaxAmount || 0);
    item.taxAmount = itemTaxAmount;
    totalTax += itemTaxAmount;

    // Update line total
    item.lineTotal = taxableAmount + itemTaxAmount;
  });

  // Add non-filer GST to total tax
  totalTax += nonFilerGSTTotal;

  // Preserve existing tax breakdown fields if they exist
  const existingTotals = this.totals || {};

  // Phase 2: Calculate Trade Offers (Requirement 20)
  // If percent is provided, calculate amount. Otherwise use provided amount (fixed).
  if (this.to1Percent > 0) {
    this.to1Amount = (subtotal * this.to1Percent) / 100;
  }

  // TO2 is calculated on (Subtotal - TO1)
  const afterTO1 = subtotal - (this.to1Amount || 0);

  if (this.to2Percent > 0) {
    this.to2Amount = (afterTO1 * this.to2Percent) / 100;
  }

  const to1Amount = this.to1Amount || 0;
  const to2Amount = this.to2Amount || 0;

  this.totals = {
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal: subtotal - totalDiscount - to1Amount - to2Amount + totalTax,
    // Phase 2 tax breakdown fields - use calculated values
    gst18Total: gst18Total || 0,
    gst4Total: gst4Total || 0,
    advanceTaxTotal: advanceTaxTotal || 0,
    nonFilerGSTTotal: nonFilerGSTTotal || 0,
    incomeTaxTotal: existingTotals.incomeTaxTotal || 0,
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

// Pre-save middleware to generate invoice number and calculate cartons
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber && this.isNew) {
    this.invoiceNumber = await this.constructor.generateInvoiceNumber(this.type);
  }

  // Phase 2: Auto-calculate carton quantities using cartonCalculationService
  const cartonCalculationService = require('../services/cartonCalculationService');

  // Calculate carton quantity for each item
  this.items.forEach((item) => {
    if (item.boxQuantity && item.boxQuantity > 0) {
      item.cartonQty = cartonCalculationService.calculateItemCartonQty(item);
    } else {
      item.cartonQty = 0;
    }
  });

  // Calculate total carton quantity for the invoice
  this.cartonQty = cartonCalculationService.calculateInvoiceCartonQty(this);

  // Phase 2: Calculate totals with account-based taxes before saving
  await this.calculateTotals();

  // Phase 2: Calculate previous balance and check credit limit (Requirement 29)
  if (this.isNew || this.isModified('totals.grandTotal')) {
    const balanceCalculationService = require('../services/balanceCalculationService');

    // Only calculate for sales and purchase invoices with customer/supplier
    if ((this.type === 'sales' || this.type === 'return_sales') && this.customerId) {
      try {
        const balanceSummary = await balanceCalculationService.calculateBalanceSummary(
          this.customerId,
          this.invoiceDate,
          this.totals.grandTotal,
          'Customer'
        );

        this.previousBalance = balanceSummary.previousBalance;
        this.totalBalance = balanceSummary.totalBalance;
        this.creditLimitExceeded = balanceSummary.creditLimitExceeded;
        this.availableCredit = balanceSummary.availableCredit;
        this.creditLimitWarning = balanceSummary.warning || '';
      } catch (error) {
        console.error('Error calculating previous balance for customer:', error);
        // Set defaults if calculation fails
        this.previousBalance = 0;
        this.totalBalance = this.totals.grandTotal;
        this.creditLimitExceeded = false;
        this.availableCredit = 0;
        this.creditLimitWarning = '';
      }
    } else if ((this.type === 'purchase' || this.type === 'return_purchase') && this.supplierId) {
      try {
        const balanceSummary = await balanceCalculationService.calculateBalanceSummary(
          this.supplierId,
          this.invoiceDate,
          this.totals.grandTotal,
          'Supplier'
        );

        this.previousBalance = balanceSummary.previousBalance;
        this.totalBalance = balanceSummary.totalBalance;
        this.creditLimitExceeded = balanceSummary.creditLimitExceeded;
        this.availableCredit = balanceSummary.availableCredit;
        this.creditLimitWarning = balanceSummary.warning || '';
      } catch (error) {
        console.error('Error calculating previous balance for supplier:', error);
        // Set defaults if calculation fails
        this.previousBalance = 0;
        this.totalBalance = this.totals.grandTotal;
        this.creditLimitExceeded = false;
        this.availableCredit = 0;
        this.creditLimitWarning = '';
      }
    }
  }

  next();
});

// Pre-save validation
invoiceSchema.pre('save', function (next) {
  // Validate due date is not before invoice date
  if (this.dueDate < this.invoiceDate) {
    return next(new Error('Due date cannot be before invoice date'));
  }

  // Validate customer/supplier based on type
  if ((this.type === 'sales' || this.type === 'return_sales') && !this.customerId) {
    return next(new Error('Customer ID is required for sales invoices'));
  }

  if ((this.type === 'purchase' || this.type === 'return_purchase') && !this.supplierId) {
    return next(new Error('Supplier ID is required for purchase invoices'));
  }

  // Validate return invoices have originalInvoiceId
  if ((this.type === 'return_sales' || this.type === 'return_purchase') && !this.originalInvoiceId) {
    return next(new Error('Original invoice ID is required for return invoices'));
  }

  // Validate return metadata for return invoices
  if ((this.type === 'return_sales' || this.type === 'return_purchase') && !this.returnMetadata) {
    return next(new Error('Return metadata is required for return invoices'));
  }

  // Validate supplier bill number for purchase invoices
  if ((this.type === 'purchase' || this.type === 'return_purchase') && !this.supplierBillNo) {
    return next(new Error('Supplier bill number is required for purchase invoices'));
  }

  next();
});

// Pre-save hook to check for duplicate supplier bill number
invoiceSchema.pre('save', async function (next) {
  try {
    // Only check for purchase invoices
    if ((this.type === 'purchase' || this.type === 'return_purchase') && this.supplierId && this.supplierBillNo) {
      // Check for duplicate supplier bill number
      const query = {
        supplierId: this.supplierId,
        supplierBillNo: this.supplierBillNo,
        type: { $in: ['purchase', 'return_purchase'] },
        status: { $ne: 'cancelled' }
      };

      // Exclude current invoice if updating
      if (!this.isNew) {
        query._id = { $ne: this._id };
      }

      const existingInvoice = await this.constructor.findOne(query);

      if (existingInvoice) {
        return next(new Error(
          `Supplier bill number '${this.supplierBillNo}' already exists for this supplier ` +
          `(Invoice: ${existingInvoice.invoiceNumber} dated ${existingInvoice.invoiceDate.toLocaleDateString()})`
        ));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
