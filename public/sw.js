// ============================================
// SCRIPTUREQUEST V4 — Service Worker (sw.js)
// Handles: PWA caching, offline support,
//          FCM push notifications (background),
//          background sync
// ============================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Firebase config (must match src/firebase/config.js) ──
// Replace these values with your actual Firebase project config
firebase.initializeApp({
  apiKey:            "AIzaSyCqe7f1APzzWX4s9gsIxF-byiU7qJ9eT7g",
  authDomain:        "system-overhaul.firebaseapp.com",
  projectId:         "system-overhaul",
  storageBucket:     "system-overhaul.firebasestorage.app",
  messagingSenderId: "902227040128",
  appId:             "1:902227040128:web:fb38d004fabf8ef35e5365"
});

const firebaseMessaging = firebase.messaging();

// ── Background message handler (app closed or in background) ──
// Firebase SDK handles showing the notification automatically
// when notification payload is present. This handler fires for
// data-only messages or for custom handling.
firebaseMessaging.onBackgroundMessage(payload => {
  console.log('[SW] Background FCM message received:', payload);

  const title = payload.notification?.title || '📖 ScriptureQuest';
  const body  = payload.notification?.body  || 'Check your leaderboard position!';
  const data  = payload.data || {};

  return self.registration.showNotification(title, {
    body,
    icon:               '/icons/icon-192.png',
    badge:              '/icons/badge-72.png',
    tag:                data.type || 'sq-push',
    vibrate:            [200, 100, 200],
    requireInteraction: false,
    data:               { url: data.url || '/' },
    actions: [
      { action: 'take-quiz', title: '📝 Take Quiz Now' },
      { action: 'dismiss',   title: 'Later' }
    ]
  });
});

// ============================================
// PWA CACHE SETUP
// ============================================

const SW_VERSION    = 'sq-v4.0.1';
const CACHE_STATIC  = `${SW_VERSION}-static`;
const CACHE_DYNAMIC = `${SW_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/variables.css',
  '/styles/base.css',
  '/styles/components.css',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

const NO_CACHE_PATTERNS = [
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /firebase\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /cloudfunctions\.net/,
  /fcm\.googleapis\.com/
];

self.addEventListener('install', event => {
  console.log(`[SW] Installing ${SW_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] Failed to cache ${url}:`, err.message))
        )
      )
    ).then(() => {
      console.log('[SW] Static cache ready');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  console.log(`[SW] Activating ${SW_VERSION}`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map(k => { console.log('[SW] Removing old cache:', k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (NO_CACHE_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(fetch(request)); return;
  }
  if (request.method !== 'GET') {
    event.respondWith(fetch(request)); return;
  }
  if (request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request)); return;
  }
  if (url.hostname === self.location.hostname ||
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com' ||
      url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(cacheFirst(request)); return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

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
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/index.html');
    return fallback || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_DYNAMIC).then(c => c.put(request, response.clone()));
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ============================================
// NOTIFICATION CLICK
// ============================================

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ============================================
// MESSAGES FROM MAIN THREAD
// ============================================

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  if (type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(payload.title, {
      body: payload.body, icon: '/icons/icon-192.png',
      tag: payload.tag || 'sq-general', data: { url: payload.url || '/' }
    });
    return;
  }
  if (type === 'GET_VERSION') {
    event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    return;
  }
});

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', event => {
  if (event.tag === 'sync-quiz-result') event.waitUntil(syncPendingQuizResult());
});

async function syncPendingQuizResult() {
  const clientList = await clients.matchAll({ type: 'window' });
  clientList.forEach(client => client.postMessage({ type: 'SYNC_QUIZ' }));
}

console.log(`[SW] ${SW_VERSION} loaded`);
