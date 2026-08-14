// prizes.js — prize list, add/edit modal, photo handling

var _filterCat    = '';
var _filterDonor  = '';
var _searchQ      = '';
var _prizeDebounce = null;
var _pendingPhotos = []; // photos staged during add/edit

// ── Bundle state ──────────────────────────────────────────────────────────────
var _bundleMode    = false;   // are we currently building a bundle?
var _bundleAnchor  = null;    // id of the prize that started the bundle
var _bundleSelected = new Set(); // ids selected for current bundle

const CATEGORIES = ['BINGO','Raffle','Medium','Small','SWAG Bag'];

function renderPrizes() {
  const el = document.getElementById('prizes-content');
  if (!el) return;

  let list = getPrizes().filter(p => p && p.id !== undefined && !p.isBundle);

  // Search
  if (_searchQ.trim()) {
    const q = _searchQ.toLowerCase();
    list = list.filter(p =>
      (p.name||'').toLowerCase().includes(q) ||
      (p.donor||'').toLowerCase().includes(q) ||
      (p.cat||'').toLowerCase().includes(q) ||
      (p.notes||'').toLowerCase().includes(q)
    );
  }
  if (_filterCat)   list = list.filter(p => p.cat === _filterCat);
  if (_filterDonor) list = list.filter(p => p.donorType === _filterDonor);

  // Sort by category then name
  list.sort((a,b) => {
    const ci = CATEGORIES.indexOf(a.cat) - CATEGORIES.indexOf(b.cat);
    return ci !== 0 ? ci : (a.name||'').localeCompare(b.name||'');
  });

  const allPrizes = getPrizes();
  const bundles = allPrizes.filter(p => p.isBundle);
  const bundleBar = _bundleMode ? `
    <div style="background:var(--purple-bg);border:.5px solid var(--purple);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;color:var(--purple-text);margin-bottom:6px">
        <i class="ti ti-packages"></i> Building bundle — ${_bundleSelected.size} items selected
      </div>
      <div style="font-size:12px;color:var(--purple-text);margin-bottom:8px">Tap prizes below to add them to this bundle.</div>
      <div style="display:flex;gap:8px">
        <button class="btn primary" onclick="finishBundle()" style="background:var(--purple);color:white;border-color:var(--purple)">
          <i class="ti ti-check"></i> Done — Name bundle
        </button>
        <button class="btn" onclick="cancelBundle()">Cancel</button>
      </div>
    </div>` : '';

  el.innerHTML = bundleBar + `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div style="font-size:13px;color:var(--text2)">${list.length} prizes · ${bundles.length} bundles</div>
      <button class="btn primary" onclick="openAddPrize()"><i class="ti ti-plus"></i> Add prize</button>
    </div>

    <div style="margin-bottom:8px">
      <input type="text" id="prize-search" value="${escHtml(_searchQ)}"
        placeholder="Search prizes, donors, notes…"
        style="width:100%;font-size:13px;padding:8px 12px"
        oninput="debouncePrizeSearch(this.value)">
    </div>

    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
      <button class="cat-btn${!_filterCat?' active':''}" onclick="_filterCat='';renderPrizes()">All</button>
      ${CATEGORIES.map(c => `<button class="cat-btn${_filterCat===c?' active':''}" onclick="_filterCat='${c}';renderPrizes()">${c}</button>`).join('')}
    </div>

    <div style="display:flex;flex-direction:column;gap:8px">
      ${list.map(p => prizeCard(p)).join('')}
      ${list.length===0?'<div style="text-align:center;padding:3rem;color:var(--text3)">No prizes found.</div>':''}
    </div>
    <div style="height:300px"></div>`;
}

function debouncePrizeSearch(val) {
  _searchQ = val;
  clearTimeout(_prizeDebounce);
  _prizeDebounce = setTimeout(renderPrizes, 150);
}

