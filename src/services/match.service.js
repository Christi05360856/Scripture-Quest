// ============================================
// SCRIPTUREQUEST V4 — Match Service
// OPTION A: Pure Firestore with onWrite trigger.
// submitBattleAnswers ONLY writes score + done flag.
// The Cloud Function trigger (onMatchUpdate) closes
// the match server-side when both players submit.
// No client-side CF call. No races. No CORS.
// ============================================

import { doc, collection, addDoc, getDoc, updateDoc,
         query, where, getDocs, onSnapshot,
         serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth }    from '../firebase/config.js';
import { getCurrentWeekId } from '../utils/week.js';

const CHALLENGE_TTL_MS = 2 * 3600000;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'SQ-' + Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export async function createChallenge(questions) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  const code      = generateCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + CHALLENGE_TTL_MS);
  const pool      = [...questions].sort(() => Math.random() - 0.5).slice(0, 15);
  const profile   = await getDoc(doc(db, 'users', user.uid));
  const { displayName = 'Anonymous', avatarId = 'M01' } = profile.data() || {};

  const matchRef = await addDoc(collection(db, 'matches'), {
    code, creatorId: user.uid, creatorName: displayName, creatorAvatar: avatarId,
    opponentId: null, opponentName: null, opponentAvatar: null,
    status: 'waiting',
    questions: pool.map(q => ({
      question: q.question, options: q.options, correctAnswer: q.correctAnswer,
      category: q.category || '', verseReference: q.verseReference || ''
    })),
    creatorAnswers: {}, opponentAnswers: {},
    creatorScore: null, opponentScore: null,
    creatorPct: null, opponentPct: null,
    creatorDone: false, opponentDone: false,
    winnerId: null, weekId: getCurrentWeekId(),
    createdAt: serverTimestamp(), expiresAt,
    challengeType: 'code',
    messages: [{ type:'challenge', text:`⚔️ ${displayName} challenged you to a Bible quiz battle!`, timestamp: Date.now() }]
  });

  return { matchId: matchRef.id, code, expiresAt: expiresAt.toMillis(), questions: pool };
}

export async function getChallengeByCode(code) {
  const snap = await getDocs(query(collection(db, 'matches'), where('code', '==', code.toUpperCase())));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { matchId: d.id, ...d.data() };
}

export const getMatchByCode = getChallengeByCode;

export async function acceptChallenge(matchId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  const matchRef  = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error('Challenge not found.');
  const match = matchSnap.data();
  if (match.status !== 'waiting')              throw new Error('Challenge no longer available.');
  if (match.creatorId === user.uid)            throw new Error("You can't accept your own challenge!");
  if (match.expiresAt.toMillis() < Date.now()) throw new Error('Challenge has expired.');
  const profile = await getDoc(doc(db, 'users', user.uid));
  const { displayName = 'Anonymous', avatarId = 'M01' } = profile.data() || {};
  await updateDoc(matchRef, {
    opponentId: user.uid, opponentName: displayName, opponentAvatar: avatarId, status: 'active'
  });
  return { matchId, questions: match.questions };
}

// ============================================
// SUBMIT — Write score + done flag ONLY.
// The onWrite trigger closes the match.
// ============================================
export async function submitBattleAnswers(matchId, userAnswers) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');

  const matchRef  = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error('Match not found.');

  const match     = matchSnap.data();
  const isCreator = match.creatorId === user.uid;
  const questions = match.questions || [];

  // Already completed
  if (match.status === 'completed') {
    return {
      score:          isCreator ? match.creatorScore : match.opponentScore,
      percentage:     isCreator ? match.creatorPct   : match.opponentPct,
      totalQuestions: questions.length,
      bothDone:       true, matchId, alreadyCompleted: true
    };
  }

  // Score locally
  let score = 0;
  questions.forEach((q, i) => { if (userAnswers[i] === q.correctAnswer) score++; });
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Write score + done flag. Trigger will handle completion.
  const updates = isCreator
    ? { creatorAnswers: userAnswers, creatorScore: score, creatorPct: pct, creatorDone: true, creatorDoneAt: serverTimestamp() }
    : { opponentAnswers: userAnswers, opponentScore: score, opponentPct: pct, opponentDone: true, opponentDoneAt: serverTimestamp() };

  await updateDoc(matchRef, updates);

  // Return local result. Client waits for onSnapshot to fire when trigger closes match.
  return {
    score, percentage: pct, totalQuestions: questions.length,
    bothDone: false, matchId
  };
}

