/**
 * state.js — all shared data + sync logic
 */

const DEFAULT_META = {
  eventName: 'Bookish Summer Soirée',
  eventYear: '2027',
  goals: { BINGO: 260, Raffle: 7, Medium: 10, Small: 10, 'SWAG Bag': 0, Unassigned: 0 },
  budgets: { BINGO: 0, Raffle: 0, 'SWAG Bag': 0 },
  authors: ['Jessica Scarlett', 'Aspen Hadley', 'Jentry Flint', 'Amanda P Jones', 'Sarah M Eden'],
  nextId: 1
};

const CATS = ['BINGO', 'Raffle', 'Medium', 'Small', 'SWAG Bag', 'Unassigned'];
const STAGES = ['tagMade', 'tagPrinted', 'tagAttached', 'onTote'];
const STAGE_LABELS = ['Tag made', 'Tag printed', 'Tag attached', 'On tote paper'];

let _prizes = [];
let _meta = {};
let _unsubPrizes = null;
let _unsubMeta = null;
let _newItemIds = new Set();
let _knownPrizeIds = new Set();
let _isFirstLoad = true;
let _onChangeCallback = null;

// ── Getters ─────────────────────────────────────────────────────────────────

function getPrizes() { return _prizes; }
function getMeta() { return _meta; }
function getNewItemIds() { return _newItemIds; }
function clearNewItemIds() { _newItemIds.clear(); }

// ── Load & subscribe ─────────────────────────────────────────────────────────

async function loadMeta() {
  try {
    const data = await dbGet('meta');
    _meta = data || JSON.parse(JSON.stringify(DEFAULT_META));
  } catch (e) {
    _meta = JSON.parse(JSON.stringify(DEFAULT_META));
  }
}

// Cached shared author list
let _sharedAuthors = null;

async function getAuthors() {
  if (_sharedAuthors) return _sharedAuthors;
  const fromDb = await loadSharedAuthors();
  if (fromDb) { _sharedAuthors = fromDb; return fromDb; }
  return _meta.authors || DEFAULT_META.authors;
}

async function startSync(onChange) {
  _onChangeCallback = onChange;

  // Meta sync
  _unsubMeta = await dbListen('meta', data => {
    _meta = data || JSON.parse(JSON.stringify(DEFAULT_META));
    if (_onChangeCallback) _onChangeCallback('meta');
  });

  // Prizes sync
  _unsubPrizes = await dbListen('prizes', data => {
    const arr = data ? Object.values(data) : [];

    if (!_isFirstLoad) {
      arr.forEach(p => {
        if (!_knownPrizeIds.has(p.id)) _newItemIds.add(p.id);
      });
    }

    _prizes = arr;
    _knownPrizeIds = new Set(arr.map(p => p.id));
    _isFirstLoad = false;

    if (_onChangeCallback) _onChangeCallback('prizes');
  });
}

function stopSync() {
  if (_unsubPrizes) { _unsubPrizes(); _unsubPrizes = null; }
  if (_unsubMeta) { _unsubMeta(); _unsubMeta = null; }
  _prizes = [];
  _meta = {};
  _isFirstLoad = true;
}

// ── Meta mutations ───────────────────────────────────────────────────────────

async function saveMeta(updatedMeta) {
  if (updatedMeta) _meta = updatedMeta;
  await dbSet('meta', _meta);
}

// ── Prize mutations ──────────────────────────────────────────────────────────

async function addPrize(prizeData) {
  const id = await dbIncrement('meta/nextId');
  const prize = {
    ...prizeData,
    id,
    addedBy: currentUser().displayName,
    updatedBy: currentUser().displayName,
    _mod: Date.now()
  };
  await dbSet('prizes/' + id, prize);
  return prize;
}

async function updatePrize(id, fields) {
  const prize = _prizes.find(p => p.id === id);
  if (!prize) return;
  const updated = { ...prize, ...fields, updatedBy: currentUser().displayName, _mod: Date.now() };
  await dbSet('prizes/' + id, updated);
}

async function deletePrize(id) {
  await dbSet('prizes/' + id, null);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLocs() {
  return [...new Set(_prizes.map(p => p.loc).filter(Boolean))].sort();
}

function getDonors() {
  return [...new Set(_prizes.map(p => p.donor).filter(Boolean))].sort();
}

function catClass(c) {
  const map = { BINGO: 'cat-BINGO', Raffle: 'cat-Raffle', Small: 'cat-Small', Medium: 'cat-Medium', 'SWAG Bag': 'cat-SWAG' };
  return map[c] || 'cat-Unassigned';
}

function tagDotClass(p) {
  if (!p.needTag) return 'td-no';
  if (STAGES.every(s => p[s])) return 'td-done';
  if (p.tagMade) return 'td-made';
  return 'td-yes';
}

function fmtMoney(n) {
  return n > 0 ? '$' + (+n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function compressPhoto(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 300;
      const scale = Math.min(max / img.width, max / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
