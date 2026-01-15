const User = require('../models/User');

/**
 * User Repository
 * Handles all database operations for User model
 */
class UserRepository {
  /**
   * Find user by ID
   * @param {String} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    return User.findById(id);
  }

  /**
   * Find user by username
   * @param {String} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  async findByUsername(username) {
    return User.findOne({ username });
  }

  /**
   * Find user by email
   * @param {String} email - Email address
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    return User.findOne({ email });
  }

  /**
   * Find user by username or email
   * @param {String} identifier - Username or email
   * @returns {Promise<Object|null>} User object or null
   */
  async findByUsernameOrEmail(identifier) {
    return User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
  }

  /**
   * Find all users with optional filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options (sort, limit, skip, select)
   * @returns {Promise<Array>} Array of user objects
   */
  async findAll(filters = {}, options = {}) {
    const {
      sort = { createdAt: -1 }, limit = 0, skip = 0, select = '',
    } = options;

    return User.find(filters)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .select(select);
  }

  /**
   * Find active users by role
   * @param {String} role - User role
   * @returns {Promise<Array>} Array of active users with specified role
   */
  async findActiveByRole(role) {
    return User.findActiveByRole(role);
  }

  /**
   * Find all active users
   * @returns {Promise<Array>} Array of active users
   */
  async findAllActive() {
    return User.find({ isActive: true }).sort({ username: 1 });
  }

  /**
   * Find all inactive users
   * @returns {Promise<Array>} Array of inactive users
   */
  async findAllInactive() {
    return User.find({ isActive: false }).sort({ username: 1 });
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user object
   */
  async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  /**
   * Update user by ID
   * @param {String} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} Updated user object or null
   */
  async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Delete user by ID (soft delete by setting isActive to false)
   * @param {String} id - User ID
   * @returns {Promise<Object|null>} Updated user object or null
   */
  async softDelete(id) {
    return User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
  }

  /**
   * Permanently delete user by ID
   * @param {String} id - User ID
   * @returns {Promise<Object|null>} Deleted user object or null
   */
  async hardDelete(id) {
    return User.findByIdAndDelete(id);
  }

  /**
   * Restore soft-deleted user
   * @param {String} id - User ID
   * @returns {Promise<Object|null>} Restored user object or null
   */
  async restore(id) {
    return User.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true },
    );
  }

  /**
   * Update user password
   * @param {String} id - User ID
   * @param {String} newPassword - New password (will be hashed by model)
   * @returns {Promise<Object|null>} Updated user object or null
   */
  async updatePassword(id, newPassword) {
    const user = await User.findById(id);
    if (!user) return null;

    user.password = newPassword;
    return user.save();
  }

  /**
   * Update user role
   * @param {String} id - User ID
   * @param {String} role - New role
   * @returns {Promise<Object|null>} Updated user object or null
   */
  async updateRole(id, role) {
    return User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
    );
  }

  /**
   * Check if username exists
   * @param {String} username - Username to check
   * @param {String} excludeId - User ID to exclude from check (for updates)
   * @returns {Promise<Boolean>} True if username exists
   */
  async usernameExists(username, excludeId = null) {
    const query = { username };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const user = await User.findOne(query);
    return !!user;
  }

  /**
   * Check if email exists
   * @param {String} email - Email to check
   * @param {String} excludeId - User ID to exclude from check (for updates)
   * @returns {Promise<Boolean>} True if email exists
   */
  async emailExists(email, excludeId = null) {
    const query = { email };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const user = await User.findOne(query);
    return !!user;
  }

  /**
   * Count users with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Number>} Count of users
   */
  async count(filters = {}) {
    return User.countDocuments(filters);
  }

  /**
   * Count active users
   * @returns {Promise<Number>} Count of active users
   */
  async countActive() {
    return User.countDocuments({ isActive: true });
  }

  /**
   * Count users by role
   * @param {String} role - User role
   * @returns {Promise<Number>} Count of users with specified role
   */
  async countByRole(role) {
    return User.countDocuments({ role, isActive: true });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getStatistics() {
    const [total, active, inactive, byRole] = await Promise.all([
      this.count(),
      this.countActive(),
      this.count({ isActive: false }),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Search users by keyword
   * @param {String} keyword - Search keyword
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object with users array and total count
   */
  async search(keyword, options = {}) {
    const { limit = 10, skip = 0 } = options;

    const searchRegex = new RegExp(keyword, 'i');
    const query = {
      $or: [
        { username: searchRegex },
        { email: searchRegex },
      ],
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .limit(limit)
        .skip(skip)
        .sort({ username: 1 }),
      User.countDocuments(query),
    ]);

    return { users, total };
  }

  /**
   * Bulk create users
   * @param {Array} usersData - Array of user data objects
   * @returns {Promise<Array>} Array of created users
   */
  async bulkCreate(usersData) {
    return User.insertMany(usersData);
  }

  /**
   * Bulk update users
   * @param {Array} updates - Array of { id, data } objects
   * @returns {Promise<Array>} Array of updated users
   */
  async bulkUpdate(updates) {
    const promises = updates.map(({ id, data }) => this.update(id, data));
    return Promise.all(promises);
  }

  /**
   * Get paginated users
   * @param {Number} page - Page number (1-based)
   * @param {Number} limit - Items per page
   * @param {Object} filters - Query filters
   * @param {Object} sortOptions - Sort options
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async paginate(page = 1, limit = 10, filters = {}, sortOptions = { createdAt: -1 }) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.findAll(filters, { sort: sortOptions, limit, skip }),
      this.count(filters),
    ]);

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
}

module.exports = new UserRepository();
