const batchRepository = require('../repositories/batchRepository');
const itemService = require('./itemService');
const inventoryService = require('./inventoryService');

class BatchService {
  /**
   * Create a new batch
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  async createBatch(batchData) {
    const {
      itemId,
      batchNumber,
      quantity,
      unitCost,
      locationId,
      ...rest
    } = batchData;

    // Validate required fields
    if (!itemId || !batchNumber || quantity === undefined || unitCost === undefined) {
      throw new Error('Missing required fields: itemId, batchNumber, quantity, and unitCost are required');
    }

    // Verify item exists
    await itemService.getItemById(itemId);

    // Check if batch number already exists for this item
    const exists = await batchRepository.findByBatchNumber(batchNumber, itemId);
    if (exists) {
      throw new Error(`Batch number ${batchNumber} already exists for this item`);
    }

    // Create batch
    const batch = await batchRepository.create({
      ...rest,
      item: itemId,
      batchNumber: batchNumber.toUpperCase(),
      quantity,
      remainingQuantity: quantity,
      unitCost,
      totalCost: quantity * unitCost,
      location: locationId,
      status: 'active'
    });

    // Update inventory if location is provided
    if (locationId) {
      await inventoryService.addStock(itemId, locationId, quantity, {
        batchId: batch._id,
        referenceId: `BATCH_${batch.batchNumber}`,
        notes: `Initial stock from batch ${batchNumber}`,
        userId: batch.createdBy
      });
    }

    return this.getBatchById(batch._id);
  }

  /**
   * Get batch by ID
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Batch
   */
  async getBatchById(id) {
    const batch = await batchRepository.findById(id);
    if (!batch) {
      throw new Error('Batch not found');
    }
    return batch;
  }

