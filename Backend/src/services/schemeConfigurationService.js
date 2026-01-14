/**
 * Comprehensive Scheme Configuration Service
 * Phase 2 - Requirement 21: Scheme and Discount Claim System
 * Tasks 65.2, 65.3, 65.4: Scheme auto-calculation, application, and claim accounting
 */

const Scheme = require('../models/Scheme');
const Account = require('../models/Account');
const ledgerService = require('./ledgerService');
const schemeService = require('./schemeService');

class SchemeConfigurationService {
    /**
     * Calculate scheme bonus quantity from format
     * Task 65.2: Create scheme auto-calculation service
     * @param {number} quantity - Quantity purchased
     * @param {string} schemeFormat - Scheme format (e.g., "12+1")
     * @returns {Object} Bonus calculation result
     */
    calculateSchemeBonus(quantity, schemeFormat) {
        if (!quantity || quantity <= 0) {
            return {
                purchasedQuantity: quantity,
                bonusQuantity: 0,
                totalQuantity: quantity,
                completeSets: 0
            };
        }

        if (!schemeFormat) {
            throw new Error('Scheme format is required');
        }

        // Parse scheme format (e.g., "12+1" means buy 12 get 1 free)
        const formatMatch = schemeFormat.match(/(\d+)\+(\d+)/);

        if (!formatMatch) {
            throw new Error(`Invalid scheme format: ${schemeFormat}. Expected format like "12+1"`);
        }

        const buyQuantity = parseInt(formatMatch[1], 10);
        const bonusPerSet = parseInt(formatMatch[2], 10);

        if (buyQuantity <= 0 || bonusPerSet <= 0) {
            throw new Error('Buy quantity and bonus quantity must be greater than 0');
        }

        // Calculate how many complete sets the customer qualifies for
        const completeSets = Math.floor(quantity / buyQuantity);
        const totalBonus = completeSets * bonusPerSet;

        return {
            purchasedQuantity: quantity,
            buyQuantity,
            bonusPerSet,
            completeSets,
            bonusQuantity: totalBonus,
            totalQuantity: quantity + totalBonus,
            schemeFormat
        };
    }

    /**
     * Apply scheme to invoice item
     * Task 65.3: Implement scheme application in invoices
     * @param {Object} item - Invoice item
     * @param {Object} scheme - Scheme configuration
     * @param {number} quantity - Quantity purchased
     * @returns {Object} Updated item with scheme applied
     */
    applySchemeToItem(item, scheme, quantity) {
        if (!item) {
            throw new Error('Item is required');
        }

        if (!scheme) {
            throw new Error('Scheme is required');
        }

        // Calculate bonus quantity
        const bonusCalc = this.calculateSchemeBonus(quantity, scheme.schemeFormat);

        // Apply scheme quantities
        if (scheme.type === 'scheme1') {
            item.scheme1Quantity = bonusCalc.bonusQuantity;
        } else if (scheme.type === 'scheme2') {
            item.scheme2Quantity = bonusCalc.bonusQuantity;
        }

        // Calculate discount2 if configured
        if (scheme.discount2Percent && scheme.discount2Percent > 0) {
            const itemSubtotal = item.lineTotal || (item.quantity * item.unitPrice);
            item.discount2Percent = scheme.discount2Percent;
            item.discount2Amount = (itemSubtotal * scheme.discount2Percent) / 100;
        }

        return {
            ...item,
            schemeApplied: {
                schemeId: scheme._id,
                schemeName: scheme.name,
                schemeType: scheme.type,
                schemeFormat: scheme.schemeFormat,
                bonusQuantity: bonusCalc.bonusQuantity,
                discount2Percent: scheme.discount2Percent || 0,
                discount2Amount: item.discount2Amount || 0,
                to2Percent: scheme.to2Percent || 0
            }
        };
    }

    /**
     * Auto-apply schemes to invoice
     * Task 65.3: Auto-apply scheme when quantity threshold is met
     * @param {Object} invoice - Invoice object
     * @param {Array} applicableSchemes - List of applicable schemes
     * @returns {Object} Updated invoice with schemes applied
     */
    async autoApplySchemes(invoice, applicableSchemes = []) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        // If no schemes provided, fetch applicable schemes
        if (!applicableSchemes || applicableSchemes.length === 0) {
            const companyId = invoice.companyId;
            applicableSchemes = await schemeService.getActiveSchemes(companyId);
        }

        let totalTO2Amount = 0;

        // Apply schemes to each item
        for (const item of invoice.items) {
            for (const scheme of applicableSchemes) {
                // Check if item and customer are eligible
                const isItemEligible = scheme.isItemEligible(item.itemId);
                const isCustomerEligible = scheme.isCustomerEligible(invoice.customerId);
                const qualifiesQuantity = scheme.qualifiesForScheme(item.quantity);

                if (isItemEligible && isCustomerEligible && qualifiesQuantity) {
                    // Apply scheme to item
                    const updatedItem = this.applySchemeToItem(item, scheme, item.quantity);
                    Object.assign(item, updatedItem);

                    // Calculate TO2 if configured
                    if (scheme.to2Percent && scheme.to2Percent > 0) {
                        const itemSubtotal = item.lineTotal || (item.quantity * item.unitPrice);
                        const to2Amount = (itemSubtotal * scheme.to2Percent) / 100;
                        totalTO2Amount += to2Amount;
                    }

                    // Link claim account if configured
                    if (scheme.claimAccountId) {
                        invoice.claimAccountId = scheme.claimAccountId;
                    }
                }
            }
        }

        // Apply TO2 to invoice if calculated
        if (totalTO2Amount > 0) {
            invoice.to2Amount = totalTO2Amount;
        }

