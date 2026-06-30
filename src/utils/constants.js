export const TOTAL_QUESTIONS        = 15;
export const QUIZ_DURATION_SECS     = 3 * 60 + 30;
export const BATTLE_DURATION_SECS   = 2 * 60 + 50;
export const MAX_QUIZZES_PER_DAY    = 2;
export const QUESTION_COOLDOWN_DAYS = 7;
export const SESSION_MAX_AGE_HOURS  = 12;
export const POINTS_PER_CORRECT     = 10;
export const BONUS_PERFECT          = 100;
export const BONUS_ALL_ANSWERED     = 50;

export const WEEK_EPOCH  = new Date('2026-05-04T08:00:00Z');
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const LEADERBOARD_MAX_DISPLAY = 20;
export const LEADERBOARD_CACHE_TTL   = 60 * 1000;

export const REWARD_TIERS = [
  { threshold: 5000,  reward: '1GB Data',   label: '1GB'   },
  { threshold: 10000, reward: '2.5GB Data', label: '2.5GB' },
  { threshold: 20000, reward: '5GB Data',   label: '5GB'   }
];
export const WEEKLY_REWARDS = [
  { rank: 1, reward: '5,000 XP', xp: 5000, medal: '🥇' },
  { rank: 2, reward: '2,500 XP', xp: 2500, medal: '🥈' },
  { rank: 3, reward: '1,000 XP', xp: 1000, medal: '🥉' }
];

export const QUIZ_STATE_KEY     = 'sq_quiz_state_v4';
export const THEME_KEY          = 'sq_theme_pref';
export const LAST_SEEN_WEEK     = 'sq_last_week';
export const PENDING_BATTLE_KEY = 'sq_pending_battle';

export const COLLECTIONS = {
  USERS:              'users',
  USER_STATS:         'userStats',
  USER_DAILY:         'userDailyState',
  USER_ACHIEVEMENTS:  'userAchievements',
  QUIZ_SESSIONS:      'quizSessions',
  QUIZ_ATTEMPTS:      'quizAttempts',
  LEADERBOARD:        'leaderboardWeekly',
  REWARD_CLAIMS:      'rewardClaims',
  WEEKLY_WINNERS:     'weeklyWinners',
  QUESTIONS:          'questions',
  MATCHES:            'matches',
  // ── New collections ──
  PRESENCE:           'presence',           // online/offline heartbeat
  INCOMING_CHALLENGES:'incomingChallenges', // direct challenge inbox per user
};

export const FUNCTIONS = {
  CREATE_SESSION:             'createQuizSession',
  SUBMIT_SESSION:             'submitQuizSession',
  CLAIM_REWARD:               'processRewardClaim',
  ARCHIVE_WEEK:               'archiveWeeklyLeaderboard',
  // ── New functions ──
  COMPLETE_BATTLE:            'completeBattle',
  SEND_CHALLENGE_NOTIFICATION:'sendChallengeNotification'
};

// Presence: how long since lastSeen before we consider user offline
export const PRESENCE_ONLINE_THRESHOLD_MS = 90_000;  // 90 seconds
export const PRESENCE_HEARTBEAT_INTERVAL  = 60_000;  // write every 60 seconds

// Direct challenge: auto-expires after this many milliseconds if not accepted
export const DIRECT_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const CORRECT_EMOJIS = ['😊','😄','🎉','✨','🌟','👏','🙌','💯'];
export const WRONG_EMOJIS   = ['😢','😞','😔','💔','😟','😕','🤦','😿'];
export const LETTERS        = ['A','B','C','D'];
export const SCORE_PASS_THRESHOLD = 50;

export const PATH_PASS_THRESHOLD = 70;   // % required to pass a round
 
export const XP_PER_CORRECT_PATH = 10;
export const XP_ROUND_COMPLETE   = 50;
export const XP_LESSON_COMPLETE  = 100;
export const XP_UNIT_COMPLETE    = 200;
export const XP_SECTION_COMPLETE = 1000;
export const XP_PERFECT_ROUND    = 150;  // awarded INSTEAD OF XP_ROUND_COMPLETE on 100%
 
export const QUESTIONS_PER_ROUND = 7;
 
// Difficulty distribution per round (Blueprint Phase 0)
export const DIFFICULTY_DISTRIBUTION = {
  HARD: 2,
  VERY_HARD: 3,
  EXPERT: 2
};
 
// localStorage key for resuming an in-progress round (mirrors QUIZ_STATE_KEY pattern)
export const PATH_ROUND_STATE_KEY = 'sq_path_round_state_v1';
 
// Screen name constants for the new path screens (used by app.js showScreen())
export const PATH_SCREENS = {
  PATH:            'path',
  STUDY:           'study',
  ROUND:           'round',
  ROUND_RESULT:    'round-result',
  LESSON_COMPLETE: 'lesson-complete',
  UNIT_COMPLETE:   'unit-complete',
  SECTION_COMPLETE:'section-complete'
};
export const ONBOARDING_SEEN_KEY = 'sq_onboarding_seen_v1';

export const NOTIFICATION_GATE_SEEN_KEY = 'sq_notif_gate_seen_v1';
    
