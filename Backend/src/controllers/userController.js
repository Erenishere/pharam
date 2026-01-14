const userService = require('../services/userService');

/**
 * User Controller
 * Handles HTTP requests for user management
 */

/**
 * Get all users with optional filters and pagination
 * @route GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, role, isActive, search,
    } = req.query;

    // Build filters
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    // Handle search
    if (search) {
      const result = await userService.searchUsers(search, {
        limit: parseInt(limit, 10),
        page: parseInt(page, 10),
      });

      return res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination, // Critical for frontend pagination
        message: 'Users retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    }

    // Get paginated users
    const result = await userService.getPaginatedUsers(
      parseInt(page, 10),
      parseInt(limit, 10),
      filters,
    );

    return res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve users',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get user by ID error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve user',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/users/profile/me
 */
const getMyProfile = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user._id);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Profile retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve profile',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new user
 * @route POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData);

    return res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create user error:', error);

    if (
      error.message.includes('already exists')
      || error.message.includes('required')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create user',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await userService.updateUser(id, updateData);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message.includes('already exists')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update user',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/profile/me
 */
const updateMyProfile = async (req, res) => {
  try {
    const updateData = req.body;

    // Prevent role changes through profile update
    delete updateData.role;
    delete updateData.isActive;

    const user = await userService.updateUser(req.user._id, updateData);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (
      error.message.includes('already exists')
      || error.message.includes('Invalid')
      || error.message.includes('must be')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update profile',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete user (soft delete)
 * @route DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.deleteUser(id);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot delete')) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete user',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Restore soft-deleted user
 * @route POST /api/users/:id/restore
 */
const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.restoreUser(id);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User restored successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Restore user error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message === 'User is already active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to restore user',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Change user password
 * @route POST /api/users/profile/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(req.user._id, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Change password error:', error);

    if (
      error.message === 'Current password is incorrect'
      || error.message.includes('must be')
      || error.message.includes('must be different')
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to change password',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Reset user password (admin only)
 * @route POST /api/users/:id/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    await userService.resetPassword(id, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to reset password',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update user role (admin only)
 * @route PATCH /api/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await userService.updateUserRole(id, role);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User role updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update user role error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Invalid role') || error.message.includes('Cannot change')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update user role',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle user active status (admin only)
 * @route PATCH /api/users/:id/toggle-status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.toggleUserStatus(id);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User status updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle user status error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (error.message.includes('Cannot deactivate')) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle user status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user statistics (admin only)
 * @route GET /api/users/statistics
 */
const getUserStatistics = async (req, res) => {
  try {
    const statistics = await userService.getUserStatistics();

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'User statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve user statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get users by role
 * @route GET /api/users/role/:role
 */
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await userService.getUsersByRole(role);

    return res.status(200).json({
      success: true,
      data: users,
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get users by role error:', error);

    if (error.message.includes('Invalid role')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve users',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getMyProfile,
  createUser,
  updateUser,
  updateMyProfile,
  deleteUser,
  restoreUser,
  changePassword,
  resetPassword,
  updateUserRole,
  toggleUserStatus,
  getUserStatistics,
  getUsersByRole,
};
