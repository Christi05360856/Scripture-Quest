import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getCurrentWeekId, log } from '../utils/helpers';
 
const db = admin.firestore();
 
// Runs every Monday at 09:00 WAT (08:00 UTC)
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getCurrentWeekId, log } from '../utils/helpers';
 
const db = admin.firestore();
 
// Runs every Monday at 09:00 WAT (08:00 UTC)
export const archiveWeeklyLeaderboard = functions.pubsub
  .schedule('0 8 * * 1')
  .timeZone('UTC')
  .onRun(async () => {
    const current = getCurrentWeekId();

const [yearStr, weekStr] = current.split('-W');
let year = parseInt(yearStr);
let week = parseInt(weekStr);

week -= 1;

if (week < 1) {
  year -= 1;
  week = 52;
}

const prevWeekId = `${year}-W${String(week).padStart(2, '0')}`;
 
    log('archiveWeek', 'Archiving', { prevWeekId });
 
    const entriesSnap = await db.collection('leaderboardWeekly')
      .doc(prevWeekId).collection('entries')
      .orderBy('points', 'desc').limit(10).get();
 
    const entries: any[] = [];
    entriesSnap.forEach(d => entries.push({ userId: d.id, ...d.data() }));
 
    if (entries.length === 0) { log('archiveWeek', 'No entries to archive'); return null; }
 
    const top3 = entries.slice(0, 3);
    await db.collection('weeklyWinners').doc(prevWeekId).set({
      firstPlace:  top3[0] || null,
      secondPlace: top3[1] || null,
      thirdPlace:  top3[2] || null,
      rewardsSent: false,
      archivedAt:  admin.firestore.Timestamp.now()
    });
 
    // Create reward claims for top 3
    const rewards = ['2GB Data', '1GB Data', '500MB Data'];
    const batch   = db.batch();
    top3.forEach((entry, i) => {
      const claimRef = db.collection('rewardClaims').doc();
      batch.set(claimRef, {
        userId: entry.userId, type: 'weekly', rank: i + 1,
        rewardType: rewards[i], weekId: prevWeekId,
        status: 'pending', createdAt: admin.firestore.Timestamp.now()
      });
    });
    await batch.commit();
 
    log('archiveWeek', 'Archived', { prevWeekId, top3Count: top3.length });
    return null;
  });
  