        return invoice;
    }

    /**
     * Validate claim account
     * Task 65.4: Link schemes to claim accounts
     * @param {string} accountId - Claim account ID
     * @returns {Promise<Object>} Account object
     */
    async validateClaimAccount(accountId) {
        if (!accountId) {
            throw new Error('Claim account ID is required');
        }

        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error('Claim account not found');
        }

        if (!account.isActive) {
            throw new Error('Claim account is not active');
        }

        return account;
    }

    /**
     * Create ledger entries for scheme claims
     * Task 65.4: Create ledger entries in claim account
     * @param {Object} invoice - Invoice with scheme applied
     * @param {string} userId - User ID creating the entries
     * @returns {Promise<Object>} Created ledger entries
     */
    async createSchemeClaimEntries(invoice, userId) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        const entries = [];
        let totalClaimAmount = 0;

        // Calculate total scheme claim amounts
        for (const item of invoice.items) {
            const discount2Amount = item.discount2Amount || 0;
            totalClaimAmount += discount2Amount;
        }

        // Add TO2 amount if applicable
        const to2Amount = invoice.to2Amount || 0;
        totalClaimAmount += to2Amount;

        // Only create entries if there are claim amounts
        if (totalClaimAmount === 0) {
            return { entries: [], totalAmount: 0 };
        }

        // Validate claim account if schemes are applied
        if (!invoice.claimAccountId) {
            throw new Error('Claim account is required when schemes are applied');
        }

        await this.validateClaimAccount(invoice.claimAccountId);

        // Determine the party account (customer or supplier)
        const partyAccountId = invoice.customerId || invoice.supplierId;
        const partyAccountType = invoice.customerId ? 'Customer' : 'Supplier';

        if (!partyAccountId) {
            throw new Error('Invoice must have either a customer or supplier');
        }

        // Create ledger entry for scheme claims
        const claimEntry = await ledgerService.createDoubleEntry(
            {
                accountId: invoice.claimAccountId,
                accountType: 'Account'
            },
            {
                accountId: partyAccountId,
                accountType: partyAccountType
            },
            totalClaimAmount,
            `Scheme claim - Invoice ${invoice.invoiceNumber}`,
            'invoice',
            invoice._id,
            userId
        );

        entries.push(claimEntry);

        return {
            entries,
            totalAmount: totalClaimAmount
        };
    }

    /**
     * Get active schemes list
     * Task 65.5: Create active schemes list
     * @param {string} companyId - Company ID
     * @returns {Promise<Array>} Active schemes
     */
    async getActiveSchemes(companyId) {
        if (!companyId) {
            throw new Error('Company ID is required');
        }

        const schemes = await Scheme.getActiveSchemes(companyId);

        // Populate additional details
        const populatedSchemes = await Scheme.populate(schemes, [
            { path: 'company', select: 'name code' },
            { path: 'claimAccountId', select: 'name code type' },
            { path: 'applicableItems', select: 'code name' },
            { path: 'applicableCustomers', select: 'code name' }
        ]);

        return populatedSchemes.map(scheme => ({
            id: scheme._id,
            name: scheme.name,
            type: scheme.type,
            company: scheme.company,
            group: scheme.group,
            schemeFormat: scheme.schemeFormat,
            discountPercent: scheme.discountPercent,
            discount2Percent: scheme.discount2Percent,
            to2Percent: scheme.to2Percent,
            claimAccount: scheme.claimAccountId,
            isActive: scheme.isActive,
            startDate: scheme.startDate,
            endDate: scheme.endDate,
            minimumQuantity: scheme.minimumQuantity,
            maximumQuantity: scheme.maximumQuantity,
            applicableItems: scheme.applicableItems,
            applicableCustomers: scheme.applicableCustomers,
            description: scheme.description
        }));
    }

    /**
     * Calculate scheme impact on invoice
     * @param {Object} invoice - Invoice object
     * @param {Object} scheme - Scheme configuration
     * @returns {Object} Scheme impact calculation
     */
    calculateSchemeImpact(invoice, scheme) {
        if (!invoice || !scheme) {
            throw new Error('Invoice and scheme are required');
        }

        let totalBonusQuantity = 0;
        let totalDiscount2Amount = 0;
        let totalTO2Amount = 0;
        const affectedItems = [];

        for (const item of invoice.items) {
            const isEligible = scheme.isItemEligible(item.itemId) &&
                scheme.qualifiesForScheme(item.quantity);

            if (isEligible) {
                const bonusCalc = this.calculateSchemeBonus(item.quantity, scheme.schemeFormat);
                totalBonusQuantity += bonusCalc.bonusQuantity;

                if (scheme.discount2Percent > 0) {
                    const itemSubtotal = item.lineTotal || (item.quantity * item.unitPrice);
                    const discount2 = (itemSubtotal * scheme.discount2Percent) / 100;
                    totalDiscount2Amount += discount2;
                }

                if (scheme.to2Percent > 0) {
                    const itemSubtotal = item.lineTotal || (item.quantity * item.unitPrice);
                    const to2 = (itemSubtotal * scheme.to2Percent) / 100;
                    totalTO2Amount += to2;
                }

                affectedItems.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    bonusQuantity: bonusCalc.bonusQuantity
                });
            }
        }

        return {
            schemeId: scheme._id,
            schemeName: scheme.name,
            totalBonusQuantity,
            totalDiscount2Amount,
            totalTO2Amount,
            totalBenefit: totalDiscount2Amount + totalTO2Amount,
            affectedItems
        };
    }
}

module.exports = new SchemeConfigurationService();
