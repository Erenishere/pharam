/**
 * Discount Calculation Service
 * Handles multi-level discount calculations for invoices
 */
class DiscountCalculationService {
  /**
   * Calculate first level discount
   * @param {number} amount - Base amount
   * @param {number} percent - Discount percentage
   * @returns {Object} Discount details
   */
  calculateDiscount1(amount, percent = 0) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (percent < 0 || percent > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    const discountAmount = (amount * percent) / 100;
    const amountAfterDiscount = amount - discountAmount;

    return {
      originalAmount: amount,
      discountPercent: percent,
      discountAmount,
      amountAfterDiscount
    };
  }

  /**
   * Calculate second level discount (applied after first discount)
   * @param {number} amount - Amount after first discount
   * @param {number} percent - Discount percentage
   * @param {string} claimAccountId - Claim account ID (required for discount2)
   * @returns {Object} Discount details
   */
  calculateDiscount2(amount, percent = 0, claimAccountId = null) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (percent < 0 || percent > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    // Validate claim account is provided when discount2 is applied
    if (percent > 0 && !claimAccountId) {
      throw new Error('Claim account ID is required when applying discount 2');
    }

    const discountAmount = (amount * percent) / 100;
    const amountAfterDiscount = amount - discountAmount;

    return {
      originalAmount: amount,
      discountPercent: percent,
      discountAmount,
      amountAfterDiscount,
      claimAccountId: claimAccountId || null
    };
  }

  /**
   * Apply discounts in sequence (discount1 then discount2)
   * @param {number} baseAmount - Base amount before discounts
   * @param {number} discount1Percent - First discount percentage
   * @param {number} discount2Percent - Second discount percentage
   * @param {string} claimAccountId - Claim account ID (required for discount2)
   * @returns {Object} Complete discount breakdown
   */
  applySequentialDiscounts(baseAmount, discount1Percent = 0, discount2Percent = 0, claimAccountId = null) {
    if (baseAmount < 0) {
      throw new Error('Base amount cannot be negative');
    }

    // Apply first discount
    const discount1 = this.calculateDiscount1(baseAmount, discount1Percent);

    // Apply second discount on amount after first discount
    const discount2 = this.calculateDiscount2(discount1.amountAfterDiscount, discount2Percent, claimAccountId);

    const totalDiscountAmount = discount1.discountAmount + discount2.discountAmount;
    const totalDiscountPercent = baseAmount > 0 ? (totalDiscountAmount / baseAmount) * 100 : 0;

    return {
      baseAmount,
      discount1: {
        percent: discount1Percent,
        amount: discount1.discountAmount
      },
      discount2: {
        percent: discount2Percent,
        amount: discount2.discountAmount,
        claimAccountId: discount2.claimAccountId
      },
      totalDiscount: {
        amount: totalDiscountAmount,
        percent: totalDiscountPercent
      },
      finalAmount: discount2.amountAfterDiscount
    };
  }

  /**
   * Calculate discount amount from percentage
   * @param {number} amount - Base amount
   * @param {number} percent - Discount percentage
   * @returns {number} Discount amount
   */
  calculateDiscountAmount(amount, percent) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (percent < 0 || percent > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    return (amount * percent) / 100;
  }

  /**
   * Calculate discount percentage from amount
   * @param {number} baseAmount - Base amount
   * @param {number} discountAmount - Discount amount
   * @returns {number} Discount percentage
   */
  calculateDiscountPercent(baseAmount, discountAmount) {
    if (baseAmount <= 0) {
      throw new Error('Base amount must be greater than zero');
    }

    if (discountAmount < 0) {
      throw new Error('Discount amount cannot be negative');
    }

    if (discountAmount > baseAmount) {
      throw new Error('Discount amount cannot exceed base amount');
    }

    return (discountAmount / baseAmount) * 100;
  }

  /**
   * Validate discount data
   * @param {Object} discountData - Discount data to validate
   * @returns {Object} Validation result
   */
  validateDiscountData(discountData) {
    const errors = [];
    const {
      discount1Percent,
      discount1Amount,
      discount2Percent,
      discount2Amount,
      claimAccountId,
      baseAmount
    } = discountData;

    // Validate base amount if provided
    if (baseAmount !== undefined && baseAmount < 0) {
      errors.push('Base amount cannot be negative');
    }

    // Validate discount1
    if (discount1Percent !== undefined) {
      if (typeof discount1Percent !== 'number') {
        errors.push('Discount 1 percentage must be a number');
      } else if (discount1Percent < 0 || discount1Percent > 100) {
        errors.push('Discount 1 percentage must be between 0 and 100');
      }
    }

    if (discount1Amount !== undefined) {
      if (typeof discount1Amount !== 'number') {
        errors.push('Discount 1 amount must be a number');
      } else if (discount1Amount < 0) {
        errors.push('Discount 1 amount cannot be negative');
      } else if (baseAmount && discount1Amount > baseAmount) {
        errors.push('Discount 1 amount cannot exceed base amount');
      }
    }

    // Validate discount2
    if (discount2Percent !== undefined) {
      if (typeof discount2Percent !== 'number') {
        errors.push('Discount 2 percentage must be a number');
      } else if (discount2Percent < 0 || discount2Percent > 100) {
        errors.push('Discount 2 percentage must be between 0 and 100');
      }
    }

    if (discount2Amount !== undefined) {
      if (typeof discount2Amount !== 'number') {
        errors.push('Discount 2 amount must be a number');
      } else if (discount2Amount < 0) {
        errors.push('Discount 2 amount cannot be negative');
      }
    }

    // Validate claim account for discount2
    const hasDiscount2 = (discount2Percent && discount2Percent > 0) || (discount2Amount && discount2Amount > 0);
    if (hasDiscount2 && !claimAccountId) {
      errors.push('Claim account is required when applying discount 2');
    }

    // Validate claim account ID format if provided
    if (claimAccountId) {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(claimAccountId)) {
        errors.push('Invalid claim account ID format');
      }
    }

