const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

/**
 * Invoice Validation Service
 * Centralized validation logic for invoices
 */
class InvoiceValidationService {
  /**
   * Validate invoice items (stock availability, pricing, etc.)
   * @param {Array} items - Invoice items
   * @param {string} invoiceType - 'sales' or 'purchase'
   * @returns {Promise<Object>} Validation result
   */
  async validateInvoiceItems(items, invoiceType = 'sales') {
    const errors = [];
    const warnings = [];

    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push({
        field: 'items',
        message: 'At least one item is required',
        code: 'ITEMS_REQUIRED',
      });
      return { isValid: false, errors, warnings };
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemErrors = await this.validateSingleItem(item, i, invoiceType);
      errors.push(...itemErrors.errors);
      warnings.push(...itemErrors.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single invoice item
   * @param {Object} item - Invoice item
   * @param {number} index - Item index
   * @param {string} invoiceType - 'sales' or 'purchase'
   * @returns {Promise<Object>} Validation result
   */
  async validateSingleItem(item, index, invoiceType) {
    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!item.itemId) {
      errors.push({
        field: `items[${index}].itemId`,
        message: 'Item ID is required',
        code: 'ITEM_ID_REQUIRED',
      });
      return { errors, warnings };
    }

    // Get item details
    let itemDetails;
    try {
      itemDetails = await Item.findById(item.itemId);
      if (!itemDetails) {
        errors.push({
          field: `items[${index}].itemId`,
          message: `Item not found: ${item.itemId}`,
          code: 'ITEM_NOT_FOUND',
        });
        return { errors, warnings };
      }
    } catch (error) {
      errors.push({
        field: `items[${index}].itemId`,
        message: 'Invalid item ID format',
        code: 'INVALID_ITEM_ID',
      });
      return { errors, warnings };
    }

    // Validate item is active
    if (!itemDetails.isActive) {
      errors.push({
        field: `items[${index}].itemId`,
        message: `Item ${itemDetails.name} is not active`,
        code: 'ITEM_INACTIVE',
      });
    }

    // Validate quantity
    if (!item.quantity || item.quantity <= 0) {
      errors.push({
        field: `items[${index}].quantity`,
        message: 'Quantity must be greater than zero',
        code: 'INVALID_QUANTITY',
      });
    }

    // Validate unit price
    if (item.unitPrice === undefined || item.unitPrice < 0) {
      errors.push({
        field: `items[${index}].unitPrice`,
        message: 'Unit price must be zero or greater',
        code: 'INVALID_UNIT_PRICE',
      });
    }

    // Validate discount
    if (item.discount !== undefined) {
      if (item.discount < 0 || item.discount > 100) {
        errors.push({
          field: `items[${index}].discount`,
          message: 'Discount must be between 0 and 100',
          code: 'INVALID_DISCOUNT',
        });
      }
    }

    // For sales invoices, validate stock availability
    if (invoiceType === 'sales' && item.quantity > 0) {
      const stockValidation = this.validateStockAvailability(
        itemDetails,
        item.quantity,
        index
      );
      errors.push(...stockValidation.errors);
      warnings.push(...stockValidation.warnings);
    }

    // Validate pricing consistency
    if (invoiceType === 'sales' && item.unitPrice) {
      const pricingValidation = this.validatePricing(
        itemDetails,
        item.unitPrice,
        'sale',
        index
      );
      warnings.push(...pricingValidation.warnings);
    } else if (invoiceType === 'purchase' && item.unitPrice) {
      const pricingValidation = this.validatePricing(
        itemDetails,
        item.unitPrice,
        'cost',
        index
      );
      warnings.push(...pricingValidation.warnings);
    }

    // For purchase invoices, validate batch information
    if (invoiceType === 'purchase' && item.batchInfo) {
      const batchValidation = this.validateBatchInfo(item.batchInfo, index);
      errors.push(...batchValidation.errors);
      warnings.push(...batchValidation.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validate stock availability
   * @param {Object} item - Item details
   * @param {number} quantity - Required quantity
   * @param {number} index - Item index
   * @returns {Object} Validation result
   */
  validateStockAvailability(item, quantity, index) {
    const errors = [];
    const warnings = [];

    const currentStock = item.inventory?.currentStock || 0;

    if (currentStock < quantity) {
      errors.push({
        field: `items[${index}].quantity`,
        message: `Insufficient stock for ${item.name}. Available: ${currentStock}, Required: ${quantity}`,
        code: 'INSUFFICIENT_STOCK',
        details: {
          itemCode: item.code,
          itemName: item.name,
          available: currentStock,
          required: quantity,
          shortfall: quantity - currentStock,
        },
      });
    } else if (currentStock - quantity < item.inventory?.minStock) {
      warnings.push({
        field: `items[${index}].quantity`,
        message: `Stock will fall below minimum level for ${item.name} after this transaction`,
        code: 'LOW_STOCK_WARNING',
        details: {
          itemCode: item.code,
          itemName: item.name,
          currentStock,
          afterTransaction: currentStock - quantity,
          minStock: item.inventory?.minStock,
        },
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate pricing
   * @param {Object} item - Item details
   * @param {number} unitPrice - Unit price
   * @param {string} priceType - 'sale' or 'cost'
   * @param {number} index - Item index
   * @returns {Object} Validation result
   */
  validatePricing(item, unitPrice, priceType, index) {
    const warnings = [];

    const expectedPrice =
      priceType === 'sale' ? item.pricing?.salePrice : item.pricing?.costPrice;

    if (expectedPrice && unitPrice !== expectedPrice) {
      const difference = ((unitPrice - expectedPrice) / expectedPrice) * 100;
      const differenceAbs = Math.abs(difference);

      if (differenceAbs > 20) {
        warnings.push({
          field: `items[${index}].unitPrice`,
          message: `Price differs significantly from standard ${priceType} price for ${item.name}`,
          code: 'PRICE_VARIANCE_WARNING',
          details: {
            itemCode: item.code,
            itemName: item.name,
            standardPrice: expectedPrice,
            invoicePrice: unitPrice,
            variance: difference.toFixed(2) + '%',
          },
        });
      }
    }

    return { warnings };
  }

  /**
   * Validate batch information
   * @param {Object} batchInfo - Batch information
   * @param {number} index - Item index
   * @returns {Object} Validation result
   */
  validateBatchInfo(batchInfo, index) {
    const errors = [];
    const warnings = [];

    if (batchInfo.manufacturingDate && batchInfo.expiryDate) {
      const mfgDate = new Date(batchInfo.manufacturingDate);
      const expDate = new Date(batchInfo.expiryDate);

      if (expDate <= mfgDate) {
        errors.push({
          field: `items[${index}].batchInfo.expiryDate`,
          message: 'Expiry date must be after manufacturing date',
          code: 'INVALID_BATCH_DATES',
        });
      }

      // Check if already expired
      if (expDate < new Date()) {
        errors.push({
          field: `items[${index}].batchInfo.expiryDate`,
          message: 'Batch is already expired',
          code: 'BATCH_EXPIRED',
        });
      }

      // Warn if expiring soon (within 30 days)
      const daysUntilExpiry = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
        warnings.push({
          field: `items[${index}].batchInfo.expiryDate`,
          message: `Batch expires in ${daysUntilExpiry} days`,
          code: 'BATCH_EXPIRING_SOON',
          details: {
            daysUntilExpiry,
            expiryDate: expDate,
          },
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate credit limit for sales invoice
   * @param {string} customerId - Customer ID
   * @param {number} invoiceAmount - Invoice amount
   * @param {number} existingBalance - Existing customer balance (optional)
   * @returns {Promise<Object>} Validation result
   */
  async validateCreditLimit(customerId, invoiceAmount, existingBalance = 0) {
    const errors = [];
    const warnings = [];

    try {
      const customer = await Customer.findById(customerId);

      if (!customer) {
        errors.push({
          field: 'customerId',
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND',
        });
        return { isValid: false, errors, warnings };
      }

      if (!customer.isActive) {
        errors.push({
          field: 'customerId',
          message: 'Customer is not active',
          code: 'CUSTOMER_INACTIVE',
        });
        return { isValid: false, errors, warnings };
      }

      const creditLimit = customer.financialInfo?.creditLimit || 0;

      // If no credit limit set, allow transaction but warn
      if (creditLimit === 0) {
        warnings.push({
          field: 'customerId',
          message: 'No credit limit set for customer',
          code: 'NO_CREDIT_LIMIT',
        });
        return { isValid: true, errors, warnings };
      }

      const totalExposure = existingBalance + invoiceAmount;

      if (totalExposure > creditLimit) {
        errors.push({
          field: 'totals.grandTotal',
          message: `Total exposure (${totalExposure}) exceeds customer credit limit (${creditLimit})`,
          code: 'CREDIT_LIMIT_EXCEEDED',
          details: {
            customerCode: customer.code,
            customerName: customer.name,
            creditLimit,
            existingBalance,
            invoiceAmount,
            totalExposure,
            excess: totalExposure - creditLimit,
          },
        });
      } else if (totalExposure > creditLimit * 0.9) {
        warnings.push({
          field: 'totals.grandTotal',
          message: `Customer is approaching credit limit (${((totalExposure / creditLimit) * 100).toFixed(1)}% utilized)`,
          code: 'CREDIT_LIMIT_WARNING',
          details: {
            customerCode: customer.code,
            customerName: customer.name,
            creditLimit,
            totalExposure,
            utilizationPercent: ((totalExposure / creditLimit) * 100).toFixed(1),
          },
        });
      }
    } catch (error) {
      errors.push({
        field: 'customerId',
        message: 'Error validating credit limit',
        code: 'VALIDATION_ERROR',
        details: { error: error.message },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate payment terms for purchase invoice
   * @param {string} supplierId - Supplier ID
   * @param {number} paymentTerms - Payment terms in days
   * @returns {Promise<Object>} Validation result
   */
  async validatePaymentTerms(supplierId, paymentTerms) {
    const errors = [];
    const warnings = [];

    try {
      const supplier = await Supplier.findById(supplierId);

      if (!supplier) {
        errors.push({
          field: 'supplierId',
          message: 'Supplier not found',
          code: 'SUPPLIER_NOT_FOUND',
        });
        return { isValid: false, errors, warnings };
      }

      if (!supplier.isActive) {
        errors.push({
          field: 'supplierId',
          message: 'Supplier is not active',
          code: 'SUPPLIER_INACTIVE',
        });
        return { isValid: false, errors, warnings };
      }

      const standardTerms = supplier.financialInfo?.paymentTerms || 30;

      if (paymentTerms && paymentTerms !== standardTerms) {
        warnings.push({
          field: 'paymentTerms',
          message: `Payment terms (${paymentTerms} days) differ from supplier's standard terms (${standardTerms} days)`,
          code: 'PAYMENT_TERMS_VARIANCE',
          details: {
            supplierCode: supplier.code,
            supplierName: supplier.name,
            standardTerms,
            invoiceTerms: paymentTerms,
          },
        });
      }

      if (paymentTerms && paymentTerms > 90) {
        warnings.push({
          field: 'paymentTerms',
          message: 'Payment terms exceed 90 days',
          code: 'LONG_PAYMENT_TERMS',
        });
      }
    } catch (error) {
      errors.push({
        field: 'supplierId',
        message: 'Error validating payment terms',
        code: 'VALIDATION_ERROR',
        details: { error: error.message },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate complete sales invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Validation result
   */
  async validateSalesInvoice(invoiceData) {
    const allErrors = [];
    const allWarnings = [];

    // Validate items
    const itemsValidation = await this.validateInvoiceItems(invoiceData.items, 'sales');
    allErrors.push(...itemsValidation.errors);
    allWarnings.push(...itemsValidation.warnings);

    // Validate credit limit
    if (invoiceData.customerId && invoiceData.totals?.grandTotal) {
      const creditValidation = await this.validateCreditLimit(
        invoiceData.customerId,
        invoiceData.totals.grandTotal
      );
      allErrors.push(...creditValidation.errors);
      allWarnings.push(...creditValidation.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Validate complete purchase invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Validation result
   */
  async validatePurchaseInvoice(invoiceData) {
    const allErrors = [];
    const allWarnings = [];

    // Validate items
    const itemsValidation = await this.validateInvoiceItems(invoiceData.items, 'purchase');
    allErrors.push(...itemsValidation.errors);
    allWarnings.push(...itemsValidation.warnings);

    // Validate payment terms
    if (invoiceData.supplierId && invoiceData.paymentTerms) {
      const termsValidation = await this.validatePaymentTerms(
        invoiceData.supplierId,
        invoiceData.paymentTerms
      );
      allErrors.push(...termsValidation.errors);
      allWarnings.push(...termsValidation.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}

module.exports = new InvoiceValidationService();
