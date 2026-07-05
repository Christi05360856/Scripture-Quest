// ============================================
// SCRIPTUREQUEST V5 — Progress Service
// Reads and writes /userProgress/{uid} in Firestore.
// Handles round submission, scoring against the
// pass threshold, and cascading completion
// checks (round -> lesson -> unit -> section).
//
// BUG FIX: Write errors are now re-thrown so the UI
// can show "submission failed" instead of pretending success.
// ============================================

import { db, auth } from '../firebase/config.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { getRound, parseRoundId, getPathStructure, computeLockState } from './path.service.js';

const PASS_THRESHOLD  = 70; // % — requires 5/7 correct
const XP_UNLOCK_COST  = 500; // XP cost to unlock one round out of sequence

// XP constants
const XP_PER_CORRECT      = 10;
const XP_ROUND_COMPLETE   = 50;
const XP_LESSON_COMPLETE  = 100;
const XP_UNIT_COMPLETE    = 200;
const XP_SECTION_COMPLETE = 1000;
const XP_PERFECT_ROUND    = 150; // awarded INSTEAD of round-complete bonus on 100%

// ============================================
// FETCH USER PROGRESS
// ============================================

export async function getUserProgress(uid) {
  if (!uid) return _emptyProgress();
  try {
    const snap = await getDoc(doc(db, 'userProgress', uid));
    if (!snap.exists()) return _emptyProgress();
    const data = snap.data();
    return {
      completedRounds:   data.completedRounds   || {},
      completedLessons:  data.completedLessons  || {},
      completedUnits:    data.completedUnits    || {},
      completedSections: data.completedSections || {},
      totalPathXp:        data.totalPathXp        || 0,
      totalRoundsCompleted: data.totalRoundsCompleted || 0,
      currentSectionId:  data.currentSectionId  || null,
      currentLessonKey:  data.currentLessonKey  || null,
      currentRoundId:    data.currentRoundId    || null,
      xpUnlockedRounds:  data.xpUnlockedRounds  || {}
    };
  } catch (e) {
    console.warn('[Progress] Fetch error:', e.message);
    return _emptyProgress();
  }
}

function _emptyProgress() {
  return {
    completedRounds: {}, completedLessons: {}, completedUnits: {}, completedSections: {},
    totalPathXp: 0, totalRoundsCompleted: 0,
    currentSectionId: null, currentLessonKey: null, currentRoundId: null,
    xpUnlockedRounds: {}
  };
}

// ============================================
// SUBMIT A ROUND
// Scores the answers, checks pass threshold,
// writes the result, and cascades completion
// checks up through lesson/unit/section.
//
// userAnswers: { [questionIndex]: optionIndex }
// ============================================

