/**
 * Performance Monitoring Middleware
 * 
 * Tracks API request performance, response times, and system metrics
 */

const responseTime = require('response-time');
const { CacheManager } = require('../utils/cache');

// Performance metrics storage
const metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byRoute: {},
    byStatus: {},
  },
  responseTimes: {
    total: 0,
    count: 0,
    min: Infinity,
    max: 0,
    byRoute: {},
  },
  errors: {
    total: 0,
    byType: {},
    byRoute: {},
  },
  cache: {
    hits: 0,
    misses: 0,
    skips: 0,
  },
};

/**
 * Response time tracking middleware
 */
const responseTimeMiddleware = responseTime((req, res, time) => {
  // Update total metrics
  metrics.responseTimes.total += time;
  metrics.responseTimes.count++;
  metrics.responseTimes.min = Math.min(metrics.responseTimes.min, time);
  metrics.responseTimes.max = Math.max(metrics.responseTimes.max, time);

  // Update route-specific metrics
  const route = getRoutePattern(req);
  if (!metrics.responseTimes.byRoute[route]) {
    metrics.responseTimes.byRoute[route] = {
      total: 0,
      count: 0,
      min: Infinity,
      max: 0,
      avg: 0,
    };
  }

  const routeMetrics = metrics.responseTimes.byRoute[route];
  routeMetrics.total += time;
  routeMetrics.count++;
  routeMetrics.min = Math.min(routeMetrics.min, time);
  routeMetrics.max = Math.max(routeMetrics.max, time);
  routeMetrics.avg = routeMetrics.total / routeMetrics.count;

  // Track cache performance
  const cacheHeader = res.get('X-Cache');
  if (cacheHeader === 'HIT') {
    metrics.cache.hits++;
  } else if (cacheHeader === 'MISS') {
    metrics.cache.misses++;
  } else if (cacheHeader === 'SKIP') {
    metrics.cache.skips++;
  }

  // Log slow requests (> 1 second)
  if (time > 1000) {
    console.warn(`Slow request detected: ${req.method} ${route} - ${time.toFixed(2)}ms`);
  }
});

/**
 * Request tracking middleware
 */
