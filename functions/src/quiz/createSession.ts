// functions/src/quiz/createSession.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const db = admin.firestore();

const DAILY_QUIZ_LIMIT = 2;
const QUIZ_DURATION_MINUTES = 10; // as per frontend

export const createQuizSession = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
  }

  const uid = context.auth.uid;

  try {
    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyStateRef = db.collection('userDailyState').doc(uid);
    const dailyState = await dailyStateRef.get();

    let todayQuizCount = 0;
    let lastQuizDate = null;

    if (dailyState.exists) {
      const data = dailyState.data()!;
      todayQuizCount = data.todayQuizCount || 0;
      lastQuizDate = data.lastQuizDate;
    }

    // Reset counter if new day
    if (!lastQuizDate || lastQuizDate.toDate().getTime() < today.getTime()) {
      todayQuizCount = 0;
    }

    if (todayQuizCount >= DAILY_QUIZ_LIMIT) {
      throw new functions.https.HttpsError('failed-precondition', 
        `Daily limit reached. You can take ${DAILY_QUIZ_LIMIT} quizzes per day.`);
    }

    // Check for active session
    const activeSession = await db.collection('quizSessions')
      .where('userId', '==', uid)
      .where('completed', '==', false)
      .get();

    if (!activeSession.empty) {
      throw new functions.https.HttpsError('failed-precondition', 
        'You already have an active quiz session.');
    }

    // TODO: Fetch questions from Firestore (questions collection)
    // For now, we'll return a placeholder. We'll improve this later.
    const questions = [
      {
        id: "q1",
        question: "Sample Question: What is the first book of the Bible?",
        options: ["Genesis", "Exodus", "Matthew", "Revelation"],
        // correctAnswer will be hidden from frontend
      }
      // Add more real questions later
    ];

    const sessionId = `session_\( {uid}_ \){Date.now()}`;
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + QUIZ_DURATION_MINUTES * 60 * 1000));

    // Create session document
    await db.collection('quizSessions').doc(sessionId).set({
      userId: uid,
      createdAt: Timestamp.now(),
      expiresAt,
      completed: false,
      validated: false,
      questionIds: questions.map(q => q.id),
      answers: {},
      score: 0,
      xpEarned: 0
    });

    // Update daily count
    await dailyStateRef.set({
      todayQuizCount: todayQuizCount + 1,
      lastQuizDate: Timestamp.fromDate(today),
      activeSessionId: sessionId,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return {
      sessionId,
      questions,           // Note: correct answers should be removed here in production
      expiresAt: expiresAt.toDate().toISOString(),
      dailyRemaining: DAILY_QUIZ_LIMIT - (todayQuizCount + 1)
    };

  } catch (error: any) {
    console.error("Create Session Error:", error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create quiz session');
  }
});
