// ============================================
// SCRIPTUREQUEST V5 — scripts/sendStreakReminders.js
// Run via GitHub Actions at 2:00 PM and 6:00 PM daily.
//
// Logic (per the technical spec):
//   1. Query every user's userDailyState doc.
//   2. A user is "eligible" if lastQuizDate !== today
//      (i.e. they have not completed today's Daily Quiz).
//   3. Skip users who have notificationPrefs.remindersEnabled === false.
//   4. Skip users with no saved FCM tokens.
//   5. Send a randomly-chosen reminder message via FCM.
//   6. Remove any stale/invalid tokens found along the way.
//
// Run mode is passed as the first CLI argument:
//   node sendStreakReminders.js morning   (2pm run)
//   node sendStreakReminders.js evening   (6pm run)
// This only affects which message pool is used and the
// notification tag — the eligibility logic is identical
// for both runs, since re-querying lastQuizDate fresh at
// 6pm naturally excludes anyone who completed the quiz
// between the two runs (per spec section 5, point 6).
// ============================================

const { initFirebaseAdmin } = require('./firebaseAdmin');

const MORNING_MESSAGES = [
  'Your Daily Quiz is waiting. 📖',
  "Don't let today's streak slip away! 🔥",
  'A new Bible challenge is ready for you. ✨',
  'Two minutes is all it takes — keep your streak alive today.',
  'Your streak misses you already. Come back!'
];

const EVENING_MESSAGES = [
  "Last call — you haven't done today's quiz yet!",
  'Still time to keep your streak alive tonight. 🔥',
  "Don't lose your streak — today's quiz is still open.",
  'A few minutes tonight keeps your streak going strong.',
  "Your streak is counting on you before today ends."
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTodayStr() {
  // Matches the client's todayStr format exactly:
  // new Date().toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0];
}

async function run() {
  const mode = process.argv[2] === 'evening' ? 'evening' : 'morning';
  const todayStr = getTodayStr();

  console.log(`[StreakReminders] Starting ${mode} run for date ${todayStr}`);

  const admin = initFirebaseAdmin();
  const db = admin.firestore();
  const messaging = admin.messaging();

  // ── Step 1: find all users who have NOT completed today's quiz ──
  const dailyStateSnap = await db.collection('userDailyState').get();

  const eligibleUids = [];
  dailyStateSnap.forEach(doc => {
    const data = doc.data();
    if (data.lastQuizDate !== todayStr) {
      eligibleUids.push(doc.id);
    }
  });

  // Also include users who have NO userDailyState doc at all
  // (brand new users who've never taken a quiz). We find these
  // by checking the users collection against what we've already
  // matched, since a missing doc can't be queried directly.
  const allUsersSnap = await db.collection('users').get();
  const dailyStateUids = new Set(dailyStateSnap.docs.map(d => d.id));
  allUsersSnap.forEach(doc => {
    if (!dailyStateUids.has(doc.id)) {
      eligibleUids.push(doc.id);
    }
  });

  console.log(`[StreakReminders] ${eligibleUids.length} user(s) eligible for a reminder`);

  if (!eligibleUids.length) {
    console.log('[StreakReminders] Nothing to do — exiting.');
    return;
  }

  // ── Step 2: filter by notification prefs + load push tokens ──
  let sentCount = 0;
  let skippedPrefsCount = 0;
  let skippedNoTokenCount = 0;
  let failedCount = 0;

  for (const uid of eligibleUids) {
    try {
      // Check notification preference (default: enabled if unset)
      const userSnap = await db.collection('users').doc(uid).get();
      const prefs = userSnap.exists ? userSnap.data().notificationPrefs : null;
      const remindersEnabled = prefs?.remindersEnabled !== false; // default true
      const streakAlertsEnabled = prefs?.streakAlertsEnabled !== false; // default true

      if (!remindersEnabled || !streakAlertsEnabled) {
        skippedPrefsCount++;
        continue;
      }

      // Get FCM tokens
      const tokenSnap = await db.collection('userPushTokens').doc(uid).get();
      const tokens = tokenSnap.exists ? (tokenSnap.data().tokens || []) : [];

      if (!tokens.length) {
        skippedNoTokenCount++;
        continue;
      }

      const messagePool = mode === 'morning' ? MORNING_MESSAGES : EVENING_MESSAGES;
      const body = pickRandom(messagePool);
      const title = '📖 ScriptureQuest';

      const message = {
        tokens,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: `sq-streak-${mode}`,
            vibrate: [200, 100, 200],
            requireInteraction: false,
            actions: [
              { action: 'take-quiz', title: '📝 Take Quiz Now' },
              { action: 'dismiss', title: 'Later' }
            ]
          },
          fcmOptions: { link: '/' }
        },
        data: {
          type: 'streak_reminder',
          mode,
          url: '/'
        },
        // TTL (Time-To-Live): per spec section 7, queued notifications
        // should deliver once the device reconnects, within a reasonable
        // window. 6 hours covers "delivered late but still same-day relevant."
        android: { ttl: 6 * 60 * 60 * 1000 },
        webpush_ttl: undefined // webpush TTL is set via header below if needed
      };

      const response = await messaging.sendEachForMulticast(message);
      sentCount++;

      // Clean up stale/invalid tokens
      const staleTokens = [];
      response.responses.forEach((r, i) => {
        if (!r.success && (
          r.error?.code === 'messaging/registration-token-not-registered' ||
          r.error?.code === 'messaging/invalid-registration-token'
        )) {
          staleTokens.push(tokens[i]);
        }
      });

      if (staleTokens.length) {
        const freshTokens = tokens.filter(t => !staleTokens.includes(t));
        await tokenSnap.ref.update({ tokens: freshTokens });
        console.log(`[StreakReminders] Removed ${staleTokens.length} stale token(s) for ${uid}`);
      }

    } catch (err) {
      failedCount++;
      console.error(`[StreakReminders] Failed for user ${uid}:`, err.message);
    }
  }

  console.log(
    `[StreakReminders] Done. Sent: ${sentCount}, ` +
    `Skipped (prefs off): ${skippedPrefsCount}, ` +
    `Skipped (no token): ${skippedNoTokenCount}, ` +
    `Failed: ${failedCount}`
  );
}

run().then(() => {
  console.log('[StreakReminders] Run complete.');
  process.exit(0);
}).catch(err => {
  console.error('[StreakReminders] Fatal error:', err);
  process.exit(1);
});
