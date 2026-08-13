// ui-prizes.js — prize list, cards, add/edit modal, bundle
let _sortKey='name';
let _filterCat='';
let _filterDonor='';
let _filterTag='';
let _search='';
let _expandedId=null;
let _newId=null;
let _bundleMode=false;
let _selectedForBundle=new Set();

// ── Filter + sort ─────────────────────────────────────────────────────────────
function filteredSortedPrizes(){
  let list=getPrizes();
  // Hide bundled-into items unless filter says show
  if(_filterTag!=='bundled') list=list.filter(p=>!p.bundledInto);
  if(_filterCat)  list=list.filter(p=>p.cat===_filterCat||(p.cat||'Unassigned')===_filterCat);
  if(_filterDonor) list=list.filter(p=>(p.donor||'')=== _filterDonor);
  if(_search){
    const q=_search.toLowerCase();
    list=list.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.donor||'').toLowerCase().includes(q)||(p.notes||'').toLowerCase().includes(q));
  }
  if(_filterTag==='needTag')    list=list.filter(p=>p.needTag&&!p.tagMade);
  if(_filterTag==='tagMade')    list=list.filter(p=>p.tagMade&&!p.tagPrinted);
  if(_filterTag==='tagPrinted') list=list.filter(p=>p.tagPrinted&&!p.tagAttached);
  if(_filterTag==='tagAttached')list=list.filter(p=>p.tagAttached&&!p.onTote);
  if(_filterTag==='onTote')     list=list.filter(p=>p.onTote);
  if(_filterTag==='generated')  list=list.filter(p=>p.tagGenerated);
  if(_filterTag==='notGenerated')list=list.filter(p=>p.needTag&&!p.tagGenerated);

  list.sort((a,b)=>{
    if(_sortKey==='value') return (+b.value||0)-(+a.value||0);
    if(_sortKey==='donor') return (a.donor||'').localeCompare(b.donor||'');
    if(_sortKey==='cat')   return (a.cat||'').localeCompare(b.cat||'');
    if(_sortKey==='paid')  return (+b.paid||0)-(+a.paid||0);
    return (a.name||'').localeCompare(b.name||'');
  });
  return list;
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderPrizes(){
  const el=document.getElementById('tab-prizes');
  if(!el) return;
  renderGoals();
  const list=filteredSortedPrizes();
  const allPrizes=getPrizes().filter(p=>!p.bundledInto);
  const donors=[...new Set(allPrizes.map(p=>p.donor).filter(Boolean))].sort();

  el.innerHTML=`
  <div class="goals-bar" id="goals-bar"></div>

  ${_bundleMode&&_selectedForBundle.size>0?`
    <div class="bundle-bar">
      <span style="font-size:13px;color:var(--purple-text);font-weight:500">${_selectedForBundle.size} selected</span>
      <button class="btn purple" onclick="openBundleModal()"><i class="ti ti-package"></i> Bundle into one prize</button>
      <button class="btn" onclick="clearBundleSelection()">Cancel</button>
    </div>`:
  _bundleMode?`<div class="bundle-bar"><span style="font-size:12px;color:var(--purple-text)">Select prizes to bundle, then tap "Bundle"</span><button class="btn" onclick="clearBundleSelection()">Cancel</button></div>`:''}

  <div class="filter-bar">
    <input type="search" placeholder="Search prizes…" value="${escHtml(_search)}" oninput="_search=this.value;renderPrizes()">
    <select onchange="_filterCat=this.value;renderPrizes()">
      <option value="">All categories</option>
      ${['BINGO','Raffle','Medium','Small','SWAG Bag','Unassigned'].map(c=>`<option value="${c}"${_filterCat===c?' selected':''}>${c}</option>`).join('')}
    </select>
    <select onchange="_filterDonor=this.value;renderPrizes()">
      <option value="">All donors</option>
      ${donors.map(d=>`<option${_filterDonor===d?' selected':''}>${escHtml(d)}</option>`).join('')}
    </select>
    <select onchange="_filterTag=this.value;renderPrizes()">
      <option value="">All tag stages</option>
      <option value="needTag">Needs tag</option>
      <option value="tagMade">Tag made</option>
      <option value="tagPrinted">Tag printed</option>
      <option value="tagAttached">Tag attached</option>
      <option value="onTote">On tote paper</option>
      <option value="generated">PDF generated</option>
      <option value="notGenerated">PDF not yet generated</option>
      <option value="bundled">Show bundled items</option>
    </select>
  </div>
  <div class="sort-row">
    <span class="sort-lbl">Sort:</span>
    ${['name','donor','value','cat','paid'].map(k=>`<button class="sort-btn${_sortKey===k?' active':''}" onclick="_sortKey='${k}';renderPrizes()">${k.charAt(0).toUpperCase()+k.slice(1)}</button>`).join('')}
    <span class="result-count">${list.length} prize${list.length!==1?'s':''}</span>
    <button class="btn" style="margin-left:auto;font-size:11px;padding:3px 8px" onclick="toggleBundleMode()">
      <i class="ti ti-package"></i> ${_bundleMode?'Exit bundle':'Bundle'}
    </button>
    ${isAdmin()?`<button class="btn primary" onclick="openAddPrizeModal()"><i class="ti ti-plus"></i> Add prize</button>`:''}
  </div>
  <div class="prize-list">
    ${list.length?list.map(p=>prizeCardHTML(p)).join(''):`<div class="empty"><i class="ti ti-gift"></i>No prizes match your filters.</div>`}
  </div>`;
  renderGoals();
  if(_newId){
    setTimeout(()=>{
      document.getElementById('pc-'+_newId)?.classList.add('new-item');
      _newId=null;
    },50);
  }
}

