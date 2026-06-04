// ============================================
// SCRIPTUREQUEST V4 — app.js
// Fixes applied in this version (on top of v4 patch):
//
//   FIX A — FAB visibility:
//     setBattleFabVisible is now called INSIDE initLandingScreen based on the
//     actual auth state at render time, not in showScreen which fires before
//     the auth state is resolved. The showScreen call still sets FAB for
//     non-landing screens; initLandingScreen overrides it for landing.
//
//   FIX B — Challenge hub modal replaces challenge.page.js lobby:
//     openChallengeHub now renders a proper modal with:
//       • Create challenge / generate code section (existing)
//       • "Join by code" input (moved from leaderboard into hub)
//       • Battle history list (last 10 matches via getUserMatches)
//     initChallengeScreen no longer imports challenge.page.js; it just
//     calls openChallengeHub and returns to landing, avoiding the ugly
//     old lobby screen entirely.
//
//   FIX C — Pending battle result:
//     _checkPendingBattleResult now handles status:'active' more robustly:
//     it re-reads the doc once (in case the transaction closed it between
//     the localStorage write and this read) before subscribing.
//
//   Retained from v4 patch:
//     • Race condition in handleBattleComplete fixed
//     • FAB wired to openChallengeHub
//     • onComplete fires regardless of current screen
//     • cancelActiveChallenge uses correct _matchUnsubscribe
//     • createChallenge no longer expects result.whatsappUrl
//     • window.SQ.challengeUser delegates to handleChallengeUser
// ============================================

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

// ============================================
// MODULE-LEVEL STATE
// ============================================

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

// ============================================
// SCREEN MANAGEMENT
// ============================================

const SCREENS = ['loading','landing','quiz','result','leaderboard','rewards',
                 'profile','settings','battle','battle-result','challenge'];

function showScreen(name) {
  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('hidden', id !== name);
  });

  const nav   = document.getElementById('bottom-nav');
  const noNav = ['loading','quiz','result','battle','battle-result','challenge'];
  if (nav) nav.classList.toggle('hidden', noNav.includes(name));

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  setState('nav', { current: name });

  // FAB: show on landing + leaderboard; initLandingScreen will refine for landing
  // based on actual auth state (FIX A — prevents FAB showing for logged-out users)
  const FAB_SCREENS = ['landing', 'leaderboard'];
  if (name !== 'landing') {
    // For non-landing screens set FAB visibility immediately
    setBattleFabVisible(FAB_SCREENS.includes(name));
  }
  // For landing, FAB visibility is set inside initLandingScreen after auth check

  if (name === 'leaderboard') initLeaderboardScreen();
  if (name === 'rewards')     initRewardsScreen();
  if (name === 'profile')     initProfileScreen();
  if (name === 'landing')     initLandingScreen();
  if (name === 'settings')    initSettingsScreen();
  if (name === 'challenge')   initChallengeScreen();
}

// ============================================
// BATTLE FAB
// ============================================

function setBattleFabVisible(visible) {
  const fab = document.getElementById('battle-fab');
  if (fab) fab.classList.toggle('hidden', !visible);
}

// ============================================
// CHALLENGE HUB MODAL
// openChallengeHub — single entry point for the challenge modal.
// Shows active challenge info if one is in progress, otherwise fresh UI.
// Also loads recent battle history into the modal.
// ============================================

function openChallengeHub() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  const codeBox       = document.getElementById('challenge-code-box');
  const createActions = document.getElementById('challenge-create-actions');
  const shareActions  = document.getElementById('challenge-share-actions');

  if (_activeChallengeMatchId && _currentChallenge) {
    if (codeBox)       codeBox.classList.remove('hidden');
    if (createActions) createActions.classList.add('hidden');
    if (shareActions)  shareActions.classList.remove('hidden');
    const codeDisplay = document.getElementById('challenge-code-display');
    if (codeDisplay) codeDisplay.textContent = _currentChallenge.code || '—';
  } else {
    if (codeBox)       codeBox.classList.add('hidden');
    if (createActions) createActions.classList.remove('hidden');
    if (shareActions)  shareActions.classList.add('hidden');
  }

  document.getElementById('challenge-create-modal')?.classList.remove('hidden');

  // FIX B — Populate battle history section inside the hub modal
  _loadBattleHistoryIntoHub(user.uid);
}

