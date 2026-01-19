/**
 * Offline Service for Sales Invoices
 * 
 * This service provides offline functionality including data synchronization,
 * offline storage, and network connectivity monitoring.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of, timer } from 'rxjs';
import { map, startWith, distinctUntilChanged, switchMap, catchError, retry, delay } from 'rxjs/operators';

export interface OfflineData {
    key: string;
    data: any;
    timestamp: number;
    action: 'create' | 'update' | 'delete';
    synced: boolean;
}

export interface SyncStatus {
    isOnline: boolean;
    lastSyncTime: number;
    pendingOperations: number;
    syncInProgress: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class OfflineService {
    private readonly STORAGE_KEY = 'sales_invoices_offline_data';
    private readonly SYNC_INTERVAL = 30000; // 30 seconds

    private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
    private syncStatus$ = new BehaviorSubject<SyncStatus>({
        isOnline: navigator.onLine,
        lastSyncTime: 0,
        pendingOperations: 0,
        syncInProgress: false
    });

    private offlineQueue: OfflineData[] = [];
    private syncCallbacks: Map<string, (data: any) => Observable<any>> = new Map();

    constructor() {
        this.initializeOfflineSupport();
        this.loadOfflineQueue();
        this.startSyncTimer();
    }

    /**
     * Get online status observable
     */
    getOnlineStatus(): Observable<boolean> {
        return this.isOnline$.asObservable();
    }

    /**
     * Get sync status observable
     */
    getSyncStatus(): Observable<SyncStatus> {
        return this.syncStatus$.asObservable();
    }

    /**
     * Check if currently online
     */
    isOnline(): boolean {
        return this.isOnline$.value;
    }

    /**
     * Store data for offline use
     */
    storeOfflineData(key: string, data: any): void {
        try {
            localStorage.setItem(`offline_${key}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to store offline data:', error);
        }
    }

    /**
     * Retrieve offline data
     */
    getOfflineData<T>(key: string): T | null {
        try {
            const stored = localStorage.getItem(`offline_${key}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.data;
            }
        } catch (error) {
            console.warn('Failed to retrieve offline data:', error);
        }
        return null;
    }

    /**
     * Queue operation for later synchronization
     */
    queueOperation(key: string, data: any, action: 'create' | 'update' | 'delete'): void {
        const operation: OfflineData = {
            key,
            data,
            timestamp: Date.now(),
            action,
            synced: false
        };

        this.offlineQueue.push(operation);
        this.saveOfflineQueue();
        this.updateSyncStatus();
    }

    /**
     * Register sync callback for a specific operation type
     */
    registerSyncCallback(operationType: string, callback: (data: any) => Observable<any>): void {
        this.syncCallbacks.set(operationType, callback);
    }

    /**
     * Manually trigger synchronization
     */
    syncNow(): Observable<boolean> {
        if (!this.isOnline()) {
            return of(false);
        }

        return this.performSync();
    }

    /**
     * Clear all offline data
     */
    clearOfflineData(): void {
        this.offlineQueue = [];
        this.saveOfflineQueue();

        // Clear all offline storage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('offline_')) {
                localStorage.removeItem(key);
            }
        });

        this.updateSyncStatus();
    }

    /**
     * Get pending operations count
     */
    getPendingOperationsCount(): number {
        return this.offlineQueue.filter(op => !op.synced).length;
    }

    /**
     * Create offline-capable HTTP request wrapper
     */
    createOfflineRequest<T>(
        key: string,
        onlineRequest: () => Observable<T>,
        fallbackData?: T
    ): Observable<T> {
        if (this.isOnline()) {
            return onlineRequest().pipe(
                catchError(error => {
                    console.warn('Online request failed, checking offline data:', error);
                    const offlineData = this.getOfflineData<T>(key);
                    if (offlineData) {
                        return of(offlineData);
                    }
                    if (fallbackData) {
                        return of(fallbackData);
                    }
                    throw error;
                })
            );
        } else {
            // Offline mode - return cached data
            const offlineData = this.getOfflineData<T>(key);
            if (offlineData) {
                return of(offlineData);
            }
            if (fallbackData) {
                return of(fallbackData);
            }
            throw new Error('No offline data available');
        }
    }

    /**
     * Initialize offline support
     */
    private initializeOfflineSupport(): void {
        // Listen for online/offline events
        const online$ = fromEvent(window, 'online').pipe(map(() => true));
        const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

        merge(online$, offline$)
            .pipe(startWith(navigator.onLine))
            .subscribe(isOnline => {
                this.isOnline$.next(isOnline);
                this.updateSyncStatus();

                if (isOnline) {
                    console.log('Connection restored, starting sync...');
                    this.performSync().subscribe();
                } else {
                    console.log('Connection lost, switching to offline mode');
                }
            });

        // Listen for visibility changes to sync when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline()) {
                this.performSync().subscribe();
            }
        });
    }

    /**
     * Load offline queue from storage
     */
    private loadOfflineQueue(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.offlineQueue = JSON.parse(stored);
                this.updateSyncStatus();
            }
        } catch (error) {
            console.warn('Failed to load offline queue:', error);
            this.offlineQueue = [];
        }
    }

    /**
     * Save offline queue to storage
     */
    private saveOfflineQueue(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.warn('Failed to save offline queue:', error);
        }
    }

    /**
     * Start automatic sync timer
     */
    private startSyncTimer(): void {
        timer(this.SYNC_INTERVAL, this.SYNC_INTERVAL)
            .pipe(
                switchMap(() => {
                    if (this.isOnline() && this.getPendingOperationsCount() > 0) {
                        return this.performSync();
                    }
                    return of(false);
                })
            )
            .subscribe();
    }

    /**
     * Perform synchronization of pending operations
     */
    private performSync(): Observable<boolean> {
        if (this.syncStatus$.value.syncInProgress) {
            return of(false);
        }

        this.updateSyncStatus({ syncInProgress: true });

        const pendingOperations = this.offlineQueue.filter(op => !op.synced);

        if (pendingOperations.length === 0) {
            this.updateSyncStatus({ syncInProgress: false });
            return of(true);
        }

        console.log(`Syncing ${pendingOperations.length} pending operations...`);

        // Process operations in batches to avoid overwhelming the server
        const batchSize = 5;
        const batches: OfflineData[][] = [];

        for (let i = 0; i < pendingOperations.length; i += batchSize) {
            batches.push(pendingOperations.slice(i, i + batchSize));
        }

        return this.processBatches(batches).pipe(
            map(results => {
                const successCount = results.filter(r => r).length;
                console.log(`Sync completed: ${successCount}/${pendingOperations.length} operations synced`);

                this.updateSyncStatus({
                    syncInProgress: false,
                    lastSyncTime: Date.now()
                });

                return successCount === pendingOperations.length;
            }),
            catchError(error => {
                console.error('Sync failed:', error);
                this.updateSyncStatus({ syncInProgress: false });
                return of(false);
            })
        );
    }

    /**
     * Process batches of operations
     */
    private processBatches(batches: OfflineData[][]): Observable<boolean[]> {
        return new Observable(observer => {
            const results: boolean[] = [];
            let currentBatch = 0;

            const processBatch = () => {
                if (currentBatch >= batches.length) {
                    observer.next(results);
                    observer.complete();
                    return;
                }

                const batch = batches[currentBatch];
                const batchPromises = batch.map(operation => this.syncOperation(operation));

                Promise.all(batchPromises)
                    .then(batchResults => {
                        results.push(...batchResults);
                        currentBatch++;
                        // Add delay between batches to avoid overwhelming the server
                        setTimeout(processBatch, 1000);
                    })
                    .catch(error => {
                        console.error('Batch processing failed:', error);
                        results.push(...batch.map(() => false));
                        currentBatch++;
                        setTimeout(processBatch, 2000); // Longer delay on error
                    });
            };

            processBatch();
        });
    }

    /**
     * Sync individual operation
     */
    private async syncOperation(operation: OfflineData): Promise<boolean> {
        try {
            const callback = this.syncCallbacks.get(operation.key.split(':')[0]);
            if (!callback) {
                console.warn(`No sync callback registered for ${operation.key}`);
                return false;
            }

            await callback(operation.data).pipe(
                retry(2),
                delay(500)
            ).toPromise();

            // Mark as synced
            operation.synced = true;
            this.saveOfflineQueue();

            return true;
        } catch (error) {
            console.error(`Failed to sync operation ${operation.key}:`, error);
            return false;
        }
    }

    /**
     * Update sync status
     */
    private updateSyncStatus(updates: Partial<SyncStatus> = {}): void {
        const currentStatus = this.syncStatus$.value;
        const newStatus: SyncStatus = {
            ...currentStatus,
            isOnline: this.isOnline$.value,
            pendingOperations: this.getPendingOperationsCount(),
            ...updates
        };

        this.syncStatus$.next(newStatus);
    }

    /**
     * Clean up old synced operations
     */
    private cleanupSyncedOperations(): void {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        this.offlineQueue = this.offlineQueue.filter(op =>
            !op.synced || op.timestamp > cutoffTime
        );
        this.saveOfflineQueue();
    }
}