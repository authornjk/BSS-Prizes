/**
 * app.js — main orchestrator
 * Handles login flow, tab navigation, modal helpers, sync badge, toast.
 */

let _activeTab = 'prizes';

// ── Helpers ──────────────────────────────────────────────────────────────────

function showModal(html) {
  const mc = document.getElementById('modal-container');
  mc.innerHTML = `<div class="modal-overlay" id="modal-bg" onclick="closeModalOutside(event)"><div class="modal"><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button>${html}</div></div>`;
}
function closeModal() { document.getElementById('modal-container').innerHTML = ''; }
function closeModalOutside(e) { if (e.target.id === 'modal-bg') closeModal(); }

function showToast(msg) {
  let t = document.getElementById('save-toast');
  if (!t) { t = document.createElement('div'); t.id = 'save-toast'; t.className = 'save-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function setSyncState(state) {
  const b = document.getElementById('sync-badge');
  if (!b) return;
  if (state === 'live') { b.className = 'sync-badge live'; b.innerHTML = '<i class="ti ti-circle-check"></i> Live'; }
  else if (state === 'syncing') { b.className = 'sync-badge syncing'; b.innerHTML = '<i class="ti ti-refresh"></i> Syncing…'; }
  else { b.className = 'sync-badge'; b.innerHTML = '<i class="ti ti-wifi-off"></i> Offline'; }
}

// ── Tab routing ──────────────────────────────────────────────────────────────

function showTab(t) {
  _activeTab = t;
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['prizes', 'tags', 'budget', 'authors', 'settings'][i] === t);
  });

  const content = document.getElementById('tab-content');
  if (!content) return;

  const meta = getMeta();
  const user = currentUser();
  const ini = user.displayName.split(' ').map(x => x[0]).join('').slice(0, 2);

  if (t === 'prizes') {
    content.innerHTML = renderPrizesTab();
    renderPrizes();
  } else if (t === 'tags') {
    content.innerHTML = `<div class="tag-dash" id="tag-dash"></div><div id="tag-list"></div>`;
    renderTags();
  } else if (t === 'budget') {
    content.innerHTML = `<div id="budget-content"></div>`;
    renderBudget();
  } else if (t === 'authors') {
    content.innerHTML = `<div id="authors-content"></div>`;
    renderAuthors();
  } else if (t === 'settings') {
    content.innerHTML = `<div id="settings-content"></div>`;
    renderSettings();
  }
}

// ── Main app shell ────────────────────────────────────────────────────────────

function renderAppShell() {
  const user = currentUser();
  const ini = user.displayName.split(' ').map(x => x[0]).join('').slice(0, 2);
  const meta = getMeta();

  document.getElementById('root').innerHTML = `
    <div class="app-shell">
      <div class="top-bar">
        <div>
          <div class="app-title" id="title-display">${escHtml(meta.eventName || 'Bookish Summer Soirée')}</div>
          <div class="app-year" id="year-display">${escHtml(meta.eventYear || '2027')} Event</div>
        </div>
        <div class="top-right">
          <div class="sync-badge live" id="sync-badge"><i class="ti ti-circle-check"></i> Live</div>
          <span style="font-size:11px;color:var(--text3)" id="total-val"></span>
          <div class="user-chip">
            <div class="avatar">${escHtml(ini)}</div>
            <span style="font-size:12px;color:var(--text2)">${escHtml(user.displayName)}</span>
            <button class="btn" onclick="doSignOut()" style="padding:3px 7px;font-size:12px" title="Sign out"><i class="ti ti-logout"></i></button>
          </div>
        </div>
      </div>

      <div class="goals-bar" id="goals-bar"></div>

      <div id="tab-content"></div>
    </div>

    <nav class="tab-bar">
      <button class="tab-btn active" onclick="showTab('prizes')"><i class="ti ti-gift"></i>Prizes</button>
      <button class="tab-btn" onclick="showTab('tags')"><i class="ti ti-tag"></i>Tags</button>
      <button class="tab-btn" onclick="showTab('budget')"><i class="ti ti-chart-bar"></i>Budget</button>
      <button class="tab-btn" onclick="showTab('authors')"><i class="ti ti-users"></i>Authors</button>
      <button class="tab-btn" onclick="showTab('settings')"><i class="ti ti-settings"></i>Settings</button>
    </nav>

    <div id="save-toast" class="save-toast"></div>`;

  renderGoals();
  showTab('prizes');

  // Start live sync
  startSync(changed => {
    setSyncState('live');
    if (changed === 'prizes') {
      if (_activeTab === 'prizes') renderPrizes();
      if (_activeTab === 'tags') renderTags();
      if (_activeTab === 'budget') renderBudget();
      if (_activeTab === 'authors') renderAuthors();
      renderGoals();
    }
    if (changed === 'meta') {
      renderGoals();
      if (_activeTab === 'settings') renderSettings();
    }
  });
}

