// app.js — Prize Manager shell
let _activeTab='prizes';

async function renderLogin(){
  const restored=await restoreSession();
  if(restored){boot();return;}
  const users=await loadUsers();
  document.getElementById('root').innerHTML=`
    <div class="login-wrap">
      <h2>Bookish Summer Soirée</h2>
      <div class="login-sub">2027 Prize Manager — who are you?</div>
      ${users.map(u=>`
        <button class="user-btn" onclick="doLogin('${u.username}')">
          <div class="avatar">${u.avatar||u.displayName.slice(0,2).toUpperCase()}</div>
          ${escHtml(u.displayName)}
        </button>`).join('')}
    </div>
    <div id="modal-container"></div>
    <div id="toast" class="toast"></div>`;
}

async function doLogin(username){
  const res=await login(username);
  if(!res.ok){alert(res.error);return;}
  boot();
}

function doSignOut(){
  stopSync();signOut();
  document.getElementById('root').innerHTML='';
  document.getElementById('modal-container').innerHTML='';
  renderLogin();
}

function renderShell(){
  const isCoord=!isAdmin();
  document.getElementById('root').innerHTML=`
    <div class="shell">
      <div class="top-bar">
        <div>
          <div class="app-title">Soirée Prize Manager</div>
          <div class="app-year">Bookish Summer Soirée 2027</div>
        </div>
        <div class="top-right">
          <span style="font-size:12px;color:var(--text2)">${escHtml(currentUser()?.displayName||'')}</span>
          <button class="btn" style="font-size:11px;padding:3px 9px" onclick="doSignOut()"><i class="ti ti-logout"></i></button>
        </div>
      </div>
      <div id="tab-prizes"></div>
      <div id="tab-tags"    style="display:none"></div>
      <div id="tab-budget"  style="display:none"></div>
      ${!isCoord?`<div id="tab-authors" style="display:none"></div>`:''}
      <div id="tab-settings" style="display:none"></div>
    </div>
    <nav class="tab-bar">
      <button class="tab-btn active" onclick="showTab('prizes')"><i class="ti ti-gift"></i>Prizes</button>
      <button class="tab-btn" onclick="showTab('tags')"><i class="ti ti-tag"></i>Tags</button>
      <button class="tab-btn" onclick="showTab('budget')"><i class="ti ti-calculator"></i>Budget</button>
      ${!isCoord?`<button class="tab-btn" onclick="showTab('authors')"><i class="ti ti-users"></i>Authors</button>`:''}
      <button class="tab-btn" onclick="showTab('settings')"><i class="ti ti-settings"></i>Settings</button>
    </nav>
    <div id="modal-container"></div>
    <div id="toast" class="toast"></div>`;
}

function showTab(t){
  _activeTab=t;
  const tabs=['prizes','tags','budget','authors','settings'];
  tabs.forEach(x=>{
    const el=document.getElementById('tab-'+x);
    if(el) el.style.display=x===t?'block':'none';
  });
  document.querySelectorAll('.tab-btn').forEach((b,i)=>{
    b.classList.toggle('active',tabs[i]===t);
  });
  if(t==='prizes')   renderPrizes();
  if(t==='tags')     renderTags();
  if(t==='budget')   renderBudget();
  if(t==='authors')  renderAuthorsTab();
  if(t==='settings') renderSettings();
}

async function boot(){
  await loadMeta();
  await loadPrizes();
  renderShell();
  showTab('prizes');
  startSync(()=>{
    if(_activeTab==='prizes')  renderPrizes();
    if(_activeTab==='tags')    renderTags();
    if(_activeTab==='budget')  renderBudget();
  });
}

// Start
renderLogin();
