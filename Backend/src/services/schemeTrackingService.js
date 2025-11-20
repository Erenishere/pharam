const Invoice = require('../models/Invoice');
const Account = require('../models/Account');
const ledgerService = require('./ledgerService');

/**
 * Scheme Tracking Service
 * Handles business logic for tracking scheme quantities and claims
 */
class SchemeTrackingService {
  /**
   * Record scheme quantities for an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Array} schemeItems - Items with scheme quantities
   * @returns {Promise<Object>} Recorded scheme data
   */
  async recordSchemeQuantities(invoiceId, schemeItems) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!schemeItems || !Array.isArray(schemeItems) || schemeItems.length === 0) {
      throw new Error('Scheme items are required');
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate and record scheme quantities
    const recordedSchemes = [];

    for (const schemeItem of schemeItems) {
      const { itemId, scheme1Quantity = 0, scheme2Quantity = 0, claimAccountId } = schemeItem;

      // Validate item exists in invoice
      const invoiceItem = invoice.items.find(
        item => item.itemId.toString() === itemId.toString()
      );

      if (!invoiceItem) {
        throw new Error(`Item ${itemId} not found in invoice`);
      }

      // Validate scheme2 has claim account if quantity > 0
      if (scheme2Quantity > 0 && !claimAccountId) {
        throw new Error(`Claim account is required for scheme2 quantity on item ${itemId}`);
      }

      // Validate claim account if provided
      if (claimAccountId) {
        const account = await Account.findById(claimAccountId);
        if (!account) {
          throw new Error(`Claim account not found: ${claimAccountId}`);
        }
        if (!account.isActive) {
          throw new Error(`Claim account ${account.name} is not active`);
        }
      }

      // Update invoice item with scheme quantities
      invoiceItem.scheme1Quantity = scheme1Quantity;
      invoiceItem.scheme2Quantity = scheme2Quantity;

      recordedSchemes.push({
        itemId,
        scheme1Quantity,
        scheme2Quantity,
        claimAccountId: claimAccountId || null,
        recordedAt: new Date()
      });
    }

    // Save invoice with updated scheme quantities
    await invoice.save();

    return {
      invoiceId,
      schemes: recordedSchemes,
      totalScheme1: recordedSchemes.reduce((sum, s) => sum + s.scheme1Quantity, 0),
      totalScheme2: recordedSchemes.reduce((sum, s) => sum + s.scheme2Quantity, 0)
    };
  }

  /**
   * Get scheme summary for a specific invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Scheme summary
   */
  async getInvoiceSchemes(invoiceId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    const invoice = await Invoice.findById(invoiceId)
      .populate('items.itemId', 'name code')
      .populate('claimAccountId', 'name accountNumber');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const schemes = invoice.items
      .filter(item => item.scheme1Quantity > 0 || item.scheme2Quantity > 0)
      .map(item => ({
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        scheme1Quantity: item.scheme1Quantity || 0,
        scheme2Quantity: item.scheme2Quantity || 0,
        totalSchemeQuantity: (item.scheme1Quantity || 0) + (item.scheme2Quantity || 0)
      }));

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      claimAccount: invoice.claimAccountId ? {
        id: invoice.claimAccountId._id,
        name: invoice.claimAccountId.name,
        accountNumber: invoice.claimAccountId.accountNumber
      } : null,
      schemes,
      totalScheme1: schemes.reduce((sum, s) => sum + s.scheme1Quantity, 0),
      totalScheme2: schemes.reduce((sum, s) => sum + s.scheme2Quantity, 0),
      totalSchemes: schemes.reduce((sum, s) => sum + s.totalSchemeQuantity, 0)
    };
  }

  /**
   * Get scheme summary for a customer
   * @param {string} customerId - Customer ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Customer scheme summary
   */
  async getCustomerSchemesSummary(customerId, dateRange = {}) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    const query = {
      customerId,
      type: 'sales',
      status: { $ne: 'cancelled' }
    };

    // Add date range filter if provided
    if (dateRange.startDate || dateRange.endDate) {
      query.invoiceDate = {};
      if (dateRange.startDate) {
        query.invoiceDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query.invoiceDate.$lte = new Date(dateRange.endDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'name code')
      .sort({ invoiceDate: -1 });

    let totalScheme1 = 0;
    let totalScheme2 = 0;
    const itemSchemes = {};

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const scheme1 = item.scheme1Quantity || 0;
        const scheme2 = item.scheme2Quantity || 0;

        if (scheme1 > 0 || scheme2 > 0) {
          const itemId = item.itemId._id.toString();
          
          if (!itemSchemes[itemId]) {
            itemSchemes[itemId] = {
              itemId: item.itemId._id,
              itemName: item.itemId.name,
              itemCode: item.itemId.code,
              scheme1Total: 0,
              scheme2Total: 0,
              invoiceCount: 0
            };
          }

          itemSchemes[itemId].scheme1Total += scheme1;
          itemSchemes[itemId].scheme2Total += scheme2;
          itemSchemes[itemId].invoiceCount += 1;

          totalScheme1 += scheme1;
          totalScheme2 += scheme2;
        }
      });
    });

    return {
      customerId,
      dateRange,
      totalInvoices: invoices.length,
      totalScheme1,
      totalScheme2,
      totalSchemes: totalScheme1 + totalScheme2,
      itemBreakdown: Object.values(itemSchemes)
    };
  }

  /**
   * Get scheme summary for a supplier (purchase invoices)
   * @param {string} supplierId - Supplier ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Supplier scheme summary
   */
  async getSupplierSchemesSummary(supplierId, dateRange = {}) {
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const query = {
      supplierId,
      type: 'purchase',
      status: { $ne: 'cancelled' }
    };

    // Add date range filter if provided
    if (dateRange.startDate || dateRange.endDate) {
      query.invoiceDate = {};
      if (dateRange.startDate) {
        query.invoiceDate.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        query.invoiceDate.$lte = new Date(dateRange.endDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('items.itemId', 'name code')
      .sort({ invoiceDate: -1 });

    let totalScheme1 = 0;
    let totalScheme2 = 0;
    const itemSchemes = {};

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const scheme1 = item.scheme1Quantity || 0;
        const scheme2 = item.scheme2Quantity || 0;

        if (scheme1 > 0 || scheme2 > 0) {
          const itemId = item.itemId._id.toString();
          
          if (!itemSchemes[itemId]) {
            itemSchemes[itemId] = {
              itemId: item.itemId._id,
              itemName: item.itemId.name,
              itemCode: item.itemId.code,
              scheme1Total: 0,
              scheme2Total: 0,
              invoiceCount: 0
            };
          }

          itemSchemes[itemId].scheme1Total += scheme1;
          itemSchemes[itemId].scheme2Total += scheme2;
          itemSchemes[itemId].invoiceCount += 1;

          totalScheme1 += scheme1;
          totalScheme2 += scheme2;
        }
      });
    });

    return {
      supplierId,
      dateRange,
      totalInvoices: invoices.length,
      totalScheme1,
      totalScheme2,
      totalSchemes: totalScheme1 + totalScheme2,
      itemBreakdown: Object.values(itemSchemes)
    };
  }

  /**
   * Validate scheme quantities don't exceed regular quantities
   * @param {Array} items - Invoice items with scheme quantities
   * @returns {Object} Validation result
   */
  validateSchemeQuantities(items) {
    const errors = [];

    items.forEach(item => {
      const regularQty = item.quantity || 0;
      const scheme1Qty = item.scheme1Quantity || 0;
      const scheme2Qty = item.scheme2Quantity || 0;
      const totalSchemeQty = scheme1Qty + scheme2Qty;

      // Scheme quantities should not exceed regular quantity
      if (totalSchemeQty > regularQty) {
        errors.push(
          `Item ${item.itemId}: Total scheme quantity (${totalSchemeQty}) ` +
          `exceeds regular quantity (${regularQty})`
        );
      }

      // Scheme quantities must be non-negative
      if (scheme1Qty < 0) {
        errors.push(`Item ${item.itemId}: Scheme1 quantity cannot be negative`);
      }
      if (scheme2Qty < 0) {
        errors.push(`Item ${item.itemId}: Scheme2 quantity cannot be negative`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate claim account for scheme2 application
   * @param {string} claimAccountId - Claim account ID
   * @returns {Promise<Object>} Validated account
   */
  async validateClaimAccount(claimAccountId) {
    if (!claimAccountId) {
      throw new Error('Claim account ID is required');
    }

    const account = await Account.findById(claimAccountId);
    if (!account) {
      throw new Error('Claim account not found');
    }

    if (!account.isActive) {
      throw new Error(`Claim account ${account.name} is not active`);
    }

    if (!account.canBeUsedForClaims()) {
      throw new Error(`Account ${account.name} cannot be used for claims. Must be adjustment, claim, or expense type.`);
    }

    return account;
  }

  /**
   * Link schemes to claim accounts and create ledger entries
   * @param {string} invoiceId - Invoice ID
   * @param {string} claimAccountId - Claim account ID
   * @param {string} userId - User ID creating the entries
   * @returns {Promise<Object>} Updated invoice with ledger entries
   */
  async linkSchemeToClaimAccount(invoiceId, claimAccountId, userId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!claimAccountId) {
      throw new Error('Claim account ID is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate claim account
    const claimAccount = await this.validateClaimAccount(claimAccountId);

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Calculate total scheme2 value for ledger entries
    const scheme2Items = invoice.items.filter(item => item.scheme2Quantity > 0);
    if (scheme2Items.length === 0) {
      throw new Error('No scheme2 quantities found in invoice');
    }

    // Calculate total scheme2 value
    const totalScheme2Value = scheme2Items.reduce((total, item) => {
      const scheme2Value = (item.scheme2Quantity || 0) * (item.unitPrice || 0);
      return total + scheme2Value;
    }, 0);

    // Create ledger entries for scheme claims
    const ledgerEntries = await this.createSchemeClaimLedgerEntries(
      invoice,
      claimAccount,
      totalScheme2Value,
      userId
    );

    // Update invoice with claim account
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { claimAccountId },
      { new: true }
    );

    return {
      invoice: updatedInvoice,
      claimAccount,
      ledgerEntries,
      totalScheme2Value
    };
  }

  /**
   * Create ledger entries for scheme claims
   * @param {Object} invoice - Invoice object
   * @param {Object} claimAccount - Claim account object
   * @param {number} claimAmount - Total claim amount
   * @param {string} userId - User ID creating the entries
   * @returns {Promise<Object>} Created ledger entries
   */
  async createSchemeClaimLedgerEntries(invoice, claimAccount, claimAmount, userId) {
    if (claimAmount <= 0) {
      throw new Error('Claim amount must be greater than 0');
    }

    const description = `Scheme2 claim for invoice ${invoice.invoiceNumber} - ${claimAccount.name}`;

    // For scheme claims:
    // Debit: Claim/Adjustment Account (Expense increases)
    // Credit: Customer Account (Reduces receivable)
    
    const debitAccount = {
      accountId: claimAccount._id,
      accountType: 'Account'
    };

    const creditAccount = {
      accountId: invoice.customerId || invoice.supplierId,
      accountType: invoice.type === 'sales' ? 'Customer' : 'Supplier'
    };

    const ledgerEntries = await ledgerService.createDoubleEntry(
      debitAccount,
      creditAccount,
      claimAmount,
      description,
      'scheme_claim',
      invoice._id,
      userId
    );

    // Update claim account balance
    await claimAccount.updateBalance(claimAmount, 'add');

    return ledgerEntries;
  }

  /**
   * Process scheme application with claim account validation
   * @param {string} invoiceId - Invoice ID
   * @param {Array} schemeItems - Items with scheme quantities
   * @param {string} userId - User ID processing the schemes
   * @returns {Promise<Object>} Processed scheme data with ledger entries
   */
  async processSchemeApplication(invoiceId, schemeItems, userId) {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    if (!schemeItems || !Array.isArray(schemeItems) || schemeItems.length === 0) {
      throw new Error('Scheme items are required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Record scheme quantities
    const recordedSchemes = await this.recordSchemeQuantities(invoiceId, schemeItems);

    // Check if any scheme2 quantities exist and require claim account
    const scheme2Items = schemeItems.filter(item => item.scheme2Quantity > 0);
    
    if (scheme2Items.length > 0) {
      // Validate that all scheme2 items have claim accounts
      const itemsWithoutClaimAccount = scheme2Items.filter(item => !item.claimAccountId);
      
      if (itemsWithoutClaimAccount.length > 0) {
        throw new Error('Claim account is required for all scheme2 quantities');
      }

      // Process each unique claim account
      const claimAccountGroups = {};
      scheme2Items.forEach(item => {
        const claimAccountId = item.claimAccountId.toString();
        if (!claimAccountGroups[claimAccountId]) {
          claimAccountGroups[claimAccountId] = [];
        }
        claimAccountGroups[claimAccountId].push(item);
      });

      const ledgerEntries = [];
      
      for (const [claimAccountId, items] of Object.entries(claimAccountGroups)) {
        // Link scheme to claim account and create ledger entries
        const claimResult = await this.linkSchemeToClaimAccount(invoiceId, claimAccountId, userId);
        ledgerEntries.push(...claimResult.ledgerEntries);
      }

      recordedSchemes.ledgerEntries = ledgerEntries;
    }

    return recordedSchemes;
  }

  /**
   * Separate scheme items from regular items for inventory management
   * @param {Array} items - Invoice items
   * @returns {Object} Separated items with inventory impact details
   */
  separateSchemeItems(items) {
    const regularItems = [];
    const schemeItems = [];
    const inventoryImpactItems = [];

    items.forEach(item => {
      const scheme1Qty = item.scheme1Quantity || 0;
      const scheme2Qty = item.scheme2Quantity || 0;
      const totalSchemeQty = scheme1Qty + scheme2Qty;
      const hasScheme = totalSchemeQty > 0;

      // Create scheme item entry if there are scheme quantities
      if (hasScheme) {
        schemeItems.push({
          ...item,
          scheme1Quantity: scheme1Qty,
          scheme2Quantity: scheme2Qty,
          totalSchemeQuantity: totalSchemeQty,
          affectsInventory: false, // Scheme items don't affect inventory
          itemType: 'scheme'
        });
      }

      // Regular quantity (excluding schemes) - these affect inventory
      const regularQuantity = item.quantity - totalSchemeQty;

      if (regularQuantity > 0) {
        const regularItem = {
          ...item,
          quantity: regularQuantity,
          affectsInventory: true,
          itemType: 'regular'
        };
        regularItems.push(regularItem);
        inventoryImpactItems.push(regularItem);
      }

      // If the total quantity equals scheme quantity, no inventory impact
      // If regular quantity > 0, add to inventory impact items
    });

    return {
      regularItems,
      schemeItems,
      inventoryImpactItems, // Only items that should affect inventory
      summary: {
        totalRegularQuantity: regularItems.reduce((sum, item) => sum + item.quantity, 0),
        totalSchemeQuantity: schemeItems.reduce(
          (sum, item) => sum + (item.scheme1Quantity || 0) + (item.scheme2Quantity || 0),
          0
        ),
        totalInventoryImpact: inventoryImpactItems.reduce((sum, item) => sum + item.quantity, 0),
        itemsWithSchemes: schemeItems.length,
        regularItemsCount: regularItems.length
      }
    };
  }

  /**
   * Validate scheme quantities don't exceed total quantities
   * @param {Array} items - Invoice items with scheme quantities
   * @returns {Object} Validation result with detailed errors
   */
  validateSchemeItemSeparation(items) {
    const errors = [];
    const warnings = [];

    items.forEach((item, index) => {
      const totalQty = item.quantity || 0;
      const scheme1Qty = item.scheme1Quantity || 0;
      const scheme2Qty = item.scheme2Quantity || 0;
      const totalSchemeQty = scheme1Qty + scheme2Qty;
      const regularQty = totalQty - totalSchemeQty;

      // Validation: Total scheme quantity cannot exceed total quantity
      if (totalSchemeQty > totalQty) {
        errors.push({
          itemIndex: index,
          itemId: item.itemId,
          error: 'SCHEME_EXCEEDS_TOTAL',
          message: `Total scheme quantity (${totalSchemeQty}) exceeds total quantity (${totalQty})`,
          totalQuantity: totalQty,
          schemeQuantity: totalSchemeQty,
          regularQuantity: regularQty
        });
      }

      // Validation: Negative quantities
      if (scheme1Qty < 0) {
        errors.push({
          itemIndex: index,
          itemId: item.itemId,
          error: 'NEGATIVE_SCHEME1',
          message: 'Scheme1 quantity cannot be negative',
          scheme1Quantity: scheme1Qty
        });
      }

      if (scheme2Qty < 0) {
        errors.push({
          itemIndex: index,
          itemId: item.itemId,
          error: 'NEGATIVE_SCHEME2',
          message: 'Scheme2 quantity cannot be negative',
          scheme2Quantity: scheme2Qty
        });
      }

      // Warning: Item with only scheme quantities (no regular sales)
      if (totalSchemeQty > 0 && regularQty === 0) {
        warnings.push({
          itemIndex: index,
          itemId: item.itemId,
          warning: 'SCHEME_ONLY_ITEM',
          message: 'Item has only scheme quantities (no regular sales)',
          totalSchemeQuantity: totalSchemeQty
        });
      }

      // Warning: Large scheme percentage
      if (totalQty > 0 && (totalSchemeQty / totalQty) > 0.5) {
        warnings.push({
          itemIndex: index,
          itemId: item.itemId,
          warning: 'HIGH_SCHEME_PERCENTAGE',
          message: `Scheme quantities (${totalSchemeQty}) exceed 50% of total quantity (${totalQty})`,
          schemePercentage: Math.round((totalSchemeQty / totalQty) * 100)
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalItems: items.length,
        itemsWithErrors: errors.length,
        itemsWithWarnings: warnings.length,
        itemsWithSchemes: items.filter(item => 
          (item.scheme1Quantity || 0) > 0 || (item.scheme2Quantity || 0) > 0
        ).length
      }
    };
  }

  /**
   * Process invoice items for inventory impact (excluding scheme items)
   * @param {Array} items - Invoice items
   * @returns {Object} Items processed for inventory management
   */
  processItemsForInventoryImpact(items) {
    const validation = this.validateSchemeItemSeparation(items);
    
    if (!validation.valid) {
      throw new Error(`Scheme validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const separation = this.separateSchemeItems(items);

    return {
      inventoryItems: separation.inventoryImpactItems, // Only these affect inventory
      schemeItems: separation.schemeItems, // These are tracked but don't affect inventory
      regularItems: separation.regularItems, // Regular sales items
      validation,
      summary: separation.summary
    };
  }

  /**
   * Update inventory levels considering scheme item separation
   * @param {Array} items - Invoice items with scheme quantities
   * @param {string} operation - Operation type ('subtract' or 'add')
   * @returns {Promise<Object>} Inventory update result
   */
  async updateInventoryWithSchemeAwareness(items, operation = 'subtract') {
    const Item = require('../models/Item');
    
    // Process items to separate scheme from regular items
    const processed = this.processItemsForInventoryImpact(items);
    
    const updatedItems = [];
    const skippedSchemeItems = [];

    // Only update inventory for items that affect inventory (regular items)
    for (const item of processed.inventoryItems) {
      const itemDoc = await Item.findById(item.itemId);
      
      if (!itemDoc) {
        throw new Error(`Item not found: ${item.itemId}`);
      }

      const originalStock = itemDoc.inventory.currentStock;

      if (operation === 'subtract') {
        itemDoc.inventory.currentStock = Math.max(0, itemDoc.inventory.currentStock - item.quantity);
      } else if (operation === 'add') {
        itemDoc.inventory.currentStock += item.quantity;
      }

      await itemDoc.save();
      
      updatedItems.push({
        itemId: item.itemId,
        originalStock,
        newStock: itemDoc.inventory.currentStock,
        quantityChanged: item.quantity,
        operation,
        itemType: 'regular'
      });
    }

    // Track scheme items but don't update inventory
    processed.schemeItems.forEach(item => {
      skippedSchemeItems.push({
        itemId: item.itemId,
        scheme1Quantity: item.scheme1Quantity,
        scheme2Quantity: item.scheme2Quantity,
        totalSchemeQuantity: item.totalSchemeQuantity,
        reason: 'Scheme items do not affect inventory',
        itemType: 'scheme'
      });
    });

    return {
      inventoryUpdates: updatedItems,
      schemeItemsTracked: skippedSchemeItems,
      summary: {
        itemsUpdated: updatedItems.length,
        schemeItemsSkipped: skippedSchemeItems.length,
        totalRegularQuantity: processed.summary.totalRegularQuantity,
        totalSchemeQuantity: processed.summary.totalSchemeQuantity,
        inventoryImpact: processed.summary.totalInventoryImpact
      },
      validation: processed.validation
    };
  }

  /**
   * Create stock movements for scheme-aware inventory
   * @param {Object} invoice - Invoice object
   * @param {string} userId - User ID creating the movements
   * @param {string} operation - Operation type ('out' for sales, 'in' for returns)
   * @returns {Promise<Array>} Created stock movements
   */
  async createSchemeAwareStockMovements(invoice, userId, operation = 'out') {
    const stockMovementRepository = require('../repositories/stockMovementRepository');
    
    // Process items to separate scheme from regular items
    const processed = this.processItemsForInventoryImpact(invoice.items);
    
    const movements = [];

    // Create stock movements only for items that affect inventory
    for (const item of processed.inventoryItems) {
      const movementData = {
        itemId: item.itemId,
        movementType: operation,
        quantity: item.quantity,
        referenceType: 'sales_invoice',
        referenceId: invoice._id,
        batchInfo: item.batchInfo || {},
        warehouseId: item.warehouseId || null,
        movementDate: invoice.invoiceDate || new Date(),
        notes: `${operation === 'out' ? 'Sales' : 'Return'} invoice ${invoice.invoiceNumber} - Regular items only (schemes excluded)`,
        createdBy: userId,
        metadata: {
          itemType: 'regular',
          excludesSchemes: true,
          originalQuantity: item.quantity + (item.scheme1Quantity || 0) + (item.scheme2Quantity || 0),
          schemeQuantities: {
            scheme1: item.scheme1Quantity || 0,
            scheme2: item.scheme2Quantity || 0
          }
        }
      };

      const movement = await stockMovementRepository.create(movementData);
      movements.push(movement);
    }

    // Log scheme items for audit trail (but no stock movement)
    const schemeAuditLog = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      schemeItems: processed.schemeItems.map(item => ({
        itemId: item.itemId,
        scheme1Quantity: item.scheme1Quantity,
        scheme2Quantity: item.scheme2Quantity,
        totalSchemeQuantity: item.totalSchemeQuantity,
        note: 'Scheme quantities tracked but not affecting inventory'
      })),
      createdAt: new Date(),
      createdBy: userId
    };

    return {
      stockMovements: movements,
      schemeAuditLog,
      summary: {
        movementsCreated: movements.length,
        schemeItemsLogged: processed.schemeItems.length,
        totalInventoryImpact: processed.summary.totalInventoryImpact,
        totalSchemeQuantity: processed.summary.totalSchemeQuantity
      }
    };
  }
}

module.exports = new SchemeTrackingService();
