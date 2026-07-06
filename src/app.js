// ==================================================
// app.js — Bible Battle
// Clean rewrite: corrected auth flow + configurable rewards
// =================================================

import { initAuthListener, login, register,
         logout, updateProfile_,
         resetPassword, getAuthErrorMessage }   from './services/auth.service.js';
import { initTheme, setTheme, toggleTheme, getCurrentTheme } from './services/theme.service.js';
import { checkAndShowAnnouncements }            from './services/notification.service.js';
import { checkDailyLimit, loadQuizStateFromStorage,
         clearQuizStorage, createQuizSession,
         saveQuizStateToStorage, hasResumableQuiz } from './services/quiz.service.js';
import { createLocalQuizSession,
         submitLocalQuizSession }               from './services/localquiz.service.js';
import { fetchLeaderboard, subscribeLeaderboard,
         unsubscribeLeaderboard, renderLeaderboardRows,
         renderUserRank }                       from './services/leaderboard.service.js';
import { renderRewardTiers, renderRewardProgress,
         claimMilestoneReward, getSentMilestones } from './services/rewards.service.js';
import { setState, getState, getCurrentUser,
         getUserProfile, getUserStats, subscribe }  from './state/store.js';
import { showToast }                            from './utils/toast.js';
import { getCurrentWeekId, getDisplayWeek,
         getTimeUntilNextWeek, formatCountdown } from './utils/week.js';
import { LAST_SEEN_WEEK, SCORE_PASS_THRESHOLD,
         PENDING_BATTLE_KEY }                   from './utils/constants.js';
import { AVATARS, mountAvatar, renderAvatarSVG } from './components/avatar.js';

import { createChallenge, getChallengeByCode, acceptChallenge,
         listenToMatch, getMatchResult, sendRematch,
         generateWhatsAppLink, getChallengeCodeFromURL,
         getUserMatches, getMatchByCode,
         clearChallengeFromURL }                from './services/match.service.js';

import { saveAvatar, getAvatarId, getAvatarLabel } from './services/avatar.service.js';
import { shouldShowOnboarding, markOnboardingSeen,
         initOnboardingScreen, clearOnboardingSeen } from './pages/onboarding.page.js';
import { shouldShowNotificationGate, markNotificationGateSeen,
         initNotificationGateScreen }           from './pages/notification-gate.page.js';
import { startPresenceHeartbeat, stopPresenceHeartbeat,
         subscribeToPresenceList, unsubscribePresenceList,
         getPresenceDotHtml }                   from './services/presence.service.js';
import { sendDirectChallenge, listenForIncomingChallenges,
         stopIncomingChallengeListener, acceptDirectChallenge,
         rejectDirectChallenge, listenForChallengeResponse,
         stopOutgoingChallengeListener }        from './services/challenge.service.js';
// ============================================================
// GLOBAL ERROR CATCHER (temporary debug aid — mobile-safe)
// ============================================================
window.addEventListener('unhandledrejection', (e) => {
  alert('UNHANDLED ERROR: ' + (e.reason?.message || e.reason));
  console.error('[Unhandled Rejection]', e.reason);
});
window.addEventListener('error', (e) => {
  alert('SCRIPT ERROR: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')');
});

// ============================================================
// MODULE STATE
// ============================================================

let _localQuestions         = null;
let _quizPage               = null;
let _activeLocalSession     = null;
let _selectedAvatarId       = null;
let _pendingChallengeCode   = null;
let _currentChallenge       = null;
let _localQuestionsCache    = null;
let _activeChallengeMatchId = null;
let _matchUnsubscribe       = null;
let _lbCountdownTimer       = null;
let _limitTimer             = null;
let _appUrl                 = window.location.origin;
let _incomingChallenge      = null;
let _challengeTimerInterval = null;
let _outgoingChallengeId    = null;
let _battleHistoryCache     = [];

// V5: Path / round / study page lazy loaders
let _pathPage               = null;
let _studyPage              = null;
let _roundPage              = null;
let _roundResultPage        = null;
let _currentRoundId         = null;
let _dailyLimitTimer        = null;

// ============================================================
// REWARDS CONFIG
// Reads from Firestore /config/rewards once per session.
// Falls back to { enabled: false } so the app never breaks
// if the document doesn't exist yet.
// ============================================================

let _rewardsConfig = { enabled: false, mode: 'badges_only', currentPrize: null, eventName: null };
let _rewardsConfigLoaded = false;

async function getRewardsConfig() {
  if (_rewardsConfigLoaded) return _rewardsConfig;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db }          = await import('./firebase/config.js');
    const snap = await getDoc(doc(db, 'config', 'rewards'));
    if (snap.exists()) _rewardsConfig = { ..._rewardsConfig, ...snap.data() };
  } catch (e) {
    console.warn('[Rewards] Could not load config, using defaults:', e.message);
  }
  _rewardsConfigLoaded = true;
  return _rewardsConfig;
}

// ============================================================
// LAZY LOADERS
// ============================================================

async function getLocalQuestions() {
  if (_localQuestions) return _localQuestions;
  try {
    const mod = await import('/src/questions.js');
    if (mod?.questions?.length) {
      _localQuestions = mod.questions;
      console.log('[Quiz] Loaded', _localQuestions.length, 'questions');
      return _localQuestions;
    }
  } catch (e) { console.warn('[Quiz] questions.js not found:', e.message); }
  _localQuestions = [];
  return _localQuestions;
}

async function getQuizPage()       { if (!_quizPage)       _quizPage       = await import('./pages/quiz.page.js');         return _quizPage; }
async function getPathPage()       { if (!_pathPage)       _pathPage       = await import('./pages/path.page.js');         return _pathPage; }
async function getStudyPage() {
  if (!_studyPage) {
    try { _studyPage = await import('./pages/study.page.js'); }
    catch (e) { alert('Failed to load study page: ' + e.message); throw e; }
  }
  return _studyPage;
}
async function getRoundPage() {
  if (!_roundPage) {
    try { _roundPage = await import('./pages/round.page.js'); }
    catch (e) { alert('Failed to load round page: ' + e.message); throw e; }
  }
  return _roundPage;
}
async function getRoundResultPage(){ if (!_roundResultPage)_roundResultPage= await import('./pages/round-result.page.js'); return _roundResultPage; }

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

const SCREENS = [
  'loading','landing','onboarding-intro','notification-gate',
  'path','quiz','result','leaderboard','rewards','profile','settings',
  'battle','battle-result','challenge','battle-history-detail',
  'study','round','round-result',
  'lesson-complete','unit-complete','section-complete'
];

function showScreen(name) {
  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('hidden', id !== name);
  });

  const nav   = document.getElementById('bottom-nav');
  const noNav = ['loading','onboarding-intro','notification-gate','quiz','result','round',
                 'study','battle','battle-result','challenge','battle-history-detail'];
  if (nav) nav.classList.toggle('hidden', noNav.includes(name));

  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.screen === name)
  );

  setState('nav', { current: name });

  const FAB_SCREENS = ['path','leaderboard'];
  setBattleFabVisible(FAB_SCREENS.includes(name));
  setDailyFabVisible(name === 'path');

  if (name === 'path')        { initPathScreen(); _maybeShowInstallPrompt(); }
  if (name === 'leaderboard') initLeaderboardScreen();
  if (name === 'rewards')     initRewardsScreen();
  if (name === 'profile')     initProfileScreen();
  if (name === 'landing')     initLandingScreen();
  if (name === 'settings')    initSettingsScreen();
  if (name === 'challenge')   initChallengeScreen();
}

// ============================================================
// FAB HELPERS
// ============================================================

function setBattleFabVisible(visible) {
  const fab = document.getElementById('battle-fab');
  if (!fab) return;
  fab.classList.toggle('hidden', !(visible && !!getCurrentUser()));
}

function setDailyFabVisible(visible) {
  const fab = document.getElementById('daily-challenge-fab');
  if (!fab) return;
  fab.classList.toggle('hidden', !(visible && !!getCurrentUser()));
}

// ============================================================
// AUTH ROUTING
// ─────────────────────────────────────────────────────────────
// CORRECT SEQUENCE (authenticated user):
//   1. Notification Gate  (once per lifetime)
//   2. Onboarding         (once per lifetime)
//   3. Path / Challenge
//
// UNAUTHENTICATED visitor:
//   → Path screen with auth-prompt overlay visible.
//     Onboarding is NEVER shown before registration.
//     After login/register the sequence above runs via
//     the auth state listener firing again.
// ============================================================

// Step 3 — final destination
function _routeToApp() {
  // Check if a challenge code was stored during sign-in
  const urlCode     = getChallengeCodeFromURL();
  const storedCode  = localStorage.getItem('sq_pending_challenge');
  const code        = urlCode || storedCode;

  if (code) {
    _pendingChallengeCode = code;
    if (urlCode)    clearChallengeFromURL();
    if (storedCode) localStorage.removeItem('sq_pending_challenge');
    showScreen('path');
    setTimeout(() => showChallengeAcceptModal(code), 800);
  } else {
    showScreen('path');
  }
}

// Step 2 — onboarding (once per lifetime, AFTER login)
function _routeAfterNotificationGate() {
  if (shouldShowOnboarding()) {
    showScreen('onboarding-intro');
    initOnboardingScreen(() => {
      markOnboardingSeen();
      _routeToApp();
    });
    return;
  }
  _routeToApp();
}

// Step 1 — notification gate (once per lifetime, AFTER login)
function _routeAfterAuth() {
  if (shouldShowNotificationGate()) {
    showScreen('notification-gate');
    initNotificationGateScreen(() => {
      _routeAfterNotificationGate();
    });
    return;
  }
  _routeAfterNotificationGate();
}

// ============================================================
// AUTH LISTENER
// ============================================================

initAuthListener(

  // ── SIGNED IN ──────────────────────────────────────────
  async (user, profile, stats) => {
    await initTheme(profile);
    checkNewWeek();
    checkAndShowAnnouncements().catch(e => console.warn('[Announce]', e.message));

    startPresenceHeartbeat();

    _clearStaleIncomingChallenge(user.uid).then(() => {
      listenForIncomingChallenges(user.uid, _handleIncomingChallengeSafely);
    });

    _checkPendingBattleResult(user).catch(e => console.warn('[PendingBattle]', e.message));
    _checkWeeklyWinNotification(user).catch(e => console.warn('[WeeklyWin]', e.message));
           
    // ── Route: Notification Gate → Onboarding → Path ──
    _routeAfterAuth();
  },

  // ── SIGNED OUT ─────────────────────────────────────────
  () => {
    initTheme(null);
    setBattleFabVisible(false);
    setDailyFabVisible(false);
    stopPresenceHeartbeat();
    stopIncomingChallengeListener();
    stopOutgoingChallengeListener();

    // Preserve any challenge code from URL so it survives the login flow
    const urlCode = getChallengeCodeFromURL();
    if (urlCode) {
      localStorage.setItem('sq_pending_challenge', urlCode);
      clearChallengeFromURL();
    }

    // Show path screen with the auth-prompt overlay.
    // Onboarding is intentionally NOT shown before registration.
    showScreen('path');

    // Make sure the auth prompt is visible and content is hidden
    document.getElementById('auth-section')?.classList.remove('hidden');
    document.getElementById('welcome-section')?.classList.add('hidden');
    document.getElementById('path-auth-prompt')?.classList.remove('hidden');
    document.getElementById('path-content')?.classList.add('hidden');
    document.getElementById('path-skeleton')?.classList.add('hidden');
    document.getElementById('bottom-nav')?.classList.add('hidden');

    // If they came via a challenge link, prompt them to sign in
    if (urlCode) {
      setTimeout(() => {
        showToast('Sign in or register to accept the challenge! ⚔️', 'info', 5000);
        openAuthModal();
      }, 600);
    }
  }
);

