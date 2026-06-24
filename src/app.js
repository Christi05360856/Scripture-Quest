import { initAuthListener, login, register,
         logout, updateProfile_,
         resetPassword, getAuthErrorMessage } from './services/auth.service.js';
import { initTheme, setTheme, toggleTheme }   from './services/theme.service.js';
import { checkAndShowAnnouncements }           from './services/notification.service.js';
import { checkDailyLimit, loadQuizStateFromStorage,
         clearQuizStorage, createQuizSession,
         saveQuizStateToStorage, hasResumableQuiz } from './services/quiz.service.js';
import { createLocalQuizSession,
         submitLocalQuizSession }              from './services/localquiz.service.js';
import { fetchLeaderboard, subscribeLeaderboard,
         unsubscribeLeaderboard, renderLeaderboardRows,
         renderUserRank }                      from './services/leaderboard.service.js';
import { renderRewardTiers, renderRewardProgress,
         claimMilestoneReward, getSentMilestones } from './services/rewards.service.js';
import { setState, getState, getCurrentUser,
         getUserProfile, getUserStats, subscribe } from './state/store.js';
import { showToast }                           from './utils/toast.js';
import { getCurrentWeekId, getDisplayWeek,
         getTimeUntilNextWeek, formatCountdown } from './utils/week.js';
import { LAST_SEEN_WEEK, SCORE_PASS_THRESHOLD,
         PENDING_BATTLE_KEY }                  from './utils/constants.js';
import { AVATARS, mountAvatar, renderAvatarSVG } from './components/avatar.js';

import { createChallenge, getChallengeByCode, acceptChallenge,
         listenToMatch, getMatchResult, sendRematch,
         generateWhatsAppLink, getChallengeCodeFromURL,
         getUserMatches, getMatchByCode,
         clearChallengeFromURL } from './services/match.service.js';

import { saveAvatar, getAvatarId, getAvatarLabel } from './services/avatar.service.js';
import {
      shouldShowOnboarding,
      markOnboardingSeen,
      initOnboardingScreen,
      clearOnboardingSeen
    } from './pages/onboarding.page.js';
import {
      shouldShowNotificationGate,
      markNotificationGateSeen,
      initNotificationGateScreen
    } from './pages/notification-gate.page.js';
import { startPresenceHeartbeat, stopPresenceHeartbeat,
         subscribeToPresenceList, unsubscribePresenceList,
         getPresenceDotHtml }                  from './services/presence.service.js';

import { sendDirectChallenge, listenForIncomingChallenges,
         stopIncomingChallengeListener, acceptDirectChallenge,
         rejectDirectChallenge, listenForChallengeResponse,
         stopOutgoingChallengeListener }        from './services/challenge.service.js';

// =======================================
// MODULE-LEVEL STATE
// =======================================

let _localQuestions          = null;
let _quizPage                = null;
let _activeLocalSession      = null;
let _selectedAvatarId        = null;
let _pendingChallengeCode    = null;
let _currentChallenge        = null;
let _localQuestionsCache     = null;
let _activeChallengeMatchId  = null;
let _matchUnsubscribe        = null;
let _lbCountdownTimer        = null;
let _limitTimer              = null;
let _appUrl                  = window.location.origin;

let _incomingChallenge       = null;
let _challengeTimerInterval  = null;
let _outgoingChallengeId     = null;

// V5: Path / round / study page lazy loaders
let _pathPage        = null;
let _studyPage       = null;
let _roundPage       = null;
let _roundResultPage = null;

// V5: Path navigation state
let _currentRoundId  = null;
let _dailyLimitTimer = null;

// ============================================
// LAZY LOADERS
// ============================================

async function getLocalQuestions() {
  if (_localQuestions) return _localQuestions;
  try {
    const mod = await import('/src/questions.js');
    if (mod?.questions?.length) {
      _localQuestions = mod.questions;
      console.log('[Quiz] Loaded', _localQuestions.length, 'questions');
      return _localQuestions;
    }
  } catch (e) {
    console.warn('[Quiz] questions.js not found:', e.message);
  }
  _localQuestions = [];
  return _localQuestions;
}

async function getQuizPage() {
  if (!_quizPage) _quizPage = await import('./pages/quiz.page.js');
  return _quizPage;
}

async function getPathPage() {
  if (!_pathPage) _pathPage = await import('./pages/path.page.js');
  return _pathPage;
}

async function getStudyPage() {
  if (!_studyPage) _studyPage = await import('./pages/study.page.js');
  return _studyPage;
}

async function getRoundPage() {
  if (!_roundPage) _roundPage = await import('./pages/round.page.js');
  return _roundPage;
}

async function getRoundResultPage() {
  if (!_roundResultPage) _roundResultPage = await import('./pages/round-result.page.js');
  return _roundResultPage;
}

// ============================================
// SCREEN MANAGEMENT
// ============================================

const SCREENS = ['loading','landing','onboarding-intro','notification-gate','path','quiz','result',
                     'leaderboard','rewards','profile','settings',
                     'battle','battle-result','challenge',
                     'study','round','round-result',
                     'lesson-complete','unit-complete','section-complete'];

function showScreen(name) {
  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('hidden', id !== name);
  });

  const nav   = document.getElementById('bottom-nav');
  const noNav = ['loading','onboarding-intro','notification-gate','quiz','result','round','study',
                 'battle','battle-result','challenge'];
         
  if (nav) nav.classList.toggle('hidden', noNav.includes(name));

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  setState('nav', { current: name });

  const FAB_SCREENS = ['path', 'leaderboard'];
  setBattleFabVisible(FAB_SCREENS.includes(name));
  setDailyFabVisible(name === 'path');

  if (name === 'path')        initPathScreen();
  if (name === 'leaderboard') initLeaderboardScreen();
  if (name === 'rewards')     initRewardsScreen();
  if (name === 'profile')     initProfileScreen();
  if (name === 'landing')     initLandingScreen();
  if (name === 'settings')    initSettingsScreen();
  if (name === 'challenge')   initChallengeScreen();
}

// ============================================
// FAB HELPERS
// ============================================

function setBattleFabVisible(visible) {
  const fab = document.getElementById('battle-fab');
  if (!fab) return;
  // FIX (Item 4): FABs must never show before login,
  // no matter which screen is active.
  const shouldShow = visible && !!getCurrentUser();
  fab.classList.toggle('hidden', !shouldShow);
}

function setDailyFabVisible(visible) {
  const fab = document.getElementById('daily-challenge-fab');
  if (!fab) return;
  // FIX (Item 4): same guard as battle FAB.
  const shouldShow = visible && !!getCurrentUser();
  fab.classList.toggle('hidden', !shouldShow);
}


// ============================================
// CHALLENGE HUB MODAL
// ISSUE 1: Modal scroll fix. ISSUE 4: Cancel for any active challenge.
// ============================================

function openChallengeHub() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  const modalContent = document.querySelector('#challenge-create-modal .modal-content');
  if (modalContent) {
    modalContent.style.maxHeight    = 'calc(var(--vh, 1vh) * 85)';
    modalContent.style.overflowY    = 'auto';
    modalContent.style.overflowX    = 'hidden';
    modalContent.style.webkitOverflowScrolling = 'touch';
    modalContent.style.maxWidth     = '440px';
    modalContent.style.width        = '92vw';
    modalContent.style.margin       = '0 auto';
    modalContent.style.borderRadius = 'var(--radius-lg, 16px)';
    modalContent.style.paddingBottom = '24px';
  }

  _setVhUnit();

  const codeBox       = document.getElementById('challenge-code-box');
  const createActions = document.getElementById('challenge-create-actions');
  const shareActions  = document.getElementById('challenge-share-actions');

  const hasActiveChallenge = (_activeChallengeMatchId && _currentChallenge)
                           || (_outgoingChallengeId);

  if (hasActiveChallenge) {
    if (codeBox)       codeBox.classList.remove('hidden');
    if (createActions) createActions.classList.add('hidden');
    if (shareActions)  shareActions.classList.remove('hidden');
    const codeDisplay = document.getElementById('challenge-code-display');
    if (codeDisplay && _currentChallenge?.code) {
      codeDisplay.textContent = _currentChallenge.code;
    }
  } else {
    if (codeBox)       codeBox.classList.add('hidden');
    if (createActions) createActions.classList.remove('hidden');
    if (shareActions)  shareActions.classList.add('hidden');
  }

  document.getElementById('challenge-create-modal')?.classList.remove('hidden');

  _loadBattleHistoryIntoHub(user.uid);
}

