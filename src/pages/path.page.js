// ============================================
// SCRIPTUREQUEST V5 — Learning Path Page
// The new home screen. Renders all sections,
// units and lessons as a scrollable node path.
// Locked nodes are greyed out. Current node
// is highlighted. Tapping an available round
// fires onRoundStart(roundId).
// Lazy-loaded — only imported when needed.
// ============================================

import { getPathStructure, computeLockState,
         getFirstRoundId }                from '../services/path.service.js';
import { getUserProgress }                from '../services/progress.service.js';
import { getCurrentUser, getUserProfile } from '../state/store.js';

// ── Module state ──
let _onRoundStart = null;
let _lockState    = null;
let _progress     = null;

// ── Element helper ──
const el = id => document.getElementById(id);

// ============================================
// INIT
// ============================================

export async function initPathPage({ user, onRoundStart }) {
  _onRoundStart = onRoundStart;

  const skeleton = el('path-skeleton');
  const content  = el('path-content');
  const authPrmt = el('path-auth-prompt');

  // Logged-out state
  if (!user) {
    skeleton?.classList.add('hidden');
    content?.classList.add('hidden');
    authPrmt?.classList.remove('hidden');
    _updateProgressStrip(null, null);
    return;
  }

  authPrmt?.classList.add('hidden');
  skeleton?.classList.remove('hidden');
  content?.classList.add('hidden');

  try {
    // Fetch progress and compute lock state in parallel
    _progress  = await getUserProgress(user.uid);
    _lockState = computeLockState(_progress);

    skeleton?.classList.add('hidden');
    content?.classList.remove('hidden');

    _renderPath(content);
    _updateProgressStrip(_lockState, _progress);

    // Scroll to current node after render
    requestAnimationFrame(() => _scrollToCurrentNode());

  } catch (e) {
    console.warn('[Path] Render error:', e.message);
    skeleton?.classList.add('hidden');
    content?.classList.remove('hidden');
    if (content) {
      content.innerHTML = `
        <div class="path-error-msg">
          <span style="font-size:40px;display:block;margin-bottom:8px">😔</span>
          <p>Could not load your progress. Pull to refresh or try again.</p>
        </div>`;
    }
  }
}

// ============================================
// RENDER THE FULL PATH
// ============================================

function _renderPath(container) {
  if (!container) return;
  const structure = getPathStructure();
  container.innerHTML = structure.map(section => _renderSection(section)).join('');
  _bindNodeTaps(container);
}

// ── Section block ─────────────────────────────────────────

function _renderSection(section) {
  const completedUnits = section.units.filter(u =>
    _isUnitComplete(u)
  ).length;
  const totalUnits = section.units.length;
  const pct = totalUnits ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const isComplete = completedUnits === totalUnits && totalUnits > 0;
  const inProgress = completedUnits > 0 && !isComplete;

  return `
    <div class="path-section" data-section-id="${section.id}">
      <div class="path-section-header">
        <div class="path-section-header-inner">
          <span class="path-section-icon">${section.icon || '📖'}</span>
          <div class="path-section-info">
            <h3 class="path-section-title">${_esc(section.title)}</h3>
            <p class="path-section-theme">${_esc(section.theme || '')}</p>
          </div>
          ${isComplete
            ? '<span class="path-section-complete-badge">✅ Complete</span>'
            : `<span class="path-section-pct-badge">${pct}%</span>`
          }
        </div>
        <div class="path-section-progress-bar">
          <div class="path-section-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <div class="path-units-list">
        ${section.units.map(unit => _renderUnit(unit)).join('')}
      </div>
    </div>
  `;
}

// ── Unit block ────────────────────────────────────────────

function _renderUnit(unit) {
  const completedLessons = unit.lessons.filter(l => _isLessonComplete(l)).length;
  const totalLessons     = unit.lessons.length;
  const pct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isComplete = completedLessons === totalLessons && totalLessons > 0;

  return `
    <div class="path-unit" data-book-code="${unit.bookCode}">
      <div class="path-unit-header">
        <span class="path-unit-title">${_esc(unit.title)}</span>
        <span class="path-unit-badge ${isComplete ? 'path-unit-badge--done' : ''}">
          ${isComplete ? '✅' : `${completedLessons}/${totalLessons}`}
        </span>
      </div>

      <div class="path-lessons-list">
        ${unit.lessons.map((lesson, li) => _renderLesson(lesson, li)).join('')}
      </div>
    </div>
  `;
}

// ── Lesson block (each lesson = one circle with segments) ─

function _renderLesson(lesson, lessonIndex) {
  const totalRounds     = lesson.roundIds.length;
  const completedRounds = lesson.roundIds.filter(rid => _isRoundComplete(rid)).length;
  const isLessonDone    = completedRounds === totalRounds && totalRounds > 0;

  // Render individual round nodes
  const roundNodes = lesson.roundIds.map((roundId, ri) =>
    _renderRoundNode(roundId, ri, lesson, totalRounds)
  ).join('');

  return `
    <div class="path-lesson" data-lesson-key="${lesson.lessonKey}">
      <div class="path-lesson-header">
        <span class="path-lesson-title ${isLessonDone ? 'path-lesson-title--done' : ''}">
          ${isLessonDone ? '🏅 ' : ''}${_esc(lesson.title)}
        </span>
        <span class="path-lesson-ref">${_esc(lesson.passageRef || '')}</span>
      </div>
      <div class="path-round-nodes">
        ${roundNodes}
      </div>
    </div>
  `;
}

// ── Round node ────────────────────────────────────────────

