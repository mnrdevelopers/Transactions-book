// service-worker.js
const CACHE_NAME = 'Bill-Book-v6';  // Increment this with each update
const APP_VERSION = '1.0.6';        // Must match version in dashboard.html

const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/add-transaction.html',
  '/transactions.html',
  '/reports.html',
  '/maintenance.html',
  '/purchases.html',
  '/profit-loss.html',
  '/offcanvas-nav.html',
  '/style.css',
  '/script.js',
  '/transactions.js',
  '/reports.js',
  '/maintenance.js',
  '/purchases.js',
  '/profit-loss.js',
  '/nav.js',
  '/manifest.json'
];

// Install event - Force activation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Force immediate activation
  );
});

// Activate event - Clean old caches & notify UI
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(cache => cache !== CACHE_NAME)
          .map(cache => caches.delete(cache))
      ).then(() => {
        // Notify all open tabs about the update
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'UPDATE_AVAILABLE',
              version: APP_VERSION
            });
          });
        });
      });
    })
  );
});

// Fetch event (unchanged)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Listen for "skipWaiting" command from UI
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
