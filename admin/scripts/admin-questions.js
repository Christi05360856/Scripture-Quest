// ============================================
// SCRIPTUREQUEST ADMIN — admin-questions.js
// Question bank management section.
// Non-module script — relies on window.db/fb/helpers
// from admin-core.js, which must load first.
// Extracted verbatim — no logic changes.
// ===========================================

(function () {
  const { collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
          query, orderBy, serverTimestamp } = window.fb;
  const db = window.db;

  window.loadQuestions = async function() {
    const tbody = document.getElementById('questions-tbody');
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Loading…</td></tr>';
    try {
      const snap = await getDocs(query(collection(db,'questions'), orderBy('createdAt','desc')));
      window._allQuestions=[];
      snap.forEach(d=>window._allQuestions.push({id:d.id,...d.data()}));
      document.getElementById('q-count').textContent = `(${window._allQuestions.length})`;
      renderQuestions(window._allQuestions);
    } catch(e){ toast('Failed to load questions: '+e.message,'error'); }
  };

  function renderQuestions(list) {
    const tbody = document.getElementById('questions-tbody');
    if(!list.length){ tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><i class="fas fa-question"></i>No questions found</div></td></tr>'; return; }
    const diffColor = d=>({'easy':'badge-success','medium':'badge-info','hard':'badge-warning','expert':'badge-danger'}[d]||'badge-muted');
    tbody.innerHTML = list.map(q=>`
      <tr>
        <td style="max-width:280px;color:var(--text)">${esc((q.question||'').slice(0,60))}${(q.question||'').length>60?'…':''}</td>
        <td><span class="badge badge-primary">${esc(q.category||'—')}</span></td>
        <td><span class="badge ${diffColor(q.difficulty)}">${esc(q.difficulty||'—')}</span></td>
        <td style="color:var(--muted);font-size:12px">${esc(q.verseReference||'—')}</td>
        <td>${q.isActive!==false
          ? '<span class="badge badge-success">Active</span>'
          : '<span class="badge badge-muted">Inactive</span>'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editQuestion('${q.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.filterQuestions = function() {
    const q   = document.getElementById('q-search').value.toLowerCase();
    const cat = document.getElementById('q-cat-filter').value;
    const dif = document.getElementById('q-diff-filter').value;
    renderQuestions(window._allQuestions.filter(item=>{
      const match = !q || (item.question||'').toLowerCase().includes(q);
      const c     = cat==='all' || item.category===cat;
      const d     = dif==='all' || item.difficulty===dif;
      return match && c && d;
    }));
  };

  window.openAddQuestion = function() {
    document.getElementById('q-modal-title').textContent='Add Question';
    document.getElementById('q-edit-id').value='';
    ['q-text','q-verse','q-explanation'].forEach(id=>document.getElementById(id).value='');
    ['q-category','q-difficulty'].forEach(id=>document.getElementById(id).value='');
    ['opt0','opt1','opt2','opt3'].forEach(id=>document.getElementById(id).value='');
    document.querySelectorAll('[name="correct-opt"]').forEach(r=>r.checked=false);
    document.getElementById('q-active').value='true';
    document.getElementById('q-modal-error').textContent='';
    document.getElementById('question-modal').classList.remove('hidden');
  };

  window.editQuestion = function(id) {
    const q = window._allQuestions.find(x=>x.id===id);
    if(!q) return;
    document.getElementById('q-modal-title').textContent='Edit Question';
    document.getElementById('q-edit-id').value=id;
    document.getElementById('q-text').value=q.question||'';
    document.getElementById('q-category').value=q.category||'';
    document.getElementById('q-difficulty').value=q.difficulty||'';
    document.getElementById('q-verse').value=q.verseReference||'';
    document.getElementById('q-explanation').value=q.explanation||'';
    document.getElementById('q-active').value=String(q.isActive!==false);
    (q.options||[]).forEach((opt,i)=>{
      const el=document.getElementById('opt'+i);
      if(el) el.value=opt;
    });
    const radioEl=document.querySelector(`[name="correct-opt"][value="${q.correctAnswer}"]`);
    if(radioEl) radioEl.checked=true;
    document.getElementById('q-modal-error').textContent='';
    document.getElementById('question-modal').classList.remove('hidden');
  };

  window.closeQuestionModal = function() {
    document.getElementById('question-modal').classList.add('hidden');
  };

  window.saveQuestion = async function() {
    const btn    = document.getElementById('q-save-btn');
    const errEl  = document.getElementById('q-modal-error');
    const editId = document.getElementById('q-edit-id').value;

    const qText  = document.getElementById('q-text').value.trim();
    const cat    = document.getElementById('q-category').value;
    const diff   = document.getElementById('q-difficulty').value;
    const verse  = document.getElementById('q-verse').value.trim();
    const expl   = document.getElementById('q-explanation').value.trim();
    const active = document.getElementById('q-active').value==='true';
    const opts   = ['opt0','opt1','opt2','opt3'].map(id=>document.getElementById(id).value.trim());
    const corrEl = document.querySelector('[name="correct-opt"]:checked');

    errEl.textContent='';
    if(!qText)           return errEl.textContent='Question text is required.';
    if(!cat)             return errEl.textContent='Category is required.';
    if(!diff)            return errEl.textContent='Difficulty is required.';
    if(opts.some(o=>!o)) return errEl.textContent='All 4 options are required.';
    if(!corrEl)          return errEl.textContent='Please select the correct answer.';

    const data = {
      question: qText, category: cat, difficulty: diff,
      options: opts, correctAnswer: parseInt(corrEl.value),
      verseReference: verse, explanation: expl,
      isActive: active, updatedAt: serverTimestamp()
    };

    btn.disabled=true; btn.textContent='Saving…';
    try {
      if(editId) {
        await updateDoc(doc(db,'questions',editId), data);
        toast('Question updated!','success');
      } else {
        await addDoc(collection(db,'questions'), { ...data, createdAt:serverTimestamp(), createdBy:window._currentAdmin?.uid||'admin' });
        toast('Question added!','success');
      }
      window.closeQuestionModal();
      window.loadQuestions();
    } catch(e){ errEl.textContent='Error: '+e.message; }
    finally{ btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Save Question'; }
  };

  window.deleteQuestion = function(id) {
    showConfirm('🗑️','Delete Question','This question will be permanently deleted and removed from future quizzes.', async ()=>{
      try {
        await deleteDoc(doc(db,'questions',id));
        toast('Question deleted','success');
        window.loadQuestions();
      } catch(e){ toast('Failed: '+e.message,'error'); }
    });
  };
})();
    
