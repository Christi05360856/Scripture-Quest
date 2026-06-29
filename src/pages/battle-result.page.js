// ============================================
// battle-result.page.js  — Bible Battle Result Screen
// STUB — Full implementation pending
// ============================================

let _callbacks = {};

const el = id => document.getElementById(id);

export async function initBattleResultScreen(result, callbacks) {
  _callbacks = callbacks || {};

  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const isDraw = result?.winnerId === 'draw';
  const isWinner = result?.winnerId === user?.uid;
  const isCreator = result?.creatorId === user?.uid;

  const myPct     = isCreator ? (result?.creatorPct  ?? 0) : (result?.opponentPct ?? 0);
  const oppPct    = isCreator ? (result?.opponentPct ?? 0) : (result?.creatorPct  ?? 0);
  const myName    = isCreator ? (result?.creatorName  || 'You') : (result?.opponentName || 'You');
  const oppName   = isCreator ? (result?.opponentName || 'Opponent') : (result?.creatorName || 'Opponent');

  // Title & icon
  const titleEl   = el('br-title');
  const iconEl    = el('br-icon');
  if (titleEl) {
    titleEl.textContent = isDraw ? "It's a Draw!" : isWinner ? 'Victory!' : 'Defeat';
  }
  if (iconEl) {
    iconEl.textContent = isDraw ? '🤝' : isWinner ? '🏆' : '😔';
  }

  // Names
  if (el('br-my-name'))    el('br-my-name').textContent    = myName;
  if (el('br-opp-name'))   el('br-opp-name').textContent   = oppName;

  // Percentages
  if (el('br-my-pct'))     el('br-my-pct').textContent     = `${myPct}%`;
  if (el('br-opp-pct'))    el('br-opp-pct').textContent    = `${oppPct}%`;

  // XP earned
  const xpEarned = isWinner ? 50 : isDraw ? 25 : 10;
  if (el('br-xp'))         el('br-xp').textContent         = `+${xpEarned} XP`;

  // Streak
  if (el('br-streak'))     el('br-streak').textContent     = result?.streak || 0;

  // Show/hide rematch button
  const rematchBtn = el('br-rematch-btn');
  if (rematchBtn) {
    rematchBtn.classList.toggle('hidden', !result?.rematchCode);
    if (result?.rematchCode) {
      rematchBtn.onclick = () => {
        _callbacks.onRematch?.(result.rematchCode);
      };
    }
  }

  // Back button
  const backBtn = el('br-back-btn');
  if (backBtn) {
    backBtn.onclick = () => _callbacks.onBack?.();
  }
}

export default { initBattleResultScreen };
