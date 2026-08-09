// ============================================
// SCRIPTUREQUEST V4 — Auth Service
// Handles all authentication flows.
// Persistence: LOCAL (users stay logged in).
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';

import {
  doc, getDoc, setDoc, updateDoc,
  serverTimestamp
} from 'firebase/firestore';

import { auth, db }               from '../firebase/config.js';
import { setState, resetQuiz }    from '../state/store.js';
import { initTheme }              from './theme.service.js';
import { showToast }              from '../utils/toast.js';
import { QUIZ_STATE_KEY }         from '../utils/constants.js';
import { getCurrentWeekId }       from '../utils/week.js';

// ── Register new user ──
export async function register({ name, email, password }) {
  if (!name || name.trim().length < 2) throw new Error('Please enter your full name');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCred.user;

  // Set display name on Firebase Auth
  await updateProfile(user, { displayName: name.trim() });

  // Create Firestore user document (safe profile fields only)
  await setDoc(doc(db, 'users', user.uid), {
    displayName:      name.trim(),
    email:            email.toLowerCase(),
    role:             'user',
    phoneNumber:      '',
    networkProvider:  '',
    profileComplete:  false,
    themePreference:  'light',
    soundEnabled:     true,
    createdAt:        serverTimestamp()
  });

  // Create userStats document (all competitive state — Cloud Function authority)
  await setDoc(doc(db, 'userStats', user.uid), {
    totalXp:          0,
    level:            1,
    currentLevelXp:   0,
    currentStreak:    0,
    longestStreak:    0,
    quizzesTaken:     0,
    bestScore:        0,
    perfectScores:    0,
    topThreeFinishes: 0,
    totalRewardsClaimed: 0,
    updatedAt:        serverTimestamp()
  });

  return userCred;
}

// ── Login ──
export async function login({ email, password }) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  return userCred;
}

// ── Logout ──
export async function logout() {
  // Clear quiz state from localStorage
  localStorage.removeItem(QUIZ_STATE_KEY);

  // Clear cached profile from store
  setState('auth', {
    user:    null,
    profile: null,
    stats:   null,
    ready:   true,
    loading: false
  });

  resetQuiz();

  await signOut(auth);
}

// ── Fetch user profile + stats ──
export async function fetchUserData(uid) {
  const weekId = getCurrentWeekId();

  const [profileSnap, statsSnap, weeklyEntrySnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'userStats', uid)),
    getDoc(doc(db, 'leaderboardWeekly', weekId, 'entries', uid))
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : null;
  const stats   = statsSnap.exists()   ? statsSnap.data()   : null;

  // weeklyPoints doesn't actually live on userStats — it's tracked
  // separately per-week on the leaderboard entry itself. Merge it in
  // here so every screen reading stats.weeklyPoints gets the real,
  // current-week number instead of always seeing 0.
  const weeklyPoints = weeklyEntrySnap.exists() ? (weeklyEntrySnap.data().points || 0) : 0;
  const mergedStats = stats ? { ...stats, weeklyPoints } : null;

  return { profile, stats: mergedStats };
}


// ── Update safe profile fields ──
export async function updateProfile_({ uid, phone, network }) {
  if (!phone || phone.trim().length < 10) throw new Error('Please enter a valid phone number');
  if (!network) throw new Error('Please select your network provider');

  await updateDoc(doc(db, 'users', uid), {
    phoneNumber:     phone.trim(),
    networkProvider: network,
    profileComplete: true
  });
}

// ── Update theme preference ──
export async function updateThemePreference(uid, theme) {
  await updateDoc(doc(db, 'users', uid), { themePreference: theme });
}

// ── Password reset ──
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Get friendly error message ──
export function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found':          'No account found with this email',
    'auth/wrong-password':          'Incorrect password. Please try again',
    'auth/email-already-in-use':    'An account with this email already exists',
    'auth/weak-password':           'Password must be at least 6 characters',
    'auth/invalid-email':           'Please enter a valid email address',
    'auth/too-many-requests':       'Too many attempts. Please try again later',
    'auth/network-request-failed':  'Network error. Please check your connection',
    'auth/user-disabled':           'This account has been disabled',
    'auth/invalid-credential':      'Invalid email or password'
  };
  return messages[code] || 'Something went wrong. Please try again';
}

// ── Auth state listener — called once on app init ──
export function initAuthListener(onLogin, onLogout) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      setState('auth', { loading: true });

      try {
        const { profile, stats } = await fetchUserData(user.uid);
        setState('auth', {
          user,
          profile,
          stats,
          ready:   true,
          loading: false
        });

        // Init theme from user preference
        await initTheme(profile);

        onLogin(user, profile, stats);
      } catch (err) {
        console.error('[Auth] Profile fetch error:', err);
        setState('auth', {
          user,
          profile: null,
          stats:   null,
          ready:   true,
          loading: false
        });
        onLogin(user, null, null);
      }
    } else {
      setState('auth', {
        user:    null,
        profile: null,
        stats:   null,
        ready:   true,
        loading: false
      });
      onLogout();
    }
  });
}

export default {
  register,
  login,
  logout,
  fetchUserData,
  updateProfile_,
  updateThemePreference,
  resetPassword,
  getAuthErrorMessage,
  initAuthListener
};
