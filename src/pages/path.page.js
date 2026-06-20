// ============================================
// SCRIPTUREQUEST V5 — Learning Path Page (FIXED)
// ============================================

import { getPathStructure, computeLockState,
         getFirstRoundId }                from '../services/path.service.js';
import { getUserProgress }                from '../services/progress.service.js';
import { getCurrentUser, getUserProfile } from '../state/store.js';

// ── Module state ──
let _onRoundStart = null;
let _lockState    = null;   // { roundState, isUnlocked, isComplete }
let _progress     = null;
let _expandedSectionId = null; // currently expanded section (accordion)

// ── Element helper ──
const el = id => document.getElementById(id);

// ── Section icon map (keyed by section.id from path.service.js) ──
// getPathStructure() does not set an icon field, so we map it here
// purely for display — does not affect unlock logic at all.
const SECTION_ICONS = {
  'section-1': '📜', // Pentateuch
  'section-2': '🏛️', // Historical
  'section-3': '🎭', // Wisdom & Poetry
  'section-4': '🔥', // Major Prophets
  'section-5': '📯', // Minor Prophets
  'section-6': '✝️', // Gospels
  'section-7': '⛪', // Acts & Epistles
  'section-8': '👁️'  // Revelation
};

// ============================================
// INIT
// ============================================

