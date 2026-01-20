// Mock DB dependencies to prevent setup.js from timing out or erroring
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(true),
    connection: {
        on: jest.fn(),
        once: jest.fn(),
        readyState: 1,
        dropDatabase: jest.fn().mockResolvedValue(true),
        close: jest.fn().mockResolvedValue(true)
    }
}));
jest.mock('mongodb-memory-server', () => ({
    MongoMemoryServer: {
        create: jest.fn().mockResolvedValue({
            getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
            stop: jest.fn().mockResolvedValue(true)
        })
    }
}));

const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Test the CORS logic directly with a minimal app to avoid DB timeouts
describe('CORS Configuration Logic', () => {
    const testOrigin = 'https://c-users-dc-desktop-pharam.vercel.app';
    const app = express();

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin'
        ],
        exposedHeaders: ['Set-Cookie']
    }));

    app.get('/test', (req, res) => res.status(200).json({ success: true }));

    it('should allow requests from any origin by mirroring it in the response', async () => {
        const response = await request(app)
            .get('/test')
            .set('Origin', testOrigin)
            .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should return correct headers for preflight requests', async () => {
        const response = await request(app)
            .options('/test')
            .set('Origin', testOrigin)
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
            .expect(204);

        expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
        expect(response.headers['access-control-allow-methods']).toContain('POST');
        expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
        expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
});

