// ============================================
// admin-init.js  — Bible Battle Admin
// ============================================

import {
  auth, db,
  toggleTheme, initTheme, toggleSB, closeSB,
  showSec, getCurSec,
  adminLogin, adminLogout,
  togglePw, showConfirm, closeConfirm,
  startAuthListener, startCountdown
} from './admin-core.js';

import { loadOverview, loadTopWinners, loadRecentAttempts, confirmArchiveWeek }
  from './admin-overview.js';

import { loadRewards, filterRewards }
  from './admin-rewards.js';

import { loadUsers, filterUsers }
  from './admin-users.js';

import { loadQuestions, filterQuestions, openAddQ, editQ, closeQModal, saveQ, deleteQ }
  from './admin-questions.js';

import { loadLeaderboard }
  from './admin-leaderboard.js';

import { loadAnnouncements, openNewAnn, closeAnnModal, saveAnn }
  from './admin-announcements.js';

import { updatePreview, toggleSchedule, fillTemplate, clearNotif, sendNotif, loadNotifHistory }
  from './admin-notifications.js';

import { previewEpoch, confirmReset }
  from './admin-launch.js';

// ── Wire ALL handlers to window ───────────────────────
window.toggleTheme        = toggleTheme;
window.toggleSB           = toggleSB;
window.closeSB            = closeSB;
window.showSec            = showSec;
window.togglePw           = togglePw;
window.adminLogin         = adminLogin;
window.adminLogout        = adminLogout;
window.closeConfirm       = closeConfirm;
window.closeQModal        = closeQModal;
window.closeAnnModal      = closeAnnModal;
window.loadOverview       = loadOverview;
window.loadTopWinners     = loadTopWinners;
window.loadRecentAttempts = loadRecentAttempts;
window.confirmArchiveWeek = confirmArchiveWeek;
window.loadRewards        = loadRewards;
window.filterRewards      = filterRewards;
window.loadUsers          = loadUsers;
window.filterUsers        = filterUsers;
window.loadQuestions      = loadQuestions;
window.filterQuestions    = filterQuestions;
window.openAddQ           = openAddQ;
window.editQ              = editQ;
window.saveQ              = saveQ;
window.deleteQ            = deleteQ;
window.loadLeaderboard    = loadLeaderboard;
window.loadAnnouncements  = loadAnnouncements;
window.openNewAnn         = openNewAnn;
window.saveAnn            = saveAnn;
window.updatePreview      = updatePreview;
window.toggleSchedule     = toggleSchedule;
window.fillT              = fillTemplate;
window.clearNotif         = clearNotif;
window.sendNotif          = sendNotif;
window.loadNotifHistory   = loadNotifHistory;
window.previewEpoch       = previewEpoch;
window.confirmReset       = confirmReset;
window.saveEpoch          = saveEpoch;

window.refreshCurrent = () => ({
  overview:      loadOverview,
  users:         loadUsers,
  rewards:       loadRewards,
  questions:     loadQuestions,
  leaderboard:   loadLeaderboard,
  announce:      loadAnnouncements,
  notifications: loadNotifHistory,
  launch:        () => {},
  settings:      () => {}
}[getCurSec()] || loadOverview)();

