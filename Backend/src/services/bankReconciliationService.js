const BankReconciliation = require('../models/BankReconciliation');
const CashReceipt = require('../models/CashReceipt');
const CashPayment = require('../models/CashPayment');
const cashBookService = require('./cashBookService');

/**
 * Bank Reconciliation Service
 * Handles business logic for bank reconciliation operations
 */
class BankReconciliationService {
  /**
   * Create a new bank reconciliation
   * @param {Object} reconciliationData - Reconciliation data
   * @returns {Promise<Object>} Created reconciliation
   */
  async createBankReconciliation(reconciliationData) {
    // Validate required fields
    if (!reconciliationData.bankAccount) {
      throw new Error('Bank account information is required');
    }
    if (!reconciliationData.statementPeriod) {
      throw new Error('Statement period is required');
    }
    if (!reconciliationData.createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Get book balance for the period
    const bookBalance = await cashBookService.getCashBookBalance(
      reconciliationData.statementPeriod.endDate
    );

    // Set opening and closing balances
    if (!reconciliationData.openingBalance) {
      const openingBalance = await cashBookService.getCashBookBalance(
        reconciliationData.statementPeriod.startDate
      );
      reconciliationData.openingBalance = {
        bookBalance: openingBalance.balance,
        bankBalance: reconciliationData.openingBalance?.bankBalance || 0,
      };
    }

    if (!reconciliationData.closingBalance) {
      reconciliationData.closingBalance = {
        bookBalance: bookBalance.balance,
        bankBalance: reconciliationData.closingBalance?.bankBalance || 0,
      };
    }

    // Create reconciliation
    const reconciliation = new BankReconciliation(reconciliationData);
    await reconciliation.save();

    await reconciliation.populate('createdBy', 'username email');

    return reconciliation;
  }

  /**
   * Get bank reconciliation by ID
   * @param {string} id - Reconciliation ID
   * @returns {Promise<Object>} Bank reconciliation
   */
  async getBankReconciliationById(id) {
    const reconciliation = await BankReconciliation.findById(id)
      .populate('createdBy', 'username email')
      .populate('approvedBy', 'username email');

    if (!reconciliation) {
      throw new Error('Bank reconciliation not found');
    }

    return reconciliation;
  }

  /**
   * Get all bank reconciliations with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated reconciliations
   */
  async getAllBankReconciliations(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = '-reconciliationDate' } = options;
    const skip = (page - 1) * limit;

    // Build query filters
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.accountNumber) {
      query['bankAccount.accountNumber'] = filters.accountNumber;
    }
    if (filters.startDate || filters.endDate) {
      query.reconciliationDate = {};
      if (filters.startDate) {
        query.reconciliationDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.reconciliationDate.$lte = new Date(filters.endDate);
      }
    }