function _setVhUnit() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function closeChallengeModal() {
  document.getElementById('challenge-create-modal')?.classList.add('hidden');
}

// ============================================
// BATTLE HISTORY - CARD STYLE (ISSUE 2 FIX)
// ============================================

async function _loadBattleHistoryIntoHub(uid) {
  const container = document.getElementById('challenge-hub-history');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:16px 0;color:var(--text-muted);font-size:13px;font-weight:600">
      <i class="fas fa-spinner fa-spin"></i> Loading battles…
    </div>`;

  try {
    const matches = await getUserMatches(uid);

    if (!matches.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:20px 0;color:var(--text-muted)">
          <div style="font-size:36px;margin-bottom:8px">⚔️</div>
          <p style="font-size:13px;font-weight:700">No battles yet!</p>
          <p style="font-size:12px;margin-top:4px">Challenge someone to get started.</p>
        </div>`;
      return;
    }

    const recent = matches.slice(0, 15);

    const cards = recent.map(m => {
      const isCreator = m.creatorId === uid;
      const oppName   = (isCreator ? m.opponentName : m.creatorName) || 'Opponent';
      const myPct     = isCreator ? m.creatorPct  : m.opponentPct;
      const oppPct    = isCreator ? m.opponentPct : m.creatorPct;

      let resultChip = '', resultColor = 'var(--text-muted)', resultBg = 'var(--bg-subtle)', resultBorder = 'var(--border)';

      if (m.status === 'completed') {
        const iWon   = m.winnerId === uid;
        const isDraw = m.winnerId === 'draw';
        if (isDraw) {
          resultChip = '🤝 Draw'; resultColor = '#6366f1'; resultBg = '#ede9fe'; resultBorder = '#c4b5fd';
        } else if (iWon) {
          resultChip = '🏆 Won'; resultColor = '#16a34a'; resultBg = '#dcfce7'; resultBorder = '#86efac';
        } else {
          resultChip = '😔 Lost'; resultColor = '#dc2626'; resultBg = '#fee2e2'; resultBorder = '#fca5a5';
        }
      } else if (m.status === 'pending' || m.status === 'waiting') {
        resultChip = '⏳ Pending'; resultColor = '#d97706'; resultBg = '#fef3c7'; resultBorder = '#fcd34d';
      } else if (m.status === 'active') {
        resultChip = '⚔️ Active'; resultColor = '#2563eb'; resultBg = '#dbeafe'; resultBorder = '#93c5fd';
      } else if (m.status === 'cancelled' || m.status === 'rejected') {
        resultChip = '✕ Cancelled';
      } else {
        resultChip = '—';
      }

      const score = (m.status === 'completed' && myPct !== null)
        ? `${myPct}% <span style="color:var(--text-muted);font-size:10px">vs</span> ${oppPct ?? '?'}%`
        : '<span style="color:var(--text-muted)">—</span>';

      const safeOpp = escapeHTML(oppName);
      const mId     = m.matchId || m.id || '';

      const canCancel = (m.status === 'active' || m.status === 'pending' || m.status === 'waiting') && mId;
      const cancelBtn = canCancel
        ? `<button
             onclick="window.SQ&&SQ.cancelMatchById('${mId}')"
             style="flex-shrink:0;background:var(--error,#ef4444);color:white;border:none;
                    border-radius:20px;padding:4px 10px;font-size:11px;font-weight:800;
                    cursor:pointer;font-family:inherit;margin-left:4px"
             title="Cancel this match">✕ Cancel</button>`
        : '';

      return `
        <div style="
          display:flex;align-items:center;gap:10px;
          padding:10px 12px;
          background:var(--bg-card,#fff);
          border:1px solid var(--border);
          border-radius:var(--radius-md,10px);
          margin-bottom:8px;
        ">
          <div style="width:36px;height:36px;border-radius:50%;
               background:var(--accent-warm-bg,#fef3c7);
               display:flex;align-items:center;justify-content:center;
               font-size:16px;flex-shrink:0">⚔️</div>

          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:800;color:var(--text-primary);
                 white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              vs ${safeOpp}
            </div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-top:2px">
              ${score}
            </div>
          </div>

          <div style="flex-shrink:0;padding:4px 10px;border-radius:20px;
               border:1px solid ${resultBorder};background:${resultBg};
               color:${resultColor};font-size:11px;font-weight:800;white-space:nowrap">
            ${resultChip}
          </div>

          ${cancelBtn}
        </div>`;
    }).join('');

    container.innerHTML = `
      <div style="margin-top:4px">
        <p style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">
          Recent Battles (${recent.length})
        </p>
        ${cards}
      </div>`;

  } catch (e) {
    container.innerHTML = `
      <div style="text-align:center;padding:12px 0;color:var(--text-muted);font-size:13px">
        Couldn't load history.
      </div>`;
    console.warn('[Hub] History load failed:', e.message);
  }
}

// ============================================
// SUBSCRIPTION HELPERS
// ============================================

function _unsubMatch() {
  if (_matchUnsubscribe) { _matchUnsubscribe(); _matchUnsubscribe = null; }
}

// ============================================
// AUTH LISTENER
// ============================================

// ============================================
// AUTH ROUTING HELPERS
// Sequence: Onboarding (once) → Notification Gate (once) → Path
// Each step calls the next via callback so the chain is explicit
// and easy to extend without nesting.
// ============================================

// Step 3 of 3 — final destination: path screen (or challenge accept if code present)
function _routeToApp() {
  const code = getChallengeCodeFromURL();
  if (code) {
    _pendingChallengeCode = code;
    clearChallengeFromURL();
    showScreen('path');
    setTimeout(() => showChallengeAcceptModal(code), 800);
  } else {
    showScreen('path');
  }
}

// Step 2 of 3 — notification gate (shown once per user lifetime, authenticated only)
function _routeAfterOnboarding() {
  if (shouldShowNotificationGate()) {
    showScreen('notification-gate');
    initNotificationGateScreen(() => {
      // markNotificationGateSeen() is already called inside the page module
      // before it fires this callback, so we just move on.
      _routeToApp();
    });
    return;
  }
  _routeToApp();
}

// Step 1 of 3 — onboarding (shown once per user lifetime)
function _routeAfterAuth() {
  if (shouldShowOnboarding()) {
    showScreen('onboarding-intro');
    initOnboardingScreen(() => {
      markOnboardingSeen();
      _routeAfterOnboarding();
    });
    return;
  }
  _routeAfterOnboarding();
}

initAuthListener(
  async (user, profile, stats) => {
    await initTheme(profile);
    checkNewWeek();
    checkAndShowAnnouncements().catch(e => console.warn('[Announce]', e.message));

    startPresenceHeartbeat();

    _clearStaleIncomingChallenge(user.uid).then(() => {
      listenForIncomingChallenges(user.uid, _handleIncomingChallengeSafely);
    });

    _checkPendingBattleResult(user).catch(e => console.warn('[PendingBattle]', e.message));

    // ── Route: Onboarding → Notification Gate → Path ──
    _routeAfterAuth();
  },
         
  () => {
    initTheme(null);
    setBattleFabVisible(false);
    setDailyFabVisible(false); 
    stopPresenceHeartbeat();
    stopIncomingChallengeListener();
    stopOutgoingChallengeListener();

    const code = getChallengeCodeFromURL();
    if (code) {
      _pendingChallengeCode = code;
      clearChallengeFromURL();
      localStorage.setItem('sq_pending_challenge', code);
    }

        // ── Onboarding for first-time anonymous visitors ──
    if (shouldShowOnboarding()) {
      showScreen('onboarding-intro');
      initOnboardingScreen(() => {
        markOnboardingSeen();
        showScreen('path');
      });
    } else {
      showScreen('path');
    }
    document.getElementById('auth-section')?.classList.remove('hidden');
    document.getElementById('welcome-section')?.classList.add('hidden');
    document.getElementById('path-auth-prompt')?.classList.remove('hidden');
    document.getElementById('path-content')?.classList.add('hidden');
    document.getElementById('path-skeleton')?.classList.add('hidden');
    document.getElementById('bottom-nav')?.classList.add('hidden');

    if (code) {
      setTimeout(() => {
        showToast('Sign in or register to accept the challenge!', 'info', 5000);
        openAuthModal();
      }, 600);
    }
  }
);