    // Warn if claim account provided but no discount2
    if (claimAccountId && !hasDiscount2) {
      errors.push('Claim account provided but discount 2 is not applied');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate discount data with claim account verification
   * @param {Object} discountData - Discount data to validate
   * @returns {Promise<Object>} Validation result with claim account verification
   */
  async validateDiscountDataWithClaimAccount(discountData) {
    // First validate basic discount data
    const basicValidation = this.validateDiscountData(discountData);
    
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const errors = [];
    const { discount2Percent, discount2Amount, claimAccountId } = discountData;

    // If discount2 is applied, validate claim account exists and is active
    const hasDiscount2 = (discount2Percent && discount2Percent > 0) || (discount2Amount && discount2Amount > 0);
    if (hasDiscount2 && claimAccountId) {
      try {
        await this.validateClaimAccountForDiscount2(claimAccountId);
      } catch (error) {
        errors.push(error.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate claim account for discount2
   * @param {string} claimAccountId - Claim account ID
   * @returns {Promise<Object>} Validated account
   */
  async validateClaimAccountForDiscount2(claimAccountId) {
    if (!claimAccountId) {
      throw new Error('Claim account ID is required for discount 2');
    }

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(claimAccountId)) {
      throw new Error('Invalid claim account ID format');
    }

    const Account = require('../models/Account');
    const account = await Account.findById(claimAccountId);

    if (!account) {
      throw new Error('Claim account not found');
    }

    if (!account.isActive) {
      throw new Error(`Claim account '${account.name}' is not active`);
    }

    if (!account.canBeUsedForClaims()) {
      throw new Error(`Account '${account.name}' cannot be used for discount claims. Must be adjustment, claim, or expense type.`);
    }

    return account;
  }

  /**
   * Get all available claim accounts
   * @returns {Promise<Array>} List of claim accounts
   */
  async getAvailableClaimAccounts() {
    const Account = require('../models/Account');
    return await Account.getClaimAccounts();
  }

  /**
   * Validate claim account exists and is active
   * @param {string} claimAccountId - Claim account ID
   * @returns {Promise<boolean>} True if valid
   */
  async isValidClaimAccount(claimAccountId) {
    try {
      await this.validateClaimAccountForDiscount2(claimAccountId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Apply discounts with claim account validation
   * @param {number} baseAmount - Base amount before discounts
   * @param {number} discount1Percent - First discount percentage
   * @param {number} discount2Percent - Second discount percentage
   * @param {string} claimAccountId - Claim account ID (required for discount2)
   * @returns {Promise<Object>} Complete discount breakdown with validation
   */
  async applySequentialDiscountsWithValidation(baseAmount, discount1Percent = 0, discount2Percent = 0, claimAccountId = null) {
    // Validate claim account if discount2 is applied
    let validatedClaimAccount = null;
    if (discount2Percent > 0) {
      validatedClaimAccount = await this.validateClaimAccountForDiscount2(claimAccountId);
    }

    // Apply discounts
    const discountResult = this.applySequentialDiscounts(baseAmount, discount1Percent, discount2Percent, claimAccountId);

    return {
      ...discountResult,
      claimAccount: validatedClaimAccount ? {
        id: validatedClaimAccount._id,
        name: validatedClaimAccount.name,
        code: validatedClaimAccount.code,
        accountType: validatedClaimAccount.accountType
      } : null
    };
  }

  /**
   * Calculate invoice item discount breakdown
   * @param {Object} item - Invoice item
   * @returns {Object} Discount breakdown
   */
  calculateItemDiscounts(item) {
    const {
      quantity,
      unitPrice,
      boxQuantity,
      boxRate,
      unitQuantity,
      unitRate,
      discount1Percent = 0,
      discount2Percent = 0
    } = item;

    // Calculate base amount
    let baseAmount;
    if ((boxQuantity && boxQuantity > 0) || (unitQuantity && unitQuantity > 0)) {
      baseAmount = (boxQuantity || 0) * (boxRate || 0) + (unitQuantity || 0) * (unitRate || 0);
    } else {
      baseAmount = quantity * unitPrice;
    }

    // Apply sequential discounts
    const discounts = this.applySequentialDiscounts(
      baseAmount,
      discount1Percent,
      discount2Percent
    );

    return {
      baseAmount,
      discount1Amount: discounts.discount1.amount,
      discount2Amount: discounts.discount2.amount,
      totalDiscountAmount: discounts.totalDiscount.amount,
      amountAfterDiscounts: discounts.finalAmount
    };
  }
}

module.exports = new DiscountCalculationService();