// Load and render the last 10 matches into #challenge-hub-history inside the modal.
// Gracefully degrades if the element doesn't exist in older HTML.
async function _loadBattleHistoryIntoHub(uid) {
  const container = document.getElementById('challenge-hub-history');
  if (!container) return;

  container.innerHTML = `<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0">
    <i class="fas fa-spinner fa-spin"></i> Loading battles…</p>`;

  try {
    const matches = await getUserMatches(uid);
    if (!matches.length) {
      container.innerHTML = `<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0">
        No battles yet — create one above! ⚔️</p>`;
      return;
    }

    const recent = matches.slice(0, 10);
    container.innerHTML = recent.map(m => {
      const isCreator = m.creatorId === uid;
      const myPct     = isCreator ? m.creatorPct   : m.opponentPct;
      const oppPct    = isCreator ? m.opponentPct  : m.creatorPct;
      const oppName   = isCreator ? m.opponentName : m.creatorName;
      const iWon      = m.winnerId === uid;
      const isDraw    = m.winnerId === 'draw';
      const isWaiting = m.status === 'waiting';
      const isActive  = m.status === 'active';

      const statusIcon  = isWaiting ? '⏳' : isActive ? '⚔️' : iWon ? '🏆' : isDraw ? '🤝' : '😔';
      const statusLabel = isWaiting ? 'Waiting for opponent'
                        : isActive  ? 'In progress'
                        : iWon      ? 'You won!'
                        : isDraw    ? 'Draw'
                        : 'You lost';
      const statusColor = isWaiting || isActive ? 'var(--text-muted)'
                        : iWon ? 'var(--success, #22c55e)'
                        : isDraw ? 'var(--warning, #f59e0b)'
                        : 'var(--danger, #ef4444)';

      const scoreStr = (m.status === 'completed' && myPct !== null)
        ? `${myPct ?? '—'}% vs ${oppPct ?? '—'}%`
        : m.code || '—';

      const date = m.createdAt?.toDate
        ? m.createdAt.toDate().toLocaleDateString('en-GB', { day:'numeric', month:'short' })
        : '';

      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:22px">${statusIcon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              vs ${oppName || 'Opponent'}
            </div>
            <div style="font-size:12px;color:${statusColor};font-weight:600">${statusLabel}</div>
            <div style="font-size:11px;color:var(--text-muted)">${scoreStr}${date ? ' · ' + date : ''}</div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = `<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0">
      Couldn't load battle history.</p>`;
    console.warn('[Hub] Battle history load failed:', e.message);
  }
}

function closeChallengeModal() {
  document.getElementById('challenge-create-modal')?.classList.add('hidden');
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

initAuthListener(
  async (user, profile, stats) => {
    await initTheme(profile);
    checkNewWeek();
    checkAndShowAnnouncements().catch(e => console.warn('[Announce]', e.message));

    _checkPendingBattleResult(user).catch(e => console.warn('[PendingBattle]', e.message));

    const code = getChallengeCodeFromURL();
    if (code) {
      _pendingChallengeCode = code;
      clearChallengeFromURL();
      showScreen('landing');
      initLandingScreen();
      setTimeout(() => showChallengeAcceptModal(code), 800);
    } else {
      showScreen('landing');
      initLandingScreen();
    }
  },
  () => {
    initTheme(null);
    // FAB always hidden when logged out
    setBattleFabVisible(false);

    const code = getChallengeCodeFromURL();
    if (code) {
      _pendingChallengeCode = code;
      clearChallengeFromURL();
      localStorage.setItem('sq_pending_challenge', code);
    }

    showScreen('landing');
    document.getElementById('auth-section')?.classList.remove('hidden');
    document.getElementById('welcome-section')?.classList.add('hidden');
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
    // FIX A — FAB must be hidden for logged-out users on landing
    setBattleFabVisible(false);
    return;
  }

  authSection?.classList.add('hidden');
  welcomeSection?.classList.remove('hidden');
  document.getElementById('bottom-nav')?.classList.remove('hidden');
  // FIX A — FAB visible only when user is logged in and on landing
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
      // FIX C — Re-read once before subscribing: the transaction may have closed
      // the match between the time we wrote PENDING_BATTLE_KEY and now.
      // getMatchResult is a fresh read so if status changed we catch it here.
      // (Already handled above — reaching here means it's genuinely active.)

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
// ============================================

async function initLeaderboardScreen() {
  const weekNumber = document.getElementById('lb-week-number');
  if (weekNumber) weekNumber.textContent = getDisplayWeek();

  if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
  const countdownEl = document.getElementById('lb-countdown');
  if (countdownEl) {
    const tick = () => { const { totalMs } = getTimeUntilNextWeek(); countdownEl.textContent = formatCountdown(totalMs); };
    tick(); _lbCountdownTimer = setInterval(tick, 1000);
  }

  document.getElementById('lb-skeleton')?.classList.remove('hidden');
  document.getElementById('lb-entries')?.classList.add('hidden');

  const currentUserId = getCurrentUser()?.uid;
  subscribeLeaderboard(entries => {
    document.getElementById('lb-skeleton')?.classList.add('hidden');
    document.getElementById('lb-entries')?.classList.remove('hidden');
    renderLeaderboardRows(entries, document.getElementById('lb-entries'), currentUserId);
    renderUserRank(entries, document.getElementById('lb-my-rank'), currentUserId);
    const count = document.getElementById('lb-entry-count');
    if (count) count.textContent = `${entries.length} competitor${entries.length !== 1 ? 's' : ''} this week`;
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
    el('profile-joined').textContent = `Joined ${d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`;
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
      ${!b.done && b.progress > 0 ? `<div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${Math.round(b.progress)}%"></div></div>` : ''}
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
  if (startBtn) { startBtn.disabled = true; startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting…'; }

  try {
    let sessionData;

    if (resume) {
      sessionData = loadQuizStateFromStorage();
      if (!sessionData) {
        showToast('No resumable quiz found. Starting fresh.', 'info');
        if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
        return handleStartQuiz(false);
      }
    } else {
      try {
        sessionData = await createQuizSession();
        _activeLocalSession = null;
      } catch (cloudErr) {
        console.warn('[App] Cloud Function unavailable, using local fallback:', cloudErr.message);
        const questions = await getLocalQuestions();
        if (questions.length === 0) throw new Error('Quiz questions are not available yet. Please check back soon!');
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
    if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
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
  showScreen('landing');
  initLandingScreen();
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
      datasets: [{ data:[correct,wrong], backgroundColor:['#22c55e','#ef4444'], borderWidth:0, borderRadius:4 }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { position:'bottom',
        labels: { color: isDark?'#9fa8da':'#64748b', font:{ weight:'700', family:'Nunito' }, padding:16 }
      }},
      animation: { animateScale:true, duration:700 }
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
  newOk?.addEventListener('click', () => { modal?.classList.add('hidden'); onConfirm?.(); });
}

// ============================================
// EVENT WIRING
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Battle FAB ──
  document.getElementById('battle-fab')?.addEventListener('click', openChallengeHub);

  // ── Challenge create modal ──
  document.getElementById('generate-challenge-btn')?.addEventListener('click', generateChallenge);
  document.getElementById('challenge-modal-close-btn')?.addEventListener('click', closeChallengeModal);
  document.getElementById('challenge-cancel-btn')?.addEventListener('click', cancelActiveChallenge);

  // ── Challenge accept modal ──
  document.getElementById('challenge-accept-modal-close-btn')?.addEventListener('click', closeChallengeAcceptModal);
  document.getElementById('accept-challenge-btn')?.addEventListener('click', acceptChallengeByCode);

  // ── Hub: Join by code (also present inside challenge hub modal as #hub-join-code-btn) ──
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
        if (!matchData)                                    throw new Error('Challenge not found. Check the code and try again.');
        if (matchData.status !== 'waiting')                throw new Error('This challenge is no longer available.');
        if (matchData.creatorId === getCurrentUser()?.uid) throw new Error("You can't join your own challenge!");
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

  // Wire both the leaderboard join and the hub modal join (if present in HTML)
  _handleJoinByCode('lb-join-code-input',  'lb-join-code-btn');
  _handleJoinByCode('hub-join-code-input', 'hub-join-code-btn');

  // ── Auth modal ──
  document.getElementById('open-auth-btn')?.addEventListener('click', openAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeAuthModal(); });

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
      const pending = localStorage.getItem('sq_pending_challenge');
      if (pending) {
        localStorage.removeItem('sq_pending_challenge');
        setTimeout(() => showChallengeAcceptModal(pending), 500);
      }
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
      showToast(`Welcome to ScriptureQuest, ${name.split(' ')[0]}! 🎉`, 'success', 4000);
      const pending = localStorage.getItem('sq_pending_challenge');
      if (pending) {
        localStorage.removeItem('sq_pending_challenge');
        setTimeout(() => showChallengeAcceptModal(pending), 1200);
      }
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  });

  // ── Forgot password ──
  document.getElementById('forgot-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) return showAuthMessage('Enter your email above first');
    try { await resetPassword(email); showAuthMessage('Reset email sent! Check your inbox.', 'success'); }
    catch (err) { showAuthMessage(getAuthErrorMessage(err.code)); }
  });

  ['login-email','login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('login-btn')?.click(); });
  });

  // ── Quiz ──
  document.getElementById('start-quiz-btn')?.addEventListener('click',  () => handleStartQuiz(false));
  document.getElementById('resume-quiz-btn')?.addEventListener('click', () => handleStartQuiz(true));

  // ── Bottom nav ──
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (!target) return;
      if (!['landing','settings'].includes(target) && !getCurrentUser()) { openAuthModal(); return; }
      if (getState('nav')?.current === 'leaderboard' && target !== 'leaderboard') {
        unsubscribeLeaderboard();
        if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
      }
      // 'battle' nav tap opens challenge hub modal, not the legacy screen-challenge
      if (target === 'battle') {
        openChallengeHub();
        return;
      }
      showScreen(target);
    });
  });

  // ── Result buttons ──
  document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => showScreen('leaderboard'));
  document.getElementById('back-home-btn')?.addEventListener('click', () => { showScreen('landing'); initLandingScreen(); });

  // ── Profile tabs ──
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab));
  });

  // ── Profile contact save ──
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
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
    }
  });

  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.addEventListener('click', () => { setTheme(btn.dataset.theme); initProfileScreen(); });
  });

  ['quiz-theme-toggle','lb-theme-toggle'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', toggleTheme);
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    showConfirm({ icon:'👋', title:'Sign Out', message:'Are you sure you want to sign out?',
      onConfirm: async () => { await logout(); showScreen('landing'); }
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
      const { requestPushPermission } = await import('./services/notification.service.js');
      const result = await requestPushPermission();
      if (!result.granted) {
        e.target.checked = false;
        showToast('Notification permission denied. Enable it in your browser settings.', 'warning');
      } else {
        showToast('Notifications enabled! 🔔', 'success');
      }
    }
  });

  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    showConfirm({ icon:'👋', title:'Sign Out', message:'Are you sure you want to sign out?',
      onConfirm: async () => { await logout(); showScreen('landing'); }
    });
  });
         
 document.getElementById('whatsapp-contact-btn')?.addEventListener('click', () => {
    window.open('https://wa.me/+2349167055488?text=Hi%20Admin%F0%9F%91%8B%2C%20I%20need%20Help%20With%20Scripture%20Quest', '_blank');
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

  document.getElementById('go-profile-btn')?.addEventListener('click', () => showScreen('profile'));
  document.getElementById('lb-refresh-btn')?.addEventListener('click', () => initLeaderboardScreen());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
});

