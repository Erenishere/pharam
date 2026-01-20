const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('../routes');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const {
  responseTimeMiddleware,
  requestTrackingMiddleware,
} = require('../middleware/performanceMonitoring');

class ServerConfig {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Performance monitoring middleware (should be first)
    this.app.use(responseTimeMiddleware);
    this.app.use(requestTrackingMiddleware);

    // Security middleware
    this.app.use(helmet());

    // CORS configuration - Allow all origins for development
    const corsOptions = {
      origin: function (origin, callback) {
        // Allow all origins in development
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200,
    };
    this.app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupRoutes() {
    // Handle preflight requests
    this.app.options('*', cors());

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Pharam API Server',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          api: '/api',
          docs: '/api/docs',
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    });

    // API routes
    this.app.use('/api', apiRoutes);

    // 404 handler - must be after all routes
    this.app.use('*', notFoundHandler);
  }

  setupErrorHandling() {
    // Global error handler - must be last middleware
    this.app.use(errorHandler);
  }

  getApp() {
    return this.app;
  }
}

module.exports = ServerConfig;
