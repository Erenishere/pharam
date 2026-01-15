const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  // Warehouse information
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [
      function() { 
        return !this.referenceType || this.referenceType !== 'transfer' || this.movementType === 'out';
      },
      'Warehouse is required for non-transfer movements or outbound transfers'
    ],
    index: true,
  },
  // For transfers, track the source and destination warehouses
  transferInfo: {
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [
        function() { return this.referenceType === 'transfer' && this.movementType === 'in'; },
        'Source warehouse is required for transfer-in movements'
      ],
      index: true,
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [
        function() { return this.referenceType === 'transfer' && this.movementType === 'out'; },
        'Destination warehouse is required for transfer-out movements'
      ],
      index: true,
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item ID is required'],
  },
  movementType: {
    type: String,
    required: [true, 'Movement type is required'],
    enum: {
      values: ['in', 'out', 'adjustment'],
      message: 'Movement type must be one of: in, out, adjustment',
    },
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    validate: {
      validator(value) {
        return value !== 0;
      },
      message: 'Quantity cannot be zero',
    },
  },
  referenceType: {
    type: String,
    required: [true, 'Reference type is required'],
    enum: {
      values: ['sales_invoice', 'purchase_invoice', 'adjustment', 'opening_balance', 'transfer', 'warehouse_transfer'],
      message: 'Reference type must be one of: sales_invoice, purchase_invoice, adjustment, opening_balance, transfer, warehouse_transfer',
    },
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required() {
      return ['sales_invoice', 'purchase_invoice'].includes(this.referenceType);
    },
  },
  batchInfo: {
    batchNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Batch number cannot exceed 50 characters'],
    },
    expiryDate: {
      type: Date,
    },
    manufacturingDate: {
      type: Date,
    },
  },
  movementDate: {
    type: Date,
    required: [true, 'Movement date is required'],
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
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
stockMovementSchema.index({ itemId: 1, movementDate: -1 });
stockMovementSchema.index({ movementType: 1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });
stockMovementSchema.index({ movementDate: -1 });
stockMovementSchema.index({ createdBy: 1 });
stockMovementSchema.index({ 'batchInfo.batchNumber': 1 });
stockMovementSchema.index({ 'batchInfo.expiryDate': 1 });

// Virtual for absolute quantity (always positive)
stockMovementSchema.virtual('absoluteQuantity').get(function () {
  return Math.abs(this.quantity);
});

// Virtual for movement direction
stockMovementSchema.virtual('direction').get(function () {
  if (this.movementType === 'in') return 'inward';
  if (this.movementType === 'out') return 'outward';
  return this.quantity > 0 ? 'inward' : 'outward';
});

// Instance method to get movement description
stockMovementSchema.methods.getMovementDescription = function () {
  const descriptions = {
    sales_invoice: 'Sale to customer',
    purchase_invoice: 'Purchase from supplier',
    adjustment: 'Stock adjustment',
    opening_balance: 'Opening balance',
    transfer: 'Stock transfer',
  };

  return descriptions[this.referenceType] || 'Unknown movement';
};

// Instance method to check if batch is expired
stockMovementSchema.methods.isBatchExpired = function () {
  if (!this.batchInfo.expiryDate) return false;
  return this.batchInfo.expiryDate < new Date();
};

// Static method to find movements by item
stockMovementSchema.statics.findByItem = function (itemId, limit = 50) {
  return this.find({ itemId })
    .sort({ movementDate: -1 })
    .limit(limit)
    .populate('itemId', 'code name')
    .populate('createdBy', 'username');
};

// Static method to find movements by date range
stockMovementSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    movementDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ movementDate: -1 });
};

// Static method to find movements by reference
stockMovementSchema.statics.findByReference = function (referenceType, referenceId) {
  return this.find({ referenceType, referenceId });
};

