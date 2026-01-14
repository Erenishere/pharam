/**
 * Trade Offer Service
 * Phase 2 - Requirement 20: Trade Offer (TO) Management System
 * Task 64.2: Create TO calculation service
 */
class TradeOfferService {
    /**
     * Calculate Trade Offer 1 (TO1)
     * @param {number} amount - The base amount to calculate TO on (usually subtotal)
     * @param {number} percent - The percentage of TO1
     * @param {number} fixedAmount - Optional fixed amount override
     * @returns {number} Calculated TO1 amount
     */
    calculateTO1(amount, percent, fixedAmount = 0) {
        if (fixedAmount > 0) {
            return fixedAmount;
        }

        if (!amount || amount < 0) return 0;
        if (!percent || percent < 0) return 0;

        return (amount * percent) / 100;
    }

    /**
     * Calculate Trade Offer 2 (TO2)
     * @param {number} amount - The base amount to calculate TO on (usually subtotal - TO1)
     * @param {number} percent - The percentage of TO2
     * @param {number} fixedAmount - Optional fixed amount override
     * @returns {number} Calculated TO2 amount
     */
    calculateTO2(amount, percent, fixedAmount = 0) {
        if (fixedAmount > 0) {
            return fixedAmount;
        }

        if (!amount || amount < 0) return 0;
        if (!percent || percent < 0) return 0;

        return (amount * percent) / 100;
    }

    /**
     * Calculate Net Amount after Trade Offers
     * @param {number} subtotal - The subtotal amount
     * @param {Object} to1 - { percent, amount }
     * @param {Object} to2 - { percent, amount }
     * @returns {Object} Result containing to1Amount, to2Amount, and netAmount
     */
    calculateNetAfterTO(subtotal, to1 = {}, to2 = {}) {
        const result = {
            to1Amount: 0,
            to2Amount: 0,
            netAmount: subtotal
        };

        if (!subtotal || subtotal <= 0) {
            return result;
        }

        // Calculate TO1
        // TO1 is usually calculated on the subtotal
        result.to1Amount = this.calculateTO1(subtotal, to1.percent, to1.amount);

        // Intermediate amount after TO1
        const afterTO1 = subtotal - result.to1Amount;

        // Calculate TO2
        // TO2 is usually calculated on the amount after TO1 (compound) or on subtotal depending on business logic
        // Assuming compound calculation as is common in trade offers (subtotal - TO1) * TO2%
        result.to2Amount = this.calculateTO2(afterTO1, to2.percent, to2.amount);

        // Final Net Amount
        result.netAmount = afterTO1 - result.to2Amount;

        // Ensure no negative values
        if (result.netAmount < 0) result.netAmount = 0;

        return result;
    }

    /**
     * Get Trade Offer Analysis Report
     * @param {Object} dateRange - { startDate, endDate }
     * @returns {Promise<Object>} TO Analysis Report
     */
    async getTOAnalysis(dateRange) {
        const mongoose = require('mongoose');
        const Invoice = mongoose.model('Invoice');
        const { startDate, endDate } = dateRange;

        // Aggregate TOs from invoices
        const pipeline = [
            {
                $match: {
                    invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
                    status: { $ne: 'cancelled' },
                    $or: [
                        { to1Amount: { $gt: 0 } },
                        { to2Amount: { $gt: 0 } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalTO1: { $sum: '$to1Amount' },
                    totalTO2: { $sum: '$to2Amount' },
                    totalTO: { $sum: { $add: ['$to1Amount', '$to2Amount'] } },
                    count: { $sum: 1 },
                    invoices: {
                        $push: {
                            invoiceNumber: '$invoiceNumber',
                            date: '$invoiceDate',
                            to1Amount: '$to1Amount',
                            to2Amount: '$to2Amount',
                            total: { $add: ['$to1Amount', '$to2Amount'] }
                        }
                    }
                }
            }
        ];

        const result = await Invoice.aggregate(pipeline);

        if (result.length === 0) {
            return {
                totalTO1: 0,
                totalTO2: 0,
                totalTO: 0,
                count: 0,
                invoices: []
            };
        }

        return result[0];
    }
}

module.exports = new TradeOfferService();
