// Battle page — head-to-head quiz screen
import { submitBattleAnswers, listenToMatch, getMatchResult } from '../services/match.service.js';
import { showToast }    from '../utils/toast.js';
import { mountAvatar }  from '../components/avatar.js';
import { LETTERS, BATTLE_DURATION_SECS } from '../utils/constants.js';

let _matchId, _questions, _match, _userAnswers={}, _currentIndex=0,
    _timeLeft=BATTLE_DURATION_SECS, _timer=null, _answered=false,
    _unsubscribe=null, _cb={}, _submitting=false;

const el = id => document.getElementById(id);

export async function initBattleScreen(matchId, questions, match, callbacks) {
  _matchId=matchId; _questions=questions; _match=match; _cb=callbacks||{};
  _userAnswers={}; _currentIndex=0; _timeLeft=BATTLE_DURATION_SECS;
  _answered=false; _submitting=false;

  const { getCurrentUser, getUserProfile } = await import('../state/store.js');
  const user      = getCurrentUser();
  const isCreator = match.creatorId === user?.uid;

  const opponentName   = isCreator ? match.opponentName   : match.creatorName;
  const opponentAvatar = isCreator ? match.opponentAvatar : match.creatorAvatar;
  const myProfile      = getUserProfile();

  if (el('battle-opponent-name'))   el('battle-opponent-name').textContent = opponentName || 'Opponent';
  if (el('battle-opponent-avatar')) mountAvatar(opponentAvatar || 'M01', el('battle-opponent-avatar'));
  if (el('battle-my-name'))         el('battle-my-name').textContent = myProfile?.displayName || 'You';
  if (el('battle-my-avatar'))       mountAvatar(myProfile?.avatarId || 'M01', el('battle-my-avatar'));

  renderQuestion();
  startTimer();

  el('battle-next-btn')?.addEventListener('click', nextQ);
  el('battle-prev-btn')?.addEventListener('click', prevQ);
  el('battle-submit-btn')?.addEventListener('click', () => handleSubmit());
  el('battle-quit-btn')?.addEventListener('click', () => {
    if (window.SQ?.showConfirm) {
      window.SQ.showConfirm({
        icon: '🚪', title: 'Quit Battle?',
        message: 'Your battle progress will be lost.',
        onConfirm: () => { stopTimer(); if(_unsubscribe){_unsubscribe();_unsubscribe=null;} _cb.onWaiting?.(_matchId, {percentage:0}); }
      });
    }
  });

  _unsubscribe = listenToMatch(matchId, onMatchUpdate);
}

function onMatchUpdate(match) {
  if (match.status === 'completed' && !_submitting) {
    stopTimer();
    if (_unsubscribe) { _unsubscribe(); _unsubscribe=null; }
    setTimeout(() => _cb.onComplete?.(match), 500);
  }
}

function renderQuestion() {
  const q        = _questions[_currentIndex];
  const answered = _userAnswers[_currentIndex];
  _answered      = answered !== undefined;

  if (el('battle-q-chip'))    el('battle-q-chip').textContent    = `Question ${_currentIndex+1} of ${_questions.length}`;
  if (el('battle-q-text'))    el('battle-q-text').textContent    = q.question;
  if (el('battle-progress'))  el('battle-progress').style.width  = `${((_currentIndex+1)/_questions.length)*100}%`;
  if (el('battle-prog-fill')) el('battle-prog-fill').style.width = `${((_currentIndex+1)/_questions.length)*100}%`;

  const optEl = el('battle-options');
  if (optEl) {
    optEl.innerHTML = q.options.map((opt,i) => `
      <button class="option${answered===i ? (answered===q.correctAnswer?' correct':' wrong') : (_answered?' disabled':'')}"
        data-index="${i}" ${_answered?'disabled':''}>
        <span class="option-letter">${LETTERS[i]}</span>
        <span>${opt}</span>
      </button>`).join('');

    if (!_answered) {
      optEl.querySelectorAll('.option').forEach(b =>
        b.addEventListener('click', () => handleAnswer(parseInt(b.dataset.index))));
    }
  }
  updateNavBtns();
}

function handleAnswer(idx) {
  if (_answered || _submitting) return;
  _answered = true;
  _userAnswers[_currentIndex] = idx;
  const q = _questions[_currentIndex];
  const isCorrect = idx === q.correctAnswer;

  // Only colour the chosen button — never reveal the correct one
  el('battle-options')?.querySelectorAll('.option').forEach((b,i) => {
    b.disabled = true;
    if (i === idx) {
      b.classList.add(isCorrect ? 'correct' : 'wrong');
    } else {
      b.classList.add('disabled');
    }
  });
  updateNavBtns();
}

function nextQ() { if (_currentIndex<_questions.length-1){_currentIndex++;_answered=_userAnswers[_currentIndex]!==undefined;renderQuestion();} }
function prevQ() { if (_currentIndex>0){_currentIndex--;_answered=_userAnswers[_currentIndex]!==undefined;renderQuestion();} }

function updateNavBtns() {
  if (el('battle-prev-btn')) el('battle-prev-btn').disabled = _currentIndex===0;
  const isLast      = _currentIndex===_questions.length-1;
  const allAnswered = Object.keys(_userAnswers).length===_questions.length;
  el('battle-next-btn')?.classList.toggle('hidden', isLast);
  el('battle-submit-btn')?.classList.toggle('hidden', !(isLast || allAnswered));
  if (el('battle-next-btn') && !isLast) el('battle-next-btn').disabled = !_answered;
}

function startTimer() {
  stopTimer();
  const t = el('battle-timer');
  const tick = () => {
    if (_timeLeft<=0) { stopTimer(); handleSubmit(true); return; }
    const m=Math.floor(_timeLeft/60), s=_timeLeft%60;
    if(t){ t.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; t.classList.toggle('urgent',_timeLeft<=30); }
    _timeLeft--;
  };
  tick(); _timer=setInterval(tick,1000);
}

function stopTimer() { if(_timer){clearInterval(_timer);_timer=null;} }

async function handleSubmit(timeExpired=false) {
  if (_submitting) return;
  _submitting = true;
  stopTimer();
  if(_unsubscribe){_unsubscribe();_unsubscribe=null;}

  const btn = el('battle-submit-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Submitting…';}

  try {
    const result = await submitBattleAnswers(_matchId, _userAnswers);
    if (result.bothDone) {
      const match = await getMatchResult(_matchId);
      _cb.onComplete?.(match);
    } else {
      _cb.onWaiting?.(_matchId, result);
      // Re-subscribe to wait for opponent
      _unsubscribe = listenToMatch(_matchId, onMatchUpdate);
    }
  } catch(err) {
    _submitting = false;
    showToast(err.message,'error');
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit';}
    startTimer();
  }
}

export default { initBattleScreen };
