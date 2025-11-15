const itemRepository = require('../repositories/itemRepository');

/**
 * Item Service
 * Handles business logic for item management
 */
class ItemService {
  /**
   * Get item by ID
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Item document
   */
  async getItemById(id) {
    const item = await itemRepository.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Get item by code
   * @param {string} code - Item code
   * @returns {Promise<Object>} Item document
   */
  async getItemByCode(code) {
    const item = await itemRepository.findByCode(code);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  /**
   * Get all items with advanced filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.category] - Category filter
   * @param {number} [filters.minPrice] - Minimum price
   * @param {number} [filters.maxPrice] - Maximum price
   * @param {boolean} [filters.lowStock] - Low stock filter
   * @param {boolean} [filters.isActive] - Active status filter
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {Object} [options.sort] - Sort criteria
   * @returns {Promise<Object>} Paginated result with items and pagination info
   */
  async getAllItems(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort, ...otherOptions } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      itemRepository.search(filters, { ...otherOptions, limit, skip, sort }),
      itemRepository.count(filters)
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      items,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null
      }
    };
  }

  /**
   * Get all active items
   * @returns {Promise<Array>} List of active items
   */
  async getActiveItems() {
    return itemRepository.findAllActive();
  }

  /**
   * Get items by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} List of items in category
   */
  async getItemsByCategory(category) {
    if (!category) {
      throw new Error('Category is required');
    }
    return itemRepository.findByCategory(category);
  }

  /**
   * Get low stock items
   * @returns {Promise<Array>} List of low stock items
   */
  async getLowStockItems() {
    return itemRepository.findLowStockItems();
  }

  /**
   * Create new item
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Created item
   */
  async createItem(itemData) {
    const { code, name, pricing, inventory } = itemData;

    // Validate required fields
    if (!name) {
      throw new Error('Item name is required');
    }

    if (!pricing || pricing.costPrice === undefined || pricing.salePrice === undefined) {
      throw new Error('Pricing information is required');
    }

    // Validate code uniqueness if provided
    if (code) {
      const codeExists = await itemRepository.codeExists(code);
      if (codeExists) {
        throw new Error('Item code already exists');
      }
    }

    // Validate pricing
    if (pricing.costPrice < 0 || pricing.salePrice < 0) {
      throw new Error('Prices cannot be negative');
    }

    // Validate inventory levels
    if (inventory) {
      if (inventory.currentStock < 0 || 
          inventory.minimumStock < 0 || 
          inventory.maximumStock < 0) {
        throw new Error('Inventory levels cannot be negative');
      }

      if (inventory.minimumStock > inventory.maximumStock) {
        throw new Error('Minimum stock cannot be greater than maximum stock');
      }
    }

    return itemRepository.create(itemData);
  }

  /**
   * Update item
   * @param {string} id - Item ID
   * @param {Object} updateData - Updated item data
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(id, updateData) {
    const { code, pricing, inventory } = updateData;

    // Check if item exists
    const existingItem = await this.getItemById(id);
    if (!existingItem) {
      throw new Error('Item not found');
    }

    // Validate code uniqueness if being updated
    if (code && code !== existingItem.code) {
      const codeExists = await itemRepository.codeExists(code, id);
      if (codeExists) {
        throw new Error('Item code already exists');
      }
    }

    // Validate pricing if being updated
    if (pricing) {
      const costPrice = pricing.costPrice !== undefined ? pricing.costPrice : existingItem.pricing.costPrice;
      const salePrice = pricing.salePrice !== undefined ? pricing.salePrice : existingItem.pricing.salePrice;
      
      if (costPrice < 0 || salePrice < 0) {
        throw new Error('Prices cannot be negative');
      }
    }

    // Validate inventory levels if being updated
    if (inventory) {
      const currentStock = inventory.currentStock !== undefined ? inventory.currentStock : existingItem.inventory.currentStock;
      const minimumStock = inventory.minimumStock !== undefined ? inventory.minimumStock : existingItem.inventory.minimumStock;
      const maximumStock = inventory.maximumStock !== undefined ? inventory.maximumStock : existingItem.inventory.maximumStock;
      
      if (currentStock < 0 || minimumStock < 0 || maximumStock < 0) {
        throw new Error('Inventory levels cannot be negative');
      }

      if (minimumStock > maximumStock) {
        throw new Error('Minimum stock cannot be greater than maximum stock');
      }
    }

    return itemRepository.update(id, updateData);
  }

  /**
   * Delete item (soft delete)
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Deleted item
   */
  async deleteItem(id) {
    const item = await this.getItemById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return itemRepository.delete(id);
  }

  /**
   * Update item stock
   * @param {string} id - Item ID
   * @param {number} quantity - Quantity to add/remove
   * @param {string} operation - 'add' or 'subtract'
   * @returns {Promise<Object>} Updated item
   */
  async updateItemStock(id, quantity, operation = 'add') {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    if (!['add', 'subtract'].includes(operation)) {
      throw new Error("Operation must be either 'add' or 'subtract'");
    }

    const item = await this.getItemById(id);
    
    // For subtraction, check if enough stock is available
    if (operation === 'subtract') {
      if (item.inventory.currentStock < quantity) {
        throw new Error('Insufficient stock');
      }
    }

    return itemRepository.updateStock(id, quantity, operation);
  }

  /**
   * Check if item has sufficient stock
   * @param {string} id - Item ID
   * @param {number} quantity - Required quantity
   * @returns {Promise<boolean>} True if sufficient stock is available
   */
  async checkStockAvailability(id, quantity) {
    const item = await this.getItemById(id);
    return item.inventory.currentStock >= quantity;
  }

  /**
   * Get item categories
   * @returns {Promise<Array>} List of unique categories
   */
  async getCategories() {
    return itemRepository.findAll().distinct('category');
  }
}

module.exports = new ItemService();
