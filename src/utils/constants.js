// ============================================
// SCRIPTUREQUEST V4 — Constants
// Single source for all magic values.
// ============================================

// ── Quiz ──
export const TOTAL_QUESTIONS    = 15;
export const QUIZ_DURATION_SECS = 6 * 60;       // 6 minutes
export const MAX_QUIZZES_PER_DAY = 2;
export const QUESTION_COOLDOWN_DAYS = 7;
export const SESSION_MAX_AGE_HOURS  = 12;

// ── Scoring ──
export const POINTS_PER_CORRECT    = 10;
export const BONUS_PERFECT         = 100;
export const BONUS_ALL_ANSWERED    = 50;

// ── Week config ──
// Week epoch: Monday May 4, 2026 at 08:00 UTC (09:00 WAT)
export const WEEK_EPOCH   = new Date('2026-05-04T08:00:00Z');
export const MS_PER_WEEK  = 7 * 24 * 60 * 60 * 1000;

// ── Leaderboard ──
export const LEADERBOARD_MAX_DISPLAY = 20;
export const LEADERBOARD_CACHE_TTL   = 60 * 1000; // 1 minute

// ── Reward tiers ──
export const REWARD_TIERS = [
  { threshold: 5000,  reward: '1GB Data',   label: '1GB'  },
  { threshold: 10000, reward: '2.5GB Data', label: '2.5GB' },
  { threshold: 20000, reward: '5GB Data',   label: '5GB'  }
];

export const WEEKLY_REWARDS = [
  { rank: 1, reward: '2GB Data',   medal: '🥇' },
  { rank: 2, reward: '1GB Data',   medal: '🥈' },
  { rank: 3, reward: '500MB Data', medal: '🥉' }
];

// ── Storage keys ──
export const QUIZ_STATE_KEY   = 'sq_quiz_state_v4';
export const THEME_KEY        = 'sq_theme_pref';
export const LAST_SEEN_WEEK   = 'sq_last_week';

// ── Firestore collections ──
export const COLLECTIONS = {
  USERS:            'users',
  USER_STATS:       'userStats',
  USER_DAILY:       'userDailyState',
  USER_ACHIEVEMENTS:'userAchievements',
  QUIZ_SESSIONS:    'quizSessions',
  QUIZ_ATTEMPTS:    'quizAttempts',
  LEADERBOARD:      'leaderboardWeekly',
  REWARD_CLAIMS:    'rewardClaims',
  WEEKLY_WINNERS:   'weeklyWinners',
  QUESTIONS:        'questions'
};

// ── Cloud Function names ──
export const FUNCTIONS = {
  CREATE_SESSION:    'createQuizSession',
  SUBMIT_SESSION:    'submitQuizSession',
  CLAIM_REWARD:      'processRewardClaim',
  ARCHIVE_WEEK:      'archiveWeeklyLeaderboard'
};

// ── Quiz answer emojis ──
export const CORRECT_EMOJIS = ['😊','😄','🎉','✨','🌟','👏','🙌','💯'];
export const WRONG_EMOJIS   = ['😢','😞','😔','💔','😟','😕','🤦','😿'];

// ── Option letters ──
export const LETTERS = ['A', 'B', 'C', 'D'];

// ── Score thresholds ──
export const SCORE_PASS_THRESHOLD = 50; // percentage
