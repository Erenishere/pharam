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
}

module.exports = new InventoryService();
