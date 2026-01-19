const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const cashBookService = require('./cashBookService');
const ledgerService = require('./ledgerService');

/**
 * Analytics Service
 * Provides real-time analytics and dashboard data
 */
class AnalyticsService {
  /**
   * Get dashboard summary
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardSummary() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      todaySales,
      monthSales,
      yearSales,
      todayPurchases,
      monthPurchases,
      cashBalance,
      receivables,
      payables,
      lowStockItems,
    ] = await Promise.all([
      this._getSalesTotal(today, today),
      this._getSalesTotal(startOfMonth, today),
      this._getSalesTotal(startOfYear, today),
      this._getPurchasesTotal(today, today),
      this._getPurchasesTotal(startOfMonth, today),
      cashBookService.getCashBookBalance(today),
      ledgerService.getCustomerReceivablesAging(today),
      ledgerService.getSupplierPayables(today),
      this._getLowStockCount(),
    ]);

    return {
      sales: {
        today: todaySales,
        thisMonth: monthSales,
        thisYear: yearSales,
      },
      purchases: {
        today: todayPurchases,
        thisMonth: monthPurchases,
      },
      cash: {
        balance: cashBalance.balance,
        receipts: cashBalance.totalReceipts,
        payments: cashBalance.totalPayments,
      },
      accounts: {
        receivables: receivables.summary.total,
        overdueReceivables: receivables.summary.days1to30 + receivables.summary.days31to60 + receivables.summary.days61to90 + receivables.summary.over90,
        payables: payables.summary.total,
        overduePayables: payables.summary.overdue,
      },
      inventory: {
        lowStockItems,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Get sales trends
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} interval - Interval (daily, weekly, monthly)
   * @returns {Promise<Object>} Sales trends
   */
  async getSalesTrends(startDate, endDate, interval = 'daily') {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const invoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    });

    const trends = this._groupByInterval(invoices, interval);

    return {
      interval,
      period: { startDate, endDate },
      trends,
      summary: {
        totalSales: invoices.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0),
        averageSale: invoices.length > 0 ? invoices.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0) / invoices.length : 0,
        invoiceCount: invoices.length,
      },
    };
  }

  /**
   * Get top customers
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Number of customers
   * @returns {Promise<Array>} Top customers
   */
  async getTopCustomers(startDate, endDate, limit = 10) {
    const result = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          invoiceDate: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalAmount: { $sum: '$totals.grandTotal' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
    ]);

    // Populate customer details
    await Invoice.populate(result, { path: '_id', select: 'code name' });

    return result.map((item) => ({
      customer: item._id,
      totalAmount: item.totalAmount,
      invoiceCount: item.invoiceCount,
    }));
  }

  /**
   * Get top selling items
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Number of items
   * @returns {Promise<Array>} Top selling items
   */
  async getTopSellingItems(startDate, endDate, limit = 10) {
    const invoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    });

    const itemSales = {};

    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const itemId = item.itemId.toString();
        if (!itemSales[itemId]) {
          itemSales[itemId] = {
            itemId,
            quantity: 0,
            revenue: 0,
            invoiceCount: 0,
          };
        }
        itemSales[itemId].quantity += item.quantity;
        itemSales[itemId].revenue += item.lineTotal;
        itemSales[itemId].invoiceCount++;
      });
    });

    const sorted = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    // Populate item details
    const itemIds = sorted.map((s) => s.itemId);
    const items = await Item.find({ _id: { $in: itemIds } }).select('code name category');

    return sorted.map((sale) => {
      const item = items.find((i) => i._id.toString() === sale.itemId);
      return {
        item,
        quantity: sale.quantity,
        revenue: sale.revenue,
        invoiceCount: sale.invoiceCount,
      };
    });
  }

  /**
   * Get sales total for period
   * @private
   */
  async _getSalesTotal(startDate, endDate) {
    const result = await Invoice.aggregate([
      {
        $match: {
          type: 'sales',
          invoiceDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totals.grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { total: 0, count: 0 };
  }

  /**
   * Get purchases total for period
   * @private
   */
  async _getPurchasesTotal(startDate, endDate) {
    const result = await Invoice.aggregate([
      {
        $match: {
          type: 'purchase',
          invoiceDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totals.grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { total: 0, count: 0 };
  }

  /**
   * Get low stock items count
   * @private
   */
  async _getLowStockCount() {
    return Item.countDocuments({
      $expr: { $lte: ['$stock.currentStock', '$stock.minStock'] },
      isActive: true,
    });
  }

  /**
   * Get revenue by category
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Revenue by category
   */
  async getRevenueByCategory(startDate, endDate) {
    const invoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'paid'] },
    }).populate('items.itemId', 'category');

    const categoryRevenue = {};

    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const category = item.itemId?.category || 'Uncategorized';
        if (!categoryRevenue[category]) {
          categoryRevenue[category] = {
            category,
            revenue: 0,
            quantity: 0,
            itemCount: 0,
          };
        }
        categoryRevenue[category].revenue += item.lineTotal;
        categoryRevenue[category].quantity += item.quantity;
        categoryRevenue[category].itemCount++;
      });
    });

    return Object.values(categoryRevenue).sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get profit margins
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Profit margin analysis
   */
  async getProfitMargins(startDate, endDate) {
    const [salesInvoices, purchaseInvoices] = await Promise.all([
      Invoice.find({
        type: 'sales',
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'paid'] },
      }),
      Invoice.find({
        type: 'purchase',
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'paid'] },
      }),
    ]);

    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    const totalCost = purchaseInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      period: { startDate, endDate },
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      salesCount: salesInvoices.length,
      purchaseCount: purchaseInvoices.length,
    };
  }

  /**
   * Get payment collection efficiency
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Object>} Payment collection metrics
   */
  async getPaymentCollectionEfficiency(asOfDate = new Date()) {
    const receivables = await ledgerService.getCustomerReceivablesAging(asOfDate);

    const totalReceivables = receivables.summary.total;
    const overdueReceivables =
      receivables.summary.days1to30 +
      receivables.summary.days31to60 +
      receivables.summary.days61to90 +
      receivables.summary.over90;

    const collectionEfficiency =
      totalReceivables > 0 ? ((totalReceivables - overdueReceivables) / totalReceivables) * 100 : 100;

    return {
      asOfDate,
      totalReceivables,
      currentReceivables: receivables.summary.current,
      overdueReceivables,
      collectionEfficiency,
      agingBreakdown: {
        current: receivables.summary.current,
        days1to30: receivables.summary.days1to30,
        days31to60: receivables.summary.days31to60,
        days61to90: receivables.summary.days61to90,
        over90: receivables.summary.over90,
      },
    };
  }

  /**
   * Get inventory turnover ratio
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Inventory turnover metrics
   */
  async getInventoryTurnover(startDate, endDate) {
    const [salesInvoices, items] = await Promise.all([
      Invoice.find({
        type: 'sales',
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'paid'] },
      }),
      Item.find({ isActive: true }),
    ]);

    // Calculate cost of goods sold (using purchase price)
    let totalCOGS = 0;
    salesInvoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const itemData = items.find((i) => i._id.toString() === item.itemId.toString());
        if (itemData) {
          totalCOGS += itemData.pricing.costPrice * item.quantity;
        }
      });
    });

    // Calculate average inventory value
    const totalInventoryValue = items.reduce(
      (sum, item) => sum + item.pricing.costPrice * item.stock.currentStock,
      0
    );

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const annualizedCOGS = (totalCOGS / days) * 365;
    const turnoverRatio = totalInventoryValue > 0 ? annualizedCOGS / totalInventoryValue : 0;
    const daysInInventory = turnoverRatio > 0 ? 365 / turnoverRatio : 0;

    return {
      period: { startDate, endDate },
      costOfGoodsSold: totalCOGS,
      averageInventoryValue: totalInventoryValue,
      turnoverRatio,
      daysInInventory,
    };
  }

  /**
   * Get real-time KPIs
   * @returns {Promise<Object>} Real-time key performance indicators
   */
  async getRealTimeKPIs() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [dashboard, profitMargins, collectionEfficiency, inventoryTurnover] = await Promise.all([
      this.getDashboardSummary(),
      this.getProfitMargins(startOfMonth, today),
      this.getPaymentCollectionEfficiency(today),
      this.getInventoryTurnover(startOfMonth, today),
    ]);

    return {
      timestamp: new Date(),
      sales: dashboard.sales,
      purchases: dashboard.purchases,
      cash: dashboard.cash,
      accounts: dashboard.accounts,
      inventory: dashboard.inventory,
      profitability: {
        grossProfit: profitMargins.grossProfit,
        profitMargin: profitMargins.profitMargin,
      },
      efficiency: {
        collectionEfficiency: collectionEfficiency.collectionEfficiency,
        inventoryTurnover: inventoryTurnover.turnoverRatio,
        daysInInventory: inventoryTurnover.daysInInventory,
      },
    };
  }

  /**
   * Group invoices by interval
   * @private
   */
  _groupByInterval(invoices, interval) {
    const grouped = {};

    invoices.forEach((invoice) => {
      let key;
      const date = new Date(invoice.invoiceDate);

      if (interval === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (interval === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          totalAmount: 0,
          invoiceCount: 0,
        };
      }

      grouped[key].totalAmount += invoice.totals.grandTotal;
      grouped[key].invoiceCount++;
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }
}

module.exports = new AnalyticsService();
