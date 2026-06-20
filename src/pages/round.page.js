// ============================================
// SCRIPTUREQUEST V5 — Round Quiz Page
// Learning-path round: 7 questions, no timer,
// no correct-answer reveal on wrong answer.
// Based on quiz.page.js patterns.
// Lazy-loaded — only imported when needed.
// ============================================

import { getRound }    from '../services/path.service.js';
import { submitRound } from '../services/progress.service.js';
import { showToast }   from '../utils/toast.js';

// ── Constants ──
const LETTERS = ['A', 'B', 'C', 'D'];

const DIFFICULTY_LABELS = {
  HARD:      'HARD',
  VERY_HARD: 'VERY HARD',
  EXPERT:    'EXPERT'
};

const QUESTION_TYPE_LABELS = {
  WHO:           'Who',
  WHAT:          'What',
  WHERE:         'Where',
  WHEN:          'When',
  HOW_MANY:      'How Many',
  SEQUENCE:      'In Order',
  EXACT_WORDING: 'Exact Words',
  ABSENCE:       'What's Missing'
};

// Positive / negative feedback emojis
const CORRECT_EMOJIS = ['🎉', '✅', '💯', '🌟', '👏', '🔥', '⭐'];
const WRONG_EMOJIS   = ['📖', '🤔', '💪', '✍️', '📚', '🧐'];

