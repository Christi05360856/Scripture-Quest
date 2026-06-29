// ============================================
// admin-rewards.js  — Bible Battle Admin
// CORRECTED — matches HTML IDs and CSS vars
// ADDED: Rewards Configuration Panel (toggle on/off)
// ============================================
import { db, currentAdmin, fmtDate, esc, toast, showConfirm }
  from './admin-core.js';
import { collection, doc, query, orderBy, getDocs, getDoc, updateDoc, setDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let _rewards = [];
let _config = { enabled: false, mode: 'badges_only', currentPrize: null, eventName: null };

// ── CONFIG PANEL ──────────────────────────────

export async function loadRewardsConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'rewards'));
    if (snap.exists()) {
      _config = { ..._config, ...snap.data() };
    } else {
      // Auto-create with defaults if missing
      await setDoc(doc(db, 'config', 'rewards'), {
        enabled: false,
        mode: 'badges_only',
        currentPrize: null,
        eventName: null,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin?.uid || 'system'
      });
    }
    renderConfigPanel();
  } catch (e) {
    console.warn('[Rewards Config] Load failed:', e.message);
    renderConfigPanel();
  }
}

function renderConfigPanel() {
  const container = document.getElementById('rewards-config-panel');
  if (!container) return;

  const isEnabled = _config.enabled === true;
  const statusBadge = isEnabled
    ? '<span class="badge badge-green" style="font-size:12px">🟢 REWARDS ACTIVE</span>'
    : '<span class="badge badge-muted" style="font-size:12px">⚫ REWARDS DISABLED</span>';

  const statusAlert = isEnabled
    ? `<div class="alert alert-info" style="margin-bottom:16px"><i class="fas fa-gift"></i> Cash prizes are currently <strong>enabled</strong>. Users can claim monetary rewards. Leaderboard prize badges are visible.</div>`
    : `<div class="alert alert-warning" style="margin-bottom:16px"><i class="fas fa-info-circle"></i> Cash prizes are currently <strong>disabled</strong>. Only badges, XP, and streaks are active. No monetary payouts will be issued.</div>`;

  container.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div>
          <div class="card-title">⚙️ Rewards Configuration</div>
          <div class="card-sub">Toggle cash prizes and set event details</div>
        </div>
        <div>${statusBadge}</div>
      </div>
      <div class="card-body">
        ${statusAlert}
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="cfg-rewards-enabled">
              <option value="false" ${!isEnabled ? 'selected' : ''}>Disabled — Badges Only</option>
              <option value="true"  ${isEnabled ? 'selected' : ''}>Enabled — Cash Prizes Active</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Mode</label>
            <select class="form-control" id="cfg-rewards-mode">
              <option value="badges_only" ${_config.mode === 'badges_only' ? 'selected' : ''}>Badges Only</option>
              <option value="cash_prizes" ${_config.mode === 'cash_prizes' ? 'selected' : ''}>Cash Prizes</option>
              <option value="special_event" ${_config.mode === 'special_event' ? 'selected' : ''}>Special Event</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Current Prize (e.g. ₦5,000)</label>
            <input class="form-control" id="cfg-rewards-prize" type="text" placeholder="e.g. ₦5,000" value="${esc(_config.currentPrize || '')}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Event Name</label>
            <input class="form-control" id="cfg-rewards-event" type="text" placeholder="e.g. Summer Bible Challenge 2026" value="${esc(_config.eventName || '')}"/>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
          <button class="btn btn-ghost btn-sm" id="cfg-rewards-reset-btn"><i class="fas fa-undo"></i> Reset to Defaults</button>
          <button class="btn btn-primary" id="cfg-rewards-save-btn"><i class="fas fa-save"></i> Save Configuration</button>
        </div>
        <div id="cfg-rewards-error" style="color:var(--red);font-size:12px;font-weight:600;min-height:16px;margin-top:8px"></div>
      </div>
    </div>
  `;

  // Wire buttons
  const saveBtn = document.getElementById('cfg-rewards-save-btn');
  const resetBtn = document.getElementById('cfg-rewards-reset-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveRewardsConfig);
  if (resetBtn) resetBtn.addEventListener('click', resetRewardsConfig);
}

export async function saveRewardsConfig() {
  const enabledEl = document.getElementById('cfg-rewards-enabled');
  const modeEl = document.getElementById('cfg-rewards-mode');
  const prizeEl = document.getElementById('cfg-rewards-prize');
  const eventEl = document.getElementById('cfg-rewards-event');
  const errorEl = document.getElementById('cfg-rewards-error');
  const btn = document.getElementById('cfg-rewards-save-btn');

  if (!enabledEl || !modeEl) return;

  const newConfig = {
    enabled: enabledEl.value === 'true',
    mode: modeEl.value,
    currentPrize: prizeEl?.value?.trim() || null,
    eventName: eventEl?.value?.trim() || null,
    updatedAt: serverTimestamp(),
    updatedBy: currentAdmin?.uid || 'admin'
  };

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  if (errorEl) errorEl.textContent = '';

  try {
    await setDoc(doc(db, 'config', 'rewards'), newConfig, { merge: true });
    _config = { ..._config, ...newConfig };
    toast(`Rewards ${newConfig.enabled ? 'enabled' : 'disabled'} successfully`, 'ok');
    renderConfigPanel();
  } catch (e) {
    if (errorEl) errorEl.textContent = 'Failed to save: ' + e.message;
    toast('Failed to save config: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save Configuration';
  }
}

export async function resetRewardsConfig() {
  showConfirm('🔄', 'Reset to Defaults?', 'This will disable cash prizes and clear event details. Users will only see badges and XP.', async () => {
    try {
      await setDoc(doc(db, 'config', 'rewards'), {
        enabled: false,
        mode: 'badges_only',
        currentPrize: null,
        eventName: null,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin?.uid || 'admin'
      }, { merge: true });
      _config = { enabled: false, mode: 'badges_only', currentPrize: null, eventName: null };
      toast('Rewards reset to defaults (disabled)', 'ok');
      renderConfigPanel();
    } catch (e) {
      toast('Reset failed: ' + e.message, 'err');
    }
  });
}

// ── CLAIMS TABLE (existing) ───────────────────

export async function loadRewards() {
  // Load config first, then claims
  await loadRewardsConfig();

  const tbody = document.getElementById('rewards-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:24px">Loading…</td></tr>';
  try {
    const snap = await getDocs(query(collection(db,'rewardClaims'), orderBy('createdAt','desc')));
    _rewards = [];
    snap.forEach(d => _rewards.push({ id: d.id, ...d.data() }));
    renderRewards(_rewards);
  } catch(e) { toast('Failed to load rewards: ' + e.message, 'err'); }
}

export function filterRewards() {
  const q = document.getElementById('rewards-search').value.toLowerCase();
  const f = document.getElementById('rewards-filter').value;
  renderRewards(_rewards.filter(r => {
    const m = !q || (r.displayName||'').toLowerCase().includes(q) || (r.phoneNumber||'').includes(q);
    return m && (f === 'all' || r.status === f);
  }));
}

function renderRewards(list) {
  const tbody = document.getElementById('rewards-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-gift"></i>No reward claims yet</div></td></tr>';
    return;
  }
  const sb = s => ({
    pending:   '<span class="badge badge-amber">Pending</span>',
    approved:  '<span class="badge badge-blue">Approved</span>',
    delivered: '<span class="badge badge-green">Delivered</span>',
    rejected:  '<span class="badge badge-red">Rejected</span>'
  }[s] || `<span class="badge badge-muted">${esc(s)}</span>`);

  tbody.innerHTML = list.map(r => `
    <tr>
      <td style="color:var(--text);font-weight:700">${esc(r.displayName||'—')}</td>
      <td class="td-mono">${esc(r.phoneNumber||'—')}</td>
      <td>${esc(r.networkProvider||'—')}</td>
      <td style="color:var(--amber);font-weight:800">${esc(r.rewardType||'—')}</td>
      <td>${esc(r.type||'—')}</td>
      <td>${sb(r.status)}</td>
      <td style="color:var(--text-3)">${fmtDate(r.createdAt)}</td>
      <td>
        <div class="row-actions">
          ${r.status==='pending'
            ? `<button class="btn btn-success btn-sm"  onclick="window._adminRewards.updateReward('${r.id}','approved')">Approve</button>
               <button class="btn btn-danger btn-sm" onclick="window._adminRewards.updateReward('${r.id}','rejected')">Reject</button>`
            : ''}
          ${r.status==='approved'
            ? `<button class="btn btn-primary btn-sm"  onclick="window._adminRewards.updateReward('${r.id}','delivered')">Delivered</button>`
            : ''}
        </div>
      </td>
    </tr>`).join('');
}

export async function updateReward(id, status) {
  const L = { approved:'Approve', rejected:'Reject', delivered:'Mark Delivered' };
  showConfirm('🎁', `${L[status]} Reward`, `Mark this claim as "${status}"?`, async () => {
    try {
      await updateDoc(doc(db,'rewardClaims',id), {
        status,
        processedBy: currentAdmin?.uid || 'admin',
        processedAt: serverTimestamp()
      });
      toast(`Claim marked as ${status}`, 'ok');
      loadRewards();
    } catch(e) { toast('Failed: ' + e.message, 'err'); }
  });
}

window._adminRewards = { updateReward };