// ============================================
// ISSUE 5 FIX - Clear stale incoming challenge
// ============================================

async function _clearStaleIncomingChallenge(uid) {
  try {
    const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');

    const ref  = doc(db, 'incomingChallenges', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data      = snap.data();
    const expiresAt = data.expiresAt?.toMillis?.() || 0;
    const isExpired = expiresAt < Date.now();
    const isHandled = data.status !== 'pending';

    if (isExpired || isHandled) {
      await deleteDoc(ref).catch(() => {});
      console.log('[App] Cleared stale incoming challenge on login');
    }
  } catch (e) {
    console.warn('[App] Could not check stale challenge:', e.message);
  }
}

// ============================================
// ISSUE 5 FIX - Safe incoming challenge handler
// ============================================

function _handleIncomingChallengeSafely(challenge) {
  const now = Date.now();

  if (challenge.expiresAt && challenge.expiresAt < now) {
    console.log('[App] Ignoring expired incoming challenge');
    return;
  }

  const AGE_LIMIT = 4.5 * 60 * 1000;
  if (challenge.expiresAt && (challenge.expiresAt - now) < (300000 - AGE_LIMIT)) {
    console.log('[App] Incoming challenge too close to expiry, skipping');
    return;
  }

  showIncomingChallengeModal(challenge);
}

// ============================================
// PATH SCREEN (V5)
// ============================================

async function initPathScreen() {
  const user    = getCurrentUser();
  const profile = getUserProfile();
  const stats   = getUserStats();

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
      } catch (e) {
        xpEl.textContent = '0';
      }
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
  const sp = await getStudyPage();
  showScreen('study');
  sp.initStudyScreen(roundId, { onBeginRound: handleBeginRound, onBack: () => showScreen('path') });
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
    onNextRound:    async (nextRoundId) => { await handleRoundStart(nextRoundId); },
    onStudyAgain:   async (roundId)     => { await handleRoundStart(roundId); },
    onRetry:        async (roundId)     => { await handleBeginRound(roundId); },
    onBackToPath:   () => showScreen('path'),
    onLessonComplete:   (data) => { showScreen('lesson-complete'); initLessonCompleteScreen(data); },
    onUnitComplete:     (data) => { showScreen('unit-complete');   initUnitCompleteScreen(data); },
    onSectionComplete:  (data) => { showScreen('section-complete'); initSectionCompleteScreen(data); }
  });
}

function handleRoundQuit() {
  _currentRoundId = null;
  showScreen('path');
}

function initLessonCompleteScreen(data) {
  const el = id => document.getElementById(id);
  if (el('lesson-complete-title')) el('lesson-complete-title').textContent = 'Lesson Complete!';
  if (el('lesson-complete-sub'))   el('lesson-complete-sub').textContent   = data.passageRef  || '';
  if (el('lesson-complete-xp'))    el('lesson-complete-xp').textContent    = `+${data.xp || 100} XP`;
  if (el('lesson-complete-body'))  el('lesson-complete-body').textContent  = `You've mastered ${data.lessonTitle || 'this lesson'}. Keep going!`;

  const nextBtn = el('lesson-next-btn');
  const backBtn = el('lesson-back-path-btn');
  if (nextBtn) {
    const n = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(n, nextBtn);
    n.addEventListener('click', async () => {
      if (data.nextRoundId) { await handleRoundStart(data.nextRoundId); }
      else                  { showScreen('path'); }
    });
  }
  if (backBtn) {
    const b = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(b, backBtn);
    b.addEventListener('click', () => showScreen('path'));
  }
}

function initUnitCompleteScreen(data) {
  const el = id => document.getElementById(id);
  if (el('unit-complete-title')) el('unit-complete-title').textContent = 'Book Complete!';
  if (el('unit-complete-book'))  el('unit-complete-book').textContent  = data.bookTitle    || '';
  if (el('unit-complete-xp'))    el('unit-complete-xp').textContent    = `+${data.xp || 200} XP`;
  if (el('unit-complete-body'))  el('unit-complete-body').textContent  = `You've completed every lesson in ${data.bookTitle || 'this book'}. Outstanding work!`;

  const nextBtn = el('unit-next-btn');
  const backBtn = el('unit-back-path-btn');
  if (nextBtn) {
    const n = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(n, nextBtn);
    n.addEventListener('click', async () => {
      if (data.nextRoundId) { await handleRoundStart(data.nextRoundId); }
      else                  { showScreen('path'); }
    });
  }
  if (backBtn) {
    const b = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(b, backBtn);
    b.addEventListener('click', () => showScreen('path'));
  }
}

function initSectionCompleteScreen(data) {
  const el = id => document.getElementById(id);
  if (el('section-complete-title')) el('section-complete-title').textContent = 'Section Complete!';
  if (el('section-complete-name'))  el('section-complete-name').textContent  = data.sectionTitle || '';
  if (el('section-complete-xp'))    el('section-complete-xp').textContent    = `+${data.xp || 1000} XP`;
  if (el('section-complete-body'))  el('section-complete-body').textContent  = `You've mastered an entire division of the Bible. This is serious achievement.`;
  if (el('section-cert-name'))      el('section-cert-name').textContent      = data.sectionTitle || '';

  const nextBtn = el('section-next-btn');
  const backBtn = el('section-back-path-btn');
  if (nextBtn) {
    const n = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(n, nextBtn);
    n.addEventListener('click', async () => {
      if (data.nextRoundId) { await handleRoundStart(data.nextRoundId); }
      else                  { showScreen('path'); }
    });
  }
  if (backBtn) {
    const b = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(b, backBtn);
    b.addEventListener('click', () => showScreen('path'));
  }
}

// ============================================
// DAILY CHALLENGE MODAL
// ============================================

async function openDailyChallenge() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  const stats = getUserStats();
  const streakEl = document.getElementById('daily-modal-streak');
  if (streakEl) {
    const s = stats?.currentStreak || 0;
    streakEl.textContent = s > 0 ? `🔥 ${s}-day streak` : '🌱 No streak yet';
  }

  const ptsEl = document.getElementById('daily-modal-weekly-pts');
  if (ptsEl) {
    ptsEl.textContent = `${(stats?.weeklyPoints || 0).toLocaleString()} pts this week`;
  }

  const limit = await checkDailyLimit();
  const avail = document.getElementById('daily-modal-available');
  const lim   = document.getElementById('daily-modal-limit');
  const res   = document.getElementById('daily-modal-resume');

  if (res) res.classList.toggle('hidden', !hasResumableQuiz());

  if (limit.blocked) {
    avail?.classList.add('hidden');
    lim?.classList.remove('hidden');
    _startDailyModalCountdown(limit.nextQuizTime);
  } else {
    avail?.classList.remove('hidden');
    lim?.classList.add('hidden');
    const note = document.getElementById('daily-modal-attempts-note');
    if (note) {
      note.textContent = limit.remaining === 2
        ? '2 attempts remaining today'
        : '1 attempt remaining today';
    }
  }

  document.getElementById('daily-challenge-modal')?.classList.remove('hidden');
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

// ============================================
// LANDING SCREEN
// ============================================

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
  const el = id => document.getElementById(id);

  if (el('welcome-name'))   el('welcome-name').textContent   = firstName;
  if (el('welcome-sub'))    el('welcome-sub').textContent    = getMotivationalSub(stats);
  if (el('welcome-streak')) {
    const streak = stats?.currentStreak || 0;
    el('welcome-streak').textContent = streak > 0
      ? `🔥 ${streak}-day streak! Keep it going!`
      : '🌱 Start your streak today!';
  }

  if (!profile?.profileComplete && !profile?.phoneNumber) {
    el('profile-incomplete-warn')?.classList.remove('hidden');
  } else {
    el('profile-incomplete-warn')?.classList.add('hidden');
  }

  if (hasResumableQuiz()) {
    el('resume-section')?.classList.remove('hidden');
  } else {
    el('resume-section')?.classList.add('hidden');
  }

  const limit = await checkDailyLimit();
  if (limit.blocked) {
    el('quiz-available')?.classList.add('hidden');
    el('quiz-limit-reached')?.classList.remove('hidden');
    startLimitCountdown(limit.nextQuizTime);
  } else {
    el('quiz-available')?.classList.remove('hidden');
    el('quiz-limit-reached')?.classList.add('hidden');
    const badge = el('attempts-badge');
    if (badge) {
      badge.textContent = limit.remaining === 2
        ? '2 quizzes available today'
        : '1 quiz remaining today';
    }
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

// ============================================
// NEW WEEK CHECK
// ============================================

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

// ============================================
// PENDING BATTLE RESULT CHECK
// ============================================

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
  } catch (e) {
    console.warn('[App] Pending battle check failed:', e.message);
  }
}

