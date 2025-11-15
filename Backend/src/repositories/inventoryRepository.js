const Inventory = require('../models/Inventory');
const Item = require('../models/Item');

class InventoryRepository {
  /**
   * Create a new inventory record
   * @param {Object} inventoryData - Inventory data
   * @returns {Promise<Object>} Created inventory record
   */
  async create(inventoryData) {
    const inventory = new Inventory(inventoryData);
    return inventory.save();
  }

  /**
   * Find inventory record by ID
   * @param {string} id - Inventory record ID
   * @returns {Promise<Object|null>} Inventory record or null if not found
   */
  async findById(id) {
    return Inventory.findById(id)
      .populate('item', 'name code')
      .populate('location', 'name code')
      .populate('batch', 'batchNumber');
  }

  /**
   * Find inventory records by item ID
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Array of inventory records
   */
  async findByItemId(itemId) {
    return Inventory.find({ item: itemId })
      .populate('item', 'name code')
      .populate('location', 'name code')
      .populate('batch', 'batchNumber')
      .sort({ updatedAt: -1 });
  }

  /**
   * Find inventory records by location ID
   * @param {string} locationId - Location ID
   * @returns {Promise<Array>} Array of inventory records
   */
  async findByLocationId(locationId) {
    return Inventory.find({ location: locationId })
      .populate('item', 'name code')
      .populate('batch', 'batchNumber')
      .sort({ 'item.name': 1 });
  }

  /**
   * Find inventory record by item and location
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {string} [batchId] - Optional batch ID
   * @returns {Promise<Object|null>} Inventory record or null if not found
   */
  async findByItemAndLocation(itemId, locationId, batchId = null) {
    const query = { item: itemId, location: locationId };
    if (batchId) {
      query.batch = batchId;
    }
    return Inventory.findOne(query)
      .populate('item', 'name code')
      .populate('location', 'name code')
      .populate('batch', 'batchNumber');
  }

  /**
   * Update inventory quantity
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {string} [batchId] - Optional batch ID
   * @returns {Promise<Object>} Updated inventory record
   */
  async updateQuantity(itemId, locationId, quantity, batchId = null) {
    const query = { item: itemId, location: locationId };
    if (batchId) {
      query.batch = batchId;
    }

    // Find and update the inventory record
    let inventory = await Inventory.findOne(query);

    if (!inventory) {
      // Create new inventory record if it doesn't exist
      inventory = new Inventory({
        item: itemId,
        location: locationId,
        quantity: 0,
        ...(batchId && { batch: batchId })
      });
    }

    // Update quantity
    inventory.quantity += quantity;

    // Ensure quantity doesn't go below zero
    if (inventory.quantity < 0) {
      inventory.quantity = 0;
    }

    // Update last updated timestamp
    inventory.lastUpdated = new Date();

    return inventory.save();
  }

