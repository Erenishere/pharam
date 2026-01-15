const invoiceRepository = require('../repositories/invoiceRepository');
const supplierService = require('./supplierService');
const itemService = require('./itemService');
const taxService = require('./taxService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const ledgerService = require('./ledgerService');
const discountCalculationService = require('./discountCalculationService');
const Item = require('../models/Item');

/**
 * Purchase Invoice Service
 * Handles business logic for purchase invoice management
 */
class PurchaseInvoiceService {
  /**
   * Create a new purchase invoice with automatic calculations
   * @param {Object} invoiceData - Invoice data
   * @param {string} invoiceData.supplierId - Supplier ID
   * @param {Date} invoiceData.invoiceDate - Invoice date
   * @param {Date} invoiceData.dueDate - Due date
   * @param {Array} invoiceData.items - Invoice items
   * @param {string} invoiceData.createdBy - User ID who created the invoice
   * @param {string} invoiceData.notes - Optional notes
   * @returns {Promise<Object>} Created invoice
   */
  async createPurchaseInvoice(invoiceData) {
    const { supplierId, items, createdBy, invoiceDate, dueDate, notes } = invoiceData;

    // Validate required fields
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }
    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Validate supplier exists and is active
    const supplier = await supplierService.getSupplierById(supplierId);
    if (!supplier.isActive) {
      throw new Error('Supplier is not active');
    }

    // Validate supplier type
    if (supplier.type !== 'supplier' && supplier.type !== 'both') {
      throw new Error('Selected entity is not a supplier');
    }

    // Validate and calculate items
    const processedItems = await this.processInvoiceItems(items);

    // Calculate totals
    const totals = this.calculateInvoiceTotals(processedItems);

    // Generate invoice number
    const invoiceNumber = await invoiceRepository.generateInvoiceNumber('purchase');

    // Prepare invoice data
    const invoice = {
      invoiceNumber,
      type: 'purchase',
      supplierId,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || this.calculateDueDate(supplier.financialInfo.paymentTerms),
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
      const { 
        itemId, 
        quantity, 
        unitPrice, 
        discount = 0, // Legacy single discount support
        discount1Percent = 0,
        discount2Percent = 0,
        claimAccountId,
        batchInfo 
      } = item;

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

      // Handle legacy single discount or new multi-level discounts
      let finalDiscount1Percent = discount1Percent;
      let finalDiscount2Percent = discount2Percent;
      let finalClaimAccountId = claimAccountId;

      if (discount > 0 && discount1Percent === 0 && discount2Percent === 0) {
        // Legacy single discount - treat as discount1
        finalDiscount1Percent = discount;
      }

      // Validate discount percentages
      if (finalDiscount1Percent < 0 || finalDiscount1Percent > 100) {
        throw new Error(`Discount 1 must be between 0 and 100 for item ${itemId}`);
      }
      if (finalDiscount2Percent < 0 || finalDiscount2Percent > 100) {
        throw new Error(`Discount 2 must be between 0 and 100 for item ${itemId}`);
      }

      // Get item details
      const itemDetails = await itemService.getItemById(itemId);
      if (!itemDetails.isActive) {
        throw new Error(`Item ${itemDetails.name} is not active`);
      }

      // Validate batch info for purchase invoices
      if (batchInfo) {
        if (batchInfo.expiryDate && batchInfo.manufacturingDate) {
          const mfgDate = new Date(batchInfo.manufacturingDate);
          const expDate = new Date(batchInfo.expiryDate);
          if (expDate <= mfgDate) {
            throw new Error(`Expiry date must be after manufacturing date for item ${itemDetails.name}`);
          }
        }
      }

      // Calculate line subtotal
      const lineSubtotal = quantity * unitPrice;

      // Apply multi-level discounts using discount calculation service
      let discountResult;
      if (finalDiscount2Percent > 0) {
        // Apply discounts with claim account validation
        discountResult = await discountCalculationService.applySequentialDiscountsWithValidation(
          lineSubtotal,
          finalDiscount1Percent,
          finalDiscount2Percent,
          finalClaimAccountId
        );
      } else {
        // Apply only discount1
        discountResult = discountCalculationService.applySequentialDiscounts(
          lineSubtotal,
          finalDiscount1Percent,
          0
        );
      }

      // Calculate tax on amount after discounts
      const taxableAmount = discountResult.finalAmount;
      const taxAmount = await this.calculateItemTax(itemDetails, taxableAmount);

      // Calculate line total
      const lineTotal = taxableAmount + taxAmount;

      processedItems.push({
        itemId,
        quantity,
        unitPrice,
        // Legacy discount support
        discount: finalDiscount1Percent,
        // Multi-level discount details
        discount1Percent: finalDiscount1Percent,
        discount1Amount: discountResult.discount1.amount,
        discount2Percent: finalDiscount2Percent,
        discount2Amount: discountResult.discount2.amount,
        claimAccountId: finalClaimAccountId,
        // Totals
        lineSubtotal,
        totalDiscountAmount: discountResult.totalDiscount.amount,
        taxableAmount,
        taxAmount,
        lineTotal,
        batchInfo: batchInfo || {},
        // Include claim account details if available
        claimAccount: discountResult.claimAccount || null
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

      // Calculate WHT (usually deducted from supplier payment)
      const whtAmount = (taxableAmount * whtRate) / 100;

      // For purchase invoices, typically GST is added and WHT is tracked separately
      return gstAmount;
    } catch (error) {
      console.error('Tax calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate invoice totals with multi-level discounts
   * @param {Array} items - Processed invoice items
   * @returns {Object} Invoice totals
   */
  calculateInvoiceTotals(items) {
    let subtotal = 0;
    let totalDiscount1 = 0;
    let totalDiscount2 = 0;
    let totalTax = 0;

    items.forEach(item => {
      // Use lineSubtotal if available, otherwise calculate
      const itemSubtotal = item.lineSubtotal || (item.quantity * item.unitPrice);
      subtotal += itemSubtotal;

      // Use calculated discount amounts from discount service
      if (item.discount1Amount !== undefined) {
        totalDiscount1 += item.discount1Amount;
      }
      if (item.discount2Amount !== undefined) {
        totalDiscount2 += item.discount2Amount;
      }

      totalTax += item.taxAmount || 0;
    });

    const totalDiscount = totalDiscount1 + totalDiscount2;
    const taxableAmount = subtotal - totalDiscount;
    const grandTotal = taxableAmount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalDiscount1,
      totalDiscount2,
      taxableAmount,
      totalTax,
      grandTotal
    };
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
    return invoiceRepository.generateInvoiceNumber('purchase');
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

    // Check format (PI + Year + 6 digits)
    const invoiceNumberRegex = /^PI\d{10}$/;
    if (!invoiceNumberRegex.test(invoiceNumber)) {
      throw new Error('Invalid invoice number format. Expected format: PI + Year + 6 digits (e.g., PI2024000001)');
    }

    // Check uniqueness
    const exists = await invoiceRepository.invoiceNumberExists(invoiceNumber);
    if (exists) {
      throw new Error(`Invoice number ${invoiceNumber} already exists`);
    }

    return true;
  }

  /**
   * Get purchase invoice by ID
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Invoice
   */
  async getPurchaseInvoiceById(id) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Purchase invoice not found');
    }
    if (invoice.type !== 'purchase') {
      throw new Error('Invoice is not a purchase invoice');
    }
    return invoice;
  }

  /**
   * Get purchase invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<Object>} Invoice
   */
  async getPurchaseInvoiceByNumber(invoiceNumber) {
    const invoice = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
    if (!invoice) {
      throw new Error('Purchase invoice not found');
    }
    if (invoice.type !== 'purchase') {
      throw new Error('Invoice is not a purchase invoice');
    }
    return invoice;
  }

  /**
   * Get all purchase invoices with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated invoices
   */
  async getAllPurchaseInvoices(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort, ...otherOptions } = options;
    const skip = (page - 1) * limit;

    // Ensure we only get purchase invoices
    const purchaseFilters = { ...filters, type: 'purchase' };

    const [invoices, total] = await Promise.all([
      invoiceRepository.search(purchaseFilters, { ...otherOptions, limit, skip, sort }),
      invoiceRepository.count(purchaseFilters)
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
   * Get purchase invoices by supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Invoices
   */
  async getPurchaseInvoicesBySupplier(supplierId, options = {}) {
    // Validate supplier exists
    await supplierService.getSupplierById(supplierId);
    
    return invoiceRepository.findBySupplier(supplierId, options);
  }

  /**
   * Update purchase invoice
   * @param {string} id - Invoice ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated invoice
   */
  async updatePurchaseInvoice(id, updateData) {
    // Get existing invoice
    const existingInvoice = await this.getPurchaseInvoiceById(id);

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
    }

    // Update invoice
    return invoiceRepository.update(id, updateData);
  }

  /**
   * Delete purchase invoice
   * @param {string} id - Invoice ID
   * @returns {Promise<Object>} Deleted invoice
   */
  async deletePurchaseInvoice(id) {
    const invoice = await this.getPurchaseInvoiceById(id);

    // Prevent deletion of confirmed or paid invoices
    if (invoice.status === 'confirmed' || invoice.status === 'paid') {
      throw new Error('Cannot delete confirmed or paid invoices. Cancel the invoice instead.');
    }

    return invoiceRepository.delete(id);
  }

  /**
   * Get purchase statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Purchase statistics
   */
  async getPurchaseStatistics(filters = {}) {
    const purchaseFilters = { ...filters, type: 'purchase' };
    return invoiceRepository.getStatistics('purchase');
  }

  /**
   * Confirm purchase invoice and update inventory
   * @param {string} id - Invoice ID
   * @param {string} userId - User ID performing the confirmation
   * @returns {Promise<Object>} Confirmed invoice with stock movements
   */
  async confirmPurchaseInvoice(id, userId) {
    // Get the invoice
    const invoice = await this.getPurchaseInvoiceById(id);

    // Validate invoice status
    if (invoice.status !== 'draft') {
      throw new Error(`Cannot confirm invoice with status: ${invoice.status}. Only draft invoices can be confirmed.`);
    }

    // Create stock movements for each item
    const stockMovements = await this.createStockMovementsForInvoice(invoice, userId);

    // Update item inventory levels
    await this.updateInventoryLevels(invoice.items, 'add');

    // Create batches if batch info is provided
    await this.createBatchesFromInvoice(invoice);

    // Create ledger entries for supplier payables
    const ledgerEntries = await this.createLedgerEntriesForPurchaseInvoice(invoice, userId);

    // Update invoice status to confirmed
    const confirmedInvoice = await invoiceRepository.update(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: userId
    });

    return {
      invoice: confirmedInvoice,
      stockMovements,
      ledgerEntries
    };
  }

  /**
   * Create ledger entries for purchase invoice (supplier payables)
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID creating the entries
   * @returns {Promise<Object>} Created ledger entries
   */
  async createLedgerEntriesForPurchaseInvoice(invoice, userId) {
    // For purchase invoice:
    // Debit: Inventory/Purchase Account - increases inventory asset
    // Credit: Supplier Account (Accounts Payable) - increases what we owe supplier
    
    const description = `Purchase Invoice ${invoice.invoiceNumber} - ${invoice.notes || 'Purchase transaction'}`;
    
    // For now, we'll use supplier account for both sides
    // In a full implementation, debit would be to inventory/purchase GL account
    const debitAccount = {
      accountId: invoice.supplierId,
      accountType: 'Supplier'
    };
    
    const creditAccount = {
      accountId: invoice.supplierId,
      accountType: 'Supplier'
    };
    
    const ledgerEntries = await ledgerService.createDoubleEntry(
      debitAccount,
      creditAccount,
      invoice.totals.grandTotal,
      description,
      'invoice',
      invoice._id,
      userId
    );
    
    return ledgerEntries;
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
        movementType: 'in',
        quantity: item.quantity, // Positive quantity for inward movement
        referenceType: 'purchase_invoice',
        referenceId: invoice._id,
        batchInfo: item.batchInfo || {},
        movementDate: invoice.invoiceDate || new Date(),
        notes: `Purchase invoice ${invoice.invoiceNumber} - Supplier: ${invoice.supplierId}`,
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
  async updateInventoryLevels(items, operation = 'add') {
    const updatedItems = [];

    for (const item of items) {
      const itemDoc = await Item.findById(item.itemId);
      
      if (!itemDoc) {
        throw new Error(`Item not found: ${item.itemId}`);
      }

      if (operation === 'add') {
        itemDoc.inventory.currentStock += item.quantity;
      } else if (operation === 'subtract') {
        itemDoc.inventory.currentStock = Math.max(0, itemDoc.inventory.currentStock - item.quantity);
      }

      await itemDoc.save();
      updatedItems.push(itemDoc);
    }

    return updatedItems;
  }

  /**
   * Create batches from purchase invoice items
   * @param {Object} invoice - Invoice object
   * @returns {Promise<Array>} Created batches
   */
  async createBatchesFromInvoice(invoice) {
    const batches = [];

    for (const item of invoice.items) {
      // Only create batch if batch info is provided
      if (item.batchInfo && item.batchInfo.batchNumber) {
        // Batch tracking is handled through stock movements
        // This method can be extended to create separate batch records if needed
        batches.push({
          itemId: item.itemId,
          batchNumber: item.batchInfo.batchNumber,
          quantity: item.quantity,
          manufacturingDate: item.batchInfo.manufacturingDate,
          expiryDate: item.batchInfo.expiryDate,
          invoiceId: invoice._id
        });
      }
    }

    return batches;
  }

  /**
   * Mark invoice as paid
   * @param {string} id - Invoice ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Updated invoice
   */
  async markInvoiceAsPaid(id, paymentData = {}) {
    const invoice = await this.getPurchaseInvoiceById(id);

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

    // Update invoice payment status
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
    const invoice = await this.getPurchaseInvoiceById(id);

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
   * Cancel purchase invoice and reverse inventory
   * @param {string} id - Invoice ID
   * @param {string} userId - User ID performing the cancellation
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled invoice
   */
  async cancelPurchaseInvoice(id, userId, reason = '') {
    const invoice = await this.getPurchaseInvoiceById(id);

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
      await this.updateInventoryLevels(invoice.items, 'subtract');
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
        movementType: 'out',
        quantity: item.quantity, // Positive for outward movement (reversal)
        referenceType: 'purchase_invoice',
        referenceId: invoice._id,
        batchInfo: item.batchInfo || {},
        movementDate: new Date(),
        notes: `Reversal: Purchase invoice ${invoice.invoiceNumber} cancelled. Reason: ${reason}`,
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
    return stockMovementRepository.findByReference('purchase_invoice', invoiceId);
  }

  /**
   * Check for duplicate supplier bill number
   * @param {string} supplierId - Supplier ID
   * @param {string} billNo - Bill number to check
   * @param {string} excludeInvoiceId - Optional invoice ID to exclude from check (for updates)
   * @returns {Promise<Object>} Validation result with isDuplicate flag and existing invoice details
   */
  async checkDuplicateSupplierBill(supplierId, billNo, excludeInvoiceId = null) {
    if (!supplierId || !billNo) {
      return {
        isDuplicate: false,
        error: 'Supplier ID and bill number are required'
      };
    }

    const Invoice = require('../models/Invoice');
    
    // Build query
    const query = {
      supplierId,
      supplierBillNo: billNo,
      type: { $in: ['purchase', 'return_purchase'] },
      status: { $ne: 'cancelled' }
    };

    // Exclude current invoice if provided (for updates)
    if (excludeInvoiceId) {
      query._id = { $ne: excludeInvoiceId };
    }

    // Check for existing invoice with same supplier and bill number
    const existingInvoice = await Invoice.findOne(query);

    if (existingInvoice) {
      return {
        isDuplicate: true,
        existingInvoiceId: existingInvoice._id,
        existingInvoiceNumber: existingInvoice.invoiceNumber,
        existingInvoiceDate: existingInvoice.invoiceDate,
        message: `Bill number '${billNo}' already exists for this supplier (Invoice: ${existingInvoice.invoiceNumber})`
      };
    }

    return {
      isDuplicate: false,
      message: 'Bill number is unique for this supplier'
    };
  }

  /**
   * Validate supplier bill number before saving
   * @param {string} supplierId - Supplier ID
   * @param {string} billNo - Bill number
   * @param {string} invoiceId - Current invoice ID (for updates)
   * @throws {Error} If bill number is duplicate
   */
  async validateSupplierBillNumber(supplierId, billNo, invoiceId = null) {
    const validation = await this.checkDuplicateSupplierBill(supplierId, billNo, invoiceId);
    
    if (validation.isDuplicate) {
      throw new Error(validation.message);
    }
  }
}

module.exports = new PurchaseInvoiceService();
