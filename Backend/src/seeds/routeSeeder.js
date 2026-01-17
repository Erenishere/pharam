const Route = require('../models/Route');
const User = require('../models/User');

const routes = [
    {
        code: 'RT0001',
        name: 'Downtown Route',
        description: 'Main downtown area including central market',
        isActive: true,
    },
    {
        code: 'RT0002',
        name: 'Suburbs Route',
        description: 'Northern suburbs area',
        isActive: true,
    },
];

module.exports = {
    async seed() {
        await Route.deleteMany({});

        // Get an admin user for createdBy field
        const adminUser = await User.findOne({ role: 'admin' });
        const adminId = adminUser ? adminUser._id : null;

        if (!adminId) {
            console.log('  - Warning: No admin user found for createdBy field in routes');
        }

        for (const route of routes) {
            if (adminId) {
                route.createdBy = adminId;
            }
            await Route.create(route);
        }

        console.log(`  - Created ${routes.length} routes`);
    },

    async clear() {
        await Route.deleteMany({});
        console.log('  - Routes cleared');
    },
};
