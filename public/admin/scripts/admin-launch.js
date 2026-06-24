// ============================================
// admin-launch.js  — Bible Battle Admin
// CORRECTED — matches HTML IDs
// ============================================
import { db, fmtCountdown, getMsw, getWeekId, toast, showConfirm }
  from './admin-core.js';
import { collection, doc, query, getDocs, deleteDoc, writeBatch }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export function previewEpoch() {
  const val = document.getElementById('launch-epoch').value;
  if (!val) { toast('Select a launch date first', 'err'); return; }
  const epochMs = new Date(val).getTime();
  const MSW     = getMsw();
  const wn      = Math.floor((Date.now() - epochMs) / MSW) + 1;
  const msl     = epochMs + wn * MSW - Date.now();
  const preview = document.getElementById('epoch-preview');
  const text    = document.getElementById('epoch-preview-text');
  if (text) text.textContent =
    `With this epoch, today = Week ${wn}. ` +
    `Week ${wn} ends in ${fmtCountdown(msl)}. ` +
    `Update WEEK_EPOCH in constants.js → new Date('${new Date(val).toISOString()}')`;
  if (preview) preview.classList.remove('hidden');
}

export function confirmReset() {
  showConfirm(
    '💥', 'Reset Leaderboard',
    'Permanently delete ALL leaderboard entries and reset every user\'s weekly points. This CANNOT be undone.',
    runReset
  );
}

async function runReset() {
  const prog    = document.getElementById('reset-progress');
  const logEl   = document.getElementById('reset-log');
  const msgEl   = document.getElementById('reset-msg');
  if (prog)  prog.classList.remove('hidden');
  if (logEl) logEl.style.display = 'block';
  if (logEl) logEl.textContent = '';

  const log = m => {
    if (!logEl) return;
    logEl.textContent += `[${new Date().toLocaleTimeString()}] ${m}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  try {
    log('Starting leaderboard reset…');
    if (msgEl) msgEl.textContent = 'Fetching week documents…';

    const wSnap = await getDocs(collection(db,'leaderboardWeekly'));
    let delE = 0, delW = 0;
    for (const wd of wSnap.docs) {
      const eSnap = await getDocs(collection(db,'leaderboardWeekly', wd.id, 'entries'));
      if (eSnap.size > 0) {
        const batch = writeBatch(db);
        eSnap.docs.forEach(e => batch.delete(e.ref));
        await batch.commit();
        delE += eSnap.size;
        log(`Deleted ${eSnap.size} entries from ${wd.id}`);
      }
      await deleteDoc(wd.ref);
      delW++;
    }
    log(`Cleared ${delW} week docs, ${delE} entries total.`);

    if (msgEl) msgEl.textContent = 'Resetting user weekly stats…';
    const uSnap = await getDocs(collection(db,'userStats'));
    let resetC = 0;
    let batch  = writeBatch(db), bc = 0;
    for (const ud of uSnap.docs) {
      batch.update(ud.ref, { weeklyPoints: 0, weeklyRank: null });
      bc++;
      if (bc >= 400) { await batch.commit(); resetC += bc; batch = writeBatch(db); bc = 0; }
    }
    if (bc > 0) { await batch.commit(); resetC += bc; }
    log(`Reset weekly stats for ${resetC} users.`);

    if (msgEl) msgEl.textContent = '✅ Reset complete!';
    log('✅ Ready for launch!');
    toast('Leaderboard reset! Ready for launch.', 'ok');
  } catch(e) {
    log('❌ Error: ' + e.message);
    if (msgEl) msgEl.textContent = 'Reset failed — see log';
    toast('Reset failed: ' + e.message, 'err');
  }
}

window._adminLaunch = { previewEpoch, confirmReset };
