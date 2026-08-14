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
    if (prizes && typeof prizes === 'object' && Object.keys(prizes).length > 0) {
      _prizes = prizes;
    }
    if (meta && typeof meta === 'object') _meta = {..._meta, ...meta};
    if (authors && authors.length > 0) _authors = authors;
    updateSyncStatus('connected');
  } catch(e) {
    updateSyncStatus('error');
    console.error('loadAll failed:', e);
  }
}

// Load full photos for a single prize (called when viewing)
async function loadFullPhotos(id) {
  try {
    const fulls = await dbGet('photos/'+id);
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
    // Save prize (thumbs only) to Firebase
    await dbSet('prizes/'+id, prize);
    // Save full photos separately
    if (photos.length > 0) {
      await dbSet('photos/'+id, photos.map(p => p.full));
    }
    await dbSet('meta/nextId', id+1);
    updateSyncStatus('connected');
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
    await dbSet('prizes/'+id, toSave);
    if (photos.some(p => p.full)) {
      await dbSet('photos/'+id, photos.map(p => p.full || p));
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
  await dbDelete('prizes/'+id);
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
