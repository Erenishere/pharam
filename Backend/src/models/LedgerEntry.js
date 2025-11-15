const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Account ID is required'],
    refPath: 'accountType',
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: {
      values: ['Customer', 'Supplier', 'User'],
      message: 'Account type must be one of: Customer, Supplier, User',
    },
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['debit', 'credit'],
      message: 'Transaction type must be either debit or credit',
    },
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  referenceType: {
    type: String,
    required: [true, 'Reference type is required'],
    enum: {
      values: ['invoice', 'payment', 'adjustment', 'opening_balance', 'cash_receipt', 'cash_payment'],
      message: 'Reference type must be one of: invoice, payment, adjustment, opening_balance, cash_receipt, cash_payment',
    },
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required() {
      return ['invoice', 'payment', 'cash_receipt', 'cash_payment'].includes(this.referenceType);
    },
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now,
  },
  currency: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'PKR',
    maxlength: [3, 'Currency code must be 3 characters'],
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: [0.01, 'Exchange rate must be greater than 0'],
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
ledgerEntrySchema.index({ accountId: 1, transactionDate: -1 });
ledgerEntrySchema.index({ accountType: 1 });
ledgerEntrySchema.index({ transactionType: 1 });
ledgerEntrySchema.index({ referenceType: 1, referenceId: 1 });
ledgerEntrySchema.index({ transactionDate: -1 });
ledgerEntrySchema.index({ createdBy: 1 });
ledgerEntrySchema.index({ currency: 1 });

// Virtual for amount in base currency
ledgerEntrySchema.virtual('baseAmount').get(function () {
  return this.amount * this.exchangeRate;
});

// Virtual for transaction nature (positive/negative based on type)
ledgerEntrySchema.virtual('signedAmount').get(function () {
  return this.transactionType === 'debit' ? this.amount : -this.amount;
});

// Instance method to get transaction description
ledgerEntrySchema.methods.getTransactionDescription = function () {
  const descriptions = {
    invoice: 'Invoice transaction',
    payment: 'Payment received/made',
    adjustment: 'Account adjustment',
    opening_balance: 'Opening balance',
    cash_receipt: 'Cash receipt',
    cash_payment: 'Cash payment',
  };

  return descriptions[this.referenceType] || 'Unknown transaction';
};

// Instance method to reverse entry
ledgerEntrySchema.methods.createReverseEntry = function (reason = 'Reversal entry') {
  const reverseType = this.transactionType === 'debit' ? 'credit' : 'debit';

  return new this.constructor({
    accountId: this.accountId,
    accountType: this.accountType,
    transactionType: reverseType,
    amount: this.amount,
    description: `${reason} - Reverse of: ${this.description}`,
    referenceType: 'adjustment',
    transactionDate: new Date(),
    currency: this.currency,
    exchangeRate: this.exchangeRate,
    createdBy: this.createdBy,
  });
};

// Static method to find entries by account
ledgerEntrySchema.statics.findByAccount = function (accountId, limit = 50) {
  return this.find({ accountId })
    .sort({ transactionDate: -1 })
    .limit(limit)
    .populate('createdBy', 'username');
};

// Static method to calculate account balance
ledgerEntrySchema.statics.calculateAccountBalance = async function (accountId, asOfDate = new Date()) {
  const entries = await this.find({
    accountId,
    transactionDate: { $lte: asOfDate },
  }).sort({ transactionDate: 1 });

  let balance = 0;
  entries.forEach((entry) => {
    if (entry.transactionType === 'debit') {
      balance += entry.amount;
    } else {
      balance -= entry.amount;
    }
  });

  return balance;
};

// Static method to find entries by date range
ledgerEntrySchema.statics.findByDateRange = function (startDate, endDate, accountId = null) {
  const query = {
    transactionDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (accountId) {
    query.accountId = accountId;
  }

  return this.find(query).sort({ transactionDate: -1 });
};

// Static method to find entries by reference
ledgerEntrySchema.statics.findByReference = function (referenceType, referenceId) {
  return this.find({ referenceType, referenceId });
};

// Static method to get account statement
ledgerEntrySchema.statics.getAccountStatement = async function (accountId, startDate, endDate) {
  // Get opening balance
  const openingBalance = await this.calculateAccountBalance(accountId, startDate);

  // Get transactions in date range
  const transactions = await this.findByDateRange(startDate, endDate, accountId);

  // Calculate running balance
  let runningBalance = openingBalance;
  const statement = transactions.map((transaction) => {
    if (transaction.transactionType === 'debit') {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }

    return {
      ...transaction.toObject(),
      runningBalance,
    };
  });

  return {
    openingBalance,
    transactions: statement,
    closingBalance: runningBalance,
  };
};

// Static method to create double entry
ledgerEntrySchema.statics.createDoubleEntry = async function (debitAccount, creditAccount, amount, description, referenceType, referenceId, createdBy) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Create debit entry
      const debitEntry = new this({
        accountId: debitAccount.accountId,
        accountType: debitAccount.accountType,
        transactionType: 'debit',
        amount,
        description,
        referenceType,
        referenceId,
        createdBy,
      });

      // Create credit entry
      const creditEntry = new this({
        accountId: creditAccount.accountId,
        accountType: creditAccount.accountType,
        transactionType: 'credit',
        amount,
        description,
        referenceType,
        referenceId,
        createdBy,
      });

      await debitEntry.save({ session });
      await creditEntry.save({ session });

      return { debitEntry, creditEntry };
    });
  } finally {
    await session.endSession();
  }
};

// Pre-save validation
ledgerEntrySchema.pre('save', function (next) {
  // Validate transaction date is not in the future
  if (this.transactionDate > new Date()) {
    return next(new Error('Transaction date cannot be in the future'));
  }

  // Validate amount is positive
  if (this.amount <= 0) {
    return next(new Error('Amount must be greater than zero'));
  }

  next();
});

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
