/**
 * Cache Utility Tests
 */

const { CacheManager, CacheInvalidation, caches } = require('../../src/utils/cache');

describe('CacheManager', () => {
  beforeEach(() => {
    // Clear all caches before each test
    CacheManager.clearAll();
  });

  afterAll(() => {
    // Clear all caches after tests
    CacheManager.clearAll();
  });

  describe('Basic Operations', () => {
    test('should set and get value from cache', () => {
      const key = 'test:key';
      const value = { data: 'test data' };

      CacheManager.set(key, value);
      const cached = CacheManager.get(key);

      expect(cached).toEqual(value);
    });

    test('should return undefined for non-existent key', () => {
      const cached = CacheManager.get('non:existent');
      expect(cached).toBeUndefined();
    });

    test('should delete value from cache', () => {
      const key = 'test:key';
      const value = { data: 'test data' };

      CacheManager.set(key, value);
      CacheManager.del(key);
      const cached = CacheManager.get(key);

      expect(cached).toBeUndefined();
    });

    test('should delete multiple keys from cache', () => {
      const keys = ['key1', 'key2', 'key3'];
      keys.forEach(key => CacheManager.set(key, { data: key }));

      CacheManager.delMultiple(keys);

      keys.forEach(key => {
        expect(CacheManager.get(key)).toBeUndefined();
      });
    });

    test('should clear specific cache', () => {
      CacheManager.set('key1', 'value1', 'short');
      CacheManager.set('key2', 'value2', 'medium');

      CacheManager.clear('short');

      expect(CacheManager.get('key1', 'short')).toBeUndefined();
      expect(CacheManager.get('key2', 'medium')).toBeDefined();
    });

    test('should clear all caches', () => {
      CacheManager.set('key1', 'value1', 'short');
      CacheManager.set('key2', 'value2', 'medium');
      CacheManager.set('key3', 'value3', 'long');

      CacheManager.clearAll();

      expect(CacheManager.get('key1', 'short')).toBeUndefined();
      expect(CacheManager.get('key2', 'medium')).toBeUndefined();
      expect(CacheManager.get('key3', 'long')).toBeUndefined();
    });
  });

  describe('Cache Durations', () => {
    test('should use short cache duration', () => {
      const key = 'test:short';
      const value = { data: 'short' };

      CacheManager.set(key, value, 'short');
      const cached = CacheManager.get(key, 'short');

      expect(cached).toEqual(value);
    });

    test('should use medium cache duration', () => {
      const key = 'test:medium';
      const value = { data: 'medium' };

      CacheManager.set(key, value, 'medium');
      const cached = CacheManager.get(key, 'medium');

      expect(cached).toEqual(value);
    });

    test('should use long cache duration', () => {
      const key = 'test:long';
      const value = { data: 'long' };

      CacheManager.set(key, value, 'long');
      const cached = CacheManager.get(key, 'long');

      expect(cached).toEqual(value);
    });

    test('should throw error for invalid duration', () => {
      expect(() => {
        CacheManager.set('key', 'value', 'invalid');
      }).toThrow('Invalid cache duration: invalid');
    });
  });

  describe('Custom TTL', () => {
    test('should set custom TTL', (done) => {
      const key = 'test:ttl';
      const value = { data: 'ttl test' };
      const ttl = 1; // 1 second

      CacheManager.set(key, value, 'medium', ttl);

      // Should exist immediately
      expect(CacheManager.get(key, 'medium')).toEqual(value);

      // Should expire after TTL
      setTimeout(() => {
        expect(CacheManager.get(key, 'medium')).toBeUndefined();
        done();
      }, 1500);
    });
  });

  describe('Key Generation', () => {
    test('should generate key from prefix only', () => {
      const key = CacheManager.generateKey('test');
      expect(key).toBe('test');
    });

    test('should generate key from prefix and params', () => {
      const key = CacheManager.generateKey('test', { id: '123', type: 'sales' });
      expect(key).toContain('test:');
      expect(key).toContain('id:123');
      expect(key).toContain('type:sales');
    });

    test('should generate consistent keys regardless of param order', () => {
      const key1 = CacheManager.generateKey('test', { a: '1', b: '2', c: '3' });
      const key2 = CacheManager.generateKey('test', { c: '3', a: '1', b: '2' });
      expect(key1).toBe(key2);
    });
  });

  describe('Function Wrapping', () => {
    test('should wrap function with caching', async () => {
      let callCount = 0;
      const fn = async (x, y) => {
        callCount++;
        return x + y;
      };

      const cachedFn = CacheManager.wrap(fn, 'test:fn');

      // First call should execute function
      const result1 = await cachedFn(1, 2);
      expect(result1).toBe(3);
      expect(callCount).toBe(1);

      // Second call should use cache
      const result2 = await cachedFn(1, 2);
      expect(result2).toBe(3);
      expect(callCount).toBe(1); // Should not increment

      // Different arguments should execute function again
      const result3 = await cachedFn(2, 3);
      expect(result3).toBe(5);
      expect(callCount).toBe(2);
    });
  });

  describe('Statistics', () => {
    test('should get cache statistics', () => {
      CacheManager.set('key1', 'value1');
      CacheManager.set('key2', 'value2');

      const stats = CacheManager.getStats('medium');

      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats.keys).toBe(2);
    });

    test('should get all cache statistics', () => {
      CacheManager.set('key1', 'value1', 'short');
      CacheManager.set('key2', 'value2', 'medium');
      CacheManager.set('key3', 'value3', 'long');

      const stats = CacheManager.getAllStats();

      expect(stats).toHaveProperty('short');
      expect(stats).toHaveProperty('medium');
      expect(stats).toHaveProperty('long');
      expect(stats.short.keys).toBe(1);
      expect(stats.medium.keys).toBe(1);
      expect(stats.long.keys).toBe(1);
    });
  });
});

