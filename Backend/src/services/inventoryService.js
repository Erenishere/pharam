const inventoryRepository = require('../repositories/inventoryRepository');
const itemService = require('./itemService');

class InventoryService {
  /**
   * Get current stock level for an item across all locations
   * @param {string} itemId - Item ID
   * @returns {Promise<number>} Total quantity in stock
   */
  async getItemStock(itemId) {
    return inventoryRepository.getTotalStock(itemId);
  }

  /**
   * Get stock levels by location for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Array of stock levels by location
   */
  async getItemStockByLocation(itemId) {
    return inventoryRepository.getStockByLocation(itemId);
  }

  /**
   * Add stock to inventory
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} quantity - Quantity to add
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.referenceId] - Reference ID (e.g., purchase order ID)
   * @param {string} [options.notes] - Notes about the transaction
   * @returns {Promise<Object>} Updated inventory record
   */
  async addStock(itemId, locationId, quantity, options = {}) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Update inventory
    const inventory = await inventoryRepository.updateQuantity(
      itemId,
      locationId,
      quantity,
      options.batchId
    );

    // Log the transaction
    await this.logTransaction({
      itemId,
      locationId,
      batchId: options.batchId,
      referenceId: options.referenceId,
      quantity,
      transactionType: 'STOCK_IN',
      notes: options.notes || `Added ${quantity} units to inventory`,
      createdBy: options.userId
    });

