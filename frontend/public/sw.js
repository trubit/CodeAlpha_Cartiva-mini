/**
 * Cartiva Mini — Progressive Web App Service Worker
 * Implements resilient caching for public static UI assets while strictly
 * bypassing sensitive customer, authentication, cart, checkout, and payment endpoints.
 */

const CACHE_NAME = 'cartiva-mini-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/styles/index.css',
];

// Sensitive or dynamic routes that must NEVER be served from cache
const SENSITIVE_PATTERNS = [
  '/api/v1/auth',
  '/api/v1/cart',
  '/api/v1/checkout',
  '/api/v1/payments',
  '/api/v1/users',
  '/api/v1/admin',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some individual dev assets are bundled on the fly
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Strictly bypass sensitive API requests
  if (SENSITIVE_PATTERNS.some((pattern) => url.pathname.startsWith(pattern))) {
    return; // Pass through to network
  }

  // 2. Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. Network first with cache fallback strategy for public pages
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for document navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Network offline. Content temporarily unavailable.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      })
  );
});
