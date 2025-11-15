const authService = require('../services/authService');

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header and validates it
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token format. Use Bearer <token>',
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
    }

    // Validate token and get user
    const user = await authService.validateTokenAndGetUser(token);

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid authentication token',
      });
    }

    if (error.message === 'User not found') {
      return res.status(401).json({
        error: 'User not found',
        message: 'User associated with this token no longer exists',
      });
    }

    if (error.message === 'User account is inactive') {
      return res.status(401).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated',
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during authentication',
    });
  }
};

/**
 * Middleware to authorize based on user roles
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
const authorize = (allowedRoles) => (req, res, next) => {
  try {
    // Check if user is attached to request (should be done by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Convert single role to array for consistent handling
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during authorization',
    });
  }
};

/**
 * Middleware for admin-only access
 */
const requireAdmin = authorize('admin');

/**
 * Middleware for sales-related access (admin, sales)
 */
const requireSales = authorize(['admin', 'sales']);

/**
 * Middleware for purchase-related access (admin, purchase)
 */
const requirePurchase = authorize(['admin', 'purchase']);

/**
 * Middleware for inventory-related access (admin, inventory, sales, purchase)
 */
const requireInventory = authorize(['admin', 'inventory', 'sales', 'purchase']);

/**
 * Middleware for accounting-related access (admin, accountant)
 */
const requireAccountant = authorize(['admin', 'accountant']);

/**
 * Middleware for data entry access (admin, data_entry, sales, purchase)
 */
const requireDataEntry = authorize(['admin', 'data_entry', 'sales', 'purchase']);

/**
 * Helper function to create role-based middleware
 * @param {string[]} roles - Array of allowed roles
 */
const requireRoles = (roles) => authorize(roles);

/**
 * Optional authentication middleware
 * Authenticates if token is present, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const user = await authService.validateTokenAndGetUser(token);
          req.user = user;
        } catch (error) {
          // Ignore authentication errors in optional auth
          console.log('Optional auth failed:', error.message);
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireSales,
  requirePurchase,
  requireInventory,
  requireAccountant,
  requireDataEntry,
  requireRoles,
  optionalAuth,
};
