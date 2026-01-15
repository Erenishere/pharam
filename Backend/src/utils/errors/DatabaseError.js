const AppError = require('./AppError');

/**
 * Database Error
 * Used for database operation failures
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    const details = originalError
      ? {
          originalMessage: originalError.message,
          code: originalError.code,
        }
      : null;

    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Connection Error
 */
class ConnectionError extends DatabaseError {
  constructor(originalError = null) {
    super('Database connection failed', originalError);
    this.name = 'ConnectionError';
    this.code = 'DATABASE_CONNECTION_ERROR';
  }
}

/**
 * Query Error
 */
class QueryError extends DatabaseError {
  constructor(query, originalError = null) {
    super('Database query failed', originalError);
    this.name = 'QueryError';
    this.code = 'DATABASE_QUERY_ERROR';
    this.details = {
      ...this.details,
      query,
    };
  }
}

/**
 * Transaction Error
 */
class TransactionError extends DatabaseError {
  constructor(originalError = null) {
    super('Database transaction failed', originalError);
    this.name = 'TransactionError';
    this.code = 'DATABASE_TRANSACTION_ERROR';
  }
}

module.exports = {
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
};
