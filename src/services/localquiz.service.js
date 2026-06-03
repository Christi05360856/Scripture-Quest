// ============================================
// SCRIPTUREQUEST v4 — Local Quiz Fallback
// Fix 1: Merges Firestore + local questions.js
//         to always reach TOTAL_QUESTIONS (15)
// Fix 2: Session existence check before submit
// Fix 3: Permission errors are thrown immediately,
//        never mislabeled as "already submitted"
// Fix 4: Firestore rules now allow users to write
//        their own quizSessions (see firestore.rules)
// ============================================

import { db, auth }            from '../firebase/config.js';
import { doc, getDoc, setDoc,
         collection, query,
         where, getDocs,
         Timestamp, serverTimestamp } from 'firebase/firestore';
import { getCurrentWeekId }    from '../utils/week.js';
import { QUIZ_STATE_KEY,
         TOTAL_QUESTIONS,
         QUIZ_DURATION_SECS }  from '../utils/constants.js';

const MAX_DAILY = 2;

export async function isCloudFunctionsAvailable() {
  try {
    const snap = await getDocs(
      query(collection(db, 'questions'), where('isActive', '==', true))
    );
    return snap.size > 0;
  } catch { return false; }
}

// ── Issue 1 Fix: Merge Firestore + local, dedupe by question text ──
async function getQuestionsPool(fallbackArray) {
  let firestoreQs = [];
  try {
    const snap = await getDocs(
      query(collection(db, 'questions'), where('isActive', '==', true))
    );
    snap.forEach(d => firestoreQs.push({ id: d.id, ...d.data() }));
    console.log('[LocalQuiz] Firestore questions:', firestoreQs.length);
  } catch(e) {
    console.warn('[LocalQuiz] Firestore fetch failed:', e.message);
  }

  const localQs = fallbackArray || [];

  if (firestoreQs.length === 0) {
    console.log('[LocalQuiz] Using local pool only:', localQs.length);
    return localQs;
  }

  if (firestoreQs.length >= TOTAL_QUESTIONS) {
    console.log('[LocalQuiz] Firestore pool sufficient:', firestoreQs.length);
    return firestoreQs;
  }

  // Merge: Firestore first, then fill from local avoiding duplicates
  const firestoreTexts = new Set(firestoreQs.map(q => q.question.trim().toLowerCase()));
  const uniqueLocal    = localQs.filter(q => !firestoreTexts.has(q.question.trim().toLowerCase()));
  const merged         = [...firestoreQs, ...uniqueLocal];
  console.log('[LocalQuiz] Merged pool:', merged.length,
    '(', firestoreQs.length, 'Firestore +', uniqueLocal.length, 'local)');
  return merged;
}

export async function createLocalQuizSession(questionsArray) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  const today    = new Date();
  const dayStart = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayEnd   = Timestamp.fromDate(new Date(dayStart.toMillis() + 86400000));

  const attSnap = await getDocs(
    query(collection(db, 'quizAttempts'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', dayStart),
      where('timestamp', '<',  dayEnd))
  );

  if (attSnap.size >= MAX_DAILY) {
    const msLeft = dayEnd.toMillis() - Date.now();
    throw new Error(`Daily limit reached. Come back in ${formatMs(msLeft)}!`);
  }

  const fullPool  = await getQuestionsPool(questionsArray);

  if (fullPool.length < TOTAL_QUESTIONS) {
    throw new Error(
      `Not enough questions available (${fullPool.length} found, need ${TOTAL_QUESTIONS}). ` +
      `Please ask the admin to add more questions.`
    );
  }

  const pool      = shuffleArray([...fullPool]);
  const selected  = pool.slice(0, TOTAL_QUESTIONS);
  const expiresAt = Date.now() + QUIZ_DURATION_SECS * 1000;
  const sessionId = `local_${user.uid}_${Date.now()}_${attSnap.size}`;

  try {
    await setDoc(doc(db, 'quizSessions', sessionId), {
      userId:         user.uid,
      createdAt:      serverTimestamp(),
      expiresAt:      Timestamp.fromMillis(expiresAt),
      completed:      false,
      validated:      false,
      submittedAt:    null,
      questionIds:    selected.map((_, i) => `local_q${i}`),
      answers:        {},
      score:          null,
      percentage:     null,
      xpEarned:       null,
      weekId:         getCurrentWeekId(),
      isLocalSession: true
    });
  } catch (e) {
    // FIX: Do NOT swallow permission errors here. Log but re-throw
    // so the caller knows the session could not be created.
    console.error('[LocalQuiz] Session stub save failed:', e.message);
    throw new Error(`Failed to create quiz session: ${e.message}`);
  }

  return {
    sessionId, questions: selected, expiresAt,
    dailyRemaining: Math.max(0, MAX_DAILY - attSnap.size - 1),
    resumed: false, isLocal: true
  };
}