// ============================================================
// STALE CHALLENGE CLEAR
// ============================================================

async function _clearStaleIncomingChallenge(uid) {
  try {
    const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');
    const ref    = doc(db, 'incomingChallenges', uid);
    const snap   = await getDoc(ref);
    if (!snap.exists()) return;
    const data      = snap.data();
    const expiresAt = data.expiresAt?.toMillis?.() || 0;
    if (expiresAt < Date.now() || data.status !== 'pending') {
      await deleteDoc(ref).catch(() => {});
    }
  } catch (e) { console.warn('[App] Could not check stale challenge:', e.message); }
}

// ============================================================
// INCOMING CHALLENGE SAFETY GUARD
// ============================================================

function _handleIncomingChallengeSafely(challenge) {
  const now      = Date.now();
  const AGE_LIMIT = 4.5 * 60 * 1000;
  if (challenge.expiresAt && challenge.expiresAt < now) return;
  if (challenge.expiresAt && (challenge.expiresAt - now) < (300000 - AGE_LIMIT)) return;
  showIncomingChallengeModal(challenge);
}

// ============================================================
// PATH SCREEN
// ============================================================

async function initPathScreen() {
  const user    = getCurrentUser();
  const profile = getUserProfile();

  const avatarEl = document.getElementById('path-header-avatar');
  if (avatarEl && profile) {
    const { mountAvatar } = await import('./components/avatar.js');
    const { getAvatarId } = await import('./services/avatar.service.js');
    mountAvatar(getAvatarId(profile), avatarEl);
  }

  const xpEl = document.getElementById('path-xp-value');
  if (xpEl) {
    if (user) {
      try {
        const { getUserProgress } = await import('./services/progress.service.js');
        const progress = await getUserProgress(user.uid);
        xpEl.textContent = (progress.totalPathXp || 0).toLocaleString();
      } catch (e) { xpEl.textContent = '0'; }
    } else {
      xpEl.textContent = '0';
    }
  }

  const pp = await getPathPage();
  pp.initPathPage({ user, onRoundStart: handleRoundStart });
}

async function handleRoundStart(roundId) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  _currentRoundId = roundId;
  try {
    const sp = await getStudyPage();
    showScreen('study');
    sp.initStudyScreen(roundId, { onBeginRound: handleBeginRound, onBack: () => showScreen('path') });
  } catch (e) {
    alert('handleRoundStart failed: ' + e.message);
    showScreen('path');
  }
}

async function handleBeginRound(roundId) {
  _currentRoundId = roundId;
  const rp = await getRoundPage();
  showScreen('round');
  rp.initRoundScreen(roundId, { onComplete: handleRoundComplete, onQuit: handleRoundQuit });
}

async function handleRoundComplete(result) {
  const rrp = await getRoundResultPage();
  showScreen('round-result');
  rrp.initRoundResultScreen(result, {
    onNextRound:       async (nextRoundId) => { await handleRoundStart(nextRoundId); },
    onStudyAgain:      async (roundId)     => { await handleRoundStart(roundId); },
    onRetry:           async (roundId)     => { await handleBeginRound(roundId); },
    onBackToPath:      () => showScreen('path'),
    onLessonComplete:  (data) => { showScreen('lesson-complete');  initLessonCompleteScreen(data); },
    onUnitComplete:    (data) => { showScreen('unit-complete');    initUnitCompleteScreen(data); },
    onSectionComplete: (data) => { showScreen('section-complete'); initSectionCompleteScreen(data); }
  });
}

function handleRoundQuit() {
  _currentRoundId = null;
  showScreen('path');
}

function initLessonCompleteScreen(data) {
  const el = id => document.getElementById(id);
  if (el('lesson-complete-title')) el('lesson-complete-title').textContent = 'Lesson Complete!';
  if (el('lesson-complete-sub'))   el('lesson-complete-sub').textContent   = data.passageRef || '';
  if (el('lesson-complete-xp'))    el('lesson-complete-xp').textContent    = `+${data.xp || 100} XP`;
  if (el('lesson-complete-body'))  el('lesson-complete-body').textContent  = `You've mastered ${data.lessonTitle || 'this lesson'}. Keep going!`;
  _wireCompletionButtons('lesson-next-btn', 'lesson-back-path-btn', data);
}

function initUnitCompleteScreen(data) {
  const el = id => document.getElementById(id);
  if (el('unit-complete-title')) el('unit-complete-title').textContent = 'Book Complete!';
  if (el('unit-complete-book'))  el('unit-complete-book').textContent  = data.bookTitle || '';
  if (el('unit-complete-xp'))    el('unit-complete-xp').textContent    = `+${data.xp || 200} XP`;
  if (el('unit-complete-body'))  el('unit-complete-body').textContent  = `You've completed every lesson in ${data.bookTitle || 'this book'}. Outstanding work!`;
  _wireCompletionButtons('unit-next-btn', 'unit-back-path-btn', data);
}

function initSectionCompleteScreen(data) {
  const el = id => document.getElementById(id);
  if (el('section-complete-title')) el('section-complete-title').textContent = 'Section Complete!';
  if (el('section-complete-name'))  el('section-complete-name').textContent  = data.sectionTitle || '';
  if (el('section-complete-xp'))    el('section-complete-xp').textContent    = `+${data.xp || 1000} XP`;
  if (el('section-complete-body'))  el('section-complete-body').textContent  = 'You\'ve mastered an entire division of the Bible. This is serious achievement.';
  if (el('section-cert-name'))      el('section-cert-name').textContent      = data.sectionTitle || '';
  _wireCompletionButtons('section-next-btn', 'section-back-path-btn', data);
}

function _wireCompletionButtons(nextId, backId, data) {
  const nextBtn = document.getElementById(nextId);
  const backBtn = document.getElementById(backId);
  if (nextBtn) {
    const n = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(n, nextBtn);
    n.addEventListener('click', async () => {
      if (data.nextRoundId) await handleRoundStart(data.nextRoundId);
      else                  showScreen('path');
    });
  }
  if (backBtn) {
    const b = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(b, backBtn);
    b.addEventListener('click', () => showScreen('path'));
  }
}

// ============================================================
// DAILY CHALLENGE MODAL
// ============================================================

async function openDailyChallenge() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  // ── Step 1: Fill in stats from memory (instant — no network call) ──
  const stats = getUserStats();
  const streakEl = document.getElementById('daily-modal-streak');
  if (streakEl) {
    const s = stats?.currentStreak || 0;
    streakEl.textContent = s > 0 ? `🔥 ${s}-day streak` : '🌱 No streak yet';
  }
  const ptsEl = document.getElementById('daily-modal-weekly-pts');
  if (ptsEl) ptsEl.textContent = `${(stats?.weeklyPoints || 0).toLocaleString()} pts this week`;

  const res = document.getElementById('daily-modal-resume');
  if (res) res.classList.toggle('hidden', !hasResumableQuiz());

  // ── Step 2: Show modal IMMEDIATELY — don't wait for the limit check ──
  document.getElementById('daily-challenge-modal')?.classList.remove('hidden');

  // ── Step 3: Show a loading state inside the modal while limit check runs ──
  const avail   = document.getElementById('daily-modal-available');
  const lim     = document.getElementById('daily-modal-limit');
  const startBtn = document.getElementById('daily-modal-start-btn');
  avail?.classList.add('hidden');
  lim?.classList.add('hidden');
  if (startBtn) { startBtn.disabled = true; startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking…'; }

  // ── Step 4: Run the Firestore check in the background ──
  try {
    const limit = await checkDailyLimit();

    if (limit.blocked) {
      avail?.classList.add('hidden');
      lim?.classList.remove('hidden');
      _startDailyModalCountdown(limit.nextQuizTime);
    } else {
      avail?.classList.remove('hidden');
      lim?.classList.add('hidden');
      const note = document.getElementById('daily-modal-attempts-note');
      if (note) note.textContent = limit.remaining === 2
        ? '2 attempts remaining today' : '1 attempt remaining today';
      if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
    }
  } catch (e) {
    // If the check fails just let them try — quiz will handle it
    avail?.classList.remove('hidden');
    lim?.classList.add('hidden');
    if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
  }
}

function closeDailyModal() {
  document.getElementById('daily-challenge-modal')?.classList.add('hidden');
  if (_dailyLimitTimer) { clearInterval(_dailyLimitTimer); _dailyLimitTimer = null; }
}

