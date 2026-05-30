// ============================================
// SCRIPTUREQUEST V4 — app.js (PATCHED)
// Fixes: local quiz fallback, profile complete
// hide, achievements tab, settings tab,
// contact details lock after save.
// ============================================

import { initAuthListener, login, register,
         logout, updateProfile_,
         resetPassword, getAuthErrorMessage } from './services/auth.service.js';
import { initTheme, setTheme, toggleTheme }   from './services/theme.service.js';
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

// Local questions pool — loaded lazily
let _localQuestions = null;
async function getLocalQuestions() {
  if (_localQuestions) return _localQuestions;
  try {
    // Try to load questions from the questions module if available
    const mod = await import('./questions.js').catch(() => null);
    if (mod?.questions?.length) { _localQuestions = mod.questions; return _localQuestions; }
    // Fallback: tiny sample set so app doesn't crash
    _localQuestions = [];
    return _localQuestions;
  } catch { return []; }
}

// Lazy-load quiz page
let _quizPage = null;
async function getQuizPage() {
  if (!_quizPage) _quizPage = await import('./pages/quiz.page.js');
  return _quizPage;
}

// Active local session storage (for local quiz submit)
let _activeLocalSession = null;

// ============================================
// SCREEN MANAGEMENT
// ============================================
const SCREENS = ['loading','landing','quiz','result','leaderboard','rewards','profile','settings'];

