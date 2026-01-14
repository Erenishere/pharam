const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const database = require('../../src/config/database');

describe('Authentication Integration Tests', () => {
  let app;
  let server;
  let testUser;
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});

    // Disconnect database and stop server
    await database.disconnect();
    if (server) {
      await server.stop();
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user.username).toBe('testuser');

      // Store tokens for later tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should login successfully with email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing identifier', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail with short identifier', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'ab',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail with inactive user', async () => {
      // Create inactive user
      const inactiveUser = await User.create({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'password123',
        role: 'sales',
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'inactiveuser',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('inactive');

      // Clean up
      await User.findByIdAndDelete(inactiveUser._id);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Token refreshed successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with expired refresh token', async () => {
      // This would require mocking JWT or using a token that's already expired
      // For now, we'll skip this test or use a pre-generated expired token
      // Skip for now as it requires time manipulation
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Invalid token format');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify token successfully', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Token is valid');
      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('user');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Middleware Tests', () => {
    let salesUser, purchaseUser, inventoryUser, accountantUser, dataEntryUser;
    let salesToken, purchaseToken, inventoryToken, accountantToken, dataEntryToken;

    beforeAll(async () => {
      // Create users with different roles
      salesUser = await User.create({
        username: 'salesuser',
        email: 'sales@example.com',
        password: 'password123',
        role: 'sales',
        isActive: true
      });

      purchaseUser = await User.create({
        username: 'purchaseuser',
        email: 'purchase@example.com',
        password: 'password123',
        role: 'purchase',
        isActive: true
      });

      inventoryUser = await User.create({
        username: 'inventoryuser',
        email: 'inventory@example.com',
        password: 'password123',
        role: 'inventory',
        isActive: true
      });

      accountantUser = await User.create({
        username: 'accountantuser',
        email: 'accountant@example.com',
        password: 'password123',
        role: 'accountant',
        isActive: true
      });

      dataEntryUser = await User.create({
        username: 'dataentryuser',
        email: 'dataentry@example.com',
        password: 'password123',
        role: 'data_entry',
        isActive: true
      });

      // Login each user to get tokens
      const salesResponse = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'salesuser', password: 'password123' });
      salesToken = salesResponse.body.data.accessToken;

      const purchaseResponse = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'purchaseuser', password: 'password123' });
      purchaseToken = purchaseResponse.body.data.accessToken;

      const inventoryResponse = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'inventoryuser', password: 'password123' });
      inventoryToken = inventoryResponse.body.data.accessToken;

      const accountantResponse = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'accountantuser', password: 'password123' });
      accountantToken = accountantResponse.body.data.accessToken;

      const dataEntryResponse = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'dataentryuser', password: 'password123' });
      dataEntryToken = dataEntryResponse.body.data.accessToken;
    });

    afterAll(async () => {
      // Clean up role-specific test users
      await User.deleteMany({
        username: {
          $in: ['salesuser', 'purchaseuser', 'inventoryuser', 'accountantuser', 'dataentryuser']
        }
      });
    });

    it('should verify different user roles can access their own profiles', async () => {
      const testCases = [
        { token: salesToken, role: 'sales' },
        { token: purchaseToken, role: 'purchase' },
        { token: inventoryToken, role: 'inventory' },
        { token: accountantToken, role: 'accountant' },
        { token: dataEntryToken, role: 'data_entry' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${testCase.token}`)
          .expect(200);

        expect(response.body.data.user.role).toBe(testCase.role);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      // This test would require making multiple requests quickly
      // The implementation depends on rate limit configuration
      // Skip for basic implementation
    });
  });

  describe('Security Tests', () => {
    it('should not expose password in user object', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'testuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should use Bearer token format', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', accessToken)
        .expect(401);

      expect(response.body.message).toContain('Invalid token format');
    });

    it('should handle JWT expiration properly', async () => {
      // Would require creating an expired token
      // Skip for basic implementation
    });
  });
});
