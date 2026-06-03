// ============================================
// BATTLE PAGE — Head-to-head quiz battle
// Reuses quiz logic but with battle-specific UI
// ============================================

import { submitBattleAnswers, listenToMatch } from '../services/match.service.js';
import { getCurrentUser } from '../state/store.js';

let _currentQuestion = 0;
let _answers = {};
let _questions = [];
let _matchId = null;
let _isCreator = false;
let _timerInterval = null;
let _timeLeft = 360; // 6 minutes in seconds
let _onComplete = null;
let _matchUnsub = null;

export async function initBattleScreen(matchId, questions, match, callbacks) {
  _matchId = matchId;
  _questions = questions || match.questions || [];
  _answers = {};
  _currentQuestion = 0;
  _timeLeft = 360;
  _onComplete = callbacks?.onComplete;

  const user = getCurrentUser();
  _isCreator = match.creatorId === user?.uid;

  // Set opponent name in UI
  const oppName = _isCreator ? (match.opponentName || 'Opponent') : (match.creatorName || 'Opponent');
  const myName = _isCreator ? (match.creatorName || 'You') : (match.opponentName || 'You');
  
  const myNameEl = document.getElementById('battle-my-name');
  const oppNameEl = document.getElementById('battle-opponent-name');
  if (myNameEl) myNameEl.textContent = myName;
  if (oppNameEl) oppNameEl.textContent = oppName;

  // Mount avatars if available
  const myAvatar = _isCreator ? match.creatorAvatar : match.opponentAvatar;
  const oppAvatar = _isCreator ? match.opponentAvatar : match.creatorAvatar;
  
  // Render avatars using the avatar component if available
  try {
    const { mountAvatar } = await import('../components/avatar.js');
    if (myAvatar && document.getElementById('battle-my-avatar')) {
      mountAvatar(myAvatar, document.getElementById('battle-my-avatar'));
    }
    if (oppAvatar && document.getElementById('battle-opponent-avatar')) {
      mountAvatar(oppAvatar, document.getElementById('battle-opponent-avatar'));
    }
  } catch(e) {
    // Avatars not critical, continue without
  }

  // Start timer
  startTimer();

  // Listen for opponent progress (optional — can show "opponent answered Q3")
  _matchUnsub = listenToMatch(matchId, (updatedMatch) => {
    if (updatedMatch.status === 'completed') {
      // Opponent finished, check if we should auto-submit
      const myAnswersCount = Object.keys(_answers).length;
      if (myAnswersCount < _questions.length) {
        // Auto-submit with current answers
        finishBattle();
      }
    }
  });

  // Wire nav buttons
  document.getElementById('battle-prev-btn')?.addEventListener('click', prevQuestion);
  document.getElementById('battle-next-btn')?.addEventListener('click', nextQuestion);
  document.getElementById('battle-submit-btn')?.addEventListener('click', finishBattle);

  renderQuestion();
}

function startTimer() {
  const timerEl = document.getElementById('battle-timer');
  updateTimerDisplay();
  
  _timerInterval = setInterval(() => {
    _timeLeft--;
    updateTimerDisplay();
    if (_timeLeft <= 0) {
      clearInterval(_timerInterval);
      finishBattle();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('battle-timer');
  const mins = Math.floor(_timeLeft / 60);
  const secs = _timeLeft % 60;
  if (timerEl) {
    timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    if (_timeLeft <= 30) timerEl.classList.add('urgent');
  }
}

function renderQuestion() {
  const q = _questions[_currentQuestion];
  if (!q) return;

  const chip = document.getElementById('battle-q-chip');
  const text = document.getElementById('battle-q-text');
  const options = document.getElementById('battle-options');
  const progress = document.getElementById('battle-progress');

  if (chip) chip.textContent = `Question ${_currentQuestion + 1} of ${_questions.length}`;
  if (text) text.textContent = q.question;
  if (progress) progress.style.width = `${((_currentQuestion + 1) / _questions.length) * 100}%`;

  if (!options) return;

  options.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = `
      <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
      <span>${opt}</span>
    `;
    if (_answers[_currentQuestion] === idx) {
      btn.classList.add('selected');
      btn.style.borderColor = 'var(--accent-primary)';
      btn.style.background = 'var(--accent-warm-bg)';
    }
    btn.addEventListener('click', () => selectAnswer(idx));
    options.appendChild(btn);
  });

  // Update nav buttons
  const prevBtn = document.getElementById('battle-prev-btn');
  const nextBtn = document.getElementById('battle-next-btn');
  const submitBtn = document.getElementById('battle-submit-btn');

  if (prevBtn) prevBtn.disabled = _currentQuestion === 0;
  
  const isLast = _currentQuestion === _questions.length - 1;
  if (nextBtn) {
    nextBtn.classList.toggle('hidden', isLast);
    nextBtn.innerHTML = isLast ? 'Submit <i class="fas fa-paper-plane"></i>' : 'Next <i class="fas fa-chevron-right"></i>';
  }
  if (submitBtn) submitBtn.classList.toggle('hidden', !isLast);
}

function selectAnswer(idx) {
  _answers[_currentQuestion] = idx;
  renderQuestion();
}

function nextQuestion() {
  if (_currentQuestion < _questions.length - 1) {
    _currentQuestion++;
    renderQuestion();
  } else {
    finishBattle();
  }
}

function prevQuestion() {
  if (_currentQuestion > 0) {
    _currentQuestion--;
    renderQuestion();
  }
}

async function finishBattle() {
  clearInterval(_timerInterval);
  if (_matchUnsub) _matchUnsub();

  const user = getCurrentUser();
  const userAnswers = _questions.map((_, i) => _answers[i] !== undefined ? _answers[i] : null);

  try {
    const result = await submitBattleAnswers(_matchId, userAnswers);
    
    if (result.bothDone) {
      // Both finished — show results
      if (_onComplete) _onComplete(await import('../services/match.service.js').then(m => m.getMatchResult(_matchId)));
    } else {
      // Waiting for opponent
      showWaitingScreen();
    }
  } catch (err) {
    console.error('[Battle] Submit error:', err);
    // Still try to show waiting or results
    showWaitingScreen();
  }
}

function showWaitingScreen() {
  const screen = document.getElementById('screen-battle');
  if (screen) {
    screen.innerHTML = `
      <div style="max-width:480px;margin:0 auto;text-align:center;padding:40px 20px">
        <div style="font-size:64px;margin-bottom:16px">⏳</div>
        <h2 style="font-size:22px;font-weight:900;color:var(--text-primary);margin-bottom:8px">Answers Submitted!</h2>
        <p style="color:var(--text-muted);font-size:15px;margin-bottom:24px">Waiting for your opponent to finish…</p>
        <div class="spinner" style="margin:0 auto 20px"></div>
        <p style="font-size:13px;color:var(--text-muted)">You'll see results when both players are done.</p>
      </div>
    `;
  }
  
  // Continue listening for match completion
  _matchUnsub = listenToMatch(_matchId, (match) => {
    if (match.status === 'completed') {
      if (_onComplete) _onComplete(match);
    }
  });
}
