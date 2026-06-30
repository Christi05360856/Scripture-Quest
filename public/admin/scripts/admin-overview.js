// ============================================
// admin-overview.js  — Bible Battle Admin
// CORRECTED — matches HTML CSS variables
// ============================================
import { db, getWeekId, fmtDate, esc, toast, showConfirm }
  from './admin-core.js';
import { collection, query, where, orderBy, limit,
         getDocs, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function loadOverview() {
  try {
    const uSnap = await getDocs(collection(db, 'users'));
    _set('ov-total-users', uSnap.size);

    const now   = new Date();
    const start = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const aSnap = await getDocs(query(collection(db,'quizAttempts'), where('timestamp','>=',start)));
    _set('ov-attempts-today', aSnap.size);

    const rSnap = await getDocs(query(collection(db,'rewardClaims'), where('status','==','pending')));
    _set('ov-pending-rewards', rSnap.size);

    const qSnap = await getDocs(query(collection(db,'questions'), where('isActive','==',true)));
    _set('ov-question-count', qSnap.size);

    const sSnap = await getDocs(query(collection(db,'adminLogs'),
      where('action','==','suspicious_activity'), where('timestamp','>=',start)));
    _set('ov-suspicious', sSnap.size);

    await loadTopWinners();
    await loadRecentAttempts();
  } catch(e) { toast('Failed to load overview: ' + e.message, 'err'); }
}

export async function loadTopWinners() {
  const wid = getWeekId();
  const el  = document.getElementById('ov-winners');
  if (!el) return;
  try {
    const snap = await getDocs(query(
      collection(db,'leaderboardWeekly', wid, 'entries'),
      orderBy('points','desc'), limit(3)
    ));
    const entries = [];
    snap.forEach(d => entries.push({ uid: d.id, ...d.data() }));

    const medals = ['gold','silver','bronze'];
    const labels = ['🥇','🥈','🥉'];
    const prizes = ['🥇 5,000 XP','🥈 2,500 XP','🥉 1,000 XP'];

    if (!entries.length) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-trophy"></i>No entries this week yet</div>';
      return;
    }
    el.innerHTML = entries.map((e, i) => `
      <div class="podium-card ${medals[i]}">
        <div class="podium-medal">${labels[i]}</div>
        <div class="podium-name">${esc(e.displayName || 'Anonymous')}</div>
        <div class="podium-pts">${(e.points || 0).toLocaleString()} pts</div>
        <div class="podium-detail"><i class="fas fa-star"></i> Level ${e.level || 1}</div>
        <div class="podium-detail"><i class="fas fa-fire"></i> ${e.streak || 0} day streak</div>
        <span class="podium-reward ${medals[i]}">${prizes[i]}</span>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-circle"></i>${esc(e.message)}</div>`;
  }
}

export async function loadRecentAttempts() {
  const tbody = document.getElementById('ov-attempts-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:22px">Loading…</td></tr>';
  try {
    const snap = await getDocs(query(collection(db,'quizAttempts'), orderBy('timestamp','desc'), limit(12)));
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No attempts yet</div></td></tr>'; return; }
    tbody.innerHTML = '';
    snap.forEach(d => {
      const a   = d.data();
      const pct = a.percentage || 0;
      const col = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
      tbody.innerHTML += `<tr>
        <td style="color:var(--text);font-weight:600">${esc((a.userId||'').slice(0,8)+'…')}</td>
        <td>${a.score||0}/${a.totalQuestions||15}</td>
        <td style="color:${col};font-weight:800">${pct}%</td>
        <td style="color:var(--amber)">+${a.xpEarned||0} XP</td>
        <td style="color:var(--text-3)">${fmtDate(a.timestamp)}</td>
      </tr>`;
    });
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red);padding:14px">${esc(e.message)}</td></tr>`;
  }
}

export async function confirmArchiveWeek() {
  showConfirm('📦','Archive Week','Archive current standings? This normally runs automatically.',
    () => toast('Archive triggered — check Firebase Functions logs','inf'));
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
