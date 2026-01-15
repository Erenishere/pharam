const mongoose = require('mongoose');

const cashPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Payment number cannot exceed 50 characters'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['cash', 'cheque', 'bank_transfer', 'credit_card', 'debit_card'],
        message: 'Payment method must be one of: cash, cheque, bank_transfer, credit_card, debit_card',
      },
    },
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference number cannot exceed 100 characters'],
    },
    bankDetails: {
      bankName: {
        type: String,
        trim: true,
        maxlength: [100, 'Bank name cannot exceed 100 characters'],
      },
      accountNumber: {
        type: String,
        trim: true,
        maxlength: [50, 'Account number cannot exceed 50 characters'],
      },
      chequeNumber: {
        type: String,
        trim: true,
        maxlength: [50, 'Cheque number cannot exceed 50 characters'],
      },
      chequeDate: {
        type: Date,
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'cleared', 'cancelled'],
        message: 'Status must be one of: pending, cleared, cancelled',
      },
      default: 'pending',
    },
    clearedDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
cashPaymentSchema.index({ paymentNumber: 1 }, { unique: true });
cashPaymentSchema.index({ paymentDate: -1 });
cashPaymentSchema.index({ supplierId: 1, paymentDate: -1 });
cashPaymentSchema.index({ status: 1 });
cashPaymentSchema.index({ paymentMethod: 1 });
cashPaymentSchema.index({ createdBy: 1 });

// Virtual for days since payment
cashPaymentSchema.virtual('daysSincePayment').get(function () {
  const today = new Date();
  const diffTime = today - this.paymentDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to clear payment
cashPaymentSchema.methods.clearPayment = function () {
  if (this.status === 'pending') {
    this.status = 'cleared';
    this.clearedDate = new Date();
    return this.save();
  }
  throw new Error('Only pending payments can be cleared');
};

// Instance method to cancel payment
cashPaymentSchema.methods.cancelPayment = function () {
  if (this.status === 'pending') {
    this.status = 'cancelled';
    return this.save();
  }
  throw new Error('Only pending payments can be cancelled');
};

// Static method to generate payment number
cashPaymentSchema.statics.generatePaymentNumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    paymentNumber: new RegExp(`^CP${year}`),
  });
  return `CP${year}${String(count + 1).padStart(6, '0')}`;
};

// Static method to find payments by date range
cashPaymentSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    paymentDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).populate('supplierId', 'code name').populate('createdBy', 'username');
};

// Static method to find pending payments
cashPaymentSchema.statics.findPendingPayments = function () {
  return this.find({ status: 'pending' })
    .populate('supplierId', 'code name')
    .sort({ paymentDate: 1 });
};

// Pre-save middleware to generate payment number
cashPaymentSchema.pre('save', async function (next) {
  if (!this.paymentNumber && this.isNew) {
    this.paymentNumber = await this.constructor.generatePaymentNumber();
  }
  next();
});

// Pre-save validation
cashPaymentSchema.pre('save', function (next) {
  // If payment method is cheque, require cheque details
  if (this.paymentMethod === 'cheque') {
    if (!this.bankDetails || !this.bankDetails.chequeNumber) {
      return next(new Error('Cheque number is required for cheque payments'));
    }
  }

  // If payment method is bank transfer, require reference number
  if (this.paymentMethod === 'bank_transfer') {
    if (!this.referenceNumber) {
      return next(new Error('Reference number is required for bank transfers'));
    }
  }

  next();
});

module.exports = mongoose.model('CashPayment', cashPaymentSchema);