function requestTrackingMiddleware(req, res, next) {
  // Increment total requests
  metrics.requests.total++;

  // Track by method
  const method = req.method;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;

  // Track by route
  const route = getRoutePattern(req);
  metrics.requests.byRoute[route] = (metrics.requests.byRoute[route] || 0) + 1;

  // Track response status
  const originalSend = res.send;
  res.send = function(data) {
    const status = res.statusCode;
    const statusCategory = `${Math.floor(status / 100)}xx`;
    metrics.requests.byStatus[statusCategory] = (metrics.requests.byStatus[statusCategory] || 0) + 1;

    // Track errors
    if (status >= 400) {
      metrics.errors.total++;
      metrics.errors.byRoute[route] = (metrics.errors.byRoute[route] || 0) + 1;
      
      const errorType = status >= 500 ? 'server_error' : 'client_error';
      metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Get route pattern from request
 */
function getRoutePattern(req) {
  if (req.route) {
    return `${req.method} ${req.route.path}`;
  }
  // Fallback to base URL
  return `${req.method} ${req.baseUrl || req.path}`;
}

/**
 * Get current performance metrics
 */
function getMetrics() {
  const avgResponseTime = metrics.responseTimes.count > 0
    ? metrics.responseTimes.total / metrics.responseTimes.count
    : 0;

  const cacheHitRate = (metrics.cache.hits + metrics.cache.misses) > 0
    ? (metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100
    : 0;

  const errorRate = metrics.requests.total > 0
    ? (metrics.errors.total / metrics.requests.total) * 100
    : 0;

  return {
    requests: {
      ...metrics.requests,
      errorRate: errorRate.toFixed(2) + '%',
    },
    responseTimes: {
      avg: avgResponseTime.toFixed(2) + 'ms',
      min: metrics.responseTimes.min === Infinity ? 0 : metrics.responseTimes.min.toFixed(2) + 'ms',
      max: metrics.responseTimes.max.toFixed(2) + 'ms',
      byRoute: Object.entries(metrics.responseTimes.byRoute).map(([route, data]) => ({
        route,
        avg: data.avg.toFixed(2) + 'ms',
        min: data.min.toFixed(2) + 'ms',
        max: data.max.toFixed(2) + 'ms',
        count: data.count,
      })),
    },
    cache: {
      ...metrics.cache,
      hitRate: cacheHitRate.toFixed(2) + '%',
    },
    errors: metrics.errors,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}

/**
 * Get top slow routes
 */
function getSlowRoutes(limit = 10) {
  return Object.entries(metrics.responseTimes.byRoute)
    .map(([route, data]) => ({
      route,
      avgTime: data.avg,
      maxTime: data.max,
      count: data.count,
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, limit);
}

/**
 * Get routes with most errors
 */
function getErrorRoutes(limit = 10) {
  return Object.entries(metrics.errors.byRoute)
    .map(([route, count]) => ({
      route,
      errorCount: count,
      requestCount: metrics.requests.byRoute[route] || 0,
      errorRate: ((count / (metrics.requests.byRoute[route] || 1)) * 100).toFixed(2) + '%',
    }))
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, limit);
}

/**
 * Reset metrics
 */
function resetMetrics() {
  metrics.requests = {
    total: 0,
    byMethod: {},
    byRoute: {},
    byStatus: {},
  };
  metrics.responseTimes = {
    total: 0,
    count: 0,
    min: Infinity,
    max: 0,
    byRoute: {},
  };
  metrics.errors = {
    total: 0,
    byType: {},
    byRoute: {},
  };
  metrics.cache = {
    hits: 0,
    misses: 0,
    skips: 0,
  };
}

/**
 * Get system health status
 */
function getHealthStatus() {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: (memUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    external: (memUsage.external / 1024 / 1024).toFixed(2) + ' MB',
  };

  const avgResponseTime = metrics.responseTimes.count > 0
    ? metrics.responseTimes.total / metrics.responseTimes.count
    : 0;

  const errorRate = metrics.requests.total > 0
    ? (metrics.errors.total / metrics.requests.total) * 100
    : 0;

  // Determine health status
  let status = 'healthy';
  const issues = [];

  if (avgResponseTime > 1000) {
    status = 'degraded';
    issues.push('High average response time');
  }

  if (errorRate > 5) {
    status = 'degraded';
    issues.push('High error rate');
  }

  if (errorRate > 10) {
    status = 'unhealthy';
  }

  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    status = 'degraded';
    issues.push('High memory usage');
  }

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: memUsageMB,
    performance: {
      avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
      errorRate: errorRate.toFixed(2) + '%',
      totalRequests: metrics.requests.total,
    },
    issues: issues.length > 0 ? issues : undefined,
  };
}

/**
 * Performance monitoring dashboard data
 */
function getDashboardData() {
  return {
    overview: {
      totalRequests: metrics.requests.total,
      totalErrors: metrics.errors.total,
      avgResponseTime: (metrics.responseTimes.total / metrics.responseTimes.count).toFixed(2) + 'ms',
      uptime: formatUptime(process.uptime()),
    },
    requestsByMethod: metrics.requests.byMethod,
    requestsByStatus: metrics.requests.byStatus,
    topRoutes: Object.entries(metrics.requests.byRoute)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    slowRoutes: getSlowRoutes(10),
    errorRoutes: getErrorRoutes(10),
    cachePerformance: {
      ...metrics.cache,
      hitRate: ((metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses || 1)) * 100).toFixed(2) + '%',
    },
    cacheStats: CacheManager.getAllStats(),
  };
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = {
  responseTimeMiddleware,
  requestTrackingMiddleware,
  getMetrics,
  getSlowRoutes,
  getErrorRoutes,
  getHealthStatus,
  getDashboardData,
  resetMetrics,
  metrics, // Export for testing
};
