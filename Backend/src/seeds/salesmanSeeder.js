const Salesman = require('../models/Salesman');
const User = require('../models/User');
const Route = require('../models/Route');

module.exports = {
    async seed() {
        await Salesman.deleteMany({});

        // Find sales user
        const salesUser = await User.findOne({ username: 'sales_user' });
        if (!salesUser) {
            console.log('  - Warning: sales_user not found, skipping salesman creation');
            return;
        }

        // Find a route
        const route = await Route.findOne({ code: 'RT0001' });

        // Create salesman profile linked to sales_user
        const salesman = {
            code: 'SM0001',
            name: 'John Salesman',
            phone: '0300-1234567',
            email: 'sales@industraders.com',
            userId: salesUser._id,
            commissionRate: 5,
            routeId: route ? route._id : null,
            isActive: true,
        };

        await Salesman.create(salesman);
        console.log('  - Created salesman profile for sales_user');
    },

    async clear() {
        await Salesman.deleteMany({});
        console.log('  - Salesmen cleared');
    },
};
