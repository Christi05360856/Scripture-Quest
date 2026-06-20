// ============================================
// SCRIPTUREQUEST V5 — Onboarding Tour
// Custom-built spotlight + tooltip walkthrough.
// No external library (no Intro.js dependency) —
// built from scratch to avoid adding a new package
// just for this, and to keep full control over
// styling so it matches the app's design tokens.
//
// Runs once per user (localStorage flag) after
// their first successful login. Replayable anytime
// via Settings > "Replay Tutorial".
//
// Lazy-loaded — only imported when needed, exactly
// like path.page.js / study.page.js etc.
// ============================================

import { ONBOARDING_SEEN_KEY } from '../utils/constants.js';

// ── Tour step definitions ──
// Each step targets a real element already in the DOM.
// If a target element isn't found when the tour runs,
// that step is silently skipped (e.g. FABs not yet
// rendered) rather than breaking the whole tour.
const STEPS = [
  {
    target: '#screen-path',
    title: 'Welcome to ScriptureQuest! 📖',
    body: 'This is your Learning Path — work through the entire Bible, one passage at a time. Tap any open section to see its lessons.',
    placement: 'center' // full-screen intro, no spotlight cutout
  },
  {
    target: '#daily-challenge-fab',
    title: 'Daily Challenge',
    body: 'Tap here for a quick timed quiz. You get two attempts a day, and it\'s the only thing that keeps your streak alive.',
    placement: 'top'
  },
  {
    target: '#battle-fab',
    title: 'Battle Mode',
    body: 'Challenge a friend to a head-to-head quiz battle. Winner takes bonus XP!',
    placement: 'top'
  },
  {
    target: '[data-screen="leaderboard"]',
    title: 'Weekly Leaderboard',
    body: 'See how you rank against everyone this week. Top 3 win real prizes when the week ends.',
    placement: 'bottom'
  },
  {
    target: '[data-screen="profile"]',
    title: 'Your Profile',
    body: 'Track your XP, level, streak, and badges here. You can replay this tour anytime from Settings.',
    placement: 'bottom'
  }
];

// ── Module state ──
let _currentStep   = 0;
let _activeSteps   = []; // STEPS filtered down to ones whose target actually exists
let _overlayEl     = null;
let _onFinish       = null;

// ============================================
// PUBLIC: should the tour auto-run right now?
// Called once after a successful login.
// ============================================

export function shouldShowOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) !== 'true';
  } catch {
    return false; // if localStorage is unavailable, don't force a tour
  }
}

// ============================================
// PUBLIC: mark as seen without showing it
// (not currently called anywhere, but exported
// in case a future "skip forever" action needs it)
// ============================================

export function markOnboardingSeen() {
  try { localStorage.setItem(ONBOARDING_SEEN_KEY, 'true'); } catch {}
}

// ============================================
// PUBLIC: start the tour
// Call this either automatically (first login) or
// manually (Settings > Replay Tutorial).
// onFinish is called when the tour ends or is skipped.
// ============================================

export function startOnboarding(onFinish) {
  _onFinish = onFinish || null;

  // Filter to steps whose target element actually exists right now.
  // This protects against e.g. the FABs not being in the DOM yet,
  // or a future step referencing something that got removed.
  _activeSteps = STEPS.filter(step =>
    step.placement === 'center' || document.querySelector(step.target)
  );

  if (!_activeSteps.length) {
    _finish();
    return;
  }

  _currentStep = 0;
  _buildOverlay();
  _renderStep();
}

// ============================================
// OVERLAY CONSTRUCTION
// ============================================

