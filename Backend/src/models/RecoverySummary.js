const mongoose = require('mongoose');

/**
 * Recovery Summary Account Schema
 * Represents individual account recovery details within a summary
 */
const recoverySummaryAccountSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Account ID is required']
    },
    invoiceAmount: {
        type: Number,
        required: [true, 'Invoice amount is required'],
        min: [0, 'Invoice amount cannot be negative'],
        default: 0
    },
    balance: {
        type: Number,
        required: [true, 'Balance is required'],
        min: [0, 'Balance cannot be negative'],
        default: 0
    },
    recoveryAmount: {
        type: Number,
        required: [true, 'Recovery amount is required'],
        min: [0, 'Recovery amount cannot be negative'],
        default: 0
    }
}, { _id: false });

/**
 * Recovery Summary Schema
 * Phase 2 - Requirement 15: Cash Recovery Summary System
 * Task 52.1: Create RecoverySummary model
 */
const recoverySummarySchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: [true, 'Date is required'],
            default: Date.now
        },
        salesmanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salesman',
            required: [true, 'Salesman ID is required'],
            index: true
        },
        town: {
            type: String,
            required: [true, 'Town is required'],
            trim: true,
            maxlength: [100, 'Town name cannot exceed 100 characters'],
            index: true
        },
        accounts: {
            type: [recoverySummaryAccountSchema],
            required: [true, 'At least one account is required'],
            validate: {
                validator: function (accounts) {
                    return accounts && accounts.length > 0;
                },
                message: 'Recovery summary must have at least one account'
            }
        },
        totalInvoiceAmount: {
            type: Number,
            required: true,
            min: [0, 'Total invoice amount cannot be negative'],
            default: 0
        },
        totalBalance: {
            type: Number,
            required: true,
            min: [0, 'Total balance cannot be negative'],
            default: 0
        },
        totalRecovery: {
            type: Number,
            required: true,
            min: [0, 'Total recovery cannot be negative'],
            default: 0
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [500, 'Notes cannot exceed 500 characters']
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Created by user is required']
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Indexes for better query performance
recoverySummarySchema.index({ date: -1 });
recoverySummarySchema.index({ salesmanId: 1, date: -1 });
recoverySummarySchema.index({ town: 1, date: -1 });
recoverySummarySchema.index({ isDeleted: 1 });
recoverySummarySchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
recoverySummarySchema.pre('save', function (next) {
    if (this.accounts && this.accounts.length > 0) {
        this.totalInvoiceAmount = this.accounts.reduce((sum, acc) => sum + (acc.invoiceAmount || 0), 0);
        this.totalBalance = this.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
        this.totalRecovery = this.accounts.reduce((sum, acc) => sum + (acc.recoveryAmount || 0), 0);

        // Round to 2 decimal places
        this.totalInvoiceAmount = Math.round(this.totalInvoiceAmount * 100) / 100;
        this.totalBalance = Math.round(this.totalBalance * 100) / 100;
        this.totalRecovery = Math.round(this.totalRecovery * 100) / 100;
    }
    next();
});

// Virtual for recovery percentage
recoverySummarySchema.virtual('recoveryPercentage').get(function () {
    if (this.totalInvoiceAmount === 0) return 0;
    return Math.round((this.totalRecovery / this.totalInvoiceAmount) * 10000) / 100;
});

// Virtual for outstanding amount
recoverySummarySchema.virtual('outstandingAmount').get(function () {
    return Math.round((this.totalInvoiceAmount - this.totalRecovery) * 100) / 100;
});

// Ensure virtuals are included in JSON output
recoverySummarySchema.set('toJSON', { virtuals: true });
recoverySummarySchema.set('toObject', { virtuals: true });

const RecoverySummary = mongoose.model('RecoverySummary', recoverySummarySchema);

module.exports = RecoverySummary;
