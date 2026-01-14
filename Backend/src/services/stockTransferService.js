const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Warehouse = require('../models/Warehouse');
const Item = require('../models/Item');
const AppError = require('../utils/appError');

/**
 * Stock Transfer Service
 * Handles business logic for transferring stock between warehouses
 */
class StockTransferService {
  /**
   * Transfer stock between warehouses
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.itemId - Item ID
   * @param {string} transferData.fromWarehouseId - Source warehouse ID
   * @param {string} transferData.toWarehouseId - Destination warehouse ID
   * @param {number} transferData.quantity - Quantity to transfer
   * @param {string} transferData.reason - Transfer reason
   * @param {string} transferData.createdBy - User ID who initiated transfer
   * @returns {Promise<Object>} Transfer result with movement records
   */
  async transferStock(transferData) {
    const {
      itemId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reason = 'Stock Transfer',
      createdBy
    } = transferData;

    // Validate required fields
    if (!itemId || !fromWarehouseId || !toWarehouseId || !quantity) {
      throw new AppError('Item ID, source warehouse, destination warehouse, and quantity are required', 400);
    }

    if (quantity <= 0) {
      throw new AppError('Transfer quantity must be greater than 0', 400);
    }

    if (fromWarehouseId === toWarehouseId) {
      throw new AppError('Source and destination warehouses must be different', 400);
    }

    // Verify item exists
    const item = await Item.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // Verify warehouses exist
    const fromWarehouse = await Warehouse.findById(fromWarehouseId);
    if (!fromWarehouse) {
      throw new AppError('Source warehouse not found', 404);
    }

    const toWarehouse = await Warehouse.findById(toWarehouseId);
    if (!toWarehouse) {
      throw new AppError('Destination warehouse not found', 404);
    }

    // Get source warehouse inventory
    const sourceInventory = await Inventory.findOne({
      item: itemId,
      warehouse: fromWarehouseId
    });

    if (!sourceInventory) {
      throw new AppError('Item not found in source warehouse', 404);
    }

    // Validate sufficient stock in source warehouse
    if (sourceInventory.quantity < quantity) {
      throw new AppError(
        `Insufficient stock in source warehouse. Available: ${sourceInventory.quantity}, Requested: ${quantity}`,
        400
      );
    }

    // Get or create destination warehouse inventory
    let destinationInventory = await Inventory.findOne({
      item: itemId,
      warehouse: toWarehouseId
    });

    if (!destinationInventory) {
      destinationInventory = await Inventory.create({
        item: itemId,
        warehouse: toWarehouseId,
        quantity: 0,
        allocated: 0,
        available: 0
      });
    }

    // Perform the transfer
    sourceInventory.quantity -= quantity;
    destinationInventory.quantity += quantity;

    await sourceInventory.save();
    await destinationInventory.save();

    // Create stock movement records
    const outMovement = await StockMovement.create({
      item: itemId,
      warehouse: fromWarehouseId,
      movementType: 'transfer_out',
      quantity,
      date: new Date(),
      reference: `Transfer to ${toWarehouse.name}`,
      notes: reason,
      createdBy
    });

    const inMovement = await StockMovement.create({
      item: itemId,
      warehouse: toWarehouseId,
      movementType: 'transfer_in',
      quantity,
      date: new Date(),
      reference: `Transfer from ${fromWarehouse.name}`,
      notes: reason,
      createdBy
    });

    return {
      success: true,
      transfer: {
        itemId,
        itemName: item.name,
        itemCode: item.code,
        quantity,
        fromWarehouse: {
          id: fromWarehouse._id,
          code: fromWarehouse.code,
          name: fromWarehouse.name,
          remainingStock: sourceInventory.quantity
        },
        toWarehouse: {
          id: toWarehouse._id,
          code: toWarehouse.code,
          name: toWarehouse.name,
          newStock: destinationInventory.quantity
        },
        reason,
        timestamp: new Date()
      },
      movements: {
        outMovement: outMovement._id,
        inMovement: inMovement._id
      }
    };
  }

