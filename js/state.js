// state.js — prize data, Firebase sync, local cache
let _prizes = {};
let _meta   = { nextId:1, itemTypes:['Book','Bookish item','Clothing','Jewelry','Misc'] };
let _authors = [];

// ── Load ───────────────────────────────────────────────────────────────────
async function loadAll() {
  const [prizes, meta, authors] = await Promise.all([
    dbGet('prizes'),
    dbGet('meta'),
    loadAuthorsFromHQ()
  ]);
  _prizes  = prizes || {};
  if (meta) _meta = {..._meta, ...meta};
  _authors = authors;
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
    photos:      [],   // array of {full: base64, thumb: base64}
    needTag:     false,
    tagMade:     false,
    tagPrinted:  false,
    tagAttached: false,
    onTote:      false,
    tagGenerated:false,
    _created:    Date.now(),
    _mod:        Date.now(),
    ...fields
  };
  _prizes[id] = prize;
  _meta.nextId = id+1;
  try {
    await dbSet('prizes/'+id, prize);
    await dbSet('meta/nextId', id+1);
  } catch(e) {
    showToast('Warning: prize saved locally but Firebase sync failed. Check connection.', 'error');
  }
  return prize;
}

async function updatePrize(id, fields) {
  if (!_prizes[id]) return;
  _prizes[id] = {..._prizes[id], ...fields, _mod: Date.now()};
  await dbSet('prizes/'+id, _prizes[id]);
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
