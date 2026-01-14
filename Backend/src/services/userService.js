const userRepository = require('../repositories/userRepository');
const authService = require('./authService');

/**
 * User Service
 * Handles business logic for user management
 */
class UserService {
  /**
   * Get user by ID
   * @param {String} id - User ID
   * @returns {Promise<Object>} User object
   * @throws {Error} If user not found
   */
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Get user by username
   * @param {String} username - Username
   * @returns {Promise<Object>} User object
   * @throws {Error} If user not found
   */
  async getUserByUsername(username) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Get user by email
   * @param {String} email - Email address
   * @returns {Promise<Object>} User object
   * @throws {Error} If user not found
   */
  async getUserByEmail(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Get all users with optional filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async getAllUsers(filters = {}, options = {}) {
    return userRepository.findAll(filters, options);
  }

  /**
   * Get all active users
   * @returns {Promise<Array>} Array of active users
   */
  async getActiveUsers() {
    return userRepository.findAllActive();
  }

  /**
   * Get users by role
   * @param {String} role - User role
   * @returns {Promise<Array>} Array of users with specified role
   */
  async getUsersByRole(role) {
    this.validateRole(role);
    return userRepository.findActiveByRole(role);
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   * @throws {Error} If validation fails or user already exists
   */
  async createUser(userData) {
    const {
      username, email, password, role,
    } = userData;

    // Validate required fields
    if (!username || !email || !password || !role) {
      throw new Error('Username, email, password, and role are required');
    }

    // Validate role
    this.validateRole(role);

    // Check if username already exists
    const usernameExists = await userRepository.usernameExists(username);
    if (usernameExists) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const emailExists = await userRepository.emailExists(email);
    if (emailExists) {
      throw new Error('Email already exists');
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate username length
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Create user (password will be hashed by User model pre-save hook)
    const user = await userRepository.create({
      username,
      email,
      password,
      role,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
    });

    return user;
  }

  /**
   * Update user
   * @param {String} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If validation fails or user not found
   */
  async updateUser(id, updateData) {
    // Check if user exists
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Validate role if provided
    if (updateData.role) {
      this.validateRole(updateData.role);
    }

    // Check username uniqueness if changing username
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await userRepository.usernameExists(updateData.username, id);
      if (usernameExists) {
        throw new Error('Username already exists');
      }

      // Validate username length
      if (updateData.username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
    }

    // Check email uniqueness if changing email
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await userRepository.emailExists(updateData.email, id);
      if (emailExists) {
        throw new Error('Email already exists');
      }

      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(updateData.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Don't allow password updates through this method
    delete updateData.password;

    // Update user
    const updatedUser = await userRepository.update(id, updateData);
    return updatedUser;
  }

  /**
   * Delete user (soft delete)
   * @param {String} id - User ID
   * @returns {Promise<Object>} Deleted user
   * @throws {Error} If user not found
   */
  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    return userRepository.softDelete(id);
  }

  /**
   * Permanently delete user
   * @param {String} id - User ID
   * @returns {Promise<Object>} Deleted user
   * @throws {Error} If user not found
   */
  async permanentlyDeleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deleting the last admin
    if (user.role === 'admin' && user.isActive) {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    return userRepository.hardDelete(id);
  }

  /**
   * Restore soft-deleted user
   * @param {String} id - User ID
   * @returns {Promise<Object>} Restored user
   * @throws {Error} If user not found
   */
  async restoreUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isActive) {
      throw new Error('User is already active');
    }

    return userRepository.restore(id);
  }

  /**
   * Change user password
   * @param {String} id - User ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If validation fails
   */
  async changePassword(id, currentPassword, newPassword) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Update password (will be hashed by model)
    return userRepository.updatePassword(id, newPassword);
  }

