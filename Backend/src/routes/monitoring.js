/**
 * Monitoring and Health Check Routes
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getMetrics,
  getSlowRoutes,
  getErrorRoutes,
  getHealthStatus,
  getDashboardData,
  resetMetrics,
} = require('../middleware/performanceMonitoring');
const { CacheManager } = require('../utils/cache');
const { getAllIndexStats } = require('../config/indexOptimization');

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  const health = getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    success: true,
    data: health,
  });
});

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with database status
 * @access  Public
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const health = getHealthStatus();

    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Get database stats
    let dbStats = null;
    if (dbStatus === 'connected') {
      try {
        const db = mongoose.connection.db;
        const stats = await db.stats();
        dbStats = {
          collections: stats.collections,
          dataSize: (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB',
          indexSize: (stats.indexSize / 1024 / 1024).toFixed(2) + ' MB',
          storageSize: (stats.storageSize / 1024 / 1024).toFixed(2) + ' MB',
        };
      } catch (error) {
        dbStats = { error: 'Unable to fetch database stats' };
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: {
        ...health,
        database: {
          status: dbStatus,
          stats: dbStats,
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /metrics
 * @desc    Get performance metrics
 * @access  Private (Admin only)
 */
router.get('/metrics', authenticate, requireAdmin, (req, res) => {
  try {
    const metrics = getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /metrics/dashboard
 * @desc    Get dashboard data with all metrics
 * @access  Private (Admin only)
 */
router.get('/metrics/dashboard', authenticate, requireAdmin, (req, res) => {
  try {
    const dashboard = getDashboardData();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /metrics/slow-routes
 * @desc    Get slowest routes
 * @access  Private (Admin only)
 */
router.get('/metrics/slow-routes', authenticate, requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const slowRoutes = getSlowRoutes(limit);

    res.json({
      success: true,
      data: slowRoutes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SLOW_ROUTES_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /metrics/error-routes
 * @desc    Get routes with most errors
 * @access  Private (Admin only)
 */
router.get('/metrics/error-routes', authenticate, requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const errorRoutes = getErrorRoutes(limit);

    res.json({
      success: true,
      data: errorRoutes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ERROR_ROUTES_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /metrics/cache
 * @desc    Get cache statistics
 * @access  Private (Admin only)
 */
router.get('/metrics/cache', authenticate, requireAdmin, (req, res) => {
  try {
    const cacheStats = CacheManager.getAllStats();

    res.json({
      success: true,
      data: cacheStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_STATS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /metrics/database
 * @desc    Get database index statistics
 * @access  Private (Admin only)
 */
router.get('/metrics/database', authenticate, requireAdmin, async (req, res) => {
  try {
    const indexStats = await getAllIndexStats();

    res.json({
      success: true,
      data: indexStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_STATS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   POST /metrics/reset
 * @desc    Reset performance metrics
 * @access  Private (Admin only)
 */
router.post('/metrics/reset', authenticate, requireAdmin, (req, res) => {
  try {
    resetMetrics();

    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_METRICS_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   POST /cache/clear
 * @desc    Clear all caches
 * @access  Private (Admin only)
 */
router.post('/cache/clear', authenticate, requireAdmin, (req, res) => {
  try {
    const { duration } = req.body;

    if (duration) {
      CacheManager.clear(duration);
    } else {
      CacheManager.clearAll();
    }

    res.json({
      success: true,
      message: duration
        ? `${duration} cache cleared successfully`
        : 'All caches cleared successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEAR_CACHE_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * @route   GET /system/info
 * @desc    Get system information
 * @access  Private (Admin only)
 */
router.get('/system/info', authenticate, requireAdmin, (req, res) => {
  try {
    const info = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      environment: process.env.NODE_ENV || 'development',
    };

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_INFO_ERROR',
        message: error.message,
      },
    });
  }
});

module.exports = router;
