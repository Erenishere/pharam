const ledgerRepository = require('../repositories/ledgerRepository');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

/**
 * Ledger Service
 * Handles business logic for ledger operations and double-entry bookkeeping
 */
class LedgerService {
  /**
   * Create a ledger entry
   * @param {Object} entryData - Ledger entry data
   * @returns {Promise<Object>} Created ledger entry
   */
  async createLedgerEntry(entryData) {
    // Validate required fields
    if (!entryData.accountId) {
      throw new Error('Account ID is required');
    }
    if (!entryData.accountType) {
      throw new Error('Account type is required');
    }
    if (!entryData.transactionType) {
      throw new Error('Transaction type is required');
    }
    if (!entryData.amount || entryData.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!entryData.description) {
      throw new Error('Description is required');
    }
    if (!entryData.referenceType) {
      throw new Error('Reference type is required');
    }
    if (!entryData.createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate account exists
    await this.validateAccount(entryData.accountId, entryData.accountType);

    return ledgerRepository.create(entryData);
  }

  /**
   * Create double entry (debit and credit)
   * @param {Object} debitAccount - Debit account details {accountId, accountType}
   * @param {Object} creditAccount - Credit account details {accountId, accountType}
   * @param {number} amount - Transaction amount
   * @param {string} description - Transaction description
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {string} createdBy - User ID creating the entry
   * @returns {Promise<Object>} Created entries
   */
  async createDoubleEntry(debitAccount, creditAccount, amount, description, referenceType, referenceId, createdBy) {
    // Validate inputs
    if (!debitAccount || !debitAccount.accountId || !debitAccount.accountType) {
      throw new Error('Valid debit account details are required');
    }
    if (!creditAccount || !creditAccount.accountId || !creditAccount.accountType) {
      throw new Error('Valid credit account details are required');
    }
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!description) {
      throw new Error('Description is required');
    }
    if (!referenceType) {
      throw new Error('Reference type is required');
    }
    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate both accounts exist
    await this.validateAccount(debitAccount.accountId, debitAccount.accountType);
    await this.validateAccount(creditAccount.accountId, creditAccount.accountType);

    return ledgerRepository.createDoubleEntry(
      debitAccount,
      creditAccount,
      amount,
      description,
      referenceType,
      referenceId,
      createdBy
    );
  }

  /**
   * Validate that an account exists
   * @param {string} accountId - Account ID
   * @param {string} accountType - Account type (Customer, Supplier, User, Account)
   * @returns {Promise<Object>} Account object
   */
  async validateAccount(accountId, accountType) {
    let account;

    switch (accountType) {
      case 'Customer':
        account = await Customer.findById(accountId);
        if (!account) {
          throw new Error('Customer not found');
        }
        if (!account.isActive) {
          throw new Error('Customer is not active');
        }
        break;

      case 'Supplier':
        account = await Supplier.findById(accountId);
        if (!account) {
          throw new Error('Supplier not found');
        }
        if (!account.isActive) {
          throw new Error('Supplier is not active');
        }
        break;

      case 'Account':
        const Account = require('../models/Account');
        account = await Account.findById(accountId);
        if (!account) {
          throw new Error('Account not found');
        }
        if (!account.isActive) {
          throw new Error('Account is not active');
        }
        break;

      case 'User':
        // User validation can be added if needed
        // For now, we'll assume User accounts are valid
        break;

      default:
        throw new Error(`Invalid account type: ${accountType}`);
    }

    return account;
  }

  /**
   * Get ledger entry by ID
   * @param {string} id - Entry ID
   * @returns {Promise<Object>} Ledger entry
   */
  async getLedgerEntryById(id) {
    const entry = await ledgerRepository.findById(id);
    if (!entry) {
      throw new Error('Ledger entry not found');
    }
    return entry;
  }

  /**
   * Get ledger entries by account
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Ledger entries
   */
  async getLedgerEntriesByAccount(accountId, options = {}) {
    const { limit = 50 } = options;
    return ledgerRepository.findByAccount(accountId, limit);
  }

  /**
   * Get ledger entries by reference
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Array>} Ledger entries
   */
  async getLedgerEntriesByReference(referenceType, referenceId) {
    return ledgerRepository.findByReference(referenceType, referenceId);
  }