function _startDailyModalCountdown(nextTime) {
  const el = document.getElementById('daily-modal-countdown');
  if (!el) return;
  if (_dailyLimitTimer) clearInterval(_dailyLimitTimer);
  function update() {
    const diff = nextTime - Date.now();
    if (diff <= 0) { clearInterval(_dailyLimitTimer); openDailyChallenge(); return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  update();
  _dailyLimitTimer = setInterval(update, 1000);
}

// ============================================================
// LANDING SCREEN
// ============================================================

async function initLandingScreen() {
  const user    = getCurrentUser();
  const profile = getUserProfile();
  const stats   = getUserStats();

  const authSection    = document.getElementById('auth-section');
  const welcomeSection = document.getElementById('welcome-section');

  if (!user) {
    authSection?.classList.remove('hidden');
    welcomeSection?.classList.add('hidden');
    document.getElementById('bottom-nav')?.classList.add('hidden');
    setBattleFabVisible(false);
    return;
  }

  authSection?.classList.add('hidden');
  welcomeSection?.classList.remove('hidden');
  document.getElementById('bottom-nav')?.classList.remove('hidden');
  setBattleFabVisible(true);

  const firstName = (profile?.displayName || user.displayName || 'Friend').split(' ')[0];
  const el        = id => document.getElementById(id);

  if (el('welcome-name'))   el('welcome-name').textContent   = firstName;
  if (el('welcome-sub'))    el('welcome-sub').textContent    = getMotivationalSub(stats);
  if (el('welcome-streak')) {
    const streak = stats?.currentStreak || 0;
    el('welcome-streak').textContent = streak > 0
      ? `🔥 ${streak}-day streak! Keep it going!` : '🌱 Start your streak today!';
  }

  if (!profile?.profileComplete && !profile?.phoneNumber) {
    el('profile-incomplete-warn')?.classList.remove('hidden');
  } else {
    el('profile-incomplete-warn')?.classList.add('hidden');
  }

  el('resume-section')?.classList.toggle('hidden', !hasResumableQuiz());

  const limit = await checkDailyLimit();
  if (limit.blocked) {
    el('quiz-available')?.classList.add('hidden');
    el('quiz-limit-reached')?.classList.remove('hidden');
    startLimitCountdown(limit.nextQuizTime);
  } else {
    el('quiz-available')?.classList.remove('hidden');
    el('quiz-limit-reached')?.classList.add('hidden');
    const badge = el('attempts-badge');
    if (badge) badge.textContent = limit.remaining === 2
      ? '2 quizzes available today' : '1 quiz remaining today';
  }
}

function getMotivationalSub(stats) {
  if (!stats) return "Ready for today's challenge?";
  const total = stats.quizzesTaken || 0;
  if (total === 0) return 'Take your first quiz and get on the leaderboard!';
  if (total < 5)   return `${total} quizzes taken — keep going!`;
  return `${total} quizzes completed — you're on fire!`;
}

function startLimitCountdown(nextTime) {
  const el = document.getElementById('limit-countdown');
  if (!el) return;
  if (_limitTimer) clearInterval(_limitTimer);
  function update() {
    const diff = nextTime - Date.now();
    if (diff <= 0) { clearInterval(_limitTimer); initLandingScreen(); return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  update();
  _limitTimer = setInterval(update, 1000);
}

// ============================================================
// NEW WEEK CHECK
// ============================================================

function checkNewWeek() {
  const currentWeekId = getCurrentWeekId();
  const lastSeen      = localStorage.getItem(LAST_SEEN_WEEK);
  if (lastSeen && lastSeen !== currentWeekId) {
    const banner = document.getElementById('new-week-banner');
    const text   = document.getElementById('new-week-text');
    if (banner) {
      if (text) text.textContent = `Week ${getDisplayWeek()} has started — leaderboard reset! 🎉`;
      banner.classList.remove('hidden');
    }
  }
  localStorage.setItem(LAST_SEEN_WEEK, currentWeekId);
}

// ============================================================
// PENDING BATTLE RESULT
// ============================================================

async function _checkPendingBattleResult(user) {
  try {
    const pendingMatchId = localStorage.getItem(PENDING_BATTLE_KEY);
    if (!pendingMatchId) return;
    const match = await getMatchResult(pendingMatchId);
    if (!match) { localStorage.removeItem(PENDING_BATTLE_KEY); return; }
    if (match.status === 'completed') {
      localStorage.removeItem(PENDING_BATTLE_KEY);
      showToast('⚔️ Your battle result is ready!', 'success', 3000);
      setTimeout(() => { showScreen('battle-result'); renderBattleResult(match); }, 1000);
      return;
    }
    if (match.status === 'active') {
      showToast('Still waiting for your opponent to finish the battle…', 'info', 4000);
      const unsub = listenToMatch(pendingMatchId, completedMatch => {
        if (completedMatch.status === 'completed') {
          unsub();
          localStorage.removeItem(PENDING_BATTLE_KEY);
          showToast('⚔️ Battle result is in!', 'success', 3000);
          setTimeout(() => { showScreen('battle-result'); renderBattleResult(completedMatch); }, 500);
        }
      });
    } else {
      localStorage.removeItem(PENDING_BATTLE_KEY);
    }
  } catch (e) { console.warn('[App] Pending battle check failed:', e.message); }
}

// ============================================================
// WEEKLY WIN NOTIFICATION
// Checks for unseen weekly leaderboard wins (top 3 finishes)
// queued by the archiveWeeklyLeaderboard Cloud Function, and
// shows a celebratory toast for each one found, then marks
// them seen so they never show twice.
// ============================================================

async function _checkWeeklyWinNotification(user) {
  try {
    const { collection, query, where, limit, getDocs, doc, updateDoc }
      = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');

    const q = query(
      collection(db, 'pendingNotifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'weekly_win'),
      where('seen', '==', false),
      limit(3) // in case they missed more than one week
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    let delay = 800;
    snap.forEach(docSnap => {
      const data = docSnap.data();
      setTimeout(() => {
        showToast(data.message, 'success', 6000);
      }, delay);
      delay += 1200;

      updateDoc(doc(db, 'pendingNotifications', docSnap.id), { seen: true })
        .catch(e => console.warn('[WeeklyWin] Could not mark seen:', e.message));
    });
  } catch (e) {
    console.warn('[WeeklyWin] Check failed:', e.message);
  }
}

// ============================================================
// LEADERBOARD SCREEN
// ============================================================

async function initLeaderboardScreen() {
  const weekNumber = document.getElementById('lb-week-number');
  if (weekNumber) weekNumber.textContent = getDisplayWeek();

  if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
  const countdownEl = document.getElementById('lb-countdown');
  if (countdownEl) {
    const tick = () => {
      const { totalMs } = getTimeUntilNextWeek();
      countdownEl.textContent = formatCountdown(totalMs);
    };
    tick();
    _lbCountdownTimer = setInterval(tick, 1000);
  }

  document.getElementById('lb-skeleton')?.classList.remove('hidden');
  document.getElementById('lb-entries')?.classList.add('hidden');

  const currentUserId = getCurrentUser()?.uid;

  subscribeLeaderboard(entries => {
    document.getElementById('lb-skeleton')?.classList.add('hidden');
    document.getElementById('lb-entries')?.classList.remove('hidden');

    renderLeaderboardRowsWithChallenge(
      entries,
      document.getElementById('lb-entries'),
      currentUserId
    );
    renderUserRank(entries, document.getElementById('lb-my-rank'), currentUserId);

    const count = document.getElementById('lb-entry-count');
    if (count) count.textContent =
      `${entries.length} competitor${entries.length !== 1 ? 's' : ''} this week`;

    const uids = entries.map(e => e.uid || e.userId).filter(Boolean);
    unsubscribePresenceList();
    subscribeToPresenceList(uids, presenceMap => {
      _patchLeaderboardRowsWithPresence(entries, presenceMap, currentUserId);
    });
  });
}

function renderLeaderboardRowsWithChallenge(entries, container, currentUserId) {
  if (!container) return;
  if (!entries || entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">📖</div>
        <p>No scores yet this week.</p>
        <p style="margin-top:4px;font-size:13px">Be the first to take the quiz!</p>
      </div>`;
    return;
  }

  container.innerHTML = entries.slice(0, 20).map((entry, i) => {
    const rank   = i + 1;
    const uid    = entry.uid || entry.userId;
    const isSelf = uid === currentUserId;
    const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

    // Prize badge only shown when rewards are enabled
    const prizeHTML = (rank <= 3 && _rewardsConfig.enabled)
      ? `<span class="badge badge-reward" style="font-size:10px;padding:2px 8px">🏆 Prize</span>`
      : '';

    const streakHTML = entry.streak
      ? `<span style="font-size:12px;color:var(--accent-warm);font-weight:700">🔥${entry.streak}</span>` : '';
    const safeName   = (entry.displayName || 'Anonymous').replace(/'/g, "\\'");

    return `
      <div class="lb-row ${isSelf ? 'lb-row--me' : ''}" data-lb-uid="${uid}" data-rank="${rank}">
        <div class="lb-rank">${medal}</div>
        <div class="lb-name">
          <span>${escapeHTML(entry.displayName || entry.name || 'Anonymous')}</span>
          ${prizeHTML}${streakHTML}
          <span class="lb-presence-slot"></span>
        </div>
        <div class="lb-points">${(entry.points || entry.weeklyPoints || 0).toLocaleString()}
          <span class="lb-pts-label">pts</span>
        </div>
        ${!isSelf
          ? `<button class="lb-challenge-btn" disabled
               title="Checking online status…"
               onclick="window.SQ&&SQ.directChallenge&&SQ.directChallenge('${uid}','${safeName}')">⚔️</button>`
          : '<div style="width:36px"></div>'
        }
      </div>`;
  }).join('');

  container.querySelectorAll('.lb-row').forEach((row, i) => {
    row.style.animationDelay = `${i * 40}ms`;
    row.classList.add('lb-row--animate');
  });
}

function _patchLeaderboardRowsWithPresence(entries, presenceMap, currentUserId) {
  entries.forEach(entry => {
    const uid = entry.uid || entry.userId;
    if (uid === currentUserId) return;
    const row = document.querySelector(`[data-lb-uid="${uid}"]`);
    if (!row) return;
    const isOnline = presenceMap[uid] === true;
    const dotSlot  = row.querySelector('.lb-presence-slot');
    if (dotSlot) dotSlot.innerHTML = getPresenceDotHtml(isOnline);
    const btn = row.querySelector('.lb-challenge-btn');
    if (btn) {
      btn.disabled      = !isOnline;
      btn.title         = isOnline
        ? `Challenge ${entry.displayName || 'Opponent'} — Online now!`
        : `${entry.displayName || 'Opponent'} is offline`;
      btn.style.opacity = isOnline ? '1' : '0.4';
    }
  });
}

// ============================================================
// REWARDS SCREEN
// Respects rewardsConfig.enabled — shows different UI when off
// ============================================================

async function initRewardsScreen() {
  const user  = getCurrentUser();
  const stats = getUserStats();
  if (!user || !stats) return;

  const config = await getRewardsConfig();
  const points = stats.totalXp || 0;

  // Get container references
  const activeView   = document.getElementById('rewards-active-view');
  const inactiveView = document.getElementById('rewards-inactive-view');

  if (!config.enabled) {
    // ── REWARDS DISABLED: Show full "Coming Soon" screen ──
    if (activeView)   activeView.classList.add('hidden');
    if (inactiveView) inactiveView.classList.remove('hidden');

    // Event name or default
    const eventName = config.eventName || 'Special Event';
    const eventEl = document.getElementById('ri-event-name');
    if (eventEl) eventEl.textContent = eventName;

    // Prize display
    const prizeEl = document.getElementById('ri-prize-display');
    if (prizeEl) {
      prizeEl.textContent = config.currentPrize || 'Amazing prizes';
    }

    // Status message
    const statusEl = document.getElementById('ri-status-message');
    if (statusEl) {
      statusEl.textContent = config.currentPrize
        ? `Prizes will be unlocked soon! Keep earning XP and badges — you'll be ready when ${eventName} begins.`
        : `Cash prizes are currently disabled. Keep building your XP, streaks, and badges. Rewards will return for special events!`;
    }

    // Still show their current points (for motivation)
    const ptsEl = document.getElementById('ri-user-points');
    if (ptsEl) ptsEl.textContent = points.toLocaleString();

    return;
  }

  // ── REWARDS ENABLED: Show full milestone system ──
  if (activeView)   activeView.classList.remove('hidden');
  if (inactiveView) inactiveView.classList.add('hidden');

  const ptEl = document.getElementById('rewards-points');
  if (ptEl) ptEl.textContent = points.toLocaleString();

  renderRewardProgress(
    document.getElementById('rewards-progress-fill'),
    document.getElementById('rewards-next-milestone'),
    points
  );

  // Show active season banner
  const bannerEl = document.getElementById('rewards-season-banner');
  if (bannerEl) {
    bannerEl.textContent = config.eventName
      ? `🏆 ${config.eventName} — prizes are active!`
      : '🏆 Cash prizes are currently enabled. Claim your rewards!';
    bannerEl.classList.remove('hidden');
  }

  // Claim buttons active
  const sent = await getSentMilestones(user.uid);
  renderRewardTiers(
    document.getElementById('reward-tiers-container'),
    points, [], sent,
    async (threshold, rewardType) => {
      try {
        await claimMilestoneReward(threshold, rewardType);
        showToast("Reward claimed! We'll be in touch. 🎉", 'success');
        initRewardsScreen();
      } catch (err) { showToast(err.message, 'error'); }
    }
  );
}

// ============================================================
// PROFILE SCREEN
// ============================================================

function initProfileScreen() {
  const user    = getCurrentUser();
  const profile = getUserProfile();
  const stats   = getUserStats();
  if (!user) return;

  const el   = id => document.getElementById(id);
  const name = profile?.displayName || user.displayName || 'User';

  const avatarId = getAvatarId(profile);
  _selectedAvatarId = avatarId;
  mountAvatar(avatarId, el('profile-avatar'));
  if (el('profile-name'))  el('profile-name').textContent  = name;
  if (el('profile-email')) el('profile-email').textContent = user.email || '';
  if (el('profile-role'))  el('profile-role').textContent  = profile?.role || 'User';

  if (profile?.createdAt?.toDate && el('profile-joined')) {
    const d = profile.createdAt.toDate();
    el('profile-joined').textContent =
      `Joined ${d.toLocaleDateString('en-GB', { month:'long', year:'numeric' })}`;
  }

  const contactSection = el('contact-edit-section');
  const contactDisplay = el('contact-display-section');
  if (profile?.profileComplete && profile?.phoneNumber) {
    contactSection?.classList.add('hidden');
    contactDisplay?.classList.remove('hidden');
    if (el('display-phone'))   el('display-phone').textContent   = profile.phoneNumber;
    if (el('display-network')) el('display-network').textContent = profile.networkProvider || '';
  } else {
    contactSection?.classList.remove('hidden');
    contactDisplay?.classList.add('hidden');
    if (el('profile-phone'))   el('profile-phone').value   = profile?.phoneNumber   || '';
    if (el('profile-network')) el('profile-network').value = profile?.networkProvider || '';
  }

  const safeStats = stats || {};
  const xp     = safeStats.totalXp || 0;
  const level  = Math.floor(xp / 1000) + 1;
  const needed = level * 1000;
  const current = xp - ((level - 1) * 1000);
  const pct    = Math.min(100, Math.round((current / 1000) * 100));

  if (el('p-quizzes'))     el('p-quizzes').textContent     = safeStats.quizzesTaken    || 0;
  if (el('p-streak'))      el('p-streak').textContent      = safeStats.currentStreak   || 0;
  if (el('p-best-streak')) el('p-best-streak').textContent = safeStats.longestStreak   || 0;
  if (el('p-perfect'))     el('p-perfect').textContent     = safeStats.perfectScores   || 0;
  if (el('p-weekly-pts'))  el('p-weekly-pts').textContent  = (safeStats.weeklyPoints||0).toLocaleString();
  if (el('p-total-xp'))    el('p-total-xp').textContent    = xp.toLocaleString();
  if (el('p-lvl-current')) el('p-lvl-current').textContent = level;
  if (el('p-xp-current'))  el('p-xp-current').textContent  = current.toLocaleString();
  if (el('p-xp-needed'))   el('p-xp-needed').textContent   = needed.toLocaleString();
  if (el('p-xp-fill'))     el('p-xp-fill').style.width     = `${pct}%`;
  if (el('p-lvl-next'))    el('p-lvl-next').textContent    = level + 1;
  if (el('p-xp-needed-2')) el('p-xp-needed-2').textContent = needed.toLocaleString();

  renderAchievements(safeStats);

  const currentTheme = getState('theme')?.current || 'light';
  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.classList.toggle('btn-primary',   btn.dataset.theme === currentTheme);
    btn.classList.toggle('btn-secondary', btn.dataset.theme !== currentTheme);
  });
}

function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('profile-tab-stats')?.classList.toggle('hidden',        tab !== 'stats');
  document.getElementById('profile-tab-achievements')?.classList.toggle('hidden', tab !== 'achievements');
}

function renderAchievements(stats) {
  const container = document.getElementById('achievements-grid');
  if (!container) return;

  const quizzes = stats.quizzesTaken    || 0;
  const streak  = stats.longestStreak   || 0;
  const xp      = stats.totalXp         || 0;
  const perfect = stats.perfectScores   || 0;
  const top3    = stats.topThreeFinishes || 0;

  const BADGES = [
    { id:'first_quiz', icon:'📖', tier:'bronze',    crown:'🥉', name:'First Steps',      req:'Complete your first quiz',  done:quizzes>=1,   progress:Math.min(100,(quizzes/1)*100) },
    { id:'streak3',    icon:'🔥', tier:'bronze',    crown:'🥉', name:'On Fire',           req:'3-day streak',              done:streak>=3,    progress:Math.min(100,(streak/3)*100) },
    { id:'perfect1',   icon:'💯', tier:'bronze',    crown:'🥉', name:'Perfectionist',     req:'Score 100% once',           done:perfect>=1,   progress:Math.min(100,(perfect/1)*100) },
    { id:'xp500',      icon:'⭐', tier:'bronze',    crown:'🥉', name:'XP Rising',         req:'Earn 500 XP',               done:xp>=500,      progress:Math.min(100,(xp/500)*100) },
    { id:'quiz10',     icon:'📚', tier:'silver',    crown:'🥈', name:'Dedicated',         req:'Complete 10 quizzes',       done:quizzes>=10,  progress:Math.min(100,(quizzes/10)*100) },
    { id:'streak7',    icon:'🌟', tier:'silver',    crown:'🥈', name:'Week Warrior',      req:'7-day streak',              done:streak>=7,    progress:Math.min(100,(streak/7)*100) },
    { id:'perfect3',   icon:'🎯', tier:'silver',    crown:'🥈', name:'Sharp Mind',        req:'3 perfect scores',          done:perfect>=3,   progress:Math.min(100,(perfect/3)*100) },
    { id:'xp2000',     icon:'💫', tier:'silver',    crown:'🥈', name:'XP Grinder',        req:'Earn 2,000 XP',             done:xp>=2000,     progress:Math.min(100,(xp/2000)*100) },
    { id:'quiz50',     icon:'🎓', tier:'gold',      crown:'🥇', name:'Bible Scholar',     req:'Complete 50 quizzes',       done:quizzes>=50,  progress:Math.min(100,(quizzes/50)*100) },
    { id:'streak30',   icon:'🔆', tier:'gold',      crown:'🥇', name:'Monthly Champion',  req:'30-day streak',             done:streak>=30,   progress:Math.min(100,(streak/30)*100) },
    { id:'top3',       icon:'🏆', tier:'gold',      crown:'🥇', name:'Podium Finisher',   req:'Finish Top 3 weekly',       done:top3>=1,      progress:Math.min(100,(top3/1)*100) },
    { id:'xp10000',    icon:'💎', tier:'gold',      crown:'🥇', name:'XP Master',         req:'Earn 10,000 XP',            done:xp>=10000,    progress:Math.min(100,(xp/10000)*100) },
    { id:'quiz100',    icon:'👑', tier:'legendary', crown:'✨', name:'Legend',            req:'Complete 100 quizzes',      done:quizzes>=100, progress:Math.min(100,(quizzes/100)*100) },
    { id:'streak100',  icon:'🚀', tier:'legendary', crown:'✨', name:'Unstoppable',       req:'100-day streak',            done:streak>=100,  progress:Math.min(100,(streak/100)*100) },
    { id:'perfect10',  icon:'🌠', tier:'legendary', crown:'✨', name:'Flawless Master',   req:'10 perfect scores',         done:perfect>=10,  progress:Math.min(100,(perfect/10)*100) },
    { id:'xp20000',    icon:'⚡', tier:'legendary', crown:'✨', name:'XP Legend',         req:'Earn 20,000 XP',            done:xp>=20000,    progress:Math.min(100,(xp/20000)*100) }
  ];

  const earned      = BADGES.filter(b => b.done);
  const bronzeCount = earned.filter(b => b.tier === 'bronze').length;
  const silverCount = earned.filter(b => b.tier === 'silver').length;
  const goldCount   = earned.filter(b => b.tier === 'gold').length;
  const legCount    = earned.filter(b => b.tier === 'legendary').length;

  const countEl = document.getElementById('badges-earned-count');
  if (countEl) countEl.textContent = `${earned.length} / ${BADGES.length} earned`;

  const featuredEl = document.getElementById('profile-featured-badge');
  if (featuredEl) {
    const best = earned.slice().reverse()[0];
    if (best) { featuredEl.innerHTML = `${best.icon} ${best.name}`; featuredEl.classList.remove('hidden'); }
  }

  const statsBar = document.getElementById('badges-stats-bar');
  if (statsBar) {
    statsBar.innerHTML = `
      <div class="badges-stat-chip chip-bronze"><div class="badges-stat-chip-value">${bronzeCount}</div><div class="badges-stat-chip-label">🥉 Bronze</div></div>
      <div class="badges-stat-chip chip-silver"><div class="badges-stat-chip-value">${silverCount}</div><div class="badges-stat-chip-label">🥈 Silver</div></div>
      <div class="badges-stat-chip chip-gold"><div class="badges-stat-chip-value">${goldCount}</div><div class="badges-stat-chip-label">🥇 Gold</div></div>
      <div class="badges-stat-chip chip-legendary"><div class="badges-stat-chip-value">${legCount}</div><div class="badges-stat-chip-label">✨ Legend</div></div>`;
  }

  container.innerHTML = BADGES.map(b => `
    <div class="badge-card tier-${b.tier} ${b.done ? 'badge-unlocked' : 'badge-locked'}">
      <div class="badge-icon-wrap">
        <div class="badge-icon">${b.done ? b.icon : '🔒'}</div>
        ${b.done ? `<span class="badge-tier-crown">${b.crown}</span>` : ''}
      </div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-req">${b.req}</div>
      <span class="badge-tier-label">${b.tier}</span>
      ${!b.done && b.progress > 0
        ? `<div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${Math.round(b.progress)}%"></div></div>`
        : ''}
    </div>`).join('');
}

// ============================================================
// SETTINGS SCREEN
// ============================================================

function initSettingsScreen() {
  const theme = getState('theme')?.current || 'light';
  const darkToggle = document.getElementById('setting-dark-mode');
  if (darkToggle) darkToggle.checked = theme === 'dark';
  const profile      = getUserProfile();
  const soundToggle  = document.getElementById('setting-sound');
  if (soundToggle) soundToggle.checked = profile?.soundEnabled !== false;
  const notifToggle  = document.getElementById('setting-notifications');
  if (notifToggle) notifToggle.checked = Notification?.permission === 'granted';
}

// ============================================================
// QUIZ FLOW
// ============================================================

async function handleStartQuiz(resume = false) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  // ── Lock ALL start buttons immediately so user can't tap twice ──
  const allStartBtns = [
    document.getElementById('start-quiz-btn'),
    document.getElementById('daily-modal-start-btn'),
    document.getElementById('resume-quiz-btn'),
    document.getElementById('daily-modal-resume-btn')
  ];
  allStartBtns.forEach(btn => {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting…'; }
  });

  // ── Show a full-screen loading overlay so nothing else is tappable ──
  _showQuizLoadingOverlay();

  try {
    let sessionData;
    if (resume) {
      sessionData = loadQuizStateFromStorage();
      if (!sessionData) {
        showToast('No resumable quiz found. Starting fresh.', 'info');
        _hideQuizLoadingOverlay();
        allStartBtns.forEach(btn => {
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
        });
        return handleStartQuiz(false);
      }
    } else {
      try {
        sessionData = await createQuizSession();
        _activeLocalSession = null;
      } catch (cloudErr) {
        console.warn('[App] Cloud Function unavailable, using local fallback:', cloudErr.message);
        const questions = await getLocalQuestions();
        if (questions.length === 0)
          throw new Error('Quiz questions are not available yet. Please check back soon!');
        sessionData = await createLocalQuizSession(questions);
        _activeLocalSession = { questions: sessionData.questions };
      }
    }

    const qp = await getQuizPage();
    showScreen('quiz');
    await qp.initQuizScreen(sessionData, {
      onComplete:  handleQuizComplete,
      onAbandon:   handleQuizAbandon,
      localSubmit: _activeLocalSession
        ? (sid, answers) => submitLocalQuizSession(sid, answers, _activeLocalSession.questions)
        : null
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    _hideQuizLoadingOverlay();
    allStartBtns.forEach(btn => {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
    });
  }
      }


function _showQuizLoadingOverlay() {
  let overlay = document.getElementById('quiz-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'quiz-loading-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99998',
      'background:rgba(0,0,0,0.55)', 'backdrop-filter:blur(3px)',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center', 'gap:16px'
    ].join(';');
    overlay.innerHTML = `
      <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <div style="color:#fff;font-size:15px;font-weight:700;font-family:inherit;letter-spacing:0.2px">Preparing your quiz…</div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function _hideQuizLoadingOverlay() {
  const overlay = document.getElementById('quiz-loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function handleQuizComplete(result) {
  if (_limitTimer) clearInterval(_limitTimer);
  _activeLocalSession = null;
  showScreen('result');
  renderResultScreen(result);
}

function handleQuizAbandon() {
  clearQuizStorage();
  _activeLocalSession = null;
  showScreen('path');
}

// ============================================================
// RESULT SCREEN
// ============================================================

function renderResultScreen(result) {
  const el     = id => document.getElementById(id);
  const pct    = result.percentage || 0;
  const passed = pct >= SCORE_PASS_THRESHOLD;

  if (el('result-icon'))    el('result-icon').textContent    = pct === 100 ? '🏆' : passed ? '🎉' : '📖';
  if (el('result-title'))   el('result-title').textContent   = pct === 100 ? 'Perfect Score!' : passed ? 'Well Done!' : 'Keep Practising!';
  if (el('result-candidate-name')) el('result-candidate-name').textContent = getUserProfile()?.displayName || '';
  if (el('result-pct'))     el('result-pct').textContent     = `${pct}%`;
  if (el('result-detail'))  el('result-detail').textContent  = `${result.score} / ${result.totalQuestions} correct`;
  if (el('result-xp'))      el('result-xp').textContent      = `+${result.xpEarned || 0} XP`;
  if (el('r-streak'))       el('r-streak').textContent       = result.streak      || 0;
  if (el('r-level'))        el('r-level').textContent        = result.newLevel    || 1;
  if (el('r-total-xp'))     el('r-total-xp').textContent     = (result.totalXp || 0).toLocaleString();
  if (el('r-weekly-pts'))   el('r-weekly-pts').textContent   = (result.weeklyPoints || 0).toLocaleString();

  const badge = el('result-badge');
  if (badge) { badge.textContent = passed ? '✅ Passed' : '❌ Try Again'; badge.className = `score-badge ${passed ? 'pass' : 'fail'}`; }

  if (result.leveledUp) {
    setTimeout(() => {
      const modal = el('levelup-modal');
      const lvl   = el('levelup-level');
      if (lvl)   lvl.textContent = `Level ${result.newLevel}`;
      if (modal) modal.classList.remove('hidden');
    }, 1200);
  }

  if (result.achievementUnlocks?.length) {
    const box  = el('achievement-unlocks');
    const text = el('achievement-text');
    if (box && text) { text.textContent = result.achievementUnlocks.join(', '); box.classList.remove('hidden'); }
  }

  const tip = el('study-tip');
  if (tip && pct < 60) {
    tip.textContent = '💡 Tip: Regular daily reading improves your quiz scores significantly!';
    tip.classList.remove('hidden');
  }

  renderResultChart(result.score || 0, (result.totalQuestions || 15) - (result.score || 0));

  const attemptsMsg = el('result-attempts-msg');
  if (attemptsMsg) {
    checkDailyLimit().then(limit => {
      attemptsMsg.textContent = limit.remaining > 0
        ? `You have ${limit.remaining} quiz attempt${limit.remaining !== 1 ? 's' : ''} remaining today.`
        : "You've used both quizzes for today. See you tomorrow!";
    });
  }
}

function renderResultChart(correct, wrong) {
  const canvas = document.getElementById('result-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas._chartInstance) canvas._chartInstance.destroy();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  canvas._chartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Correct','Incorrect'],
      datasets: [{ data: [correct, wrong], backgroundColor: ['#22c55e','#ef4444'], borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: isDark ? '#9fa8da' : '#64748b', font: { weight:'700', family:'Nunito' }, padding: 16 }
        }
      },
      animation: { animateScale: true, duration: 700 }
    }
  });
}

