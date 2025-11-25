/**
 * Box/Unit Conversion Service
 * Phase 2 - Requirement 12: Dual Unit System
 * Tasks 45.2, 45.3: Box/Unit conversion and dual rate calculation
 */
class BoxUnitConversionService {
  /**
   * Convert box quantity to units
   * @param {number} boxQty - Number of boxes
   * @param {number} packSize - Units per box
   * @returns {number} Total units
   */
  convertBoxToUnits(boxQty, packSize) {
    if (boxQty < 0) {
      throw new Error('Box quantity cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than 0');
    }
    return boxQty * packSize;
  }

  /**
   * Calculate total units from box and unit quantities
   * @param {number} boxQty - Number of boxes
   * @param {number} unitQty - Number of loose units
   * @param {number} packSize - Units per box
   * @returns {number} Total units
   */
  calculateTotalUnits(boxQty = 0, unitQty = 0, packSize = 1) {
    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Quantities cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than 0');
    }

    const unitsFromBoxes = this.convertBoxToUnits(boxQty, packSize);
    return unitsFromBoxes + unitQty;
  }

  /**
   * Convert total units to boxes and remaining units
   * @param {number} totalUnits - Total number of units
   * @param {number} packSize - Units per box
   * @returns {Object} { boxes, remainingUnits }
   */
  convertUnitsToBoxes(totalUnits, packSize) {
    if (totalUnits < 0) {
      throw new Error('Total units cannot be negative');
    }
    if (packSize <= 0) {
      throw new Error('Pack size must be greater than 0');
    }

    const boxes = Math.floor(totalUnits / packSize);
    const remainingUnits = totalUnits % packSize;

    return {
      boxes,
      remainingUnits,
      totalUnits,
    };
  }

  /**
   * Calculate line total with dual rates (box rate and unit rate)
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Price per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Price per unit
   * @returns {number} Total line amount
   */
  calculateLineTotal(boxQty = 0, boxRate = 0, unitQty = 0, unitRate = 0) {
    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Quantities cannot be negative');
    }
    if (boxRate < 0 || unitRate < 0) {
      throw new Error('Rates cannot be negative');
    }

    const boxTotal = boxQty * boxRate;
    const unitTotal = unitQty * unitRate;

    return boxTotal + unitTotal;
  }

  /**
   * Calculate effective rate per unit when using box/unit pricing
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Price per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Price per unit
   * @param {number} packSize - Units per box
   * @returns {number} Effective rate per unit
   */
  calculateEffectiveUnitRate(boxQty, boxRate, unitQty, unitRate, packSize) {
    const totalAmount = this.calculateLineTotal(boxQty, boxRate, unitQty, unitRate);
    const totalUnits = this.calculateTotalUnits(boxQty, unitQty, packSize);

    if (totalUnits === 0) {
      return 0;
    }

    return totalAmount / totalUnits;
  }

  /**
   * Validate box/unit quantities and rates
   * @param {Object} data - Box/unit data
   * @returns {Object} Validation result
   */
  validateBoxUnitData(data) {
    const { boxQty, unitQty, boxRate, unitRate, packSize } = data;
    const errors = [];

    // At least one quantity must be provided
    if ((!boxQty || boxQty === 0) && (!unitQty || unitQty === 0)) {
      errors.push('At least one of box quantity or unit quantity must be greater than 0');
    }

    // If box quantity is provided, box rate must be provided
    if (boxQty && boxQty > 0 && (!boxRate || boxRate === 0)) {
      errors.push('Box rate is required when box quantity is provided');
    }

    // If unit quantity is provided, unit rate must be provided
    if (unitQty && unitQty > 0 && (!unitRate || unitRate === 0)) {
      errors.push('Unit rate is required when unit quantity is provided');
    }

    // Pack size validation
    if (packSize && packSize <= 0) {
      errors.push('Pack size must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate carton quantity from box quantity
   * Carton is typically a larger unit containing multiple boxes
   * @param {number} boxQty - Number of boxes
   * @param {number} boxesPerCarton - Boxes per carton (default 1)
   * @returns {number} Number of cartons
   */
  calculateCartonQty(boxQty, boxesPerCarton = 1) {
    if (boxQty < 0) {
      throw new Error('Box quantity cannot be negative');
    }
    if (boxesPerCarton <= 0) {
      throw new Error('Boxes per carton must be greater than 0');
    }

    return Math.ceil(boxQty / boxesPerCarton);
  }

  /**
   * Format box/unit display string
   * @param {number} boxQty - Number of boxes
   * @param {number} unitQty - Number of loose units
   * @param {string} boxLabel - Label for box (default 'Box')
   * @param {string} unitLabel - Label for unit (default 'Unit')
   * @returns {string} Formatted string
   */
  formatBoxUnitDisplay(boxQty, unitQty, boxLabel = 'Box', unitLabel = 'Unit') {
    const parts = [];

    if (boxQty && boxQty > 0) {
      parts.push(`${boxQty} ${boxLabel}${boxQty > 1 ? 'es' : ''}`);
    }

    if (unitQty && unitQty > 0) {
      parts.push(`${unitQty} ${unitLabel}${unitQty > 1 ? 's' : ''}`);
    }

    return parts.join(' + ') || '0';
  }

  /**
   * Calculate discount on box/unit pricing
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Price per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Price per unit
   * @param {number} discountPercent - Discount percentage
   * @returns {Object} Discount breakdown
   */
  calculateDiscount(boxQty, boxRate, unitQty, unitRate, discountPercent) {
    const subtotal = this.calculateLineTotal(boxQty, boxRate, unitQty, unitRate);
    const discountAmount = (subtotal * discountPercent) / 100;
    const totalAfterDiscount = subtotal - discountAmount;

    return {
      subtotal,
      discountPercent,
      discountAmount,
      totalAfterDiscount,
    };
  }
}

module.exports = new BoxUnitConversionService();
