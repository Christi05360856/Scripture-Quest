// ============================================
// SCRIPTUREQUEST V4 — Battle Page
// FIXES IN THIS VERSION:
//
//   FIX A — CF failure fallback:
//     submitBattleAnswers calls the completeBattle
//     Cloud Function, but if it fails with CORS or
//     an internal error, we now fall back to writing
//     answers directly to Firestore. The onSnapshot
//     listener then picks up the completion naturally.
//     This fixes "no result shown after battle" when
//     the CF is unreachable.
//
//   FIX B — Both submitted stuck:
//     After submitBattleAnswers resolves with
//     bothDone:false, we re-read the doc once to catch
//     the race where the other player's transaction
//     already closed it. (Unchanged from v4, kept.)
//
//   FIX C — Already completed before load:
//     _pollForOpponentDone catches matches already
//     completed before this player opened the screen.
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

  _matchUnsub = listenToMatch(matchId, matchUpdate => {
    if (_destroyed || _submitting) return;
    if (matchUpdate.status === 'completed') {
      _submit(true);
    }
  });

  _pollForOpponentDone(matchId);
}

async function _pollForOpponentDone(matchId) {
  try {
    const match = await getMatchResult(matchId);
    if (!match || _destroyed || _submitting) return;
    if (match.status === 'completed') {
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

  if (el('battle-prev-btn')) el('battle-prev-btn').disabled = _current === 0;
  el('battle-next-btn')?.classList.toggle('hidden',   isLast);
  el('battle-submit-btn')?.classList.toggle('hidden', !isLast && !allAnswered);
  if (el('battle-next-btn') && !isLast)
    el('battle-next-btn').disabled = _answers[_current] === undefined;
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
// FIX A: CF failure -> direct Firestore fallback
// ============================================

async function _submit(autoSubmit = false) {
  if (_submitting || _destroyed) return;
  _submitting = true;

  if (_timer)      { clearInterval(_timer);  _timer = null; }
  if (_matchUnsub) { _matchUnsub(); _matchUnsub = null; }

  const btn = el('battle-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  }

  // Fill unanswered questions with null
  const answers = {};
  _questions.forEach((_, i) => {
    answers[i] = _answers[i] !== undefined ? _answers[i] : null;
  });

  try {
    // Attempt 1: Cloud Function via match.service
    let result = null;
    try {
      result = await submitBattleAnswers(_matchId, answers);
    } catch (cfErr) {
      console.warn('[Battle] CF submit failed, trying Firestore fallback:', cfErr.message);
      // FIX A: Direct Firestore fallback
      result = await _submitDirectToFirestore(_matchId, answers);
    }

    if (result?.bothDone) {
      const match = await getMatchResult(_matchId);
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
      setTimeout(() => {
        if (!_destroyed) _callbacks.onComplete?.(match);
      }, 50);
      return;
    }

    // Re-read once — other player may have already completed it
    let definitiveMatch = null;
    try { definitiveMatch = await getMatchResult(_matchId); } catch(e) {}

    if (definitiveMatch?.status === 'completed') {
      try { localStorage.removeItem(PENDING_BATTLE_KEY); } catch(e) {}
      setTimeout(() => {
        if (!_destroyed) _callbacks.onComplete?.(definitiveMatch);
      }, 50);
      return;
    }

    // Genuinely waiting — show overlay
    _showWaiting();

  } catch(err) {
    console.error('[Battle] Submit error:', err);
    _submitting = false;
    _showWaiting();
  }
}

// ============================================
// FIX A: Direct Firestore answer write
// Used when completeBattle CF is unreachable.
// ============================================

async function _submitDirectToFirestore(matchId, answers) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { doc, getDoc, updateDoc, serverTimestamp } =
    await import('firebase/firestore');
  const { db } = await import('../firebase/config.js');

  const matchRef  = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error('Match not found');

  const match     = matchSnap.data();
  const questions = match.questions || [];
  const isCreator = match.creatorId === user.uid;

  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] !== null && answers[i] === q.correctAnswer) correct++;
  });
  const total = questions.length || 15;
  const pct   = Math.round((correct / total) * 100);

  const updateData = isCreator
    ? { creatorAnswers: answers, creatorScore: correct, creatorPct: pct, creatorDone: true, creatorDoneAt: serverTimestamp() }
    : { opponentAnswers: answers, opponentScore: correct, opponentPct: pct, opponentDone: true, opponentDoneAt: serverTimestamp() };

  await updateDoc(matchRef, updateData);

  const updatedSnap = await getDoc(matchRef);
  const updated     = updatedSnap.data();
  const bothDone    = updated.creatorDone && updated.opponentDone;

  if (bothDone) {
    const creatorPct  = updated.creatorPct  ?? 0;
    const opponentPct = updated.opponentPct ?? 0;
    let winnerId;
    if (creatorPct > opponentPct)      winnerId = updated.creatorId;
    else if (opponentPct > creatorPct) winnerId = updated.opponentId;
    else                               winnerId = 'draw';

    await updateDoc(matchRef, { status: 'completed', winnerId, completedAt: serverTimestamp() });
    return { bothDone: true };
  }

  if (match.status === 'pending' || match.status === 'waiting') {
    await updateDoc(matchRef, { status: 'active' }).catch(() => {});
  }

  return { bothDone: false };
}

// ============================================
// WAITING OVERLAY
// ============================================

function _showWaiting() {
  const screen = el('screen-battle');
  if (!screen) return;

  const existing = screen.querySelector('.battle-waiting-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'battle-waiting-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;z-index:50;background:var(--bg-primary,#fff);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="max-width:480px;text-align:center;padding:40px 20px">
      <div style="font-size:64px;margin-bottom:16px">⏳</div>
      <h2 style="font-size:22px;font-weight:900;color:var(--text-primary);margin-bottom:8px">Answers Submitted!</h2>
      <p style="color:var(--text-muted);font-size:15px;margin-bottom:8px">Waiting for your opponent to finish…</p>
      <div class="spinner" style="margin:20px auto;width:40px;height:40px;border:4px solid var(--border);border-top-color:var(--accent-primary);border-radius:50%;animation:spin 1s linear infinite"></div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:8px">
        You can safely close this page.<br>We'll show results next time you open the app. 📱
      </p>
    </div>`;
  screen.appendChild(overlay);

  if (!document.getElementById('battle-spin-style')) {
    const style = document.createElement('style');
    style.id = 'battle-spin-style';
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

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