// ── Helper ─────────────────────────────────────────────
function wire(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// ── Apply theme immediately (before auth resolves) ─────
initTheme();

// ── CRITICAL: Wire login button IMMEDIATELY on page load ──
// These must work BEFORE any auth state fires.
// The old code only called wireEventListeners() inside onSignedIn
// which meant the login button was dead on first load.
wire('admin-login-btn', 'click', adminLogin);
wire('admin-email',     'keydown', e => { if (e.key === 'Enter') document.getElementById('admin-password').focus(); });
wire('admin-password',  'keydown', e => { if (e.key === 'Enter') adminLogin(); });
wire('pw-toggle-btn',   'click',   togglePw);

// ── Auth state ─────────────────────────────────────────
startAuthListener(
  // ── Signed IN ──
  (profile) => {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display   = 'block';

    const name = profile.displayName || profile.name || profile.email?.split('@')[0] || 'Admin';
    const chip = document.getElementById('admin-name-chip');
    if (chip) chip.textContent = name;

    startCountdown();
    wireDashboardListeners();

    // Load all sections
    Promise.all([
      loadOverview(),
      loadUsers(),
      loadRewards(),
      loadQuestions(),
      loadLeaderboard(),
      loadAnnouncements(),
      loadNotifHistory()
    ]).catch(e => console.error('[Admin init load error]', e));
  },

  // ── Signed OUT ──
  () => {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display   = 'none';
    const btn = document.getElementById('admin-login-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  }
);

// ── Dashboard listeners (wired after sign-in) ──────────
let _dashboardWired = false;
function wireDashboardListeners() {
  // Guard: only wire once even if auth fires multiple times
  if (_dashboardWired) return;
  _dashboardWired = true;

  // Sidebar nav
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      showSec(sec);
      const loaders = {
        overview:      loadOverview,
        users:         loadUsers,
        rewards:       loadRewards,
        questions:     loadQuestions,
        leaderboard:   loadLeaderboard,
        announce:      loadAnnouncements,
        notifications: loadNotifHistory,
      };
      loaders[sec]?.();
    });
  });

  // Top nav
  wire('hamburger-btn',      'click',  toggleSB);
  wire('theme-btn',          'click',  toggleTheme);
  wire('logout-top-btn',     'click',  adminLogout);
  wire('logout-sidebar-btn', 'click',  adminLogout);

  // Overview
  wire('refresh-overview-btn', 'click',  loadOverview);
  wire('refresh-attempts-btn', 'click',  loadRecentAttempts);
  wire('archive-week-btn',     'click',  confirmArchiveWeek);

  // Rewards
  wire('refresh-rewards-btn', 'click',  loadRewards);
  wire('rewards-search',      'input',  filterRewards);
  wire('rewards-filter',      'change', filterRewards);
  // Note: Config panel buttons are wired dynamically in admin-rewards.js

  // Users
  wire('refresh-users-btn',   'click',  loadUsers);
  wire('users-search',        'input',  filterUsers);
  wire('users-filter',        'change', filterUsers);

  // Questions
  wire('add-question-btn',    'click',  openAddQ);
  wire('q-search',            'input',  filterQuestions);
  wire('q-cat-filter',        'change', filterQuestions);
  wire('q-diff-filter',       'change', filterQuestions);
  wire('cancel-q-btn',        'click',  closeQModal);
  wire('close-q-modal-btn',   'click',  closeQModal);
  wire('q-save-btn',          'click',  saveQ);

  // Leaderboard
  wire('refresh-lb-btn',      'click',  loadLeaderboard);

  // Announcements
  wire('new-ann-btn',         'click',  openNewAnn);
  wire('cancel-ann-btn',      'click',  closeAnnModal);
  wire('close-ann-modal-btn', 'click',  closeAnnModal);
  wire('save-ann-btn',        'click',  saveAnn);

  // Notifications
  wire('notif-title',         'input',  updatePreview);
  wire('notif-body',          'input',  updatePreview);
  wire('notif-schedule',      'change', toggleSchedule);
  wire('clear-notif-btn',     'click',  clearNotif);
  wire('send-notif-btn',      'click',  sendNotif);
  wire('refresh-notif-btn',   'click',  loadNotifHistory);

  // Notification quick templates
  document.querySelectorAll('[data-t-title]').forEach(btn => {
    btn.addEventListener('click', () =>
      fillTemplate(btn.getAttribute('data-t-title'), btn.getAttribute('data-t-body'))
    );
  });

  // Launch tools
  wire('preview-epoch-btn', 'click', previewEpoch);
  wire('archive-btn',       'click', confirmArchiveWeek);
  wire('reset-lb-btn',      'click', confirmReset);

  // Settings
  wire('save-epoch-btn',    'click', saveEpoch);

  // Modal backdrop clicks
  document.addEventListener('click', e => {
    if (e.target.id === 'question-modal') closeQModal();
    if (e.target.id === 'confirm-modal')  closeConfirm();
    if (e.target.id === 'announce-modal') closeAnnModal();
  });
}

// ── Settings: save epoch ────────────────────────────────
async function saveEpoch() {
  const input = document.getElementById('settings-epoch-input');
  const error = document.getElementById('settings-epoch-error');
  const btn   = document.getElementById('save-epoch-btn');
  if (!input?.value) { if (error) error.textContent = 'Please select a date'; return; }
  if (error) error.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  try {
    const display = document.getElementById('settings-epoch-current');
    if (display) display.textContent = new Date(input.value).toISOString();
    // Toast the dev to also update constants.js
    toast('Epoch saved (admin panel only). Remember to update WEEK_EPOCH in constants.js too!', 'warn');
  } catch(e) {
    if (error) error.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Epoch';
  }
}