function _emoji(correct) {
  const arr = correct ? CORRECT_EMOJIS : WRONG_EMOJIS;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Module state ──
let _roundId      = null;
let _questions    = [];
let _currentIndex = 0;
let _userAnswers  = {};     // { questionIndex: optionIndex }
let _answered     = false;
let _submitting   = false;
let _callbacks    = {};

// ── Element helper ──
const el = id => document.getElementById(id);

// ============================================
// INIT
// ============================================

export function initRoundScreen(roundId, callbacks) {
  _roundId      = roundId;
  _callbacks    = callbacks || {};
  _currentIndex = 0;
  _userAnswers  = {};
  _answered     = false;
  _submitting   = false;

  const round = getRound(roundId);
  if (!round || !round.questions?.length) {
    showToast('Could not load round questions.', 'error');
    _callbacks.onQuit?.();
    return;
  }

  _questions = round.questions;

  // Passage label in top bar
  const passEl = el('round-passage-label');
  if (passEl) passEl.textContent = round.passageRef || '';

  // Show passing requirement notice before starting
  _showPassingNotice(round);

  _buildDotNav();
  _renderQuestion();
  _wireNavButtons();
  _wireQuitButton();
}

// ============================================
// PASSING REQUIREMENT NOTICE
// Show before the user begins each round.
// Must score at least 5 out of 7 to pass.
// ============================================

function _showPassingNotice(round) {
  const noticeEl = el('round-passing-notice');
  if (noticeEl) {
    const total = round.questions?.length || 7;
    const needed = Math.ceil(total * 0.7); // 70% = 5/7
    noticeEl.innerHTML = `
      <div class="passing-notice-box">
        <span class="passing-notice-icon">🎯</span>
        <p class="passing-notice-text">
          You need <strong>${needed} out of ${total}</strong> correct to pass this round.
        </p>
        <p class="passing-notice-sub">Answer carefully. You can review the passage before each round.</p>
      </div>
    `;
    noticeEl.classList.remove('hidden');
  }
}

// ============================================
// RENDER QUESTION
// ============================================

function _renderQuestion() {
  if (_currentIndex >= _questions.length) return;

  const q        = _questions[_currentIndex];
  const total    = _questions.length;
  const answered = _userAnswers[_currentIndex];
  _answered      = answered !== undefined;

  // Progress chip + fill
  const chip = el('round-q-chip');
  const fill = el('round-progress-fill');
  if (chip) chip.textContent = `${_currentIndex + 1} / ${total}`;
  if (fill) fill.style.width = `${((_currentIndex + 1) / total) * 100}%`;

  // Difficulty badge
  const diffBadge = el('round-difficulty-badge');
  if (diffBadge) {
    diffBadge.textContent = DIFFICULTY_LABELS[q.difficultyLevel] || q.difficultyLevel || 'HARD';
    diffBadge.className   = `round-difficulty-badge round-diff--${(q.difficultyLevel || 'HARD').toLowerCase()}`;
  }

  // Question type label
  const typeLabel = el('round-q-type-label');
  if (typeLabel) {
    typeLabel.textContent = QUESTION_TYPE_LABELS[q.questionType] || q.questionType || '';
  }

  // Question text — questions should be clear, fair, and test real understanding.
  // Avoid trick questions or overly complex wording. Each question should relate
  // directly to the study card content but require genuine knowledge, not guessing.
  const qText = el('round-question-text');
  if (qText) {
    qText.textContent      = q.question || '';
    qText.style.animation  = 'none';
    qText.offsetHeight;    // reflow trigger
    qText.style.animation  = 'fadeInUp 0.25s ease';
  }

  // Options — keep language simple and natural.
  // Distractors should be plausible but clearly wrong to someone who knows the passage.
  const optList = el('round-options-list');
  if (optList) {
    optList.innerHTML = (q.options || []).map((opt, i) => `
      <button
        class="option"
        role="listitem"
        data-index="${i}"
        aria-label="Option ${LETTERS[i]}: ${_escapeHTML(opt)}"
        ${_answered ? 'disabled' : ''}
      >
        <span class="option-letter">${LETTERS[i]}</span>
        <span class="option-text">${_escapeHTML(opt)}</span>
      </button>
    `).join('');

    if (_answered) {
      _applyAnswerState(answered, q);
    } else {
      optList.querySelectorAll('.option').forEach(btn => {
        btn.addEventListener('click', () => _handleAnswer(parseInt(btn.dataset.index)));
      });
    }
  }

  // Feedback area — no correct answer revealed
  const fbEl = el('round-feedback-area');
  if (fbEl) {
    if (_answered) {
      const isCorrect = answered === q.correctAnswer;
      fbEl.className  = `feedback-area ${isCorrect ? 'correct-fb' : 'wrong-fb'}`;
      fbEl.innerHTML  = `
        <span class="feedback-emoji">${_emoji(isCorrect)}</span>
        <p class="feedback-msg">${isCorrect
          ? 'Correct! Well done! 🎉'
          : 'Not quite — review the passage and try again later! 📖'}</p>
        ${isCorrect && q.verseReference
          ? `<p style="font-size:12px;margin-top:4px;opacity:0.75">📖 ${q.verseReference}</p>`
          : ''}
      `;
      fbEl.classList.remove('hidden');
    } else {
      fbEl.classList.add('hidden');
      fbEl.innerHTML = '';
    }
  }

  _updateNavButtons();
  _updateDotNav();

  // Card entrance animation
  const card = el('round-question-card');
  if (card) {
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'fadeInUp 0.3s ease';
  }
}

// ============================================
// ANSWER STATE
// Only mark chosen button (green or red).
// Never reveal the correct answer on other buttons.
// ============================================

function _applyAnswerState(chosen, q) {
  const optList = el('round-options-list');
  if (!optList) return;
  optList.querySelectorAll('.option').forEach(btn => {
    const idx = parseInt(btn.dataset.index);
    btn.disabled = true;
    if (idx === chosen) {
      btn.classList.add(chosen === q.correctAnswer ? 'correct' : 'wrong');
    } else {
      btn.classList.add('disabled');
    }
    // Intentionally: never add 'correct' to any button other than chosen
  });
}

// ============================================
// ANSWER HANDLER
// ============================================

function _handleAnswer(chosenIndex) {
  if (_answered || _submitting) return;

  const q   = _questions[_currentIndex];
  _answered = true;
  _userAnswers[_currentIndex] = chosenIndex;

  _applyAnswerState(chosenIndex, q);

  const isCorrect = chosenIndex === q.correctAnswer;

  const fbEl = el('round-feedback-area');
  if (fbEl) {
    fbEl.className = `feedback-area ${isCorrect ? 'correct-fb' : 'wrong-fb'}`;
    fbEl.innerHTML = `
      <span class="feedback-emoji">${_emoji(isCorrect)}</span>
      <p class="feedback-msg">${isCorrect
        ? 'Correct! Well done! 🎉'
        : 'Not quite — review the passage and try again later! 📖'}</p>
      ${isCorrect && q.verseReference
        ? `<p style="font-size:12px;margin-top:4px;opacity:0.75">📖 ${q.verseReference}</p>`
        : ''}
    `;
    fbEl.classList.remove('hidden');
  }

  _updateNavButtons();
  _updateDotNav();
}

// ============================================
// NAVIGATION
// ============================================

function _wireNavButtons() {
  // Clone to remove stale listeners from prior rounds
  _rewire('round-prev-btn',   () => _goPrev());
  _rewire('round-next-btn',   () => _goNext());
  _rewire('round-submit-btn', () => _handleSubmit());
}

function _rewire(id, handler) {
  const old = el(id);
  if (!old) return;
  const newBtn = old.cloneNode(true);
  old.parentNode.replaceChild(newBtn, old);
  newBtn.addEventListener('click', handler);
}

function _goPrev() {
  if (_currentIndex > 0) {
    _currentIndex--;
    _answered = _userAnswers[_currentIndex] !== undefined;
    _renderQuestion();
  }
}

function _goNext() {
  if (_currentIndex < _questions.length - 1) {
    _currentIndex++;
    _answered = _userAnswers[_currentIndex] !== undefined;
    _renderQuestion();
  }
}

function _updateNavButtons() {
  const prevBtn   = el('round-prev-btn');
  const nextBtn   = el('round-next-btn');
  const submitBtn = el('round-submit-btn');

  if (prevBtn) prevBtn.disabled = _currentIndex === 0;

  const isLast      = _currentIndex === _questions.length - 1;
  const allAnswered = Object.keys(_userAnswers).length === _questions.length;

  if (isLast && _answered) {
    nextBtn?.classList.add('hidden');
    submitBtn?.classList.remove('hidden');
  } else {
    nextBtn?.classList.remove('hidden');
    submitBtn?.classList.add('hidden');
    if (nextBtn) nextBtn.disabled = !_answered;
  }

  if (allAnswered && submitBtn) {
    submitBtn.classList.remove('hidden');
  }
}

// ============================================
// DOT NAV
// ============================================

function _buildDotNav() {
  const nav = el('round-dot-nav');
  if (!nav) return;
  nav.innerHTML = _questions.map((_, i) => `
    <button
      class="round-dot"
      data-dot="${i}"
      aria-label="Question ${i + 1}"
      onclick="this.closest('.quiz-wrapper') && (() => {
        /* handled by JS below */
      })()"
    ></button>
  `).join('');

  nav.querySelectorAll('.round-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.dot);
      if (idx !== _currentIndex) {
        _currentIndex = idx;
        _answered     = _userAnswers[_currentIndex] !== undefined;
        _renderQuestion();
      }
    });
  });
}

