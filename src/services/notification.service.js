// ============================================
// SCRIPTUREQUEST V5 — Notification Service
//
// Updates:
//   + notifyChallengeReceived()  — push to opponent when challenged
//   + notifyBattleIncoming()     — push to opponent when battle starts
//   + notifyStreakReminder()     — local streak reminder (client-side fallback)
//   + notifyRematchReady()       — push to opponent when rematch created
//   + listenForRematchInvite()   — realtime listener on old match for rematch code
//   + checkPendingBattleResult() — exported for app.js to call on login
//   + All existing functionality preserved
// ============================================

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db, auth }                          from '../firebase/config.js';
import {
  doc, collection, query, where, getDocs,
  setDoc, updateDoc, orderBy, limit,
  onSnapshot, serverTimestamp, getDoc, arrayUnion
} from 'firebase/firestore';
import { showToast }   from '../utils/toast.js';
import { COLLECTIONS, PENDING_BATTLE_KEY } from '../utils/constants.js';

const VAPID_KEY = 'BK0pgQRV8JMxn0g8bDVJmz8B72NeOpkoYHop0FO2mP9eAI62kxr1LGR5V8XjYlZx5K0BscifgM4ABSEpao1K5Mg';

let _messaging    = null;
let _unsubInbox   = null;
let _unreadCount  = 0;
let _unsubRematch = null; // tracks rematch listener

// ============================================
// MESSAGING INSTANCE
// ============================================

function getMessagingInstance() {
  if (!_messaging) {
    try { _messaging = getMessaging(); }
    catch (err) { console.warn('[Notifications] Messaging not available:', err.message); }
  }
  return _messaging;
}

// ============================================
// PERMISSION + TOKEN
// ============================================
function _withTimeout(promise, ms, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms))
  ]);
}

export async function requestPushPermission() {
  const user = auth.currentUser;
  if (!user) return { granted: false, reason: 'not_logged_in' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { granted: false, reason: 'denied' };

    const messaging = getMessagingInstance();
    if (!messaging) return { granted: false, reason: 'messaging_unavailable' };

    // Guard against a stuck/failed Service Worker hanging this forever —
    // if it doesn't become ready within 8s, treat it as a soft failure
    // instead of leaving the user stuck on "Requesting..." with no way out.
    const registration = await _withTimeout(
      navigator.serviceWorker.ready, 8000, 'service_worker_timeout'
    );
    const token = await _withTimeout(
      getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }),
      8000, 'token_timeout'
    );

    if (token) { await savePushToken(user.uid, token); return { granted: true, token }; }
    return { granted: false, reason: 'no_token' };
  } catch (err) {
    console.error('[Notifications] Permission error:', err);
    return { granted: false, reason: err.message };
  }
}

export async function savePushToken(uid, token) {
  try {
    await setDoc(doc(db, 'userPushTokens', uid), {
      tokens: arrayUnion(token), // arrayUnion avoids duplicate tokens
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('[Notifications] Token save error:', err.message);
  }
}

export async function removePushToken(uid) {
  try {
    await updateDoc(doc(db, 'userPushTokens', uid), {
      tokens: [], updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[Notifications] Token remove error:', err.message);
  }
}

// ============================================
// FOREGROUND MESSAGES
// ============================================

export function initForegroundMessages() {
  const messaging = getMessagingInstance();
  if (!messaging) return;

  onMessage(messaging, payload => {
    const title = payload.notification?.title || 'ScriptureQuest';
    const body  = payload.notification?.body  || '';
    const type  = payload.data?.type          || 'info';
    const matchId = payload.data?.matchId;

    showToast(`${title}: ${body}`, type === 'reward' ? 'success' : 'info', 6000);
    updateUnreadBadge(_unreadCount + 1);

    // If it is a rematch notification and user is on battle-result screen,
    // auto-populate the join code input
    if (type === 'rematch' && payload.data?.code) {
      const codeInput = document.getElementById('challenge-code-input');
      if (codeInput) {
        codeInput.value = payload.data.code;
        showToast(`Rematch code ${payload.data.code} is ready! Hit Accept.`, 'success', 8000);
      }
    }
  });
}

// ============================================
// CHALLENGE NOTIFICATION
// Called when a user sends a challenge to another player.
// Writes to Firestore so the Cloud Function picks it up.
// ============================================

export async function notifyChallengeReceived(opponentUid, challengerName, challengeCode, challengeId) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, 'pendingPushes', `${opponentUid}_challenge_${challengeId}`), {
      uid:       opponentUid,
      title:     '⚔️ New Challenge!',
      body:      `${challengerName || 'Someone'} challenged you to a battle. Accept now!`,
      data: {
        type:        'challenge',
        challengeId: challengeId,
        code:        challengeCode,
        url:         `/?challenge=${challengeCode}`
      },
      createdAt: serverTimestamp(),
      sent:      false
    });

    console.log('[Notifications] Challenge notification queued for', opponentUid);
  } catch (err) {
    console.warn('[Notifications] notifyChallengeReceived error:', err.message);
  }
}