// ============================================
// LEADERBOARD SCREEN
// ISSUE 3: Buttons start in checking state; presence patches ALL rows.
// ============================================

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
    const prizeHTML = rank <= 3
      ? `<span class="badge badge-reward" style="font-size:10px;padding:2px 8px">🏆 Prize</span>`
      : '';
    const streakHTML = entry.streak
      ? `<span style="font-size:12px;color:var(--accent-warm);font-weight:700">🔥${entry.streak}</span>`
      : '';
    const safeName = (entry.displayName || 'Anonymous').replace(/'/g, "\'");

    return `
      <div class="lb-row ${isSelf ? 'lb-row--me' : ''}" data-lb-uid="${uid}" data-rank="${rank}">
        <div class="lb-rank">${medal}</div>
        <div class="lb-name">
          <span>${escapeHTML(entry.displayName || entry.name || 'Anonymous')}</span>
          ${prizeHTML}
          ${streakHTML}
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

    const dotSlot = row.querySelector('.lb-presence-slot');
    if (dotSlot) {
      dotSlot.innerHTML = getPresenceDotHtml(isOnline);
    }

    const btn = row.querySelector('.lb-challenge-btn');
    if (btn) {
      btn.disabled = !isOnline;
      btn.title    = isOnline
        ? `Challenge ${entry.displayName || 'Opponent'} — Online now!`
        : `${entry.displayName || 'Opponent'} is offline`;
      btn.style.opacity = isOnline ? '1' : '0.4';
    }
  });
}

// ============================================
// REWARDS SCREEN
// ============================================

async function initRewardsScreen() {
  const user  = getCurrentUser();
  const stats = getUserStats();
  if (!user || !stats) return;

  const points = stats.totalXp || 0;
  const ptEl   = document.getElementById('rewards-points');
  if (ptEl) ptEl.textContent = points.toLocaleString();

  renderRewardProgress(
    document.getElementById('rewards-progress-fill'),
    document.getElementById('rewards-next-milestone'),
    points
  );

  const sent = await getSentMilestones(user.uid);
  renderRewardTiers(
    document.getElementById('reward-tiers-container'),
    points, [], sent,
    async (threshold, rewardType) => {
      try {
        await claimMilestoneReward(threshold, rewardType);
        showToast("Reward claimed! We'll be in touch.", 'success');
        initRewardsScreen();
      } catch (err) { showToast(err.message, 'error'); }
    }
  );
}

// ============================================
// PROFILE SCREEN
// ============================================

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
      `Joined ${d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`;
  }

  const contactSection = el('contact-edit-section');
  const contactDisplay = el('contact-display-section');

  if (profile?.profileComplete && profile?.phoneNumber) {
    contactSection?.classList.add('hidden');
    if (contactDisplay) {
      contactDisplay.classList.remove('hidden');
      const dispPhone   = el('contact-display-phone');
      const dispNetwork = el('contact-display-network');
      if (dispPhone)   dispPhone.textContent   = profile.phoneNumber || '—';
      if (dispNetwork) dispNetwork.textContent = profile.networkProvider || '—';
    }
  } else {
    contactSection?.classList.remove('hidden');
    contactDisplay?.classList.add('hidden');
    if (el('profile-phone'))   el('profile-phone').value   = profile?.phoneNumber || '';
    if (el('profile-network')) el('profile-network').value = profile?.networkProvider || '';
  }

  const safeStats = stats || {
    totalXp: 0, level: 1, currentLevelXp: 0,
    currentStreak: 0, longestStreak: 0,
    quizzesTaken: 0, bestScore: 0, perfectScores: 0, topThreeFinishes: 0
  };

  const xp      = safeStats.totalXp     || 0;
  const level   = safeStats.level       || 1;
  const needed  = Math.ceil(100 * Math.pow(level, 1.5));
  const current = safeStats.currentLevelXp || 0;
  const pct     = Math.min(100, Math.round((current / needed) * 100));

  if (el('p-total-xp'))       el('p-total-xp').textContent       = xp.toLocaleString();
  if (el('p-level'))          el('p-level').textContent           = level;
  if (el('p-streak'))         el('p-streak').textContent          = safeStats.currentStreak  || 0;
  if (el('p-quizzes'))        el('p-quizzes').textContent         = safeStats.quizzesTaken   || 0;
  if (el('p-best'))           el('p-best').textContent            = `${safeStats.bestScore   || 0}%`;
  if (el('p-longest-streak')) el('p-longest-streak').textContent  = safeStats.longestStreak  || 0;
  if (el('p-lvl-current'))    el('p-lvl-current').textContent     = level;
  if (el('p-xp-current'))     el('p-xp-current').textContent      = current.toLocaleString();
  if (el('p-xp-needed'))      el('p-xp-needed').textContent       = needed.toLocaleString();
  if (el('p-xp-fill'))        el('p-xp-fill').style.width         = `${pct}%`;
  if (el('p-lvl-next'))       el('p-lvl-next').textContent        = level + 1;
  if (el('p-xp-needed-2'))    el('p-xp-needed-2').textContent     = needed.toLocaleString();

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
  document.getElementById('profile-tab-stats')?.classList.toggle('hidden',
    tab !== 'stats');
  document.getElementById('profile-tab-achievements')?.classList.toggle('hidden',
    tab !== 'achievements');
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
    { id:'first_quiz', icon:'📖', tier:'bronze',    crown:'🥉', name:'First Steps',      req:'Complete your first quiz',   done:quizzes>=1,   progress:Math.min(100,(quizzes/1)*100) },
    { id:'streak3',    icon:'🔥', tier:'bronze',    crown:'🥉', name:'On Fire',           req:'3-day streak',               done:streak>=3,    progress:Math.min(100,(streak/3)*100) },
    { id:'perfect1',   icon:'💯', tier:'bronze',    crown:'🥉', name:'Perfectionist',     req:'Score 100% once',            done:perfect>=1,   progress:Math.min(100,(perfect/1)*100) },
    { id:'xp500',      icon:'⭐', tier:'bronze',    crown:'🥉', name:'XP Rising',         req:'Earn 500 XP',                done:xp>=500,      progress:Math.min(100,(xp/500)*100) },
    { id:'quiz10',     icon:'📚', tier:'silver',    crown:'🥈', name:'Dedicated',         req:'Complete 10 quizzes',        done:quizzes>=10,  progress:Math.min(100,(quizzes/10)*100) },
    { id:'streak7',    icon:'🌟', tier:'silver',    crown:'🥈', name:'Week Warrior',      req:'7-day streak',               done:streak>=7,    progress:Math.min(100,(streak/7)*100) },
    { id:'perfect3',   icon:'🎯', tier:'silver',    crown:'🥈', name:'Sharp Mind',        req:'3 perfect scores',           done:perfect>=3,   progress:Math.min(100,(perfect/3)*100) },
    { id:'xp2000',     icon:'💫', tier:'silver',    crown:'🥈', name:'XP Grinder',        req:'Earn 2,000 XP',              done:xp>=2000,     progress:Math.min(100,(xp/2000)*100) },
    { id:'quiz50',     icon:'🎓', tier:'gold',      crown:'🥇', name:'Bible Scholar',     req:'Complete 50 quizzes',        done:quizzes>=50,  progress:Math.min(100,(quizzes/50)*100) },
    { id:'streak30',   icon:'🔆', tier:'gold',      crown:'🥇', name:'Monthly Champion',  req:'30-day streak',              done:streak>=30,   progress:Math.min(100,(streak/30)*100) },
    { id:'top3',       icon:'🏆', tier:'gold',      crown:'🥇', name:'Podium Finisher',   req:'Finish Top 3 weekly',        done:top3>=1,      progress:Math.min(100,(top3/1)*100) },
    { id:'xp10000',    icon:'💎', tier:'gold',      crown:'🥇', name:'XP Master',         req:'Earn 10,000 XP',             done:xp>=10000,    progress:Math.min(100,(xp/10000)*100) },
    { id:'quiz100',    icon:'👑', tier:'legendary', crown:'✨', name:'Legend',            req:'Complete 100 quizzes',       done:quizzes>=100, progress:Math.min(100,(quizzes/100)*100) },
    { id:'streak100',  icon:'🚀', tier:'legendary', crown:'✨', name:'Unstoppable',       req:'100-day streak',             done:streak>=100,  progress:Math.min(100,(streak/100)*100) },
    { id:'perfect10',  icon:'🌠', tier:'legendary', crown:'✨', name:'Flawless Master',   req:'10 perfect scores',          done:perfect>=10,  progress:Math.min(100,(perfect/10)*100) },
    { id:'xp20000',    icon:'⚡', tier:'legendary', crown:'✨', name:'XP Legend',         req:'Earn 20,000 XP',             done:xp>=20000,    progress:Math.min(100,(xp/20000)*100) }
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
    if (best) {
      featuredEl.innerHTML = `${best.icon} ${best.name}`;
      featuredEl.classList.remove('hidden');
    }
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

// ============================================
// SETTINGS SCREEN
// ============================================

function initSettingsScreen() {
  const profile = getUserProfile();
  const theme   = getState('theme')?.current || 'light';

  const darkToggle = document.getElementById('setting-dark-mode');
  if (darkToggle) darkToggle.checked = theme === 'dark';

  const soundToggle = document.getElementById('setting-sound');
  if (soundToggle) soundToggle.checked = profile?.soundEnabled !== false;

  const notifToggle = document.getElementById('setting-notifications');
  if (notifToggle) notifToggle.checked = Notification?.permission === 'granted';
}

// ============================================
// QUIZ FLOW
// ============================================

async function handleStartQuiz(resume = false) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  const startBtn = document.getElementById('start-quiz-btn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting…';
  }

  try {
    let sessionData;

    if (resume) {
      sessionData = loadQuizStateFromStorage();
      if (!sessionData) {
        showToast('No resumable quiz found. Starting fresh.', 'info');
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz';
        }
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
        ? (sid, answers) =>
            submitLocalQuizSession(sid, answers, _activeLocalSession.questions)
        : null
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz';
    }
  }
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

// ============================================
// RESULT SCREEN
// ============================================

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
  if (el('r-streak'))       el('r-streak').textContent       = result.streak       || 0;
  if (el('r-level'))        el('r-level').textContent        = result.newLevel     || 1;
  if (el('r-total-xp'))     el('r-total-xp').textContent     = (result.totalXp || 0).toLocaleString();
  if (el('r-weekly-pts'))   el('r-weekly-pts').textContent   = (result.weeklyPoints || 0).toLocaleString();

  const badge = el('result-badge');
  if (badge) {
    badge.textContent = passed ? '✅ Passed' : '❌ Try Again';
    badge.className   = `score-badge ${passed ? 'pass' : 'fail'}`;
  }

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
    if (box && text) {
      text.textContent = result.achievementUnlocks.join(', ');
      box.classList.remove('hidden');
    }
  }

  const tip = el('study-tip');
  if (tip && pct < 60) {
    tip.textContent =
      '💡 Tip: Regular daily reading improves your quiz scores significantly!';
    tip.classList.remove('hidden');
  }

  renderResultChart(
    result.score || 0,
    (result.totalQuestions || 15) - (result.score || 0)
  );

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
      datasets: [{
        data: [correct, wrong],
        backgroundColor: ['#22c55e','#ef4444'],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDark ? '#9fa8da' : '#64748b',
            font: { weight:'700', family:'Nunito' },
            padding: 16
          }
        }
      },
      animation: { animateScale: true, duration: 700 }
    }
  });
}

// ============================================
// AUTH MODAL
// ============================================

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
  document.getElementById('register-form')?.classList.toggle('hidden', isLogin);
  document.getElementById('tab-login')?.classList.toggle('active',     isLogin);
  document.getElementById('tab-register')?.classList.toggle('active', !isLogin);
}

// ============================================
// CONFIRM MODAL
// ============================================

function showConfirm({ icon='⚠️', title, message, onConfirm }) {
  const modal = document.getElementById('confirm-modal');
  const el    = id => document.getElementById(id);
  if (el('confirm-icon'))    el('confirm-icon').textContent    = icon;
  if (el('confirm-title'))   el('confirm-title').textContent   = title;
  if (el('confirm-message')) el('confirm-message').textContent = message;
  modal?.classList.remove('hidden');
  const okBtn = el('confirm-ok-btn');
  const newOk = okBtn?.cloneNode(true);
  okBtn?.parentNode.replaceChild(newOk, okBtn);
  newOk?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    onConfirm?.();
  });
}

// ============================================
// INCOMING CHALLENGE MODAL (ISSUE 5 FIX)
// ============================================

function showIncomingChallengeModal(challenge) {
  _incomingChallenge = challenge;

  showToast(
    `⚔️ ${challenge.challengerName || 'Someone'} challenged you to a battle!`,
    'info',
    8000
  );

  let overlay = document.getElementById('incoming-challenge-overlay');

  if (!overlay) {
    console.warn('[App] #incoming-challenge-overlay not found — creating dynamically');
    overlay = _createIncomingChallengeOverlay();
    document.body.appendChild(overlay);
  }

  const nameEl  = overlay.querySelector('#incoming-challenger-name') ||
                  overlay.querySelector('.incoming-challenger-name');
  const timerEl = overlay.querySelector('#incoming-challenge-timer') ||
                  overlay.querySelector('.incoming-challenge-timer');

  if (nameEl) nameEl.textContent = challenge.challengerName || 'Someone';

  if (_challengeTimerInterval) clearInterval(_challengeTimerInterval);

  function updateTimer() {
    const remaining = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000));
    if (timerEl) {
      timerEl.textContent = remaining > 0
        ? `⏰ ${remaining}s to respond`
        : '⏰ Challenge expired';
    }
    if (remaining <= 0) {
      clearInterval(_challengeTimerInterval);
      closeIncomingChallengeModal();
    }
  }
  updateTimer();
  _challengeTimerInterval = setInterval(updateTimer, 1000);

  overlay.style.zIndex = '99999';
  overlay.classList.remove('hidden');
}

function _createIncomingChallengeOverlay() {
  const div = document.createElement('div');
  div.id = 'incoming-challenge-overlay';
  div.className = 'incoming-challenge-overlay';
  div.innerHTML = `
    <div class="incoming-challenge-card" style="
      background:var(--bg-primary, #fff);
      border-radius:var(--radius-xl, 20px);
      padding:32px 24px;
      max-width:360px;
      width:90vw;
      text-align:center;
      box-shadow:0 20px 60px rgba(0,0,0,0.3);
    ">
      <div style="font-size:52px;margin-bottom:12px">⚔️</div>
      <div class="incoming-challenger-name" id="incoming-challenger-name"
           style="font-size:20px;font-weight:900;color:var(--text-primary);margin-bottom:6px">
        Someone
      </div>
      <div style="font-size:14px;color:var(--text-muted);margin-bottom:16px">
        challenged you to a Bible quiz battle!
      </div>
      <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
        <p>⏱️ 15 questions, under 3 minutes</p>
        <p style="margin-top:4px">🏆 Winner gets +50 XP</p>
      </div>
      <div class="incoming-challenge-timer" id="incoming-challenge-timer"
           style="font-size:18px;font-weight:800;color:var(--accent-primary);margin-bottom:20px">
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button id="incoming-accept-btn" class="btn-primary btn-full"
                style="font-size:16px;padding:16px">
          ⚔️ Accept Challenge!
        </button>
        <button id="incoming-reject-btn" class="btn-secondary btn-full">
          Maybe Later
        </button>
      </div>
    </div>`;

  div.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background:rgba(0,0,0,0.6);
    display:flex; align-items:center; justify-content:center;
    padding:20px; backdrop-filter:blur(4px);
  `;

  div.querySelector('#incoming-accept-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const btn = div.querySelector('#incoming-accept-btn');
    btn.disabled    = true;
    btn.textContent = 'Accepting…';
    try {
      const { matchId, questions, match } = await acceptDirectChallenge(_incomingChallenge.matchId);
      closeIncomingChallengeModal();
      showToast('Challenge accepted! Starting battle… ⚔️', 'success', 2000);
      await startBattle(matchId, questions, match);
    } catch (err) {
      showToast(err.message || 'Failed to accept challenge', 'error');
      btn.disabled    = false;
      btn.textContent = '⚔️ Accept Challenge!';
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
  if (_challengeTimerInterval) {
    clearInterval(_challengeTimerInterval);
    _challengeTimerInterval = null;
  }
  document.getElementById('incoming-challenge-overlay')?.classList.add('hidden');
  _incomingChallenge = null;
}

// ============================================
// DIRECT CHALLENGE FROM LEADERBOARD (ISSUE 4 FIX)
// ============================================

async function handleDirectChallenge(targetUid, targetName) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (targetUid === user.uid) {
    showToast("You can't challenge yourself!", 'error');
    return;
  }

  if (_outgoingChallengeId) {
    showToast(
      'You already have a pending challenge. Cancel it first or wait for a response.',
      'warning',
      4000
    );
    return;
  }

  if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();
  if (!_localQuestionsCache.length) {
    showToast('No questions available. Try again shortly.', 'error');
    return;
  }

  _showChallengePendingOverlay(targetName);

  try {
    const result = await sendDirectChallenge(targetUid, targetName, _localQuestionsCache);
    _outgoingChallengeId = result.matchId;

    const pendingName = document.getElementById('challenge-pending-name');
    if (pendingName)
      pendingName.textContent = `Waiting for ${targetName} to respond…`;

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
  const overlay = document.getElementById('challenge-pending-overlay');
  const nameEl  = document.getElementById('challenge-pending-name');
  if (nameEl) nameEl.textContent = `Challenge sent to ${targetName}…`;
  overlay?.classList.remove('hidden');
}

function _hideChallengePendingOverlay() {
  document.getElementById('challenge-pending-overlay')?.classList.add('hidden');
  _outgoingChallengeId = null;
}

// ============================================
// EVENT WIRING
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  window.addEventListener('resize', _setVhUnit);
  _setVhUnit();

  document.getElementById('battle-fab')?.addEventListener('click', openChallengeHub);

  document.getElementById('generate-challenge-btn')?.addEventListener('click', generateChallenge);
  document.getElementById('challenge-modal-close-btn')?.addEventListener('click', closeChallengeModal);
  document.getElementById('challenge-cancel-btn')?.addEventListener('click', cancelActiveChallenge);

  document.getElementById('challenge-accept-modal-close-btn')
    ?.addEventListener('click', closeChallengeAcceptModal);
  document.getElementById('accept-challenge-btn')
    ?.addEventListener('click', acceptChallengeByCode);

  function _handleJoinByCode(inputId, btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const input   = document.getElementById(inputId);
      const rawCode = input?.value?.trim() || '';
      const code    = rawCode.replace(/:\d+$/, '').toUpperCase();
      if (!code || !code.startsWith('SQ-')) {
        showToast('Enter a valid challenge code (e.g. SQ-AB12)', 'error');
        return;
      }
      const originalText = btn.innerHTML;
      btn.disabled  = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining…';
      try {
        const matchData = await getChallengeByCode(code);
        if (!matchData)
          throw new Error('Challenge not found. Check the code and try again.');
        if (matchData.status !== 'waiting')
          throw new Error('This challenge is no longer available.');
        if (matchData.creatorId === getCurrentUser()?.uid)
          throw new Error("You can't join your own challenge!");
        const { matchId, questions } = await acceptChallenge(matchData.matchId);
        closeChallengeModal();
        showToast('Challenge accepted! Battle starting… ⚔️', 'success', 2000);
        await startBattle(matchId, questions, { ...matchData, questions });
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled  = false;
        btn.innerHTML = originalText;
      }
    });

    document.getElementById(inputId)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById(btnId)?.click();
    });
  }

  _handleJoinByCode('lb-join-code-input',  'lb-join-code-btn');
  _handleJoinByCode('hub-join-code-input', 'hub-join-code-btn');

  document.getElementById('incoming-accept-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const btn = document.getElementById('incoming-accept-btn');
    btn.disabled    = true;
    btn.textContent = 'Accepting…';
    try {
      const { matchId, questions, match } =
        await acceptDirectChallenge(_incomingChallenge.matchId);
      closeIncomingChallengeModal();
      showToast('Challenge accepted! Starting battle… ⚔️', 'success', 2000);
      await startBattle(matchId, questions, match);
    } catch (err) {
      showToast(err.message || 'Failed to accept challenge', 'error');
      btn.disabled    = false;
      btn.textContent = '⚔️ Accept Challenge!';
    }
  });

  document.getElementById('incoming-reject-btn')?.addEventListener('click', async () => {
    if (!_incomingChallenge) return;
    const user = getCurrentUser();
    await rejectDirectChallenge(_incomingChallenge.matchId, user.uid);
    closeIncomingChallengeModal();
    showToast('Challenge declined.', 'info', 2000);
  });

  document.getElementById('challenge-pending-cancel')?.addEventListener('click', () => {
    _cancelOutgoingDirectChallenge();
  });

  document.getElementById('daily-challenge-fab')?.addEventListener('click', openDailyChallenge);

   // ── Password visibility toggles ──
  document.getElementById('login-password-toggle')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const btn = document.getElementById('login-password-toggle');
    if (!input || !btn) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.innerHTML = `<i class="fas fa-eye${isHidden ? '-slash' : ''}"></i>`;
  });

  document.getElementById('reg-password-toggle')?.addEventListener('click', () => {
    const input = document.getElementById('reg-password');
    const btn = document.getElementById('reg-password-toggle');
    if (!input || !btn) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.innerHTML = `<i class="fas fa-eye${isHidden ? '-slash' : ''}"></i>`;
  });
         
         

  document.getElementById('daily-modal-start-btn')?.addEventListener('click', () => {
    closeDailyModal();
    handleStartQuiz(false);
  });
  document.getElementById('daily-modal-resume-btn')?.addEventListener('click', () => {
    closeDailyModal();
    handleStartQuiz(true);
  });
  document.getElementById('daily-modal-close-btn')?.addEventListener('click', closeDailyModal);

  document.getElementById('open-auth-btn')?.addEventListener('click', openAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAuthModal();
  });

  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    const pass  = document.getElementById('login-password')?.value;
    if (!email || !pass) return showAuthMessage('Please fill in all fields');
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Signing in…'; clearAuthMessage();
    try {
      await login({ email, password: pass });
      closeAuthModal();
      const pending = localStorage.getItem('sq_pending_challenge');
      if (pending) {
        localStorage.removeItem('sq_pending_challenge');
        setTimeout(() => showChallengeAcceptModal(pending), 500);
      }
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  });

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
      showToast(`Welcome to ScriptureQuest, ${name.split(' ')[0]}! 🎉`, 'success', 4000);
      const pending = localStorage.getItem('sq_pending_challenge');
      if (pending) {
        localStorage.removeItem('sq_pending_challenge');
        setTimeout(() => showChallengeAcceptModal(pending), 1200);
      }
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  });

  document.getElementById('forgot-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) return showAuthMessage('Enter your email above first');
    try {
      await resetPassword(email);
      showAuthMessage('Reset email sent! Check your inbox.', 'success');
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
    }
  });

  ['login-email','login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-btn')?.click();
    });
  });

  document.getElementById('start-quiz-btn')?.addEventListener('click',
    () => handleStartQuiz(false));
  document.getElementById('resume-quiz-btn')?.addEventListener('click',
    () => handleStartQuiz(true));

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (!target) return;
      if (!['path','settings'].includes(target) && !getCurrentUser()) {
        openAuthModal();
        return;
      }
      if (getState('nav')?.current === 'leaderboard' && target !== 'leaderboard') {
        unsubscribeLeaderboard();
        unsubscribePresenceList();
        if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
      }
      if (target === 'battle') {
        openChallengeHub();
        return;
      }
      showScreen(target);
    });
  });

  document.getElementById('view-leaderboard-btn')
    ?.addEventListener('click', () => showScreen('leaderboard'));
  document.getElementById('back-home-btn')
    ?.addEventListener('click', () => showScreen('path'));

  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab));
  });

  document.getElementById('save-contact-btn')?.addEventListener('click', async () => {
    const user    = getCurrentUser();
    const phone   = document.getElementById('profile-phone')?.value.trim();
    const network = document.getElementById('profile-network')?.value;
    const btn     = document.getElementById('save-contact-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await updateProfile_({ uid: user.uid, phone, network });
      showToast("Contact info saved! You're now eligible for rewards. ✅", 'success');
      const { fetchUserData } = await import('./services/auth.service.js');
      const { profile, stats } = await fetchUserData(user.uid);
      const { setState: _setState } = await import('./state/store.js');
      _setState('auth', { user, profile, stats, ready: true, loading: false });
      initProfileScreen();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
    }
  });

  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      initProfileScreen();
    });
  });

  ['quiz-theme-toggle','lb-theme-toggle'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', toggleTheme);
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    showConfirm({
      icon: '👋', title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      onConfirm: async () => { await logout(); showScreen('path'); }
    });
  });

  document.getElementById('setting-dark-mode')?.addEventListener('change', e => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });

  document.getElementById('setting-sound')?.addEventListener('change', async e => {
    const user = getCurrentUser();
    if (!user) return;
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');
    await updateDoc(doc(db, 'users', user.uid), { soundEnabled: e.target.checked });
  });

  document.getElementById('setting-notifications')?.addEventListener('change', async e => {
    if (e.target.checked) {
      const { requestPushPermission } =
        await import('./services/notification.service.js');
      const result = await requestPushPermission();
      if (!result.granted) {
        e.target.checked = false;
        showToast(
          'Notification permission denied. Enable it in your browser settings.',
          'warning'
        );
      } else {
        showToast('Notifications enabled! 🔔', 'success');
      }
    }
  });

  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    showConfirm({
      icon: '👋', title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      onConfirm: async () => { await logout(); showScreen('path'); }
    });
  });

           // ── Replay Tutorial ──
  document.getElementById('settings-replay-tutorial-btn')?.addEventListener('click', () => {
    clearOnboardingSeen();
    showScreen('onboarding-intro');
    initOnboardingScreen(() => {
      showScreen('settings');
    });
  });
         
  document.getElementById('whatsapp-contact-btn')?.addEventListener('click', () => {
    window.open(
      'https://wa.me/+2349167055488?text=Hi%20Admin%F0%9F%91%8B%2C%20I%20need%20Help%20With%20Scripture%20Quest',
      '_blank'
    );
  });

  document.getElementById('levelup-close-btn')?.addEventListener('click', () => {
    document.getElementById('levelup-modal')?.classList.add('hidden');
  });

  document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-modal')?.classList.add('hidden');
  });

  document.getElementById('new-week-dismiss')?.addEventListener('click', () => {
    document.getElementById('new-week-banner')?.classList.add('hidden');
  });

  document.getElementById('go-profile-btn')?.addEventListener('click',
    () => showScreen('profile'));
  document.getElementById('lb-refresh-btn')?.addEventListener('click',
    () => initLeaderboardScreen());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('[SW] Registered:', registration.scope);
      registration.update();
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available — reloading...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        });
      });
    }).catch(err => console.warn('[SW] Registration failed:', err));
  }
});

