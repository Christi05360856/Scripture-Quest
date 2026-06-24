// ============================================
// SCRIPTUREQUEST ADMIN — admin-leaderboard.js
// Leaderboard moderation section.
// Non-module script — relies on window.db/fb/helpers
// from admin-core.js, which must load first.
// Extracted verbatim — no logic changes.
// ===========================================

(function () {
  const { collection, doc, getDocs, deleteDoc, query, orderBy, limit } = window.fb;
  const db = window.db;

  window.loadLeaderboard = async function() {
    const tbody = document.getElementById('lb-tbody');
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Loading…</td></tr>';
    const weekId = getWeekId();
    document.getElementById('lb-week-label').textContent=`${getWeekNum()} (${weekId})`;
    try {
      const snap = await getDocs(query(
        collection(db,'leaderboardWeekly',weekId,'entries'),
        orderBy('points','desc'), limit(50)
      ));
      const entries=[];
      snap.forEach(d=>entries.push({uid:d.id,...d.data()}));
      document.getElementById('lb-entry-count').textContent=`${entries.length} competitors this week`;
      if(!entries.length){ tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><i class="fas fa-trophy"></i>No entries yet</div></td></tr>'; return; }
      const medals=['🥇','🥈','🥉'];
      tbody.innerHTML = entries.map((e,i)=>`
        <tr>
          <td style="font-weight:900;color:var(--text)">${medals[i]||('#'+(i+1))}</td>
          <td style="color:var(--text);font-weight:700">${esc(e.displayName||'Anonymous')}</td>
          <td style="color:var(--primary-h);font-weight:900">${(e.points||0).toLocaleString()}</td>
          <td>Lv.${e.level||1}</td>
          <td>${e.streak||0}🔥</td>
          <td>${e.quizzesTaken||0}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="disqualifyUser('${e.uid}','${esc(e.displayName||'User')}')">
              <i class="fas fa-ban"></i> DQ
            </button>
          </td>
        </tr>`).join('');
    } catch(e){ toast('Failed: '+e.message,'error'); }
  };

  window.disqualifyUser = function(uid, name) {
    showConfirm('🚫','Disqualify User',`Remove ${name} from this week's leaderboard? This cannot be undone.`, async ()=>{
      try {
        const weekId = getWeekId();
        await deleteDoc(doc(db,'leaderboardWeekly',weekId,'entries',uid));
        toast(`${name} removed from leaderboard`,'warning');
        window.loadLeaderboard();
      } catch(e){ toast('Failed: '+e.message,'error'); }
    });
  };

  window.confirmArchiveWeek = function() {
    showConfirm('📦','Archive Week Manually',
      'This will archive current standings. Normally this runs automatically. Continue?', async ()=>{
      toast('Archive triggered — check Firebase Functions logs','info');
    });
  };
})();
                
