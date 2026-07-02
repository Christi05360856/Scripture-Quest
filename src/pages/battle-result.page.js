// ============================================
// battle-result.page.js — Bible Battle Result Screen
// Full implementation — renders real match data
// directly into the screen-battle-result container.
// ============================================

import { getCurrentUser } from '../state/store.js';
import { mountAvatar }    from '../components/avatar.js';

let _callbacks = {};

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function initBattleResultScreen(match, callbacks) {
  _callbacks = callbacks || {};

  const container = document.getElementById('screen-battle-result');
  if (!container) return;

  const user      = getCurrentUser();
  const isCreator = match?.creatorId === user?.uid;

  const myName    = isCreator ? (match?.creatorName    || 'You')      : (match?.opponentName || 'You');
  const oppName   = isCreator ? (match?.opponentName   || 'Opponent') : (match?.creatorName   || 'Opponent');
  const myAvatar  = isCreator ? (match?.creatorAvatar  || 'M01')      : (match?.opponentAvatar || 'M01');
  const oppAvatar = isCreator ? (match?.opponentAvatar || 'M01')      : (match?.creatorAvatar  || 'M01');
  const myScore   = isCreator ? (match?.creatorScore  ?? 0) : (match?.opponentScore ?? 0);
  const oppScore  = isCreator ? (match?.opponentScore ?? 0) : (match?.creatorScore  ?? 0);
  const myPct     = isCreator ? (match?.creatorPct  ?? 0) : (match?.opponentPct ?? 0);
  const oppPct    = isCreator ? (match?.opponentPct ?? 0) : (match?.creatorPct  ?? 0);
  const total     = match?.questions?.length || 15;

  const isDraw   = match?.winnerId === 'draw';
  const isWinner = !isDraw && match?.winnerId === user?.uid;

  const title = isDraw ? "It's a Draw!" : isWinner ? 'Victory!' : 'Defeat';
  const icon  = isDraw ? '🤝' : isWinner ? '🏆' : '😔';
  const xp    = isDraw ? 25 : isWinner ? 50 : 10;

  container.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:32px 20px;text-align:center">
      <div style="font-size:64px;margin-bottom:8px">${icon}</div>
      <h1 style="font-size:26px;font-weight:900;color:var(--text-primary);margin-bottom:24px">${title}</h1>

      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:24px">
        <div style="flex:1;background:${isWinner ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary,#f5f5f7)'};border-radius:16px;padding:16px;${isWinner ? 'border:2px solid #22c55e' : ''}">
          <div id="br-my-avatar" style="width:56px;height:56px;border-radius:50%;margin:0 auto 8px;overflow:hidden"></div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${escapeHTML(myName)}</div>
          <div style="font-size:24px;font-weight:900;color:var(--accent-primary,#4f46e5)">${myPct}%</div>
          <div style="font-size:12px;color:var(--text-muted)">${myScore}/${total}</div>
        </div>
        <div style="font-weight:700;color:var(--text-muted)">VS</div>
        <div style="flex:1;background:${!isWinner && !isDraw ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary,#f5f5f7)'};border-radius:16px;padding:16px;${!isWinner && !isDraw ? 'border:2px solid #22c55e' : ''}">
          <div id="br-opp-avatar" style="width:56px;height:56px;border-radius:50%;margin:0 auto 8px;overflow:hidden"></div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${escapeHTML(oppName)}</div>
          <div style="font-size:24px;font-weight:900;color:var(--accent-primary,#4f46e5)">${oppPct}%</div>
          <div style="font-size:12px;color:var(--text-muted)">${oppScore}/${total}</div>
        </div>
      </div>

      <div style="background:#fef3c7;border-radius:12px;padding:14px;margin-bottom:20px">
        <div style="font-weight:800;color:#92400e">+${xp} XP</div>
        <div style="font-size:12px;color:#92400e">Battle bonus added to your total!</div>
      </div>

      <button id="br-rematch-btn" style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(90deg,#4f46e5,#8b5cf6);color:#fff;font-weight:700;font-size:15px;margin-bottom:12px;cursor:pointer">🔄 Request Rematch</button>
      <button id="br-back-btn" style="background:none;border:none;color:var(--text-muted);font-size:14px;cursor:pointer;padding:8px">← Home</button>
    </div>`;

  mountAvatar(myAvatar,  document.getElementById('br-my-avatar'));
  mountAvatar(oppAvatar, document.getElementById('br-opp-avatar'));

  document.getElementById('br-rematch-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const { sendRematch } = await import('../services/match.service.js');
      const result = await sendRematch(match.matchId);
      _callbacks.onRematch?.(result.code);
    } catch (err) {
      alert('Rematch failed: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔄 Request Rematch';
    }
  });

  document.getElementById('br-back-btn')?.addEventListener('click', () => _callbacks.onBack?.());
}

export default { initBattleResultScreen };
