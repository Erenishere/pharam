const mongoose = require('mongoose');

const reconciliationItemSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      required: true,
      enum: ['receipt', 'payment'],
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'items.transactionModel',
    },
    transactionModel: {
      type: String,
      enum: ['CashReceipt', 'CashPayment'],
    },
    transactionNumber: String,
    transactionDate: Date,
    amount: Number,
    bankStatementDate: Date,
    bankStatementAmount: Number,
    bankReference: String,
    status: {
      type: String,
      enum: ['matched', 'unmatched', 'discrepancy'],
      default: 'unmatched',
    },
    discrepancyReason: String,
    discrepancyAmount: Number,
  },
  { _id: false }
);

const bankReconciliationSchema = new mongoose.Schema(
  {
    reconciliationNumber: {
      type: String,
      required: [true, 'Reconciliation number is required'],
      unique: true,
      trim: true,
    },
    bankAccount: {
      accountName: {
        type: String,
        required: [true, 'Bank account name is required'],
        trim: true,
      },
      accountNumber: {
        type: String,
        required: [true, 'Bank account number is required'],
        trim: true,
      },
      bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true,
      },
    },
    reconciliationDate: {
      type: Date,
      required: [true, 'Reconciliation date is required'],
      default: Date.now,
    },
    statementPeriod: {
      startDate: {
        type: Date,
        required: [true, 'Statement start date is required'],
      },
      endDate: {
        type: Date,
        required: [true, 'Statement end date is required'],
      },
    },
    openingBalance: {
      bookBalance: {
        type: Number,
        required: true,
        default: 0,
      },
      bankBalance: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    closingBalance: {
      bookBalance: {
        type: Number,
        required: true,
        default: 0,
      },
      bankBalance: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    items: [reconciliationItemSchema],
    summary: {
      totalReceipts: {
        type: Number,
        default: 0,
      },
      totalPayments: {
        type: Number,
        default: 0,
      },
      matchedItems: {
        type: Number,
        default: 0,
      },
      unmatchedItems: {
        type: Number,
        default: 0,
      },
      discrepancies: {
        type: Number,
        default: 0,
      },
      totalDiscrepancyAmount: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'completed', 'approved'],
      default: 'draft',
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
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bankReconciliationSchema.index({ reconciliationNumber: 1 }, { unique: true });
bankReconciliationSchema.index({ reconciliationDate: -1 });
bankReconciliationSchema.index({ 'bankAccount.accountNumber': 1 });
bankReconciliationSchema.index({ status: 1 });
bankReconciliationSchema.index({ createdBy: 1 });

// Virtual for reconciliation status
bankReconciliationSchema.virtual('isReconciled').get(function () {
  return this.summary.unmatchedItems === 0 && this.summary.discrepancies === 0;
});

// Instance method to calculate summary
bankReconciliationSchema.methods.calculateSummary = function () {
  const summary = {
    totalReceipts: 0,
    totalPayments: 0,
    matchedItems: 0,
    unmatchedItems: 0,
    discrepancies: 0,
    totalDiscrepancyAmount: 0,
  };

  this.items.forEach((item) => {
    if (item.transactionType === 'receipt') {
      summary.totalReceipts += item.amount || 0;
    } else {
      summary.totalPayments += item.amount || 0;
    }

    if (item.status === 'matched') {
      summary.matchedItems++;
    } else if (item.status === 'unmatched') {
      summary.unmatchedItems++;
    } else if (item.status === 'discrepancy') {
      summary.discrepancies++;
      summary.totalDiscrepancyAmount += Math.abs(item.discrepancyAmount || 0);
    }
  });

  this.summary = summary;
  return summary;
};

// Instance method to complete reconciliation
bankReconciliationSchema.methods.complete = function () {
  if (this.status === 'draft') {
    this.calculateSummary();
    this.status = 'completed';
    return this.save();
  }
  throw new Error('Only draft reconciliations can be completed');
};

// Instance method to approve reconciliation
bankReconciliationSchema.methods.approve = function (userId) {
  if (this.status === 'completed') {
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    return this.save();
  }
  throw new Error('Only completed reconciliations can be approved');
};

// Static method to generate reconciliation number
bankReconciliationSchema.statics.generateReconciliationNumber = async function () {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const count = await this.countDocuments({
    reconciliationNumber: new RegExp(`^BR${year}${month}`),
  });
  return `BR${year}${month}${String(count + 1).padStart(4, '0')}`;
};

// Pre-save middleware to generate reconciliation number
bankReconciliationSchema.pre('save', async function (next) {
  if (!this.reconciliationNumber && this.isNew) {
    this.reconciliationNumber = await this.constructor.generateReconciliationNumber();
  }

  // Calculate summary before saving
  if (this.isModified('items')) {
    this.calculateSummary();
  }

  next();
});

// Pre-save validation
bankReconciliationSchema.pre('save', function (next) {
  // Validate statement period
  if (this.statementPeriod.startDate > this.statementPeriod.endDate) {
    return next(new Error('Statement start date must be before end date'));
  }

  next();
});

module.exports = mongoose.model('BankReconciliation', bankReconciliationSchema);
