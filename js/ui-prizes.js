/**
 * ui-prizes.js — prize list, filtering, sorting, add/edit/delete
 */

let _sortKey = 'name';
let _selectedForBundle = new Set(); // prize ids selected for bundling
let _showBundled = false;           // whether to show bundled-into items
let _sortDir = 1;
let _donorTypeModal = 'author';

function initPrizeSortFromPrefs() {
  const prefs = getPrefs();
  _sortKey = prefs.sortKey || 'name';
  _sortDir = prefs.sortDir || 1;
}

function renderPrizesTab() {
  const prefs = getPrefs();
  const meta = getMeta();
  const defCat = prefs.defaultCat !== undefined ? prefs.defaultCat : (currentUser().defaultCat || '');

  return `
    <div id="bundle-bar" style="display:none;background:var(--purple-bg);border:1px solid var(--purple);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--purple-text);font-weight:500"><span id="bundle-count">0</span> items selected</span>
      <button class="btn primary" onclick="openBundleModal()" style="font-size:12px;padding:4px 10px"><i class="ti ti-package"></i> Bundle into one prize</button>
      <button class="btn" onclick="clearBundleSelection()" style="font-size:12px;padding:4px 10px">Cancel</button>
    </div>
    <div class="filter-bar">
      <input type="text" id="search" placeholder="Search prizes, donors, notes…" oninput="renderPrizes()">
      <select id="filter-cat" onchange="saveFilterPref();renderPrizes()">
        <option value="">All categories</option>
        ${CATS.map(c => `<option value="${c}"${c === defCat ? ' selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="filter-loc" onchange="renderPrizes()"><option value="">All locations</option></select>
      <select id="filter-donor" onchange="renderPrizes()"><option value="">All donors</option></select>
      <select id="filter-tag" onchange="renderPrizes()">
        <option value="">Any tag status</option>
        <option value="needed">Tag needed</option>
        <option value="made">Tag made</option>
        <option value="complete">All stages done</option>
        <option value="no">No tag needed</option>
      </select>
      <button class="add-btn" onclick="openAddPrizeModal()"><i class="ti ti-plus"></i> Add prize</button>
      <button class="add-btn" style="background:var(--purple-bg);color:var(--purple-text);border-color:var(--purple)" onclick="toggleBundleMode()"><i class="ti ti-package"></i> Bundle</button>
    </div>
    <div class="sort-row">
      <span class="sort-lbl">Sort:</span>
      ${['name','value','donor','cat','loc','paid','qty'].map(k =>
        `<button class="sort-btn${_sortKey === k ? ' active' : ''}" id="sort-${k}" onclick="setSort('${k}')">${
          {name:'Name',value:'Value',donor:'Donor',cat:'Category',loc:'Location',paid:'Paid',qty:'Qty'}[k]
        }</button>`
      ).join('')}
      <span class="result-count" id="result-count"></span>
    </div>
    <div class="prize-list" id="prize-list"></div>`;
}

function saveFilterPref() {
  const cat = (document.getElementById('filter-cat') || {}).value || '';
  const prefs = getPrefs();
  prefs.defaultCat = cat;
  savePrefs(prefs);
}

function updateFilterDropdowns() {
  const locSel = document.getElementById('filter-loc');
  if (locSel) {
    const cv = locSel.value;
    locSel.innerHTML = '<option value="">All locations</option>' +
      getLocs().map(l => `<option${l === cv ? ' selected' : ''}>${escHtml(l)}</option>`).join('');
  }
  const donSel = document.getElementById('filter-donor');
  if (donSel) {
    const cv = donSel.value;
    donSel.innerHTML = '<option value="">All donors</option>' +
      getDonors().map(d => `<option${d === cv ? ' selected' : ''}>${escHtml(d)}</option>`).join('');
  }
}

function filteredSortedPrizes() {
  const q = (document.getElementById('search') || {}).value?.toLowerCase() || '';
  const cat = (document.getElementById('filter-cat') || {}).value || '';
  const loc = (document.getElementById('filter-loc') || {}).value || '';
  const don = (document.getElementById('filter-donor') || {}).value || '';
  const tag = (document.getElementById('filter-tag') || {}).value || '';

  let list = getPrizes().filter(p => {
    const mq = !q || p.name.toLowerCase().includes(q) || (p.donor || '').toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q);
    const mc = !cat || p.cat === cat;
    const ml = !loc || p.loc === loc;
    const md = !don || p.donor === don;
    let mt = true;
    if (tag === 'needed') mt = p.needTag && !p.tagMade;
    if (tag === 'made') mt = p.needTag && p.tagMade;
    if (tag === 'complete') mt = p.needTag && STAGES.every(s => p[s]);
    if (tag === 'no') mt = !p.needTag;
    return mq && mc && ml && md && mt;
  });

  list.sort((a, b) => {
    let av = a[_sortKey] || '', bv = b[_sortKey] || '';
    if (['value', 'paid', 'qty'].includes(_sortKey)) {
      return ((+av || 0) - (+bv || 0)) * _sortDir;
    }
    return String(av).localeCompare(String(bv)) * _sortDir;
  });

  return list;
}

function setSort(k) {
  if (_sortKey === k) _sortDir *= -1; else { _sortKey = k; _sortDir = 1; }
  const prefs = getPrefs();
  prefs.sortKey = _sortKey;
  prefs.sortDir = _sortDir;
  savePrefs(prefs);
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('sort-' + k);
  if (btn) btn.classList.add('active');
  renderPrizes();
}

function renderPrizes() {
  updateFilterDropdowns();
  renderGoals();

  const list = filteredSortedPrizes();
  const prizes = getPrizes();
  const rc = document.getElementById('result-count');
  if (rc) rc.textContent = list.length !== prizes.length ? `${list.length} of ${prizes.length}` : `${prizes.length} prizes`;

  const el = document.getElementById('prize-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = prizes.length === 0
      ? `<div class="empty"><i class="ti ti-gift"></i><span style="font-weight:600">No prizes yet</span><span>Tap "Add prize" to get started</span></div>`
      : `<div class="empty"><i class="ti ti-search"></i><span>No prizes match your filters</span></div>`;
    return;
  }

  el.innerHTML = list.map(p => prizeCardHTML(p)).join('');

  const newIds = getNewItemIds();
  newIds.forEach(id => {
    const card = document.getElementById('pc-' + id);
    if (card) card.classList.add('new-item');
  });
  setTimeout(() => clearNewItemIds(), 3000);
}

function prizeCardHTML(p) {
  const stages = STAGES.map((s, i) =>
    `<button class="stg ${p[s] ? 'done' : ''}" onclick="toggleStage(${p.id},'${s}',event)">${STAGE_LABELS[i]}</button>`
  ).join('');

  const valTotal = (p.value || 0) * (p.qty || 1);
  const meta = getMeta();

  return `
    <div class="prize-card" id="pc-${p.id}">
      <div class="prize-row" onclick="toggleCard(${p.id})">
        <span class="cat-pill ${catClass(p.cat)}">${escHtml(p.cat)}</span>
        <span class="prize-name">${escHtml(p.name)}</span>
        <div class="prize-meta">
          ${p.qty > 1 ? `<span class="pmv">×${p.qty}</span>` : ''}
          ${p.value ? `<span class="pmv">${fmtMoney(p.value)}</span>` : ''}
          ${valTotal > 0 && p.qty > 1 ? `<span class="pmv" style="font-weight:600">${fmtMoney(valTotal)}</span>` : ''}
          ${p.donor ? `<span class="pmv">${escHtml(p.donor)}</span>` : ''}
          ${p.loc ? `<span class="pmv">${escHtml(p.loc)}</span>` : ''}
          <div class="tag-dot ${tagDotClass(p)}"></div>
          <i class="ti ti-chevron-down" id="chev-${p.id}" style="font-size:13px;color:var(--text3);transition:transform .2s"></i>
        </div>
      </div>
      <div class="prize-detail" id="det-${p.id}">
        <div class="det-grid">
          <div class="df">
            <label>Category</label>
            <select onchange="updatePrize(${p.id},{cat:this.value})">
              ${CATS.map(c => `<option${p.cat === c ? ' selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="df">
            <label>Location</label>
            <input type="text" value="${escHtml(p.loc || '')}" list="ll-${p.id}" onchange="updatePrize(${p.id},{loc:this.value})">
            <datalist id="ll-${p.id}">${getLocs().map(l => `<option value="${escHtml(l)}">`).join('')}</datalist>
          </div>
          <div class="df">
            <label>Quantity</label>
            <input type="number" min="0" value="${p.qty || 1}" onchange="updatePrize(${p.id},{qty:+this.value})">
          </div>
          <div class="df">
            <label>Value each ($)</label>
            <input type="number" step=".01" value="${p.value || ''}" onchange="updatePrize(${p.id},{value:+this.value})">
          </div>
          <div class="df">
            <label>Amount paid ($)</label>
            <input type="number" step=".01" value="${p.paid || ''}" onchange="updatePrize(${p.id},{paid:+this.value})">
          </div>
          <div class="df">
            <label>Donor</label>
            <input type="text" value="${escHtml(p.donor || '')}" list="al-${p.id}" onchange="updatePrize(${p.id},{donor:this.value})">
            <datalist id="al-${p.id}">${meta.authors.map(a => `<option value="${escHtml(a)}">`).join('')}</datalist>
          </div>
          <div class="df full">
            <label>Notes / tag instructions</label>
            <textarea onchange="updatePrize(${p.id},{notes:this.value})">${escHtml(p.notes || '')}</textarea>
          </div>
          <div class="df full">
            <label>Website / QR link</label>
            <input type="text" value="${escHtml(p.url || '')}" onchange="updatePrize(${p.id},{url:this.value})">
          </div>
        </div>

        <div style="margin-bottom:8px">
          <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;display:flex;align-items:center;gap:8px">
            Donation tag
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;text-transform:none;letter-spacing:0;cursor:pointer">
              <input type="checkbox" ${p.needTag ? 'checked' : ''} onchange="updatePrize(${p.id},{needTag:this.checked})">
              Needs tag
            </label>
          </div>
          ${p.needTag
            ? `<div class="stage-row">${stages}</div>`
            : `<span style="font-size:11px;color:var(--text3)">No tag required</span>`}
        </div>

        <div class="photo-area ${p.photo ? 'has-photo' : ''}" id="pa-${p.id}">
          <input type="file" accept="image/*" capture="environment" onchange="handlePhoto(${p.id},this)">
          ${p.photo
            ? `<img src="${p.photo}" alt="Prize photo">`
            : `<div class="photo-ph"><i class="ti ti-camera" style="font-size:20px"></i><span>Tap to add photo</span></div>`}
        </div>

        <div class="det-meta">
          ${p.addedBy ? `Added by ${escHtml(p.addedBy)}` : ''}
          ${p.updatedBy && p.updatedBy !== p.addedBy ? ` · Last edited by ${escHtml(p.updatedBy)}` : ''}
        </div>

        <div class="det-actions">
          ${isAdmin() || p.addedBy === currentUser().displayName
            ? `<button class="btn danger" onclick="doDeletePrize(${p.id})"><i class="ti ti-trash"></i> Delete</button>`
            : ''}
          <button class="btn primary" onclick="doSavePrize(${p.id})"><i class="ti ti-cloud-upload"></i> Save</button>
        </div>
      </div>
    </div>`;
}

function toggleCard(id) {
  const card = document.getElementById('pc-' + id);
  const chev = document.getElementById('chev-' + id);
  const open = card.classList.toggle('expanded');
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : 'rotate(0)';
}

async function toggleStage(id, stage, e) {
  e.stopPropagation();
  const p = getPrizes().find(x => x.id === id);
  if (!p) return;
  await updatePrize(id, { [stage]: !p[stage] });
}

async function doSavePrize(id) {
  // Fields already updated in-place via updatePrize calls; this just triggers a full re-save
  const p = getPrizes().find(x => x.id === id);
  if (!p) return;
  setSyncState('syncing');
  await updatePrize(id, {});
  setSyncState('live');
}

async function doDeletePrize(id) {
  if (!confirm('Delete this prize? This cannot be undone.')) return;
  await deletePrize(id);
}

async function handlePhoto(id, input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const compressed = await compressPhoto(e.target.result);
    const area = document.getElementById('pa-' + id);
    if (area) {
      area.classList.add('has-photo');
      area.innerHTML = `<input type="file" accept="image/*" capture="environment" onchange="handlePhoto(${id},this)"><img src="${compressed}" alt="Prize photo">`;
    }
    await updatePrize(id, { photo: compressed });
  };
  reader.readAsDataURL(input.files[0]);
}

// ── Add prize modal ──────────────────────────────────────────────────────────

function openAddPrizeModal() {
  _donorTypeModal = 'author';
  const meta = getMeta();
  showModal(`
    <h3>Add new prize</h3>
    <div class="m-grid">
      <div class="mf full"><label>Prize name / description</label><input type="text" id="mn" placeholder="e.g. Signed copy of…"></div>
      <div class="mf"><label>Category</label><select id="mc">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="mf"><label>Quantity</label><input type="number" id="mq" value="1" min="0"></div>
      <div class="mf"><label>Paid ($)</label><input type="number" id="mpaid" placeholder="0.00" step=".01"></div>
      <div class="mf"><label>Value each ($)</label><input type="number" id="mv" placeholder="0.00" step=".01"></div>
      <div class="mf"><label>Location</label><input type="text" id="ml" list="mll" placeholder="e.g. Nicole's house"><datalist id="mll">${getLocs().map(l => `<option value="${escHtml(l)}">`).join('')}</datalist></div>
      <div class="mf full">
        <label>Donor type</label>
        <div class="donor-toggle">
          <button class="dt-opt active" id="dt-author" onclick="setDonorType('author')">Author</button>
          <button class="dt-opt" id="dt-business" onclick="setDonorType('business')">Business</button>
          <button class="dt-opt" id="dt-none" onclick="setDonorType('none')">Not donated</button>
        </div>
        <div id="dt-author-f"><label>Author</label><select id="mauth"><option value="">— select —</option>${meta.authors.map(a => `<option>${escHtml(a)}</option>`).join('')}</select></div>
        <div id="dt-biz-f" style="display:none"><label>Business name</label><input type="text" id="mbiz" placeholder="e.g. Litograph.com"></div>
      </div>
      <div class="mf full"><label>Notes</label><textarea id="mnotes" rows="2"></textarea></div>
      <div class="mf"><label>Website / QR</label><input type="text" id="murl" placeholder="https://…"></div>
      <div class="mf"><label>Needs tag?</label><select id="mtag"><option value="no">No</option><option value="yes">Yes</option></select></div>
    </div>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="doAddPrize()"><i class="ti ti-plus"></i> Add prize</button>
    </div>`);
}

function setDonorType(t) {
  _donorTypeModal = t;
  ['author', 'business', 'none'].forEach(x => {
    const b = document.getElementById('dt-' + x);
    if (b) b.classList.toggle('active', x === t);
  });
  const af = document.getElementById('dt-author-f');
  const bf = document.getElementById('dt-biz-f');
  if (af) af.style.display = t === 'author' ? 'block' : 'none';
  if (bf) bf.style.display = t === 'business' ? 'block' : 'none';
}

async function doAddPrize() {
  const name = (document.getElementById('mn') || {}).value?.trim();
  if (!name) { alert('Please enter a prize name.'); return; }

  const donor = _donorTypeModal === 'author'
    ? (document.getElementById('mauth') || {}).value || ''
    : _donorTypeModal === 'business'
      ? (document.getElementById('mbiz') || {}).value || ''
      : '';

  setSyncState('syncing');
  await addPrize({
    cat: document.getElementById('mc').value,
    name,
    qty: +(document.getElementById('mq').value) || 1,
    paid: +(document.getElementById('mpaid').value) || 0,
    value: +(document.getElementById('mv').value) || 0,
    loc: document.getElementById('ml').value,
    donor,
    donorType: _donorTypeModal,
    notes: document.getElementById('mnotes').value,
    url: document.getElementById('murl').value,
    needTag: document.getElementById('mtag').value === 'yes',
    tagMade: false, tagPrinted: false, tagAttached: false, onTote: false,
    photo: null
  });
  setSyncState('live');
  closeModal();
}

// ── Bundle prizes feature ─────────────────────────────────────────────────────

let _bundleMode = false;

function toggleBundleMode() {
  _bundleMode = !_bundleMode;
  _selectedForBundle.clear();
  renderPrizes();
  updateBundleBar();
}

function clearBundleSelection() {
  _bundleMode = false;
  _selectedForBundle.clear();
  renderPrizes();
  updateBundleBar();
}

function updateBundleBar() {
  const bar = document.getElementById('bundle-bar');
  if (!bar) return;
  if (_bundleMode && _selectedForBundle.size > 0) {
    bar.style.display = 'flex';
    const countEl = document.getElementById('bundle-count');
    if (countEl) countEl.textContent = _selectedForBundle.size;
  } else {
    bar.style.display = 'none';
  }
}

function toggleBundleSelect(id, e) {
  e.stopPropagation();
  if (_selectedForBundle.has(id)) {
    _selectedForBundle.delete(id);
  } else {
    _selectedForBundle.add(id);
  }
  updateBundleBar();
  // Just update the checkbox visually without full re-render
  const cb = document.getElementById('bsel-' + id);
  if (cb) cb.checked = _selectedForBundle.has(id);
}

function openBundleModal() {
  if (_selectedForBundle.size < 2) {
    alert('Please select at least 2 items to bundle together.');
    return;
  }

  const prizes    = getPrizes();
  const selected  = prizes.filter(p => _selectedForBundle.has(p.id));
  const totalVal  = selected.reduce((s, p) => s + ((+p.value || 0) * (+p.qty || 1)), 0);
  const totalPaid = selected.reduce((s, p) => s + (+p.paid || 0), 0);

  // Suggest a name from items
  const suggestedName = selected.map(p => p.name).join(' + ').slice(0, 80);

  showModal(`
    <h3>Bundle ${selected.length} items into one prize</h3>
    <div style="background:var(--bg2);border-radius:var(--radius-sm);padding:10px;margin-bottom:12px;max-height:160px;overflow-y:auto">
      ${selected.map(p => `<div style="font-size:12px;padding:3px 0;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between">
        <span>${escHtml(p.name)}</span>
        <span style="color:var(--text2);margin-left:8px">${p.value ? '$' + (+p.value).toFixed(2) : '—'}</span>
      </div>`).join('')}
      <div style="font-size:12px;font-weight:600;padding:5px 0;display:flex;justify-content:space-between">
        <span>Combined value</span><span style="color:var(--green)">$${totalVal.toFixed(2)}</span>
      </div>
    </div>
    <div class="field"><label>Bundle prize name</label>
      <input type="text" id="bn-name" value="${escHtml(suggestedName)}" placeholder="e.g. Book Lover Bundle">
    </div>
    <div class="field"><label>Category for combined prize</label>
      <select id="bn-cat">
        ${['BINGO','Raffle','Medium','Small','SWAG Bag','Unassigned'].map(c => `<option${c==='BINGO'?' selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Location</label>
      <input type="text" id="bn-loc" placeholder="Where will the bundle be kept?" list="bn-loc-list">
      <datalist id="bn-loc-list">${[...new Set(getPrizes().map(p=>p.loc).filter(Boolean))].map(l=>`<option value="${escHtml(l)}">`).join('')}</datalist>
    </div>
    <div class="field"><label>Notes (optional)</label>
      <textarea id="bn-notes" rows="2" placeholder="Any notes about this bundle…"></textarea>
    </div>
    <div style="font-size:11px;color:var(--text2);background:var(--bg2);padding:8px;border-radius:var(--radius-sm);margin-bottom:8px">
      The ${selected.length} original items will be kept but marked as "Bundled into [this prize name]". You can still see them with the "Show bundled" filter.
    </div>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="doBundle(${ totalVal.toFixed(2) }, ${totalPaid.toFixed(2)})">
        <i class="ti ti-package"></i> Create bundle
      </button>
    </div>`);
  setTimeout(() => {
    const n = document.getElementById('bn-name');
    if (n) { n.focus(); n.select(); }
  }, 50);
}

async function doBundle(totalVal, totalPaid) {
  const name = document.getElementById('bn-name')?.value?.trim();
  if (!name) { alert('Please enter a name for the bundle.'); return; }

  const cat   = document.getElementById('bn-cat')?.value || 'BINGO';
  const loc   = document.getElementById('bn-loc')?.value?.trim() || '';
  const notes = document.getElementById('bn-notes')?.value?.trim() || '';

  const selectedIds = [..._selectedForBundle];
  const prizes      = getPrizes();
  const selected    = prizes.filter(p => selectedIds.includes(p.id));

  // Gather donors (unique)
  const donors = [...new Set(selected.map(p => p.donor).filter(Boolean))];

  // Create the bundle prize
  const bundlePrize = await addPrize({
    cat,
    name,
    qty: 1,
    paid: +totalPaid,
    value: +totalVal,
    loc,
    donor: donors.join(', '),
    donorType: donors.length === 1
      ? (selected.find(p=>p.donor===donors[0])?.donorType || 'business')
      : 'business',
    notes: notes || `Bundle of ${selected.length} items: ${selected.map(p=>p.name).join(', ')}`,
    url: '',
    needTag: true,
    tagMade: false, tagPrinted: false, tagAttached: false, onTote: false,
    photo: null,
    isBundle: true,
    bundleContains: selectedIds,
  });

  // Mark originals as bundled
  for (const p of selected) {
    await updatePrize(p.id, {
      bundledInto: bundlePrize.id,
      bundledIntoName: name,
      cat: p.cat, // keep original category
    });
  }

  closeModal();
  clearBundleSelection();
  showToast(`Bundle "${name}" created from ${selected.length} items`);
}

// Override filteredSortedPrizes to handle bundled items
const _origFilterSort = filteredSortedPrizes;
filteredSortedPrizes = function() {
  let list = _origFilterSort();
  // Unless "show bundled" filter is on, hide items that are bundled into something else
  const tag = (document.getElementById('filter-tag')||{}).value || '';
  if (tag !== 'bundled') {
    list = list.filter(p => !p.bundledInto);
  }
  return list;
};

// Patch filter-tag options to include bundled filter (called after DOM ready)
function patchFilterTagOptions() {
  const sel = document.getElementById('filter-tag');
  if (!sel) return;
  if (!sel.querySelector('option[value="bundled"]')) {
    const opt = document.createElement('option');
    opt.value = 'bundled';
    opt.textContent = 'Show bundled items';
    sel.appendChild(opt);
  }
}

// Patch prizeCardHTML to show bundle UI
const _origPrizeCardHTML = prizeCardHTML;
prizeCardHTML = function(p) {
  let html = _origPrizeCardHTML(p);

  // Add bundle checkbox if in bundle mode
  if (_bundleMode && !p.bundledInto && !p.isBundle) {
    const checked = _selectedForBundle.has(p.id);
    html = html.replace(
      `<div class="prize-card" id="pc-${p.id}">`,
      `<div class="prize-card" id="pc-${p.id}" style="border-color:${checked?'var(--purple)':''}">
        <div style="position:absolute;top:10px;right:10px;z-index:2">
          <input type="checkbox" id="bsel-${p.id}" ${checked?'checked':''} style="width:16px;height:16px;accent-color:var(--purple);cursor:pointer"
            onchange="toggleBundleSelect(${p.id},event)">
        </div>`
    ).replace(`<div class="prize-card" id="pc-${p.id}">`, `<div class="prize-card" id="pc-${p.id}" style="position:relative;${checked?'border-color:var(--purple);border-width:1.5px':''}">
        <div style="position:absolute;top:10px;right:10px;z-index:2">
          <input type="checkbox" id="bsel-${p.id}" ${checked?'checked':''} style="width:16px;height:16px;accent-color:var(--purple);cursor:pointer"
            onchange="toggleBundleSelect(${p.id},event)">
        </div>`);
  }

  // Show bundle badge on bundle prizes
  if (p.isBundle && p.bundleContains) {
    const count = p.bundleContains.length;
    html = html.replace(
      escHtml(p.cat) + '</span>',
      escHtml(p.cat) + `</span> <span style="font-size:10px;background:var(--purple-bg);color:var(--purple-text);padding:1px 6px;border-radius:10px;font-weight:600"><i class="ti ti-package" style="font-size:10px"></i> Bundle of ${count}</span>`
    );
  }

  // Show "bundled into" badge on original items (only shown with filter)
  if (p.bundledInto && p.bundledIntoName) {
    html = html.replace(
      escHtml(p.cat) + '</span>',
      escHtml(p.cat) + `</span> <span style="font-size:10px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:10px"><i class="ti ti-link" style="font-size:10px"></i> In: ${escHtml(p.bundledIntoName)}</span>`
    );
  }

  return html;
};

// Call patch after each render
const _origRenderPrizes = renderPrizes;
renderPrizes = function() {
  _origRenderPrizes();
  patchFilterTagOptions();
};
