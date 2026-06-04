// ============================================
// SCRIPTUREQUEST V4 — Challenge Service
// Handles DIRECT challenges from the leaderboard.
// This is SEPARATE from the WhatsApp-code flow
// in match.service.js.
//
// FLOW:
//   User A taps ⚔️ next to User B on leaderboard
//   → sendDirectChallenge(targetUid) called
//   → Creates match doc (status:'waiting')
//   → Writes to incomingChallenges/{targetUid}
//   → Calls sendChallengeNotification CF (FCM)
//   → User B's listener fires in-app modal OR
//     they get a push notification if offline
//   → User B accepts → match goes active → battle
//   → User B rejects → User A gets toast
//   → 5-minute TTL auto-expires if no response
// ============================================

import { doc, collection, addDoc, getDoc, updateDoc,
         setDoc, deleteDoc, onSnapshot,
         serverTimestamp, Timestamp, query,
         where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase/config.js';
import { getCurrentWeekId } from '../utils/week.js';
import { DIRECT_CHALLENGE_TTL_MS, COLLECTIONS } from '../utils/constants.js';

let _incomingUnsub    = null; // listener for incoming challenges
let _outgoingUnsub    = null; // listener for outgoing challenge response
let _sendNotifFn      = null;

function getSendNotifFn() {
  if (!_sendNotifFn) {
    const fns = getFunctions();
    _sendNotifFn = httpsCallable(fns, 'sendChallengeNotification');
  }
  return _sendNotifFn;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'SQ-' + Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// ============================================
// SEND DIRECT CHALLENGE
// Called when User A taps ⚔️ on leaderboard
// ============================================

export async function sendDirectChallenge(targetUid, targetName, questions) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  if (user.uid === targetUid) throw new Error("You can't challenge yourself!");

  const profile = await getDoc(doc(db, 'users', user.uid));
  const { displayName = 'Anonymous', avatarId = 'M01' } = profile.data() || {};

  const expiresAt  = Timestamp.fromMillis(Date.now() + DIRECT_CHALLENGE_TTL_MS);
  const code       = generateCode();
  const pool       = [...questions].sort(() => Math.random() - 0.5).slice(0, 15);

  // Create match document
  const matchRef = await addDoc(collection(db, COLLECTIONS.MATCHES), {
    code,
    creatorId:     user.uid,
    creatorName:   displayName,
    creatorAvatar: avatarId,
    opponentId:    targetUid,   // pre-set for direct challenges
    opponentName:  targetName,
    opponentAvatar:null,        // filled in when they accept
    status:        'pending',   // 'pending' = direct, waiting for acceptance
    challengeType: 'direct',
    questions:     pool.map(q => ({
      question: q.question, options: q.options, correctAnswer: q.correctAnswer,
      category: q.category || '', verseReference: q.verseReference || ''
    })),
    creatorAnswers:  {},
    opponentAnswers: {},
    creatorScore:    null,
    opponentScore:   null,
    creatorPct:      null,
    opponentPct:     null,
    winnerId:        null,
    weekId:          getCurrentWeekId(),
    createdAt:       serverTimestamp(),
    expiresAt,
    messages: [{
      type:      'challenge',
      text:      `⚔️ ${displayName} directly challenged ${targetName} to a Bible quiz battle!`,
      timestamp: Date.now()
    }]
  });

  const matchId = matchRef.id;

  // Write to target's incomingChallenges collection
  // Their listener fires this immediately if they're online
  await setDoc(doc(db, COLLECTIONS.INCOMING_CHALLENGES, targetUid), {
    matchId,
    code,
    challengerId:   user.uid,
    challengerName: displayName,
    challengerAvatar: avatarId,
    targetUid,
    targetName,
    expiresAt,
    createdAt:      serverTimestamp(),
    status:         'pending'
  });

  // Send FCM push notification (for offline users)
  // Non-fatal if it fails
  try {
    const notifFn = getSendNotifFn();
    await notifFn({
      targetUid,
      challengerName: displayName,
      challengeCode:  code,
      matchId
    });
  } catch (e) {
    console.warn('[Challenge] FCM notification failed (non-fatal):', e.message);
  }

  return { matchId, code, expiresAt: expiresAt.toMillis() };
}

// ============================================
// LISTEN FOR INCOMING CHALLENGES
// Call this on login. Fires callback whenever
// someone sends a direct challenge to this user.
// Shows the full-screen accept modal.
// ============================================

export function listenForIncomingChallenges(uid, onChallenge) {
  if (_incomingUnsub) { _incomingUnsub(); _incomingUnsub = null; }

  _incomingUnsub = onSnapshot(
    doc(db, COLLECTIONS.INCOMING_CHALLENGES, uid),
    async (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      // Ignore expired or already-handled challenges
      if (data.status !== 'pending') return;
      if (data.expiresAt?.toMillis?.() < Date.now()) {
        // Clean up expired challenge silently
        await deleteDoc(snap.ref).catch(() => {});
        return;
      }

      // Valid incoming challenge — fire callback
      onChallenge({
        matchId:         data.matchId,
        code:            data.code,
        challengerId:    data.challengerId,
        challengerName:  data.challengerName,
        challengerAvatar:data.challengerAvatar,
        expiresAt:       data.expiresAt?.toMillis?.() || 0
      });
    },
    err => console.warn('[Challenge] Incoming listener error:', err.message)
  );

  return () => { if (_incomingUnsub) { _incomingUnsub(); _incomingUnsub = null; } };
}

export function stopIncomingChallengeListener() {
  if (_incomingUnsub) { _incomingUnsub(); _incomingUnsub = null; }
}

// ============================================
// ACCEPT DIRECT CHALLENGE
// Called when User B taps "Accept Challenge"
// ============================================

export async function acceptDirectChallenge(matchId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  const matchRef  = doc(db, COLLECTIONS.MATCHES, matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error('Challenge no longer available.');

  const match = matchSnap.data();
  if (match.status !== 'pending') throw new Error('Challenge already accepted or expired.');
  if (match.expiresAt.toMillis() < Date.now()) throw new Error('Challenge has expired.');

  const profile = await getDoc(doc(db, 'users', user.uid));
  const { displayName = 'Anonymous', avatarId = 'M01' } = profile.data() || {};

  // Update match to active
  await updateDoc(matchRef, {
    opponentAvatar: avatarId,
    opponentName:   displayName, // confirm actual name
    status:         'active'
  });

  // Clear from incoming challenges inbox
  await deleteDoc(doc(db, COLLECTIONS.INCOMING_CHALLENGES, user.uid)).catch(() => {});

  return { matchId, questions: match.questions, match: { ...match, status: 'active' } };
}

// ============================================
// REJECT DIRECT CHALLENGE
// Called when User B taps "Maybe Later" / rejects
// ============================================

export async function rejectDirectChallenge(matchId, targetUid) {
  try {
    // Update match status
    await updateDoc(doc(db, COLLECTIONS.MATCHES, matchId), {
      status: 'rejected',
      rejectedAt: serverTimestamp()
    });

    // Clear inbox
    await deleteDoc(doc(db, COLLECTIONS.INCOMING_CHALLENGES, targetUid)).catch(() => {});
  } catch (e) {
    console.warn('[Challenge] Reject error:', e.message);
  }
}

// ============================================
// LISTEN FOR OUTGOING CHALLENGE RESPONSE
// User A calls this after sending a challenge
// to know if User B accepted or rejected.
// ============================================

export function listenForChallengeResponse(matchId, callbacks) {
  if (_outgoingUnsub) { _outgoingUnsub(); _outgoingUnsub = null; }

  _outgoingUnsub = onSnapshot(doc(db, COLLECTIONS.MATCHES, matchId), snap => {
    if (!snap.exists()) return;
    const match = { matchId: snap.id, ...snap.data() };

    if (match.status === 'active') {
      if (_outgoingUnsub) { _outgoingUnsub(); _outgoingUnsub = null; }
      callbacks.onAccepted?.(match);
    } else if (match.status === 'rejected') {
      if (_outgoingUnsub) { _outgoingUnsub(); _outgoingUnsub = null; }
      callbacks.onRejected?.(match);
    }
    // 'pending' = still waiting, do nothing
  });

  return () => { if (_outgoingUnsub) { _outgoingUnsub(); _outgoingUnsub = null; } };
}

export function stopOutgoingChallengeListener() {
  if (_outgoingUnsub) { _outgoingUnsub(); _outgoingUnsub = null; }
}

export default {
  sendDirectChallenge, listenForIncomingChallenges, stopIncomingChallengeListener,
  acceptDirectChallenge, rejectDirectChallenge,
  listenForChallengeResponse, stopOutgoingChallengeListener
};