export async function initPathPage({ user, onRoundStart }) {
  _onRoundStart = onRoundStart;

  const skeleton = el('path-skeleton');
  const content  = el('path-content');
  const authPrmt = el('path-auth-prompt');

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
    _progress  = await getUserProgress(user.uid);
    _lockState = computeLockState(_progress);

    // Determine which section should auto-expand: the first
    // section that is NOT fully complete (i.e. the active one).
    _expandedSectionId = _findActiveSectionId();

    skeleton?.classList.add('hidden');
    content?.classList.remove('hidden');

    _renderPath(content);
    _updateProgressStrip(_lockState, _progress);

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
// FIND ACTIVE SECTION (first incomplete one)
// ============================================

function _findActiveSectionId() {
  const structure = getPathStructure();
  for (const section of structure) {
    const allDone = section.units.every(u => _isUnitComplete(u));
    if (!allDone) return section.id;
  }
  // Everything complete — default to the last section
  return structure.length ? structure[structure.length - 1].id : null;
}

// ============================================
// RENDER THE FULL PATH (accordion of sections)
// ============================================

function _renderPath(container) {
  if (!container) return;
  const structure = getPathStructure();
  container.innerHTML = structure.map(section => _renderSection(section)).join('');
  _bindSectionToggles(container);
  _bindNodeTaps(container);
}

// ── Section block (collapsible container) ─────────────────

function _renderSection(section) {
  const completedUnits = section.units.filter(u => _isUnitComplete(u)).length;
  const totalUnits = section.units.length;
  const pct = totalUnits ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const isComplete = completedUnits === totalUnits && totalUnits > 0;
  const isExpanded  = section.id === _expandedSectionId;
  const icon = SECTION_ICONS[section.id] || '📖';

  return `
    <div class="path-section ${isExpanded ? 'path-section--expanded' : ''}" data-section-id="${section.id}">

      <button class="path-section-header" data-toggle-section="${section.id}"
              aria-expanded="${isExpanded}" type="button">
        <div class="path-section-header-inner">
          <span class="path-section-icon">${icon}</span>
          <div class="path-section-info">
            <h3 class="path-section-title">${_esc(section.title)}</h3>
            <p class="path-section-theme">${_esc(section.theme || '')}</p>
          </div>
          ${isComplete
            ? '<span class="path-section-complete-badge">✅ Complete</span>'
            : `<span class="path-section-pct-badge">${pct}%</span>`
          }
          <span class="path-section-chevron" aria-hidden="true">
            <i class="fas fa-chevron-down"></i>
          </span>
        </div>
        <div class="path-section-progress-bar">
          <div class="path-section-progress-fill" style="width:${pct}%"></div>
        </div>
      </button>

      <div class="path-section-body" ${isExpanded ? '' : 'hidden'}>
        <div class="path-units-list">
          ${section.units.map(unit => _renderUnit(unit)).join('')}
        </div>
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
        <span class="path-unit-title">${_esc(unit.bookName)}</span>
        <span class="path-unit-badge ${isComplete ? 'path-unit-badge--done' : ''}">
          ${isComplete ? '✅' : `${completedLessons}/${totalLessons}`}
        </span>
      </div>

      <div class="path-lessons-list">
        ${unit.lessons.map((lesson) => _renderLesson(lesson)).join('')}
      </div>
    </div>
  `;
}

// ── Lesson block (each lesson = one row of round nodes) ───

function _renderLesson(lesson) {
  const totalRounds     = lesson.roundIds.length;
  const completedRounds = lesson.roundIds.filter(rid => _isRoundComplete(rid)).length;
  const isLessonDone    = completedRounds === totalRounds && totalRounds > 0;

  const roundNodes = lesson.roundIds.map((roundId, ri) =>
    _renderRoundNode(roundId, ri)
  ).join('');

  return `
    <div class="path-lesson" data-lesson-key="${lesson.lessonKey}">
      <div class="path-lesson-header">
        <span class="path-lesson-title ${isLessonDone ? 'path-lesson-title--done' : ''}">
          ${isLessonDone ? '🏅 ' : ''}${_esc(lesson.lessonTitle)}
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

function _renderRoundNode(roundId, roundIndex) {
  // FIX: read the nested .roundState map, not _lockState directly
  const state = _lockState?.roundState?.[roundId] || 'locked';

  const isComplete  = state === 'complete';
  const isAvailable = state === 'available';
  const isLocked    = state === 'locked';
  const isCurrent   = isAvailable;

  const score     = _progress?.completedRounds?.[roundId]?.score;
  const scoreText = isComplete && score !== undefined ? `${score}%` : '';

  const letter = (roundId || '').split('-').pop() || String.fromCharCode(65 + roundIndex);

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

      <svg class="path-node-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle class="path-node-ring-track" cx="22" cy="22" r="18" />
        ${isComplete
          ? '<circle class="path-node-ring-fill path-node-ring-fill--complete" cx="22" cy="22" r="18" />'
          : isAvailable
            ? '<circle class="path-node-ring-fill path-node-ring-fill--available" cx="22" cy="22" r="18" stroke-dasharray="28.3 113.1" />'
            : ''
        }
      </svg>

      <div class="path-node-inner">
        ${isComplete  ? `<span class="path-node-check">✓</span>` : ''}
        ${isAvailable ? `<span class="path-node-letter">${letter}</span>` : ''}
        ${isLocked    ? `<span class="path-node-lock">🔒</span>` : ''}
      </div>

      ${isComplete && scoreText
        ? `<span class="path-node-score">${scoreText}</span>`
        : ''
      }

      ${isAvailable
        ? `<span class="path-node-start-label">Tap to start</span>`
        : ''
      }
    </div>
  `;
}

// ============================================
// SECTION TOGGLE BINDING (accordion behaviour)
// ============================================

function _bindSectionToggles(container) {
  container.querySelectorAll('[data-toggle-section]').forEach(header => {
    header.addEventListener('click', () => {
      const sectionId = header.dataset.toggleSection;
      const sectionEl = container.querySelector(`.path-section[data-section-id="${sectionId}"]`);
      const bodyEl    = sectionEl?.querySelector('.path-section-body');
      if (!sectionEl || !bodyEl) return;

      const isCurrentlyExpanded = sectionEl.classList.contains('path-section--expanded');

      // Collapse whichever section is open (accordion = one at a time)
      container.querySelectorAll('.path-section--expanded').forEach(openSection => {
        if (openSection !== sectionEl) {
          openSection.classList.remove('path-section--expanded');
          openSection.querySelector('.path-section-body')?.setAttribute('hidden', '');
          openSection.querySelector('[data-toggle-section]')?.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle the tapped section
      if (isCurrentlyExpanded) {
        sectionEl.classList.remove('path-section--expanded');
        bodyEl.setAttribute('hidden', '');
        header.setAttribute('aria-expanded', 'false');
        _expandedSectionId = null;
      } else {
        sectionEl.classList.add('path-section--expanded');
        bodyEl.removeAttribute('hidden');
        header.setAttribute('aria-expanded', 'true');
        _expandedSectionId = sectionId;
      }
    });
  });
}

// ============================================
// TAP BINDING (round nodes)
// ============================================

function _bindNodeTaps(container) {
  container.querySelectorAll('.path-node[data-state="available"]').forEach(node => {
    const roundId = node.dataset.roundId;
    if (!roundId) return;

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation(); // don't let the tap bubble up and toggle the section
      if (!_onRoundStart) return;
      node.classList.add('path-node--tapped');
      setTimeout(() => _onRoundStart(roundId), 120);
    };

    node.addEventListener('click',   handler);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
    });
  });

  container.querySelectorAll('.path-node[data-state="locked"]').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.SQ?.showToast) {
        window.SQ.showToast('Complete the previous round first to unlock this one.', 'info', 3000);
      }
    });
  });

  // Complete nodes: allow re-tap to review/retry (optional UX nicety,
  // does not change lock state — just routes back into the round flow
  // the same way an available node would).
  container.querySelectorAll('.path-node[data-state="complete"]').forEach(node => {
    const roundId = node.dataset.roundId;
    if (!roundId) return;
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!_onRoundStart) return;
      _onRoundStart(roundId);
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
  let currentSection = structure[0];
  for (const section of structure) {
    const allDone = section.units.every(u => _isUnitComplete(u));
    if (!allDone) { currentSection = section; break; }
  }

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
// STATE HELPERS
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
