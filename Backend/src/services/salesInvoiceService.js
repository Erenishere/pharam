const invoiceRepository = require('../repositories/invoiceRepository');
const customerService = require('./customerService');
const itemService = require('./itemService');
const taxService = require('./taxService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const ledgerService = require('./ledgerService');
const discountCalculationService = require('./discountCalculationService');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');

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
   * @param {string} invoiceData.poId - Optional Purchase Order ID
   * @param {string} invoiceData.poNumber - Optional Purchase Order Number
   * @param {string} invoiceData.salesmanId - Optional Salesman ID
   * @returns {Promise<Object>} Created invoice
   */
  async createSalesInvoice(invoiceData) {
    const { customerId, items, createdBy, invoiceDate, dueDate, notes, poId, poNumber, salesmanId, status: requestedStatus } = invoiceData;

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

    // Validate salesman if provided
    if (salesmanId) {
      await this.validateSalesman(salesmanId);
    }

    // Validate and link PO if provided
    let linkedPO = null;
    if (poId) {
      linkedPO = await this.validateAndLinkPO(poId);
    }

    // Validate and calculate items
    const processedItems = await this.processInvoiceItems(items);

    // Calculate totals
    const totals = this.calculateInvoiceTotals(processedItems, customer);

    // Validate credit limit
    await this.validateCreditLimit(customerId, totals.grandTotal);

    // Generate invoice number
    const invoiceNumber = await invoiceRepository.generateInvoiceNumber('sales');

    // Prepare invoice data - always start as 'draft'
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
      poId: poId || null,
      poNumber: poNumber || (linkedPO ? linkedPO.poNumber : null),
      salesmanId: salesmanId || null,
      createdBy
    };

    // Create invoice
    const createdInvoice = await invoiceRepository.create(invoice);

    // If frontend requested 'confirmed' status (e.g., POS/walk-in sales),
    // automatically confirm the invoice to handle inventory updates
    if (requestedStatus === 'confirmed') {
      try {
        const confirmResult = await this.confirmSalesInvoice(createdInvoice._id, createdBy);
        return confirmResult.invoice;
      } catch (confirmError) {
        // If confirmation fails, the invoice remains as draft
        // Log the error but return the draft invoice
        console.error('Auto-confirm failed for invoice:', createdInvoice._id, confirmError.message);
        // Re-throw the error so frontend knows the full process didn't complete
        throw confirmError;
      }
    }

    return createdInvoice;
  }

  /**
   * Process and validate invoice items with tax calculations
   * @param {Array} items - Array of invoice items
   * @returns {Promise<Array>} Processed items with calculations
   */
  async processInvoiceItems(items) {
    const processedItems = [];
    const inventoryService = require('./inventoryService');

    for (const item of items) {
      const {
        itemId,
        quantity,
        unitPrice,
        discount = 0, // Legacy single discount support
        discount1Percent = 0,
        discount2Percent = 0,
        claimAccountId,
        batchInfo,
        warehouseId
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
      console.log(`[DEBUG] Processing item with ID: "${itemId}"`);
      let itemDetails;
      try {
        itemDetails = await itemService.getItemById(itemId);
      } catch (error) {
        if (error.message === 'Item not found') {
          const missingItemError = new Error(`Item with ID ${itemId} was not found in the database. It may have been deleted or is from a stale session.`);
          missingItemError.code = 'ITEM_NOT_FOUND';
          missingItemError.statusCode = 400;
          missingItemError.itemId = itemId;
          throw missingItemError;
        }
        throw error;
      }

      if (!itemDetails.isActive) {
        throw new Error(`Item ${itemDetails.name} (ID: ${itemId}) is not active and cannot be sold.`);
      }

      // Validate warehouse and check stock availability if warehouse is specified
      if (warehouseId) {
        // Validate warehouse exists
        const Warehouse = require('../models/Warehouse');
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
          throw new Error(`Warehouse not found: ${warehouseId}`);
        }
        if (!warehouse.isActive) {
          throw new Error(`Warehouse ${warehouse.name} is not active`);
        }

        // Check stock availability in selected warehouse
        const warehouseStock = await inventoryService.getWarehouseStock(itemId, warehouseId);
        if (warehouseStock.availableQuantity < quantity) {
          throw new Error(
            `Insufficient stock for item ${itemDetails.name} in warehouse ${warehouse.name}. ` +
            `Available: ${warehouseStock.availableQuantity}, Requested: ${quantity}`
          );
        }
      } else {
        // Check overall stock availability if no warehouse specified
        if (!itemDetails.inventory || itemDetails.inventory.currentStock < quantity) {
          throw new Error(`Insufficient stock for item ${itemDetails.name}. Available: ${itemDetails.inventory?.currentStock || 0}`);
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
        warehouseId: warehouseId || null,
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
   * Calculate invoice totals with multi-level discounts and customer taxes
   * @param {Array} items - Processed invoice items
   * @param {Object} customer - Customer details (optional)
   * @returns {Object} Invoice totals
   */
  calculateInvoiceTotals(items, customer = null) {
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

    // Calculate customer-specific taxes (Phase 2 - Requirement 16.5)
    let advanceTax = 0;
    let nonFilerTax = 0;
    let whtAmount = 0;

    if (customer && customer.financialInfo) {
      // Use helper methods from Customer model if available, otherwise manual calc
      if (typeof customer.calculateAdvanceTax === 'function') {
        advanceTax = customer.calculateAdvanceTax(taxableAmount);
      } else if (customer.financialInfo.advanceTaxRate) {
        advanceTax = (taxableAmount * customer.financialInfo.advanceTaxRate) / 100;
      }

      if (typeof customer.calculateNonFilerGST === 'function') {
        nonFilerTax = customer.calculateNonFilerGST(taxableAmount);
      } else if (customer.financialInfo.isNonFiler) {
        nonFilerTax = (taxableAmount * 0.1) / 100;
      }

      if (customer.financialInfo.whtPercent) {
        whtAmount = (taxableAmount * customer.financialInfo.whtPercent) / 100;
      }
    }

    const grandTotal = taxableAmount + totalTax + advanceTax + nonFilerTax;

    return {
      subtotal,
      totalDiscount,
      totalDiscount1,
      totalDiscount2,
      taxableAmount,
      totalTax,
      advanceTax,
      nonFilerTax,
      whtAmount, // Included for reference/reporting, usually not added to grandTotal for sales
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

      // Fetch customer to recalculate taxes
      const customerId = updateData.customerId || existingInvoice.customerId;
      const customer = await customerService.getCustomerById(customerId);

      updateData.totals = this.calculateInvoiceTotals(updateData.items, customer);

      // Revalidate credit limit if customer or total changed
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

    // Create ledger entries for customer receivables
    const ledgerEntries = await this.createLedgerEntriesForSalesInvoice(invoice, userId);

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
   * Create ledger entries for sales invoice (customer receivables)
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID creating the entries
   * @returns {Promise<Object>} Created ledger entries
   */
  async createLedgerEntriesForSalesInvoice(invoice, userId) {
    const description = `Sales Invoice ${invoice.invoiceNumber} - ${invoice.notes || 'Sales transaction'}`;

    const debitAccount = {
      accountId: invoice.customerId,
      accountType: 'Customer'
    };

    const creditAccount = {
      accountId: 'SALES_REVENUE',
      accountType: 'Revenue'
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

    const toAmount = (invoice.to1Amount || 0) + (invoice.to2Amount || 0);

    if (toAmount > 0) {
      if (!invoice.adjustmentAccountId) {
        throw new Error('Adjustment account is required when Trade Offers are applied');
      }

      const adjustmentDebitAccount = {
        accountId: invoice.adjustmentAccountId,
        accountType: 'Account'
      };

      const adjustmentCreditAccount = {
        accountId: 'SALES_REVENUE',
        accountType: 'Revenue'
      };

      const toEntries = await ledgerService.createDoubleEntry(
        adjustmentDebitAccount,
        adjustmentCreditAccount,
        toAmount,
        `Trade Offer Adjustment - ${invoice.invoiceNumber}`,
        'invoice_adjustment',
        invoice._id,
        userId
      );

      return [...ledgerEntries, ...toEntries];
    }

    return ledgerEntries;
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

      if (!itemDetails.inventory || itemDetails.inventory.currentStock < item.quantity) {
        validationErrors.push({
          itemId: item.itemId,
          itemName: itemDetails.name,
          itemCode: itemDetails.code,
          requested: item.quantity,
          available: itemDetails.inventory?.currentStock || 0
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

    // Get default warehouse (first active one) to fallback to if item has no warehouse
    let defaultWarehouseId = null;
    const defaultWarehouse = await Warehouse.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (defaultWarehouse) {
      defaultWarehouseId = defaultWarehouse._id;
    }

    for (const item of invoice.items) {
      // Use item-specific warehouse or fallback to default
      const warehouseId = item.warehouseId || defaultWarehouseId;

      if (!warehouseId) {
        throw new Error('No active warehouse found to assign stock movement. Please ensure at least one warehouse exists.');
      }

      const movementData = {
        itemId: item.itemId,
        movementType: 'out',
        quantity: item.quantity, // Positive quantity, type indicates direction
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
        warehouse: warehouseId, // Required field
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

      // Check if batch info is available for batch-specific stock update
      const batchNumber = item.batchInfo?.batchNumber;

      if (batchNumber && typeof itemDoc.updateBatchStock === 'function') {
        // Use batch-specific stock update (FEFO enforcement)
        await itemDoc.updateBatchStock(batchNumber, item.quantity, operation);
      } else {
        // Fallback to global stock update
        if (operation === 'subtract') {
          itemDoc.inventory.currentStock = Math.max(0, itemDoc.inventory.currentStock - item.quantity);
        } else if (operation === 'add') {
          itemDoc.inventory.currentStock += item.quantity;
        }
        await itemDoc.save();
      }

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

  /**
   * Validate and link Purchase Order to invoice
   * @param {string} poId - Purchase Order ID
   * @returns {Promise<Object>} Validated PO
   */
  async validateAndLinkPO(poId) {
    if (!poId) {
      throw new Error('Purchase Order ID is required');
    }

    // Get PO model
    const PurchaseOrder = require('../models/PurchaseOrder');

    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      throw new Error(`Purchase Order not found: ${poId}`);
    }

    // Validate PO status
    if (po.status === 'cancelled') {
      throw new Error('Cannot create invoice from cancelled Purchase Order');
    }

    if (po.status === 'completed') {
      throw new Error('Purchase Order is already completed');
    }

    // Validate PO is approved
    if (po.status !== 'approved' && po.status !== 'partial') {
      throw new Error(`Purchase Order must be approved. Current status: ${po.status}`);
    }

    return po;
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

  /**
   * Create invoice from Purchase Order
   * @param {string} poId - Purchase Order ID
   * @param {Object} invoiceData - Additional invoice data
   * @returns {Promise<Object>} Created invoice
   */
  async createInvoiceFromPO(poId, invoiceData = {}) {
    // Validate and get PO
    const po = await this.validateAndLinkPO(poId);

    // Extract PO data
    const { customerId, items: poItems, invoiceDate, dueDate, notes, createdBy } = invoiceData;

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    if (!createdBy) {
      throw new Error('Created by user ID is required');
    }

    // Prepare invoice items from PO
    const invoiceItems = poItems && poItems.length > 0
      ? poItems
      : poItems.map(poItem => ({
        itemId: poItem.itemId,
        quantity: poItem.quantity,
        unitPrice: poItem.unitPrice,
        discount: poItem.discount || 0
      }));

    // Create invoice with PO reference
    const invoice = await this.createSalesInvoice({
      customerId,
      items: invoiceItems,
      invoiceDate,
      dueDate,
      notes: notes || `Created from PO: ${po.poNumber}`,
      poId: po._id,
      poNumber: po.poNumber,
      createdBy
    });

    // Update PO status to partial if not already
    if (po.status === 'approved') {
      po.status = 'partial';
      await po.save();
    }

    return invoice;
  }

  /**
   * Get PO details for invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} PO details
   */
  async getInvoicePODetails(invoiceId) {
    const invoice = await this.getSalesInvoiceById(invoiceId);

    if (!invoice.poId) {
      return null;
    }

    const PurchaseOrder = require('../models/PurchaseOrder');
    const po = await PurchaseOrder.findById(invoice.poId)
      .populate('items.itemId', 'name code')
      .populate('customerId', 'name code');

    return {
      poId: po._id,
      poNumber: po.poNumber,
      poDate: po.poDate,
      status: po.status,
      totalAmount: po.totalAmount,
      items: po.items,
      customer: po.customerId
    };
  }

  /**
   * Phase 2: Calculate invoice age (Requirement 8.2)
   * Returns the number of days old from invoice date to current date
   * @param {Date} invoiceDate - Invoice date
   * @returns {number} Days old
   */
  calculateInvoiceAge(invoiceDate) {
    if (!invoiceDate) {
      throw new Error('Invoice date is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invDate = new Date(invoiceDate);
    invDate.setHours(0, 0, 0, 0);

    const diffTime = today - invDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Phase 2: Get pending invoices for an account (Requirement 8.1, 8.2)
   * Returns all unpaid or partially paid invoices with aging information
   * @param {string} accountId - Customer ID
   * @returns {Promise<Array>} Pending invoices with aging
   */
  async getPendingInvoices(accountId) {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    // Query for unpaid or partially paid invoices
    const query = {
      customerId: accountId,
      status: 'confirmed',
      paymentStatus: { $in: ['pending', 'partial'] }
    };

    const invoices = await invoiceRepository.find(query, {
      sort: { invoiceDate: 1 }, // Sort by oldest first
      populate: [
        { path: 'customerId', select: 'code name' },
        { path: 'createdBy', select: 'username' }
      ]
    });

    // Calculate aging and due amount for each invoice
    const pendingInvoices = invoices.map(invoice => {
      const daysOld = this.calculateInvoiceAge(invoice.invoiceDate);
      const totalAmount = invoice.totals.grandTotal;
      const paidAmount = invoice.totals.paidAmount || 0;
      const dueAmount = totalAmount - paidAmount;

      return {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        daysOld,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus: invoice.paymentStatus,
        customer: invoice.customerId
      };
    });

    return pendingInvoices;
  }
}

module.exports = new SalesInvoiceService();