// ============================================================
// AUTH MODAL
// ============================================================

function openAuthModal() {
  document.getElementById('auth-modal')?.classList.remove('hidden');
  document.getElementById('login-email')?.focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.add('hidden');
  clearAuthMessage();
}

function showAuthMessage(msg, type = 'error') {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = msg;
  el.className   = `auth-error show ${type}`;
}

function clearAuthMessage() {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
}

function switchAuthTab(tab) {
  clearAuthMessage();
  const isLogin = tab === 'login';
  document.getElementById('login-form')?.classList.toggle('hidden',    !isLogin);
  document.getElementById('register-form')?.classList.toggle('hidden',  isLogin);
  document.getElementById('tab-login')?.classList.toggle('active',      isLogin);
  document.getElementById('tab-register')?.classList.toggle('active',  !isLogin);
}

// ============================================================
// CONFIRM MODAL
// ============================================================

function showConfirm({ icon = '⚠️', title, message, onConfirm }) {
  const modal = document.getElementById('confirm-modal');
  const el    = id => document.getElementById(id);
  if (el('confirm-icon'))    el('confirm-icon').textContent    = icon;
  if (el('confirm-title'))   el('confirm-title').textContent   = title;
  if (el('confirm-message')) el('confirm-message').textContent = message;
  modal?.classList.remove('hidden');
  const okBtn = el('confirm-ok-btn');
  const newOk = okBtn?.cloneNode(true);
  okBtn?.parentNode.replaceChild(newOk, okBtn);
  newOk?.addEventListener('click', () => { modal?.classList.add('hidden'); onConfirm?.(); });
}