function prizeCard(p) {
  const thumb = p.photos && p.photos[0] ? p.photos[0].thumb : null;
  const tagStage = p.tagGenerated ? '✓ Tagged' :
                   p.onTote       ? '4. On tote' :
                   p.tagAttached  ? '3. Attached' :
                   p.tagPrinted   ? '2. Printed' :
                   p.tagMade      ? '1. Made' : '';

  const isBundled  = !!p.bundledInto;
  const isSelected = _bundleSelected.has(p.id);
  const isAnchor   = _bundleAnchor === p.id;

  // In bundle mode: clicking selects/deselects (unless it's in another bundle)
  const clickFn = _bundleMode
    ? (isBundled && !isAnchor ? '' : `toggleBundleSelect(${p.id})`)
    : `openEditPrize(${p.id})`;

  const cardStyle = isBundled
    ? 'opacity:0.5;background:var(--bg2)'
    : isSelected || isAnchor
      ? 'border-color:var(--purple);background:var(--purple-bg)'
      : 'background:var(--bg)';

  const bundleLabel = isBundled
    ? `<div style="text-align:right;font-size:10px;color:var(--text3);margin-top:4px;font-style:italic">Bundled with ${escHtml(p.bundledInto)}</div>`
    : '';

  const bundleCheckbox = _bundleMode && !isBundled
    ? `<div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isSelected||isAnchor?'var(--purple)':'var(--border2)'};background:${isSelected||isAnchor?'var(--purple)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${isSelected||isAnchor?'<i class="ti ti-check" style="font-size:12px;color:white"></i>':''}
       </div>`
    : '';

  const bundleBtn = !_bundleMode && !isBundled
    ? `<button onclick="event.stopPropagation();startBundle(${p.id})"
        style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--text3);cursor:pointer;white-space:nowrap;font-family:inherit">
        <i class="ti ti-packages" style="font-size:10px"></i> Bundle
       </button>`
    : '';

  return `<div class="prize-card" style="${cardStyle}" onclick="${clickFn}">
    <div style="display:flex;gap:10px;align-items:flex-start">
      ${bundleCheckbox}
      ${thumb
        ? `<img src="${thumb}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer"
             onclick="event.stopPropagation();viewPhoto(${p.id},0)">`
        : `<div style="width:60px;height:60px;border-radius:6px;background:var(--bg2);border:.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="event.stopPropagation();openEditPrize(${p.id})">
             <i class="ti ti-photo" style="font-size:20px;color:var(--text3)"></i>
           </div>`}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
          <span class="cat-pill cat-${(p.cat||'').toLowerCase().replace(' ','-')}">${escHtml(p.cat||'')}</span>
          <span style="font-size:10px;color:var(--text3)">${escHtml(p.itemType||'')}</span>
        </div>
        <div style="font-size:14px;font-weight:600">${escHtml(p.name||'Unnamed prize')}</div>
        ${p.donor?`<div style="font-size:11px;color:var(--purple-text);margin-top:2px">
          <i class="ti ti-user" style="font-size:10px"></i> ${escHtml(p.donor)}
        </div>`:''}
        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap">
          ${p.value?`<span style="font-size:11px;color:var(--text2)">Est ${fmt$(p.value)}</span>`:''}
          ${p.paid?`<span style="font-size:11px;color:var(--amber)">Paid ${fmt$(p.paid)}</span>`:''}
          ${p.qty>1?`<span style="font-size:11px;color:var(--text2)">×${p.qty}</span>`:''}
          ${tagStage?`<span style="font-size:10px;color:var(--green)">${tagStage}</span>`:''}
        </div>
        ${p.notes?`<div style="font-size:11px;color:var(--text3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.notes)}</div>`:''}
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        ${bundleBtn}
        <i class="ti ti-chevron-right" style="font-size:14px;color:var(--text3)"></i>
      </div>
    </div>
    ${bundleLabel}
    ${p.photos && p.photos.length > 1 ? `
      <div style="display:flex;gap:4px;margin-top:8px;padding-left:70px;overflow-x:auto">
        ${p.photos.slice(1,5).map((ph,i) =>
          `<img src="${ph.thumb}" style="width:44px;height:44px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer"
            onclick="event.stopPropagation();viewPhoto(${p.id},${i+1})">`
        ).join('')}
        ${p.photos.length > 5 ? `<div style="width:44px;height:44px;border-radius:4px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text2)">+${p.photos.length-5}</div>` : ''}
      </div>` : ''}
  </div>`;
}

// ── Bundle card ───────────────────────────────────────────────────────────────
function bundleCard(b) {
  const items = getPrizes().filter(p => p.bundledInto === b.name);
  const thumbs = items.flatMap(p => p.photos||[]).slice(0,4);
  const isExpanded = b._expanded;

  let photoGrid = '';
  if (thumbs.length === 0) {
    photoGrid = '<div style="width:70px;height:70px;border-radius:8px;background:var(--bg2);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-packages" style="font-size:24px;color:var(--text3)"></i></div>';
  } else if (thumbs.length === 1) {
    photoGrid = '<img src="'+thumbs[0].thumb+'" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0">';
  } else {
    const sz = thumbs.length >= 4 ? 33 : thumbs.length === 3 ? 33 : 33;
    photoGrid = '<div style="width:70px;height:70px;display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:8px;overflow:hidden;flex-shrink:0">' +
      thumbs.slice(0,4).map(ph => '<img src="'+ph.thumb+'" style="width:100%;height:100%;object-fit:cover">').join('') +
    '</div>';
  }

  let itemsHtml = '';
  if (isExpanded) {
    itemsHtml = '<div style="margin-top:10px;border-top:.5px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:6px">' +
      items.map(p =>
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)">' +
          (p.photos&&p.photos[0] ? '<img src="'+p.photos[0].thumb+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0">' : '<div style="width:36px;height:36px;border-radius:4px;background:var(--bg3);flex-shrink:0"></div>') +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:12px;font-weight:500">'+escHtml(p.name||'')+'</div>' +
            '<div style="font-size:10px;color:var(--text3)">'+escHtml(p.cat||'')+' · '+escHtml(p.itemType||'')+'</div>' +
          '</div>' +
          '<button onclick="event.stopPropagation();removeFromBundle('+p.id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--text3);cursor:pointer;font-family:inherit">Remove</button>' +
        '</div>'
      ).join('') +
    '</div>';
  }

  return '<div class="prize-card" style="border-color:var(--purple);background:var(--bg)">' +
    '<div style="display:flex;gap:10px;align-items:flex-start" onclick="toggleBundleExpand('+b.id+')">' +
      photoGrid +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
          '<span class="cat-pill cat-'+(b.cat||'').toLowerCase().replace(' ','-')+'">'+escHtml(b.cat||'Bundle')+'</span>' +
          '<span style="font-size:10px;background:var(--purple-bg);color:var(--purple-text);padding:1px 6px;border-radius:8px;font-weight:500"><i class="ti ti-packages" style="font-size:9px"></i> Bundle</span>' +
        '</div>' +
        '<div style="font-size:14px;font-weight:700">'+escHtml(b.name||'Bundle')+'</div>' +
        '<div style="font-size:11px;color:var(--text2);margin-top:2px">'+items.length+' items</div>' +
        (b.value ? '<div style="font-size:11px;color:var(--text2)">Est '+fmt$(b.value)+'</div>' : '') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' +
        '<button onclick="event.stopPropagation();openEditBundle('+b.id+')" style="font-size:11px;padding:3px 8px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--text2);cursor:pointer;font-family:inherit"><i class="ti ti-pencil" style="font-size:11px"></i> Edit</button>' +
        '<i class="ti ti-chevron-'+(isExpanded?'up':'down')+'" style="font-size:14px;color:var(--text3)"></i>' +
      '</div>' +
    '</div>' +
    itemsHtml +
  '</div>';
}

async function toggleBundleExpand(id) {
  const b = getPrize(id);
  if (b) {
    await updatePrize(id, {_expanded: !b._expanded});
    renderPrizes();
  }
}

async function removeFromBundle(prizeId) {
  const p = getPrize(prizeId);
  if (!p) return;
  const choice = confirm('Remove this prize from the bundle?\n\nOK = Put back as individual prize\nCancel = Keep in bundle');
  if (choice) {
    await updatePrize(prizeId, {bundledInto: null});
    showToast(p.name+' removed from bundle');
    renderPrizes();
  }
}

// ── Bundle building ───────────────────────────────────────────────────────────
function startBundle(anchorId) {
  _bundleMode = true;
  _bundleAnchor = anchorId;
  _bundleSelected = new Set([anchorId]);
  renderPrizes();
  // Scroll to top so user sees the bundle bar
  window.scrollTo(0,0);
}

function toggleBundleSelect(id) {
  if (!_bundleMode) return;
  if (id === _bundleAnchor) return; // anchor always selected
  if (_bundleSelected.has(id)) {
    _bundleSelected.delete(id);
  } else {
    _bundleSelected.add(id);
  }
  renderPrizes();
}

function cancelBundle() {
  _bundleMode = false;
  _bundleAnchor = null;
  _bundleSelected = new Set();
  renderPrizes();
}

function finishBundle() {
  if (_bundleSelected.size < 2) {
    showToast('Select at least 2 prizes to bundle', 'error');
    return;
  }
  // Show naming modal
  const mc = document.getElementById('modal-container');
  mc.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-bg';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  const box = document.createElement('div');
  box.className = 'modal';
  const h3 = document.createElement('h3');
  h3.textContent = 'Name this bundle';
  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px;color:var(--text2);margin-bottom:12px';
  sub.textContent = _bundleSelected.size+' prizes selected';

  const nameField = document.createElement('div');
  nameField.className = 'field';
  nameField.innerHTML = '<label>Bundle name</label><input type="text" id="bundle-name" placeholder="e.g. Dream book set" style="width:100%">';

  const catField = document.createElement('div');
  catField.className = 'field';
  catField.innerHTML = '<label>Category</label><select id="bundle-cat" style="width:100%">' +
    CATEGORIES.map(c => '<option>'+c+'</option>').join('') + '</select>';

  const actions = document.createElement('div');
  actions.className = 'm-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => { overlay.remove(); cancelBundle(); };
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.innerHTML = '<i class="ti ti-packages"></i> Create bundle';
  saveBtn.onclick = createBundle;
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  box.appendChild(h3);
  box.appendChild(sub);
  box.appendChild(nameField);
  box.appendChild(catField);
  box.appendChild(actions);
  overlay.appendChild(box);
  mc.appendChild(overlay);
  setTimeout(() => document.getElementById('bundle-name')?.focus(), 50);
}

async function createBundle() {
  const name = document.getElementById('bundle-name')?.value?.trim();
  if (!name) { showToast('Please enter a bundle name', 'error'); return; }
  const cat = document.getElementById('bundle-cat')?.value || 'BINGO';

  // Calculate total value from selected prizes
  const selectedPrizes = [..._bundleSelected].map(id => getPrize(id)).filter(Boolean);
  const totalValue = selectedPrizes.reduce((s,p) => s+(+p.value||0), 0);
  const totalPaid  = selectedPrizes.reduce((s,p) => s+(+p.paid||0), 0);

  // Create the bundle as a prize
  const bundle = await addPrize({
    name,
    cat,
    isBundle: true,
    bundleItems: [..._bundleSelected],
    value: totalValue,
    paid:  totalPaid,
    itemType: 'Bundle',
    photos: selectedPrizes.flatMap(p => p.photos||[]).slice(0,4),
    qty: 1,
    notes: 'Bundle of '+selectedPrizes.length+' items: '+selectedPrizes.map(p=>p.name).join(', '),
    _expanded: false,
  });

  // Mark all selected prizes as bundled
  for (const id of _bundleSelected) {
    await updatePrize(id, {bundledInto: name});
  }

  // Close modal and exit bundle mode
  document.getElementById('modal-container').innerHTML = '';
  _bundleMode = false;
  _bundleAnchor = null;
  _bundleSelected = new Set();
  showToast('Bundle "'+name+'" created!');
  renderPrizes();
  renderGoals();
}

function openEditBundle(id) {
  const b = getPrize(id);
  if (!b || !b.isBundle) return;
  const items = getPrizes().filter(p => p.bundledInto === b.name);
  const allPrizes = getPrizes().filter(p => !p.isBundle && !p.bundledInto);

  showModal(
    '<h3>Edit bundle: '+escHtml(b.name)+'</h3>' +
    '<div class="field"><label>Bundle name</label><input type="text" id="eb-name" value="'+escHtml(b.name)+'" style="width:100%"></div>' +
    '<div class="field"><label>Category</label><select id="eb-cat" style="width:100%">' +
      CATEGORIES.map(c => '<option'+(b.cat===c?' selected':'')+'>'+c+'</option>').join('') +
    '</select></div>' +
    '<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">Items in bundle ('+items.length+')</div>' +
    '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">' +
      items.map(p =>
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)">' +
          '<div style="flex:1;font-size:12px">'+escHtml(p.name||'')+'</div>' +
          '<button onclick="removeFromBundle('+p.id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--red);cursor:pointer;font-family:inherit">Remove</button>' +
        '</div>'
      ).join('') +
    '</div>' +
    (allPrizes.length > 0 ?
      '<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">Add prizes to bundle</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">' +
        allPrizes.map(p =>
          '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)">' +
            '<div style="flex:1;font-size:12px">'+escHtml(p.name||'')+'</div>' +
            '<button onclick="addToExistingBundle('+p.id+','+id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--purple-text);cursor:pointer;font-family:inherit">+ Add</button>' +
          '</div>'
        ).join('') +
      '</div>'
    : '') +
    '<div class="m-actions">' +
      '<button class="btn danger" onclick="confirmDeleteBundle('+id+')"><i class="ti ti-trash"></i> Delete bundle</button>' +
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn primary" onclick="saveEditBundle('+id+')"><i class="ti ti-check"></i> Save</button>' +
    '</div>'
  );
}

async function saveEditBundle(id) {
  const name = document.getElementById('eb-name')?.value?.trim();
  const cat  = document.getElementById('eb-cat')?.value;
  if (!name) { showToast('Please enter a name', 'error'); return; }
  const oldName = getPrize(id)?.name;
  await updatePrize(id, {name, cat});
  // Update bundledInto on all items if name changed
  if (oldName && oldName !== name) {
    const items = getPrizes().filter(p => p.bundledInto === oldName);
    for (const p of items) await updatePrize(p.id, {bundledInto: name});
  }
  closeModal();
  showToast('Bundle saved');
  renderPrizes();
}

async function addToExistingBundle(prizeId, bundleId) {
  const bundle = getPrize(bundleId);
  if (!bundle) return;
  await updatePrize(prizeId, {bundledInto: bundle.name});
  // Refresh modal
  closeModal();
  openEditBundle(bundleId);
  showToast('Added to bundle');
  renderPrizes();
}

async function confirmDeleteBundle(id) {
  const b = getPrize(id);
  if (!b) return;
  const items = getPrizes().filter(p => p.bundledInto === b.name);
  if (confirm('Delete bundle "'+b.name+'"?\n\nThe '+items.length+' items inside will be returned to individual prizes.')) {
    // Un-bundle all items
    for (const p of items) await updatePrize(p.id, {bundledInto: null});
    await deletePrize(id);
    closeModal();
    showToast('Bundle deleted, items restored');
    renderPrizes();
    renderGoals();
  }
}

async function viewPhoto(prizeId, idx) {
  const p = getPrize(prizeId);
  if (!p || !p.photos || !p.photos[idx]) return;
  // If we only have a thumb, load full photo from Firebase first
  if (!p.photos[idx].full) {
    await loadFullPhotos(prizeId);
  }
  const photo = getPrize(prizeId)?.photos?.[idx];
  if (!photo) return;
  const src = photo.full || photo.thumb;
  showModal(`
    <div style="text-align:center">
      <img src="${src}" style="max-width:100%;max-height:70vh;border-radius:8px;object-fit:contain">
      <div style="margin-top:8px;font-size:12px;color:var(--text2)">${escHtml(p.name||'')} — Photo ${idx+1} of ${p.photos.length}</div>
      ${p.photos.length > 1 ? `
        <div style="display:flex;justify-content:center;gap:6px;margin-top:8px">
          ${idx > 0 ? `<button class="btn" onclick="closeModal();viewPhoto(${prizeId},${idx-1})">‹ Prev</button>` : ''}
          ${idx < p.photos.length-1 ? `<button class="btn" onclick="closeModal();viewPhoto(${prizeId},${idx+1})">Next ›</button>` : ''}
        </div>` : ''}
    </div>
    <div class="m-actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
}

