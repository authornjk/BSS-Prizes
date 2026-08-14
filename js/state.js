// state.js — prize data, Firebase sync, local cache
let _prizes = {};
let _meta   = { nextId:1, itemTypes:['Book','Bookish item','Clothing','Jewelry','Misc'] };
let _authors = [];

// ── Load ───────────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [prizes, meta, authors] = await Promise.all([
      dbGet('prizes'),
      dbGet('meta'),
      loadAuthorsFromHQ()
    ]);
    if (prizes && typeof prizes === 'object') {
      // Firebase converts integer keys to arrays - normalize to object keyed by id
      const normalized = {};
      const items = Array.isArray(prizes) ? prizes : Object.values(prizes);
      items.forEach(p => {
        if (p && p.id !== undefined) normalized[p.id] = p;
      });
      if (Object.keys(normalized).length > 0) {
        _prizes = normalized;
      }
    }
    if (meta && typeof meta === 'object') _meta = {..._meta, ...meta};
    if (authors && authors.length > 0) _authors = authors;
    saveBackup();
    updateSyncStatus('connected');
  } catch(e) {
    updateSyncStatus('error');
    console.error('loadAll failed:', e);
  }
}

// Load full photos for a single prize (called when viewing)
async function loadFullPhotos(id) {
  try {
    const fulls = await dbGet('photos/p_'+id);
    if (fulls && _prizes[id]) {
      _prizes[id].photos = fulls.map((full, i) => ({
        full,
        thumb: (_prizes[id].photos[i]?.thumb) || full
      }));
    }
  } catch(e) {}
}

// ── Getters ────────────────────────────────────────────────────────────────
function getPrizes()  { return Object.values(_prizes); }
function getPrize(id) { return _prizes[id] || null; }
function getAuthors() { return _authors; }
function getItemTypes() {
  return _meta.itemTypes || ['Book','Bookish item','Clothing','Jewelry','Misc'];
}

// ── Prize CRUD ────────────────────────────────────────────────────────────
async function addPrize(fields) {
  const id = _meta.nextId || 1;
  // Separate full photos from prize record — store only thumbs in prize
  const photos = fields.photos || [];
  const thumbsOnly = photos.map(p => ({thumb: p.thumb}));
  const prize = {
    id,
    name:        '',
    cat:         '',
    itemType:    'Misc',
    value:       0,
    paid:        0,
    qty:         '',
    loc:         '',
    notes:       '',
    donorType:   'none',
    donor:       '',
    donorWebsite:'',
    donorQRType: 'website',
    donorPronoun:'their',
    donorLogo:   '',
    photos:      thumbsOnly,  // thumbs only in main record
    needTag:     false,
    tagMade:     false,
    tagPrinted:  false,
    tagAttached: false,
    onTote:      false,
    tagGenerated:false,
    _created:    Date.now(),
    _mod:        Date.now(),
    ...fields,
    photos:      thumbsOnly,  // always override with thumbs only
  };
  _prizes[id] = {...prize, photos}; // keep full photos in local memory
  _meta.nextId = id+1;
  try {
    // Use string key "p_1" to prevent Firebase array conversion
    await dbSet('prizes/p_'+id, prize);
    if (photos.length > 0) {
      await dbSet('photos/p_'+id, photos.map(p => p.full));
    }
    await dbSet('meta/nextId', id+1);
    updateSyncStatus('connected');
    saveBackup();
    showToast('Prize saved ✓');
  } catch(e) {
    updateSyncStatus('error');
    showToast('Firebase error — check Settings.', 'error');
    console.error('addPrize error:', e);
  }
  return _prizes[id];
}

async function updatePrize(id, fields) {
  if (!_prizes[id]) return;
  const photos = fields.photos || _prizes[id].photos || [];
  const thumbsOnly = photos.map(p => ({thumb: p.thumb || p}));
  _prizes[id] = {..._prizes[id], ...fields, photos, _mod: Date.now()};
  const toSave  = {..._prizes[id], photos: thumbsOnly};
  try {
    // Save with p_ key (migrates old integer-keyed prizes to new format)
    await dbSet('prizes/p_'+id, toSave);
    // Delete old integer key if it existed
    try { await dbDelete('prizes/'+id); } catch(e) {}
    if (photos.some(p => p.full)) {
      await dbSet('photos/p_'+id, photos.map(p => p.full || p));
    }
    updateSyncStatus('connected');
  } catch(e) {
    updateSyncStatus('error');
    showToast('Firebase error — change stored locally only.', 'error');
  }
  return _prizes[id];
}