    return inventory;
  }

  /**
   * Remove stock from inventory
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} quantity - Quantity to remove
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.referenceId] - Reference ID (e.g., sales order ID)
   * @param {string} [options.notes] - Notes about the transaction
   * @returns {Promise<Object>} Updated inventory record
   */
  async removeStock(itemId, locationId, quantity, options = {}) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Verify item exists and has sufficient stock
    const currentStock = await this.getItemStock(itemId);
    if (currentStock < quantity) {
      throw new Error('Insufficient stock available');
    }

    // Update inventory (quantity is negative for removal)
    const inventory = await inventoryRepository.updateQuantity(
      itemId,
      locationId,
      -quantity,
      options.batchId
    );

    // Log the transaction
    await this.logTransaction({
      itemId,
      locationId,
      batchId: options.batchId,
      referenceId: options.referenceId,
      quantity: -quantity,
      transactionType: 'STOCK_OUT',
      notes: options.notes || `Removed ${quantity} units from inventory`,
      createdBy: options.userId
    });

    return inventory;
  }

  /**
   * Transfer stock between locations
   * @param {string} itemId - Item ID
   * @param {string} fromLocationId - Source location ID
   * @param {string} toLocationId - Destination location ID
   * @param {number} quantity - Quantity to transfer
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.referenceId] - Reference ID (e.g., transfer order ID)
   * @param {string} [options.notes] - Notes about the transfer
   * @returns {Promise<Object>} Result of the transfer
   */
  async transferStock(itemId, fromLocationId, toLocationId, quantity, options = {}) {
    if (fromLocationId === toLocationId) {
      throw new Error('Source and destination locations must be different');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Verify item exists and has sufficient stock in source location
    const sourceStock = await inventoryRepository.getTotalStock(itemId);
    if (sourceStock < quantity) {
      throw new Error('Insufficient stock available in source location');
    }

    // Perform the transfer
    const result = await inventoryRepository.transferInventory(
      itemId,
      fromLocationId,
      toLocationId,
      quantity,
      options.batchId
    );

    // Log the transaction
    await this.logTransaction({
      itemId,
      fromLocationId,
      toLocationId,
      batchId: options.batchId,
      referenceId: options.referenceId,
      quantity: -quantity,
      transactionType: 'STOCK_TRANSFER',
      notes: options.notes || `Transferred ${quantity} units between locations`,
      createdBy: options.userId
    });

    return result;
  }

  /**
   * Adjust inventory level (manual adjustment)
   * @param {string} itemId - Item ID
   * @param {string} locationId - Location ID
   * @param {number} newQuantity - New quantity
   * @param {Object} [options] - Additional options
   * @param {string} [options.batchId] - Batch ID
   * @param {string} [options.reason] - Reason for adjustment
   * @param {string} [options.notes] - Additional notes
   * @returns {Promise<Object>} Updated inventory record
   */
  async adjustStock(itemId, locationId, newQuantity, options = {}) {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    // Get current inventory
    const currentInventory = await inventoryRepository.findByItemAndLocation(
      itemId,
      locationId,
      options.batchId
    );

    const currentQuantity = currentInventory ? currentInventory.quantity : 0;
    const quantityDifference = newQuantity - currentQuantity;

    if (quantityDifference === 0) {
      return currentInventory || { item: itemId, location: locationId, quantity: 0 };
    }

    // Update inventory
    const inventory = await inventoryRepository.updateQuantity(
      itemId,
      locationId,
      quantityDifference,
      options.batchId
    );

    // Log the adjustment
    await this.logTransaction({
      itemId,
      locationId,
      batchId: options.batchId,
      referenceId: options.referenceId,
      quantity: quantityDifference,
      transactionType: 'STOCK_ADJUST',
      notes: options.notes || `Adjusted stock from ${currentQuantity} to ${newQuantity}. ${options.reason || ''}`.trim(),
      createdBy: options.userId
    });

    return inventory;
  }

  /**
   * Get low stock items
   * @param {Object} [options] - Options
   * @param {number} [options.threshold] - Threshold for low stock
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of low stock items
   */
  async getLowStockItems(options = {}) {
    const { threshold, locationId } = options;
    
    if (locationId) {
      // Get low stock items for a specific location
      const allItems = await inventoryRepository.getStockByLocation(locationId);
      return allItems.filter(item => 
        item.quantity <= (item.minimumStock || threshold || 10)
      );
    }
    
    // Get low stock items across all locations
    return inventoryRepository.getLowStockItems(threshold);
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
    return inventoryRepository.getMovementHistory(filters, limit);
  }

  /**
   * Get inventory valuation report
   * @param {Object} [options] - Options
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Object>} Inventory valuation summary
   */
  async getInventoryValuation(options = {}) {
    const { locationId } = options;
    return inventoryRepository.getInventoryValuation(locationId);
  }

  /**
   * Log an inventory transaction
   * @private
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction record
   */
  async logTransaction(transactionData) {
    // In a real implementation, this would log to a transactions collection
    // For now, we'll just return the transaction data
    return {
      ...transactionData,
      _id: require('mongoose').Types.ObjectId(),
      timestamp: new Date()
    };
  }

  /**
   * Get warehouse stock for a specific item
   * @param {string} itemId - Item ID
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Object>} Stock information for the warehouse
   */
  async getWarehouseStock(itemId, warehouseId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Get stock for specific warehouse
    const stock = await inventoryRepository.getStockByWarehouse(itemId, warehouseId);

    return {
      itemId,
      warehouseId,
      quantity: stock?.quantity || 0,
      availableQuantity: stock?.availableQuantity || 0,
      reservedQuantity: stock?.reservedQuantity || 0,
      lastUpdated: stock?.updatedAt || null
    };
  }

  /**
   * Get all warehouse stock for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Stock information across all warehouses
   */
  async getAllWarehouseStock(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Get stock across all warehouses
    const stockByWarehouse = await inventoryRepository.getAllWarehouseStock(itemId);

    return stockByWarehouse.map(stock => ({
      itemId: stock.itemId,
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse?.name || 'Unknown',
      quantity: stock.quantity || 0,
      availableQuantity: stock.availableQuantity || 0,
      reservedQuantity: stock.reservedQuantity || 0,
      lastUpdated: stock.updatedAt
    }));
  }

  /**
   * Compare stock levels across all warehouses for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Comparison of stock levels across all warehouses
   */
  async compareWarehouseStock(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const Item = require('../models/Item');
    const Inventory = require('../models/Inventory');
    const Warehouse = require('../models/Warehouse');

    // Verify item exists and get item details
    const item = await itemService.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Get all inventory records for this item across all warehouses
    const inventoryRecords = await Inventory.find({ item: itemId })
      .populate('warehouse', 'code name location isActive')
      .sort({ 'warehouse.name': 1 });

    // Format warehouse stock comparison
    const warehouseStock = inventoryRecords.map(inv => {
      const warehouse = inv.warehouse;
      const quantity = inv.quantity || 0;
      const available = inv.available || 0;
      const allocated = inv.allocated || 0;
      const stockValue = quantity * (item.pricing?.costPrice || 0);

      return {
        warehouseId: warehouse?._id,
        warehouseCode: warehouse?.code,
        warehouseName: warehouse?.name,
        warehouseLocation: warehouse?.location,
        isActive: warehouse?.isActive || false,
        quantity: quantity,
        availableQuantity: available,
        allocatedQuantity: allocated,
        stockValue: stockValue,
        reorderPoint: inv.reorderPoint || item.inventory?.minimumStock || 0,
        lastUpdated: inv.lastUpdated || inv.updatedAt,
        lastCounted: inv.lastCounted
      };
    });

    // Calculate totals
    const totalQuantity = warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
    const totalAvailable = warehouseStock.reduce((sum, ws) => sum + ws.availableQuantity, 0);
    const totalAllocated = warehouseStock.reduce((sum, ws) => sum + ws.allocatedQuantity, 0);
    const totalValue = warehouseStock.reduce((sum, ws) => sum + ws.stockValue, 0);

    // Find warehouses with stock and without stock
    const warehousesWithStock = warehouseStock.filter(ws => ws.quantity > 0);
    const warehousesWithoutStock = warehouseStock.filter(ws => ws.quantity === 0);

    return {
      item: {
        id: item._id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        category: item.category,
        minimumStock: item.inventory?.minimumStock || 0,
        maximumStock: item.inventory?.maximumStock || 0,
        unitCost: item.pricing?.costPrice || 0
      },
      warehouses: warehouseStock,
      summary: {
        totalWarehouses: warehouseStock.length,
        warehousesWithStock: warehousesWithStock.length,
        warehousesWithoutStock: warehousesWithoutStock.length,
        totalQuantity: totalQuantity,
        totalAvailable: totalAvailable,
        totalAllocated: totalAllocated,
        totalValue: totalValue,
        averageStockPerWarehouse: warehouseStock.length > 0 ? totalQuantity / warehouseStock.length : 0,
        largestStock: warehouseStock.length > 0 ? Math.max(...warehouseStock.map(ws => ws.quantity)) : 0,
        smallestStock: warehouseStock.length > 0 ? Math.min(...warehouseStock.map(ws => ws.quantity)) : 0
      }
    };
  }

  /**
   * Get warehouse stock levels for all items in a warehouse
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Array>} Array of items with stock levels and low stock indicators
   */
  async getWarehouseStockLevels(warehouseId) {
    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    const Warehouse = require('../models/Warehouse');
    const Inventory = require('../models/Inventory');
    const Item = require('../models/Item');

    // Verify warehouse exists
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Get all inventory records for this warehouse
    const inventoryRecords = await Inventory.find({ warehouse: warehouseId })
      .populate('item', 'code name unit category pricing inventory isActive')
      .sort({ 'item.name': 1 });

    // Format the results with low stock indicators
    const stockLevels = inventoryRecords.map(inv => {
      const item = inv.item;
      const currentStock = inv.quantity || 0;
      const minStock = item?.inventory?.minimumStock || 0;
      const isLowStock = currentStock <= minStock;
      const isOutOfStock = currentStock === 0;
      const stockValue = currentStock * (item?.pricing?.costPrice || 0);

      return {
        itemId: item?._id,
        itemCode: item?.code,
        itemName: item?.name,
        category: item?.category,
        unit: item?.unit,
        quantity: currentStock,
        availableQuantity: inv.available || 0,
        allocatedQuantity: inv.allocated || 0,
        minimumStock: minStock,
        maximumStock: item?.inventory?.maximumStock || 0,
        reorderPoint: inv.reorderPoint || minStock,
        stockValue: stockValue,
        unitCost: item?.pricing?.costPrice || 0,
        isLowStock: isLowStock,
        isOutOfStock: isOutOfStock,
        stockStatus: isOutOfStock ? 'out_of_stock' : (isLowStock ? 'low_stock' : 'in_stock'),
        lastUpdated: inv.lastUpdated || inv.updatedAt,
        lastCounted: inv.lastCounted
      };
    });

    return {
      warehouse: {
        id: warehouse._id,
        code: warehouse.code,
        name: warehouse.name,
        location: warehouse.location
      },
      items: stockLevels,
      summary: {
        totalItems: stockLevels.length,
        totalValue: stockLevels.reduce((sum, item) => sum + item.stockValue, 0),
        lowStockItems: stockLevels.filter(item => item.isLowStock && !item.isOutOfStock).length,
        outOfStockItems: stockLevels.filter(item => item.isOutOfStock).length,
        inStockItems: stockLevels.filter(item => !item.isLowStock && !item.isOutOfStock).length
      }
    };
  }

  /**
   * Adjust inventory (increase or decrease)
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to adjust (positive or negative)
   * @param {string} operation - Operation type ('increase' or 'decrease')
   * @param {string} reason - Reason for adjustment
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} Updated inventory
   */
  async adjustInventory(itemId, quantity, operation, reason, options = {}) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (!['increase', 'decrease'].includes(operation)) {
      throw new Error('Operation must be either "increase" or "decrease"');
    }

    // Verify item exists
    const item = await itemService.getItemById(itemId);

    // Calculate adjustment amount
    const adjustmentAmount = operation === 'increase' ? quantity : -quantity;

    // Check if decrease would result in negative stock
    if (operation === 'decrease') {
      const currentStock = item.inventory?.currentStock || 0;
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${quantity}`);
      }
    }

    // Update item inventory
    const Item = require('../models/Item');
    const itemDoc = await Item.findById(itemId);
    
    if (!itemDoc) {
      throw new Error('Item not found');
    }

    itemDoc.inventory.currentStock = Math.max(0, (itemDoc.inventory.currentStock || 0) + adjustmentAmount);
    await itemDoc.save();

    // Log the transaction
    await this.logTransaction({
      itemId,
      quantity: adjustmentAmount,
      transactionType: operation === 'increase' ? 'STOCK_IN' : 'STOCK_OUT',
      notes: reason,
      createdBy: options.userId
    });

    return itemDoc;
  }
}

module.exports = new InventoryService();
