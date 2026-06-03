// ============================================
// SCRIPTUREQUEST V4 — Notification Service
// Handles FCM push tokens, permission requests,
// in-app notification inbox, and toasts.
// ============================================

import { getMessaging, getToken,
         onMessage }              from 'firebase/messaging';
import { db, auth }               from '../firebase/config.js';
import {
  doc, collection, query,
  where, getDocs, setDoc,
  updateDoc, orderBy, limit,
  onSnapshot, serverTimestamp
}                                  from 'firebase/firestore';
import { showToast }               from '../utils/toast.js';
import { COLLECTIONS }             from '../utils/constants.js';

// FCM public VAPID key — replace with your actual key from Firebase Console
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = 'BK0pgQRV8JMxn0g8bDVJmz8B72NeOpkoYHop0FO2mP9eAI62kxr1LGR5V8XjYlZx5K0BscifgM4ABSEpao1K5Mg';

let _messaging       = null;
let _unsubInbox      = null;
let _unreadCount     = 0;

// ============================================
// INIT MESSAGING
// ============================================

function getMessagingInstance() {
  if (!_messaging) {
    try {
      _messaging = getMessaging();
    } catch (err) {
      console.warn('[Notifications] Messaging not available:', err.message);
    }
  }
  return _messaging;
}

// ============================================
// PERMISSION + TOKEN
// ============================================

/**
 * Request push notification permission and save FCM token.
 * Called after user logs in and chooses to enable notifications.
 */
export async function requestPushPermission() {
  const user = auth.currentUser;
  if (!user) return { granted: false, reason: 'not_logged_in' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, reason: 'denied' };
    }

    const messaging = getMessagingInstance();
    if (!messaging) return { granted: false, reason: 'messaging_unavailable' };

    // Ensure SW is registered before getting token
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey:            VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      await savePushToken(user.uid, token);
      return { granted: true, token };
    }

    return { granted: false, reason: 'no_token' };
  } catch (err) {
    console.error('[Notifications] Permission error:', err);
    return { granted: false, reason: err.message };
  }
}

/**
 * Save or refresh FCM token in Firestore.
 */