export async function submitLocalQuizSession(sessionId, userAnswers, questions) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  // ── Issue 2 Fix: Check if already submitted ──
  // FIX: Permission errors on getDoc must be thrown immediately.
  // Only the "already submitted" case should be handled specially.
  try {
    const sessionSnap = await getDoc(doc(db, 'quizSessions', sessionId));
    if (sessionSnap.exists() && sessionSnap.data().completed === true) {
      throw new Error('ALREADY_SUBMITTED');
    }
  } catch (e) {
    if (e.message === 'ALREADY_SUBMITTED') {
      throw new Error('This quiz session was already submitted. Please start a new quiz.');
    }
    // FIX: Re-throw permission/network errors immediately — do NOT swallow
    console.error('[LocalQuiz] Session pre-check failed:', e.message);
    throw new Error(`Session check failed: ${e.message}`);
  }

  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    if (userAnswers[i] !== undefined && userAnswers[i] === questions[i].correctAnswer) score++;
  }

  const total       = questions.length;
  const percentage  = Math.round((score / total) * 100);
  const allAnswered = Object.keys(userAnswers).length >= total;
  const baseXp          = score * 10;
  const accuracyBonus   = percentage >= 90 ? 90 : percentage >= 70 ? 40 : 0;
  const completionBonus = allAnswered ? 50 : 0;
  const xpEarned        = baseXp + accuracyBonus + completionBonus;

  const weekId   = getCurrentWeekId();
  const todayStr = new Date().toISOString().split('T')[0];

  const statsRef  = doc(db, 'userStats', user.uid);
  const statsSnap = await getDoc(statsRef);
  const stats     = statsSnap.exists() ? statsSnap.data() : {
    totalXp: 0, level: 1, currentLevelXp: 0,
    currentStreak: 0, longestStreak: 0, quizzesTaken: 0, bestScore: 0
  };

  const newTotalXp = (stats.totalXp || 0) + xpEarned;
  const newLevel   = calcLevel(newTotalXp);
  const leveledUp  = newLevel > (stats.level || 1);

  const dailyRef  = doc(db, 'userDailyState', user.uid);
  const dailySnap = await getDoc(dailyRef);
  const lastDate  = dailySnap.exists() ? dailySnap.data().lastQuizDate : null;
  const yesterday = getYesterday();
  let newStreak   = 1;
  if (lastDate === todayStr)       newStreak = stats.currentStreak || 1;
  else if (lastDate === yesterday) newStreak = (stats.currentStreak || 0) + 1;
  const longestStreak = Math.max(newStreak, stats.longestStreak || 0);

  // Mark session complete first (optimistic lock against double-submit)
  try {
    await setDoc(doc(db, 'quizSessions', sessionId), {
      completed: true, validated: true,
      submittedAt: serverTimestamp(),
      answers: userAnswers, score, percentage, xpEarned
    }, { merge: true });
  } catch (e) {
    // FIX: Never mislabel permission-denied as "already submitted".
    // Throw the real error so the UI can handle it properly.
    console.error('[LocalQuiz] Session lock failed:', e.message);
    throw new Error(`Failed to lock session: ${e.message}`);
  }

  // ── Stats writes (best-effort, but still throw on permission errors) ──
  try {
    await setDoc(doc(collection(db, 'quizAttempts')), {
      userId: user.uid, sessionId, score, totalQuestions: total,
      percentage, xpEarned, allAnswered,
      timestamp: serverTimestamp(), weekId, validated: true
    });

    await setDoc(statsRef, {
      totalXp: newTotalXp, level: newLevel,
      currentLevelXp: newTotalXp - xpForLevel(newLevel - 1),
      currentStreak: newStreak, longestStreak,
      quizzesTaken: (stats.quizzesTaken || 0) + 1,
      bestScore: Math.max(stats.bestScore || 0, percentage),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(dailyRef, {
      todayQuizCount: (dailySnap.data()?.todayQuizCount || 0) + 1,
      lastQuizDate: todayStr, updatedAt: serverTimestamp()
    }, { merge: true });

    const currentLbPoints = await getLeaderboardPoints(user.uid, weekId);
    await setDoc(
      doc(db, 'leaderboardWeekly', weekId, 'entries', user.uid), {
        userId: user.uid,
        displayName: auth.currentUser.displayName || 'Anonymous',
        points: currentLbPoints + xpEarned,
        level: newLevel, streak: newStreak,
        quizzesTaken: (stats.quizzesTaken || 0) + 1,
        updatedAt: serverTimestamp()
      }, { merge: true });
  } catch (e) {
    // FIX: Log but still re-throw so the UI knows something went wrong.
    // The session is already locked, so the quiz won't be double-counted,
    // but the user needs to know their stats might not have saved.
    console.error('[LocalQuiz] Stats write error:', e.message);
    throw new Error(`Quiz submitted, but stats save failed: ${e.message}`);
  }

  return {
    score, totalQuestions: total, percentage,
    passed: percentage >= 50, xpEarned,
    totalXp: newTotalXp, leveledUp,
    oldLevel: stats.level || 1, newLevel,
    streak: newStreak,
    streakBroken: newStreak === 1 && (stats.currentStreak || 0) > 1,
    longestStreak, weeklyPoints: xpEarned,
    achievementUnlocks: [], badgeUnlocks: []
  };
}

async function getLeaderboardPoints(uid, weekId) {
  try {
    const snap = await getDoc(doc(db, 'leaderboardWeekly', weekId, 'entries', uid));
    return snap.exists() ? (snap.data().points || 0) : 0;
  } catch { return 0; }
}

function calcLevel(xp) {
  let level = 1, used = 0;
  while (true) {
    const needed = Math.ceil(100 * Math.pow(level, 1.5));
    if (used + needed > xp) break;
    used += needed; level++;
  }
  return level;
}

function xpForLevel(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) total += Math.ceil(100 * Math.pow(i, 1.5));
  return total;
}

function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}
