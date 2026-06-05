import * as admin from 'firebase-admin';
if (!admin.apps.length) { admin.initializeApp(); }

export { createQuizSession }           from './quiz/createSession';
export { submitQuizSession }           from './quiz/submitSession';
export { processRewardClaim }          from './rewards/processRewardClaim';
export { archiveWeeklyLeaderboard }    from './leaderboard/archiveWeeklyLeaderboard';
export { sendDailyReminders }          from './notifications/scheduler';

// ── Battle functions ──
export { sendChallengeNotification }   from './battle/sendChallengeNotification';
export { onMatchUpdate }               from './battle/onMatchUpdate';
