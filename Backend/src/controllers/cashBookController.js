const cashReceiptService = require('../services/cashReceiptService');
const cashPaymentService = require('../services/cashPaymentService');
const cashBookService = require('../services/cashBookService');

/**
 * Cash Book Controller
 * Handles HTTP requests for cash book operations
 */
class CashBookController {
  /**
   * Create cash receipt
   * POST /api/v1/cashbook/receipts
   */
  async createCashReceipt(req, res) {
    try {
      const receiptData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const receipt = await cashReceiptService.createCashReceipt(receiptData);

      res.status(201).json({
        success: true,
        message: 'Cash receipt created successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create cash receipt',
        message: error.message,
      });
    }
  }

  /**
   * Get all cash receipts
   * GET /api/v1/cashbook/receipts
   */
  async getAllCashReceipts(req, res) {
    try {
      const { customerId, status, paymentMethod, startDate, endDate, page, limit, sort } =
        req.query;

      const filters = {
        customerId,
        status,
        paymentMethod,
        startDate,
        endDate,
      };

      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        sort: sort || '-receiptDate',
      };

      const result = await cashReceiptService.getAllCashReceipts(filters, options);

      res.status(200).json({
        success: true,
        message: 'Cash receipts retrieved successfully',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve cash receipts',
        message: error.message,
      });
    }
  }

  /**
   * Get cash receipt by ID
   * GET /api/v1/cashbook/receipts/:id
   */
  async getCashReceiptById(req, res) {
    try {
      const { id } = req.params;
      const receipt = await cashReceiptService.getCashReceiptById(id);

      res.status(200).json({
        success: true,
        message: 'Cash receipt retrieved successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Cash receipt not found',
        message: error.message,
      });
    }
  }

  /**
   * Update cash receipt
   * PUT /api/v1/cashbook/receipts/:id
   */
  async updateCashReceipt(req, res) {
    try {
      const { id } = req.params;
      const receipt = await cashReceiptService.updateCashReceipt(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Cash receipt updated successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update cash receipt',
        message: error.message,
      });
    }
  }

  /**
   * Clear cash receipt
   * POST /api/v1/cashbook/receipts/:id/clear
   */
  async clearCashReceipt(req, res) {
    try {
      const { id } = req.params;
      const receipt = await cashReceiptService.clearCashReceipt(id);

      res.status(200).json({
        success: true,
        message: 'Cash receipt cleared successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to clear cash receipt',
        message: error.message,
      });
    }
  }

  /**
   * Cancel cash receipt
   * POST /api/v1/cashbook/receipts/:id/cancel
   */
  async cancelCashReceipt(req, res) {
    try {
      const { id } = req.params;
      const receipt = await cashReceiptService.cancelCashReceipt(id);

      res.status(200).json({
        success: true,
        message: 'Cash receipt cancelled successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to cancel cash receipt',
        message: error.message,
      });
    }
  }

  /**
   * Create cash payment
   * POST /api/v1/cashbook/payments
   */
  async createCashPayment(req, res) {
    try {
      const paymentData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const payment = await cashPaymentService.createCashPayment(paymentData);

      res.status(201).json({
        success: true,
        message: 'Cash payment created successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create cash payment',
        message: error.message,
      });
    }
  }

  /**
   * Get all cash payments
   * GET /api/v1/cashbook/payments
   */
  async getAllCashPayments(req, res) {
    try {
      const { supplierId, status, paymentMethod, startDate, endDate, page, limit, sort } =
        req.query;

      const filters = {
        supplierId,
        status,
        paymentMethod,
        startDate,
        endDate,
      };

      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        sort: sort || '-paymentDate',
      };

      const result = await cashPaymentService.getAllCashPayments(filters, options);

      res.status(200).json({
        success: true,
        message: 'Cash payments retrieved successfully',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve cash payments',
        message: error.message,
      });
    }
  }

  /**
   * Get cash payment by ID
   * GET /api/v1/cashbook/payments/:id
   */
  async getCashPaymentById(req, res) {
    try {
      const { id } = req.params;
      const payment = await cashPaymentService.getCashPaymentById(id);

      res.status(200).json({
        success: true,
        message: 'Cash payment retrieved successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Cash payment not found',
        message: error.message,
      });
    }
  }

  /**
   * Update cash payment
   * PUT /api/v1/cashbook/payments/:id
   */
  async updateCashPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await cashPaymentService.updateCashPayment(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Cash payment updated successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update cash payment',
        message: error.message,
      });
    }
  }

  /**
   * Clear cash payment
   * POST /api/v1/cashbook/payments/:id/clear
   */
  async clearCashPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await cashPaymentService.clearCashPayment(id);

      res.status(200).json({
        success: true,
        message: 'Cash payment cleared successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to clear cash payment',
        message: error.message,
      });
    }
  }

  /**
   * Cancel cash payment
   * POST /api/v1/cashbook/payments/:id/cancel
   */
  async cancelCashPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await cashPaymentService.cancelCashPayment(id);

      res.status(200).json({
        success: true,
        message: 'Cash payment cancelled successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to cancel cash payment',
        message: error.message,
      });
    }
  }

  /**
   * Get cash book balance
   * GET /api/v1/cashbook/balance
   */
  async getCashBookBalance(req, res) {
    try {
      const { asOfDate } = req.query;
      const date = asOfDate ? new Date(asOfDate) : new Date();

      const balance = await cashBookService.getCashBookBalance(date);

      res.status(200).json({
        success: true,
        message: 'Cash book balance retrieved successfully',
        data: balance,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve cash book balance',
        message: error.message,
      });
    }
  }

  /**
   * Get cash book summary
   * GET /api/v1/cashbook/summary
   */
  async getCashBookSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Start date and end date are required',
        });
      }

      const summary = await cashBookService.getCashBookSummary(
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        message: 'Cash book summary retrieved successfully',
        data: summary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve cash book summary',
        message: error.message,
      });
    }
  }

  /**
   * Get cash flow statement
   * GET /api/v1/cashbook/cash-flow
   */
  async getCashFlowStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Start date and end date are required',
        });
      }

      const statement = await cashBookService.getCashFlowStatement(
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        message: 'Cash flow statement retrieved successfully',
        data: statement,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve cash flow statement',
        message: error.message,
      });
    }
  }

  /**
   * Get daily cash book
   * GET /api/v1/cashbook/daily
   */
  async getDailyCashBook(req, res) {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Date is required',
        });
      }

      const dailyBook = await cashBookService.getDailyCashBook(new Date(date));

      res.status(200).json({
        success: true,
        message: 'Daily cash book retrieved successfully',
        data: dailyBook,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve daily cash book',
        message: error.message,
      });
    }
  }

  /**
   * Get pending receipts
   * GET /api/v1/cashbook/receipts/pending
   */
  async getPendingReceipts(req, res) {
    try {
      const receipts = await cashReceiptService.getPendingReceipts();

      res.status(200).json({
        success: true,
        message: 'Pending receipts retrieved successfully',
        data: { receipts },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve pending receipts',
        message: error.message,
      });
    }
  }

  /**
   * Get pending payments
   * GET /api/v1/cashbook/payments/pending
   */
  async getPendingPayments(req, res) {
    try {
      const payments = await cashPaymentService.getPendingPayments();

      res.status(200).json({
        success: true,
        message: 'Pending payments retrieved successfully',
        data: { payments },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve pending payments',
        message: error.message,
      });
    }
  }

  /**
   * Get receipt statistics
   * GET /api/v1/cashbook/receipts/statistics
   */
  async getReceiptStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await cashReceiptService.getReceiptStatistics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Receipt statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve receipt statistics',
        message: error.message,
      });
    }
  }

  /**
   * Get payment statistics
   * GET /api/v1/cashbook/payments/statistics
   */
  async getPaymentStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await cashPaymentService.getPaymentStatistics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Payment statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve payment statistics',
        message: error.message,
      });
    }
  }

  /**
   * Phase 2: Record post-dated cheque
   * POST /api/v1/cashbook/receipts/post-dated-cheque
   * Requirement 7.1, 7.2
   */
  async recordPostDatedCheque(req, res) {
    try {
      const receiptData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const receipt = await cashReceiptService.recordPostDatedCheque(receiptData);

      res.status(201).json({
        success: true,
        message: 'Post-dated cheque recorded successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to record post-dated cheque',
        message: error.message,
      });
    }
  }

  /**
   * Phase 2: Clear post-dated cheque
   * POST /api/v1/cashbook/receipts/:id/clear-cheque
   * Requirement 7.3
   */
  async clearCheque(req, res) {
    try {
      const { id } = req.params;
      const receipt = await cashReceiptService.clearCheque(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Cheque cleared successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to clear cheque',
        message: error.message,
      });
    }
  }

  /**
   * Phase 2: Bounce post-dated cheque
   * POST /api/v1/cashbook/receipts/:id/bounce-cheque
   * Requirement 7.4
   */
  async bounceCheque(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Bounce reason is required',
        });
      }

      const receipt = await cashReceiptService.bounceCheque(id, reason, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Cheque marked as bounced successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to bounce cheque',
        message: error.message,
      });
    }
  }

  /**
   * Phase 2: Get pending post-dated cheques
   * GET /api/v1/cashbook/receipts/pending-cheques
   * Requirement 7.5
   */
  async getPendingCheques(req, res) {
    try {
      const cheques = await cashReceiptService.getPendingPostDatedCheques();

      res.status(200).json({
        success: true,
        message: 'Pending post-dated cheques retrieved successfully',
        data: { cheques },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve pending cheques',
        message: error.message,
      });
    }
  }

  /**
   * Phase 2: Apply payment to invoices (Requirement 8.1, 8.3)
   * POST /api/v1/cashbook/receipts/apply-to-invoices
   */
  async applyPaymentToInvoices(req, res) {
    try {
      const receiptData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const receipt = await cashReceiptService.applyPaymentToInvoices(receiptData);

      res.status(201).json({
        success: true,
        message: 'Payment applied to invoices successfully',
        data: { receipt },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to apply payment to invoices',
        message: error.message,
      });
    }
  }

  /**
   * Phase 2: Get pending invoices for customer (Requirement 8.1)
   * GET /api/v1/cashbook/customers/:customerId/pending-invoices
   */
  async getPendingInvoices(req, res) {
    try {
      const { customerId } = req.params;
      const salesInvoiceService = require('../services/salesInvoiceService');

      const pendingInvoices = await salesInvoiceService.getPendingInvoices(customerId);

      res.status(200).json({
        success: true,
        message: 'Pending invoices retrieved successfully',
        data: { pendingInvoices },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve pending invoices',
        message: error.message,
      });
    }
  }
}

module.exports = new CashBookController();
