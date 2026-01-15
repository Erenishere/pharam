const AppError = require('./AppError');

/**
 * Not Found Error
 * Used when a requested resource is not found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = null) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;

    super(message, 404, 'NOT_FOUND', { resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Invoice Not Found Error
 */
class InvoiceNotFoundError extends NotFoundError {
  constructor(invoiceId) {
    super('Invoice', invoiceId);
    this.name = 'InvoiceNotFoundError';
  }
}

/**
 * Customer Not Found Error
 */
class CustomerNotFoundError extends NotFoundError {
  constructor(customerId) {
    super('Customer', customerId);
    this.name = 'CustomerNotFoundError';
  }
}

/**
 * Supplier Not Found Error
 */
class SupplierNotFoundError extends NotFoundError {
  constructor(supplierId) {
    super('Supplier', supplierId);
    this.name = 'SupplierNotFoundError';
  }
}

/**
 * Item Not Found Error
 */
class ItemNotFoundError extends NotFoundError {
  constructor(itemId) {
    super('Item', itemId);
    this.name = 'ItemNotFoundError';
  }
}

/**
 * User Not Found Error
 */
class UserNotFoundError extends NotFoundError {
  constructor(userId) {
    super('User', userId);
    this.name = 'UserNotFoundError';
  }
}

module.exports = {
  NotFoundError,
  InvoiceNotFoundError,
  CustomerNotFoundError,
  SupplierNotFoundError,
  ItemNotFoundError,
  UserNotFoundError,
};