// ── Prize card ────────────────────────────────────────────────────────────────
function prizeCardHTML(p){
  const expanded=_expandedId===p.id;
  const bundleSelected=_selectedForBundle.has(p.id);
  const tagDot=p.needTag
    ?(p.onTote?'td-done':p.tagAttached?'td-made':p.tagMade?'td-made':'td-yes')
    :'td-no';

  const badgeHTML=p.isBundle
    ?`<span style="font-size:10px;background:var(--purple-bg);color:var(--purple-text);padding:1px 6px;border-radius:10px;font-weight:600">📦 Bundle×${(p.bundleContains||[]).length}</span>`
    :p.bundledInto
    ?`<span style="font-size:10px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:10px">🔗 ${escHtml(p.bundledIntoName||'Bundle')}</span>`
    :'';

  return `<div class="prize-card${expanded?' expanded':''}${bundleSelected?' bundle-sel':''}"
    id="pc-${p.id}"
    style="${bundleSelected?'border-color:var(--purple);border-width:1.5px;background:var(--purple-bg)':''}"
    onclick="${_bundleMode?`toggleBundleSelect(${p.id},event)`:`toggleCard(${p.id})`}">
    <div class="prize-row">
      ${_bundleMode&&!p.bundledInto&&!p.isBundle?`<input type="checkbox" ${bundleSelected?'checked':''} style="width:16px;height:16px;accent-color:var(--purple);flex-shrink:0" onclick="event.stopPropagation();toggleBundleSelect(${p.id},event)">`:``}
      <div class="tag-dot ${tagDot}"></div>
      <div class="prize-name">${escHtml(p.name||'Unnamed prize')}</div>
      <div class="prize-meta">
        ${badgeHTML}
        ${p.itemType&&p.itemType!=='Other'?`<span style="font-size:10px;color:var(--text3)">${escHtml(p.itemType)}</span>`:''}
        ${p.value?`<span class="pmv">${fmt$(p.value)}</span>`:''}
        <span class="cat-pill cat-${(p.cat||'Unassigned').replace(/\s/g,'')}">${escHtml(p.cat||'Unassigned')}</span>
      </div>
    </div>
    <div class="prize-detail">
      ${prizeDetailHTML(p)}
    </div>
  </div>`;
}

