// service-worker.js
const CACHE_NAME = 'Bill-Book-v4';
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
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cache) => cache !== CACHE_NAME)
                .map((cache) => caches.delete(cache))
            );
        })
    );
});
