// ============================================
// admin-announcements.js  — Bible Battle Admin
// CORRECTED — matches HTML IDs and CSS vars
// ============================================
import { db, currentAdmin, fmtDate, esc, toast }
  from './admin-core.js';
import { collection, doc, query, orderBy, getDocs, addDoc,
         updateDoc, serverTimestamp, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function loadAnnouncements() {
  const tbody = document.getElementById('announce-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:24px">Loading…</td></tr>';
  try {
    const snap = await getDocs(query(collection(db,'announcements'), orderBy('createdAt','desc')));
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-bullhorn"></i>No announcements yet</div></td></tr>';
      return;
    }
    tbody.innerHTML = '';
    snap.forEach(d => {
      const a = { id: d.id, ...d.data() };
      const priClass = a.priority === 'urgent' ? 'badge-red' : a.priority === 'high' ? 'badge-amber' : 'badge-muted';
      tbody.innerHTML += `
        <tr>
          <td style="color:var(--text);font-weight:700">${esc(a.title||'—')}</td>
          <td style="max-width:180px;color:var(--text-2)">${esc((a.body||'').slice(0,50))}…</td>
          <td><span class="badge ${priClass}">${esc(a.priority||'normal')}</span></td>
          <td>${a.isActive !== false
            ? '<span class="badge badge-green">Active</span>'
            : '<span class="badge badge-muted">Inactive</span>'}</td>
          <td style="color:var(--text-3)">${fmtDate(a.createdAt)}</td>
          <td>
            <button class="btn btn-${a.isActive!==false?'warning':'success'} btn-sm"
              onclick="window._adminAnn.toggleAnn('${a.id}',${!a.isActive})">
              ${a.isActive !== false ? 'Disable' : 'Enable'}
            </button>
          </td>
        </tr>`;
    });
  } catch(e) { toast('Failed: ' + e.message, 'err'); }
}

export function openNewAnn() {
  ['ann-title','ann-body','ann-expires'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ann-priority').value = 'normal';
  document.getElementById('announce-modal').classList.remove('hidden');
}

export function closeAnnModal() {
  document.getElementById('announce-modal').classList.add('hidden');
}

export async function saveAnn() {
  const title   = document.getElementById('ann-title').value.trim();
  const body    = document.getElementById('ann-body').value.trim();
  const priority = document.getElementById('ann-priority').value;
  const expires  = document.getElementById('ann-expires').value;
  if (!title || !body) return toast('Title and message required', 'err');
  try {
    await addDoc(collection(db,'announcements'), {
      title, body, priority, isActive: true,
      expiresAt: expires ? Timestamp.fromDate(new Date(expires)) : null,
      createdAt: serverTimestamp(),
      createdBy: currentAdmin?.uid || 'admin'
    });
    toast('Announcement published!', 'ok');
    closeAnnModal();
    loadAnnouncements();
  } catch(e) { toast('Failed: ' + e.message, 'err'); }
}

export async function toggleAnn(id, active) {
  try {
    await updateDoc(doc(db,'announcements',id), { isActive: active });
    toast(active ? 'Announcement enabled' : 'Announcement disabled', active ? 'ok' : 'warn');
    loadAnnouncements();
  } catch(e) { toast('Failed: ' + e.message, 'err'); }
}

window._adminAnn = { openNewAnn, closeAnnModal, saveAnn, toggleAnn };
