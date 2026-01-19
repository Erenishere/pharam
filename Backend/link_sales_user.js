require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Salesman = require('./src/models/Salesman');
const database = require('./src/config/database');

async function linkSalesUser() {
    try {
        await database.connect();

        const username = 'sales_user';
        const user = await User.findOne({ username });

        if (!user) {
            console.log(`User ${username} not found.`);
        } else {
            let salesman = await Salesman.findOne({ userId: user._id });
            if (salesman) {
                console.log(`Salesman already exists for User ${username}.`);
            } else {
                const count = await Salesman.countDocuments();
                const code = `SM${String(count + 1).padStart(4, '0')}`;

                salesman = await Salesman.create({
                    name: 'Sales User Salesman',
                    code: code,
                    userId: user._id,
                    email: user.email,
                    isActive: true
                });
                console.log(`Created new Salesman: ${salesman.name} (Code: ${salesman.code}) linked to User ID: ${user._id}`);
            }
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

linkSalesUser();