export async function submitRound(roundId, userAnswers) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');

  const round = getRound(roundId);
  if (!round) throw new Error('Round not found.');

  const questions = round.questions || [];
  let correct = 0;
  questions.forEach((q, i) => {
    if (userAnswers[i] !== undefined && userAnswers[i] === q.correctAnswer) correct++;
  });

  const total      = questions.length || 1;
  const percentage = Math.round((correct / total) * 100);
  const passed     = percentage >= PASS_THRESHOLD;
  const isPerfect  = percentage === 100;

  // ── XP calculation ──
  let xpEarned = correct * XP_PER_CORRECT;
  if (passed) {
    xpEarned += isPerfect ? XP_PERFECT_ROUND : XP_ROUND_COMPLETE;
  }

  // ── Fetch current progress ──
  const progress = await getUserProgress(user.uid);

  // Only record if this is a new pass OR improves a previous score
  const existing = progress.completedRounds[roundId];
  const shouldUpdateRound = passed && (!existing || percentage > (existing.score || 0));

  const updatedCompletedRounds = { ...progress.completedRounds };
  if (shouldUpdateRound || !existing) {
    updatedCompletedRounds[roundId] = {
      score: percentage,
      passed,
      attempts: (existing?.attempts || 0) + 1,
      completedAt: passed ? new Date().toISOString() : (existing?.completedAt || null)
    };
  } else if (existing) {
    // failed retry — just bump attempt count, keep prior best score
    updatedCompletedRounds[roundId] = { ...existing, attempts: (existing.attempts || 0) + 1 };
  }

  // ── Cascade: check lesson/unit/section completion ──
  const { lessonKey, bookCode } = parseRoundId(roundId);
  const cascadeResult = passed
    ? _checkCascadeCompletion(roundId, lessonKey, bookCode, updatedCompletedRounds)
    : { lessonComplete: false, unitComplete: false, sectionComplete: false, sectionId: null };

  let totalXp = (progress.totalPathXp || 0) + (passed && shouldUpdateRound ? xpEarned : 0);
  if (cascadeResult.lessonComplete)  totalXp += XP_LESSON_COMPLETE;
  if (cascadeResult.unitComplete)    totalXp += XP_UNIT_COMPLETE;
  if (cascadeResult.sectionComplete) totalXp += XP_SECTION_COMPLETE;

  const updatedCompletedLessons = { ...progress.completedLessons };
  if (cascadeResult.lessonComplete) {
    updatedCompletedLessons[lessonKey] = { completedAt: new Date().toISOString() };
  }

  const updatedCompletedUnits = { ...progress.completedUnits };
  if (cascadeResult.unitComplete) {
    updatedCompletedUnits[bookCode] = { completedAt: new Date().toISOString() };
  }

  const updatedCompletedSections = { ...progress.completedSections };
  if (cascadeResult.sectionComplete && cascadeResult.sectionId) {
    updatedCompletedSections[cascadeResult.sectionId] = { completedAt: new Date().toISOString() };
  }

  // ── Write to Firestore ──
  // BUG FIX: Re-throw write errors so the UI shows "submission failed"
  // instead of pretending success.
  try {
    await setDoc(doc(db, 'userProgress', user.uid), {
      completedRounds:   updatedCompletedRounds,
      completedLessons:  updatedCompletedLessons,
      completedUnits:    updatedCompletedUnits,
      completedSections: updatedCompletedSections,
      totalPathXp:        totalXp,
      totalRoundsCompleted: Object.values(updatedCompletedRounds).filter(r => r.passed).length,
      currentRoundId:    roundId,
      currentLessonKey:  lessonKey,
      updatedAt:         serverTimestamp()
    }, { merge: true });

    // ── Also feed XP into userStats for badges/level system ──
    if (passed && shouldUpdateRound) {
      await _addXpToUserStats(user.uid, xpEarned +
        (cascadeResult.lessonComplete  ? XP_LESSON_COMPLETE  : 0) +
        (cascadeResult.unitComplete    ? XP_UNIT_COMPLETE    : 0) +
        (cascadeResult.sectionComplete ? XP_SECTION_COMPLETE : 0)
      );
    }
  } catch (e) {
    console.error('[Progress] Write error:', e.message);
    throw new Error('Submission failed. Please check your connection and try again.');
  }

  return {
    score: correct,
    totalQuestions: total,
    percentage,
    passed,
    isPerfect,
    xpEarned,
    lessonComplete:  cascadeResult.lessonComplete,
    unitComplete:    cascadeResult.unitComplete,
    sectionComplete: cascadeResult.sectionComplete,
    sectionId:       cascadeResult.sectionId
  };
}

// ============================================
// CASCADE COMPLETION CHECK
// After a round passes, check whether this
// completes the lesson, then the unit, then
// the section.
// ============================================

function _checkCascadeCompletion(roundId, lessonKey, bookCode, completedRounds) {
  const structure = getPathStructure();

  let lessonComplete  = false;
  let unitComplete     = false;
  let sectionComplete  = false;
  let sectionId         = null;

  for (const section of structure) {
    const unit = section.units.find(u => u.bookCode === bookCode);
    if (!unit) continue;

    const lesson = unit.lessons.find(l => l.lessonKey === lessonKey);
    if (lesson) {
      lessonComplete = lesson.roundIds.every(rid => completedRounds[rid]?.passed);
    }

    if (lessonComplete) {
      unitComplete = unit.lessons.every(l =>
        l.roundIds.every(rid => completedRounds[rid]?.passed)
      );
    }

    if (unitComplete) {
      sectionComplete = section.units.every(u =>
        u.lessons.every(l => l.roundIds.every(rid => completedRounds[rid]?.passed))
      );
      sectionId = section.id;
    }

    break; // found the matching unit, no need to keep scanning
  }

  return { lessonComplete, unitComplete, sectionComplete, sectionId };
}

