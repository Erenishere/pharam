
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Salesman = require('./src/models/Salesman');
const Route = require('./src/models/Route');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharam-erp';

const seedSalesman = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find the User with role 'sales'
        const salesUser = await User.findOne({ username: 'sales_user' });
        if (!salesUser) {
            console.error('User "sales" not found. Please create it first.');
            process.exit(1);
        }
        console.log('Found User:', salesUser.username, salesUser._id);

        // 2. Find or Create a Route
        let route = await Route.findOne({ code: 'RT001' });
        if (!route) {
            console.log('Route RT001 not found. Creating it...');
            route = await Route.create({
                code: 'RT001',
                name: 'Downtown Route',
                description: 'Main downtown area',
                createdBy: salesUser._id // Just using sales user as creator for simplicity
            });
            console.log('Created Route:', route.code);
        } else {
            console.log('Found Route:', route.code);
        }

        // 3. Find or Create Salesman linked to this User
        let salesman = await Salesman.findOne({ userId: salesUser._id });
        if (salesman) {
            console.log('Salesman profile already exists for this user:', salesman.code);
            // Ensure route is assigned
            if (!salesman.routeId) {
                salesman.routeId = route._id;
                await salesman.save();
                console.log('Updated Salesman with Route ID');
            }
        } else {
            console.log('Creating new Salesman profile...');
            salesman = await Salesman.create({
                name: 'John Doe',
                code: 'SM001',
                phone: '1234567890',
                email: salesUser.email,
                userId: salesUser._id,
                routeId: route._id,
                commissionRate: 5,
                isActive: true
            });
            console.log('Created Salesman:', salesman.code);
        }

        // 4. Link Salesman to Route (bidirectional)
        route.salesmanId = salesman._id;
        await route.save();
        console.log('Linked Route to Salesman');

        console.log('Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedSalesman();
