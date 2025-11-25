const rateSuggestionService = require('../services/rateSuggestionService');

/**
 * Rate Suggestion Controller
 * Phase 2 - Requirement 18.4, 18.5
 * Task 61: Implement rate copying functionality
 */
class RateSuggestionController {
    /**
     * Get rate suggestions for invoice item
     * GET /api/rate-suggestions
     * Query params: itemId, partyId, transactionType
     */
    async getRateSuggestions(req, res) {
        try {
            const { itemId, partyId, transactionType } = req.query;

            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'Item ID is required'
                });
            }

            if (!partyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Party ID is required'
                });
            }

            if (!transactionType) {
                return res.status(400).json({
                    success: false,
                    message: 'Transaction type is required'
                });
            }

            const suggestions = await rateSuggestionService.getRateSuggestions(
                itemId,
                partyId,
                transactionType
            );

            res.status(200).json({
                success: true,
                data: suggestions
            });
        } catch (error) {
            console.error('Error getting rate suggestions:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get rate suggestions'
            });
        }
    }

    /**
     * Get item transaction history with a party
     * GET /api/rate-suggestions/transaction-history
     * Query params: itemId, partyId, limit, startDate, endDate
     */
    async getItemTransactionHistory(req, res) {
        try {
            const { itemId, partyId, limit, startDate, endDate } = req.query;

            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'Item ID is required'
                });
            }

            if (!partyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Party ID is required'
                });
            }

            const options = {};
            if (limit) options.limit = parseInt(limit, 10);
            if (startDate) options.startDate = startDate;
            if (endDate) options.endDate = endDate;

            const history = await rateSuggestionService.getItemTransactionHistory(
                itemId,
                partyId,
                options
            );

            res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error getting transaction history:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get transaction history'
            });
        }
    }
}

module.exports = new RateSuggestionController();
