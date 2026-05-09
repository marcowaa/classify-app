// Classify Service Worker v8 — update-safe UI cache strategy
const CACHE_NAME = 'classify-v9';
// Production-ready default: enable SW caching strategy.
// Set to true only during active debugging sessions if you need network-only behavior.
const DEV_DISABLE_SW_CACHE = false;
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/logo.webp',
  '/logo.jpg',
  '/screenshots/mobile-home.png',
  '/screenshots/mobile-games.png',
  '/screenshots/mobile-parent.png'
];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  if (DEV_DISABLE_SW_CACHE) {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
    );
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache offline page first (critical), then others with allSettled
      return cache.add(OFFLINE_URL).then(() =>
        Promise.allSettled(
          PRECACHE_ASSETS.filter(u => u !== OFFLINE_URL).map((url) => cache.add(url))
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE + Navigation Preload ─────────────────────────
self.addEventListener('activate', (event) => {
  if (DEV_DISABLE_SW_CACHE) {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
      })()
    );
    return;
  }

  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      // Enable navigation preload if supported
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      // Take control of all clients immediately
      await self.clients.claim();
    })()
  );
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const fallbackResponse = (request) => {
    if (request.mode === 'navigate' || request.destination === 'document') {
      return new Response(
        '<!doctype html><html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (request.destination === 'script') {
      return new Response('/* offline */', {
        status: 503,
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }

    if (request.destination === 'style') {
      return new Response('/* offline */', {
        status: 503,
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }

    return new Response('', { status: 503 });
  };

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Development mode: network-only to avoid stale assets/pages while coding.
  // Keep this block and set DEV_DISABLE_SW_CACHE=false later to restore caching.
  if (DEV_DISABLE_SW_CACHE) {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' }).catch(() =>
          new Response(
            JSON.stringify({ success: false, error: 'OFFLINE', message: 'No internet connection' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );
      return;
    }

    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => fallbackResponse(event.request))
    );
    return;
  }

  // Let game files pass through without interception
  if (url.pathname.startsWith('/games/')) return;

  // API calls: network-only with offline JSON error
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ success: false, error: 'OFFLINE', message: 'No internet connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Navigation: network-first with preload, fallback to offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Use navigation preload response if available
          const preloadResponse = event.preloadResponse && (await event.preloadResponse);
          if (preloadResponse) return preloadResponse;

          return await fetch(event.request);
        } catch (error) {
          // Network failed — serve offline page
          const cache = await caches.open(CACHE_NAME);
          const offlinePage = await cache.match(OFFLINE_URL);
          return offlinePage || new Response(
            '<h1>Offline</h1><p>Please check your connection.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  // Hashed assets (/assets/*): cache-first (immutable, built by Vite)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static assets (icons, images, fonts): stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|css)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: network-first without persistent caching
  // This avoids serving stale UI shells while preserving localStorage auth/device data.
  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(() => caches.match(event.request))
  );
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  const title = payload.title || 'إشعار جديد';
  const priority = String(payload.priority || '').toLowerCase();
  const level = Number(payload.level || 0);
  const isUrgent = priority === 'urgent' || priority === 'blocking' || level >= 4;
  const options = {
    body: payload.body || 'لديك تحديث جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/child-tasks',
      taskId: payload.taskId || null,
      childId: payload.childId || null,
      level: level || null,
      priority: priority || null,
      dateOfArrival: Date.now(),
    },
    tag: payload.taskId ? `task-${payload.taskId}` : 'classify-notification',
    renotify: !!payload.taskId,
    requireInteraction: isUrgent,
    actions: [
      { action: 'open', title: 'فتح', icon: '/icons/icon-96.png' },
      { action: 'dismiss', title: 'إغلاق' }
    ],
  };

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visibleClients = windowClients.filter((client) => client.visibilityState === 'visible');

      if (visibleClients.length > 0) {
        visibleClients.forEach((client) => {
          client.postMessage({
            type: 'IN_APP_NOTIFICATION',
            payload: {
              title,
              body: options.body,
              url: options.data?.url || '/notifications',
              taskId: options.data?.taskId || null,
              childId: options.data?.childId || null,
              level: options.data?.level || null,
              priority: options.data?.priority || null,
            },
          });
        });
      }

      await self.registration.showNotification(title, options);
    })()
  );
});

// ─── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification?.data?.url || '/child-tasks';

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          await client.focus();
          if (typeof client.navigate === 'function') {
            try {
              await client.navigate(targetUrl);
            } catch {
              client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            }
          } else {
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          }
          return;
        }
      }

      await clients.openWindow(targetUrl);
    })()
  );
});

// ─── PERIODIC BACKGROUND SYNC ──────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'classify-content-sync') {
    event.waitUntil(
      (async () => {
        try {
          const allClients = await clients.matchAll({ type: 'window' });
          allClients.forEach((client) => {
            client.postMessage({ type: 'CONTENT_UPDATED' });
          });
        } catch (e) {
          // Silently fail — periodic sync is best-effort
        }
      })()
    );
  }
});

// ─── BACKGROUND SYNC ───────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'classify-offline-actions') {
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({ type: 'window' });
        allClients.forEach((client) => {
          client.postMessage({ type: 'ONLINE_SYNC' });
        });
      })()
    );
  }
});

// ─── MESSAGE HANDLER ────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'SHOW_FEATURE_NOTIFICATION') {
    const payload = event.data.payload || {};
    const title = payload.title || 'ميزة جديدة لك';
    const body = payload.body || 'افتح الآن واكتشف المزيد';
    const url = payload.url || '/parent-dashboard';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        tag: 'classify-feature-highlight',
        renotify: false,
        data: {
          url,
          dateOfArrival: Date.now(),
          type: 'feature-highlight',
        },
        actions: [
          { action: 'open', title: 'فتح' },
          { action: 'dismiss', title: 'إغلاق' },
        ],
      })
    );
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_NAME });
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) =>
        Promise.allSettled(urls.map((url) => cache.add(url)))
      )
    );
  }
});

// ─── WIDGET INSTALL (PWA Widgets API) ───────────────────────
self.addEventListener('widgetinstall', (event) => {
  event.waitUntil(updateWidget(event));
});

self.addEventListener('widgetresume', (event) => {
  event.waitUntil(updateWidget(event));
});

self.addEventListener('widgetclick', (event) => {
  if (event.action === 'open-app') {
    event.waitUntil(clients.openWindow('/child-tasks'));
  }
});

async function updateWidget(event) {
  try {
    const widget = event.widget;
    const response = await fetch('/api/child/tasks');
    const data = await response.json();
    await self.widgets.updateByTag(widget.definition.tag, {
      data: JSON.stringify(data)
    });
  } catch (e) {
    // Widget update failed — silently continue
  }
}

// ─── FILE HANDLER LAUNCH ────────────────────────────────────
self.addEventListener('launch', (event) => {
  if (event.files && event.files.length > 0) {
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({ type: 'window' });
        if (allClients.length > 0) {
          allClients[0].focus();
          allClients[0].postMessage({
            type: 'FILE_OPENED',
            files: event.files.map((f) => f.name)
          });
        } else {
          await clients.openWindow('/child-games');
        }
      })()
    );
  }
});
