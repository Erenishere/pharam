const purchaseInvoiceService = require('../services/purchaseInvoiceService');

/**
 * Purchase Invoice Controller
 * Handles HTTP requests for purchase invoice management
 */

/**
 * Get all purchase invoices with advanced filtering and pagination
 * @route GET /api/invoices/purchase
 */
const getAllPurchaseInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'invoiceDate',
      sortOrder = 'desc',
      keyword,
      supplierId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(supplierId && { supplierId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...otherFilters,
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
    const result = await purchaseInvoiceService.getAllPurchaseInvoices(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
      message: 'Purchase invoices retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all purchase invoices error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve purchase invoices',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get purchase invoice by ID
 * @route GET /api/invoices/purchase/:id
 */
const getPurchaseInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await purchaseInvoiceService.getPurchaseInvoiceById(id);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get purchase invoice by ID error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
        message: error.message || 'Failed to retrieve purchase invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get purchase invoice by invoice number
 * @route GET /api/invoices/purchase/number/:invoiceNumber
 */
const getPurchaseInvoiceByNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await purchaseInvoiceService.getPurchaseInvoiceByNumber(invoiceNumber);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get purchase invoice by number error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
        message: error.message || 'Failed to retrieve purchase invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get purchase invoices by supplier
 * @route GET /api/invoices/purchase/supplier/:supplierId
 */
const getPurchaseInvoicesBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { page = 1, limit = 10, sort } = req.query;

    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.invoiceDate = -1;
    }

    const invoices = await purchaseInvoiceService.getPurchaseInvoicesBySupplier(supplierId, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: invoices,
      message: 'Supplier purchase invoices retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get purchase invoices by supplier error:', error);

    if (error.message === 'Supplier not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve supplier purchase invoices',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new purchase invoice
 * @route POST /api/invoices/purchase
 */
const createPurchaseInvoice = async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      createdBy: req.user._id, // From authentication middleware
    };

    const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create purchase invoice error:', error);

    if (
      error.message.includes('required') ||
      error.message.includes('Invalid') ||
      error.message.includes('must be') ||
      error.message.includes('cannot be') ||
      error.message.includes('not active') ||
      error.message.includes('not a supplier')
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
        message: error.message || 'Failed to create purchase invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update purchase invoice
 * @route PUT /api/invoices/purchase/:id
 */
const updatePurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const invoice = await purchaseInvoiceService.updatePurchaseInvoice(id, updateData);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update purchase invoice error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
    const statusCode =
      error.statusCode ||
      error.message.includes('Cannot') ||
      error.message.includes('Invalid') ||
      error.message.includes('must be') ||
      error.message.includes('cannot be')
        ? 422
        : 500;

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
 * Delete purchase invoice
 * @route DELETE /api/invoices/purchase/:id
 */
const deletePurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await purchaseInvoiceService.deletePurchaseInvoice(id);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete purchase invoice error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
        message: error.message || 'Failed to delete purchase invoice',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update purchase invoice status
 * @route PATCH /api/invoices/purchase/:id/status
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

    const invoice = await purchaseInvoiceService.updatePurchaseInvoice(id, { status });

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update invoice status error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
 * Update purchase invoice payment status
 * @route PATCH /api/invoices/purchase/:id/payment-status
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

    const invoice = await purchaseInvoiceService.updatePurchaseInvoice(id, { paymentStatus });

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice payment status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update payment status error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
 * Get purchase statistics
 * @route GET /api/invoices/purchase/statistics
 */
const getPurchaseStatistics = async (req, res) => {
  try {
    const filters = req.query;
    const statistics = await purchaseInvoiceService.getPurchaseStatistics(filters);

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Purchase statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get purchase statistics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve purchase statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Confirm purchase invoice and update inventory
 * @route PATCH /api/invoices/purchase/:id/confirm
 */
const confirmPurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await purchaseInvoiceService.confirmPurchaseInvoice(id, userId);

    return res.status(200).json({
      success: true,
      data: result.invoice,
      message: 'Purchase invoice confirmed successfully and inventory updated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Confirm purchase invoice error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
    const statusCode =
      error.statusCode || error.message.includes('Cannot confirm') || error.message.includes('Only draft invoices')
        ? 422
        : 500;

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
 * @route POST /api/invoices/purchase/:id/mark-paid
 */
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    const invoice = await purchaseInvoiceService.markInvoiceAsPaid(id, paymentData);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice marked as paid successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark invoice as paid error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
      error.message.includes('Cannot mark') ||
      error.message.includes('already') ||
      error.message.includes('Confirm the invoice first')
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
 * @route POST /api/invoices/purchase/:id/mark-partial-paid
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

    const invoice = await purchaseInvoiceService.markInvoiceAsPartiallyPaid(id, paymentData);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice marked as partially paid successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark invoice as partially paid error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
      error.message.includes('Cannot process') ||
      error.message.includes('already') ||
      error.message.includes('Confirm the invoice first')
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
 * Cancel purchase invoice and reverse inventory
 * @route PATCH /api/invoices/purchase/:id/cancel
 */
const cancelPurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const invoice = await purchaseInvoiceService.cancelPurchaseInvoice(id, userId, reason);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Purchase invoice cancelled successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cancel purchase invoice error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
    const statusCode =
      error.statusCode ||
      error.message.includes('Cannot cancel') ||
      error.message.includes('already cancelled') ||
      error.message.includes('process a refund')
        ? 422
        : 500;

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
 * @route GET /api/invoices/purchase/:id/stock-movements
 */
const getInvoiceStockMovements = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify invoice exists
    await purchaseInvoiceService.getPurchaseInvoiceById(id);

    const stockMovements = await purchaseInvoiceService.getInvoiceStockMovements(id);

    return res.status(200).json({
      success: true,
      data: stockMovements,
      message: 'Stock movements retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get invoice stock movements error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
 * @route PATCH /api/invoices/purchase/:id/payment
 */
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, amount, ...paymentData } = req.body;

    let invoice;

    if (paymentStatus === 'paid') {
      invoice = await purchaseInvoiceService.markInvoiceAsPaid(id, paymentData);
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
      invoice = await purchaseInvoiceService.markInvoiceAsPartiallyPaid(id, { amount, ...paymentData });
    } else {
      // For 'pending' or just updating payment status
      invoice = await purchaseInvoiceService.updatePurchaseInvoice(id, { paymentStatus, ...paymentData });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
      message: 'Payment status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update payment error:', error);

    if (error.message === 'Purchase invoice not found' || error.message === 'Invoice is not a purchase invoice') {
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
      error.message.includes('Cannot') ||
      error.message.includes('already') ||
      error.message.includes('Confirm the invoice first')
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

module.exports = {
  getAllPurchaseInvoices,
  getPurchaseInvoiceById,
  getPurchaseInvoiceByNumber,
  getPurchaseInvoicesBySupplier,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  updateInvoiceStatus,
  updatePaymentStatus,
  updatePayment,
  getPurchaseStatistics,
  confirmPurchaseInvoice,
  markInvoiceAsPaid,
  markInvoiceAsPartiallyPaid,
  cancelPurchaseInvoice,
  getInvoiceStockMovements,
};

const purchaseReturnService = require('../services/purchaseReturnService');

/**
 * Create a purchase return invoice
 * @route POST /api/purchase-invoices/return
 */
const createPurchaseReturn = async (req, res) => {
  try {
    const { originalInvoiceId, returnItems, returnReason, returnNotes } = req.body;

    // Validate required fields
    if (!originalInvoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Original invoice ID is required'
      });
    }

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one return item is required'
      });
    }

    if (!returnReason) {
      return res.status(400).json({
        success: false,
        message: 'Return reason is required'
      });
    }

    // Create return invoice
    const returnInvoice = await purchaseReturnService.createPurchaseReturn({
      originalInvoiceId,
      returnItems,
      returnReason,
      returnNotes,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Purchase return created successfully',
      data: returnInvoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating purchase return',
      error: error.message
    });
  }
};

/**
 * Get returnable items for a purchase invoice
 * @route GET /api/purchase-invoices/:id/returnable
 */
const getReturnableItems = async (req, res) => {
  try {
    const { id } = req.params;

    const returnableItems = await purchaseReturnService.getReturnableItems(id);

    res.status(200).json({
      success: true,
      message: 'Returnable items retrieved successfully',
      data: returnableItems
    });
  } catch (error) {
    if (error.message === 'Original invoice not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error retrieving returnable items',
      error: error.message
    });
  }
};

/**
 * Validate return quantities
 * @route POST /api/purchase-invoices/:id/validate-return
 */
const validateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnItems } = req.body;

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Return items are required'
      });
    }

    const validation = await purchaseReturnService.validateReturnQuantities(id, returnItems);

    res.status(200).json({
      success: true,
      message: validation.valid ? 'Return validation passed' : 'Return validation failed',
      data: validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating return',
      error: error.message
    });
  }
};

module.exports = {
  ...module.exports,
  createPurchaseReturn,
  getReturnableItems,
  validateReturn
};