  /**
   * Reset user password (admin function)
   * @param {String} id - User ID
   * @param {String} newPassword - New password
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If validation fails
   */
  async resetPassword(id, newPassword) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Update password
    return userRepository.updatePassword(id, newPassword);
  }

  /**
   * Update user role
   * @param {String} id - User ID
   * @param {String} newRole - New role
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If validation fails
   */
  async updateUserRole(id, newRole) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate role
    this.validateRole(newRole);

    // Prevent changing role of last admin
    if (user.role === 'admin' && newRole !== 'admin') {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        throw new Error('Cannot change role of the last admin user');
      }
    }

    return userRepository.updateRole(id, newRole);
  }

  /**
   * Toggle user active status
   * @param {String} id - User ID
   * @returns {Promise<Object>} Updated user
   * @throws {Error} If user not found
   */
  async toggleUserStatus(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deactivating last admin
    if (user.role === 'admin' && user.isActive) {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        throw new Error('Cannot deactivate the last admin user');
      }
    }

    return userRepository.update(id, { isActive: !user.isActive });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStatistics() {
    return userRepository.getStatistics();
  }

  /**
   * Search users
   * @param {String} keyword - Search keyword
   * @param {Object} options - Search options (limit, page)
   * @returns {Promise<Object>} Object with users array and pagination metadata
   */
  async searchUsers(keyword, options = {}) {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error('Search keyword is required');
    }

    const { limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    const { users, total } = await userRepository.search(keyword.trim(), { limit, skip });

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get paginated users
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @param {Object} filters - Query filters
   * @param {Object} sort - Sort options
   * @returns {Promise<Object>} Paginated results
   */
  async getPaginatedUsers(page = 1, limit = 10, filters = {}, sort = { createdAt: -1 }) {
    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return userRepository.paginate(page, limit, filters, sort);
  }

  /**
   * Validate user role
   * @param {String} role - Role to validate
   * @throws {Error} If role is invalid
   */
  validateRole(role) {
    const validRoles = ['admin', 'sales', 'purchase', 'inventory', 'accountant', 'data_entry'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
  }

  /**
   * Bulk create users
   * @param {Array} usersData - Array of user data
   * @returns {Promise<Array>} Array of created users
   * @throws {Error} If validation fails
   */
  async bulkCreateUsers(usersData) {
    if (!Array.isArray(usersData) || usersData.length === 0) {
      throw new Error('Users data must be a non-empty array');
    }

    // Validate each user
    const validatedUsers = [];
    const errors = [];

    for (let i = 0; i < usersData.length; i += 1) {
      const userData = usersData[i];
      try {
        // Validate required fields
        if (!userData.username || !userData.email || !userData.password || !userData.role) {
          throw new Error('Username, email, password, and role are required');
        }

        // Validate role
        this.validateRole(userData.role);

        // Validate username length
        if (userData.username.length < 3) {
          throw new Error('Username must be at least 3 characters long');
        }

        // Validate password length
        if (userData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        // Validate email format
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(userData.email)) {
          throw new Error('Invalid email format');
        }

        // Check for duplicate username in batch
        const duplicateUsername = validatedUsers.find((u) => u.username === userData.username);
        if (duplicateUsername) {
          throw new Error(`Duplicate username in batch: ${userData.username}`);
        }

        // Check for duplicate email in batch
        const duplicateEmail = validatedUsers.find((u) => u.email === userData.email);
        if (duplicateEmail) {
          throw new Error(`Duplicate email in batch: ${userData.email}`);
        }

        // Check if username exists in database
        const usernameExists = await userRepository.usernameExists(userData.username);
        if (usernameExists) {
          throw new Error(`Username already exists: ${userData.username}`);
        }

        // Check if email exists in database
        const emailExists = await userRepository.emailExists(userData.email);
        if (emailExists) {
          throw new Error(`Email already exists: ${userData.email}`);
        }

        validatedUsers.push({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
        });
      } catch (error) {
        errors.push({
          index: i,
          username: userData.username,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.map((e) => `Index ${e.index} (${e.username}): ${e.error}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Create users
    return userRepository.bulkCreate(validatedUsers);
  }

  /**
   * Check if user has permission for a specific action
   * @param {String} userId - User ID
   * @param {String} action - Action to check
   * @returns {Promise<Boolean>} True if user has permission
   */
  async hasPermission(userId, action) {
    const user = await this.getUserById(userId);

    // Define permissions by role
    const permissions = {
      admin: ['all'],
      sales: ['sales.view', 'sales.create', 'sales.edit', 'customer.view', 'customer.create', 'customer.edit', 'inventory.view'],
      purchase: ['purchase.view', 'purchase.create', 'purchase.edit', 'supplier.view', 'supplier.create', 'supplier.edit', 'inventory.view'],
      inventory: ['inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete'],
      accountant: ['accounts.view', 'accounts.create', 'accounts.edit', 'reports.view', 'reports.generate'],
      data_entry: ['sales.create', 'purchase.create', 'customer.create', 'supplier.create', 'inventory.create'],
    };

    const userPermissions = permissions[user.role] || [];

    // Admin has all permissions
    if (userPermissions.includes('all')) {
      return true;
    }

    return userPermissions.includes(action);
  }
}

module.exports = new UserService();
