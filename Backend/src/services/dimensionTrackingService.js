const Invoice = require('../models/Invoice');

/**
 * Dimension Tracking Service
 * Handles dimension (cost center/project) tracking for invoices
 */
class DimensionTrackingService {
  /**
   * Add dimension to invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} dimension - Dimension value (cost center, project, etc.)
   * @returns {Promise<Object>} Updated invoice
   */
  async addDimensionToInvoice(invoiceId, dimension) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!dimension || typeof dimension !== 'string' || dimension.trim().length === 0) {
      throw new Error('Dimension value is required');
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate dimension format (alphanumeric with hyphens/underscores)
    const dimensionRegex = /^[a-zA-Z0-9_-]{1,100}$/;
    if (!dimensionRegex.test(dimension.trim())) {
      throw new Error('Dimension must be alphanumeric (1-100 characters, hyphens and underscores allowed)');
    }

    invoice.dimension = dimension.trim();
    await invoice.save();

    return invoice;
  }

  /**
   * Add dimension to invoice items
   * @param {string} invoiceId - Invoice ID
   * @param {Array} itemDimensions - Array of {itemId, dimension}
   * @returns {Promise<Object>} Updated invoice
   */
  async addDimensionToItems(invoiceId, itemDimensions) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!itemDimensions || !Array.isArray(itemDimensions) || itemDimensions.length === 0) {
      throw new Error('Item dimensions are required');
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const dimensionRegex = /^[a-zA-Z0-9_-]{1,100}$/;
    const updatedItems = [];

    for (const itemDim of itemDimensions) {
      const { itemId, dimension } = itemDim;

      // Find item in invoice
      const item = invoice.items.find(i => i.itemId.toString() === itemId.toString());
      if (!item) {
        throw new Error(`Item ${itemId} not found in invoice`);
      }

      // Validate dimension
      if (dimension && !dimensionRegex.test(dimension.trim())) {
        throw new Error(`Invalid dimension for item ${itemId}: must be alphanumeric (1-100 characters)`);
      }

      item.dimension = dimension ? dimension.trim() : null;
      updatedItems.push({
        itemId,
        dimension: item.dimension
      });
    }

    await invoice.save();

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      items: updatedItems
    };
  }

  /**
   * Get invoices by dimension
   * @param {string} dimension - Dimension value
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Invoices with specified dimension
   */
  async getInvoicesByDimension(dimension, filters = {}) {
    if (!dimension) {
      throw new Error('Dimension is required');
    }

    const query = {
      dimension,
      status: { $ne: 'cancelled' }
    };

    // Add type filter if specified
    if (filters.type) {
      query.type = filters.type;
    }

    // Add date range filter if specified
    if (filters.startDate || filters.endDate) {
      query.invoiceDate = {};
      if (filters.startDate) {
        query.invoiceDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.invoiceDate.$lte = new Date(filters.endDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name code')
      .populate('supplierId', 'name code')
      .sort({ invoiceDate: -1 });

    return invoices;
  }

  /**
   * Get dimension summary
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Dimension summary
   */
  async getDimensionSummary(params = {}) {
    const { startDate, endDate, type } = params;

    const query = {
      dimension: { $exists: true, $ne: null },
      status: { $ne: 'cancelled' }
    };

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    const invoices = await Invoice.find(query).sort({ dimension: 1 });

    const dimensionMap = {};
    let totalAmount = 0;
    let totalInvoices = 0;

    invoices.forEach(invoice => {
      const dimension = invoice.dimension;

      if (!dimensionMap[dimension]) {
        dimensionMap[dimension] = {
          dimension,
          invoiceCount: 0,
          totalAmount: 0,
          invoices: []
        };
      }

      dimensionMap[dimension].invoiceCount++;
      dimensionMap[dimension].totalAmount += invoice.totals.grandTotal;
      dimensionMap[dimension].invoices.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        amount: invoice.totals.grandTotal
      });

      totalAmount += invoice.totals.grandTotal;
      totalInvoices++;
    });

    return {
      summary: {
        totalDimensions: Object.keys(dimensionMap).length,
        totalInvoices,
        totalAmount
      },
      dimensions: Object.values(dimensionMap).sort((a, b) => b.totalAmount - a.totalAmount)
    };
  }

  /**
   * Get item-level dimension summary
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Item dimension summary
   */
  async getItemDimensionSummary(params = {}) {
    const { startDate, endDate, type } = params;

    const query = {
      'items.dimension': { $exists: true, $ne: null },
      status: { $ne: 'cancelled' }
    };

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'name code');

    const dimensionMap = {};

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (item.dimension) {
          const dimension = item.dimension;

          if (!dimensionMap[dimension]) {
            dimensionMap[dimension] = {
              dimension,
              itemCount: 0,
              totalQuantity: 0,
              totalAmount: 0,
              items: []
            };
          }

          dimensionMap[dimension].itemCount++;
          dimensionMap[dimension].totalQuantity += item.quantity;
          dimensionMap[dimension].totalAmount += item.lineTotal;
          dimensionMap[dimension].items.push({
            itemId: item.itemId._id,
            itemName: item.itemId.name,
            itemCode: item.itemId.code,
            quantity: item.quantity,
            amount: item.lineTotal
          });
        }
      });
    });

    return {
      summary: {
        totalDimensions: Object.keys(dimensionMap).length,
        totalItems: Object.values(dimensionMap).reduce((sum, d) => sum + d.itemCount, 0),
        totalAmount: Object.values(dimensionMap).reduce((sum, d) => sum + d.totalAmount, 0)
      },
      dimensions: Object.values(dimensionMap).sort((a, b) => b.totalAmount - a.totalAmount)
    };
  }

  /**
   * Validate dimension format
   * @param {string} dimension - Dimension value
   * @returns {Object} Validation result
   */
  validateDimension(dimension) {
    const errors = [];

    if (!dimension || typeof dimension !== 'string') {
      errors.push('Dimension must be a string');
      return { valid: false, errors };
    }

    if (dimension.trim().length === 0) {
      errors.push('Dimension cannot be empty');
    }

    if (dimension.length > 100) {
      errors.push('Dimension cannot exceed 100 characters');
    }

    const dimensionRegex = /^[a-zA-Z0-9_-]{1,100}$/;
    if (!dimensionRegex.test(dimension.trim())) {
      errors.push('Dimension must be alphanumeric (hyphens and underscores allowed)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available dimensions
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of available dimensions
   */
  async getAvailableDimensions(filters = {}) {
    const query = {
      dimension: { $exists: true, $ne: null },
      status: { $ne: 'cancelled' }
    };

    if (filters.type) {
      query.type = filters.type;
    }

    const invoices = await Invoice.find(query).distinct('dimension');

    return invoices.sort();
  }

  /**
   * Update dimension for multiple invoices
   * @param {Array} invoiceIds - Invoice IDs
   * @param {string} dimension - New dimension value
   * @returns {Promise<Object>} Update result
   */
  async updateDimensionForInvoices(invoiceIds, dimension) {
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      throw new Error('Invoice IDs are required');
    }

    if (!dimension) {
      throw new Error('Dimension is required');
    }

    const validation = this.validateDimension(dimension);
    if (!validation.valid) {
      throw new Error(`Invalid dimension: ${validation.errors.join(', ')}`);
    }

    const result = await Invoice.updateMany(
      { _id: { $in: invoiceIds } },
      { dimension: dimension.trim() }
    );

    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    };
  }
}

module.exports = new DimensionTrackingService();
