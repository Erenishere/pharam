const Invoice = require('../models/Invoice');
const inventoryService = require('./inventoryService');
const stockMovementRepository = require('../repositories/stockMovementRepository');
const ledgerService = require('./ledgerService');

/**
 * Purchase Return Service
 * Handles business logic for purchase return management
 */
class PurchaseReturnService {
  /**
   * Validate return quantities against original purchase invoice
   * @param {string} invoiceId - Original invoice ID
   * @param {Array} returnItems - Items to be returned with quantities
   * @returns {Promise<Object>} Validation result
   */
  async validateReturnQuantities(invoiceId, returnItems) {
    // Get original invoice
    const originalInvoice = await Invoice.findById(invoiceId);
    
    if (!originalInvoice) {
      return {
        valid: false,
        errors: ['Original invoice not found']
      };
    }

    if (originalInvoice.type !== 'purchase') {
      return {
        valid: false,
        errors: ['Can only create returns for purchase invoices']
      };
    }

    // Get all existing return invoices for this original invoice
    const existingReturns = await Invoice.find({
      originalInvoiceId: invoiceId,
      type: 'return_purchase',
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
   * Get returnable items from a purchase invoice
   * @param {string} invoiceId - Original invoice ID
   * @returns {Promise<Array>} List of items with returnable quantities
   */
  async getReturnableItems(invoiceId) {
    // Get original invoice
    const originalInvoice = await Invoice.findById(invoiceId)
      .populate('items.itemId', 'name code');
    
    if (!originalInvoice) {
      throw new Error('Original invoice not found');
    }

    if (originalInvoice.type !== 'purchase') {
      throw new Error('Can only get returnable items for purchase invoices');
    }

    // Get all existing return invoices
    const existingReturns = await Invoice.find({
      originalInvoiceId: invoiceId,
      type: 'return_purchase',
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
   * Create a purchase return invoice
   * @param {Object} returnData - Return invoice data
   * @returns {Promise<Object>} Created return invoice
   */
  async createPurchaseReturn(returnData) {
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

    if (originalInvoice.type !== 'purchase') {
      throw new Error('Can only create returns for purchase invoices');
    }

    // Validate return quantities
    const validation = await this.validateReturnQuantities(
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
    let gst18Total = 0;
    let gst4Total = 0;

    for (const returnItem of returnItems) {
      const originalItem = originalInvoice.items.find(
        item => item.itemId.toString() === returnItem.itemId.toString()
      );

      const itemSubtotal = returnItem.quantity * originalItem.unitPrice;
      
      // Calculate GST based on original item's GST rate
      let gstAmount = 0;
      if (originalItem.gstRate === 18) {
        gstAmount = (itemSubtotal * 18) / 100;
        gst18Total += gstAmount;
      } else if (originalItem.gstRate === 4) {
        gstAmount = (itemSubtotal * 4) / 100;
        gst4Total += gstAmount;
      }

      returnInvoiceItems.push({
        itemId: returnItem.itemId,
        quantity: -returnItem.quantity, // Negative for return
        unitPrice: originalItem.unitPrice,
        discount: originalItem.discount || 0,
        gstRate: originalItem.gstRate || 18,
        gstAmount: -gstAmount, // Negative GST
        taxAmount: -gstAmount,
        lineTotal: -(itemSubtotal + gstAmount)
      });

      subtotal -= itemSubtotal;
      totalTax -= gstAmount;
    }

    // Create return invoice
    const returnInvoice = new Invoice({
      type: 'return_purchase',
      supplierId: originalInvoice.supplierId,
      supplierBillNo: `${originalInvoice.supplierBillNo}-RET`,
      originalInvoiceId,
      invoiceDate: new Date(),
      dueDate: new Date(),
      items: returnInvoiceItems,
      totals: {
        subtotal,
        totalDiscount: 0,
        totalTax,
        gst18Total: -gst18Total,
        gst4Total: -gst4Total,
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
    await this.reverseInventory(returnInvoiceItems);

    // Create reverse ledger entries
    await this.createReverseLedgerEntries(returnInvoice, originalInvoice);

    return returnInvoice;
  }

  /**
   * Reverse inventory for purchase returns
   * @param {Array} returnItems - Return items
   */
  async reverseInventory(returnItems) {
    for (const item of returnItems) {
      const quantity = Math.abs(item.quantity);
      
      // Decrease inventory (return to supplier)
      await inventoryService.adjustInventory(
        item.itemId,
        quantity,
        'decrease',
        'Purchase return'
      );

      // Create stock movement record
      await stockMovementRepository.create({
        itemId: item.itemId,
        movementType: 'return_to_supplier',
        quantity: -quantity,
        date: new Date(),
        reference: 'Purchase Return',
        notes: 'Item returned to supplier'
      });
    }
  }

  /**
   * Create reverse ledger entries for purchase returns
   * @param {Object} returnInvoice - Return invoice
   * @param {Object} originalInvoice - Original invoice
   */
  async createReverseLedgerEntries(returnInvoice, originalInvoice) {
    const amount = Math.abs(returnInvoice.totals.grandTotal);
    const taxAmount = Math.abs(returnInvoice.totals.totalTax);
    const subtotal = Math.abs(returnInvoice.totals.subtotal);

    // Credit Inventory Account (reduce asset)
    await ledgerService.createLedgerEntry({
      accountId: 'INVENTORY_ACCOUNT', // Should be from config
      date: returnInvoice.invoiceDate,
      description: `Purchase Return - Invoice ${returnInvoice.invoiceNumber}`,
      debit: 0,
      credit: subtotal,
      referenceType: 'Invoice',
      referenceId: returnInvoice._id
    });

    // Debit Accounts Payable (reduce liability)
    await ledgerService.createLedgerEntry({
      accountId: originalInvoice.supplierId,
      date: returnInvoice.invoiceDate,
      description: `Purchase Return - Invoice ${returnInvoice.invoiceNumber}`,
      debit: amount,
      credit: 0,
      referenceType: 'Invoice',
      referenceId: returnInvoice._id
    });

    // Credit GST Input (reverse tax credit)
    if (taxAmount > 0) {
      await ledgerService.createLedgerEntry({
        accountId: 'GST_INPUT_ACCOUNT', // Should be from config
        date: returnInvoice.invoiceDate,
        description: `Purchase Return GST - Invoice ${returnInvoice.invoiceNumber}`,
        debit: 0,
        credit: taxAmount,
        referenceType: 'Invoice',
        referenceId: returnInvoice._id
      });
    }
  }
}

module.exports = new PurchaseReturnService();
