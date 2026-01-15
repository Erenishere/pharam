const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const database = require('../../src/config/database');

describe('User Management Integration Tests', () => {
  let app;
  let server;
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let testUserId;

  beforeAll(async () => {
    // Start server
    const serverInstance = new Server();
    server = serverInstance;
    app = serverInstance.getApp();

    // Connect to test database
    await database.connect();

    // Clean up test data
    await User.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Create regular user
    regularUser = await User.create({
      username: 'regularuser',
      email: 'regular@example.com',
      password: 'password123',
      role: 'sales',
      isActive: true,
    });

    // Login admin user
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'adminuser',
        password: 'password123',
      });
    adminToken = adminLoginResponse.body.data.accessToken;

    // Login regular user
    const regularLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'regularuser',
        password: 'password123',
      });
    regularToken = regularLoginResponse.body.data.accessToken;
  }, 60000);

  afterEach(async () => {
    // Clean up only test users, not admin and regular users
    await User.deleteMany({
      username: { $nin: ['adminuser', 'regularuser'] },
    });
  });

  afterAll(async () => {
    // Clean up all test data
    await User.deleteMany({});

    // Disconnect database and stop server
    await database.disconnect();
    if (server) {
      await server.stop();
    }
  }, 30000);

  describe('POST /api/users - Create User', () => {
    it('should create a new user successfully as admin', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'sales',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body.data).toHaveProperty('username', 'newuser');
      expect(response.body.data).toHaveProperty('email', 'newuser@example.com');
      expect(response.body.data).toHaveProperty('role', 'sales');
      expect(response.body.data).not.toHaveProperty('password');

      testUserId = response.body.data._id;
    });

    it('should fail to create user without admin role', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          username: 'anotheruser',
          email: 'another@example.com',
          password: 'password123',
          role: 'sales',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create user with duplicate username', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'different@example.com',
          password: 'password123',
          role: 'sales',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to create user with duplicate email', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'differentuser',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'sales',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to create user with invalid role', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'invalidrole',
          email: 'invalidrole@example.com',
          password: 'password123',
          role: 'invalid_role',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail to create user with short password', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'shortpass',
          email: 'shortpass@example.com',
          password: '12345',
          role: 'sales',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail to create user with missing required fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'incomplete',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail to create user without authentication', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'noauth',
          email: 'noauth@example.com',
          password: 'password123',
          role: 'sales',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users - Get All Users', () => {
    it('should get all users with pagination as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('itemsPerPage', 10);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ role: 'admin' })
        .expect(200);

      expect(response.body.data.every((user) => user.role === 'admin')).toBe(true);
    });

    it('should filter users by active status', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ isActive: true })
        .expect(200);

      expect(response.body.data.every((user) => user.isActive === true)).toBe(true);
    });

    it('should search users by keyword', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'admin' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail to get users without admin role', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to get users without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/:id - Get User by ID', () => {
    it('should get user by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', testUserId);
      expect(response.body.data).toHaveProperty('username', 'newuser');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail to get user with invalid ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail to get non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should fail to get user without admin role', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/profile/me - Get My Profile', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', 'regularuser');
      expect(response.body.data).toHaveProperty('role', 'sales');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/users/:id - Update User', () => {
    it('should update user as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'updateduser',
          email: 'updated@example.com',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', 'updateduser');
      expect(response.body.data).toHaveProperty('email', 'updated@example.com');
    });

    it('should fail to update user without admin role', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          username: 'shouldfail',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to update with duplicate username', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'adminuser',
        })
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail to update non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'nonexistent',
        })
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PUT /api/users/profile/me - Update My Profile', () => {
    it('should update own profile', async () => {
      const response = await request(app)
        .put('/api/users/profile/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          username: 'updatedregular',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', 'updatedregular');
      expect(response.body.data).toHaveProperty('role', 'sales'); // Role should not change
    });

    it('should not allow role change through profile update', async () => {
      const response = await request(app)
        .put('/api/users/profile/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          role: 'admin',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('role', 'sales'); // Role should remain unchanged
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile/me')
        .send({
          username: 'shouldfail',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/profile/change-password - Change Password', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/users/profile/change-password')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'updatedregular',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('success', true);

      // Update token for future tests
      regularToken = loginResponse.body.data.accessToken;
    });

    it('should fail with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/users/profile/change-password')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456',
        })
        .expect(400);

      expect(response.body.error.message).toContain('Current password is incorrect');
    });

    it('should fail with short new password', async () => {
      const response = await request(app)
        .post('/api/users/profile/change-password')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          currentPassword: 'newpassword123',
          newPassword: '12345',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/users/profile/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/users/:id/role - Update User Role', () => {
    it('should update user role as admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'purchase',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('role', 'purchase');
    });

    it('should fail to update role without admin privileges', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          role: 'admin',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'invalid_role',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('PATCH /api/users/:id/toggle-status - Toggle User Status', () => {
    it('should toggle user status as admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);

      // Toggle back
      await request(app)
        .patch(`/api/users/${testUserId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should fail to toggle status without admin privileges', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/toggle-status`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/:id/reset-password - Reset Password', () => {
    it('should reset user password as admin', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newPassword: 'resetpassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Password reset successfully');
    });

    it('should fail to reset password without admin privileges', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          newPassword: 'shouldfail123',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newPassword: '12345',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('DELETE /api/users/:id - Delete User', () => {
    it('should soft delete user as admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', false);
    });

    it('should fail to delete user without admin privileges', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail to delete non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/users/:id/restore - Restore User', () => {
    it('should restore soft-deleted user as admin', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should fail to restore already active user', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('already active');
    });

    it('should fail to restore without admin privileges', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/restore`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/role/:role - Get Users by Role', () => {
    it('should get users by role as admin', async () => {
      const response = await request(app)
        .get('/api/users/role/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every((user) => user.role === 'sales')).toBe(true);
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .get('/api/users/role/invalid_role')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should fail without admin privileges', async () => {
      const response = await request(app)
        .get('/api/users/role/sales')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/statistics - Get User Statistics', () => {
    it('should get user statistics as admin', async () => {
      const response = await request(app)
        .get('/api/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('inactive');
      expect(response.body.data).toHaveProperty('byRole');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should fail without admin privileges', async () => {
      const response = await request(app)
        .get('/api/users/statistics')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users/statistics')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
