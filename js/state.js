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
    cat:         'BINGO',
    itemType:    'Misc',
    value:       0,
    paid:        0,
    qty:         1,
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
  await dbSet('prizes/'+id, prize);
  await dbSet('meta/nextId', id+1);
  _meta.nextId = id+1;
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
    const [prizes, authors] = await Promise.all([
      dbGet('prizes'),
      loadAuthorsFromHQ()
    ]);
    _prizes  = prizes || {};
    _authors = authors;
    onChange();
  }, 20000); // poll every 20 seconds
}
function stopSync() {
  if (_pollInterval) clearInterval(_pollInterval);
}
