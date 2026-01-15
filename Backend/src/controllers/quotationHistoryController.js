const quotationHistoryService = require('../services/quotationHistoryService');

/**
 * QuotationHistory Controller
 * Phase 2 - Requirement 18.1, 18.2
 * Handles HTTP requests for quotation history
 */
class QuotationHistoryController {
    /**
     * Get quotation history
     * GET /api/quotation-history
     * Query params: itemId, partyId, limit
     */
    async getQuotationHistory(req, res) {
        try {
            const { itemId, partyId, limit } = req.query;

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

            const parsedLimit = limit ? parseInt(limit, 10) : 10;

            const history = await quotationHistoryService.getQuotationHistory(
                itemId,
                partyId,
                parsedLimit
            );

            res.status(200).json({
                success: true,
                data: history,
                count: history.length
            });
        } catch (error) {
            console.error('Error getting quotation history:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get quotation history'
            });
        }
    }

    /**
     * Get latest quotation rate
     * GET /api/quotation-history/latest
     * Query params: itemId, partyId
     */
    async getLatestRate(req, res) {
        try {
            const { itemId, partyId } = req.query;

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

            const latestRate = await quotationHistoryService.getLatestRate(itemId, partyId);

            if (!latestRate) {
                return res.status(404).json({
                    success: false,
                    message: 'No quotation history found for this item and party'
                });
            }

            res.status(200).json({
                success: true,
                data: latestRate
            });
        } catch (error) {
            console.error('Error getting latest rate:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get latest rate'
            });
        }
    }

    /**
     * Get quotation history by transaction type
     * GET /api/quotation-history/by-type
     * Query params: itemId, transactionType, limit
     */
    async getHistoryByType(req, res) {
        try {
            const { itemId, transactionType, limit } = req.query;

            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'Item ID is required'
                });
            }

            if (!transactionType) {
                return res.status(400).json({
                    success: false,
                    message: 'Transaction type is required'
                });
            }

            const parsedLimit = limit ? parseInt(limit, 10) : 10;

            const history = await quotationHistoryService.getHistoryByType(
                itemId,
                transactionType,
                parsedLimit
            );

            res.status(200).json({
                success: true,
                data: history,
                count: history.length
            });
        } catch (error) {
            console.error('Error getting history by type:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get history by type'
            });
        }
    }

    /**
     * Get all item history
     * GET /api/quotation-history/item/:itemId
     * Query params: limit, startDate, endDate
     */
    async getItemHistory(req, res) {
        try {
            const { itemId } = req.params;
            const { limit, startDate, endDate } = req.query;

            if (!itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'Item ID is required'
                });
            }

            const options = {};
            if (limit) options.limit = parseInt(limit, 10);
            if (startDate) options.startDate = startDate;
            if (endDate) options.endDate = endDate;

            const history = await quotationHistoryService.getItemHistory(itemId, options);

            res.status(200).json({
                success: true,
                data: history,
                count: history.length
            });
        } catch (error) {
            console.error('Error getting item history:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get item history'
            });
        }
    }
}

module.exports = new QuotationHistoryController();
