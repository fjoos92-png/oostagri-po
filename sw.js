const CACHE_NAME = 'farm-po-v50';
const OFFLINE_QUEUE_KEY = 'farm_po_offline_queue';

// Core assets that must be cached (local files)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// External CDN assets (cached opportunistically - failures won't break install)
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Install: Cache assets (core required, CDN optional)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Caching core assets');
      // Cache core assets - these must succeed
      await cache.addAll(CORE_ASSETS);

      // Cache CDN assets individually - failures are logged but don't break install
      console.log('Caching CDN assets');
      for (const url of CDN_ASSETS) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            await cache.put(url, response);
            console.log('Cached:', url);
          }
        } catch (err) {
          console.warn('Failed to cache CDN asset:', url, err.message);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // For API calls, try network first, then fail gracefully
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return empty response for API failures when offline
          return new Response(JSON.stringify({ success: false, offline: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, but also update cache in background
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Return offline fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      // For other requests, try to return any cached version
      return caches.match(request);
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'SYNC_ORDERS') {
    syncOfflineOrders();
  }
});

// Background sync when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Sync offline orders to Google Sheets
async function syncOfflineOrders() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNCING_STARTED' });
    });
    
    // Get offline queue from IndexedDB or notify client to handle it
    clients.forEach(client => {
      client.postMessage({ type: 'TRIGGER_SYNC' });
    });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
