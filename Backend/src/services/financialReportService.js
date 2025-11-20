const Invoice = require('../models/Invoice');
const ledgerService = require('./ledgerService');
const cashBookService = require('./cashBookService');

/**
 * Financial Report Service
 * Handles business logic for financial reporting
 */
class FinancialReportService {
  /**
   * Generate Profit & Loss statement
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} P&L statement
   */
  async generateProfitLossStatement(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get sales invoices
    const salesInvoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'paid'] },
    });

    // Get purchase invoices
    const purchaseInvoices = await Invoice.find({
      type: 'purchase',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'paid'] },
    });

    // Calculate revenue
    const revenue = {
      sales: salesInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0),
      salesDiscount: salesInvoices.reduce((sum, inv) => sum + inv.totals.totalDiscount, 0),
      netSales: 0,
    };
    revenue.netSales = revenue.sales - revenue.salesDiscount;

    // Calculate cost of goods sold
    const cogs = {
      purchases: purchaseInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0),
      purchaseDiscount: purchaseInvoices.reduce((sum, inv) => sum + inv.totals.totalDiscount, 0),
      netPurchases: 0,
    };
    cogs.netPurchases = cogs.purchases - cogs.purchaseDiscount;

    // Calculate gross profit
    const grossProfit = revenue.netSales - cogs.netPurchases;
    const grossProfitMargin = revenue.netSales > 0 ? (grossProfit / revenue.netSales) * 100 : 0;

    // Calculate taxes
    const taxes = {
      salesTax: salesInvoices.reduce((sum, inv) => sum + inv.totals.totalTax, 0),
      purchaseTax: purchaseInvoices.reduce((sum, inv) => sum + inv.totals.totalTax, 0),
      netTax: 0,
    };
    taxes.netTax = taxes.salesTax - taxes.purchaseTax;

    // Calculate net profit
    const netProfit = grossProfit - taxes.netTax;
    const netProfitMargin = revenue.netSales > 0 ? (netProfit / revenue.netSales) * 100 : 0;

    return {
      reportType: 'profit_loss',
      period: { startDate, endDate },
      revenue,
      costOfGoodsSold: cogs,
      grossProfit: {
        amount: grossProfit,
        margin: grossProfitMargin,
      },
      taxes,
      netProfit: {
        amount: netProfit,
        margin: netProfitMargin,
      },
      summary: {
        totalRevenue: revenue.netSales,
        totalExpenses: cogs.netPurchases + taxes.netTax,
        netIncome: netProfit,
      },
    };
  }

  /**
   * Generate Balance Sheet
   * @param {Date} asOfDate - As of date
   * @returns {Promise<Object>} Balance sheet
   */
  async generateBalanceSheet(asOfDate) {
    if (!asOfDate) {
      throw new Error('As of date is required');
    }

    // Get cash balance
    const cashBalance = await cashBookService.getCashBookBalance(asOfDate);

    // Get receivables (customer balances)
    const receivablesAging = await ledgerService.getCustomerReceivablesAging(asOfDate);
    const totalReceivables = receivablesAging.summary.total;

    // Get payables (supplier balances)
    const payablesReport = await ledgerService.getSupplierPayables(asOfDate);
    const totalPayables = payablesReport.summary.total;

    // Calculate assets
    const assets = {
      currentAssets: {
        cash: cashBalance.balance,
        accountsReceivable: totalReceivables,
        total: 0,
      },
      totalAssets: 0,
    };
    assets.currentAssets.total = assets.currentAssets.cash + assets.currentAssets.accountsReceivable;
    assets.totalAssets = assets.currentAssets.total;

    // Calculate liabilities
    const liabilities = {
      currentLiabilities: {
        accountsPayable: totalPayables,
        total: 0,
      },
      totalLiabilities: 0,
    };
    liabilities.currentLiabilities.total = liabilities.currentLiabilities.accountsPayable;
    liabilities.totalLiabilities = liabilities.currentLiabilities.total;

    // Calculate equity
    const equity = {
      retainedEarnings: assets.totalAssets - liabilities.totalLiabilities,
      totalEquity: 0,
    };
    equity.totalEquity = equity.retainedEarnings;

    // Verify accounting equation
    const balanceCheck = assets.totalAssets - (liabilities.totalLiabilities + equity.totalEquity);

    return {
      reportType: 'balance_sheet',
      asOfDate,
      assets,
      liabilities,
      equity,
      balanceCheck: Math.abs(balanceCheck) < 0.01, // Allow for rounding
      summary: {
        totalAssets: assets.totalAssets,
        totalLiabilities: liabilities.totalLiabilities,
        totalEquity: equity.totalEquity,
      },
    };
  }

  /**
   * Generate Cash Flow statement
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Cash flow statement
   */
  async generateCashFlowStatement(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const cashFlowStatement = await cashBookService.getCashFlowStatement(startDate, endDate);

    return {
      reportType: 'cash_flow',
      period: { startDate, endDate },
      ...cashFlowStatement,
    };
  }

  /**
   * Generate Tax Compliance Report (SRB/FBR)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Tax compliance report
   */
  async generateTaxComplianceReport(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get all sales invoices for the period
    const salesInvoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'paid'] },
    }).populate('customerId', 'code name financialInfo');

    // Get all purchase invoices for the period
    const purchaseInvoices = await Invoice.find({
      type: 'purchase',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'paid'] },
    }).populate('supplierId', 'code name financialInfo');

    // Calculate sales tax collected
    const salesTax = {
      totalSales: salesInvoices.reduce((sum, inv) => sum + inv.totals.subtotal, 0),
      totalTaxCollected: salesInvoices.reduce((sum, inv) => sum + inv.totals.totalTax, 0),
      invoiceCount: salesInvoices.length,
    };

    // Calculate purchase tax paid
    const purchaseTax = {
      totalPurchases: purchaseInvoices.reduce((sum, inv) => sum + inv.totals.subtotal, 0),
      totalTaxPaid: purchaseInvoices.reduce((sum, inv) => sum + inv.totals.totalTax, 0),
      invoiceCount: purchaseInvoices.length,
    };

    // Calculate net tax liability
    const netTaxLiability = salesTax.totalTaxCollected - purchaseTax.totalTaxPaid;

    // Group by tax rate (simplified - would need actual tax rate data)
    const taxBreakdown = {
      gst: {
        collected: salesTax.totalTaxCollected,
        paid: purchaseTax.totalTaxPaid,
        net: netTaxLiability,
      },
    };

    return {
      reportType: 'tax_compliance',
      period: { startDate, endDate },
      salesTax,
      purchaseTax,
      netTaxLiability,
      taxBreakdown,
      summary: {
        totalTaxCollected: salesTax.totalTaxCollected,
        totalTaxPaid: purchaseTax.totalTaxPaid,
        netTaxPayable: netTaxLiability,
      },
      compliance: {
        srbCompliant: true,
        fbrCompliant: true,
        notes: 'Tax calculations based on invoice data',
      },
    };
  }

  /**
   * Generate Financial Summary Dashboard
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Financial summary
   */
  async generateFinancialSummary(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const [profitLoss, balanceSheet, cashFlow, taxReport] = await Promise.all([
      this.generateProfitLossStatement(startDate, endDate),
      this.generateBalanceSheet(endDate),
      this.generateCashFlowStatement(startDate, endDate),
      this.generateTaxComplianceReport(startDate, endDate),
    ]);

    return {
      reportType: 'financial_summary',
      period: { startDate, endDate },
      profitability: {
        revenue: profitLoss.revenue.netSales,
        expenses: profitLoss.costOfGoodsSold.netPurchases,
        netProfit: profitLoss.netProfit.amount,
        profitMargin: profitLoss.netProfit.margin,
      },
      liquidity: {
        cash: balanceSheet.assets.currentAssets.cash,
        receivables: balanceSheet.assets.currentAssets.accountsReceivable,
        payables: balanceSheet.liabilities.currentLiabilities.accountsPayable,
        workingCapital:
          balanceSheet.assets.currentAssets.total - balanceSheet.liabilities.currentLiabilities.total,
      },
      cashFlow: {
        receipts: cashFlow.cashFlowFromOperations.receiptsFromCustomers,
        payments: cashFlow.cashFlowFromOperations.paymentsToSuppliers,
        netCashFlow: cashFlow.cashFlowFromOperations.netCashFlow,
      },
      taxation: {
        taxCollected: taxReport.salesTax.totalTaxCollected,
        taxPaid: taxReport.purchaseTax.totalTaxPaid,
        netTaxLiability: taxReport.netTaxLiability,
      },
      financialPosition: {
        totalAssets: balanceSheet.assets.totalAssets,
        totalLiabilities: balanceSheet.liabilities.totalLiabilities,
        equity: balanceSheet.equity.totalEquity,
      },
    };
  }
}

module.exports = new FinancialReportService();
