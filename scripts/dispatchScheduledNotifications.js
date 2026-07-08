// ============================================
// SCRIPTUREQUEST V5 — scripts/dispatchScheduledNotifications.js
// Run via GitHub Actions on a schedule (e.g. every 5–10 min).
//
// Consumes the `scheduledNotifications` collection — written by
// the admin panel's notification composer. Supports all 4 real
// audience segments from admin.html's #notif-audience dropdown:
//   all        → every user with a saved push token
//   inactive   → lastQuizDate 3+ days ago, or no daily-state doc at all
//   streak     → currentStreak > 0
//   no-streak  → currentStreak == 0 AND longestStreak > 0 (had one, lost it)
// ============================================

const { initFirebaseAdmin } = require('./firebaseAdmin');

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

async function resolveAudienceUids(db, audience) {
  if (audience === 'all') {
    const usersSnap = await db.collection('users').get();
    return usersSnap.docs.map(d => d.id);
  }

  if (audience === 'streak' || audience === 'no-streak') {
    const statsSnap = await db.collection('userStats').get();
    const uids = [];
    statsSnap.forEach(doc => {
      const s = doc.data();
      const current = s.currentStreak || 0;
      const longest = s.longestStreak || 0;
      if (audience === 'streak' && current > 0) uids.push(doc.id);
      if (audience === 'no-streak' && current === 0 && longest > 0) uids.push(doc.id);
    });
    return uids;
  }

  if (audience === 'inactive') {
    const cutoff = daysAgoStr(3); // e.g. "2026-07-05" — anything on/before this date counts
    const dailySnap = await db.collection('userDailyState').get();
    const uids = [];
    const seenUids = new Set();

    dailySnap.forEach(doc => {
      seenUids.add(doc.id);
      const lastQuizDate = doc.data().lastQuizDate;
      if (!lastQuizDate || lastQuizDate <= cutoff) uids.push(doc.id);
    });

    // Users with NO userDailyState doc at all have never played — inactive by definition
    const usersSnap = await db.collection('users').get();
    usersSnap.forEach(doc => {
      if (!seenUids.has(doc.id)) uids.push(doc.id);
    });

    return uids;
  }

  return null; // truly unknown audience value — caller handles this
}

async function run() {
  console.log('[ScheduledNotifications] Starting dispatch run');

  const admin = initFirebaseAdmin();
  const db = admin.firestore();
  const messaging = admin.messaging();
  const now = Date.now();

  const pendingSnap = await db
    .collection('scheduledNotifications')
    .where('status', '==', 'pending')
    .get();

  if (pendingSnap.empty) {
    console.log('[ScheduledNotifications] Nothing pending — exiting.');
    return;
  }

  console.log(`[ScheduledNotifications] ${pendingSnap.size} pending notification(s) found`);

  let sentCount = 0;
  let skippedNotDueCount = 0;
  let skippedAudienceCount = 0;
  let failedCount = 0;

  for (const docSnap of pendingSnap.docs) {
    const notif = docSnap.data();
    const { title, body, audience, scheduledFor } = notif;

    const dueTime = scheduledFor?.toMillis ? scheduledFor.toMillis() : now;
    if (dueTime > now) {
      skippedNotDueCount++;
      continue;
    }

    try {
      const targetUids = await resolveAudienceUids(db, audience);

      if (targetUids === null) {
        console.warn(`[ScheduledNotifications] Doc ${docSnap.id} has unknown audience "${audience}" — leaving for manual review`);
        await docSnap.ref.update({
          status: 'unsupported_audience',
          note: `Audience "${audience}" is not a recognized value`
        });
        skippedAudienceCount++;
        continue;
      }

      console.log(`[ScheduledNotifications] Doc ${docSnap.id}: audience "${audience}" → ${targetUids.length} matching user(s)`);

      // ── Gather push tokens for exactly this segment ──
      const allTokens = [];
      const tokenOwnerRefs = []; // parallel array for stale-token cleanup

      for (const uid of targetUids) {
        const tokenSnap = await db.collection('userPushTokens').doc(uid).get();
        if (!tokenSnap.exists) continue;
        const arr = tokenSnap.data().tokens || [];
        arr.forEach(t => { allTokens.push(t); tokenOwnerRefs.push(tokenSnap.ref); });
      }

      if (!allTokens.length) {
        await docSnap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          note: 'no_tokens_in_segment',
          matchedUsers: targetUids.length
        });
        sentCount++;
        continue;
      }

      const BATCH_SIZE = 500; // FCM multicast cap per call
      let totalSuccess = 0, totalFailure = 0;
      const staleIndexes = [];

      for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
        const tokenBatch = allTokens.slice(i, i + BATCH_SIZE);

        const message = {
          tokens: tokenBatch,
          notification: { title: title || 'ScriptureQuest', body: body || '' },
          webpush: {
            notification: {
              title: title || 'ScriptureQuest',
              body: body || '',
              icon: '/icons/icon-192.png',
              badge: '/icons/badge-72.png',
              tag: `sq-admin-${audience}`,
              vibrate: [200, 100, 200],
              requireInteraction: false,
              actions: [
                { action: 'take-quiz', title: '📝 Take Quiz Now' },
                { action: 'dismiss', title: 'Later' }
              ]
            },
            fcmOptions: { link: '/' }
          },
          data: { type: 'admin_broadcast', audience, url: '/' },
          android: { ttl: 6 * 60 * 60 * 1000 }
        };

        const response = await messaging.sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        response.responses.forEach((r, j) => {
          if (!r.success && (
            r.error?.code === 'messaging/registration-token-not-registered' ||
            r.error?.code === 'messaging/invalid-registration-token'
          )) {
            staleIndexes.push(i + j);
          }
        });
      }

      await docSnap.ref.update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        successCount: totalSuccess,
        failureCount: totalFailure,
        matchedUsers: targetUids.length
      });
      sentCount++;

      // ── Clean up stale tokens, grouped by owner doc ──
      if (staleIndexes.length) {
        const byOwnerPath = new Map();
        staleIndexes.forEach(idx => {
          const ref = tokenOwnerRefs[idx];
          const tok = allTokens[idx];
          if (!byOwnerPath.has(ref.path)) byOwnerPath.set(ref.path, { ref, stale: [] });
          byOwnerPath.get(ref.path).stale.push(tok);
        });
        for (const { ref, stale } of byOwnerPath.values()) {
          const snap = await ref.get();
          const current = snap.data()?.tokens || [];
          const fresh = current.filter(t => !stale.includes(t));
          await ref.update({ tokens: fresh });
        }
        console.log(`[ScheduledNotifications] Removed ${staleIndexes.length} stale token(s) total`);
      }

    } catch (err) {
      failedCount++;
      console.error(`[ScheduledNotifications] Failed for doc ${docSnap.id}:`, err.message);
      await docSnap.ref.update({
        status: 'failed',
        error: err.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
  }

  console.log(
    `[ScheduledNotifications] Done. Sent: ${sentCount}, ` +
    `Not due yet: ${skippedNotDueCount}, ` +
    `Unsupported audience: ${skippedAudienceCount}, ` +
    `Failed: ${failedCount}`
  );
}

run().then(() => {
  console.log('[ScheduledNotifications] Run complete.');
  process.exit(0);
}).catch(err => {
  console.error('[ScheduledNotifications] Fatal error:', err);
  process.exit(1);
});
