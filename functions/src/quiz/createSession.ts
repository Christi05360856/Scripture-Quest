// ============================================
// SCRIPTUREQUEST v4 — createQuizSession
// Authoritative session creation.
// Enforces daily limit, question cooldown,
// anti-abuse. Frontend NEVER trusted.
// ============================================

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getCurrentWeekId, getTodayBoundaries, log, logError } from '../utils/helpers';

const db = admin.firestore();
const TOTAL_QUESTIONS   = 15;
const MAX_DAILY_QUIZZES = 2;
const SESSION_TTL_SECS  = 390; // 6.5 min

export const createQuizSession = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  const uid = context.auth.uid;
  log('createQuizSession', 'Session request', { uid });

  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

    if (userSnap.data()!.isBanned) {
      throw new functions.https.HttpsError('permission-denied', 'Account suspended.',
        { userMessage: 'Your account has been suspended. Contact support.' });
    }

    // Daily limit check
    const { start, end } = getTodayBoundaries();
    const attemptsSnap = await db.collection('quizAttempts')
      .where('userId', '==', uid)
      .where('timestamp', '>=', start)
      .where('timestamp', '<', end)
      .get();

    if (attemptsSnap.size >= MAX_DAILY_QUIZZES) {
      const msLeft = end.toMillis() - Date.now();
      throw new functions.https.HttpsError('resource-exhausted', 'Daily limit reached.',
        { userMessage: "You've completed both quizzes for today. Come back tomorrow!",
          msUntilReset: msLeft, nextQuizTime: new Date(end.toMillis()).toISOString() });
    }

    // Check for existing active session — return it instead of creating duplicate
    const activeSnap = await db.collection('quizSessions')
      .where('userId', '==', uid)
      .where('completed', '==', false)
      .where('expiresAt', '>', admin.firestore.Timestamp.now())
      .limit(1).get();

    if (!activeSnap.empty) {
      const existing = activeSnap.docs[0];
      const questions = await fetchQuestionsById(existing.data().questionIds);
      return { sessionId: existing.id, questions,
        expiresAt: existing.data().expiresAt.toMillis(),
        dailyRemaining: MAX_DAILY_QUIZZES - attemptsSnap.size, resumed: true };
    }

    // Fetch question history for cooldown
    const dailySnap = await db.collection('userDailyState').doc(uid).get();
    const history: string[] = dailySnap.exists ? (dailySnap.data()!.questionHistory || []) : [];

    const selected = await selectQuestions(history, TOTAL_QUESTIONS);
    if (selected.length < TOTAL_QUESTIONS) {
      throw new functions.https.HttpsError('internal', 'Not enough questions.',
        { userMessage: 'Quiz temporarily unavailable. Please try again shortly.' });
    }

    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + SESSION_TTL_SECS * 1000);
    const sessionRef = db.collection('quizSessions').doc();

    await sessionRef.set({
      userId: uid, createdAt: admin.firestore.Timestamp.now(), expiresAt,
      completed: false, validated: false, submittedAt: null,
      questionIds: selected.map(q => q.id), answers: {},
      score: null, percentage: null, xpEarned: null, weekId: getCurrentWeekId()
    });

    // Strip correctAnswer from client payload
    const publicQuestions = selected.map(q => ({
      id: q.id, question: q.question, options: q.options,
      category: q.category, difficulty: q.difficulty, verseReference: q.verseReference || ''
    }));

    log('createQuizSession', 'Created', { uid, sessionId: sessionRef.id });
    return { sessionId: sessionRef.id, questions: publicQuestions,
      expiresAt: expiresAt.toMillis(),
      dailyRemaining: Math.max(0, MAX_DAILY_QUIZZES - attemptsSnap.size - 1), resumed: false };

  } catch (err: any) {
    if (err instanceof functions.https.HttpsError) throw err;
    logError('createQuizSession', 'Unexpected error', err);
    throw new functions.https.HttpsError('internal', 'Session creation failed.');
  }
});

async function selectQuestions(history: string[], count: number) {
  const snap = await db.collection('questions').where('isActive', '==', true).get();
  let pool = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const recent = new Set(history);
  let filtered = pool.filter(q => !recent.has(q.id));
  if (filtered.length < count) filtered = pool;
  return shuffle(filtered).slice(0, count);
}

async function fetchQuestionsById(ids: string[]) {
  const results: any[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await db.collection('questions')
      .where(admin.firestore.FieldPath.documentId(), 'in', ids.slice(i, i + 30)).get();
    snap.forEach(d => results.push({ id: d.id, ...d.data() }));
  }
  return results.map(q => ({
    id: q.id, question: q.question, options: q.options,
    category: q.category, difficulty: q.difficulty, verseReference: q.verseReference || ''
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
                                                           }