function toggleCard(id){
  _expandedId = _expandedId===id ? null : id;
  renderPrizes();
}

// ── Prize detail ──────────────────────────────────────────────────────────────
function prizeDetailHTML(p){
  const stages=[
    {key:'tagMade',label:'Tag made'},
    {key:'tagPrinted',label:'Tag printed'},
    {key:'tagAttached',label:'Tag attached'},
    {key:'onTote',label:'On tote paper'},
  ];
  return `
  <div class="det-meta">Added by ${escHtml(p.addedBy||'?')} · Last updated ${new Date(p._mod||Date.now()).toLocaleDateString()}</div>
  <div class="det-grid">
    <div class="df"><label>Category</label>
      <select onchange="savePrizeField(${p.id},'cat',this.value)">
        ${['BINGO','Raffle','Medium','Small','SWAG Bag','Unassigned'].map(c=>`<option${p.cat===c?' selected':''}>${c}</option>`).join('')}
      </select></div>
    <div class="df"><label>Qty</label>
      <input type="number" value="${p.qty||1}" min="1" onchange="savePrizeField(${p.id},'qty',+this.value)"></div>
    <div class="df"><label>Est. value ($)</label>
      <input type="text" inputmode="decimal" value="${p.value||''}" placeholder="0.00"
        onblur="savePrizeField(${p.id},'value',parseFloat(this.value)||0)"></div>
    <div class="df"><label>Amount paid ($)</label>
      <input type="text" inputmode="decimal" value="${p.paid||''}" placeholder="0.00"
        onblur="savePrizeField(${p.id},'paid',parseFloat(this.value)||0)"></div>
    <div class="df full"><label>Prize name</label>
      <input type="text" value="${escHtml(p.name||'')}"
        onblur="savePrizeField(${p.id},'name',this.value)"></div>
    <div class="df"><label>Location</label>
      <input type="text" value="${escHtml(p.loc||'')}"
        onblur="savePrizeField(${p.id},'loc',this.value)"></div>
    <div class="df"><label>URL / link</label>
      <input type="text" value="${escHtml(p.url||'')}" placeholder="https://…"
        onblur="savePrizeField(${p.id},'url',this.value)"></div>
    <div class="df full"><label>Item type</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['Book','Clothing','Other'].map(t=>`
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
            <input type="radio" name="itype-${p.id}" value="${t}" ${(p.itemType||'Other')===t?'checked':''}
              onchange="savePrizeField(${p.id},'itemType',this.value);renderPrizes()"> ${t}
          </label>`).join('')}
      </div>
    </div>
    ${p.itemType==='Clothing'?`
    <div class="df"><label>Clothing size</label>
      <div style="display:flex;gap:4px">
        <select onchange="savePrizeField(${p.id},'clothingSize',this.value);if(this.value==='Custom')document.getElementById('csc-${p.id}').style.display='block';else document.getElementById('csc-${p.id}').style.display='none'">
          ${['','S','M','L','XL','XXL','XXXL','Custom'].map(s=>`<option value="${s}"${p.clothingSize===s?' selected':''}>${s||'Select…'}</option>`).join('')}
        </select>
      </div>
      <input type="text" id="csc-${p.id}" placeholder="Custom size…" value="${escHtml(p.clothingSizeCustom||'')}"
        style="margin-top:4px;width:100%;display:${p.clothingSize==='Custom'?'block':'none'}"
        onblur="savePrizeField(${p.id},'clothingSizeCustom',this.value)">
    </div>`:''}
    ${p.itemType==='Other'?`<div class="df"><label>Item description</label>
      <input type="text" value="${escHtml(p.itemTypeCustom||'')}" placeholder="What kind of item?"
        onblur="savePrizeField(${p.id},'itemTypeCustom',this.value)"></div>`:''}
  </div>

  <!-- Donor section -->
  <div style="margin-bottom:8px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:5px">Donor</div>
    <div class="donor-toggle">
      <button class="dt-opt${(p.donorType||'author')==='author'?' active':''}"
        onclick="savePrizeField(${p.id},'donorType','author');renderPrizes()">Author</button>
      <button class="dt-opt${p.donorType==='business'?' active':''}"
        onclick="savePrizeField(${p.id},'donorType','business');renderPrizes()">Business</button>
      <button class="dt-opt${!p.donor&&!p.donorType?' active':''}"
        onclick="savePrizeField(${p.id},'donor','');savePrizeField(${p.id},'needTag',false);renderPrizes()">None</button>
    </div>
    <div class="det-grid">
      <div class="df full"><label>Donor name</label>
        <input type="text" value="${escHtml(p.donor||'')}"
          onblur="savePrizeField(${p.id},'donor',this.value)"></div>
      <div class="df full"><label>Donor website / URL <span style="color:var(--text3)">(for QR code)</span></label>
        <input type="text" value="${escHtml(p.donorQRDest||p.url||'')}" placeholder="https://…"
          onblur="savePrizeField(${p.id},'donorQRDest',this.value)"></div>
      <div class="df"><label>QR type</label>
        <select onchange="savePrizeField(${p.id},'donorQRType',this.value)">
          <option value="website"${(p.donorQRType||'website')==='website'?' selected':''}>Website</option>
          <option value="instagram"${p.donorQRType==='instagram'?' selected':''}>Instagram</option>
        </select></div>
      <div class="df"><label>Pronoun</label>
        <select onchange="savePrizeField(${p.id},'donorPronoun',this.value)">
          ${['their','her','his'].map(pr=>`<option value="${pr}"${(p.donorPronoun||'their')===pr?' selected':''}>${pr}</option>`).join('')}
        </select></div>
      <div class="df full"><label>Tag headline <span style="color:var(--text3)">(defaults to "This book was donated by")</span></label>
        <input type="text" value="${escHtml(p.donorHeadline||'')}" placeholder="This book was donated by"
          onblur="savePrizeField(${p.id},'donorHeadline',this.value)"></div>
      <div class="df full"><label>Donor logo URL <span style="color:var(--text3)">(Google Drive link to high-res logo)</span></label>
        <input type="text" value="${escHtml(p.donorLogoUrl||'')}" placeholder="https://drive.google.com/…"
          onblur="savePrizeField(${p.id},'donorLogoUrl',this.value)"></div>
    </div>
  </div>

  ${p.needTag?`
  <div style="margin-bottom:8px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:5px">Donation tag stages</div>
    <div class="stage-row">
      ${stages.map(s=>`<button class="stg${p[s.key]?' done':''}" onclick="toggleStage(${p.id},'${s.key}')">${s.label}</button>`).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
      <span style="font-size:11px;color:var(--text2)">PDF tag:</span>
      <span class="print-status ${p.tagGenerated?'generated':'pending'}">${p.tagGenerated?'Generated':'Not yet generated'}</span>
      ${p.tagGenerated?`<button class="btn" style="font-size:11px;padding:2px 7px" onclick="markTagGenerated(${p.id},false)">Reset</button>`:''}
    </div>
  </div>`:''}

  <div class="df" style="margin-bottom:8px"><label>Notes</label>
    <textarea onblur="savePrizeField(${p.id},'notes',this.value)">${escHtml(p.notes||'')}</textarea></div>

  <!-- Photo -->
  <div class="photo-area${p.photo?' has-photo':''}" onclick="event.stopPropagation()">
    ${p.photo
      ?`<img src="${p.photo}" alt="Prize photo" onclick=""><input type="file" accept="image/*" onchange="handlePhotoUpload(${p.id},this)">`
      :`<div class="photo-ph"><i class="ti ti-camera" style="font-size:20px"></i><span>Tap to add photo</span></div><input type="file" accept="image/*" onchange="handlePhotoUpload(${p.id},this)">`}
  </div>

  <div class="det-actions">
    ${isAdmin()?`<button class="btn danger" onclick="confirmDeletePrize(${p.id})"><i class="ti ti-trash"></i></button>`:''}
    ${p.url?`<a href="${escHtml(p.url)}" target="_blank" class="btn"><i class="ti ti-external-link"></i></a>`:''}
    <button class="btn primary" onclick="closePrizeCard()">Done</button>
  </div>`;
}

function closePrizeCard(){_expandedId=null;renderPrizes();}

async function savePrizeField(id,field,val){
  await updatePrize(id,{[field]:val});
  renderPrizes();
}
async function toggleStage(id,stage){
  const p=getPrize(id);
  if(!p) return;
  await updatePrize(id,{[stage]:!p[stage]});
  renderPrizes();
}
async function markTagGenerated(id,val=true){
  await updatePrize(id,{tagGenerated:val,tagMade:val?true:false});
  renderPrizes();
}

async function confirmDeletePrize(id){
  if(!confirm('Delete this prize?')) return;
  await deletePrize(id);
  _expandedId=null;
  renderPrizes();
}

async function handlePhotoUpload(id,input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const img=new Image();
    img.onload=async()=>{
      const canvas=document.createElement('canvas');
      const max=400;
      let w=img.width,h=img.height;
      if(w>max){h=h*max/w;w=max;}
      if(h>max){w=w*max/h;h=max;}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/jpeg',0.75);
      await updatePrize(id,{photo:dataUrl});
      renderPrizes();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Add prize modal ───────────────────────────────────────────────────────────
async function openAddPrizeModal(){
  const authors = await getAuthors();
  showModal(`
    <h3><i class="ti ti-plus"></i> Add prize</h3>
    <div class="m-grid">
      <div class="mf full"><label>Prize name</label>
        <input type="text" id="ap-name" placeholder="What is the prize?"></div>
      <div class="mf"><label>Category</label>
        <select id="ap-cat">
          ${['Unassigned','BINGO','Raffle','Medium','Small','SWAG Bag'].map(c=>`<option>${c}</option>`).join('')}
        </select></div>
      <div class="mf"><label>Item type</label>
        <select id="ap-itype" onchange="apToggleItemType(this.value)">
          <option value="Other">Other</option>
          <option value="Book">Book</option>
          <option value="Clothing">Clothing</option>
        </select></div>
      <div class="mf" id="ap-size-row" style="display:none"><label>Clothing size</label>
        <select id="ap-size">
          ${['','S','M','L','XL','XXL','XXXL','Custom'].map(s=>`<option value="${s}">${s||'Select…'}</option>`).join('')}
        </select>
        <input type="text" id="ap-size-custom" placeholder="Custom size…" style="margin-top:4px;width:100%;display:none"
          oninput="if(this.value)document.getElementById('ap-size-custom').style.display='block'">
      </div>
      <div class="mf"><label>Est. value ($)</label>
        <input type="text" inputmode="decimal" id="ap-val" placeholder="0.00"></div>
      <div class="mf"><label>Qty</label>
        <input type="number" id="ap-qty" value="1" min="1"></div>
      <div class="mf"><label>Location</label>
        <input type="text" id="ap-loc" placeholder="Where is it?"></div>
      <div class="mf"><label>URL / link</label>
        <input type="text" id="ap-url" placeholder="https://…"></div>
    </div>
    <div style="margin:10px 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text2)">Donor (optional)</div>
    <div class="donor-toggle">
      <button class="dt-opt active" id="dt-none" onclick="apSetDonorType('none')">None</button>
      <button class="dt-opt" id="dt-author" onclick="apSetDonorType('author')">Author</button>
      <button class="dt-opt" id="dt-business" onclick="apSetDonorType('business')">Business</button>
    </div>
    <div id="ap-donor-fields" style="display:none">
      <div class="m-grid">
        <div class="mf full" id="ap-author-field"><label>Author</label>
          <select id="ap-author">
            <option value="">— select author —</option>
            ${authors.map(a=>`<option>${escHtml(a)}</option>`).join('')}
          </select></div>
        <div class="mf full" id="ap-biz-field" style="display:none"><label>Business name</label>
          <input type="text" id="ap-biz" placeholder="Business name"></div>
        <div class="mf full"><label>Donor website (for QR code)</label>
          <input type="text" id="ap-qr" placeholder="https://…"></div>
        <div class="mf"><label>QR type</label>
          <select id="ap-qrtype">
            <option value="website">Website</option>
            <option value="instagram">Instagram</option>
          </select></div>
        <div class="mf"><label>Pronoun</label>
          <select id="ap-pronoun">
            <option value="their">their</option>
            <option value="her">her</option>
            <option value="his">his</option>
          </select></div>
        <div class="mf full"><label>Donor logo URL (Google Drive)</label>
          <input type="text" id="ap-logo" placeholder="https://drive.google.com/…"></div>
      </div>
    </div>
    <div class="mf full" style="margin-top:8px"><label>Notes</label>
      <textarea id="ap-notes" rows="2" placeholder="Any notes…"></textarea></div>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="doAddPrize()"><i class="ti ti-check"></i> Add prize</button>
    </div>`);
  setTimeout(()=>document.getElementById('ap-name')?.focus(),50);
}

let _apDonorType='none';
function apSetDonorType(t){
  _apDonorType=t;
  ['none','author','business'].forEach(x=>{
    document.getElementById('dt-'+x)?.classList.toggle('active',x===t);
  });
  document.getElementById('ap-donor-fields').style.display=t==='none'?'none':'block';
  document.getElementById('ap-author-field').style.display=t==='author'?'block':'none';
  document.getElementById('ap-biz-field').style.display=t==='business'?'block':'none';
}
function apToggleItemType(v){
  document.getElementById('ap-size-row').style.display=v==='Clothing'?'block':'none';
}

async function doAddPrize(){
  const name=document.getElementById('ap-name')?.value?.trim();
  if(!name){alert('Please enter a prize name.');return;}
  const donorType=_apDonorType==='none'?'':_apDonorType;
  const donor=_apDonorType==='author'
    ?(document.getElementById('ap-author')?.value||'')
    :_apDonorType==='business'
    ?(document.getElementById('ap-biz')?.value?.trim()||'')
    :'';
  const clothingSize=document.getElementById('ap-size')?.value||'';
  const clothingSizeCustom=clothingSize==='Custom'?(document.getElementById('ap-size-custom')?.value?.trim()||''):'';
  const fields={
    name,
    cat:document.getElementById('ap-cat')?.value||'Unassigned',
    itemType:document.getElementById('ap-itype')?.value||'Other',
    clothingSize,clothingSizeCustom,
    value:parseFloat(document.getElementById('ap-val')?.value)||0,
    qty:parseInt(document.getElementById('ap-qty')?.value)||1,
    loc:document.getElementById('ap-loc')?.value?.trim()||'',
    url:document.getElementById('ap-url')?.value?.trim()||'',
    donor,donorType,
    donorQRDest:document.getElementById('ap-qr')?.value?.trim()||'',
    donorQRType:document.getElementById('ap-qrtype')?.value||'website',
    donorPronoun:document.getElementById('ap-pronoun')?.value||'their',
    donorLogoUrl:document.getElementById('ap-logo')?.value?.trim()||'',
    notes:document.getElementById('ap-notes')?.value?.trim()||'',
  };
  const prize=await addPrize(fields);
  _newId=prize.id;
  closeModal();
  renderPrizes();
  showToast('Prize added!');
}

// ── Bundle prizes ─────────────────────────────────────────────────────────────
function toggleBundleMode(){
  _bundleMode=!_bundleMode;
  _selectedForBundle.clear();
  renderPrizes();
}
function clearBundleSelection(){
  _bundleMode=false;
  _selectedForBundle.clear();
  renderPrizes();
}
function toggleBundleSelect(id,e){
  e.stopPropagation();
  if(_selectedForBundle.has(id)) _selectedForBundle.delete(id);
  else _selectedForBundle.add(id);
  renderPrizes();
}

function openBundleModal(){
  if(_selectedForBundle.size<2){alert('Select at least 2 items to bundle.');return;}
  const prizes=getPrizes();
  const selected=prizes.filter(p=>_selectedForBundle.has(p.id));
  const totalVal=selected.reduce((s,p)=>s+((+p.value||0)*(+p.qty||1)),0);
  const totalPaid=selected.reduce((s,p)=>s+(+p.paid||0),0);
  const suggested=selected.map(p=>p.name).join(' + ').slice(0,80);
  showModal(`
    <h3>Bundle ${selected.length} items into one prize</h3>
    <div style="background:var(--bg2);border-radius:var(--radius-sm);padding:10px;margin-bottom:12px;max-height:150px;overflow-y:auto">
      ${selected.map(p=>`<div style="font-size:12px;padding:3px 0;border-bottom:.5px solid var(--border);display:flex;justify-content:space-between">
        <span>${escHtml(p.name)}</span><span style="color:var(--text2)">${p.value?fmt$(p.value):''}</span>
      </div>`).join('')}
      <div style="font-size:12px;font-weight:600;padding:5px 0;display:flex;justify-content:space-between">
        <span>Combined value</span><span style="color:var(--green)">${fmt$(totalVal)}</span>
      </div>
    </div>
    <div class="m-grid">
      <div class="mf full"><label>Bundle name</label>
        <input type="text" id="bn-name" value="${escHtml(suggested)}" placeholder="e.g. Book Lover Bundle"></div>
      <div class="mf"><label>Category</label>
        <select id="bn-cat">
          ${['BINGO','Raffle','Medium','Small','SWAG Bag','Unassigned'].map(c=>`<option${c==='BINGO'?' selected':''}>${c}</option>`).join('')}
        </select></div>
      <div class="mf"><label>Location</label>
        <input type="text" id="bn-loc" placeholder="Where will it be stored?"></div>
      <div class="mf full"><label>Notes</label>
        <textarea id="bn-notes" rows="2" placeholder="Any notes about this bundle…"></textarea></div>
    </div>
    <div style="font-size:11px;color:var(--text2);background:var(--bg2);padding:8px;border-radius:var(--radius-sm);margin-bottom:8px">
      The ${selected.length} originals will be kept but marked as "Bundled into [name]". Use the "Show bundled items" filter to see them.
    </div>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="doBundle(${totalVal},${totalPaid})"><i class="ti ti-package"></i> Create bundle</button>
    </div>`);
  setTimeout(()=>{const n=document.getElementById('bn-name');if(n){n.focus();n.select();}},50);
}

async function doBundle(totalVal,totalPaid){
  const name=document.getElementById('bn-name')?.value?.trim();
  if(!name){alert('Please enter a name.');return;}
  const selectedIds=[..._selectedForBundle];
  const prizes=getPrizes();
  const selected=prizes.filter(p=>selectedIds.includes(p.id));
  const donors=[...new Set(selected.map(p=>p.donor).filter(Boolean))];
  const bundle=await addPrize({
    cat:document.getElementById('bn-cat')?.value||'BINGO',
    name,qty:1,paid:+totalPaid,value:+totalVal,
    loc:document.getElementById('bn-loc')?.value?.trim()||'',
    donor:donors.join(', '),
    notes:document.getElementById('bn-notes')?.value?.trim()||`Bundle of ${selected.length} items: ${selected.map(p=>p.name).join(', ')}`,
    isBundle:true,bundleContains:selectedIds,
  });
  for(const p of selected){
    await updatePrize(p.id,{bundledInto:bundle.id,bundledIntoName:name});
  }
  closeModal();
  clearBundleSelection();
  showToast(`Bundle "${name}" created`);
}
