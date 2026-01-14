const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthService {
  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (userId, role)
   * @returns {String} JWT token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (userId)
   * @returns {String} JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });
  }

  /**
   * Verify JWT access token
   * @param {String} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify JWT refresh token
   * @param {String} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {String} password - Plain text password
   * @returns {String} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hashed password
   * @param {String} password - Plain text password
   * @param {String} hashedPassword - Hashed password
   * @returns {Boolean} True if passwords match
   */
  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Authenticate user with username/email and password
   * @param {String} identifier - Username or email
   * @param {String} password - Plain text password
   * @returns {Object} User object and tokens
   * @throws {Error} If authentication fails
   */
  async authenticate(identifier, password) {
    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user._id,
      role: user.role,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user._id,
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - JWT refresh token
   * @returns {Object} New access token and user info
   * @throws {Error} If refresh token is invalid
   */
  async refreshAccessToken(refreshToken) {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: user._id,
      role: user.role,
    });

    return {
      user: user.toJSON(),
      accessToken,
    };
  }

  /**
   * Validate token and get user
   * @param {String} token - JWT access token
   * @returns {Object} User object
   * @throws {Error} If token is invalid or user not found
   */
  async validateTokenAndGetUser(token) {
    const decoded = this.verifyAccessToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    return user;
  }
}

module.exports = new AuthService();