describe('CacheInvalidation', () => {
  beforeEach(() => {
    CacheManager.clearAll();
  });

  afterAll(() => {
    CacheManager.clearAll();
  });

  test('should invalidate invoice caches', () => {
    const invoiceId = '123';
    CacheManager.set(`invoice:${invoiceId}`, { data: 'invoice' }, 'short');
    CacheManager.set('invoices:list', { data: 'list' }, 'short');

    CacheInvalidation.invalidateInvoice(invoiceId);

    expect(CacheManager.get(`invoice:${invoiceId}`, 'short')).toBeUndefined();
    expect(CacheManager.get('invoices:list', 'short')).toBeUndefined();
  });

  test('should invalidate item caches', () => {
    const itemId = '456';
    CacheManager.set(`item:${itemId}`, { data: 'item' }, 'medium');
    CacheManager.set('items:list', { data: 'list' }, 'medium');

    CacheInvalidation.invalidateItem(itemId);

    expect(CacheManager.get(`item:${itemId}`, 'medium')).toBeUndefined();
    expect(CacheManager.get('items:list', 'medium')).toBeUndefined();
  });

  test('should invalidate customer caches', () => {
    const customerId = '789';
    CacheManager.set(`customer:${customerId}`, { data: 'customer' }, 'medium');
    CacheManager.set('customers:list', { data: 'list' }, 'medium');

    CacheInvalidation.invalidateCustomer(customerId);

    expect(CacheManager.get(`customer:${customerId}`, 'medium')).toBeUndefined();
    expect(CacheManager.get('customers:list', 'medium')).toBeUndefined();
  });

  test('should invalidate supplier caches', () => {
    const supplierId = '101';
    CacheManager.set(`supplier:${supplierId}`, { data: 'supplier' }, 'medium');
    CacheManager.set('suppliers:list', { data: 'list' }, 'medium');

    CacheInvalidation.invalidateSupplier(supplierId);

    expect(CacheManager.get(`supplier:${supplierId}`, 'medium')).toBeUndefined();
    expect(CacheManager.get('suppliers:list', 'medium')).toBeUndefined();
  });

  test('should invalidate tax config caches', () => {
    CacheManager.set('taxconfig:active', { data: 'active' }, 'long');
    CacheManager.set('taxconfig:list', { data: 'list' }, 'long');

    CacheInvalidation.invalidateTaxConfig();

    expect(CacheManager.get('taxconfig:active', 'long')).toBeUndefined();
    expect(CacheManager.get('taxconfig:list', 'long')).toBeUndefined();
  });

  test('should invalidate ledger caches', () => {
    const accountId = '202';
    CacheManager.set(`ledger:${accountId}`, { data: 'ledger' }, 'short');
    CacheManager.set(`ledger:balance:${accountId}`, { data: 'balance' }, 'short');

    CacheInvalidation.invalidateLedger(accountId);

    expect(CacheManager.get(`ledger:${accountId}`, 'short')).toBeUndefined();
    expect(CacheManager.get(`ledger:balance:${accountId}`, 'short')).toBeUndefined();
  });
});
