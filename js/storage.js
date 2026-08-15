// storage.js — Firebase + helpers
window.FIREBASE_DB_URL = localStorage.getItem('soiree_firebase_url') || 'https://soiree-prizes-2027-default-rtdb.firebaseio.com';

async function dbGet(path) {
  if (!window.FIREBASE_DB_URL) return null;
  try {
    const res = await fetch(`${window.FIREBASE_DB_URL}/${path}.json`);
    return res.ok ? res.json() : null;
  } catch(e) { return null; }
}
async function dbSet(path, data) {
  if (!window.FIREBASE_DB_URL) {
    throw new Error('No Firebase URL configured');
  }
  const res = await fetch(`${window.FIREBASE_DB_URL}/${path}.json`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error('Firebase write failed: ' + res.status);
  }
  return res;
}
async function dbDelete(path) {
  if (!window.FIREBASE_DB_URL) return;
  try {
    await fetch(`${window.FIREBASE_DB_URL}/${path}.json`, {method:'DELETE'});
  } catch(e) {}
}

// ── Image compression ────────────────────────────────────────────────────────
function compressImage(file, maxWidth=1000, quality=0.65) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h*maxWidth/w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function makeThumbnail(dataUrl, maxWidth=150, quality=0.5) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h*maxWidth/w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmt$(n) {
  return '$'+(+(n||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function showToast(msg, type='success') {
  let t = document.getElementById('toast');
  if (!t) { t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.background = type==='error' ? '#D94040' : '#1D9E75';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function showModal(html) {
  const mc = document.getElementById('modal-container');
  if (!mc) return;
  mc.innerHTML = `<div class="modal-overlay" id="modal-bg" onclick="closeModalOutside(event)">
    <div class="modal">
      <button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button>
      ${html}
    </div>
  </div>`;
}
function closeModal() {
  // If a "remove from bundle" flow is mid-way (e.g. someone tapped the X or
  // clicked outside instead of the flow's own Cancel button), route through
  // its cancel handler first so an in-progress Edit Bundle rename/category
  // change gets restored instead of silently discarded.
  if (typeof _removeFlow !== 'undefined' && _removeFlow && typeof cancelRemoveFlow === 'function') {
    cancelRemoveFlow();
    return;
  }
  const mc = document.getElementById('modal-container');
  if (mc) mc.innerHTML = '';
  // Always reset prize edit state when modal closes
  if (typeof _editMode !== 'undefined')       _editMode = false;
  if (typeof _currentPrizeId !== 'undefined') _currentPrizeId = 0;
}
function closeModalOutside(e) { /* no-op: clicking outside a modal no longer closes it — use the X or Cancel/Save buttons */ }

async function loadAuthorsFromHQ() {
  try {
    const data = await dbGet('authors');
    if (data) {
      return Object.values(data)
        .filter(a => a && a.name && (a.status==='Confirmed'||a.status==='Asked'))
        .map(a => a.name).sort();
    }
  } catch(e) {}
  return [];
}
