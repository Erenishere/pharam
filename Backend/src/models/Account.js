const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters'],
    index: true
  },
  code: {
    type: String,
    required: [true, 'Account code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Account code cannot exceed 20 characters'],
    unique: true,
    index: true
  },
  accountNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Account number cannot exceed 50 characters'],
    unique: true,
    sparse: true
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: {
      values: ['asset', 'liability', 'equity', 'revenue', 'expense', 'adjustment', 'claim'],
      message: 'Account type must be one of: asset, liability, equity, revenue, expense, adjustment, claim'
    },
    index: true
  },
  parentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    description: 'Parent account for sub-accounts'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSystemAccount: {
    type: Boolean,
    default: false,
    description: 'System accounts cannot be deleted'
  },
  balance: {
    type: Number,
    default: 0,
    description: 'Current account balance'
  },
  currency: {
    type: String,
    default: 'PKR',
    maxlength: [3, 'Currency code cannot exceed 3 characters']
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

// Indexes (avoid duplicating indexes defined with 'index: true' in schema)
accountSchema.index({ accountType: 1, isActive: 1 });
accountSchema.index({ parentAccountId: 1 });

// Virtual for full account name (includes parent if applicable)
accountSchema.virtual('fullName').get(function() {
  if (this.parentAccountId && this.populated('parentAccountId')) {
    return `${this.parentAccountId.name} - ${this.name}`;
  }
  return this.name;
});

// Pre-save middleware
accountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get accounts by type
accountSchema.statics.getAccountsByType = function(accountType, isActive = true) {
  const query = { accountType };
  if (isActive !== null) {
    query.isActive = isActive;
  }
  return this.find(query).sort({ name: 1 });
};

// Static method to get claim accounts
accountSchema.statics.getClaimAccounts = function() {
  return this.find({
    accountType: { $in: ['adjustment', 'claim', 'expense'] },
    isActive: true
  }).sort({ name: 1 });
};

// Instance method to check if account can be used for claims
accountSchema.methods.canBeUsedForClaims = function() {
  return this.isActive && ['adjustment', 'claim', 'expense'].includes(this.accountType);
};

// Instance method to update balance
accountSchema.methods.updateBalance = async function(amount, operation = 'add') {
  if (operation === 'add') {
    this.balance += amount;
  } else if (operation === 'subtract') {
    this.balance -= amount;
  }
  return this.save();
};

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;