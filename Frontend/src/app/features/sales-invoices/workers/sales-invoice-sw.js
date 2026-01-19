/**
 * Sales Invoice Service Worker
 * 
 * This service worker provides offline functionality for the sales invoice module
 * including caching strategies, background sync, and offline data management.
 */

const CACHE_NAME = 'sales-invoices-v1';
const API_CACHE_NAME = 'sales-invoices-api-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately
const STATIC_RESOURCES = [
    '/',
    '/sales-invoices',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    OFFLINE_URL
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/v1/invoices/sales',
    '/api/v1/customers',
    '/api/v1/items',
    '/api/v1/warehouses',
    '/api/v1/salesmen'
];

// Install event - cache static resources
self.addEventListener('install', event => {
    console.log('Sales Invoice SW: Installing...');

    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                console.log('Sales Invoice SW: Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            }),
            caches.open(API_CACHE_NAME).then(cache => {
                console.log('Sales Invoice SW: API cache ready');
                return Promise.resolve();
            })
        ]).then(() => {
            console.log('Sales Invoice SW: Installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Sales Invoice SW: Activating...');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                        console.log('Sales Invoice SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Sales Invoice SW: Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Handle static resources
    event.respondWith(handleStaticRequest(request));
});

// Background sync for offline operations
self.addEventListener('sync', event => {
    console.log('Sales Invoice SW: Background sync triggered:', event.tag);

    if (event.tag === 'sales-invoice-sync') {
        event.waitUntil(syncOfflineOperations());
    }
});

// Push notifications (for future use)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        console.log('Sales Invoice SW: Push notification received:', data);

        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/badge-72x72.png',
                data: data.data
            })
        );
    }
});

// Handle API requests with cache-first strategy for GET, network-first for others
async function handleApiRequest(request) {
    const url = new URL(request.url);
    const cache = await caches.open(API_CACHE_NAME);

    try {
        if (request.method === 'GET') {
            // Cache-first strategy for GET requests
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                // Return cached response and update cache in background
                updateCacheInBackground(request, cache);
                return cachedResponse;
            }
        }

        // Network-first strategy
        const networkResponse = await fetch(request);

        if (networkResponse.ok && request.method === 'GET') {
            // Cache successful GET responses
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        console.log('Sales Invoice SW: Network request failed:', error);

        if (request.method === 'GET') {
            // Try to return cached response for GET requests
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        // For non-GET requests, queue for background sync
        if (request.method !== 'GET') {
            await queueOfflineOperation(request);
            return new Response(JSON.stringify({
                success: false,
                message: 'Operation queued for sync when online',
                queued: true
            }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        throw error;
    }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.log('Sales Invoice SW: Navigation request failed, serving offline page');
        const cache = await caches.open(CACHE_NAME);
        return cache.match(OFFLINE_URL);
    }
}

// Handle static resource requests
async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback to network
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        console.log('Sales Invoice SW: Static request failed:', error);
        throw error;
    }
}

// Update cache in background
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        console.log('Sales Invoice SW: Background cache update failed:', error);
    }
}

// Queue offline operation for background sync
async function queueOfflineOperation(request) {
    try {
        const operation = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: request.method !== 'GET' ? await request.text() : null,
            timestamp: Date.now()
        };

        // Store in IndexedDB (simplified implementation)
        const db = await openOfflineDB();
        const transaction = db.transaction(['operations'], 'readwrite');
        const store = transaction.objectStore('operations');
        await store.add(operation);

        // Register background sync
        await self.registration.sync.register('sales-invoice-sync');

    } catch (error) {
        console.error('Sales Invoice SW: Failed to queue offline operation:', error);
    }
}

// Sync offline operations when back online
async function syncOfflineOperations() {
    try {
        const db = await openOfflineDB();
        const transaction = db.transaction(['operations'], 'readonly');
        const store = transaction.objectStore('operations');
        const operations = await store.getAll();

        console.log(`Sales Invoice SW: Syncing ${operations.length} offline operations`);

        for (const operation of operations) {
            try {
                const request = new Request(operation.url, {
                    method: operation.method,
                    headers: operation.headers,
                    body: operation.body
                });

                const response = await fetch(request);

                if (response.ok) {
                    // Remove successful operation from queue
                    const deleteTransaction = db.transaction(['operations'], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore('operations');
                    await deleteStore.delete(operation.id);

                    console.log('Sales Invoice SW: Synced operation:', operation.url);
                }

            } catch (error) {
                console.error('Sales Invoice SW: Failed to sync operation:', operation.url, error);
            }
        }

    } catch (error) {
        console.error('Sales Invoice SW: Background sync failed:', error);
    }
}

// Open IndexedDB for offline operations
function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SalesInvoiceOfflineDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('operations')) {
                const store = db.createObjectStore('operations', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('url', 'url');
            }
        };
    });
}

// Utility function to broadcast messages to clients
function broadcastMessage(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}

// Handle messages from the main thread
self.addEventListener('message', event => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;

        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;

        default:
            console.log('Sales Invoice SW: Unknown message type:', type);
    }
});

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Sales Invoice SW: All caches cleared');
}

// Get cache status
async function getCacheStatus() {
    const staticCache = await caches.open(CACHE_NAME);
    const apiCache = await caches.open(API_CACHE_NAME);

    const staticKeys = await staticCache.keys();
    const apiKeys = await apiCache.keys();

    return {
        staticCacheSize: staticKeys.length,
        apiCacheSize: apiKeys.length,
        totalSize: staticKeys.length + apiKeys.length
    };
}