export async function savePushToken(uid, token) {
  try {
    const ref = doc(db, 'userPushTokens', uid);
    await setDoc(ref, {
      tokens:    [token],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('[Notifications] Token save error:', err.message);
  }
}

/**
 * Remove push token on logout or opt-out.
 */
export async function removePushToken(uid, token) {
  try {
    const ref  = doc(db, 'userPushTokens', uid);
    await updateDoc(ref, {
      tokens:    [],
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[Notifications] Token remove error:', err.message);
  }
}

// ============================================
// FOREGROUND MESSAGE HANDLER
// ============================================

/**
 * Listen for push messages while app is in foreground.
 * Shows toast instead of system notification.
 */
export function initForegroundMessages() {
  const messaging = getMessagingInstance();
  if (!messaging) return;

  onMessage(messaging, payload => {
    const title = payload.notification?.title || 'ScriptureQuest';
    const body  = payload.notification?.body  || '';
    const type  = payload.data?.type          || 'info';

    // Show as in-app toast
    showToast(`${title}: ${body}`, type === 'reward' ? 'success' : 'info', 5000);

    // Update unread badge
    updateUnreadBadge(_unreadCount + 1);
  });
}

// ============================================
// NOTIFICATION INBOX
// ============================================

/**
 * Subscribe to realtime notification inbox.
 * Returns unsubscribe function.
 */
export function subscribeToInbox(uid, onUpdate) {
  if (_unsubInbox) {
    _unsubInbox();
    _unsubInbox = null;
  }

  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS || 'notifications'),
    where('userId',    '==', uid),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  _unsubInbox = onSnapshot(q, snap => {
    const notifications = [];
    snap.forEach(d => notifications.push({ id: d.id, ...d.data() }));

    const unread = notifications.filter(n => !n.isRead).length;
    _unreadCount = unread;
    updateUnreadBadge(unread);
    onUpdate?.(notifications, unread);
  }, err => {
    console.warn('[Notifications] Inbox subscribe error:', err.message);
  });

  return _unsubInbox;
}

export function unsubscribeFromInbox() {
  if (_unsubInbox) {
    _unsubInbox();
    _unsubInbox = null;
  }
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId) {
  try {
    await updateDoc(
      doc(db, 'notifications', notificationId),
      { isRead: true }
    );
  } catch (err) {
    console.warn('[Notifications] markAsRead error:', err.message);
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(uid) {
  try {
    const q    = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const updates = [];
    snap.forEach(d => {
      updates.push(updateDoc(d.ref, { isRead: true }));
    });
    await Promise.all(updates);
    updateUnreadBadge(0);
  } catch (err) {
    console.warn('[Notifications] markAllAsRead error:', err.message);
  }
}

// ============================================
// UNREAD BADGE
// ============================================

function updateUnreadBadge(count) {
  _unreadCount = count;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ============================================
// NOTIFICATION PREFERENCES (stored in users/{uid})
// ============================================

export async function updateNotificationPrefs(uid, prefs) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      notificationPrefs: {
        remindersEnabled:  prefs.remindersEnabled  ?? true,
        streakAlertsEnabled: prefs.streakAlertsEnabled ?? true,
        rewardAlertsEnabled: prefs.rewardAlertsEnabled ?? true,
        eventAlertsEnabled:  prefs.eventAlertsEnabled  ?? true
      }
    });
  } catch (err) {
    console.warn('[Notifications] Prefs update error:', err.message);
  }
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export async function fetchActiveAnnouncements() {
  try {
    const q    = query(
      collection(db, 'announcements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const snap = await getDocs(q);
    const announcements = [];
    snap.forEach(d => announcements.push({ id: d.id, ...d.data() }));
    return announcements;
  } catch (err) {
    console.warn('[Notifications] Announcements fetch error:', err.message);
    return [];
  }
}

/**
 * Show active announcements in the maintenance banner.
 */
export async function checkAndShowAnnouncements() {
  const announcements = await fetchActiveAnnouncements();
  if (!announcements.length) return;

  const latest = announcements[0];
  const banner = document.getElementById('maintenance-banner');
  const text   = document.getElementById('maintenance-text');

  if (banner && text) {
    text.textContent = latest.title
      ? `${latest.title}: ${latest.body}`
      : latest.body;
    banner.classList.remove('hidden');
  }
}

// ============================================
// PUSH SUPPORT CHECK
// ============================================

export function isPushSupported() {
  return (
    'Notification'    in window &&
    'serviceWorker'   in navigator &&
    'PushManager'     in window
  );
}

export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ============================================
// OVERTAKE NOTIFICATION (throttled)
// Only fires when:
// - You drop OUT of top 10, OR
// - Someone overtakes you in top 3
// - Max once per hour per user
// ============================================

const OVERTAKE_THROTTLE_KEY = 'sq_overtake_notif_ts';
const OVERTAKE_THROTTLE_MS  = 60 * 60 * 1000; // 1 hour

/**
 * Call this after leaderboard updates.
 * Compares old rank vs new rank and notifies if threshold crossed.
 */
export function checkOvertakeNotification(oldRank, newRank, overtakerName) {
  if (!oldRank || !newRank) return;

  // Only notify on meaningful drops
  const wasTop3   = oldRank <= 3;
  const nowTop3   = newRank <= 3;
  const wasTop10  = oldRank <= 10;
  const nowTop10  = newRank <= 10;

  const shouldNotify =
    (wasTop3  && !nowTop3)  ||   // Dropped out of top 3
    (wasTop10 && !nowTop10) ||   // Dropped out of top 10
    (wasTop3  && nowTop3 && newRank > oldRank); // Position change within top 3

  if (!shouldNotify) return;

  // Throttle — max 1 per hour
  const lastSent = parseInt(localStorage.getItem(OVERTAKE_THROTTLE_KEY) || '0');
  if (Date.now() - lastSent < OVERTAKE_THROTTLE_MS) return;

  localStorage.setItem(OVERTAKE_THROTTLE_KEY, String(Date.now()));

  // Build notification message
  let title, body;
  if (wasTop3 && !nowTop3) {
    title = '📉 You dropped out of Top 3!';
    body  = `${overtakerName || 'Someone'} overtook you. Fight back — take your quiz now!`;
  } else if (wasTop10 && !nowTop10) {
    title = '⚠️ You left the Top 10!';
    body  = `${overtakerName || 'Someone'} passed you on the leaderboard. Get back in!`;
  } else {
    title = '🔥 You were overtaken in Top 3!';
    body  = `${overtakerName || 'Someone'} just passed you. Quiz now to reclaim your spot!`;
  }

  // Show in-app toast immediately
  showToast(`${title} ${body}`, 'warning', 6000);

  // Also send push notification if permission granted
  if (getPermissionStatus() === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon:  '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag:   'sq-overtake',
        vibrate: [200, 100, 200],
        data:  { url: '/' },
        actions: [
          { action: 'take-quiz', title: '📝 Take Quiz Now' },
          { action: 'dismiss',   title: 'Later' }
        ]
      });
    }).catch(() => {});
  }
}

/**
 * Track user's previous rank to detect changes.
 * Call on every leaderboard load.
 */
const RANK_CACHE_KEY = 'sq_my_last_rank';

export function updateRankCache(currentRank) {
  if (currentRank) localStorage.setItem(RANK_CACHE_KEY, String(currentRank));
}

export function getLastKnownRank() {
  const r = localStorage.getItem(RANK_CACHE_KEY);
  return r ? parseInt(r) : null;
}

export default {
  requestPushPermission,
  savePushToken,
  removePushToken,
  initForegroundMessages,
  subscribeToInbox,
  unsubscribeFromInbox,
  markAsRead,
  markAllAsRead,
  updateNotificationPrefs,
  fetchActiveAnnouncements,
  checkAndShowAnnouncements,
  isPushSupported,
  getPermissionStatus
};
