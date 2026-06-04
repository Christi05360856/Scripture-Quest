// ============================================
// SCRIPTUREQUEST V4 — Battle Page
// Fixes applied in this version:
//
//   FIX A — "both submitted, stuck on waiting":
//     After submitBattleAnswers resolves with bothDone:false, we immediately
//     re-read the match doc once. If the transaction from the OTHER player
//     has already marked it 'completed', we fire onComplete right away instead
//     of entering the waiting state. This covers the ~100ms window where both
//     transactions succeed near-simultaneously and the local result says
//     bothDone:false but Firestore already has status:'completed'.
//
//   FIX B — FAB visibility managed centrally in app.js; battle.page only
//     calls destroyBattleScreen cleanly (unchanged from v4, kept here for ref).
//
//   FIX C — _pollForOpponentDone now also catches the case where the match
//     is already 'completed' before this player even starts (i.e. opponent
//     submitted before this user accepted and launched the battle screen).
//
//   Retained from v4:
//     - Timer uses BATTLE_DURATION_SECS (2:50)
//     - Persists matchId to localStorage via PENDING_BATTLE_KEY
//     - Robust destroyBattleScreen with _destroyed guard
//     - Waiting overlay (not innerHTML replacement)
//     - No correct answer revealed on wrong pick
// ============================================

import { submitBattleAnswers, listenToMatch, getMatchResult } from '../services/match.service.js';
import { getCurrentUser }      from '../state/store.js';
import { mountAvatar }         from '../components/avatar.js';
import { LETTERS, BATTLE_DURATION_SECS, PENDING_BATTLE_KEY } from '../utils/constants.js';

let _matchId    = null;
let _questions  = [];
let _answers    = {};
let _current    = 0;
let _timeLeft   = BATTLE_DURATION_SECS;
let _timer      = null;
let _matchUnsub = null;
let _submitting = false;
let _callbacks  = {};
let _destroyed  = false;

const el = id => document.getElementById(id);

// ============================================
// INIT
// ============================================

export async function initBattleScreen(matchId, questions, match, callbacks) {
  destroyBattleScreen();

  _matchId    = matchId;
  _questions  = (questions || match?.questions || []).slice();
  _answers    = {};
  _current    = 0;
  _timeLeft   = BATTLE_DURATION_SECS;
  _submitting = false;
  _callbacks  = callbacks || {};
  _destroyed  = false;

  try { localStorage.setItem(PENDING_BATTLE_KEY, matchId); } catch(e) {}

  const user      = getCurrentUser();
  const isCreator = match.creatorId === user?.uid;
  const myName    = isCreator ? match.creatorName    : match.opponentName;
  const oppName   = isCreator ? match.opponentName   : match.creatorName;
  const myAvatar  = isCreator ? match.creatorAvatar  : match.opponentAvatar;
  const oppAvatar = isCreator ? match.opponentAvatar : match.creatorAvatar;

  if (el('battle-my-name'))         el('battle-my-name').textContent      = myName  || 'You';
  if (el('battle-opponent-name'))   el('battle-opponent-name').textContent = oppName || 'Opponent';
  if (el('battle-my-avatar'))       mountAvatar(myAvatar  || 'M01', el('battle-my-avatar'));
  if (el('battle-opponent-avatar')) mountAvatar(oppAvatar || 'M01', el('battle-opponent-avatar'));

  _wire('battle-prev-btn',   prevQ);
  _wire('battle-next-btn',   nextQ);
  _wire('battle-submit-btn', () => _submit());

  renderQuestion();
  _startTimer();

  // Subscribe to match updates — auto-submit if opponent finishes first
  _matchUnsub = listenToMatch(matchId, matchUpdate => {
    if (_destroyed || _submitting) return;
    if (matchUpdate.status === 'completed') {
      // Opponent finished and their transaction closed the match — submit ours
      _submit(true);
    }
  });

  // Check if match is already completed (e.g. opponent submitted before we even loaded)
  _pollForOpponentDone(matchId);
}

// Re-read the doc once on init. If the match is already completed (opponent
// submitted before this player's battle screen even loaded), fire auto-submit
// immediately so this player doesn't sit on a blank quiz.
async function _pollForOpponentDone(matchId) {
  try {
    const match = await getMatchResult(matchId);
    if (!match || _destroyed || _submitting) return;
    if (match.status === 'completed') {
      // The transaction from the other player already closed this match.
      // Our submission will hit the 'alreadyCompleted' guard in the service
      // and return the cached result, then we navigate to battle-result.
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
  const q = _questions[_current];
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

  // Colour only the chosen button — never reveal the correct answer
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
    if (t) {
      t.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      t.classList.toggle('urgent', _timeLeft <= 30);
    }
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

  if (_timer)     { clearInterval(_timer);  _timer = null; }
  if (_matchUnsub){ _matchUnsub(); _matchUnsub = null; }

  const btn = el('battle-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

  // Fill unanswered questions with null
  const answers = {};
  _questions.forEach((_, i) => { answers[i] = _answers[i] !== undefined ? _answers[i] : null; });

  try {
    const result = await submitBattleAnswers(_matchId, answers);

    if (result.bothDone) {
      // Transaction resolved both players — fetch the final doc and navigate
      const match = await getMatchResult(_matchId);
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
      setTimeout(() => {
        if (!_destroyed) _callbacks.onComplete?.(match);
      }, 50);
      return;
    }

    // ── FIX A ──────────────────────────────────────────────────────────────
    // bothDone was false in our transaction, but the OTHER player's transaction
    // may have fired concurrently and already written status:'completed'.
    // Re-read the doc once to confirm the definitive state before showing
    // the waiting overlay.
    // ───────────────────────────────────────────────────────────────────────
    let definitiveMatch = null;
    try {
      definitiveMatch = await getMatchResult(_matchId);
    } catch(e) {
      console.warn('[Battle] Re-read after submit failed (non-fatal):', e.message);
    }

    if (definitiveMatch?.status === 'completed') {
      // The other player's transaction closed it between our read and our write.
      // Navigate directly to results.
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
      setTimeout(() => {
        if (!_destroyed) _callbacks.onComplete?.(definitiveMatch);
      }, 50);
      return;
    }

    // Genuinely waiting for the opponent — show overlay and subscribe
    _showWaiting();

  } catch(err) {
    console.error('[Battle] Submit error:', err);
    _submitting = false;
    // Show waiting rather than hanging — Firestore listener will catch completion
    _showWaiting();
  }
}

function _showWaiting() {
  // Use an overlay so the screen-battle container stays intact (avoids blank-screen
  // race when app.js calls showScreen('battle-result') inside onComplete).
  const screen = el('screen-battle');
  if (!screen) return;

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

  if (!document.getElementById('battle-spin-style')) {
    const style = document.createElement('style');
    style.id = 'battle-spin-style';
    style.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
  }

  // Re-subscribe to catch completion while waiting
  _matchUnsub = listenToMatch(_matchId, match => {
    if (_destroyed) return;
    if (match.status === 'completed') {
      if (_matchUnsub) { _matchUnsub(); _matchUnsub = null; }
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
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
  _destroyed = true;
  if (_timer)      { clearInterval(_timer);  _timer = null; }
  if (_matchUnsub) { _matchUnsub(); _matchUnsub = null; }
  _submitting = false;

  const screen = el('screen-battle');
  if (screen) {
    const overlay = screen.querySelector('.battle-waiting-overlay');
    if (overlay) overlay.remove();
  }
}

export default { initBattleScreen, destroyBattleScreen };
