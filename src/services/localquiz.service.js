// ============================================
// SCRIPTUREQUEST v4 — Local Quiz Fallback
// Used when Cloud Functions aren't deployed yet
// OR when questions.js is available locally.
// Provides full quiz experience client-side.
// ============================================

import { db, auth }            from '../firebase/config.js';
import { doc, getDoc, setDoc,
         collection, query,
         where, getDocs,
         Timestamp, serverTimestamp } from 'firebase/firestore';
import { setState }            from '../state/store.js';
import { getCurrentWeekId,
         getTodayString }      from '../utils/week.js';
import { QUIZ_STATE_KEY,
         TOTAL_QUESTIONS,
         QUIZ_DURATION_SECS }  from '../utils/constants.js';

const MAX_DAILY = 2;

// ── Check if Cloud Functions are available ──
export async function isCloudFunctionsAvailable() {
  // We check by seeing if questions exist in Firestore
  // If not, fall back to local mode
  try {
    const snap = await getDocs(
      query(collection(db, 'questions'),
        where('isActive', '==', true))
    );
    return snap.size > 0;
  } catch {
    return false;
  }
}

// ── Fetch questions from Firestore (admin-added questions) ──
async function getQuestionsPool(fallbackArray) {
  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('../firebase/config.js');
    const snap = await getDocs(query(collection(db,'questions'), where('isActive','==',true)));
    if (snap.size > 0) {
      const qs = [];
      snap.forEach(d => qs.push({ id:d.id, ...d.data() }));
      console.log('[LocalQuiz] Using', qs.length, 'Firestore questions');
      return qs;
    }
  } catch(e) { console.warn('[LocalQuiz] Firestore questions fetch failed, using local:', e.message); }
  return fallbackArray;
}

// ── Create a local quiz session (no Cloud Function needed) ──
export async function createLocalQuizSession(questionsArray) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  // Daily limit check
  const today     = new Date();
  const dayStart  = Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayEnd    = Timestamp.fromDate(new Date(dayStart.toMillis() + 86400000));

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

  // Use Firestore questions if available, fall back to local
  const fullPool = await getQuestionsPool(questionsArray);
  const pool     = shuffleArray([...fullPool]);
  const selected = pool.slice(0, TOTAL_QUESTIONS);
  const expiresAt = Date.now() + QUIZ_DURATION_SECS * 1000;
  const sessionId = `local_${user.uid}_${Date.now()}`;

  // Save session stub to Firestore so submission works
  try {
    await setDoc(doc(db, 'quizSessions', sessionId), {
      userId:      user.uid,
      createdAt:   serverTimestamp(),
      expiresAt:   Timestamp.fromMillis(expiresAt),
      completed:   false,
      validated:   false,
      submittedAt: null,
      questionIds: selected.map((_, i) => `local_q${i}`),
      answers:     {},
      score:       null,
      percentage:  null,
      xpEarned:    null,
      weekId:      getCurrentWeekId(),
      isLocalSession: true
    });
  } catch (e) {
    console.warn('[LocalQuiz] Could not save session stub:', e.message);
  }

  return {
    sessionId,
    questions:      selected,
    expiresAt,
    dailyRemaining: Math.max(0, MAX_DAILY - attSnap.size - 1),
    resumed:        false,
    isLocal:        true
  };
}

// ── Submit local quiz (calculates server-side style, writes attempt) ──
export async function submitLocalQuizSession(sessionId, userAnswers, questions) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  // Score calculation
  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    if (userAnswers[i] !== undefined && userAnswers[i] === questions[i].correctAnswer) {
      score++;
    }
  }

  const total      = questions.length;
  const percentage = Math.round((score / total) * 100);
  const allAnswered = Object.keys(userAnswers).length >= total;

  // XP calculation (mirrors server logic)
  const baseXp         = score * 10;
  const accuracyBonus  = percentage >= 90 ? 90 : percentage >= 70 ? 40 : 0;
  const completionBonus = allAnswered ? 50 : 0;
  const xpEarned       = baseXp + accuracyBonus + completionBonus;

  const weekId   = getCurrentWeekId();
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch current stats
  const statsRef  = doc(db, 'userStats', user.uid);
  const statsSnap = await getDoc(statsRef);
  const stats     = statsSnap.exists() ? statsSnap.data() : {
    totalXp: 0, level: 1, currentLevelXp: 0,
    currentStreak: 0, longestStreak: 0,
    quizzesTaken: 0, bestScore: 0
  };

  const newTotalXp = (stats.totalXp || 0) + xpEarned;
  const newLevel   = calcLevel(newTotalXp);
  const leveledUp  = newLevel > (stats.level || 1);

  // Streak
  const dailyRef  = doc(db, 'userDailyState', user.uid);
  const dailySnap = await getDoc(dailyRef);
  const lastDate  = dailySnap.exists() ? dailySnap.data().lastQuizDate : null;
  const yesterday = getYesterday();
  let newStreak   = 1;
  if (lastDate === todayStr) newStreak = stats.currentStreak || 1;
  else if (lastDate === yesterday) newStreak = (stats.currentStreak || 0) + 1;
  const longestStreak = Math.max(newStreak, stats.longestStreak || 0);

  // Write attempt record
  try {
    await setDoc(doc(collection(db, 'quizAttempts')), {
      userId: user.uid, sessionId, score, totalQuestions: total,
      percentage, xpEarned, allAnswered,
      timestamp: serverTimestamp(), weekId, validated: true
    });

    // Update stats
    await setDoc(statsRef, {
      totalXp: newTotalXp, level: newLevel,
      currentLevelXp: newTotalXp - xpForLevel(newLevel - 1),
      currentStreak: newStreak, longestStreak,
      quizzesTaken: (stats.quizzesTaken || 0) + 1,
      bestScore: Math.max(stats.bestScore || 0, percentage),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Update daily state
    await setDoc(dailyRef, {
      todayQuizCount: (dailySnap.data()?.todayQuizCount || 0) + 1,
      lastQuizDate: todayStr,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Update leaderboard
    await setDoc(
      doc(db, 'leaderboardWeekly', weekId, 'entries', user.uid), {
        userId: user.uid,
        displayName: auth.currentUser.displayName || 'Anonymous',
        points: (await getLeaderboardPoints(user.uid, weekId)) + xpEarned,
        level: newLevel, streak: newStreak,
        quizzesTaken: (stats.quizzesTaken || 0) + 1,
        updatedAt: serverTimestamp()
      }, { merge: true });

    // Mark session complete (non-blocking — don't hang if it fails)
    setDoc(doc(db, 'quizSessions', sessionId), {
      completed: true, validated: true,
      submittedAt: serverTimestamp(),
      answers: userAnswers, score, percentage, xpEarned
    }, { merge: true }).catch(e => console.warn('[LocalQuiz] Session update failed:', e.message));

  } catch (e) {
    console.error('[LocalQuiz] Write error:', e.message);
  }

  return {
    score, totalQuestions: total, percentage,
    passed: percentage >= 50, xpEarned,
    totalXp: newTotalXp, leveledUp,
    oldLevel: stats.level || 1, newLevel,
    streak: newStreak, streakBroken: newStreak === 1 && (stats.currentStreak || 0) > 1,
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
  const d = new Date();
  d.setDate(d.getDate() - 1);
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
