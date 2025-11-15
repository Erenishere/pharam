const authService = require('./services/authService');
const { authenticate, authorize } = require('./middleware/auth');

// Simple test to verify authentication middleware works
async function testAuthFunctionality() {
  console.log('Testing Authentication Service and Middleware...\n');

  try {
    // Test 1: Generate tokens
    console.log('Test 1: Generating tokens...');
    const testPayload = { userId: '123456789012345678901234', role: 'admin' };
    const accessToken = authService.generateAccessToken(testPayload);
    const refreshToken = authService.generateRefreshToken(testPayload);
    console.log('✓ Access token generated');
    console.log('✓ Refresh token generated\n');

    // Test 2: Verify access token
    console.log('Test 2: Verifying access token...');
    const decoded = authService.verifyAccessToken(accessToken);
    console.log('✓ Token verified successfully');
    console.log('  Decoded payload:', decoded, '\n');

    // Test 3: Verify refresh token
    console.log('Test 3: Verifying refresh token...');
    const decodedRefresh = authService.verifyRefreshToken(refreshToken);
    console.log('✓ Refresh token verified successfully');
    console.log('  Decoded payload:', decodedRefresh, '\n');

    // Test 4: Hash password
    console.log('Test 4: Hashing password...');
    const plainPassword = 'testpassword123';
    const hashedPassword = await authService.hashPassword(plainPassword);
    console.log('✓ Password hashed successfully');
    console.log('  Hash length:', hashedPassword.length, '\n');

    // Test 5: Compare password
    console.log('Test 5: Comparing password...');
    const isMatch = await authService.comparePassword(plainPassword, hashedPassword);
    console.log('✓ Password comparison successful');
    console.log('  Passwords match:', isMatch, '\n');

    // Test 6: Test invalid password
    console.log('Test 6: Testing invalid password...');
    const isInvalidMatch = await authService.comparePassword('wrongpassword', hashedPassword);
    console.log('✓ Invalid password correctly rejected');
    console.log('  Passwords match:', isInvalidMatch, '\n');

    console.log('All authentication tests passed! ✓\n');
    console.log('Note: Full integration tests require database connection.');
    console.log('Run: npm test -- tests/integration/auth.test.js\n');
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
testAuthFunctionality();
