// ============================================
// SCRIPTUREQUEST V4 — Battle Page
// Fixes:
//   - Timer uses BATTLE_DURATION_SECS (2:50)
//   - Persists matchId to localStorage (Issue 4)
//   - Robust cleanup / destroyBattleScreen
//   - Waiting screen uses overlay (not innerHTML replacement)
//   - No correct answer revealed on wrong pick
//   - Guard against double-cleanup causing blank screen
//   - Poll for opponent completion on init (Issue 3)
// ============================================

import { submitBattleAnswers, listenToMatch, getMatchResult } from '../services/match.service.js';
import { getCurrentUser }      from '../state/store.js';
import { mountAvatar }         from '../components/avatar.js';
import { LETTERS, BATTLE_DURATION_SECS, PENDING_BATTLE_KEY } from '../utils/constants.js';

let _matchId   = null;
let _questions = [];
let _answers   = {};
let _current   = 0;
let _timeLeft  = BATTLE_DURATION_SECS;
let _timer     = null;
let _matchUnsub = null;
let _submitting = false;
let _callbacks  = {};
let _destroyed  = false;        // NEW: guard against double-cleanup

const el = id => document.getElementById(id);

// ============================================
// INIT
// ============================================

export async function initBattleScreen(matchId, questions, match, callbacks) {
  // Always destroy previous state first
  destroyBattleScreen();

  _matchId    = matchId;
  _questions  = (questions || match?.questions || []).slice();
  _answers    = {};
  _current    = 0;
  _timeLeft   = BATTLE_DURATION_SECS;
  _submitting = false;
  _callbacks  = callbacks || {};
  _destroyed  = false;

  // Issue 4: Persist matchId so we can recover result after page close
  try { localStorage.setItem(PENDING_BATTLE_KEY, matchId); } catch(e) {}

  const user      = getCurrentUser();
  const isCreator = match.creatorId === user?.uid;
  const myName    = isCreator ? match.creatorName    : match.opponentName;
  const oppName   = isCreator ? match.opponentName   : match.creatorName;
  const myAvatar  = isCreator ? match.creatorAvatar  : match.opponentAvatar;
  const oppAvatar = isCreator ? match.opponentAvatar : match.creatorAvatar;

  if (el('battle-my-name'))         el('battle-my-name').textContent       = myName  || 'You';
  if (el('battle-opponent-name'))   el('battle-opponent-name').textContent  = oppName || 'Opponent';
  if (el('battle-my-avatar'))       mountAvatar(myAvatar  || 'M01', el('battle-my-avatar'));
  if (el('battle-opponent-avatar')) mountAvatar(oppAvatar || 'M01', el('battle-opponent-avatar'));

  // Wire buttons (clone to remove stale listeners)
  _wire('battle-prev-btn',   prevQ);
  _wire('battle-next-btn',   nextQ);
  _wire('battle-submit-btn', () => _submit());

  renderQuestion();
  _startTimer();

  // Listen for opponent finishing first
  _matchUnsub = listenToMatch(matchId, matchUpdate => {
    if (_destroyed || _submitting) return;
    if (matchUpdate.status === 'completed' && !_submitting) {
      // Opponent finished while we were still answering — auto-submit
      _submit(true);
    }
  });

  // Issue 3: If we are the second player and opponent already submitted,
  // we need to detect that so our submit goes straight to results.
  // Also handles case where both are on waiting screen.
  _pollForOpponentDone(matchId);
}

// NEW: Lightweight poll to check if opponent already finished
// (handles async quiz flow where User A took quiz before User B accepted)
async function _pollForOpponentDone(matchId) {
  try {
    const match = await getMatchResult(matchId);
    if (!match || _destroyed || _submitting) return;
    const user = getCurrentUser();
    const isCreator = match.creatorId === user?.uid;
    const otherScore = isCreator ? match.opponentScore : match.creatorScore;
    // If opponent already has a score and match isn't completed yet,
    // we just wait — our submit will trigger completion.
    // If match IS completed, opponent finished while we were loading.
    if (match.status === 'completed' && !_submitting) {
      // Small delay to let init finish before triggering callback
      setTimeout(() => _submit(true), 100);
    }
  } catch (e) {
    console.warn('[Battle] Poll error:', e.message);
  }
}

function _wire(id, fn) {
  const orig = el(id);
  if (!orig) return;
  const clone = orig.cloneNode(true);
  orig.parentNode.replaceChild(clone, orig);
  clone.addEventListener('click', fn);
}

// ============================================
// RENDER
// ============================================

function renderQuestion() {
  const q        = _questions[_current];
  if (!q) return;
  const answered = _answers[_current] !== undefined;

  if (el('battle-q-chip'))    el('battle-q-chip').textContent    = `Question ${_current + 1} of ${_questions.length}`;
  if (el('battle-q-text'))    el('battle-q-text').textContent    = q.question;
  if (el('battle-progress'))  el('battle-progress').style.width  = `${((_current + 1) / _questions.length) * 100}%`;
  if (el('battle-prog-fill')) el('battle-prog-fill').style.width = `${((_current + 1) / _questions.length) * 100}%`;

  const optEl = el('battle-options');
  if (optEl) {
    optEl.innerHTML = q.options.map((opt, i) => {
      let cls = 'option';
      if (answered && _answers[_current] === i) {
        cls += _answers[_current] === q.correctAnswer ? ' correct' : ' wrong';
      } else if (answered) {
        cls += ' disabled';
      }
      return `<button class="${cls}" data-index="${i}" ${answered ? 'disabled' : ''}>
        <span class="option-letter">${LETTERS[i]}</span><span>${opt}</span>
      </button>`;
    }).join('');

    if (!answered) {
      optEl.querySelectorAll('.option').forEach(b =>
        b.addEventListener('click', () => _selectAnswer(parseInt(b.dataset.index)))
      );
    }
  }

  _updateNav();
}

