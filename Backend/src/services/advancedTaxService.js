/**
 * Advanced Tax Service - Phase 2
 * Handles GST, advance tax, and non-filer GST calculations
 */
class AdvancedTaxService {
  /**
   * Calculate 18% GST
   * @param {number} amount - Taxable amount
   * @returns {Object} GST calculation details
   */
  calculateGST18(amount) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const gstRate = 18;
    const gstAmount = (amount * gstRate) / 100;

    return {
      taxableAmount: amount,
      gstRate,
      gstAmount,
      totalAmount: amount + gstAmount
    };
  }

  /**
   * Calculate 4% GST (for specific items)
   * @param {number} amount - Taxable amount
   * @returns {Object} GST calculation details
   */
  calculateGST4(amount) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const gstRate = 4;
    const gstAmount = (amount * gstRate) / 100;

    return {
      taxableAmount: amount,
      gstRate,
      gstAmount,
      totalAmount: amount + gstAmount
    };
  }

  /**
   * Calculate advance tax based on account registration
   * @param {number} amount - Taxable amount
   * @param {number} rate - Tax rate (0.5 or 2.5)
   * @returns {Object} Advance tax calculation details
   */
  calculateAdvanceTax(amount, rate) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (![0, 0.5, 2.5].includes(rate)) {
      throw new Error('Advance tax rate must be 0, 0.5, or 2.5');
    }

    const taxAmount = (amount * rate) / 100;

    return {
      taxableAmount: amount,
      taxRate: rate,
      taxAmount,
      totalAmount: amount + taxAmount
    };
  }

  /**
   * Calculate non-filer GST (additional 0.1%)
   * @param {number} amount - Taxable amount
   * @returns {Object} Non-filer GST calculation details
   */
  calculateNonFilerGST(amount) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const nonFilerRate = 0.1;
    const nonFilerAmount = (amount * nonFilerRate) / 100;

    return {
      taxableAmount: amount,
      nonFilerRate,
      nonFilerAmount,
      totalAmount: amount + nonFilerAmount
    };
  }

  /**
   * Calculate complete tax breakdown for an invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Object} Complete tax breakdown
   */
  calculateInvoiceTaxes(invoiceData) {
    const {
      subtotal,
      gstRate = 18,
      advanceTaxRate = 0,
      isNonFiler = false,
      items = []
    } = invoiceData;

    let gst18Total = 0;
    let gst4Total = 0;
    let advanceTaxTotal = 0;
    let nonFilerGSTTotal = 0;

    // Calculate GST based on rate
    if (gstRate === 18) {
      const gst18 = this.calculateGST18(subtotal);
      gst18Total = gst18.gstAmount;
    } else if (gstRate === 4) {
      const gst4 = this.calculateGST4(subtotal);
      gst4Total = gst4.gstAmount;
    }

    // Calculate advance tax if applicable
    if (advanceTaxRate > 0) {
      const advanceTax = this.calculateAdvanceTax(subtotal, advanceTaxRate);
      advanceTaxTotal = advanceTax.taxAmount;
    }

    // Calculate non-filer GST if applicable
    if (isNonFiler) {
      const nonFilerGST = this.calculateNonFilerGST(subtotal);
      nonFilerGSTTotal = nonFilerGST.nonFilerAmount;
    }

    const totalTax = gst18Total + gst4Total + advanceTaxTotal + nonFilerGSTTotal;
    const grandTotal = subtotal + totalTax;

    return {
      subtotal,
      taxes: {
        gst18Total,
        gst4Total,
        advanceTaxTotal,
        nonFilerGSTTotal,
        totalTax
      },
      grandTotal
    };
  }

  /**
   * Calculate item-level taxes
   * @param {Object} item - Invoice item
   * @param {Object} options - Tax options
   * @returns {Object} Item tax breakdown
   */
  calculateItemTaxes(item, options = {}) {
    const {
      quantity,
      unitPrice,
      boxQuantity,
      boxRate,
      unitQuantity,
      unitRate
    } = item;

    const {
      gstRate = 18,
      advanceTaxRate = 0,
      isNonFiler = false
    } = options;

    // Calculate base amount
    let baseAmount;
    if ((boxQuantity && boxQuantity > 0) || (unitQuantity && unitQuantity > 0)) {
      baseAmount = (boxQuantity || 0) * (boxRate || 0) + (unitQuantity || 0) * (unitRate || 0);
    } else {
      baseAmount = quantity * unitPrice;
    }

    // Calculate GST
    let gstAmount = 0;
    if (gstRate === 18) {
      gstAmount = (baseAmount * 18) / 100;
    } else if (gstRate === 4) {
      gstAmount = (baseAmount * 4) / 100;
    }

    // Calculate advance tax
    let advanceTaxAmount = 0;
    if (advanceTaxRate > 0) {
      advanceTaxAmount = (baseAmount * advanceTaxRate) / 100;
    }

    // Calculate non-filer GST
    let nonFilerGSTAmount = 0;
    if (isNonFiler) {
      nonFilerGSTAmount = (baseAmount * 0.1) / 100;
    }

    const totalTax = gstAmount + advanceTaxAmount + nonFilerGSTAmount;
    const lineTotal = baseAmount + totalTax;

    return {
      baseAmount,
      gstAmount,
      advanceTaxAmount,
      nonFilerGSTAmount,
      totalTax,
      lineTotal
    };
  }

  /**
   * Determine advance tax rate based on account type
   * @param {string} accountType - Account registration type
   * @returns {number} Advance tax rate
   */
  getAdvanceTaxRate(accountType) {
    const rates = {
      'registered': 0.5,
      'unregistered': 2.5,
      'exempt': 0
    };

    return rates[accountType] || 0;
  }

  /**
   * Validate tax data
   * @param {Object} taxData - Tax data to validate
   * @returns {Object} Validation result
   */
  validateTaxData(taxData) {
    const errors = [];
    const {
      gstRate,
      advanceTaxRate,
      taxableAmount
    } = taxData;

    if (gstRate !== undefined && ![0, 4, 18].includes(gstRate)) {
      errors.push('GST rate must be 0, 4, or 18');
    }

    if (advanceTaxRate !== undefined && ![0, 0.5, 2.5].includes(advanceTaxRate)) {
      errors.push('Advance tax rate must be 0, 0.5, or 2.5');
    }

    if (taxableAmount !== undefined && taxableAmount < 0) {
      errors.push('Taxable amount cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new AdvancedTaxService();