// ============================================
// CHALLENGE SYSTEM
// ============================================

async function generateChallenge() {
  if (_activeChallengeMatchId) {
    showToast(
      'You already have an active challenge! Wait for your opponent to accept.',
      'warning'
    );
    return;
  }

  const btn = document.getElementById('generate-challenge-btn');
  if (!btn) return;
  btn.disabled    = true;
  btn.textContent = 'Generating…';

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
    const name    = profile?.displayName || 'Someone';
    const waLink  = generateWhatsAppLink(
      result.code, name, _appUrl + window.location.pathname
    );
    const waBtn = document.getElementById('whatsapp-share-btn');
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
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Challenge Link';
  }
}

function cancelActiveChallenge() {
  if (_activeChallengeMatchId) {
    _unsubMatch();
    _activeChallengeMatchId = null;
    _currentChallenge       = null;
  }

  if (_outgoingChallengeId) {
    _cancelOutgoingDirectChallenge();
    return;
  }

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
        updateDoc(doc(db, 'matches', matchId), {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        }).catch(e => console.warn('[App] Cancel challenge write failed:', e.message));
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
  btn.disabled    = true;
  btn.textContent = 'Accepting…';

  try {
    const matchData = await getChallengeByCode(code);
    if (!matchData)
      throw new Error('Challenge not found. Check the code and try again.');
    if (matchData.status !== 'waiting')
      throw new Error('This challenge is no longer available.');
    if (matchData.creatorId === getCurrentUser()?.uid)
      throw new Error("You can't accept your own challenge!");

    const { matchId, questions } = await acceptChallenge(matchData.matchId);
    closeChallengeAcceptModal();
    showToast('Challenge accepted! Good luck! ⚔️', 'success', 3000);
    await startBattle(matchId, questions, { ...matchData, questions });
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-fist-raised"></i> Accept Challenge!';
  }
}

