const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

/**
 * Report Service
 * Handles business logic for report generation
 */
class ReportService {
  /**
   * Generate sales report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Sales report
   */
  async generateSalesReport(params) {
    const { startDate, endDate, customerId, groupBy = 'date' } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      type: 'sales',
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' },
    };

    if (customerId) {
      query.customerId = customerId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('items.itemId', 'code name category')
      .sort({ invoiceDate: 1 });

    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0),
      totalDiscount: invoices.reduce((sum, inv) => sum + inv.totals.totalDiscount, 0),
      totalTax: invoices.reduce((sum, inv) => sum + inv.totals.totalTax, 0),
    };

    let groupedData = [];
    if (groupBy === 'customer') {
      groupedData = this._groupByCustomer(invoices);
    } else if (groupBy === 'item') {
      groupedData = this._groupByItem(invoices);
    } else {
      groupedData = this._groupByDate(invoices);
    }

    return {
      reportType: 'sales',
      period: { startDate, endDate },
      summary,
      data: groupedData,
      invoices,
    };
  }

  /**
   * Generate purchase report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Purchase report
   */
  async generatePurchaseReport(params) {
    const { startDate, endDate, supplierId, groupBy = 'date' } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      type: 'purchase',
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' },
    };

    if (supplierId) {
      query.supplierId = supplierId;
    }

    const invoices = await Invoice.find(query)
      .populate('supplierId', 'code name')
      .populate('items.itemId', 'code name category')
      .sort({ invoiceDate: 1 });

    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0),
      totalDiscount: invoices.reduce((sum, inv) => sum + inv.totals.totalDiscount, 0),
      totalTax: invoices.reduce((sum, inv) => sum + inv.totals.totalTax, 0),
    };

    let groupedData = [];
    if (groupBy === 'supplier') {
      groupedData = this._groupBySupplier(invoices);
    } else if (groupBy === 'item') {
      groupedData = this._groupByItem(invoices);
    } else {
      groupedData = this._groupByDate(invoices);
    }

    return {
      reportType: 'purchase',
      period: { startDate, endDate },
      summary,
      data: groupedData,
      invoices,
    };
  }

  /**
   * Generate inventory report
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Inventory report
   */
  async generateInventoryReport(params) {
    const { category, lowStockOnly = false, includeInactive = false } = params;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    const items = await Item.find(query).sort({ code: 1 });

    let filteredItems = items;
    if (lowStockOnly) {
      filteredItems = items.filter((item) => item.stock.currentStock <= item.stock.minStock);
    }

    const summary = {
      totalItems: filteredItems.length,
      totalValue: filteredItems.reduce(
        (sum, item) => sum + item.stock.currentStock * item.pricing.costPrice,
        0
      ),
      lowStockItems: items.filter((item) => item.stock.currentStock <= item.stock.minStock).length,
      outOfStockItems: items.filter((item) => item.stock.currentStock === 0).length,
    };

    const byCategory = this._groupItemsByCategory(filteredItems);

    return {
      reportType: 'inventory',
      generatedAt: new Date(),
      summary,
      byCategory,
      items: filteredItems,
    };
  }

  /**
   * Group invoices by customer
   * @private
   */
  _groupByCustomer(invoices) {
    const grouped = {};

    invoices.forEach((invoice) => {
      const customerId = invoice.customerId._id.toString();
      if (!grouped[customerId]) {
        grouped[customerId] = {
          customer: invoice.customerId,
          invoiceCount: 0,
          totalAmount: 0,
          totalDiscount: 0,
          totalTax: 0,
        };
      }

      grouped[customerId].invoiceCount++;
      grouped[customerId].totalAmount += invoice.totals.grandTotal;
      grouped[customerId].totalDiscount += invoice.totals.totalDiscount;
      grouped[customerId].totalTax += invoice.totals.totalTax;
    });

    return Object.values(grouped);
  }

  /**
   * Group invoices by supplier
   * @private
   */
  _groupBySupplier(invoices) {
    const grouped = {};

    invoices.forEach((invoice) => {
      const supplierId = invoice.supplierId._id.toString();
      if (!grouped[supplierId]) {
        grouped[supplierId] = {
          supplier: invoice.supplierId,
          invoiceCount: 0,
          totalAmount: 0,
          totalDiscount: 0,
          totalTax: 0,
        };
      }

      grouped[supplierId].invoiceCount++;
      grouped[supplierId].totalAmount += invoice.totals.grandTotal;
      grouped[supplierId].totalDiscount += invoice.totals.totalDiscount;
      grouped[supplierId].totalTax += invoice.totals.totalTax;
    });

    return Object.values(grouped);
  }

  /**
   * Group invoices by item
   * @private
   */
  _groupByItem(invoices) {
    const grouped = {};

    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const itemId = item.itemId._id.toString();
        if (!grouped[itemId]) {
          grouped[itemId] = {
            item: item.itemId,
            quantity: 0,
            totalAmount: 0,
            invoiceCount: 0,
          };
        }

        grouped[itemId].quantity += item.quantity;
        grouped[itemId].totalAmount += item.lineTotal;
        grouped[itemId].invoiceCount++;
      });
    });

    return Object.values(grouped);
  }

  /**
   * Group invoices by date
   * @private
   */
  _groupByDate(invoices) {
    const grouped = {};

    invoices.forEach((invoice) => {
      const dateKey = invoice.invoiceDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          invoiceCount: 0,
          totalAmount: 0,
          totalDiscount: 0,
          totalTax: 0,
        };
      }

      grouped[dateKey].invoiceCount++;
      grouped[dateKey].totalAmount += invoice.totals.grandTotal;
      grouped[dateKey].totalDiscount += invoice.totals.totalDiscount;
      grouped[dateKey].totalTax += invoice.totals.totalTax;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Group items by category
   * @private
   */
  _groupItemsByCategory(items) {
    const grouped = {};

    items.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = {
          category,
          itemCount: 0,
          totalStock: 0,
          totalValue: 0,
        };
      }

      grouped[category].itemCount++;
      grouped[category].totalStock += item.stock.currentStock;
      grouped[category].totalValue += item.stock.currentStock * item.pricing.costPrice;
    });

    return Object.values(grouped);
  }

  /**
   * Generate purchase GST breakdown report
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.supplierId - Optional supplier ID filter
   * @returns {Promise<Object>} GST breakdown report
   */
  async getPurchaseGSTBreakdown(params) {
    const { startDate, endDate, supplierId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      type: { $in: ['purchase', 'return_purchase'] },
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'confirmed',
    };

    if (supplierId) {
      query.supplierId = supplierId;
    }

    const invoices = await Invoice.find(query)
      .populate('supplierId', 'code name')
      .sort({ invoiceDate: 1 });

    // Initialize breakdown structure
    const breakdown = {
      gst18: {
        rate: 18,
        invoiceCount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
        invoices: []
      },
      gst4: {
        rate: 4,
        invoiceCount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
        invoices: []
      },
      total: {
        invoiceCount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        totalAmount: 0
      }
    };

    // Process each invoice
    invoices.forEach(invoice => {
      const invoiceData = {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        supplierCode: invoice.supplierId?.code,
        supplierName: invoice.supplierId?.name,
        type: invoice.type,
        gst18Amount: 0,
        gst4Amount: 0,
        gst18Taxable: 0,
        gst4Taxable: 0
      };

      // Process invoice items
      invoice.items.forEach(item => {
        const gstRate = item.gstRate || 18; // Default to 18% if not specified
        const lineTotal = Math.abs(item.quantity * item.unitPrice);
        const discount = item.discount || 0;
        const taxableAmount = lineTotal - discount;
        const gstAmount = (taxableAmount * gstRate) / 100;

        if (gstRate === 18) {
          invoiceData.gst18Taxable += taxableAmount;
          invoiceData.gst18Amount += gstAmount;
        } else if (gstRate === 4) {
          invoiceData.gst4Taxable += taxableAmount;
          invoiceData.gst4Amount += gstAmount;
        }
      });

      // Add to GST 18% breakdown if applicable
      if (invoiceData.gst18Amount > 0) {
        breakdown.gst18.invoiceCount++;
        breakdown.gst18.taxableAmount += invoiceData.gst18Taxable;
        breakdown.gst18.gstAmount += invoiceData.gst18Amount;
        breakdown.gst18.totalAmount += invoiceData.gst18Taxable + invoiceData.gst18Amount;
        breakdown.gst18.invoices.push({
          ...invoiceData,
          taxableAmount: invoiceData.gst18Taxable,
          gstAmount: invoiceData.gst18Amount
        });
      }

      // Add to GST 4% breakdown if applicable
      if (invoiceData.gst4Amount > 0) {
        breakdown.gst4.invoiceCount++;
        breakdown.gst4.taxableAmount += invoiceData.gst4Taxable;
        breakdown.gst4.gstAmount += invoiceData.gst4Amount;
        breakdown.gst4.totalAmount += invoiceData.gst4Taxable + invoiceData.gst4Amount;
        breakdown.gst4.invoices.push({
          ...invoiceData,
          taxableAmount: invoiceData.gst4Taxable,
          gstAmount: invoiceData.gst4Amount
        });
      }

      // Update totals
      breakdown.total.invoiceCount++;
      breakdown.total.taxableAmount += invoiceData.gst18Taxable + invoiceData.gst4Taxable;
      breakdown.total.gstAmount += invoiceData.gst18Amount + invoiceData.gst4Amount;
      breakdown.total.totalAmount += breakdown.total.taxableAmount + breakdown.total.gstAmount;
    });

    // Round all amounts to 2 decimal places
    ['gst18', 'gst4', 'total'].forEach(key => {
      if (breakdown[key]) {
        breakdown[key].taxableAmount = Math.round(breakdown[key].taxableAmount * 100) / 100;
        breakdown[key].gstAmount = Math.round(breakdown[key].gstAmount * 100) / 100;
        breakdown[key].totalAmount = Math.round(breakdown[key].totalAmount * 100) / 100;
      }
    });

    return {
      reportType: 'purchase_gst_breakdown',
      period: { startDate, endDate },
      breakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Get purchase summary with GST breakdown
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Purchase summary with GST breakdown
   */
  async getPurchaseSummaryWithGST(params) {
    const { startDate, endDate, supplierId } = params;

    // Get basic purchase report
    const purchaseReport = await this.generatePurchaseReport({
      startDate,
      endDate,
      supplierId,
      groupBy: 'supplier'
    });

    // Get GST breakdown
    const gstBreakdown = await this.getPurchaseGSTBreakdown({
      startDate,
      endDate,
      supplierId
    });

    return {
      ...purchaseReport,
      gstBreakdown: gstBreakdown.breakdown
    };
  }

  /**
   * Generate scheme analysis report
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.customerId - Optional customer ID filter
   * @param {string} params.supplierId - Optional supplier ID filter
   * @param {string} params.invoiceType - Invoice type ('sales' or 'purchase')
   * @returns {Promise<Object>} Scheme analysis report
   */
  async getSchemeAnalysis(params) {
    const { startDate, endDate, customerId, supplierId, invoiceType = 'sales' } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      type: invoiceType,
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    if (customerId) {
      query.customerId = customerId;
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'code name category')
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('claimAccountId', 'name accountNumber')
      .sort({ invoiceDate: 1 });

    // Initialize aggregation structures
    const schemeByType = {
      scheme1: {
        totalQuantity: 0,
        totalValue: 0,
        invoiceCount: 0,
        items: {}
      },
      scheme2: {
        totalQuantity: 0,
        totalValue: 0,
        invoiceCount: 0,
        items: {}
      }
    };

    const schemeByCompany = {};
    const schemeByItem = {};

    // Process invoices
    invoices.forEach(invoice => {
      let hasScheme1 = false;
      let hasScheme2 = false;

      invoice.items.forEach(item => {
        const scheme1Qty = item.scheme1Quantity || 0;
        const scheme2Qty = item.scheme2Quantity || 0;

        if (scheme1Qty > 0 || scheme2Qty > 0) {
          const itemId = item.itemId._id.toString();
          const itemCode = item.itemId.code;
          const itemName = item.itemId.name;
          const unitPrice = item.unitPrice || 0;

          // Scheme 1 aggregation
          if (scheme1Qty > 0) {
            hasScheme1 = true;
            schemeByType.scheme1.totalQuantity += scheme1Qty;
            schemeByType.scheme1.totalValue += scheme1Qty * unitPrice;

            if (!schemeByType.scheme1.items[itemId]) {
              schemeByType.scheme1.items[itemId] = {
                itemId,
                itemCode,
                itemName,
                quantity: 0,
                value: 0
              };
            }
            schemeByType.scheme1.items[itemId].quantity += scheme1Qty;
            schemeByType.scheme1.items[itemId].value += scheme1Qty * unitPrice;
          }

          // Scheme 2 aggregation
          if (scheme2Qty > 0) {
            hasScheme2 = true;
            schemeByType.scheme2.totalQuantity += scheme2Qty;
            schemeByType.scheme2.totalValue += scheme2Qty * unitPrice;

            if (!schemeByType.scheme2.items[itemId]) {
              schemeByType.scheme2.items[itemId] = {
                itemId,
                itemCode,
                itemName,
                quantity: 0,
                value: 0
              };
            }
            schemeByType.scheme2.items[itemId].quantity += scheme2Qty;
            schemeByType.scheme2.items[itemId].value += scheme2Qty * unitPrice;
          }

          // Item-wise aggregation
          if (!schemeByItem[itemId]) {
            schemeByItem[itemId] = {
              itemId,
              itemCode,
              itemName,
              scheme1Quantity: 0,
              scheme2Quantity: 0,
              totalSchemeQuantity: 0,
              scheme1Value: 0,
              scheme2Value: 0,
              totalValue: 0,
              invoiceCount: 0
            };
          }

          schemeByItem[itemId].scheme1Quantity += scheme1Qty;
          schemeByItem[itemId].scheme2Quantity += scheme2Qty;
          schemeByItem[itemId].totalSchemeQuantity += scheme1Qty + scheme2Qty;
          schemeByItem[itemId].scheme1Value += scheme1Qty * unitPrice;
          schemeByItem[itemId].scheme2Value += scheme2Qty * unitPrice;
          schemeByItem[itemId].totalValue += (scheme1Qty + scheme2Qty) * unitPrice;
          schemeByItem[itemId].invoiceCount++;
        }
      });

      if (hasScheme1) schemeByType.scheme1.invoiceCount++;
      if (hasScheme2) schemeByType.scheme2.invoiceCount++;
    });

    // Convert items objects to arrays
    schemeByType.scheme1.items = Object.values(schemeByType.scheme1.items);
    schemeByType.scheme2.items = Object.values(schemeByType.scheme2.items);

    return {
      reportType: 'scheme_analysis',
      invoiceType,
      period: { startDate, endDate },
      summary: {
        totalInvoices: invoices.length,
        totalScheme1Quantity: schemeByType.scheme1.totalQuantity,
        totalScheme2Quantity: schemeByType.scheme2.totalQuantity,
        totalSchemeQuantity: schemeByType.scheme1.totalQuantity + schemeByType.scheme2.totalQuantity,
        totalScheme1Value: Math.round(schemeByType.scheme1.totalValue * 100) / 100,
        totalScheme2Value: Math.round(schemeByType.scheme2.totalValue * 100) / 100,
        totalSchemeValue: Math.round((schemeByType.scheme1.totalValue + schemeByType.scheme2.totalValue) * 100) / 100
      },
      schemeByType,
      schemeByItem: Object.values(schemeByItem).sort((a, b) => b.totalValue - a.totalValue),
      generatedAt: new Date()
    };
  }

  /**
   * Get supplier-wise report with GST breakdown
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Supplier-wise report with GST rates
   */
  async getSupplierWiseGSTReport(params) {
    const { startDate, endDate } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const invoices = await Invoice.find({
      type: { $in: ['purchase', 'return_purchase'] },
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'confirmed'
    })
      .populate('supplierId', 'code name')
      .sort({ supplierId: 1, invoiceDate: 1 });

    // Group by supplier
    const supplierMap = {};

    invoices.forEach(invoice => {
      const supplierId = invoice.supplierId?._id?.toString();
      if (!supplierId) return;

      if (!supplierMap[supplierId]) {
        supplierMap[supplierId] = {
          supplierId,
          supplierCode: invoice.supplierId.code,
          supplierName: invoice.supplierId.name,
          invoiceCount: 0,
          gst18: {
            taxableAmount: 0,
            gstAmount: 0,
            totalAmount: 0
          },
          gst4: {
            taxableAmount: 0,
            gstAmount: 0,
            totalAmount: 0
          },
          total: {
            taxableAmount: 0,
            gstAmount: 0,
            totalAmount: 0
          }
        };
      }

      const supplier = supplierMap[supplierId];
      supplier.invoiceCount++;

      // Process items
      invoice.items.forEach(item => {
        const gstRate = item.gstRate || 18;
        const lineTotal = Math.abs(item.quantity * item.unitPrice);
        const discount = item.discount || 0;
        const taxableAmount = lineTotal - discount;
        const gstAmount = (taxableAmount * gstRate) / 100;

        if (gstRate === 18) {
          supplier.gst18.taxableAmount += taxableAmount;
          supplier.gst18.gstAmount += gstAmount;
          supplier.gst18.totalAmount += taxableAmount + gstAmount;
        } else if (gstRate === 4) {
          supplier.gst4.taxableAmount += taxableAmount;
          supplier.gst4.gstAmount += gstAmount;
          supplier.gst4.totalAmount += taxableAmount + gstAmount;
        }

        supplier.total.taxableAmount += taxableAmount;
        supplier.total.gstAmount += gstAmount;
        supplier.total.totalAmount += taxableAmount + gstAmount;
      });
    });

    // Convert to array and round amounts
    const suppliers = Object.values(supplierMap).map(supplier => {
      ['gst18', 'gst4', 'total'].forEach(key => {
        supplier[key].taxableAmount = Math.round(supplier[key].taxableAmount * 100) / 100;
        supplier[key].gstAmount = Math.round(supplier[key].gstAmount * 100) / 100;
        supplier[key].totalAmount = Math.round(supplier[key].totalAmount * 100) / 100;
      });
      return supplier;
    });

    // Sort by total amount descending
    suppliers.sort((a, b) => b.total.totalAmount - a.total.totalAmount);

    return {
      reportType: 'supplier_wise_gst',
      period: { startDate, endDate },
      suppliers,
      summary: {
        totalSuppliers: suppliers.length,
        totalInvoices: suppliers.reduce((sum, s) => sum + s.invoiceCount, 0),
        totalGST18: suppliers.reduce((sum, s) => sum + s.gst18.gstAmount, 0),
        totalGST4: suppliers.reduce((sum, s) => sum + s.gst4.gstAmount, 0),
        grandTotal: suppliers.reduce((sum, s) => sum + s.total.totalAmount, 0)
      },
      generatedAt: new Date()
    };
  }

  /**
   * Get invoices using a specific scheme
   * @param {Object} params - Report parameters
   * @param {string} params.schemeId - Scheme ID
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.invoiceType - Invoice type ('sales' or 'purchase')
   * @returns {Promise<Object>} Scheme-wise invoice report
   */
  async getSchemeInvoices(params) {
    const { schemeId, startDate, endDate, invoiceType = 'sales' } = params;

    if (!schemeId) {
      throw new Error('Scheme ID is required');
    }

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get scheme definition
    const Scheme = require('../models/Scheme');
    const scheme = await Scheme.findById(schemeId)
      .populate('company', 'name code')
      .populate('claimAccountId', 'name accountNumber')
      .populate('applicableItems', 'code name category')
      .populate('applicableCustomers', 'code name');

    if (!scheme) {
      throw new Error('Scheme not found');
    }

    // Build query for invoices
    const query = {
      type: invoiceType,
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    // If scheme has specific applicable customers, filter by them
    if (scheme.applicableCustomers && scheme.applicableCustomers.length > 0) {
      const customerIds = scheme.applicableCustomers.map(c => c._id);
      if (invoiceType === 'sales') {
        query.customerId = { $in: customerIds };
      }
    }

    // Get all invoices in the date range
    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'code name category')
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('claimAccountId', 'name accountNumber')
      .sort({ invoiceDate: -1 });

    // Filter invoices that have items with scheme quantities
    const schemeInvoices = [];
    let totalScheme1Quantity = 0;
    let totalScheme2Quantity = 0;
    let totalScheme1Value = 0;
    let totalScheme2Value = 0;

    invoices.forEach(invoice => {
      const invoiceSchemeItems = [];
      let invoiceScheme1Qty = 0;
      let invoiceScheme2Qty = 0;
      let invoiceScheme1Value = 0;
      let invoiceScheme2Value = 0;

      invoice.items.forEach(item => {
        const scheme1Qty = item.scheme1Quantity || 0;
        const scheme2Qty = item.scheme2Quantity || 0;

        // Check if item is applicable for this scheme
        let isApplicable = true;
        if (scheme.applicableItems && scheme.applicableItems.length > 0) {
          isApplicable = scheme.applicableItems.some(
            applicableItem => applicableItem._id.toString() === item.itemId._id.toString()
          );
        }

        // If item has scheme quantities and is applicable for this scheme
        if ((scheme1Qty > 0 || scheme2Qty > 0) && isApplicable) {
          const unitPrice = item.unitPrice || 0;
          const scheme1Value = scheme1Qty * unitPrice;
          const scheme2Value = scheme2Qty * unitPrice;

          invoiceSchemeItems.push({
            itemId: item.itemId._id,
            itemCode: item.itemId.code,
            itemName: item.itemId.name,
            itemCategory: item.itemId.category,
            unitPrice,
            scheme1Quantity: scheme1Qty,
            scheme2Quantity: scheme2Qty,
            totalSchemeQuantity: scheme1Qty + scheme2Qty,
            scheme1Value: Math.round(scheme1Value * 100) / 100,
            scheme2Value: Math.round(scheme2Value * 100) / 100,
            totalSchemeValue: Math.round((scheme1Value + scheme2Value) * 100) / 100
          });

          invoiceScheme1Qty += scheme1Qty;
          invoiceScheme2Qty += scheme2Qty;
          invoiceScheme1Value += scheme1Value;
          invoiceScheme2Value += scheme2Value;
        }
      });

      // Only include invoices that have scheme items
      if (invoiceSchemeItems.length > 0) {
        schemeInvoices.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          invoiceType: invoice.type,
          customer: invoice.customerId ? {
            id: invoice.customerId._id,
            code: invoice.customerId.code,
            name: invoice.customerId.name
          } : null,
          supplier: invoice.supplierId ? {
            id: invoice.supplierId._id,
            code: invoice.supplierId.code,
            name: invoice.supplierId.name
          } : null,
          claimAccount: invoice.claimAccountId ? {
            id: invoice.claimAccountId._id,
            name: invoice.claimAccountId.name,
            accountNumber: invoice.claimAccountId.accountNumber
          } : null,
          totalAmount: invoice.totals.grandTotal,
          schemeItems: invoiceSchemeItems,
          schemeSummary: {
            scheme1Quantity: invoiceScheme1Qty,
            scheme2Quantity: invoiceScheme2Qty,
            totalSchemeQuantity: invoiceScheme1Qty + invoiceScheme2Qty,
            scheme1Value: Math.round(invoiceScheme1Value * 100) / 100,
            scheme2Value: Math.round(invoiceScheme2Value * 100) / 100,
            totalSchemeValue: Math.round((invoiceScheme1Value + invoiceScheme2Value) * 100) / 100
          }
        });

        totalScheme1Quantity += invoiceScheme1Qty;
        totalScheme2Quantity += invoiceScheme2Qty;
        totalScheme1Value += invoiceScheme1Value;
        totalScheme2Value += invoiceScheme2Value;
      }
    });

    return {
      reportType: 'scheme_invoices',
      scheme: {
        id: scheme._id,
        name: scheme.name,
        type: scheme.type,
        schemeFormat: scheme.schemeFormat,
        discountPercent: scheme.discountPercent,
        company: scheme.company ? {
          id: scheme.company._id,
          name: scheme.company.name,
          code: scheme.company.code
        } : null,
        claimAccount: scheme.claimAccountId ? {
          id: scheme.claimAccountId._id,
          name: scheme.claimAccountId.name,
          accountNumber: scheme.claimAccountId.accountNumber
        } : null,
        isActive: scheme.isActive,
        startDate: scheme.startDate,
        endDate: scheme.endDate
      },
      period: { startDate, endDate },
      invoiceType,
      summary: {
        totalInvoices: schemeInvoices.length,
        totalScheme1Quantity,
        totalScheme2Quantity,
        totalSchemeQuantity: totalScheme1Quantity + totalScheme2Quantity,
        totalScheme1Value: Math.round(totalScheme1Value * 100) / 100,
        totalScheme2Value: Math.round(totalScheme2Value * 100) / 100,
        totalSchemeValue: Math.round((totalScheme1Value + totalScheme2Value) * 100) / 100
      },
      invoices: schemeInvoices,
      generatedAt: new Date()
    };
  }

  /**
   * Get discount breakdown report
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.invoiceType - Invoice type filter ('sales', 'purchase', 'all')
   * @param {string} params.discountType - Discount type filter ('discount1', 'discount2', 'all')
   * @param {string} params.claimAccountId - Optional claim account ID filter
   * @returns {Promise<Object>} Discount breakdown report
   */
  async getDiscountBreakdown(params) {
    const { startDate, endDate, invoiceType = 'all', discountType = 'all', claimAccountId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Build query
    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    // Filter by invoice type
    if (invoiceType !== 'all') {
      query.type = invoiceType;
    } else {
      query.type = { $in: ['sales', 'purchase', 'return_sales', 'return_purchase'] };
    }

    // Filter by claim account if provided
    if (claimAccountId) {
      query.claimAccountId = claimAccountId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('claimAccountId', 'name accountNumber code')
      .populate('items.itemId', 'code name category')
      .sort({ invoiceDate: 1 });

    // Initialize breakdown structure
    const breakdown = {
      discount1: {
        invoiceCount: 0,
        totalAmount: 0,
        byInvoiceType: {
          sales: { invoiceCount: 0, amount: 0 },
          purchase: { invoiceCount: 0, amount: 0 },
          return_sales: { invoiceCount: 0, amount: 0 },
          return_purchase: { invoiceCount: 0, amount: 0 }
        },
        byClaimAccount: {},
        invoices: []
      },
      discount2: {
        invoiceCount: 0,
        totalAmount: 0,
        byInvoiceType: {
          sales: { invoiceCount: 0, amount: 0 },
          purchase: { invoiceCount: 0, amount: 0 },
          return_sales: { invoiceCount: 0, amount: 0 },
          return_purchase: { invoiceCount: 0, amount: 0 }
        },
        byClaimAccount: {},
        invoices: []
      },
      total: {
        invoiceCount: 0,
        totalDiscount1: 0,
        totalDiscount2: 0,
        grandTotalDiscount: 0
      }
    };

    // Process each invoice
    invoices.forEach(invoice => {
      let invoiceDiscount1 = 0;
      let invoiceDiscount2 = 0;
      let hasDiscount1 = false;
      let hasDiscount2 = false;

      // Calculate discounts from items
      invoice.items.forEach(item => {
        const discount1Amount = item.discount1Amount || 0;
        const discount2Amount = item.discount2Amount || 0;

        invoiceDiscount1 += discount1Amount;
        invoiceDiscount2 += discount2Amount;

        if (discount1Amount > 0) hasDiscount1 = true;
        if (discount2Amount > 0) hasDiscount2 = true;
      });

      const invoiceData = {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceType: invoice.type,
        customer: invoice.customerId ? {
          id: invoice.customerId._id,
          code: invoice.customerId.code,
          name: invoice.customerId.name
        } : null,
        supplier: invoice.supplierId ? {
          id: invoice.supplierId._id,
          code: invoice.supplierId.code,
          name: invoice.supplierId.name
        } : null,
        claimAccount: invoice.claimAccountId ? {
          id: invoice.claimAccountId._id,
          name: invoice.claimAccountId.name,
          accountNumber: invoice.claimAccountId.accountNumber
        } : null,
        discount1Amount: Math.round(invoiceDiscount1 * 100) / 100,
        discount2Amount: Math.round(invoiceDiscount2 * 100) / 100,
        totalDiscount: Math.round((invoiceDiscount1 + invoiceDiscount2) * 100) / 100,
        grandTotal: invoice.totals.grandTotal
      };

      // Process Discount 1
      if (hasDiscount1 && (discountType === 'all' || discountType === 'discount1')) {
        breakdown.discount1.invoiceCount++;
        breakdown.discount1.totalAmount += invoiceDiscount1;
        breakdown.discount1.byInvoiceType[invoice.type].invoiceCount++;
        breakdown.discount1.byInvoiceType[invoice.type].amount += invoiceDiscount1;
        breakdown.discount1.invoices.push({
          ...invoiceData,
          discountAmount: invoiceData.discount1Amount
        });
      }

      // Process Discount 2 (claim-based)
      if (hasDiscount2 && (discountType === 'all' || discountType === 'discount2')) {
        breakdown.discount2.invoiceCount++;
        breakdown.discount2.totalAmount += invoiceDiscount2;
        breakdown.discount2.byInvoiceType[invoice.type].invoiceCount++;
        breakdown.discount2.byInvoiceType[invoice.type].amount += invoiceDiscount2;

        // Group by claim account
        if (invoice.claimAccountId) {
          const claimAccountId = invoice.claimAccountId._id.toString();
          if (!breakdown.discount2.byClaimAccount[claimAccountId]) {
            breakdown.discount2.byClaimAccount[claimAccountId] = {
              claimAccountId,
              claimAccountName: invoice.claimAccountId.name,
              accountNumber: invoice.claimAccountId.accountNumber,
              invoiceCount: 0,
              totalAmount: 0,
              invoices: []
            };
          }
          breakdown.discount2.byClaimAccount[claimAccountId].invoiceCount++;
          breakdown.discount2.byClaimAccount[claimAccountId].totalAmount += invoiceDiscount2;
          breakdown.discount2.byClaimAccount[claimAccountId].invoices.push(invoiceData);
        }

        breakdown.discount2.invoices.push({
          ...invoiceData,
          discountAmount: invoiceData.discount2Amount
        });
      }

      // Update totals
      if (hasDiscount1 || hasDiscount2) {
        breakdown.total.invoiceCount++;
        breakdown.total.totalDiscount1 += invoiceDiscount1;
        breakdown.total.totalDiscount2 += invoiceDiscount2;
        breakdown.total.grandTotalDiscount += invoiceDiscount1 + invoiceDiscount2;
      }
    });

    // Convert byClaimAccount object to array
    breakdown.discount2.byClaimAccount = Object.values(breakdown.discount2.byClaimAccount)
      .map(account => ({
        ...account,
        totalAmount: Math.round(account.totalAmount * 100) / 100
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Round all amounts
    breakdown.discount1.totalAmount = Math.round(breakdown.discount1.totalAmount * 100) / 100;
    breakdown.discount2.totalAmount = Math.round(breakdown.discount2.totalAmount * 100) / 100;
    breakdown.total.totalDiscount1 = Math.round(breakdown.total.totalDiscount1 * 100) / 100;
    breakdown.total.totalDiscount2 = Math.round(breakdown.total.totalDiscount2 * 100) / 100;
    breakdown.total.grandTotalDiscount = Math.round(breakdown.total.grandTotalDiscount * 100) / 100;

    // Round amounts in byInvoiceType
    ['discount1', 'discount2'].forEach(discType => {
      Object.keys(breakdown[discType].byInvoiceType).forEach(invType => {
        breakdown[discType].byInvoiceType[invType].amount =
          Math.round(breakdown[discType].byInvoiceType[invType].amount * 100) / 100;
      });
    });

    return {
      reportType: 'discount_breakdown',
      period: { startDate, endDate },
      filters: {
        invoiceType,
        discountType,
        claimAccountId
      },
      breakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Generate discount breakdown report
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date for the report
   * @param {Date} params.endDate - End date for the report
   * @param {string} params.invoiceType - Type of invoices ('sales', 'purchase', or 'all')
   * @param {string} params.discountType - Type of discount ('discount1', 'discount2', or 'all')
   * @param {string} params.claimAccountId - Filter by specific claim account (optional)
   * @returns {Promise<Object>} Discount breakdown report
   */
  async getDiscountBreakdown(params) {
    const { startDate, endDate, invoiceType = 'all', discountType = 'all', claimAccountId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Build query
    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    // Filter by invoice type
    if (invoiceType !== 'all') {
      query.type = invoiceType;
    } else {
      query.type = { $in: ['sales', 'purchase', 'return_sales', 'return_purchase'] };
    }

    // Filter by claim account if provided
    if (claimAccountId) {
      query.claimAccountId = claimAccountId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('claimAccountId', 'name accountNumber code')
      .populate('items.itemId', 'code name category')
      .sort({ invoiceDate: 1 });

    // Initialize breakdown structure
    const breakdown = {
      discount1: {
        invoiceCount: 0,
        totalAmount: 0,
        byInvoiceType: {
          sales: { invoiceCount: 0, amount: 0 },
          purchase: { invoiceCount: 0, amount: 0 },
          return_sales: { invoiceCount: 0, amount: 0 },
          return_purchase: { invoiceCount: 0, amount: 0 }
        },
        byClaimAccount: {},
        invoices: []
      },
      discount2: {
        invoiceCount: 0,
        totalAmount: 0,
        byInvoiceType: {
          sales: { invoiceCount: 0, amount: 0 },
          purchase: { invoiceCount: 0, amount: 0 },
          return_sales: { invoiceCount: 0, amount: 0 },
          return_purchase: { invoiceCount: 0, amount: 0 }
        },
        byClaimAccount: {},
        invoices: []
      },
      total: {
        invoiceCount: 0,
        totalDiscount1: 0,
        totalDiscount2: 0,
        grandTotalDiscount: 0
      }
    };

    // Process each invoice
    invoices.forEach(invoice => {
      let invoiceDiscount1 = 0;
      let invoiceDiscount2 = 0;
      let hasDiscount1 = false;
      let hasDiscount2 = false;

      // Calculate discounts from items
      invoice.items.forEach(item => {
        const discount1Amount = item.discount1Amount || 0;
        const discount2Amount = item.discount2Amount || 0;

        invoiceDiscount1 += discount1Amount;
        invoiceDiscount2 += discount2Amount;

        if (discount1Amount > 0) hasDiscount1 = true;
        if (discount2Amount > 0) hasDiscount2 = true;
      });

      const invoiceData = {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceType: invoice.type,
        customer: invoice.customerId ? {
          id: invoice.customerId._id,
          code: invoice.customerId.code,
          name: invoice.customerId.name
        } : null,
        supplier: invoice.supplierId ? {
          id: invoice.supplierId._id,
          code: invoice.supplierId.code,
          name: invoice.supplierId.name
        } : null,
        claimAccount: invoice.claimAccountId ? {
          id: invoice.claimAccountId._id,
          name: invoice.claimAccountId.name,
          accountNumber: invoice.claimAccountId.accountNumber || invoice.claimAccountId.code
        } : null,
        discount1Amount: Math.round(invoiceDiscount1 * 100) / 100,
        discount2Amount: Math.round(invoiceDiscount2 * 100) / 100,
        totalDiscount: Math.round((invoiceDiscount1 + invoiceDiscount2) * 100) / 100,
        grandTotal: invoice.totals.grandTotal
      };

      // Process Discount 1
      if (hasDiscount1 && (discountType === 'all' || discountType === 'discount1')) {
        breakdown.discount1.invoiceCount++;
        breakdown.discount1.totalAmount += invoiceDiscount1;
        breakdown.discount1.byInvoiceType[invoice.type].invoiceCount++;
        breakdown.discount1.byInvoiceType[invoice.type].amount += invoiceDiscount1;
        breakdown.discount1.invoices.push({
          ...invoiceData,
          discountAmount: invoiceData.discount1Amount
        });
      }

      // Process Discount 2 (claim-based)
      if (hasDiscount2 && (discountType === 'all' || discountType === 'discount2')) {
        breakdown.discount2.invoiceCount++;
        breakdown.discount2.totalAmount += invoiceDiscount2;
        breakdown.discount2.byInvoiceType[invoice.type].invoiceCount++;
        breakdown.discount2.byInvoiceType[invoice.type].amount += invoiceDiscount2;

        // Group by claim account
        if (invoice.claimAccountId) {
          const claimAccountId = invoice.claimAccountId._id.toString();
          if (!breakdown.discount2.byClaimAccount[claimAccountId]) {
            breakdown.discount2.byClaimAccount[claimAccountId] = {
              claimAccountId,
              claimAccountName: invoice.claimAccountId.name,
              accountNumber: invoice.claimAccountId.accountNumber || invoice.claimAccountId.code,
              invoiceCount: 0,
              totalAmount: 0,
              invoices: []
            };
          }
          breakdown.discount2.byClaimAccount[claimAccountId].invoiceCount++;
          breakdown.discount2.byClaimAccount[claimAccountId].totalAmount += invoiceDiscount2;
          breakdown.discount2.byClaimAccount[claimAccountId].invoices.push(invoiceData);
        }

        breakdown.discount2.invoices.push({
          ...invoiceData,
          discountAmount: invoiceData.discount2Amount
        });
      }

      // Update totals
      if (hasDiscount1 || hasDiscount2) {
        breakdown.total.invoiceCount++;
        breakdown.total.totalDiscount1 += invoiceDiscount1;
        breakdown.total.totalDiscount2 += invoiceDiscount2;
        breakdown.total.grandTotalDiscount += invoiceDiscount1 + invoiceDiscount2;
      }
    });

    // Convert byClaimAccount object to array
    breakdown.discount2.byClaimAccount = Object.values(breakdown.discount2.byClaimAccount)
      .map(account => ({
        ...account,
        totalAmount: Math.round(account.totalAmount * 100) / 100
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Round all amounts
    breakdown.discount1.totalAmount = Math.round(breakdown.discount1.totalAmount * 100) / 100;
    breakdown.discount2.totalAmount = Math.round(breakdown.discount2.totalAmount * 100) / 100;
    breakdown.total.totalDiscount1 = Math.round(breakdown.total.totalDiscount1 * 100) / 100;
    breakdown.total.totalDiscount2 = Math.round(breakdown.total.totalDiscount2 * 100) / 100;
    breakdown.total.grandTotalDiscount = Math.round(breakdown.total.grandTotalDiscount * 100) / 100;

    // Round amounts in byInvoiceType
    ['discount1', 'discount2'].forEach(discType => {
      Object.keys(breakdown[discType].byInvoiceType).forEach(invType => {
        breakdown[discType].byInvoiceType[invType].amount =
          Math.round(breakdown[discType].byInvoiceType[invType].amount * 100) / 100;
      });
    });

    return {
      reportType: 'discount_breakdown',
      period: { startDate, endDate },
      filters: {
        invoiceType,
        discountType,
        claimAccountId
      },
      breakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Get comprehensive tax report (Requirement 6.5)
   * Separates regular GST, advance tax, and non-filer GST
   * Groups by tax type and rate
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.invoiceType - Optional invoice type filter ('sales', 'purchase', or 'all')
   * @param {string} params.customerId - Optional customer ID filter
   * @param {string} params.supplierId - Optional supplier ID filter
   * @returns {Promise<Object>} Comprehensive tax report
   */
  async getTaxReport(params) {
    const { startDate, endDate, invoiceType = 'all', customerId, supplierId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Build query
    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $in: ['confirmed', 'paid'] }
    };

    // Filter by invoice type
    if (invoiceType !== 'all') {
      query.type = invoiceType;
    } else {
      query.type = { $in: ['sales', 'purchase'] };
    }

    // Filter by customer or supplier
    if (customerId) {
      query.customerId = customerId;
    }
    if (supplierId) {
      query.supplierId = supplierId;
    }

    // Fetch invoices
    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .sort({ invoiceDate: 1 });

    // Initialize tax breakdown structure
    const taxBreakdown = {
      gst: {
        gst18: {
          rate: 18,
          invoiceCount: 0,
          taxableAmount: 0,
          taxAmount: 0,
          invoices: []
        },
        gst4: {
          rate: 4,
          invoiceCount: 0,
          taxableAmount: 0,
          taxAmount: 0,
          invoices: []
        },
        total: {
          invoiceCount: 0,
          taxableAmount: 0,
          taxAmount: 0
        }
      },
      advanceTax: {
        rate0_5: {
          rate: 0.5,
          invoiceCount: 0,
          taxableAmount: 0,
          taxAmount: 0,
          invoices: []
        },
        rate2_5: {
          rate: 2.5,
          invoiceCount: 0,
          taxableAmount: 0,
          taxAmount: 0,
          invoices: []
        },
        total: {
          invoiceCount: 0,
          taxableAmount: 0,
          taxAmount: 0
        }
      },
      nonFilerGST: {
        rate: 0.1,
        invoiceCount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        invoices: []
      },
      summary: {
        totalInvoices: 0,
        totalTaxableAmount: 0,
        totalGSTAmount: 0,
        totalAdvanceTaxAmount: 0,
        totalNonFilerGSTAmount: 0,
        totalTaxAmount: 0
      }
    };

    // Process each invoice
    invoices.forEach(invoice => {
      const invoiceData = {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceType: invoice.type,
        accountCode: invoice.customerId?.code || invoice.supplierId?.code,
        accountName: invoice.customerId?.name || invoice.supplierId?.name,
        subtotal: invoice.totals.subtotal || 0,
        discount: invoice.totals.totalDiscount || 0,
        taxableAmount: 0,
        gst18Amount: 0,
        gst4Amount: 0,
        advanceTax0_5Amount: 0,
        advanceTax2_5Amount: 0,
        nonFilerGSTAmount: 0,
        totalTaxAmount: 0
      };

      // Calculate taxable amount
      invoiceData.taxableAmount = invoiceData.subtotal - invoiceData.discount;

      // Extract tax amounts from invoice totals
      invoiceData.gst18Amount = invoice.totals.gst18Total || 0;
      invoiceData.gst4Amount = invoice.totals.gst4Total || 0;
      invoiceData.nonFilerGSTAmount = invoice.totals.nonFilerGSTTotal || 0;

      // Determine advance tax rate from items
      let hasAdvanceTax0_5 = false;
      let hasAdvanceTax2_5 = false;
      let advanceTax0_5Amount = 0;
      let advanceTax2_5Amount = 0;

      invoice.items.forEach(item => {
        if (item.advanceTaxPercent === 0.5) {
          hasAdvanceTax0_5 = true;
          advanceTax0_5Amount += item.advanceTaxAmount || 0;
        } else if (item.advanceTaxPercent === 2.5) {
          hasAdvanceTax2_5 = true;
          advanceTax2_5Amount += item.advanceTaxAmount || 0;
        }
      });

      invoiceData.advanceTax0_5Amount = advanceTax0_5Amount;
      invoiceData.advanceTax2_5Amount = advanceTax2_5Amount;
      invoiceData.totalTaxAmount = invoiceData.gst18Amount + invoiceData.gst4Amount +
        advanceTax0_5Amount + advanceTax2_5Amount +
        invoiceData.nonFilerGSTAmount;

      // Update GST 18% breakdown
      if (invoiceData.gst18Amount > 0) {
        taxBreakdown.gst.gst18.invoiceCount++;
        taxBreakdown.gst.gst18.taxableAmount += invoiceData.taxableAmount;
        taxBreakdown.gst.gst18.taxAmount += invoiceData.gst18Amount;
        taxBreakdown.gst.gst18.invoices.push({
          ...invoiceData,
          taxAmount: invoiceData.gst18Amount
        });
      }

      // Update GST 4% breakdown
      if (invoiceData.gst4Amount > 0) {
        taxBreakdown.gst.gst4.invoiceCount++;
        taxBreakdown.gst.gst4.taxableAmount += invoiceData.taxableAmount;
        taxBreakdown.gst.gst4.taxAmount += invoiceData.gst4Amount;
        taxBreakdown.gst.gst4.invoices.push({
          ...invoiceData,
          taxAmount: invoiceData.gst4Amount
        });
      }

      // Update Advance Tax 0.5% breakdown
      if (hasAdvanceTax0_5) {
        taxBreakdown.advanceTax.rate0_5.invoiceCount++;
        taxBreakdown.advanceTax.rate0_5.taxableAmount += invoiceData.taxableAmount;
        taxBreakdown.advanceTax.rate0_5.taxAmount += advanceTax0_5Amount;
        taxBreakdown.advanceTax.rate0_5.invoices.push({
          ...invoiceData,
          taxAmount: advanceTax0_5Amount
        });
      }

      // Update Advance Tax 2.5% breakdown
      if (hasAdvanceTax2_5) {
        taxBreakdown.advanceTax.rate2_5.invoiceCount++;
        taxBreakdown.advanceTax.rate2_5.taxableAmount += invoiceData.taxableAmount;
        taxBreakdown.advanceTax.rate2_5.taxAmount += advanceTax2_5Amount;
        taxBreakdown.advanceTax.rate2_5.invoices.push({
          ...invoiceData,
          taxAmount: advanceTax2_5Amount
        });
      }

      // Update Non-Filer GST breakdown
      if (invoiceData.nonFilerGSTAmount > 0) {
        taxBreakdown.nonFilerGST.invoiceCount++;
        taxBreakdown.nonFilerGST.taxableAmount += invoiceData.taxableAmount;
        taxBreakdown.nonFilerGST.taxAmount += invoiceData.nonFilerGSTAmount;
        taxBreakdown.nonFilerGST.invoices.push({
          ...invoiceData,
          taxAmount: invoiceData.nonFilerGSTAmount
        });
      }

      // Update GST totals
      taxBreakdown.gst.total.taxableAmount += invoiceData.taxableAmount;
      taxBreakdown.gst.total.taxAmount += invoiceData.gst18Amount + invoiceData.gst4Amount;

      // Update Advance Tax totals
      taxBreakdown.advanceTax.total.taxableAmount += invoiceData.taxableAmount;
      taxBreakdown.advanceTax.total.taxAmount += advanceTax0_5Amount + advanceTax2_5Amount;

      // Update summary
      taxBreakdown.summary.totalInvoices++;
      taxBreakdown.summary.totalTaxableAmount += invoiceData.taxableAmount;
      taxBreakdown.summary.totalGSTAmount += invoiceData.gst18Amount + invoiceData.gst4Amount;
      taxBreakdown.summary.totalAdvanceTaxAmount += advanceTax0_5Amount + advanceTax2_5Amount;
      taxBreakdown.summary.totalNonFilerGSTAmount += invoiceData.nonFilerGSTAmount;
      taxBreakdown.summary.totalTaxAmount += invoiceData.totalTaxAmount;
    });

    // Count unique invoices for GST and Advance Tax totals
    const uniqueGSTInvoices = new Set();
    const uniqueAdvanceTaxInvoices = new Set();

    invoices.forEach(invoice => {
      if ((invoice.totals.gst18Total || 0) > 0 || (invoice.totals.gst4Total || 0) > 0) {
        uniqueGSTInvoices.add(invoice._id.toString());
      }
      if ((invoice.totals.advanceTaxTotal || 0) > 0) {
        uniqueAdvanceTaxInvoices.add(invoice._id.toString());
      }
    });

    taxBreakdown.gst.total.invoiceCount = uniqueGSTInvoices.size;
    taxBreakdown.advanceTax.total.invoiceCount = uniqueAdvanceTaxInvoices.size;

    // Round all amounts to 2 decimal places
    const roundAmounts = (obj) => {
      if (obj.taxableAmount !== undefined) obj.taxableAmount = Math.round(obj.taxableAmount * 100) / 100;
      if (obj.taxAmount !== undefined) obj.taxAmount = Math.round(obj.taxAmount * 100) / 100;
      if (obj.totalTaxableAmount !== undefined) obj.totalTaxableAmount = Math.round(obj.totalTaxableAmount * 100) / 100;
      if (obj.totalGSTAmount !== undefined) obj.totalGSTAmount = Math.round(obj.totalGSTAmount * 100) / 100;
      if (obj.totalAdvanceTaxAmount !== undefined) obj.totalAdvanceTaxAmount = Math.round(obj.totalAdvanceTaxAmount * 100) / 100;
      if (obj.totalNonFilerGSTAmount !== undefined) obj.totalNonFilerGSTAmount = Math.round(obj.totalNonFilerGSTAmount * 100) / 100;
      if (obj.totalTaxAmount !== undefined) obj.totalTaxAmount = Math.round(obj.totalTaxAmount * 100) / 100;
    };

    roundAmounts(taxBreakdown.gst.gst18);
    roundAmounts(taxBreakdown.gst.gst4);
    roundAmounts(taxBreakdown.gst.total);
    roundAmounts(taxBreakdown.advanceTax.rate0_5);
    roundAmounts(taxBreakdown.advanceTax.rate2_5);
    roundAmounts(taxBreakdown.advanceTax.total);
    roundAmounts(taxBreakdown.nonFilerGST);
    roundAmounts(taxBreakdown.summary);

    return {
      reportType: 'comprehensive_tax_report',
      period: { startDate, endDate },
      invoiceType,
      taxBreakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Get discount breakdown report
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.discountType - Optional discount type filter ('discount1', 'discount2', or 'all')
   * @param {string} params.claimAccountId - Optional claim account ID filter
   * @returns {Promise<Object>} Discount breakdown report
   */
  async getDiscountBreakdown(params) {
    const { startDate, endDate, discountType = 'all', claimAccountId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    if (claimAccountId) {
      query.claimAccountId = claimAccountId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('claimAccountId', 'name accountNumber')
      .sort({ invoiceDate: 1 });

    const breakdown = {
      discount1: {
        invoiceCount: 0,
        totalAmount: 0,
        invoices: []
      },
      discount2: {
        invoiceCount: 0,
        totalAmount: 0,
        byClaimAccount: {},
        invoices: []
      },
      total: {
        invoiceCount: 0,
        totalAmount: 0
      }
    };

    invoices.forEach(invoice => {
      let discount1Total = 0;
      let discount2Total = 0;

      invoice.items.forEach(item => {
        discount1Total += item.discount1Amount || 0;
        discount2Total += item.discount2Amount || 0;
      });

      if (discount1Total > 0 && (discountType === 'all' || discountType === 'discount1')) {
        breakdown.discount1.invoiceCount++;
        breakdown.discount1.totalAmount += discount1Total;
        breakdown.discount1.invoices.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          accountName: invoice.customerId?.name || invoice.supplierId?.name,
          discountAmount: Math.round(discount1Total * 100) / 100
        });
      }

      if (discount2Total > 0 && (discountType === 'all' || discountType === 'discount2')) {
        breakdown.discount2.invoiceCount++;
        breakdown.discount2.totalAmount += discount2Total;

        const claimAccountKey = invoice.claimAccountId?._id?.toString() || 'no_claim_account';
        if (!breakdown.discount2.byClaimAccount[claimAccountKey]) {
          breakdown.discount2.byClaimAccount[claimAccountKey] = {
            claimAccount: invoice.claimAccountId ? {
              id: invoice.claimAccountId._id,
              name: invoice.claimAccountId.name,
              accountNumber: invoice.claimAccountId.accountNumber
            } : null,
            invoiceCount: 0,
            totalAmount: 0
          };
        }

        breakdown.discount2.byClaimAccount[claimAccountKey].invoiceCount++;
        breakdown.discount2.byClaimAccount[claimAccountKey].totalAmount += discount2Total;

        breakdown.discount2.invoices.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          accountName: invoice.customerId?.name || invoice.supplierId?.name,
          claimAccount: invoice.claimAccountId ? {
            name: invoice.claimAccountId.name,
            accountNumber: invoice.claimAccountId.accountNumber
          } : null,
          discountAmount: Math.round(discount2Total * 100) / 100
        });
      }

      breakdown.total.totalAmount += discount1Total + discount2Total;
    });

    breakdown.total.invoiceCount = invoices.length;
    breakdown.discount1.totalAmount = Math.round(breakdown.discount1.totalAmount * 100) / 100;
    breakdown.discount2.totalAmount = Math.round(breakdown.discount2.totalAmount * 100) / 100;
    breakdown.total.totalAmount = Math.round(breakdown.total.totalAmount * 100) / 100;

    // Convert byClaimAccount to array
    breakdown.discount2.byClaimAccount = Object.values(breakdown.discount2.byClaimAccount).map(acc => ({
      ...acc,
      totalAmount: Math.round(acc.totalAmount * 100) / 100
    }));

    return {
      reportType: 'discount_breakdown',
      period: { startDate, endDate },
      discountType,
      breakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get pending post-dated cheques report (Requirement 7.5)
   * @param {Date} dueDate - Optional due date filter
   * @returns {Promise<Object>} Pending cheques report
   */
  async getPendingCheques(dueDate) {
    const CashReceipt = require('../models/CashReceipt');

    const query = {
      postDatedCheque: true,
      chequeStatus: 'pending'
    };

    // If dueDate is provided, filter by cheques due on or before that date
    if (dueDate) {
      query['bankDetails.chequeDate'] = { $lte: new Date(dueDate) };
    }

    const cheques = await CashReceipt.find(query)
      .populate('customerId', 'code name contactInfo')
      .populate('createdBy', 'username email')
      .sort({ 'bankDetails.chequeDate': 1 });

    // Group by bank
    const byBank = {};
    let totalAmount = 0;

    cheques.forEach(cheque => {
      const bankName = cheque.bankDetails.bankName || 'Unknown Bank';

      if (!byBank[bankName]) {
        byBank[bankName] = {
          bankName,
          chequeCount: 0,
          totalAmount: 0,
          cheques: []
        };
      }

      byBank[bankName].chequeCount++;
      byBank[bankName].totalAmount += cheque.amount;
      totalAmount += cheque.amount;

      byBank[bankName].cheques.push({
        receiptId: cheque._id,
        receiptNumber: cheque.receiptNumber,
        receiptDate: cheque.receiptDate,
        customer: {
          id: cheque.customerId._id,
          code: cheque.customerId.code,
          name: cheque.customerId.name
        },
        amount: cheque.amount,
        chequeNumber: cheque.bankDetails.chequeNumber,
        chequeDate: cheque.bankDetails.chequeDate,
        accountNumber: cheque.bankDetails.accountNumber,
        daysUntilDue: Math.ceil((new Date(cheque.bankDetails.chequeDate) - new Date()) / (1000 * 60 * 60 * 24))
      });
    });

    // Convert to array and round amounts
    const bankArray = Object.values(byBank).map(bank => ({
      ...bank,
      totalAmount: Math.round(bank.totalAmount * 100) / 100,
      cheques: bank.cheques.sort((a, b) => new Date(a.chequeDate) - new Date(b.chequeDate))
    }));

    // Sort by total amount descending
    bankArray.sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      reportType: 'pending_cheques',
      dueDate: dueDate || null,
      summary: {
        totalCheques: cheques.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalBanks: bankArray.length
      },
      byBank: bankArray,
      allCheques: cheques.map(cheque => ({
        receiptId: cheque._id,
        receiptNumber: cheque.receiptNumber,
        receiptDate: cheque.receiptDate,
        customer: {
          id: cheque.customerId._id,
          code: cheque.customerId.code,
          name: cheque.customerId.name
        },
        amount: cheque.amount,
        bankName: cheque.bankDetails.bankName,
        chequeNumber: cheque.bankDetails.chequeNumber,
        chequeDate: cheque.bankDetails.chequeDate,
        accountNumber: cheque.bankDetails.accountNumber,
        daysUntilDue: Math.ceil((new Date(cheque.bankDetails.chequeDate) - new Date()) / (1000 * 60 * 60 * 24))
      })),
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get aging report (Requirement 8.5)
   * Groups receivables by age buckets (0-30, 31-60, 61-90, 90+)
   * @param {string} accountId - Optional customer ID filter
   * @returns {Promise<Object>} Aging report
   */
  async getAgingReport(accountId) {
    const salesInvoiceService = require('./salesInvoiceService');
    const Invoice = require('../models/Invoice');
    const Customer = require('../models/Customer');

    // Build query for pending/partial invoices
    const query = {
      type: 'sales',
      status: 'confirmed',
      paymentStatus: { $in: ['pending', 'partial'] }
    };

    // Filter by customer if provided
    if (accountId) {
      query.customerId = accountId;
    }

    // Get all pending invoices
    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name contactInfo')
      .sort({ invoiceDate: 1 });

    // Initialize aging buckets
    const agingBuckets = {
      current: {
        label: '0-30 days',
        minDays: 0,
        maxDays: 30,
        invoiceCount: 0,
        totalAmount: 0,
        invoices: []
      },
      days31to60: {
        label: '31-60 days',
        minDays: 31,
        maxDays: 60,
        invoiceCount: 0,
        totalAmount: 0,
        invoices: []
      },
      days61to90: {
        label: '61-90 days',
        minDays: 61,
        maxDays: 90,
        invoiceCount: 0,
        totalAmount: 0,
        invoices: []
      },
      over90: {
        label: '90+ days',
        minDays: 91,
        maxDays: Infinity,
        invoiceCount: 0,
        totalAmount: 0,
        invoices: []
      }
    };

    // Group by customer if no specific customer provided
    const customerMap = {};
    let grandTotal = 0;

    invoices.forEach(invoice => {
      // Calculate aging
      const daysOld = salesInvoiceService.calculateInvoiceAge(invoice.invoiceDate);

      // Calculate due amount
      const totalAmount = invoice.totals.grandTotal;
      const paidAmount = invoice.totals.paidAmount || 0;
      const dueAmount = totalAmount - paidAmount;

      grandTotal += dueAmount;

      // Determine bucket
      let bucket;
      if (daysOld <= 30) {
        bucket = 'current';
      } else if (daysOld <= 60) {
        bucket = 'days31to60';
      } else if (daysOld <= 90) {
        bucket = 'days61to90';
      } else {
        bucket = 'over90';
      }

      // Add to bucket
      agingBuckets[bucket].invoiceCount++;
      agingBuckets[bucket].totalAmount += dueAmount;
      agingBuckets[bucket].invoices.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        daysOld,
        totalAmount,
        paidAmount,
        dueAmount,
        customer: {
          id: invoice.customerId._id,
          code: invoice.customerId.code,
          name: invoice.customerId.name
        }
      });

      // Group by customer
      const customerId = invoice.customerId._id.toString();
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          customerId,
          customerCode: invoice.customerId.code,
          customerName: invoice.customerId.name,
          totalDue: 0,
          invoiceCount: 0,
          aging: {
            current: 0,
            days31to60: 0,
            days61to90: 0,
            over90: 0
          }
        };
      }

      customerMap[customerId].totalDue += dueAmount;
      customerMap[customerId].invoiceCount++;
      customerMap[customerId].aging[bucket] += dueAmount;
    });

    // Round amounts in buckets
    Object.keys(agingBuckets).forEach(key => {
      agingBuckets[key].totalAmount = Math.round(agingBuckets[key].totalAmount * 100) / 100;
    });

    // Convert customer map to array and round amounts
    const customerAging = Object.values(customerMap).map(customer => ({
      ...customer,
      totalDue: Math.round(customer.totalDue * 100) / 100,
      aging: {
        current: Math.round(customer.aging.current * 100) / 100,
        days31to60: Math.round(customer.aging.days31to60 * 100) / 100,
        days61to90: Math.round(customer.aging.days61to90 * 100) / 100,
        over90: Math.round(customer.aging.over90 * 100) / 100
      }
    }));

    // Sort by total due descending
    customerAging.sort((a, b) => b.totalDue - a.totalDue);

    return {
      reportType: 'aging_report',
      accountId: accountId || null,
      summary: {
        totalInvoices: invoices.length,
        totalDue: Math.round(grandTotal * 100) / 100,
        totalCustomers: customerAging.length
      },
      agingBuckets: {
        current: {
          ...agingBuckets.current,
          percentage: grandTotal > 0 ? Math.round((agingBuckets.current.totalAmount / grandTotal) * 10000) / 100 : 0
        },
        days31to60: {
          ...agingBuckets.days31to60,
          percentage: grandTotal > 0 ? Math.round((agingBuckets.days31to60.totalAmount / grandTotal) * 10000) / 100 : 0
        },
        days61to90: {
          ...agingBuckets.days61to90,
          percentage: grandTotal > 0 ? Math.round((agingBuckets.days61to90.totalAmount / grandTotal) * 10000) / 100 : 0
        },
        over90: {
          ...agingBuckets.over90,
          percentage: grandTotal > 0 ? Math.round((agingBuckets.over90.totalAmount / grandTotal) * 10000) / 100 : 0
        }
      },
      customerAging,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get salesman sales report (Requirement 9.3)
   * @param {string} salesmanId - Optional salesman ID filter
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Salesman sales report
   */
  async getSalesmanSales(salesmanId, startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const Invoice = require('../models/Invoice');

    const query = {
      type: 'sales',
      status: 'confirmed',
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (salesmanId) {
      query.salesmanId = salesmanId;
    }

    const invoices = await Invoice.find(query)
      .populate('salesmanId', 'name code')
      .populate('customerId', 'code name')
      .sort({ invoiceDate: -1 });

    const salesBySalesman = {};
    let grandTotal = 0;

    invoices.forEach(invoice => {
      const salesman = invoice.salesmanId;
      if (!salesman) return;

      const salesmanKey = salesman._id.toString();
      if (!salesBySalesman[salesmanKey]) {
        salesBySalesman[salesmanKey] = {
          salesmanId: salesman._id,
          salesmanCode: salesman.code,
          salesmanName: salesman.name,
          invoiceCount: 0,
          totalSales: 0,
          invoices: []
        };
      }

      const amount = invoice.totals.grandTotal;
      salesBySalesman[salesmanKey].invoiceCount++;
      salesBySalesman[salesmanKey].totalSales += amount;
      salesBySalesman[salesmanKey].invoices.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customer: {
          id: invoice.customerId._id,
          code: invoice.customerId.code,
          name: invoice.customerId.name
        },
        amount
      });

      grandTotal += amount;
    });

    const salesmanArray = Object.values(salesBySalesman).map(s => ({
      ...s,
      totalSales: Math.round(s.totalSales * 100) / 100
    })).sort((a, b) => b.totalSales - a.totalSales);

    return {
      reportType: 'salesman_sales',
      salesmanId: salesmanId || null,
      period: { startDate, endDate },
      summary: {
        totalInvoices: invoices.length,
        totalSales: Math.round(grandTotal * 100) / 100,
        totalSalesmen: salesmanArray.length
      },
      salesBySalesman: salesmanArray,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get salesman collections report (Requirement 9.3)
   * @param {string} salesmanId - Optional salesman ID filter
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Salesman collections report
   */
  async getSalesmanCollections(salesmanId, startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const CashReceipt = require('../models/CashReceipt');

    const query = {
      status: { $in: ['cleared', 'pending'] },
      receiptDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (salesmanId) {
      query.salesmanId = salesmanId;
    }

    const receipts = await CashReceipt.find(query)
      .populate('salesmanId', 'name code')
      .populate('customerId', 'code name')
      .sort({ receiptDate: -1 });

    const collectionsBySalesman = {};
    let grandTotal = 0;

    receipts.forEach(receipt => {
      const salesman = receipt.salesmanId;
      if (!salesman) return;

      const salesmanKey = salesman._id.toString();
      if (!collectionsBySalesman[salesmanKey]) {
        collectionsBySalesman[salesmanKey] = {
          salesmanId: salesman._id,
          salesmanCode: salesman.code,
          salesmanName: salesman.name,
          receiptCount: 0,
          totalCollections: 0,
          receipts: []
        };
      }

      collectionsBySalesman[salesmanKey].receiptCount++;
      collectionsBySalesman[salesmanKey].totalCollections += receipt.amount;
      collectionsBySalesman[salesmanKey].receipts.push({
        receiptId: receipt._id,
        receiptNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate,
        customer: {
          id: receipt.customerId._id,
          code: receipt.customerId.code,
          name: receipt.customerId.name
        },
        amount: receipt.amount
      });

      grandTotal += receipt.amount;
    });

    const salesmanArray = Object.values(collectionsBySalesman).map(s => ({
      ...s,
      totalCollections: Math.round(s.totalCollections * 100) / 100
    })).sort((a, b) => b.totalCollections - a.totalCollections);

    return {
      reportType: 'salesman_collections',
      salesmanId: salesmanId || null,
      period: { startDate, endDate },
      summary: {
        totalReceipts: receipts.length,
        totalCollections: Math.round(grandTotal * 100) / 100,
        totalSalesmen: salesmanArray.length
      },
      collectionsBySalesman: salesmanArray,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get salesman performance report (Requirement 9.4)
   * @param {string} salesmanId - Salesman ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Salesman performance report
   */
  async getSalesmanPerformance(salesmanId, startDate, endDate) {
    if (!salesmanId) {
      throw new Error('Salesman ID is required');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const [salesReport, collectionsReport] = await Promise.all([
      this.getSalesmanSales(salesmanId, startDate, endDate),
      this.getSalesmanCollections(salesmanId, startDate, endDate)
    ]);

    const salesData = salesReport.salesBySalesman[0] || { totalSales: 0, invoiceCount: 0 };
    const collectionsData = collectionsReport.collectionsBySalesman[0] || { totalCollections: 0, receiptCount: 0 };

    // Note: Targets would come from Salesman model when implemented
    const salesTarget = 1000000; // Placeholder
    const collectionsTarget = 800000; // Placeholder

    const salesAchievement = salesTarget > 0 ? Math.round((salesData.totalSales / salesTarget) * 10000) / 100 : 0;
    const collectionsAchievement = collectionsTarget > 0 ? Math.round((collectionsData.totalCollections / collectionsTarget) * 10000) / 100 : 0;

    return {
      reportType: 'salesman_performance',
      salesmanId,
      period: { startDate, endDate },
      performance: {
        sales: {
          actual: salesData.totalSales,
          target: salesTarget,
          achievement: salesAchievement,
          invoiceCount: salesData.invoiceCount
        },
        collections: {
          actual: collectionsData.totalCollections,
          target: collectionsTarget,
          achievement: collectionsAchievement,
          receiptCount: collectionsData.receiptCount
        }
      },
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Calculate salesman commission (Requirement 9.5 - Task 40.1)
   * @param {string} salesmanId - Salesman ID (optional - if not provided, calculates for all salesmen)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Commission calculation options
   * @param {string} options.commissionBasis - 'sales', 'collections', or 'both' (default: 'both')
   * @param {number} options.salesCommissionRate - Override sales commission rate (optional)
   * @param {number} options.collectionsCommissionRate - Override collections commission rate (optional)
   * @returns {Promise<Object>} Commission calculation report
   */
  async calculateCommission(salesmanId, startDate, endDate, options = {}) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const {
      commissionBasis = 'both',
      salesCommissionRate = null,
      collectionsCommissionRate = null
    } = options;

    const Salesman = require('../models/Salesman');

    // Get salesman/salesmen data
    let salesmen = [];
    if (salesmanId) {
      const salesman = await Salesman.findById(salesmanId);
      if (!salesman) {
        throw new Error('Salesman not found');
      }
      salesmen = [salesman];
    } else {
      salesmen = await Salesman.find({ isActive: true });
    }

    if (salesmen.length === 0) {
      return {
        reportType: 'salesman_commission',
        period: { startDate, endDate },
        commissionBasis,
        summary: {
          totalSalesmen: 0,
          totalSalesCommission: 0,
          totalCollectionsCommission: 0,
          totalCommission: 0
        },
        commissionDetails: [],
        generatedAt: new Date()
      };
    }

    // Calculate commission for each salesman
    const commissionDetails = [];
    let totalSalesCommission = 0;
    let totalCollectionsCommission = 0;

    for (const salesman of salesmen) {
      // Get sales and collections data
      const [salesReport, collectionsReport] = await Promise.all([
        commissionBasis === 'collections' ? null : this.getSalesmanSales(salesman._id.toString(), startDate, endDate),
        commissionBasis === 'sales' ? null : this.getSalesmanCollections(salesman._id.toString(), startDate, endDate)
      ]);

      const salesData = salesReport?.salesBySalesman[0] || { totalSales: 0, invoiceCount: 0 };
      const collectionsData = collectionsReport?.collectionsBySalesman[0] || { totalCollections: 0, receiptCount: 0 };

      // Determine commission rates
      const salesRate = salesCommissionRate !== null ? salesCommissionRate : salesman.commissionRate || 0;
      const collectionsRate = collectionsCommissionRate !== null ? collectionsCommissionRate : salesman.commissionRate || 0;

      // Calculate commissions
      let salesCommission = 0;
      let collectionsCommission = 0;
      let totalCommission = 0;

      if (commissionBasis === 'sales' || commissionBasis === 'both') {
        salesCommission = (salesData.totalSales * salesRate) / 100;
        totalCommission += salesCommission;
      }

      if (commissionBasis === 'collections' || commissionBasis === 'both') {
        collectionsCommission = (collectionsData.totalCollections * collectionsRate) / 100;
        totalCommission += collectionsCommission;
      }

      // Round to 2 decimal places
      salesCommission = Math.round(salesCommission * 100) / 100;
      collectionsCommission = Math.round(collectionsCommission * 100) / 100;
      totalCommission = Math.round(totalCommission * 100) / 100;

      totalSalesCommission += salesCommission;
      totalCollectionsCommission += collectionsCommission;

      commissionDetails.push({
        salesmanId: salesman._id,
        salesmanCode: salesman.code,
        salesmanName: salesman.name,
        commissionRate: salesman.commissionRate || 0,
        sales: {
          totalSales: Math.round(salesData.totalSales * 100) / 100,
          invoiceCount: salesData.invoiceCount,
          commissionRate: salesRate,
          commission: salesCommission
        },
        collections: {
          totalCollections: Math.round(collectionsData.totalCollections * 100) / 100,
          receiptCount: collectionsData.receiptCount,
          commissionRate: collectionsRate,
          commission: collectionsCommission
        },
        totalCommission
      });
    }

    // Sort by total commission descending
    commissionDetails.sort((a, b) => b.totalCommission - a.totalCommission);

    return {
      reportType: 'salesman_commission',
      salesmanId: salesmanId || null,
      period: { startDate, endDate },
      commissionBasis,
      summary: {
        totalSalesmen: commissionDetails.length,
        totalSalesCommission: Math.round(totalSalesCommission * 100) / 100,
        totalCollectionsCommission: Math.round(totalCollectionsCommission * 100) / 100,
        totalCommission: Math.round((totalSalesCommission + totalCollectionsCommission) * 100) / 100
      },
      commissionDetails,
      generatedAt: new Date()
    };
  }
}

module.exports = new ReportService();