// ============================================
// BATTLE NOTIFICATION
// Called when a battle match is created.
// Writes to Firestore so the Cloud Function picks it up.
// ============================================

export async function notifyBattleIncoming(opponentUid, creatorName, matchId) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, 'pendingPushes', `${opponentUid}_battle_${matchId}`), {
      uid:       opponentUid,
      title:     '⚔️ Battle Incoming!',
      body:      `${creatorName || 'Someone'} started a battle with you. Join now!`,
      data: {
        type:      'battle',
        matchId:   matchId,
        creatorId: user.uid,
        url:       `/?battle=${matchId}`
      },
      createdAt: serverTimestamp(),
      sent:      false
    });

    console.log('[Notifications] Battle notification queued for', opponentUid);
  } catch (err) {
    console.warn('[Notifications] notifyBattleIncoming error:', err.message);
  }
}

// ============================================
// STREAK REMINDER NOTIFICATION (client-side)
// Local toast as a fallback when push is not available.
// ============================================

export function notifyStreakReminder(timeOfDay) {
  if (timeOfDay === 'morning') {
    showToast(
      '🔥 Good morning! Take your daily quiz to keep your streak going.',
      'info',
      6000
    );
  } else if (timeOfDay === 'evening') {
    showToast(
      '⏰ You started learning today but have not finished a round yet. Complete one now to keep your streak!',
      'warning',
      6000
    );
  }
}

// ============================================
// REMATCH NOTIFICATION
// Sends push to opponent + appends message to old match doc
// Called by app.js after sendRematch() returns
// ============================================

export async function notifyRematchReady(oldMatchId, newCode, newMatchId, challengerName) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Get old match to find the opponent's uid
    const oldSnap = await getDoc(doc(db, 'matches', oldMatchId));
    if (!oldSnap.exists()) return;
    const oldMatch = oldSnap.data();

    const opponentUid = oldMatch.creatorId === user.uid
      ? oldMatch.opponentId
      : oldMatch.creatorId;

    if (!opponentUid) return;

    // 2. Append rematch message to old match doc so opponent sees it
    //    if they re-open the result screen
    await updateDoc(doc(db, 'matches', oldMatchId), {
      messages: arrayUnion({
        type:      'rematch_ready',
        text:      `🔄 ${challengerName} wants a rematch! Code: ${newCode}`,
        newCode,
        newMatchId,
        timestamp: Date.now()
      }),
      rematchCode:    newCode,
      rematchMatchId: newMatchId
    });

    // 3. Send FCM push to opponent if they have a token
    const tokenDoc = await getDoc(doc(db, 'userPushTokens', opponentUid));
    if (!tokenDoc.exists()) return;

    const tokens = tokenDoc.data()?.tokens || [];
    if (!tokens.length) return;

    // 4. Use the SW postMessage fallback if Cloud Functions not deployed,
    //    otherwise this would be a Cloud Function call.
    //    For now we trigger via the service worker on the opponent's device
    //    by writing to a Firestore collection the SW watches.
    await setDoc(doc(db, 'pendingPushes', `${opponentUid}_rematch_${newMatchId}`), {
      uid:       opponentUid,
      tokens,
      title:     '🔄 Rematch Challenge!',
      body:      `${challengerName} wants a rematch! Code: ${newCode}`,
      data: {
        type:      'rematch',
        code:      newCode,
        matchId:   newMatchId,
        url:       `/?challenge=${newCode}`
      },
      createdAt: serverTimestamp(),
      sent:      false
    });

    // 5. Also try direct SW notification if both players are on the same browser
    //    (won't work cross-device but good for same-device testing)
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification('🔄 Rematch Challenge!', {
          body:    `${challengerName} wants a rematch! Code: ${newCode}`,
          icon:    '/icons/icon-192.png',
          badge:   '/icons/badge-72.png',
          tag:     `sq-rematch-${newMatchId}`,
          vibrate: [200, 100, 200],
          data:    { url: `/?challenge=${newCode}`, type: 'rematch', code: newCode },
          actions: [
            { action: 'accept', title: '⚔️ Accept Rematch' },
            { action: 'dismiss', title: 'Later' }
          ]
        });
      }).catch(() => {});
    }

    console.log('[Notifications] Rematch notification sent to', opponentUid);
  } catch (err) {
    console.warn('[Notifications] notifyRematchReady error:', err.message);
  }
}

