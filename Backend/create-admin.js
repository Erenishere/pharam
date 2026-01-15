require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const database = require('./src/config/database');

async function createAdmin() {
    try {
        console.log('Connecting to database...');
        await database.connect();

        const username = 'admin_new';
        const email = 'admin_new@industraders.com';
        const password = 'Admin@123';

        // Check if exists first
        const existing = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existing) {
            console.log(`User ${username} or ${email} already exists. Deleting...`);
            await User.deleteOne({ _id: existing._id });
        }

        console.log(`Creating new admin user: ${username}`);

        // Explicitly create using new User() + save() to ensure hooks run
        const newUser = new User({
            username,
            email,
            password, // Plain text here, hash hook will handle it
            role: 'admin',
            isActive: true
        });

        await newUser.save();

        console.log('\n✅ User created successfully!');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log(`Email: ${email}`);

    } catch (error) {
        console.error('Failed to create user:', error);
    } finally {
        await database.disconnect();
        process.exit(0);
    }
}

createAdmin();
