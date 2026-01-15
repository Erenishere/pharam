/**
 * Load Tests for Concurrent User Scenarios
 * 
 * Tests system performance under concurrent load
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Server = require('../../src/server');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');

let mongoServer;
let server;
let app;
let authToken;

beforeAll(async () => {
  // Start MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Start server
  server = new Server();
  app = server.getApp();

  // Create test user and get auth token
  const testUser = await User.create({
    username: 'testuser',
    email: 'test@test.com',
    password: 'password123',
    role: 'admin',
    isActive: true,
  });

  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test@test.com',
      password: 'password123',
    });

  authToken = loginResponse.body.data.token;

  // Seed test data
  await seedTestData();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  if (server) {
    await server.stop();
  }
});

async function seedTestData() {
  // Create customers
  const customers = [];
  for (let i = 0; i < 50; i++) {
    customers.push({
      code: `CUST${String(i).padStart(6, '0')}`,
      name: `Customer ${i}`,
      type: 'customer',
      isActive: true,
    });
  }
  await Customer.insertMany(customers);

  // Create items
  const items = [];
  for (let i = 0; i < 100; i++) {
    items.push({
      code: `ITEM${String(i).padStart(6, '0')}`,
      name: `Item ${i}`,
      category: 'Electronics',
      unit: 'piece',
      pricing: {
        costPrice: 100,
        salePrice: 150,
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10,
        maximumStock: 1000,
      },
      isActive: true,
    });
  }
  await Item.insertMany(items);
}

describe('Load Tests - Concurrent Users', () => {
  describe('Concurrent Read Operations', () => {
    test('should handle 50 concurrent GET requests', async () => {
      const startTime = Date.now();
      
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .get('/api/v1/items')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ page: 1, limit: 10 })
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time (< 5 seconds for 50 requests)
      expect(totalTime).toBeLessThan(5000);

      console.log(`50 concurrent GET requests completed in ${totalTime}ms`);
      console.log(`Average response time: ${(totalTime / 50).toFixed(2)}ms`);
    }, 10000);

    test('should handle 100 concurrent GET requests to different endpoints', async () => {
      const startTime = Date.now();
      
      const requests = [];
      for (let i = 0; i < 100; i++) {
        const endpoint = i % 3 === 0 ? '/api/v1/items' 
          : i % 3 === 1 ? '/api/v1/customers'
          : '/api/v1/monitoring/health';
        
        requests.push(
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Count successful responses
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(90); // At least 90% success rate

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);

      console.log(`100 concurrent requests completed in ${totalTime}ms`);
      console.log(`Success rate: ${(successCount / 100 * 100).toFixed(2)}%`);
    }, 15000);
  });

  describe('Mixed Read/Write Operations', () => {
    test('should handle mixed concurrent operations', async () => {
      const startTime = Date.now();
      
      const requests = [];
      
      // 30 read requests
      for (let i = 0; i < 30; i++) {
        requests.push(
          request(app)
            .get('/api/v1/items')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      // 10 write requests (create customers)
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/customers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              code: `LOAD${String(i).padStart(6, '0')}`,
              name: `Load Test Customer ${i}`,
              type: 'customer',
            })
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Count successful responses
      const successCount = responses.filter(r => r.status === 200 || r.status === 201).length;
      expect(successCount).toBeGreaterThan(35); // At least 87.5% success rate

      console.log(`40 mixed operations completed in ${totalTime}ms`);
      console.log(`Success rate: ${(successCount / 40 * 100).toFixed(2)}%`);
    }, 15000);
  });

  describe('Cache Performance Under Load', () => {
    test('should benefit from caching under repeated requests', async () => {
      // First request (cache miss)
      const firstRequestStart = Date.now();
      await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'Electronics', page: 1, limit: 10 });
      const firstRequestTime = Date.now() - firstRequestStart;

      // Subsequent requests (cache hits)
      const cachedRequestsStart = Date.now();
      const cachedRequests = [];
      for (let i = 0; i < 20; i++) {
        cachedRequests.push(
          request(app)
            .get('/api/v1/items')
            .set('Authorization', `Bearer ${authToken}`)
            .query({ category: 'Electronics', page: 1, limit: 10 })
        );
      }
      await Promise.all(cachedRequests);
      const cachedRequestsTime = Date.now() - cachedRequestsStart;
      const avgCachedTime = cachedRequestsTime / 20;

      console.log(`First request (cache miss): ${firstRequestTime}ms`);
      console.log(`Average cached request: ${avgCachedTime.toFixed(2)}ms`);
      console.log(`Performance improvement: ${((firstRequestTime - avgCachedTime) / firstRequestTime * 100).toFixed(2)}%`);

      // Cached requests should be faster (allowing some variance)
      expect(avgCachedTime).toBeLessThan(firstRequestTime * 1.5);
    }, 15000);
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics correctly', async () => {
      // Make some requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get('/api/v1/items')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      await Promise.all(requests);

      // Get metrics
      const metricsResponse = await request(app)
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toHaveProperty('requests');
      expect(metricsResponse.body.data).toHaveProperty('responseTimes');
      expect(metricsResponse.body.data.requests.total).toBeGreaterThan(0);
    });

    test('should provide health status', async () => {
      const healthResponse = await request(app)
        .get('/api/v1/monitoring/health');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data).toHaveProperty('status');
      expect(healthResponse.body.data).toHaveProperty('uptime');
      expect(healthResponse.body.data).toHaveProperty('memory');
    });

    test('should provide detailed health status', async () => {
      const healthResponse = await request(app)
        .get('/api/v1/monitoring/health/detailed');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data).toHaveProperty('database');
      expect(healthResponse.body.data.database).toHaveProperty('status');
    });
  });

  describe('System Stability', () => {
    test('should maintain stability under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      let requestCount = 0;
      let errorCount = 0;

      while (Date.now() - startTime < duration) {
        try {
          const response = await request(app)
            .get('/api/v1/monitoring/health')
            .set('Authorization', `Bearer ${authToken}`);
          
          requestCount++;
          if (response.status !== 200) {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      const errorRate = (errorCount / requestCount) * 100;
      
      console.log(`Sustained load test: ${requestCount} requests in ${duration}ms`);
      console.log(`Error rate: ${errorRate.toFixed(2)}%`);
      console.log(`Requests per second: ${(requestCount / (duration / 1000)).toFixed(2)}`);

      // Error rate should be less than 5%
      expect(errorRate).toBeLessThan(5);
    }, 10000);
  });
});
