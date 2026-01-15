const LedgerEntry = require('../models/LedgerEntry');
const mongoose = require('mongoose');

/**
 * Ledger Repository
 * Handles database operations for ledger entries
 */
class LedgerRepository {
  /**
   * Create a new ledger entry
   * @param {Object} entryData - Ledger entry data
   * @returns {Promise<Object>} Created ledger entry
   */
  async create(entryData) {
    const entry = new LedgerEntry(entryData);
    return entry.save();
  }

  /**
   * Create multiple ledger entries in bulk
   * @param {Array} entriesData - Array of ledger entry data
   * @returns {Promise<Array>} Created ledger entries
   */
  async createBulk(entriesData) {
    return LedgerEntry.insertMany(entriesData);
  }

  /**
   * Create double entry (debit and credit)
   * @param {Object} debitAccount - Debit account details
   * @param {Object} creditAccount - Credit account details
   * @param {number} amount - Transaction amount
   * @param {string} description - Transaction description
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {string} createdBy - User ID creating the entry
   * @returns {Promise<Object>} Created entries
   */
  async createDoubleEntry(debitAccount, creditAccount, amount, description, referenceType, referenceId, createdBy) {
    const session = await mongoose.startSession();
    let result;

    try {
      await session.withTransaction(async () => {
        // Create debit entry
        const debitEntry = new LedgerEntry({
          accountId: debitAccount.accountId,
          accountType: debitAccount.accountType,
          transactionType: 'debit',
          amount,
          description,
          referenceType,
          referenceId,
          transactionDate: new Date(),
          currency: debitAccount.currency || 'PKR',
          exchangeRate: debitAccount.exchangeRate || 1,
          createdBy,
        });

        // Create credit entry
        const creditEntry = new LedgerEntry({
          accountId: creditAccount.accountId,
          accountType: creditAccount.accountType,
          transactionType: 'credit',
          amount,
          description,
          referenceType,
          referenceId,
          transactionDate: new Date(),
          currency: creditAccount.currency || 'PKR',
          exchangeRate: creditAccount.exchangeRate || 1,
          createdBy,
        });

        await debitEntry.save({ session });
        await creditEntry.save({ session });

        result = { debitEntry, creditEntry };
      });

      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Find ledger entry by ID
   * @param {string} id - Entry ID
   * @returns {Promise<Object>} Ledger entry
   */
  async findById(id) {
    return LedgerEntry.findById(id)
      .populate('accountId')
      .populate('createdBy', 'username email');
  }

  /**
   * Find ledger entries by account
   * @param {string} accountId - Account ID
   * @param {number} limit - Maximum number of records
   * @returns {Promise<Array>} Ledger entries
   */
  async findByAccount(accountId, limit = 50) {
    return LedgerEntry.findByAccount(accountId, limit);
  }

  /**
   * Find ledger entries by reference
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Array>} Ledger entries
   */
  async findByReference(referenceType, referenceId) {
    return LedgerEntry.findByReference(referenceType, referenceId);
  }

  /**
   * Find ledger entries by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} accountId - Optional account ID filter
   * @returns {Promise<Array>} Ledger entries
   */
  async findByDateRange(startDate, endDate, accountId = null) {
    return LedgerEntry.findByDateRange(startDate, endDate, accountId);
  }

  /**
   * Calculate account balance
   * @param {string} accountId - Account ID
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<number>} Account balance
   */
  async calculateAccountBalance(accountId, asOfDate = new Date()) {
    return LedgerEntry.calculateAccountBalance(accountId, asOfDate);
  }

  /**
   * Get account statement
   * @param {string} accountId - Account ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Account statement with opening, closing balance and transactions
   */
  async getAccountStatement(accountId, startDate, endDate) {
    return LedgerEntry.getAccountStatement(accountId, startDate, endDate);
  }

  /**
   * Search ledger entries with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Ledger entries
   */
  async search(filters = {}, options = {}) {
    const query = LedgerEntry.find(filters)
      .populate('accountId')
      .populate('createdBy', 'username');

    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ transactionDate: -1 });
    }

    if (options.limit) {
      query.limit(parseInt(options.limit, 10));
    }

    if (options.skip) {
      query.skip(parseInt(options.skip, 10));
    }

    return query.exec();
  }

  /**
   * Count ledger entries matching filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<number>} Count
   */
  async count(filters = {}) {
    return LedgerEntry.countDocuments(filters);
  }

  /**
   * Delete ledger entries by reference
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteByReference(referenceType, referenceId) {
    return LedgerEntry.deleteMany({ referenceType, referenceId });
  }

  /**
   * Get account balances for multiple accounts
   * @param {Array} accountIds - Array of account IDs
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<Object>} Map of account ID to balance
   */
  async getAccountBalances(accountIds, asOfDate = new Date()) {
    const balances = {};

    for (const accountId of accountIds) {
      balances[accountId] = await this.calculateAccountBalance(accountId, asOfDate);
    }

    return balances;
  }

  /**
   * Get ledger summary by account type
   * @param {string} accountType - Account type (Customer, Supplier, User)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Summary statistics
   */
  async getSummaryByAccountType(accountType, startDate, endDate) {
    const summary = await LedgerEntry.aggregate([
      {
        $match: {
          accountType,
          transactionDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$transactionType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return summary;
  }

  /**
   * Get trial balance
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<Array>} Trial balance with all accounts
   */
  async getTrialBalance(asOfDate = new Date()) {
    const entries = await LedgerEntry.find({
      transactionDate: { $lte: asOfDate },
    }).populate('accountId');

    // Group by account and calculate balances
    const accountBalances = {};

    entries.forEach((entry) => {
      const accountId = entry.accountId._id.toString();

      if (!accountBalances[accountId]) {
        accountBalances[accountId] = {
          accountId: entry.accountId,
          accountType: entry.accountType,
          debitTotal: 0,
          creditTotal: 0,
          balance: 0,
        };
      }

      if (entry.transactionType === 'debit') {
        accountBalances[accountId].debitTotal += entry.amount;
        accountBalances[accountId].balance += entry.amount;
      } else {
        accountBalances[accountId].creditTotal += entry.amount;
        accountBalances[accountId].balance -= entry.amount;
      }
    });

    return Object.values(accountBalances);
  }
}

module.exports = new LedgerRepository();