function _updateDotNav() {
  const nav = el('round-dot-nav');
  if (!nav) return;
  nav.querySelectorAll('.round-dot').forEach((dot, i) => {
    dot.classList.remove('round-dot--current', 'round-dot--answered', 'round-dot--unanswered');
    if (i === _currentIndex) {
      dot.classList.add('round-dot--current');
    } else if (_userAnswers[i] !== undefined) {
      dot.classList.add('round-dot--answered');
    } else {
      dot.classList.add('round-dot--unanswered');
    }
  });
}

// ============================================
// QUIT
// ============================================

function _wireQuitButton() {
  _rewire('round-quit-top', () => _handleQuit());
}

function _handleQuit() {
  if (window.SQ?.showConfirm) {
    window.SQ.showConfirm({
      icon:    '🚪',
      title:   'Quit Round?',
      message: 'Your progress in this round will be lost. You can always come back!',
      onConfirm: () => {
        _submitting = false;
        _callbacks.onQuit?.();
      }
    });
  } else {
    if (confirm('Quit round? Progress will be lost.')) {
      _submitting = false;
      _callbacks.onQuit?.();
    }
  }
}

// ============================================
// SUBMIT
// ============================================

async function _handleSubmit() {
  if (_submitting) return;
  _submitting = true;

  const submitBtn = el('round-submit-btn');
  const nextBtn   = el('round-next-btn');
  if (submitBtn) {
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  }
  if (nextBtn) nextBtn.disabled = true;
  document.querySelectorAll('#round-options-list .option').forEach(b => b.disabled = true);

  try {
    const result = await submitRound(_roundId, _userAnswers);
    // result shape from progress.service.js:
    // { score, totalQuestions, percentage, passed, isPerfect, xpEarned,
    //   lessonComplete, unitComplete, sectionComplete, sectionId }

    // Attach round context for the result screen
    result.roundId    = _roundId;
    result.userAnswers = { ..._userAnswers };
    result.questions   = _questions;

    _callbacks.onComplete?.(result);
  } catch (err) {
    _submitting = false;
    showToast(err.message || 'Submission failed. Please try again.', 'error');
    if (submitBtn) {
      submitBtn.disabled  = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
    }
  }
}

// ============================================
// UTILITIES
// ============================================

function _escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default { initRoundScreen };
