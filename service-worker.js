const CACHE_NAME = 'Bill-Book-v6'; // Increment this with each update
const APP_VERSION = '1.0.6'; // Add version tracking
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

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Force activation
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(cache => cache !== CACHE_NAME)
          .map(cache => caches.delete(cache))
          .then(() => {
            // Notify clients about the update
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

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
