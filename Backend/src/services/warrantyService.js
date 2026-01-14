/**
 * Warranty Service
 * Phase 2 - Requirement 32: Warranty Information Management
 * Task 76: Implement warranty management
 */

class WarrantyService {
    /**
     * Validate warranty fields
     * Task 76.1, 76.2
     * @param {Object} warrantyData - Warranty data to validate
     * @param {string} warrantyData.warrantyInfo - Warranty information text
     * @param {boolean} warrantyData.warrantyPaste - Whether to include warranty on print
     * @param {Array} warrantyData.items - Invoice items with warranty details
     * @returns {Object} Validation result
     */
    validateWarrantyFields(warrantyData) {
        const errors = [];

        // Validate warrantyInfo if provided
        if (warrantyData.warrantyInfo) {
            if (typeof warrantyData.warrantyInfo !== 'string') {
                errors.push('Warranty info must be a string');
            } else if (warrantyData.warrantyInfo.length > 500) {
                errors.push('Warranty info cannot exceed 500 characters');
            }
        }

        // Validate warrantyPaste
        if (warrantyData.warrantyPaste !== undefined && typeof warrantyData.warrantyPaste !== 'boolean') {
            errors.push('Warranty paste must be a boolean');
        }

        // Validate item-level warranty fields
        if (warrantyData.items && Array.isArray(warrantyData.items)) {
            warrantyData.items.forEach((item, index) => {
                if (item.warrantyMonths !== undefined) {
                    if (typeof item.warrantyMonths !== 'number') {
                        errors.push(`Item ${index + 1}: Warranty months must be a number`);
                    } else if (item.warrantyMonths < 0) {
                        errors.push(`Item ${index + 1}: Warranty months cannot be negative`);
                    } else if (!Number.isInteger(item.warrantyMonths)) {
                        errors.push(`Item ${index + 1}: Warranty months must be a whole number`);
                    }
                }

                if (item.warrantyDetails) {
                    if (typeof item.warrantyDetails !== 'string') {
                        errors.push(`Item ${index + 1}: Warranty details must be a string`);
                    } else if (item.warrantyDetails.length > 200) {
                        errors.push(`Item ${index + 1}: Warranty details cannot exceed 200 characters`);
                    }
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Apply default warranty from item to invoice item
     * Task 76.5
     * @param {Object} item - Item model instance
     * @param {Object} invoiceItem - Invoice item to apply warranty to
     * @returns {Object} Invoice item with warranty applied
     */
    async applyDefaultWarranty(item, invoiceItem) {
        if (!item) {
            return invoiceItem;
        }

        // Only apply default warranty if not already set
        if (invoiceItem.warrantyMonths === undefined || invoiceItem.warrantyMonths === 0) {
            invoiceItem.warrantyMonths = item.defaultWarrantyMonths || 0;
        }

        if (!invoiceItem.warrantyDetails && item.defaultWarrantyDetails) {
            invoiceItem.warrantyDetails = item.defaultWarrantyDetails;
        }

        return invoiceItem;
    }

    /**
     * Format warranty information for display/print
     * Task 76.3, 76.4
     * @param {Object} warrantyData - Warranty data
     * @param {string} warrantyData.warrantyInfo - Invoice-level warranty info
     * @param {Array} warrantyData.items - Items with warranty details
     * @returns {Object} Formatted warranty information
     */
    formatWarrantyInfo(warrantyData) {
        const formatted = {
            invoiceWarranty: warrantyData.warrantyInfo || '',
            itemWarranties: [],
            hasWarranty: false
        };

        // Check if invoice has warranty info
        if (warrantyData.warrantyInfo && warrantyData.warrantyInfo.trim()) {
            formatted.hasWarranty = true;
        }

        // Format item-level warranties
        if (warrantyData.items && Array.isArray(warrantyData.items)) {
            warrantyData.items.forEach((item) => {
                if (item.warrantyMonths > 0 || item.warrantyDetails) {
                    formatted.hasWarranty = true;
                    formatted.itemWarranties.push({
                        itemId: item.itemId,
                        itemName: item.itemName || item.itemId?.name,
                        warrantyMonths: item.warrantyMonths || 0,
                        warrantyDetails: item.warrantyDetails || '',
                        warrantyText: this._generateWarrantyText(item.warrantyMonths, item.warrantyDetails)
                    });
                }
            });
        }

        return formatted;
    }

    /**
     * Get warranty information for an invoice
     * Task 76.4
     * @param {Object} invoice - Invoice model instance (populated)
     * @returns {Object} Warranty information
     */
    async getWarrantyInfoForInvoice(invoice) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        const warrantyData = {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            warrantyInfo: invoice.warrantyInfo || '',
            warrantyPaste: invoice.warrantyPaste || false,
            items: invoice.items.map(item => ({
                itemId: item.itemId?._id || item.itemId,
                itemName: item.itemId?.name || 'Unknown Item',
                itemCode: item.itemId?.code || '',
                warrantyMonths: item.warrantyMonths || 0,
                warrantyDetails: item.warrantyDetails || ''
            }))
        };

        return this.formatWarrantyInfo(warrantyData);
    }

    /**
     * Generate warranty text from months and details
     * @private
     * @param {number} months - Warranty months
     * @param {string} details - Warranty details
     * @returns {string} Formatted warranty text
     */
    _generateWarrantyText(months, details) {
        const parts = [];

        if (months > 0) {
            if (months === 1) {
                parts.push('1 month warranty');
            } else if (months === 12) {
                parts.push('1 year warranty');
            } else if (months === 24) {
                parts.push('2 years warranty');
            } else if (months === 36) {
                parts.push('3 years warranty');
            } else if (months % 12 === 0) {
                parts.push(`${months / 12} years warranty`);
            } else {
                parts.push(`${months} months warranty`);
            }
        }

        if (details && details.trim()) {
            parts.push(details.trim());
        }

        return parts.join(' - ');
    }

    /**
     * Update warranty information for an invoice
     * Task 76.2
     * @param {Object} invoice - Invoice model instance
     * @param {Object} warrantyUpdate - Warranty update data
     * @returns {Object} Updated invoice
     */
    async updateWarrantyInfo(invoice, warrantyUpdate) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        // Validate warranty data
        const validation = this.validateWarrantyFields(warrantyUpdate);
        if (!validation.isValid) {
            throw new Error(`Warranty validation failed: ${validation.errors.join(', ')}`);
        }

        // Update invoice-level warranty
        if (warrantyUpdate.warrantyInfo !== undefined) {
            invoice.warrantyInfo = warrantyUpdate.warrantyInfo;
        }

        if (warrantyUpdate.warrantyPaste !== undefined) {
            invoice.warrantyPaste = warrantyUpdate.warrantyPaste;
        }

        // Update item-level warranties
        if (warrantyUpdate.items && Array.isArray(warrantyUpdate.items)) {
            warrantyUpdate.items.forEach((itemUpdate) => {
                const invoiceItem = invoice.items.find(
                    item => item.itemId.toString() === itemUpdate.itemId.toString()
                );

                if (invoiceItem) {
                    if (itemUpdate.warrantyMonths !== undefined) {
                        invoiceItem.warrantyMonths = itemUpdate.warrantyMonths;
                    }
                    if (itemUpdate.warrantyDetails !== undefined) {
                        invoiceItem.warrantyDetails = itemUpdate.warrantyDetails;
                    }
                }
            });
        }

        return invoice;
    }
}

module.exports = new WarrantyService();
