// ============================================
// SCRIPTUREQUEST V4 — app.js
// Main entry point. Boots auth, wires all
// screens, handles navigation, global events.
// ============================================

import { initAuthListener, login, register,
         logout, updateProfile_, resetPassword,
         getAuthErrorMessage }    from './services/auth.service.js';
import { initTheme, setTheme,
         toggleTheme }            from './services/theme.service.js';
import { checkDailyLimit,
         loadQuizStateFromStorage,
         clearQuizStorage,
         createQuizSession,
         saveQuizStateToStorage,
         hasResumableQuiz }       from './services/quiz.service.js';
import { fetchLeaderboard,
         subscribeLeaderboard,
         unsubscribeLeaderboard,
         renderLeaderboardRows,
         renderUserRank,
         getUserRank }            from './services/leaderboard.service.js';
import { renderRewardTiers,
         renderRewardProgress,
         claimMilestoneReward,
         getSentMilestones }      from './services/rewards.service.js';
import { setState, getState,
         getCurrentUser,
         getUserProfile,
         getUserStats,
         subscribe }              from './state/store.js';
import { showToast }              from './utils/toast.js';
import { getCurrentWeekId,
         getDisplayWeek,
         getTimeUntilNextWeek,
         formatCountdown }        from './utils/week.js';
import { LAST_SEEN_WEEK,
         SCORE_PASS_THRESHOLD }   from './utils/constants.js';

// Lazy-load quiz page module
let _quizPage = null;
async function getQuizPage() {
  if (!_quizPage) _quizPage = await import('./pages/quiz.page.js');
  return _quizPage;
}

// ============================================
// SCREEN MANAGEMENT
// ============================================

const SCREENS = ['loading', 'landing', 'quiz', 'result', 'leaderboard', 'rewards', 'profile'];

function showScreen(name) {
  SCREENS.forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.toggle('hidden', id !== name);
  });

  const nav = document.getElementById('bottom-nav');
  const noNav = ['loading', 'quiz', 'result'];
  if (nav) nav.classList.toggle('hidden', noNav.includes(name));

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(btn => {
    const target = btn.dataset.screen;
    btn.classList.toggle('active',
      target === name ||
      (name === 'landing' && target === 'landing')
    );
  });

  setState('nav', { current: name });

  // Screen-specific init
  if (name === 'leaderboard') initLeaderboardScreen();
  if (name === 'rewards')     initRewardsScreen();
  if (name === 'profile')     initProfileScreen();
  if (name === 'landing')     initLandingScreen();
}
// ============================================
// AUTH LISTENER — app boot
// ============================================

