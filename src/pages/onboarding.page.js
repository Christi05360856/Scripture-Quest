// ============================================
// SCRIPTUREQUEST V5 — Onboarding Sequence (v3)
// ============================================
// CHANGE FROM PREVIOUS VERSION:
// Two slides — Leaderboard and Profile — now render
// a small static MOCKUP panel with labeled callouts
// instead of the generic single-icon-and-text template.
// This is still pure illustration (not real, live DOM —
// it's a hand-built mini mockup), so it carries zero risk
// of breaking or being broken by the real app screens.
// All other 7 slides are UNCHANGED from the previous
// version (Welcome, Path, Daily, Battle, Rewards,
// Settings, Closing all still use the simple template).
// ============================================

import { ONBOARDING_SEEN_KEY } from '../utils/constants.js';

// ── Slide definitions ──
// type: 'simple' (icon + title + body) or 'mockup' (custom panel)
const SLIDES = [
  {
    type: 'simple',
    icon: '📖',
    accent: 'primary',
    title: 'Welcome to ScriptureQuest',
    body: 'A structured way to learn the entire Bible — one passage at a time, with quizzes, streaks, and friendly competition along the way.'
  },
  {
    type: 'simple',
    icon: '🗺️',
    accent: 'primary',
    title: 'The Learning Path',
    body: 'This is your home screen. Work through every book of the Bible in order. Tap a section to open it, then tap a round to start. Finish a round to unlock the next one.'
  },
  {
    type: 'simple',
    icon: '📅',
    accent: 'warm',
    title: 'Daily Challenge',
    body: 'A quick timed quiz from the full question pool. You get two attempts a day, and it\'s the only thing that keeps your streak alive — so don\'t skip a day!'
  },
  {
    type: 'simple',
    icon: '⚔️',
    accent: 'primary',
    title: 'Battle Mode',
    body: 'Challenge a friend head-to-head. Generate a code and share it, or challenge someone directly from the leaderboard. Made a mistake? You can cancel a pending challenge anytime before it\'s accepted.'
  },
  {
    type: 'mockup',
    mockup: 'leaderboard',
    title: 'Leaderboard',
    body: 'See how you rank this week, challenge anyone who\'s online, or jump straight into a friend\'s battle with their code.'
  },
  {
    type: 'simple',
    icon: '🎁',
    accent: 'success',
    title: 'Rewards',
    body: 'Earn points as you play and unlock real rewards at milestones. The top 3 on the weekly leaderboard also win prizes when the week resets.'
  },
  {
    type: 'mockup',
    mockup: 'profile',
    title: 'Your Profile',
    body: 'Make it yours, track your progress, and see everything you\'ve earned so far.'
  },
  {
    type: 'simple',
    icon: '⚙️',
    accent: 'info',
    title: 'Settings',
    body: 'Switch between light and dark mode, manage notifications, contact support, or come back here anytime to replay this walkthrough.'
  },
  {
    type: 'simple',
    icon: '🎉',
    accent: 'success',
    title: "You're All Set!",
    body: 'That\'s everything you need to get started. Jump in, start your first lesson, and build your streak from day one.'
  }
];

// ── Module state ──
let _currentSlide = 0;
let _onDone       = null;

const el = id => document.getElementById(id);

// ============================================
// PUBLIC API (unchanged signatures)
// ============================================

export function shouldShowOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) !== 'true';
  } catch {
    return false;
  }
}

export function markOnboardingSeen() {
  try { localStorage.setItem(ONBOARDING_SEEN_KEY, 'true'); } catch {}
}

export function initOnboardingScreen(onDone) {
  _onDone       = onDone || null;
  _currentSlide = 0;
  _renderSlide();
  _wireButtons();
}

// ============================================
// RENDER CURRENT SLIDE
// ============================================

function _renderSlide() {
  const slide = SLIDES[_currentSlide];
  if (!slide) return;

  const areaEl = el('onb-slide-area');
  if (areaEl) {
    areaEl.innerHTML = slide.type === 'mockup'
      ? _mockupTemplate(slide)
      : _simpleTemplate(slide);
  }

  const skipBtn = el('onb-skip-btn');
  const backBtn = el('onb-back-btn');
  const nextBtn = el('onb-next-btn');
  const dotsEl  = el('onb-dots');

  const isFirst = _currentSlide === 0;
  const isLast  = _currentSlide === SLIDES.length - 1;

  if (skipBtn) skipBtn.classList.toggle('hidden', isLast);
  if (backBtn) backBtn.classList.toggle('hidden', isFirst);
  if (nextBtn) nextBtn.textContent = isLast ? "Let's Go!" : 'Next';

  if (dotsEl) {
    dotsEl.innerHTML = SLIDES.map((_, i) =>
      `<span class="onb-dot ${i === _currentSlide ? 'onb-dot--active' : ''}"></span>`
    ).join('');
  }

  // Re-wire buttons since #onb-slide-area's innerHTML replacement
  // doesn't touch the bottom bar, but we re-render fresh each time
  // for safety against stale listeners on repeated visits.
  _wireButtons();

  const contentEl = el('onb-slide-content') || areaEl?.firstElementChild;
  if (contentEl) {
    contentEl.classList.remove('onb-slide-content--enter');
    void contentEl.offsetWidth;
    contentEl.classList.add('onb-slide-content--enter');
  }
}

