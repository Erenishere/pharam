const warrantyService = require('../../src/services/warrantyService');

/**
 * Warranty Service Tests
 * Phase 2 - Requirement 32: Warranty Information Management
 * Task 76: Implement warranty management
 */

describe('WarrantyService', () => {
    describe('validateWarrantyFields', () => {
        it('should validate valid warranty data', () => {
            const warrantyData = {
                warrantyInfo: 'Standard 1 year warranty',
                warrantyPaste: true,
                items: [
                    {
                        warrantyMonths: 12,
                        warrantyDetails: 'Manufacturer warranty'
                    }
                ]
            };

            const result = warrantyService.validateWarrantyFields(warrantyData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject warranty info exceeding 500 characters', () => {
            const warrantyData = {
                warrantyInfo: 'a'.repeat(501),
                warrantyPaste: true
            };

            const result = warrantyService.validateWarrantyFields(warrantyData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Warranty info cannot exceed 500 characters');
        });

        it('should reject non-boolean warrantyPaste', () => {
            const warrantyData = {
                warrantyPaste: 'yes'
            };

            const result = warrantyService.validateWarrantyFields(warrantyData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Warranty paste must be a boolean');
        });

        it('should reject negative warranty months', () => {
            const warrantyData = {
                items: [
                    {
                        warrantyMonths: -1
                    }
                ]
            };

            const result = warrantyService.validateWarrantyFields(warrantyData);

            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Warranty months cannot be negative');
        });

        it('should reject non-integer warranty months', () => {
            const warrantyData = {
                items: [
                    {
                        warrantyMonths: 12.5
                    }
                ]
            };

            const result = warrantyService.validateWarrantyFields(warrantyData);

            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Warranty months must be a whole number');
        });

        it('should reject warranty details exceeding 200 characters', () => {
            const warrantyData = {
                items: [
                    {
                        warrantyDetails: 'a'.repeat(201)
                    }
                ]
            };

            const result = warrantyService.validateWarrantyFields(warrantyData);

            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Warranty details cannot exceed 200 characters');
        });
    });

    describe('applyDefaultWarranty', () => {
        it('should apply default warranty from item', async () => {
            const item = {
                defaultWarrantyMonths: 24,
                defaultWarrantyDetails: 'Standard manufacturer warranty'
            };

            const invoiceItem = {};

            const result = await warrantyService.applyDefaultWarranty(item, invoiceItem);

            expect(result.warrantyMonths).toBe(24);
            expect(result.warrantyDetails).toBe('Standard manufacturer warranty');
        });

        it('should not override existing warranty months', async () => {
            const item = {
                defaultWarrantyMonths: 24,
                defaultWarrantyDetails: 'Standard warranty'
            };

            const invoiceItem = {
                warrantyMonths: 12
            };

            const result = await warrantyService.applyDefaultWarranty(item, invoiceItem);

            expect(result.warrantyMonths).toBe(12);
        });

        it('should not override existing warranty details', async () => {
            const item = {
                defaultWarrantyMonths: 24,
                defaultWarrantyDetails: 'Standard warranty'
            };

            const invoiceItem = {
                warrantyDetails: 'Custom warranty'
            };

            const result = await warrantyService.applyDefaultWarranty(item, invoiceItem);

            expect(result.warrantyDetails).toBe('Custom warranty');
        });

        it('should handle null item gracefully', async () => {
            const invoiceItem = {};

            const result = await warrantyService.applyDefaultWarranty(null, invoiceItem);

            expect(result).toEqual(invoiceItem);
        });
    });

    describe('formatWarrantyInfo', () => {
        it('should format warranty information correctly', () => {
            const warrantyData = {
                warrantyInfo: 'All items covered under warranty',
                items: [
                    {
                        itemId: '123',
                        itemName: 'Test Item',
                        warrantyMonths: 12,
                        warrantyDetails: 'Parts and labor'
                    }
                ]
            };

            const result = warrantyService.formatWarrantyInfo(warrantyData);

            expect(result.hasWarranty).toBe(true);
            expect(result.invoiceWarranty).toBe('All items covered under warranty');
            expect(result.itemWarranties).toHaveLength(1);
            expect(result.itemWarranties[0].warrantyMonths).toBe(12);
            expect(result.itemWarranties[0].warrantyText).toContain('1 year warranty');
        });

        it('should handle items without warranty', () => {
            const warrantyData = {
                items: [
                    {
                        itemId: '123',
                        itemName: 'Test Item'
                    }
                ]
            };

            const result = warrantyService.formatWarrantyInfo(warrantyData);

            expect(result.hasWarranty).toBe(false);
            expect(result.itemWarranties).toHaveLength(0);
        });

        it('should generate correct warranty text for various months', () => {
            const testCases = [
                { months: 1, expected: '1 month warranty' },
                { months: 12, expected: '1 year warranty' },
                { months: 24, expected: '2 years warranty' },
                { months: 36, expected: '3 years warranty' },
                { months: 6, expected: '6 months warranty' }
            ];

            testCases.forEach(({ months, expected }) => {
                const warrantyData = {
                    items: [
                        {
                            itemId: '123',
                            warrantyMonths: months
                        }
                    ]
                };

                const result = warrantyService.formatWarrantyInfo(warrantyData);
                expect(result.itemWarranties[0].warrantyText).toContain(expected);
            });
        });
    });

    describe('updateWarrantyInfo', () => {
        it('should update invoice warranty information', async () => {
            const invoice = {
                warrantyInfo: 'Old warranty',
                warrantyPaste: false,
                items: [
                    {
                        itemId: '123',
                        warrantyMonths: 0
                    }
                ]
            };

            const warrantyUpdate = {
                warrantyInfo: 'New warranty information',
                warrantyPaste: true,
                items: [
                    {
                        itemId: '123',
                        warrantyMonths: 24,
                        warrantyDetails: 'Extended warranty'
                    }
                ]
            };

            const result = await warrantyService.updateWarrantyInfo(invoice, warrantyUpdate);

            expect(result.warrantyInfo).toBe('New warranty information');
            expect(result.warrantyPaste).toBe(true);
            expect(result.items[0].warrantyMonths).toBe(24);
            expect(result.items[0].warrantyDetails).toBe('Extended warranty');
        });

        it('should throw error for invalid warranty data', async () => {
            const invoice = {
                items: []
            };

            const warrantyUpdate = {
                warrantyInfo: 'a'.repeat(501)
            };

            await expect(
                warrantyService.updateWarrantyInfo(invoice, warrantyUpdate)
            ).rejects.toThrow('Warranty validation failed');
        });

        it('should throw error for null invoice', async () => {
            await expect(
                warrantyService.updateWarrantyInfo(null, {})
            ).rejects.toThrow('Invoice is required');
        });
    });
});
