const salesInvoiceService = require('../services/salesInvoiceService');

/**
 * Sales Invoice Controller
 * Handles HTTP requests for sales invoice management
 */

/**
 * Get all sales invoices with advanced filtering and pagination
 * @route GET /api/invoices/sales
 */
const getAllSalesInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'invoiceDate',
      sortOrder = 'desc',
      keyword,
      customerId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
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

    // Get paginated invoices with filters
    const result = await salesInvoiceService.getAllSalesInvoices(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
      sort: sortOptions
    });

    return res.status(200).json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
      message: 'Sales invoices retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all sales invoices error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve sales invoices',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get sales invoice by ID
 * @route GET /api/invoices/sales/:id
 */
const getSalesInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await salesInvoiceService.getSalesInvoiceById(id);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sales invoice by ID error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve sales invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get sales invoice by invoice number
 * @route GET /api/invoices/sales/number/:invoiceNumber
 */
const getSalesInvoiceByNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await salesInvoiceService.getSalesInvoiceByNumber(invoiceNumber);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sales invoice by number error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve sales invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get sales invoices by customer
 * @route GET /api/invoices/sales/customer/:customerId
 */
const getSalesInvoicesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, sort } = req.query;

    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.invoiceDate = -1;
    }

    const invoices = await salesInvoiceService.getSalesInvoicesByCustomer(customerId, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions
    });

    return res.status(200).json({
      success: true,
      data: invoices,
      message: 'Customer sales invoices retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sales invoices by customer error:', error);

    if (error.message === 'Customer not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve customer sales invoices',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new sales invoice
 * @route POST /api/invoices/sales
 */
const createSalesInvoice = async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      createdBy: req.user._id // From authentication middleware
    };

    const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Sales invoice created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create sales invoice error:', error);

    if (
      error.message.includes('required')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
      || error.message.includes('cannot be')
      || error.message.includes('Insufficient stock')
      || error.message.includes('exceeds customer credit limit')
      || error.message.includes('not active')
      || error.code === 'ITEM_NOT_FOUND'
    ) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code || 'VALIDATION_ERROR',
          message: error.message,
          itemId: error.itemId
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create sales invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update sales invoice
 * @route PUT /api/invoices/sales/:id
 */
const updateSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const invoice = await salesInvoiceService.updateSalesInvoice(id, updateData);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update sales invoice error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Use error code if available, otherwise determine from message
    const statusCode = error.statusCode || (
      error.message.includes('Cannot')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
      || error.message.includes('cannot be')
      || error.message.includes('Insufficient stock')
      || error.message.includes('exceeds customer credit limit')
    ) ? 422 : 500;

    const errorCode = error.code || (statusCode === 422 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete sales invoice
 * @route DELETE /api/invoices/sales/:id
 */
const deleteSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await salesInvoiceService.deleteSalesInvoice(id);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete sales invoice error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot delete')) {
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
        message: error.message || 'Failed to delete sales invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update sales invoice status
 * @route PATCH /api/invoices/sales/:id/status
 */
const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const validStatuses = ['draft', 'confirmed', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const invoice = await salesInvoiceService.updateSalesInvoice(id, { status });

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update invoice status error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot update')) {
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
        message: error.message || 'Failed to update invoice status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update sales invoice payment status
 * @route PATCH /api/invoices/sales/:id/payment-status
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payment status is required',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const validPaymentStatuses = ['pending', 'partial', 'paid'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const invoice = await salesInvoiceService.updateSalesInvoice(id, { paymentStatus });

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice payment status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update payment status error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update payment status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get sales statistics
 * @route GET /api/invoices/sales/statistics
 */
const getSalesStatistics = async (req, res) => {
  try {
    const filters = req.query;
    const statistics = await salesInvoiceService.getSalesStatistics(filters);

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Sales statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get sales statistics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve sales statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Confirm sales invoice and update inventory
 * @route PATCH /api/invoices/sales/:id/confirm
 */
const confirmSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await salesInvoiceService.confirmSalesInvoice(id, userId);

    return res.status(200).json({
      success: true,
      data: result.invoice,
      message: 'Sales invoice confirmed successfully and inventory updated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Confirm sales invoice error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Use error code if available, otherwise determine from message
    const statusCode = error.statusCode || (
      error.message.includes('Cannot confirm')
      || error.message.includes('Insufficient stock')
      || error.message.includes('Only draft invoices')
      || error.message.includes('exceeds customer credit limit')
    ) ? 422 : 500;

    const errorCode = error.code || (statusCode === 422 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Mark invoice as paid
 * @route POST /api/invoices/sales/:id/mark-paid
 */
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    const invoice = await salesInvoiceService.markInvoiceAsPaid(id, paymentData);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice marked as paid successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark invoice as paid error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('Cannot mark')
      || error.message.includes('already')
      || error.message.includes('Confirm the invoice first')
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
        message: error.message || 'Failed to mark invoice as paid',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Mark invoice as partially paid
 * @route POST /api/invoices/sales/:id/mark-partial-paid
 */
const markInvoiceAsPartiallyPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    if (!paymentData.amount || paymentData.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payment amount is required and must be greater than 0',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const invoice = await salesInvoiceService.markInvoiceAsPartiallyPaid(id, paymentData);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice marked as partially paid successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark invoice as partially paid error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('Cannot process')
      || error.message.includes('already')
      || error.message.includes('Confirm the invoice first')
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
        message: error.message || 'Failed to mark invoice as partially paid',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Cancel sales invoice and reverse inventory
 * @route PATCH /api/invoices/sales/:id/cancel
 */
const cancelSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const invoice = await salesInvoiceService.cancelSalesInvoice(id, userId, reason);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Sales invoice cancelled successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cancel sales invoice error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Use error code if available, otherwise determine from message
    const statusCode = error.statusCode || (
      error.message.includes('Cannot cancel')
      || error.message.includes('already cancelled')
      || error.message.includes('process a refund')
    ) ? 422 : 500;

    const errorCode = error.code || (statusCode === 422 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get stock movements for an invoice
 * @route GET /api/invoices/sales/:id/stock-movements
 */
const getInvoiceStockMovements = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify invoice exists
    await salesInvoiceService.getSalesInvoiceById(id);

    const stockMovements = await salesInvoiceService.getInvoiceStockMovements(id);

    return res.status(200).json({
      success: true,
      data: stockMovements,
      message: 'Stock movements retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get invoice stock movements error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve stock movements',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update invoice payment (unified endpoint for all payment status updates)
 * @route PATCH /api/invoices/sales/:id/payment
 */
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, amount, ...paymentData } = req.body;

    let invoice;

    if (paymentStatus === 'paid') {
      invoice = await salesInvoiceService.markInvoiceAsPaid(id, paymentData);
    } else if (paymentStatus === 'partial') {
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment amount is required for partial payments',
          },
          timestamp: new Date().toISOString(),
        });
      }
      invoice = await salesInvoiceService.markInvoiceAsPartiallyPaid(id, { amount, ...paymentData });
    } else {
      // For 'pending' or just updating payment status
      invoice = await salesInvoiceService.updateSalesInvoice(id, { paymentStatus, ...paymentData });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Payment status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update payment error:', error);

    if (error.message === 'Sales invoice not found' || error.message === 'Invoice is not a sales invoice') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('Cannot')
      || error.message.includes('already')
      || error.message.includes('Confirm the invoice first')
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
        message: error.message || 'Failed to update payment status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Advanced search for sales invoices
 * @route POST /api/invoices/sales/search
 */
const advancedSearch = async (req, res) => {
  try {
    const searchService = require('../services/searchService');
    const Invoice = require('../models/Invoice');

    const {
      filters = [],
      sort = [],
      page = 1,
      limit = 50,
      searchText = '',
      searchFields = ['invoiceNo', 'notes'],
      populate = ['customerId', 'items.itemId', 'createdBy']
    } = req.body;

    // Add type filter to ensure only sales invoices are returned
    const salesFilters = [
      ...filters,
      { field: 'type', operator: 'in', value: ['sales', 'return_sales'] }
    ];

    const results = await searchService.searchRecords(Invoice, {
      filters: salesFilters,
      sort,
      page,
      limit,
      searchText,
      searchFields,
      populate
    });

    return res.status(200).json({
      success: true,
      data: results.results,
      pagination: results.pagination,
      message: 'Sales invoices search completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to perform search',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Convert estimate to invoice (Task 75.3)
 * @route POST /api/invoices/sales/:id/convert-estimate
 */
const convertEstimateToInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const estimateService = require('../services/estimateService');

    const invoice = await estimateService.convertEstimateToInvoice(id);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Estimate converted to invoice successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Convert estimate to invoice error:', error);

    if (error.message === 'Estimate not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ESTIMATE_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('Only draft estimates')
      || error.message.includes('Cannot convert expired')
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
        message: error.message || 'Failed to convert estimate to invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get pending estimates (Task 75.4)
 * @route GET /api/invoices/sales/estimates/pending
 */
const getPendingEstimates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'invoiceDate',
      sortOrder = 'desc',
      customerId,
      includeExpired,
      ...otherFilters
    } = req.query;

    const estimateService = require('../services/estimateService');

    // Build filters object
    const filters = {
      ...(customerId && { customerId }),
      ...(includeExpired === 'true' && { includeExpired: true }),
      ...otherFilters
    };

    // Build sort options
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const result = await estimateService.getPendingEstimates(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions
    });

    return res.status(200).json({
      success: true,
      data: result.estimates,
      pagination: result.pagination,
      message: 'Pending estimates retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get pending estimates error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve pending estimates',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get expired estimates (Task 75.5)
 * @route GET /api/invoices/sales/estimates/expired
 */
const getExpiredEstimates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'expiryDate',
      sortOrder = 'desc',
      customerId,
      ...otherFilters
    } = req.query;

    const estimateService = require('../services/estimateService');

    // Build filters object
    const filters = {
      ...(customerId && { customerId }),
      ...otherFilters
    };

    // Build sort options
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const result = await estimateService.getExpiredEstimates(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions
    });

    return res.status(200).json({
      success: true,
      data: result.estimates,
      pagination: result.pagination,
      message: 'Expired estimates retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get expired estimates error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve expired estimates',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get warranty information for an invoice (Task 76.4)
 * @route GET /api/invoices/sales/:id/warranty
 */
const getWarrantyInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const warrantyService = require('../services/warrantyService');
    const Invoice = require('../models/Invoice');

    // Get invoice with populated fields
    const invoice = await Invoice.findById(id)
      .populate('items.itemId', 'code name')
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (invoice.type !== 'sales' && invoice.type !== 'return_sales') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INVOICE_TYPE',
          message: 'Invoice is not a sales invoice',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const warrantyInfo = await warrantyService.getWarrantyInfoForInvoice(invoice);

    return res.status(200).json({
      success: true,
      data: warrantyInfo,
      message: 'Warranty information retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get warranty info error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve warranty information',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update warranty information for an invoice (Task 76.2)
 * @route PUT /api/invoices/sales/:id/warranty
 */
const updateWarrantyInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const warrantyUpdate = req.body;
    const warrantyService = require('../services/warrantyService');
    const Invoice = require('../models/Invoice');

    // Get invoice
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (invoice.type !== 'sales' && invoice.type !== 'return_sales') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INVOICE_TYPE',
          message: 'Invoice is not a sales invoice',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Only allow updates to draft invoices
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Can only update warranty information for draft invoices',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Update warranty information
    await warrantyService.updateWarrantyInfo(invoice, warrantyUpdate);

    // Save invoice
    await invoice.save();

    // Populate and return updated invoice
    const updatedInvoice = await Invoice.findById(id)
      .populate('customerId', 'code name')
      .populate('items.itemId', 'code name')
      .lean();

    return res.status(200).json({
      success: true,
      data: updatedInvoice,
      message: 'Warranty information updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update warranty info error:', error);

    if (error.message.includes('Warranty validation failed')) {
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
        message: error.message || 'Failed to update warranty information',
      },
      timestamp: new Date().toISOString(),
    });
  }
};


module.exports = {
  getAllSalesInvoices,
  getSalesInvoiceById,
  getSalesInvoiceByNumber,
  getSalesInvoicesByCustomer,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoice,
  updateInvoiceStatus,
  updatePaymentStatus,
  updatePayment,
  getSalesStatistics,
  confirmSalesInvoice,
  markInvoiceAsPaid,
  markInvoiceAsPartiallyPaid,
  cancelSalesInvoice,
  getInvoiceStockMovements,
  advancedSearch,
  // Task 75: Estimate operations
  convertEstimateToInvoice,
  getPendingEstimates,
  getExpiredEstimates,
  // Task 76: Warranty operations
  getWarrantyInfo,
  updateWarrantyInfo,
};
