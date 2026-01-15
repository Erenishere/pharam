const Account = require('../models/Account');

/**
 * Discount Service
 * Handles business logic for discount management and validation
 */
class DiscountService {
  /**
   * Calculate Discount 1 (regular discount)
   * @param {number} amount - Amount to apply discount on
   * @param {number} percent - Discount percentage
   * @returns {number} Discount amount
   */
  calculateDiscount1(amount, percent) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (percent < 0 || percent > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }
    return (amount * percent) / 100;
  }

  /**
   * Calculate Discount 2 (claim-based discount)
   * @param {number} amount - Amount to apply discount on (after discount 1)
   * @param {number} percent - Discount percentage
   * @param {string} claimAccountId - Claim account ID (required for discount 2)
   * @returns {Promise<number>} Discount amount
   */
  async calculateDiscount2(amount, percent, claimAccountId) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (percent < 0 || percent > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }

    // Validate claim account is provided when discount2 is applied
    if (percent > 0 && !claimAccountId) {
      throw new Error('Claim account is required when applying Discount 2');
    }

    // Validate claim account exists and is active
    if (claimAccountId) {
      await this.validateClaimAccount(claimAccountId);
    }

    return (amount * percent) / 100;
  }

  /**
   * Validate claim account exists and is active
   * @param {string} claimAccountId - Claim account ID
   * @returns {Promise<Object>} Claim account
   */
  async validateClaimAccount(claimAccountId) {
    if (!claimAccountId) {
      throw new Error('Claim account ID is required');
    }

    const account = await Account.findById(claimAccountId);
    
    if (!account) {
      throw new Error(`Claim account not found: ${claimAccountId}`);
    }

    if (!account.isActive) {
      throw new Error(`Claim account ${account.name} is not active`);
    }

    // Optionally validate account type is suitable for claims
    // This depends on your account structure
    if (account.accountType && !['expense', 'adjustment', 'claim'].includes(account.accountType.toLowerCase())) {
      throw new Error(`Account ${account.name} is not a valid claim account type`);
    }

    return account;
  }

  /**
   * Apply discounts in sequence (discount1 first, then discount2)
   * @param {number} amount - Original amount
   * @param {Object} discountData - Discount data
   * @param {number} discountData.discount1Percent - Discount 1 percentage
   * @param {number} discountData.discount2Percent - Discount 2 percentage
   * @param {string} discountData.claimAccountId - Claim account ID for discount 2
   * @returns {Promise<Object>} Discount calculation result
   */
  async applyDiscounts(amount, discountData) {
    const {
      discount1Percent = 0,
      discount2Percent = 0,
      claimAccountId
    } = discountData;

    // Calculate discount 1
    const discount1Amount = this.calculateDiscount1(amount, discount1Percent);
    const amountAfterDiscount1 = amount - discount1Amount;

    // Calculate discount 2 on amount after discount 1
    const discount2Amount = await this.calculateDiscount2(
      amountAfterDiscount1,
      discount2Percent,
      claimAccountId
    );
    const amountAfterDiscount2 = amountAfterDiscount1 - discount2Amount;

    return {
      originalAmount: amount,
      discount1Percent,
      discount1Amount,
      amountAfterDiscount1,
      discount2Percent,
      discount2Amount,
      amountAfterDiscount2,
      totalDiscount: discount1Amount + discount2Amount,
      finalAmount: amountAfterDiscount2
    };
  }

  /**
   * Validate invoice discount configuration
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<boolean>} Validation result
   */
  async validateInvoiceDiscounts(invoiceData) {
    const { items, claimAccountId } = invoiceData;

    if (!items || !Array.isArray(items)) {
      throw new Error('Invoice items are required');
    }

    // Check if any item has discount2
    const hasDiscount2 = items.some(item => 
      item.discount2Percent && item.discount2Percent > 0
    );

    // If any item has discount2, claim account must be provided at invoice level
    if (hasDiscount2 && !claimAccountId) {
      throw new Error('Claim account is required when applying Discount 2 to any item');
    }

    // Validate claim account if provided
    if (claimAccountId) {
      await this.validateClaimAccount(claimAccountId);
    }

    // Validate each item's discounts
    for (const item of items) {
      if (item.discount1Percent < 0 || item.discount1Percent > 100) {
        throw new Error(`Invalid discount1Percent for item ${item.itemId}: must be between 0 and 100`);
      }
      if (item.discount2Percent < 0 || item.discount2Percent > 100) {
        throw new Error(`Invalid discount2Percent for item ${item.itemId}: must be between 0 and 100`);
      }
    }

    return true;
  }

  /**
   * Calculate line total with multi-level discounts
   * @param {Object} lineItem - Line item data
   * @param {number} lineItem.quantity - Quantity
   * @param {number} lineItem.unitPrice - Unit price
   * @param {number} lineItem.discount1Percent - Discount 1 percentage
   * @param {number} lineItem.discount2Percent - Discount 2 percentage
   * @param {number} lineItem.taxRate - Tax rate (applied after discounts)
   * @param {string} claimAccountId - Claim account ID (required if discount2 > 0)
   * @returns {Promise<Object>} Line calculation result
   */
  async calculateLineTotal(lineItem, claimAccountId) {
    const { quantity, unitPrice, discount1Percent = 0, discount2Percent = 0, taxRate = 0 } = lineItem;

    // Calculate line subtotal
    const lineSubtotal = quantity * unitPrice;

    // Apply discounts
    const discountResult = await this.applyDiscounts(lineSubtotal, {
      discount1Percent,
      discount2Percent,
      claimAccountId
    });

    // Calculate tax on amount after discounts
    const taxAmount = (discountResult.finalAmount * taxRate) / 100;
    const lineTotal = discountResult.finalAmount + taxAmount;

    return {
      lineSubtotal,
      discount1Amount: discountResult.discount1Amount,
      discount2Amount: discountResult.discount2Amount,
      totalDiscount: discountResult.totalDiscount,
      taxableAmount: discountResult.finalAmount,
      taxAmount,
      lineTotal
    };
  }
}

module.exports = new DiscountService();
