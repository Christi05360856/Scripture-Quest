// ============================================
// SCRIPTUREQUEST ADMIN — admin-users.js
// User management section.
// Non-module script — relies on window.db/fb/helpers
// from admin-core.js, which must load first.
// Extracted verbatim — no logic changes.
// ============================================

(function () {
  const { collection, doc, getDocs, updateDoc, query, orderBy } = window.fb;
  const db = window.db;

  window.loadUsers = async function() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Loading…</td></tr>';
    try {
      const [usersSnap, statsSnap] = await Promise.all([
        getDocs(query(collection(db,'users'), orderBy('createdAt','desc'))),
        getDocs(collection(db,'userStats'))
      ]);
      const statsMap={};
      statsSnap.forEach(d=>statsMap[d.id]=d.data());
      window._allUsers=[];
      usersSnap.forEach(d=>window._allUsers.push({id:d.id,...d.data(),stats:statsMap[d.id]||{}}));
      renderUsers(window._allUsers);
    } catch(e){ toast('Failed to load users: '+e.message,'error'); }
  };

  function renderUsers(list) {
    const tbody = document.getElementById('users-tbody');
    if(!list.length){ tbody.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="fas fa-users"></i>No users found</div></td></tr>'; return; }
    tbody.innerHTML = list.map(u=>`
      <tr>
        <td style="color:var(--text);font-weight:700">${esc(u.displayName||'—')}</td>
        <td style="color:var(--muted)">${esc(u.email||'—')}</td>
        <td>${u.stats?.level||1}</td>
        <td style="color:var(--warning)">${(u.stats?.totalXp||0).toLocaleString()}</td>
        <td>${u.stats?.currentStreak||0}🔥</td>
        <td>${u.stats?.quizzesTaken||0}</td>
        <td>${u.isBanned
          ? '<span class="badge badge-danger">Suspended</span>'
          : u.profileComplete
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-warning">Incomplete</span>'}</td>
        <td>
          ${!u.isBanned
            ? `<button class="btn btn-danger btn-sm" onclick="toggleBan('${u.id}',true)">Suspend</button>`
            : `<button class="btn btn-success btn-sm" onclick="toggleBan('${u.id}',false)">Restore</button>`
          }
        </td>
      </tr>`).join('');
  }

  window.filterUsers = function() {
    const q = document.getElementById('users-search').value.toLowerCase();
    const f = document.getElementById('users-filter').value;
    renderUsers(window._allUsers.filter(u=>{
      const match = !q || (u.displayName||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q);
      const filter = f==='all' || (f==='banned'&&u.isBanned) || (f==='active'&&!u.isBanned&&u.profileComplete)
                               || (f==='incomplete'&&!u.profileComplete&&!u.isBanned);
      return match && filter;
    }));
  };

  window.toggleBan = function(uid, ban) {
    showConfirm(ban?'🚫':'✅', ban?'Suspend User':'Restore User',
      ban?'This user will not be able to play or earn XP.':'This user will regain full access.', async ()=>{
      try {
        await updateDoc(doc(db,'users',uid),{ isBanned:ban });
        toast(ban?'User suspended':'User restored', ban?'warning':'success');
        window.loadUsers();
      } catch(e){ toast('Failed: '+e.message,'error'); }
    });
  };
})();

