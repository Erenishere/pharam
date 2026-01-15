/**
 * Trade Offer Adjustment Service
 * Phase 2 - Requirement 20: Trade Offer (TO) Management System
 * Task 64.4: Link TOs to adjustment accounts
 */

const ledgerService = require('./ledgerService');
const Account = require('../models/Account');

class TOAdjustmentService {
    /**
     * Validate adjustment account exists and is active
     * @param {string} accountId - Adjustment account ID
     * @returns {Promise<Object>} Account object
     */
    async validateAdjustmentAccount(accountId) {
        if (!accountId) {
            throw new Error('Adjustment account ID is required');
        }

        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error('Adjustment account not found');
        }

        if (!account.isActive) {
            throw new Error('Adjustment account is not active');
        }

        return account;
    }

    /**
     * Create ledger entries for TO amounts
     * @param {Object} invoice - Invoice object with TO amounts
     * @param {string} userId - User ID creating the entries
     * @returns {Promise<Object>} Created ledger entries
     */
    async createTOLedgerEntries(invoice, userId) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        const entries = [];
        const to1Amount = invoice.to1Amount || 0;
        const to2Amount = invoice.to2Amount || 0;
        const totalTOAmount = to1Amount + to2Amount;

        // Only create entries if there are TO amounts
        if (totalTOAmount === 0) {
            return { entries: [], totalAmount: 0 };
        }

        // Validate adjustment account if TOs are applied
        if (!invoice.adjustmentAccountId) {
            throw new Error('Adjustment account is required when Trade Offers are applied');
        }

        await this.validateAdjustmentAccount(invoice.adjustmentAccountId);

        // Determine the party account (customer or supplier)
        const partyAccountId = invoice.customerId || invoice.supplierId;
        const partyAccountType = invoice.customerId ? 'Customer' : 'Supplier';

        if (!partyAccountId) {
            throw new Error('Invoice must have either a customer or supplier');
        }

        // Create ledger entry for TO1 if applicable
        if (to1Amount > 0) {
            const to1Entry = await ledgerService.createDoubleEntry(
                {
                    accountId: invoice.adjustmentAccountId,
                    accountType: 'Account'
                },
                {
                    accountId: partyAccountId,
                    accountType: partyAccountType
                },
                to1Amount,
                `Trade Offer 1 (${invoice.to1Percent}%) - Invoice ${invoice.invoiceNumber}`,
                'invoice',
                invoice._id,
                userId
            );
            entries.push(to1Entry);
        }

        // Create ledger entry for TO2 if applicable
        if (to2Amount > 0) {
            const to2Entry = await ledgerService.createDoubleEntry(
                {
                    accountId: invoice.adjustmentAccountId,
                    accountType: 'Account'
                },
                {
                    accountId: partyAccountId,
                    accountType: partyAccountType
                },
                to2Amount,
                `Trade Offer 2 (${invoice.to2Percent}%) - Invoice ${invoice.invoiceNumber}`,
                'invoice',
                invoice._id,
                userId
            );
            entries.push(to2Entry);
        }

        return {
            entries,
            totalAmount: totalTOAmount,
            to1Amount,
            to2Amount
        };
    }

    /**
     * Reverse TO ledger entries (for invoice cancellation or modification)
     * @param {string} invoiceId - Invoice ID
     * @param {string} reason - Reason for reversal
     * @param {string} userId - User ID creating the reversal
     * @returns {Promise<Array>} Reversed ledger entries
     */
    async reverseTOLedgerEntries(invoiceId, reason, userId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        if (!reason) {
            throw new Error('Reason for reversal is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        // Reverse all ledger entries related to this invoice
        const reversedEntries = await ledgerService.reverseLedgerEntries(
            'invoice',
            invoiceId,
            reason,
            userId
        );

        return reversedEntries;
    }

    /**
     * Get TO ledger entries for an invoice
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Array>} Ledger entries
     */
    async getTOLedgerEntries(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        const LedgerEntry = require('../models/LedgerEntry');

        const entries = await LedgerEntry.find({
            referenceType: 'invoice',
            referenceId: invoiceId,
            description: { $regex: /Trade Offer/i }
        }).sort({ createdAt: 1 });

        return entries;
    }

    /**
     * Validate and link adjustment account to invoice
     * @param {Object} invoice - Invoice object
     * @param {string} adjustmentAccountId - Adjustment account ID
     * @returns {Promise<Object>} Updated invoice
     */
    async linkAdjustmentAccount(invoice, adjustmentAccountId) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        // Validate adjustment account
        await this.validateAdjustmentAccount(adjustmentAccountId);

        // Link adjustment account to invoice
        invoice.adjustmentAccountId = adjustmentAccountId;

        return invoice;
    }
}

module.exports = new TOAdjustmentService();
