const userService = require('../../src/services/userService');
const userRepository = require('../../src/repositories/userRepository');
const authService = require('../../src/services/authService');

// Mock the repositories and services
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/services/authService');

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        _id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        isActive: true,
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw error when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById('123')).rejects.toThrow('User not found');
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      const mockUser = {
        _id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
      };

      userRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await userService.getUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should throw error when user not found', async () => {
      userRepository.findByUsername.mockResolvedValue(null);

      await expect(userService.getUserByUsername('testuser')).rejects.toThrow('User not found');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        _id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw error when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.getUserByEmail('test@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with default options', async () => {
      const mockUsers = [
        { _id: '1', username: 'user1', role: 'admin' },
        { _id: '2', username: 'user2', role: 'sales' },
      ];

      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(userRepository.findAll).toHaveBeenCalledWith({}, {});
    });

    it('should return users with filters and options', async () => {
      const mockUsers = [{ _id: '1', username: 'user1', role: 'admin' }];
      const filters = { role: 'admin' };
      const options = { sort: { username: 1 }, limit: 10 };

      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers(filters, options);

      expect(result).toEqual(mockUsers);
      expect(userRepository.findAll).toHaveBeenCalledWith(filters, options);
    });
  });

  describe('getActiveUsers', () => {
    it('should return all active users', async () => {
      const mockUsers = [
        { _id: '1', username: 'user1', isActive: true },
        { _id: '2', username: 'user2', isActive: true },
      ];

      userRepository.findAllActive.mockResolvedValue(mockUsers);

      const result = await userService.getActiveUsers();

      expect(result).toEqual(mockUsers);
      expect(userRepository.findAllActive).toHaveBeenCalled();
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by valid role', async () => {
      const mockUsers = [
        { _id: '1', username: 'admin1', role: 'admin' },
        { _id: '2', username: 'admin2', role: 'admin' },
      ];

      userRepository.findActiveByRole.mockResolvedValue(mockUsers);

      const result = await userService.getUsersByRole('admin');

      expect(result).toEqual(mockUsers);
      expect(userRepository.findActiveByRole).toHaveBeenCalledWith('admin');
    });

    it('should throw error for invalid role', async () => {
      await expect(userService.getUsersByRole('invalid_role')).rejects.toThrow('Invalid role');
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'sales',
      };

      const mockCreatedUser = {
        _id: '123',
        ...userData,
        isActive: true,
      };

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);
      userRepository.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(userRepository.usernameExists).toHaveBeenCalledWith('newuser');
      expect(userRepository.emailExists).toHaveBeenCalledWith('new@example.com');
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'sales',
        isActive: true,
      });
    });

    it('should throw error when required fields are missing', async () => {
      await expect(userService.createUser({ username: 'test' })).rejects.toThrow(
        'Username, email, password, and role are required'
      );
    });

    it('should throw error when username already exists', async () => {
      const userData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'password123',
        role: 'sales',
      };

      userRepository.usernameExists.mockResolvedValue(true);

      await expect(userService.createUser(userData)).rejects.toThrow('Username already exists');
    });

    it('should throw error when email already exists', async () => {
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
        role: 'sales',
      };

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(true);

      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should throw error when role is invalid', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'invalid_role',
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid role');
    });

    it('should throw error when password is too short', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: '12345',
        role: 'sales',
      };

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);

      await expect(userService.createUser(userData)).rejects.toThrow(
        'Password must be at least 6 characters long'
      );
    });

    it('should throw error when username is too short', async () => {
      const userData = {
        username: 'ab',
        email: 'new@example.com',
        password: 'password123',
        role: 'sales',
      };

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);

      await expect(userService.createUser(userData)).rejects.toThrow(
        'Username must be at least 3 characters long'
      );
    });

    it('should throw error when email format is invalid', async () => {
      const userData = {
        username: 'newuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'sales',
      };

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('updateUser', () => {
    it('should update user with valid data', async () => {
      const existingUser = {
        _id: '123',
        username: 'olduser',
        email: 'old@example.com',
        role: 'sales',
      };

      const updateData = {
        username: 'newuser',
        email: 'new@example.com',
      };

      const updatedUser = {
        ...existingUser,
        ...updateData,
      };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('123', updateData);

      expect(result).toEqual(updatedUser);
      expect(userRepository.update).toHaveBeenCalledWith('123', updateData);
    });

    it('should throw error when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('123', { username: 'newuser' })).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when new username already exists', async () => {
      const existingUser = {
        _id: '123',
        username: 'olduser',
        email: 'old@example.com',
      };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.usernameExists.mockResolvedValue(true);

      await expect(
        userService.updateUser('123', { username: 'existinguser' })
      ).rejects.toThrow('Username already exists');
    });

    it('should throw error when new email already exists', async () => {
      const existingUser = {
        _id: '123',
        username: 'user',
        email: 'old@example.com',
      };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.emailExists.mockResolvedValue(true);

      await expect(userService.updateUser('123', { email: 'existing@example.com' })).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should validate role when provided', async () => {
      const existingUser = {
        _id: '123',
        username: 'user',
        email: 'user@example.com',
      };

      userRepository.findById.mockResolvedValue(existingUser);

      await expect(userService.updateUser('123', { role: 'invalid_role' })).rejects.toThrow(
        'Invalid role'
      );
    });

    it('should remove password from update data', async () => {
      const existingUser = {
        _id: '123',
        username: 'user',
        email: 'user@example.com',
      };

      const updateData = {
        username: 'newuser',
        password: 'shouldberemoved',
      };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.update.mockResolvedValue(existingUser);

      await userService.updateUser('123', updateData);

      expect(updateData.password).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'sales',
      };

      const deletedUser = {
        ...mockUser,
        isActive: false,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.softDelete.mockResolvedValue(deletedUser);

      const result = await userService.deleteUser('123');

      expect(result).toEqual(deletedUser);
      expect(userRepository.softDelete).toHaveBeenCalledWith('123');
    });

    it('should throw error when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser('123')).rejects.toThrow('User not found');
    });

    it('should throw error when deleting last admin', async () => {
      const mockUser = {
        _id: '123',
        username: 'admin',
        role: 'admin',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.countByRole.mockResolvedValue(1);

      await expect(userService.deleteUser('123')).rejects.toThrow(
        'Cannot delete the last admin user'
      );
    });
  });

  describe('permanentlyDeleteUser', () => {
    it('should permanently delete user', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'sales',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.hardDelete.mockResolvedValue(mockUser);

      const result = await userService.permanentlyDeleteUser('123');

      expect(result).toEqual(mockUser);
      expect(userRepository.hardDelete).toHaveBeenCalledWith('123');
    });

    it('should throw error when deleting last active admin', async () => {
      const mockUser = {
        _id: '123',
        username: 'admin',
        role: 'admin',
        isActive: true,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.countByRole.mockResolvedValue(1);

      await expect(userService.permanentlyDeleteUser('123')).rejects.toThrow(
        'Cannot delete the last admin user'
      );
    });
  });

  describe('restoreUser', () => {
    it('should restore soft-deleted user', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        isActive: false,
      };

      const restoredUser = {
        ...mockUser,
        isActive: true,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.restore.mockResolvedValue(restoredUser);

      const result = await userService.restoreUser('123');

      expect(result).toEqual(restoredUser);
      expect(userRepository.restore).toHaveBeenCalledWith('123');
    });

    it('should throw error when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.restoreUser('123')).rejects.toThrow('User not found');
    });

    it('should throw error when user is already active', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        isActive: true,
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(userService.restoreUser('123')).rejects.toThrow('User is already active');
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        comparePassword: jest.fn(),
      };

      mockUser.comparePassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.updatePassword.mockResolvedValue(mockUser);

      const result = await userService.changePassword('123', 'oldpass', 'newpass123');

      expect(result).toEqual(mockUser);
      expect(userRepository.updatePassword).toHaveBeenCalledWith('123', 'newpass123');
    });

    it('should throw error when current password is incorrect', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(
        userService.changePassword('123', 'wrongpass', 'newpass123')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when new password is too short', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(userService.changePassword('123', 'oldpass', '12345')).rejects.toThrow(
        'New password must be at least 6 characters long'
      );
    });

    it('should throw error when new password is same as current', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(userService.changePassword('123', 'samepass', 'samepass')).rejects.toThrow(
        'New password must be different from current password'
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password for user', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.updatePassword.mockResolvedValue(mockUser);

      const result = await userService.resetPassword('123', 'newpass123');

      expect(result).toEqual(mockUser);
      expect(userRepository.updatePassword).toHaveBeenCalledWith('123', 'newpass123');
    });

    it('should throw error when password is too short', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(userService.resetPassword('123', '12345')).rejects.toThrow(
        'Password must be at least 6 characters long'
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'sales',
      };

      const updatedUser = {
        ...mockUser,
        role: 'purchase',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.updateRole.mockResolvedValue(updatedUser);

      const result = await userService.updateUserRole('123', 'purchase');

      expect(result).toEqual(updatedUser);
      expect(userRepository.updateRole).toHaveBeenCalledWith('123', 'purchase');
    });

    it('should throw error for invalid role', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'sales',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(userService.updateUserRole('123', 'invalid_role')).rejects.toThrow(
        'Invalid role'
      );
    });

    it('should throw error when changing role of last admin', async () => {
      const mockUser = {
        _id: '123',
        username: 'admin',
        role: 'admin',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.countByRole.mockResolvedValue(1);

      await expect(userService.updateUserRole('123', 'sales')).rejects.toThrow(
        'Cannot change role of the last admin user'
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status from active to inactive', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'sales',
        isActive: true,
      };

      const updatedUser = {
        ...mockUser,
        isActive: false,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.toggleUserStatus('123');

      expect(result).toEqual(updatedUser);
      expect(userRepository.update).toHaveBeenCalledWith('123', { isActive: false });
    });

    it('should toggle user status from inactive to active', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'sales',
        isActive: false,
      };

      const updatedUser = {
        ...mockUser,
        isActive: true,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.toggleUserStatus('123');

      expect(result).toEqual(updatedUser);
      expect(userRepository.update).toHaveBeenCalledWith('123', { isActive: true });
    });

    it('should throw error when deactivating last admin', async () => {
      const mockUser = {
        _id: '123',
        username: 'admin',
        role: 'admin',
        isActive: true,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.countByRole.mockResolvedValue(1);

      await expect(userService.toggleUserStatus('123')).rejects.toThrow(
        'Cannot deactivate the last admin user'
      );
    });
  });

  describe('getUserStatistics', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total: 10,
        active: 8,
        inactive: 2,
        byRole: {
          admin: 1,
          sales: 3,
          purchase: 2,
          inventory: 1,
          accountant: 1,
        },
      };

      userRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await userService.getUserStatistics();

      expect(result).toEqual(mockStats);
      expect(userRepository.getStatistics).toHaveBeenCalled();
    });
  });

  describe('searchUsers', () => {
    it('should search users with keyword', async () => {
      const mockUsers = [
        { _id: '1', username: 'testuser1', email: 'test1@example.com' },
        { _id: '2', username: 'testuser2', email: 'test2@example.com' },
      ];

      userRepository.search.mockResolvedValue(mockUsers);

      const result = await userService.searchUsers('test');

      expect(result).toEqual(mockUsers);
      expect(userRepository.search).toHaveBeenCalledWith('test', {});
    });

    it('should throw error when keyword is empty', async () => {
      await expect(userService.searchUsers('')).rejects.toThrow('Search keyword is required');
    });

    it('should trim keyword before searching', async () => {
      const mockUsers = [];
      userRepository.search.mockResolvedValue(mockUsers);

      await userService.searchUsers('  test  ');

      expect(userRepository.search).toHaveBeenCalledWith('test', {});
    });
  });

  describe('getPaginatedUsers', () => {
    it('should return paginated users', async () => {
      const mockResult = {
        users: [{ _id: '1', username: 'user1' }],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalItems: 50,
          itemsPerPage: 10,
          hasNextPage: true,
          hasPrevPage: false,
        },
      };

      userRepository.paginate.mockResolvedValue(mockResult);

      const result = await userService.getPaginatedUsers(1, 10);

      expect(result).toEqual(mockResult);
      expect(userRepository.paginate).toHaveBeenCalledWith(1, 10, {}, { createdAt: -1 });
    });

    it('should throw error when page number is less than 1', async () => {
      await expect(userService.getPaginatedUsers(0, 10)).rejects.toThrow(
        'Page number must be greater than 0'
      );
    });

    it('should throw error when limit is less than 1', async () => {
      await expect(userService.getPaginatedUsers(1, 0)).rejects.toThrow(
        'Limit must be between 1 and 100'
      );
    });

    it('should throw error when limit is greater than 100', async () => {
      await expect(userService.getPaginatedUsers(1, 101)).rejects.toThrow(
        'Limit must be between 1 and 100'
      );
    });
  });

  describe('validateRole', () => {
    it('should not throw error for valid roles', () => {
      const validRoles = ['admin', 'sales', 'purchase', 'inventory', 'accountant', 'data_entry'];

      validRoles.forEach((role) => {
        expect(() => userService.validateRole(role)).not.toThrow();
      });
    });

    it('should throw error for invalid role', () => {
      expect(() => userService.validateRole('invalid_role')).toThrow('Invalid role');
    });
  });

  describe('bulkCreateUsers', () => {
    it('should create multiple users', async () => {
      const usersData = [
        {
          username: 'user1',
          email: 'user1@example.com',
          password: 'password123',
          role: 'sales',
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123',
          role: 'purchase',
        },
      ];

      const mockCreatedUsers = usersData.map((u, i) => ({ _id: `${i + 1}`, ...u, isActive: true }));

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);
      userRepository.bulkCreate.mockResolvedValue(mockCreatedUsers);

      const result = await userService.bulkCreateUsers(usersData);

      expect(result).toEqual(mockCreatedUsers);
      expect(userRepository.bulkCreate).toHaveBeenCalled();
    });

    it('should throw error when input is not an array', async () => {
      await expect(userService.bulkCreateUsers({})).rejects.toThrow(
        'Users data must be a non-empty array'
      );
    });

    it('should throw error when input is empty array', async () => {
      await expect(userService.bulkCreateUsers([])).rejects.toThrow(
        'Users data must be a non-empty array'
      );
    });

    it('should throw error when duplicate username in batch', async () => {
      const usersData = [
        {
          username: 'duplicate',
          email: 'user1@example.com',
          password: 'password123',
          role: 'sales',
        },
        {
          username: 'duplicate',
          email: 'user2@example.com',
          password: 'password123',
          role: 'purchase',
        },
      ];

      userRepository.usernameExists.mockResolvedValue(false);
      userRepository.emailExists.mockResolvedValue(false);

      await expect(userService.bulkCreateUsers(usersData)).rejects.toThrow('Duplicate username');
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with any action', async () => {
      const mockUser = {
        _id: '123',
        username: 'admin',
        role: 'admin',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.hasPermission('123', 'any.action');

      expect(result).toBe(true);
    });

    it('should return true for sales user with sales permission', async () => {
      const mockUser = {
        _id: '123',
        username: 'salesuser',
        role: 'sales',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.hasPermission('123', 'sales.view');

      expect(result).toBe(true);
    });

    it('should return false for sales user without permission', async () => {
      const mockUser = {
        _id: '123',
        username: 'salesuser',
        role: 'sales',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.hasPermission('123', 'purchase.create');

      expect(result).toBe(false);
    });

    it('should return false for unknown role', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        role: 'unknown',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.hasPermission('123', 'sales.view');

      expect(result).toBe(false);
    });
  });
});
