const AppError = require('../utils/errors/AppError');
const { ValidationError } = require('../utils/errors');

/**
 * Error Logger
 * Logs errors with appropriate detail level based on environment
 */
const logError = (err, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
    },
  };

  // Log stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorLog.stack = err.stack;
  }

  // Log operational errors as warnings, programming errors as errors
  if (err.isOperational) {
    console.warn('Operational Error:', JSON.stringify(errorLog, null, 2));
  } else {
    console.error('Programming Error:', JSON.stringify(errorLog, null, 2));
    if (err.stack) {
      console.error(err.stack);
    }
  }

  // In production, you would send this to a logging service
  // Example: winston, bunyan, or cloud logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service (e.g., CloudWatch, Datadog, Sentry)
    // logger.error(errorLog);
  }
};

/**
 * Handle Mongoose Validation Errors
 */
const handleMongooseValidationError = (err) => {
  const errors = Object.values(err.errors).map((error) => ({
    field: error.path,
    message: error.message,
    value: error.value,
  }));

  return new ValidationError('Validation failed', errors);
};

/**
 * Handle Mongoose Cast Errors (Invalid ObjectId)
 */
const handleMongooseCastError = (err) => {
  return new ValidationError(
    `Invalid ${err.path}: ${err.value}`,
    [{ field: err.path, message: 'Invalid ID format', value: err.value }]
  );
};

/**
 * Handle Mongoose Duplicate Key Errors
 */
const handleMongooseDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  return new AppError(
    `${field} already exists: ${value}`,
    409,
    'DUPLICATE_ENTRY',
    { field, value }
  );
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () => {
  return new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
};

/**
 * Send Error Response in Development
 */
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      ...(err.details && { details: err.details }),
    },
    stack: err.stack,
    timestamp: err.timestamp || new Date().toISOString(),
  });
};

/**
 * Send Error Response in Production
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      timestamp: err.timestamp || new Date().toISOString(),
    });
  } else {
    // Programming or unknown error: don't leak error details
    console.error('ERROR 💥', err);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Global Error Handler Middleware
 * Handles all errors thrown in the application
 */
const errorHandler = (err, req, res, next) => {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Log the error
  logError(err, req);

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.stack = err.stack;

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    error = handleMongooseValidationError(err);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = handleMongooseCastError(err);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error = handleMongooseDuplicateKeyError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Send error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    // Ensure error is operational for production
    if (!error.isOperational) {
      error = new AppError(
        'Something went wrong. Please try again later.',
        500,
        'INTERNAL_ERROR'
      );
    }
    sendErrorProd(error, req, res);
  }
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      url: req.originalUrl,
    }
  );
  next(error);
};

/**
 * Unhandled Rejection Handler
 * Handles unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, you might want to gracefully shutdown
    // process.exit(1);
  });
};

/**
 * Uncaught Exception Handler
 * Handles uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Gracefully shutdown
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  logError,
  handleUnhandledRejection,
  handleUncaughtException,
};
