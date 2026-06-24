// ============================================
// admin-core.js  — Bible Battle Admin
// CORRECTED VERSION — matches HTML IDs/classes exactly
// ============================================

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc,
         addDoc, updateDoc, deleteDoc, writeBatch,
         query, where, orderBy, limit,
         serverTimestamp, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Firebase init ──────────────────────────────────
const FB_CONFIG = {
  apiKey:            "AIzaSyCqe7f1APzzWX4s9gsIxF-byiU7qJ9eT7g",
  authDomain:        "system-overhaul.firebaseapp.com",
  projectId:         "system-overhaul",
  storageBucket:     "system-overhaul.firebasestorage.app",
  messagingSenderId: "902227040128",
  appId:             "1:902227040128:web:fb38d004fabf8ef35e5365"
};

const _app = initializeApp(FB_CONFIG);
export const auth = getAuth(_app);
export const db   = getFirestore(_app);

// Re-export Firestore helpers so other modules don't need to import Firebase directly
export { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
         writeBatch, query, where, orderBy, limit, serverTimestamp, Timestamp };

// ── Shared state ───────────────────────────────────
export let currentAdmin = null;
export function setCurrentAdmin(a) { currentAdmin = a; }

// ── Week helpers ───────────────────────────────────
const EPOCH = new Date('2026-05-04T08:00:00Z').getTime();
const MSW   = 7 * 24 * 60 * 60 * 1000;

export function getWeekNum()  { return Math.floor((Date.now() - EPOCH) / MSW) + 1; }
export function getWeekId()   { return `2026-W${getWeekNum()}`; }
export function getMsLeft()   {
  const i = Math.floor((Date.now() - EPOCH) / MSW);
  return EPOCH + (i + 1) * MSW - Date.now();
}
export function getMsw()      { return MSW; }
export function getEpoch()    { return EPOCH; }

function pad(n) { return String(n).padStart(2, '0'); }
export function fmtCountdown(ms) {
  const d = Math.floor(ms / 86400000),
        h = Math.floor((ms % 86400000) / 3600000),
        m = Math.floor((ms % 3600000) / 60000),
        s = Math.floor((ms % 60000) / 1000);
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

export function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Toast ──────────────────────────────────────────
export function toast(msg, type = 'inf') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const icons = { ok:'✅', err:'❌', inf:'ℹ️', warn:'⚠️' };
  const mapType = { ok: 'success', err: 'error', inf: 'info', warn: 'warning' };
  const t = document.createElement('div');
  t.className = `toast toast-${mapType[type] || type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3500);
  setTimeout(() => t.remove(), 3800);
}

// ── Confirm modal ─────────────────────────────────
export function showConfirm(icon, title, msg, onOk) {
  document.getElementById('confirm-icon').textContent  = icon;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  const btn   = document.getElementById('confirm-ok-btn');
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', () => { closeConfirm(); onOk?.(); });
  document.getElementById('confirm-modal').classList.remove('hidden');
}
export function closeConfirm() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

// ── Theme ─────────────────────────────────────────
export function initTheme() {
  const saved = localStorage.getItem('bb-admin-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  _applyThemeIcons(saved);
}
function _applyThemeIcons(theme) {
  const dark  = theme === 'dark';
  const iconClass  = dark ? 'fas fa-moon'  : 'fas fa-sun';
  const el = document.getElementById('admin-theme-icon');
  if (el) el.className = iconClass;
}
export function toggleTheme() {
  const html  = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const next   = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('bb-admin-theme', next);
  _applyThemeIcons(next);
}

// ── Sidebar ───────────────────────────────────────
export function toggleSB() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
export function closeSB() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Navigation ────────────────────────────────────
const TITLES = {
  overview:      'Overview',
  rewards:       'Reward Management',
  users:         'User Management',
  questions:     'Question Bank',
  leaderboard:   'Leaderboard',
  announce:      'Announcements',
  notifications: 'Push Notifications',
  launch:        'Launch Tools',
  settings:      'Settings'
};
let _curSec = 'overview';
export function getCurSec() { return _curSec; }

export function showSec(name) {
  // FIXED: use .section (not .sec) and section- prefix (not sec-)
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name)?.classList.add('active');
  document.querySelectorAll(`[data-section="${name}"]`).forEach(b => b.classList.add('active'));
  _curSec = name;
  closeSB();
}

// ── Password toggle (login) ───────────────────────
export function togglePw() {
  const i   = document.getElementById('admin-password');
  const eye = document.getElementById('admin-pw-icon');
  const show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  eye.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
}

// ── Auth ──────────────────────────────────────────
export async function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const pass  = document.getElementById('admin-password').value;
  const btn   = document.getElementById('admin-login-btn');
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists() || !['admin','moderator'].includes(snap.data().role)) {
      await signOut(auth);
      throw new Error('Access denied. Admin role required.');
    }
  } catch (e) {
    errEl.textContent = e.message.includes('Access denied')
      ? e.message : 'Invalid credentials. Please try again.';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}

export function adminLogout() {
  showConfirm('👋', 'Sign Out', 'Sign out of the admin panel?', () => signOut(auth));
}

// ── Auth state listener (called once from admin-init.js) ──
export function startAuthListener(onSignedIn, onSignedOut) {
  onAuthStateChanged(auth, async user => {
    if (user) {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !['admin','moderator'].includes(snap.data()?.role)) {
        await signOut(auth);
        return;
      }
      setCurrentAdmin({ uid: user.uid, ...snap.data() });
      onSignedIn(snap.data());
    } else {
      setCurrentAdmin(null);
      onSignedOut();
    }
  });
}

// ── Countdown ────────────────────────────────────
export function startCountdown() {
  const wl1 = document.getElementById('ov-week-id');
  const c1  = document.getElementById('ov-countdown');
  if (wl1) wl1.textContent = `Week ${getWeekNum()}`;
  const tick = () => {
    const v = fmtCountdown(getMsLeft());
    if (c1) c1.textContent = v;
  };
  tick();
  setInterval(tick, 1000);
}
