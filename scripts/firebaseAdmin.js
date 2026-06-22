// ============================================
// SCRIPTUREQUEST V5 — scripts/firebaseAdmin.js
// Shared Firebase Admin SDK init for both
// notification scripts (streak reminders +
// pending pushes dispatcher).
//
// SECURITY: reads the service account credentials
// ONLY from the FIREBASE_SERVICE_ACCOUNT environment
// variable, which GitHub Actions injects from a
// repository secret. The actual key value NEVER
// appears in this file or anywhere in the repo.
// ============================================

const admin = require('firebase-admin');

function initFirebaseAdmin() {
  if (admin.apps.length) return admin; // already initialized

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. ' +
      'This must be configured as a GitHub Actions repository secret.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT could not be parsed as JSON. ' +
      'Make sure the entire service account JSON was pasted exactly as-is into the secret value.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return admin;
}

module.exports = { initFirebaseAdmin };