  /**
   * Get ledger entries by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} accountId - Optional account ID filter
   * @returns {Promise<Array>} Ledger entries
   */
  async getLedgerEntriesByDateRange(startDate, endDate, accountId = null) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return ledgerRepository.findByDateRange(startDate, endDate, accountId);
  }

  /**
   * Calculate account balance
   * @param {string} accountId - Account ID
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<number>} Account balance
   */
  async calculateAccountBalance(accountId, asOfDate = new Date()) {
    return ledgerRepository.calculateAccountBalance(accountId, asOfDate);
  }

  /**
   * Get account statement
   * @param {string} accountId - Account ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Account statement
   */
  async getAccountStatement(accountId, startDate, endDate) {
    if (!accountId) {
      throw new Error('Account ID is required');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return ledgerRepository.getAccountStatement(accountId, startDate, endDate);
  }

  /**
   * Get all ledger entries with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated ledger entries
   */
  async getAllLedgerEntries(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort, ...otherOptions } = options;
    const skip = (page - 1) * limit;

    // Build filters
    const queryFilters = {};

    if (filters.accountId) {
      queryFilters.accountId = filters.accountId;
    }
    if (filters.accountType) {
      queryFilters.accountType = filters.accountType;
    }
    if (filters.transactionType) {
      queryFilters.transactionType = filters.transactionType;
    }
    if (filters.referenceType) {
      queryFilters.referenceType = filters.referenceType;
    }
    if (filters.startDate || filters.endDate) {
      queryFilters.transactionDate = {};
      if (filters.startDate) {
        queryFilters.transactionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        queryFilters.transactionDate.$lte = new Date(filters.endDate);
      }
    }

    // Build sort options
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.transactionDate = -1;
    }

    const [entries, total] = await Promise.all([
      ledgerRepository.search(queryFilters, { ...otherOptions, limit, skip, sort: sortOptions }),
      ledgerRepository.count(queryFilters),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      entries,
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
   * Get account balances for multiple accounts
   * @param {Array} accountIds - Array of account IDs
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<Object>} Map of account ID to balance
   */
  async getAccountBalances(accountIds, asOfDate = new Date()) {
    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      throw new Error('Account IDs array is required');
    }

    return ledgerRepository.getAccountBalances(accountIds, asOfDate);
  }

  /**
   * Get ledger summary by account type
   * @param {string} accountType - Account type (Customer, Supplier, User)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Summary statistics
   */
  async getLedgerSummaryByAccountType(accountType, startDate, endDate) {
    if (!accountType) {
      throw new Error('Account type is required');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    const summary = await ledgerRepository.getSummaryByAccountType(accountType, startDate, endDate);

    // Format the summary
    const result = {
      accountType,
      startDate,
      endDate,
      totalDebits: 0,
      totalCredits: 0,
      debitCount: 0,
      creditCount: 0,
      netBalance: 0,
    };

    summary.forEach((item) => {
      if (item._id === 'debit') {
        result.totalDebits = item.totalAmount;
        result.debitCount = item.count;
      } else if (item._id === 'credit') {
        result.totalCredits = item.totalAmount;
        result.creditCount = item.count;
      }
    });

    result.netBalance = result.totalDebits - result.totalCredits;

    return result;
  }

  /**
   * Get trial balance
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<Object>} Trial balance
   */
  async getTrialBalance(asOfDate = new Date()) {
    const trialBalance = await ledgerRepository.getTrialBalance(asOfDate);

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;

    trialBalance.forEach((account) => {
      totalDebits += account.debitTotal;
      totalCredits += account.creditTotal;
    });

    return {
      asOfDate,
      accounts: trialBalance,
      totals: {
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits,
      },
    };
  }

  /**
   * Reverse ledger entries by reference
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {string} reason - Reason for reversal
   * @param {string} createdBy - User ID creating the reversal
   * @returns {Promise<Array>} Created reversal entries
   */
  async reverseLedgerEntries(referenceType, referenceId, reason, createdBy) {
    if (!referenceType || !referenceId) {
      throw new Error('Reference type and ID are required');
    }
    if (!reason) {
      throw new Error('Reason for reversal is required');
    }
    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Get original entries
    const originalEntries = await ledgerRepository.findByReference(referenceType, referenceId);

    if (originalEntries.length === 0) {
      throw new Error('No ledger entries found for the given reference');
    }

    // Create reversal entries
    const reversalEntries = [];

    for (const entry of originalEntries) {
      const reversalType = entry.transactionType === 'debit' ? 'credit' : 'debit';

      const reversalEntry = await this.createLedgerEntry({
        accountId: entry.accountId,
        accountType: entry.accountType,
        transactionType: reversalType,
        amount: entry.amount,
        description: `${reason} - Reverse of: ${entry.description}`,
        referenceType: 'adjustment',
        referenceId: entry._id,
        currency: entry.currency,
        exchangeRate: entry.exchangeRate,
        createdBy,
      });

      reversalEntries.push(reversalEntry);
    }

    return reversalEntries;
  }

  /**
   * Get customer receivables aging report
   * @param {Date} asOfDate - Calculate aging as of this date
   * @param {string} customerId - Optional specific customer ID
   * @returns {Promise<Object>} Receivables aging report
   */
  async getCustomerReceivablesAging(asOfDate = new Date(), customerId = null) {
    const Invoice = require('../models/Invoice');

    // Build query for sales invoices
    const query = {
      type: 'sales',
      status: { $in: ['confirmed', 'paid'] },
      paymentStatus: { $in: ['pending', 'partial'] },
    };

    if (customerId) {
      query.customerId = customerId;
    }

    // Get all unpaid/partially paid sales invoices
    const invoices = await Invoice.find(query)
      .populate('customerId', 'code name contactInfo financialInfo')
      .sort({ dueDate: 1 });

    // Calculate aging buckets
    const agingReport = {
      asOfDate,
      customers: {},
      summary: {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0,
      },
    };

    for (const invoice of invoices) {
      const customerId = invoice.customerId._id.toString();
      
      // Initialize customer entry if not exists
      if (!agingReport.customers[customerId]) {
        agingReport.customers[customerId] = {
          customer: invoice.customerId,
          invoices: [],
          aging: {
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            over90: 0,
            total: 0,
          },
        };
      }

      // Calculate days overdue
      const daysOverdue = Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24));
      const outstandingAmount = invoice.totals.grandTotal;

      // Categorize into aging bucket
      let agingBucket;
      if (daysOverdue <= 0) {
        agingBucket = 'current';
      } else if (daysOverdue <= 30) {
        agingBucket = 'days1to30';
      } else if (daysOverdue <= 60) {
        agingBucket = 'days31to60';
      } else if (daysOverdue <= 90) {
        agingBucket = 'days61to90';
      } else {
        agingBucket = 'over90';
      }

      // Add to customer aging
      agingReport.customers[customerId].aging[agingBucket] += outstandingAmount;
      agingReport.customers[customerId].aging.total += outstandingAmount;

      // Add to summary
      agingReport.summary[agingBucket] += outstandingAmount;
      agingReport.summary.total += outstandingAmount;

      // Add invoice details
      agingReport.customers[customerId].invoices.push({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        amount: outstandingAmount,
        daysOverdue,
        agingBucket,
      });
    }

    // Convert customers object to array
    agingReport.customers = Object.values(agingReport.customers);

    return agingReport;
  }

  /**
   * Get supplier payables management report
   * @param {Date} asOfDate - Calculate payables as of this date
   * @param {string} supplierId - Optional specific supplier ID
   * @returns {Promise<Object>} Payables management report
   */
  async getSupplierPayables(asOfDate = new Date(), supplierId = null) {
    const Invoice = require('../models/Invoice');

    // Build query for purchase invoices
    const query = {
      type: 'purchase',
      status: { $in: ['confirmed', 'paid'] },
      paymentStatus: { $in: ['pending', 'partial'] },
    };

    if (supplierId) {
      query.supplierId = supplierId;
    }

    // Get all unpaid/partially paid purchase invoices
    const invoices = await Invoice.find(query)
      .populate('supplierId', 'code name contactInfo financialInfo')
      .sort({ dueDate: 1 });

    // Calculate payables by due date
    const payablesReport = {
      asOfDate,
      suppliers: {},
      summary: {
        currentDue: 0,
        dueSoon: 0, // Due within 7 days
        overdue: 0,
        total: 0,
      },
    };

    for (const invoice of invoices) {
      const supplierId = invoice.supplierId._id.toString();
      
      // Initialize supplier entry if not exists
      if (!payablesReport.suppliers[supplierId]) {
        payablesReport.suppliers[supplierId] = {
          supplier: invoice.supplierId,
          invoices: [],
          totals: {
            currentDue: 0,
            dueSoon: 0,
            overdue: 0,
            total: 0,
          },
        };
      }

      // Calculate days until/past due
      const daysUntilDue = Math.floor((invoice.dueDate - asOfDate) / (1000 * 60 * 60 * 24));
      const outstandingAmount = invoice.totals.grandTotal;

      // Categorize by due status
      let dueStatus;
      if (daysUntilDue < 0) {
        dueStatus = 'overdue';
      } else if (daysUntilDue <= 7) {
        dueStatus = 'dueSoon';
      } else {
        dueStatus = 'currentDue';
      }

      // Add to supplier totals
      payablesReport.suppliers[supplierId].totals[dueStatus] += outstandingAmount;
      payablesReport.suppliers[supplierId].totals.total += outstandingAmount;

      // Add to summary
      payablesReport.summary[dueStatus] += outstandingAmount;
      payablesReport.summary.total += outstandingAmount;

      // Add invoice details
      payablesReport.suppliers[supplierId].invoices.push({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        amount: outstandingAmount,
        daysUntilDue,
        dueStatus,
        paymentTerms: invoice.supplierId.financialInfo.paymentTerms,
      });
    }

    // Convert suppliers object to array and sort by total payable
    payablesReport.suppliers = Object.values(payablesReport.suppliers)
      .sort((a, b) => b.totals.total - a.totals.total);

    return payablesReport;
  }

  /**
   * Generate detailed account statement
   * @param {string} accountId - Account ID
   * @param {string} accountType - Account type (Customer, Supplier)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Detailed account statement
   */
  async generateAccountStatement(accountId, accountType, startDate, endDate) {
    if (!accountId) {
      throw new Error('Account ID is required');
    }
    if (!accountType) {
      throw new Error('Account type is required');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // Validate and get account details
    const account = await this.validateAccount(accountId, accountType);

    // Get opening balance (balance before start date)
    const openingBalance = await ledgerRepository.calculateAccountBalance(accountId, startDate);

    // Get transactions within date range
    const transactions = await ledgerRepository.findByDateRange(startDate, endDate, accountId);

    // Get related invoices
    const Invoice = require('../models/Invoice');
    const invoiceQuery = {
      status: { $ne: 'cancelled' },
      invoiceDate: { $gte: startDate, $lte: endDate },
    };

    if (accountType === 'Customer') {
      invoiceQuery.customerId = accountId;
      invoiceQuery.type = 'sales';
    } else if (accountType === 'Supplier') {
      invoiceQuery.supplierId = accountId;
      invoiceQuery.type = 'purchase';
    }

    const invoices = await Invoice.find(invoiceQuery).sort({ invoiceDate: 1 });

    // Build statement with running balance
    let runningBalance = openingBalance;
    const statementLines = [];

    // Combine and sort transactions and invoices by date
    const allTransactions = [
      ...transactions.map(t => ({
        date: t.transactionDate,
        type: 'ledger',
        description: t.description,
        reference: `${t.referenceType}-${t.referenceId}`,
        debit: t.transactionType === 'debit' ? t.amount : 0,
        credit: t.transactionType === 'credit' ? t.amount : 0,
        balance: 0, // Will be calculated
      })),
      ...invoices.map(inv => ({
        date: inv.invoiceDate,
        type: 'invoice',
        description: `Invoice ${inv.invoiceNumber}`,
        reference: inv.invoiceNumber,
        debit: inv.type === 'sales' ? inv.totals.grandTotal : 0,
        credit: inv.type === 'purchase' ? inv.totals.grandTotal : 0,
        dueDate: inv.dueDate,
        paymentStatus: inv.paymentStatus,
        balance: 0, // Will be calculated
      })),
    ].sort((a, b) => a.date - b.date);

    // Calculate running balance
    allTransactions.forEach(transaction => {
      runningBalance += transaction.debit - transaction.credit;
      transaction.balance = runningBalance;
      statementLines.push(transaction);
    });

    // Calculate closing balance
    const closingBalance = await ledgerRepository.calculateAccountBalance(accountId, endDate);

    // Calculate summary
    const summary = {
      totalDebits: statementLines.reduce((sum, line) => sum + line.debit, 0),
      totalCredits: statementLines.reduce((sum, line) => sum + line.credit, 0),
      netMovement: 0,
    };
    summary.netMovement = summary.totalDebits - summary.totalCredits;

    return {
      account: {
        id: accountId,
        type: accountType,
        details: account,
      },
      period: {
        startDate,
        endDate,
      },
      balances: {
        opening: openingBalance,
        closing: closingBalance,
      },
      transactions: statementLines,
      summary,
      invoices: {
        total: invoices.length,
        pending: invoices.filter(inv => inv.paymentStatus === 'pending').length,
        partial: invoices.filter(inv => inv.paymentStatus === 'partial').length,
        paid: invoices.filter(inv => inv.paymentStatus === 'paid').length,
      },
    };
  }

  /**
   * Get receivables summary for a customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Receivables summary
   */
  async getCustomerReceivablesSummary(customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const Invoice = require('../models/Invoice');

    // Get all unpaid invoices
    const unpaidInvoices = await Invoice.find({
      customerId,
      type: 'sales',
      status: { $in: ['confirmed', 'paid'] },
      paymentStatus: { $in: ['pending', 'partial'] },
    });

    // Calculate totals
    const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    const overdueInvoices = unpaidInvoices.filter(inv => inv.dueDate < new Date());
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);

    // Get current balance from ledger
    const currentBalance = await ledgerRepository.calculateAccountBalance(customerId, new Date());

    return {
      customer: {
        id: customer._id,
        code: customer.code,
        name: customer.name,
        creditLimit: customer.financialInfo.creditLimit,
      },
      receivables: {
        total: totalReceivable,
        overdue: totalOverdue,
        current: totalReceivable - totalOverdue,
      },
      ledgerBalance: currentBalance,
      availableCredit: customer.financialInfo.creditLimit - totalReceivable,
      invoiceCount: {
        total: unpaidInvoices.length,
        overdue: overdueInvoices.length,
      },
    };
  }

  /**
   * Get payables summary for a supplier
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Object>} Payables summary
   */
  async getSupplierPayablesSummary(supplierId) {
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const Invoice = require('../models/Invoice');

    // Get all unpaid invoices
    const unpaidInvoices = await Invoice.find({
      supplierId,
      type: 'purchase',
      status: { $in: ['confirmed', 'paid'] },
      paymentStatus: { $in: ['pending', 'partial'] },
    });

    // Calculate totals
    const totalPayable = unpaidInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    const overdueInvoices = unpaidInvoices.filter(inv => inv.dueDate < new Date());
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    const dueSoonInvoices = unpaidInvoices.filter(inv => {
      const daysUntilDue = Math.floor((inv.dueDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });
    const totalDueSoon = dueSoonInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);

    // Get current balance from ledger
    const currentBalance = await ledgerRepository.calculateAccountBalance(supplierId, new Date());

    return {
      supplier: {
        id: supplier._id,
        code: supplier.code,
        name: supplier.name,
        paymentTerms: supplier.financialInfo.paymentTerms,
      },
      payables: {
        total: totalPayable,
        overdue: totalOverdue,
        dueSoon: totalDueSoon,
        current: totalPayable - totalOverdue - totalDueSoon,
      },
      ledgerBalance: currentBalance,
      invoiceCount: {
        total: unpaidInvoices.length,
        overdue: overdueInvoices.length,
        dueSoon: dueSoonInvoices.length,
      },
    };
  }
}

module.exports = new LedgerService();
