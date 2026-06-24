// ===========================================
// SCRIPTUREQUEST ADMIN — admin-overview.js
// Overview dashboard section: platform stats,
// top 3 weekly winners, recent quiz attempts.
//
// Non-module script — relies on db/auth/helpers
// already attached to window by admin-core.js,
// which must load before this file.
//
// Extracted verbatim from the original inline
// script — no logic changes in this split pass.
// ============================================

(function () {
  const { collection, getDocs, query, where, orderBy, limit, Timestamp } = window.fb;
  const db = window.db;

  window.loadOverview = async function() {
    try {
      const usersSnap = await getDocs(collection(db,'users'));
      document.getElementById('ov-total-users').textContent = usersSnap.size;

      const now   = new Date();
      const start = Timestamp.fromDate(new Date(now.getFullYear(),now.getMonth(),now.getDate()));
      const end   = Timestamp.fromDate(new Date(start.toMillis()+86400000));
      const attSnap = await getDocs(query(collection(db,'quizAttempts'),
        where('timestamp','>=',start), where('timestamp','<',end)));
      document.getElementById('ov-attempts-today').textContent = attSnap.size;

      const rewSnap = await getDocs(query(collection(db,'rewardClaims'),where('status','==','pending')));
      document.getElementById('ov-pending-rewards').textContent = rewSnap.size;

      const qSnap = await getDocs(query(collection(db,'questions'),where('isActive','==',true)));
      document.getElementById('ov-question-count').textContent = qSnap.size;

      const susSnap = await getDocs(query(collection(db,'adminLogs'),
        where('action','==','suspicious_activity'), where('timestamp','>=',start)));
      document.getElementById('ov-suspicious').textContent = susSnap.size;

      loadTopWinners();
      window.loadRecentAttempts();
    } catch(e) { toast('Failed to load overview: '+e.message, 'error'); }
  };

  async function loadTopWinners() {
    const weekId = getWeekId();
    try {
      const snap = await getDocs(query(
        collection(db,'leaderboardWeekly',weekId,'entries'),
        orderBy('points','desc'), limit(3)
      ));
      const entries=[];
      snap.forEach(d=>entries.push({uid:d.id,...d.data()}));

      const medals=['gold','silver','bronze'];
      const prizes=['🥇 2GB Data','🥈 1GB Data','🥉 500MB'];
      const labels=['🥇','🥈','🥉'];

      if (!entries.length) {
        document.getElementById('ov-winners').innerHTML=
          '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-trophy"></i>No entries yet this week</div>';
        return;
      }

      document.getElementById('ov-winners').innerHTML = entries.map((e,i)=>`
        <div class="winner-card ${medals[i]}">
          <div class="winner-medal">${labels[i]}</div>
          <div class="winner-name">${esc(e.displayName||'Anonymous')}</div>
          <div class="winner-pts">${(e.points||0).toLocaleString()} pts</div>
          <div class="winner-detail"><i class="fas fa-star"></i> Level ${e.level||1}</div>
          <div class="winner-detail"><i class="fas fa-fire"></i> ${e.streak||0} day streak</div>
          <span class="winner-reward-badge ${medals[i]}">${prizes[i]}</span>
        </div>`).join('');
    } catch(e) {
      document.getElementById('ov-winners').innerHTML=
        `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-circle"></i>${e.message}</div>`;
    }
  }

  window.loadRecentAttempts = async function() {
    const tbody = document.getElementById('ov-attempts-tbody');
    tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Loading…</td></tr>';
    try {
      const snap = await getDocs(query(collection(db,'quizAttempts'),
        orderBy('timestamp','desc'), limit(12)));
      if(snap.empty){ tbody.innerHTML='<tr><td colspan="5" class="empty-state">No attempts yet</td></tr>'; return; }
      tbody.innerHTML = '';
      snap.forEach(d=>{
        const a=d.data();
        const pct=a.percentage||0;
        const color= pct>=80?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';
        tbody.innerHTML+=`<tr>
          <td style="color:var(--text)">${esc(a.userId?.slice(0,8)+'…')}</td>
          <td>${a.score||0}/${a.totalQuestions||15}</td>
          <td style="color:${color};font-weight:800">${pct}%</td>
          <td style="color:var(--warning)">+${a.xpEarned||0}</td>
          <td>${fmtDate(a.timestamp)}</td>
        </tr>`;
      });
    } catch(e){ tbody.innerHTML=`<tr><td colspan="5" style="color:var(--danger);padding:16px">${e.message}</td></tr>`; }
  };
})();
            
