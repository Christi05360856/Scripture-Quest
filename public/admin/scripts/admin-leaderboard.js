// ============================================
// admin-leaderboard.js  — Bible Battle Admin
// ============================================
import { db, getWeekId, getWeekNum, esc, toast, showConfirm }
  from './admin-core.js';
import { collection, doc, query, orderBy, limit, getDocs, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function loadLeaderboard() {
  const tbody = document.getElementById('lb-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--mu);padding:24px">Loading…</td></tr>';
  const wid = getWeekId();
  const wl  = document.getElementById('lb-week-label');
  if (wl) wl.textContent = `${getWeekNum()} (${wid})`;
  try {
    const snap = await getDocs(query(
      collection(db,'leaderboardWeekly', wid, 'entries'),
      orderBy('points','desc'), limit(50)
    ));
    const entries = [];
    snap.forEach(d => entries.push({ uid: d.id, ...d.data() }));
    const cnt = document.getElementById('lb-entry-count');
    if (cnt) cnt.textContent = `${entries.length} competitors this week`;
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="es"><i class="fas fa-trophy"></i>No entries yet this week</div></td></tr>';
      return;
    }
    const medals = ['🥇','🥈','🥉'];
    tbody.innerHTML = entries.map((e, i) => `
      <tr>
        <td style="font-weight:900;font-size:15px">${medals[i] || (i + 1)}</td>
        <td style="color:var(--t);font-weight:700">${esc(e.displayName||'Anonymous')}</td>
        <td style="color:var(--prh);font-weight:900;font-variant-numeric:tabular-nums">${(e.points||0).toLocaleString()}</td>
        <td>Lv.${e.level || 1}</td>
        <td>${e.streak || 0} 🔥</td>
        <td>${e.quizzesTaken || 0}</td>
        <td>
          <button class="btn btn-err btn-xs"
            onclick="window._adminLB.disqualify('${e.uid}','${esc(e.displayName||'User')}')">
            <i class="fas fa-ban"></i> DQ
          </button>
        </td>
      </tr>`).join('');
  } catch(e) { toast('Failed: ' + e.message, 'err'); }
}

export function disqualify(uid, name) {
  showConfirm('🚫','Disqualify User', `Remove ${name} from this week's leaderboard?`, async () => {
    try {
      await deleteDoc(doc(db,'leaderboardWeekly', getWeekId(), 'entries', uid));
      toast(`${name} removed from leaderboard`, 'warn');
      loadLeaderboard();
    } catch(e) { toast('Failed: ' + e.message, 'err'); }
  });
}

window._adminLB = { disqualify };
