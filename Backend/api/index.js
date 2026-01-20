require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const apiRoutes = require('../src/routes');
const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
const {
  responseTimeMiddleware,
  requestTrackingMiddleware,
} = require('../src/middleware/performanceMonitoring');

let isConnected = false;
let connectionPromise = null;

const connectToDatabase = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    
    if (connectionPromise) {
        return connectionPromise;
    }
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    
    connectionPromise = (async () => {
        try {
            await mongoose.connect(mongoUri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            isConnected = true;
            console.log('Connected to MongoDB via Vercel');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            connectionPromise = null;
            throw error;
        }
    })();
    
    return connectionPromise;
};

const app = express();

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.use(responseTimeMiddleware);
app.use(requestTrackingMiddleware);
app.use(helmet());
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Pharam API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api',
        },
        timestamp: new Date().toISOString(),
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

app.use(async (req, res, next) => {
    if (req.path === '/' || req.path === '/health') {
        return next();
    }
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Database connection failed', 
            message: error.message 
        });
    }
});

app.use('/api', apiRoutes);

app.use('*', notFoundHandler);
app.use(errorHandler);

module.exports = app;
