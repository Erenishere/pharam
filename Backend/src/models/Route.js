const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Route code is required'],
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: [20, 'Route code cannot exceed 20 characters'],
    },
    name: {
        type: String,
        required: [true, 'Route name is required'],
        trim: true,
        maxlength: [100, 'Route name cannot exceed 100 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    salesmanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salesman',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, {
    timestamps: true,
});

// Indexes (unique indexes already handled by schema 'unique: true')
routeSchema.index({ name: 1 });
routeSchema.index({ salesmanId: 1 });
routeSchema.index({ isActive: 1 });

// Pre-save middleware to generate code if not provided
routeSchema.pre('save', async function (next) {
    if (!this.code && this.isNew) {
        const count = await this.constructor.countDocuments();
        this.code = `RT${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Route', routeSchema);