  /**
   * Transfer inventory between locations
   * @param {string} itemId - Item ID
   * @param {string} fromLocationId - Source location ID
   * @param {string} toLocationId - Destination location ID
   * @param {number} quantity - Quantity to transfer
   * @param {string} [batchId] - Optional batch ID
   * @returns {Promise<Object>} Result of the transfer
   */
  async transferInventory(itemId, fromLocationId, toLocationId, quantity, batchId = null) {
    // Start a session for transaction
    const session = await Inventory.startSession();
    session.startTransaction();

    try {
      // Remove from source location
      const fromQuery = { item: itemId, location: fromLocationId };
      if (batchId) fromQuery.batch = batchId;
      
      const fromInventory = await Inventory.findOne(fromQuery).session(session);
      
      if (!fromInventory || fromInventory.quantity < quantity) {
        throw new Error('Insufficient stock in source location');
      }

      fromInventory.quantity -= quantity;
      fromInventory.lastUpdated = new Date();
      await fromInventory.save({ session });

      // Add to destination location
      const toQuery = { item: itemId, location: toLocationId };
      if (batchId) toQuery.batch = batchId;
      
      let toInventory = await Inventory.findOne(toQuery).session(session);
      
      if (!toInventory) {
        toInventory = new Inventory({
          item: itemId,
          location: toLocationId,
          quantity: 0,
          ...(batchId && { batch: batchId })
        });
      }

      toInventory.quantity += quantity;
      toInventory.lastUpdated = new Date();
      await toInventory.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        fromLocation: fromLocationId,
        toLocation: toLocationId,
        quantity,
        item: itemId,
        batch: batchId,
        timestamp: new Date()
      };
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Get current stock level for an item across all locations
   * @param {string} itemId - Item ID
   * @returns {Promise<number>} Total quantity in stock
   */
  async getTotalStock(itemId) {
    const result = await Inventory.aggregate([
      { $match: { item: itemId } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get stock levels by location for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Array of stock levels by location
   */
  async getStockByLocation(itemId) {
    return Inventory.aggregate([
      { $match: { item: itemId } },
      {
        $lookup: {
          from: 'locations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationInfo'
        }
      },
      { $unwind: '$locationInfo' },
      {
        $project: {
          location: '$locationInfo.name',
          locationId: '$locationInfo._id',
          quantity: 1,
          lastUpdated: 1
        }
      },
      { $sort: { location: 1 } }
    ]);
  }

  /**
   * Get low stock items across all locations
   * @param {number} [threshold=10] - Threshold for low stock
   * @returns {Promise<Array>} Array of low stock items
   */
  async getLowStockItems(threshold = 10) {
    return Inventory.aggregate([
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemInfo'
        }
      },
      { $unwind: '$itemInfo' },
      {
        $lookup: {
          from: 'locations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationInfo'
        }
      },
      { $unwind: '$locationInfo' },
      {
        $project: {
          itemId: '$item',
          itemName: '$itemInfo.name',
          itemCode: '$itemInfo.code',
          locationId: '$location',
          locationName: '$locationInfo.name',
          currentStock: '$quantity',
          minimumStock: '$itemInfo.inventory.minimumStock',
          lastUpdated: 1
        }
      },
      {
        $match: {
          $expr: {
            $lte: ['$currentStock', { $ifNull: ['$minimumStock', threshold] }]
          }
        }
      },
      { $sort: { currentStock: 1 } }
    ]);
  }

  /**
   * Get inventory movement history
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.itemId] - Filter by item ID
   * @param {string} [filters.locationId] - Filter by location ID
   * @param {string} [filters.batchId] - Filter by batch ID
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @param {number} [limit=100] - Maximum number of records to return
   * @returns {Promise<Array>} Array of inventory movements
   */
  async getMovementHistory(filters = {}, limit = 100) {
    const {
      itemId,
      locationId,
      batchId,
      startDate,
      endDate,
      ...otherFilters
    } = filters;

    const query = {};

    if (itemId) query['item'] = itemId;
    if (locationId) query['location'] = locationId;
    if (batchId) query['batch'] = batchId;

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Add other filters
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[key] = value;
      }
    });

    return Inventory.find(query)
      .populate('item', 'name code')
      .populate('location', 'name code')
      .populate('batch', 'batchNumber')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));
  }

  /**
   * Get inventory valuation report
   * @param {string} [locationId] - Optional location ID to filter by
   * @returns {Promise<Object>} Inventory valuation summary
   */
  async getInventoryValuation(locationId = null) {
    const matchStage = {};
    if (locationId) {
      matchStage.location = locationId;
    }

    return Inventory.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'items',
          localField: 'item',
          foreignField: '_id',
          as: 'itemInfo'
        }
      },
      { $unwind: '$itemInfo' },
      {
        $lookup: {
          from: 'locations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationInfo'
        }
      },
      { $unwind: '$locationInfo' },
      {
        $project: {
          itemId: '$item',
          itemName: '$itemInfo.name',
          itemCode: '$itemInfo.code',
          locationId: '$location',
          locationName: '$locationInfo.name',
          quantity: 1,
          costPrice: '$itemInfo.pricing.costPrice',
          salePrice: '$itemInfo.pricing.salePrice',
          lastUpdated: 1
        }
      },
      {
        $project: {
          itemId: 1,
          itemName: 1,
          itemCode: 1,
          locationId: 1,
          locationName: 1,
          quantity: 1,
          costPrice: 1,
          salePrice: 1,
          totalCost: { $multiply: ['$quantity', '$costPrice'] },
          totalValue: { $multiply: ['$quantity', '$salePrice'] },
          lastUpdated: 1
        }
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          totalValue: { $sum: '$totalValue' },
          items: { $push: '$$ROOT' }
        }
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          totalQuantity: 1,
          totalCost: { $round: ['$totalCost', 2] },
          totalValue: { $round: ['$totalValue', 2] },
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                itemId: '$$item.itemId',
                itemName: '$$item.itemName',
                itemCode: '$$item.itemCode',
                locationId: '$$item.locationId',
                locationName: '$$item.locationName',
                quantity: '$$item.quantity',
                costPrice: { $round: ['$$item.costPrice', 2] },
                salePrice: { $round: ['$$item.salePrice', 2] },
                totalCost: { $round: [{ $multiply: ['$$item.quantity', '$$item.costPrice'] }, 2] },
                totalValue: { $round: [{ $multiply: ['$$item.quantity', '$$item.salePrice'] }, 2] },
                lastUpdated: '$$item.lastUpdated'
              }
            }
          }
        }
      }
    ]);
  }
}

module.exports = new InventoryRepository();

