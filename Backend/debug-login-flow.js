require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
const database = require('./src/config/database');
const authService = require('./src/services/authService');

async function debugLoginFlow() {
    try {
        console.log('--- Debugging Login Flow (Deep Dive) ---\n');
        console.log('Connecting to database...');
        await database.connect();

        const username = 'admin_new';
        const password = 'Admin@123';

        console.log(`\n1. Finding user by identifier: "${username}"`);
        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!user) {
            console.error('❌ User NOT FOUND!');
            return;
        }
        console.log(`✅ User found: ID=${user._id}, Role=${user.role}, IsActive=${user.isActive}`);
        console.log(`   Stored Hashed Password: ${user.password}`);

        console.log('\n2. Verifying password hash format...');
        const isHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
        console.log(`   Is Valid BCrypt Hash Format? ${isHash ? 'YES' : 'NO'}`);

        console.log('\n3. Testing plain bcrypt.compare...');
        const directMatch = await bcrypt.compare(password, user.password);
        console.log(`   bcrypt.compare("${password}", HASH) => ${directMatch}`);

        console.log('\n4. Testing User model method comparePassword...');
        const modelMatch = await user.comparePassword(password);
        console.log(`   user.comparePassword("${password}") => ${modelMatch}`);

        console.log('\n5. Testing AuthService.authenticate()...');
        try {
            const result = await authService.authenticate(username, password);
            console.log('✅ AuthService.authenticate SUCCESS!');
            console.log('   Token generated:', result.accessToken.substring(0, 20) + '...');
        } catch (error) {
            console.error(`❌ AuthService.authenticate FAILED: ${error.message}`);
        }

    } catch (error) {
        console.error('Debug script crash:', error);
    } finally {
        await database.disconnect();
        process.exit(0);
    }
}

debugLoginFlow();