// Static method to calculate stock balance for an item in a warehouse
stockMovementSchema.statics.calculateStockBalance = async function (itemId, warehouseId, asOfDate = new Date()) {
  const match = {
    itemId: new mongoose.Types.ObjectId(itemId),
    movementDate: { $lte: asOfDate },
  };

  if (warehouseId) {
    match.$or = [
      { warehouse: new mongoose.Types.ObjectId(warehouseId) },
      { 'transferInfo.toWarehouse': new mongoose.Types.ObjectId(warehouseId) }
    ];
  }

  return this.aggregate([
    { $match: match },
    {
      $project: {
        quantity: {
          $switch: {
            branches: [
              // For outbound transfers, we need to handle them specially
              {
                case: {
                  $and: [
                    { $eq: ['$referenceType', 'warehouse_transfer'] },
                    { $eq: ['$movementType', 'out'] }
                  ]
                },
                then: { $multiply: ['$quantity', -1] }
              },
              // Standard movement types
              {
                case: { $eq: ['$movementType', 'in'] },
                then: '$quantity'
              },
              {
                case: { $eq: ['$movementType', 'out'] },
                then: { $multiply: ['$quantity', -1] }
              }
            ],
            default: 0
          }
        }
      }
    },
    {
      $group: {
        _id: {
          itemId: '$itemId',
          warehouse: {
            $cond: [
              { $eq: ['$referenceType', 'warehouse_transfer'] },
              '$transferInfo.toWarehouse',
              '$warehouse'
            ]
          }
        },
        balance: { $sum: '$quantity' },
        lastMovement: { $max: '$movementDate' }
      }
    },
    {
      $lookup: {
        from: 'warehouses',
        localField: '_id.warehouse',
        foreignField: '_id',
        as: 'warehouse'
      }
    },
    { $unwind: '$warehouse' },
    {
      $project: {
        _id: 0,
        itemId: '$_id.itemId',
        warehouse: {
          _id: '$warehouse._id',
          name: '$warehouse.name',
          code: '$warehouse.code'
        },
        balance: 1,
        lastMovement: 1
      }
    }
  ]);
};

// Static method to get stock balance for an item across all warehouses
stockMovementSchema.statics.getItemStockLevels = async function (itemId) {
  return this.aggregate([
    { $match: { itemId: new mongoose.Types.ObjectId(itemId) } },
    {
      $group: {
        _id: {
          warehouse: {
            $cond: [
              { $eq: ['$referenceType', 'warehouse_transfer'] },
              '$transferInfo.toWarehouse',
              '$warehouse'
            ]
          }
        },
        totalIn: {
          $sum: {
            $cond: [
              { $eq: ['$movementType', 'in'] },
              '$quantity',
              { $cond: [
                { $and: [
                  { $eq: ['$referenceType', 'warehouse_transfer'] },
                  { $eq: ['$movementType', 'out'] }
                ]},
                { $multiply: ['$quantity', -1] },
                0
              ]}
            ]
          }
        },
        totalOut: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$movementType', 'out'] },
                { $ne: ['$referenceType', 'warehouse_transfer'] }
              ]},
              '$quantity',
              0
            ]
          }
        },
        lastMovement: { $max: '$movementDate' }
      }
    },
    {
      $lookup: {
        from: 'warehouses',
        localField: '_id.warehouse',
        foreignField: '_id',
        as: 'warehouse'
      }
    },
    { $unwind: '$warehouse' },
    {
      $project: {
        _id: 0,
        warehouse: {
          _id: '$warehouse._id',
          name: '$warehouse.name',
          code: '$warehouse.code'
        },
        quantity: { $subtract: ['$totalIn', '$totalOut'] },
        lastMovement: 1
      }
    },
    { $match: { quantity: { $gt: 0 } } },
    { $sort: { 'warehouse.name': 1 } }
  ]);
};