// ============================================================
// INCOMING CHALLENGE MODAL
// ============================================================

function showIncomingChallengeModal(challenge) {
  _incomingChallenge = challenge;
  showToast(`⚔️ ${challenge.challengerName || 'Someone'} challenged you to a battle!`, 'info', 8000);

  let overlay = document.getElementById('incoming-challenge-overlay');
  if (!overlay) {
    overlay = _createIncomingChallengeOverlay();
    document.body.appendChild(overlay);
  }

  const nameEl  = overlay.querySelector('#incoming-challenger-name') || overlay.querySelector('.incoming-challenger-name');
  const timerEl = overlay.querySelector('#incoming-challenge-timer') || overlay.querySelector('.incoming-challenge-timer');
  if (nameEl) nameEl.textContent = challenge.challengerName || 'Someone';

  if (_challengeTimerInterval) clearInterval(_challengeTimerInterval);
  function updateTimer() {
    const remaining = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000));
    if (timerEl) timerEl.textContent = remaining > 0 ? `⏰ ${remaining}s to respond` : '⏰ Challenge expired';
    if (remaining <= 0) { clearInterval(_challengeTimerInterval); closeIncomingChallengeModal(); }
  }
  updateTimer();
  _challengeTimerInterval = setInterval(updateTimer, 1000);
  overlay.style.zIndex = '99999';
  overlay.classList.remove('hidden');
}

function _createIncomingChallengeOverlay() {
  const div = document.createElement('div');
  div.id        = 'incoming-challenge-overlay';
  div.className = 'incoming-challenge-overlay';
  div.innerHTML = `
    <div class="incoming-challenge-card" style="background:var(--bg-primary,#fff);border-radius:var(--radius-xl,20px);padding:32px 24px;max-width:360px;width:90vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="font-size:52px;margin-bottom:12px">⚔️</div>
      <div class="incoming-challenger-name" id="incoming-challenger-name" style="font-size:20px;font-weight:900;color:var(--text-primary);margin-bottom:6px">Someone</div>
      <div style="font-size:14px;color:var(--text-muted);margin-bottom:16px">challenged you to a Bible quiz battle!</div>
      <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
        <p>⏱️ 15 questions, under 3 minutes</p>
        <p style="margin-top:4px">🏆 Winner gets +50 XP</p>
      </div>
      <div class="incoming-challenge-timer" id="incoming-challenge-timer" style="font-size:18px;font-weight:800;color:var(--accent-primary);margin-bottom:20px"></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="incoming-accept-btn" class="btn-primary btn-full" style="font-size:16px;padding:16px">⚔️ Accept Challenge!</button>
        <button id="incoming-reject-btn" class="btn-secondary btn-full">Maybe Later</button>
      </div>
    </div>`;
  div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  div.querySelector('#incoming-accept-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const btn = div.querySelector('#incoming-accept-btn');
    btn.disabled = true; btn.textContent = 'Accepting…';
    try {
      const { matchId, questions, match } = await acceptDirectChallenge(_incomingChallenge.matchId);
      closeIncomingChallengeModal();
      showToast('Challenge accepted! Starting battle… ⚔️', 'success', 2000);
      await startBattle(matchId, questions, match);
    } catch (err) {
      showToast(err.message || 'Failed to accept challenge', 'error');
      btn.disabled = false; btn.textContent = '⚔️ Accept Challenge!';
    }
  });

  div.querySelector('#incoming-reject-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const user = getCurrentUser();
    await rejectDirectChallenge(_incomingChallenge.matchId, user.uid);
    closeIncomingChallengeModal();
    showToast('Challenge declined.', 'info', 2000);
  });

  return div;
}

function closeIncomingChallengeModal() {
  if (_challengeTimerInterval) { clearInterval(_challengeTimerInterval); _challengeTimerInterval = null; }
  document.getElementById('incoming-challenge-overlay')?.classList.add('hidden');
  _incomingChallenge = null;
}

// ============================================================
// DIRECT CHALLENGE FROM LEADERBOARD
// ============================================================

async function handleDirectChallenge(targetUid, targetName) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (targetUid === user.uid) { showToast("You can't challenge yourself!", 'error'); return; }
  if (_outgoingChallengeId) {
    showToast('You already have a pending challenge. Cancel it first or wait for a response.', 'warning', 4000);
    return;
  }

  if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();
  if (!_localQuestionsCache.length) { showToast('No questions available. Try again shortly.', 'error'); return; }

  _showChallengePendingOverlay(targetName);

  try {
    const result = await sendDirectChallenge(targetUid, targetName, _localQuestionsCache);
    _outgoingChallengeId = result.matchId;

    const pendingName = document.getElementById('challenge-pending-name');
    if (pendingName) pendingName.textContent = `Waiting for ${targetName} to respond…`;

    listenForChallengeResponse(result.matchId, {
      onAccepted: (match) => {
        _hideChallengePendingOverlay();
        showToast(`${targetName} accepted! Starting battle… ⚔️`, 'success', 3000);
        setTimeout(() => startBattle(result.matchId, match.questions, match), 1000);
      },
      onRejected: () => {
        _hideChallengePendingOverlay();
        showToast(`${targetName} declined your challenge.`, 'info', 4000);
        _outgoingChallengeId = null;
      }
    });

    setTimeout(() => {
      if (_outgoingChallengeId === result.matchId) {
        _hideChallengePendingOverlay();
        stopOutgoingChallengeListener();
        showToast(`${targetName} didn't respond in time. Challenge expired.`, 'info', 4000);
        _outgoingChallengeId = null;
      }
    }, 5 * 60 * 1000);
  } catch (err) {
    _hideChallengePendingOverlay();
    showToast(err.message || 'Failed to send challenge', 'error');
  }
}

function _showChallengePendingOverlay(targetName) {
  const nameEl = document.getElementById('challenge-pending-name');
  if (nameEl) nameEl.textContent = `Challenge sent to ${targetName}…`;
  document.getElementById('challenge-pending-overlay')?.classList.remove('hidden');
}

function _hideChallengePendingOverlay() {
  document.getElementById('challenge-pending-overlay')?.classList.add('hidden');
  _outgoingChallengeId = null;
}