function initChallengeScreen() {
  showScreen('landing');
  openChallengeHub();
}

async function handleChallengeUser(opponentUid, opponentName) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (opponentUid === user.uid) {
    showToast("You can't challenge yourself!", 'error');
    return;
  }

  showToast(`⚔️ Creating battle with ${opponentName}…`, 'info', 2000);

  try {
    if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();
    const result = await createChallenge(_localQuestionsCache);

    _activeChallengeMatchId = result.matchId;
    _currentChallenge       = { ...result, targetUid: opponentUid, targetName: opponentName };

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

    document.getElementById('challenge-create-modal')?.classList.remove('hidden');
    showToast(
      `Challenge code: ${result.code} — share it with ${opponentName}!`,
      'success', 5000
    );

    _loadBattleHistoryIntoHub(user.uid);

    _unsubMatch();
    _matchUnsubscribe = listenToMatch(result.matchId, async match => {
      if (match.status === 'active' && match.opponentId) {
        _unsubMatch();
        _activeChallengeMatchId = null;
        closeChallengeModal();
        showToast(
          `${match.opponentName} accepted! Starting battle… ⚔️`, 'success', 3000
        );
        setTimeout(() => startBattle(result.matchId, match.questions, match), 1200);
      }
    });
  } catch (err) {
    showToast(err.message || 'Failed to create challenge', 'error');
  }
}

