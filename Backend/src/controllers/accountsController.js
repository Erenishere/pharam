const ledgerService = require('../services/ledgerService');

/**
 * Accounts Controller
 * Handles HTTP requests for accounts, ledger, receivables, and payables operations
 */
class AccountsController {
  /**
   * Get ledger entries with filtering and pagination
   * GET /api/accounts/ledger
   */
  async getLedgerEntries(req, res) {
    try {
      const {
        accountId,
        accountType,
        transactionType,
        referenceType,
        startDate,
        endDate,
        page,
        limit,
        sort,
      } = req.query;

      const filters = {
        accountId,
        accountType,
        transactionType,
        referenceType,
        startDate,
        endDate,
      };

      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        sort,
      };

      const result = await ledgerService.getAllLedgerEntries(filters, options);

      res.status(200).json({
        success: true,
        message: 'Ledger entries retrieved successfully',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve ledger entries',
        message: error.message,
      });
    }
  }

  /**
   * Get ledger entry by ID
   * GET /api/accounts/ledger/:id
   */
  async getLedgerEntryById(req, res) {
    try {
      const { id } = req.params;
      const entry = await ledgerService.getLedgerEntryById(id);

      res.status(200).json({
        success: true,
        message: 'Ledger entry retrieved successfully',
        data: { entry },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Ledger entry not found',
        message: error.message,
      });
    }
  }

  /**
   * Get account balance
   * GET /api/accounts/balance/:accountId
   */
  async getAccountBalance(req, res) {
    try {
      const { accountId } = req.params;
      const { asOfDate } = req.query;

      const date = asOfDate ? new Date(asOfDate) : new Date();
      const balance = await ledgerService.calculateAccountBalance(accountId, date);

      res.status(200).json({
        success: true,
        message: 'Account balance retrieved successfully',
        data: {
          accountId,
          balance,
          asOfDate: date,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve account balance',
        message: error.message,
      });
    }
  }

  /**
   * Get account statement
   * GET /api/accounts/statement/:accountId
   */
  async getAccountStatement(req, res) {
    try {
      const { accountId } = req.params;
      const { accountType, startDate, endDate } = req.query;

      if (!accountType) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Account type is required',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Start date and end date are required',
        });
      }

      const statement = await ledgerService.generateAccountStatement(
        accountId,
        accountType,
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        message: 'Account statement generated successfully',
        data: statement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to generate account statement',
        message: error.message,
      });
    }
  }

  /**
   * Get customer receivables aging report
   * GET /api/accounts/receivables/aging
   */
  async getReceivablesAging(req, res) {
    try {
      const { asOfDate, customerId } = req.query;

      const date = asOfDate ? new Date(asOfDate) : new Date();
      const agingReport = await ledgerService.getCustomerReceivablesAging(date, customerId);

      res.status(200).json({
        success: true,
        message: 'Receivables aging report generated successfully',
        data: agingReport,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to generate receivables aging report',
        message: error.message,
      });
    }
  }

  /**
   * Get customer receivables summary
   * GET /api/accounts/receivables/summary/:customerId
   */
  async getCustomerReceivablesSummary(req, res) {
    try {
      const { customerId } = req.params;
      const summary = await ledgerService.getCustomerReceivablesSummary(customerId);

      res.status(200).json({
        success: true,
        message: 'Customer receivables summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Failed to retrieve customer receivables summary',
        message: error.message,
      });
    }
  }

  /**
   * Get supplier payables report
   * GET /api/accounts/payables
   */
  async getSupplierPayables(req, res) {
    try {
      const { asOfDate, supplierId } = req.query;

      const date = asOfDate ? new Date(asOfDate) : new Date();
      const payablesReport = await ledgerService.getSupplierPayables(date, supplierId);

      res.status(200).json({
        success: true,
        message: 'Supplier payables report generated successfully',
        data: payablesReport,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to generate supplier payables report',
        message: error.message,
      });
    }
  }

  /**
   * Get supplier payables summary
   * GET /api/accounts/payables/summary/:supplierId
   */
  async getSupplierPayablesSummary(req, res) {
    try {
      const { supplierId } = req.params;
      const summary = await ledgerService.getSupplierPayablesSummary(supplierId);

      res.status(200).json({
        success: true,
        message: 'Supplier payables summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Failed to retrieve supplier payables summary',
        message: error.message,
      });
    }
  }

  /**
   * Get trial balance
   * GET /api/accounts/trial-balance
   */
  async getTrialBalance(req, res) {
    try {
      const { asOfDate } = req.query;
      const date = asOfDate ? new Date(asOfDate) : new Date();

      const trialBalance = await ledgerService.getTrialBalance(date);

      res.status(200).json({
        success: true,
        message: 'Trial balance retrieved successfully',
        data: trialBalance,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve trial balance',
        message: error.message,
      });
    }
  }

  /**
   * Get ledger summary by account type
   * GET /api/accounts/summary/:accountType
   */
  async getLedgerSummary(req, res) {
    try {
      const { accountType } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Start date and end date are required',
        });
      }

      const summary = await ledgerService.getLedgerSummaryByAccountType(
        accountType,
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        message: 'Ledger summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve ledger summary',
        message: error.message,
      });
    }
  }

  /**
   * Get account balances for multiple accounts
   * POST /api/accounts/balances
   */
  async getAccountBalances(req, res) {
    try {
      const { accountIds, asOfDate } = req.body;

      if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Account IDs array is required',
        });
      }

      const date = asOfDate ? new Date(asOfDate) : new Date();
      const balances = await ledgerService.getAccountBalances(accountIds, date);

      res.status(200).json({
        success: true,
        message: 'Account balances retrieved successfully',
        data: {
          balances,
          asOfDate: date,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve account balances',
        message: error.message,
      });
    }
  }
}

module.exports = new AccountsController();
