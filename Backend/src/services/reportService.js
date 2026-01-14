const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Budget = require('../models/Budget');

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
    const { startDate, endDate, customerId, salesmanId, groupBy = 'date' } = params;

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

    if (salesmanId) {
      query.salesmanId = salesmanId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('salesmanId', 'code name commissionRate')
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
    } else if (groupBy === 'salesman') {
      groupedData = this._groupBySalesman(invoices);
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
   * Group invoices by salesman
   * @private
   */
  _groupBySalesman(invoices) {
    const grouped = {};

    invoices.forEach((invoice) => {
      // Handle invoices without salesman
      const salesmanId = invoice.salesmanId ? invoice.salesmanId._id.toString() : 'unassigned';
      const salesmanKey = salesmanId;

      if (!grouped[salesmanKey]) {
        grouped[salesmanKey] = {
          salesman: invoice.salesmanId || { code: 'N/A', name: 'Unassigned' },
          invoiceCount: 0,
          totalAmount: 0,
          totalDiscount: 0,
          totalTax: 0,
          totalSubtotal: 0,
        };
      }

      grouped[salesmanKey].invoiceCount++;
      grouped[salesmanKey].totalAmount += invoice.totals.grandTotal;
      grouped[salesmanKey].totalDiscount += invoice.totals.totalDiscount;
      grouped[salesmanKey].totalTax += invoice.totals.totalTax;
      grouped[salesmanKey].totalSubtotal += invoice.totals.subtotal;
    });

    return Object.values(grouped);
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
          // Skip if itemId is not populated
          if (!item.itemId || !item.itemId._id) return;

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
   * Phase 2: Get scheme report (Task 48.1 - Requirement 14.2)
   * Wrapper method for getSchemeAnalysis with simplified interface
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Optional filters
   * @param {string} options.invoiceType - Invoice type ('sales' or 'purchase')
   * @param {string} options.customerId - Optional customer ID filter
   * @param {string} options.supplierId - Optional supplier ID filter
   * @returns {Promise<Object>} Scheme report
   */
  async getSchemeReport(startDate, endDate, options = {}) {
    const { invoiceType = 'sales', customerId, supplierId } = options;

    return await this.getSchemeAnalysis({
      startDate,
      endDate,
      invoiceType,
      customerId,
      supplierId
    });
  }

  /**
   * Phase 2: Compare scheme performance across periods (Task 48.2 - Requirement 14.2)
   * @param {Date} period1Start - First period start date
   * @param {Date} period1End - First period end date
   * @param {Date} period2Start - Second period start date
   * @param {Date} period2End - Second period end date
   * @param {Object} options - Optional filters
   * @param {string} options.invoiceType - Invoice type ('sales' or 'purchase')
   * @returns {Promise<Object>} Scheme comparison report
   */
  async getSchemeComparison(period1Start, period1End, period2Start, period2End, options = {}) {
    if (!period1Start || !period1End || !period2Start || !period2End) {
      throw new Error('All period dates are required');
    }

    const { invoiceType = 'sales' } = options;

    // Get scheme analysis for both periods
    const [period1Report, period2Report] = await Promise.all([
      this.getSchemeAnalysis({
        startDate: period1Start,
        endDate: period1End,
        invoiceType
      }),
      this.getSchemeAnalysis({
        startDate: period2Start,
        endDate: period2End,
        invoiceType
      })
    ]);

    // Calculate changes and trends
    const scheme1Change = {
      quantityChange: period2Report.summary.totalScheme1Quantity - period1Report.summary.totalScheme1Quantity,
      quantityChangePercent: period1Report.summary.totalScheme1Quantity > 0
        ? Math.round(((period2Report.summary.totalScheme1Quantity - period1Report.summary.totalScheme1Quantity) / period1Report.summary.totalScheme1Quantity) * 10000) / 100
        : 0,
      valueChange: period2Report.summary.totalScheme1Value - period1Report.summary.totalScheme1Value,
      valueChangePercent: period1Report.summary.totalScheme1Value > 0
        ? Math.round(((period2Report.summary.totalScheme1Value - period1Report.summary.totalScheme1Value) / period1Report.summary.totalScheme1Value) * 10000) / 100
        : 0
    };

    const scheme2Change = {
      quantityChange: period2Report.summary.totalScheme2Quantity - period1Report.summary.totalScheme2Quantity,
      quantityChangePercent: period1Report.summary.totalScheme2Quantity > 0
        ? Math.round(((period2Report.summary.totalScheme2Quantity - period1Report.summary.totalScheme2Quantity) / period1Report.summary.totalScheme2Quantity) * 10000) / 100
        : 0,
      valueChange: period2Report.summary.totalScheme2Value - period1Report.summary.totalScheme2Value,
      valueChangePercent: period1Report.summary.totalScheme2Value > 0
        ? Math.round(((period2Report.summary.totalScheme2Value - period1Report.summary.totalScheme2Value) / period1Report.summary.totalScheme2Value) * 10000) / 100
        : 0
    };

    const totalChange = {
      quantityChange: period2Report.summary.totalSchemeQuantity - period1Report.summary.totalSchemeQuantity,
      quantityChangePercent: period1Report.summary.totalSchemeQuantity > 0
        ? Math.round(((period2Report.summary.totalSchemeQuantity - period1Report.summary.totalSchemeQuantity) / period1Report.summary.totalSchemeQuantity) * 10000) / 100
        : 0,
      valueChange: period2Report.summary.totalSchemeValue - period1Report.summary.totalSchemeValue,
      valueChangePercent: period1Report.summary.totalSchemeValue > 0
        ? Math.round(((period2Report.summary.totalSchemeValue - period1Report.summary.totalSchemeValue) / period1Report.summary.totalSchemeValue) * 10000) / 100
        : 0
    };

    // Determine trends
    const getTrend = (changePercent) => {
      if (changePercent > 10) return 'increasing';
      if (changePercent < -10) return 'decreasing';
      return 'stable';
    };

    return {
      reportType: 'scheme_comparison',
      invoiceType,
      period1: {
        startDate: period1Start,
        endDate: period1End,
        summary: period1Report.summary
      },
      period2: {
        startDate: period2Start,
        endDate: period2End,
        summary: period2Report.summary
      },
      comparison: {
        scheme1: {
          ...scheme1Change,
          trend: getTrend(scheme1Change.quantityChangePercent)
        },
        scheme2: {
          ...scheme2Change,
          trend: getTrend(scheme2Change.quantityChangePercent)
        },
        total: {
          ...totalChange,
          trend: getTrend(totalChange.quantityChangePercent)
        }
      },
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

        const claimAccountKey = invoice.claimAccountId?.toString() || 'no_claim_account';
        if (!breakdown.discount2.byClaimAccount[claimAccountKey]) {
          breakdown.discount2.byClaimAccount[claimAccountKey] = {
            claimAccount: invoice.claimAccountId ? {
              id: invoice.claimAccountId
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
          claimAccountId: invoice.claimAccountId || null,
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

      const invoiceData = {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        amount
      };

      // Add customer details if populated
      if (invoice.customerId) {
        invoiceData.customer = {
          id: invoice.customerId._id,
          code: invoice.customerId.code,
          name: invoice.customerId.name
        };
      }

      salesBySalesman[salesmanKey].invoices.push(invoiceData);

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
   * Phase 2: Get salesman dashboard (Requirement 14.1 - Task 47.2)
   * @param {string} salesmanId - Salesman ID
   * @param {Date} startDate - Start date (optional, defaults to current month start)
   * @param {Date} endDate - End date (optional, defaults to current date)
   * @returns {Promise<Object>} Salesman dashboard data
   */
  async getSalesmanDashboard(salesmanId, startDate = null, endDate = null) {
    if (!salesmanId) {
      throw new Error('Salesman ID is required');
    }

    // Default to current month if dates not provided
    if (!startDate || !endDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    }

    const Salesman = require('../models/Salesman');

    // Get salesman details
    const salesman = await Salesman.findById(salesmanId);
    if (!salesman) {
      throw new Error('Salesman not found');
    }

    // Get sales, collections, and performance data
    const [salesReport, collectionsReport, performanceReport] = await Promise.all([
      this.getSalesmanSales(salesmanId, startDate, endDate),
      this.getSalesmanCollections(salesmanId, startDate, endDate),
      this.getSalesmanPerformance(salesmanId, startDate, endDate)
    ]);

    const salesData = salesReport.salesBySalesman[0] || {
      totalSales: 0,
      invoiceCount: 0,
      invoices: []
    };

    const collectionsData = collectionsReport.collectionsBySalesman[0] || {
      totalCollections: 0,
      receiptCount: 0,
      receipts: []
    };

    return {
      reportType: 'salesman_dashboard',
      salesmanId,
      salesman: {
        id: salesman._id,
        code: salesman.code,
        name: salesman.name,
        commissionRate: salesman.commissionRate,
        routeId: salesman.routeId
      },
      period: { startDate, endDate },
      summary: {
        totalSales: salesData.totalSales,
        totalCollections: collectionsData.totalCollections,
        invoiceCount: salesData.invoiceCount,
        receiptCount: collectionsData.receiptCount,
        salesTarget: performanceReport.performance.sales.target,
        collectionsTarget: performanceReport.performance.collections.target,
        salesAchievement: performanceReport.performance.sales.achievement,
        collectionsAchievement: performanceReport.performance.collections.achievement
      },
      recentInvoices: salesData.invoices.slice(0, 10), // Last 10 invoices
      recentReceipts: collectionsData.receipts.slice(0, 10), // Last 10 receipts
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
  /**
   * Phase 2: Get warehouse stock report (Task 49.1 - Requirement 14.3)
   * @param {string} warehouseId - Optional warehouse ID filter
   * @param {Object} options - Optional filters
   * @param {boolean} options.lowStockOnly - Show only low stock items
   * @param {number} options.lowStockThreshold - Threshold for low stock
   * @returns {Promise<Object>} Warehouse stock report
   */
  async getWarehouseStockReport(warehouseId = null, options = {}) {
    const { lowStockOnly = false, lowStockThreshold = 10 } = options;

    const StockMovement = require('../models/StockMovement');
    const Warehouse = require('../models/Warehouse');

    // Get all active warehouses or specific warehouse
    const warehouseQuery = { isActive: true };
    if (warehouseId) {
      warehouseQuery._id = warehouseId;
    }

    const warehouses = await Warehouse.find(warehouseQuery).sort({ name: 1 });

    if (warehouses.length === 0) {
      throw new Error(warehouseId ? 'Warehouse not found' : 'No active warehouses found');
    }

    const warehouseStockData = [];

    for (const warehouse of warehouses) {
      // Get all stock movements for this warehouse
      const stockLevels = await StockMovement.aggregate([
        {
          $match: {
            $or: [
              { warehouse: warehouse._id },
              { 'transferInfo.toWarehouse': warehouse._id }
            ]
          }
        },
        {
          $group: {
            _id: '$itemId',
            totalIn: {
              $sum: {
                $cond: [
                  { $eq: ['$movementType', 'in'] },
                  '$quantity',
                  0
                ]
              }
            },
            totalOut: {
              $sum: {
                $cond: [
                  { $eq: ['$movementType', 'out'] },
                  { $abs: '$quantity' },
                  0
                ]
              }
            },
            lastMovement: { $max: '$movementDate' }
          }
        },
        {
          $project: {
            itemId: '$_id',
            quantity: { $subtract: ['$totalIn', '$totalOut'] },
            lastMovement: 1
          }
        },
        {
          $match: {
            quantity: { $gt: 0 }
          }
        },
        {
          $lookup: {
            from: 'items',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item'
          }
        },
        { $unwind: '$item' },
        {
          $project: {
            _id: 0,
            item: {
              _id: '$item._id',
              code: '$item.code',
              name: '$item.name',
              category: '$item.category',
              unit: '$item.unit'
            },
            quantity: 1,
            minStock: { $ifNull: ['$item.stock.minStock', lowStockThreshold] },
            maxStock: { $ifNull: ['$item.stock.maxStock', 1000] },
            lastMovement: 1,
            isLowStock: {
              $lte: ['$quantity', { $ifNull: ['$item.stock.minStock', lowStockThreshold] }]
            }
          }
        },
        { $sort: { 'item.name': 1 } }
      ]);

      // Filter for low stock only if requested
      const filteredStockLevels = lowStockOnly
        ? stockLevels.filter(item => item.isLowStock)
        : stockLevels;

      warehouseStockData.push({
        warehouse: {
          _id: warehouse._id,
          code: warehouse.code,
          name: warehouse.name,
          location: warehouse.location
        },
        itemCount: filteredStockLevels.length,
        totalQuantity: filteredStockLevels.reduce((sum, item) => sum + item.quantity, 0),
        lowStockCount: filteredStockLevels.filter(item => item.isLowStock).length,
        items: filteredStockLevels
      });
    }

    return {
      reportType: 'warehouse_stock',
      warehouseId: warehouseId || null,
      filters: {
        lowStockOnly,
        lowStockThreshold
      },
      summary: {
        totalWarehouses: warehouseStockData.length,
        totalItems: warehouseStockData.reduce((sum, wh) => sum + wh.itemCount, 0),
        totalQuantity: warehouseStockData.reduce((sum, wh) => sum + wh.totalQuantity, 0),
        totalLowStockItems: warehouseStockData.reduce((sum, wh) => sum + wh.lowStockCount, 0)
      },
      warehouses: warehouseStockData,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get warehouse movement report (Task 49.2 - Requirement 14.3)
   * @param {string} warehouseId - Warehouse ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Optional filters
   * @param {string} options.itemId - Filter by item ID
   * @param {string} options.movementType - Filter by movement type (in/out)
   * @returns {Promise<Object>} Warehouse movement report
   */
  async getWarehouseMovementReport(warehouseId, startDate, endDate, options = {}) {
    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const { itemId, movementType } = options;

    const StockMovement = require('../models/StockMovement');
    const Warehouse = require('../models/Warehouse');

    // Verify warehouse exists
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Build match query
    const matchQuery = {
      movementDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      $or: [
        { warehouse: warehouse._id },
        { 'transferInfo.fromWarehouse': warehouse._id },
        { 'transferInfo.toWarehouse': warehouse._id }
      ]
    };

    if (itemId) {
      matchQuery.itemId = itemId;
    }

    if (movementType) {
      matchQuery.movementType = movementType;
    }

    // Get movements
    const movements = await StockMovement.find(matchQuery)
      .populate('itemId', 'code name category unit')
      .populate('warehouse', 'code name')
      .populate('transferInfo.fromWarehouse', 'code name')
      .populate('transferInfo.toWarehouse', 'code name')
      .sort({ movementDate: -1 });

    // Calculate summary statistics
    const summary = {
      totalMovements: movements.length,
      totalIn: 0,
      totalOut: 0,
      transfersIn: 0,
      transfersOut: 0,
      adjustments: 0
    };

    const movementsByType = {
      in: [],
      out: [],
      adjustment: []
    };

    const movementsByItem = {};

    movements.forEach(movement => {
      const quantity = Math.abs(movement.quantity);
      const isTransferIn = movement.referenceType === 'warehouse_transfer' &&
        movement.transferInfo?.toWarehouse?._id?.equals(warehouse._id);
      const isTransferOut = movement.referenceType === 'warehouse_transfer' &&
        movement.transferInfo?.fromWarehouse?._id?.equals(warehouse._id);

      // Update summary
      if (movement.movementType === 'in' || isTransferIn) {
        summary.totalIn += quantity;
        if (isTransferIn) summary.transfersIn += quantity;
      } else if (movement.movementType === 'out' || isTransferOut) {
        summary.totalOut += quantity;
        if (isTransferOut) summary.transfersOut += quantity;
      } else if (movement.movementType === 'adjustment') {
        summary.adjustments += quantity;
      }

      // Group by type
      movementsByType[movement.movementType].push(movement);

      // Group by item
      const itemKey = movement.itemId._id.toString();
      if (!movementsByItem[itemKey]) {
        movementsByItem[itemKey] = {
          item: {
            _id: movement.itemId._id,
            code: movement.itemId.code,
            name: movement.itemId.name,
            category: movement.itemId.category,
            unit: movement.itemId.unit
          },
          totalIn: 0,
          totalOut: 0,
          netChange: 0,
          movementCount: 0
        };
      }

      movementsByItem[itemKey].movementCount++;
      if (movement.movementType === 'in' || isTransferIn) {
        movementsByItem[itemKey].totalIn += quantity;
        movementsByItem[itemKey].netChange += quantity;
      } else if (movement.movementType === 'out' || isTransferOut) {
        movementsByItem[itemKey].totalOut += quantity;
        movementsByItem[itemKey].netChange -= quantity;
      }
    });

    summary.netChange = summary.totalIn - summary.totalOut;

    return {
      reportType: 'warehouse_movement',
      warehouse: {
        _id: warehouse._id,
        code: warehouse.code,
        name: warehouse.name,
        location: warehouse.location
      },
      period: { startDate, endDate },
      filters: {
        itemId: itemId || null,
        movementType: movementType || null
      },
      summary,
      movementsByType: {
        in: movementsByType.in.length,
        out: movementsByType.out.length,
        adjustment: movementsByType.adjustment.length
      },
      movementsByItem: Object.values(movementsByItem).sort((a, b) =>
        b.movementCount - a.movementCount
      ),
      movements: movements.map(m => ({
        _id: m._id,
        movementType: m.movementType,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        quantity: m.quantity,
        item: {
          _id: m.itemId._id,
          code: m.itemId.code,
          name: m.itemId.name,
          unit: m.itemId.unit
        },
        warehouse: m.warehouse ? {
          _id: m.warehouse._id,
          code: m.warehouse.code,
          name: m.warehouse.name
        } : null,
        transferInfo: m.transferInfo ? {
          fromWarehouse: m.transferInfo.fromWarehouse ? {
            _id: m.transferInfo.fromWarehouse._id,
            code: m.transferInfo.fromWarehouse.code,
            name: m.transferInfo.fromWarehouse.name
          } : null,
          toWarehouse: m.transferInfo.toWarehouse ? {
            _id: m.transferInfo.toWarehouse._id,
            code: m.transferInfo.toWarehouse.code,
            name: m.transferInfo.toWarehouse.name
          } : null
        } : null,
        movementDate: m.movementDate,
        notes: m.notes
      })),
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get discount analysis report (Task 50.1 - Requirement 14.4)
   * Wrapper method for getDiscountBreakdown with simplified interface
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Optional filters
   * @param {string} options.discountType - Discount type filter ('discount1', 'discount2', 'all')
   * @param {string} options.claimAccountId - Optional claim account ID filter
   * @returns {Promise<Object>} Discount analysis report
   */
  async getDiscountAnalysis(startDate, endDate, options = {}) {
    const { discountType = 'all', claimAccountId } = options;

    return await this.getDiscountBreakdown({
      startDate,
      endDate,
      discountType,
      claimAccountId
    });
  }

  /**
   * Phase 2: Get discount trend report (Task 50.2 - Requirement 14.4)
   * Shows discount trends over time and compares discount types
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Optional filters
   * @param {string} options.groupBy - Grouping period ('day', 'week', 'month')
   * @param {string} options.discountType - Discount type filter ('discount1', 'discount2', 'all')
   * @returns {Promise<Object>} Discount trend report
   */
  async getDiscountTrend(startDate, endDate, options = {}) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const { groupBy = 'month', discountType = 'all' } = options;

    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    const invoices = await Invoice.find(query)
      .sort({ invoiceDate: 1 });

    // Group invoices by time period
    const periods = {};
    const periodFormat = {
      day: (date) => date.toISOString().split('T')[0],
      week: (date) => {
        const d = new Date(date);
        const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      },
      month: (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    const formatDate = periodFormat[groupBy] || periodFormat.month;

    invoices.forEach(invoice => {
      const period = formatDate(invoice.invoiceDate);

      if (!periods[period]) {
        periods[period] = {
          period,
          discount1: {
            invoiceCount: 0,
            totalAmount: 0
          },
          discount2: {
            invoiceCount: 0,
            totalAmount: 0
          },
          total: {
            invoiceCount: 0,
            totalAmount: 0
          }
        };
      }

      let discount1Total = 0;
      let discount2Total = 0;
      let hasDiscount1 = false;
      let hasDiscount2 = false;

      invoice.items.forEach(item => {
        const d1 = item.discount1Amount || 0;
        const d2 = item.discount2Amount || 0;

        discount1Total += d1;
        discount2Total += d2;

        if (d1 > 0) hasDiscount1 = true;
        if (d2 > 0) hasDiscount2 = true;
      });

      if (hasDiscount1 && (discountType === 'all' || discountType === 'discount1')) {
        periods[period].discount1.invoiceCount++;
        periods[period].discount1.totalAmount += discount1Total;
      }

      if (hasDiscount2 && (discountType === 'all' || discountType === 'discount2')) {
        periods[period].discount2.invoiceCount++;
        periods[period].discount2.totalAmount += discount2Total;
      }

      periods[period].total.invoiceCount++;
      periods[period].total.totalAmount += discount1Total + discount2Total;
    });

    // Convert to array and sort by period
    const trendData = Object.values(periods)
      .map(p => ({
        ...p,
        discount1: {
          ...p.discount1,
          totalAmount: Math.round(p.discount1.totalAmount * 100) / 100
        },
        discount2: {
          ...p.discount2,
          totalAmount: Math.round(p.discount2.totalAmount * 100) / 100
        },
        total: {
          ...p.total,
          totalAmount: Math.round(p.total.totalAmount * 100) / 100
        }
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate summary statistics
    const summary = {
      totalPeriods: trendData.length,
      discount1: {
        totalInvoices: trendData.reduce((sum, p) => sum + p.discount1.invoiceCount, 0),
        totalAmount: Math.round(trendData.reduce((sum, p) => sum + p.discount1.totalAmount, 0) * 100) / 100,
        averagePerPeriod: 0
      },
      discount2: {
        totalInvoices: trendData.reduce((sum, p) => sum + p.discount2.invoiceCount, 0),
        totalAmount: Math.round(trendData.reduce((sum, p) => sum + p.discount2.totalAmount, 0) * 100) / 100,
        averagePerPeriod: 0
      },
      total: {
        totalInvoices: trendData.reduce((sum, p) => sum + p.total.invoiceCount, 0),
        totalAmount: Math.round(trendData.reduce((sum, p) => sum + p.total.totalAmount, 0) * 100) / 100,
        averagePerPeriod: 0
      }
    };

    if (summary.totalPeriods > 0) {
      summary.discount1.averagePerPeriod = Math.round((summary.discount1.totalAmount / summary.totalPeriods) * 100) / 100;
      summary.discount2.averagePerPeriod = Math.round((summary.discount2.totalAmount / summary.totalPeriods) * 100) / 100;
      summary.total.averagePerPeriod = Math.round((summary.total.totalAmount / summary.totalPeriods) * 100) / 100;
    }

    // Calculate trends (comparing first and last periods)
    const trends = {
      discount1: 'stable',
      discount2: 'stable',
      total: 'stable'
    };

    if (trendData.length >= 2) {
      const firstPeriod = trendData[0];
      const lastPeriod = trendData[trendData.length - 1];

      const calculateTrend = (first, last) => {
        if (first === 0) return last > 0 ? 'increasing' : 'stable';
        const change = ((last - first) / first) * 100;
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
      };

      trends.discount1 = calculateTrend(firstPeriod.discount1.totalAmount, lastPeriod.discount1.totalAmount);
      trends.discount2 = calculateTrend(firstPeriod.discount2.totalAmount, lastPeriod.discount2.totalAmount);
      trends.total = calculateTrend(firstPeriod.total.totalAmount, lastPeriod.total.totalAmount);
    }

    return {
      reportType: 'discount_trend',
      period: { startDate, endDate },
      groupBy,
      discountType,
      summary,
      trends,
      trendData,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get comprehensive tax breakdown report (Task 51.1 - Requirement 14.5)
   * Separates GST, advance tax, non-filer tax
   * Groups by tax type and rate
   * @param {Object} params - Report parameters
   * @param {Date} params.startDate - Start date
   * @param {Date} params.endDate - End date
   * @param {string} params.invoiceType - Invoice type filter ('sales', 'purchase', 'all')
   * @param {string} params.customerId - Optional customer ID filter
   * @param {string} params.supplierId - Optional supplier ID filter
   * @returns {Promise<Object>} Tax breakdown report
   */
  async getTaxBreakdownReport(params) {
    const { startDate, endDate, invoiceType = 'all', customerId, supplierId } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Build query based on invoice type
    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'confirmed'
    };

    if (invoiceType === 'sales') {
      query.type = { $in: ['sales', 'return_sales'] };
    } else if (invoiceType === 'purchase') {
      query.type = { $in: ['purchase', 'return_purchase'] };
    } else {
      query.type = { $in: ['sales', 'return_sales', 'purchase', 'return_purchase'] };
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .sort({ invoiceDate: 1 });

    // Initialize tax breakdown structure
    const breakdown = {
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
      incomeTax: {
        rate: 5.5,
        invoiceCount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        invoices: []
      },
      total: {
        invoiceCount: 0,
        totalTaxableAmount: 0,
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
        partyCode: invoice.customerId?.code || invoice.supplierId?.code,
        partyName: invoice.customerId?.name || invoice.supplierId?.name
      };

      let invoiceHasGST18 = false;
      let invoiceHasGST4 = false;
      let invoiceHasAdvanceTax0_5 = false;
      let invoiceHasAdvanceTax2_5 = false;
      let invoiceHasNonFilerGST = false;
      let invoiceHasIncomeTax = false;

      let gst18Taxable = 0;
      let gst18Amount = 0;
      let gst4Taxable = 0;
      let gst4Amount = 0;
      let advanceTax0_5Taxable = 0;
      let advanceTax0_5Amount = 0;
      let advanceTax2_5Taxable = 0;
      let advanceTax2_5Amount = 0;
      let nonFilerGSTTaxable = 0;
      let nonFilerGSTAmount = 0;
      let incomeTaxTaxable = 0;
      let incomeTaxAmount = 0;

      // Process invoice items
      invoice.items.forEach(item => {
        const quantity = Math.abs(item.quantity);
        const unitPrice = item.unitPrice || 0;
        const lineTotal = quantity * unitPrice;

        // Calculate discount
        const discount1 = item.discount1Amount || ((lineTotal * (item.discount1Percent || 0)) / 100);
        const afterDiscount1 = lineTotal - discount1;
        const discount2 = item.discount2Amount || ((afterDiscount1 * (item.discount2Percent || 0)) / 100);
        const taxableAmount = afterDiscount1 - discount2;

        // GST calculation
        const gstRate = item.gstRate || 18;
        const gstAmount = item.gstAmount || ((taxableAmount * gstRate) / 100);

        if (gstRate === 18) {
          invoiceHasGST18 = true;
          gst18Taxable += taxableAmount;
          gst18Amount += gstAmount;
        } else if (gstRate === 4) {
          invoiceHasGST4 = true;
          gst4Taxable += taxableAmount;
          gst4Amount += gstAmount;
        }

        // Advance tax calculation
        const advanceTaxPercent = item.advanceTaxPercent || 0;
        const advanceTaxAmount = item.advanceTaxAmount || ((taxableAmount * advanceTaxPercent) / 100);

        if (advanceTaxPercent === 0.5) {
          invoiceHasAdvanceTax0_5 = true;
          advanceTax0_5Taxable += taxableAmount;
          advanceTax0_5Amount += advanceTaxAmount;
        } else if (advanceTaxPercent === 2.5) {
          invoiceHasAdvanceTax2_5 = true;
          advanceTax2_5Taxable += taxableAmount;
          advanceTax2_5Amount += advanceTaxAmount;
        }
      });

      // Non-filer GST (from invoice totals)
      if (invoice.totals?.nonFilerGSTTotal && invoice.totals.nonFilerGSTTotal > 0) {
        invoiceHasNonFilerGST = true;
        nonFilerGSTTaxable = invoice.totals.subtotal || 0;
        nonFilerGSTAmount = invoice.totals.nonFilerGSTTotal;
      }

      // Income tax (from invoice totals)
      if (invoice.totals?.incomeTaxTotal && invoice.totals.incomeTaxTotal > 0) {
        invoiceHasIncomeTax = true;
        incomeTaxTaxable = invoice.totals.subtotal || 0;
        incomeTaxAmount = invoice.totals.incomeTaxTotal;
      }

      // Add to GST 18% breakdown
      if (invoiceHasGST18) {
        breakdown.gst.gst18.invoiceCount++;
        breakdown.gst.gst18.taxableAmount += gst18Taxable;
        breakdown.gst.gst18.taxAmount += gst18Amount;
        breakdown.gst.gst18.invoices.push({
          ...invoiceData,
          taxableAmount: gst18Taxable,
          taxAmount: gst18Amount
        });
      }

      // Add to GST 4% breakdown
      if (invoiceHasGST4) {
        breakdown.gst.gst4.invoiceCount++;
        breakdown.gst.gst4.taxableAmount += gst4Taxable;
        breakdown.gst.gst4.taxAmount += gst4Amount;
        breakdown.gst.gst4.invoices.push({
          ...invoiceData,
          taxableAmount: gst4Taxable,
          taxAmount: gst4Amount
        });
      }

      // Add to Advance Tax 0.5% breakdown
      if (invoiceHasAdvanceTax0_5) {
        breakdown.advanceTax.rate0_5.invoiceCount++;
        breakdown.advanceTax.rate0_5.taxableAmount += advanceTax0_5Taxable;
        breakdown.advanceTax.rate0_5.taxAmount += advanceTax0_5Amount;
        breakdown.advanceTax.rate0_5.invoices.push({
          ...invoiceData,
          taxableAmount: advanceTax0_5Taxable,
          taxAmount: advanceTax0_5Amount
        });
      }

      // Add to Advance Tax 2.5% breakdown
      if (invoiceHasAdvanceTax2_5) {
        breakdown.advanceTax.rate2_5.invoiceCount++;
        breakdown.advanceTax.rate2_5.taxableAmount += advanceTax2_5Taxable;
        breakdown.advanceTax.rate2_5.taxAmount += advanceTax2_5Amount;
        breakdown.advanceTax.rate2_5.invoices.push({
          ...invoiceData,
          taxableAmount: advanceTax2_5Taxable,
          taxAmount: advanceTax2_5Amount
        });
      }

      // Add to Non-filer GST breakdown
      if (invoiceHasNonFilerGST) {
        breakdown.nonFilerGST.invoiceCount++;
        breakdown.nonFilerGST.taxableAmount += nonFilerGSTTaxable;
        breakdown.nonFilerGST.taxAmount += nonFilerGSTAmount;
        breakdown.nonFilerGST.invoices.push({
          ...invoiceData,
          taxableAmount: nonFilerGSTTaxable,
          taxAmount: nonFilerGSTAmount
        });
      }

      // Add to Income Tax breakdown
      if (invoiceHasIncomeTax) {
        breakdown.incomeTax.invoiceCount++;
        breakdown.incomeTax.taxableAmount += incomeTaxTaxable;
        breakdown.incomeTax.taxAmount += incomeTaxAmount;
        breakdown.incomeTax.invoices.push({
          ...invoiceData,
          taxableAmount: incomeTaxTaxable,
          taxAmount: incomeTaxAmount
        });
      }

      // Update GST totals
      if (invoiceHasGST18 || invoiceHasGST4) {
        breakdown.gst.total.invoiceCount++;
        breakdown.gst.total.taxableAmount += gst18Taxable + gst4Taxable;
        breakdown.gst.total.taxAmount += gst18Amount + gst4Amount;
      }

      // Update Advance Tax totals
      if (invoiceHasAdvanceTax0_5 || invoiceHasAdvanceTax2_5) {
        breakdown.advanceTax.total.invoiceCount++;
        breakdown.advanceTax.total.taxableAmount += advanceTax0_5Taxable + advanceTax2_5Taxable;
        breakdown.advanceTax.total.taxAmount += advanceTax0_5Amount + advanceTax2_5Amount;
      }

      // Update grand totals
      breakdown.total.invoiceCount++;
      breakdown.total.totalTaxableAmount += gst18Taxable + gst4Taxable + advanceTax0_5Taxable + advanceTax2_5Taxable + nonFilerGSTTaxable + incomeTaxTaxable;
      breakdown.total.totalTaxAmount += gst18Amount + gst4Amount + advanceTax0_5Amount + advanceTax2_5Amount + nonFilerGSTAmount + incomeTaxAmount;
    });

    // Round all amounts to 2 decimal places
    const roundAmounts = (obj) => {
      if (obj.taxableAmount !== undefined) obj.taxableAmount = Math.round(obj.taxableAmount * 100) / 100;
      if (obj.taxAmount !== undefined) obj.taxAmount = Math.round(obj.taxAmount * 100) / 100;
      if (obj.totalTaxableAmount !== undefined) obj.totalTaxableAmount = Math.round(obj.totalTaxableAmount * 100) / 100;
      if (obj.totalTaxAmount !== undefined) obj.totalTaxAmount = Math.round(obj.totalTaxAmount * 100) / 100;
    };

    roundAmounts(breakdown.gst.gst18);
    roundAmounts(breakdown.gst.gst4);
    roundAmounts(breakdown.gst.total);
    roundAmounts(breakdown.advanceTax.rate0_5);
    roundAmounts(breakdown.advanceTax.rate2_5);
    roundAmounts(breakdown.advanceTax.total);
    roundAmounts(breakdown.nonFilerGST);
    roundAmounts(breakdown.incomeTax);
    roundAmounts(breakdown.total);

    return {
      reportType: 'tax_breakdown',
      period: { startDate, endDate },
      invoiceType,
      breakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get tax report (wrapper for getTaxBreakdownReport)
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Tax report
   */
  async getTaxReport(params) {
    return await this.getTaxBreakdownReport(params);
  }

  /**
   * Phase 2: Generate tax compliance report for SRB/FBR (Task 51.2 - Requirement 14.5)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Tax compliance report
   */
  async getTaxComplianceReport(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get comprehensive tax breakdown
    const taxBreakdown = await this.getTaxBreakdownReport({
      startDate,
      endDate,
      invoiceType: 'all'
    });

    // Get sales tax breakdown
    const salesTaxBreakdown = await this.getTaxBreakdownReport({
      startDate,
      endDate,
      invoiceType: 'sales'
    });

    // Get purchase tax breakdown
    const purchaseTaxBreakdown = await this.getTaxBreakdownReport({
      startDate,
      endDate,
      invoiceType: 'purchase'
    });

    // Calculate net GST payable (Output GST - Input GST)
    const outputGST = salesTaxBreakdown.breakdown.gst.total.taxAmount;
    const inputGST = purchaseTaxBreakdown.breakdown.gst.total.taxAmount;
    const netGSTPayable = outputGST - inputGST;

    // Prepare compliance summary
    const complianceSummary = {
      // GST Summary
      gst: {
        outputGST: {
          gst18: salesTaxBreakdown.breakdown.gst.gst18.taxAmount,
          gst4: salesTaxBreakdown.breakdown.gst.gst4.taxAmount,
          total: outputGST
        },
        inputGST: {
          gst18: purchaseTaxBreakdown.breakdown.gst.gst18.taxAmount,
          gst4: purchaseTaxBreakdown.breakdown.gst.gst4.taxAmount,
          total: inputGST
        },
        netGSTPayable: Math.round(netGSTPayable * 100) / 100
      },

      // Advance Tax Summary
      advanceTax: {
        rate0_5: {
          collected: salesTaxBreakdown.breakdown.advanceTax.rate0_5.taxAmount,
          paid: purchaseTaxBreakdown.breakdown.advanceTax.rate0_5.taxAmount,
          net: Math.round((salesTaxBreakdown.breakdown.advanceTax.rate0_5.taxAmount - purchaseTaxBreakdown.breakdown.advanceTax.rate0_5.taxAmount) * 100) / 100
        },
        rate2_5: {
          collected: salesTaxBreakdown.breakdown.advanceTax.rate2_5.taxAmount,
          paid: purchaseTaxBreakdown.breakdown.advanceTax.rate2_5.taxAmount,
          net: Math.round((salesTaxBreakdown.breakdown.advanceTax.rate2_5.taxAmount - purchaseTaxBreakdown.breakdown.advanceTax.rate2_5.taxAmount) * 100) / 100
        },
        total: {
          collected: salesTaxBreakdown.breakdown.advanceTax.total.taxAmount,
          paid: purchaseTaxBreakdown.breakdown.advanceTax.total.taxAmount,
          net: Math.round((salesTaxBreakdown.breakdown.advanceTax.total.taxAmount - purchaseTaxBreakdown.breakdown.advanceTax.total.taxAmount) * 100) / 100
        }
      },

      // Non-filer GST Summary
      nonFilerGST: {
        collected: salesTaxBreakdown.breakdown.nonFilerGST.taxAmount,
        invoiceCount: salesTaxBreakdown.breakdown.nonFilerGST.invoiceCount
      },

      // Income Tax Summary
      incomeTax: {
        collected: taxBreakdown.breakdown.incomeTax.taxAmount,
        invoiceCount: taxBreakdown.breakdown.incomeTax.invoiceCount
      },

      // Total Tax Summary
      totalTax: {
        collected: Math.round((outputGST + salesTaxBreakdown.breakdown.advanceTax.total.taxAmount + salesTaxBreakdown.breakdown.nonFilerGST.taxAmount + taxBreakdown.breakdown.incomeTax.taxAmount) * 100) / 100,
        paid: Math.round((inputGST + purchaseTaxBreakdown.breakdown.advanceTax.total.taxAmount) * 100) / 100,
        netPayable: Math.round((netGSTPayable + (salesTaxBreakdown.breakdown.advanceTax.total.taxAmount - purchaseTaxBreakdown.breakdown.advanceTax.total.taxAmount) + salesTaxBreakdown.breakdown.nonFilerGST.taxAmount + taxBreakdown.breakdown.incomeTax.taxAmount) * 100) / 100
      }
    };

    // Prepare detailed breakdowns for compliance
    const detailedBreakdowns = {
      salesGST18: {
        invoiceCount: salesTaxBreakdown.breakdown.gst.gst18.invoiceCount,
        taxableAmount: salesTaxBreakdown.breakdown.gst.gst18.taxableAmount,
        taxAmount: salesTaxBreakdown.breakdown.gst.gst18.taxAmount
      },
      salesGST4: {
        invoiceCount: salesTaxBreakdown.breakdown.gst.gst4.invoiceCount,
        taxableAmount: salesTaxBreakdown.breakdown.gst.gst4.taxableAmount,
        taxAmount: salesTaxBreakdown.breakdown.gst.gst4.taxAmount
      },
      purchaseGST18: {
        invoiceCount: purchaseTaxBreakdown.breakdown.gst.gst18.invoiceCount,
        taxableAmount: purchaseTaxBreakdown.breakdown.gst.gst18.taxableAmount,
        taxAmount: purchaseTaxBreakdown.breakdown.gst.gst18.taxAmount
      },
      purchaseGST4: {
        invoiceCount: purchaseTaxBreakdown.breakdown.gst.gst4.invoiceCount,
        taxableAmount: purchaseTaxBreakdown.breakdown.gst.gst4.taxableAmount,
        taxAmount: purchaseTaxBreakdown.breakdown.gst.gst4.taxAmount
      }
    };

    return {
      reportType: 'tax_compliance',
      period: { startDate, endDate },
      complianceSummary,
      detailedBreakdowns,
      fullTaxBreakdown: taxBreakdown.breakdown,
      generatedAt: new Date(),
      reportingAuthorities: {
        SRB: 'Sindh Revenue Board',
        FBR: 'Federal Board of Revenue'
      },
      notes: [
        'This report is prepared for tax compliance purposes',
        'Net GST Payable = Output GST - Input GST',
        'Advance tax and non-filer GST are additional to regular GST',
        'All amounts are in PKR'
      ]
    };
  }

  /**
   * Phase 2: Get discount breakdown report (Task 50 - Requirement 14.4)
   * @param {Object} params - Report parameters
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

    if (invoiceType === 'sales') {
      query.type = { $in: ['sales', 'return_sales'] };
    } else if (invoiceType === 'purchase') {
      query.type = { $in: ['purchase', 'return_purchase'] };
    }

    if (claimAccountId) {
      query['items.claimAccountId'] = claimAccountId;
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('items.claimAccountId', 'code name accountType')
      .sort({ invoiceDate: 1 });

    // Initialize summary
    const summary = {
      totalInvoices: 0,
      totalInvoiceAmount: 0,
      totalDiscountAmount: 0,
      totalDiscount1Amount: 0,
      totalDiscount2Amount: 0,
      discount1Percentage: 0,
      discount2Percentage: 0,
      totalDiscountPercentage: 0
    };

    const invoiceTypeBreakdown = {
      sales: { invoiceCount: 0, discount1Amount: 0, discount2Amount: 0, totalDiscountAmount: 0 },
      purchase: { invoiceCount: 0, discount1Amount: 0, discount2Amount: 0, totalDiscountAmount: 0 }
    };

    const claimAccountMap = new Map();
    const invoiceDetails = [];

    // Process invoices
    invoices.forEach(invoice => {
      const isSales = invoice.type === 'sales' || invoice.type === 'return_sales';
      const typeKey = isSales ? 'sales' : 'purchase';

      let invoiceDiscount1 = 0;
      let invoiceDiscount2 = 0;

      // Calculate discounts from items
      invoice.items.forEach(item => {
        const discount1 = item.discount1Amount || 0;
        const discount2 = item.discount2Amount || 0;

        invoiceDiscount1 += discount1;
        invoiceDiscount2 += discount2;

        // Track claim accounts for discount2
        if (discount2 > 0 && item.claimAccountId) {
          const claimId = item.claimAccountId._id.toString();
          if (!claimAccountMap.has(claimId)) {
            claimAccountMap.set(claimId, {
              claimAccount: {
                _id: item.claimAccountId._id,
                code: item.claimAccountId.code,
                name: item.claimAccountId.name,
                accountType: item.claimAccountId.accountType
              },
              discount2Amount: 0,
              invoiceCount: 0
            });
          }
          const claimData = claimAccountMap.get(claimId);
          claimData.discount2Amount += discount2;
        }
      });

      // Use totals if available, otherwise use calculated amounts
      const discount1Amount = invoice.totals?.totalDiscount1 || invoiceDiscount1;
      const discount2Amount = invoice.totals?.totalDiscount2 || invoiceDiscount2;
      const totalDiscount = discount1Amount + discount2Amount;
      const grandTotal = invoice.totals?.grandTotal || 0;

      // Update summary
      summary.totalInvoices++;
      summary.totalInvoiceAmount += grandTotal;
      summary.totalDiscountAmount += totalDiscount;
      summary.totalDiscount1Amount += discount1Amount;
      summary.totalDiscount2Amount += discount2Amount;

      // Update type breakdown
      invoiceTypeBreakdown[typeKey].invoiceCount++;
      invoiceTypeBreakdown[typeKey].discount1Amount += discount1Amount;
      invoiceTypeBreakdown[typeKey].discount2Amount += discount2Amount;
      invoiceTypeBreakdown[typeKey].totalDiscountAmount += totalDiscount;

      // Track claim account invoice count
      if (discount2Amount > 0) {
        invoice.items.forEach(item => {
          if (item.claimAccountId && item.discount2Amount > 0) {
            const claimId = item.claimAccountId._id.toString();
            const claimData = claimAccountMap.get(claimId);
            if (claimData && !claimData.invoiceIds) {
              claimData.invoiceIds = new Set();
            }
            if (claimData) {
              claimData.invoiceIds.add(invoice._id.toString());
            }
          }
        });
      }

      invoiceDetails.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        type: invoice.type,
        partyCode: invoice.customerId?.code || invoice.supplierId?.code,
        partyName: invoice.customerId?.name || invoice.supplierId?.name,
        grandTotal,
        discount1Amount,
        discount2Amount,
        totalDiscount
      });
    });

    // Calculate percentages
    if (summary.totalInvoiceAmount > 0) {
      summary.discount1Percentage = Math.round((summary.totalDiscount1Amount / summary.totalInvoiceAmount) * 10000) / 100;
      summary.discount2Percentage = Math.round((summary.totalDiscount2Amount / summary.totalInvoiceAmount) * 10000) / 100;
      summary.totalDiscountPercentage = Math.round((summary.totalDiscountAmount / summary.totalInvoiceAmount) * 10000) / 100;
    }

    // Convert claim account map to array and set invoice counts
    const claimAccountBreakdown = Array.from(claimAccountMap.values()).map(claim => ({
      ...claim,
      invoiceCount: claim.invoiceIds ? claim.invoiceIds.size : 0,
      invoiceIds: undefined
    }));

    return {
      reportType: 'discount-breakdown',
      period: { startDate, endDate },
      filters: { invoiceType, discountType, claimAccountId },
      summary,
      invoiceTypeBreakdown,
      claimAccountBreakdown,
      invoices: invoiceDetails,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get discount analysis report (Task 50.1 - Requirement 14.4)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Discount analysis report
   */
  async getDiscountAnalysis(startDate, endDate, options = {}) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const { discountType = 'all' } = options;

    // Get invoices
    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'confirmed'
    };

    const invoices = await Invoice.find(query)
      .populate('claimAccountId', 'code name accountType')
      .sort({ invoiceDate: 1 });

    // Initialize breakdown
    const breakdown = {
      discount1: {
        invoiceCount: 0,
        totalAmount: 0,
        invoices: []
      },
      discount2: {
        invoiceCount: 0,
        totalAmount: 0,
        byClaimAccount: [],
        invoices: []
      },
      total: {
        invoiceCount: 0,
        totalAmount: 0
      }
    };

    const claimAccountMap = new Map();

    // Process invoices
    invoices.forEach(invoice => {
      let invoiceDiscount1 = 0;
      let invoiceDiscount2 = 0;

      invoice.items.forEach(item => {
        const discount1 = item.discount1Amount || 0;
        const discount2 = item.discount2Amount || 0;

        invoiceDiscount1 += discount1;
        invoiceDiscount2 += discount2;
      });

      // Track claim accounts (at invoice level)
      if (invoiceDiscount2 > 0 && invoice.claimAccountId) {
        const claimId = invoice.claimAccountId._id.toString();
        if (!claimAccountMap.has(claimId)) {
          claimAccountMap.set(claimId, {
            claimAccountId: invoice.claimAccountId._id,
            claimAccountCode: invoice.claimAccountId.code,
            claimAccountName: invoice.claimAccountId.name,
            accountType: invoice.claimAccountId.accountType,
            totalAmount: 0,
            invoiceCount: 0
          });
        }
        const claimData = claimAccountMap.get(claimId);
        claimData.totalAmount += invoiceDiscount2;
        claimData.invoiceCount++;
      }

      // Update discount1 breakdown
      if (invoiceDiscount1 > 0 && (discountType === 'all' || discountType === 'discount1')) {
        breakdown.discount1.invoiceCount++;
        breakdown.discount1.totalAmount += invoiceDiscount1;
        breakdown.discount1.invoices.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoiceDiscount1
        });
      }

      // Update discount2 breakdown
      if (invoiceDiscount2 > 0 && (discountType === 'all' || discountType === 'discount2')) {
        breakdown.discount2.invoiceCount++;
        breakdown.discount2.totalAmount += invoiceDiscount2;
        breakdown.discount2.invoices.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoiceDiscount2
        });
      }

      // Update total
      if (invoiceDiscount1 > 0 || invoiceDiscount2 > 0) {
        breakdown.total.invoiceCount++;
        breakdown.total.totalAmount += invoiceDiscount1 + invoiceDiscount2;
      }
    });

    // Convert claim account map to array
    breakdown.discount2.byClaimAccount = Array.from(claimAccountMap.values());

    return {
      reportType: 'discount_breakdown',
      period: { startDate, endDate },
      breakdown,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get discount trend report (Task 50.2 - Requirement 14.4)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Discount trend report
   */
  async getDiscountTrend(startDate, endDate, options = {}) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const { groupBy = 'month', discountType = 'all' } = options;

    // Get invoices
    const query = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'confirmed'
    };

    const invoices = await Invoice.find(query).sort({ invoiceDate: 1 });

    // Group invoices by period
    const periodMap = new Map();

    invoices.forEach(invoice => {
      let periodKey;
      const invoiceDate = new Date(invoice.invoiceDate);

      if (groupBy === 'day') {
        periodKey = invoiceDate.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        periodKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        periodKey = invoiceDate.getFullYear().toString();
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          discount1: { invoiceCount: 0, totalAmount: 0 },
          discount2: { invoiceCount: 0, totalAmount: 0 },
          total: { invoiceCount: 0, totalAmount: 0 }
        });
      }

      const periodData = periodMap.get(periodKey);
      let invoiceDiscount1 = 0;
      let invoiceDiscount2 = 0;

      invoice.items.forEach(item => {
        invoiceDiscount1 += item.discount1Amount || 0;
        invoiceDiscount2 += item.discount2Amount || 0;
      });

      if (invoiceDiscount1 > 0) {
        periodData.discount1.invoiceCount++;
        periodData.discount1.totalAmount += invoiceDiscount1;
      }

      if (invoiceDiscount2 > 0) {
        periodData.discount2.invoiceCount++;
        periodData.discount2.totalAmount += invoiceDiscount2;
      }

      if (invoiceDiscount1 > 0 || invoiceDiscount2 > 0) {
        periodData.total.invoiceCount++;
        periodData.total.totalAmount += invoiceDiscount1 + invoiceDiscount2;
      }
    });

    const trendData = Array.from(periodMap.values());

    // Calculate summary
    const summary = {
      totalPeriods: trendData.length,
      discount1: {
        totalAmount: trendData.reduce((sum, p) => sum + p.discount1.totalAmount, 0),
        averagePerPeriod: 0
      },
      discount2: {
        totalAmount: trendData.reduce((sum, p) => sum + p.discount2.totalAmount, 0),
        averagePerPeriod: 0
      },
      total: {
        totalAmount: trendData.reduce((sum, p) => sum + p.total.totalAmount, 0),
        averagePerPeriod: 0
      }
    };

    if (summary.totalPeriods > 0) {
      summary.discount1.averagePerPeriod = Math.round((summary.discount1.totalAmount / summary.totalPeriods) * 100) / 100;
      summary.discount2.averagePerPeriod = Math.round((summary.discount2.totalAmount / summary.totalPeriods) * 100) / 100;
      summary.total.averagePerPeriod = Math.round((summary.total.totalAmount / summary.totalPeriods) * 100) / 100;
    }

    // Calculate trends
    const trends = {
      discount1: 'stable',
      discount2: 'stable',
      total: 'stable'
    };

    if (trendData.length >= 2) {
      const firstPeriod = trendData[0];
      const lastPeriod = trendData[trendData.length - 1];

      const calculateTrend = (first, last) => {
        if (first === 0) return last > 0 ? 'increasing' : 'stable';
        const change = ((last - first) / first) * 100;
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
      };

      trends.discount1 = calculateTrend(firstPeriod.discount1.totalAmount, lastPeriod.discount1.totalAmount);
      trends.discount2 = calculateTrend(firstPeriod.discount2.totalAmount, lastPeriod.discount2.totalAmount);
      trends.total = calculateTrend(firstPeriod.total.totalAmount, lastPeriod.total.totalAmount);
    }

    return {
      reportType: 'discount_trend',
      period: { startDate, endDate },
      groupBy,
      summary,
      trends,
      trendData,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get salesman performance dashboard (Task 47.2 - Requirement 14.1)
   * @param {string} salesmanId - Salesman ID
   * @param {Object} options - Dashboard options
   * @returns {Promise<Object>} Salesman dashboard data
   */
  async getSalesmanDashboard(salesmanId, options = {}) {
    const { startDate, endDate } = options;

    if (!salesmanId) {
      throw new Error('Salesman ID is required');
    }

    // Get salesman details
    const Salesman = require('../models/Salesman');
    const salesman = await Salesman.findById(salesmanId);

    if (!salesman) {
      throw new Error('Salesman not found');
    }

    // Build date query
    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery.invoiceDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      dateQuery.invoiceDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      dateQuery.invoiceDate = { $lte: new Date(endDate) };
    }

    // Get sales data
    const salesQuery = {
      type: { $in: ['sales', 'return_sales'] },
      salesmanId: salesmanId,
      status: 'confirmed',
      ...dateQuery
    };

    const salesInvoices = await Invoice.find(salesQuery)
      .populate('customerId', 'code name')
      .sort({ invoiceDate: -1 });

    // Calculate sales metrics
    let totalSales = 0;
    let totalSalesInvoices = 0;
    let totalSalesReturns = 0;
    let totalSalesReturnInvoices = 0;

    salesInvoices.forEach(invoice => {
      const amount = invoice.totals?.grandTotal || 0;
      if (invoice.type === 'sales') {
        totalSales += amount;
        totalSalesInvoices++;
      } else if (invoice.type === 'return_sales') {
        totalSalesReturns += amount;
        totalSalesReturnInvoices++;
      }
    });

    const netSales = totalSales - totalSalesReturns;

    // Get collections data
    const CashReceipt = require('../models/CashReceipt');
    const collectionsQuery = {
      salesmanId: salesmanId,
      status: 'confirmed',
      ...dateQuery
    };

    const collections = await CashReceipt.find(collectionsQuery)
      .populate('customerId', 'code name')
      .sort({ receiptDate: -1 });

    // Calculate collections metrics
    let totalCollections = 0;
    let totalCollectionReceipts = 0;

    collections.forEach(receipt => {
      totalCollections += receipt.amount || 0;
      totalCollectionReceipts++;
    });

    // Calculate commission (if applicable)
    const commissionRate = salesman.commissionRate || 0;
    const salesCommission = (netSales * commissionRate) / 100;
    const collectionsCommission = (totalCollections * commissionRate) / 100;
    const totalCommission = salesCommission + collectionsCommission;

    // Get top customers by sales
    const customerSalesMap = new Map();
    salesInvoices.forEach(invoice => {
      if (invoice.type === 'sales' && invoice.customerId) {
        const customerId = invoice.customerId._id.toString();
        const customerName = invoice.customerId.name;
        const customerCode = invoice.customerId.code;
        const amount = invoice.totals?.grandTotal || 0;

        if (!customerSalesMap.has(customerId)) {
          customerSalesMap.set(customerId, {
            customerId,
            customerCode,
            customerName,
            totalSales: 0,
            invoiceCount: 0
          });
        }

        const customerData = customerSalesMap.get(customerId);
        customerData.totalSales += amount;
        customerData.invoiceCount++;
      }
    });

    const topCustomers = Array.from(customerSalesMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    // Calculate performance metrics
    const averageSaleValue = totalSalesInvoices > 0 ? netSales / totalSalesInvoices : 0;
    const averageCollectionValue = totalCollectionReceipts > 0 ? totalCollections / totalCollectionReceipts : 0;

    // Build dashboard response
    return {
      reportType: 'salesman_dashboard',
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      salesman: {
        id: salesman._id,
        code: salesman.code,
        name: salesman.name,
        phone: salesman.phone,
        email: salesman.email,
        commissionRate: salesman.commissionRate,
        isActive: salesman.isActive
      },
      sales: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalSalesReturns: Math.round(totalSalesReturns * 100) / 100,
        netSales: Math.round(netSales * 100) / 100,
        invoiceCount: totalSalesInvoices,
        returnCount: totalSalesReturnInvoices,
        averageSaleValue: Math.round(averageSaleValue * 100) / 100
      },
      collections: {
        totalCollections: Math.round(totalCollections * 100) / 100,
        receiptCount: totalCollectionReceipts,
        averageCollectionValue: Math.round(averageCollectionValue * 100) / 100
      },
      commission: {
        salesCommission: Math.round(salesCommission * 100) / 100,
        collectionsCommission: Math.round(collectionsCommission * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        commissionRate: commissionRate
      },
      topCustomers,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get scheme comparison report (Task 48.2 - Requirement 14.2)
   * Compare scheme performance across periods
   * @param {Array} periods - Array of period objects with startDate and endDate
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Scheme comparison report
   */
  async getSchemeComparison(periods, options = {}) {
    const { invoiceType = 'sales', customerId, supplierId } = options;

    if (!periods || !Array.isArray(periods) || periods.length < 2) {
      throw new Error('At least two periods are required for comparison');
    }

    // Validate periods
    periods.forEach((period, index) => {
      if (!period.startDate || !period.endDate) {
        throw new Error(`Period ${index + 1} must have startDate and endDate`);
      }
    });

    // Get scheme analysis for each period
    const periodAnalyses = [];
    for (const period of periods) {
      const analysis = await this.getSchemeAnalysis({
        startDate: period.startDate,
        endDate: period.endDate,
        invoiceType,
        customerId,
        supplierId
      });

      periodAnalyses.push({
        period: {
          startDate: period.startDate,
          endDate: period.endDate,
          label: period.label || `${period.startDate} to ${period.endDate}`
        },
        summary: analysis.summary,
        schemeByType: analysis.schemeByType
      });
    }

    // Calculate comparisons
    const comparisons = [];
    for (let i = 1; i < periodAnalyses.length; i++) {
      const current = periodAnalyses[i];
      const previous = periodAnalyses[i - 1];

      const scheme1Change = current.summary.totalScheme1Quantity - previous.summary.totalScheme1Quantity;
      const scheme2Change = current.summary.totalScheme2Quantity - previous.summary.totalScheme2Quantity;
      const totalSchemeChange = current.summary.totalSchemeQuantity - previous.summary.totalSchemeQuantity;

      const scheme1PercentChange = previous.summary.totalScheme1Quantity > 0
        ? ((scheme1Change / previous.summary.totalScheme1Quantity) * 100)
        : (current.summary.totalScheme1Quantity > 0 ? 100 : 0);

      const scheme2PercentChange = previous.summary.totalScheme2Quantity > 0
        ? ((scheme2Change / previous.summary.totalScheme2Quantity) * 100)
        : (current.summary.totalScheme2Quantity > 0 ? 100 : 0);

      const totalSchemePercentChange = previous.summary.totalSchemeQuantity > 0
        ? ((totalSchemeChange / previous.summary.totalSchemeQuantity) * 100)
        : (current.summary.totalSchemeQuantity > 0 ? 100 : 0);

      comparisons.push({
        currentPeriod: current.period,
        previousPeriod: previous.period,
        scheme1: {
          current: current.summary.totalScheme1Quantity,
          previous: previous.summary.totalScheme1Quantity,
          change: Math.round(scheme1Change * 100) / 100,
          percentChange: Math.round(scheme1PercentChange * 100) / 100,
          trend: scheme1Change > 0 ? 'increasing' : scheme1Change < 0 ? 'decreasing' : 'stable'
        },
        scheme2: {
          current: current.summary.totalScheme2Quantity,
          previous: previous.summary.totalScheme2Quantity,
          change: Math.round(scheme2Change * 100) / 100,
          percentChange: Math.round(scheme2PercentChange * 100) / 100,
          trend: scheme2Change > 0 ? 'increasing' : scheme2Change < 0 ? 'decreasing' : 'stable'
        },
        totalScheme: {
          current: current.summary.totalSchemeQuantity,
          previous: previous.summary.totalSchemeQuantity,
          change: Math.round(totalSchemeChange * 100) / 100,
          percentChange: Math.round(totalSchemePercentChange * 100) / 100,
          trend: totalSchemeChange > 0 ? 'increasing' : totalSchemeChange < 0 ? 'decreasing' : 'stable'
        }
      });
    }

    // Calculate overall trends
    const firstPeriod = periodAnalyses[0];
    const lastPeriod = periodAnalyses[periodAnalyses.length - 1];

    const overallScheme1Change = lastPeriod.summary.totalScheme1Quantity - firstPeriod.summary.totalScheme1Quantity;
    const overallScheme2Change = lastPeriod.summary.totalScheme2Quantity - firstPeriod.summary.totalScheme2Quantity;
    const overallTotalChange = lastPeriod.summary.totalSchemeQuantity - firstPeriod.summary.totalSchemeQuantity;

    const overallTrends = {
      scheme1: overallScheme1Change > 0 ? 'increasing' : overallScheme1Change < 0 ? 'decreasing' : 'stable',
      scheme2: overallScheme2Change > 0 ? 'increasing' : overallScheme2Change < 0 ? 'decreasing' : 'stable',
      total: overallTotalChange > 0 ? 'increasing' : overallTotalChange < 0 ? 'decreasing' : 'stable'
    };

    // Calculate averages
    const avgScheme1 = periodAnalyses.reduce((sum, p) => sum + p.summary.totalScheme1Quantity, 0) / periodAnalyses.length;
    const avgScheme2 = periodAnalyses.reduce((sum, p) => sum + p.summary.totalScheme2Quantity, 0) / periodAnalyses.length;
    const avgTotal = periodAnalyses.reduce((sum, p) => sum + p.summary.totalSchemeQuantity, 0) / periodAnalyses.length;

    return {
      reportType: 'scheme_comparison',
      invoiceType,
      periodCount: periods.length,
      periodAnalyses,
      comparisons,
      overallTrends,
      averages: {
        scheme1: Math.round(avgScheme1 * 100) / 100,
        scheme2: Math.round(avgScheme2 * 100) / 100,
        total: Math.round(avgTotal * 100) / 100
      },
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get warehouse movement report (Task 49.2 - Requirement 14.3)
   * Show all stock movements for a warehouse
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Warehouse movement report
   */
  async getWarehouseMovementReport(warehouseId, options = {}) {
    const { startDate, endDate, itemId, movementType } = options;

    if (!warehouseId) {
      throw new Error('Warehouse ID is required');
    }

    // Get warehouse details
    const Warehouse = require('../models/Warehouse');
    const warehouse = await Warehouse.findById(warehouseId);

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Build query
    const StockMovement = require('../models/StockMovement');
    const query = {
      $or: [
        { warehouse: warehouseId },
        { 'transferInfo.fromWarehouse': warehouseId },
        { 'transferInfo.toWarehouse': warehouseId }
      ]
    };

    // Add date filter
    if (startDate || endDate) {
      query.movementDate = {};
      if (startDate) {
        query.movementDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.movementDate.$lte = new Date(endDate);
      }
    }

    // Add item filter
    if (itemId) {
      query.itemId = itemId;
    }

    // Add movement type filter
    if (movementType) {
      query.movementType = movementType;
    }

    // Get movements
    const movements = await StockMovement.find(query)
      .populate('itemId', 'code name unit')
      .populate('warehouse', 'code name')
      .populate('transferInfo.fromWarehouse', 'code name')
      .populate('transferInfo.toWarehouse', 'code name')
      .sort({ movementDate: -1 });

    // Categorize movements
    const inboundMovements = [];
    const outboundMovements = [];
    const transfersIn = [];
    const transfersOut = [];
    const adjustments = [];

    let totalInbound = 0;
    let totalOutbound = 0;
    let totalTransfersIn = 0;
    let totalTransfersOut = 0;

    movements.forEach(movement => {
      const movementData = {
        id: movement._id,
        date: movement.movementDate,
        item: {
          id: movement.itemId._id,
          code: movement.itemId.code,
          name: movement.itemId.name,
          unit: movement.itemId.unit
        },
        quantity: Math.abs(movement.quantity),
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        batchInfo: movement.batchInfo,
        notes: movement.notes
      };

      // Check if this is a transfer
      if (movement.referenceType === 'transfer' || movement.referenceType === 'warehouse_transfer') {
        const isTransferIn = movement.transferInfo?.toWarehouse?.equals(warehouseId);
        const isTransferOut = movement.transferInfo?.fromWarehouse?.equals(warehouseId);

        if (isTransferIn) {
          transfersIn.push({
            ...movementData,
            fromWarehouse: {
              id: movement.transferInfo.fromWarehouse._id,
              code: movement.transferInfo.fromWarehouse.code,
              name: movement.transferInfo.fromWarehouse.name
            },
            transferId: movement.transferId
          });
          totalTransfersIn += Math.abs(movement.quantity);
        } else if (isTransferOut) {
          transfersOut.push({
            ...movementData,
            toWarehouse: {
              id: movement.transferInfo.toWarehouse._id,
              code: movement.transferInfo.toWarehouse.code,
              name: movement.transferInfo.toWarehouse.name
            },
            transferId: movement.transferId
          });
          totalTransfersOut += Math.abs(movement.quantity);
        }
      } else if (movement.movementType === 'adjustment') {
        adjustments.push({
          ...movementData,
          adjustmentType: movement.quantity > 0 ? 'increase' : 'decrease'
        });
      } else if (movement.movementType === 'in' || movement.quantity > 0) {
        inboundMovements.push(movementData);
        totalInbound += Math.abs(movement.quantity);
      } else if (movement.movementType === 'out' || movement.quantity < 0) {
        outboundMovements.push(movementData);
        totalOutbound += Math.abs(movement.quantity);
      }
    });

    // Calculate net movement
    const netMovement = totalInbound + totalTransfersIn - totalOutbound - totalTransfersOut;

    return {
      reportType: 'warehouse_movement',
      warehouse: {
        id: warehouse._id,
        code: warehouse.code,
        name: warehouse.name
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary: {
        totalMovements: movements.length,
        totalInbound: Math.round(totalInbound * 100) / 100,
        totalOutbound: Math.round(totalOutbound * 100) / 100,
        totalTransfersIn: Math.round(totalTransfersIn * 100) / 100,
        totalTransfersOut: Math.round(totalTransfersOut * 100) / 100,
        netMovement: Math.round(netMovement * 100) / 100,
        adjustmentCount: adjustments.length
      },
      movements: {
        inbound: inboundMovements,
        outbound: outboundMovements,
        transfersIn: transfersIn,
        transfersOut: transfersOut,
        adjustments: adjustments
      },
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get route-wise sales report (Task 58.1 - Requirement 17.3)
   * @param {string} routeId - Route ID
   * @param {Object} dateRange - Date range for the report
   * @param {Date} dateRange.startDate - Start date
   * @param {Date} dateRange.endDate - End date
   * @returns {Promise<Object>} Route sales report
   */
  async getRouteSalesReport(routeId, dateRange) {
    if (!routeId) {
      throw new Error('Route ID is required');
    }

    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      throw new Error('Date range with startDate and endDate is required');
    }

    const { startDate, endDate } = dateRange;

    // Validate route exists
    const Route = require('../models/Route');
    const route = await Route.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    // Get all customers on this route
    const customers = await Customer.find({ routeId, isActive: true });
    const customerIds = customers.map(c => c._id);

    // Get all sales invoices for customers on this route
    const query = {
      type: { $in: ['sales', 'return_sales'] },
      customerId: { $in: customerIds },
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('salesmanId', 'code name')
      .sort({ invoiceDate: 1 });

    // Calculate totals
    let totalSales = 0;
    let totalReturns = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let salesInvoiceCount = 0;
    let returnInvoiceCount = 0;

    const customerSummary = {};

    invoices.forEach(invoice => {
      const customerId = invoice.customerId._id.toString();
      const amount = invoice.totals.grandTotal;
      const isReturn = invoice.type === 'return_sales';

      // Initialize customer summary if not exists
      if (!customerSummary[customerId]) {
        customerSummary[customerId] = {
          customer: invoice.customerId,
          salesAmount: 0,
          returnAmount: 0,
          netAmount: 0,
          invoiceCount: 0,
          discount: 0,
          tax: 0
        };
      }

      // Update totals
      if (isReturn) {
        totalReturns += amount;
        returnInvoiceCount++;
        customerSummary[customerId].returnAmount += amount;
      } else {
        totalSales += amount;
        salesInvoiceCount++;
        customerSummary[customerId].salesAmount += amount;
      }

      totalDiscount += invoice.totals.totalDiscount || 0;
      totalTax += invoice.totals.totalTax || 0;
      customerSummary[customerId].invoiceCount++;
      customerSummary[customerId].discount += invoice.totals.totalDiscount || 0;
      customerSummary[customerId].tax += invoice.totals.totalTax || 0;
    });

    // Calculate net amounts for each customer
    Object.values(customerSummary).forEach(summary => {
      summary.netAmount = summary.salesAmount - summary.returnAmount;
    });

    const netSales = totalSales - totalReturns;

    return {
      reportType: 'route_sales',
      route: {
        id: route._id,
        code: route.code,
        name: route.name
      },
      period: { startDate, endDate },
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalReturns: Math.round(totalReturns * 100) / 100,
        netSales: Math.round(netSales * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        salesInvoiceCount,
        returnInvoiceCount,
        totalInvoiceCount: salesInvoiceCount + returnInvoiceCount,
        customerCount: Object.keys(customerSummary).length,
        averageSalePerCustomer: Object.keys(customerSummary).length > 0
          ? Math.round((netSales / Object.keys(customerSummary).length) * 100) / 100
          : 0
      },
      customerBreakdown: Object.values(customerSummary)
        .sort((a, b) => b.netAmount - a.netAmount)
        .map(c => ({
          ...c,
          salesAmount: Math.round(c.salesAmount * 100) / 100,
          returnAmount: Math.round(c.returnAmount * 100) / 100,
          netAmount: Math.round(c.netAmount * 100) / 100,
          discount: Math.round(c.discount * 100) / 100,
          tax: Math.round(c.tax * 100) / 100
        })),
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get route due invoices for visit planning (Task 58.2 - Requirement 17.4)
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} Route due invoices report
   */
  async getRouteDueInvoices(routeId) {
    if (!routeId) {
      throw new Error('Route ID is required');
    }

    // Validate route exists
    const Route = require('../models/Route');
    const route = await Route.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    // Get all customers on this route
    const customers = await Customer.find({ routeId, isActive: true });
    const customerIds = customers.map(c => c._id);

    // Get all unpaid/partially paid invoices for customers on this route
    const query = {
      type: 'sales',
      customerId: { $in: customerIds },
      paymentStatus: { $in: ['pending', 'partial'] },
      status: { $ne: 'cancelled' }
    };

    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name contactInfo financialInfo')
      .populate('salesmanId', 'code name')
      .sort({ dueDate: 1 }); // Sort by due date ascending (oldest first)

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Categorize invoices by priority
    const overdueInvoices = [];
    const dueTodayInvoices = [];
    const dueSoonInvoices = []; // Due within 7 days
    const otherDueInvoices = [];

    let totalDueAmount = 0;
    let totalOverdueAmount = 0;

    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const dueAmount = invoice.totals.grandTotal;

      const invoiceData = {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        daysUntilDue,
        daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
        customer: invoice.customerId,
        salesman: invoice.salesmanId,
        amount: Math.round(dueAmount * 100) / 100,
        paymentStatus: invoice.paymentStatus,
        priority: daysUntilDue < 0 ? 'high' : daysUntilDue === 0 ? 'medium' : 'low'
      };

      totalDueAmount += dueAmount;

      if (daysUntilDue < 0) {
        // Overdue
        overdueInvoices.push(invoiceData);
        totalOverdueAmount += dueAmount;
      } else if (daysUntilDue === 0) {
        // Due today
        dueTodayInvoices.push(invoiceData);
      } else if (daysUntilDue <= 7) {
        // Due within 7 days
        dueSoonInvoices.push(invoiceData);
      } else {
        // Other due invoices
        otherDueInvoices.push(invoiceData);
      }
    });

    // Sort by priority: overdue (by days overdue desc), due today, due soon, others
    const sortedInvoices = [
      ...overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue),
      ...dueTodayInvoices,
      ...dueSoonInvoices.sort((a, b) => a.daysUntilDue - b.daysUntilDue),
      ...otherDueInvoices.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    ];

    // Group by customer for visit planning
    const customerVisitPlan = {};
    sortedInvoices.forEach(invoice => {
      const customerId = invoice.customer._id.toString();
      if (!customerVisitPlan[customerId]) {
        customerVisitPlan[customerId] = {
          customer: invoice.customer,
          totalDue: 0,
          invoiceCount: 0,
          overdueCount: 0,
          overdueAmount: 0,
          highestPriority: invoice.priority,
          invoices: []
        };
      }

      customerVisitPlan[customerId].totalDue += invoice.amount;
      customerVisitPlan[customerId].invoiceCount++;
      if (invoice.daysOverdue > 0) {
        customerVisitPlan[customerId].overdueCount++;
        customerVisitPlan[customerId].overdueAmount += invoice.amount;
      }
      customerVisitPlan[customerId].invoices.push(invoice);

      // Update priority (high > medium > low)
      if (invoice.priority === 'high') {
        customerVisitPlan[customerId].highestPriority = 'high';
      } else if (invoice.priority === 'medium' && customerVisitPlan[customerId].highestPriority !== 'high') {
        customerVisitPlan[customerId].highestPriority = 'medium';
      }
    });

    // Convert to array and sort by priority
    const visitPlan = Object.values(customerVisitPlan)
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.highestPriority] !== priorityOrder[b.highestPriority]) {
          return priorityOrder[a.highestPriority] - priorityOrder[b.highestPriority];
        }
        // Then by total due amount descending
        return b.totalDue - a.totalDue;
      })
      .map(plan => ({
        ...plan,
        totalDue: Math.round(plan.totalDue * 100) / 100,
        overdueAmount: Math.round(plan.overdueAmount * 100) / 100
      }));

    return {
      reportType: 'route_visit_planning',
      route: {
        id: route._id,
        code: route.code,
        name: route.name
      },
      summary: {
        totalDueAmount: Math.round(totalDueAmount * 100) / 100,
        totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
        totalInvoices: invoices.length,
        overdueInvoices: overdueInvoices.length,
        dueTodayInvoices: dueTodayInvoices.length,
        dueSoonInvoices: dueSoonInvoices.length,
        customersToVisit: visitPlan.length,
        highPriorityCustomers: visitPlan.filter(p => p.highestPriority === 'high').length
      },
      visitPlan,
      allInvoices: sortedInvoices,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get route performance report (Task 58.3 - Requirement 17.5)
   * @param {string} routeId - Route ID
   * @param {Object} dateRange - Date range for the report
   * @param {Date} dateRange.startDate - Start date
   * @param {Date} dateRange.endDate - End date
   * @param {Object} targets - Optional targets for the route
   * @param {number} targets.salesTarget - Sales target amount
   * @param {number} targets.collectionTarget - Collection target amount
   * @param {number} targets.visitTarget - Number of customers to visit
   * @returns {Promise<Object>} Route performance report
   */
  async getRoutePerformance(routeId, dateRange, targets = {}) {
    if (!routeId) {
      throw new Error('Route ID is required');
    }

    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      throw new Error('Date range with startDate and endDate is required');
    }

    const { startDate, endDate } = dateRange;
    const { salesTarget = 0, collectionTarget = 0, visitTarget = 0 } = targets;

    // Validate route exists
    const Route = require('../models/Route');
    const route = await Route.findById(routeId).populate('salesmanId', 'code name commissionRate');
    if (!route) {
      throw new Error('Route not found');
    }

    // Get all customers on this route
    const customers = await Customer.find({ routeId, isActive: true });
    const customerIds = customers.map(c => c._id);

    // Get sales data
    const salesQuery = {
      type: { $in: ['sales', 'return_sales'] },
      customerId: { $in: customerIds },
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    const salesInvoices = await Invoice.find(salesQuery)
      .populate('customerId', 'code name')
      .sort({ invoiceDate: 1 });

    // Calculate actual sales
    let actualSales = 0;
    let actualReturns = 0;
    const uniqueCustomersVisited = new Set();

    salesInvoices.forEach(invoice => {
      const amount = invoice.totals.grandTotal;
      if (invoice.type === 'return_sales') {
        actualReturns += amount;
      } else {
        actualSales += amount;
        uniqueCustomersVisited.add(invoice.customerId._id.toString());
      }
    });

    const netSales = actualSales - actualReturns;

    // Get collection data (payments received)
    // Note: This would require a Payment model. For now, we'll use paid invoices as a proxy
    const paidInvoicesQuery = {
      type: 'sales',
      customerId: { $in: customerIds },
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' },
      // Assuming we have a paidDate field or use updatedAt as proxy
      updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const paidInvoices = await Invoice.find(paidInvoicesQuery);
    const actualCollection = paidInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);

    // Calculate achievement percentages
    const salesAchievement = salesTarget > 0
      ? Math.round((netSales / salesTarget) * 10000) / 100
      : 0;

    const collectionAchievement = collectionTarget > 0
      ? Math.round((actualCollection / collectionTarget) * 10000) / 100
      : 0;

    const visitAchievement = visitTarget > 0
      ? Math.round((uniqueCustomersVisited.size / visitTarget) * 10000) / 100
      : 0;

    // Calculate variances
    const salesVariance = netSales - salesTarget;
    const collectionVariance = actualCollection - collectionTarget;
    const visitVariance = uniqueCustomersVisited.size - visitTarget;

    // Determine performance status
    const getPerformanceStatus = (achievement) => {
      if (achievement >= 100) return 'excellent';
      if (achievement >= 80) return 'good';
      if (achievement >= 60) return 'average';
      return 'poor';
    };

    return {
      reportType: 'route_performance',
      route: {
        id: route._id,
        code: route.code,
        name: route.name,
        salesman: route.salesmanId
      },
      period: { startDate, endDate },
      targets: {
        sales: salesTarget,
        collection: collectionTarget,
        visits: visitTarget
      },
      actuals: {
        sales: Math.round(netSales * 100) / 100,
        grossSales: Math.round(actualSales * 100) / 100,
        returns: Math.round(actualReturns * 100) / 100,
        collection: Math.round(actualCollection * 100) / 100,
        visits: uniqueCustomersVisited.size,
        invoiceCount: salesInvoices.filter(i => i.type === 'sales').length,
        returnCount: salesInvoices.filter(i => i.type === 'return_sales').length
      },
      achievement: {
        sales: {
          percentage: salesAchievement,
          variance: Math.round(salesVariance * 100) / 100,
          status: getPerformanceStatus(salesAchievement)
        },
        collection: {
          percentage: collectionAchievement,
          variance: Math.round(collectionVariance * 100) / 100,
          status: getPerformanceStatus(collectionAchievement)
        },
        visits: {
          percentage: visitAchievement,
          variance: visitVariance,
          status: getPerformanceStatus(visitAchievement)
        },
        overall: {
          percentage: Math.round(((salesAchievement + collectionAchievement + visitAchievement) / 3) * 100) / 100,
          status: getPerformanceStatus((salesAchievement + collectionAchievement + visitAchievement) / 3)
        }
      },
      metrics: {
        averageSalePerInvoice: salesInvoices.filter(i => i.type === 'sales').length > 0
          ? Math.round((actualSales / salesInvoices.filter(i => i.type === 'sales').length) * 100) / 100
          : 0,
        averageSalePerCustomer: uniqueCustomersVisited.size > 0
          ? Math.round((netSales / uniqueCustomersVisited.size) * 100) / 100
          : 0,
        returnRate: actualSales > 0
          ? Math.round((actualReturns / actualSales) * 10000) / 100
          : 0,
        collectionEfficiency: netSales > 0
          ? Math.round((actualCollection / netSales) * 10000) / 100
          : 0
      },
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get dimension report (Task 68.2 - Requirement 24.2)
   * @param {string} dimension - Dimension value
   * @param {Object} dateRange - Date range { startDate, endDate }
   * @returns {Promise<Object>} Dimension report
   */
  async getDimensionReport(dimension, dateRange) {
    const { startDate, endDate } = dateRange;

    if (!dimension) {
      throw new Error('Dimension is required');
    }

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      dimension,
      type: { $in: ['purchase', 'return_purchase'] },
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    const invoices = await Invoice.find(query)
      .populate('supplierId', 'code name')
      .populate('items.itemId', 'code name category')
      .sort({ invoiceDate: 1 });

    // Aggregate data
    const summary = {
      dimension,
      totalInvoices: invoices.length,
      totalAmount: 0,
      totalItems: 0,
      purchaseAmount: 0,
      returnAmount: 0
    };

    const bySupplier = {};
    const byItem = {};

    invoices.forEach(invoice => {
      const isReturn = invoice.type === 'return_purchase';
      const amount = invoice.totals.grandTotal;

      if (isReturn) {
        summary.returnAmount += amount;
        summary.totalAmount -= amount;
      } else {
        summary.purchaseAmount += amount;
        summary.totalAmount += amount;
      }

      // Group by supplier
      const supplierId = invoice.supplierId ? invoice.supplierId._id.toString() : 'unknown';
      const supplierName = invoice.supplierId ? invoice.supplierId.name : 'Unknown Supplier';

      if (!bySupplier[supplierId]) {
        bySupplier[supplierId] = {
          supplierId,
          supplierName,
          invoiceCount: 0,
          totalAmount: 0
        };
      }

      bySupplier[supplierId].invoiceCount++;
      bySupplier[supplierId].totalAmount += isReturn ? -amount : amount;

      // Group by item
      invoice.items.forEach(item => {
        if (item.itemId) {
          const itemId = item.itemId._id.toString();

          if (!byItem[itemId]) {
            byItem[itemId] = {
              itemId,
              itemCode: item.itemId.code,
              itemName: item.itemId.name,
              category: item.itemId.category,
              quantity: 0,
              totalAmount: 0
            };
          }

          const itemAmount = item.lineTotal;
          const quantity = item.quantity;

          byItem[itemId].quantity += isReturn ? -quantity : quantity;
          byItem[itemId].totalAmount += isReturn ? -itemAmount : itemAmount;
          summary.totalItems += isReturn ? -quantity : quantity;
        }
      });
    });

    return {
      reportType: 'dimension_report',
      dimension,
      period: { startDate, endDate },
      summary: {
        ...summary,
        totalAmount: Math.round(summary.totalAmount * 100) / 100,
        purchaseAmount: Math.round(summary.purchaseAmount * 100) / 100,
        returnAmount: Math.round(summary.returnAmount * 100) / 100
      },
      bySupplier: Object.values(bySupplier).sort((a, b) => b.totalAmount - a.totalAmount),
      byItem: Object.values(byItem).sort((a, b) => b.totalAmount - a.totalAmount),
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Get dimension expense analysis (Task 68.3 - Requirement 24.3)
   * @param {Object} dateRange - Date range { startDate, endDate }
   * @returns {Promise<Object>} Dimension expense analysis
   */
  async getDimensionExpenses(dateRange) {
    const { startDate, endDate } = dateRange;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const query = {
      dimension: { $exists: true, $ne: null },
      type: { $in: ['purchase', 'return_purchase'] },
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: 'cancelled' }
    };

    const invoices = await Invoice.find(query);

    // Aggregate by dimension
    const dimensionMap = {};
    let totalExpenses = 0;

    invoices.forEach(invoice => {
      const dimension = invoice.dimension;
      const isReturn = invoice.type === 'return_purchase';
      const amount = invoice.totals.grandTotal;
      const netAmount = isReturn ? -amount : amount;

      if (!dimensionMap[dimension]) {
        dimensionMap[dimension] = {
          dimension,
          invoiceCount: 0,
          totalAmount: 0
        };
      }

      dimensionMap[dimension].invoiceCount++;
      dimensionMap[dimension].totalAmount += netAmount;
      totalExpenses += netAmount;
    });

    // Calculate percentages and sort
    const dimensions = Object.values(dimensionMap)
      .map(d => ({
        ...d,
        percentage: totalExpenses > 0 ? Math.round((d.totalAmount / totalExpenses) * 10000) / 100 : 0,
        totalAmount: Math.round(d.totalAmount * 100) / 100
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      reportType: 'dimension_expenses',
      period: { startDate, endDate },
      summary: {
        totalDimensions: dimensions.length,
        totalInvoices: invoices.length,
        totalExpenses: Math.round(totalExpenses * 100) / 100
      },
      dimensions,
      generatedAt: new Date()
    };
  }

  /**
   * Phase 2: Compare dimension budget (Task 68.4 - Requirement 24.4)
   * @param {string} dimension - Dimension value
   * @param {Object} dateRange - Date range { startDate, endDate }
   * @returns {Promise<Object>} Budget comparison report
   */
  async compareDimensionBudget(dimension, dateRange) {
    const { startDate, endDate } = dateRange;

    if (!dimension) {
      throw new Error('Dimension is required');
    }

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get actual expenses
    const expenseReport = await this.getDimensionReport(dimension, { startDate, endDate });
    const actualAmount = expenseReport.summary.totalAmount;

    // Get budget
    // Find budget that overlaps with the date range
    const budget = await Budget.findOne({
      dimension,
      isActive: true,
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) }
    });

    let budgetInfo = null;
    let variance = 0;
    let variancePercent = 0;
    let utilizationPercent = 0;
    let status = 'no_budget';

    if (budget) {
      // Calculate pro-rated budget if date range is different from budget period
      // For simplicity, we'll use the full budget amount if it overlaps
      // In a more complex implementation, we might pro-rate based on days

      const budgetAmount = budget.budgetAmount;
      variance = budgetAmount - actualAmount;

      if (budgetAmount > 0) {
        utilizationPercent = Math.round((actualAmount / budgetAmount) * 10000) / 100;
        variancePercent = Math.round((variance / budgetAmount) * 10000) / 100;
      }

      if (actualAmount > budgetAmount) {
        status = 'over_budget';
      } else if (utilizationPercent >= 90) {
        status = 'near_limit';
      } else {
        status = 'within_budget';
      }

      budgetInfo = {
        period: budget.period,
        periodType: budget.periodType,
        startDate: budget.startDate,
        endDate: budget.endDate,
        amount: budgetAmount,
        notes: budget.notes
      };
    }

    return {
      reportType: 'dimension_budget_comparison',
      dimension,
      period: { startDate, endDate },
      actuals: {
        amount: actualAmount,
        invoiceCount: expenseReport.summary.totalInvoices
      },
      budget: budgetInfo,
      comparison: budgetInfo ? {
        variance: Math.round(variance * 100) / 100,
        variancePercent,
        utilizationPercent,
        status
      } : null,
      generatedAt: new Date()
    };
  }
}


module.exports = new ReportService();

