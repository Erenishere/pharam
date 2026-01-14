const recoverySummaryService = require('../services/recoverySummaryService');

/**
 * Recovery Summary Controller
 * Phase 2 - Requirement 15: Cash Recovery Summary System
 * Task 52.3: Create recovery summary API endpoints
 */
class RecoverySummaryController {
    /**
     * Create a new recovery summary
     * POST /api/recovery-summaries
     */
    async createRecoverySummary(req, res, next) {
        try {
            const data = {
                ...req.body,
                createdBy: req.user._id
            };

            const summary = await recoverySummaryService.createRecoverySummary(data);

            res.status(201).json({
                success: true,
                data: summary,
                message: 'Recovery summary created successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all recovery summaries with filters
     * GET /api/recovery-summaries
     */
    async getRecoverySummaries(req, res, next) {
        try {
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                salesmanId: req.query.salesmanId,
                town: req.query.town,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await recoverySummaryService.getRecoverySummaries(filters);

            res.status(200).json({
                success: true,
                data: result.summaries,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get recovery summary by ID
     * GET /api/recovery-summaries/:id
     */
    async getRecoverySummaryById(req, res, next) {
        try {
            const summary = await recoverySummaryService.getRecoverySummaryById(req.params.id);

            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update recovery summary
     * PUT /api/recovery-summaries/:id
     */
    async updateRecoverySummary(req, res, next) {
        try {
            const summary = await recoverySummaryService.updateRecoverySummary(
                req.params.id,
                req.body
            );

            res.status(200).json({
                success: true,
                data: summary,
                message: 'Recovery summary updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete recovery summary
     * DELETE /api/recovery-summaries/:id
     */
    async deleteRecoverySummary(req, res, next) {
        try {
            await recoverySummaryService.deleteRecoverySummary(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Recovery summary deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get recovery statistics
     * GET /api/recovery-summaries/statistics
     */
    async getRecoveryStatistics(req, res, next) {
        try {
            const filters = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                salesmanId: req.query.salesmanId,
                town: req.query.town
            };

            const stats = await recoverySummaryService.getRecoveryStatistics(filters);

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get recovery summary print data
     * GET /api/recovery-summaries/:id/print
     */
    async getRecoverySummaryPrint(req, res, next) {
        try {
            const printData = await recoverySummaryService.generateRecoverySummaryPrint(req.params.id);

            res.status(200).json({
                success: true,
                data: printData
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RecoverySummaryController();
