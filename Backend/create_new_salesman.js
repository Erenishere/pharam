require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Salesman = require('./src/models/Salesman');
const database = require('./src/config/database');

async function createNewSalesman() {
    try {
        await database.connect();

        // 1. Create User
        const username = 'salesman1';
        const email = 'salesman1@industraders.com';

        // Check if user exists
        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) {
            console.log(`User ${username} already exists. Using existing user.`);
        } else {
            user = await User.create({
                username,
                email,
                password: 'Salesman@123',
                role: 'sales',
                isActive: true
            });
            console.log(`Created new User: ${user.username} (ID: ${user._id})`);
        }

        // 2. Create Salesman linked to this User
        const salesmanName = 'New Salesman';
        let salesman = await Salesman.findOne({ userId: user._id });

        if (salesman) {
            console.log(`Salesman already exists for User ${username}.`);
        } else {
            const count = await Salesman.countDocuments();
            const code = `SM${String(count + 1).padStart(4, '0')}`;

            salesman = await Salesman.create({
                name: salesmanName,
                code: code,
                userId: user._id,
                email: email,
                isActive: true
            });
            console.log(`Created new Salesman: ${salesman.name} (Code: ${salesman.code}) linked to User ID: ${user._id}`);
        }

        await database.disconnect();
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error);
        if (mongoose.connection.readyState !== 0) {
            await database.disconnect();
        }
    }
}

createNewSalesman();
