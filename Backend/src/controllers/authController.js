const authService = require('../services/authService');

/**
 * Authentication Controller
 * Handles login, logout, token refresh, and other auth-related operations
 */
class AuthController {
  /**
   * User login
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      console.log('[AuthController] Login attempt for:', identifier);

      // Validate required fields
      if (!identifier || !password) {
        console.log('[AuthController] Missing credentials');
        return res.status(400).json({
          error: 'Validation error',
          message: 'Username/email and password are required',
        });
      }

      // Authenticate user
      console.log('[AuthController] Authenticating user...');
      const result = await authService.authenticate(identifier, password);

      console.log('[AuthController] Login successful for:', identifier);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      console.error('[AuthController] Login error:', error.message);

      if (error.message === 'Invalid credentials') {
        console.log('[AuthController] Invalid credentials for:', req.body.identifier);
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid username/email or password',
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }

      if (error.message === 'User account is inactive') {
        console.log('[AuthController] User account inactive:', req.body.identifier);
        return res.status(401).json({
          error: 'Account inactive',
          message: 'Your account has been deactivated. Please contact administrator.',
        });
      }

      console.error('[AuthController] Unexpected error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during login',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Token refresh
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Refresh token is required',
        });
      }

      // Refresh access token
      const result = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      if (error.message === 'Refresh token has expired') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Refresh token has expired. Please login again.',
        });
      }

      if (error.message === 'Invalid refresh token') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Invalid refresh token',
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

      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during token refresh',
      });
    }
  }

  /**
   * User logout
   * Note: In a stateless JWT setup, logout is handled client-side by removing tokens.
   * This endpoint exists for consistency and future token blacklisting implementation.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, we don't need to do anything server-side
      // The client should remove the tokens from storage
      // Future implementation could add token blacklisting here

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during logout',
      });
    }
  }

  /**
   * Get current user profile
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getProfile(req, res) {
    try {
      // User is already attached to req by authentication middleware
      const { user } = req;

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: user.toJSON(),
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while retrieving profile',
      });
    }
  }

  /**
   * Verify token endpoint
   * Useful for frontend to check if current token is valid
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async verifyToken(req, res) {
    try {
      // If we reach here, the token is valid (middleware would have caught invalid tokens)
      const { user } = req;

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          valid: true,
          user: user.toJSON(),
        },
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during token verification',
      });
    }
  }
}

module.exports = new AuthController();