// ============================================
// FEED PATH XP INTO userStats
// ============================================

async function _addXpToUserStats(uid, xpAmount) {
  if (xpAmount <= 0) return;
  try {
    const statsRef  = doc(db, 'userStats', uid);
    const statsSnap = await getDoc(statsRef);
    const stats     = statsSnap.exists() ? statsSnap.data() : { totalXp: 0, level: 1 };

    const newTotalXp = (stats.totalXp || 0) + xpAmount;
    const newLevel   = _calcLevel(newTotalXp);

    await setDoc(statsRef, {
      totalXp: newTotalXp,
      level: newLevel,
      currentLevelXp: newTotalXp - _xpForLevel(newLevel - 1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('[Progress] userStats XP feed error:', e.message);
    // Non-fatal — don't break the round result for a stats update failure
  }
}

// ============================================
// XP BALANCE — spendable XP (Total XP earned minus XP spent unlocking rounds)
// This is NEVER a separately-tracked number; it's always derived live
// from userStats, so it can never drift out of sync.
// ============================================

export async function getXpBalance(uid) {
  if (!uid) return { totalXp: 0, xpSpent: 0, balance: 0 };
  try {
    const snap = await getDoc(doc(db, 'userStats', uid));
    const data = snap.exists() ? snap.data() : {};
    const totalXp = data.totalXp || 0;
    const xpSpent = data.xpSpent || 0;
    return { totalXp, xpSpent, balance: Math.max(0, totalXp - xpSpent) };
  } catch (e) {
    console.warn('[Progress] getXpBalance error:', e.message);
    return { totalXp: 0, xpSpent: 0, balance: 0 };
  }
}

// ============================================
// UNLOCK A ROUND WITH XP
// Spends XP_UNLOCK_COST from the spendable balance and marks
// the round as manually unlocked — does NOT touch totalXp,
// level, or the leaderboard in any way.
// ============================================

export async function unlockRoundWithXP(roundId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  if (!roundId) throw new Error('No round specified.');

  const { xpSpent, balance } = await getXpBalance(user.uid);
  if (balance < XP_UNLOCK_COST) {
    throw new Error(`You need ${XP_UNLOCK_COST} XP to unlock a round. You have ${balance}.`);
  }

  const progress = await getUserProgress(user.uid);
  if (progress.completedRounds?.[roundId]?.passed) {
    throw new Error('This round is already completed.');
  }
  if (progress.xpUnlockedRounds?.[roundId]) {
    throw new Error('This round is already unlocked.');
  }

  const updatedUnlocked = { ...(progress.xpUnlockedRounds || {}), [roundId]: true };

  try {
    await setDoc(doc(db, 'userProgress', user.uid), {
      xpUnlockedRounds: updatedUnlocked,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, 'userStats', user.uid), {
      xpSpent: xpSpent + XP_UNLOCK_COST,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error('[Progress] unlockRoundWithXP write error:', e.message);
    throw new Error('Unlock failed. Please check your connection and try again.');
  }

  return { roundId, spent: XP_UNLOCK_COST, newBalance: balance - XP_UNLOCK_COST };
}

function _calcLevel(xp) {
  let level = 1, used = 0;
  while (true) {
    const needed = Math.ceil(100 * Math.pow(level, 1.5));
    if (used + needed > xp) break;
    used += needed; level++;
  }
  return level;
}

function _xpForLevel(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) total += Math.ceil(100 * Math.pow(i, 1.5));
  return total;
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export async function getLockState(uid) {
  const progress = await getUserProgress(uid);
  return computeLockState(progress);
}

export { PASS_THRESHOLD, XP_UNLOCK_COST };

export default {
  getUserProgress,
  submitRound,
  getLockState,
  getXpBalance,
  unlockRoundWithXP,
  PASS_THRESHOLD,
  XP_UNLOCK_COST
};
