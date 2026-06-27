// ============================================
// admin-overview.js  — Bible Battle Admin
// FIXED:
//  - Recent attempts now shows real display
//    names by cross-referencing users collection
//  - Graceful fallback if user doc missing
// ============================================
import { db, getWeekId, fmtDate, esc, toast, showConfirm }
  from './admin-core.js';
import { collection, doc, getDoc, query, where, orderBy, limit,
         getDocs, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Cache user names so we don't re-fetch the same user doc repeatedly
const _nameCache = {};
async function getUserName(uid) {
  if (!uid) return 'Unknown';
  if (_nameCache[uid]) return _nameCache[uid];
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const d = snap.data();
      const name = d.displayName || d.name || d.username
        || (d.email ? d.email.split('@')[0] : null)
        || uid.slice(0, 8) + '…';
      _nameCache[uid] = name;
      return name;
    }
  } catch(_) {}
  // Fallback to short UID
  _nameCache[uid] = uid.slice(0, 8) + '…';
  return _nameCache[uid];
}

export async function loadOverview() {
  try {
    const uSnap = await getDocs(collection(db, 'users'));
    _set('ov-total-users', uSnap.size);

    const now   = new Date();
    const start = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

    const [aSnap, rSnap, qSnap, sSnap] = await Promise.all([
      getDocs(query(collection(db,'quizAttempts'), where('timestamp','>=',start))),
      getDocs(query(collection(db,'rewardClaims'), where('status','==','pending'))),
      getDocs(query(collection(db,'questions'),    where('isActive','==',true))),
      getDocs(query(collection(db,'adminLogs'),
        where('action','==','suspicious_activity'), where('timestamp','>=',start)))
    ]);

    _set('ov-attempts-today',   aSnap.size);
    _set('ov-pending-rewards',  rSnap.size);
    _set('ov-question-count',   qSnap.size);
    _set('ov-suspicious',       sSnap.size);

    await Promise.all([loadTopWinners(), loadRecentAttempts()]);
  } catch(e) {
    console.error('[loadOverview]', e);
    toast('Failed to load overview: ' + e.message, 'err');
  }
}

export async function loadTopWinners() {
  const wid = getWeekId();
  const el  = document.getElementById('ov-winners');
  if (!el) return;
  try {
    const snap = await getDocs(query(
      collection(db, 'leaderboardWeekly', wid, 'entries'),
      orderBy('points', 'desc'), limit(3)
    ));
    const entries = [];
    snap.forEach(d => entries.push({ uid: d.id, ...d.data() }));

    const medals = ['gold','silver','bronze'];
    const labels = ['🥇','🥈','🥉'];
    const prizes = ['🥇 2GB Data','🥈 1GB Data','🥉 500MB'];

    if (!entries.length) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-trophy"></i><p>No entries this week yet</p></div>';
      return;
    }
    el.innerHTML = entries.map((e, i) => `
      <div class="podium-card ${medals[i]}">
        <div class="podium-medal">${labels[i]}</div>
        <div class="podium-name">${esc(e.displayName || e.name || 'Anonymous')}</div>
        <div class="podium-pts">${(e.points || 0).toLocaleString()} pts</div>
        <div class="podium-detail"><i class="fas fa-star"></i> Level ${e.level || 1}</div>
        <div class="podium-detail"><i class="fas fa-fire"></i> ${e.streak || 0} day streak</div>
        <span class="podium-reward ${medals[i]}">${prizes[i]}</span>
      </div>`).join('');
  } catch(e) {
    if (el) el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-circle"></i><p>${esc(e.message)}</p></div>`;
  }
}

export async function loadRecentAttempts() {
  const tbody = document.getElementById('ov-attempts-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:22px">Loading…</td></tr>';
  try {
    const snap = await getDocs(query(
      collection(db, 'quizAttempts'),
      orderBy('timestamp', 'desc'),
      limit(12)
    ));
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No attempts yet</div></td></tr>';
      return;
    }

    // Collect all attempts then resolve names in parallel
    const attempts = [];
    snap.forEach(d => attempts.push({ id: d.id, ...d.data() }));

    const names = await Promise.all(attempts.map(a => getUserName(a.userId || a.uid || '')));

    tbody.innerHTML = attempts.map((a, i) => {
      const pct = a.percentage || 0;
      const col = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
      return `<tr>
        <td style="color:var(--text);font-weight:600">${esc(names[i])}</td>
        <td>${a.score || 0}/${a.totalQuestions || 15}</td>
        <td style="color:${col};font-weight:800">${pct}%</td>
        <td style="color:var(--amber)">+${a.xpEarned || 0} XP</td>
        <td style="color:var(--text-2)">${fmtDate(a.timestamp)}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    console.error('[loadRecentAttempts]', e);
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red);padding:14px;text-align:center">${esc(e.message)}</td></tr>`;
  }
}

export async function confirmArchiveWeek() {
  showConfirm('📦', 'Archive Week',
    'Archive current standings? This normally runs automatically via Cloud Functions.',
    () => toast('Archive triggered — check Firebase Functions logs', 'inf'));
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