function _selectAnswer(idx) {
  if (_submitting || _answers[_current] !== undefined) return;
  _answers[_current] = idx;

  // Only colour the chosen button — never reveal correct answer
  const q = _questions[_current];
  el('battle-options')?.querySelectorAll('.option').forEach((b, i) => {
    b.disabled = true;
    if (i === idx) b.classList.add(idx === q.correctAnswer ? 'correct' : 'wrong');
    else           b.classList.add('disabled');
  });

  _updateNav();
}

function _updateNav() {
  const isLast      = _current === _questions.length - 1;
  const allAnswered = Object.keys(_answers).length === _questions.length;
  const answered    = _answers[_current] !== undefined;

  if (el('battle-prev-btn'))   el('battle-prev-btn').disabled = _current === 0;
  el('battle-next-btn')?.classList.toggle('hidden',   isLast);
  el('battle-submit-btn')?.classList.toggle('hidden', !isLast && !allAnswered);
  if (el('battle-next-btn') && !isLast) el('battle-next-btn').disabled = !answered;
}

function nextQ() { if (_current < _questions.length - 1) { _current++; renderQuestion(); } }
function prevQ() { if (_current > 0)                     { _current--; renderQuestion(); } }

// ============================================
// TIMER
// ============================================

function _startTimer() {
  const t = el('battle-timer');
  const tick = () => {
    if (_timeLeft <= 0) { _submit(true); return; }
    const m = Math.floor(_timeLeft / 60), s = _timeLeft % 60;
    if (t) { t.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; t.classList.toggle('urgent', _timeLeft <= 30); }
    _timeLeft--;
  };
  tick();
  _timer = setInterval(tick, 1000);
}

// ============================================
// SUBMIT
// ============================================

async function _submit(autoSubmit = false) {
  if (_submitting || _destroyed) return;
  _submitting = true;

  if (_timer) { clearInterval(_timer); _timer = null; }
  if (_matchUnsub) { _matchUnsub(); _matchUnsub = null; }

  const btn = el('battle-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

  // Fill unanswered with null
  const answers = {};
  _questions.forEach((_, i) => { answers[i] = _answers[i] !== undefined ? _answers[i] : null; });

  try {
    const result = await submitBattleAnswers(_matchId, answers);

    if (result.bothDone) {
      const match = await getMatchResult(_matchId);
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
      // Delay slightly to let Firestore snapshot settle
      setTimeout(() => {
        if (!_destroyed) _callbacks.onComplete?.(match);
      }, 50);
    } else {
      _showWaiting();
    }
  } catch(err) {
    console.error('[Battle] Submit error:', err);
    _submitting = false;
    _showWaiting(); // Show waiting anyway — don't hang on error
  }
}

function _showWaiting() {
  // FIX: Use an overlay instead of replacing innerHTML.
  // This preserves the screen-battle container and all child elements,
  // so when onComplete fires and app.js calls showScreen('battle-result'),
  // the DOM is intact and the result screen renders correctly.
  const screen = el('screen-battle');
  if (!screen) return;

  // Remove any existing waiting overlay first
  const existing = screen.querySelector('.battle-waiting-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'battle-waiting-overlay';
  overlay.style.cssText = `
    position:absolute; inset:0; z-index:50;
    background:var(--bg-primary, #fff);
    display:flex; align-items:center; justify-content:center;
    padding:20px;
  `;
  overlay.innerHTML = `
    <div style="max-width:480px;text-align:center;padding:40px 20px">
      <div style="font-size:64px;margin-bottom:16px">⏳</div>
      <h2 style="font-size:22px;font-weight:900;color:var(--text-primary);margin-bottom:8px">Answers Submitted!</h2>
      <p style="color:var(--text-muted);font-size:15px;margin-bottom:8px">Waiting for your opponent to finish…</p>
      <div class="spinner" style="margin:20px auto;width:40px;height:40px;border:4px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite"></div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:8px">
        You can safely close this page.<br>We'll show results next time you open the app. 📱
      </p>
    </div>`;
  screen.appendChild(overlay);

  // Inject spin animation if not present
  if (!document.getElementById('battle-spin-style')) {
    const style = document.createElement('style');
    style.id = 'battle-spin-style';
    style.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
  }

  // Re-subscribe to catch completion
  _matchUnsub = listenToMatch(_matchId, match => {
    if (_destroyed) return;
    if (match.status === 'completed') {
      if (_matchUnsub) { _matchUnsub(); _matchUnsub = null; }
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
      // Delay to ensure overlay is rendered and Firestore data is settled
      setTimeout(() => {
        if (!_destroyed) _callbacks.onComplete?.(match);
      }, 100);
    }
  });
}

// ============================================
// DESTROY
// ============================================

export function destroyBattleScreen() {
  _destroyed = true;  // NEW: set guard flag FIRST
  if (_timer)     { clearInterval(_timer); _timer = null; }
  if (_matchUnsub){ _matchUnsub(); _matchUnsub = null; }
  _submitting = false;

  // Remove waiting overlay if present
  const screen = el('screen-battle');
  if (screen) {
    const overlay = screen.querySelector('.battle-waiting-overlay');
    if (overlay) overlay.remove();
  }
}

export default { initBattleScreen, destroyBattleScreen };
