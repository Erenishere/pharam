const mongoose = require('mongoose');

/**
 * QuotationHistory Schema
 * Phase 2 - Requirement 18.1, 18.2
 * Tracks historical rates for items with customers/suppliers
 */
const quotationHistorySchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: [true, 'Item ID is required'],
        index: true
    },
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'partyModel',
        required: [true, 'Party ID is required'],
        index: true
    },
    partyModel: {
        type: String,
        required: [true, 'Party model is required'],
        enum: ['Customer', 'Supplier']
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Invoice ID is required']
    },
    invoiceNumber: {
        type: String,
        required: [true, 'Invoice number is required'],
        trim: true
    },
    transactionType: {
        type: String,
        required: [true, 'Transaction type is required'],
        enum: {
            values: ['sales', 'purchase'],
            message: 'Transaction type must be either sales or purchase'
        },
        index: true
    },
    rate: {
        type: Number,
        required: [true, 'Rate is required'],
        min: [0, 'Rate cannot be negative']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0.01, 'Quantity must be greater than 0']
    },
    transactionDate: {
        type: Date,
        required: [true, 'Transaction date is required'],
        index: true
    },
    // Additional context fields
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative']
    },
    finalRate: {
        type: Number,
        required: [true, 'Final rate is required'],
        min: [0, 'Final rate cannot be negative']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
quotationHistorySchema.index({ itemId: 1, partyId: 1, transactionDate: -1 });
quotationHistorySchema.index({ itemId: 1, transactionType: 1, transactionDate: -1 });
quotationHistorySchema.index({ partyId: 1, transactionDate: -1 });

// Static method to get quotation history for an item and party
quotationHistorySchema.statics.getHistory = function (itemId, partyId, limit = 10) {
    return this.find({ itemId, partyId })
        .sort({ transactionDate: -1 })
        .limit(limit)
        .populate('itemId', 'code name')
        .populate('partyId', 'code name');
};

// Static method to get latest rate for an item and party
quotationHistorySchema.statics.getLatestRate = function (itemId, partyId) {
    return this.findOne({ itemId, partyId })
        .sort({ transactionDate: -1 })
        .populate('itemId', 'code name')
        .populate('partyId', 'code name');
};

// Static method to get history by transaction type
quotationHistorySchema.statics.getHistoryByType = function (itemId, transactionType, limit = 10) {
    return this.find({ itemId, transactionType })
        .sort({ transactionDate: -1 })
        .limit(limit)
        .populate('itemId', 'code name')
        .populate('partyId', 'code name');
};

module.exports = mongoose.model('QuotationHistory', quotationHistorySchema);
