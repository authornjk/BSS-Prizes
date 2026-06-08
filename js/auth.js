/**
 * auth.js — no-password, name-select login
 * Users are loaded from Firebase. No passwords required.
 */

const DEFAULT_USERS = [
  { username: 'nicole',      displayName: 'Nicole',            role: 'admin',       defaultCat: '',      defaultSort: 'name' },
  { username: 'coordinator', displayName: 'Prize Coordinator', role: 'coordinator', defaultCat: 'BINGO', defaultSort: 'name' },
];

let _currentUser = null;

async function loadUsers() {
  try {
    const data = await dbGet('users');
    if (data) {
      const users = Object.values(data);
      // migrate: strip pwHash if present (no longer needed)
      return users.map(u => ({ ...u, pwHash: undefined }));
    }
    const usersObj = {};
    DEFAULT_USERS.forEach(u => { usersObj[u.username] = u; });
    await dbSet('users', usersObj);
    return [...DEFAULT_USERS];
  } catch(e) {
    return [...DEFAULT_USERS];
  }
}

async function saveUser(user) {
  try { await dbSet('users/' + user.username, user); } catch(e) {}
}

async function login(username) {
  const users = await loadUsers();
  const user  = users.find(u => u.username === username);
  if (!user) return { ok: false, error: 'User not found.' };
  _currentUser = user;
  // Persist session to localStorage
  try { localStorage.setItem('soiree_session', username); } catch(e) {}
  return { ok: true, user };
}

async function restoreSession() {
  try {
    const saved = localStorage.getItem('soiree_session');
    if (!saved) return false;
    const users = await loadUsers();
    const user  = users.find(u => u.username === saved);
    if (!user) return false;
    _currentUser = user;
    return true;
  } catch(e) { return false; }
}

function currentUser() { return _currentUser; }
function isAdmin()     { return _currentUser?.role === 'admin'; }

function signOut() {
  _currentUser = null;
  try { localStorage.removeItem('soiree_session'); } catch(e) {}
}

// Local prefs (per device, per user)
function getPrefs() {
  try { return JSON.parse(localStorage.getItem('soiree_prefs_' + (_currentUser?.username||'')) || '{}'); } catch(e) { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem('soiree_prefs_' + (_currentUser?.username||''), JSON.stringify(p)); } catch(e) {}
}
