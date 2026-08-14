// prizes.js — prize list, add/edit modal, photo handling

var _filterCat    = '';
var _filterDonor  = '';
var _searchQ      = '';
var _prizeDebounce = null;
var _pendingPhotos = []; // photos staged during add/edit

const CATEGORIES = ['BINGO','Raffle','Medium','Small','SWAG Bag'];

function renderPrizes() {
  const el = document.getElementById('prizes-content');
  if (!el) return;

  let list = getPrizes().filter(p => !p.bundledInto);

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

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div style="font-size:13px;color:var(--text2)">${list.length} prizes</div>
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

  return `<div class="prize-card" onclick="openEditPrize(${p.id})">
    <div style="display:flex;gap:10px;align-items:flex-start">
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
      <div style="flex-shrink:0">
        <i class="ti ti-chevron-right" style="font-size:14px;color:var(--text3)"></i>
      </div>
    </div>
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

function viewPhoto(prizeId, idx) {
  const p = getPrize(prizeId);
  if (!p || !p.photos || !p.photos[idx]) return;
  showModal(`
    <div style="text-align:center">
      <img src="${p.photos[idx].full}" style="max-width:100%;max-height:70vh;border-radius:8px;object-fit:contain">
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
  const authors   = getAuthors();
  const itemTypes = getItemTypes();
  await showPrizeModal(null, authors, itemTypes);
}

async function openEditPrize(id) {
  const p = getPrize(id);
  if (!p) return;
  _pendingPhotos = [...(p.photos||[])];
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
    {key:'tagMade',     label:'1. Made'},
    {key:'tagPrinted',  label:'2. Printed'},
    {key:'tagAttached', label:'3. Attached'},
    {key:'onTote',      label:'4. On tote'},
  ];
  return '<div class="field"><label>Donation tag status</label><div style="display:flex;flex-wrap:wrap;gap:6px">' +
    checks.map(c =>
      '<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">' +
      '<input type="checkbox" id="pm-'+c.key+'" '+(p[c.key]?'checked':'')+' style="accent-color:var(--purple)">'+
      c.label+'</label>'
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
        ${CATEGORIES.map(c=>`<option${(p?.cat||'BINGO')===c?' selected':''}>${c}</option>`).join('')}
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

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="field"><label>Est value ($)</label>
        <input type="text" inputmode="decimal" id="pm-value" value="${p?.value||''}" placeholder="0.00">
      </div>
      <div class="field"><label>Amount paid ($)</label>
        <input type="text" inputmode="decimal" id="pm-paid" value="${p?.paid||''}" placeholder="0.00">
      </div>
      <div class="field"><label>Qty</label>
        <input type="number" id="pm-qty" value="${p?.qty||1}" min="1">
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
  const name = document.getElementById('pm-name')?.value?.trim();
  if (!name) { showToast('Please enter a prize name','error'); return; }
  const donor = getDonorFields();
  const prize = await addPrize({
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