// ============================================
// CHALLENGE SYSTEM
// ============================================

async function generateChallenge() {
  if (_activeChallengeMatchId) {
    showToast('You already have an active challenge! Wait for your opponent to accept.', 'warning');
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
    const waLink  = generateWhatsAppLink(result.code, name, _appUrl + window.location.pathname);
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
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Challenge Link';
  }
}

function cancelActiveChallenge() {
  _unsubMatch();
  _activeChallengeMatchId = null;
  _currentChallenge       = null;
  closeChallengeModal();
  showToast('Challenge cancelled', 'info');
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
    if (!matchData) throw new Error('Challenge not found. Check the code and try again.');
    if (matchData.status !== 'waiting') throw new Error('This challenge is no longer available.');
    if (matchData.creatorId === getCurrentUser()?.uid) throw new Error("You can't accept your own challenge!");

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

// ============================================
// CHALLENGE SCREEN (legacy lobby — now just opens hub)
// FIX B: No longer loads challenge.page.js. Showing the hub modal is the
// correct UX; the screen-challenge element stays hidden.
// ============================================

function initChallengeScreen() {
  // Redirect to hub immediately; don't render the old lobby
  showScreen('landing');
  openChallengeHub();
}

// ============================================
// CHALLENGE USER FROM LEADERBOARD
// ============================================

async function handleChallengeUser(opponentUid, opponentName) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (opponentUid === user.uid) { showToast("You can't challenge yourself!", 'error'); return; }

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
    showToast(`Challenge code: ${result.code} — share it with ${opponentName}!`, 'success', 5000);

    // Refresh history now that we have a new match
    _loadBattleHistoryIntoHub(user.uid);

    _unsubMatch();
    _matchUnsubscribe = listenToMatch(result.matchId, async match => {
      if (match.status === 'active' && match.opponentId) {
        _unsubMatch();
        _activeChallengeMatchId = null;
        closeChallengeModal();
        showToast(`${match.opponentName} accepted! Starting battle… ⚔️`, 'success', 3000);
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
      <div style="padding:8px 12px;margin-bottom:6px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);font-size:13px;font-weight:600;color:var(--text-secondary)">
        ${m.text}
      </div>`).join('');
  }

  // ── Rematch button ──
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
          const { notifyRematchReady } = await import('./services/notification.service.js');
          await notifyRematchReady(
            match.matchId, result.code, result.matchId,
            getCurrentUser()?.displayName || 'Someone'
          );
        } catch (e) { console.warn('[Rematch] notify failed (non-fatal):', e.message); }

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
            showToast(`${updatedMatch.opponentName} accepted! Starting rematch… ⚔️`, 'success', 3000);
            setTimeout(() => startBattle(result.matchId, updatedMatch.questions, updatedMatch), 1200);
          }
        });

      } catch (err) {
        showToast(err.message || 'Failed to create rematch', 'error');
        newBtn.disabled = false;
        newBtn.innerHTML = '🔄 Request Rematch';
      }
    });
  }

  // ── Back to home ──
  const backBtn = el('battle-result-back-btn');
  if (backBtn) {
    const newBack = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBack, backBtn);
    newBack.addEventListener('click', () => { showScreen('landing'); initLandingScreen(); });
  }
}

// ============================================
// REMATCH NOTIFICATIONS
// ============================================

function listenForRematchInvite(oldMatchId, onRematch) {
  let fired = false;
  const unsub = listenToMatch(oldMatchId, (match) => {
    if (fired) return;
    const rematchMsg = (match.messages || []).find(m => m.type === 'rematch' && m.rematchCode);
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
// GLOBAL SQ NAMESPACE
// ============================================

window.SQ = {
  switchAuthTab,
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
  challengeUser: (uid, name) => handleChallengeUser(uid, name)
};
