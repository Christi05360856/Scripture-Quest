// ============================================
// SCRIPTUREQUEST V4 — Week Utility
// Single source of truth for all week logic.
// Prevents admin/user sync bugs.
// ============================================

import { WEEK_EPOCH, MS_PER_WEEK } from './constants.js';

/**
 * Central week calculator.
 * All week functions derive from this.
 */
export function getWeekInfo() {
  const now       = new Date();
  const diff      = now - WEEK_EPOCH;
  const weekIdx   = Math.floor(diff / MS_PER_WEEK);   // 0-indexed
  const weekNum   = weekIdx + 1;                        // 1-indexed for display

  const weekStart = new Date(WEEK_EPOCH.getTime() + weekIdx * MS_PER_WEEK);
  const weekEnd   = new Date(WEEK_EPOCH.getTime() + (weekIdx + 1) * MS_PER_WEEK - 1);
  const nextStart = new Date(WEEK_EPOCH.getTime() + (weekIdx + 1) * MS_PER_WEEK);

  return {
    currentWeekId:  `2026-W${weekNum}`,
    previousWeekId: weekNum > 1 ? `2026-W${weekNum - 1}` : null,
    weekNumber:     weekNum,
    weekStart:      weekStart.toISOString(),
    weekEnd:        weekEnd.toISOString(),
    nextWeekStart:  nextStart.toISOString()
  };
}

export const getCurrentWeekId  = () => getWeekInfo().currentWeekId;
export const getPreviousWeekId = () => getWeekInfo().previousWeekId;
export const getWeekStart      = () => getWeekInfo().weekStart;
export const getWeekEnd        = () => getWeekInfo().weekEnd;
export const getDisplayWeek    = () => getWeekInfo().weekNumber;
export const getNextWeekStart  = () => new Date(getWeekInfo().nextWeekStart);

export function getTimeUntilNextWeek() {
  const diff    = getNextWeekStart() - new Date();
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, totalMs: diff };
}

export function formatCountdown(ms) {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((ms % (1000 * 60)) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default { getWeekInfo, getCurrentWeekId, getPreviousWeekId, getDisplayWeek, getTimeUntilNextWeek, formatCountdown };
