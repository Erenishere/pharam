const supplierService = require('../services/supplierService');

/**
 * Supplier Controller
 * Handles HTTP requests for supplier management
 */

/**
 * Get all suppliers with advanced filtering and pagination
 * @route GET /api/suppliers
 */
const getAllSuppliers = async (req, res) => {
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

    // Get paginated suppliers with filters
    const result = await supplierService.getAllSuppliers(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
      sort: sortOptions
    });

    return res.status(200).json({
      success: true,
      data: result.suppliers,
      pagination: result.pagination,
      message: 'Suppliers retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all suppliers error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve suppliers',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get supplier by ID
 * @route GET /api/suppliers/:id
 */
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.getSupplierById(id);

    return res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get supplier by ID error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve supplier',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get supplier by code
 * @route GET /api/suppliers/code/:code
 */
const getSupplierByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const supplier = await supplierService.getSupplierByCode(code);

    return res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get supplier by code error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve supplier',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new supplier
 * @route POST /api/suppliers
 */
const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;
    const supplier = await supplierService.createSupplier(supplierData);

    return res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create supplier error:', error);

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
        message: error.message || 'Failed to create supplier',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update supplier
 * @route PUT /api/suppliers/:id
 */
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const supplier = await supplierService.updateSupplier(id, updateData);

    return res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update supplier error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found',
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
        message: error.message || 'Failed to update supplier',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete supplier (soft delete)
 * @route DELETE /api/suppliers/:id
 */
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.deleteSupplier(id);

    return res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete supplier error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete supplier',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Restore soft-deleted supplier
 * @route POST /api/suppliers/:id/restore
 */
const restoreSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.restoreSupplier(id);

    return res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier restored successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Restore supplier error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'Supplier is already active') {
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
        message: error.message || 'Failed to restore supplier',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle supplier active status
 * @route PATCH /api/suppliers/:id/toggle-status
 */
const toggleSupplierStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.toggleSupplierStatus(id);

    return res.status(200).json({
      success: true,
      data: supplier,
      message: 'Supplier status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle supplier status error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle supplier status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get supplier statistics
 * @route GET /api/suppliers/statistics
 */
const getSupplierStatistics = async (req, res) => {
  try {
    const statistics = await supplierService.getSupplierStatistics();

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Supplier statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get supplier statistics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve supplier statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get suppliers by type
 * @route GET /api/suppliers/type/:type
 */
const getSuppliersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const suppliers = await supplierService.getSuppliersByType(type);

    return res.status(200).json({
      success: true,
      data: suppliers,
      message: 'Suppliers retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get suppliers by type error:', error);

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
        message: error.message || 'Failed to retrieve suppliers',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  getSupplierByCode,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  toggleSupplierStatus,
  getSupplierStatistics,
  getSuppliersByType,
};
