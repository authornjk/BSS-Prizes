/** ui-settings.js */
async function renderSettings() {
  const el = document.getElementById('settings-content');
  if (!el) return;
  const meta = getMeta();
  const g = meta.goals || {};
  const b = meta.budgets || {};

  let usersHtml = '';
  if (isAdmin()) {
    let users = [];
    try { const data = await dbGet('users'); users = data ? Object.values(data) : []; } catch (e) {}
    usersHtml = `
      <div class="sett-section">
        <h3>User accounts</h3>
        <table class="user-table">
          <tr><th>Username</th><th>Display name</th><th>Role</th><th>Default view</th><th></th></tr>
          ${users.map((u, i) => `<tr>
            <td>${escHtml(u.username)}</td>
            <td><input value="${escHtml(u.displayName)}" onchange="updateUserField('${u.username}','displayName',this.value)"></td>
            <td><span class="role-badge ${u.role === 'coordinator' ? 'coord' : ''}">${u.role}</span></td>
            <td>
              <select onchange="updateUserField('${u.username}','defaultCat',this.value)">
                <option value="">All</option>
                ${CATS.map(c => `<option value="${c}"${u.defaultCat === c ? ' selected' : ''}>${c}</option>`).join('')}
              </select>
            </td>
            <td>${u.username !== currentUser().username
              ? `<button class="del-btn" onclick="doResetPassword('${u.username}')" title="Reset password"><i class="ti ti-key"></i></button>`
              : '<span style="font-size:10px;color:var(--text3)">you</span>'}</td>
          </tr>`).join('')}
        </table>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn" onclick="openAddUserModal()"><i class="ti ti-user-plus"></i> Add user</button>
        </div>
      </div>`;
  }

  el.innerHTML = `
    ${isAdmin() ? `
    <div class="sett-section">
      <h3>Event details</h3>
      <div class="sett-grid">
        <div class="sf"><label>Event name</label><input type="text" id="s-name" value="${escHtml(meta.eventName || '')}"></div>
        <div class="sf"><label>Year</label><input type="text" id="s-year" value="${escHtml(meta.eventYear || '')}"></div>
      </div>
    </div>
    <div class="sett-section">
      <h3>Prize goals</h3>
      <div class="sett-grid">
        ${CATS.filter(c => c !== 'Unassigned' && c !== 'SWAG Bag').map(c =>
          `<div class="sf"><label>${c}</label><input type="number" id="g-${c.replace(/ /g,'_')}" value="${g[c] || 0}"></div>`
        ).join('')}
        <div class="sf"><label>SWAG Bag</label><input value="No cap" readonly style="color:var(--text3)"></div>
      </div>
    </div>
    <div class="sett-section">
      <h3>Budgets ($)</h3>
      <div class="sett-grid">
        ${['BINGO','Raffle','SWAG Bag'].map(c =>
          `<div class="sf"><label>${c}</label><input type="number" step=".01" id="b-${c.replace(/ /g,'_')}" value="${b[c] || ''}" placeholder="0.00"></div>`
        ).join('')}
      </div>
    </div>
    <div class="sett-section">
      <h3>Authors (${meta.authors.length} / 25)</h3>
      <div class="author-edit-list" id="author-edit-list">
        ${meta.authors.map((a, i) => `
          <div class="author-item">
            <input type="text" value="${escHtml(a)}" placeholder="Author name" onchange="updateAuthorInList(${i}, this.value)">
            <button class="del-btn" onclick="removeAuthor(${i})"><i class="ti ti-x"></i></button>
          </div>`).join('')}
      </div>
      <button class="btn" onclick="addAuthorSlot()" ${meta.authors.length >= 25 ? 'disabled' : ''}>
        <i class="ti ti-plus"></i> Add author (${meta.authors.length}/25)
      </button>
    </div>
    ` : ''}
    ${usersHtml}
    <div class="sett-section">
      <h3>My preferences</h3>
      <div class="sett-grid">
        <div class="sf">
          <label>Default category filter</label>
          <select onchange="const p=getPrefs();p.defaultCat=this.value;savePrefs(p)">
            <option value="">All categories</option>
            ${CATS.map(c => `<option value="${c}"${(getPrefs().defaultCat || currentUser().defaultCat || '') === c ? ' selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:.5rem">
      ${isAdmin() ? `<button class="btn primary" onclick="saveAllSettings()"><i class="ti ti-check"></i> Save all settings</button>` : ''}
      <button class="btn" onclick="openChangePasswordModal()"><i class="ti ti-key"></i> Change my password</button>
    </div>
    ${isAdmin() ? `
    <div class="danger-zone" style="margin-top:1.5rem">
      <h3><i class="ti ti-alert-triangle"></i> Reset all prize data</h3>
      <p style="font-size:12px;color:var(--text2);margin-bottom:9px">Deletes all shared prizes. Cannot be undone.</p>
      <button class="btn danger" onclick="doResetAllPrizes()"><i class="ti ti-refresh"></i> Delete all prizes</button>
    </div>` : ''}`;
}

function updateAuthorInList(i, val) {
  getMeta().authors[i] = val;
}

function removeAuthor(i) {
  getMeta().authors.splice(i, 1);
  renderSettings();
}

function addAuthorSlot() {
  const meta = getMeta();
  if (meta.authors.length >= 25) { alert('At capacity — 25/25 authors.'); return; }
  meta.authors.push('');
  renderSettings().then(() => {
    const items = document.querySelectorAll('.author-item input');
    if (items.length) items[items.length - 1].focus();
  });
}

async function saveAllSettings() {
  const meta = getMeta();
  const nameEl = document.getElementById('s-name');
  const yearEl = document.getElementById('s-year');
  if (nameEl) meta.eventName = nameEl.value;
  if (yearEl) meta.eventYear = yearEl.value;

  CATS.filter(c => c !== 'Unassigned' && c !== 'SWAG Bag').forEach(c => {
    const el = document.getElementById('g-' + c.replace(/ /g, '_'));
    if (el) meta.goals[c] = +el.value || 0;
  });
  ['BINGO', 'Raffle', 'SWAG Bag'].forEach(c => {
    const el = document.getElementById('b-' + c.replace(/ /g, '_'));
    if (el) meta.budgets[c] = +el.value || 0;
  });

  // Collect author edits
  const inputs = document.querySelectorAll('.author-item input');
  if (inputs.length) meta.authors = [...inputs].map(i => i.value.trim()).filter(Boolean);

  await saveMeta(meta);
  showToast('Settings saved');
  renderGoals();
}

async function updateUserField(username, field, value) {
  const userData = await dbGet('users/' + username);
  if (userData) {
    userData[field] = value;
    await dbSet('users/' + username, userData);
  }
}

async function doResetPassword(username) {
  if (!confirm(`Reset password for this user? They will set a new one on next login.`)) return;
  await resetUserPassword(username);
  alert('Password reset.');
}

function openAddUserModal() {
  showModal(`
    <h3>Add user</h3>
    <div class="m-grid">
      <div class="mf full"><label>Username (for login)</label><input type="text" id="nu-user" placeholder="e.g. sarah" autocomplete="off"></div>
      <div class="mf full"><label>Display name</label><input type="text" id="nu-display" placeholder="e.g. Sarah Jones"></div>
      <div class="mf"><label>Role</label><select id="nu-role"><option value="coordinator">Coordinator</option><option value="admin">Admin</option></select></div>
      <div class="mf"><label>Default view</label><select id="nu-cat"><option value="">All categories</option>${CATS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
    </div>
    <p style="font-size:11px;color:var(--text2);margin-top:8px">They will set their own password on first login.</p>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="doAddUser()">Add user</button>
    </div>`);
}

async function doAddUser() {
  const uname = (document.getElementById('nu-user').value || '').trim().toLowerCase();
  const dname = (document.getElementById('nu-display').value || '').trim();
  if (!uname || !dname) { alert('Please fill in username and display name.'); return; }
  const existing = await dbGet('users/' + uname);
  if (existing) { alert('Username already exists.'); return; }
  await dbSet('users/' + uname, {
    username: uname,
    displayName: dname,
    role: document.getElementById('nu-role').value,
    pwHash: '',
    defaultCat: document.getElementById('nu-cat').value,
    defaultSort: 'name'
  });
  closeModal();
  renderSettings();
}

function openChangePasswordModal() {
  showModal(`
    <h3>Change password</h3>
    <div class="field"><label>Current password</label><input type="password" id="cp-old" autocomplete="current-password"></div>
    <div class="field"><label>New password</label><input type="password" id="cp-new" autocomplete="new-password"></div>
    <div class="field"><label>Confirm new password</label><input type="password" id="cp-new2" autocomplete="new-password"></div>
    <div class="m-err" id="cp-err"></div>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="doChangePassword()">Update password</button>
    </div>`);
}

async function doChangePassword() {
  const old = document.getElementById('cp-old').value;
  const n1 = document.getElementById('cp-new').value;
  const n2 = document.getElementById('cp-new2').value;
  const err = document.getElementById('cp-err');
  if (n1.length < 4) { err.textContent = 'Password must be at least 4 characters.'; return; }
  if (n1 !== n2) { err.textContent = 'New passwords do not match.'; return; }
  const result = await changePassword(old, n1);
  if (!result.ok) { err.textContent = result.error; return; }
  closeModal();
  showToast('Password updated!');
}

async function doResetAllPrizes() {
  if (!confirm('Delete ALL prize data? This cannot be undone.')) return;
  if (!confirm('Really sure? All prizes will be permanently deleted.')) return;
  await dbSet('prizes', null);
  showToast('All prizes deleted.');
}