// ============================================
// BATTLE
// ============================================

async function startBattle(matchId, questions, match) {
  setBattleFabVisible(false);
  const battlePage = await import('./pages/battle.page.js');
  battlePage.destroyBattleScreen();
  showScreen('battle');
  await battlePage.initBattleScreen(matchId, questions, match, {
    onComplete: handleBattleComplete
  });
}

async function handleBattleComplete(match) {
  setBattleFabVisible(false);
  _activeChallengeMatchId = null;
  _unsubMatch();

  showScreen('battle-result');
  renderBattleResult(match);

  const battlePage = await import('./pages/battle.page.js');
  battlePage.destroyBattleScreen();
}

// ============================================
// BATTLE RESULT
// ============================================

function renderBattleResult(match) {
  const user      = getCurrentUser();
  const isCreator = match.creatorId === user?.uid;
  const myName    = isCreator ? match.creatorName    : match.opponentName;
  const oppName   = isCreator ? match.opponentName   : match.creatorName;
  const myPct     = isCreator ? match.creatorPct     : match.opponentPct;
  const oppPct    = isCreator ? match.opponentPct    : match.creatorPct;
  const myScore   = isCreator ? match.creatorScore   : match.opponentScore;
  const oppScore  = isCreator ? match.opponentScore  : match.creatorScore;
  const myAvatar  = isCreator ? match.creatorAvatar  : match.opponentAvatar;
  const oppAvatar = isCreator ? match.opponentAvatar : match.creatorAvatar;
  const total     = match.questions?.length || 15;
  const winnerId  = match.winnerId;
  const iWon      = winnerId === user?.uid;
  const isDraw    = winnerId === 'draw';

  const el = id => document.getElementById(id);
  if (el('battle-result-icon'))      el('battle-result-icon').textContent      = isDraw ? '🤝' : iWon ? '🏆' : '😔';
  if (el('battle-result-title'))     el('battle-result-title').textContent     = isDraw ? "It's a Draw!" : iWon ? 'You Win! 🎉' : 'You Lost!';
  if (el('battle-result-sub'))       el('battle-result-sub').textContent       = isDraw ? 'Well played by both!' : iWon ? `You beat ${oppName}!` : `${oppName} got you this time!`;
  if (el('battle-result-my-name'))   el('battle-result-my-name').textContent   = myName  || 'You';
  if (el('battle-result-my-pct'))    el('battle-result-my-pct').textContent    = `${myPct  || 0}%`;
  if (el('battle-result-my-score'))  el('battle-result-my-score').textContent  = `${myScore || 0}/${total}`;
  if (el('battle-result-opp-name'))  el('battle-result-opp-name').textContent  = oppName || 'Opponent';
  if (el('battle-result-opp-pct'))   el('battle-result-opp-pct').textContent   = `${oppPct  || 0}%`;
  if (el('battle-result-opp-score')) el('battle-result-opp-score').textContent = `${oppScore || 0}/${total}`;
  if (el('battle-result-xp'))        el('battle-result-xp').textContent        = `+${iWon ? 50 : isDraw ? 25 : 10} XP Battle Bonus!`;

  const myCard  = el('battle-score-me');
  const oppCard = el('battle-score-opponent');
  myCard?.classList.toggle('battle-winner', iWon);
  oppCard?.classList.toggle('battle-winner', !iWon && !isDraw);

  mountAvatar(myAvatar  || 'M01', el('battle-result-my-avatar'));
  mountAvatar(oppAvatar || 'M01', el('battle-result-opp-avatar'));

  const thread = el('battle-thread');
  if (thread && match.messages) {
    thread.innerHTML = match.messages.map(m => `
      <div style="padding:8px 12px;margin-bottom:6px;background:var(--bg-subtle);
           border:1px solid var(--border);border-radius:var(--radius-md);
           font-size:13px;font-weight:600;color:var(--text-secondary)">
        ${m.text}
      </div>`).join('');
  }

  const rematchBtn = el('battle-rematch-btn');
  if (rematchBtn) {
    const newBtn = rematchBtn.cloneNode(true);
    rematchBtn.parentNode.replaceChild(newBtn, rematchBtn);
    newBtn.addEventListener('click', async () => {
      newBtn.disabled = true;
      newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';

      try {
        if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();

        const result = await sendRematch(match.matchId, _localQuestionsCache);
        _activeChallengeMatchId = result.matchId;
        _currentChallenge       = result;

        try {
          const { notifyRematchReady } =
            await import('./services/notification.service.js');
          await notifyRematchReady(
            match.matchId, result.code, result.matchId,
            getCurrentUser()?.displayName || 'Someone'
          );
        } catch (e) {
          console.warn('[Rematch] notify failed (non-fatal):', e.message);
        }

        listenForRematchInvite(match.matchId, ({ code: rematchCode }) => {
          showToast(`⚔️ Rematch available! Code: ${rematchCode}`, 'success', 10000);
          showChallengeAcceptModal(rematchCode);
        });

        const codeDisplay   = document.getElementById('challenge-code-display');
        const codeBox       = document.getElementById('challenge-code-box');
        const createActions = document.getElementById('challenge-create-actions');
        const shareActions  = document.getElementById('challenge-share-actions');

        if (codeDisplay)   codeDisplay.textContent = result.code;
        if (codeBox)       codeBox.classList.remove('hidden');
        if (createActions) createActions.classList.add('hidden');
        if (shareActions)  shareActions.classList.remove('hidden');

        const waLink = generateWhatsAppLink(
          result.code,
          getCurrentUser()?.displayName || 'Someone',
          _appUrl + window.location.pathname
        );
        const waBtn = document.getElementById('whatsapp-share-btn');
        if (waBtn) waBtn.onclick = () => window.open(waLink, '_blank');

        document.getElementById('challenge-create-modal')?.classList.remove('hidden');
        showToast(`Rematch ready! New code: ${result.code}`, 'success', 5000);

        _unsubMatch();
        _matchUnsubscribe = listenToMatch(result.matchId, async updatedMatch => {
          if (updatedMatch.status === 'active' && updatedMatch.opponentId) {
            _unsubMatch();
            _activeChallengeMatchId = null;
            closeChallengeModal();
            showToast(
              `${updatedMatch.opponentName} accepted! Starting rematch… ⚔️`,
              'success', 3000
            );
            setTimeout(
              () => startBattle(result.matchId, updatedMatch.questions, updatedMatch),
              1200
            );
          }
        });

      } catch (err) {
        showToast(err.message || 'Failed to create rematch', 'error');
        newBtn.disabled = false;
        newBtn.innerHTML = '🔄 Request Rematch';
      }
    });
  }

  const backBtn = el('battle-result-back-btn');
  if (backBtn) {
    const newBack = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBack, backBtn);
    newBack.addEventListener('click', () => {
      showScreen('path');
    });
  }
}

