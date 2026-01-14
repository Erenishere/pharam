const request = require('supertest');
const app = require('../../src/app');
const { connectDB, closeDB, clearDB } = require('../setup/testDb');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const authService = require('../../src/services/authService');

describe('Error Handling Integration Tests', () => {
  let authToken;
  let adminUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Create admin user
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    // Generate auth token
    authToken = authService.generateToken(adminUser);
  });

  describe('404 Not Found Errors', () => {
    it('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/invoices/sales/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('401 Authentication Errors', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app).get('/api/invoices/sales');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/invoices/sales')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for expired token', async () => {
      // Create an expired token (this would require mocking or using a very short expiry)
      const expiredToken = authService.generateToken(adminUser, '1ms');
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/invoices/sales')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('403 Authorization Errors', () => {
    it('should return 403 when user lacks required role', async () => {
      // Create a user with limited permissions
      const limitedUser = await User.create({
        username: 'limited',
        email: 'limited@test.com',
        password: 'password123',
        role: 'data_entry',
        isActive: true,
      });

      const limitedToken = authService.generateToken(limitedUser);

      const response = await request(app)
        .delete('/api/invoices/sales/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${limitedToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('400 Validation Errors', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/invoices/sales/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return validation errors with field details', async () => {
      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'invalid-id',
          items: [
            {
              itemId: 'invalid-id',
              quantity: -5, // Invalid quantity
              unitPrice: -100, // Invalid price
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });

  describe('422 Business Rule Errors', () => {
    let customer, item;

    beforeEach(async () => {
      // Create test customer with credit limit
      customer = await Customer.create({
        code: 'CUST001',
        name: 'Test Customer',
        type: 'customer',
        contactInfo: {
          phone: '1234567890',
          email: 'customer@test.com',
          address: 'Test Address',
        },
        financialInfo: {
          creditLimit: 1000,
          paymentTerms: 30,
        },
        isActive: true,
      });

      // Create test item with limited stock
      item = await Item.create({
        code: 'ITEM001',
        name: 'Test Item',
        category: 'Test',
        unit: 'piece',
        pricing: {
          costPrice: 50,
          salePrice: 100,
        },
        tax: {
          gstRate: 17,
          whtRate: 0,
        },
        inventory: {
          currentStock: 5,
          minimumStock: 2,
          maximumStock: 100,
        },
        isActive: true,
      });
    });

    it('should return 422 for credit limit exceeded', async () => {
      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer._id.toString(),
          items: [
            {
              itemId: item._id.toString(),
              quantity: 2,
              unitPrice: 1000, // Total will exceed credit limit
              discount: 0,
            },
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CREDIT_LIMIT_EXCEEDED');
    });

    it('should return 422 for insufficient stock', async () => {
      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer._id.toString(),
          items: [
            {
              itemId: item._id.toString(),
              quantity: 100, // More than available stock
              unitPrice: 10,
              discount: 0,
            },
          ],
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should return 422 when trying to modify confirmed invoice', async () => {
      // First create and confirm an invoice
      const createResponse = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer._id.toString(),
          items: [
            {
              itemId: item._id.toString(),
              quantity: 2,
              unitPrice: 100,
              discount: 0,
            },
          ],
        });

      const invoiceId = createResponse.body.data._id;

      // Confirm the invoice
      await request(app)
        .patch(`/api/invoices/sales/${invoiceId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to update the confirmed invoice
      const updateResponse = await request(app)
        .put(`/api/invoices/sales/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              itemId: item._id.toString(),
              quantity: 1,
              unitPrice: 100,
              discount: 0,
            },
          ],
        });

      expect(updateResponse.status).toBe(422);
      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.error.code).toBe('CANNOT_MODIFY_CONFIRMED_INVOICE');
    });
  });

  describe('409 Conflict Errors', () => {
    it('should return 409 for duplicate entry', async () => {
      // Create first customer
      await Customer.create({
        code: 'CUST001',
        name: 'Customer 1',
        type: 'customer',
        contactInfo: {
          phone: '1234567890',
          email: 'customer1@test.com',
          address: 'Address 1',
        },
        isActive: true,
      });

      // Try to create another customer with same code
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'CUST001', // Duplicate code
          name: 'Customer 2',
          type: 'customer',
          contactInfo: {
            phone: '0987654321',
            email: 'customer2@test.com',
            address: 'Address 2',
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_ENTRY');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include error details when available', async () => {
      const response = await request(app)
        .post('/api/invoices/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'invalid-id',
          items: [],
        });

      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    it('should not leak sensitive information in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).not.toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
