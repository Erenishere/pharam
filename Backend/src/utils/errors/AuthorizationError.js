const AppError = require('./AppError');

/**
 * Authorization Error
 * Used for authorization/permission failures
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied', code = 'ACCESS_DENIED', details = null) {
    super(message, 403, code, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Insufficient Permissions Error
 */
class InsufficientPermissionsError extends AuthorizationError {
  constructor(requiredRoles = []) {
    super(
      'You do not have permission to perform this action',
      'INSUFFICIENT_PERMISSIONS',
      { requiredRoles }
    );
    this.name = 'InsufficientPermissionsError';
  }
}

/**
 * Account Inactive Error
 */
class AccountInactiveError extends AuthorizationError {
  constructor() {
    super('Your account is inactive', 'ACCOUNT_INACTIVE');
    this.name = 'AccountInactiveError';
  }
}

module.exports = {
  AuthorizationError,
  InsufficientPermissionsError,
  AccountInactiveError,
};