initAuthListener(
  // onLogin
  async (user, profile, stats) => {
    await initTheme(profile);
    checkNewWeek();
    showScreen('landing');
    initLandingScreen();
  },
  // onLogout
  () => {
    initTheme(null);
    showScreen('landing');
    const authSection     = document.getElementById('auth-section');
    const welcomeSection  = document.getElementById('welcome-section');
    if (authSection)    authSection.classList.remove('hidden');
    if (welcomeSection) welcomeSection.classList.add('hidden');
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

  // Populate welcome text
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

  // Profile incomplete warning
  if (!profile?.profileComplete) {
    el('profile-incomplete-warn')?.classList.remove('hidden');
  } else {
    el('profile-incomplete-warn')?.classList.add('hidden');
  }

  // Check resume
  if (hasResumableQuiz()) {
    el('resume-section')?.classList.remove('hidden');
  } else {
    el('resume-section')?.classList.add('hidden');
  }

  // Check daily limit
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
  if (!stats) return 'Ready for today\'s challenge?';
  const total = stats.quizzesTaken || 0;
  if (total === 0) return 'Take your first quiz and get on the leaderboard!';
  if (total < 5)   return `${total} quizzes taken — keep going!`;
  return `${total} quizzes completed — you\'re on fire!`;
}

let _limitTimer = null;
function startLimitCountdown(nextTime) {
  const el = document.getElementById('limit-countdown');
  if (!el) return;
  if (_limitTimer) clearInterval(_limitTimer);

  function update() {
    const diff = nextTime - Date.now();
    if (diff <= 0) {
      clearInterval(_limitTimer);
      initLandingScreen();
      return;
    }
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
// LEADERBOARD SCREEN
// ============================================

let _lbCountdownTimer = null;

async function initLeaderboardScreen() {
  const weekNumber = document.getElementById('lb-week-number');
  if (weekNumber) weekNumber.textContent = getDisplayWeek();

  // Countdown timer
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

  // Show skeleton, hide entries
  document.getElementById('lb-skeleton')?.classList.remove('hidden');
  document.getElementById('lb-entries')?.classList.add('hidden');

  // Subscribe to realtime updates
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

  // Progress bar
  renderRewardProgress(
    document.getElementById('rewards-progress-fill'),
    document.getElementById('rewards-next-milestone'),
    points
  );

  // Tiers
  const sent     = await getSentMilestones(user.uid);
  const claimed  = []; // TODO: fetch from rewardClaims

  renderRewardTiers(
    document.getElementById('reward-tiers-container'),
    points,
    claimed,
    sent,
    async (threshold, rewardType) => {
      try {
        await claimMilestoneReward(threshold, rewardType);
        showToast('Reward claimed! We\'ll be in touch.', 'success');
        initRewardsScreen();
      } catch (err) {
        showToast(err.message, 'error');
      }
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

  const el = id => document.getElementById(id);

  const name  = profile?.displayName || user.displayName || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (el('profile-avatar'))       el('profile-avatar').textContent     = initials;
  if (el('profile-name'))         el('profile-name').textContent        = name;
  if (el('profile-email'))        el('profile-email').textContent       = user.email || '';
  if (el('profile-role'))         el('profile-role').textContent        = profile?.role || 'User';
  if (el('profile-phone'))        el('profile-phone').value             = profile?.phoneNumber || '';
  if (el('profile-network'))      el('profile-network').value           = profile?.networkProvider || '';

  if (profile?.createdAt?.toDate && el('profile-joined')) {
    const d = profile.createdAt.toDate();
    el('profile-joined').textContent = `Joined ${d.toLocaleDateString('en-GB', { month:'long', year:'numeric' })}`;
  }

  if (stats) {
    const xp      = stats.totalXp    || 0;
    const level   = stats.level      || 1;
    const needed  = Math.ceil(100 * Math.pow(level, 1.5));
    const current = stats.currentLevelXp || 0;
    const pct     = Math.min(100, Math.round((current / needed) * 100));

    if (el('p-total-xp'))        el('p-total-xp').textContent        = xp.toLocaleString();
    if (el('p-level'))           el('p-level').textContent            = level;
    if (el('p-streak'))          el('p-streak').textContent           = stats.currentStreak  || 0;
    if (el('p-quizzes'))         el('p-quizzes').textContent          = stats.quizzesTaken   || 0;
    if (el('p-best'))            el('p-best').textContent             = `${stats.bestScore || 0}%`;
    if (el('p-longest-streak'))  el('p-longest-streak').textContent   = stats.longestStreak  || 0;
    if (el('p-lvl-current'))     el('p-lvl-current').textContent      = level;
    if (el('p-xp-current'))      el('p-xp-current').textContent       = current.toLocaleString();
    if (el('p-xp-needed'))       el('p-xp-needed').textContent        = needed.toLocaleString();
    if (el('p-xp-fill'))         el('p-xp-fill').style.width          = `${pct}%`;
    if (el('p-lvl-next'))        el('p-lvl-next').textContent         = level + 1;
    if (el('p-xp-needed-2'))     el('p-xp-needed-2').textContent      = needed.toLocaleString();
  }

  // Highlight active theme button
  const currentTheme = getState('theme')?.current || 'light';
  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.classList.toggle('btn-primary',   btn.dataset.theme === currentTheme);
    btn.classList.toggle('btn-secondary', btn.dataset.theme !== currentTheme);
  });
}

// ============================================
// QUIZ FLOW
// ============================================

async function handleStartQuiz(resume = false) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }

  const startBtn = document.getElementById('start-quiz-btn');
  if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Starting…'; }

  try {
    let sessionData;

    if (resume) {
      sessionData = loadQuizStateFromStorage();
      if (!sessionData) {
        showToast('No resumable quiz found. Starting fresh.', 'info');
        return handleStartQuiz(false);
      }
    } else {
      sessionData = await createQuizSession();
    }

    const qp = await getQuizPage();
    showScreen('quiz');
    await qp.initQuizScreen(sessionData, {
      onComplete: handleQuizComplete,
      onAbandon:  handleQuizAbandon
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (startBtn) { startBtn.disabled = false; startBtn.innerHTML = '<i class="fas fa-play"></i> Start Quiz'; }
  }
}

async function handleQuizComplete(result) {
  if (_limitTimer) clearInterval(_limitTimer);
  showScreen('result');
  renderResultScreen(result);
}

function handleQuizAbandon() {
  clearQuizStorage();
  showScreen('landing');
  initLandingScreen();
}

// ============================================
// RESULT SCREEN
// ============================================

function renderResultScreen(result) {
  const el = id => document.getElementById(id);
  const pct    = result.percentage || 0;
  const passed = pct >= SCORE_PASS_THRESHOLD;

  if (el('result-icon'))         el('result-icon').textContent       = pct === 100 ? '🏆' : passed ? '🎉' : '📖';
  if (el('result-title'))        el('result-title').textContent      = pct === 100 ? 'Perfect Score!' : passed ? 'Well Done!' : 'Keep Practising!';
  if (el('result-candidate-name')) el('result-candidate-name').textContent = getUserProfile()?.displayName || '';
  if (el('result-pct'))          el('result-pct').textContent        = `${pct}%`;
  if (el('result-detail'))       el('result-detail').textContent     = `${result.score} / ${result.totalQuestions} correct`;
  if (el('result-xp'))           el('result-xp').textContent         = `+${result.xpEarned || 0} XP`;
  if (el('r-streak'))            el('r-streak').textContent           = result.streak || 0;
  if (el('r-level'))             el('r-level').textContent            = result.newLevel || 1;
  if (el('r-total-xp'))          el('r-total-xp').textContent         = (result.totalXp || 0).toLocaleString();
  if (el('r-weekly-pts'))        el('r-weekly-pts').textContent       = (result.weeklyPoints || 0).toLocaleString();

  // Pass/fail badge
  const badge = el('result-badge');
  if (badge) {
    badge.textContent  = passed ? '✅ Passed' : '❌ Try Again';
    badge.className    = `score-badge ${passed ? 'pass' : 'fail'}`;
  }

  // Level up modal
  if (result.leveledUp) {
    setTimeout(() => {
      const modal = el('levelup-modal');
      const lvl   = el('levelup-level');
      if (lvl)   lvl.textContent = `Level ${result.newLevel}`;
      if (modal) modal.classList.remove('hidden');
    }, 1200);
  }

  // Achievement unlocks
  if (result.achievementUnlocks?.length) {
    const box  = el('achievement-unlocks');
    const text = el('achievement-text');
    if (box && text) {
      text.textContent = result.achievementUnlocks.join(', ');
      box.classList.remove('hidden');
    }
  }

  // Study tip
  const tip = el('study-tip');
  if (tip && pct < 60) {
    tip.textContent = '💡 Tip: Regular daily reading improves your quiz scores significantly!';
    tip.classList.remove('hidden');
  }

  // Result chart
  renderResultChart(result.score || 0, (result.totalQuestions || 15) - (result.score || 0));

  // Attempts remaining message
  const attemptsMsg = el('result-attempts-msg');
  if (attemptsMsg) {
    checkDailyLimit().then(limit => {
      attemptsMsg.textContent = limit.remaining > 0
        ? `You have ${limit.remaining} quiz attempt${limit.remaining !== 1 ? 's' : ''} remaining today.`
        : 'You\'ve used both quizzes for today. See you tomorrow!';
    });
  }
}

function renderResultChart(correct, wrong) {
  const canvas = document.getElementById('result-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas._chartInstance) canvas._chartInstance.destroy();

  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#9fa8da' : '#64748b';

  canvas._chartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Incorrect'],
      datasets: [{
        data: [correct, wrong],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { weight: '700', family: 'Nunito' }, padding: 16 }
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
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');

  clearAuthMessage();

  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
    tabLogin?.classList.add('active');
    tabRegister?.classList.remove('active');
  } else {
    loginForm?.classList.add('hidden');
    registerForm?.classList.remove('hidden');
    tabLogin?.classList.remove('active');
    tabRegister?.classList.add('active');
  }
}

// ============================================
// CONFIRM MODAL
// ============================================

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
  newOk?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    onConfirm?.();
  });
}
// ============================================
// EVENT WIRING
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth modal ──
  document.getElementById('open-auth-btn')?.addEventListener('click', openAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAuthModal();
  });

  // Login
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email || !password) return showAuthMessage('Please fill in all fields');
    const btn = document.getElementById('login-btn');
    btn.disabled    = true;
    btn.textContent = 'Signing in…';
    clearAuthMessage();
    try {
      await login({ email, password });
      closeAuthModal();
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled    = false;
      btn.innerHTML   = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  });

  // Register
  document.getElementById('register-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('reg-name')?.value.trim();
    const email    = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    if (!name || !email || !password) return showAuthMessage('Please fill in all fields');
    const btn = document.getElementById('register-btn');
    btn.disabled    = true;
    btn.textContent = 'Creating account…';
    clearAuthMessage();
    try {
      await register({ name, email, password });
      closeAuthModal();
      showToast(`Welcome to ScriptureQuest, ${name.split(' ')[0]}! 🎉`, 'success', 4000);
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
      btn.disabled    = false;
      btn.innerHTML   = '<i class="fas fa-user-plus"></i> Create Account';
    }
  });

  // Forgot password
  document.getElementById('forgot-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) return showAuthMessage('Enter your email above first', 'error');
    try {
      await resetPassword(email);
      showAuthMessage('Password reset email sent! Check your inbox.', 'success');
    } catch (err) {
      showAuthMessage(getAuthErrorMessage(err.code));
    }
  });

  // Enter key on auth inputs
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-btn')?.click();
    });
  });

  // ── Quiz buttons ──
  document.getElementById('start-quiz-btn')?.addEventListener('click', () => handleStartQuiz(false));
  document.getElementById('resume-quiz-btn')?.addEventListener('click', () => handleStartQuiz(true));

  // ── Bottom nav ──
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (!target) return;
      if (target !== 'landing' && !getCurrentUser()) {
        openAuthModal();
        return;
      }
      // Unsubscribe leaderboard if leaving that screen
      const current = getState('nav')?.current;
      if (current === 'leaderboard' && target !== 'leaderboard') {
        unsubscribeLeaderboard();
        if (_lbCountdownTimer) clearInterval(_lbCountdownTimer);
      }
      showScreen(target);
    });
  });

  // ── Result screen buttons ──
  document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => showScreen('leaderboard'));
  document.getElementById('back-home-btn')?.addEventListener('click', () => {
    showScreen('landing');
    initLandingScreen();
  });

  // ── Profile ──
  document.getElementById('save-contact-btn')?.addEventListener('click', async () => {
    const user    = getCurrentUser();
    const phone   = document.getElementById('profile-phone')?.value.trim();
    const network = document.getElementById('profile-network')?.value;
    const btn     = document.getElementById('save-contact-btn');

    btn.disabled    = true;
    btn.textContent = 'Saving…';
    try {
      await updateProfile_({ uid: user.uid, phone, network });
      showToast('Contact info saved! You\'re now eligible for rewards.', 'success');
      const note = document.getElementById('contact-required-note');
      if (note) note.textContent = '— ✅ Complete';
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Contact Info';
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    showConfirm({
      icon: '👋',
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      onConfirm: async () => {
        await logout();
        showScreen('landing');
      }
    });
  });

  // Theme preference buttons
  document.querySelectorAll('.theme-pref-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      initProfileScreen(); // refresh active button state
    });
  });

  // Theme toggles (header)
  ['quiz-theme-toggle', 'lb-theme-toggle'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', toggleTheme);
  });

  // ── Level up modal ──
  document.getElementById('levelup-close-btn')?.addEventListener('click', () => {
    document.getElementById('levelup-modal')?.classList.add('hidden');
  });

  // ── Confirm modal cancel ──
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-modal')?.classList.add('hidden');
  });

  // ── New week banner dismiss ──
  document.getElementById('new-week-dismiss')?.addEventListener('click', () => {
    document.getElementById('new-week-banner')?.classList.add('hidden');
  });

  // ── Profile link from landing warning ──
  document.getElementById('go-profile-btn')?.addEventListener('click', () => showScreen('profile'));

  // ── Leaderboard refresh ──
  document.getElementById('lb-refresh-btn')?.addEventListener('click', () => initLeaderboardScreen());

  // ── Service worker registration ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
});

// ============================================
// GLOBAL SQ NAMESPACE (for inline handlers)
// ============================================

window.SQ = {
  switchAuthTab,
  closeAuthModal,
  showConfirm,
  showScreen,
  showToast
};
