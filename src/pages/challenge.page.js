// ============================================
// SCRIPTUREQUEST V4 — Challenge Page
// Handles the full PvP challenge flow:
//   1. Creating a challenge (with share link)
//   2. Joining via code or URL param
//   3. Waiting for opponent
//   4. Battle quiz screen (delegates to battle.page.js)
//   5. Results screen for both players
// Lazy-loaded — only imported when needed.
// ============================================

import {
  createChallenge,
  getChallengeByCode,
  acceptChallenge,
  getMatchResult,
  listenToMatch,
  sendRematch,
  generateWhatsAppLink,
  getChallengeCodeFromURL,
  getUserMatches
} from '../services/match.service.js';
import { getCurrentUser, getUserProfile } from '../state/store.js';
import { showToast }                      from '../utils/toast.js';
import { LETTERS }                        from '../utils/constants.js';

// ── Module state ──
let _callbacks        = {};
let _unsubscribeMatch = null;
let _countdownTimer   = null;
let _currentMatchId   = null;
let _battlePage       = null;

const el = id => document.getElementById(id);

// ============================================
// LAZY LOAD BATTLE PAGE
// ============================================

async function getBattlePage() {
  if (!_battlePage) {
    _battlePage = await import('./battle.page.js');
  }
  return _battlePage;
}

// ============================================
// INIT — entry point from app.js
// Called when user navigates to challenge screen
// ============================================

export async function initChallengePage(callbacks) {
  _callbacks = callbacks || {};
  _cleanup();

  // Wire static buttons
  el('challenge-back-btn')?.addEventListener('click', () => _callbacks.onBack?.());
  el('create-challenge-btn')?.addEventListener('click', handleCreateChallenge);
  el('join-challenge-btn')?.addEventListener('click', handleJoinByCode);
  el('challenge-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleJoinByCode();
  });
  el('copy-challenge-link-btn')?.addEventListener('click', handleCopyLink);
  el('share-whatsapp-btn')?.addEventListener('click', handleShareWhatsApp);
  el('challenge-cancel-btn')?.addEventListener('click', handleCancelWait);
  el('challenge-rematch-btn')?.addEventListener('click', handleRematch);
  el('challenge-done-btn')?.addEventListener('click', () => _callbacks.onBack?.());

  // Show recent matches
  _loadRecentMatches();

  // Auto-join if URL has ?challenge=CODE
  const urlCode = getChallengeCodeFromURL();
  if (urlCode) {
    const codeInput = el('challenge-code-input');
    if (codeInput) codeInput.value = urlCode;
    // Small delay to let page render first
    setTimeout(() => handleJoinByCode(), 300);
  }

  _showPanel('challenge-home-panel');
}

// ============================================
// PANEL MANAGER
// ============================================

const PANELS = [
  'challenge-home-panel',
  'challenge-waiting-panel',
  'challenge-result-panel'
];

function _showPanel(panelId) {
  PANELS.forEach(id => {
    const p = el(id);
    if (p) p.classList.toggle('hidden', id !== panelId);
  });
}

// ============================================
// CREATE CHALLENGE
// ============================================