  /**
   * Get transfer history for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @param {string} [options.warehouseId] - Filter by warehouse
   * @param {Date} [options.startDate] - Start date
   * @param {Date} [options.endDate] - End date
   * @returns {Promise<Array>} Transfer history
   */
  async getTransferHistory(itemId, options = {}) {
    const query = {
      item: itemId,
      movementType: { $in: ['transfer_in', 'transfer_out'] }
    };

    if (options.warehouseId) {
      query.warehouse = options.warehouseId;
    }

    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) {
        query.date.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.date.$lte = new Date(options.endDate);
      }
    }

    return StockMovement.find(query)
      .populate('warehouse', 'code name')
      .sort({ date: -1 });
  }

  /**
   * Get warehouse transfer summary
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date
   * @param {Date} [options.endDate] - End date
   * @returns {Promise<Object>} Transfer summary
   */
  async getWarehouseTransferSummary(warehouseId, options = {}) {
    const query = {
      warehouse: warehouseId,
      movementType: { $in: ['transfer_in', 'transfer_out'] }
    };

    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) {
        query.date.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.date.$lte = new Date(options.endDate);
      }
    }

    const movements = await StockMovement.find(query)
      .populate('item', 'code name')
      .populate('warehouse', 'code name');

    // Calculate summary
    const summary = {
      totalTransfersIn: 0,
      totalTransfersOut: 0,
      totalQuantityIn: 0,
      totalQuantityOut: 0,
      itemsTransferred: new Set(),
      transfers: []
    };

    movements.forEach(movement => {
      if (movement.movementType === 'transfer_in') {
        summary.totalTransfersIn++;
        summary.totalQuantityIn += movement.quantity;
      } else if (movement.movementType === 'transfer_out') {
        summary.totalTransfersOut++;
        summary.totalQuantityOut += movement.quantity;
      }

      summary.itemsTransferred.add(movement.item._id.toString());
      summary.transfers.push({
        date: movement.date,
        type: movement.movementType,
        item: movement.item.code,
        quantity: movement.quantity,
        reference: movement.reference
      });
    });

    summary.itemsTransferred = summary.itemsTransferred.size;

    return summary;
  }

  /**
   * Validate transfer is possible
   * @param {string} itemId - Item ID
   * @param {string} fromWarehouseId - Source warehouse ID
   * @param {string} toWarehouseId - Destination warehouse ID
   * @param {number} quantity - Quantity to transfer
   * @returns {Promise<Object>} Validation result
   */
  async validateTransfer(itemId, fromWarehouseId, toWarehouseId, quantity) {
    const errors = [];

    // Check item exists
    const item = await Item.findById(itemId);
    if (!item) {
      errors.push('Item not found');
    }

    // Check warehouses exist
    const fromWarehouse = await Warehouse.findById(fromWarehouseId);
    if (!fromWarehouse) {
      errors.push('Source warehouse not found');
    }

    const toWarehouse = await Warehouse.findById(toWarehouseId);
    if (!toWarehouse) {
      errors.push('Destination warehouse not found');
    }

    // Check warehouses are different
    if (fromWarehouseId === toWarehouseId) {
      errors.push('Source and destination warehouses must be different');
    }

    // Check quantity
    if (quantity <= 0) {
      errors.push('Transfer quantity must be greater than 0');
    }

    // Check source inventory
    if (item && fromWarehouse) {
      const sourceInventory = await Inventory.findOne({
        item: itemId,
        warehouse: fromWarehouseId
      });

      if (!sourceInventory) {
        errors.push('Item not found in source warehouse');
      } else if (sourceInventory.quantity < quantity) {
        errors.push(
          `Insufficient stock. Available: ${sourceInventory.quantity}, Requested: ${quantity}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      item: item ? { id: item._id, code: item.code, name: item.name } : null,
      fromWarehouse: fromWarehouse ? { id: fromWarehouse._id, code: fromWarehouse.code, name: fromWarehouse.name } : null,
      toWarehouse: toWarehouse ? { id: toWarehouse._id, code: toWarehouse.code, name: toWarehouse.name } : null
    };
  }
}

module.exports = new StockTransferService();
