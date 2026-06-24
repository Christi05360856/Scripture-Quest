// ============================================
// SCRIPTUREQUEST ADMIN — admin-core.js (TIER 1)
// Adds: password visibility toggle, theme toggle
// (light/dark), Firestore-backed leaderboard
// week-epoch control.
//
// Everything from the previous split version is
// UNCHANGED below except where marked "TIER 1 NEW".
// ============================================

import { initializeApp }          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }
                                  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
         query, where, orderBy, limit, serverTimestamp,
         Timestamp }              from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCqe7f1APzzWX4s9gsIxF-byiU7qJ9eT7g",
  authDomain: "system-overhaul.firebaseapp.com",
  projectId: "system-overhaul",
  storageBucket: "system-overhaul.firebasestorage.app",
  messagingSenderId: "902227040128",
  appId: "1:902227040128:web:fb38d004fabf8ef35e5365",
  measurementId: "G-46V13WEGT2"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

window.db   = db;
window.auth = auth;
window.fb   = {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};

window._allRewards   = [];
window._allUsers     = [];
window._allQuestions = [];
window._currentAdmin = null;

// ── Week helpers ──
// TIER 1 NEW: WEEK_EPOCH is no longer a fixed constant.
// It starts with this hardcoded fallback, but is
// overwritten by _loadWeekEpoch() below as soon as the
// admin logs in, reading from Firestore config/leaderboard
// if it exists. If no config doc exists yet, this hardcoded
// value remains in effect — so nothing breaks for admins
// who haven't set a custom epoch yet.
let WEEK_EPOCH = new Date('2026-05-04T08:00:00Z').getTime();
const MS_WEEK  = 7*24*60*60*1000;

window.getWeekId = function() {
  const n = Math.floor((Date.now()-WEEK_EPOCH)/MS_WEEK)+1;
  return `2026-W${n}`;
};
window.getWeekNum = function() { return Math.floor((Date.now()-WEEK_EPOCH)/MS_WEEK)+1; };
window.msUntilNextWeek = function() {
  const idx = Math.floor((Date.now()-WEEK_EPOCH)/MS_WEEK);
  return WEEK_EPOCH + (idx+1)*MS_WEEK - Date.now();
};
window.fmt = function(ms) {
  const d=Math.floor(ms/86400000), h=Math.floor((ms%86400000)/3600000),
        m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
  return d>0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
};
function pad(n){ return String(n).padStart(2,'0'); }
window.fmtDate = function(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
};
window.esc = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

// ============================================
// TIER 1 NEW — LEADERBOARD EPOCH CONFIG
// ============================================

// Reads config/leaderboard from Firestore. If it exists
// and has a weekEpoch field, overrides the in-memory
// WEEK_EPOCH used by every week calculation above.
async function _loadWeekEpoch() {
  try {
    const snap = await getDoc(doc(db,'config','leaderboard'));
    if (snap.exists() && snap.data().weekEpoch) {
      WEEK_EPOCH = snap.data().weekEpoch.toMillis
        ? snap.data().weekEpoch.toMillis()
        : new Date(snap.data().weekEpoch).getTime();
    }
  } catch (e) {
    console.warn('[Admin] Could not load week epoch config, using default:', e.message);
  }
}

// Called from the Settings panel UI (added in admin.html).
// Saves a new epoch date to Firestore and updates the
// in-memory value immediately so the countdown reflects it
// without needing a page reload.
window.saveWeekEpoch = async function() {
  const input = document.getElementById('settings-epoch-input');
  const errEl = document.getElementById('settings-epoch-error');
  if (!input || !input.value) {
    if (errEl) errEl.textContent = 'Please pick a date and time.';
    return;
  }

  const newEpochMs = new Date(input.value).getTime();
  if (isNaN(newEpochMs)) {
    if (errEl) errEl.textContent = 'Invalid date.';
    return;
  }

  showConfirm('📅','Change Week Epoch',
    'This changes how week numbers and reset countdowns are calculated for EVERY admin viewing this panel. This does NOT automatically update the main user-facing app — that requires a separate, deliberate sync. Continue?',
    async () => {
      try {
        await setDoc(doc(db,'config','leaderboard'), {
          weekEpoch: Timestamp.fromMillis(newEpochMs),
          updatedAt: serverTimestamp(),
          updatedBy: window._currentAdmin?.uid || 'admin'
        }, { merge: true });

        WEEK_EPOCH = newEpochMs;
        if (errEl) errEl.textContent = '';
        toast('Week epoch updated!', 'success');
        window.startCountdown?.();
        window.loadLeaderboard?.();
      } catch (e) {
        if (errEl) errEl.textContent = 'Failed to save: ' + e.message;
      }
    }
  );
};

// Populates the Settings panel's epoch input with the
// currently active epoch, formatted for a datetime-local input.
window.renderCurrentEpochInSettings = function() {
  const input = document.getElementById('settings-epoch-input');
  const label = document.getElementById('settings-epoch-current');
  if (!input && !label) return;

  const d = new Date(WEEK_EPOCH);
  const localIso = new Date(d.getTime() - d.getTimezoneOffset()*60000)
    .toISOString().slice(0,16);

  if (input) input.value = localIso;
  if (label) label.textContent = d.toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
};

// ── Toast ──
window.toast = function(msg, type='info') {
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const t = document.createElement('div');
  t.className=`toast toast-${type}`; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 4000);
};

