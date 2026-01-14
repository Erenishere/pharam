const CashPayment = require('../models/CashPayment');
const Supplier = require('../models/Supplier');
const ledgerService = require('./ledgerService');

/**
 * Cash Payment Service
 * Handles business logic for cash payment operations with ledger integration
 */
class CashPaymentService {
  /**
   * Create a new cash payment
   * @param {Object} paymentData - Cash payment data
   * @returns {Promise<Object>} Created cash payment
   */
  async createCashPayment(paymentData) {
    // Validate required fields
    if (!paymentData.supplierId) {
      throw new Error('Supplier ID is required');
    }
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!paymentData.paymentMethod) {
      throw new Error('Payment method is required');
    }
    if (!paymentData.createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate supplier exists and is active
    const supplier = await Supplier.findById(paymentData.supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    if (!supplier.isActive) {
      throw new Error('Supplier is not active');
    }

    // Create cash payment
    const payment = new CashPayment(paymentData);
    await payment.save();

    // Create ledger entries for cash payment
    // Debit: Supplier Account (payable decreases)
    // Credit: Cash/Bank Account (asset decreases)
    await ledgerService.createDoubleEntry(
      {
        accountId: paymentData.supplierId,
        accountType: 'Supplier',
      },
      {
        accountId: 'CASH_ACCOUNT', // This would be a cash/bank account ID
        accountType: 'Asset',
      },
      paymentData.amount,
      `Cash payment ${payment.paymentNumber} to supplier`,
      'cash_payment',
      payment._id,
      paymentData.createdBy
    );

    // Populate supplier details
    await payment.populate('supplierId', 'code name contactInfo');
    await payment.populate('createdBy', 'username email');

    return payment;
  }

  /**
   * Get cash payment by ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Cash payment
   */
  async getCashPaymentById(id) {
    const payment = await CashPayment.findById(id)
      .populate('supplierId', 'code name contactInfo financialInfo')
      .populate('createdBy', 'username email');

    if (!payment) {
      throw new Error('Cash payment not found');
    }

    return payment;
  }

  /**
   * Get all cash payments with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated cash payments
   */
  async getAllCashPayments(filters = {}, options = {}) {
    const { page = 1, limit = 50, sort = '-paymentDate' } = options;
    const skip = (page - 1) * limit;

    // Build query filters
    const query = {};

    if (filters.supplierId) {
      query.supplierId = filters.supplierId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }
    if (filters.startDate || filters.endDate) {
      query.paymentDate = {};
      if (filters.startDate) {
        query.paymentDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.paymentDate.$lte = new Date(filters.endDate);
      }
    }

    const [payments, total] = await Promise.all([
      CashPayment.find(query)
        .populate('supplierId', 'code name')
        .populate('createdBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      CashPayment.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      payments,
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
   * Update cash payment
   * @param {string} id - Payment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated cash payment
   */
  async updateCashPayment(id, updateData) {
    const payment = await CashPayment.findById(id);
    if (!payment) {
      throw new Error('Cash payment not found');
    }

    // Don't allow updating cleared or cancelled payments
    if (payment.status === 'cleared' || payment.status === 'cancelled') {
      throw new Error(`Cannot update ${payment.status} payment`);
    }

    // Update allowed fields
    const allowedFields = [
      'paymentDate',
      'amount',
      'paymentMethod',
      'referenceNumber',
      'bankDetails',
      'description',
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        payment[field] = updateData[field];
      }
    });

    await payment.save();
    await payment.populate('supplierId', 'code name');
    await payment.populate('createdBy', 'username');

    return payment;
  }

  /**
   * Clear cash payment
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Cleared cash payment
   */
  async clearCashPayment(id) {
    const payment = await CashPayment.findById(id);
    if (!payment) {
      throw new Error('Cash payment not found');
    }

    await payment.clearPayment();
    await payment.populate('supplierId', 'code name');
    await payment.populate('createdBy', 'username');

    return payment;
  }

  /**
   * Cancel cash payment
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Cancelled cash payment
   */
  async cancelCashPayment(id) {
    const payment = await CashPayment.findById(id);
    if (!payment) {
      throw new Error('Cash payment not found');
    }

    await payment.cancelPayment();
    await payment.populate('supplierId', 'code name');
    await payment.populate('createdBy', 'username');

    return payment;
  }

  /**
   * Get cash book balance (payments side)
   * @param {Date} asOfDate - Calculate balance as of this date
   * @returns {Promise<number>} Total cash payments
   */
  async getCashBookPayments(asOfDate = new Date()) {
    // Calculate total payments
    const paymentsQuery = {
      status: { $in: ['cleared', 'pending'] },
      paymentDate: { $lte: asOfDate },
    };
    const totalPayments = await CashPayment.aggregate([
      { $match: paymentsQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return totalPayments[0]?.total || 0;
  }

  /**
   * Get payments by supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Cash payments
   */
  async getPaymentsBySupplier(supplierId, options = {}) {
    const { limit = 50, status } = options;

    const query = { supplierId };
    if (status) {
      query.status = status;
    }

    return CashPayment.find(query)
      .populate('createdBy', 'username')
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit, 10));
  }

  /**
   * Get payments by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Cash payments
   */
  async getPaymentsByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return CashPayment.findByDateRange(startDate, endDate);
  }

  /**
   * Get pending payments
   * @returns {Promise<Array>} Pending cash payments
   */
  async getPendingPayments() {
    return CashPayment.findPendingPayments();
  }

  /**
   * Get cash payment statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStatistics(startDate, endDate) {
    const query = {};
    if (startDate && endDate) {
      query.paymentDate = { $gte: startDate, $lte: endDate };
    }

    const [totalPayments, statusBreakdown, paymentMethodBreakdown, totalAmount] = await Promise.all([
      CashPayment.countDocuments(query),
      CashPayment.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      ]),
      CashPayment.aggregate([
        { $match: query },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      ]),
      CashPayment.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      totalPayments,
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
}

module.exports = new CashPaymentService();
