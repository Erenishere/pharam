// Mock SMS service to avoid Twilio dependency in tests
jest.mock('../src/services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue({
    _id: 'mock-sms-id',
    phoneNumber: '1234567890',
    message: 'Test message',
    status: 'sent'
  }),
  renderTemplate: jest.fn((templateId, variables) => `Mock template ${templateId}`),
  getSMSTemplates: jest.fn().mockReturnValue([]),
  getSMSHistory: jest.fn().mockResolvedValue([]),
  getSMSStats: jest.fn().mockResolvedValue({
    totalSent: 0,
    totalFailed: 0
  })
}));

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_TEST_URI = mongoUri;
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after each test
// Note: Individual test files should handle their own cleanup
// to avoid conflicts with test data
afterEach(async () => {
  // Skip cleanup - let individual test files handle it
  // This prevents conflicts with test users and tokens
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

// Global test utilities
global.testUtils = {
  // Helper function to create test data
  createTestUser: () => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpassword123',
    role: 'user'
  }),

  // Helper function to generate random string
  generateRandomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  }
};