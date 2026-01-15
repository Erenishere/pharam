const Route = require('../models/Route');
const Salesman = require('../models/Salesman');

/**
 * Route Service
 * Phase 2 - Requirement 17: Route Management for Salesmen
 * Task 56.2: Create Route service
 */
class RouteService {
    /**
     * Create a new route
     * @param {Object} routeData - Route data
     * @returns {Promise<Object>} Created route
     */
    async createRoute(routeData) {
        const { name, code, salesmanId } = routeData;

        // Validate required fields
        if (!name) {
            throw new Error('Route name is required');
        }

        // Check if code exists (if provided)
        if (code) {
            const existingRoute = await Route.findOne({ code: code.toUpperCase() });
            if (existingRoute) {
                throw new Error('Route code already exists');
            }
        }

        // Validate salesman if provided
        if (salesmanId) {
            const salesman = await Salesman.findById(salesmanId);
            if (!salesman) {
                throw new Error('Salesman not found');
            }
            if (!salesman.isActive) {
                throw new Error('Salesman is not active');
            }
        }

        const route = new Route(routeData);
        await route.save();

        if (salesmanId) {
            await route.populate('salesmanId', 'name code');
        }

        return route;
    }

    /**
     * Get all routes with filters
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>} List of routes
     */
    async getRoutes(filters = {}) {
        const { isActive, salesmanId, keyword } = filters;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        if (salesmanId) {
            query.salesmanId = salesmanId;
        }

        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            query.$or = [
                { name: regex },
                { code: regex },
                { description: regex }
            ];
        }

        return Route.find(query)
            .populate('salesmanId', 'name code')
            .populate('createdBy', 'name')
            .sort({ name: 1 });
    }

    /**
     * Get route by ID
     * @param {string} id - Route ID
     * @returns {Promise<Object>} Route
     */
    async getRouteById(id) {
        const route = await Route.findById(id)
            .populate('salesmanId', 'name code')
            .populate('createdBy', 'name');

        if (!route) {
            throw new Error('Route not found');
        }

        return route;
    }

    /**
     * Update route
     * @param {string} id - Route ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated route
     */
    async updateRoute(id, updateData) {
        const route = await Route.findById(id);
        if (!route) {
            throw new Error('Route not found');
        }

        // Check code uniqueness if changing
        if (updateData.code && updateData.code !== route.code) {
            const existingRoute = await Route.findOne({ code: updateData.code.toUpperCase() });
            if (existingRoute) {
                throw new Error('Route code already exists');
            }
        }

        // Validate salesman if changing
        if (updateData.salesmanId && updateData.salesmanId !== route.salesmanId?.toString()) {
            const salesman = await Salesman.findById(updateData.salesmanId);
            if (!salesman) {
                throw new Error('Salesman not found');
            }
            if (!salesman.isActive) {
                throw new Error('Salesman is not active');
            }
        }

        Object.assign(route, updateData);
        await route.save();

        return route.populate('salesmanId', 'name code');
    }

    /**
     * Delete route (soft delete)
     * @param {string} id - Route ID
     * @returns {Promise<Object>} Deleted route
     */
    async deleteRoute(id) {
        const route = await Route.findById(id);
        if (!route) {
            throw new Error('Route not found');
        }

        route.isActive = false;
        await route.save();

        return route;
    }

    /**
     * Assign salesman to route
     * @param {string} routeId - Route ID
     * @param {string} salesmanId - Salesman ID
     * @returns {Promise<Object>} Updated route
     */
    async assignSalesmanToRoute(routeId, salesmanId) {
        const route = await Route.findById(routeId);
        if (!route) {
            throw new Error('Route not found');
        }

        const salesman = await Salesman.findById(salesmanId);
        if (!salesman) {
            throw new Error('Salesman not found');
        }
        if (!salesman.isActive) {
            throw new Error('Salesman is not active');
        }

        // If route had a previous salesman, clear their routeId
        if (route.salesmanId && route.salesmanId.toString() !== salesmanId) {
            await Salesman.findByIdAndUpdate(route.salesmanId, { $unset: { routeId: 1 } });
        }

        // If salesman had a previous route, clear that route's salesmanId
        if (salesman.routeId && salesman.routeId.toString() !== routeId) {
            await Route.findByIdAndUpdate(salesman.routeId, { $unset: { salesmanId: 1 } });
        }

        // Update route
        route.salesmanId = salesmanId;
        await route.save();

        // Update salesman
        salesman.routeId = routeId;
        await salesman.save();

        return route.populate('salesmanId', 'name code');
    }
}

module.exports = new RouteService();