// ============================================================
// CHALLENGE HUB MODAL
// ============================================================

function openChallengeHub() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  showScreen('challenge');
}

function closeChallengeModal() {
  showScreen('path');
}

function _setVhUnit() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

// ============================================================
// PWA INSTALL PROMPT
// ============================================================

function _maybeShowInstallPrompt() {
  if (!_deferredInstallPrompt) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return; // already installed
  if (localStorage.getItem('sq_install_prompt_dismissed')) return;
  if (localStorage.getItem('sq_install_prompt_shown')) return;

  localStorage.setItem('sq_install_prompt_shown', '1');
  setTimeout(_showInstallModal, 1200);
}

function _showInstallModal() {
  if (!_deferredInstallPrompt) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--bg-card,#fff);border-radius:24px 24px 0 0;max-width:480px;width:100%;padding:28px 24px 32px;text-align:center">
      <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:white">SQ</div>
      <h3 style="font-size:19px;font-weight:800;margin-bottom:8px;color:var(--text-primary)">Install ScriptureQuest</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:22px;line-height:1.5">
        Add ScriptureQuest to your home screen for quick access — no browser tabs, just tap and go.
      </p>
      <button id="install-app-confirm-btn" class="btn-primary btn-full" style="margin-bottom:10px">
        <i class="fas fa-download"></i> Install App
      </button>
      <button id="install-app-cancel-btn" class="btn-secondary btn-full">Not Now</button>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('#install-app-cancel-btn').addEventListener('click', () => {
    localStorage.setItem('sq_install_prompt_dismissed', '1');
    overlay.remove();
  });

  overlay.querySelector('#install-app-confirm-btn').addEventListener('click', async () => {
    overlay.remove();
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    const { outcome } = await _deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('sq_install_prompt_dismissed', '1');
    }
    _deferredInstallPrompt = null;
  });
}

// ============================================================
// BATTLE ARENA — full page init
// ============================================================

function initChallengeScreen() {
  const user = getCurrentUser();
  if (!user) { showScreen('path'); openAuthModal(); return; }

  const codeBox       = document.getElementById('challenge-code-box');
  const createActions = document.getElementById('challenge-create-actions');
  const shareActions  = document.getElementById('challenge-share-actions');
  const hasActive     = (_activeChallengeMatchId && _currentChallenge) || _outgoingChallengeId;

  if (hasActive) {
    codeBox?.classList.remove('hidden');
    createActions?.classList.add('hidden');
    shareActions?.classList.remove('hidden');
    const codeDisplay = document.getElementById('challenge-code-display');
    if (codeDisplay && _currentChallenge?.code) codeDisplay.textContent = _currentChallenge.code;
  } else {
    codeBox?.classList.add('hidden');
    createActions?.classList.remove('hidden');
    shareActions?.classList.add('hidden');
  }

  document.getElementById('battle-hub-back-btn').onclick = () => showScreen('path');

  _loadBattleHistoryIntoHub(user.uid);
}

// ============================================================
// BATTLE HISTORY
// ============================================================

async function _loadBattleHistoryIntoHub(uid) {
  const container = document.getElementById('challenge-hub-history');
  if (!container) return;

  container.innerHTML = `<div class="battle-history-loading"><i class="fas fa-spinner fa-spin"></i> Loading battles…</div>`;

  try {
    const matches = await getUserMatches(uid);
    _battleHistoryCache = matches.slice(0, 15);

    if (!matches.length) {
      container.innerHTML = `<div class="battle-history-empty"><div class="battle-history-empty-icon">⚔️</div><p class="battle-history-empty-title">No battles yet!</p><p class="battle-history-empty-sub">Challenge someone to get started.</p></div>`;
      return;
    }

    container.innerHTML = _battleHistoryCache.map((m, i) => {
      const isCreator = m.creatorId === uid;
      const oppName   = (isCreator ? m.opponentName : m.creatorName) || 'Opponent';
      const myPct     = isCreator ? m.creatorPct  : m.opponentPct;
      const oppPct    = isCreator ? m.opponentPct : m.creatorPct;

      let resultChip = '—', chipClass = 'chip-neutral';
      if (m.status === 'completed') {
        if (m.winnerId === 'draw')   { resultChip = '🤝 Draw'; chipClass = 'chip-draw'; }
        else if (m.winnerId === uid) { resultChip = '🏆 Won';  chipClass = 'chip-win'; }
        else                         { resultChip = '😔 Lost'; chipClass = 'chip-loss'; }
      } else if (m.status === 'pending' || m.status === 'waiting') { resultChip = '⏳ Pending'; chipClass = 'chip-pending'; }
      else if (m.status === 'active')                              { resultChip = '⚔️ Active';  chipClass = 'chip-active'; }
      else if (m.status === 'cancelled' || m.status === 'rejected'){ resultChip = '✕ Cancelled'; chipClass = 'chip-neutral'; }

      const score = (m.status === 'completed' && myPct !== null)
        ? `${myPct}% <span class="vs-sep">vs</span> ${oppPct ?? '?'}%`
        : '<span class="vs-sep">—</span>';

      const mId       = m.matchId || m.id || '';
      const canCancel = (m.status === 'active' || m.status === 'pending' || m.status === 'waiting') && mId;
      const cancelBtn = canCancel
        ? `<button class="battle-history-cancel-btn" onclick="event.stopPropagation();window.SQ&&SQ.cancelMatchById('${mId}')" title="Cancel">✕</button>`
        : '<i class="fas fa-chevron-right battle-history-chevron"></i>';

      return `
        <div class="battle-history-card" data-history-index="${i}">
          <div class="battle-history-avatar" id="bh-avatar-${i}"></div>
          <div class="battle-history-info">
            <div class="battle-history-name">vs ${escapeHTML(oppName)}</div>
            <div class="battle-history-score">${score}</div>
          </div>
          <div class="battle-history-chip ${chipClass}">${resultChip}</div>
          ${cancelBtn}
        </div>`;
    }).join('');

    _battleHistoryCache.forEach((m, i) => {
      const isCreator = m.creatorId === uid;
      const oppAvatar = (isCreator ? m.opponentAvatar : m.creatorAvatar) || 'M01';
      const el = document.getElementById(`bh-avatar-${i}`);
      if (el) mountAvatar(oppAvatar, el);
    });

    container.querySelectorAll('.battle-history-card').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const idx = parseInt(row.dataset.historyIndex, 10);
        const match = _battleHistoryCache[idx];
        if (match) initBattleHistoryDetailScreen(match, uid);
      });
    });

  } catch (e) {
    container.innerHTML = `<div class="battle-history-empty"><p class="battle-history-empty-title">Couldn't load history.</p></div>`;
  }
}

// ============================================================
// BATTLE HISTORY DETAIL — full page
// ============================================================

function initBattleHistoryDetailScreen(match, uid) {
  _loadHtml2Canvas(); // preload in background so Download is instant later
  const isCreator = match.creatorId === uid;
  const myName    = isCreator ? (match.creatorName  || 'You')      : (match.opponentName || 'You');
  const oppName   = isCreator ? (match.opponentName || 'Opponent') : (match.creatorName   || 'Opponent');
  const myAvatar  = (isCreator ? match.creatorAvatar  : match.opponentAvatar) || 'M01';
  const oppAvatar = (isCreator ? match.opponentAvatar : match.creatorAvatar) || 'M01';
  const myScore   = isCreator ? match.creatorScore  : match.opponentScore;
  const oppScore  = isCreator ? match.opponentScore : match.creatorScore;
  const myPct     = isCreator ? match.creatorPct    : match.opponentPct;
  const oppPct    = isCreator ? match.opponentPct   : match.creatorPct;
  const total     = match.questions?.length || 15;
  const isDraw    = match.winnerId === 'draw';
  const iWon      = match.winnerId === uid;
  const ts        = match.completedAt || match.createdAt;
  const ms        = ts?.toMillis?.() || ts;
  const dateText  = ms ? new Date(ms).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) + ' · ' + new Date(ms).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}) : '';
  const myAnswers = isCreator ? match.creatorAnswers : match.opponentAnswers;

  document.getElementById('battle-detail-title').textContent =
    isDraw ? "It's a Draw!" : iWon ? 'Victory!' : match.status === 'completed' ? 'Defeat' : 'Battle Details';
  document.getElementById('battle-detail-date').textContent =
    dateText + (match.code ? ' · Code: ' + match.code : '');

  document.getElementById('battle-detail-my-name').textContent   = myName;
  document.getElementById('battle-detail-opp-name').textContent  = oppName;
  document.getElementById('battle-detail-my-pct').textContent    = (myPct ?? '—') + '%';
  document.getElementById('battle-detail-opp-pct').textContent   = (oppPct ?? '—') + '%';
  document.getElementById('battle-detail-my-score').textContent  = `${myScore ?? 0}/${total}`;
  document.getElementById('battle-detail-opp-score').textContent = `${oppScore ?? 0}/${total}`;

  document.getElementById('battle-detail-score-me').classList.toggle('battle-winner', !isDraw && iWon);
  document.getElementById('battle-detail-score-opp').classList.toggle('battle-winner', !isDraw && !iWon && match.status === 'completed');

  mountAvatar(myAvatar,  document.getElementById('battle-detail-my-avatar'));
  mountAvatar(oppAvatar, document.getElementById('battle-detail-opp-avatar'));

  const breakdownEl = document.getElementById('battle-detail-breakdown');
  const rows = (match.questions || []).map((q, i) => {
    const correct = myAnswers?.[i] === q.correctAnswer;
    return `<div class="battle-detail-question-row">
      <span class="battle-detail-question-icon">${correct ? '✅' : '❌'}</span>
      <span class="battle-detail-question-text">${escapeHTML(q.question)}</span>
    </div>`;
  }).join('');
  breakdownEl.innerHTML = rows || '<p class="battle-history-empty-sub">No breakdown available.</p>';

  document.getElementById('battle-detail-download-btn').onclick = () =>
    _downloadBattleShareCard({ myName, oppName, myAvatar, oppAvatar, myPct, oppPct, myScore, oppScore, total, dateText });

  document.getElementById('battle-detail-back-btn').onclick = () => showScreen('challenge');

  showScreen('battle-history-detail');
}

// ============================================================
// DOWNLOAD RESULT AS IMAGE
// ============================================================

let _html2canvasPromise = null;
function _loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();
  if (_html2canvasPromise) return _html2canvasPromise;
  _html2canvasPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _html2canvasPromise;
}

