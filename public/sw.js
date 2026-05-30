// ============================================
// SCRIPTUREQUEST V4 — Service Worker (sw.js)
// Handles: PWA caching, offline support,
//          push notifications, background sync
// ============================================

const SW_VERSION    = 'sq-v4.0.0';
const CACHE_STATIC  = `${SW_VERSION}-static`;
const CACHE_DYNAMIC = `${SW_VERSION}-dynamic`;

// ── Assets to pre-cache on install ──
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/variables.css',
  '/styles/base.css',
  '/styles/components.css',
  // Google Fonts — cached so quiz works offline
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap',
  // FontAwesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// ── Assets never to cache ──
const NO_CACHE_PATTERNS = [
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /firebase\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /cloudfunctions\.net/
];

// ── Cache strategy per URL pattern ──
// Firebase requests: network only (never cache auth/db)
// Static assets:     cache first
// Dynamic content:   stale-while-revalidate

// ============================================
// INSTALL — pre-cache static shell
// ============================================

self.addEventListener('install', event => {
  console.log(`[SW] Installing ${SW_VERSION}`);

  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        // Cache what we can; don't fail install on font errors
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Failed to cache ${url}:`, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log(`[SW] Static cache ready`);
        // Activate immediately — don't wait for old SW to die
        return self.skipWaiting();
      })
  );
});

// ============================================
// ACTIVATE — clean up old caches
// ============================================

self.addEventListener('activate', event => {
  console.log(`[SW] Activating ${SW_VERSION}`);

  event.waitUntil(
    caches.keys()
      .then(keys => {
        const deleteOld = keys
          .filter(key => key !== CACHE_STATIC && key !== CACHE_DYNAMIC)
          .map(key => {
            console.log(`[SW] Removing old cache: ${key}`);
            return caches.delete(key);
          });
        return Promise.all(deleteOld);
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH — routing strategy
// ============================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Never cache Firebase/auth requests ──
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(fetch(request));
    return;
  }

  // ── Never cache non-GET requests ──
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // ── HTML navigation: network first, cache fallback ──
  if (request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // ── Static assets (CSS, JS, fonts): cache first ──
  if (
    url.hostname === self.location.hostname ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdnjs.cloudflare.com'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Everything else: stale-while-revalidate ──
  event.respondWith(staleWhileRevalidate(request));
});

// ── Cache First strategy ──
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] cacheFirst fetch failed:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

// ── Network First with cache fallback (for HTML) ──
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return cached index.html as SPA fallback
    const fallback = await caches.match('/index.html');
    return fallback || new Response('<h1>Offline</h1><p>Please check your connection.</p>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// ── Stale While Revalidate ──
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(CACHE_DYNAMIC).then(cache => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', event => {
  let data = {
    title: '📖 ScriptureQuest',
    body:  'Time for your daily Bible quiz!',
    icon:  '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag:   'sq-daily'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body:              data.body,
    icon:              data.icon,
    badge:             data.badge,
    tag:               data.tag,
    requireInteraction: false,
    vibrate:           [200, 100, 200],
    data:              { url: data.url || '/' },
    actions: [
      { action: 'take-quiz', title: '📝 Take Quiz' },
      { action: 'dismiss',   title: 'Later' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification click handler ──
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const url    = event.notification.data?.url || '/';

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ============================================
// BACKGROUND SYNC (for offline quiz recovery)
// ============================================

self.addEventListener('sync', event => {
  if (event.tag === 'sync-quiz-result') {
    event.waitUntil(syncPendingQuizResult());
  }
});

async function syncPendingQuizResult() {
  // Pending results stored by quiz.service.js during offline submit
  const keys = await getAllCacheKeys('sq_pending_sync');
  for (const key of keys) {
    try {
      const data = await getFromSyncStore(key);
      if (data) {
        // Notify the app client to retry submission
        const clientList = await clients.matchAll({ type: 'window' });
        clientList.forEach(client =>
          client.postMessage({ type: 'SYNC_QUIZ', payload: data })
        );
      }
    } catch (err) {
      console.warn('[SW] Background sync failed:', err);
    }
  }
}

// Helper stubs for sync store (localStorage not available in SW)
async function getAllCacheKeys(prefix) { return []; }
async function getFromSyncStore(key)   { return null; }

// ============================================
// MESSAGE HANDLER (from main thread)
// ============================================

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(payload.title, {
      body:  payload.body,
      icon:  '/icons/icon-192.png',
      tag:   payload.tag || 'sq-general',
      data:  { url: payload.url || '/' }
    });
    return;
  }

  if (type === 'GET_VERSION') {
    event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    return;
  }
});

console.log(`[SW] ${SW_VERSION} loaded`);
