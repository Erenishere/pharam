/**
 * Central export for all error classes
 */

const AppError = require('./AppError');
const ValidationError = require('./ValidationError');

const {
  BusinessRuleError,
  CreditLimitExceededError,
  InsufficientStockError,
  InvalidInvoiceStatusError,
  CannotModifyConfirmedInvoiceError,
  CannotCancelPaidInvoiceError,
  DuplicateEntryError,
  InvalidBatchDatesError,
  BatchExpiredError,
} = require('./BusinessRuleError');

const {
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  TokenMissingError,
} = require('./AuthenticationError');

const {
  AuthorizationError,
  InsufficientPermissionsError,
  AccountInactiveError,
} = require('./AuthorizationError');

const {
  NotFoundError,
  InvoiceNotFoundError,
  CustomerNotFoundError,
  SupplierNotFoundError,
  ItemNotFoundError,
  UserNotFoundError,
} = require('./NotFoundError');

const {
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
} = require('./DatabaseError');

module.exports = {
  // Base error
  AppError,

  // Validation errors
  ValidationError,

  // Business rule errors
  BusinessRuleError,
  CreditLimitExceededError,
  InsufficientStockError,
  InvalidInvoiceStatusError,
  CannotModifyConfirmedInvoiceError,
  CannotCancelPaidInvoiceError,
  DuplicateEntryError,
  InvalidBatchDatesError,
  BatchExpiredError,

  // Authentication errors
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  TokenMissingError,

  // Authorization errors
  AuthorizationError,
  InsufficientPermissionsError,
  AccountInactiveError,

  // Not found errors
  NotFoundError,
  InvoiceNotFoundError,
  CustomerNotFoundError,
  SupplierNotFoundError,
  ItemNotFoundError,
  UserNotFoundError,

  // Database errors
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
};
