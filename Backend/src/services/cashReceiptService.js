const CashReceipt = require('../models/CashReceipt');
const Customer = require('../models/Customer');
const ledgerService = require('./ledgerService');

/**
 * Cash Receipt Service
 * Handles business logic for cash receipt operations with ledger integration
 */
class CashReceiptService {
  /**
   * Create a new cash receipt
   * @param {Object} receiptData - Cash receipt data
   * @param {string} receiptData.salesmanId - Optional Salesman ID for commission tracking
   * @returns {Promise<Object>} Created cash receipt
   */
  async createCashReceipt(receiptData) {
    // Validate required fields
    if (!receiptData.customerId) {
      throw new Error('Customer ID is required');
    }
    if (!receiptData.amount || receiptData.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!receiptData.paymentMethod) {
      throw new Error('Payment method is required');
    }
    if (!receiptData.createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate customer exists and is active
    const customer = await Customer.findById(receiptData.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    if (!customer.isActive) {
      throw new Error('Customer is not active');
    }

    // Validate salesman if provided
    if (receiptData.salesmanId) {
      await this.validateSalesman(receiptData.salesmanId);
    }

    // Create cash receipt
    const receipt = new CashReceipt(receiptData);
    await receipt.save();

    // Create ledger entries for cash receipt
    // Debit: Cash/Bank Account (asset increases)
    // Credit: Customer Account (receivable decreases)
    await ledgerService.createDoubleEntry(
      {
        accountId: 'CASH_ACCOUNT', // This would be a cash/bank account ID
        accountType: 'Asset',
      },
      {
        accountId: receiptData.customerId,
        accountType: 'Customer',
      },
      receiptData.amount,
      `Cash receipt ${receipt.receiptNumber} from customer`,
      'cash_receipt',
      receipt._id,
      receiptData.createdBy
    );

    // Populate customer details
    await receipt.populate('customerId', 'code name contactInfo');
    await receipt.populate('createdBy', 'username email');

    return receipt;
  }

  /**
   * Get cash receipt by ID
   * @param {string} id - Receipt ID
   * @returns {Promise<Object>} Cash receipt
   */
  async getCashReceiptById(id) {
    const receipt = await CashReceipt.findById(id)
      .populate('customerId', 'code name contactInfo financialInfo')
      .populate('createdBy', 'username email');

    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    return receipt;
  }

  /**
   * Get all cash receipts with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated cash receipts
   */
  async getAllCashReceipts(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = '-receiptDate' } = options;
    const skip = (page - 1) * limit;

    // Build query filters
    const query = {};

    if (filters.customerId) {
      query.customerId = filters.customerId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }
    if (filters.startDate || filters.endDate) {
      query.receiptDate = {};
      if (filters.startDate) {
        query.receiptDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.receiptDate.$lte = new Date(filters.endDate);
      }
    }

    const [receipts, total] = await Promise.all([
      CashReceipt.find(query)
        .populate('customerId', 'code name')
        .populate('createdBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      CashReceipt.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      receipts,
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
   * Update cash receipt
   * @param {string} id - Receipt ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated cash receipt
   */
  async updateCashReceipt(id, updateData) {
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    // Don't allow updating cleared or cancelled receipts
    if (receipt.status === 'cleared' || receipt.status === 'cancelled') {
      throw new Error(`Cannot update ${receipt.status} receipt`);
    }

    // Update allowed fields
    const allowedFields = [
      'receiptDate',
      'amount',
      'paymentMethod',
      'referenceNumber',
      'bankDetails',
      'description',
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        receipt[field] = updateData[field];
      }
    });

    await receipt.save();
    await receipt.populate('customerId', 'code name');
    await receipt.populate('createdBy', 'username');

    return receipt;
  }

  /**
   * Clear cash receipt
   * @param {string} id - Receipt ID
   * @returns {Promise<Object>} Cleared cash receipt
   */
  async clearCashReceipt(id) {
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    await receipt.clearReceipt();
    await receipt.populate('customerId', 'code name');
    await receipt.populate('createdBy', 'username');

    return receipt;
  }

  /**
   * Get cash book balance
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<number>} Cash book balance
   */
  async getCashBookBalance(asOfDate = new Date()) {
    // Calculate total receipts
    const receiptsQuery = {
      status: { $in: ['cleared', 'pending'] },
      receiptDate: { $lte: asOfDate },
    };
    const totalReceipts = await CashReceipt.aggregate([
      { $match: receiptsQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return totalReceipts[0]?.total || 0;
  }

  /**
   * Mark cash receipt as bounced
   * @param {string} id - Receipt ID
   * @returns {Promise<Object>} Updated cash receipt
   */
  async markReceiptAsBounced(id) {
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    await receipt.markAsBounced();
    await receipt.populate('customerId', 'code name');
    await receipt.populate('createdBy', 'username');

    return receipt;
  }

  /**
   * Cancel cash receipt
   * @param {string} id - Receipt ID
   * @returns {Promise<Object>} Cancelled cash receipt
   */
  async cancelCashReceipt(id) {
    const receipt = await CashReceipt.findById(id);
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    await receipt.cancelReceipt();
    await receipt.populate('customerId', 'code name');
    await receipt.populate('createdBy', 'username');

    return receipt;
  }

  /**
   * Get receipts by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Cash receipts
   */
  async getReceiptsByCustomer(customerId, options = {}) {
    const { limit = 50, status } = options;

    const query = { customerId };
    if (status) {
      query.status = status;
    }

    return CashReceipt.find(query)
      .populate('createdBy', 'username')
      .sort({ receiptDate: -1 })
      .limit(parseInt(limit, 10));
  }

  /**
   * Get receipts by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Cash receipts
   */
  async getReceiptsByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return CashReceipt.findByDateRange(startDate, endDate);
  }

  /**
   * Get pending receipts
   * @returns {Promise<Array>} Pending cash receipts
   */
  async getPendingReceipts() {
    return CashReceipt.findPendingReceipts();
  }

  /**
   * Get cash receipt statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Receipt statistics
   */
  async getReceiptStatistics(startDate, endDate) {
    const query = {};
    if (startDate && endDate) {
      query.receiptDate = { $gte: startDate, $lte: endDate };
    }

    const [totalReceipts, statusBreakdown, paymentMethodBreakdown, totalAmount] = await Promise.all([
      CashReceipt.countDocuments(query),
      CashReceipt.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      ]),
      CashReceipt.aggregate([
        { $match: query },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      ]),
      CashReceipt.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      totalReceipts,
      totalAmount: totalAmount[0]?.total || 0,
      byStatus: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = { count: item.count, amount: item.totalAmount };
        return acc;
      }, {}),
      byPaymentMethod: paymentMethodBreakdown.reduce((acc, item) => {
        acc[item._id] = { count: item.count, amount: item.totalAmount };
        return acc;
      }, {}),
    };
  }

  /**
   * Phase 2: Record post-dated cheque (Requirement 7.1, 7.2)
   * Creates a cash receipt with pending status
   * Does not update cash balance until post date
   * @param {Object} receiptData - Post-dated cheque receipt data
   * @returns {Promise<Object>} Created cash receipt
   */
  async recordPostDatedCheque(receiptData) {
    // Validate required fields
    if (!receiptData.customerId) {
      throw new Error('Customer ID is required');
    }
    if (!receiptData.amount || receiptData.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!receiptData.createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate post-dated cheque specific fields
    if (!receiptData.bankDetails || !receiptData.bankDetails.bankName) {
      throw new Error('Bank name is required for post-dated cheques');
    }
    if (!receiptData.bankDetails.chequeNumber) {
      throw new Error('Cheque number is required for post-dated cheques');
    }
    if (!receiptData.bankDetails.chequeDate) {
      throw new Error('Cheque date is required for post-dated cheques');
    }

    // Validate customer exists and is active
    const customer = await Customer.findById(receiptData.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    if (!customer.isActive) {
      throw new Error('Customer is not active');
    }

    // Set payment method to cheque and post-dated flag
    receiptData.paymentMethod = 'cheque';
    receiptData.postDatedCheque = true;
    receiptData.status = 'pending';
    receiptData.chequeStatus = 'pending';

    // Create cash receipt
    const receipt = new CashReceipt(receiptData);
    await receipt.save();

    // Note: Do NOT create ledger entries yet - wait until cheque clears
    // This is different from regular cash receipts

    // Populate customer details
    await receipt.populate('customerId', 'code name contactInfo');
    await receipt.populate('createdBy', 'username email');

    return receipt;
  }

  /**
   * Phase 2: Clear post-dated cheque (Requirement 7.3)
   * Updates cheque status to 'cleared'
   * Updates cash balance on clearance
   * Sets clearedDate
   * @param {string} receiptId - Receipt ID
   * @param {string} userId - User ID performing the clearance
   * @returns {Promise<Object>} Cleared cash receipt
   */
  async clearCheque(receiptId, userId) {
    const receipt = await CashReceipt.findById(receiptId);
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    // Validate it's a post-dated cheque
    if (!receipt.postDatedCheque) {
      throw new Error('This is not a post-dated cheque');
    }

    // Validate current status
    if (receipt.chequeStatus !== 'pending') {
      throw new Error(`Cannot clear cheque with status: ${receipt.chequeStatus}`);
    }

    // Update cheque status
    receipt.chequeStatus = 'cleared';
    receipt.status = 'cleared';
    receipt.clearedDate = new Date();
    await receipt.save();

    // Now create ledger entries for the cleared cheque
    // Debit: Cash/Bank Account (asset increases)
    // Credit: Customer Account (receivable decreases)
    await ledgerService.createDoubleEntry(
      {
        accountId: 'CASH_ACCOUNT', // This would be a cash/bank account ID
        accountType: 'Asset',
      },
      {
        accountId: receipt.customerId,
        accountType: 'Customer',
      },
      receipt.amount,
      `Post-dated cheque cleared - ${receipt.receiptNumber} from ${receipt.bankDetails.bankName}`,
      'cash_receipt',
      receipt._id,
      userId
    );

    // Populate customer details
    await receipt.populate('customerId', 'code name contactInfo');
    await receipt.populate('createdBy', 'username email');

    return receipt;
  }

  /**
   * Phase 2: Handle bounced cheque (Requirement 7.4)
   * Updates cheque status to 'bounced'
   * Reverses the receipt entry if it was cleared
   * Restores customer balance
   * @param {string} receiptId - Receipt ID
   * @param {string} reason - Bounce reason
   * @param {string} userId - User ID performing the action
   * @returns {Promise<Object>} Updated cash receipt
   */
  async bounceCheque(receiptId, reason, userId) {
    const receipt = await CashReceipt.findById(receiptId);
    if (!receipt) {
      throw new Error('Cash receipt not found');
    }

    // Validate it's a post-dated cheque
    if (!receipt.postDatedCheque) {
      throw new Error('This is not a post-dated cheque');
    }

    // Validate current status
    if (receipt.chequeStatus === 'bounced') {
      throw new Error('Cheque is already marked as bounced');
    }

    const wasCleared = receipt.chequeStatus === 'cleared';

    // Update cheque status
    receipt.chequeStatus = 'bounced';
    receipt.status = 'bounced';
    receipt.bounceReason = reason;
    await receipt.save();

    // If the cheque was already cleared, reverse the ledger entries
    if (wasCleared) {
      // Create reverse ledger entries
      // Debit: Customer Account (receivable increases - restore balance)
      // Credit: Cash/Bank Account (asset decreases)
      await ledgerService.createDoubleEntry(
        {
          accountId: receipt.customerId,
          accountType: 'Customer',
        },
        {
          accountId: 'CASH_ACCOUNT',
          accountType: 'Asset',
        },
        receipt.amount,
        `Cheque bounced - Reversal of ${receipt.receiptNumber}. Reason: ${reason}`,
        'cash_receipt_reversal',
        receipt._id,
        userId
      );
    }

    // Populate customer details
    await receipt.populate('customerId', 'code name contactInfo');
    await receipt.populate('createdBy', 'username email');

    return receipt;
  }

  /**
   * Phase 2: Get pending post-dated cheques (Requirement 7.5)
   * Returns all post-dated cheques with pending status
   * @returns {Promise<Array>} Pending post-dated cheques
   */
  async getPendingPostDatedCheques() {
    return CashReceipt.findPendingPostDatedCheques();
  }

  /**
   * Phase 2: Get post-dated cheques by due date (Requirement 7.5)
   * Returns post-dated cheques within the specified date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Post-dated cheques
   */
  async getPostDatedChequesByDueDate(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return CashReceipt.findPostDatedChequesByDueDate(startDate, endDate);
  }

  /**
   * Phase 2: Apply payment to invoices (Requirement 8.3, 8.4)
   * Allows partial payment against multiple invoices
   * Calculates and stores difference amounts
   * Updates invoice payment status
   * @param {Object} receiptData - Receipt data with invoice payments
   * @returns {Promise<Object>} Created cash receipt with invoice payments
   */
  async applyPaymentToInvoices(receiptData) {
    const { customerId, amount, invoicePayments, createdBy } = receiptData;

    // Validate required fields
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!invoicePayments || invoicePayments.length === 0) {
      throw new Error('At least one invoice payment is required');
    }
    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    if (!customer.isActive) {
      throw new Error('Customer is not active');
    }

    // Get salesInvoiceService for aging calculation
    const salesInvoiceService = require('./salesInvoiceService');
    const Invoice = require('../models/Invoice');

    // Validate and enrich invoice payments
    const enrichedPayments = [];
    let totalPaidAmount = 0;

    for (const payment of invoicePayments) {
      const { invoiceId, paidAmount } = payment;

      if (!invoiceId) {
        throw new Error('Invoice ID is required for each payment');
      }
      if (!paidAmount || paidAmount <= 0) {
        throw new Error('Paid amount must be greater than 0');
      }

      // Get invoice
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      // Validate invoice belongs to customer
      if (invoice.customerId.toString() !== customerId.toString()) {
        throw new Error(`Invoice ${invoice.invoiceNumber} does not belong to this customer`);
      }

      // Validate invoice is confirmed
      if (invoice.status !== 'confirmed') {
        throw new Error(`Invoice ${invoice.invoiceNumber} is not confirmed`);
      }

      // Calculate invoice age
      const daysOld = salesInvoiceService.calculateInvoiceAge(invoice.invoiceDate);

      // Calculate due amount
      const totalAmount = invoice.totals.grandTotal;
      const previouslyPaid = invoice.totals.paidAmount || 0;
      const dueAmount = totalAmount - previouslyPaid;

      // Validate paid amount doesn't exceed due amount
      if (paidAmount > dueAmount) {
        throw new Error(
          `Paid amount (${paidAmount}) exceeds due amount (${dueAmount}) for invoice ${invoice.invoiceNumber}`
        );
      }

      // Calculate difference
      const difference = dueAmount - paidAmount;

      enrichedPayments.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        daysOld,
        dueAmount,
        paidAmount,
        difference,
      });

      totalPaidAmount += paidAmount;
    }

    // Validate total paid amount matches receipt amount
    if (Math.abs(totalPaidAmount - amount) > 0.01) {
      throw new Error(
        `Total paid amount (${totalPaidAmount}) does not match receipt amount (${amount})`
      );
    }

    // Create cash receipt with invoice payments
    const receipt = new CashReceipt({
      ...receiptData,
      invoicePayments: enrichedPayments,
    });
    await receipt.save();

    // Update invoice payment status and paid amounts
    for (const payment of enrichedPayments) {
      const invoice = await Invoice.findById(payment.invoiceId);
      
      // Update paid amount
      const previouslyPaid = invoice.totals.paidAmount || 0;
      invoice.totals.paidAmount = previouslyPaid + payment.paidAmount;

      // Update payment status
      const totalAmount = invoice.totals.grandTotal;
      const newPaidAmount = invoice.totals.paidAmount;

      if (newPaidAmount >= totalAmount) {
        invoice.paymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        invoice.paymentStatus = 'partial';
      }

      await invoice.save();
    }

    // Create ledger entries
    await ledgerService.createDoubleEntry(
      {
        accountId: 'CASH_ACCOUNT',
        accountType: 'Asset',
      },
      {
        accountId: customerId,
        accountType: 'Customer',
      },
      amount,
      `Cash receipt ${receipt.receiptNumber} - Payment against ${enrichedPayments.length} invoice(s)`,
      'cash_receipt',
      receipt._id,
      createdBy
    );

    // Populate and return
    await receipt.populate('customerId', 'code name contactInfo');
    await receipt.populate('createdBy', 'username email');
    await receipt.populate('invoicePayments.invoiceId', 'invoiceNumber invoiceDate totals');

    return receipt;
  }

  /**
   * Validate salesman exists and is active
   * @param {string} salesmanId - Salesman ID
   * @returns {Promise<Object>} Validated salesman
   */
  async validateSalesman(salesmanId) {
    if (!salesmanId) {
      throw new Error('Salesman ID is required');
    }

    const Salesman = require('../models/Salesman');
    
    const salesman = await Salesman.findById(salesmanId);
    if (!salesman) {
      throw new Error(`Salesman not found: ${salesmanId}`);
    }

    if (!salesman.isActive) {
      throw new Error(`Salesman ${salesman.name} is not active`);
    }

    return salesman;
  }
}

module.exports = new CashReceiptService();
