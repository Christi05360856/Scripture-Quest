// ============================================
// SCRIPTUREQUEST V5 — Onboarding Tour (FIXED)
// ============================================

import { ONBOARDING_SEEN_KEY } from '../utils/constants.js';

// ── Tour step definitions ──
const STEPS = [
  {
    target: '#screen-path',
    title: 'Welcome to ScriptureQuest! 📖',
    body: 'This is your Learning Path — work through the entire Bible, one passage at a time. Tap any open section to see its lessons.',
    placement: 'center'
  },
  {
    target: '#daily-challenge-fab',
    title: 'Daily Challenge',
    body: 'Tap here for a quick timed quiz. You get two attempts a day, and it\'s the only thing that keeps your streak alive.',
    placement: 'top'      // target is at bottom, tooltip floats UP
  },
  {
    target: '#battle-fab',
    title: 'Battle Mode',
    body: 'Challenge a friend to a head-to-head quiz battle. Winner takes bonus XP!',
    placement: 'top'      // target is at bottom, tooltip floats UP
  },
  {
    // FIXED: Use 'ranks' if that's your actual data-screen value.
    // If your HTML uses data-screen="leaderboard", change this back.
    target: '[data-screen="ranks"], [data-screen="leaderboard"]',
    title: 'Weekly Leaderboard',
    body: 'See how you rank against everyone this week. Top 3 win real prizes when the week ends.',
    placement: 'bottom'  // target is at bottom, tooltip floats UP (was broken: floated down)
  },
  {
    target: '[data-screen="profile"]',
    title: 'Your Profile',
    body: 'Track your XP, level, streak, and badges here. You can replay this tour anytime from Settings.',
    placement: 'bottom'   // target is at bottom, tooltip floats UP
  }
];

// ── Module state ──
let _currentStep   = 0;
let _activeSteps   = [];
let _overlayEl     = null;
let _onFinish       = null;
let _resizeHandler  = null;

// ============================================
// PUBLIC API
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

export function resetOnboardingSeen() {
  try { localStorage.removeItem(ONBOARDING_SEEN_KEY); } catch {}
}

export function startOnboarding(onFinish) {
  _onFinish = onFinish || null;

  // Filter to steps whose target element actually exists right now.
  // For multiple selectors (comma-separated), querySelector returns
  // the first match.
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
  _teardownOverlay();

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

  _resizeHandler = () => _repositionCurrentStep();
  window.addEventListener('resize', _resizeHandler);
}

function _teardownOverlay() {
  if (_resizeHandler) {
    window.removeEventListener('resize', _resizeHandler);
    _resizeHandler = null;
  }
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
// SPOTLIGHT + TOOLTIP POSITIONING  (FIXED)
// ============================================

function _positionSpotlightAndTooltip(step) {
  const spotlightEl = document.getElementById('onboarding-spotlight');
  const tooltipEl   = document.getElementById('onboarding-tooltip');
  if (!spotlightEl || !tooltipEl) return;

  // ── Center placement: full intro slide, no cutout ──
  if (step.placement === 'center') {
    spotlightEl.style.display = 'none';
    tooltipEl.classList.add('onboarding-tooltip--center');
    tooltipEl.style.top  = '';
    tooltipEl.style.left = '';
    tooltipEl.style.transform = '';
    tooltipEl.style.width = '';
    return;
  }

  tooltipEl.classList.remove('onboarding-tooltip--center');

  const targetEl = document.querySelector(step.target);
  if (!targetEl) {
    _goNext();
    return;
  }

  const rect = targetEl.getBoundingClientRect();

  // Defensive: skip elements with zero size (not rendered yet)
  if (rect.width === 0 || rect.height === 0) {
    _goNext();
    return;
  }

  const pad  = 8;

  // ── Spotlight cutout ──
  spotlightEl.style.display = 'block';
  spotlightEl.style.top    = `${rect.top - pad}px`;
  spotlightEl.style.left   = `${rect.left - pad}px`;
  spotlightEl.style.width  = `${rect.width + pad * 2}px`;
  spotlightEl.style.height = `${rect.height + pad * 2}px`;

  // ── Tooltip sizing ──
  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  tooltipEl.style.width = `${tooltipWidth}px`;

  // Force a layout read so we can measure the tooltip's height
  const tooltipHeight = tooltipEl.getBoundingClientRect().height || 140;

  // ── Tooltip positioning (FIXED) ──
  //
  // placement = 'top'    → target is in the UPPER part of screen, tooltip goes BELOW it
  // placement = 'bottom' → target is in the LOWER part of screen, tooltip goes ABOVE it
  //
  // This is the inverse of the old broken logic which put 'bottom'
  // tooltips below the target (off-screen for bottom nav).
  
  let top, transform;

  if (step.placement === 'top') {
    // Tooltip sits BELOW the target
    top = rect.bottom + pad + 8;
    transform = 'translateY(0)';
  } else {
    // placement === 'bottom' (or default)
    // Tooltip sits ABOVE the target, anchored to its own bottom edge
    top = rect.top - pad - 8;
    transform = 'translateY(-100%)';
  }

  // Horizontal centering, clamped to viewport
  let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

  // ── CRITICAL FIX: Vertical viewport clamping ──
  //
  // After applying transform, ensure the tooltip's visible box
  // is fully inside [8, window.innerHeight - 8].
  
  let finalTop = top;

  if (transform === 'translateY(-100%)') {
    // Tooltip extends UPWARD from `top`
    finalTop = Math.max(tooltipHeight + 8, top);
    finalTop = Math.min(finalTop, window.innerHeight - 8);
  } else {
    // Tooltip extends DOWNWARD from `top`
    finalTop = Math.max(8, top);
    if (finalTop + tooltipHeight > window.innerHeight - 8) {
      // Not enough room below — flip to above
      finalTop = rect.top - pad - 8;
      transform = 'translateY(-100%)';
      finalTop = Math.max(tooltipHeight + 8, finalTop);
    }
  }

  tooltipEl.style.top       = `${finalTop}px`;
  tooltipEl.style.left      = `${left}px`;
  tooltipEl.style.transform = transform;

  // Scroll target into view if off-screen (defensive)
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
  resetOnboardingSeen,
  startOnboarding
};
