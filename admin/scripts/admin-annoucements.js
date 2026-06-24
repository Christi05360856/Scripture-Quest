// ============================================
// SCRIPTUREQUEST ADMIN — admin-announcements.js
// Platform announcements section.
// Non-module script — relies on window.db/fb/helpers
// from admin-core.js, which must load first.
// Extracted verbatim — no logic changes.
// ===========================================

(function () {
  const { collection, doc, getDocs, addDoc, updateDoc,
          query, orderBy, serverTimestamp, Timestamp } = window.fb;
  const db = window.db;

  window.loadAnnouncements = async function() {
    const tbody = document.getElementById('announce-tbody');
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Loading…</td></tr>';
    try {
      const snap = await getDocs(query(collection(db,'announcements'),orderBy('createdAt','desc')));
      if(snap.empty){ tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><i class="fas fa-bullhorn"></i>No announcements yet</div></td></tr>'; return; }
      tbody.innerHTML='';
      snap.forEach(d=>{
        const a={id:d.id,...d.data()};
        tbody.innerHTML+=`<tr>
          <td style="color:var(--text);font-weight:700">${esc(a.title||'—')}</td>
          <td style="max-width:220px;color:var(--text2)">${esc((a.body||'').slice(0,60))}…</td>
          <td><span class="badge badge-${a.priority==='urgent'?'danger':a.priority==='high'?'warning':'muted'}">${esc(a.priority||'normal')}</span></td>
          <td>${a.isActive!==false
            ?'<span class="badge badge-success">Active</span>'
            :'<span class="badge badge-muted">Inactive</span>'}</td>
          <td>${fmtDate(a.createdAt)}</td>
          <td>
            <button class="btn btn-${a.isActive!==false?'warning':'success'} btn-sm"
              onclick="toggleAnnouncement('${a.id}',${!a.isActive})">
              ${a.isActive!==false?'Disable':'Enable'}
            </button>
          </td>
        </tr>`;
      });
    } catch(e){ toast('Failed: '+e.message,'error'); }
  };

  window.openNewAnnouncement = function() {
    ['ann-title','ann-body','ann-expires'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('ann-priority').value='normal';
    document.getElementById('announce-modal').classList.remove('hidden');
  };
  window.closeAnnounceModal = function() {
    document.getElementById('announce-modal').classList.add('hidden');
  };

  window.saveAnnouncement = async function() {
    const title   = document.getElementById('ann-title').value.trim();
    const body    = document.getElementById('ann-body').value.trim();
    const priority= document.getElementById('ann-priority').value;
    const expires = document.getElementById('ann-expires').value;
    if(!title||!body) return toast('Title and message are required','error');
    try {
      await addDoc(collection(db,'announcements'),{
        title, body, priority, isActive:true,
        expiresAt: expires ? Timestamp.fromDate(new Date(expires)) : null,
        createdAt: serverTimestamp(), createdBy: window._currentAdmin?.uid||'admin'
      });
      toast('Announcement published!','success');
      window.closeAnnounceModal();
      window.loadAnnouncements();
    } catch(e){ toast('Failed: '+e.message,'error'); }
  };

  window.toggleAnnouncement = async function(id, active) {
    try {
      await updateDoc(doc(db,'announcements',id),{isActive:active});
      toast(active?'Announcement enabled':'Announcement disabled', active?'success':'warning');
      window.loadAnnouncements();
    } catch(e){ toast('Failed: '+e.message,'error'); }
  };
})();

