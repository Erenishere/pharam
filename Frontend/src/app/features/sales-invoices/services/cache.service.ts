/**
 * Cache Service for Sales Invoices
 * 
 * This service provides caching functionality for frequently accessed data
 * like customers, items, warehouses, and salesmen to improve performance.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

export interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of entries
}

@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly defaultConfig: CacheConfig = {
        ttl: 5 * 60 * 1000, // 5 minutes
        maxSize: 1000
    };

    // Cache configurations for different data types
    private readonly cacheConfigs: Record<string, CacheConfig> = {
        customers: { ttl: 10 * 60 * 1000, maxSize: 500 }, // 10 minutes
        items: { ttl: 15 * 60 * 1000, maxSize: 1000 }, // 15 minutes
        warehouses: { ttl: 30 * 60 * 1000, maxSize: 100 }, // 30 minutes
        salesmen: { ttl: 20 * 60 * 1000, maxSize: 200 }, // 20 minutes
        invoiceStats: { ttl: 2 * 60 * 1000, maxSize: 50 }, // 2 minutes
        invoiceList: { ttl: 1 * 60 * 1000, maxSize: 100 } // 1 minute
    };

    constructor() {
        // Clean up expired entries every 5 minutes
        timer(0, 5 * 60 * 1000).subscribe(() => {
            this.cleanupExpiredEntries();
        });
    }

    /**
     * Get data from cache or execute the provided function
     */
    get<T>(key: string, dataType: string, fetchFn: () => Observable<T>): Observable<T> {
        const cachedEntry = this.cache.get(key);
        const config = this.cacheConfigs[dataType] || this.defaultConfig;

        // Check if cached data exists and is not expired
        if (cachedEntry && Date.now() < cachedEntry.expiry) {
            return of(cachedEntry.data);
        }

        // Fetch fresh data and cache it
        return fetchFn().pipe(
            tap(data => {
                this.set(key, data, config);
            }),
            shareReplay(1),
            catchError(error => {
                // If fetch fails and we have expired cached data, return it
                if (cachedEntry) {
                    console.warn(`Using expired cache for ${key} due to fetch error:`, error);
                    return of(cachedEntry.data);
                }
                throw error;
            })
        );
    }

    /**
     * Set data in cache
     */
    set<T>(key: string, data: T, config: CacheConfig = this.defaultConfig): void {
        // Check cache size limit
        if (this.cache.size >= config.maxSize) {
            this.evictOldestEntries(Math.floor(config.maxSize * 0.1)); // Remove 10% of entries
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + config.ttl
        };

        this.cache.set(key, entry);
    }

    /**
     * Get data directly from cache (without fallback)
     */
    getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (entry && Date.now() < entry.expiry) {
            return entry.data;
        }
        return null;
    }

    /**
     * Check if key exists in cache and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        return entry !== undefined && Date.now() < entry.expiry;
    }

    /**
     * Remove specific key from cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear cache entries by pattern
     */
    clearByPattern(pattern: string): void {
        const regex = new RegExp(pattern);
        const keysToDelete: string[] = [];

        this.cache.forEach((_, key) => {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        totalEntries: number;
        expiredEntries: number;
        cacheHitRate: number;
        memoryUsage: number;
    } {
        const now = Date.now();
        let expiredCount = 0;
        let totalSize = 0;

        this.cache.forEach(entry => {
            if (now >= entry.expiry) {
                expiredCount++;
            }
            totalSize += JSON.stringify(entry.data).length;
        });

        return {
            totalEntries: this.cache.size,
            expiredEntries: expiredCount,
            cacheHitRate: this.getCacheHitRate(),
            memoryUsage: totalSize
        };
    }

    /**
     * Preload frequently accessed data
     */
    preloadData(dataLoaders: Record<string, () => Observable<any>>): void {
        Object.entries(dataLoaders).forEach(([key, loader]) => {
            if (!this.has(key)) {
                loader().subscribe(
                    data => {
                        const dataType = key.split(':')[0]; // Extract data type from key
                        const config = this.cacheConfigs[dataType] || this.defaultConfig;
                        this.set(key, data, config);
                    },
                    error => console.warn(`Failed to preload ${key}:`, error)
                );
            }
        });
    }

    /**
     * Clean up expired entries
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.cache.forEach((entry, key) => {
            if (now >= entry.expiry) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
            console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    }

    /**
     * Evict oldest entries when cache is full
     */
    private evictOldestEntries(count: number): void {
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp)
            .slice(0, count);

        entries.forEach(([key]) => this.cache.delete(key));
    }

    /**
     * Calculate cache hit rate (simplified implementation)
     */
    private getCacheHitRate(): number {
        // This would need to be implemented with proper hit/miss tracking
        // For now, return a placeholder value
        return 0.85; // 85% hit rate placeholder
    }

    /**
     * Generate cache key for API requests
     */
    generateKey(prefix: string, params: Record<string, any>): string {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((result, key) => {
                result[key] = params[key];
                return result;
            }, {} as Record<string, any>);

        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }

    /**
     * Invalidate related cache entries when data changes
     */
    invalidateRelated(patterns: string[]): void {
        patterns.forEach(pattern => {
            this.clearByPattern(pattern);
        });
    }
}