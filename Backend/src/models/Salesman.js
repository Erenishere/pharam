const mongoose = require('mongoose');

const salesmanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Salesman code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Salesman code cannot exceed 20 characters'],
    },
    name: {
      type: String,
      required: [true, 'Salesman name is required'],
      trim: true,
      maxlength: [100, 'Salesman name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true, // Allows null values, only enforces uniqueness for non-null
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: [0, 'Commission rate cannot be negative'],
      max: [100, 'Commission rate cannot exceed 100%'],
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
salesmanSchema.index({ code: 1 }, { unique: true });
salesmanSchema.index({ name: 1 });
salesmanSchema.index({ isActive: 1 });
salesmanSchema.index({ routeId: 1 });

// Static method to generate salesman code
salesmanSchema.statics.generateSalesmanCode = async function () {
  const count = await this.countDocuments();
  return `SM${String(count + 1).padStart(4, '0')}`;
};

// Pre-save middleware to generate code if not provided
salesmanSchema.pre('save', async function (next) {
  if (!this.code && this.isNew) {
    this.code = await this.constructor.generateSalesmanCode();
  }
  next();
});

module.exports = mongoose.model('Salesman', salesmanSchema);
