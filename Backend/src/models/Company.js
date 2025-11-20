const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    unique: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Company code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Company code cannot exceed 20 characters'],
    unique: true,
    index: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters']
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [15, 'GSTIN cannot exceed 15 characters']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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
companySchema.index({ name: 1 }, { unique: true });
companySchema.index({ code: 1 }, { unique: true });
companySchema.index({ isActive: 1 });

// Pre-save middleware
companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
