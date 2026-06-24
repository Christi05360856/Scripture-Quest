// ============================================
// admin-notifications.js  — Bible Battle Admin
// ============================================
import { db, currentAdmin, fmtDate, esc, toast, showConfirm }
  from './admin-core.js';
import { collection, query, orderBy, limit, getDocs,
         addDoc, serverTimestamp, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export function updatePreview() {
  const title = document.getElementById('notif-title').value;
  const body  = document.getElementById('notif-body').value;
  const pvT = document.getElementById('pv-title');
  const pvB = document.getElementById('pv-body');
  const ntc = document.getElementById('ntc');
  const nbc = document.getElementById('nbc');
  if (pvT) pvT.textContent = title || 'Your notification title';
  if (pvB) pvB.textContent = body  || 'Your message will appear here…';
  if (ntc) ntc.textContent = title.length;
  if (nbc) nbc.textContent = body.length;
}

export function toggleSchedule() {
  const wrap = document.getElementById('notif-time-wrap');
  const val  = document.getElementById('notif-schedule').value;
  if (wrap) wrap.classList.toggle('hidden', val !== 'later');
}

export function fillTemplate(title, body) {
  document.getElementById('notif-title').value = title;
  document.getElementById('notif-body').value  = body;
  updatePreview();
}

export function clearNotif() {
  ['notif-title','notif-body','notif-send-at'].forEach(id => document.getElementById(id).value = '');
  const aud = document.getElementById('notif-audience');
  const sch = document.getElementById('notif-schedule');
  const twrap = document.getElementById('notif-time-wrap');
  if (aud)   aud.value = 'all';
  if (sch)   sch.value = 'now';
  if (twrap) twrap.classList.add('hidden');
  updatePreview();
}

export function sendNotif() {
  const title    = document.getElementById('notif-title').value.trim();
  const body     = document.getElementById('notif-body').value.trim();
  const audience = document.getElementById('notif-audience').value;
  const schedule = document.getElementById('notif-schedule').value;
  const sendAt   = document.getElementById('notif-send-at').value;
  if (!title || !body) return toast('Title and message required', 'err');
  if (schedule === 'later' && !sendAt) return toast('Set a send time', 'err');
  const target = audience === 'all' ? 'all users' : audience + ' users';
  showConfirm('🔔','Send Notification', `Send "${title}" to ${target}?`, async () => {
    try {
      await addDoc(collection(db,'scheduledNotifications'), {
        title, body, audience,
        scheduledFor: schedule === 'later'
          ? Timestamp.fromDate(new Date(sendAt))
          : serverTimestamp(),
        sendImmediately: schedule === 'now',
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: currentAdmin?.uid || 'admin'
      });
      toast('Notification queued!', 'ok');
      clearNotif();
      loadNotifHistory();
    } catch(e) { toast('Failed: ' + e.message, 'err'); }
  });
}

export async function loadNotifHistory() {
  const el = document.getElementById('notif-history');
  if (!el) return;
  try {
    const snap = await getDocs(query(
      collection(db,'scheduledNotifications'),
      orderBy('createdAt','desc'), limit(8)
    ));
    if (snap.empty) {
      el.innerHTML = '<div class="es" style="padding:24px"><i class="fas fa-bell-slash"></i>No notifications yet</div>';
      return;
    }
    el.innerHTML = '';
    snap.forEach(d => {
      const n  = { id: d.id, ...d.data() };
      const sb = n.status === 'sent' ? 'bg-ok' : n.status === 'failed' ? 'bg-err' : 'bg-warn';
      el.innerHTML += `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:11px 0;border-bottom:1px solid var(--b)">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--t)">${esc(n.title||'—')}</div>
            <div style="font-size:11px;color:var(--t2);margin-top:2px">${esc((n.body||'').slice(0,55))}…</div>
            <div style="font-size:10px;color:var(--mu);margin-top:3px">${fmtDate(n.createdAt)} · ${esc(n.audience||'all')}</div>
          </div>
          <span class="badge ${sb}">${esc(n.status||'pending')}</span>
        </div>`;
    });
  } catch(e) { el.innerHTML = `<div class="es" style="padding:20px">${esc(e.message)}</div>`; }
}

window._adminNotif = { updatePreview, toggleSchedule, fillTemplate, clearNotif, sendNotif };