// ── Add / Edit prize modal ────────────────────────────────────────────────────
async function openAddPrize() {
  _pendingPhotos = [];
  _editMode = false;
  _currentPrizeId = 0;
  const authors   = getAuthors();
  const itemTypes = getItemTypes();
  await showPrizeModal(null, authors, itemTypes);
}

async function openEditPrize(id) {
  const p = getPrize(id);
  if (!p) return;
  _pendingPhotos = [...(p.photos||[])];
  _editMode = true;
  _currentPrizeId = id;
  const authors   = getAuthors();
  const itemTypes = getItemTypes();
  await showPrizeModal(p, authors, itemTypes);
}

function buildPrizeActions(p, isEdit) {
  let html = '<div class="m-actions">';
  if (isEdit && p) {
    html += '<button class="btn danger" onclick="confirmDeletePrize('+p.id+')"><i class="ti ti-trash"></i> Delete</button>';
  }
  html += '<button class="btn" onclick="closeModal()">Cancel</button>';
  html += '<button class="btn primary" onclick="savePrizeModal()"><i class="ti ti-check"></i> '+(isEdit?'Save':'Add prize')+'</button>';
  html += '</div>';
  return html;
}

function getTagStatusHtml(p) {
  if (!p) return '';
  const checks = [
    {key:'tagMade',     label:'Tag made'},
    {key:'tagPrinted',  label:'Tag printed'},
    {key:'tagAttached', label:'Tag attached'},
    {key:'onTote',      label:'On tote paper'},
  ];
  return '<div class="field"><label>Donation tag status</label>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">' +
    checks.map((c,i) =>
      '<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border-radius:var(--radius-sm);border:.5px solid var(--border);cursor:pointer;font-size:13px">' +
      '<input type="checkbox" id="pm-'+c.key+'" '+(p[c.key]?'checked':'')+' style="accent-color:var(--purple);width:16px;height:16px;flex-shrink:0">'+
      '<span><span style="font-size:10px;color:var(--text3);display:block">Step '+(i+1)+'</span>'+c.label+'</span>'+
      '</label>'
    ).join('') +
  '</div></div>';
}

