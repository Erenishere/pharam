const invoiceRepository = require('../repositories/invoiceRepository');
const customerService = require('./customerService');
const itemService = require('./itemService');
const taxService = require('./taxService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const Item = require('../models/Item');

/**
 * Sales Invoice Service
 * Handles business logic for sales invoice management
 */
class SalesInvoiceService {
  /**
   * Create a new sales invoice with automatic calculations
   * @param {Object} invoiceData - Invoice data
   * @param {string} invoiceData.customerId - Customer ID
   * @param {Date} invoiceData.invoiceDate - Invoice date
   * @param {Date} invoiceData.dueDate - Due date
   * @param {Array} invoiceData.items - Invoice items
   * @param {string} invoiceData.createdBy - User ID who created the invoice
   * @param {string} invoiceData.notes - Optional notes
   * @returns {Promise<Object>} Created invoice
   */
  async createSalesInvoice(invoiceData) {
    const { customerId, items, createdBy, invoiceDate, dueDate, notes } = invoiceData;

    // Validate required fields
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }
    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate customer exists and is active
    const customer = await customerService.getCustomerById(customerId);
    if (!customer.isActive) {
      throw new Error('Customer is not active');
    }

    // Validate and calculate items
    const processedItems = await this.processInvoiceItems(items);

    // Calculate totals
    const totals = this.calculateInvoiceTotals(processedItems);

    // Validate credit limit
    await this.validateCreditLimit(customerId, totals.grandTotal);

    // Generate invoice number
    const invoiceNumber = await invoiceRepository.generateInvoiceNumber('sales');

    // Prepare invoice data
    const invoice = {
      invoiceNumber,
      type: 'sales',
      customerId,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || this.calculateDueDate(customer.financialInfo.paymentTerms),
      items: processedItems,
      totals,
      status: 'draft',
      paymentStatus: 'pending',
      notes: notes || '',
      createdBy
    };

    // Create invoice
    return invoiceRepository.create(invoice);
  }

  /**
   * Process and validate invoice items with tax calculations
   * @param {Array} items - Array of invoice items
   * @returns {Promise<Array>} Processed items with calculations
   */
  async processInvoiceItems(items) {
    const processedItems = [];

    for (const item of items) {
      const { itemId, quantity, unitPrice, discount = 0, batchInfo } = item;

      // Validate item
      if (!itemId) {
        throw new Error('Item ID is required for all items');
      }
      if (!quantity || quantity <= 0) {
        throw new Error(`Invalid quantity for item ${itemId}`);
      }
      if (unitPrice === undefined || unitPrice < 0) {
        throw new Error(`Invalid unit price for item ${itemId}`);
      }
      if (discount < 0 || discount > 100) {
        throw new Error(`Discount must be between 0 and 100 for item ${itemId}`);
      }

      // Get item details
      const itemDetails = await itemService.getItemById(itemId);
      if (!itemDetails.isActive) {
        throw new Error(`Item ${itemDetails.name} is not active`);
      }

      // Check stock availability
      if (!itemDetails.checkStockAvailability(quantity)) {
        throw new Error(`Insufficient stock for item ${itemDetails.name}. Available: ${itemDetails.inventory.currentStock}`);
      }

      // Calculate line amounts
      const lineSubtotal = quantity * unitPrice;
      const discountAmount = (lineSubtotal * discount) / 100;
      const taxableAmount = lineSubtotal - discountAmount;

      // Calculate tax
      const taxAmount = await this.calculateItemTax(itemDetails, taxableAmount);

      // Calculate line total
      const lineTotal = taxableAmount + taxAmount;

      processedItems.push({
        itemId,
        quantity,
        unitPrice,
        discount,
        taxAmount,
        lineTotal,
        batchInfo: batchInfo || {}
      });
    }

    return processedItems;
  }

  /**
   * Calculate tax for an invoice item
   * @param {Object} item - Item details
   * @param {number} taxableAmount - Amount to calculate tax on
   * @returns {Promise<number>} Tax amount
   */
  async calculateItemTax(item, taxableAmount) {
    try {
      // Get tax rates from item
      const gstRate = item.tax.gstRate || 0;
      const whtRate = item.tax.whtRate || 0;

      // Calculate GST
      const gstAmount = (taxableAmount * gstRate) / 100;

      // Calculate WHT (usually deducted, but included in calculation)
      const whtAmount = (taxableAmount * whtRate) / 100;

      // For sales invoices, typically only GST is added
      return gstAmount;
    } catch (error) {
      console.error('Tax calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate invoice totals
   * @param {Array} items - Processed invoice items
   * @returns {Object} Invoice totals
   */
  calculateInvoiceTotals(items) {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = (itemSubtotal * item.discount) / 100;

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalTax += item.taxAmount;
    });

    const grandTotal = subtotal - totalDiscount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal
    };
  }

  /**
   * Validate customer credit limit
   * @param {string} customerId - Customer ID
   * @param {number} invoiceAmount - Invoice grand total
   * @returns {Promise<boolean>} Validation result
   */
  async validateCreditLimit(customerId, invoiceAmount) {
    const customer = await customerService.getCustomerById(customerId);
    
    // If no credit limit set, allow transaction
    if (!customer.financialInfo.creditLimit || customer.financialInfo.creditLimit === 0) {
      return true;
    }

    // Ensure we're comparing numbers
    const creditLimit = Number(customer.financialInfo.creditLimit);
    const amount = Number(invoiceAmount);

    // Check if invoice amount exceeds credit limit
    if (amount > creditLimit) {
      const error = new Error(
        `Invoice amount ${amount} exceeds customer credit limit of ${creditLimit}`
      );
      error.code = 'CREDIT_LIMIT_EXCEEDED';
      error.statusCode = 422;
      throw error;
    }

    return true;
  }

  /**
   * Calculate due date based on payment terms
   * @param {number} paymentTerms - Payment terms in days
   * @returns {Date} Due date
   */
  calculateDueDate(paymentTerms = 30) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate;
  }

  /**
   * Generate invoice number
   * @returns {Promise<string>} Generated invoice number
   */
  async generateInvoiceNumber() {
    return invoiceRepository.generateInvoiceNumber('sales');
  }

  /**
   * Validate invoice number format and uniqueness
   * @param {string} invoiceNumber - Invoice number to validate
   * @returns {Promise<boolean>} Validation result
   */
  async validateInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber || invoiceNumber.trim().length === 0) {
      throw new Error('Invoice number is required');
    }

    // Check format (SI + Year + 6 digits)
    const invoiceNumberRegex = /^SI\d{10}$/;
    if (!invoiceNumberRegex.test(invoiceNumber)) {
      throw new Error('Invalid invoice number format. Expected format: SI + Year + 6 digits (e.g., SI2024000001)');
    }

    // Check uniqueness
    const exists = await invoiceRepository.invoiceNumberExists(invoiceNumber);
    if (exists) {
      throw new Error(`Invoice number ${invoiceNumber} already exists`);
    }

    return true;
  }

  /**
   * Get sales invoice by ID
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Invoice
   */
  async getSalesInvoiceById(id) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Sales invoice not found');
    }
    if (invoice.type !== 'sales') {
      throw new Error('Invoice is not a sales invoice');
    }
    return invoice;
  }

  /**
   * Get sales invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<Object>} Invoice
   */
  async getSalesInvoiceByNumber(invoiceNumber) {
    const invoice = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
    if (!invoice) {
      throw new Error('Sales invoice not found');
    }
    if (invoice.type !== 'sales') {
      throw new Error('Invoice is not a sales invoice');
    }
    return invoice;
  }

  /**
   * Get all sales invoices with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated invoices
   */
  async getAllSalesInvoices(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort, ...otherOptions } = options;
    const skip = (page - 1) * limit;

    // Ensure we only get sales invoices
    const salesFilters = { ...filters, type: 'sales' };

    const [invoices, total] = await Promise.all([
      invoiceRepository.search(salesFilters, { ...otherOptions, limit, skip, sort }),
      invoiceRepository.count(salesFilters)
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      invoices,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null
      }
    };
  }

  /**
   * Get sales invoices by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Invoices
   */
  async getSalesInvoicesByCustomer(customerId, options = {}) {
    // Validate customer exists
    await customerService.getCustomerById(customerId);
    
    return invoiceRepository.findByCustomer(customerId, options);
  }

  /**
   * Update sales invoice
   * @param {string} id - Invoice ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated invoice
   */
  async updateSalesInvoice(id, updateData) {
    // Get existing invoice
    const existingInvoice = await this.getSalesInvoiceById(id);

    // Prevent updates to confirmed or paid invoices (except payment status updates)
    if ((existingInvoice.status === 'confirmed' || existingInvoice.status === 'paid') && updateData.items) {
      const error = new Error('Cannot modify confirmed invoice items');
      error.code = 'CANNOT_MODIFY_CONFIRMED_INVOICE';
      error.statusCode = 422;
      throw error;
    }

    // If items are being updated, reprocess them
    if (updateData.items) {
      updateData.items = await this.processInvoiceItems(updateData.items);
      updateData.totals = this.calculateInvoiceTotals(updateData.items);

      // Revalidate credit limit if customer or total changed
      const customerId = updateData.customerId || existingInvoice.customerId;
      await this.validateCreditLimit(customerId, updateData.totals.grandTotal);
    }

    // Update invoice
    return invoiceRepository.update(id, updateData);
  }

  /**
   * Delete sales invoice
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Deleted invoice
   */
  async deleteSalesInvoice(id) {
    const invoice = await this.getSalesInvoiceById(id);

    // Prevent deletion of confirmed or paid invoices
    if (invoice.status === 'confirmed' || invoice.status === 'paid') {
      throw new Error('Cannot delete confirmed or paid invoices. Cancel the invoice instead.');
    }

    return invoiceRepository.delete(id);
  }

  /**
   * Get sales statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Sales statistics
   */
  async getSalesStatistics(filters = {}) {
    const salesFilters = { ...filters, type: 'sales' };
    return invoiceRepository.getStatistics('sales');
  }

  /**
   * Confirm sales invoice and update inventory
   * @param {string} id - Invoice ID
   * @param {string} userId - User ID performing the confirmation
   * @returns {Promise<Object>} Confirmed invoice with stock movements
   */
  async confirmSalesInvoice(id, userId) {
    // Get the invoice
    const invoice = await this.getSalesInvoiceById(id);

    // Validate invoice status
    if (invoice.status !== 'draft') {
      throw new Error(`Cannot confirm invoice with status: ${invoice.status}. Only draft invoices can be confirmed.`);
    }

    // Validate credit limit
    await this.validateCreditLimit(invoice.customerId, invoice.totals.grandTotal);

    // Validate stock availability for all items
    await this.validateStockAvailability(invoice.items);

    // Create stock movements for each item
    const stockMovements = await this.createStockMovementsForInvoice(invoice, userId);

    // Update item inventory levels
    await this.updateInventoryLevels(invoice.items, 'subtract');

    // Update invoice status to confirmed
    const confirmedInvoice = await invoiceRepository.update(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: userId
    });

    return {
      invoice: confirmedInvoice,
      stockMovements
    };
  }

  /**
   * Validate stock availability for invoice items
   * @param {Array} items - Invoice items
   * @returns {Promise<boolean>} Validation result
   */
  async validateStockAvailability(items) {
    const validationErrors = [];

    for (const item of items) {
      const itemDetails = await itemService.getItemById(item.itemId);
      
      if (!itemDetails.checkStockAvailability(item.quantity)) {
        validationErrors.push({
          itemId: item.itemId,
          itemName: itemDetails.name,
          itemCode: itemDetails.code,
          requested: item.quantity,
          available: itemDetails.inventory.currentStock
        });
      }
    }

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors
        .map(err => `${err.itemName} (${err.itemCode}): Requested ${err.requested}, Available ${err.available}`)
        .join('; ');
      const error = new Error(`Insufficient stock for items: ${errorMessage}`);
      error.code = 'INSUFFICIENT_STOCK';
      error.statusCode = 422;
      throw error;
    }

    return true;
  }

  /**
   * Create stock movements for invoice items
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID creating the movements
   * @returns {Promise<Array>} Created stock movements
   */
  async createStockMovementsForInvoice(invoice, userId) {
    const movements = [];

    for (const item of invoice.items) {
      const movementData = {
        itemId: item.itemId,
        movementType: 'out',
        quantity: item.quantity, // Positive quantity, type indicates direction
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
        batchInfo: item.batchInfo || {},
        movementDate: invoice.invoiceDate || new Date(),
        notes: `Sales invoice ${invoice.invoiceNumber} - Customer: ${invoice.customerId}`,
        createdBy: userId
      };

      const movement = await stockMovementRepository.create(movementData);
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Update inventory levels for invoice items
   * @param {Array} items - Invoice items
   * @param {string} operation - Operation type ('add' or 'subtract')
   * @returns {Promise<Array>} Updated items
   */
  async updateInventoryLevels(items, operation = 'subtract') {
    const updatedItems = [];

    for (const item of items) {
      const itemDoc = await Item.findById(item.itemId);
      
      if (!itemDoc) {
        throw new Error(`Item not found: ${item.itemId}`);
      }

      if (operation === 'subtract') {
        itemDoc.inventory.currentStock = Math.max(0, itemDoc.inventory.currentStock - item.quantity);
      } else if (operation === 'add') {
        itemDoc.inventory.currentStock += item.quantity;
      }

      await itemDoc.save();
      updatedItems.push(itemDoc);
    }

    return updatedItems;
  }

  /**
   * Mark invoice as paid
   * @param {string} id - Invoice ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Updated invoice
   */
  async markInvoiceAsPaid(id, paymentData = {}) {
    const invoice = await this.getSalesInvoiceById(id);

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      throw new Error('Cannot mark cancelled invoice as paid');
    }

    if (invoice.status === 'draft') {
      throw new Error('Cannot mark draft invoice as paid. Confirm the invoice first.');
    }

    if (invoice.paymentStatus === 'paid') {
      throw new Error('Invoice is already marked as paid');
    }

    // Update invoice payment status (keep status as confirmed, only update paymentStatus)
    const updateData = {
      paymentStatus: 'paid',
      paidAt: paymentData.paidAt || new Date(),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference,
      paymentNotes: paymentData.notes
    };

    return invoiceRepository.update(id, updateData);
  }

  /**
   * Mark invoice as partially paid
   * @param {string} id - Invoice ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Updated invoice
   */
  async markInvoiceAsPartiallyPaid(id, paymentData = {}) {
    const invoice = await this.getSalesInvoiceById(id);

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      throw new Error('Cannot process payment for cancelled invoice');
    }

    if (invoice.status === 'draft') {
      throw new Error('Cannot process payment for draft invoice. Confirm the invoice first.');
    }

    if (invoice.paymentStatus === 'paid') {
      throw new Error('Invoice is already fully paid');
    }

    // Update invoice payment status
    const updateData = {
      paymentStatus: 'partial',
      partialPaymentAmount: paymentData.amount,
      lastPaymentDate: paymentData.paidAt || new Date(),
      paymentNotes: paymentData.notes
    };

    return invoiceRepository.update(id, updateData);
  }

  /**
   * Cancel sales invoice and reverse inventory
   * @param {string} id - Invoice ID
   * @param {string} userId - User ID performing the cancellation
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled invoice
   */
  async cancelSalesInvoice(id, userId, reason = '') {
    const invoice = await this.getSalesInvoiceById(id);

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      throw new Error('Invoice is already cancelled');
    }

    if (invoice.status === 'paid' || invoice.paymentStatus === 'paid') {
      const error = new Error('Cannot cancel paid invoice. Please process a refund instead.');
      error.code = 'CANNOT_CANCEL_PAID_INVOICE';
      error.statusCode = 422;
      throw error;
    }

    // If invoice was confirmed, reverse the stock movements
    if (invoice.status === 'confirmed') {
      await this.reverseStockMovements(invoice, userId, reason);
      await this.updateInventoryLevels(invoice.items, 'add');
    }

    // Update invoice status to cancelled
    const updateData = {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason
    };

    return invoiceRepository.update(id, updateData);
  }

  /**
   * Reverse stock movements for cancelled invoice
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID performing the reversal
   * @param {string} reason - Reversal reason
   * @returns {Promise<Array>} Created reversal stock movements
   */
  async reverseStockMovements(invoice, userId, reason) {
    const movements = [];

    for (const item of invoice.items) {
      const movementData = {
        itemId: item.itemId,
        movementType: 'in',
        quantity: item.quantity, // Positive for inward movement (reversal)
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
        batchInfo: item.batchInfo || {},
        movementDate: new Date(),
        notes: `Reversal: Sales invoice ${invoice.invoiceNumber} cancelled. Reason: ${reason}`,
        createdBy: userId
      };

      const movement = await stockMovementRepository.create(movementData);
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Get stock movements for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Array>} Stock movements
   */
  async getInvoiceStockMovements(invoiceId) {
    return stockMovementRepository.findByReference('sales_invoice', invoiceId);
  }
}

module.exports = new SalesInvoiceService();
