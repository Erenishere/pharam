/**
 * E2E Test Setup
 * Configures test environment and mocks for E2E tests
 */

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

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pharam_e2e_test';

// Increase test timeout for E2E tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
    createAuthToken: async (user) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    }
};
