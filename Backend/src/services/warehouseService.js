const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

/**
 * Warehouse Service
 * Handles business logic for warehouse management
 */
class WarehouseService {
  /**
   * Create a new warehouse
   * @param {Object} warehouseData - Warehouse data
   * @returns {Promise<Object>} Created warehouse
   */
  async createWarehouse(warehouseData) {
    try {
      const warehouse = await Warehouse.create(warehouseData);
      return warehouse;
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('A warehouse with this code already exists', 400);
      }
      throw error;
    }
  }

  /**
   * Get warehouse by ID
   * @param {string} id - Warehouse ID
   * @param {Object} options - Query options
   * @param {boolean} [options.populateInventory] - Whether to populate inventory items
   * @returns {Promise<Object>} Warehouse document
   */
  async getWarehouseById(id, options = {}) {
    const query = Warehouse.findById(id);
    
    if (options.populateInventory) {
      query.populate({
        path: 'inventoryItems',
        populate: {
          path: 'item',
          select: 'code name unit pricing'
        }
      });
    }

    const warehouse = await query;
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    return warehouse;
  }

  /**
   * Get warehouse by code
   * @param {string} code - Warehouse code
   * @returns {Promise<Object>} Warehouse document
   */
  async getWarehouseByCode(code) {
    const warehouse = await Warehouse.findOne({ code });
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    return warehouse;
  }

  /**
   * Get all warehouses with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.search] - Search keyword (searches in name, code, and location)
   * @param {string} [filters.city] - Filter by city
   * @param {string} [filters.country] - Filter by country
   * @param {boolean} [filters.isActive] - Filter by active status
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {string} [options.sort] - Sort criteria
   * @returns {Promise<Object>} Paginated result with warehouses and pagination info
   */
  async getAllWarehouses(filters = {}, options = {}) {
    const { search, ...otherFilters } = filters;
    const query = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
      ];
    }

    // Apply other filters
    if (otherFilters.city) {
      query['location.city'] = { $regex: otherFilters.city, $options: 'i' };
    }
    if (otherFilters.country) {
      query['location.country'] = { $regex: otherFilters.country, $options: 'i' };
    }
    if (otherFilters.isActive !== undefined) {
      query.isActive = otherFilters.isActive === 'true';
    }

    // Execute query with pagination
    const features = new APIFeatures(Warehouse.find(query), options)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const warehouses = await features.query;
    const total = await Warehouse.countDocuments(query);

    return {
      data: warehouses,
      pagination: {
        total,
        page: parseInt(options.page, 10) || 1,
        limit: parseInt(options.limit, 10) || 10,
        totalPages: Math.ceil(total / (parseInt(options.limit, 10) || 10)),
      },
    };
  }

  /**
   * Update a warehouse
   * @param {string} id - Warehouse ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated warehouse
   */
  async updateWarehouse(id, updateData) {
    // Prevent updating the code directly
    if (updateData.code) {
      delete updateData.code;
    }

    const warehouse = await Warehouse.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    return warehouse;
  }

  /**
   * Delete a warehouse
   * @param {string} id - Warehouse ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteWarehouse(id) {
    // Check if warehouse has inventory
    const hasInventory = await this.warehouseHasInventory(id);
    if (hasInventory) {
      throw new AppError('Cannot delete warehouse with existing inventory', 400);
    }

    const result = await Warehouse.findByIdAndDelete(id);
    if (!result) {
      throw new AppError('Warehouse not found', 404);
    }

    return true;
  }

  /**
   * Toggle warehouse active status
   * @param {string} id - Warehouse ID
   * @returns {Promise<Object>} Updated warehouse
   */
  async toggleWarehouseStatus(id) {
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    warehouse.isActive = !warehouse.isActive;
    await warehouse.save();

    return warehouse;
  }

  /**
   * Check if warehouse has inventory
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<boolean>} True if warehouse has inventory
   */
  async warehouseHasInventory(warehouseId) {
    const count = await mongoose.model('Inventory').countDocuments({ warehouse: warehouseId });
    return count > 0;
  }

  /**
   * Get warehouse statistics
   * @returns {Promise<Array>} Array of warehouse statistics
   */
  async getWarehouseStatistics() {
    return Warehouse.getStatistics();
  }

  /**
   * Get warehouses by location
   * @param {string} city - City name
   * @param {string} country - Country name
   * @returns {Promise<Array>} Array of warehouses in the specified location
   */
  async getWarehousesByLocation(city, country) {
    return Warehouse.findByLocation(city, country);
  }
}

module.exports = new WarehouseService();
