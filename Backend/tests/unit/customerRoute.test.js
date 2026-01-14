const mongoose = require('mongoose');
const Customer = require('../../src/models/Customer');
const Route = require('../../src/models/Route');
const customerService = require('../../src/services/customerService');

describe('Route-based Account Management', () => {
    let routeId;

    beforeAll(async () => {
        // Create a mock route
        const route = new Route({
            name: 'Test Route',
            code: 'RT_TEST',
            createdBy: new mongoose.Types.ObjectId(),
        });
        await route.save();
        routeId = route._id;
    });

    afterAll(async () => {
        await Route.deleteMany({});
        await Customer.deleteMany({});
    });

    describe('Customer Model', () => {
        it('should accept a valid routeId', async () => {
            const customerData = {
                name: 'Route Customer',
                type: 'customer',
                routeId: routeId,
            };

            const customer = new Customer(customerData);
            await customer.save();

            expect(customer.routeId).toEqual(routeId);
        });
    });

    describe('Customer Service', () => {
        it('should get accounts by route', async () => {
            // Create another customer on the same route
            await Customer.create({
                name: 'Route Customer 2',
                type: 'customer',
                routeId: routeId,
            });

            // Create a customer on a different route (or no route)
            await Customer.create({
                name: 'No Route Customer',
                type: 'customer',
            });

            const customers = await customerService.getAccountsByRoute(routeId);

            expect(customers).toHaveLength(2);
            customers.forEach(c => {
                expect(c.routeId.toString()).toBe(routeId.toString());
            });
        });

        it('should throw error if route not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            await expect(customerService.getAccountsByRoute(fakeId))
                .rejects
                .toThrow('Route not found');
        });
    });
});
