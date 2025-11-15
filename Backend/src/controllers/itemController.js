const itemService = require('../services/itemService');

/**
 * Item Controller
 * Handles HTTP requests for item management
 */

/**
 * Get all items with advanced filtering and pagination
 * @route GET /api/items
 */
const getAllItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      category,
      minPrice,
      maxPrice,
      lowStock,
      isActive,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(category && { category }),
      ...(minPrice !== undefined && { minPrice: parseFloat(minPrice) }),
      ...(maxPrice !== undefined && { maxPrice: parseFloat(maxPrice) }),
      ...(lowStock !== undefined && { lowStock: lowStock === 'true' }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...otherFilters
    };

    // Build sort options
    const sortOptions = {};
    if (sort) {
      // Handle sort parameter in format: 'field:asc' or 'field:desc'
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else if (sortBy) {
      // Fallback to sortBy and sortOrder if sort is not provided
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Get paginated items with filters
    const result = await itemService.getAllItems(
      filters,
      {
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
        sort: sortOptions,
      },
    );

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      message: 'Items retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all items error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item by ID
 * @route GET /api/items/:id
 */
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await itemService.getItemById(id);

    return res.status(200).json({
      success: true,
      data: item,
      message: 'Item retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item by ID error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new item
 * @route POST /api/items
 */
const createItem = async (req, res) => {
  try {
    const itemData = req.body;
    const newItem = await itemService.createItem(itemData);

    return res.status(201).json({
      success: true,
      data: newItem,
      message: 'Item created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create item error:', error);

    if (
      error.message === 'Item name is required' ||
      error.message === 'Pricing information is required' ||
      error.message === 'Item code already exists' ||
      error.message === 'Prices cannot be negative' ||
      error.message === 'Inventory levels cannot be negative' ||
      error.message === 'Minimum stock cannot be greater than maximum stock'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update item
 * @route PUT /api/items/:id
 */
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedItem = await itemService.updateItem(id, updateData);

    return res.status(200).json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update item error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Item code already exists' ||
      error.message === 'Prices cannot be negative' ||
      error.message === 'Inventory levels cannot be negative' ||
      error.message === 'Minimum stock cannot be greater than maximum stock'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete item (soft delete)
 * @route DELETE /api/items/:id
 */
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await itemService.deleteItem(id);

    return res.status(200).json({
      success: true,
      data: deletedItem,
      message: 'Item deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete item error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete item',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update item stock
 * @route PATCH /api/items/:id/stock
 */
const updateItemStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'add' } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const updatedItem = await itemService.updateItemStock(id, parseFloat(quantity), operation);

    return res.status(200).json({
      success: true,
      data: updatedItem,
      message: `Item stock ${operation === 'add' ? 'increased' : 'decreased'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update item stock error:', error);

    if (error.message === 'Item not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Insufficient stock' ||
      error.message === 'Quantity must be greater than zero' ||
      error.message === "Operation must be either 'add' or 'subtract'"
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update item stock',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get low stock items
 * @route GET /api/items/low-stock
 */
const getLowStockItems = async (req, res) => {
  try {
    const items = await itemService.getLowStockItems();
    
    return res.status(200).json({
      success: true,
      data: items,
      message: 'Low stock items retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get low stock items error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve low stock items',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get item categories
 * @route GET /api/items/categories
 */
const getItemCategories = async (req, res) => {
  try {
    const categories = await itemService.getCategories();
    
    return res.status(200).json({
      success: true,
      data: categories,
      message: 'Item categories retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get item categories error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve item categories',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateItemStock,
  getLowStockItems,
  getItemCategories,
};