async function deletePrize(id) {
  delete _prizes[id];
  // Try both key formats (old prizes used integer keys, new ones use p_ prefix)
  try { await dbDelete('prizes/p_'+id); } catch(e) {}
  try { await dbDelete('prizes/'+id); } catch(e) {}
  // Also clean up photos
  try { await dbDelete('photos/p_'+id); } catch(e) {}
  try { await dbDelete('photos/'+id); } catch(e) {}
}

async function addItemType(name) {
  if (!_meta.itemTypes) _meta.itemTypes = ['Book','Bookish item','Clothing','Jewelry','Misc'];
  if (!_meta.itemTypes.includes(name)) {
    _meta.itemTypes.push(name);
    await dbSet('meta/itemTypes', _meta.itemTypes);
  }
}

// ── Sync poll ────────────────────────────────────────────────────────────
let _pollInterval = null;
// ── Backup / Restore ─────────────────────────────────────────────────────────
const BACKUP_KEY = 'soiree_prize_backup';

function saveBackup() {
  const backup = {
    prizes: _prizes,
    meta:   _meta,
    ts:     Date.now()
  };
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    // Also push to Firebase
    dbSet('backup/prizes', _prizes).catch(()=>{});
    dbSet('backup/meta',   _meta).catch(()=>{});
    dbSet('backup/ts',     Date.now()).catch(()=>{});
  } catch(e) {}
}

function getBackupInfo() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    return { ts: b.ts, count: Object.keys(b.prizes||{}).length };
  } catch(e) { return null; }
}

async function doBackup() {
  saveBackup();
  showToast('Backed up ' + Object.keys(_prizes).length + ' prizes ✓');
  renderPMSettings();
}

async function doRestore() {
  try {
    // Try Firebase backup first
    const [fbPrizes, fbMeta, fbTs] = await Promise.all([
      dbGet('backup/prizes'),
      dbGet('backup/meta'),
      dbGet('backup/ts')
    ]);
    if (fbPrizes && Object.keys(fbPrizes).length > 0) {
      const count = Object.keys(fbPrizes).length;
      const date = fbTs ? new Date(fbTs).toLocaleDateString() : 'unknown date';
      if (confirm('Restore ' + count + ' prizes from backup on ' + date + '?\n\nThis will overwrite your current prizes. Continue?')) {
        // Normalize
        const normalized = {};
        const items = Array.isArray(fbPrizes) ? fbPrizes : Object.values(fbPrizes);
        items.forEach(p => { if (p && p.id !== undefined) normalized[p.id] = p; });
        _prizes = normalized;
        if (fbMeta) Object.assign(_meta, fbMeta);
        // Write back to main prizes path
        await dbSet('prizes', Object.fromEntries(
          Object.entries(_prizes).map(([k,v]) => ['p_'+v.id, v])
        ));
        renderGoals();
        renderPrizes();
        showToast('Restored ' + Object.keys(_prizes).length + ' prizes ✓');
      }
      return;
    }
    // Fall back to localStorage backup
    const raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {
      const b = JSON.parse(raw);
      const count = Object.keys(b.prizes||{}).length;
      const date = new Date(b.ts).toLocaleDateString();
      if (confirm('Restore ' + count + ' prizes from local backup on ' + date + '?\n\nThis will overwrite your current prizes. Continue?')) {
        _prizes = b.prizes || {};
        if (b.meta) Object.assign(_meta, b.meta);
        renderGoals();
        renderPrizes();
        showToast('Restored ' + count + ' prizes ✓');
      }
      return;
    }
    showToast('No backup found', 'error');
  } catch(e) {
    showToast('Restore failed: ' + e.message, 'error');
  }
}

function updateSyncStatus(status) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  if (status === 'connected') {
    el.innerHTML = '<i class="ti ti-cloud-check" style="font-size:13px"></i> Synced';
    el.style.color = 'var(--green)';
  } else if (status === 'error') {
    el.innerHTML = '<i class="ti ti-cloud-off" style="font-size:13px"></i> Sync error';
    el.style.color = 'var(--red)';
  } else {
    el.innerHTML = '<i class="ti ti-refresh" style="font-size:13px;animation:spin 1s linear infinite"></i> Syncing…';
    el.style.color = 'var(--text3)';
  }
}

function startSync(onChange) {
  if (_pollInterval) clearInterval(_pollInterval);
  _pollInterval = setInterval(async () => {
    try {
      const [prizes, authors] = await Promise.all([
        dbGet('prizes'),
        loadAuthorsFromHQ()
      ]);
      // Only overwrite local prizes if Firebase actually has data
      // This prevents a failed write from being overwritten by empty Firebase
      if (prizes && Object.keys(prizes).length > 0) {
        _prizes = prizes;
      }
      if (authors && authors.length > 0) _authors = authors;
      onChange();
    } catch(e) {}
  }, 20000);
}
function stopSync() {
  if (_pollInterval) clearInterval(_pollInterval);
}