// ============================================
// LISTEN FOR REMATCH INVITE
// Call this when showing the battle result screen.
// If the OTHER player requests a rematch, this fires
// and shows the user a "Rematch available!" toast
// with the new code pre-filled.
// ============================================

export function listenForRematchInvite(matchId, onRematchReady) {
  // Clean up previous listener
  if (_unsubRematch) { _unsubRematch(); _unsubRematch = null; }

  _unsubRematch = onSnapshot(doc(db, 'matches', matchId), snap => {
    if (!snap.exists()) return;
    const data = snap.data();

    if (data.rematchCode && data.rematchMatchId) {
      const user = auth.currentUser;
      // Only notify the opponent (not the one who created the rematch)
      if (data.creatorId === user?.uid || data.opponentId === user?.uid) {
        // Check if this user is NOT the one who sent the rematch
        // (rematch creator's uid is embedded in the new match — we can't easily
        //  tell here, so just fire for everyone and let onRematchReady debounce)
        if (_unsubRematch) { _unsubRematch(); _unsubRematch = null; }
        onRematchReady?.({ code: data.rematchCode, matchId: data.rematchMatchId });
      }
    }
  });

  return () => { if (_unsubRematch) { _unsubRematch(); _unsubRematch = null; } };
}

export function unsubscribeRematchListener() {
  if (_unsubRematch) { _unsubRematch(); _unsubRematch = null; }
}

// ============================================
// CHECK PENDING BATTLE ON LOGIN
// Export so app.js can call it after auth
// ============================================

export async function checkPendingBattleResult(onResultReady) {
  try {
    const pendingMatchId = localStorage.getItem(PENDING_BATTLE_KEY);
    if (!pendingMatchId) return;

    const snap = await getDoc(doc(db, 'matches', pendingMatchId));
    if (!snap.exists()) { localStorage.removeItem(PENDING_BATTLE_KEY); return; }

    const match = { matchId: snap.id, ...snap.data() };

    if (match.status === 'completed') {
      localStorage.removeItem(PENDING_BATTLE_KEY);
      showToast('⚔️ Your battle result is ready!', 'success', 3000);
      setTimeout(() => onResultReady?.(match), 800);

    } else if (match.status === 'active') {
      // Still in progress — subscribe silently
      showToast('Still waiting for your opponent to finish the battle...', 'info', 4000);

      const unsub = onSnapshot(doc(db, 'matches', pendingMatchId), s => {
        if (!s.exists()) return;
        const updated = { matchId: s.id, ...s.data() };
        if (updated.status === 'completed') {
          unsub();
          localStorage.removeItem(PENDING_BATTLE_KEY);
          showToast('⚔️ Battle result is in!', 'success', 3000);
          setTimeout(() => onResultReady?.(updated), 500);
        }
      });
    } else {
      // waiting / expired
      localStorage.removeItem(PENDING_BATTLE_KEY);
    }
  } catch(e) {
    console.warn('[Notifications] checkPendingBattleResult error:', e.message);
  }
}

// ============================================
// INBOX
// ============================================

export function subscribeToInbox(uid, onUpdate) {
  if (_unsubInbox) { _unsubInbox(); _unsubInbox = null; }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
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
  }, err => console.warn('[Notifications] Inbox error:', err.message));

  return _unsubInbox;
}

export function unsubscribeFromInbox() {
  if (_unsubInbox) { _unsubInbox(); _unsubInbox = null; }
}

export async function markAsRead(notificationId) {
  try { await updateDoc(doc(db, 'notifications', notificationId), { isRead: true }); }
  catch (err) { console.warn('[Notifications] markAsRead error:', err.message); }
}

export async function markAllAsRead(uid) {
  try {
    const snap = await getDocs(query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('isRead', '==', false)
    ));
    await Promise.all(snap.docs.map(d => updateDoc(d.ref, { isRead: true })));
    updateUnreadBadge(0);
  } catch (err) { console.warn('[Notifications] markAllAsRead error:', err.message); }
}

