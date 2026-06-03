// ============================================
// SCRIPTUREQUEST V4 — app.js (FULLY PATCHED)
// Fixes applied:
//   • Duplicate match.service.js import removed
//   • Announcements called on login (Patch 1)
//   • Battle FAB visibility helper (Patch 2)
//   • Local quiz fallback
//   • Profile complete hide
//   • Achievements tab
//   • Settings tab
//   • Contact details lock after save
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
import { LAST_SEEN_WEEK, SCORE_PASS_THRESHOLD } from './utils/constants.js';
import { AVATARS, mountAvatar, renderAvatarSVG } from './components/avatar.js';

// ── Single, unified match.service.js import ──
import { createChallenge, getChallengeByCode, acceptChallenge,
         listenToMatch, getMatchResult, sendRematch,
         generateWhatsAppLink, getChallengeCodeFromURL,
         getUserMatches, getMatchByCode,
         clearChallengeFromURL } from './services/match.service.js';

import { saveAvatar, getAvatarId, getAvatarLabel } from './services/avatar.service.js';

// Local questions pool — loaded lazily
let _localQuestions = null;
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

// Lazy-load quiz page
let _quizPage = null;
async function getQuizPage() {
  if (!_quizPage) _quizPage = await import('./pages/quiz.page.js');
  return _quizPage;
}

// Active local session storage (for local quiz submit)
let _activeLocalSession   = null;
let _selectedAvatarId     = null; // temp selection in modal
let _pendingChallengeCode = null; // from URL param
let _currentChallenge     = null; // active challenge data
let _localQuestionsCache  = null; // cached for challenges
let _activeChallengeMatchId = null; // track if user has an active challenge


// ============================================
// SCREEN MANAGEMENT
// ============================================

const SCREENS = ['loading','landing','quiz','result','leaderboard','rewards','profile','settings','battle','battle-result','challenge'];


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

  if (name === 'leaderboard') initLeaderboardScreen();
  if (name === 'rewards')     initRewardsScreen();
  if (name === 'profile')     initProfileScreen();
  if (name === 'landing')     initLandingScreen();
  if (name === 'settings')    initSettingsScreen();
  if (name === 'challenge')   initChallengeScreen();
}

// ============================================
// BATTLE FAB VISIBILITY HELPER  [Patch 2]
// ============================================
function setBattleFabVisible(visible) {
  const fab = document.getElementById('battle-fab');
  if (fab) fab.classList.toggle('hidden', !visible);
}

