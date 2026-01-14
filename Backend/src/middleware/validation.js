const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator
 * Should be used after validation rules in route handlers
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = [];
    errors.array().map((err) => extractedErrors.push({
      field: err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      error: 'Validation error',
      message: 'Invalid input data',
      details: extractedErrors,
    });
  }

  next();
};

/**
 * Custom validation helper to check if value is valid MongoDB ObjectId
 */
const isValidObjectId = (value) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(value);
};

/**
 * Custom validation helper to check if value is valid date
 */
const isValidDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !Number.isNaN(date.getTime());
};

/**
 * Custom validation helper to check if value is a valid role
 */
const isValidRole = (value) => {
  const validRoles = ['admin', 'sales', 'purchase', 'inventory', 'accountant', 'data_entry'];
  return validRoles.includes(value);
};

/**
 * Custom validation helper to check if value is a positive number
 */
const isPositiveNumber = (value) => {
  const num = Number(value);
  return !Number.isNaN(num) && num > 0;
};

/**
 * Custom validation helper to check if value is a non-negative number
 */
const isNonNegativeNumber = (value) => {
  const num = Number(value);
  return !Number.isNaN(num) && num >= 0;
};

/**
 * Custom validation helper to check if string is not empty after trimming
 */
const isNotEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Custom validation helper to check if email is valid
 */
const isValidEmail = (value) => {
  const emailPattern = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailPattern.test(value);
};

/**
 * Custom validation helper to check if password meets requirements
 */
const isValidPassword = (value) =>
  // At least 6 characters
  typeof value === 'string' && value.length >= 6;
/**
 * Custom validation helper to check if phone number is valid (Pakistan format)
 */
const isValidPhone = (value) => {
  // Accept various Pakistan phone formats
  const phonePattern = /^(\+92|0)?[0-9]{10}$/;
  return phonePattern.test(value.replace(/[-\s]/g, ''));
};

/**
 * Custom validation helper to check if CNIC is valid (Pakistan format)
 */
const isValidCNIC = (value) => {
  // Pakistan CNIC format: 12345-1234567-1
  const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
  return cnicPattern.test(value);
};

/**
 * Custom validation helper to check if NTN is valid (Pakistan tax number)
 */
const isValidNTN = (value) => {
  // Pakistan NTN format: 7 digits
  const ntnPattern = /^[0-9]{7}$/;
  return ntnPattern.test(value);
};

/**
 * Custom validation helper to check if STRN is valid (Sales Tax Registration Number)
 */
const isValidSTRN = (value) => {
  // Pakistan STRN format: Various formats possible
  const strnPattern = /^[0-9-]+$/;
  return strnPattern.test(value);
};

/**
 * Sanitize string input by trimming whitespace
 */
const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : value);

/**
 * Sanitize and normalize email
 */
const sanitizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/**
 * Sanitize numeric input
 */
const sanitizeNumber = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
};

module.exports = {
  validate,
  isValidObjectId,
  isValidDate,
  isValidRole,
  isPositiveNumber,
  isNonNegativeNumber,
  isNotEmptyString,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidCNIC,
  isValidNTN,
  isValidSTRN,
  sanitizeString,
  sanitizeEmail,
  sanitizeNumber,
};
