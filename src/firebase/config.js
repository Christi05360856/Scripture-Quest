// ============================================
// SCRIPTUREQUEST V4 — Firebase Configuration
// Single source of truth. Modular SDK (v10).
// Imported by all services — never duplicated.
// ============================================

import { initializeApp }         from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore }           from 'firebase/firestore';
import { getFunctions }           from 'firebase/functions';
import { getAnalytics }           from 'firebase/analytics';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCqe7f1APzzWX4s9gsIxF-byiU7qJ9eT7g",
  authDomain: "system-overhaul.firebaseapp.com",
  projectId: "system-overhaul",
  storageBucket: "system-overhaul.firebasestorage.app",
  messagingSenderId: "902227040128",
  appId: "1:902227040128:web:fb38d004fabf8ef35e5365",
  measurementId: "G-46V13WEGT2"
};

// ── Initialize app ──
const app = initializeApp(firebaseConfig);

// ── Services ──
export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);

// ── Auth persistence: LOCAL
// Users stay logged in across sessions and browser restarts.
// Resolves the "must re-login every time" complaint.
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('[Auth] Persistence: LOCAL — users stay logged in'))
  .catch(err => console.error('[Auth] Persistence error:', err));

export default app;