// ============================================
// REMATCH NOTIFICATIONS
// ============================================

function listenForRematchInvite(oldMatchId, onRematch) {
  let fired = false;
  const unsub = listenToMatch(oldMatchId, (match) => {
    if (fired) return;
    const rematchMsg = (match.messages || []).find(
      m => m.type === 'rematch' && m.rematchCode
    );
    if (rematchMsg) {
      fired = true;
      unsub();
      onRematch({ code: rematchMsg.rematchCode, matchId: rematchMsg.rematchMatchId });
    }
  });
  return unsub;
}

// ============================================
// AVATAR MODAL
// ============================================

function openAvatarModal() {
  const profile = getUserProfile();
  _selectedAvatarId = getAvatarId(profile);
  renderAvatarGrid('all');
  updateAvatarPreview(_selectedAvatarId);
  document.getElementById('avatar-modal')?.classList.remove('hidden');
}

function closeAvatarModal() {
  document.getElementById('avatar-modal')?.classList.add('hidden');
}

function filterAvatars(gender) {
  document.querySelectorAll('.avatar-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `avatar-filter-${gender}`);
  });
  renderAvatarGrid(gender);
}

function renderAvatarGrid(gender = 'all') {
  const grid = document.getElementById('avatar-grid');
  if (!grid) return;
  const filtered = gender === 'all' ? AVATARS : AVATARS.filter(a => a.gender === gender);
  grid.innerHTML = filtered.map(avatar => `
    <div class="avatar-option ${avatar.id === _selectedAvatarId ? 'selected' : ''}"
         onclick="SQ.selectAvatar('${avatar.id}')"
         data-id="${avatar.id}">
      <div class="avatar-option-img">${avatar.svg()}</div>
      <div class="avatar-option-label">${avatar.label}</div>
    </div>`).join('');
}

function selectAvatar(avatarId) {
  _selectedAvatarId = avatarId;
  document.querySelectorAll('.avatar-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.id === avatarId);
  });
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
  btn.disabled    = true;
  btn.textContent = 'Saving…';
  try {
    await saveAvatar(_selectedAvatarId);
    mountAvatar(_selectedAvatarId, document.getElementById('profile-avatar'));
    closeAvatarModal();
    showToast('Avatar updated! 🎭', 'success');
  } catch (err) {
    showToast('Failed to save avatar', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Save Avatar';
  }
}

// ============================================
// UTILITIES
// ============================================

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// CANCEL ANY MATCH BY ID
// ============================================

async function cancelMatchById(matchId) {
  if (!matchId) return;
  const user = getCurrentUser();
  if (!user) return;

  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');
    await updateDoc(doc(db, 'matches', matchId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: user.uid
    });

    if (_activeChallengeMatchId === matchId) {
      _unsubMatch();
      _activeChallengeMatchId = null;
      _currentChallenge       = null;
    }
    if (_outgoingChallengeId === matchId) {
      stopOutgoingChallengeListener();
      _outgoingChallengeId = null;
    }

    showToast('Match cancelled ✓', 'success', 2000);
    _loadBattleHistoryIntoHub(user.uid);
  } catch (e) {
    showToast('Could not cancel — check your connection', 'error');
    console.warn('[App] cancelMatchById failed:', e.message);
  }
}

// ============================================
// GLOBAL SQ NAMESPACE
// ============================================

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
  challengeUser:              (uid, name) => handleChallengeUser(uid, name),
  directChallenge:            (uid, name) => handleDirectChallenge(uid, name),
  closeIncomingChallengeModal,
  cancelActiveChallenge,
  cancelMatchById,
  openDailyChallenge,
  closeDailyModal
};
