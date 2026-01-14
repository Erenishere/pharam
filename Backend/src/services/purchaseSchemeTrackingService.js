const Invoice = require('../models/Invoice');

/**
 * Purchase Scheme Tracking Service
 * Handles scheme quantity tracking for purchase invoices
 */
class PurchaseSchemeTrackingService {
  /**
   * Record scheme quantities for purchase invoice items
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
      throw new Error('Can only track schemes for purchase invoices');
    }

    // Validate and record scheme quantities
    const recordedSchemes = [];

    for (const schemeItem of schemeItems) {
      const { itemId, schemeQuantity = 0 } = schemeItem;

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

      // Update invoice item with scheme quantity
      invoiceItem.schemeQuantity = schemeQuantity;

      recordedSchemes.push({
        itemId,
        schemeQuantity,
        regularQuantity: invoiceItem.quantity - schemeQuantity,
        recordedAt: new Date()
      });
    }

    // Save invoice with updated scheme quantities
    await invoice.save();

    return {
      invoiceId,
      schemes: recordedSchemes,
      totalSchemeQuantity: recordedSchemes.reduce((sum, s) => sum + s.schemeQuantity, 0),
      totalRegularQuantity: recordedSchemes.reduce((sum, s) => sum + s.regularQuantity, 0)
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
      .populate('supplierId', 'name code');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.type !== 'purchase') {
      throw new Error('Can only get schemes for purchase invoices');
    }

    const schemes = invoice.items
      .filter(item => item.schemeQuantity && item.schemeQuantity > 0)
      .map(item => ({
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        schemeQuantity: item.schemeQuantity,
        regularQuantity: item.quantity - item.schemeQuantity,
        totalQuantity: item.quantity,
        unitPrice: item.unitPrice,
        schemeValue: item.schemeQuantity * item.unitPrice,
        regularValue: (item.quantity - item.schemeQuantity) * item.unitPrice
      }));

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      supplier: {
        id: invoice.supplierId._id,
        name: invoice.supplierId.name,
        code: invoice.supplierId.code
      },
      schemes,
      totalSchemeQuantity: schemes.reduce((sum, s) => sum + s.schemeQuantity, 0),
      totalRegularQuantity: schemes.reduce((sum, s) => sum + s.regularQuantity, 0),
      totalSchemeValue: schemes.reduce((sum, s) => sum + s.schemeValue, 0),
      totalRegularValue: schemes.reduce((sum, s) => sum + s.regularValue, 0)
    };
  }

  /**
   * Get supplier scheme summary
   * @param {string} supplierId - Supplier ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Supplier scheme summary
   */
  async getSupplierSchemeSummary(supplierId, dateRange = {}) {
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
    let totalSchemeValue = 0;
    let totalRegularValue = 0;
    const itemSchemes = {};
    const invoiceSchemes = [];

    invoices.forEach(invoice => {
      let invoiceSchemeQty = 0;
      let invoiceSchemeValue = 0;

      invoice.items.forEach(item => {
        const schemeQty = item.schemeQuantity || 0;
        const regularQty = item.quantity - schemeQty;

        if (schemeQty > 0) {
          const itemId = item.itemId._id.toString();
          
          if (!itemSchemes[itemId]) {
            itemSchemes[itemId] = {
              itemId: item.itemId._id,
              itemName: item.itemId.name,
              itemCode: item.itemId.code,
              totalSchemeQuantity: 0,
              totalRegularQuantity: 0,
              totalSchemeValue: 0,
              totalRegularValue: 0,
              invoiceCount: 0
            };
          }

          itemSchemes[itemId].totalSchemeQuantity += schemeQty;
          itemSchemes[itemId].totalRegularQuantity += regularQty;
          itemSchemes[itemId].totalSchemeValue += schemeQty * item.unitPrice;
          itemSchemes[itemId].totalRegularValue += regularQty * item.unitPrice;
          itemSchemes[itemId].invoiceCount += 1;

          totalSchemeQuantity += schemeQty;
          totalRegularQuantity += regularQty;
          totalSchemeValue += schemeQty * item.unitPrice;
          totalRegularValue += regularQty * item.unitPrice;

          invoiceSchemeQty += schemeQty;
          invoiceSchemeValue += schemeQty * item.unitPrice;
        }
      });

      if (invoiceSchemeQty > 0) {
        invoiceSchemes.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          schemeQuantity: invoiceSchemeQty,
          schemeValue: invoiceSchemeValue
        });
      }
    });

    return {
      supplierId,
      dateRange,
      totalInvoices: invoices.length,
      invoicesWithSchemes: invoiceSchemes.length,
      totalSchemeQuantity,
      totalRegularQuantity,
      totalSchemeValue: Math.round(totalSchemeValue * 100) / 100,
      totalRegularValue: Math.round(totalRegularValue * 100) / 100,
      itemBreakdown: Object.values(itemSchemes).sort((a, b) => b.totalSchemeValue - a.totalSchemeValue),
      invoiceSchemes
    };
  }

  /**
   * Validate scheme quantities
   * @param {Array} items - Invoice items with scheme quantities
   * @returns {Object} Validation result
   */
  validateSchemeQuantities(items) {
    const errors = [];

    items.forEach(item => {
      const schemeQty = item.schemeQuantity || 0;
      const regularQty = item.quantity || 0;

      // Scheme quantity must not exceed regular quantity
      if (schemeQty > regularQty) {
        errors.push(
          `Item ${item.itemId}: Scheme quantity (${schemeQty}) exceeds regular quantity (${regularQty})`
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
      const schemeQty = item.schemeQuantity || 0;

      if (schemeQty > 0) {
        schemeItems.push({
          ...item,
          quantity: schemeQty
        });
      }

      const regularQty = item.quantity - schemeQty;
      if (regularQty > 0) {
        regularItems.push({
          ...item,
          quantity: regularQty
        });
      }
    });

    return {
      regularItems,
      schemeItems,
      totalRegularQuantity: regularItems.reduce((sum, item) => sum + item.quantity, 0),
      totalSchemeQuantity: schemeItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  /**
   * Get scheme statistics for a supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Scheme statistics
   */
  async getSchemeStatistics(supplierId, dateRange = {}) {
    const summary = await this.getSupplierSchemeSummary(supplierId, dateRange);

    const totalQuantity = summary.totalSchemeQuantity + summary.totalRegularQuantity;
    const schemePercentage = totalQuantity > 0 
      ? Math.round((summary.totalSchemeQuantity / totalQuantity) * 100 * 100) / 100
      : 0;

    const totalValue = summary.totalSchemeValue + summary.totalRegularValue;
    const schemeValuePercentage = totalValue > 0
      ? Math.round((summary.totalSchemeValue / totalValue) * 100 * 100) / 100
      : 0;

    return {
      ...summary,
      statistics: {
        schemePercentageByQuantity: schemePercentage,
        schemePercentageByValue: schemeValuePercentage,
        averageSchemeQuantityPerInvoice: summary.invoicesWithSchemes > 0
          ? Math.round((summary.totalSchemeQuantity / summary.invoicesWithSchemes) * 100) / 100
          : 0,
        averageSchemeValuePerInvoice: summary.invoicesWithSchemes > 0
          ? Math.round((summary.totalSchemeValue / summary.invoicesWithSchemes) * 100) / 100
          : 0
      }
    };
  }
}

module.exports = new PurchaseSchemeTrackingService();