  /**
   * Get batch by batch number and item ID
   * @param {string} batchNumber - Batch number
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Batch
   */
  async getBatchByNumber(batchNumber, itemId) {
    const batch = await batchRepository.findByBatchNumber(batchNumber, itemId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    return batch;
  }

  /**
   * Update batch
   * @param {string} id - Batch ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated batch
   */
  async updateBatch(id, updateData) {
    const batch = await this.getBatchById(id);
    
    // Prevent certain fields from being updated
    const { quantity, remainingQuantity, totalCost, ...safeUpdates } = updateData;
    
    // If unitCost is being updated, recalculate totalCost
    if (safeUpdates.unitCost !== undefined) {
      safeUpdates.totalCost = batch.quantity * safeUpdates.unitCost;
    }
    
    // If expiryDate is being updated, validate it
    if (safeUpdates.expiryDate) {
      const expiryDate = new Date(safeUpdates.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new Error('Invalid expiry date');
      }
      
      // If batch has manufacturingDate, ensure expiry is after manufacturing
      if (batch.manufacturingDate && expiryDate <= batch.manufacturingDate) {
        throw new Error('Expiry date must be after manufacturing date');
      }
    }
    
    // If manufacturingDate is being updated, validate it
    if (safeUpdates.manufacturingDate) {
      const manufacturingDate = new Date(safeUpdates.manufacturingDate);
      if (isNaN(manufacturingDate.getTime())) {
        throw new Error('Invalid manufacturing date');
      }
      
      // If batch has expiryDate, ensure manufacturing is before expiry
      if (batch.expiryDate && manufacturingDate >= batch.expiryDate) {
        throw new Error('Manufacturing date must be before expiry date');
      }
    }
    
    // Update batch
    const updatedBatch = await batchRepository.update(id, safeUpdates);
    
    // If location is being updated, adjust inventory
    if (safeUpdates.locationId && safeUpdates.locationId !== batch.location?.toString()) {
      // Remove from old location
      if (batch.location) {
        await inventoryService.removeStock(
          batch.item._id,
          batch.location,
          batch.remainingQuantity,
          {
            batchId: batch._id,
            referenceId: `BATCH_UPDATE_${batch._id}`,
            notes: `Location change from ${batch.location} to ${safeUpdates.locationId}`,
            userId: safeUpdates.updatedBy
          }
        );
      }
      
      // Add to new location
      await inventoryService.addStock(
        batch.item._id,
        safeUpdates.locationId,
        batch.remainingQuantity,
        {
          batchId: batch._id,
          referenceId: `BATCH_UPDATE_${batch._id}`,
          notes: `Location change from ${batch.location || 'none'} to ${safeUpdates.locationId}`,
          userId: safeUpdates.updatedBy
        }
      );
    }
    
    return updatedBatch;
  }

  /**
   * Delete batch
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBatch(id) {
    const batch = await this.getBatchById(id);
    
    // Check if batch has remaining quantity
    if (batch.remainingQuantity > 0) {
      throw new Error('Cannot delete batch with remaining quantity');
    }
    
    return batchRepository.delete(id);
  }

  /**
   * Get batches by item ID
   * @param {string} itemId - Item ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesByItem(itemId, options = {}) {
    return batchRepository.findByItemId(itemId, options);
  }

  /**
   * Get batches by location ID
   * @param {string} locationId - Location ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesByLocation(locationId, options = {}) {
    return batchRepository.findByLocationId(locationId, options);
  }

  /**
   * Get batches by supplier ID
   * @param {string} supplierId - Supplier ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array>} Array of batches
   */
  async getBatchesBySupplier(supplierId, options = {}) {
    return batchRepository.findBySupplierId(supplierId, options);
  }

  /**
   * Get batches expiring soon
   * @param {Object} [options] - Options
   * @param {number} [options.days=30] - Number of days to check for expiry
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of batches expiring soon
   */
  async getExpiringBatches(options = {}) {
    const { days = 30, locationId } = options;
    return batchRepository.findExpiringSoon(days, { locationId });
  }

  /**
   * Get expired batches
   * @param {Object} [options] - Options
   * @param {string} [options.locationId] - Filter by location ID
   * @returns {Promise<Array>} Array of expired batches
   */
  async getExpiredBatches(options = {}) {
    const { locationId } = options;
    return batchRepository.findExpiredBatches({ locationId });
  }

  /**
   * Update batch quantity
   * @param {string} id - Batch ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {Object} [options] - Options
   * @returns {Promise<Object>} Updated batch
   */
  async updateBatchQuantity(id, quantity, options = {}) {
    const batch = await this.getBatchById(id);
    
    // If removing stock, check if enough is available
    if (quantity < 0 && Math.abs(quantity) > batch.remainingQuantity) {
      throw new Error('Insufficient quantity in batch');
    }
    
    // Update batch quantity
    await batchRepository.updateQuantity(id, quantity);
    
    // Update inventory if location is set
    if (batch.location) {
      if (quantity > 0) {
        await inventoryService.addStock(
          batch.item._id,
          batch.location,
          quantity,
          {
            batchId: batch._id,
            referenceId: options.referenceId,
            notes: options.notes || `Batch quantity updated by ${quantity}`,
            userId: options.userId
          }
        );
      } else {
        await inventoryService.removeStock(
          batch.item._id,
          batch.location,
          Math.abs(quantity),
          {
            batchId: batch._id,
            referenceId: options.referenceId,
            notes: options.notes || `Batch quantity updated by ${quantity}`,
            userId: options.userId
          }
        );
      }
    }
    
    return this.getBatchById(id);
  }

  /**
   * Get batch statistics
   * @param {Object} [filters] - Filter criteria
   * @returns {Promise<Object>} Batch statistics
   */
  async getBatchStatistics(filters = {}) {
    return batchRepository.getStatistics(filters);
  }

  /**
   * Update batch statuses (should be run periodically)
   * @returns {Promise<Object>} Update result
   */
  async updateBatchStatuses() {
    return batchRepository.updateBatchStatuses();
  }

  /**
   * Get next available batch number for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<string>} Next available batch number
   */
  async getNextBatchNumber(itemId) {
    // Get the item to use its code in the batch number
    const item = await itemService.getItemById(itemId);
    
    // Format: ITEM-CODE-YYYYMMDD-XXX
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    
    // Find the highest sequence number for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const batches = await batchRepository.findByItemId(itemId);
    const todayBatches = batches.filter(batch => {
      const batchDate = new Date(batch.createdAt);
      return batchDate >= today && batch.batchNumber.startsWith(`${item.code}-${dateStr}`);
    });
    
    const sequence = String(todayBatches.length + 1).padStart(3, '0');
    return `${item.code}-${dateStr}-${sequence}`;
  }
}

module.exports = new BatchService();
