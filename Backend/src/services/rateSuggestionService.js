const quotationHistoryService = require('./quotationHistoryService');
const purchaseOrderService = require('./purchaseOrderService');
const Invoice = require('../models/Invoice');

/**
 * Rate Suggestion Service
 * Phase 2 - Requirement 18.4, 18.5
 * Task 61: Implement rate copying functionality
 */
class RateSuggestionService {
    /**
     * Get rate suggestions for invoice item
     * Task 61.1 - Requirement 18.4
     * @param {string} itemId - Item ID
     * @param {string} partyId - Party ID (customer or supplier)
     * @param {string} transactionType - 'sales' or 'purchase'
     * @returns {Promise<Object>} Rate suggestions
     */
    async getRateSuggestions(itemId, partyId, transactionType) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }

        if (!partyId) {
            throw new Error('Party ID is required');
        }

        if (!transactionType) {
            throw new Error('Transaction type is required');
        }

        if (!['sales', 'purchase'].includes(transactionType)) {
            throw new Error('Transaction type must be either sales or purchase');
        }

        const suggestions = {
            itemId,
            partyId,
            transactionType,
            quotationHistory: null,
            poRate: null,
            recommendedRate: null,
            generatedAt: new Date()
        };

        try {
            // Get quotation history
            const quotationHistory = await quotationHistoryService.getQuotationHistory(
                itemId,
                partyId,
                5 // Last 5 transactions
            );

            if (quotationHistory && quotationHistory.length > 0) {
                suggestions.quotationHistory = {
                    latestRate: quotationHistory[0].finalRate,
                    latestQuantity: quotationHistory[0].quantity,
                    latestDate: quotationHistory[0].transactionDate,
                    history: quotationHistory.map(h => ({
                        rate: h.finalRate,
                        quantity: h.quantity,
                        date: h.transactionDate,
                        invoiceNumber: h.invoiceNumber
                    }))
                };
            }
        } catch (error) {
            console.error('Error fetching quotation history:', error.message);
            // Continue even if quotation history fails
        }

        // For purchase transactions, also get PO rate
        if (transactionType === 'purchase') {
            try {
                const poRate = await purchaseOrderService.getPORate(itemId, partyId);

                if (poRate && poRate.latestRate) {
                    suggestions.poRate = {
                        rate: poRate.latestRate.unitPrice,
                        quantity: poRate.latestRate.quantity,
                        pendingQuantity: poRate.latestRate.pendingQuantity,
                        poNumber: poRate.latestRate.poNumber,
                        poDate: poRate.latestRate.poDate,
                        history: poRate.history.map(h => ({
                            rate: h.unitPrice,
                            quantity: h.quantity,
                            pendingQuantity: h.pendingQuantity,
                            poNumber: h.poNumber,
                            poDate: h.poDate
                        }))
                    };
                }
            } catch (error) {
                console.error('Error fetching PO rate:', error.message);
                // Continue even if PO rate fails
            }
        }

        // Determine recommended rate
        suggestions.recommendedRate = this._determineRecommendedRate(suggestions);

        return suggestions;
    }

    /**
     * Get item transaction history with a party
     * Task 61.2 - Requirement 18.5
     * @param {string} itemId - Item ID
     * @param {string} partyId - Party ID (customer or supplier)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Transaction history
     */
    async getItemTransactionHistory(itemId, partyId, options = {}) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }

        if (!partyId) {
            throw new Error('Party ID is required');
        }

        const { limit = 10, startDate, endDate } = options;

        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }

        // Build query
        const query = {
            $or: [
                { customerId: partyId },
                { supplierId: partyId }
            ],
            'items.itemId': itemId,
            status: { $ne: 'cancelled' }
        };

        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) query.invoiceDate.$lte = new Date(endDate);
        }

        // Get invoices
        const invoices = await Invoice.find(query)
            .populate('customerId', 'code name')
            .populate('supplierId', 'code name')
            .populate('items.itemId', 'code name unit')
            .sort({ invoiceDate: -1 })
            .limit(limit)
            .lean();

        // Extract item-specific transactions
        const transactions = [];

        for (const invoice of invoices) {
            const invoiceItem = invoice.items.find(
                item => item.itemId._id.toString() === itemId.toString()
            );

            if (invoiceItem) {
                const party = invoice.customerId || invoice.supplierId;

                transactions.push({
                    invoiceId: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    invoiceDate: invoice.invoiceDate,
                    transactionType: invoice.type,
                    party: {
                        id: party._id,
                        code: party.code,
                        name: party.name
                    },
                    item: {
                        id: invoiceItem.itemId._id,
                        code: invoiceItem.itemId.code,
                        name: invoiceItem.itemId.name,
                        unit: invoiceItem.itemId.unit
                    },
                    quantity: invoiceItem.quantity,
                    unitPrice: invoiceItem.unitPrice,
                    discount: invoiceItem.discount || 0,
                    gstRate: invoiceItem.gstRate || 0,
                    lineTotal: invoiceItem.lineTotal,
                    paymentStatus: invoice.paymentStatus
                });
            }
        }

        // Calculate statistics
        const statistics = this._calculateTransactionStatistics(transactions);

        return {
            itemId,
            partyId,
            transactions,
            statistics,
            count: transactions.length,
            generatedAt: new Date()
        };
    }

    /**
     * Determine recommended rate from available data
     * @private
     * @param {Object} suggestions - Rate suggestions object
     * @returns {Object|null} Recommended rate
     */
    _determineRecommendedRate(suggestions) {
        // Priority: PO rate > Latest quotation history

        if (suggestions.poRate && suggestions.poRate.rate) {
            return {
                rate: suggestions.poRate.rate,
                source: 'po',
                reason: 'Latest approved purchase order rate',
                date: suggestions.poRate.poDate
            };
        }

        if (suggestions.quotationHistory && suggestions.quotationHistory.latestRate) {
            return {
                rate: suggestions.quotationHistory.latestRate,
                source: 'quotation_history',
                reason: 'Latest transaction rate with this party',
                date: suggestions.quotationHistory.latestDate
            };
        }

        return null;
    }

    /**
     * Calculate transaction statistics
     * @private
     * @param {Array} transactions - Transaction array
     * @returns {Object} Statistics
     */
    _calculateTransactionStatistics(transactions) {
        if (!transactions || transactions.length === 0) {
            return {
                totalTransactions: 0,
                totalQuantity: 0,
                averageRate: 0,
                minRate: 0,
                maxRate: 0,
                lastTransactionDate: null
            };
        }

        const rates = transactions.map(t => t.unitPrice);
        const quantities = transactions.map(t => t.quantity);

        return {
            totalTransactions: transactions.length,
            totalQuantity: quantities.reduce((sum, q) => sum + q, 0),
            averageRate: rates.reduce((sum, r) => sum + r, 0) / rates.length,
            minRate: Math.min(...rates),
            maxRate: Math.max(...rates),
            lastTransactionDate: transactions[0].invoiceDate
        };
    }
}

module.exports = new RateSuggestionService();
