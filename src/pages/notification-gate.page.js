// ============================================
// SCRIPTUREQUEST V5 — Notification Permission Gate
// ============================================
// Shown once, right after onboarding finishes and
// before the user ever reaches the real path screen.
// Mirrors the onboarding screen's architecture: a
// dedicated full-screen takeover, routed from app.js,
// reporting back via a callback when done.
//
// Behavior:
//   - User taps "Enable Notifications" -> real browser
//     permission prompt fires via requestPushPermission()
//     (already exists in notification.service.js).
//   - If granted: token is saved (handled inside
//     requestPushPermission itself), then we continue.
//   - If denied OR the browser had already permanently
//     denied it before (so the prompt can't even appear):
//     we still continue. This is a deliberate soft
//     requirement for this one edge case — we ask once,
//     but never trap a user behind a browser setting they
//     may not remember changing.
//   - This screen is shown only once per user, ever
//     (separate localStorage flag from onboarding's).
// ============================================

import { requestPushPermission } from '../services/notification.service.js';
import { NOTIFICATION_GATE_SEEN_KEY } from '../utils/constants.js';
import { showToast } from '../utils/toast.js';

let _onDone = null;
const el = id => document.getElementById(id);

// ============================================
// PUBLIC: should this gate run for this user?
// ============================================

export function shouldShowNotificationGate() {
  try {
    return localStorage.getItem(NOTIFICATION_GATE_SEEN_KEY) !== 'true';
  } catch {
    return false;
  }
}

export function markNotificationGateSeen() {
  try { localStorage.setItem(NOTIFICATION_GATE_SEEN_KEY, 'true'); } catch {}
}

// ============================================
// PUBLIC: init the gate screen
// ============================================

export function initNotificationGateScreen(onDone) {
  _onDone = onDone || null;
  _renderDefaultState();
  _wireButtons();
}

// ============================================
// RENDER STATES
// ============================================

function _renderDefaultState() {
  const titleEl  = el('notif-gate-title');
  const bodyEl   = el('notif-gate-body');
  const enableBtn = el('notif-gate-enable-btn');
  const continueRow = el('notif-gate-continue-row');

  if (titleEl) titleEl.textContent = 'Stay in the Loop';
  if (bodyEl)  bodyEl.textContent  =
    "Turn on notifications so you never miss a streak reminder, a friend's challenge, or a battle invite. You can change this anytime in Settings.";

  enableBtn?.classList.remove('hidden');
  continueRow?.classList.add('hidden');
}

function _renderDeniedState() {
  const titleEl = el('notif-gate-title');
  const bodyEl  = el('notif-gate-body');
  const enableBtn = el('notif-gate-enable-btn');
  const continueRow = el('notif-gate-continue-row');

  if (titleEl) titleEl.textContent = 'No Worries';
  if (bodyEl)  bodyEl.textContent  =
    "Notifications are off for now. You can always turn them on later from Settings if you change your mind.";

  enableBtn?.classList.add('hidden');
  continueRow?.classList.remove('hidden');
}

// ============================================
// BUTTON WIRING
// ============================================

function _wireButtons() {
  _rewire('notif-gate-enable-btn', _handleEnable);
  _rewire('notif-gate-continue-btn', _finish);
}

function _rewire(id, handler) {
  const old = el(id);
  if (!old) return;
  const fresh = old.cloneNode(true);
  old.parentNode.replaceChild(fresh, old);
  fresh.addEventListener('click', handler);
}

// ============================================
// ENABLE HANDLER
// ============================================

async function _handleEnable() {
  const btn = el('notif-gate-enable-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting…';
  }

  try {
    const result = await requestPushPermission();

    if (result.granted) {
      showToast('Notifications enabled! 🔔', 'success', 2500);
      setTimeout(_finish, 700);
      return;
    }

    // Denied, permanently blocked, or any other non-granted reason —
    // per the confirmed soft-requirement behavior, we do NOT trap the
    // user here. Show the friendly "no worries" state with a Continue
    // button instead of retrying forever.
    _renderDeniedState();
    _wireButtons();

  } catch (err) {
    console.warn('[NotificationGate] requestPushPermission error:', err?.message);
    _renderDeniedState();
    _wireButtons();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-bell"></i> Enable Notifications';
    }
  }
}

// ============================================
// FINISH
// ============================================

function _finish() {
  markNotificationGateSeen();
  _onDone?.();
  _onDone = null;
}

export default {
  shouldShowNotificationGate,
  markNotificationGateSeen,
  initNotificationGateScreen
};