// Static method to get stock movement history for an item in a warehouse
stockMovementSchema.statics.getMovementHistory = function (itemId, warehouseId, options = {}) {
  const { startDate, endDate, limit = 100, page = 1 } = options;
  const skip = (page - 1) * limit;

  const match = {
    itemId: new mongoose.Types.ObjectId(itemId),
    $or: [
      { warehouse: new mongoose.Types.ObjectId(warehouseId) },
      { 'transferInfo.toWarehouse': new mongoose.Types.ObjectId(warehouseId) }
    ]
  };

  if (startDate || endDate) {
    match.movementDate = {};
    if (startDate) match.movementDate.$gte = new Date(startDate);
    if (endDate) match.movementDate.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'items',
        localField: 'itemId',
        foreignField: '_id',
        as: 'item'
      }
    },
    { $unwind: '$item' },
    {
      $lookup: {
        from: 'warehouses',
        localField: 'warehouse',
        foreignField: '_id',
        as: 'warehouse'
      }
    },
    { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'warehouses',
        localField: 'transferInfo.fromWarehouse',
        foreignField: '_id',
        as: 'fromWarehouse'
      }
    },
    { $unwind: { path: '$fromWarehouse', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'warehouses',
        localField: 'transferInfo.toWarehouse',
        foreignField: '_id',
        as: 'toWarehouse'
      }
    },
    { $unwind: { path: '$toWarehouse', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        movementType: 1,
        referenceType: 1,
        referenceId: 1,
        quantity: {
          $cond: [
            { $and: [
              { $eq: ['$referenceType', 'warehouse_transfer'] },
              { $eq: ['$movementType', 'out'] }
            ]},
            { $multiply: ['$quantity', -1] },
            {
              $cond: [
                { $eq: ['$movementType', 'in'] },
                '$quantity',
                { $multiply: ['$quantity', -1] }
              ]
            }
          ]
        },
        item: {
          _id: '$item._id',
          name: '$item.name',
          code: '$item.code',
          unit: '$item.unit'
        },
        warehouse: {
          $cond: [
            { $eq: ['$referenceType', 'warehouse_transfer'] },
            {
              $cond: [
                { $eq: ['$movementType', 'in'] },
                {
                  _id: '$toWarehouse._id',
                  name: '$toWarehouse.name',
                  code: '$toWarehouse.code'
                },
                {
                  _id: '$fromWarehouse._id',
                  name: '$fromWarehouse.name',
                  code: '$fromWarehouse.code'
                }
              ]
            },
            {
              _id: '$warehouse._id',
              name: '$warehouse.name',
              code: '$warehouse.code'
            }
          ]
        },
        movementDate: 1,
        notes: 1,
        batchInfo: 1,
        referenceType: 1,
        transferInfo: {
          fromWarehouse: {
            $cond: [
              { $eq: ['$referenceType', 'warehouse_transfer'] },
              {
                _id: '$fromWarehouse._id',
                name: '$fromWarehouse.name',
                code: '$fromWarehouse.code'
              },
              '$$REMOVE'
            ]
          },
          toWarehouse: {
            $cond: [
              { $eq: ['$referenceType', 'warehouse_transfer'] },
              {
                _id: '$toWarehouse._id',
                name: '$toWarehouse.name',
                code: '$toWarehouse.code'
              },
              '$$REMOVE'
            ]
          },
          transferId: 1
        }
      }
    },
    { $sort: { movementDate: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        movements: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        movements: 1,
        hasMore: { $gt: ['$total', skip + limit] }
      }
    }
  ]);
};

// Pre-save validation
stockMovementSchema.pre('save', function (next) {
  // Validate batch dates
  if (this.batchInfo?.manufacturingDate && this.batchInfo?.expiryDate) {
    if (this.batchInfo.manufacturingDate > this.batchInfo.expiryDate) {
      throw new Error('Manufacturing date cannot be after expiry date');
    }
  }

  // Set movement date to now if not provided
  if (!this.movementDate) {
    this.movementDate = new Date();
  }

  // Ensure quantity is positive
  if (this.quantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  // Validate warehouse requirements for transfer movements
  if (this.referenceType === 'warehouse_transfer') {
    if (this.movementType === 'in' && !this.transferInfo?.fromWarehouse) {
      throw new Error('Source warehouse is required for transfer-in movements');
    }
    
    if (this.movementType === 'out' && !this.warehouse) {
      throw new Error('Warehouse is required for transfer-out movements');
    }
    
    if (this.movementType === 'in' && !this.warehouse) {
      this.warehouse = this.transferInfo.toWarehouse;
    }
    
    // Ensure from and to warehouses are different for transfers
    if (
      this.movementType === 'out' && 
      this.transferInfo?.toWarehouse && 
      this.warehouse?.equals(this.transferInfo.toWarehouse)
    ) {
      throw new Error('Source and destination warehouses must be different');
    }
  }

  // Ensure quantity sign matches movement type for non-adjustment movements
  if (this.movementType === 'in' && this.quantity < 0) {
    this.quantity = Math.abs(this.quantity);
  } else if (this.movementType === 'out' && this.quantity > 0) {
    this.quantity = -Math.abs(this.quantity);
  }

  next();
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);
