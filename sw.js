// sw.js — Yathra Map Service Worker
// Caches the app shell so it loads fast and works offline

const CACHE_NAME = 'yathra-v1';

// Files to cache for offline use
const PRECACHE = [
  '/NVYM/train.html',
  '/NVYM/manifest.json',
  '/NVYM/icons/icon-192.png',
  '/NVYM/icons/icon-512.png'
];

// ── Install: cache app shell ──────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: network first, fallback to cache ───────────────────
self.addEventListener('fetch', function(event) {
  // Skip non-GET and cross-origin requests (API calls etc.)
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip backend API calls — always go to network
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('onrender.com')) return;
  if (event.request.url.includes('mongodb')) return;

  event.respondWith(
    // Try network first for fresh content
    fetch(event.request)
      .then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Network failed — serve from cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // If main page requested offline — return cached train.html
          if (event.request.mode === 'navigate') {
            return caches.match('/NVYM/train.html');
          }
        });
      })
  );
});