// ============================================
// SIMPLE TEMPLATE (icon + title + body)
// ============================================

function _simpleTemplate(slide) {
  return `
    <div class="onb-slide-content onb-slide-content--enter" id="onb-slide-content">
      <div class="onb-icon-badge onb-icon-badge--${slide.accent || 'primary'}">
        <span>${slide.icon}</span>
      </div>
      <h2 class="onb-slide-title">${_esc(slide.title)}</h2>
      <p class="onb-slide-body">${_esc(slide.body)}</p>
    </div>
  `;
}

// ============================================
// MOCKUP TEMPLATE (panel + labeled callouts)
// ============================================

function _mockupTemplate(slide) {
  const panel = slide.mockup === 'leaderboard'
    ? _leaderboardMockup()
    : _profileMockup();

  return `
    <div class="onb-slide-content onb-slide-content--enter onb-slide-content--mockup" id="onb-slide-content">
      ${panel}
      <h2 class="onb-slide-title onb-slide-title--mockup">${_esc(slide.title)}</h2>
      <p class="onb-slide-body">${_esc(slide.body)}</p>
    </div>
  `;
}

// ── Leaderboard mockup: sample row + code box + sword callout ──

function _leaderboardMockup() {
  return `
    <div class="onb-mockup-panel">
      <div class="onb-mockup-callout-wrap">
        <div class="onb-mockup-code-box">
          <span class="onb-mockup-code-label">SQ-XXXX</span>
          <span class="onb-mockup-code-btn">Join</span>
        </div>
        <span class="onb-callout-tag onb-callout-tag--top">Enter a friend's code here</span>
      </div>

      <div class="onb-mockup-callout-wrap" style="margin-top:14px">
        <div class="onb-mockup-row">
          <span class="onb-mockup-rank">🥇</span>
          <span class="onb-mockup-name">Sarah K.</span>
          <span class="onb-mockup-pts">1,240 pts</span>
          <span class="onb-mockup-sword">⚔️</span>
        </div>
        <span class="onb-callout-tag onb-callout-tag--bottom">Tap the sword to challenge anyone online</span>
      </div>
    </div>
  `;
}

// ── Profile mockup: avatar + stats row + badges grid ──

function _profileMockup() {
  return `
    <div class="onb-mockup-panel">
      <div class="onb-mockup-callout-wrap">
        <div class="onb-mockup-avatar">👤<span class="onb-mockup-avatar-edit">✏️</span></div>
        <span class="onb-callout-tag onb-callout-tag--top">Tap to change your avatar</span>
      </div>

      <div class="onb-mockup-callout-wrap" style="margin-top:14px">
        <div class="onb-mockup-stats-row">
          <div class="onb-mockup-stat"><span class="onb-mockup-stat-val">🔥 12</span><span class="onb-mockup-stat-lbl">Streak</span></div>
          <div class="onb-mockup-stat"><span class="onb-mockup-stat-val">⭐ Lvl 5</span><span class="onb-mockup-stat-lbl">Level</span></div>
        </div>
        <span class="onb-callout-tag onb-callout-tag--bottom">Your streak and level live here</span>
      </div>

      <div class="onb-mockup-callout-wrap" style="margin-top:14px">
        <div class="onb-mockup-badges-row">
          <span class="onb-mockup-badge">🥉</span>
          <span class="onb-mockup-badge">🥈</span>
          <span class="onb-mockup-badge onb-mockup-badge--locked">🔒</span>
        </div>
        <span class="onb-callout-tag onb-callout-tag--bottom">All your badges and achievements</span>
      </div>
    </div>
  `;
}

// ============================================
// BUTTON WIRING
// ============================================

function _wireButtons() {
  _rewire('onb-skip-btn', _finish);
  _rewire('onb-back-btn', _goBack);
  _rewire('onb-next-btn', _goNext);
}

function _rewire(id, handler) {
  const old = el(id);
  if (!old) return;
  const fresh = old.cloneNode(true);
  old.parentNode.replaceChild(fresh, old);
  fresh.addEventListener('click', handler);
}

function _goNext() {
  if (_currentSlide < SLIDES.length - 1) {
    _currentSlide++;
    _renderSlide();
  } else {
    _finish();
  }
}

function _goBack() {
  if (_currentSlide > 0) {
    _currentSlide--;
    _renderSlide();
  }
}

function _finish() {
  markOnboardingSeen();
  _onDone?.();
  _onDone = null;
}

// ============================================
// UTILITIES
// ============================================

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default {
  shouldShowOnboarding,
  markOnboardingSeen,
  initOnboardingScreen
};
    
