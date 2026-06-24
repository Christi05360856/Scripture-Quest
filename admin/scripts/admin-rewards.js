// ============================================
// SCRIPTUREQUEST ADMIN — admin-rewards.js
// Reward claim management section.
// Non-module script — relies on window.db/fb/helpers
// from admin-core.js, which must load first.
// Extracted verbatim — no logic changes.
// ============================================

(function () {
  const { collection, doc, getDocs, updateDoc, query, orderBy, serverTimestamp } = window.fb;
  const db = window.db;

  window.loadRewards = async function() {
    const tbody = document.getElementById('rewards-tbody');
    tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Loading…</td></tr>';
    try {
      const snap = await getDocs(query(collection(db,'rewardClaims'),orderBy('createdAt','desc')));
      window._allRewards=[];
      snap.forEach(d=>window._allRewards.push({id:d.id,...d.data()}));
      renderRewards(window._allRewards);
    } catch(e){ toast('Failed to load rewards: '+e.message,'error'); }
  };

  function renderRewards(list) {
    const tbody = document.getElementById('rewards-tbody');
    if(!list.length){ tbody.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="fas fa-gift"></i>No reward claims yet</div></td></tr>'; return; }

    const statusBadge = s => ({
      pending:'<span class="badge badge-warning">Pending</span>',
      approved:'<span class="badge badge-info">Approved</span>',
      delivered:'<span class="badge badge-success">Delivered</span>',
      rejected:'<span class="badge badge-danger">Rejected</span>'
    })[s]||`<span class="badge badge-muted">${esc(s)}</span>`;

    tbody.innerHTML = list.map(r=>`
      <tr>
        <td style="color:var(--text);font-weight:700">${esc(r.displayName||'—')}</td>
        <td>${esc(r.phoneNumber||'—')}</td>
        <td>${esc(r.networkProvider||'—')}</td>
        <td style="color:var(--warning);font-weight:800">${esc(r.rewardType||'—')}</td>
        <td>${esc(r.type||'—')}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${fmtDate(r.createdAt)}</td>
        <td>
          <div class="reward-actions">
            ${r.status==='pending' ? `
              <button class="btn btn-success btn-sm" onclick="updateRewardStatus('${r.id}','approved')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="updateRewardStatus('${r.id}','rejected')">Reject</button>
            ` : ''}
            ${r.status==='approved' ? `
              <button class="btn btn-primary btn-sm" onclick="updateRewardStatus('${r.id}','delivered')">Mark Delivered</button>
            ` : ''}
          </div>
        </td>
      </tr>`).join('');
  }

  window.filterRewards = function() {
    const q = document.getElementById('rewards-search').value.toLowerCase();
    const f = document.getElementById('rewards-filter').value;
    renderRewards(window._allRewards.filter(r=>{
      const match = !q || (r.displayName||'').toLowerCase().includes(q) || (r.phoneNumber||'').includes(q);
      const status = f==='all' || r.status===f;
      return match && status;
    }));
  };

  window.updateRewardStatus = async function(id, status) {
    const labels = {approved:'Approve',rejected:'Reject',delivered:'Mark Delivered'};
    showConfirm('🎁',`${labels[status]} Reward`,`Are you sure you want to mark this claim as "${status}"?`, async ()=>{
      try {
        await updateDoc(doc(db,'rewardClaims',id),{
          status, processedBy:window._currentAdmin?.uid||'admin',
          processedAt:serverTimestamp()
        });
        toast(`Claim marked as ${status}`, 'success');
        window.loadRewards();
      } catch(e){ toast('Failed: '+e.message,'error'); }
    });
  };
})();

