// storage.js — Firebase connection + helpers
window.FIREBASE_DB_URL = localStorage.getItem('soiree_firebase_url') || '';
window.GDRIVE_TAG_FOLDER = '1F4JcjLJhGbH14fUKv-dzrK1v85R8Qzqf';

async function dbGet(path) {
  if (!window.FIREBASE_DB_URL) return null;
  const res = await fetch(`${window.FIREBASE_DB_URL}/${path}.json`);
  return res.ok ? res.json() : null;
}
async function dbSet(path, data) {
  if (!window.FIREBASE_DB_URL) return;
  await fetch(`${window.FIREBASE_DB_URL}/${path}.json`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  });
}
async function dbPatch(path, data) {
  if (!window.FIREBASE_DB_URL) return;
  await fetch(`${window.FIREBASE_DB_URL}/${path}.json`, {
    method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  });
}
async function dbDelete(path) {
  if (!window.FIREBASE_DB_URL) return;
  await fetch(`${window.FIREBASE_DB_URL}/${path}.json`, {method:'DELETE'});
}

function showToast(msg, dur=2200) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}
function showModal(html) {
  const mc = document.getElementById('modal-container');
  mc.innerHTML = `<div class="modal-overlay" id="modal-bg" onclick="closeModalOutside(event)">
    <div class="modal">
      <button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button>
      ${html}
    </div>
  </div>`;
}
function closeModal() { document.getElementById('modal-container').innerHTML=''; }
function closeModalOutside(e) { if(e.target.id==='modal-bg') closeModal(); }
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmt$(n) { return '$'+(+(n||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// Shared author list from HQ
async function loadSharedAuthors() {
  try {
    const data = await dbGet('authors');
    if (data) {
      return Object.values(data)
        .filter(a => a.status==='Confirmed'||a.status==='Asked')
        .map(a => a.name).sort();
    }
  } catch(e) {}
  return null;
}
