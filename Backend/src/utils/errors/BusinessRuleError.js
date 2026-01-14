const AppError = require('./AppError');

/**
 * Business Rule Violation Error
 * Used when business logic rules are violated
 */
class BusinessRuleError extends AppError {
  constructor(message, code = 'BUSINESS_RULE_VIOLATION', details = null) {
    super(message, 422, code, details);
    this.name = 'BusinessRuleError';
  }
}

/**
 * Credit Limit Exceeded Error
 */
class CreditLimitExceededError extends BusinessRuleError {
  constructor(details) {
    super(
      `Invoice amount exceeds customer credit limit`,
      'CREDIT_LIMIT_EXCEEDED',
      details
    );
    this.name = 'CreditLimitExceededError';
  }
}

/**
 * Insufficient Stock Error
 */
class InsufficientStockError extends BusinessRuleError {
  constructor(details) {
    super(
      'Insufficient stock for one or more items',
      'INSUFFICIENT_STOCK',
      details
    );
    this.name = 'InsufficientStockError';
  }
}

/**
 * Invalid Invoice Status Error
 */
class InvalidInvoiceStatusError extends BusinessRuleError {
  constructor(currentStatus, attemptedAction) {
    super(
      `Cannot ${attemptedAction} invoice with status: ${currentStatus}`,
      'INVALID_INVOICE_STATUS',
      { currentStatus, attemptedAction }
    );
    this.name = 'InvalidInvoiceStatusError';
  }
}

/**
 * Cannot Modify Confirmed Invoice Error
 */
class CannotModifyConfirmedInvoiceError extends BusinessRuleError {
  constructor() {
    super(
      'Cannot modify confirmed or paid invoice',
      'CANNOT_MODIFY_CONFIRMED_INVOICE'
    );
    this.name = 'CannotModifyConfirmedInvoiceError';
  }
}

/**
 * Cannot Cancel Paid Invoice Error
 */
class CannotCancelPaidInvoiceError extends BusinessRuleError {
  constructor() {
    super(
      'Cannot cancel paid invoice. Please process a refund instead.',
      'CANNOT_CANCEL_PAID_INVOICE'
    );
    this.name = 'CannotCancelPaidInvoiceError';
  }
}

/**
 * Duplicate Entry Error
 */
class DuplicateEntryError extends BusinessRuleError {
  constructor(field, value) {
    super(
      `${field} already exists: ${value}`,
      'DUPLICATE_ENTRY',
      { field, value }
    );
    this.name = 'DuplicateEntryError';
  }
}

/**
 * Invalid Batch Dates Error
 */
class InvalidBatchDatesError extends BusinessRuleError {
  constructor() {
    super(
      'Expiry date must be after manufacturing date',
      'INVALID_BATCH_DATES'
    );
    this.name = 'InvalidBatchDatesError';
  }
}

/**
 * Batch Expired Error
 */
class BatchExpiredError extends BusinessRuleError {
  constructor(batchNumber, expiryDate) {
    super(
      `Batch ${batchNumber} has expired`,
      'BATCH_EXPIRED',
      { batchNumber, expiryDate }
    );
    this.name = 'BatchExpiredError';
  }
}

module.exports = {
  BusinessRuleError,
  CreditLimitExceededError,
  InsufficientStockError,
  InvalidInvoiceStatusError,
  CannotModifyConfirmedInvoiceError,
  CannotCancelPaidInvoiceError,
  DuplicateEntryError,
  InvalidBatchDatesError,
  BatchExpiredError,
};
