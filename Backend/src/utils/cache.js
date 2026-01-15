/**
 * Cache Utility
 * 
 * Provides in-memory caching for frequently accessed data
 * Uses node-cache for simple, fast caching
 */

const NodeCache = require('node-cache');

// Cache instances with different TTL settings
const caches = {
  // Short-lived cache (5 minutes) - for frequently changing data
  short: new NodeCache({
    stdTTL: 300, // 5 minutes
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false, // Don't clone objects (better performance)
  }),

  // Medium-lived cache (30 minutes) - for semi-static data
  medium: new NodeCache({
    stdTTL: 1800, // 30 minutes
    checkperiod: 300,
    useClones: false,
  }),

  // Long-lived cache (2 hours) - for static data
  long: new NodeCache({
    stdTTL: 7200, // 2 hours
    checkperiod: 600,
    useClones: false,
  }),
};

/**
 * Cache wrapper with automatic key generation
 */
class CacheManager {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @param {string} duration - Cache duration (short, medium, long)
   * @returns {any} Cached value or undefined
   */
  static get(key, duration = 'medium') {
    const cache = caches[duration];
    if (!cache) {
      throw new Error(`Invalid cache duration: ${duration}`);
    }
    return cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string} duration - Cache duration (short, medium, long)
   * @param {number} ttl - Custom TTL in seconds (optional)
   */
  static set(key, value, duration = 'medium', ttl = null) {
    const cache = caches[duration];
    if (!cache) {
      throw new Error(`Invalid cache duration: ${duration}`);
    }
    
    if (ttl) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @param {string} duration - Cache duration (short, medium, long)
   */
  static del(key, duration = 'medium') {
    const cache = caches[duration];
    if (!cache) {
      throw new Error(`Invalid cache duration: ${duration}`);
    }
    cache.del(key);
  }

  /**
   * Delete multiple keys from cache
   * @param {string[]} keys - Array of cache keys
   * @param {string} duration - Cache duration (short, medium, long)
   */
  static delMultiple(keys, duration = 'medium') {
    const cache = caches[duration];
    if (!cache) {
      throw new Error(`Invalid cache duration: ${duration}`);
    }
    cache.del(keys);
  }

  /**
   * Clear all caches
   */
  static clearAll() {
    Object.values(caches).forEach(cache => cache.flushAll());
  }

  /**
   * Clear specific cache
   * @param {string} duration - Cache duration (short, medium, long)
   */
  static clear(duration = 'medium') {
    const cache = caches[duration];
    if (!cache) {
      throw new Error(`Invalid cache duration: ${duration}`);
    }
    cache.flushAll();
  }

  /**
   * Get cache statistics
   * @param {string} duration - Cache duration (short, medium, long)
   */
  static getStats(duration = 'medium') {
    const cache = caches[duration];
    if (!cache) {
      throw new Error(`Invalid cache duration: ${duration}`);
    }
    return cache.getStats();
  }

  /**
   * Get all cache statistics
   */
  static getAllStats() {
    return {
      short: caches.short.getStats(),
      medium: caches.medium.getStats(),
      long: caches.long.getStats(),
    };
  }

  /**
   * Generate cache key from object
   * @param {string} prefix - Key prefix
   * @param {object} params - Parameters to include in key
   * @returns {string} Generated cache key
   */
  static generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return sortedParams ? `${prefix}:${sortedParams}` : prefix;
  }

  /**
   * Wrap a function with caching
   * @param {Function} fn - Function to wrap
   * @param {string} keyPrefix - Cache key prefix
   * @param {string} duration - Cache duration
   * @returns {Function} Wrapped function
   */
  static wrap(fn, keyPrefix, duration = 'medium') {
    return async function(...args) {
      // Generate cache key from arguments
      const key = CacheManager.generateKey(keyPrefix, { args: JSON.stringify(args) });
      
      // Try to get from cache
      const cached = CacheManager.get(key, duration);
      if (cached !== undefined) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn.apply(this, args);
      CacheManager.set(key, result, duration);
      
      return result;
    };
  }
}

/**
 * Cache invalidation patterns
 */
class CacheInvalidation {
  /**
   * Invalidate all invoice-related caches
   * @param {string} invoiceId - Invoice ID
   */
  static invalidateInvoice(invoiceId) {
    const patterns = [
      `invoice:${invoiceId}`,
      'invoices:list',
      'invoices:overdue',
      'invoices:stats',
    ];
    
    patterns.forEach(pattern => {
      CacheManager.del(pattern, 'short');
      CacheManager.del(pattern, 'medium');
    });
  }

  /**
   * Invalidate all item-related caches
   * @param {string} itemId - Item ID
   */
  static invalidateItem(itemId) {
    const patterns = [
      `item:${itemId}`,
      'items:list',
      'items:lowstock',
      'items:category',
    ];
    
    patterns.forEach(pattern => {
      CacheManager.del(pattern, 'short');
      CacheManager.del(pattern, 'medium');
    });
  }

  /**
   * Invalidate all customer-related caches
   * @param {string} customerId - Customer ID
   */
  static invalidateCustomer(customerId) {
    const patterns = [
      `customer:${customerId}`,
      'customers:list',
    ];
    
    patterns.forEach(pattern => {
      CacheManager.del(pattern, 'medium');
    });
  }

  /**
   * Invalidate all supplier-related caches
   * @param {string} supplierId - Supplier ID
   */
  static invalidateSupplier(supplierId) {
    const patterns = [
      `supplier:${supplierId}`,
      'suppliers:list',
    ];
    
    patterns.forEach(pattern => {
      CacheManager.del(pattern, 'medium');
    });
  }

  /**
   * Invalidate tax configuration caches
   */
  static invalidateTaxConfig() {
    const patterns = [
      'taxconfig:active',
      'taxconfig:effective',
      'taxconfig:list',
    ];
    
    patterns.forEach(pattern => {
      CacheManager.del(pattern, 'long');
    });
  }

  /**
   * Invalidate ledger-related caches
   * @param {string} accountId - Account ID
   */
  static invalidateLedger(accountId) {
    const patterns = [
      `ledger:${accountId}`,
      `ledger:balance:${accountId}`,
      'ledger:list',
    ];
    
    patterns.forEach(pattern => {
      CacheManager.del(pattern, 'short');
    });
  }
}

module.exports = {
  CacheManager,
  CacheInvalidation,
  caches, // Export for testing
};