function updateUnreadBadge(count) {
  _unreadCount = count;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
  else           { badge.classList.add('hidden'); }
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export async function fetchActiveAnnouncements() {
  try {
    const snap = await getDocs(query(
      collection(db, 'announcements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(3)
    ));
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
  } catch (err) {
    console.warn('[Notifications] Announcements fetch error:', err.message);
    return [];
  }
}

export async function checkAndShowAnnouncements() {
  const announcements = await fetchActiveAnnouncements();
  if (!announcements.length) return;
  const latest = announcements[0];
  const banner = document.getElementById('maintenance-banner');
  const text   = document.getElementById('maintenance-text');
  if (banner && text) {
    text.textContent = latest.title ? `${latest.title}: ${latest.body}` : latest.body;
    banner.classList.remove('hidden');
  }
}

// ============================================
// PUSH SUPPORT
// ============================================

export function isPushSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// ============================================
// OVERTAKE NOTIFICATION (client-side throttled)
// ============================================

const OVERTAKE_THROTTLE_KEY = 'sq_overtake_notif_ts';
const OVERTAKE_THROTTLE_MS  = 60 * 60 * 1000;

export function checkOvertakeNotification(oldRank, newRank, overtakerName) {
  if (!oldRank || !newRank) return;

  const wasTop3  = oldRank <= 3,  nowTop3  = newRank <= 3;
  const wasTop10 = oldRank <= 10, nowTop10 = newRank <= 10;
  const shouldNotify =
    (wasTop3  && !nowTop3)  ||
    (wasTop10 && !nowTop10) ||
    (wasTop3  && nowTop3 && newRank > oldRank);

  if (!shouldNotify) return;

  const lastSent = parseInt(localStorage.getItem(OVERTAKE_THROTTLE_KEY) || '0');
  if (Date.now() - lastSent < OVERTAKE_THROTTLE_MS) return;
  localStorage.setItem(OVERTAKE_THROTTLE_KEY, String(Date.now()));

  let title, body;
  if (wasTop3 && !nowTop3)        { title = '📉 You dropped out of Top 3!';  body = `${overtakerName || 'Someone'} overtook you. Take your quiz now!`; }
  else if (wasTop10 && !nowTop10) { title = '⚠️ You left the Top 10!';       body = `${overtakerName || 'Someone'} passed you. Get back in!`; }
  else                            { title = '🔥 You were overtaken in Top 3!'; body = `${overtakerName || 'Someone'} just passed you. Quiz now!`; }

  showToast(`${title} ${body}`, 'warning', 6000);

  if (getPermissionStatus() === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png',
        tag: 'sq-overtake', vibrate: [200, 100, 200],
        data: { url: '/' },
        actions: [
          { action: 'take-quiz', title: '📝 Take Quiz Now' },
          { action: 'dismiss',   title: 'Later' }
        ]
      });
    }).catch(() => {});
  }
}

export function updateRankCache(rank) {
  if (rank) localStorage.setItem('sq_my_last_rank', String(rank));
}

export function getLastKnownRank() {
  const r = localStorage.getItem('sq_my_last_rank');
  return r ? parseInt(r) : null;
}

export async function updateNotificationPrefs(uid, prefs) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      notificationPrefs: {
        remindersEnabled:    prefs.remindersEnabled    ?? true,
        streakAlertsEnabled: prefs.streakAlertsEnabled ?? true,
        rewardAlertsEnabled: prefs.rewardAlertsEnabled ?? true,
        eventAlertsEnabled:  prefs.eventAlertsEnabled  ?? true
      }
    });
  } catch (err) { console.warn('[Notifications] Prefs update error:', err.message); }
}

export default {
  requestPushPermission, savePushToken, removePushToken,
  initForegroundMessages,
  notifyChallengeReceived, notifyBattleIncoming, notifyStreakReminder,
  notifyRematchReady, listenForRematchInvite, unsubscribeRematchListener,
  checkPendingBattleResult,
  subscribeToInbox, unsubscribeFromInbox, markAsRead, markAllAsRead,
  updateNotificationPrefs, fetchActiveAnnouncements, checkAndShowAnnouncements,
  isPushSupported, getPermissionStatus,
  checkOvertakeNotification, updateRankCache, getLastKnownRank
};
