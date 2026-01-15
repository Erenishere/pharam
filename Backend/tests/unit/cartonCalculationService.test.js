const cartonCalculationService = require('../../src/services/cartonCalculationService');

/**
 * Unit Tests for Carton Calculation Service
 * Phase 2 - Requirement 28: Automatic Carton Quantity Calculation
 * Task 72.1: Add carton calculation logic
 */
describe('CartonCalculationService - Task 72.1 (Requirement 28.1, 28.2)', () => {
    describe('calculateCartonQty', () => {
        it('should calculate carton quantity correctly with default boxes per carton', () => {
            // 12 boxes = 1 carton (default)
            expect(cartonCalculationService.calculateCartonQty(12)).toBe(1);

            // 24 boxes = 2 cartons
            expect(cartonCalculationService.calculateCartonQty(24)).toBe(2);

            // 13 boxes = 2 cartons (rounded up)
            expect(cartonCalculationService.calculateCartonQty(13)).toBe(2);
        });

        it('should calculate carton quantity with custom boxes per carton', () => {
            // 10 boxes with 5 boxes per carton = 2 cartons
            expect(cartonCalculationService.calculateCartonQty(10, 5)).toBe(2);

            // 11 boxes with 5 boxes per carton = 3 cartons (rounded up)
            expect(cartonCalculationService.calculateCartonQty(11, 5)).toBe(3);

            // 20 boxes with 10 boxes per carton = 2 cartons
            expect(cartonCalculationService.calculateCartonQty(20, 10)).toBe(2);
        });

        it('should return 0 for 0 boxes', () => {
            expect(cartonCalculationService.calculateCartonQty(0)).toBe(0);
            expect(cartonCalculationService.calculateCartonQty(0, 5)).toBe(0);
        });

        it('should round up partial cartons', () => {
            // 1 box with 12 boxes per carton = 1 carton (rounded up)
            expect(cartonCalculationService.calculateCartonQty(1, 12)).toBe(1);

            // 7 boxes with 12 boxes per carton = 1 carton (rounded up)
            expect(cartonCalculationService.calculateCartonQty(7, 12)).toBe(1);

            // 13 boxes with 12 boxes per carton = 2 cartons (rounded up)
            expect(cartonCalculationService.calculateCartonQty(13, 12)).toBe(2);
        });

        it('should throw error for negative box quantity', () => {
            expect(() => {
                cartonCalculationService.calculateCartonQty(-1);
            }).toThrow('Box quantity cannot be negative');

            expect(() => {
                cartonCalculationService.calculateCartonQty(-10, 5);
            }).toThrow('Box quantity cannot be negative');
        });

        it('should throw error for invalid boxes per carton', () => {
            expect(() => {
                cartonCalculationService.calculateCartonQty(10, 0);
            }).toThrow('Boxes per carton must be greater than zero');

            expect(() => {
                cartonCalculationService.calculateCartonQty(10, -5);
            }).toThrow('Boxes per carton must be greater than zero');
        });

        it('should handle decimal box quantities', () => {
            // 12.5 boxes with 12 boxes per carton = 2 cartons (rounded up)
            expect(cartonCalculationService.calculateCartonQty(12.5, 12)).toBe(2);

            // 5.3 boxes with 5 boxes per carton = 2 cartons (rounded up)
            expect(cartonCalculationService.calculateCartonQty(5.3, 5)).toBe(2);
        });
    });

    describe('calculateInvoiceCartonQty', () => {
        it('should calculate total carton quantity for invoice', () => {
            const invoice = {
                items: [
                    { boxQuantity: 12 },
                    { boxQuantity: 12 },
                    { boxQuantity: 6 },
                ],
            };

            // Total: 30 boxes / 12 = 3 cartons (rounded up)
            expect(cartonCalculationService.calculateInvoiceCartonQty(invoice)).toBe(3);
        });

        it('should handle invoice with no box quantities', () => {
            const invoice = {
                items: [
                    { unitQuantity: 10 },
                    { unitQuantity: 5 },
                ],
            };

            expect(cartonCalculationService.calculateInvoiceCartonQty(invoice)).toBe(0);
        });

        it('should handle mixed items with and without box quantities', () => {
            const invoice = {
                items: [
                    { boxQuantity: 12 },
                    { unitQuantity: 10 },
                    { boxQuantity: 6 },
                ],
            };

            // Total: 18 boxes / 12 = 2 cartons (rounded up)
            expect(cartonCalculationService.calculateInvoiceCartonQty(invoice)).toBe(2);
        });

        it('should handle invoice with custom boxes per carton', () => {
            const invoice = {
                items: [
                    { boxQuantity: 10 },
                    { boxQuantity: 5 },
                ],
            };

            // Total: 15 boxes / 5 = 3 cartons
            expect(cartonCalculationService.calculateInvoiceCartonQty(invoice, 5)).toBe(3);
        });

        it('should throw error for invalid invoice', () => {
            expect(() => {
                cartonCalculationService.calculateInvoiceCartonQty(null);
            }).toThrow('Invalid invoice object');

            expect(() => {
                cartonCalculationService.calculateInvoiceCartonQty({});
            }).toThrow('Invalid invoice object');

            expect(() => {
                cartonCalculationService.calculateInvoiceCartonQty({ items: 'not an array' });
            }).toThrow('Invalid invoice object');
        });

        it('should handle empty invoice items array', () => {
            const invoice = { items: [] };
            expect(cartonCalculationService.calculateInvoiceCartonQty(invoice)).toBe(0);
        });
    });

    describe('calculateItemCartonQty', () => {
        it('should calculate carton quantity for a single item', () => {
            const item = { boxQuantity: 12 };
            expect(cartonCalculationService.calculateItemCartonQty(item)).toBe(1);
        });

        it('should handle item with no box quantity', () => {
            const item = { unitQuantity: 10 };
            expect(cartonCalculationService.calculateItemCartonQty(item)).toBe(0);
        });

        it('should handle item with custom boxes per carton', () => {
            const item = { boxQuantity: 15 };
            // 15 boxes / 5 = 3 cartons
            expect(cartonCalculationService.calculateItemCartonQty(item, 5)).toBe(3);
        });

        it('should throw error for invalid item', () => {
            expect(() => {
                cartonCalculationService.calculateItemCartonQty(null);
            }).toThrow('Invalid item object');
        });
    });

    describe('calculateAllCartonQuantities', () => {
        it('should calculate carton quantities for all items', () => {
            const invoice = {
                items: [
                    { itemId: 'item1', boxQuantity: 12 },
                    { itemId: 'item2', boxQuantity: 6 },
                    { itemId: 'item3', boxQuantity: 18 },
                ],
            };

            const result = cartonCalculationService.calculateAllCartonQuantities(invoice);

            expect(result.itemCartons).toHaveLength(3);
            expect(result.itemCartons[0].cartonQty).toBe(1); // 12 / 12 = 1
            expect(result.itemCartons[1].cartonQty).toBe(1); // 6 / 12 = 1 (rounded up)
            expect(result.itemCartons[2].cartonQty).toBe(2); // 18 / 12 = 2 (rounded up)
            expect(result.totalCartons).toBe(4); // 1 + 1 + 2 = 4
            expect(result.boxesPerCarton).toBe(12);
        });

        it('should handle custom boxes per carton', () => {
            const invoice = {
                items: [
                    { itemId: 'item1', boxQuantity: 10 },
                    { itemId: 'item2', boxQuantity: 5 },
                ],
            };

            const result = cartonCalculationService.calculateAllCartonQuantities(invoice, 5);

            expect(result.itemCartons[0].cartonQty).toBe(2); // 10 / 5 = 2
            expect(result.itemCartons[1].cartonQty).toBe(1); // 5 / 5 = 1
            expect(result.totalCartons).toBe(3);
            expect(result.boxesPerCarton).toBe(5);
        });

        it('should throw error for invalid invoice', () => {
            expect(() => {
                cartonCalculationService.calculateAllCartonQuantities(null);
            }).toThrow('Invalid invoice object');
        });
    });

    describe('formatCartonBoxUnitDisplay', () => {
        it('should format display with all quantities', () => {
            const result = cartonCalculationService.formatCartonBoxUnitDisplay(2, 5, 10);
            expect(result).toBe('2 Cartons + 5 Boxes + 10 Units');
        });

        it('should format display with only cartons', () => {
            const result = cartonCalculationService.formatCartonBoxUnitDisplay(3, 0, 0);
            expect(result).toBe('3 Cartons');
        });

        it('should format display with only boxes', () => {
            const result = cartonCalculationService.formatCartonBoxUnitDisplay(0, 7, 0);
            expect(result).toBe('7 Boxes');
        });

        it('should format display with only units', () => {
            const result = cartonCalculationService.formatCartonBoxUnitDisplay(0, 0, 15);
            expect(result).toBe('15 Units');
        });

        it('should handle singular forms', () => {
            const result = cartonCalculationService.formatCartonBoxUnitDisplay(1, 1, 1);
            expect(result).toBe('1 Carton + 1 Box + 1 Unit');
        });

        it('should return 0 for all zero quantities', () => {
            const result = cartonCalculationService.formatCartonBoxUnitDisplay(0, 0, 0);
            expect(result).toBe('0');
        });
    });

    describe('getDefaultBoxesPerCarton', () => {
        it('should return default boxes per carton', () => {
            const defaultValue = cartonCalculationService.getDefaultBoxesPerCarton();
            expect(defaultValue).toBe(12);
            expect(typeof defaultValue).toBe('number');
        });
    });

    describe('validateCartonData', () => {
        it('should validate correct data', () => {
            const result = cartonCalculationService.validateCartonData({
                boxQty: 10,
                boxesPerCarton: 5,
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect negative box quantity', () => {
            const result = cartonCalculationService.validateCartonData({
                boxQty: -5,
                boxesPerCarton: 5,
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Box quantity cannot be negative');
        });

        it('should detect invalid boxes per carton', () => {
            const result = cartonCalculationService.validateCartonData({
                boxQty: 10,
                boxesPerCarton: 0,
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Boxes per carton must be greater than zero');
        });

        it('should detect multiple errors', () => {
            const result = cartonCalculationService.validateCartonData({
                boxQty: -10,
                boxesPerCarton: -5,
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
        });

        it('should allow undefined values', () => {
            const result = cartonCalculationService.validateCartonData({});
            expect(result.valid).toBe(true);
        });
    });
});
