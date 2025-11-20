const Invoice = require('../models/Invoice');
const inventoryService = require('./inventoryService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const ledgerService = require('./ledgerService');

/**
 * Sales Return Service
 * Handles business logic for sales return management
 */
class SalesReturnService {
  /**
   * Validate return quantities against original invoice
   * @param {string} invoiceId - Original invoice ID
   * @param {Array} returnItems - Items to be returned with quantities
   * @returns {Promise<Object>} Validation result
   */
  async validateSalesReturnQuantities(invoiceId, returnItems) {
    // Get original invoice
    const originalInvoice = await Invoice.findById(invoiceId);
    
    if (!originalInvoice) {
      return {
        valid: false,
        errors: ['Original invoice not found']
      };
    }

    if (originalInvoice.type !== 'sales') {
      return {
        valid: false,
        errors: ['Can only create returns for sales invoices']
      };
    }

    // Get all existing return invoices for this original invoice
    const existingReturns = await Invoice.find({
      originalInvoiceId: invoiceId,
      type: 'return_sales',
      status: { $ne: 'cancelled' }
    });

    // Calculate already returned quantities per item
    const returnedQuantities = {};
    existingReturns.forEach(returnInvoice => {
      returnInvoice.items.forEach(item => {
        const itemId = item.itemId.toString();
        if (!returnedQuantities[itemId]) {
          returnedQuantities[itemId] = 0;
        }
        returnedQuantities[itemId] += Math.abs(item.quantity);
      });
    });

    // Validate each return item
    const errors = [];
    const validatedItems = [];

    for (const returnItem of returnItems) {
      const itemId = returnItem.itemId.toString();
      
      // Find item in original invoice
      const originalItem = originalInvoice.items.find(
        item => item.itemId.toString() === itemId
      );

      if (!originalItem) {
        errors.push(`Item ${itemId} not found in original invoice`);
        continue;
      }

      // Calculate available quantity for return
      const alreadyReturned = returnedQuantities[itemId] || 0;
      const availableForReturn = originalItem.quantity - alreadyReturned;

      if (returnItem.quantity > availableForReturn) {
        errors.push(
          `Item ${itemId}: Cannot return ${returnItem.quantity} units. ` +
          `Only ${availableForReturn} units available (${originalItem.quantity} original, ` +
          `${alreadyReturned} already returned)`
        );
        continue;
      }

      if (returnItem.quantity <= 0) {
        errors.push(`Item ${itemId}: Return quantity must be greater than 0`);
        continue;
      }

      validatedItems.push({
        itemId,
        quantity: returnItem.quantity,
        availableForReturn,
        originalQuantity: originalItem.quantity,
        alreadyReturned
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      validatedItems
    };
  }

  /**
   * Get returnable items from an invoice
   * @param {string} invoiceId - Original invoice ID
   * @returns {Promise<Array>} List of items with returnable quantities
   */
  async getSalesReturnableItems(invoiceId) {
    // Get original invoice
    const originalInvoice = await Invoice.findById(invoiceId)
      .populate('items.itemId', 'name code');
    
    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    if (originalInvoice.type !== 'sales') {
      throw new Error('Can only get returnable items for sales invoices');
    }

    // Get all existing return invoices
    const existingReturns = await Invoice.find({
      originalInvoiceId: invoiceId,
      type: 'return_sales',
      status: { $ne: 'cancelled' }
    });

    // Calculate already returned quantities
    const returnedQuantities = {};
    existingReturns.forEach(returnInvoice => {
      returnInvoice.items.forEach(item => {
        const itemId = item.itemId.toString();
        if (!returnedQuantities[itemId]) {
          returnedQuantities[itemId] = 0;
        }
        returnedQuantities[itemId] += Math.abs(item.quantity);
      });
    });

    // Build returnable items list
    const returnableItems = originalInvoice.items.map(item => {
      const itemId = item.itemId._id.toString();
      const alreadyReturned = returnedQuantities[itemId] || 0;
      const availableForReturn = item.quantity - alreadyReturned;

      return {
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        originalQuantity: item.quantity,
        alreadyReturned,
        availableForReturn,
        unitPrice: item.unitPrice,
        canReturn: availableForReturn > 0
      };
    }).filter(item => item.canReturn);

    return returnableItems;
  }

  /**
   * Create a sales return invoice
   * @param {Object} returnData - Return invoice data
   * @returns {Promise<Object>} Created return invoice
   */
  async createSalesReturn(returnData) {
    const {
      originalInvoiceId,
      returnItems,
      returnReason,
      returnNotes,
      createdBy
    } = returnData;

    // Validate original invoice exists
    const originalInvoice = await Invoice.findById(originalInvoiceId);
    
    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    if (originalInvoice.type !== 'sales') {
      throw new Error('Can only create returns for sales invoices');
    }

    // Validate return quantities
    const validation = await this.validateSalesReturnQuantities(
      originalInvoiceId,
      returnItems
    );

    if (!validation.valid) {
      throw new Error(`Return validation failed: ${validation.errors.join(', ')}`);
    }

    // Build return invoice items with negative quantities
    const returnInvoiceItems = [];
    let subtotal = 0;
    let totalTax = 0;

    for (const returnItem of returnItems) {
      const originalItem = originalInvoice.items.find(
        item => item.itemId.toString() === returnItem.itemId.toString()
      );

      const itemSubtotal = returnItem.quantity * originalItem.unitPrice;
      const taxAmount = (itemSubtotal * 18) / 100; // Assuming 18% GST

      returnInvoiceItems.push({
        itemId: returnItem.itemId,
        quantity: -returnItem.quantity, // Negative for return
        unitPrice: originalItem.unitPrice,
        discount: originalItem.discount || 0,
        taxAmount: -taxAmount, // Negative tax
        lineTotal: -(itemSubtotal + taxAmount)
      });

      subtotal -= itemSubtotal;
      totalTax -= taxAmount;
    }

    // Create return invoice
    const returnInvoice = new Invoice({
      type: 'return_sales',
      customerId: originalInvoice.customerId,
      originalInvoiceId,
      invoiceDate: new Date(),
      dueDate: new Date(),
      items: returnInvoiceItems,
      totals: {
        subtotal,
        totalDiscount: 0,
        totalTax,
        grandTotal: subtotal + totalTax
      },
      returnMetadata: {
        returnReason,
        returnNotes,
        returnDate: new Date()
      },
      status: 'confirmed',
      paymentStatus: 'pending',
      createdBy
    });

    await returnInvoice.save();

    // Reverse inventory
    await this.reverseSalesInventory(returnInvoiceItems);

    // Create reverse ledger entries
    await this.createReverseLedgerEntries(returnInvoice, originalInvoice);

    return returnInvoice;
  }

  /**
   * Reverse inventory for sales returns
   * @param {Array} returnItems - Return items
   */
  async reverseSalesInventory(returnItems) {
    for (const item of returnItems) {
      const quantity = Math.abs(item.quantity);
      
      // Increase inventory (return to stock)
      await inventoryService.adjustInventory(
        item.itemId,
        quantity,
        'increase',
        'Sales return'
      );

      // Create stock movement record
      await stockMovementRepository.create({
        itemId: item.itemId,
        movementType: 'return_from_customer',
        quantity,
        date: new Date(),
        reference: 'Sales Return',
        notes: 'Item returned by customer'
      });
    }
  }

  /**
   * Create reverse ledger entries for sales returns
   * @param {Object} returnInvoice - Return invoice
   * @param {Object} originalInvoice - Original invoice
   */
  async createReverseLedgerEntries(returnInvoice, originalInvoice) {
    const amount = Math.abs(returnInvoice.totals.grandTotal);
    const taxAmount = Math.abs(returnInvoice.totals.totalTax);
    const subtotal = Math.abs(returnInvoice.totals.subtotal);

    // Debit Sales Account (reduce revenue)
    await ledgerService.createLedgerEntry({
      accountId: 'SALES_ACCOUNT', // Should be from config
      date: returnInvoice.invoiceDate,
      description: `Sales Return - Invoice ${returnInvoice.invoiceNumber}`,
      debit: subtotal,
      credit: 0,
      referenceType: 'Invoice',
      referenceId: returnInvoice._id
    });

    // Credit Accounts Receivable (reduce asset)
    await ledgerService.createLedgerEntry({
      accountId: originalInvoice.customerId,
      date: returnInvoice.invoiceDate,
      description: `Sales Return - Invoice ${returnInvoice.invoiceNumber}`,
      debit: 0,
      credit: amount,
      referenceType: 'Invoice',
      referenceId: returnInvoice._id
    });

    // Debit GST Output (reverse tax liability)
    if (taxAmount > 0) {
      await ledgerService.createLedgerEntry({
        accountId: 'GST_OUTPUT_ACCOUNT', // Should be from config
        date: returnInvoice.invoiceDate,
        description: `Sales Return GST - Invoice ${returnInvoice.invoiceNumber}`,
        debit: taxAmount,
        credit: 0,
        referenceType: 'Invoice',
        referenceId: returnInvoice._id
      });
    }
  }
}

module.exports = new SalesReturnService();
