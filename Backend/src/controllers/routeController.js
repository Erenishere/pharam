const routeService = require('../services/routeService');

/**
 * Route Controller
 * Phase 2 - Requirement 17: Route Management for Salesmen
 * Task 56.3: Create Route API endpoints
 */
class RouteController {
    /**
     * Create a new route
     * POST /api/routes
     */
    async createRoute(req, res, next) {
        try {
            const routeData = {
                ...req.body,
                createdBy: req.user._id
            };

            const route = await routeService.createRoute(routeData);

            res.status(201).json({
                success: true,
                data: route,
                message: 'Route created successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all routes
     * GET /api/routes
     */
    async getRoutes(req, res, next) {
        try {
            const filters = {
                isActive: req.query.isActive,
                salesmanId: req.query.salesmanId,
                keyword: req.query.keyword
            };

            const routes = await routeService.getRoutes(filters);

            res.status(200).json({
                success: true,
                data: routes
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get route by ID
     * GET /api/routes/:id
     */
    async getRouteById(req, res, next) {
        try {
            const route = await routeService.getRouteById(req.params.id);

            res.status(200).json({
                success: true,
                data: route
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update route
     * PUT /api/routes/:id
     */
    async updateRoute(req, res, next) {
        try {
            const route = await routeService.updateRoute(req.params.id, req.body);

            res.status(200).json({
                success: true,
                data: route,
                message: 'Route updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete route
     * DELETE /api/routes/:id
     */
    async deleteRoute(req, res, next) {
        try {
            await routeService.deleteRoute(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Route deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Assign salesman to route
     * POST /api/routes/:id/assign
     */
    async assignSalesman(req, res, next) {
        try {
            const { salesmanId } = req.body;
            if (!salesmanId) {
                throw new Error('Salesman ID is required');
            }

            const route = await routeService.assignSalesmanToRoute(req.params.id, salesmanId);

            res.status(200).json({
                success: true,
                data: route,
                message: 'Salesman assigned successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RouteController();