function _renderRoundNode(roundId, roundIndex, lesson, totalRounds) {
  const state = _lockState?.[roundId] || 'locked';
  // state: 'locked' | 'available' | 'complete'

  const isComplete  = state === 'complete';
  const isAvailable = state === 'available';
  const isLocked    = state === 'locked';
  const isCurrent   = isAvailable; // the first available round is highlighted as current

  const score     = _progress?.completedRounds?.[roundId]?.score;
  const scoreText = isComplete && score !== undefined ? `${score}%` : '';

  const letter = (roundId || '').split('-').pop() || String.fromCharCode(65 + roundIndex);

  // Segment fill percentage (for the lesson circle arc) — simple approach: fill based on round order
  const segmentPct = isComplete ? 100 : 0;

  const nodeClass = [
    'path-node',
    isComplete  ? 'path-node--complete'  : '',
    isAvailable ? 'path-node--available' : '',
    isLocked    ? 'path-node--locked'    : '',
    isCurrent   ? 'path-node--current'   : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="${nodeClass}"
         data-round-id="${roundId}"
         data-state="${state}"
         ${isLocked ? 'aria-disabled="true"' : 'role="button" tabindex="0"'}
         aria-label="Round ${letter}: ${isComplete ? `Completed (${scoreText})` : isAvailable ? 'Available — tap to start' : 'Locked'}">

      <!-- Outer ring (SVG arc for lesson segment fill) -->
      <svg class="path-node-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle class="path-node-ring-track" cx="22" cy="22" r="18" />
        ${isComplete
          ? '<circle class="path-node-ring-fill path-node-ring-fill--complete" cx="22" cy="22" r="18" />'
          : isAvailable
            ? '<circle class="path-node-ring-fill path-node-ring-fill--available" cx="22" cy="22" r="18" stroke-dasharray="28.3 113.1" />'
            : ''
        }
      </svg>

      <!-- Node centre content -->
      <div class="path-node-inner">
        ${isComplete  ? `<span class="path-node-check">✓</span>` : ''}
        ${isAvailable ? `<span class="path-node-letter">${letter}</span>` : ''}
        ${isLocked    ? `<span class="path-node-lock">🔒</span>` : ''}
      </div>

      <!-- Score badge (below node) -->
      ${isComplete && scoreText
        ? `<span class="path-node-score">${scoreText}</span>`
        : ''
      }

      <!-- "Start" label for current node -->
      ${isAvailable
        ? `<span class="path-node-start-label">Tap to start</span>`
        : ''
      }
    </div>
  `;
}

// ============================================
// TAP BINDING
// ============================================

function _bindNodeTaps(container) {
  container.querySelectorAll('.path-node[data-state="available"]').forEach(node => {
    const roundId = node.dataset.roundId;
    if (!roundId) return;

    const handler = (e) => {
      e.preventDefault();
      if (!_onRoundStart) return;
      // Visual feedback before transition
      node.classList.add('path-node--tapped');
      setTimeout(() => _onRoundStart(roundId), 120);
    };

    node.addEventListener('click',   handler);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
    });
  });

  // Locked node tap → show "complete previous rounds first" toast
  container.querySelectorAll('.path-node[data-state="locked"]').forEach(node => {
    node.addEventListener('click', () => {
      if (window.SQ?.showToast) {
        window.SQ.showToast('Complete the previous round first to unlock this one.', 'info', 3000);
      }
    });
  });
}

// ============================================
// PROGRESS STRIP (top section summary)
// ============================================

function _updateProgressStrip(lockState, progress) {
  const labelEl = el('path-current-section-label');
  const pctEl   = el('path-current-section-pct');
  const fillEl  = el('path-section-progress-fill');

  if (!lockState || !progress) {
    if (labelEl) labelEl.textContent = 'Section 1 — The Pentateuch';
    if (pctEl)   pctEl.textContent   = '0%';
    if (fillEl)  fillEl.style.width  = '0%';
    return;
  }

  const structure = getPathStructure();
  // Find the first incomplete section
  let currentSection = structure[0];
  for (const section of structure) {
    const allDone = section.units.every(u => _isUnitComplete(u));
    if (!allDone) { currentSection = section; break; }
  }

  // Compute section progress
  const totalRoundsInSection = currentSection.units.reduce((a, u) =>
    a + u.lessons.reduce((b, l) => b + l.roundIds.length, 0), 0);
  const doneRoundsInSection  = currentSection.units.reduce((a, u) =>
    a + u.lessons.reduce((b, l) =>
      b + l.roundIds.filter(rid => progress.completedRounds?.[rid]?.passed).length, 0), 0);
  const pct = totalRoundsInSection
    ? Math.round((doneRoundsInSection / totalRoundsInSection) * 100)
    : 0;

  if (labelEl) labelEl.textContent = `${currentSection.title}`;
  if (pctEl)   pctEl.textContent   = `${pct}%`;
  if (fillEl)  fillEl.style.width  = `${pct}%`;
}

// ============================================
// SCROLL TO CURRENT NODE
// ============================================

function _scrollToCurrentNode() {
  const currentNode = document.querySelector('.path-node--current');
  if (!currentNode) return;
  const scrollArea = el('path-scroll-area');
  if (!scrollArea) return;
  const nodeTop    = currentNode.offsetTop;
  const areaHeight = scrollArea.clientHeight;
  scrollArea.scrollTo({
    top:      Math.max(0, nodeTop - (areaHeight / 2) + 50),
    behavior: 'smooth'
  });
}

// ============================================
// STATE HELPERS (read from _lockState / _progress)
// ============================================

function _isRoundComplete(roundId) {
  return _progress?.completedRounds?.[roundId]?.passed === true;
}

function _isLessonComplete(lesson) {
  return lesson.roundIds.every(rid => _isRoundComplete(rid));
}

function _isUnitComplete(unit) {
  return unit.lessons.every(l => _isLessonComplete(l));
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

export default { initPathPage };
