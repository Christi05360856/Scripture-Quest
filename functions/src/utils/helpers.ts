// ============================================
// SCRIPTUREQUEST v4 — Cloud Functions Utils
// Shared helpers used across all functions.
// Server-side authority — no frontend copies.
// ============================================

import * as admin from 'firebase-admin';

// ── Week epoch (must match frontend constants.js) ──
const WEEK_EPOCH_MS = new Date('2026-05-04T08:00:00Z').getTime();
const MS_PER_WEEK   = 7 * 24 * 60 * 60 * 1000;

// ── Get current week ID ──
export function getCurrentWeekId(): string {
  const diff    = Date.now() - WEEK_EPOCH_MS;
  const weekNum = Math.floor(diff / MS_PER_WEEK) + 1;
  return `2026-W${weekNum}`;
}

// ── Get today's date string (UTC) ──
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // "2026-05-28"
}

// ── Get midnight boundaries for today (UTC) ──
export function getTodayBoundaries() {
  const now       = new Date();
  const startUTC  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endUTC    = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: admin.firestore.Timestamp.fromDate(startUTC),
    end:   admin.firestore.Timestamp.fromDate(endUTC)
  };
}

// ─────────────────────────────────────────
// XP CALCULATION (server-authoritative)
// ─────────────────────────────────────────

export interface XpResult {
  baseXp:       number;
  accuracyBonus: number;
  completionBonus: number;
  streakBonus:  number;
  totalXp:      number;
}

export function calculateXp(
  correctAnswers:  number,
  totalQuestions:  number,
  currentStreak:   number,
  allAnswered:     boolean
): XpResult {
  const percentage    = correctAnswers / totalQuestions;

  const baseXp        = correctAnswers * 10;
  const accuracyBonus = percentage >= 0.9 ? 90
                      : percentage >= 0.7 ? 40
                      : 0;
  const completionBonus = allAnswered ? 50 : 0;
  const streakBonus   = Math.min(70, currentStreak * 10);

  const totalXp = baseXp + accuracyBonus + completionBonus + streakBonus;

  return { baseXp, accuracyBonus, completionBonus, streakBonus, totalXp };
}

// ─────────────────────────────────────────
// LEVEL CALCULATION
// Formula: requiredXP = 100 × level^1.5
// ─────────────────────────────────────────

export interface LevelResult {
  newLevel:        number;
  currentLevelXp:  number;
  xpForNextLevel:  number;
  leveledUp:       boolean;
  oldLevel:        number;
}

export function calculateLevel(totalXp: number, oldLevel: number): LevelResult {
  let level = 1;
  let xpUsed = 0;

  // Walk up levels until we can't afford the next
  while (true) {
    const needed = Math.ceil(100 * Math.pow(level, 1.5));
    if (xpUsed + needed > totalXp) break;
    xpUsed += needed;
    level++;
  }

  const xpForThisLevel  = Math.ceil(100 * Math.pow(level, 1.5));
  const currentLevelXp  = totalXp - xpUsed;

  return {
    newLevel:       level,
    currentLevelXp,
    xpForNextLevel: xpForThisLevel,
    leveledUp:      level > oldLevel,
    oldLevel
  };
}

// ─────────────────────────────────────────
// STREAK CALCULATION
// ─────────────────────────────────────────

export interface StreakResult {
  newStreak:     number;
  longestStreak: number;
  streakBroken:  boolean;
}

export function calculateStreak(
  lastQuizDate:   string | null,
  currentStreak:  number,
  longestStreak:  number
): StreakResult {
  const today     = getTodayDateString();
  const yesterday = getYesterdayDateString();

  if (!lastQuizDate) {
    // First quiz ever
    return { newStreak: 1, longestStreak: Math.max(1, longestStreak), streakBroken: false };
  }

  if (lastQuizDate === today) {
    // Already completed today — streak unchanged
    return { newStreak: currentStreak, longestStreak, streakBroken: false };
  }

  if (lastQuizDate === yesterday) {
    // Consecutive day — increment streak
    const newStreak = currentStreak + 1;
    return {
      newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      streakBroken:  false
    };
  }

  // Missed a day — streak resets
  return { newStreak: 1, longestStreak, streakBroken: true };
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────
// SCORE CALCULATION (server-authoritative)
// ─────────────────────────────────────────

export interface ScoreResult {
  score:       number;
  percentage:  number;
  allAnswered: boolean;
  passed:      boolean;
}

export function calculateScore(
  userAnswers:    Record<string, number>,
  questions:      Array<{ correctAnswer: number }>,
  totalQuestions: number
): ScoreResult {
  let score = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const userAnswer    = userAnswers[i.toString()];
    const correctAnswer = questions[i]?.correctAnswer;

    if (userAnswer !== undefined && userAnswer === correctAnswer) {
      score++;
    }
  }

  const allAnswered = Object.keys(userAnswers).length >= totalQuestions;
  const percentage  = Math.round((score / totalQuestions) * 100);

  return { score, percentage, allAnswered, passed: percentage >= 50 };
}

// ─────────────────────────────────────────
// ANTI-CHEAT: Submission timing check
// Flag if quiz completed impossibly fast
// ─────────────────────────────────────────

export function isSuspiciousSubmission(
  sessionCreatedAt: admin.firestore.Timestamp,
  submittedAt:      Date,
  totalQuestions:   number
): boolean {
  const elapsed   = submittedAt.getTime() - sessionCreatedAt.toMillis();
  const minTime   = totalQuestions * 2 * 1000; // 2 seconds minimum per question
  return elapsed < minTime;
}

// ─────────────────────────────────────────
// FIRESTORE HELPER: safe batch write
// ─────────────────────────────────────────

export async function safeCommit(
  batch: admin.firestore.WriteBatch,
  context: string
): Promise<void> {
  try {
    await batch.commit();
  } catch (err: any) {
    console.error(`[${context}] Batch commit failed:`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────
// LOGGING
// ─────────────────────────────────────────

export function log(fn: string, message: string, data?: object): void {
  console.log(JSON.stringify({ fn, message, ...data, ts: new Date().toISOString() }));
}

export function logError(fn: string, message: string, err: unknown): void {
  console.error(JSON.stringify({ fn, message, error: String(err), ts: new Date().toISOString() }));
  }
