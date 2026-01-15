const AppError = require('./AppError');

/**
 * Authentication Error
 * Used for authentication failures
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', code = 'AUTHENTICATION_FAILED') {
    super(message, 401, code);
    this.name = 'AuthenticationError';
  }
}

/**
 * Invalid Credentials Error
 */
class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Token Expired Error
 */
class TokenExpiredError extends AuthenticationError {
  constructor() {
    super('Authentication token has expired', 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}

/**
 * Invalid Token Error
 */
class InvalidTokenError extends AuthenticationError {
  constructor() {
    super('Invalid authentication token', 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}

/**
 * Token Missing Error
 */
class TokenMissingError extends AuthenticationError {
  constructor() {
    super('Authentication token is required', 'TOKEN_MISSING');
    this.name = 'TokenMissingError';
  }
}

module.exports = {
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  TokenMissingError,
};
