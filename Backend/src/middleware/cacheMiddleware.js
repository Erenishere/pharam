/**
 * Cache Middleware
 * 
 * Express middleware for caching API responses
 */

const { CacheManager } = require('../utils/cache');

/**
 * Create cache middleware
 * @param {object} options - Cache options
 * @param {string} options.duration - Cache duration (short, medium, long)
 * @param {number} options.ttl - Custom TTL in seconds
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.condition - Condition function to determine if response should be cached
 * @returns {Function} Express middleware
 */
function cacheMiddleware(options = {}) {
  const {
    duration = 'medium',
    ttl = null,
    keyGenerator = null,
    condition = null,
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : generateDefaultKey(req);

    // Try to get from cache
    const cached = CacheManager.get(cacheKey, duration);
    if (cached) {
      // Add cache hit header
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Check condition if provided
      if (condition && !condition(req, res, data)) {
        res.set('X-Cache', 'SKIP');
        return originalJson(data);
      }

      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        CacheManager.set(cacheKey, data, duration, ttl);
        res.set('X-Cache', 'MISS');
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Generate default cache key from request
 * @param {object} req - Express request object
 * @returns {string} Cache key
 */
function generateDefaultKey(req) {
  const { path, query, user } = req;
  const userId = user ? user._id.toString() : 'anonymous';
  
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');

  return `route:${path}:${userId}:${queryString}`;
}

/**
 * Cache middleware for specific routes
 */
const routeCache = {
  /**
   * Cache for item lists (5 minutes)
   */
  items: cacheMiddleware({
    duration: 'short',
    keyGenerator: (req) => {
      const { category, isActive, page, limit } = req.query;
      return CacheManager.generateKey('items:list', {
        category,
        isActive,
        page,
        limit,
      });
    },
  }),

  /**
   * Cache for single item (30 minutes)
   */
  item: cacheMiddleware({
    duration: 'medium',
    keyGenerator: (req) => `item:${req.params.id}`,
  }),

  /**
   * Cache for tax configurations (2 hours)
   */
  taxConfig: cacheMiddleware({
    duration: 'long',
    keyGenerator: (req) => {
      const { type, isActive } = req.query;
      return CacheManager.generateKey('taxconfig:list', { type, isActive });
    },
  }),

  /**
   * Cache for customer list (30 minutes)
   */
  customers: cacheMiddleware({
    duration: 'medium',
    keyGenerator: (req) => {
      const { type, isActive, page, limit } = req.query;
      return CacheManager.generateKey('customers:list', {
        type,
        isActive,
        page,
        limit,
      });
    },
  }),

  /**
   * Cache for supplier list (30 minutes)
   */
  suppliers: cacheMiddleware({
    duration: 'medium',
    keyGenerator: (req) => {
      const { type, isActive, page, limit } = req.query;
      return CacheManager.generateKey('suppliers:list', {
        type,
        isActive,
        page,
        limit,
      });
    },
  }),

  /**
   * Cache for reports (5 minutes)
   */
  reports: cacheMiddleware({
    duration: 'short',
    keyGenerator: (req) => {
      const { reportType, startDate, endDate, ...params } = req.query;
      return CacheManager.generateKey(`report:${reportType}`, {
        startDate,
        endDate,
        ...params,
      });
    },
  }),

  /**
   * Cache for dashboard stats (5 minutes)
   */
  dashboard: cacheMiddleware({
    duration: 'short',
    keyGenerator: (req) => {
      const userId = req.user ? req.user._id.toString() : 'anonymous';
      return `dashboard:stats:${userId}`;
    },
  }),
};

/**
 * Middleware to clear cache on mutations
 */
function clearCacheMiddleware(patterns) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to clear cache after successful mutation
    res.json = function(data) {
      // Clear cache only for successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          if (typeof pattern === 'function') {
            pattern(req, data);
          } else {
            CacheManager.del(pattern, 'short');
            CacheManager.del(pattern, 'medium');
            CacheManager.del(pattern, 'long');
          }
        });
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  cacheMiddleware,
  routeCache,
  clearCacheMiddleware,
};
