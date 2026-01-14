const AppError = require('./AppError');

/**
 * Validation Error
 * Used for input validation failures
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }

  static fromExpressValidator(errors) {
    const details = errors.array().map((err) => ({
      field: err.param || err.path,
      message: err.msg,
      value: err.value,
    }));

    return new ValidationError('Invalid input data', details);
  }
}

module.exports = ValidationError;
