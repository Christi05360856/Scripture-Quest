// ============================================
// SCRIPTUREQUEST V4 — Theme Service
// Manages light/dark/system theme switching.
// Syncs to Firestore. Zero hardcoded colors.
// ============================================

import { db, auth }     from '../firebase/config.js';
import { doc, updateDoc } from 'firebase/firestore';
import { setState, getState } from '../state/store.js';

const THEME_KEY     = 'sq_theme_pref';
const VALID_THEMES  = ['light', 'dark', 'system'];

// ── Apply theme to DOM ──
function _applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    setState('theme', { current: 'system', applied: prefersDark ? 'dark' : 'light' });
  } else {
    root.setAttribute('data-theme', theme);
    setState('theme', { current: theme, applied: theme });
  }

  // Update theme toggle icon if it exists
  _updateToggleIcon(theme);
}

function _updateToggleIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const icons = { light: '🌙', dark: '☀️', system: '💻' };
  btn.textContent = icons[theme] || '🌙';
  btn.setAttribute('aria-label', `Switch theme (current: ${theme})`);
}

// ── Initialize theme on app start ──
export async function initTheme(userProfile = null) {
  let preference = 'light'; // platform default per spec

  // Priority: Firestore > localStorage > default
  if (userProfile?.themePreference && VALID_THEMES.includes(userProfile.themePreference)) {
    preference = userProfile.themePreference;
  } else {
    const local = localStorage.getItem(THEME_KEY);
    if (local && VALID_THEMES.includes(local)) {
      preference = local;
    }
  }

  _applyTheme(preference);

  // Watch system theme changes if on 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getState('theme').current === 'system') _applyTheme('system');
  });
}

// ── Set and persist theme ──
export async function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return;

  _applyTheme(theme);

  // Save locally immediately
  localStorage.setItem(THEME_KEY, theme);

  // Sync to Firestore if logged in
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, 'users', user.uid), { themePreference: theme });
    } catch (err) {
      console.warn('[Theme] Firestore sync failed (will retry on next login):', err.message);
    }
  }
}

// ── Toggle between light and dark ──
export function toggleTheme() {
  const { applied } = getState('theme');
  setTheme(applied === 'dark' ? 'light' : 'dark');
}

// ── Get current applied theme ──
export function getCurrentTheme() {
  return getState('theme');
}

export default { initTheme, setTheme, toggleTheme, getCurrentTheme };
