/**
 * Quantity Calculation Service
 * Handles box/unit quantity calculations for invoices
 */
class QuantityCalculationService {
  /**
   * Calculate total units from box and unit quantities
   * @param {number} boxQty - Number of boxes
   * @param {number} unitQty - Number of loose units
   * @param {number} packSize - Units per box
   * @returns {number} Total units
   */
  calculateTotalUnits(boxQty = 0, unitQty = 0, packSize = 1) {
    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Box and unit quantities cannot be negative');
    }

    if (packSize <= 0) {
      throw new Error('Pack size must be greater than zero');
    }

    return (boxQty * packSize) + unitQty;
  }

  /**
   * Calculate line total from box and unit quantities with their rates
   * @param {number} boxQty - Number of boxes
   * @param {number} boxRate - Rate per box
   * @param {number} unitQty - Number of loose units
   * @param {number} unitRate - Rate per unit
   * @returns {number} Line total
   */
  calculateLineTotal(boxQty = 0, boxRate = 0, unitQty = 0, unitRate = 0) {
    if (boxQty < 0 || unitQty < 0) {
      throw new Error('Box and unit quantities cannot be negative');
    }

    if (boxRate < 0 || unitRate < 0) {
      throw new Error('Box and unit rates cannot be negative');
    }

    return (boxQty * boxRate) + (unitQty * unitRate);
  }

  /**
   * Calculate carton quantity from box quantity
   * @param {number} boxQty - Number of boxes
   * @param {number} boxesPerCarton - Boxes per carton
   * @returns {number} Number of cartons
   */
  calculateCartonQty(boxQty = 0, boxesPerCarton = 1) {
    if (boxQty < 0) {
      throw new Error('Box quantity cannot be negative');
    }

    if (boxesPerCarton <= 0) {
      throw new Error('Boxes per carton must be greater than zero');
    }

    return Math.ceil(boxQty / boxesPerCarton);
  }

  /**
   * Break down total units into boxes and units
   * @param {number} totalUnits - Total number of units
   * @param {number} packSize - Units per box
   * @returns {Object} Object with boxQty and unitQty
   */
  breakdownUnits(totalUnits, packSize = 1) {
    if (totalUnits < 0) {
      throw new Error('Total units cannot be negative');
    }

    if (packSize <= 0) {
      throw new Error('Pack size must be greater than zero');
    }

    const boxQty = Math.floor(totalUnits / packSize);
    const unitQty = totalUnits % packSize;

    return { boxQty, unitQty };
  }

  /**
   * Calculate unit rate from box rate
   * @param {number} boxRate - Rate per box
   * @param {number} packSize - Units per box
   * @returns {number} Rate per unit
   */
  calculateUnitRate(boxRate, packSize = 1) {
    if (boxRate < 0) {
      throw new Error('Box rate cannot be negative');
    }

    if (packSize <= 0) {
      throw new Error('Pack size must be greater than zero');
    }

    return boxRate / packSize;
  }

  /**
   * Calculate box rate from unit rate
   * @param {number} unitRate - Rate per unit
   * @param {number} packSize - Units per box
   * @returns {number} Rate per box
   */
  calculateBoxRate(unitRate, packSize = 1) {
    if (unitRate < 0) {
      throw new Error('Unit rate cannot be negative');
    }

    if (packSize <= 0) {
      throw new Error('Pack size must be greater than zero');
    }

    return unitRate * packSize;
  }

  /**
   * Validate box/unit quantities and rates
   * @param {Object} data - Quantity and rate data
   * @returns {Object} Validation result
   */
  validateBoxUnitData(data) {
    const errors = [];
    const { boxQty, unitQty, boxRate, unitRate, packSize } = data;

    if (boxQty !== undefined && boxQty < 0) {
      errors.push('Box quantity cannot be negative');
    }

    if (unitQty !== undefined && unitQty < 0) {
      errors.push('Unit quantity cannot be negative');
    }

    if (boxRate !== undefined && boxRate < 0) {
      errors.push('Box rate cannot be negative');
    }

    if (unitRate !== undefined && unitRate < 0) {
      errors.push('Unit rate cannot be negative');
    }

    if (packSize !== undefined && packSize <= 0) {
      errors.push('Pack size must be greater than zero');
    }

    // Check if at least one quantity is provided
    if ((boxQty === undefined || boxQty === 0) && (unitQty === undefined || unitQty === 0)) {
      errors.push('At least one of box quantity or unit quantity must be greater than zero');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new QuantityCalculationService();