function showScreen(name) {
  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('hidden', id !== name);
  });

  const nav    = document.getElementById('bottom-nav');
  const noNav  = ['loading','quiz','result'];
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
}
// ============================================
// AUTH LISTENER
// ============================================
initAuthListener(
  async (user, profile, stats) => {
    await initTheme(profile);
    checkNewWeek();
    showScreen('landing');
    initLandingScreen();
  },
  () => {
    initTheme(null);
    showScreen('landing');
    document.getElementById('auth-section')?.classList.remove('hidden');
    document.getElementById('welcome-section')?.classList.add('hidden');
    document.getElementById('bottom-nav')?.classList.add('hidden');
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

  // FIX: only show profile warning if actually incomplete
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

  const el = id => document.getElementById(id);

  const name     = profile?.displayName || user.displayName || 'User';
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  if (el('profile-avatar')) el('profile-avatar').textContent = initials;
  if (el('profile-name'))   el('profile-name').textContent   = name;
  if (el('profile-email'))  el('profile-email').textContent  = user.email || '';
  if (el('profile-role'))   el('profile-role').textContent   = profile?.role || 'User';

  if (profile?.createdAt?.toDate && el('profile-joined')) {
    const d = profile.createdAt.toDate();
    el('profile-joined').textContent = `Joined ${d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`;
  }

  // FIX: If contact is already saved, show read-only — don't let them keep editing
  const contactSection = el('contact-edit-section');
  const contactDisplay = el('contact-display-section');

  if (profile?.profileComplete && profile?.phoneNumber) {
    // Show saved info as read-only
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
         if (stats) {
    const xp      = stats.totalXp     || 0;
    const level   = stats.level       || 1;
    const needed  = Math.ceil(100 * Math.pow(level, 1.5));
    const current = stats.currentLevelXp || 0;
    const pct     = Math.min(100, Math.round((current / needed) * 100));

    if (el('p-total-xp'))       el('p-total-xp').textContent       = xp.toLocaleString();
    if (el('p-level'))          el('p-level').textContent           = level;
    if (el('p-streak'))         el('p-streak').textContent          = stats.currentStreak  || 0;
    if (el('p-quizzes'))        el('p-quizzes').textContent         = stats.quizzesTaken   || 0;
    if (el('p-best'))           el('p-best').textContent            = `${stats.bestScore   || 0}%`;
    if (el('p-longest-streak')) el('p-longest-streak').textContent  = stats.longestStreak  || 0;
    if (el('p-lvl-current'))    el('p-lvl-current').textContent     = level;
    if (el('p-xp-current'))     el('p-xp-current').textContent      = current.toLocaleString();
    if (el('p-xp-needed'))      el('p-xp-needed').textContent       = needed.toLocaleString();
    if (el('p-xp-fill'))        el('p-xp-fill').style.width         = `${pct}%`;
    if (el('p-lvl-next'))       el('p-lvl-next').textContent        = level + 1;
    if (el('p-xp-needed-2'))    el('p-xp-needed-2').textContent     = needed.toLocaleString();

    // Render achievements
    renderAchievements(stats);
  }

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

  const quizzes = stats.quizzesTaken   || 0;
  const streak  = stats.longestStreak  || 0;
  const xp      = stats.totalXp        || 0;
  const perfect = stats.perfectScores  || 0;

  const achievements = [
    { id:'first_quiz',  icon:'📖', title:'First Quiz',       desc:'Complete your first quiz',      done: quizzes >= 1 },
    { id:'quiz10',      icon:'📚', title:'10 Quizzes',        desc:'Complete 10 quizzes',            done: quizzes >= 10 },
    { id:'quiz50',      icon:'🎓', title:'Bible Scholar',     desc:'Complete 50 quizzes',            done: quizzes >= 50 },
    { id:'quiz100',     icon:'👑', title:'Legend',            desc:'Complete 100 quizzes',           done: quizzes >= 100 },
    { id:'streak7',     icon:'🔥', title:'Week Warrior',      desc:'7-day streak',                   done: streak >= 7 },
    { id:'streak30',    icon:'🌟', title:'Monthly Champion',  desc:'30-day streak',                  done: streak >= 30 },
    { id:'perfect1',    icon:'💯', title:'Perfectionist',     desc:'Score 100% on a quiz',           done: perfect >= 1 },
    { id:'perfect5',    icon:'🏆', title:'Perfect 5',         desc:'5 perfect scores',               done: perfect >= 5 },
    { id:'xp500',       icon:'⭐', title:'XP Rising',         desc:'Earn 500 XP',                    done: xp >= 500 },
    { id:'xp5000',      icon:'💫', title:'XP Master',         desc:'Earn 5,000 XP',                  done: xp >= 5000 },
    { id:'xp20000',     icon:'🚀', title:'XP Legend',         desc:'Earn 20,000 XP',                 done: xp >= 20000 },
    { id:'top3',        icon:'🥇', title:'Podium Finisher',   desc:'Finish Top 3 weekly',            done: (stats.topThreeFinishes||0) >= 1 },
  ];

  container.innerHTML = achievements.map(a => `
    <div class="achievement-card ${a.done ? 'unlocked' : 'locked'}">
      <div class="ach-icon">${a.done ? a.icon : '🔒'}</div>
      <div class="ach-title">${a.title}</div>
      <div class="ach-desc">${a.desc}</div>
      ${a.done ? '<div class="ach-badge">Unlocked</div>' : ''}
    </div>`).join('');
}

// ============================================
// SETTINGS SCREEN
// ============================================
function initSettingsScreen() {
  const profile = getUserProfile();
  const theme   = getState('theme')?.current || 'light';

  // Dark mode toggle
  const darkToggle = document.getElementById('setting-dark-mode');
  if (darkToggle) darkToggle.checked = theme === 'dark';

  // Sound toggle
  const soundToggle = document.getElementById('setting-sound');
  if (soundToggle) soundToggle.checked = profile?.soundEnabled !== false;

  // Notification permission status
  const notifToggle = document.getElementById('setting-notifications');
  if (notifToggle) {
    notifToggle.checked = Notification?.permission === 'granted';
  }
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
      // Try Cloud Functions first, fall back to local
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
      // Pass local submit function if this is a local session
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
  const el  = id => document.getElementById(id);
  const pct = result.percentage || 0;
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
  const okBtn  = el('confirm-ok-btn');
  const newOk  = okBtn?.cloneNode(true);
  okBtn?.parentNode.replaceChild(newOk, okBtn);
  newOk?.addEventListener('click', () => { modal?.classList.add('hidden'); onConfirm?.(); });
}

// ============================================
// EVENT WIRING
// ============================================
document.addEventListener('DOMContentLoaded', () => {

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
      const target  = btn.dataset.screen;
      if (!target) return;
      if (!['landing','settings'].includes(target) && !getCurrentUser()) { openAuthModal(); return; }
      if (getState('nav')?.current === 'leaderboard' && target !== 'leaderboard') {
        unsubscribeLeaderboard();
        if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
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
      // Refresh auth data so profile shows as complete
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
    window.open('https://wa.me/+2349167055488?text=Hi%2C%20I%20need%20help%20with%20ScriptureQuest', '_blank');
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
// GLOBAL SQ NAMESPACE
// ============================================
window.SQ = { switchAuthTab, closeAuthModal, showConfirm, showScreen, showToast };  