// ── Confirm modal ──
window.showConfirm = function(icon, title, msg, onOk) {
  document.getElementById('confirm-icon').textContent  = icon;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  const btn = document.getElementById('confirm-ok-btn');
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh,btn);
  fresh.addEventListener('click',()=>{ closeConfirm(); onOk?.(); });
  document.getElementById('confirm-modal').classList.remove('hidden');
};

window.closeConfirm = function() {
  document.getElementById('confirm-modal').classList.add('hidden');
};

// ============================================
// TIER 1 NEW — PASSWORD VISIBILITY TOGGLE
// ============================================

window.toggleAdminPasswordVisibility = function() {
  const input = document.getElementById('admin-password');
  const icon  = document.getElementById('admin-pw-toggle-icon');
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  if (icon) {
    icon.classList.toggle('fa-eye', !isHidden);
    icon.classList.toggle('fa-eye-slash', isHidden);
  }
};

// ============================================
// TIER 1 NEW — THEME TOGGLE (light/dark)
// ============================================

const ADMIN_THEME_KEY = 'sq_admin_theme';

function _applyAdminTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('admin-theme-toggle-icon');
  if (icon) {
    icon.classList.toggle('fa-moon', theme === 'dark');
    icon.classList.toggle('fa-sun', theme === 'light');
  }
}

window.toggleAdminTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  _applyAdminTheme(next);
  try { localStorage.setItem(ADMIN_THEME_KEY, next); } catch {}
};

function _initAdminTheme() {
  let saved = 'dark';
  try { saved = localStorage.getItem(ADMIN_THEME_KEY) || 'dark'; } catch {}
  _applyAdminTheme(saved);
}
_initAdminTheme();

// ── Auth ──
window.adminLogin = async function() {
  const email = document.getElementById('admin-email').value.trim();
  const pass  = document.getElementById('admin-password').value;
  const btn   = document.getElementById('admin-login-btn');
  const err   = document.getElementById('login-error');
  err.textContent=''; btn.disabled=true; btn.textContent='Signing in…';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const snap = await getDoc(doc(db,'users',cred.user.uid));
    if (!snap.exists() || !['admin','moderator'].includes(snap.data().role)) {
      await signOut(auth);
      throw new Error('Access denied. Admin role required.');
    }
  } catch(e) {
    err.textContent = e.message.includes('Access denied') ? e.message
      : 'Invalid credentials. Please try again.';
    btn.disabled=false; btn.textContent='Sign In';
  }
};

window.adminLogout = function() {
  showConfirm('👋','Sign Out','Are you sure you want to sign out?', async ()=>{
    await signOut(auth);
  });
};

onAuthStateChanged(auth, async user => {
  if (user) {
    const snap = await getDoc(doc(db,'users',user.uid));
    if (!snap.exists() || !['admin','moderator'].includes(snap.data()?.role)) {
      await signOut(auth); return;
    }
    window._currentAdmin = { uid: user.uid, ...snap.data() };
    document.getElementById('login-screen').style.display='none';
    document.getElementById('dashboard').style.display='block';
    document.getElementById('admin-name-chip').textContent = snap.data().displayName || 'Admin';

    // TIER 1 NEW: load the custom week epoch (if one was ever
    // saved) BEFORE starting the countdown or loading anything
    // that depends on week calculations.
    await _loadWeekEpoch();

    startCountdown();
    window.renderCurrentEpochInSettings?.();
    window.loadOverview?.();
    window.loadRewards?.();
    window.loadUsers?.();
    window.loadQuestions?.();
    window.loadLeaderboard?.();
    window.loadAnnouncements?.();
  } else {
    document.getElementById('login-screen').style.display='flex';
    document.getElementById('dashboard').style.display='none';
    document.getElementById('admin-login-btn').disabled=false;
    document.getElementById('admin-login-btn').textContent='Sign In';
  }
});

// ── Navigation ──
window.showSection = function(name) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('section-'+name)?.classList.add('active');
  document.querySelectorAll(`[data-section="${name}"]`).forEach(b=>b.classList.add('active'));

  // TIER 1 NEW: refresh the epoch input display whenever the
  // Settings section is opened, in case it changed elsewhere.
  if (name === 'settings') window.renderCurrentEpochInSettings?.();
};

window.toggleMobileNav = function() {
  document.getElementById('mobile-nav').classList.toggle('open');
};
window.closeMobileNav = function(e) {
  if (!e || e.target===document.getElementById('mobile-nav'))
    document.getElementById('mobile-nav').classList.remove('open');
};

// ── Countdown ──
function startCountdown() {
  const el  = document.getElementById('ov-countdown');
  const wel = document.getElementById('ov-week-id');
  if(wel) wel.textContent = `Week ${getWeekNum()} — ${getWeekId()}`;
  if(!el) return;
  if (window._countdownInterval) clearInterval(window._countdownInterval);
  window._countdownInterval = setInterval(()=>{ el.textContent = fmt(msUntilNextWeek()); }, 1000);
  el.textContent = fmt(msUntilNextWeek());
}
window.startCountdown = startCountdown;

// ── Close modals on backdrop click ──
document.addEventListener('click', e=>{
  if(e.target.id==='question-modal') window.closeQuestionModal?.();
  if(e.target.id==='confirm-modal')  closeConfirm();
  if(e.target.id==='announce-modal') window.closeAnnounceModal?.();
});

// ── Enter key on login ──
document.getElementById('admin-password')
  ?.addEventListener('keydown', e=>{ if(e.key==='Enter') adminLogin(); });
