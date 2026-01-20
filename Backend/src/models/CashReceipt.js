const mongoose = require('mongoose');

const cashReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Receipt number cannot exceed 50 characters'],
    },
    receiptDate: {
      type: Date,
      required: [true, 'Receipt date is required'],
      default: Date.now,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
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
    // Phase 2 - Post-Dated Cheque Management (Requirement 7.1, 7.2)
    postDatedCheque: {
      type: Boolean,
      default: false,
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
    // Phase 2 - Cheque status tracking (Requirement 7.3, 7.4)
    chequeStatus: {
      type: String,
      enum: {
        values: ['pending', 'cleared', 'bounced'],
        message: 'Cheque status must be one of: pending, cleared, bounced',
      },
    },
    bounceReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Bounce reason cannot exceed 500 characters'],
    },
    // Phase 2 - Invoice Payment Tracking (Requirement 8.1, 8.3, 8.4)
    invoicePayments: [
      {
        invoiceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
          required: true,
        },
        invoiceNumber: {
          type: String,
          required: true,
        },
        daysOld: {
          type: Number,
          required: true,
          min: 0,
        },
        dueAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        paidAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        difference: {
          type: Number,
          default: 0,
        },
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'cleared', 'bounced', 'cancelled'],
        message: 'Status must be one of: pending, cleared, bounced, cancelled',
      },
      default: 'pending',
    },
    clearedDate: {
      type: Date,
    },
    // Phase 2 - Salesman tracking (Requirement 9.2, 9.3)
    salesmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salesman',
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

// Indexes (unique indexes already handled by schema 'unique: true')
cashReceiptSchema.index({ receiptDate: -1 });
cashReceiptSchema.index({ customerId: 1, receiptDate: -1 });
cashReceiptSchema.index({ status: 1 });
cashReceiptSchema.index({ paymentMethod: 1 });
cashReceiptSchema.index({ createdBy: 1 });
cashReceiptSchema.index({ postDatedCheque: 1, 'bankDetails.chequeDate': 1 });
cashReceiptSchema.index({ chequeStatus: 1 });
cashReceiptSchema.index({ 'bankDetails.bankName': 1, 'bankDetails.chequeNumber': 1 });
cashReceiptSchema.index({ salesmanId: 1 });

// Virtual for days since receipt
cashReceiptSchema.virtual('daysSinceReceipt').get(function () {
  const today = new Date();
  const diffTime = today - this.receiptDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to clear receipt
cashReceiptSchema.methods.clearReceipt = function () {
  if (this.status === 'pending') {
    this.status = 'cleared';
    this.clearedDate = new Date();
    return this.save();
  }
  throw new Error('Only pending receipts can be cleared');
};

// Instance method to mark as bounced
cashReceiptSchema.methods.markAsBounced = function () {
  if (this.status === 'pending' || this.status === 'cleared') {
    this.status = 'bounced';
    return this.save();
  }
  throw new Error('Only pending or cleared receipts can be marked as bounced');
};

// Instance method to cancel receipt
cashReceiptSchema.methods.cancelReceipt = function () {
  if (this.status === 'pending') {
    this.status = 'cancelled';
    return this.save();
  }
  throw new Error('Only pending receipts can be cancelled');
};

// Static method to generate receipt number
cashReceiptSchema.statics.generateReceiptNumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    receiptNumber: new RegExp(`^CR${year}`),
  });
  return `CR${year}${String(count + 1).padStart(6, '0')}`;
};

// Static method to find receipts by date range
cashReceiptSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    receiptDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).populate('customerId', 'code name').populate('createdBy', 'username');
};

// Static method to find pending receipts
cashReceiptSchema.statics.findPendingReceipts = function () {
  return this.find({ status: 'pending' })
    .populate('customerId', 'code name')
    .sort({ receiptDate: 1 });
};

// Phase 2: Static method to find post-dated cheques by due date (Requirement 7.5)
cashReceiptSchema.statics.findPostDatedChequesByDueDate = function (startDate, endDate) {
  const query = {
    postDatedCheque: true,
    'bankDetails.chequeDate': {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.find(query)
    .populate('customerId', 'code name')
    .populate('createdBy', 'username')
    .sort({ 'bankDetails.chequeDate': 1 });
};

// Phase 2: Static method to find pending post-dated cheques (Requirement 7.5)
cashReceiptSchema.statics.findPendingPostDatedCheques = function () {
  return this.find({
    postDatedCheque: true,
    chequeStatus: 'pending'
  })
    .populate('customerId', 'code name')
    .sort({ 'bankDetails.chequeDate': 1 });
};

// Pre-save middleware to generate receipt number
cashReceiptSchema.pre('save', async function (next) {
  if (!this.receiptNumber && this.isNew) {
    this.receiptNumber = await this.constructor.generateReceiptNumber();
  }
  next();
});

// Phase 2: Pre-save hook to check for duplicate cheque numbers (Requirement 7.2)
cashReceiptSchema.pre('save', async function (next) {
  try {
    // Only check for cheque payments
    if (this.paymentMethod === 'cheque' && this.bankDetails && this.bankDetails.chequeNumber && this.bankDetails.bankName) {
      // Check for duplicate cheque number for the same bank
      const query = {
        paymentMethod: 'cheque',
        'bankDetails.bankName': this.bankDetails.bankName,
        'bankDetails.chequeNumber': this.bankDetails.chequeNumber,
        status: { $ne: 'cancelled' }
      };

      // Exclude current receipt if updating
      if (!this.isNew) {
        query._id = { $ne: this._id };
      }

      const existingReceipt = await this.constructor.findOne(query);

      if (existingReceipt) {
        return next(new Error(
          `Cheque number '${this.bankDetails.chequeNumber}' from ${this.bankDetails.bankName} already exists ` +
          `(Receipt: ${existingReceipt.receiptNumber} dated ${existingReceipt.receiptDate.toLocaleDateString()})`
        ));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save validation
cashReceiptSchema.pre('save', function (next) {
  // If payment method is cheque, require cheque details
  if (this.paymentMethod === 'cheque') {
    if (!this.bankDetails || !this.bankDetails.chequeNumber) {
      return next(new Error('Cheque number is required for cheque payments'));
    }
    
    // Phase 2: Validate post-dated cheque fields (Requirement 7.1, 7.2)
    if (this.postDatedCheque) {
      if (!this.bankDetails.chequeDate) {
        return next(new Error('Cheque date is required for post-dated cheques'));
      }
      
      if (!this.bankDetails.bankName) {
        return next(new Error('Bank name is required for post-dated cheques'));
      }
      
      // Validate cheque date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chequeDate = new Date(this.bankDetails.chequeDate);
      chequeDate.setHours(0, 0, 0, 0);
      
      if (chequeDate < today && this.isNew) {
        return next(new Error('Cheque date cannot be in the past for post-dated cheques'));
      }
      
      // Set initial cheque status to pending for post-dated cheques
      if (this.isNew && !this.chequeStatus) {
        this.chequeStatus = 'pending';
      }
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

module.exports = mongoose.model('CashReceipt', cashReceiptSchema);
