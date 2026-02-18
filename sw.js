// Service Worker for Personal Finance Tracker
// Provides offline functionality and caching

const CACHE_NAME = 'finance-tracker-v1.0.0';
const CACHE_VERSION = '1.0.0';

// Files to cache for offline use
const STATIC_CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  
  // CSS files
  './css/main.css',
  './css/charts.css', 
  './css/mobile.css',
  
  // JavaScript files
  './js/config.js',
  './js/utils.js',
  './js/data.js',
  './js/charts.js',
  './js/ui.js',
  './js/main.js',
  
  // Assets (if they exist)
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Dynamic cache patterns
const DYNAMIC_CACHE_PATTERNS = [
  // Google Fonts
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  
  // Chart.js CDN
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js/,
  
  // Google Sheets API (cache with short TTL)
  /^https:\/\/sheets\.googleapis\.com/
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first', 
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('💾 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Static files cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName !== CACHE_NAME && cacheName.startsWith('finance-tracker-')) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated successfully');
        // Take control of all pages immediately
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Activation failed:', error);
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Determine caching strategy based on request type
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

// Determine appropriate cache strategy for request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Static assets - cache first
  if (STATIC_CACHE_FILES.includes(url.pathname) || 
      url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Google Sheets API - network first (fresh data preferred)
  if (url.hostname === 'sheets.googleapis.com') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // External CDNs - stale while revalidate
  if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Handle request with specified strategy
async function handleRequest(request, strategy) {
  const cacheName = CACHE_NAME;
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName);
      
    default:
      return networkFirst(request, cacheName);
  }
}

// Cache first strategy - check cache first, fallback to network
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('Network request failed:', error);
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network first strategy - try network first, fallback to cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('Network request failed, checking cache:', error);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await cache.match('./offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Stale while revalidate - return cached version, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Start network request in background
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn('Background update failed:', error);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cached version, wait for network
  try {
    return await networkResponsePromise;
  } catch (error) {
    return new Response('Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Background sync for data updates
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'finance-data-sync') {
    event.waitUntil(
      syncFinanceData().catch((error) => {
        console.error('Background sync failed:', error);
      })
    );
  }
});

// Sync finance data in background
async function syncFinanceData() {
  console.log('💰 Service Worker: Syncing finance data...');
  
  // This would typically sync with Google Sheets API
  // For now, just clear old cached API responses
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const sheetsRequests = keys.filter(request => 
    request.url.includes('sheets.googleapis.com')
  );
  
  // Delete cached sheets data to force fresh fetch
  await Promise.all(
    sheetsRequests.map(request => cache.delete(request))
  );
  
  console.log('✅ Service Worker: Finance data sync completed');
}

// Push notifications (for future BAI integration)
self.addEventListener('push', (event) => {
  console.log('📧 Service Worker: Push notification received');
  
  const options = {
    title: 'Finance Tracker',
    body: 'New financial insights available',
    icon: './assets/icon-192.png',
    badge: './assets/badge-72.png',
    tag: 'finance-update',
    data: {
      action: 'view-insights',
      url: './#insights'
    },
    actions: [
      {
        action: 'view',
        title: 'View Insights',
        icon: './assets/action-view.png'
      },
      {
        action: 'dismiss', 
        title: 'Dismiss',
        icon: './assets/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📧 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  if (action === 'view' || !action) {
    // Open the app at specified URL
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if available
          for (const client of clientList) {
            if (client.url.includes('finance-tracker')) {
              return client.focus();
            }
          }
          
          // Open new window
          return clients.openWindow(notificationData?.url || './');
        })
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_UPDATE':
      handleCacheUpdate(payload);
      break;
      
    case 'SYNC_REQUEST':
      handleSyncRequest(payload);
      break;
      
    case 'GET_CACHE_INFO':
      handleCacheInfoRequest(event);
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

// Handle cache update requests
async function handleCacheUpdate(payload) {
  const cache = await caches.open(CACHE_NAME);
  
  if (payload.clear) {
    await cache.delete(payload.url);
    console.log('🗑️ Cleared cache for:', payload.url);
  }
  
  if (payload.preload) {
    await cache.add(payload.url);
    console.log('💾 Preloaded cache for:', payload.url);
  }
}

// Handle sync requests
function handleSyncRequest(payload) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('finance-data-sync');
    console.log('🔄 Background sync registered');
  }
}

// Handle cache info requests
async function handleCacheInfoRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const cacheInfo = {
    name: CACHE_NAME,
    version: CACHE_VERSION,
    entries: keys.length,
    urls: keys.map(request => request.url)
  };
  
  event.ports[0].postMessage(cacheInfo);
}

console.log('💾 Service Worker: Loaded successfully');
console.log(`Cache: ${CACHE_NAME}`);
console.log(`Version: ${CACHE_VERSION}`);