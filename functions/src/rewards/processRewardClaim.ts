import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getCurrentWeekId, log, logError } from '../utils/helpers';
 
const db = admin.firestore();
 
export const processRewardClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  const uid = context.auth.uid;
  const { type, threshold, rewardType } = data;
 
  const statsSnap = await db.collection('userStats').doc(uid).get();
  if (!statsSnap.exists) throw new functions.https.HttpsError('not-found', 'Stats not found.');
  const totalXp = statsSnap.data()!.totalXp || 0;
 
  if (totalXp < threshold) {
    throw new functions.https.HttpsError('failed-precondition', 'Threshold not reached.',
      { userMessage: `You need ${threshold.toLocaleString()} points. You have ${totalXp.toLocaleString()}.` });
  }
 
  // Duplicate claim check
  const dupSnap = await db.collection('rewardClaims')
    .where('userId', '==', uid)
    .where('type', '==', 'milestone')
    .where('tier', '==', threshold)
    .limit(1).get();
 
  if (!dupSnap.empty) throw new functions.https.HttpsError('already-exists', 'Already claimed.',
    { userMessage: 'You have already claimed this reward.' });
 
  const profileSnap = await db.collection('users').doc(uid).get();
  const profile = profileSnap.data() || {};
 
  if (!profile.phoneNumber || !profile.networkProvider) {
    throw new functions.https.HttpsError('failed-precondition', 'Profile incomplete.',
      { userMessage: 'Complete your profile (phone + network) before claiming rewards.' });
  }
 
  await db.collection('rewardClaims').add({
    userId: uid, type: 'milestone', tier: threshold, rewardType,
    phoneNumber: profile.phoneNumber, networkProvider: profile.networkProvider,
    displayName: profile.displayName, status: 'pending',
    weekId: getCurrentWeekId(), createdAt: admin.firestore.Timestamp.now()
  });
 
  log('processRewardClaim', 'Claim created', { uid, threshold, rewardType });
  return { success: true, message: 'Reward claim submitted! We will process within 24 hours.' };
});