export async function getMatchResult(matchId) {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return null;
  return { matchId: snap.id, ...snap.data() };
}

export function listenToMatch(matchId, onUpdate) {
  return onSnapshot(doc(db, 'matches', matchId), snap => {
    if (snap.exists()) onUpdate({ matchId: snap.id, ...snap.data() });
  });
}

export async function sendRematch(oldMatchId, questions) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  const oldSnap = await getDoc(doc(db, 'matches', oldMatchId));
  if (!oldSnap.exists()) throw new Error('Original match not found.');
  const old = oldSnap.data();
  const pool = questions?.length ? questions : old.questions;
  if (!pool?.length) throw new Error('No questions available for rematch.');
  const shuffled  = [...pool].sort(() => Math.random() - 0.5).slice(0, 15);
  const code      = generateCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + CHALLENGE_TTL_MS);
  const profile   = await getDoc(doc(db, 'users', user.uid));
  const { displayName = 'Anonymous', avatarId = 'M01' } = profile.data() || {};

  const matchRef = await addDoc(collection(db, 'matches'), {
    code, creatorId: user.uid, creatorName: displayName, creatorAvatar: avatarId,
    opponentId: null, opponentName: null, opponentAvatar: null,
    status: 'waiting', questions: shuffled,
    creatorAnswers: {}, opponentAnswers: {},
    creatorScore: null, opponentScore: null,
    creatorPct: null, opponentPct: null,
    creatorDone: false, opponentDone: false,
    winnerId: null, weekId: getCurrentWeekId(),
    createdAt: serverTimestamp(), expiresAt,
    challengeType: 'code', rematchOf: oldMatchId,
    messages: [{ type:'rematch', text:`🔄 ${displayName} wants a rematch!`, timestamp: Date.now() }]
  });

  const oldMessages = [...(old.messages || [])];
  oldMessages.push({
    type:'rematch', text:`🔄 ${displayName} started a rematch! Code: ${code}`,
    rematchCode: code, rematchMatchId: matchRef.id, timestamp: Date.now()
  });
  await updateDoc(doc(db, 'matches', oldMatchId), {
    rematchMatchId: matchRef.id, rematchCode: code, messages: oldMessages
  });

  return { matchId: matchRef.id, code, expiresAt: expiresAt.toMillis(), questions: shuffled };
}

export function generateWhatsAppLink(code, challengerName, appUrl) {
  const msg = encodeURIComponent(
    `⚔️ *${challengerName}* is challenging you to a Bible Quiz Battle on ScriptureQuest!\n\n` +
    `📖 Think you know your Bible better?\n` +
    `🔥 Accept here: ${appUrl}?challenge=${code}\n\n⏰ Expires in 2 hours!`
  );
  return `https://wa.me/?text=${msg}`;
}

export function getChallengeCodeFromURL() {
  return new URLSearchParams(window.location.search).get('challenge') || null;
}

export function clearChallengeFromURL() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('challenge')) {
    url.searchParams.delete('challenge');
    window.history.replaceState({}, document.title, url.pathname + (url.search || ''));
  }
}

export async function getUserMatches(userId) {
  try {
    const [a, b] = await Promise.all([
      getDocs(query(collection(db, 'matches'), where('creatorId',  '==', userId))),
      getDocs(query(collection(db, 'matches'), where('opponentId', '==', userId)))
    ]);
    const matches = [];
    a.forEach(d => matches.push({ matchId: d.id, ...d.data() }));
    b.forEach(d => matches.push({ matchId: d.id, ...d.data() }));
    return matches
      .filter(m => m.status !== 'expired')
      .sort((x, y) => (y.createdAt?.toMillis?.() || 0) - (x.createdAt?.toMillis?.() || 0));
  } catch { return []; }
}

export default {
  createChallenge, getChallengeByCode, getMatchByCode, acceptChallenge,
  submitBattleAnswers, getMatchResult, listenToMatch, sendRematch,
  generateWhatsAppLink, getChallengeCodeFromURL, clearChallengeFromURL, getUserMatches
};
