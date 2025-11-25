const mongoose = require('mongoose');

/**
 * Budget Schema
 * Stores budget allocations by dimension (cost center, project, department)
 */
const budgetSchema = new mongoose.Schema({
    dimension: {
        type: String,
        required: [true, 'Dimension is required'],
        trim: true,
        maxlength: [100, 'Dimension cannot exceed 100 characters'],
        validate: {
            validator: function (v) {
                return /^[a-zA-Z0-9_-]{1,100}$/.test(v);
            },
            message: 'Dimension must be alphanumeric (hyphens and underscores allowed)'
        }
    },
    period: {
        type: String,
        required: [true, 'Period is required'],
        trim: true,
        maxlength: [50, 'Period cannot exceed 50 characters'],
        // Examples: "2024-Q1", "2024-01", "2024"
    },
    periodType: {
        type: String,
        required: [true, 'Period type is required'],
        enum: {
            values: ['monthly', 'quarterly', 'yearly'],
            message: 'Period type must be one of: monthly, quarterly, yearly'
        }
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
            validator: function (v) {
                return v > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    budgetAmount: {
        type: Number,
        required: [true, 'Budget amount is required'],
        min: [0, 'Budget amount cannot be negative']
    },
    allocatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Allocated by user is required']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    isActive: {
        type: Boolean,
        default: true
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
    timestamps: true
});

// Indexes
budgetSchema.index({ dimension: 1, period: 1 }, { unique: true });
budgetSchema.index({ dimension: 1, startDate: 1, endDate: 1 });
budgetSchema.index({ periodType: 1 });
budgetSchema.index({ isActive: 1 });

// Virtual for budget utilization (to be calculated with actual expenses)
budgetSchema.virtual('periodDays').get(function () {
    if (this.startDate && this.endDate) {
        const diffTime = Math.abs(this.endDate - this.startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    return 0;
});

// Pre-save middleware to update timestamps
budgetSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
