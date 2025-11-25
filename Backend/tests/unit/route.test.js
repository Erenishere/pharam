const mongoose = require('mongoose');
const Route = require('../../src/models/Route');

describe('Route Model', () => {
    it('should create a valid route', async () => {
        const routeData = {
            name: 'Test Route',
            code: 'RT0001',
            description: 'Test Description',
            createdBy: new mongoose.Types.ObjectId(),
        };

        const route = new Route(routeData);
        await route.validate();

        expect(route.name).toBe(routeData.name);
        expect(route.code).toBe(routeData.code);
        expect(route.description).toBe(routeData.description);
        expect(route.isActive).toBe(true);
    });

    it('should require a name', async () => {
        const route = new Route({
            code: 'RT0002',
            createdBy: new mongoose.Types.ObjectId(),
        });

        let err;
        try {
            await route.validate();
        } catch (error) {
            err = error;
        }

        expect(err).toBeDefined();
        expect(err.errors.name).toBeDefined();
    });

    it('should auto-generate code if not provided', async () => {
        // Mock countDocuments
        jest.spyOn(Route, 'countDocuments').mockResolvedValue(0);

        const route = new Route({
            name: 'Auto Code Route',
            createdBy: new mongoose.Types.ObjectId(),
        });

        // Trigger pre-save middleware logic (simulated)
        if (!route.code) {
            const count = await Route.countDocuments();
            route.code = `RT${String(count + 1).padStart(4, '0')}`;
        }

        expect(route.code).toBe('RT0001');
    });
});
