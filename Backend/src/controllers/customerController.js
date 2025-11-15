const customerService = require('../services/customerService');

/**
 * Customer Controller
 * Handles HTTP requests for customer management
 */

/**
 * Get all customers with advanced filtering and pagination
 * @route GET /api/customers
 */
const getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      type,
      city,
      state,
      country,
      isActive,
      createdFrom,
      createdTo,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(type && { type }),
      ...(city && { city }),
      ...(state && { state }),
      ...(country && { country }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(createdFrom && { createdFrom }),
      ...(createdTo && { createdTo }),
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

    // Get paginated customers with filters
    const result = await customerService.getAllCustomers(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
      sort: sortOptions
    });

    return res.status(200).json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
      message: 'Customers retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve customers',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get customer by ID
 * @route GET /api/customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    return res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve customer',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get customer by code
 * @route GET /api/customers/code/:code
 */
const getCustomerByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const customer = await customerService.getCustomerByCode(code);

    return res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get customer by code error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve customer',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new customer
 * @route POST /api/customers
 */
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    const customer = await customerService.createCustomer(customerData);

    return res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create customer error:', error);

    if (
      error.message.includes('already exists')
      || error.message.includes('required')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
      || error.message.includes('cannot be')
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
        message: error.message || 'Failed to create customer',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update customer
 * @route PUT /api/customers/:id
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await customerService.updateCustomer(id, updateData);

    return res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update customer error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('already exists')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
      || error.message.includes('cannot be')
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
        message: error.message || 'Failed to update customer',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete customer (soft delete)
 * @route DELETE /api/customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.deleteCustomer(id);

    return res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete customer error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete customer',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Restore soft-deleted customer
 * @route POST /api/customers/:id/restore
 */
const restoreCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.restoreCustomer(id);

    return res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer restored successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Restore customer error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'Customer is already active') {
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
        message: error.message || 'Failed to restore customer',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle customer active status
 * @route PATCH /api/customers/:id/toggle-status
 */
const toggleCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.toggleCustomerStatus(id);

    return res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle customer status error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle customer status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get customer statistics
 * @route GET /api/customers/statistics
 */
const getCustomerStatistics = async (req, res) => {
  try {
    const statistics = await customerService.getCustomerStatistics();

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Customer statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get customer statistics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve customer statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get customers by type
 * @route GET /api/customers/type/:type
 */
const getCustomersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const customers = await customerService.getCustomersByType(type);

    return res.status(200).json({
      success: true,
      data: customers,
      message: 'Customers retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get customers by type error:', error);

    if (error.message.includes('Invalid type')) {
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
        message: error.message || 'Failed to retrieve customers',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerByCode,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  toggleCustomerStatus,
  getCustomerStatistics,
  getCustomersByType,
};
