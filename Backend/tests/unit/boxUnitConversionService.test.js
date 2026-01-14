const boxUnitConversionService = require('../../src/services/boxUnitConversionService');

/**
 * Unit Tests for Box/Unit Conversion Service
 * Tests for Requirement 12 - Tasks 45.2, 45.3
 */
describe('Box/Unit Conversion Service', () => {
  describe('convertBoxToUnits', () => {
    it('should convert boxes to units correctly', () => {
      const result = boxUnitConversionService.convertBoxToUnits(5, 12);
      expect(result).toBe(60); // 5 boxes * 12 units/box
    });

    it('should handle zero boxes', () => {
      const result = boxUnitConversionService.convertBoxToUnits(0, 12);
      expect(result).toBe(0);
    });

    it('should throw error for negative box quantity', () => {
      expect(() => {
        boxUnitConversionService.convertBoxToUnits(-5, 12);
      }).toThrow('Box quantity cannot be negative');
    });

    it('should throw error for zero pack size', () => {
      expect(() => {
        boxUnitConversionService.convertBoxToUnits(5, 0);
      }).toThrow('Pack size must be greater than 0');
    });

    it('should throw error for negative pack size', () => {
      expect(() => {
        boxUnitConversionService.convertBoxToUnits(5, -12);
      }).toThrow('Pack size must be greater than 0');
    });
  });

  describe('calculateTotalUnits', () => {
    it('should calculate total units from boxes and loose units', () => {
      const result = boxUnitConversionService.calculateTotalUnits(5, 3, 12);
      expect(result).toBe(63); // (5 * 12) + 3
    });

    it('should handle only boxes', () => {
      const result = boxUnitConversionService.calculateTotalUnits(5, 0, 12);
      expect(result).toBe(60);
    });

    it('should handle only units', () => {
      const result = boxUnitConversionService.calculateTotalUnits(0, 15, 12);
      expect(result).toBe(15);
    });

    it('should handle default parameters', () => {
      const result = boxUnitConversionService.calculateTotalUnits();
      expect(result).toBe(0);
    });

    it('should throw error for negative quantities', () => {
      expect(() => {
        boxUnitConversionService.calculateTotalUnits(-5, 3, 12);
      }).toThrow('Quantities cannot be negative');

      expect(() => {
        boxUnitConversionService.calculateTotalUnits(5, -3, 12);
      }).toThrow('Quantities cannot be negative');
    });
  });

  describe('convertUnitsToBoxes', () => {
    it('should convert units to boxes and remaining units', () => {
      const result = boxUnitConversionService.convertUnitsToBoxes(63, 12);
      expect(result.boxes).toBe(5);
      expect(result.remainingUnits).toBe(3);
      expect(result.totalUnits).toBe(63);
    });

    it('should handle exact box conversion', () => {
      const result = boxUnitConversionService.convertUnitsToBoxes(60, 12);
      expect(result.boxes).toBe(5);
      expect(result.remainingUnits).toBe(0);
    });

    it('should handle less than one box', () => {
      const result = boxUnitConversionService.convertUnitsToBoxes(8, 12);
      expect(result.boxes).toBe(0);
      expect(result.remainingUnits).toBe(8);
    });

    it('should handle zero units', () => {
      const result = boxUnitConversionService.convertUnitsToBoxes(0, 12);
      expect(result.boxes).toBe(0);
      expect(result.remainingUnits).toBe(0);
    });

    it('should throw error for negative units', () => {
      expect(() => {
        boxUnitConversionService.convertUnitsToBoxes(-10, 12);
      }).toThrow('Total units cannot be negative');
    });
  });

  describe('calculateLineTotal', () => {
    it('should calculate line total with both boxes and units', () => {
      const result = boxUnitConversionService.calculateLineTotal(5, 1200, 3, 110);
      expect(result).toBe(6330); // (5 * 1200) + (3 * 110)
    });

    it('should calculate line total with only boxes', () => {
      const result = boxUnitConversionService.calculateLineTotal(5, 1200, 0, 0);
      expect(result).toBe(6000);
    });

    it('should calculate line total with only units', () => {
      const result = boxUnitConversionService.calculateLineTotal(0, 0, 15, 110);
      expect(result).toBe(1650);
    });

    it('should handle default parameters', () => {
      const result = boxUnitConversionService.calculateLineTotal();
      expect(result).toBe(0);
    });

    it('should throw error for negative quantities', () => {
      expect(() => {
        boxUnitConversionService.calculateLineTotal(-5, 1200, 3, 110);
      }).toThrow('Quantities cannot be negative');
    });

    it('should throw error for negative rates', () => {
      expect(() => {
        boxUnitConversionService.calculateLineTotal(5, -1200, 3, 110);
      }).toThrow('Rates cannot be negative');
    });
  });

  describe('calculateEffectiveUnitRate', () => {
    it('should calculate effective rate per unit', () => {
      const result = boxUnitConversionService.calculateEffectiveUnitRate(5, 1200, 3, 110, 12);
      // Total: (5 * 1200) + (3 * 110) = 6330
      // Units: (5 * 12) + 3 = 63
      // Rate: 6330 / 63 = 100.476...
      expect(result).toBeCloseTo(100.476, 2);
    });

    it('should handle only boxes', () => {
      const result = boxUnitConversionService.calculateEffectiveUnitRate(5, 1200, 0, 0, 12);
      // Total: 6000, Units: 60, Rate: 100
      expect(result).toBe(100);
    });

    it('should return 0 for zero quantities', () => {
      const result = boxUnitConversionService.calculateEffectiveUnitRate(0, 1200, 0, 110, 12);
      expect(result).toBe(0);
    });
  });

  describe('validateBoxUnitData', () => {
    it('should validate correct box/unit data', () => {
      const result = boxUnitConversionService.validateBoxUnitData({
        boxQty: 5,
        boxRate: 1200,
        unitQty: 3,
        unitRate: 110,
        packSize: 12,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require at least one quantity', () => {
      const result = boxUnitConversionService.validateBoxUnitData({
        boxQty: 0,
        unitQty: 0,
        packSize: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'At least one of box quantity or unit quantity must be greater than 0'
      );
    });

    it('should require box rate when box quantity is provided', () => {
      const result = boxUnitConversionService.validateBoxUnitData({
        boxQty: 5,
        boxRate: 0,
        packSize: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Box rate is required when box quantity is provided');
    });

    it('should require unit rate when unit quantity is provided', () => {
      const result = boxUnitConversionService.validateBoxUnitData({
        unitQty: 3,
        unitRate: 0,
        packSize: 12,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unit rate is required when unit quantity is provided');
    });

    it('should validate pack size', () => {
      const result = boxUnitConversionService.validateBoxUnitData({
        boxQty: 5,
        boxRate: 1200,
        packSize: -12,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pack size must be greater than 0');
    });
  });

  describe('calculateCartonQty', () => {
    it('should calculate carton quantity from boxes', () => {
      const result = boxUnitConversionService.calculateCartonQty(25, 10);
      expect(result).toBe(3); // 25 boxes / 10 boxes per carton = 3 cartons (rounded up)
    });

    it('should handle exact carton conversion', () => {
      const result = boxUnitConversionService.calculateCartonQty(30, 10);
      expect(result).toBe(3);
    });

    it('should default to 1 box per carton', () => {
      const result = boxUnitConversionService.calculateCartonQty(5);
      expect(result).toBe(5);
    });

    it('should throw error for negative box quantity', () => {
      expect(() => {
        boxUnitConversionService.calculateCartonQty(-5, 10);
      }).toThrow('Box quantity cannot be negative');
    });
  });

  describe('formatBoxUnitDisplay', () => {
    it('should format both boxes and units', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(5, 3);
      expect(result).toBe('5 Boxes + 3 Units');
    });

    it('should format only boxes', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(5, 0);
      expect(result).toBe('5 Boxes');
    });

    it('should format only units', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(0, 3);
      expect(result).toBe('3 Units');
    });

    it('should handle singular box', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(1, 0);
      expect(result).toBe('1 Box');
    });

    it('should handle singular unit', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(0, 1);
      expect(result).toBe('1 Unit');
    });

    it('should handle zero quantities', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(0, 0);
      expect(result).toBe('0');
    });

    it('should support custom labels', () => {
      const result = boxUnitConversionService.formatBoxUnitDisplay(5, 3, 'Carton', 'Piece');
      expect(result).toBe('5 Cartons + 3 Pieces');
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate discount on box/unit pricing', () => {
      const result = boxUnitConversionService.calculateDiscount(5, 1200, 3, 110, 10);
      // Subtotal: 6330, Discount: 633, Total: 5697
      expect(result.subtotal).toBe(6330);
      expect(result.discountPercent).toBe(10);
      expect(result.discountAmount).toBe(633);
      expect(result.totalAfterDiscount).toBe(5697);
    });

    it('should handle zero discount', () => {
      const result = boxUnitConversionService.calculateDiscount(5, 1200, 3, 110, 0);
      expect(result.subtotal).toBe(6330);
      expect(result.discountAmount).toBe(0);
      expect(result.totalAfterDiscount).toBe(6330);
    });

    it('should handle 100% discount', () => {
      const result = boxUnitConversionService.calculateDiscount(5, 1200, 3, 110, 100);
      expect(result.discountAmount).toBe(6330);
      expect(result.totalAfterDiscount).toBe(0);
    });
  });
});
