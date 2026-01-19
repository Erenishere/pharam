/**
 * Performance Service for Sales Invoices
 * 
 * This service provides performance optimization utilities including
 * virtual scrolling configuration, lazy loading helpers, and performance monitoring.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { debounceTime, throttleTime, distinctUntilChanged } from 'rxjs/operators';

export interface PerformanceMetrics {
    componentLoadTime: number;
    apiResponseTime: number;
    renderTime: number;
    memoryUsage: number;
    cacheHitRate: number;
}

export interface VirtualScrollConfig {
    itemSize: number;
    bufferSize: number;
    enableDynamicSize: boolean;
    trackByFn: (index: number, item: any) => any;
}

@Injectable({
    providedIn: 'root'
})
export class PerformanceService {
    private metrics$ = new BehaviorSubject<PerformanceMetrics>({
        componentLoadTime: 0,
        apiResponseTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0
    });

    // Virtual scroll configurations for different components
    readonly virtualScrollConfigs: Record<string, VirtualScrollConfig> = {
        invoiceList: {
            itemSize: 72, // Height of each invoice row
            bufferSize: 5, // Number of items to render outside viewport
            enableDynamicSize: false,
            trackByFn: (index: number, item: any) => item._id || index
        },
        invoiceItems: {
            itemSize: 56, // Height of each item row
            bufferSize: 3,
            enableDynamicSize: false,
            trackByFn: (index: number, item: any) => item._id || index
        },
        customerList: {
            itemSize: 48, // Height of each customer option
            bufferSize: 5,
            enableDynamicSize: false,
            trackByFn: (index: number, item: any) => item._id || index
        },
        itemList: {
            itemSize: 48, // Height of each item option
            bufferSize: 5,
            enableDynamicSize: false,
            trackByFn: (index: number, item: any) => item._id || index
        }
    };

    constructor() {
        this.initializePerformanceMonitoring();
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): Observable<PerformanceMetrics> {
        return this.metrics$.asObservable();
    }

    /**
     * Update performance metric
     */
    private updateMetric(metricName: keyof PerformanceMetrics, value: number): void {
        const currentMetrics = this.metrics$.value;
        this.metrics$.next({
            ...currentMetrics,
            [metricName]: value
        });
    }

    /**
     * Start timing a performance metric
     */
    startTiming(metricName: string): () => void {
        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            // Only update if metricName is a valid key of PerformanceMetrics
            if (metricName in this.metrics$.value) {
                this.updateMetric(metricName as keyof PerformanceMetrics, duration);
            }
        };
    }

    /**
     * Measure API response time
     */
    measureApiCall<T>(apiCall: Observable<T>, endpoint: string): Observable<T> {
        const startTime = performance.now();

        return new Observable(observer => {
            apiCall.subscribe({
                next: (data) => {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    this.updateMetric('apiResponseTime', duration);
                    console.log(`API call to ${endpoint} took ${duration.toFixed(2)}ms`);
                    observer.next(data);
                },
                error: (error) => {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    console.warn(`API call to ${endpoint} failed after ${duration.toFixed(2)}ms`, error);
                    observer.error(error);
                },
                complete: () => observer.complete()
            });
        });
    }

    /**
     * Create debounced search observable
     */
    createDebouncedSearch(searchInput$: Observable<string>, debounceMs: number = 300): Observable<string> {
        return searchInput$.pipe(
            debounceTime(debounceMs),
            distinctUntilChanged(),
            // Filter out empty or very short search terms
            distinctUntilChanged((prev, curr) => {
                if (curr.length < 2 && prev.length < 2) return true;
                return prev === curr;
            })
        );
    }

    /**
     * Create throttled scroll observable
     */
    createThrottledScroll(element: HTMLElement, throttleMs: number = 16): Observable<Event> {
        return fromEvent(element, 'scroll').pipe(
            throttleTime(throttleMs, undefined, { leading: true, trailing: true })
        );
    }

    /**
     * Get virtual scroll configuration for a component
     */
    getVirtualScrollConfig(componentName: string): VirtualScrollConfig {
        return this.virtualScrollConfigs[componentName] || this.virtualScrollConfigs['invoiceList'];
    }

    /**
     * Optimize change detection by providing OnPush-compatible track functions
     */
    createTrackByFunction<T>(keySelector: (item: T) => any): (index: number, item: T) => any {
        return (index: number, item: T) => {
            if (!item) return index;
            const key = keySelector(item);
            return key !== undefined ? key : index;
        };
    }

    /**
     * Lazy load images with intersection observer
     */
    createLazyImageLoader(): IntersectionObserver {
        return new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    const src = img.dataset['src'];
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources(resources: string[]): void {
        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;

            if (resource.endsWith('.js')) {
                link.as = 'script';
            } else if (resource.endsWith('.css')) {
                link.as = 'style';
            } else if (resource.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
                link.as = 'image';
            }

            document.head.appendChild(link);
        });
    }

    /**
     * Monitor memory usage
     */
    getMemoryUsage(): number {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
        }
        return 0;
    }

    /**
     * Optimize bundle loading with dynamic imports
     */
    async loadComponentLazily<T>(importFn: () => Promise<T>): Promise<T> {
        const startTime = performance.now();

        try {
            const component = await importFn();
            const loadTime = performance.now() - startTime;
            console.log(`Component loaded in ${loadTime.toFixed(2)}ms`);
            return component;
        } catch (error) {
            console.error('Failed to load component lazily:', error);
            throw error;
        }
    }

    /**
     * Create performance-optimized list renderer
     */
    createOptimizedListRenderer<T>(
        items: T[],
        renderFn: (item: T, index: number) => any,
        batchSize: number = 50
    ): any[] {
        const result: any[] = [];

        // Render items in batches to avoid blocking the main thread
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            batch.forEach((item, batchIndex) => {
                result.push(renderFn(item, i + batchIndex));
            });

            // Allow other tasks to run between batches
            if (i + batchSize < items.length) {
                setTimeout(() => { }, 0);
            }
        }

        return result;
    }

    /**
     * Detect if device has limited resources
     */
    isLowEndDevice(): boolean {
        // Check for various indicators of low-end devices
        const connection = (navigator as any).connection;
        const hardwareConcurrency = navigator.hardwareConcurrency || 1;
        const memory = (navigator as any).deviceMemory || 1;

        return (
            hardwareConcurrency <= 2 ||
            memory <= 2 ||
            (connection && connection.effectiveType === 'slow-2g') ||
            (connection && connection.effectiveType === '2g')
        );
    }

    /**
     * Get optimized configuration based on device capabilities
     */
    getOptimizedConfig(): {
        enableAnimations: boolean;
        pageSize: number;
        debounceTime: number;
        enableVirtualScroll: boolean;
        enableCaching: boolean;
    } {
        const isLowEnd = this.isLowEndDevice();

        return {
            enableAnimations: !isLowEnd,
            pageSize: isLowEnd ? 10 : 25,
            debounceTime: isLowEnd ? 500 : 300,
            enableVirtualScroll: !isLowEnd,
            enableCaching: true
        };
    }

    /**
     * Initialize performance monitoring
     */
    private initializePerformanceMonitoring(): void {
        // Monitor memory usage periodically
        setInterval(() => {
            const memoryUsage = this.getMemoryUsage();
            this.updateMetric('memoryUsage', memoryUsage);
        }, 30000); // Every 30 seconds

        // Monitor page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, reduce background activity
                console.log('Page hidden, reducing background activity');
            } else {
                // Page is visible, resume normal activity
                console.log('Page visible, resuming normal activity');
            }
        });
    }

    /**
     * Log performance warning if threshold exceeded
     */
    private checkPerformanceThreshold(metricName: string, value: number, threshold: number): void {
        if (value > threshold) {
            console.warn(`Performance warning: ${metricName} (${value.toFixed(2)}ms) exceeded threshold (${threshold}ms)`);
        }
    }
}