async function _downloadBattleShareCard(data) {
  const btn = document.getElementById('battle-detail-download-btn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing…';

  try {
    await _loadHtml2Canvas();

    const myPct  = data.myPct  ?? 0;
    const oppPct = data.oppPct ?? 0;
    const isDraw = myPct === oppPct;
    const iWon   = !isDraw && myPct > oppPct;
    const xp     = isDraw ? 25 : iWon ? 50 : 10;

    const pill = document.getElementById('share2-pill');
    pill.textContent = isDraw ? 'DRAW' : iWon ? 'VICTORY' : 'DEFEAT';
    pill.className = 'share2-pill' + (isDraw ? ' pill-draw' : !iWon ? ' pill-loss' : '');

    document.getElementById('share-card-my-name').textContent   = data.myName;
    document.getElementById('share-card-opp-name').textContent  = data.oppName;
    document.getElementById('share-card-my-pct').textContent    = myPct + '%';
    document.getElementById('share-card-opp-pct').textContent   = oppPct + '%';
    document.getElementById('share-card-my-score').textContent  = `${data.myScore ?? 0}/${data.total}`;
    document.getElementById('share-card-opp-score').textContent = `${data.oppScore ?? 0}/${data.total}`;
    document.getElementById('share-card-date').textContent      = data.dateText;
    document.getElementById('share-card-xp').textContent        = '+' + xp;
    document.getElementById('share-card-questions').textContent = data.total;

    document.getElementById('share-card-my-bar').style.width  = myPct + '%';
    document.getElementById('share-card-opp-bar').style.width = oppPct + '%';

    const myAvatarEl  = document.getElementById('share-card-my-avatar');
    const oppAvatarEl = document.getElementById('share-card-opp-avatar');
    myAvatarEl.className  = 'share2-avatar' + (isDraw ? '' : iWon ? ' glow-win' : ' glow-lose');
    oppAvatarEl.className = 'share2-avatar' + (isDraw ? '' : !iWon ? ' glow-win' : ' glow-lose');
    mountAvatar(data.myAvatar,  myAvatarEl);
    mountAvatar(data.oppAvatar, oppAvatarEl);

    

 const cardEl = document.getElementById('battle-share-card');
    const isLight = getCurrentTheme().applied === 'light';
    cardEl.classList.toggle('share2-light', isLight);
    cardEl.style.display = 'flex';

    const canvas = await window.html2canvas(cardEl, { scale: 2, backgroundColor: null });
    cardEl.style.display = 'none';

    const link = document.createElement('a');
    link.download = `scripturequest-battle-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    showToast('Could not generate image: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}
// ============================================================
// CHALLENGE SYSTEM
// ============================================================

async function generateChallenge() {
  if (_activeChallengeMatchId) {
    showToast('You already have an active challenge! Wait for your opponent to accept.', 'warning');
    return;
  }
  const btn = document.getElementById('generate-challenge-btn');
  if (!btn) return;
  btn.disabled = true; btn.textContent = 'Generating…';

  try {
    if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();
    if (!_localQuestionsCache.length) throw new Error('No questions available yet.');

    const result = await createChallenge(_localQuestionsCache);
    _activeChallengeMatchId = result.matchId;
    _currentChallenge       = result;

    const codeDisplay = document.getElementById('challenge-code-display');
    const codeBox     = document.getElementById('challenge-code-box');
    if (codeDisplay) codeDisplay.textContent = result.code;
    if (codeBox)     codeBox.classList.remove('hidden');
    document.getElementById('challenge-create-actions')?.classList.add('hidden');
    document.getElementById('challenge-share-actions')?.classList.remove('hidden');

    const profile = getUserProfile();
    const waLink  = generateWhatsAppLink(result.code, profile?.displayName || 'Someone', _appUrl + window.location.pathname);
    const waBtn   = document.getElementById('whatsapp-share-btn');
    if (waBtn) waBtn.onclick = () => window.open(waLink, '_blank');

    showToast(`Challenge created! Code: ${result.code}`, 'success', 5000);

    _unsubMatch();
    _matchUnsubscribe = listenToMatch(result.matchId, async match => {
      if (match.status === 'active' && match.opponentId) {
        _unsubMatch();
        _activeChallengeMatchId = null;
        closeChallengeModal();
        showToast(`${match.opponentName} accepted your challenge! ⚔️`, 'success', 3000);
        setTimeout(() => startBattle(result.matchId, match.questions, match), 1200);
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Challenge Link';
  }
}

function cancelActiveChallenge() {
  if (_activeChallengeMatchId) { _unsubMatch(); _activeChallengeMatchId = null; _currentChallenge = null; }
  if (_outgoingChallengeId)    { _cancelOutgoingDirectChallenge(); return; }
  closeChallengeModal();
  showToast('Challenge cancelled', 'info');
}

function _cancelOutgoingDirectChallenge() {
  const matchId = _outgoingChallengeId;
  _hideChallengePendingOverlay();
  stopOutgoingChallengeListener();
  if (matchId) {
    import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) => {
      import('./firebase/config.js').then(({ db }) => {
        updateDoc(doc(db, 'matches', matchId), { status: 'cancelled', cancelledAt: serverTimestamp() })
          .catch(e => console.warn('[App] Cancel challenge write failed:', e.message));
      });
    });
  }
  showToast('Challenge cancelled.', 'info');
}

function showChallengeAcceptModal(code = '') {
  const input = document.getElementById('challenge-code-input');
  if (input && code) input.value = code.toUpperCase();
  document.getElementById('challenge-accept-modal')?.classList.remove('hidden');
}

function closeChallengeAcceptModal() {
  document.getElementById('challenge-accept-modal')?.classList.add('hidden');
}

async function acceptChallengeByCode() {
  const input   = document.getElementById('challenge-code-input');
  const rawCode = input?.value?.trim() || '';
  const code    = rawCode.replace(/:\d+$/, '').toUpperCase();
  if (!code) return showToast('Please enter a challenge code', 'error');

  const btn = document.getElementById('accept-challenge-btn');
  btn.disabled = true; btn.textContent = 'Accepting…';

  try {
    const matchData = await getChallengeByCode(code);
    if (!matchData)                   throw new Error('Challenge not found. Check the code and try again.');
    if (matchData.status !== 'waiting') throw new Error('This challenge is no longer available.');
    if (matchData.creatorId === getCurrentUser()?.uid) throw new Error("You can't accept your own challenge!");
    const { matchId, questions } = await acceptChallenge(matchData.matchId);
    closeChallengeAcceptModal();
    showToast('Challenge accepted! Good luck! ⚔️', 'success', 3000);
    await startBattle(matchId, questions, { ...matchData, questions });
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-fist-raised"></i> Accept Challenge!';
  }
}


async function handleChallengeUser(opponentUid, opponentName) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (opponentUid === user.uid) { showToast("You can't challenge yourself!", 'error'); return; }
  showToast(`⚔️ Creating battle with ${opponentName}…`, 'info', 2000);
  try {
    if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();
    const result = await createChallenge(_localQuestionsCache);
    _activeChallengeMatchId = result.matchId;
    _currentChallenge = { ...result, targetUid: opponentUid, targetName: opponentName };
    const codeDisplay   = document.getElementById('challenge-code-display');
    const codeBox       = document.getElementById('challenge-code-box');
    const createActions = document.getElementById('challenge-create-actions');
    const shareActions  = document.getElementById('challenge-share-actions');
    if (codeDisplay)   codeDisplay.textContent = result.code;
    if (codeBox)       codeBox.classList.remove('hidden');
    if (createActions) createActions.classList.add('hidden');
    if (shareActions)  shareActions.classList.remove('hidden');
    const waLink = generateWhatsAppLink(result.code, user.displayName || 'Someone', _appUrl);
    const waBtn  = document.getElementById('whatsapp-share-btn');
    if (waBtn) waBtn.onclick = () => window.open(waLink, '_blank');
    showScreen('challenge');
    showToast(`Challenge ready! Share the code with ${opponentName}`, 'success', 5000);
    _unsubMatch();
    _matchUnsubscribe = listenToMatch(result.matchId, async match => {
      if (match.status === 'active' && match.opponentId) {
        _unsubMatch();
        _activeChallengeMatchId = null;
        closeChallengeModal();
        showToast(`${match.opponentName} accepted! ⚔️`, 'success', 3000);
        setTimeout(() => startBattle(result.matchId, match.questions, match), 1200);
      }
    });
  } catch (err) { showToast(err.message || 'Failed to create challenge', 'error'); }
}

// ============================================================
// SUBSCRIPTION HELPERS
// ============================================================

function _unsubMatch() {
  if (_matchUnsubscribe) { _matchUnsubscribe(); _matchUnsubscribe = null; }
}

// ============================================================
// AVATAR MODAL
// ============================================================

function openAvatarModal() {
  const profile = getUserProfile();
  _selectedAvatarId = getAvatarId(profile);
  renderAvatarGrid('all');
  updateAvatarPreview(_selectedAvatarId);
  document.getElementById('avatar-modal')?.classList.remove('hidden');
}

function closeAvatarModal() { document.getElementById('avatar-modal')?.classList.add('hidden'); }

function filterAvatars(gender) {
  document.querySelectorAll('.avatar-filter-btn').forEach(btn =>
    btn.classList.toggle('active', btn.id === `avatar-filter-${gender}`)
  );
  renderAvatarGrid(gender);
}

function renderAvatarGrid(gender = 'all') {
  const grid = document.getElementById('avatar-grid');
  if (!grid) return;
  const filtered = gender === 'all' ? AVATARS : AVATARS.filter(a => a.gender === gender);
  grid.innerHTML = filtered.map(avatar => `
    <div class="avatar-option ${avatar.id === _selectedAvatarId ? 'selected' : ''}"
         onclick="SQ.selectAvatar('${avatar.id}')" data-id="${avatar.id}">
      <div class="avatar-option-img">${avatar.svg()}</div>
      <div class="avatar-option-label">${avatar.label}</div>
    </div>`).join('');
}

function selectAvatar(avatarId) {
  _selectedAvatarId = avatarId;
  document.querySelectorAll('.avatar-option').forEach(opt =>
    opt.classList.toggle('selected', opt.dataset.id === avatarId)
  );
  updateAvatarPreview(avatarId);
}

function updateAvatarPreview(avatarId) {
  const previewEl = document.getElementById('avatar-preview-circle');
  const nameEl    = document.getElementById('avatar-preview-name');
  if (previewEl) mountAvatar(avatarId, previewEl);
  if (nameEl)    nameEl.textContent = getAvatarLabel(avatarId);
}

async function saveSelectedAvatar() {
  const btn = document.getElementById('avatar-save-btn');
  if (!_selectedAvatarId) return;
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await saveAvatar(_selectedAvatarId);
    mountAvatar(_selectedAvatarId, document.getElementById('profile-avatar'));
    closeAvatarModal();
    showToast('Avatar updated! 🎭', 'success');
  } catch (err) {
    showToast('Failed to save avatar', 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Save Avatar';
  }
}

// ============================================================
// CANCEL ANY MATCH BY ID
// ============================================================

async function cancelMatchById(matchId) {
  if (!matchId) return;
  const user = getCurrentUser();
  if (!user) return;
  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');
    await updateDoc(doc(db, 'matches', matchId), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: user.uid });
    if (_activeChallengeMatchId === matchId) { _unsubMatch(); _activeChallengeMatchId = null; _currentChallenge = null; }
    if (_outgoingChallengeId === matchId)    { stopOutgoingChallengeListener(); _outgoingChallengeId = null; }
    showToast('Match cancelled ✓', 'success', 2000);
    _loadBattleHistoryIntoHub(user.uid);
  } catch (e) { showToast('Could not cancel — check your connection', 'error'); }
}

// ============================================================
// UTILITIES
// ============================================================

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// EVENT WIRING
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  window.addEventListener('resize', _setVhUnit);
_setVhUnit();

let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
});

  // ── Battle FAB ──
  document.getElementById('battle-fab')?.addEventListener('click', openChallengeHub);
  document.getElementById('generate-challenge-btn')?.addEventListener('click', generateChallenge);
  document.getElementById('challenge-modal-close-btn')?.addEventListener('click', closeChallengeModal);
  document.getElementById('challenge-cancel-btn')?.addEventListener('click', cancelActiveChallenge);
  document.getElementById('challenge-accept-modal-close-btn')?.addEventListener('click', closeChallengeAcceptModal);
  document.getElementById('accept-challenge-btn')?.addEventListener('click', acceptChallengeByCode);

  function _handleJoinByCode(inputId, btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const input   = document.getElementById(inputId);
      const rawCode = input?.value?.trim() || '';
      const code    = rawCode.replace(/:\d+$/, '').toUpperCase();
      if (!code || !code.startsWith('SQ-')) { showToast('Enter a valid challenge code (e.g. SQ-AB12)', 'error'); return; }
      const originalText = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining…';
      try {
        const matchData = await getChallengeByCode(code);
        if (!matchData)                     throw new Error('Challenge not found. Check the code and try again.');
        if (matchData.status !== 'waiting') throw new Error('This challenge is no longer available.');
        if (matchData.creatorId === getCurrentUser()?.uid) throw new Error("You can't join your own challenge!");
        const { matchId, questions } = await acceptChallenge(matchData.matchId);
        closeChallengeModal();
        showToast('Challenge accepted! Battle starting… ⚔️', 'success', 2000);
        await startBattle(matchId, questions, { ...matchData, questions });
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false; btn.innerHTML = originalText;
      }
    });
    document.getElementById(inputId)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById(btnId)?.click();
    });
  }
  _handleJoinByCode('lb-join-code-input',  'lb-join-code-btn');
  _handleJoinByCode('hub-join-code-input', 'hub-join-code-btn');

  // ── Incoming challenge (static HTML buttons) ──
  document.getElementById('incoming-accept-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const btn = document.getElementById('incoming-accept-btn');
    btn.disabled = true; btn.textContent = 'Accepting…';
    try {
      const { matchId, questions, match } = await acceptDirectChallenge(_incomingChallenge.matchId);
      closeIncomingChallengeModal();
      showToast('Challenge accepted! Starting battle… ⚔️', 'success', 2000);
      await startBattle(matchId, questions, match);
    } catch (err) {
      showToast(err.message || 'Failed to accept challenge', 'error');
      btn.disabled = false; btn.textContent = '⚔️ Accept Challenge!';
    }
  });
  document.getElementById('incoming-reject-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const user = getCurrentUser();
    await rejectDirectChallenge(_incomingChallenge.matchId, user.uid);
    closeIncomingChallengeModal();
    showToast('Challenge declined.', 'info', 2000);
  });
  document.getElementById('challenge-pending-cancel')?.addEventListener('click', () => _cancelOutgoingDirectChallenge());

  // ── Daily challenge ──
  document.getElementById('daily-challenge-fab')?.addEventListener('click', openDailyChallenge);
  document.getElementById('daily-modal-start-btn')?.addEventListener('click',  () => { closeDailyModal(); handleStartQuiz(false); });
  document.getElementById('daily-modal-resume-btn')?.addEventListener('click', () => { closeDailyModal(); handleStartQuiz(true);  });
  document.getElementById('daily-modal-close-btn')?.addEventListener('click',  closeDailyModal);

  // ── Password visibility ──
  document.getElementById('login-password-toggle')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const btn   = document.getElementById('login-password-toggle');
    if (!input || !btn) return;
    const isHidden = input.type === 'password';
    input.type  = isHidden ? 'text' : 'password';
    btn.innerHTML = `<i class="fas fa-eye${isHidden ? '-slash' : ''}"></i>`;
  });
  document.getElementById('reg-password-toggle')?.addEventListener('click', () => {
    const input = document.getElementById('reg-password');
    const btn   = document.getElementById('reg-password-toggle');
    if (!input || !btn) return;
    const isHidden = input.type === 'password';
    input.type  = isHidden ? 'text' : 'password';
    btn.innerHTML = `<i class="fas fa-eye${isHidden ? '-slash' : ''}"></i>`;
  });

  // ── Auth modal ──
  document.getElementById('open-auth-btn')?.addEventListener('click', openAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAuthModal();
  });

  // ── Login ──
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    const pass  = document.getElementById('login-password')?.value;
    if (!email || !pass) return showAuthMessage('Please fill in all fields');
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Signing in…'; clearAuthMessage();
    try {
      await login({ email, password: pass });
      closeAuthModal();
      // Pending challenge is picked up by _routeToApp() via localStorage
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  });

  // ── Register ──
  document.getElementById('register-btn')?.addEventListener('click', async () => {
    const name  = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const pass  = document.getElementById('reg-password')?.value;
    if (!name || !email || !pass) return showAuthMessage('Please fill in all fields');
    const btn = document.getElementById('register-btn');
    btn.disabled = true; btn.textContent = 'Creating account…'; clearAuthMessage();
    try {
      await register({ name, email, password: pass });
      closeAuthModal();
      showToast(`Welcome to Bible Battle, ${name.split(' ')[0]}! 🎉`, 'success', 4000);
      // Auth listener fires → _routeAfterAuth() handles Notification Gate → Onboarding → Path
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  });

  // ── Forgot password ──
  document.getElementById('forgot-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) return showAuthMessage('Enter your email above first');
    try {
      await resetPassword(email);
      showAuthMessage('Reset email sent! Check your inbox.', 'success');
    } catch (err) { showAuthMessage(getAuthErrorMessage(err.code)); }
  });

  ['login-email','login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-btn')?.click();
    });
  });

  // ── Quiz ──
  document.getElementById('start-quiz-btn')?.addEventListener('click',  () => handleStartQuiz(false));
  document.getElementById('resume-quiz-btn')?.addEventListener('click', () => handleStartQuiz(true));

  // ── Bottom nav ──
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (!target) return;
      if (!['path','settings'].includes(target) && !getCurrentUser()) { openAuthModal(); return; }
      if (getState('nav')?.current === 'leaderboard' && target !== 'leaderboard') {
        unsubscribeLeaderboard();
        unsubscribePresenceList();
        if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
      }
      if (target === 'battle') { openChallengeHub(); return; }
      showScreen(target);
    });
  });

  document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => showScreen('leaderboard'));
  document.getElementById('back-home-btn')?.addEventListener('click',        () => showScreen('path'));

  // ── Profile tabs ──
  document.querySelectorAll('.profile-tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab))
  );

  // ── Save contact ──
  document.getElementById('save-contact-btn')?.addEventListener('click', async () => {
    const user    = getCurrentUser();
    const phone   = document.getElementById('profile-phone')?.value.trim();
    const network = document.getElementById('profile-network')?.value;
    const btn     = document.getElementById('save-contact-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await updateProfile_({ uid: user.uid, phone, network });
      showToast('Contact info saved! You\'re now eligible for rewards. ✅', 'success');
      const { fetchUserData } = await import('./services/auth.service.js');
      const { profile, stats } = await fetchUserData(user.uid);
      const { setState: _setState } = await import('./state/store.js');
      _setState('auth', { user, profile, stats, ready: true, loading: false });
      initProfileScreen();
    } catch (err) { showToast(err.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info'; }
  });

  // ── Theme ──
  document.querySelectorAll('.theme-pref-btn').forEach(btn =>
    btn.addEventListener('click', () => { setTheme(btn.dataset.theme); initProfileScreen(); })
  );
  ['quiz-theme-toggle','lb-theme-toggle'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', toggleTheme)
  );

  // ── Logout ──
  ['logout-btn','settings-logout-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      showConfirm({ icon:'👋', title:'Sign Out', message:'Are you sure you want to sign out?',
        onConfirm: async () => { await logout(); showScreen('path'); }
      });
    });
  });

  // ── Settings toggles ──
  document.getElementById('setting-dark-mode')?.addEventListener('change', e => setTheme(e.target.checked ? 'dark' : 'light'));
  document.getElementById('setting-sound')?.addEventListener('change', async e => {
    const user = getCurrentUser();
    if (!user) return;
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');
    await updateDoc(doc(db, 'users', user.uid), { soundEnabled: e.target.checked });
  });
  document.getElementById('setting-notifications')?.addEventListener('change', async e => {
    if (e.target.checked) {
      const { requestPushPermission } = await import('./services/notification.service.js');
      const result = await requestPushPermission();
      if (!result.granted) { e.target.checked = false; showToast('Notification permission denied. Enable it in your browser settings.', 'warning'); }
      else { showToast('Notifications enabled! 🔔', 'success'); }
    }
  });

  // ── Replay tutorial ──
  document.getElementById('settings-replay-tutorial-btn')?.addEventListener('click', () => {
    clearOnboardingSeen();
    showScreen('onboarding-intro');
    initOnboardingScreen(() => showScreen('settings'));
  });

  // ── Misc ──
  document.getElementById('whatsapp-contact-btn')?.addEventListener('click', () =>
    window.open('https://wa.me/+2349167055488?text=Hi%20Admin%F0%9F%91%8B%2C%20I%20need%20Help%20With%20Scripture%20Quest', '_blank')
  );
  document.getElementById('levelup-close-btn')?.addEventListener('click', () =>
    document.getElementById('levelup-modal')?.classList.add('hidden')
  );
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', () =>
    document.getElementById('confirm-modal')?.classList.add('hidden')
  );
  document.getElementById('new-week-dismiss')?.addEventListener('click', () =>
    document.getElementById('new-week-banner')?.classList.add('hidden')
  );
  document.getElementById('go-profile-btn')?.addEventListener('click', () => showScreen('profile'));
  document.getElementById('lb-refresh-btn')?.addEventListener('click', initLeaderboardScreen);

  // ── Service Worker ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[SW] Registered:', reg.scope);
      reg.update();
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version — reloading…');
            w.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        });
      });
    }).catch(err => console.warn('[SW] Registration failed:', err));
  }
});

// ============================================================
// BATTLE FLOW (startBattle + renderBattleResult)
// ============================================================

async function startBattle(matchId, questions, match) {
  showScreen('battle');
  localStorage.setItem(PENDING_BATTLE_KEY, matchId);

  const { initBattleScreen } = await import('./pages/battle.page.js');
  initBattleScreen(matchId, questions, match, {
    onComplete: (result) => {
      localStorage.removeItem(PENDING_BATTLE_KEY);
      showScreen('battle-result');
      renderBattleResult(result);
    },
    onExit: () => showScreen('path')
  });
}

async function renderBattleResult(result) {
  const { initBattleResultScreen } = await import('./pages/battle-result.page.js');
  initBattleResultScreen(result, {
    onRematch: async (rematchCode) => {
      showToast(`⚔️ Rematch available! Code: ${rematchCode}`, 'success', 10000);
      showChallengeAcceptModal(rematchCode);
    },
    onBack: () => showScreen('path')
  });
}

// ============================================================
// REMATCH LISTENER
// ============================================================

function listenForRematchInvite(oldMatchId, onRematch) {
  let fired = false;
  const unsub = listenToMatch(oldMatchId, (match) => {
    if (fired) return;
    const rematchMsg = (match.messages || []).find(m => m.type === 'rematch' && m.rematchCode);
    if (rematchMsg) { fired = true; unsub(); onRematch({ code: rematchMsg.rematchCode, matchId: rematchMsg.rematchMatchId }); }
  });
  return unsub;
}

// ============================================================
// GLOBAL SQ NAMESPACE
// ============================================================

window.SQ = {
  switchAuthTab,
  openAuthModal,
  closeAuthModal,
  showConfirm,
  showScreen,
  showToast,
  openAvatarModal,
  closeAvatarModal,
  filterAvatars,
  selectAvatar,
  saveSelectedAvatar,
  closeChallengeModal,
  closeChallengeAcceptModal,
  acceptChallengeByCode,
  generateChallenge,
  openChallengeHub,
  challengeUser:             (uid, name) => handleChallengeUser(uid, name),
  directChallenge:           (uid, name) => handleDirectChallenge(uid, name),
  closeIncomingChallengeModal,
  cancelActiveChallenge,
  cancelMatchById,
  openDailyChallenge,
  closeDailyModal
};
