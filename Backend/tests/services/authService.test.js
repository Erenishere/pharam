const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authService = require('../../src/services/authService');
const User = require('../../src/models/User');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('../../src/models/User');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variables for testing
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
    process.env.BCRYPT_SALT_ROUNDS = '12';
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct payload and options', () => {
      const payload = { userId: '123', role: 'admin' };
      const expectedToken = 'access_token_123';
      
      jwt.sign.mockReturnValue(expectedToken);

      const token = authService.generateAccessToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test_secret',
        { expiresIn: '7d' }
      );
      expect(token).toBe(expectedToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct payload and options', () => {
      const payload = { userId: '123' };
      const expectedToken = 'refresh_token_123';
      
      jwt.sign.mockReturnValue(expectedToken);

      const token = authService.generateRefreshToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test_refresh_secret',
        { expiresIn: '30d' }
      );
      expect(token).toBe(expectedToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', () => {
      const token = 'valid_token';
      const decoded = { userId: '123', role: 'admin' };
      
      jwt.verify.mockReturnValue(decoded);

      const result = authService.verifyAccessToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test_secret');
      expect(result).toEqual(decoded);
    });

    it('should throw error for expired token', () => {
      const token = 'expired_token';
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => authService.verifyAccessToken(token)).toThrow('Token has expired');
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid_token';
      const error = new Error('invalid token');
      error.name = 'JsonWebTokenError';
      
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => authService.verifyAccessToken(token)).toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', () => {
      const token = 'valid_refresh_token';
      const decoded = { userId: '123' };
      
      jwt.verify.mockReturnValue(decoded);

      const result = authService.verifyRefreshToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test_refresh_secret');
      expect(result).toEqual(decoded);
    });

    it('should throw error for expired refresh token', () => {
      const token = 'expired_refresh_token';
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => authService.verifyRefreshToken(token)).toThrow('Refresh token has expired');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed_password_123';
      
      bcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await authService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed_password_123';
      
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.comparePassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed_password_123';
      
      bcrypt.compare.mockResolvedValue(false);

      const result = await authService.comparePassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('authenticate', () => {
    const mockUser = {
      _id: '123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin',
      isActive: true,
      comparePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      toJSON: jest.fn()
    };

    it('should authenticate user with valid username and password', async () => {
      User.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockUser.updateLastLogin.mockResolvedValue(mockUser);
      mockUser.toJSON.mockReturnValue({ _id: '123', username: 'testuser' });
      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      const result = await authService.authenticate('testuser', 'password123');

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'testuser' },
          { email: 'testuser' }
        ]
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockUser.updateLastLogin).toHaveBeenCalled();
      expect(result).toEqual({
        user: { _id: '123', username: 'testuser' },
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      });
    });

    it('should authenticate user with valid email and password', async () => {
      User.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockUser.updateLastLogin.mockResolvedValue(mockUser);
      mockUser.toJSON.mockReturnValue({ _id: '123', email: 'test@example.com' });
      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      const result = await authService.authenticate('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for non-existent user', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.authenticate('nonexistent', 'password123'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      User.findOne.mockResolvedValue(inactiveUser);

      await expect(authService.authenticate('testuser', 'password123'))
        .rejects.toThrow('User account is inactive');
    });

    it('should throw error for invalid password', async () => {
      User.findOne.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(authService.authenticate('testuser', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshAccessToken', () => {
    const mockUser = {
      _id: '123',
      username: 'testuser',
      role: 'admin',
      isActive: true,
      toJSON: jest.fn()
    };

    it('should generate new access token with valid refresh token', async () => {
      const refreshToken = 'valid_refresh_token';
      jwt.verify.mockReturnValue({ userId: '123' });
      User.findById.mockResolvedValue(mockUser);
      mockUser.toJSON.mockReturnValue({ _id: '123', username: 'testuser' });
      jwt.sign.mockReturnValue('new_access_token');

      const result = await authService.refreshAccessToken(refreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test_refresh_secret');
      expect(User.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual({
        user: { _id: '123', username: 'testuser' },
        accessToken: 'new_access_token'
      });
    });

    it('should throw error if user not found', async () => {
      const refreshToken = 'valid_refresh_token';
      jwt.verify.mockReturnValue({ userId: '123' });
      User.findById.mockResolvedValue(null);

      await expect(authService.refreshAccessToken(refreshToken))
        .rejects.toThrow('User not found');
    });

    it('should throw error if user is inactive', async () => {
      const refreshToken = 'valid_refresh_token';
      const inactiveUser = { ...mockUser, isActive: false };
      jwt.verify.mockReturnValue({ userId: '123' });
      User.findById.mockResolvedValue(inactiveUser);

      await expect(authService.refreshAccessToken(refreshToken))
        .rejects.toThrow('User account is inactive');
    });
  });

  describe('validateTokenAndGetUser', () => {
    const mockUser = {
      _id: '123',
      username: 'testuser',
      role: 'admin',
      isActive: true
    };

    it('should return user for valid token', async () => {
      const token = 'valid_token';
      jwt.verify.mockReturnValue({ userId: '123', role: 'admin' });
      User.findById.mockResolvedValue(mockUser);

      const result = await authService.validateTokenAndGetUser(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test_secret');
      expect(User.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      const token = 'valid_token';
      jwt.verify.mockReturnValue({ userId: '123', role: 'admin' });
      User.findById.mockResolvedValue(null);

      await expect(authService.validateTokenAndGetUser(token))
        .rejects.toThrow('User not found');
    });

    it('should throw error if user is inactive', async () => {
      const token = 'valid_token';
      const inactiveUser = { ...mockUser, isActive: false };
      jwt.verify.mockReturnValue({ userId: '123', role: 'admin' });
      User.findById.mockResolvedValue(inactiveUser);

      await expect(authService.validateTokenAndGetUser(token))
        .rejects.toThrow('User account is inactive');
    });
  });
});
