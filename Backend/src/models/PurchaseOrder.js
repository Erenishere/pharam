const mongoose = require('mongoose');

/**
 * Purchase Order Item Schema
 * Represents individual items in a purchase order
 */
const purchaseOrderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative'],
  },
  pendingQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Pending quantity cannot be negative'],
  },
  lineTotal: {
    type: Number,
    required: [true, 'Line total is required'],
    min: [0, 'Line total cannot be negative'],
  },
});

/**
 * Purchase Order Schema
 * Phase 2 - Requirement 10: Purchase Order Integration
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'PO number cannot exceed 50 characters'],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier ID is required'],
    },
    poDate: {
      type: Date,
      required: [true, 'PO date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
      default: 'draft',
    },
    fulfillmentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'partial', 'fulfilled'],
      default: 'pending',
    },
    items: {
      type: [purchaseOrderItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Purchase order must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ fulfillmentStatus: 1 });
purchaseOrderSchema.index({ poDate: 1 });
purchaseOrderSchema.index({ isDeleted: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate pending quantities
purchaseOrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      item.pendingQuantity = item.quantity - (item.receivedQuantity || 0);
    });
  }
  next();
});

// Virtual for checking if PO is fully received
purchaseOrderSchema.virtual('isFullyReceived').get(function () {
  if (!this.items || this.items.length === 0) return false;
  return this.items.every((item) => item.receivedQuantity >= item.quantity);
});

// Virtual for checking if PO is partially received
purchaseOrderSchema.virtual('isPartiallyReceived').get(function () {
  if (!this.items || this.items.length === 0) return false;
  const hasReceived = this.items.some((item) => item.receivedQuantity > 0);
  const notFullyReceived = this.items.some((item) => item.receivedQuantity < item.quantity);
  return hasReceived && notFullyReceived;
});

// Ensure virtuals are included in JSON output
purchaseOrderSchema.set('toJSON', { virtuals: true });
purchaseOrderSchema.set('toObject', { virtuals: true });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