// ── Login flow ────────────────────────────────────────────────────────────────

function renderLogin(errMsg) {
  document.getElementById('root').innerHTML = `
    <div class="login-wrap">
      <h2>Bookish Summer Soirée</h2>
      <div class="login-sub">2027 Prize Manager — sign in to continue</div>
      <div class="field"><label>Username</label><input type="text" id="li-user" autocomplete="username" placeholder="your username"></div>
      <div class="field"><label>Password</label><input type="password" id="li-pass" autocomplete="current-password" placeholder="your password"
        onkeydown="if(event.key==='Enter')doLogin()"></div>
      <div class="m-err" id="li-err">${errMsg || ''}</div>
      <button class="btn primary full" style="margin-top:8px" onclick="doLogin()">Sign in</button>
      <div style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border);font-size:11px;color:var(--text3)">
        First time? Your admin (Nicole) sets up accounts.<br>You'll choose your password on first login.
      </div>
    </div>`;
  setTimeout(() => document.getElementById('li-user')?.focus(), 50);
}

async function doLogin() {
  const username = (document.getElementById('li-user').value || '').trim();
  const password = document.getElementById('li-pass').value || '';
  const errEl = document.getElementById('li-err');
  if (!username || !password) { if (errEl) errEl.textContent = 'Please enter username and password.'; return; }

  const result = await login(username, password);

  if (result.firstLogin) {
    showSetPasswordModal(result.user);
    return;
  }
  if (!result.ok) {
    if (errEl) errEl.textContent = result.error;
    return;
  }

  initPrizeSortFromPrefs();
  renderAppShell();
}

function showSetPasswordModal(user) {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h3>Welcome, ${escHtml(user.displayName)}!</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:1rem">Please set a password for your account.</p>
        <div class="field"><label>New password</label><input type="password" id="np1" autocomplete="new-password" placeholder="at least 4 characters"></div>
        <div class="field"><label>Confirm password</label><input type="password" id="np2" autocomplete="new-password" placeholder="repeat password"></div>
        <div class="m-err" id="np-err"></div>
        <div class="m-actions">
          <button class="btn primary" onclick="doSetPassword('${escHtml(user.username)}')">Set password &amp; sign in</button>
        </div>
      </div>
    </div>`;
}

async function doSetPassword(username) {
  const p1 = document.getElementById('np1').value;
  const p2 = document.getElementById('np2').value;
  const err = document.getElementById('np-err');
  if (p1.length < 4) { err.textContent = 'Password must be at least 4 characters.'; return; }
  if (p1 !== p2) { err.textContent = 'Passwords do not match.'; return; }

  // Re-fetch user from DB to get the correct object
  const userData = await dbGet('users/' + username);
  if (!userData) { err.textContent = 'User not found.'; return; }
  await setPassword(userData, p1);

  document.getElementById('modal-container').innerHTML = '';
  initPrizeSortFromPrefs();
  renderAppShell();
}

function doSignOut() {
  stopSync();
  signOut();
  document.getElementById('root').innerHTML = '';
  document.getElementById('modal-container').innerHTML = '';
  renderLogin(); // async — handles session restore
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  document.getElementById('root').innerHTML = `
    <div class="empty" style="padding:4rem">
      <i class="ti ti-loader" style="font-size:28px"></i>
      <span>Loading…</span>
    </div>`;

  try {
    await loadMeta();
  } catch (e) {
    console.error('Boot failed', e);
  }

  renderLogin();
}

boot();
