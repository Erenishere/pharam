/**
 * Carton Calculation Service
 * Phase 2 - Requirement 28: Automatic Carton Quantity Calculation
 * Task 72.1: Add carton calculation logic
 */

const config = require('../config/carton');

class CartonCalculationService {
    /**
     * Calculate carton quantity from box quantity
     * @param {number} boxQty - Number of boxes
     * @param {number} boxesPerCarton - Boxes per carton (optional, uses default if not provided)
     * @returns {number} Number of cartons (rounded up)
     */
    calculateCartonQty(boxQty = 0, boxesPerCarton = null) {
        // Validate inputs
        if (boxQty < 0) {
            throw new Error('Box quantity cannot be negative');
        }

        // Use provided boxesPerCarton or fall back to default
        // Check for null/undefined explicitly to allow 0 to be validated
        const divisor = boxesPerCarton !== null && boxesPerCarton !== undefined
            ? boxesPerCarton
            : config.defaultBoxesPerCarton;

        if (divisor <= 0) {
            throw new Error('Boxes per carton must be greater than zero');
        }

        // Return 0 if no boxes
        if (boxQty === 0) {
            return 0;
        }

        // Round up to get full cartons
        return Math.ceil(boxQty / divisor);
    }

    /**
     * Calculate total carton quantity for an invoice
     * @param {Object} invoice - Invoice object with items array
     * @param {number} boxesPerCarton - Boxes per carton (optional)
     * @returns {number} Total carton quantity for the invoice
     */
    calculateInvoiceCartonQty(invoice, boxesPerCarton = null) {
        if (!invoice || !invoice.items || !Array.isArray(invoice.items)) {
            throw new Error('Invalid invoice object');
        }

        let totalBoxes = 0;

        // Sum up all box quantities from invoice items
        invoice.items.forEach((item) => {
            if (item.boxQuantity && item.boxQuantity > 0) {
                totalBoxes += item.boxQuantity;
            }
        });

        // Calculate cartons from total boxes
        return this.calculateCartonQty(totalBoxes, boxesPerCarton);
    }

    /**
     * Calculate carton quantity for a single invoice item
     * @param {Object} item - Invoice item with boxQuantity
     * @param {number} boxesPerCarton - Boxes per carton (optional)
     * @returns {number} Carton quantity for the item
     */
    calculateItemCartonQty(item, boxesPerCarton = null) {
        if (!item) {
            throw new Error('Invalid item object');
        }

        const boxQty = item.boxQuantity || 0;
        return this.calculateCartonQty(boxQty, boxesPerCarton);
    }

    /**
     * Calculate carton quantities for all items in an invoice
     * Updates each item with its carton quantity
     * @param {Object} invoice - Invoice object with items array
     * @param {number} boxesPerCarton - Boxes per carton (optional)
     * @returns {Object} Object with item carton quantities and total
     */
    calculateAllCartonQuantities(invoice, boxesPerCarton = null) {
        if (!invoice || !invoice.items || !Array.isArray(invoice.items)) {
            throw new Error('Invalid invoice object');
        }

        const itemCartons = [];
        let totalCartons = 0;

        invoice.items.forEach((item, index) => {
            const cartonQty = this.calculateItemCartonQty(item, boxesPerCarton);
            itemCartons.push({
                index,
                itemId: item.itemId,
                boxQuantity: item.boxQuantity || 0,
                cartonQty,
            });
            totalCartons += cartonQty;
        });

        return {
            itemCartons,
            totalCartons,
            boxesPerCarton: boxesPerCarton || config.defaultBoxesPerCarton,
        };
    }

    /**
     * Format carton/box/unit display string
     * @param {number} cartonQty - Number of cartons
     * @param {number} boxQty - Number of boxes
     * @param {number} unitQty - Number of units
     * @returns {string} Formatted display string
     */
    formatCartonBoxUnitDisplay(cartonQty = 0, boxQty = 0, unitQty = 0) {
        const parts = [];

        if (cartonQty && cartonQty > 0) {
            parts.push(`${cartonQty} Carton${cartonQty > 1 ? 's' : ''}`);
        }

        if (boxQty && boxQty > 0) {
            parts.push(`${boxQty} Box${boxQty > 1 ? 'es' : ''}`);
        }

        if (unitQty && unitQty > 0) {
            parts.push(`${unitQty} Unit${unitQty > 1 ? 's' : ''}`);
        }

        return parts.join(' + ') || '0';
    }

    /**
     * Get default boxes per carton configuration
     * @returns {number} Default boxes per carton
     */
    getDefaultBoxesPerCarton() {
        return config.defaultBoxesPerCarton;
    }

    /**
     * Validate carton calculation data
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result
     */
    validateCartonData(data) {
        const errors = [];
        const { boxQty, boxesPerCarton } = data;

        if (boxQty !== undefined && boxQty < 0) {
            errors.push('Box quantity cannot be negative');
        }

        if (boxesPerCarton !== undefined && boxesPerCarton <= 0) {
            errors.push('Boxes per carton must be greater than zero');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

module.exports = new CartonCalculationService();
