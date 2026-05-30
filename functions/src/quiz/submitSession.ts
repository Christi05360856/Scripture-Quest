// functions/src/quiz/submitSession.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const submitQuizSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
  }

  const uid = context.auth.uid;
  const { sessionId, answers } = data;

  if (!sessionId || !answers) {
    throw new functions.https.HttpsError('invalid-argument', 'Session ID and answers are required');
  }

  try {
    // Get the session
    const sessionRef = db.collection('quizSessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Quiz session not found');
    }

    const session = sessionSnap.data()!;

    // Security checks
    if (session.userId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not your session');
    }

    if (session.completed) {
      throw new functions.https.HttpsError('failed-precondition', 'Session already submitted');
    }

    // TODO: Real scoring logic will go here
    // For now, simple placeholder
    const totalQuestions = Object.keys(answers).length || 15;
    const correctAnswers = Math.floor(totalQuestions * 0.75); // 75% for testing
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const xpEarned = Math.floor(score / 5) * 10; // Example XP

    // Update session
    await sessionRef.update({
      completed: true,
      validated: true,
      submittedAt: admin.firestore.Timestamp.now(),
      score,
      percentage: score,
      xpEarned,
      answers
    });

    // TODO: Update userStats, streaks, achievements, leaderboard (later)

    return {
      success: true,
      score,
      percentage: score,
      xpEarned,
      totalQuestions,
      correctAnswers,
      leveledUp: false,
      newLevel: 1,
      achievementUnlocks: [],
      message: "Quiz completed successfully!"
    };

  } catch (error: any) {
    console.error("Submit Session Error:", error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to submit quiz');
  }
});