    const [reconciliations, total] = await Promise.all([
      BankReconciliation.find(query)
        .populate('createdBy', 'username')
        .populate('approvedBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      BankReconciliation.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      reconciliations,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
    };
  }

  /**
   * Match transactions with bank statement
   * @param {string} reconciliationId - Reconciliation ID
   * @param {Array} bankStatementItems - Bank statement items
   * @returns {Promise<Object>} Updated reconciliation with matched items
   */
  async matchTransactions(reconciliationId, bankStatementItems) {
    const reconciliation = await BankReconciliation.findById(reconciliationId);
    if (!reconciliation) {
      throw new Error('Bank reconciliation not found');
    }

    if (reconciliation.status !== 'draft') {
      throw new Error('Can only match transactions for draft reconciliations');
    }

    // Get all receipts and payments for the period
    const [receipts, payments] = await Promise.all([
      CashReceipt.find({
        receiptDate: {
          $gte: reconciliation.statementPeriod.startDate,
          $lte: reconciliation.statementPeriod.endDate,
        },
        status: { $in: ['cleared', 'pending'] },
      }).populate('customerId', 'code name'),
      CashPayment.find({
        paymentDate: {
          $gte: reconciliation.statementPeriod.startDate,
          $lte: reconciliation.statementPeriod.endDate,
        },
        status: { $in: ['cleared', 'pending'] },
      }).populate('supplierId', 'code name'),
    ]);

    // Match receipts
    receipts.forEach((receipt) => {
      const matchedStatement = bankStatementItems.find(
        (item) =>
          item.type === 'credit' &&
          Math.abs(item.amount - receipt.amount) < 0.01 && // Allow small rounding differences
          this._isDateClose(item.date, receipt.receiptDate, 3) // Within 3 days
      );

      const reconciliationItem = {
        transactionType: 'receipt',
        transactionId: receipt._id,
        transactionModel: 'CashReceipt',
        transactionNumber: receipt.receiptNumber,
        transactionDate: receipt.receiptDate,
        amount: receipt.amount,
        status: 'unmatched',
      };

      if (matchedStatement) {
        reconciliationItem.status = 'matched';
        reconciliationItem.bankStatementDate = matchedStatement.date;
        reconciliationItem.bankStatementAmount = matchedStatement.amount;
        reconciliationItem.bankReference = matchedStatement.reference;

        // Check for discrepancy
        if (Math.abs(matchedStatement.amount - receipt.amount) > 0.01) {
          reconciliationItem.status = 'discrepancy';
          reconciliationItem.discrepancyAmount = matchedStatement.amount - receipt.amount;
          reconciliationItem.discrepancyReason = 'Amount mismatch';
        }

        // Mark statement item as matched
        matchedStatement.matched = true;
      }

      reconciliation.items.push(reconciliationItem);
    });

    // Match payments
    payments.forEach((payment) => {
      const matchedStatement = bankStatementItems.find(
        (item) =>
          item.type === 'debit' &&
          Math.abs(item.amount - payment.amount) < 0.01 &&
          this._isDateClose(item.date, payment.paymentDate, 3)
      );

      const reconciliationItem = {
        transactionType: 'payment',
        transactionId: payment._id,
        transactionModel: 'CashPayment',
        transactionNumber: payment.paymentNumber,
        transactionDate: payment.paymentDate,
        amount: payment.amount,
        status: 'unmatched',
      };

      if (matchedStatement) {
        reconciliationItem.status = 'matched';
        reconciliationItem.bankStatementDate = matchedStatement.date;
        reconciliationItem.bankStatementAmount = matchedStatement.amount;
        reconciliationItem.bankReference = matchedStatement.reference;

        if (Math.abs(matchedStatement.amount - payment.amount) > 0.01) {
          reconciliationItem.status = 'discrepancy';
          reconciliationItem.discrepancyAmount = matchedStatement.amount - payment.amount;
          reconciliationItem.discrepancyReason = 'Amount mismatch';
        }

        matchedStatement.matched = true;
      }

      reconciliation.items.push(reconciliationItem);
    });

    // Add unmatched bank statement items
    bankStatementItems
      .filter((item) => !item.matched)
      .forEach((item) => {
        reconciliation.items.push({
          transactionType: item.type === 'credit' ? 'receipt' : 'payment',
          bankStatementDate: item.date,
          bankStatementAmount: item.amount,
          bankReference: item.reference,
          status: 'unmatched',
          discrepancyReason: 'No matching book transaction',
        });
      });

    await reconciliation.save();
    return reconciliation;
  }

  /**
   * Helper method to check if dates are close
   * @private
   */
  _isDateClose(date1, date2, days) {
    const diff = Math.abs(new Date(date1) - new Date(date2));
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    return daysDiff <= days;
  }

  /**
   * Update reconciliation item status
   * @param {string} reconciliationId - Reconciliation ID
   * @param {string} itemId - Item ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated reconciliation
   */
  async updateReconciliationItem(reconciliationId, itemId, updateData) {
    const reconciliation = await BankReconciliation.findById(reconciliationId);
    if (!reconciliation) {
      throw new Error('Bank reconciliation not found');
    }

    if (reconciliation.status !== 'draft') {
      throw new Error('Can only update items for draft reconciliations');
    }

    const item = reconciliation.items.id(itemId);
    if (!item) {
      throw new Error('Reconciliation item not found');
    }

    // Update allowed fields
    if (updateData.status) item.status = updateData.status;
    if (updateData.discrepancyReason) item.discrepancyReason = updateData.discrepancyReason;
    if (updateData.bankReference) item.bankReference = updateData.bankReference;

    await reconciliation.save();
    return reconciliation;
  }

  /**
   * Complete bank reconciliation
   * @param {string} id - Reconciliation ID
   * @returns {Promise<Object>} Completed reconciliation
   */
  async completeBankReconciliation(id) {
    const reconciliation = await BankReconciliation.findById(id);
    if (!reconciliation) {
      throw new Error('Bank reconciliation not found');
    }

    await reconciliation.complete();
    await reconciliation.populate('createdBy', 'username');

    return reconciliation;
  }

  /**
   * Approve bank reconciliation
   * @param {string} id - Reconciliation ID
   * @param {string} userId - User ID approving
   * @returns {Promise<Object>} Approved reconciliation
   */
  async approveBankReconciliation(id, userId) {
    const reconciliation = await BankReconciliation.findById(id);
    if (!reconciliation) {
      throw new Error('Bank reconciliation not found');
    }

    await reconciliation.approve(userId);
    await reconciliation.populate('createdBy', 'username');
    await reconciliation.populate('approvedBy', 'username');

    return reconciliation;
  }

  /**
   * Get reconciliation report
   * @param {string} id - Reconciliation ID
   * @returns {Promise<Object>} Reconciliation report
   */
  async getReconciliationReport(id) {
    const reconciliation = await this.getBankReconciliationById(id);

    const report = {
      reconciliationNumber: reconciliation.reconciliationNumber,
      bankAccount: reconciliation.bankAccount,
      reconciliationDate: reconciliation.reconciliationDate,
      statementPeriod: reconciliation.statementPeriod,
      balances: {
        opening: reconciliation.openingBalance,
        closing: reconciliation.closingBalance,
        difference: {
          book: reconciliation.closingBalance.bookBalance - reconciliation.openingBalance.bookBalance,
          bank:
            reconciliation.closingBalance.bankBalance - reconciliation.openingBalance.bankBalance,
        },
      },
      summary: reconciliation.summary,
      matchedItems: reconciliation.items.filter((item) => item.status === 'matched'),
      unmatchedItems: reconciliation.items.filter((item) => item.status === 'unmatched'),
      discrepancies: reconciliation.items.filter((item) => item.status === 'discrepancy'),
      status: reconciliation.status,
      isReconciled: reconciliation.isReconciled,
    };

    return report;
  }

  /**
   * Get reconciliation statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Reconciliation statistics
   */
  async getReconciliationStatistics(startDate, endDate) {
    const query = {};
    if (startDate && endDate) {
      query.reconciliationDate = { $gte: startDate, $lte: endDate };
    }

    const [totalReconciliations, statusBreakdown, reconciliationSummary] = await Promise.all([
      BankReconciliation.countDocuments(query),
      BankReconciliation.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      BankReconciliation.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalMatched: { $sum: '$summary.matchedItems' },
            totalUnmatched: { $sum: '$summary.unmatchedItems' },
            totalDiscrepancies: { $sum: '$summary.discrepancies' },
            totalDiscrepancyAmount: { $sum: '$summary.totalDiscrepancyAmount' },
          },
        },
      ]),
    ]);

    return {
      totalReconciliations,
      byStatus: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      summary: reconciliationSummary[0] || {
        totalMatched: 0,
        totalUnmatched: 0,
        totalDiscrepancies: 0,
        totalDiscrepancyAmount: 0,
      },
    };
  }
}

module.exports = new BankReconciliationService();
