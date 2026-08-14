// app.js — Prize Manager shell

let _activeTab = 'prizes';

async function boot() {
  renderShell();
  showTab('prizes');
  updateSyncStatus('syncing');
  await loadAll();
  await loadBINGOGoal();
  renderGoals();
  renderPrizes();
  startSync(() => { renderGoals(); renderPrizes(); });
}

function renderShell() {
  document.getElementById('root').innerHTML = `
    <div class="shell">
      <div style="padding:12px 14px 8px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-family:Georgia,serif;font-size:17px;font-weight:500">Bookish Summer Soirée</div>
          <div style="font-size:11px;color:var(--text2)">Prize Manager</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div id="sync-status" style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:3px"></div>
          <div id="user-badge" style="font-size:12px;color:var(--text2)"></div>
        </div>
      </div>

      <div id="budget-bar" style="padding:0 12px"></div>

      <div style="padding:0 12px 8px">
        <div class="goals-row" id="goals-bar"></div>
      </div>

      <div id="tab-prizes"   style="padding:0 12px"><div id="prizes-content"></div></div>
      <div id="tab-tags"     style="display:none;padding:0 12px"></div>
      <div id="tab-settings" style="display:none;padding:0 12px"></div>
    </div>

    <nav class="tab-bar">
      <button class="tab-btn active" onclick="showTab('prizes')"><i class="ti ti-gift"></i>Prizes</button>
      <button class="tab-btn" onclick="showTab('tags')"><i class="ti ti-tag"></i>Tags</button>
      <button class="tab-btn" onclick="showTab('settings')"><i class="ti ti-settings"></i>Settings</button>
    </nav>
    <div id="modal-container"></div>
    <div id="toast" class="toast"></div>`;
}

function showTab(t) {
  _activeTab = t;
  ['prizes','tags','settings'].forEach(x => {
    const el = document.getElementById('tab-'+x);
    if (el) el.style.display = x===t?'block':'none';
  });
  document.querySelectorAll('.tab-btn').forEach((b,i) =>
    b.classList.toggle('active', ['prizes','tags','settings'][i]===t));
  if (t==='prizes')   renderPrizes();
  if (t==='tags')     renderTags();
  if (t==='settings') renderPMSettings();
}

function renderTags() {
  const el = document.getElementById('tab-tags');
  if (!el) return;
  const prizes = getPrizes().filter(p => p.needTag && !p.bundledInto);
  const stages = [
    {key:'tagMade',    label:'1. Tag made',    color:'var(--amber)'},
    {key:'tagPrinted', label:'2. Tag printed',  color:'var(--purple)'},
    {key:'tagAttached',label:'3. Tag attached', color:'var(--blue,#3B82F6)'},
    {key:'onTote',     label:'4. On tote',      color:'var(--green)'},
  ];
  el.innerHTML = `
    <div style="font-size:13px;font-weight:600;margin-bottom:10px">${prizes.length} prizes need tags</div>
    ${stages.map(s => {
      const inStage = prizes.filter(p => p[s.key]);
      const pct = prizes.length > 0 ? Math.round(inStage.length/prizes.length*100) : 0;
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span style="font-weight:500;color:${s.color}">${s.label}</span>
          <span style="color:var(--text2)">${inStage.length}/${prizes.length} (${pct}%)</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="height:100%;background:${s.color};width:${pct}%;border-radius:3px;transition:width .3s"></div>
        </div>
      </div>`;
    }).join('')}
    <div style="font-size:13px;font-weight:600;margin:16px 0 8px">Prizes needing tags</div>
    ${prizes.filter(p=>!p.onTote).map(p => `
      <div style="padding:8px 10px;background:var(--bg);border:.5px solid var(--border);border-radius:var(--radius-sm);margin-bottom:4px;cursor:pointer" onclick="openEditPrize(${p.id})">
        <div style="font-size:13px;font-weight:500">${escHtml(p.name||'Unnamed')}</div>
        <div style="font-size:11px;color:var(--text2)">${escHtml(p.cat||'')} · ${escHtml(p.donor||'No donor')}</div>
        <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
          ${['tagMade','tagPrinted','tagAttached','onTote'].map((k,i)=>
            `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${p[k]?'var(--green-bg)':'var(--bg2)'};color:${p[k]?'var(--green-text)':'var(--text3)'}">${['Made','Printed','Attached','On tote'][i]}</span>`
          ).join('')}
        </div>
      </div>`).join('')}
    <div style="height:300px"></div>`;
}

function renderPMSettings() {
  const el = document.getElementById('tab-settings');
  if (!el) return;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Firebase connection</div>
      <div class="field"><label>Database URL</label>
        <input type="text" id="pm-firebase" value="${escHtml(window.FIREBASE_DB_URL||'')}"
          placeholder="https://soiree-prizes-default-rtdb.firebaseio.com"
          style="width:100%;font-family:monospace;font-size:11px">
      </div>
      <button class="btn primary" onclick="savePMSettings()"><i class="ti ti-check"></i> Save</button>
    </div>
    <div style="height:300px"></div>`;
}

function savePMSettings() {
  window.FIREBASE_DB_URL = document.getElementById('pm-firebase')?.value?.trim()||'';
  localStorage.setItem('soiree_firebase_url', window.FIREBASE_DB_URL);
  showToast('Settings saved. Reloading…');
  setTimeout(() => location.reload(), 1000);
}

boot();
