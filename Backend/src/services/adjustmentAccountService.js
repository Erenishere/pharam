const Account = require('../models/Account');
const LedgerEntry = require('../models/LedgerEntry');
const ledgerService = require('./ledgerService');

/**
 * Adjustment Account Service
 * Phase 2 - Requirement 11: Adjustment Account Management
 * Task 44.2: Create adjustment ledger entries
 */
class AdjustmentAccountService {
  /**
   * Create adjustment ledger entries for discounts
   * @param {Object} invoice - Invoice object
   * @returns {Promise<Array>} Created ledger entries
   */
  async createAdjustmentEntries(invoice) {
    const entries = [];

    // Calculate total discount amount
    let totalDiscountAmount = 0;
    invoice.items.forEach((item) => {
      if (item.discount1Amount) {
        totalDiscountAmount += item.discount1Amount;
      }
      if (item.discount2Amount) {
        totalDiscountAmount += item.discount2Amount;
      }
    });

    // Create entries for adjustment account (discount)
    if (totalDiscountAmount > 0 && invoice.adjustmentAccountId) {
      const adjustmentAccount = await Account.findById(invoice.adjustmentAccountId);
      if (!adjustmentAccount) {
        throw new Error('Adjustment account not found');
      }

      if (!adjustmentAccount.isActive) {
        throw new Error(`Adjustment account ${adjustmentAccount.name} is not active`);
      }

      // Debit adjustment account (expense increases)
      const adjustmentEntry = await ledgerService.createLedgerEntry({
        accountId: invoice.adjustmentAccountId,
        accountType: 'Account',
        debit: totalDiscountAmount,
        credit: 0,
        description: `Discount adjustment for invoice ${invoice.invoiceNumber}`,
        transactionType: 'adjustment',
        referenceId: invoice._id,
        referenceModel: 'Invoice',
        transactionDate: invoice.invoiceDate,
      });

      entries.push(adjustmentEntry);
    }

    // Create entries for claim account (schemes)
    if (invoice.claimAccountId) {
      let totalSchemeAmount = 0;
      invoice.items.forEach((item) => {
        if (item.scheme2Quantity) {
          // Calculate scheme value (quantity * unit price)
          totalSchemeAmount += item.scheme2Quantity * item.unitPrice;
        }
      });

      if (totalSchemeAmount > 0) {
        const claimAccount = await Account.findById(invoice.claimAccountId);
        if (!claimAccount) {
          throw new Error('Claim account not found');
        }

        if (!claimAccount.isActive) {
          throw new Error(`Claim account ${claimAccount.name} is not active`);
        }

        // Debit claim account (expense increases)
        const claimEntry = await ledgerService.createLedgerEntry({
          accountId: invoice.claimAccountId,
          accountType: 'Account',
          debit: totalSchemeAmount,
          credit: 0,
          description: `Scheme claim for invoice ${invoice.invoiceNumber}`,
          transactionType: 'scheme_claim',
          referenceId: invoice._id,
          referenceModel: 'Invoice',
          transactionDate: invoice.invoiceDate,
        });

        entries.push(claimEntry);
      }
    }

    return entries;
  }

  /**
   * Get adjustment account report
   * Phase 2 - Requirement 11.3 - Task 44.3
   * @param {string} accountId - Account ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Adjustment account report
   */
  async getAdjustmentAccountReport(accountId, dateRange = {}) {
    const { startDate, endDate } = dateRange;

    // Validate account exists
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Build query
    const query = {
      accountId: accountId,
      transactionType: { $in: ['adjustment', 'scheme_claim'] },
    };

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.transactionDate.$lte = new Date(endDate);
      }
    }

    // Get all adjustment entries
    const entries = await LedgerEntry.find(query)
      .populate('referenceId')
      .sort('transactionDate')
      .lean();

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach((entry) => {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    });

    const balance = totalDebit - totalCredit;

    return {
      reportType: 'adjustment_account',
      account: {
        id: account._id,
        name: account.name,
        code: account.code,
        type: account.type,
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalEntries: entries.length,
        totalDebit,
        totalCredit,
        balance,
      },
      entries: entries.map((entry) => ({
        id: entry._id,
        date: entry.transactionDate,
        description: entry.description,
        transactionType: entry.transactionType,
        debit: entry.debit,
        credit: entry.credit,
        invoiceNumber: entry.referenceId?.invoiceNumber,
        invoiceId: entry.referenceId?._id,
      })),
      generatedAt: new Date(),
    };
  }

  /**
   * Reconcile adjustments
   * Phase 2 - Requirement 11.4 - Task 44.4
   * @param {string} accountId - Account ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Reconciliation report
   */
  async reconcileAdjustments(accountId, dateRange = {}) {
    const { startDate, endDate } = dateRange;

    // Get adjustment account report
    const report = await this.getAdjustmentAccountReport(accountId, dateRange);

    // Get all invoices with this adjustment account
    const Invoice = require('../models/Invoice');
    const invoiceQuery = {
      $or: [{ adjustmentAccountId: accountId }, { claimAccountId: accountId }],
    };

    if (startDate || endDate) {
      invoiceQuery.invoiceDate = {};
      if (startDate) {
        invoiceQuery.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        invoiceQuery.invoiceDate.$lte = new Date(endDate);
      }
    }

    const invoices = await Invoice.find(invoiceQuery).lean();

    // Match invoices to ledger entries
    const matched = [];
    const unmatched = [];

    invoices.forEach((invoice) => {
      const hasEntry = report.entries.some(
        (entry) => entry.invoiceId && entry.invoiceId.toString() === invoice._id.toString()
      );

      if (hasEntry) {
        matched.push({
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice._id,
          invoiceDate: invoice.invoiceDate,
          totalAmount: invoice.totalAmount,
        });
      } else {
        unmatched.push({
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice._id,
          invoiceDate: invoice.invoiceDate,
          totalAmount: invoice.totalAmount,
          reason: 'No ledger entry found',
        });
      }
    });

    // Find ledger entries without matching invoices
    const unmatchedEntries = report.entries.filter((entry) => !entry.invoiceId);

    return {
      reportType: 'adjustment_reconciliation',
      account: report.account,
      dateRange: report.dateRange,
      summary: {
        totalInvoices: invoices.length,
        matchedInvoices: matched.length,
        unmatchedInvoices: unmatched.length,
        unmatchedEntries: unmatchedEntries.length,
        totalBalance: report.summary.balance,
      },
      matched,
      unmatched,
      unmatchedEntries,
      generatedAt: new Date(),
    };
  }
}

module.exports = new AdjustmentAccountService();