async function showPrizeModal(p, authors, itemTypes) {
  const isEdit = !!p;
  const donorType = p?.donorType || 'none';

  const actionsHtml = buildPrizeActions(p, isEdit);
  showModal(`
    <h3>${isEdit ? 'Edit prize' : 'Add prize'}</h3>

    <div class="field"><label>Prize name</label>
      <input type="text" id="pm-name" value="${escHtml(p?.name||'')}" placeholder="What is the prize?">
    </div>

    <div class="field"><label>Category</label>
      <select id="pm-cat">
        <option value="">— Select category —</option>
        ${CATEGORIES.map(c=>`<option${(p?.cat||'')===c?' selected':''}>${c}</option>`).join('')}
      </select>
    </div>

    <div class="field"><label>Item type</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${itemTypes.map(t=>`<button class="cat-btn${(p?.itemType||'Misc')===t?' active':''}"
          onclick="selectItemType('${escHtml(t)}')" id="itype-${t.replace(/ /g,'_')}">${escHtml(t)}</button>`).join('')}
        <button class="cat-btn" onclick="addNewItemType()"><i class="ti ti-plus"></i> New</button>
      </div>
      <input type="hidden" id="pm-item-type" value="${escHtml(p?.itemType||'Misc')}">
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">
      <div class="field"><label>Est value ($)</label>
        <input type="text" inputmode="decimal" id="pm-value" value="${p?.value||''}" placeholder="0.00">
      </div>
      <div class="field"><label>Amount paid ($)</label>
        <input type="text" inputmode="decimal" id="pm-paid" value="${p?.paid||''}" placeholder="0.00">
      </div>
      <div class="field"><label>Qty</label>
        <input type="number" id="pm-qty" value="${p?.qty||''}" placeholder="1" min="1">
      </div>
      <div class="field"><label>Location</label>
        <input type="text" id="pm-loc" value="${escHtml(p?.loc||'')}" placeholder="Where is it?">
      </div>
    </div>

    <div class="field"><label>Notes</label>
      <textarea id="pm-notes" rows="2" placeholder="Any notes about this prize…">${escHtml(p?.notes||'')}</textarea>
    </div>

    <!-- DONOR -->
    <div class="field"><label>Donor</label>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button class="cat-btn${donorType==='none'?' active':''}" onclick="setDonorType('none')" id="donor-btn-none">None</button>
        <button class="cat-btn${donorType==='author'?' active':''}" onclick="setDonorType('author')" id="donor-btn-author">Author</button>
        <button class="cat-btn${donorType==='business'?' active':''}" onclick="setDonorType('business')" id="donor-btn-business">Business</button>
      </div>
      <div id="donor-fields"></div>
    </div>

    <!-- PHOTOS -->
    <div class="field"><label>Photos</label>
      <div id="photo-preview" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>
      <div style="display:flex;gap:6px">
        <label class="btn" style="cursor:pointer">
          <i class="ti ti-camera"></i> Take photo
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoFile(this)">
        </label>
        <label class="btn" style="cursor:pointer">
          <i class="ti ti-photo"></i> Choose
          <input type="file" accept="image/*" multiple style="display:none" onchange="handlePhotoFile(this)">
        </label>
      </div>
    </div>

    <!-- TAG STATUS (edit only) -->
    ${isEdit ? `<div class="field"><label>Donation tag status</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${['tagMade','tagPrinted','tagAttached','onTote'].map((k,i) => {
          const labels = ['1. Made','2. Printed','3. Attached','4. On tote'];
          return `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
            <input type="checkbox" id="pm-${k}" ${p[k]?'checked':''} style="accent-color:var(--purple)">
            ${labels[i]}
          </label>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${actionsHtml}`);
  // Initialize donor fields and photos
  setDonorType(donorType, p);
  renderPhotoPreview();
  if (p?.donorType === 'author' || p?.donorType === 'business') {
    // Pre-fill donor fields
    setTimeout(() => {
      if (p.donor)        { const el = document.getElementById('pm-donor'); if(el) el.value = p.donor; }
      if (p.donorWebsite) { const el = document.getElementById('pm-website'); if(el) el.value = p.donorWebsite; }
      if (p.donorQRType)  { const el = document.getElementById('pm-qrtype'); if(el) el.value = p.donorQRType; }
      if (p.donorPronoun) { const el = document.getElementById('pm-pronoun'); if(el) el.value = p.donorPronoun; }
      if (p.donorLogo)    { const el = document.getElementById('pm-logo'); if(el) el.value = p.donorLogo; }
    }, 50);
  }
}

function selectItemType(t) {
  document.querySelectorAll('[id^="itype-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('itype-'+t.replace(/ /g,'_'));
  if (btn) btn.classList.add('active');
  const inp = document.getElementById('pm-item-type');
  if (inp) inp.value = t;
}

function addNewItemType() {
  const name = prompt('New item type name:');
  if (!name || !name.trim()) return;
  addItemType(name.trim()).then(() => {
    showToast('Item type added');
    // Re-open modal with new type selected
    const prizeId = document.querySelector('[id^="pm-name"]')?.closest('.modal')?.dataset?.prizeId;
    openAddPrize(); // simplest - reopen
  });
}

function setDonorType(type, preFill) {
  // Update buttons
  ['none','author','business'].forEach(t => {
    const btn = document.getElementById('donor-btn-'+t);
    if (btn) btn.classList.toggle('active', t===type);
  });

  const authors = getAuthors();
  const el = document.getElementById('donor-fields');
  if (!el) return;

  if (type === 'none') {
    el.innerHTML = '';
    return;
  }

  const isAuthor = type === 'author';
  el.innerHTML = `
    ${isAuthor ? `
    <div class="field"><label>Author</label>
      <select id="pm-donor" onchange="toggleOtherAuthor(this.value)">
        <option value="">— Select author —</option>
        ${authors.map(a=>`<option>${escHtml(a)}</option>`).join('')}
        <option value="__other__">Other (enter name)</option>
      </select>
    </div>
    <div id="other-author-field" style="display:none" class="field">
      <label>Author name</label>
      <input type="text" id="pm-other-author" placeholder="Full name">
    </div>` : `
    <div class="field"><label>Business name</label>
      <input type="text" id="pm-donor" placeholder="Business name">
    </div>`}
    <div class="field"><label>Donor website (for QR code)</label>
      <input type="text" id="pm-website" placeholder="https://…">
    </div>
    <div class="field"><label>QR type</label>
      <select id="pm-qrtype">
        <option value="website">Website</option>
        <option value="instagram">Instagram</option>
      </select>
    </div>
    <div class="field"><label>Pronoun</label>
      <select id="pm-pronoun">
        <option value="their">their</option>
        <option value="her">her</option>
        <option value="his">his</option>
      </select>
    </div>
    <div class="field"><label>Logo (Google Drive link)</label>
      <input type="text" id="pm-logo" placeholder="Paste Google Drive share link">
    </div>`;

  // Store donor type for save
  el.dataset.donorType = type;
}

function toggleOtherAuthor(val) {
  const f = document.getElementById('other-author-field');
  if (f) f.style.display = val==='__other__' ? 'block' : 'none';
}

// ── Photos ────────────────────────────────────────────────────────────────────
async function handlePhotoFile(input) {
  const files = Array.from(input.files);
  for (const file of files) {
    showToast('Processing photo…');
    const full  = await compressImage(file, 1000, 0.65);
    const thumb = await makeThumbnail(full, 150, 0.5);
    _pendingPhotos.push({full, thumb});
  }
  renderPhotoPreview();
  showToast('Photo added!');
  input.value = '';
}

function renderPhotoPreview() {
  const el = document.getElementById('photo-preview');
  if (!el) return;
  el.innerHTML = _pendingPhotos.map((ph, i) =>
    `<div style="position:relative">
      <img src="${ph.thumb}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer"
        onclick="viewPendingPhoto(${i})">
      <button onclick="removePendingPhoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
    </div>`
  ).join('');
}

function viewPendingPhoto(i) {
  if (!_pendingPhotos[i]) return;
  showModal(`
    <img src="${_pendingPhotos[i].full}" style="max-width:100%;max-height:75vh;border-radius:8px;object-fit:contain;display:block;margin:0 auto">
    <div class="m-actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
}

function removePendingPhoto(i) {
  _pendingPhotos.splice(i, 1);
  renderPhotoPreview();
}

function parseMoney(val) {
  const s = String(val||'').trim().replace(/[^0-9.]/g,'');
  if (!s) return 0;
  return s.includes('.') ? Math.round(parseFloat(s)*100)/100 : parseInt(s,10);
}

function getDonorFields() {
  const el = document.getElementById('donor-fields');
  if (!el) return {donorType:'none'};
  const type = el.dataset.donorType || 'none';
  if (type === 'none') return {donorType:'none', donor:'', donorWebsite:'', donorQRType:'website', donorPronoun:'their', donorLogo:''};

  let donor = document.getElementById('pm-donor')?.value || '';
  if (donor === '__other__') {
    donor = document.getElementById('pm-other-author')?.value?.trim() || '';
  }
  return {
    donorType:   type,
    donor,
    donorWebsite: document.getElementById('pm-website')?.value?.trim()||'',
    donorQRType:  document.getElementById('pm-qrtype')?.value||'website',
    donorPronoun: document.getElementById('pm-pronoun')?.value||'their',
    donorLogo:    document.getElementById('pm-logo')?.value?.trim()||'',
    needTag:      !!donor.trim(),
  };
}

var _currentPrizeId = 0;
var _editMode = false;

function savePrizeModal() {
  if (_editMode && _currentPrizeId) {
    doEditPrize(_currentPrizeId);
  } else {
    doAddPrize();
  }
}

async function doAddPrize() {
  showToast('Saving…');
  const name = document.getElementById('pm-name')?.value?.trim();
  if (!name) { showToast('Please enter a prize name','error'); return; }
  const cat = document.getElementById('pm-cat')?.value;
  if (!cat) { showToast('Please select a category','error'); return; }
  const donor = getDonorFields();
  const prize = await addPrize({
    name,
    cat:      cat,
    itemType: document.getElementById('pm-item-type')?.value || 'Misc',
    value:    parseMoney(document.getElementById('pm-value')?.value),
    paid:     parseMoney(document.getElementById('pm-paid')?.value),
    qty:      parseInt(document.getElementById('pm-qty')?.value)||1,
    loc:      document.getElementById('pm-loc')?.value?.trim()||'',
    notes:    document.getElementById('pm-notes')?.value?.trim()||'',
    photos:   [..._pendingPhotos],
    ...donor,
  });
  _pendingPhotos = [];
  closeModal();
  showToast('Prize added!');
  renderPrizes();
  renderGoals();
}

async function doEditPrize(id) {
  const name = document.getElementById('pm-name')?.value?.trim();
  if (!name) { showToast('Please enter a prize name','error'); return; }
  const donor = getDonorFields();
  const tagFields = {
    tagMade:     document.getElementById('pm-tagMade')?.checked || false,
    tagPrinted:  document.getElementById('pm-tagPrinted')?.checked || false,
    tagAttached: document.getElementById('pm-tagAttached')?.checked || false,
    onTote:      document.getElementById('pm-onTote')?.checked || false,
  };
  await updatePrize(id, {
    name,
    cat:      document.getElementById('pm-cat')?.value || 'BINGO',
    itemType: document.getElementById('pm-item-type')?.value || 'Misc',
    value:    parseMoney(document.getElementById('pm-value')?.value),
    paid:     parseMoney(document.getElementById('pm-paid')?.value),
    qty:      parseInt(document.getElementById('pm-qty')?.value)||1,
    loc:      document.getElementById('pm-loc')?.value?.trim()||'',
    notes:    document.getElementById('pm-notes')?.value?.trim()||'',
    photos:   [..._pendingPhotos],
    ...donor,
    ...tagFields,
  });
  _pendingPhotos = [];
  closeModal();
  showToast('Prize saved!');
  renderPrizes();
  renderGoals();
}

function confirmDeletePrize(id) {
  const p = getPrize(id);
  if (!p) return;
  if (confirm(`Delete "${p.name||'this prize'}"? This cannot be undone.`)) {
    deletePrize(id).then(() => {
      closeModal();
      showToast('Prize deleted');
      renderPrizes();
      renderGoals();
    });
  }
}