function _buildOverlay() {
  _teardownOverlay(); // safety: remove any stale overlay first

  _overlayEl = document.createElement('div');
  _overlayEl.id = 'onboarding-overlay';
  _overlayEl.className = 'onboarding-overlay';
  _overlayEl.innerHTML = `
    <div class="onboarding-spotlight" id="onboarding-spotlight"></div>
    <div class="onboarding-tooltip" id="onboarding-tooltip" role="dialog" aria-live="polite">
      <button class="onboarding-skip-btn" id="onboarding-skip-btn" aria-label="Skip tour">Skip</button>
      <h3 class="onboarding-tooltip-title" id="onboarding-tooltip-title"></h3>
      <p class="onboarding-tooltip-body" id="onboarding-tooltip-body"></p>
      <div class="onboarding-tooltip-footer">
        <div class="onboarding-dots" id="onboarding-dots"></div>
        <div class="onboarding-tooltip-actions">
          <button class="onboarding-back-btn" id="onboarding-back-btn">Back</button>
          <button class="onboarding-next-btn" id="onboarding-next-btn">Next</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(_overlayEl);

  document.getElementById('onboarding-skip-btn')
    ?.addEventListener('click', _finish);
  document.getElementById('onboarding-back-btn')
    ?.addEventListener('click', _goBack);
  document.getElementById('onboarding-next-btn')
    ?.addEventListener('click', _goNext);

  // Re-position on resize/orientation change while tour is open
  window.addEventListener('resize', _repositionCurrentStep);
}

function _teardownOverlay() {
  window.removeEventListener('resize', _repositionCurrentStep);
  if (_overlayEl) {
    _overlayEl.remove();
    _overlayEl = null;
  }
}

// ============================================
// STEP RENDERING
// ============================================

function _renderStep() {
  const step = _activeSteps[_currentStep];
  if (!step || !_overlayEl) return;

  const titleEl = document.getElementById('onboarding-tooltip-title');
  const bodyEl  = document.getElementById('onboarding-tooltip-body');
  const backBtn = document.getElementById('onboarding-back-btn');
  const nextBtn = document.getElementById('onboarding-next-btn');

  if (titleEl) titleEl.textContent = step.title;
  if (bodyEl)  bodyEl.textContent  = step.body;

  const isFirst = _currentStep === 0;
  const isLast  = _currentStep === _activeSteps.length - 1;

  if (backBtn) backBtn.classList.toggle('hidden', isFirst);
  if (nextBtn) nextBtn.textContent = isLast ? 'Got it!' : 'Next';

  _renderDots();
  _positionSpotlightAndTooltip(step);
}

function _renderDots() {
  const dotsEl = document.getElementById('onboarding-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = _activeSteps.map((_, i) =>
    `<span class="onboarding-dot ${i === _currentStep ? 'onboarding-dot--active' : ''}"></span>`
  ).join('');
}

// ============================================
// SPOTLIGHT + TOOLTIP POSITIONING
// ============================================

function _positionSpotlightAndTooltip(step) {
  const spotlightEl = document.getElementById('onboarding-spotlight');
  const tooltipEl   = document.getElementById('onboarding-tooltip');
  if (!spotlightEl || !tooltipEl) return;

  // Center placement = full intro slide, no cutout, tooltip centered
  if (step.placement === 'center') {
    spotlightEl.style.display = 'none';
    tooltipEl.classList.add('onboarding-tooltip--center');
    tooltipEl.style.top  = '';
    tooltipEl.style.left = '';
    tooltipEl.style.transform = '';
    return;
  }

  tooltipEl.classList.remove('onboarding-tooltip--center');

  const targetEl = document.querySelector(step.target);
  if (!targetEl) {
    // Target vanished since the tour started (e.g. screen changed) — skip ahead
    _goNext();
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const pad  = 8;

  // Position the spotlight cutout exactly over the target element
  spotlightEl.style.display = 'block';
  spotlightEl.style.top    = `${rect.top - pad}px`;
  spotlightEl.style.left   = `${rect.left - pad}px`;
  spotlightEl.style.width  = `${rect.width + pad * 2}px`;
  spotlightEl.style.height = `${rect.height + pad * 2}px`;

  // Position tooltip above or below the target based on placement
  // and available viewport space, then clamp horizontally so it
  // never runs off the left/right edge of the screen.
  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  tooltipEl.style.width = `${tooltipWidth}px`;

  let top;
  if (step.placement === 'top') {
    top = rect.top - pad - 12; // tooltip sits above target, anchored by its own bottom edge
    tooltipEl.style.transform = 'translateY(-100%)';
  } else {
    top = rect.bottom + pad + 12; // tooltip sits below target
    tooltipEl.style.transform = 'translateY(0)';
  }

  let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

  tooltipEl.style.top  = `${Math.max(8, top)}px`;
  tooltipEl.style.left = `${left}px`;

  // Scroll target into view if it's off-screen (defensive — most
  // targets here are fixed-position FABs/nav, but the path screen
  // itself can scroll)
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function _repositionCurrentStep() {
  const step = _activeSteps[_currentStep];
  if (step) _positionSpotlightAndTooltip(step);
}

// ============================================
// NAVIGATION
// ============================================

function _goNext() {
  if (_currentStep < _activeSteps.length - 1) {
    _currentStep++;
    _renderStep();
  } else {
    _finish();
  }
}

function _goBack() {
  if (_currentStep > 0) {
    _currentStep--;
    _renderStep();
  }
}

function _finish() {
  markOnboardingSeen();
  _teardownOverlay();
  _onFinish?.();
  _onFinish = null;
}

export default {
  shouldShowOnboarding,
  markOnboardingSeen,
  startOnboarding
};

