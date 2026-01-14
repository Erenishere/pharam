const Invoice = require('../models/Invoice');

/**
 * Invoice Repository
 * Handles database operations for invoices
 */
class InvoiceRepository {
  /**
   * Find invoice by ID
   */
  async findById(id) {
    return Invoice.findById(id)
      .populate('customerId', 'code name contactInfo financialInfo')
      .populate('supplierId', 'code name contactInfo financialInfo')
      .populate('items.itemId', 'code name unit pricing')
      .populate('createdBy', 'username email');
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber) {
    return Invoice.findOne({ invoiceNumber })
      .populate('customerId', 'code name contactInfo financialInfo')
      .populate('supplierId', 'code name contactInfo financialInfo')
      .populate('items.itemId', 'code name unit pricing')
      .populate('createdBy', 'username email');
  }

  /**
   * Find all invoices with filters
   */
  async findAll(filters = {}, options = {}) {
    const query = Invoice.find(filters)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('createdBy', 'username');
    
    if (options.sort) {
      query.sort(options.sort);
    }
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    return query.exec();
  }

  /**
   * Search invoices with advanced filtering
   */
  async search(filters = {}, options = {}) {
    const { 
      keyword, 
      type,
      customerId,
      supplierId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      ...otherFilters 
    } = filters;

    const query = {};

    // Text search
    if (keyword) {
      const searchRegex = new RegExp(keyword, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { notes: searchRegex }
      ];
    }

    // Exact match filters
    if (type) query.type = type;
    if (customerId) query.customerId = customerId;
    if (supplierId) query.supplierId = supplierId;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Date range filter
    if (dateFrom || dateTo) {
      query.invoiceDate = {};
      if (dateFrom) query.invoiceDate.$gte = new Date(dateFrom);
      if (dateTo) query.invoiceDate.$lte = new Date(dateTo);
    }

    // Additional filters
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[key] = value;
      }
    });

    const queryBuilder = Invoice.find(query)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .populate('createdBy', 'username');

    // Apply sorting
    if (options.sort) {
      queryBuilder.sort(options.sort);
    } else {
      queryBuilder.sort({ invoiceDate: -1 });
    }

    // Apply pagination
    if (options.limit) {
      queryBuilder.limit(parseInt(options.limit, 10));
    }
    if (options.skip) {
      queryBuilder.skip(parseInt(options.skip, 10));
    }

    return queryBuilder.exec();
  }

  /**
   * Count invoices matching filters
   */
  async count(filters = {}) {
    return Invoice.countDocuments(filters);
  }

  /**
   * Create new invoice
   */
  async create(invoiceData) {
    const invoice = new Invoice(invoiceData);
    return invoice.save();
  }

  /**
   * Update invoice
   */
  async update(id, updateData) {
    return Invoice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('customerId', 'code name')
     .populate('supplierId', 'code name')
     .populate('items.itemId', 'code name unit pricing')
     .populate('createdBy', 'username email');
  }

  /**
   * Delete invoice
   */
  async delete(id) {
    return Invoice.findByIdAndDelete(id);
  }

  /**
   * Find invoices by customer
   */
  async findByCustomer(customerId, options = {}) {
    return this.search({ customerId, type: 'sales' }, options);
  }

  /**
   * Find invoices by supplier
   */
  async findBySupplier(supplierId, options = {}) {
    return this.search({ supplierId, type: 'purchase' }, options);
  }

  /**
   * Find overdue invoices
   */
  async findOverdue() {
    return Invoice.findOverdueInvoices()
      .populate('customerId', 'code name contactInfo')
      .populate('supplierId', 'code name contactInfo');
  }

  /**
   * Find invoices by date range
   */
  async findByDateRange(startDate, endDate, type = null) {
    const filters = {
      invoiceDate: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (type) {
      filters.type = type;
    }
    
    return Invoice.find(filters)
      .populate('customerId', 'code name')
      .populate('supplierId', 'code name')
      .sort({ invoiceDate: -1 });
  }

  /**
   * Get invoice statistics
   */
  async getStatistics(type = null) {
    const matchStage = type ? { type } : {};
    
    const stats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totals.grandTotal' }
        }
      }
    ]);

    return stats;
  }

  /**
   * Generate next invoice number
   */
  async generateInvoiceNumber(type) {
    return Invoice.generateInvoiceNumber(type);
  }

  /**
   * Check if invoice number exists
   */
  async invoiceNumberExists(invoiceNumber, excludeId = null) {
    const query = { invoiceNumber };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const invoice = await Invoice.findOne(query);
    return !!invoice;
  }
}

module.exports = new InvoiceRepository();