// ============================================
// AUTH LISTENER
// ============================================
initAuthListener(
  async (user, profile, stats) => {
    await initTheme(profile);
    checkNewWeek();

    // [Patch 1] Trigger announcements on login
    checkAndShowAnnouncements().catch(e => console.warn('[Announce]', e.message));

    // Check for challenge code in URL (from WhatsApp link)
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

    // [Patch 2] Hide FAB on logout
    setBattleFabVisible(false);

    // Check for challenge code — store it, prompt login
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
    return;
  }

  authSection?.classList.add('hidden');
  welcomeSection?.classList.remove('hidden');
  document.getElementById('bottom-nav')?.classList.remove('hidden');

  const firstName = (profile?.displayName || user.displayName || 'Friend').split(' ')[0];
  const el = id => document.getElementById(id);

  if (el('welcome-name'))   el('welcome-name').textContent = firstName;
  if (el('welcome-sub'))    el('welcome-sub').textContent  = getMotivationalSub(stats);
  if (el('welcome-streak')) {
    const streak = stats?.currentStreak || 0;
    el('welcome-streak').textContent = streak > 0
      ? `🔥 ${streak}-day streak! Keep it going!`
      : '🌱 Start your streak today!';
  }

  // Only show profile warning if actually incomplete
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

let _limitTimer = null;
function startLimitCountdown(nextTime) {
  const el = document.getElementById('limit-countdown');
  if (!el) return;
  if (_limitTimer) clearInterval(_limitTimer);
  function update() {
    const diff = nextTime - Date.now();
    if (diff <= 0) { clearInterval(_limitTimer); initLandingScreen(); return; }
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
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
// LEADERBOARD SCREEN
// ============================================
let _lbCountdownTimer = null;
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
// PROFILE SCREEN  (with Achievements tab)
// ============================================
function initProfileScreen() {
  const user    = getCurrentUser();
  const profile = getUserProfile();
  const stats   = getUserStats();
  if (!user) return;

  const el   = id => document.getElementById(id);
  const name = profile?.displayName || user.displayName || 'User';

  // Mount SVG avatar instead of initials
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

  // If contact is already saved, show read-only — don't let them keep editing
  const contactSection = el('contact-edit-section');
  const contactDisplay = el('contact-display-section');

  if (profile?.profileComplete && profile?.phoneNumber) {
    if (contactSection) contactSection.classList.add('hidden');
    if (contactDisplay) {
      contactDisplay.classList.remove('hidden');
      const dispPhone   = el('contact-display-phone');
      const dispNetwork = el('contact-display-network');
      if (dispPhone)   dispPhone.textContent   = profile.phoneNumber || '—';
      if (dispNetwork) dispNetwork.textContent = profile.networkProvider || '—';
    }
  } else {
    if (contactSection) contactSection.classList.remove('hidden');
    if (contactDisplay) contactDisplay.classList.add('hidden');
    if (el('profile-phone'))   el('profile-phone').value   = profile?.phoneNumber || '';
    if (el('profile-network')) el('profile-network').value = profile?.networkProvider || '';
  }

  const safeStats = stats || {
    totalXp: 0, level: 1, currentLevelXp: 0,
    currentStreak: 0, longestStreak: 0,
    quizzesTaken: 0, bestScore: 0, perfectScores: 0,
    topThreeFinishes: 0
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

  // Always render achievements — locked ones show for new users too
  renderAchievements(safeStats);

  // Highlight active theme button
  const currentTheme = getState('theme')?.current || 'light';
  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.classList.toggle('btn-primary',   btn.dataset.theme === currentTheme);
    btn.classList.toggle('btn-secondary', btn.dataset.theme !== currentTheme);
  });
}

// Profile sub-tabs (Stats / Achievements)
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
    // ── BRONZE tier ──
    { id:'first_quiz', icon:'📖', tier:'bronze', crown:'🥉', name:'First Steps',      req:'Complete your first quiz',   done:quizzes>=1,   progress:Math.min(100,(quizzes/1)*100) },
    { id:'streak3',    icon:'🔥', tier:'bronze', crown:'🥉', name:'On Fire',           req:'3-day streak',               done:streak>=3,    progress:Math.min(100,(streak/3)*100) },
    { id:'perfect1',   icon:'💯', tier:'bronze', crown:'🥉', name:'Perfectionist',     req:'Score 100% once',            done:perfect>=1,   progress:Math.min(100,(perfect/1)*100) },
    { id:'xp500',      icon:'⭐', tier:'bronze', crown:'🥉', name:'XP Rising',         req:'Earn 500 XP',                done:xp>=500,      progress:Math.min(100,(xp/500)*100) },
    // ── SILVER tier ──
    { id:'quiz10',     icon:'📚', tier:'silver', crown:'🥈', name:'Dedicated',         req:'Complete 10 quizzes',        done:quizzes>=10,  progress:Math.min(100,(quizzes/10)*100) },
    { id:'streak7',    icon:'🌟', tier:'silver', crown:'🥈', name:'Week Warrior',      req:'7-day streak',               done:streak>=7,    progress:Math.min(100,(streak/7)*100) },
    { id:'perfect3',   icon:'🎯', tier:'silver', crown:'🥈', name:'Sharp Mind',        req:'3 perfect scores',           done:perfect>=3,   progress:Math.min(100,(perfect/3)*100) },
    { id:'xp2000',     icon:'💫', tier:'silver', crown:'🥈', name:'XP Grinder',        req:'Earn 2,000 XP',              done:xp>=2000,     progress:Math.min(100,(xp/2000)*100) },
    // ── GOLD tier ──
    { id:'quiz50',     icon:'🎓', tier:'gold',   crown:'🥇', name:'Bible Scholar',     req:'Complete 50 quizzes',        done:quizzes>=50,  progress:Math.min(100,(quizzes/50)*100) },
    { id:'streak30',   icon:'🔆', tier:'gold',   crown:'🥇', name:'Monthly Champion',  req:'30-day streak',              done:streak>=30,   progress:Math.min(100,(streak/30)*100) },
    { id:'top3',       icon:'🏆', tier:'gold',   crown:'🥇', name:'Podium Finisher',   req:'Finish Top 3 weekly',        done:top3>=1,      progress:Math.min(100,(top3/1)*100) },
    { id:'xp10000',    icon:'💎', tier:'gold',   crown:'🥇', name:'XP Master',         req:'Earn 10,000 XP',             done:xp>=10000,    progress:Math.min(100,(xp/10000)*100) },
    // ── LEGENDARY tier ──
    { id:'quiz100',    icon:'👑', tier:'legendary', crown:'✨', name:'Legend',          req:'Complete 100 quizzes',       done:quizzes>=100, progress:Math.min(100,(quizzes/100)*100) },
    { id:'streak100',  icon:'🚀', tier:'legendary', crown:'✨', name:'Unstoppable',     req:'100-day streak',             done:streak>=100,  progress:Math.min(100,(streak/100)*100) },
    { id:'perfect10',  icon:'🌠', tier:'legendary', crown:'✨', name:'Flawless Master', req:'10 perfect scores',          done:perfect>=10,  progress:Math.min(100,(perfect/10)*100) },
    { id:'xp20000',    icon:'⚡', tier:'legendary', crown:'✨', name:'XP Legend',       req:'Earn 20,000 XP',             done:xp>=20000,    progress:Math.min(100,(xp/20000)*100) }
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
      <div class="badges-stat-chip chip-bronze">
        <div class="badges-stat-chip-value">${bronzeCount}</div>
        <div class="badges-stat-chip-label">🥉 Bronze</div>
      </div>
      <div class="badges-stat-chip chip-silver">
        <div class="badges-stat-chip-value">${silverCount}</div>
        <div class="badges-stat-chip-label">🥈 Silver</div>
      </div>
      <div class="badges-stat-chip chip-gold">
        <div class="badges-stat-chip-value">${goldCount}</div>
        <div class="badges-stat-chip-label">🥇 Gold</div>
      </div>
      <div class="badges-stat-chip chip-legendary">
        <div class="badges-stat-chip-value">${legCount}</div>
        <div class="badges-stat-chip-label">✨ Legend</div>
      </div>`;
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
      ${!b.done && b.progress > 0 ? `
        <div class="badge-progress-bar">
          <div class="badge-progress-fill" style="width:${Math.round(b.progress)}%"></div>
        </div>` : ''}
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
// QUIZ FLOW — with local fallback
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
        if (questions.length === 0) {
          throw new Error('Quiz questions are not available yet. Please check back soon!');
        }
        sessionData = await createLocalQuizSession(questions);
        _activeLocalSession = { questions: sessionData.questions };
      }
    }

    const qp = await getQuizPage();
    showScreen('quiz');
    await qp.initQuizScreen(sessionData, {
      onComplete: handleQuizComplete,
      onAbandon:  handleQuizAbandon,
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
  const el    = id => document.getElementById(id);
  const pct    = result.percentage || 0;
  const passed = pct >= SCORE_PASS_THRESHOLD;

  if (el('result-icon'))    el('result-icon').textContent    = pct === 100 ? '🏆' : passed ? '🎉' : '📖';
  if (el('result-title'))   el('result-title').textContent   = pct === 100 ? 'Perfect Score!' : passed ? 'Well Done!' : 'Keep Practising!';
  if (el('result-candidate-name')) el('result-candidate-name').textContent = getUserProfile()?.displayName || '';
  if (el('result-pct'))     el('result-pct').textContent     = `${pct}%`;
  if (el('result-detail'))  el('result-detail').textContent  = `${result.score} / ${result.totalQuestions} correct`;
  if (el('result-xp'))      el('result-xp').textContent      = `+${result.xpEarned || 0} XP`;
  if (el('r-streak'))       el('r-streak').textContent        = result.streak        || 0;
  if (el('r-level'))        el('r-level').textContent         = result.newLevel      || 1;
  if (el('r-total-xp'))     el('r-total-xp').textContent      = (result.totalXp || 0).toLocaleString();
  if (el('r-weekly-pts'))   el('r-weekly-pts').textContent    = (result.weeklyPoints || 0).toLocaleString();

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
           // Leaderboard: Join Challenge by code
  document.getElementById('lb-join-code-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('lb-join-code-input');
    const rawCode = input?.value?.trim() || '';
    const code = rawCode.replace(/:\d+$/, '').toUpperCase();
    
    if (!code || !code.startsWith('SQ-')) {
      showToast('Enter a valid challenge code (e.g. SQ-AB12)', 'error');
      return;
    }

    const btn = document.getElementById('lb-join-code-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining…';

    try {
      const matchData = await getChallengeByCode(code);
      if (!matchData) {
        throw new Error('Challenge not found. Check the code and try again.');
      }
      if (matchData.status !== 'waiting') {
        throw new Error('This challenge is no longer available.');
      }
      if (matchData.creatorId === getCurrentUser()?.uid) {
        throw new Error("You can't join your own challenge!");
      }

      const { matchId, questions } = await acceptChallenge(matchData.matchId);
      showToast('Challenge accepted! Battle starting… ⚔️', 'success', 2000);
      
            // FIX: Clean up any old battle state before starting new one
      const { destroyBattleScreen } = await import('./pages/battle.page.js');
      destroyBattleScreen();
      setTimeout(() => startBattle(matchId, questions, { ...matchData, questions }), 800);
             
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  // Allow Enter key on join input
  document.getElementById('lb-join-code-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('lb-join-code-btn')?.click();
  });
         

  // Auth modal
  document.getElementById('open-auth-btn')?.addEventListener('click', openAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeAuthModal(); });

  // Login
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

  // Register
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

  // Forgot password
  document.getElementById('forgot-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) return showAuthMessage('Enter your email above first');
    try { await resetPassword(email); showAuthMessage('Reset email sent! Check your inbox.', 'success'); }
    catch (err) { showAuthMessage(getAuthErrorMessage(err.code)); }
  });

  ['login-email','login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('login-btn')?.click(); });
  });

  // Quiz
  document.getElementById('start-quiz-btn')?.addEventListener('click',  () => handleStartQuiz(false));
  document.getElementById('resume-quiz-btn')?.addEventListener('click', () => handleStartQuiz(true));

    // Bottom nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (!target) return;
      if (!['landing','settings'].includes(target) && !getCurrentUser()) { openAuthModal(); return; }
      if (getState('nav')?.current === 'leaderboard' && target !== 'leaderboard') {
        unsubscribeLeaderboard();
        if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
      }
      
      // FIX: BATTLE icon goes to challenge lobby, not empty battle screen
      if (target === 'battle') {
        showScreen('challenge');
        return;
      }
      
      showScreen(target);
    });
  });
         

  // Result buttons
  document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => showScreen('leaderboard'));
  document.getElementById('back-home-btn')?.addEventListener('click', () => { showScreen('landing'); initLandingScreen(); });

  // Profile tabs
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab));
  });

  // Profile contact save
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

  // Theme pref buttons (in profile)
  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.addEventListener('click', () => { setTheme(btn.dataset.theme); initProfileScreen(); });
  });

  // Theme toggles
  ['quiz-theme-toggle','lb-theme-toggle'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', toggleTheme);
  });

  // Logout (profile)
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    showConfirm({ icon:'👋', title:'Sign Out', message:'Are you sure you want to sign out?',
      onConfirm: async () => { await logout(); showScreen('landing'); }
    });
  });

  // Settings: dark mode toggle
  document.getElementById('setting-dark-mode')?.addEventListener('change', e => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });

  // Settings: sound toggle
  document.getElementById('setting-sound')?.addEventListener('change', async e => {
    const user = getCurrentUser();
    if (!user) return;
    const { updateDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase/config.js');
    await updateDoc(doc(db, 'users', user.uid), { soundEnabled: e.target.checked });
  });

  // Settings: notifications toggle
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

  // Settings: logout button
  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    showConfirm({ icon:'👋', title:'Sign Out', message:'Are you sure you want to sign out?',
      onConfirm: async () => { await logout(); showScreen('landing'); }
    });
  });

  // Settings: WhatsApp button
  document.getElementById('whatsapp-contact-btn')?.addEventListener('click', () => {
    window.open('https://wa.me/+2349030000000?text=Hi%2C%20I%20need%20help%20with%20ScriptureQuest', '_blank');
  });

  // Level up modal
  document.getElementById('levelup-close-btn')?.addEventListener('click', () => {
    document.getElementById('levelup-modal')?.classList.add('hidden');
  });

  // Confirm modal cancel
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-modal')?.classList.add('hidden');
  });

  // New week banner
  document.getElementById('new-week-dismiss')?.addEventListener('click', () => {
    document.getElementById('new-week-banner')?.classList.add('hidden');
  });

  // Profile incomplete → go to profile
  document.getElementById('go-profile-btn')?.addEventListener('click', () => showScreen('profile'));

  // Leaderboard refresh
  document.getElementById('lb-refresh-btn')?.addEventListener('click', () => initLeaderboardScreen());

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
});

// ============================================
// CHALLENGE SYSTEM
// ============================================

let _challengeWhatsappUrl = null;

function openChallengeModal() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  // If already has active challenge, show waiting screen instead
  if (_activeChallengeMatchId && _currentChallenge) {
    const codeBox       = document.getElementById('challenge-code-box');
    const createActions = document.getElementById('challenge-create-actions');
    const shareActions  = document.getElementById('challenge-share-actions');
    if (codeBox)       codeBox.classList.remove('hidden');
    if (createActions) createActions.classList.add('hidden');
    if (shareActions)  shareActions.classList.remove('hidden');
    
    // Restore code display
    const codeDisplay = document.getElementById('challenge-code-display');
    if (codeDisplay) codeDisplay.textContent = _currentChallenge.code || '—';
    
    document.getElementById('challenge-create-modal')?.classList.remove('hidden');
    return;
  }

  const codeBox       = document.getElementById('challenge-code-box');
  const createActions = document.getElementById('challenge-create-actions');
  const shareActions  = document.getElementById('challenge-share-actions');
  if (codeBox)       codeBox.classList.add('hidden');
  if (createActions) createActions.classList.remove('hidden');
  if (shareActions)  shareActions.classList.add('hidden');

  document.getElementById('challenge-create-modal')?.classList.remove('hidden');
}


function closeChallengeModal() {
  document.getElementById('challenge-create-modal')?.classList.add('hidden');
  _challengeWhatsappUrl = null;
}

async function generateChallenge() {
  // GUARD: Don't create if already have active challenge
  if (_activeChallengeMatchId) {
    showToast('You already have an active challenge! Check your notifications or wait for opponent.', 'warning');
    return;
  }

  const btn = document.getElementById('generate-challenge-btn');
  btn.disabled    = true;
  btn.textContent = 'Generating…';

  try {
    if (!_localQuestionsCache) {
      _localQuestionsCache = await getLocalQuestions();
    }
    if (!_localQuestionsCache.length) {
      throw new Error('No questions available yet. Add questions first.');
    }

    const result = await createChallenge(_localQuestionsCache);
    _activeChallengeMatchId = result.matchId; // TRACK active challenge
    _challengeWhatsappUrl = result.whatsappUrl;
    _currentChallenge     = result;

    const codeDisplay = document.getElementById('challenge-code-display');
    const codeBox     = document.getElementById('challenge-code-box');
    if (codeDisplay) codeDisplay.textContent = result.code;
    if (codeBox)     codeBox.classList.remove('hidden');

    document.getElementById('challenge-create-actions')?.classList.add('hidden');
    document.getElementById('challenge-share-actions')?.classList.remove('hidden');

    // FIX: WhatsApp button — build link properly
    const profile = getUserProfile();
    const name = profile?.displayName || 'Someone';
    const appUrl = window.location.origin + window.location.pathname;
    const waLink = generateWhatsAppLink(result.code, name, appUrl);
    
    const waBtn = document.getElementById('whatsapp-share-btn');
    if (waBtn) waBtn.onclick = () => window.open(waLink, '_blank');

    showToast(`Challenge created! Code: ${result.code}`, 'success', 5000);
           
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Challenge Link';
  }
}

function cancelActiveChallenge() {
  if (_matchUnsubscribe) { _matchUnsubscribe(); _matchUnsubscribe = null; }
  _activeChallengeMatchId = null;
  _currentChallenge = null;
  _challengeWhatsappUrl = null;
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
  const input = document.getElementById('challenge-code-input');
  const rawCode = input?.value?.trim() || '';
  const code = rawCode.replace(/:\d+$/, '').toUpperCase();
  if (!code) return showToast('Please enter a challenge code', 'error');

  const btn = document.getElementById('accept-challenge-btn');
  btn.disabled = true;
  btn.textContent = 'Accepting…';

  try {
    // Step 1: Look up the match by code FIRST
    const matchData = await getChallengeByCode(code);
    if (!matchData) {
      throw new Error('Challenge not found. Check the code and try again.');
    }

    // Step 2: Now accept using the actual matchId
    const { matchId, questions } = await acceptChallenge(matchData.matchId);

    closeChallengeAcceptModal();
    showToast(`Challenge accepted! Good luck! ⚔️`, 'success', 3000);

        // Step 3: Start the battle
    // FIX: Clean up any old battle state before starting new one
    const { destroyBattleScreen } = await import('./pages/battle.page.js');
    destroyBattleScreen();
    
    const challengePage = await import('./pages/challenge.page.js');
    showScreen('battle');
    await challengePage.initChallengePage(matchId, { ...matchData, questions }, {
             
      onDone: (result) => {
        if (result.action === 'rematch') {
          openChallengeModal();
        } else {
          showScreen('landing');
          initLandingScreen();
        }
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-fist-raised"></i> Accept Challenge!';
  }
}


// ============================================
// CHALLENGE SCREEN
// ============================================
let _currentMatchId   = null;
let _currentMatchData = null;
let _matchUnsubscribe = null;
let _appUrl = window.location.origin;

// FIX: Initialize challenge lobby page
async function initChallengeScreen() {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  
  try {
    const challengePage = await import('./pages/challenge.page.js');
    await challengePage.initChallengePage({
      onBack: () => { showScreen('landing'); initLandingScreen(); },
      onStartBattle: ({ matchId, questions, match }) => {
        startBattle(matchId, questions, match);
      }
    });
  } catch (err) {
    console.error('[App] Failed to init challenge screen:', err);
    showToast('Failed to load battle lobby', 'error');
    showScreen('landing');
  }
}

async function showCreateChallengeUI() {
  document.getElementById('challenge-create-section')?.classList.remove('hidden');
  document.getElementById('challenge-accept-section')?.classList.add('hidden');
  document.getElementById('challenge-waiting-section')?.classList.add('hidden');

  try {
    const questions = await getLocalQuestions();
    if (!questions.length) { showToast('Questions not loaded yet','error'); return; }
    const { matchId, code, expiresAt, questions: qs } = await createChallenge(questions);
    _currentMatchId   = matchId;
    _currentMatchData = { questions: qs };

    const codeEl = document.getElementById('challenge-code');
    if (codeEl) codeEl.textContent = code;

    const waBtn = document.getElementById('challenge-whatsapp-btn');
    if (waBtn) {
      const profile = getUserProfile();
      const name    = profile?.displayName || 'Someone';
      const waLink  = generateWhatsAppLink(code, name, _appUrl);
      waBtn.onclick = () => window.open(waLink, '_blank');
    }

    document.getElementById('challenge-new-btn')?.addEventListener('click', showCreateChallengeUI);

    if (_matchUnsubscribe) _matchUnsubscribe();
        _matchUnsubscribe = listenToMatch(matchId, match => {
      if (match.status === 'active' && match.opponentId) {
        _activeChallengeMatchId = null; // Clear — battle is starting
        showToast(`${match.opponentName} accepted your challenge! 🔥`, 'success', 4000);
        setTimeout(() => startBattle(matchId, match.questions, match), 1500);
      }
    });
           
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function handleIncomingChallenge(code) {
  document.getElementById('challenge-create-section')?.classList.add('hidden');
  document.getElementById('challenge-accept-section')?.classList.remove('hidden');
  
  try {
    const match = await getChallengeByCode(code);  // ← look up by code
    if (!match) { 
      showToast('Challenge not found or expired', 'error'); 
      return; 
    }
    
    _currentMatchId = match.matchId;
    _currentMatchData = match;
    
    const nameEl = document.getElementById('challenge-from-name');
    if (nameEl) nameEl.textContent = `⚔️ ${match.creatorName} challenged you to a Bible battle!`;
    
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Clean up old listeners before adding new ones
    const acceptBtn = document.getElementById('challenge-accept-btn');
    const newAcceptBtn = acceptBtn?.cloneNode(true);
    if (acceptBtn && newAcceptBtn) {
      acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
      newAcceptBtn.addEventListener('click', async () => {
        try {
           const result = await acceptChallenge(match.matchId);  // ← use matchId here
          
          // FIX: Clean up old battle state
          const { destroyBattleScreen } = await import('./pages/battle.page.js');
          destroyBattleScreen();
          
          startBattle(match.matchId, result.questions, match);
                 
        } catch(err) { 
          showToast(err.message, 'error'); 
        }
      });
    }
    
    const declineBtn = document.getElementById('challenge-decline-btn');
    const newDeclineBtn = declineBtn?.cloneNode(true);
    if (declineBtn && newDeclineBtn) {
      declineBtn.parentNode.replaceChild(newDeclineBtn, declineBtn);
      newDeclineBtn.addEventListener('click', () => showScreen('landing'));
    }
    
  } catch(err) {
    showToast('Failed to load challenge', 'error');
  }
}


// [Patch 2] setBattleFabVisible called here
async function startBattle(matchId, questions, match) {
  setBattleFabVisible(true);
  // FIX: Clean up any old battle state before starting new one
  const { destroyBattleScreen } = await import('./pages/battle.page.js');
  destroyBattleScreen();
  const { initBattleScreen } = await import('./pages/battle.page.js');
  showScreen('battle');
  await initBattleScreen(matchId, questions, match, {
    onComplete: handleBattleComplete,
    onWaiting:  handleBattleWaiting
  });
}

function handleBattleWaiting(matchId) {
  showScreen('challenge');
  document.getElementById('challenge-create-section')?.classList.add('hidden');
  document.getElementById('challenge-accept-section')?.classList.add('hidden');
  document.getElementById('challenge-waiting-section')?.classList.remove('hidden');
  if (_matchUnsubscribe) _matchUnsubscribe();
  _matchUnsubscribe = listenToMatch(matchId, match => {
    if (match.status === 'completed') handleBattleComplete(match);
  });
}

// [Patch 2] setBattleFabVisible called here
async function handleBattleComplete(match) {
  setBattleFabVisible(false);
         _activeChallengeMatchId = null; // Clear after battle done
  if (_matchUnsubscribe) { _matchUnsubscribe(); _matchUnsubscribe = null; }
  // FIX: Clean up battle screen
  const { destroyBattleScreen } = await import('./pages/battle.page.js');
  destroyBattleScreen();
  showScreen('battle-result');
  renderBattleResult(match);
}

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
  if(el('battle-result-icon'))      el('battle-result-icon').textContent      = isDraw?'🤝':iWon?'🏆':'😔';
  if(el('battle-result-title'))     el('battle-result-title').textContent     = isDraw?"It's a Draw!":iWon?'You Win! 🎉':'You Lost!';
  if(el('battle-result-sub'))       el('battle-result-sub').textContent       = isDraw?'Well played by both!':iWon?`You beat ${oppName}!`:`${oppName} got you this time!`;
  if(el('battle-result-my-name'))   el('battle-result-my-name').textContent   = myName||'You';
  if(el('battle-result-my-pct'))    el('battle-result-my-pct').textContent    = `${myPct||0}%`;
  if(el('battle-result-my-score'))  el('battle-result-my-score').textContent  = `${myScore||0}/${total}`;
  if(el('battle-result-opp-name'))  el('battle-result-opp-name').textContent  = oppName||'Opponent';
  if(el('battle-result-opp-pct'))   el('battle-result-opp-pct').textContent   = `${oppPct||0}%`;
  if(el('battle-result-opp-score')) el('battle-result-opp-score').textContent = `${oppScore||0}/${total}`;
  if(el('battle-result-xp'))        el('battle-result-xp').textContent        = `+${iWon?50:isDraw?25:10} XP Battle Bonus!`;

  const myCard  = el('battle-score-me');
  const oppCard = el('battle-score-opponent');
  if (myCard  && iWon)            myCard.classList.add('battle-winner');
  if (oppCard && !iWon && !isDraw) oppCard.classList.add('battle-winner');

  mountAvatar(myAvatar||'M01',  el('battle-result-my-avatar'));
  mountAvatar(oppAvatar||'M01', el('battle-result-opp-avatar'));

  const thread = el('battle-thread');
  if (thread && match.messages) {
    thread.innerHTML = match.messages.map(m => `
      <div style="padding:8px 12px;margin-bottom:6px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);font-size:13px;font-weight:600;color:var(--text-secondary)">
        ${m.text}
      </div>`).join('');
  }

  el('battle-rematch-btn')?.addEventListener('click', async () => {
  const btn = el('battle-rematch-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  
  try {
    // Create a fresh challenge for the rematch
    if (!_localQuestionsCache) {
      _localQuestionsCache = await getLocalQuestions();
    }
    
    const result = await createChallenge(_localQuestionsCache);
    _currentChallenge = result;
    
    // Show the challenge modal with the new code
    const codeDisplay = document.getElementById('challenge-code-display');
    const codeBox = document.getElementById('challenge-code-box');
    const createActions = document.getElementById('challenge-create-actions');
    const shareActions = document.getElementById('challenge-share-actions');
    
    if (codeDisplay) codeDisplay.textContent = result.code;
    if (codeBox) codeBox.classList.remove('hidden');
    if (createActions) createActions.classList.add('hidden');
    if (shareActions) shareActions.classList.remove('hidden');
    
    // Wire WhatsApp share
    const user = getCurrentUser();
    const appUrl = window.location.origin;
    const waLink = generateWhatsAppLink(result.code, user?.displayName || 'Someone', appUrl);
    const waBtn = document.getElementById('whatsapp-share-btn');
    if (waBtn) waBtn.onclick = () => window.open(waLink, '_blank');
    
    // Show the create challenge modal (not the challenge lobby screen)
    document.getElementById('challenge-create-modal')?.classList.remove('hidden');
    
    showToast(`Rematch ready! Code: ${result.code}`, 'success', 4000);
    
    // Listen for opponent accepting
    if (_matchUnsubscribe) _matchUnsubscribe();
    _matchUnsubscribe = listenToMatch(result.matchId, async match => {
      if (match.status === 'active' && match.opponentId) {
        if (_matchUnsubscribe) { _matchUnsubscribe(); _matchUnsubscribe = null; }
        document.getElementById('challenge-create-modal')?.classList.add('hidden');
        showToast(`${match.opponentName} accepted! Starting rematch… ⚔️`, 'success', 3000);
        setTimeout(() => startBattle(result.matchId, match.questions, match), 1200);
      }
    });
    
  } catch (err) {
    showToast(err.message || 'Failed to create rematch', 'error');
    btn.disabled = false;
    btn.innerHTML = '🔄 Request Rematch';
  }
});
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
// Issue 2 Fix — handleChallengeUser
// Creates a match and opens the battle screen
// when challenging a user from the leaderboard.
// ============================================
async function handleChallengeUser(opponentUid, opponentName) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
  if (opponentUid === user.uid) {
    showToast("You can't challenge yourself!", 'error'); return;
  }

  showToast(`⚔️ Creating battle with ${opponentName}…`, 'info', 2000);

  try {
    if (!_localQuestionsCache) _localQuestionsCache = await getLocalQuestions();
    const { createChallenge: _createChallenge } = await import('./services/match.service.js');
    const result = await _createChallenge(_localQuestionsCache);

    _currentChallenge = { ...result, targetUid: opponentUid, targetName: opponentName };

    const codeDisplay   = document.getElementById('challenge-code-display');
    const codeBox       = document.getElementById('challenge-code-box');
    const createActions = document.getElementById('challenge-create-actions');
    const shareActions  = document.getElementById('challenge-share-actions');

    if (codeDisplay) codeDisplay.textContent = result.code;
    if (codeBox)     codeBox.classList.remove('hidden');
    if (createActions) createActions.classList.add('hidden');
    if (shareActions)  shareActions.classList.remove('hidden');

    const appUrl = window.location.origin;
    const waLink = generateWhatsAppLink(result.code, user.displayName || 'Someone', appUrl);
    const waBtn  = document.getElementById('whatsapp-share-btn');
    if (waBtn) waBtn.onclick = () => window.open(waLink, '_blank');

    document.getElementById('challenge-create-modal')?.classList.remove('hidden');

    showToast(`Challenge code: ${result.code} — share it with ${opponentName}!`, 'success', 5000);

    if (_matchUnsubscribe) _matchUnsubscribe();
    _matchUnsubscribe = listenToMatch(result.matchId, async match => {
      if (match.status === 'active' && match.opponentId) {
        if (_matchUnsubscribe) { _matchUnsubscribe(); _matchUnsubscribe = null; }
        document.getElementById('challenge-create-modal')?.classList.add('hidden');
        showToast(`${match.opponentName} accepted! Starting battle… ⚔️`, 'success', 3000);
        setTimeout(() => startBattle(result.matchId, match.questions, match), 1200);
      }
    });

  } catch (err) {
    showToast(err.message || 'Failed to create challenge', 'error');
  }
}

// ============================================
// GLOBAL SQ NAMESPACE
// ============================================
window.SQ = {
  switchAuthTab, closeAuthModal, showConfirm, showScreen, showToast,
  openAvatarModal, closeAvatarModal, filterAvatars, selectAvatar, saveSelectedAvatar,
  closeChallengeModal, closeChallengeAcceptModal, acceptChallengeByCode, generateChallenge,
  challengeUser(uid, name) {
    handleChallengeUser(uid, name);
  }
};