async function handleCreateChallenge() {
  const user = getCurrentUser();
  if (!user) { showToast('Please sign in to create a challenge', 'error'); return; }

  const btn = el('create-challenge-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…'; }

  try {
    // Questions are passed in by app.js via callbacks, or fetched from Firestore directly
    let questions = [];
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('../firebase/config.js');
      const snap = await getDocs(
        query(collection(db, 'questions'), where('isActive', '==', true))
      );
      snap.forEach(d => questions.push({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('[Challenge] Could not fetch questions from Firestore:', err.message);
    }

    if (questions.length < 15) {
      showToast('Not enough questions available. Please try again later.', 'error');
      return;
    }

    const result = await createChallenge(questions);
    _currentMatchId = result.matchId;

    // Populate waiting panel
    _renderWaitingPanel(result.code, result.matchId, result.expiresAt, true);
    _showPanel('challenge-waiting-panel');

    // Listen for opponent joining
    _subscribeToMatch(result.matchId, true, result.questions);

  } catch (err) {
    showToast(err.message || 'Failed to create challenge', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-plus-circle"></i> Create Challenge';
    }
  }
}

// ============================================
// JOIN CHALLENGE
// ============================================

async function handleJoinByCode() {
  const user = getCurrentUser();
  if (!user) { showToast('Please sign in to join a challenge', 'error'); return; }

  const rawCode = el('challenge-code-input')?.value?.trim()?.toUpperCase();
  if (!rawCode) { showToast('Enter a challenge code first', 'error'); return; }

  const btn = el('join-challenge-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining…'; }

  try {
    const match = await getChallengeByCode(rawCode);
    if (!match) {
      showToast('Challenge not found. Check the code and try again.', 'error');
      return;
    }

    if (match.status === 'completed') {
      showToast('This challenge has already been completed.', 'error');
      return;
    }

    if (match.creatorId === user.uid) {
      // Rejoining own challenge — show waiting screen
      _currentMatchId = match.matchId;
      _renderWaitingPanel(match.code, match.matchId, match.expiresAt?.toMillis?.() || Date.now() + 7200000, true);
      _showPanel('challenge-waiting-panel');
      _subscribeToMatch(match.matchId, true, match.questions);
      return;
    }

    // Accept the challenge
    const accepted = await acceptChallenge(match.matchId);
    _currentMatchId = match.matchId;

        // Go straight to battle
    const bp = await getBattlePage();
    
    // FIX: Clean up any old battle state before starting new one
    const { destroyBattleScreen } = await import('./battle.page.js');
    destroyBattleScreen();
    
    _callbacks.onStartBattle?.({
      matchId:   accepted.matchId,
      questions: accepted.questions,
      match:     { ...match, status: 'active' }
    });
    

  } catch (err) {
    showToast(err.message || 'Failed to join challenge', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Challenge';
    }
  }
}

// ============================================
// WAITING PANEL
// ============================================

function _renderWaitingPanel(code, matchId, expiresAt, isCreator) {
  const codeEl   = el('waiting-challenge-code');
  const timerEl  = el('waiting-expires-timer');
  const statusEl = el('waiting-status-text');

  if (codeEl)   codeEl.textContent   = code;
  if (statusEl) statusEl.textContent = 'Waiting for opponent to join…';

  // Populate share buttons
  const profile     = getUserProfile();
  const name        = profile?.displayName || 'Someone';
  const appUrl      = window.location.origin + window.location.pathname;
  const waLink      = generateWhatsAppLink(code, name, appUrl);
  const shareLink   = `${appUrl}?challenge=${code}`;

  // Store link for copy button
  el('copy-challenge-link-btn')?.setAttribute('data-link', shareLink);
  el('share-whatsapp-btn')?.setAttribute('href', waLink);

  // Expiry countdown
  if (_countdownTimer) clearInterval(_countdownTimer);
  if (timerEl) {
    const tick = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        clearInterval(_countdownTimer);
        timerEl.textContent = 'Expired';
        showToast('Challenge expired. Create a new one.', 'warning');
        _showPanel('challenge-home-panel');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerEl.textContent = `Expires in ${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
    };
    tick();
    _countdownTimer = setInterval(tick, 1000);
  }
}

// ============================================
// REALTIME MATCH LISTENER
// ============================================

function _subscribeToMatch(matchId, isCreator, questions) {
  if (_unsubscribeMatch) {
    _unsubscribeMatch();
    _unsubscribeMatch = null;
  }

  _unsubscribeMatch = listenToMatch(matchId, async match => {
    if (match.status === 'active' && isCreator) {
      // Opponent joined — start battle
      if (_unsubscribeMatch) { _unsubscribeMatch(); _unsubscribeMatch = null; }
      if (_countdownTimer)   { clearInterval(_countdownTimer); _countdownTimer = null; }

      const statusEl = el('waiting-status-text');
      if (statusEl) statusEl.textContent = `${match.opponentName || 'Opponent'} joined! Starting battle…`;

      showToast(`${match.opponentName || 'Opponent'} accepted your challenge! ⚔️`, 'success', 3000);

      setTimeout(() => {
        _callbacks.onStartBattle?.({ matchId, questions: questions || match.questions, match });
      }, 1000);
    }

    if (match.status === 'completed') {
      if (_unsubscribeMatch) { _unsubscribeMatch(); _unsubscribeMatch = null; }
      _renderResultPanel(match);
      _showPanel('challenge-result-panel');
    }
  });
}

// ============================================
// RESULT PANEL
// ============================================

function _renderResultPanel(match) {
  const user      = getCurrentUser();
  const isCreator = match.creatorId === user?.uid;

  const myScore   = isCreator ? match.creatorScore   : match.opponentScore;
  const myPct     = isCreator ? match.creatorPct     : match.opponentPct;
  const oppScore  = isCreator ? match.opponentScore  : match.creatorScore;
  const oppPct    = isCreator ? match.opponentPct    : match.creatorPct;
  const myName    = isCreator ? match.creatorName    : match.opponentName;
  const oppName   = isCreator ? match.opponentName   : match.creatorName;
  const total     = match.questions?.length || 15;

  const winnerId  = match.winnerId;
  const isDraw    = winnerId === 'draw';
  const iWon      = winnerId === user?.uid;

  // Result icon + message
  const resultIcon = el('challenge-result-icon');
  const resultTitle = el('challenge-result-title');
  const resultMsg   = el('challenge-result-msg');

  if (resultIcon) {
    resultIcon.textContent = isDraw ? '🤝' : iWon ? '🏆' : '📖';
  }
  if (resultTitle) {
    resultTitle.textContent = isDraw ? "It's a Draw!" : iWon ? 'You Won!' : 'You Lost';
  }
  if (resultMsg) {
    resultMsg.textContent = isDraw
      ? 'Great match! You were perfectly matched.'
      : iWon
        ? `You outscored ${oppName || 'your opponent'}! Well done! 🎉`
        : `${oppName || 'Your opponent'} edged you this time. Challenge them again!`;
  }

  // Scores
  const myScoreEl  = el('challenge-my-score');
  const oppScoreEl = el('challenge-opp-score');
  const myNameEl   = el('challenge-my-name');
  const oppNameEl  = el('challenge-opp-name');

  if (myNameEl)   myNameEl.textContent   = myName   || 'You';
  if (oppNameEl)  oppNameEl.textContent  = oppName  || 'Opponent';
  if (myScoreEl)  myScoreEl.textContent  = myPct  != null ? `${myPct}%`  : '—';
  if (oppScoreEl) oppScoreEl.textContent = oppPct != null ? `${oppPct}%` : '—';

  // Correct count
  const myDetailEl  = el('challenge-my-detail');
  const oppDetailEl = el('challenge-opp-detail');
  if (myDetailEl)  myDetailEl.textContent  = myScore  != null ? `${myScore}/${total} correct`  : '';
  if (oppDetailEl) oppDetailEl.textContent = oppScore != null ? `${oppScore}/${total} correct` : '';

  // Store matchId for rematch
  el('challenge-rematch-btn')?.setAttribute('data-match-id', match.matchId);
}

// ============================================
// ACTIONS
// ============================================

function handleCopyLink() {
  const btn  = el('copy-challenge-link-btn');
  const link = btn?.getAttribute('data-link') || window.location.href;
  navigator.clipboard.writeText(link).then(() => {
    showToast('Challenge link copied! 📋', 'success');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  }).catch(() => {
    showToast('Could not copy — try manually', 'error');
  });
}

function handleShareWhatsApp() {
  const btn = el('share-whatsapp-btn');
  const url = btn?.getAttribute('href');
  if (url) window.open(url, '_blank');
}

function handleCancelWait() {
  _cleanup();
  _showPanel('challenge-home-panel');
  showToast('Challenge cancelled', 'info');
}

async function handleRematch() {
  const btn     = el('challenge-rematch-btn');
  const matchId = btn?.getAttribute('data-match-id') || _currentMatchId;
  if (!matchId) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    await sendRematch(matchId);
    showToast('Rematch request sent! ⚔️', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to send rematch', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-redo"></i> Rematch'; }
  }
}


// ============================================
// RECENT MATCHES
// ============================================

let _recentMatchesCache = [];

async function _loadRecentMatches() {
  const user = getCurrentUser();
  if (!user) return;

  const container = el('recent-matches-list');
  if (!container) return;

  try {
    const matches = await getUserMatches(user.uid);
    _recentMatchesCache = matches.slice(0, 10);

    if (!matches.length) {
      container.innerHTML = '<p class="empty-state" style="padding:16px;font-size:13px">No recent battles yet. Create a challenge to get started!</p>';
      return;
    }

    container.innerHTML = _recentMatchesCache.map((m, i) => {
      const isCreator = m.creatorId === user.uid;
      const oppName   = isCreator ? (m.opponentName || 'Waiting…') : m.creatorName;
      const myPct     = isCreator ? m.creatorPct  : m.opponentPct;
      const oppPct    = isCreator ? m.opponentPct : m.creatorPct;
      const isDraw    = m.winnerId === 'draw';
      const iWon      = m.winnerId === user.uid;

      let resultLabel = '', resultColor = '#6b7280', badgeBg = '#f3f4f6';
      if (m.status === 'completed') {
        resultLabel = isDraw ? '🤝 Draw' : iWon ? '🏆 Won' : '😔 Lost';
        resultColor = isDraw ? '#92400e' : iWon ? '#166534' : '#991b1b';
        badgeBg     = isDraw ? '#fef3c7' : iWon ? '#dcfce7' : '#fee2e2';
      } else if (m.status === 'waiting') {
        resultLabel = '⏳ Waiting'; resultColor = '#1e40af'; badgeBg = '#dbeafe';
      } else if (m.status === 'active') {
        resultLabel = '⚔️ Active'; resultColor = '#5b21b6'; badgeBg = '#ede9fe';
      }

      const scoreText = (myPct != null && oppPct != null) ? `${myPct}% vs ${oppPct}%` : m.code ? `Code: ${m.code}` : '';
      const dateText  = _formatMatchDate(m.completedAt || m.createdAt);
      const initial   = (oppName || '?').charAt(0).toUpperCase();

      return `
        <div class="recent-match-row" data-match-index="${i}" style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:var(--bg-secondary,#f9fafb);margin-bottom:10px;cursor:pointer">
          <div style="width:44px;height:44px;border-radius:50%;background:#e0e7ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">${initial}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">vs ${escapeHTML(oppName || 'Unknown')}</div>
            <div style="font-size:12px;color:var(--text-muted)">${dateText}${scoreText ? ' · ' + scoreText : ''}</div>
          </div>
          <div style="font-size:12px;font-weight:700;color:${resultColor};background:${badgeBg};padding:5px 10px;border-radius:999px;white-space:nowrap">${resultLabel}</div>
          <i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:12px"></i>
        </div>`;
    }).join('');

    container.querySelectorAll('.recent-match-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.matchIndex, 10);
        const match = _recentMatchesCache[idx];
        if (match) _showMatchDetail(match, user);
      });
    });
  } catch (err) {
    console.warn('[Challenge] Recent matches error:', err.message);
    container.innerHTML = '';
  }
}

function _formatMatchDate(timestamp) {
  const ms = timestamp?.toMillis?.() || timestamp;
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ============================================
// MATCH DETAIL MODAL
// ============================================

function _showMatchDetail(match, user) {
  const isCreator = match.creatorId === user.uid;
  const myName    = isCreator ? (match.creatorName  || 'You')      : (match.opponentName || 'You');
  const oppName   = isCreator ? (match.opponentName || 'Opponent') : (match.creatorName   || 'Opponent');
  const myScore   = isCreator ? match.creatorScore  : match.opponentScore;
  const oppScore  = isCreator ? match.opponentScore : match.creatorScore;
  const myPct     = isCreator ? match.creatorPct    : match.opponentPct;
  const oppPct    = isCreator ? match.opponentPct   : match.creatorPct;
  const total     = match.questions?.length || 15;
  const isDraw    = match.winnerId === 'draw';
  const iWon      = match.winnerId === user.uid;
  const dateText  = _formatMatchDate(match.completedAt || match.createdAt);
  const myAnswers = isCreator ? match.creatorAnswers : match.opponentAnswers;

  const breakdown = (match.questions || []).map((q, i) => {
    const correct = myAnswers?.[i] === q.correctAnswer;
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid var(--border,#eee)">
      <span style="font-size:16px">${correct ? '✅' : '❌'}</span>
      <span style="font-size:13px;flex:1">${escapeHTML(q.question)}</span>
    </div>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--bg-primary,#fff);border-radius:20px 20px 0 0;max-height:85vh;overflow-y:auto;width:100%;max-width:520px;padding:24px 20px 32px">
      <div style="width:36px;height:4px;background:#ddd;border-radius:2px;margin:0 auto 16px"></div>
      <h2 style="font-size:18px;font-weight:800;margin-bottom:4px">${escapeHTML(myName)} vs ${escapeHTML(oppName)}</h2>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${dateText}${match.code ? ' · Code: ' + escapeHTML(match.code) : ''}</p>
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="flex:1;text-align:center;padding:12px;border-radius:12px;background:${!isDraw && iWon ? '#dcfce7' : '#f3f4f6'}">
          <div style="font-size:12px;color:var(--text-muted)">${escapeHTML(myName)}</div>
          <div style="font-size:22px;font-weight:900">${myPct ?? '—'}%</div>
          <div style="font-size:12px;color:var(--text-muted)">${myScore ?? 0}/${total}</div>
        </div>
        <div style="flex:1;text-align:center;padding:12px;border-radius:12px;background:${!isDraw && !iWon ? '#dcfce7' : '#f3f4f6'}">
          <div style="font-size:12px;color:var(--text-muted)">${escapeHTML(oppName)}</div>
          <div style="font-size:22px;font-weight:900">${oppPct ?? '—'}%</div>
          <div style="font-size:12px;color:var(--text-muted)">${oppScore ?? 0}/${total}</div>
        </div>
      </div>
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">Question Breakdown</div>
      <div style="max-height:220px;overflow-y:auto;margin-bottom:20px">${breakdown || '<p style="font-size:13px;color:var(--text-muted)">No breakdown available.</p>'}</div>
      <div style="display:flex;gap:10px">
        <button id="match-detail-share" style="flex:1;padding:12px;border:none;border-radius:12px;background:var(--accent-primary,#4f46e5);color:#fff;font-weight:700;cursor:pointer">Share Result</button>
        <button id="match-detail-close" style="flex:1;padding:12px;border:1px solid var(--border,#ddd);border-radius:12px;background:none;font-weight:700;cursor:pointer">Close</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#match-detail-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#match-detail-share').addEventListener('click', () => {
    const text = `⚔️ Bible Quiz Battle Result\n${myName}: ${myPct ?? 0}% (${myScore ?? 0}/${total})\n${oppName}: ${oppPct ?? 0}% (${oppScore ?? 0}/${total})\n${dateText}`;
    if (navigator.share) { navigator.share({ title: 'Battle Result', text }).catch(() => {}); }
    else { navigator.clipboard?.writeText(text); showToast('Result copied to clipboard! 📋', 'success'); }
  });
}

// ============================================
// PUBLIC: Called by app.js / battle.page.js
// when battle is complete
// ============================================

export async function handleBattleComplete(match) {
  _renderResultPanel(match);
  _showPanel('challenge-result-panel');
}

// ============================================
// WAITING: Called when we submitted but
// opponent hasn't finished yet
// ============================================

export function handleBattleWaiting(matchId, result) {
  _currentMatchId = matchId;

  const statusEl = el('waiting-status-text');
  if (statusEl) statusEl.textContent = `You scored ${result.percentage}%! Waiting for opponent to finish…`;

  _showPanel('challenge-waiting-panel');

  // Resume listener for opponent completion
  _subscribeToMatch(matchId, false, []);
}

// ============================================
// CLEANUP
// ============================================

function _cleanup() {
  if (_unsubscribeMatch) { _unsubscribeMatch(); _unsubscribeMatch = null; }
  if (_countdownTimer)   { clearInterval(_countdownTimer); _countdownTimer = null; }
  _currentMatchId = null;
}

export function destroyChallengePage() {
  _cleanup();
}

// ============================================
// UTILITY
// ============================================

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default {
  initChallengePage,
  handleBattleComplete,
  handleBattleWaiting,
  destroyChallengePage
};
