require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set in .env');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('   Username: admin');
      console.log('   Password: admin123456');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create test admin user
    const testUser = new User({
      username: 'admin',
      email: 'admin@pharam.com',
      password: 'admin123456',
      role: 'admin',
      isActive: true,
    });

    await testUser.save();

    console.log('✅ Test user created successfully!');
    console.log('   Username: admin');
    console.log('   Email: admin@pharam.com');
    console.log('   Password: admin123456');
    console.log('   Role: admin');

    // Verify the user can be found
    const verifyUser = await User.findOne({ username: 'admin' });
    console.log('\n✅ Verification - User found in database');
    console.log('   ID:', verifyUser._id);
    console.log('   Username:', verifyUser.username);
    console.log('   Email:', verifyUser.email);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
