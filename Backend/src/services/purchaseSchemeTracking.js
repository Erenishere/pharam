const Invoice = require('../models/Invoice');
const Account = require('../models/Account');

/**
 * Purchase Scheme Tracking Service
 * Handles scheme quantity tracking for purchase invoices
 */
class PurchaseSchemeTrackingService {
  /**
   * Record scheme quantities for a purchase invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Array} schemeItems - Items with scheme quantities
   * @returns {Promise<Object>} Recorded scheme data
   */
  async recordSchemeQuantities(invoiceId, schemeItems) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!schemeItems || !Array.isArray(schemeItems) || schemeItems.length === 0) {
      throw new Error('Scheme items are required');
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.type !== 'purchase') {
      throw new Error('Can only record schemes for purchase invoices');
    }

    // Validate and record scheme quantities
    const recordedSchemes = [];

    for (const schemeItem of schemeItems) {
      const { itemId, schemeQuantity = 0, claimAccountId } = schemeItem;

      // Validate item exists in invoice
      const invoiceItem = invoice.items.find(
        item => item.itemId.toString() === itemId.toString()
      );

      if (!invoiceItem) {
        throw new Error(`Item ${itemId} not found in invoice`);
      }

      // Validate scheme quantity doesn't exceed regular quantity
      if (schemeQuantity > invoiceItem.quantity) {
        throw new Error(
          `Scheme quantity (${schemeQuantity}) cannot exceed regular quantity (${invoiceItem.quantity}) for item ${itemId}`
        );
      }

      // Validate claim account if provided
      if (claimAccountId) {
        const account = await Account.findById(claimAccountId);
        if (!account) {
          throw new Error(`Claim account not found: ${claimAccountId}`);
        }
        if (!account.isActive) {
          throw new Error(`Claim account ${account.name} is not active`);
        }
      }

      // Update invoice item with scheme quantity
      invoiceItem.schemeQuantity = schemeQuantity;

      recordedSchemes.push({
        itemId,
        schemeQuantity,
        claimAccountId: claimAccountId || null,
        recordedAt: new Date()
      });
    }

    // Save invoice with updated scheme quantities
    await invoice.save();

    return {
      invoiceId,
      schemes: recordedSchemes,
      totalSchemeQuantity: recordedSchemes.reduce((sum, s) => sum + s.schemeQuantity, 0)
    };
  }

  /**
   * Get scheme summary for a purchase invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Scheme summary
   */
  async getInvoiceSchemes(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    const invoice = await Invoice.findById(invoiceId)
      .populate('items.itemId', 'name code')
      .populate('claimAccountId', 'name accountNumber');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const schemes = invoice.items
      .filter(item => item.schemeQuantity && item.schemeQuantity > 0)
      .map(item => ({
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        regularQuantity: item.quantity,
        schemeQuantity: item.schemeQuantity,
        schemePercentage: ((item.schemeQuantity / item.quantity) * 100).toFixed(2)
      }));

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      supplierId: invoice.supplierId,
      schemes,
      totalRegularQuantity: invoice.items.reduce((sum, item) => sum + item.quantity, 0),
      totalSchemeQuantity: schemes.reduce((sum, s) => sum + s.schemeQuantity, 0),
      totalItems: invoice.items.length,
      itemsWithScheme: schemes.length
    };
  }

  /**
   * Get supplier scheme summary
   * @param {string} supplierId - Supplier ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Supplier scheme summary
   */
  async getSupplierSchemesSummary(supplierId, dateRange = {}) {
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const query = {
      supplierId,
      type: 'purchase',
      status: { $ne: 'cancelled' }
    };

    // Add date range filter if provided
    if (dateRange.startDate || dateRange.endDate) {
      query.invoiceDate = {};
      if (dateRange.startDate) {
        query.invoiceDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query.invoiceDate.$lte = new Date(dateRange.endDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'name code')
      .sort({ invoiceDate: -1 });

    let totalSchemeQuantity = 0;
    let totalRegularQuantity = 0;
    const itemSchemes = {};

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const schemeQty = item.schemeQuantity || 0;
        const regularQty = item.quantity || 0;

        if (schemeQty > 0) {
          const itemId = item.itemId._id.toString();
          
          if (!itemSchemes[itemId]) {
            itemSchemes[itemId] = {
              itemId: item.itemId._id,
              itemName: item.itemId.name,
              itemCode: item.itemId.code,
              totalSchemeQuantity: 0,
              totalRegularQuantity: 0,
              invoiceCount: 0
            };
          }

          itemSchemes[itemId].totalSchemeQuantity += schemeQty;
          itemSchemes[itemId].invoiceCount += 1;
          totalSchemeQuantity += schemeQty;
        }

        totalRegularQuantity += regularQty;
      });
    });

    return {
      supplierId,
      dateRange,
      totalInvoices: invoices.length,
      totalRegularQuantity,
      totalSchemeQuantity,
      schemePercentage: totalRegularQuantity > 0 
        ? ((totalSchemeQuantity / totalRegularQuantity) * 100).toFixed(2)
        : 0,
      itemBreakdown: Object.values(itemSchemes).sort((a, b) => b.totalSchemeQuantity - a.totalSchemeQuantity)
    };
  }

  /**
   * Validate scheme quantities don't exceed regular quantities
   * @param {Array} items - Invoice items with scheme quantities
   * @returns {Object} Validation result
   */
  validateSchemeQuantities(items) {
    const errors = [];

    items.forEach(item => {
      const regularQty = item.quantity || 0;
      const schemeQty = item.schemeQuantity || 0;

      // Scheme quantity should not exceed regular quantity
      if (schemeQty > regularQty) {
        errors.push(
          `Item ${item.itemId}: Scheme quantity (${schemeQty}) ` +
          `exceeds regular quantity (${regularQty})`
        );
      }

      // Scheme quantity must be non-negative
      if (schemeQty < 0) {
        errors.push(`Item ${item.itemId}: Scheme quantity cannot be negative`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Separate scheme items from regular items
   * @param {Array} items - Invoice items
   * @returns {Object} Separated items
   */
  separateSchemeItems(items) {
    const regularItems = [];
    const schemeItems = [];

    items.forEach(item => {
      const hasScheme = item.schemeQuantity && item.schemeQuantity > 0;

      if (hasScheme) {
        schemeItems.push({
          ...item,
          schemeQuantity: item.schemeQuantity
        });
      }

      // Regular quantity (excluding schemes)
      const regularQuantity = item.quantity - (item.schemeQuantity || 0);

      if (regularQuantity > 0) {
        regularItems.push({
          ...item,
          quantity: regularQuantity
        });
      }
    });

    return {
      regularItems,
      schemeItems,
      totalRegularQuantity: regularItems.reduce((sum, item) => sum + item.quantity, 0),
      totalSchemeQuantity: schemeItems.reduce((sum, item) => sum + (item.schemeQuantity || 0), 0)
    };
  }

  /**
   * Get scheme analysis for date range
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Scheme analysis
   */
  async getSchemeAnalysis(params) {
    const { startDate, endDate, supplierId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      type: 'purchase',
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    if (supplierId) {
      query.supplierId = supplierId;
    }

    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'code name')
      .populate('supplierId', 'code name')
      .sort({ invoiceDate: 1 });

    let totalSchemeQuantity = 0;
    let totalRegularQuantity = 0;
    const itemSchemes = {};
    const supplierSchemes = {};

    invoices.forEach(invoice => {
      const supplierId = invoice.supplierId?._id?.toString();

      invoice.items.forEach(item => {
        const schemeQty = item.schemeQuantity || 0;
        const regularQty = item.quantity || 0;

        if (schemeQty > 0) {
          const itemId = item.itemId._id.toString();
          
          if (!itemSchemes[itemId]) {
            itemSchemes[itemId] = {
              itemId: item.itemId._id,
              itemCode: item.itemId.code,
              itemName: item.itemId.name,
              totalSchemeQuantity: 0,
              invoiceCount: 0
            };
          }

          itemSchemes[itemId].totalSchemeQuantity += schemeQty;
          itemSchemes[itemId].invoiceCount += 1;
          totalSchemeQuantity += schemeQty;

          // Supplier-wise tracking
          if (supplierId) {
            if (!supplierSchemes[supplierId]) {
              supplierSchemes[supplierId] = {
                supplierId,
                supplierCode: invoice.supplierId.code,
                supplierName: invoice.supplierId.name,
                totalSchemeQuantity: 0,
                invoiceCount: 0
              };
            }
            supplierSchemes[supplierId].totalSchemeQuantity += schemeQty;
            supplierSchemes[supplierId].invoiceCount += 1;
          }
        }

        totalRegularQuantity += regularQty;
      });
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalInvoices: invoices.length,
        totalRegularQuantity,
        totalSchemeQuantity,
        schemePercentage: totalRegularQuantity > 0 
          ? ((totalSchemeQuantity / totalRegularQuantity) * 100).toFixed(2)
          : 0
      },
      itemBreakdown: Object.values(itemSchemes).sort((a, b) => b.totalSchemeQuantity - a.totalSchemeQuantity),
      supplierBreakdown: Object.values(supplierSchemes).sort((a, b) => b.totalSchemeQuantity - a.totalSchemeQuantity)
    };
  }
}

module.exports = new PurchaseSchemeTrackingService();
