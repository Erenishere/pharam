const cashReceiptService = require('./cashReceiptService');
const cashPaymentService = require('./cashPaymentService');
const ledgerService = require('./ledgerService');

/**
 * Cash Book Service
 * Handles cash book operations and balance tracking
 */
class CashBookService {
  /**
   * Get cash book balance
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<Object>} Cash book balance details
   */
  async getCashBookBalance(asOfDate = new Date()) {
    const [totalReceipts, totalPayments] = await Promise.all([
      cashReceiptService.getCashBookBalance(asOfDate),
      cashPaymentService.getCashBookPayments(asOfDate),
    ]);

    const balance = totalReceipts - totalPayments;

    return {
      asOfDate,
      totalReceipts,
      totalPayments,
      balance,
    };
  }

  /**
   * Get cash book summary for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Cash book summary
   */
  async getCashBookSummary(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Get opening balance (balance before start date)
    const openingBalanceData = await this.getCashBookBalance(startDate);
    const openingBalance = openingBalanceData.balance;

    // Get receipts and payments in the period
    const [receipts, payments, receiptStats, paymentStats] = await Promise.all([
      cashReceiptService.getReceiptsByDateRange(startDate, endDate),
      cashPaymentService.getPaymentsByDateRange(startDate, endDate),
      cashReceiptService.getReceiptStatistics(startDate, endDate),
      cashPaymentService.getPaymentStatistics(startDate, endDate),
    ]);

    // Calculate closing balance
    const closingBalanceData = await this.getCashBookBalance(endDate);
    const closingBalance = closingBalanceData.balance;

    return {
      period: {
        startDate,
        endDate,
      },
      openingBalance,
      receipts: {
        count: receiptStats.totalReceipts,
        amount: receiptStats.totalAmount,
        byStatus: receiptStats.byStatus,
        byPaymentMethod: receiptStats.byPaymentMethod,
        transactions: receipts,
      },
      payments: {
        count: paymentStats.totalPayments,
        amount: paymentStats.totalAmount,
        byStatus: paymentStats.byStatus,
        byPaymentMethod: paymentStats.byPaymentMethod,
        transactions: payments,
      },
      closingBalance,
      netCashFlow: receiptStats.totalAmount - paymentStats.totalAmount,
    };
  }

  /**
   * Get cash flow statement
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Cash flow statement
   */
  async getCashFlowStatement(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    const summary = await this.getCashBookSummary(startDate, endDate);

    return {
      period: summary.period,
      cashFlowFromOperations: {
        receiptsFromCustomers: summary.receipts.amount,
        paymentsToSuppliers: summary.payments.amount,
        netCashFlow: summary.netCashFlow,
      },
      cashBalance: {
        openingBalance: summary.openingBalance,
        netIncrease: summary.netCashFlow,
        closingBalance: summary.closingBalance,
      },
      breakdown: {
        receiptsByMethod: summary.receipts.byPaymentMethod,
        paymentsByMethod: summary.payments.byPaymentMethod,
      },
    };
  }

  /**
   * Get daily cash book entries
   * @param {Date} date - Date to get entries for
   * @returns {Promise<Object>} Daily cash book entries
   */
  async getDailyCashBook(date) {
    if (!date) {
      throw new Error('Date is required');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [receipts, payments] = await Promise.all([
      cashReceiptService.getReceiptsByDateRange(startOfDay, endOfDay),
      cashPaymentService.getPaymentsByDateRange(startOfDay, endOfDay),
    ]);

    // Get opening balance (balance at start of day)
    const openingBalanceData = await this.getCashBookBalance(startOfDay);
    const openingBalance = openingBalanceData.balance;

    // Calculate totals
    const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const closingBalance = openingBalance + totalReceipts - totalPayments;

    // Combine and sort transactions by time
    const allTransactions = [
      ...receipts.map((r) => ({
        type: 'receipt',
        time: r.receiptDate,
        number: r.receiptNumber,
        party: r.customerId,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        status: r.status,
        description: r.description,
      })),
      ...payments.map((p) => ({
        type: 'payment',
        time: p.paymentDate,
        number: p.paymentNumber,
        party: p.supplierId,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        description: p.description,
      })),
    ].sort((a, b) => a.time - b.time);

    return {
      date,
      openingBalance,
      transactions: allTransactions,
      totals: {
        receipts: totalReceipts,
        payments: totalPayments,
        net: totalReceipts - totalPayments,
      },
      closingBalance,
    };
  }

  /**
   * Get cash book transactions with running balance
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Transactions with running balance
   */
  async getCashBookWithRunningBalance(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Get opening balance
    const openingBalanceData = await this.getCashBookBalance(startDate);
    let runningBalance = openingBalanceData.balance;

    // Get all transactions
    const [receipts, payments] = await Promise.all([
      cashReceiptService.getReceiptsByDateRange(startDate, endDate),
      cashPaymentService.getPaymentsByDateRange(startDate, endDate),
    ]);

    // Combine and sort by date
    const allTransactions = [
      ...receipts.map((r) => ({
        date: r.receiptDate,
        type: 'receipt',
        number: r.receiptNumber,
        party: r.customerId,
        debit: r.amount,
        credit: 0,
        paymentMethod: r.paymentMethod,
        status: r.status,
        description: r.description,
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        type: 'payment',
        number: p.paymentNumber,
        party: p.supplierId,
        debit: 0,
        credit: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        description: p.description,
      })),
    ].sort((a, b) => a.date - b.date);

    // Calculate running balance for each transaction
    const transactionsWithBalance = allTransactions.map((txn) => {
      runningBalance += txn.debit - txn.credit;
      return {
        ...txn,
        balance: runningBalance,
      };
    });

    return {
      period: { startDate, endDate },
      openingBalance: openingBalanceData.balance,
      transactions: transactionsWithBalance,
      closingBalance: runningBalance,
    };
  }
}

module.exports = new CashBookService();
