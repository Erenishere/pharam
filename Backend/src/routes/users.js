const express = require('express');
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, isValidObjectId, isValidRole } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/users/statistics
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get(
  '/statistics',
  authenticate,
  requireAdmin,
  userController.getUserStatistics,
);

/**
 * @route   GET /api/users/profile/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/profile/me',
  authenticate,
  userController.getMyProfile,
);

/**
 * @route   PUT /api/users/profile/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
  '/profile/me',
  authenticate,
  [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    validate,
  ],
  userController.updateMyProfile,
);

/**
 * @route   POST /api/users/profile/change-password
 * @desc    Change current user password
 * @access  Private
 */
router.post(
  '/profile/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validate,
  ],
  userController.changePassword,
);

/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role
 * @access  Private (Admin only)
 */
router.get(
  '/role/:role',
  authenticate,
  requireAdmin,
  [
    param('role')
      .custom(isValidRole)
      .withMessage('Invalid role. Must be one of: admin, sales, purchase, inventory, accountant, data_entry'),
    validate,
  ],
  userController.getUsersByRole,
);

/**
 * @route   GET /api/users
 * @desc    Get all users with optional filters and pagination
 * @access  Private (Admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('role')
      .optional()
      .custom(isValidRole)
      .withMessage('Invalid role'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search keyword must not be empty'),
    validate,
  ],
  userController.getAllUsers,
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .custom(isValidRole)
      .withMessage('Invalid role. Must be one of: admin, sales, purchase, inventory, accountant, data_entry'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    validate,
  ],
  userController.createUser,
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    validate,
  ],
  userController.getUserById,
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('role')
      .optional()
      .custom(isValidRole)
      .withMessage('Invalid role. Must be one of: admin, sales, purchase, inventory, accountant, data_entry'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    validate,
  ],
  userController.updateUser,
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    validate,
  ],
  userController.deleteUser,
);

/**
 * @route   POST /api/users/:id/restore
 * @desc    Restore soft-deleted user
 * @access  Private (Admin only)
 */
router.post(
  '/:id/restore',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    validate,
  ],
  userController.restoreUser,
);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private (Admin only)
 */
router.post(
  '/:id/reset-password',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validate,
  ],
  userController.resetPassword,
);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/role',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .custom(isValidRole)
      .withMessage('Invalid role. Must be one of: admin, sales, purchase, inventory, accountant, data_entry'),
    validate,
  ],
  userController.updateUserRole,
);

/**
 * @route   PATCH /api/users/:id/toggle-status
 * @desc    Toggle user active status
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  requireAdmin,
  [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Invalid user ID format'),
    validate,
  ],
  userController.toggleUserStatus,
);

module.exports = router;
