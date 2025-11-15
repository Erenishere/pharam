const Item = require('../models/Item');

/**
 * Item Repository
 * Handles database operations for items
 */
class ItemRepository {
  /**
   * Find item by ID
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Item document
   */
  async findById(id) {
    return Item.findById(id);
  }

  /**
   * Find item by code
   * @param {string} code - Item code
   * @returns {Promise<Object>} Item document
   */
  async findByCode(code) {
    return Item.findOne({ code: code.toUpperCase() });
  }

  /**
   * Find all items with optional filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (sort, pagination)
   * @returns {Promise<Array>} List of items
   */
  async findAll(filters = {}, options = {}) {
    const query = Item.find(filters);
    
    // Apply sorting
    if (options.sort) {
      query.sort(options.sort);
    }
    
    // Apply pagination
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    return query.exec();
  }

  /**
   * Find all active items
   * @returns {Promise<Array>} List of active items
   */
  async findAllActive() {
    return Item.find({ isActive: true }).sort({ name: 1 });
  }

  /**
   * Find items by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} List of items in category
   */
  async findByCategory(category) {
    return Item.findByCategory(category);
  }

  /**
   * Find low stock items
   * @returns {Promise<Array>} List of low stock items
   */
  async findLowStockItems() {
    return Item.findLowStockItems();
  }

  /**
   * Search items with advanced filtering
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.category] - Category filter
   * @param {number} [filters.minPrice] - Minimum price
   * @param {number} [filters.maxPrice] - Maximum price
   * @param {boolean} [filters.lowStock] - Low stock filter
   * @param {boolean} [filters.isActive] - Active status filter
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of matching items
   */
  async search(filters = {}, options = {}) {
    const { 
      keyword, 
      category, 
      minPrice, 
      maxPrice, 
      lowStock, 
      isActive, 
      ...otherFilters 
    } = filters;

    const query = {};

    // Text search across multiple fields
    if (keyword) {
      const searchRegex = new RegExp(keyword, 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ];
    }

    // Exact match filters
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive;

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query['pricing.salePrice'] = {};
      if (minPrice !== undefined) query['pricing.salePrice'].$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) query['pricing.salePrice'].$lte = parseFloat(maxPrice);
    }

    // Low stock filter
    if (lowStock) {
      query.$expr = { $lte: ['$inventory.currentStock', '$inventory.minimumStock'] };
    }

    // Additional filters
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[key] = value;
      }
    });

    const queryBuilder = Item.find(query);

    // Apply sorting
    if (options.sort) {
      queryBuilder.sort(options.sort);
    } else {
      // Default sorting
      queryBuilder.sort({ name: 1 });
    }

    // Apply pagination
    if (options.limit) {
      queryBuilder.limit(parseInt(options.limit, 10));
    }
    
    if (options.skip) {
      queryBuilder.skip(parseInt(options.skip, 10));
    }

    return queryBuilder.exec();
  }

  /**
   * Count items matching the given filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count of matching items
   */
  async count(filters = {}) {
    return Item.countDocuments(filters);
  }

  /**
   * Create new item
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Created item
   */
  async create(itemData) {
    const item = new Item(itemData);
    return item.save();
  }

  /**
   * Update item
   * @param {string} id - Item ID
   * @param {Object} updateData - Updated item data
   * @returns {Promise<Object>} Updated item
   */
  async update(id, updateData) {
    return Item.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete item (soft delete)
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Deleted item
   */
  async delete(id) {
    return Item.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  /**
   * Update item stock
   * @param {string} id - Item ID
   * @param {number} quantity - Quantity to add/remove
   * @param {string} operation - 'add' or 'subtract'
   * @returns {Promise<Object>} Updated item
   */
  async updateStock(id, quantity, operation = 'add') {
    const item = await this.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    
    await item.updateStock(quantity, operation);
    return this.findById(id);
  }

  /**
   * Check if item code already exists
   * @param {string} code - Item code
   * @param {string} [excludeId] - Item ID to exclude from check
   * @returns {Promise<boolean>} True if code exists
   */
  async codeExists(code, excludeId = null) {
    const query = { code: code.toUpperCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await Item.countDocuments(query);
    return count > 0;
  }
}

module.exports = new ItemRepository();
