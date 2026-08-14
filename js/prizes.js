// prizes.js — prize list, add/edit modal, bundle system

// ── State ─────────────────────────────────────────────────────────────────────
var _filterCat     = '';
var _searchQ       = '';
var _prizeDebounce = null;
var _pendingPhotos = [];
var _bundleMode    = false;
var _bundleAnchor  = null;
var _bundleSelected = new Set();
var _currentPrizeId = 0;
var _editMode       = false;

const CATEGORIES = ['BINGO','Raffle','Medium','Small','SWAG Bag','Uncategorized'];

// ── Render prizes list ────────────────────────────────────────────────────────
function renderPrizes() {
  var el = document.getElementById('prizes-content');
  if (!el) return;

  var allPrizes = getPrizes().filter(function(p){ return p && p.id !== undefined; });
  var bundles   = allPrizes.filter(function(p){ return p.isBundle; });
  var individual = allPrizes.filter(function(p){ return !p.isBundle && !p.bundledInto; });
  var bundled    = allPrizes.filter(function(p){ return !p.isBundle && !!p.bundledInto; });

  // Search filter
  var searchFilter = function(p){ return true; };
  if (_searchQ.trim()) {
    var q = _searchQ.toLowerCase();
    searchFilter = function(p){
      return (p.name||'').toLowerCase().includes(q) ||
             (p.donor||'').toLowerCase().includes(q) ||
             (p.cat||'').toLowerCase().includes(q) ||
             (p.notes||'').toLowerCase().includes(q);
    };
  }

  // Category filter
  var catFilter = function(p){ return !_filterCat || p.cat === _filterCat; };

  var bundleBar = '';
  if (_bundleMode) {
    bundleBar = '<div style="background:var(--purple-bg);border:.5px solid var(--purple);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:10px">'+
      '<div style="font-size:13px;font-weight:600;color:var(--purple-text);margin-bottom:6px"><i class="ti ti-packages"></i> Building bundle — '+_bundleSelected.size+' items selected</div>'+
      '<div style="font-size:12px;color:var(--purple-text);margin-bottom:8px">Tap non-Raffle prizes below to add them.</div>'+
      '<div style="display:flex;gap:8px">'+
        '<button class="btn primary" onclick="finishBundle()" style="background:var(--purple);color:white;border-color:var(--purple)"><i class="ti ti-check"></i> Done — Name bundle</button>'+
        '<button class="btn" onclick="cancelBundle()">Cancel</button>'+
      '</div>'+
    '</div>';
  }

  el.innerHTML = bundleBar +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">'+
      '<div style="font-size:13px;color:var(--text2)">'+individual.length+' prizes · '+bundled.length+' bundled · '+bundles.length+' bundles</div>'+
      '<button class="btn primary" onclick="openAddPrize()"><i class="ti ti-plus"></i> Add prize</button>'+
    '</div>'+
    '<div style="margin-bottom:8px">'+
      '<input type="text" id="prize-search" value="'+escHtml(_searchQ)+'" placeholder="Search prizes, donors, notes\u2026" style="width:100%;font-size:13px;padding:8px 12px" oninput="debouncePrizeSearch(this.value)">'+
    '</div>'+
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">'+
      '<button class="cat-btn'+ (!_filterCat?' active':'')+'" onclick="_filterCat=\'\';renderPrizes()">All</button>'+
      CATEGORIES.map(function(c){ return '<button class="cat-btn'+(_filterCat===c?' active':'')+'" onclick="_filterCat=\''+c+'\';renderPrizes()">'+c+'</button>'; }).join('')+
    '</div>'+
    '<div id="prize-list-inner" style="display:flex;flex-direction:column;gap:8px"></div>'+
    '<div style="height:300px"></div>';

  buildPrizeList(allPrizes, bundles, individual, bundled, searchFilter, catFilter);
}

function buildPrizeList(allPrizes, bundles, individual, bundled, searchFilter, catFilter) {
  var el = document.getElementById('prize-list-inner');
  if (!el) return;
  var bFiltered  = bundles.filter(catFilter);
  var iFiltered  = individual.filter(catFilter).filter(searchFilter);
  var bndFiltered = bundled.filter(catFilter).filter(searchFilter);
  var html = bFiltered.map(function(b){ return bundleCard(b); }).join('') +
             iFiltered.map(function(p){ return prizeCard(p); }).join('') +
             bndFiltered.map(function(p){ return prizeCard(p); }).join('');
  if (!html) html = '<div style="text-align:center;padding:3rem;color:var(--text3)">No prizes found.</div>';
  el.innerHTML = html;
}

function debouncePrizeSearch(val) {
  _searchQ = val;
  clearTimeout(_prizeDebounce);
  _prizeDebounce = setTimeout(renderPrizes, 150);
}

// ── Prize card ────────────────────────────────────────────────────────────────
function prizeCard(p) {
  var thumb    = p.photos && p.photos[0] ? p.photos[0].thumb : null;
  var tagStage = p.tagGenerated ? 'Tagged' : p.onTote ? '4. On tote' :
                 p.tagAttached ? '3. Attached' : p.tagPrinted ? '2. Printed' :
                 p.tagMade ? '1. Made' : '';
  var isBundled  = !!p.bundledInto;
  var isSelected = _bundleSelected.has(p.id);
  var isAnchor   = _bundleAnchor === p.id;
  var isRaffle   = p.cat === 'Raffle';

  // In bundle mode: raffle prizes can't be bundled
  var clickFn = _bundleMode
    ? (isBundled || isRaffle ? '' : 'toggleBundleSelect('+p.id+')')
    : 'openEditPrize('+p.id+')';

  var opacity = (isBundled || (isRaffle && _bundleMode)) ? 'opacity:0.45;' : '';
  var border  = (isSelected||isAnchor) ? 'border-color:var(--purple);' : '';
  var bg      = (isSelected||isAnchor) ? 'background:var(--purple-bg);' : 'background:var(--bg);';

  var checkbox = '';
  if (_bundleMode && !isBundled && !isRaffle) {
    var checked = isSelected || isAnchor;
    checkbox = '<div style="width:22px;height:22px;border-radius:50%;border:2px solid '+(checked?'var(--purple)':'var(--border2)')+';background:'+(checked?'var(--purple)':'transparent')+';display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(checked?'<i class="ti ti-check" style="font-size:12px;color:white"></i>':'')+'</div>';
  }
  if (_bundleMode && isRaffle) {
    checkbox = '<div style="font-size:9px;color:var(--text3);padding:2px 4px;text-align:center">No<br>bundle</div>';
  }

  var bundleBtn = (!_bundleMode && !isBundled && !isRaffle)
    ? '<button onclick="event.stopPropagation();startBundle('+p.id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--text3);cursor:pointer;white-space:nowrap;font-family:inherit;margin-top:4px"><i class="ti ti-packages" style="font-size:10px"></i> Bundle</button>'
    : '';

  var bundleLabel = isBundled
    ? '<div style="text-align:right;font-size:10px;color:var(--text3);margin-top:4px;font-style:italic">Bundled with '+escHtml(p.bundledInto||'')+'</div>'
    : '';

  var thumbHtml = thumb
    ? '<img src="'+thumb+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();viewPhoto('+p.id+',0)">'
    : '<div style="width:60px;height:60px;border-radius:6px;background:var(--bg2);border:.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center"><i class="ti ti-photo" style="font-size:20px;color:var(--text3)"></i></div>';

  var extraPhotos = '';
  if (p.photos && p.photos.length > 1) {
    extraPhotos = '<div style="display:flex;gap:4px;margin-top:8px;padding-left:70px;overflow-x:auto">';
    p.photos.slice(1,5).forEach(function(ph,i){
      extraPhotos += '<img src="'+ph.thumb+'" style="width:44px;height:44px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();viewPhoto('+p.id+','+(i+1)+')">';
    });
    if (p.photos.length > 5) extraPhotos += '<div style="width:44px;height:44px;border-radius:4px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text2)">+'+(p.photos.length-5)+'</div>';
    extraPhotos += '</div>';
  }

  return '<div class="prize-card" style="'+opacity+border+bg+'" onclick="'+clickFn+'">'+
    '<div style="display:flex;gap:10px;align-items:flex-start">'+
      checkbox+
      thumbHtml+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">'+
          '<span class="cat-pill cat-'+(p.cat||'').toLowerCase().replace(/ /g,'-')+'">'+escHtml(p.cat||'')+'</span>'+
          '<span style="font-size:10px;color:var(--text3)">'+escHtml(p.itemType||'')+'</span>'+
        '</div>'+
        '<div style="font-size:14px;font-weight:600">'+escHtml(p.name||'Unnamed prize')+'</div>'+
        (p.donor?'<div style="font-size:11px;color:var(--purple-text);margin-top:2px"><i class="ti ti-user" style="font-size:10px"></i> '+escHtml(p.donor)+'</div>':'')+
        '<div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap">'+
          (p.value?'<span style="font-size:11px;color:var(--text2)">Est '+fmt$(p.value)+'</span>':'')+
          (p.paid?'<span style="font-size:11px;color:var(--amber)">Paid '+fmt$(p.paid)+'</span>':'')+
          (p.qty>1?'<span style="font-size:11px;color:var(--text2)">x'+p.qty+'</span>':'')+
          (tagStage?'<span style="font-size:10px;color:var(--green)">'+tagStage+'</span>':'')+
        '</div>'+
      '</div>'+
      '<div style="flex-shrink:0"><i class="ti ti-chevron-right" style="font-size:14px;color:var(--text3)"></i></div>'+
    '</div>'+
    bundleLabel+
    (bundleBtn?'<div style="text-align:right">'+bundleBtn+'</div>':'')+
    extraPhotos+
  '</div>';
}

// ── Bundle card ───────────────────────────────────────────────────────────────
function bundleCard(b) {
  var bName = b.name || String(b.id);
  var bItems = b.bundleItems || [];
  var items = getPrizes().filter(function(p){
    return !p.isBundle && (p.bundledInto===bName || bItems.indexOf(p.id)>-1 || bItems.indexOf(String(p.id))>-1);
  });
  var isExpanded = !!b._expanded;

  // Photo collage from items
  var allThumbs = [];
  items.forEach(function(p){ (p.photos||[]).forEach(function(ph){ if(allThumbs.length<4) allThumbs.push(ph.thumb||ph); }); });

  var photoGrid = '';
  if (allThumbs.length === 0) {
    photoGrid = '<div style="width:70px;height:70px;border-radius:8px;background:var(--bg2);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="ti ti-packages" style="font-size:24px;color:var(--text3)"></i></div>';
  } else if (allThumbs.length === 1) {
    photoGrid = '<img src="'+allThumbs[0]+'" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0">';
  } else {
    photoGrid = '<div style="width:70px;height:70px;display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:8px;overflow:hidden;flex-shrink:0">';
    allThumbs.slice(0,4).forEach(function(src){ photoGrid += '<img src="'+src+'" style="width:100%;height:100%;object-fit:cover">'; });
    photoGrid += '</div>';
  }

  var itemsHtml = '';
  if (isExpanded) {
    itemsHtml = '<div style="margin-top:10px;border-top:.5px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:6px">';
    items.forEach(function(p){
      var th = (p.photos&&p.photos[0])
        ? '<img src="'+(p.photos[0].thumb||p.photos[0])+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0">'
        : '<div style="width:36px;height:36px;border-radius:4px;background:var(--bg3);flex-shrink:0"></div>';
      itemsHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)">'+
        th+
        '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">'+escHtml(p.name||'')+'</div>'+
        '<div style="font-size:10px;color:var(--text3)">'+escHtml(p.cat||'')+' · '+escHtml(p.itemType||'')+'</div></div>'+
        '<button onclick="event.stopPropagation();removeFromBundle('+p.id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--red);cursor:pointer;font-family:inherit">Remove</button>'+
      '</div>';
    });
    itemsHtml += '</div>';
  }

  var totalValue = items.reduce(function(s,p){ return s+(+p.value||0); },0);

  return '<div class="prize-card" style="border-color:var(--purple);background:var(--bg)">'+
    '<div style="display:flex;gap:10px;align-items:flex-start;cursor:pointer" onclick="toggleBundleExpand('+b.id+')">'+
      photoGrid+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'+
          '<span class="cat-pill cat-'+(b.cat||'').toLowerCase().replace(/ /g,'-')+'">'+escHtml(b.cat||'Bundle')+'</span>'+
          '<span style="font-size:10px;background:var(--purple-bg);color:var(--purple-text);padding:1px 6px;border-radius:8px"><i class="ti ti-packages" style="font-size:9px"></i> Bundle</span>'+
        '</div>'+
        '<div style="font-size:14px;font-weight:700">'+escHtml(b.name||'Bundle')+'</div>'+
        '<div style="font-size:11px;color:var(--text2);margin-top:2px">'+items.length+' items'+(totalValue?' · Est '+fmt$(totalValue):'')+'</div>'+
        '<div style="font-size:11px;color:var(--text3)">Tap to '+(isExpanded?'collapse':'expand')+'</div>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">'+
        '<button onclick="event.stopPropagation();openEditBundle('+b.id+')" style="font-size:11px;padding:3px 8px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--text2);cursor:pointer;font-family:inherit"><i class="ti ti-pencil" style="font-size:11px"></i> Edit</button>'+
        '<i class="ti ti-chevron-'+(isExpanded?'up':'down')+'" style="font-size:14px;color:var(--text3)"></i>'+
      '</div>'+
    '</div>'+
    itemsHtml+
  '</div>';
}

async function toggleBundleExpand(id) {
  var p = getPrize(id);
  if (p) { await updatePrize(id, {_expanded: !p._expanded}); renderPrizes(); }
}

// ── Photo viewer ──────────────────────────────────────────────────────────────
async function viewPhoto(prizeId, idx) {
  var p = getPrize(prizeId);
  if (!p || !p.photos || !p.photos[idx]) return;
  if (!p.photos[idx].full) await loadFullPhotos(prizeId);
  var photo = getPrize(prizeId)?.photos?.[idx];
  if (!photo) return;
  var src = photo.full || photo.thumb || photo;
  var nav = '';
  if (p.photos.length > 1) {
    if (idx > 0) nav += '<button class="btn" onclick="closeModal();viewPhoto('+prizeId+','+(idx-1)+')">‹ Prev</button>';
    if (idx < p.photos.length-1) nav += '<button class="btn" onclick="closeModal();viewPhoto('+prizeId+','+(idx+1)+')">Next ›</button>';
  }
  showModal('<div style="text-align:center"><img src="'+src+'" style="max-width:100%;max-height:70vh;border-radius:8px;object-fit:contain">'+
    '<div style="margin-top:8px;font-size:12px;color:var(--text2)">'+escHtml(p.name||'')+' — Photo '+(idx+1)+' of '+p.photos.length+'</div>'+
    (nav?'<div style="display:flex;justify-content:center;gap:6px;margin-top:8px">'+nav+'</div>':'')+
    '</div><div class="m-actions"><button class="btn" onclick="closeModal()">Close</button></div>');
}

// ── Bundle building ───────────────────────────────────────────────────────────
function startBundle(anchorId) {
  _bundleMode = true; _bundleAnchor = anchorId; _bundleSelected = new Set([anchorId]);
  renderPrizes(); window.scrollTo(0,0);
}
function toggleBundleSelect(id) {
  if (!_bundleMode) return;
  if (id === _bundleAnchor) return;
  var p = getPrize(id);
  // Block adding prizes already in a different bundle
  if (p && p.bundledInto) {
    showToast('This prize is already in a bundle', 'error');
    return;
  }
  if (_bundleSelected.has(id)) { _bundleSelected.delete(id); } else { _bundleSelected.add(id); }
  renderPrizes();
}
function cancelBundle() {
  _bundleMode = false; _bundleAnchor = null; _bundleSelected = new Set(); renderPrizes();
}
function finishBundle() {
  if (_bundleSelected.size < 2) { showToast('Select at least 2 prizes to bundle','error'); return; }
  var mc = document.getElementById('modal-container');
  mc.innerHTML = '';
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.onclick = function(e){ if(e.target===overlay){ overlay.remove(); cancelBundle(); } };
  var box = document.createElement('div'); box.className = 'modal';
  var h3 = document.createElement('h3'); h3.textContent = 'Name this bundle';
  var sub = document.createElement('p'); sub.style.cssText='font-size:12px;color:var(--text2);margin-bottom:12px';
  sub.textContent = _bundleSelected.size+' prizes selected';
  var nf = document.createElement('div'); nf.className='field';
  nf.innerHTML='<label>Bundle name</label><input type="text" id="bundle-name" placeholder="e.g. Dream book set" style="width:100%">';
  var cf = document.createElement('div'); cf.className='field';
  cf.innerHTML='<label>Category</label><select id="bundle-cat" style="width:100%">'+
    CATEGORIES.filter(function(c){return c!=='Raffle';}).map(function(c){return '<option>'+c+'</option>';}).join('')+'</select>';
  var ac = document.createElement('div'); ac.className='m-actions';
  var cb = document.createElement('button'); cb.className='btn'; cb.textContent='Cancel';
  cb.onclick=function(){overlay.remove();cancelBundle();};
  var sb = document.createElement('button'); sb.className='btn primary';
  sb.innerHTML='<i class="ti ti-packages"></i> Create bundle';
  sb.onclick=createBundle;
  ac.appendChild(cb); ac.appendChild(sb);
  box.appendChild(h3); box.appendChild(sub); box.appendChild(nf); box.appendChild(cf); box.appendChild(ac);
  overlay.appendChild(box); mc.appendChild(overlay);
  setTimeout(function(){ document.getElementById('bundle-name')?.focus(); },50);
}
async function createBundle() {
  var name = document.getElementById('bundle-name')?.value?.trim();
  if (!name) { showToast('Please enter a bundle name','error'); return; }
  var cat = document.getElementById('bundle-cat')?.value || 'BINGO';
  var sel = Array.from(_bundleSelected).map(function(id){return getPrize(id);}).filter(Boolean);
  var allThumbs = []; sel.forEach(function(p){(p.photos||[]).forEach(function(ph){if(allThumbs.length<4)allThumbs.push(ph);});});
  await addPrize({name:name,cat:cat,isBundle:true,bundleItems:Array.from(_bundleSelected),
    value:sel.reduce(function(s,p){return s+(+p.value||0);},0),
    paid:sel.reduce(function(s,p){return s+(+p.paid||0);},0),
    itemType:'Bundle',photos:allThumbs,qty:1,_expanded:false,
    notes:'Bundle: '+sel.map(function(p){return p.name;}).join(', ')});
  for (var id of _bundleSelected) {
    var p=getPrize(id);
    // Only bundle prizes that aren't already in another bundle
    if(p && !p.isBundle && !p.bundledInto) {
      await updatePrize(id, {bundledInto: name});
    }
  }
  document.getElementById('modal-container').innerHTML='';
  _bundleMode=false; _bundleAnchor=null; _bundleSelected=new Set();
  showToast('Bundle "'+name+'" created!'); renderPrizes(); renderGoals();
}

async function removeFromBundle(prizeId) {
  var p = getPrize(prizeId);
  if (!p) return;
  if (confirm('Remove "'+escHtml(p.name||'this prize')+'" from bundle and return it as an individual prize?')) {
    var bundleName = p.bundledInto;
    await updatePrize(prizeId, {bundledInto: null});
    var remaining = getPrizes().filter(function(q){ return q.bundledInto===bundleName && !q.isBundle; });
    if (remaining.length < 2) {
      var br = getPrizes().find(function(q){ return q.isBundle && q.name===bundleName; });
      if (br) {
        for (var i=0;i<remaining.length;i++) await updatePrize(remaining[i].id,{bundledInto:null});
        await deletePrize(br.id);
        showToast('Bundle disbanded — only 1 item left');
      } else { showToast('Removed from bundle'); }
    } else { showToast('Removed from bundle'); }
    closeModal(); renderPrizes(); renderGoals();
  }
}

function openEditBundle(id) {
  var b = getPrize(id);
  if (!b||!b.isBundle) return;
  var bName = b.name||String(b.id);
  var bItems = b.bundleItems || [];
  var items = getPrizes().filter(function(p){
    if (p.isBundle) return false;
    // Match by bundledInto name OR by bundleItems ID array
    return p.bundledInto===bName || 
           bItems.indexOf(p.id)>-1 || 
           bItems.indexOf(String(p.id))>-1 ||
           bItems.indexOf(+p.id)>-1;
  });
  var itemIds = new Set(items.map(function(p){return p.id;}));
  var avail = getPrizes().filter(function(p){
    return !p.isBundle && !p.bundledInto && p.cat!=='Raffle' && !itemIds.has(p.id);
  });
  showModal(
    '<h3>Edit bundle</h3>'+
    '<div class="field"><label>Bundle name</label><input type="text" id="eb-name" value="'+escHtml(b.name||'')+'" style="width:100%"></div>'+
    '<div class="field"><label>Category</label><select id="eb-cat" style="width:100%">'+
      CATEGORIES.filter(function(c){return c!=='Raffle';}).map(function(c){return '<option'+(b.cat===c?' selected':'')+'>'+c+'</option>';}).join('')+
    '</select></div>'+
    '<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">In bundle ('+items.length+')</div>'+
    '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">'+
      items.map(function(p){return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)">'+
        '<div style="flex:1;font-size:12px">'+escHtml(p.name||'')+'</div>'+
        '<button onclick="removeFromBundle('+p.id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--red);cursor:pointer;font-family:inherit">Remove</button>'+
      '</div>';}).join('')+
    '</div>'+
    (avail.length?'<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">Add to bundle</div>'+
    '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;max-height:200px;overflow-y:auto">'+
      avail.map(function(p){return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)">'+
        '<div style="flex:1;font-size:12px">'+escHtml(p.name||'')+'</div>'+
        '<button onclick="addToExistingBundle('+p.id+','+id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--purple-text);cursor:pointer;font-family:inherit">+ Add</button>'+
      '</div>';}).join('')+
    '</div>':'')+
    '<div class="m-actions">'+
      '<button class="btn danger" onclick="confirmDeleteBundle('+id+')"><i class="ti ti-trash"></i> Delete bundle</button>'+
      '<button class="btn" onclick="_editMode=false;_currentPrizeId=0;closeModal()">Cancel</button>'+
      '<button class="btn primary" onclick="saveEditBundle('+id+')"><i class="ti ti-check"></i> Save</button>'+
    '</div>'
  );
}
async function saveEditBundle(id) {
  var name = document.getElementById('eb-name')?.value?.trim();
  var cat  = document.getElementById('eb-cat')?.value;
  if (!name) { showToast('Please enter a name','error'); return; }
  var oldName = getPrize(id)?.name;
  await updatePrize(id, {name:name,cat:cat});
  if (oldName&&oldName!==name) {
    var items = getPrizes().filter(function(p){return p.bundledInto===oldName;});
    for (var p of items) await updatePrize(p.id,{bundledInto:name});
  }
  closeModal(); showToast('Bundle saved'); renderPrizes();
}
async function addToExistingBundle(prizeId, bundleId) {
  var bundle = getPrize(bundleId);
  if (!bundle) return;
  await updatePrize(prizeId, {bundledInto:bundle.name});
  closeModal(); openEditBundle(bundleId); renderPrizes();
}
async function confirmDeleteBundle(id) {
  var b = getPrize(id);
  if (!b) return;
  var bName = b.name||String(b.id);
  var bItems = b.bundleItems || [];
  var items = getPrizes().filter(function(p){
    if (p.isBundle) return false;
    // Match by bundledInto name OR by bundleItems ID array
    return p.bundledInto===bName || 
           bItems.indexOf(p.id)>-1 || 
           bItems.indexOf(String(p.id))>-1 ||
           bItems.indexOf(+p.id)>-1;
  });
  if (confirm('Delete bundle "'+escHtml(b.name||'')+'"?\n\n'+items.length+' items will return as individual prizes. They will NOT be deleted.')) {
    for (var i=0;i<items.length;i++) await updatePrize(items[i].id,{bundledInto:null});
    await deletePrize(id);
    closeModal(); showToast('Bundle deleted — items restored'); renderPrizes(); renderGoals();
  }
}

// ── Add/Edit prize modal ──────────────────────────────────────────────────────
function savePrizeModal() {
  // Read prize ID from modal data attribute (more reliable than global state)
  var box = document.querySelector('.modal[data-prize-id]');
  var modalPrizeId = box ? parseInt(box.dataset.prizeId) : 0;
  if (modalPrizeId) {
    doEditPrize(modalPrizeId);
  } else if (_editMode && _currentPrizeId) {
    doEditPrize(_currentPrizeId);
  } else {
    doAddPrize();
  }
}

async function openAddPrize() {
  _editMode = false; _currentPrizeId = 0; _pendingPhotos = [];
  // Small delay to ensure any previous modal is fully gone
  await new Promise(function(r){ setTimeout(r, 50); });
  await showPrizeModal(null, getAuthors(), getItemTypes());
}

async function openEditPrize(id) {
  // Always hard-reset first to ensure clean state
  _editMode = false; _currentPrizeId = 0; _pendingPhotos = [];
  var p = getPrize(id);
  if (!p) { showToast('Prize not found', 'error'); return; }
  _pendingPhotos = [...(p.photos||[])];
  _editMode = true;
  _currentPrizeId = id;
  // Small delay to ensure any previous modal is fully gone
  await new Promise(function(r){ setTimeout(r, 50); });
  await showPrizeModal(p, getAuthors(), getItemTypes());
}

async function showPrizeModal(p, authors, itemTypes) {
  var isEdit = !!p;
  var donorType = (p&&p.donorType)||'none';
  // Store the prize ID as a data attribute so savePrizeModal can find it reliably
  var prizeId = p ? p.id : 0;

  var catOptions = '<option value="">— Select category —</option>'+
    CATEGORIES.map(function(c){return '<option'+(p&&p.cat===c?' selected':'')+'>'+c+'</option>';}).join('');
  var typeBtns = itemTypes.map(function(t){
    return '<button class="cat-btn'+(p&&p.itemType===t?' active':'')+'" onclick="selectItemType(\''+escHtml(t)+'\')" id="itype-'+t.replace(/ /g,'_')+'">'+escHtml(t)+'</button>';
  }).join('')+'<button class="cat-btn" onclick="addNewItemType()"><i class="ti ti-plus"></i> New</button>';

  var tagHtml = isEdit ? getTagStatusHtml(p) : '';
  var actions = '<div class="m-actions">'+
    (isEdit?'<button class="btn danger" onclick="confirmDeletePrize('+p.id+')"><i class="ti ti-trash"></i> Delete</button>':'')+
    '<button class="btn" onclick="closeModal()">Cancel</button>'+
    '<button class="btn primary" onclick="savePrizeModal()"><i class="ti ti-check"></i> '+(isEdit?'Save':'Add prize')+'</button>'+
  '</div>';

  var mc = document.getElementById('modal-container');
  mc.innerHTML = '';
  var overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='modal-bg';
  overlay.onclick=function(e){if(e.target===overlay){_editMode=false;_currentPrizeId=0;closeModal();}};
  var box = document.createElement('div');
  box.className='modal';
  if (prizeId) box.dataset.prizeId = String(prizeId);

  box.innerHTML =
    '<button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button>'+
    '<h3>'+(isEdit?'Edit prize':'Add prize')+'</h3>'+
    '<div class="field"><label>Prize name</label><input type="text" id="pm-name" value="'+escHtml((p&&p.name)||'')+'" placeholder="What is the prize?"></div>'+
    '<div class="field"><label>Category</label><select id="pm-cat">'+catOptions+'</select></div>'+
    '<div class="field"><label>Item type</label><div style="display:flex;gap:6px;flex-wrap:wrap">'+typeBtns+'</div><input type="hidden" id="pm-item-type" value="'+escHtml((p&&p.itemType)||'Misc')+'"></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">'+
      '<div class="field"><label>Est value ($)</label><input type="text" inputmode="decimal" id="pm-value" value="'+((p&&p.value)||'')+'" placeholder="0.00"></div>'+
      '<div class="field"><label>Amount paid ($)</label><input type="text" inputmode="decimal" id="pm-paid" value="'+((p&&p.paid)||'')+'" placeholder="0.00"></div>'+
      '<div class="field"><label>Qty</label><input type="number" id="pm-qty" value="'+((p&&p.qty)||'')+'" placeholder="1" min="1"></div>'+
      '<div class="field"><label>Location</label><input type="text" id="pm-loc" value="'+escHtml((p&&p.loc)||'')+'" placeholder="Where is it?"></div>'+
    '</div>'+
    '<div class="field"><label>Notes</label><textarea id="pm-notes" rows="2" placeholder="Any notes\u2026">'+escHtml((p&&p.notes)||'')+'</textarea></div>'+
    '<div class="field"><label>Donor</label>'+
      '<div style="display:flex;gap:6px;margin-bottom:8px">'+
        '<button class="cat-btn'+(donorType==='none'?' active':'')+'" onclick="setDonorType(\'none\')" id="donor-btn-none">None</button>'+
        '<button class="cat-btn'+(donorType==='author'?' active':'')+'" onclick="setDonorType(\'author\')" id="donor-btn-author">Author</button>'+
        '<button class="cat-btn'+(donorType==='business'?' active':'')+'" onclick="setDonorType(\'business\')" id="donor-btn-business">Business</button>'+
      '</div>'+
      '<div id="donor-fields"></div>'+
    '</div>'+
    '<div class="field"><label>Photos</label>'+
      '<div id="photo-preview" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>'+
      '<div style="display:flex;gap:6px">'+
        '<label class="btn" style="cursor:pointer"><i class="ti ti-camera"></i> Take photo<input type="file" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoFile(this)"></label>'+
        '<label class="btn" style="cursor:pointer"><i class="ti ti-photo"></i> Choose<input type="file" accept="image/*" multiple style="display:none" onchange="handlePhotoFile(this)"></label>'+
      '</div>'+
    '</div>'+
    tagHtml+
    actions;

  overlay.appendChild(box);
  mc.appendChild(overlay);

  setDonorType(donorType, p);
  renderPhotoPreview();
  if (p&&p.donor) {
    setTimeout(function(){
      var el=document.getElementById('pm-donor'); if(el){el.value=p.donor;toggleOtherAuthor(p.donor);}
      var ws=document.getElementById('pm-website'); if(ws&&p.donorWebsite)ws.value=p.donorWebsite;
      var qt=document.getElementById('pm-qrtype');  if(qt&&p.donorQRType) qt.value=p.donorQRType;
      var pr=document.getElementById('pm-pronoun'); if(pr&&p.donorPronoun)pr.value=p.donorPronoun;
      var lg=document.getElementById('pm-logo');    if(lg&&p.donorLogo)   lg.value=p.donorLogo;
    },50);
  }
}

function selectItemType(t) {
  document.querySelectorAll('[id^="itype-"]').forEach(function(b){b.classList.remove('active');});
  var btn=document.getElementById('itype-'+t.replace(/ /g,'_')); if(btn)btn.classList.add('active');
  var inp=document.getElementById('pm-item-type'); if(inp)inp.value=t;
}
function addNewItemType() {
  var name=prompt('New item type name:');
  if(!name||!name.trim())return;
  addItemType(name.trim()).then(function(){showToast('Item type added');openAddPrize();});
}

function setDonorType(type, preFill) {
  ['none','author','business'].forEach(function(t){
    var btn=document.getElementById('donor-btn-'+t); if(btn)btn.classList.toggle('active',t===type);
  });
  var el=document.getElementById('donor-fields'); if(!el)return;
  if(type==='none'){el.innerHTML='';return;}
  var isAuthor=type==='author';
  var authors=getAuthors();
  var html='';
  if(isAuthor){
    html+='<div class="field"><label>Author</label>'+
      '<select id="pm-donor" onchange="toggleOtherAuthor(this.value)">'+
      '<option value="">— Select author —</option>'+
      authors.map(function(a){return '<option>'+escHtml(a)+'</option>';}).join('')+
      '<option value="__other__">Other (enter name)</option>'+
      '</select></div>'+
      '<div id="other-author-field" style="display:none" class="field"><label>Author name</label><input type="text" id="pm-other-author" placeholder="Full name"></div>';
  } else {
    html+='<div class="field"><label>Business name</label><input type="text" id="pm-donor" placeholder="Business name"></div>';
  }
  html+=
    '<div class="field"><label>Donor website (for QR code)</label><input type="text" id="pm-website" placeholder="https://\u2026"></div>'+
    '<div class="field"><label>QR type</label><select id="pm-qrtype"><option value="website">Website</option><option value="instagram">Instagram</option></select></div>'+
    '<div class="field"><label>Pronoun</label><select id="pm-pronoun"><option value="their">their</option><option value="her">her</option><option value="his">his</option></select></div>'+
    '<div class="field"><label>Logo</label>'+
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
        '<label class="btn" style="cursor:pointer;font-size:12px"><i class="ti ti-upload"></i> Upload logo<input type="file" accept="image/*" style="display:none" onchange="handleLogoUpload(this)"></label>'+
        '<span style="font-size:11px;color:var(--text3)">or</span>'+
        '<input type="text" id="pm-logo" placeholder="Paste Google Drive link" style="flex:1;min-width:100px">'+
      '</div>'+
      '<div id="pm-logo-preview" style="margin-top:6px"></div>'+
    '</div>';
  el.innerHTML=html;
  el.dataset.donorType=type;
}
function toggleOtherAuthor(val){
  var f=document.getElementById('other-author-field'); if(f)f.style.display=val==='__other__'?'block':'none';
}
async function handleLogoUpload(input){
  var file=input.files[0]; if(!file)return;
  showToast('Processing logo\u2026');
  var full=await compressImage(file,800,0.8);
  var thumb=await makeThumbnail(full,200,0.7);
  var li=document.getElementById('pm-logo'); if(li)li.value=full;
  var lp=document.getElementById('pm-logo-preview'); if(lp)lp.innerHTML='<img src="'+thumb+'" style="height:50px;border-radius:6px;border:.5px solid var(--border)">';
  showToast('Logo ready \u2713'); input.value='';
}
async function handlePhotoFile(input){
  var files=Array.from(input.files);
  for(var i=0;i<files.length;i++){
    showToast('Processing photo\u2026');
    var full=await compressImage(files[i],1000,0.65);
    var thumb=await makeThumbnail(full,150,0.5);
    _pendingPhotos.push({full:full,thumb:thumb});
  }
  renderPhotoPreview(); showToast('Photo added!'); input.value='';
}
function renderPhotoPreview(){
  var el=document.getElementById('photo-preview'); if(!el)return;
  el.innerHTML=_pendingPhotos.map(function(ph,i){
    return '<div style="position:relative">'+
      '<img src="'+ph.thumb+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="viewPendingPhoto('+i+')">'+
      '<button onclick="removePendingPhoto('+i+')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">\xd7</button>'+
    '</div>';
  }).join('');
}
function viewPendingPhoto(i){
  if(!_pendingPhotos[i])return;
  showModal('<img src="'+_pendingPhotos[i].full+'" style="max-width:100%;max-height:75vh;border-radius:8px;object-fit:contain;display:block;margin:0 auto">'+
    '<div class="m-actions"><button class="btn" onclick="closeModal()">Close</button></div>');
}
function removePendingPhoto(i){_pendingPhotos.splice(i,1);renderPhotoPreview();}

function getTagStatusHtml(p){
  if(!p)return'';
  var checks=[{key:'tagMade',label:'Tag made'},{key:'tagPrinted',label:'Tag printed'},{key:'tagAttached',label:'Tag attached'},{key:'onTote',label:'On tote paper'}];
  return'<div class="field"><label>Donation tag status</label>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">'+
    checks.map(function(c,i){return'<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border-radius:var(--radius-sm);border:.5px solid var(--border);cursor:pointer;font-size:13px">'+
      '<input type="checkbox" id="pm-'+c.key+'" '+(p[c.key]?'checked':'')+' style="accent-color:var(--purple);width:16px;height:16px;flex-shrink:0">'+
      '<span><span style="font-size:10px;color:var(--text3);display:block">Step '+(i+1)+'</span>'+c.label+'</span></label>';}).join('')+
    '</div></div>';
}

function parseMoney(val){
  var s=String(val||'').trim().replace(/[^0-9.]/g,'');
  if(!s)return 0;
  return s.includes('.')?Math.round(parseFloat(s)*100)/100:parseInt(s,10);
}
function getDonorFields(){
  var el=document.getElementById('donor-fields');
  if(!el)return{donorType:'none'};
  var type=el.dataset.donorType||'none';
  if(type==='none')return{donorType:'none',donor:'',donorWebsite:'',donorQRType:'website',donorPronoun:'their',donorLogo:''};
  var donor=document.getElementById('pm-donor')?.value||'';
  if(donor==='__other__')donor=document.getElementById('pm-other-author')?.value?.trim()||'';
  return{donorType:type,donor:donor,
    donorWebsite:document.getElementById('pm-website')?.value?.trim()||'',
    donorQRType:document.getElementById('pm-qrtype')?.value||'website',
    donorPronoun:document.getElementById('pm-pronoun')?.value||'their',
    donorLogo:document.getElementById('pm-logo')?.value?.trim()||'',
    needTag:!!donor.trim()};
}

async function doAddPrize(){
  showToast('Saving\u2026');
  var name=document.getElementById('pm-name')?.value?.trim();
  if(!name){showToast('Please enter a prize name','error');return;}
  var cat=document.getElementById('pm-cat')?.value;
  if(!cat){showToast('Please select a category','error');return;}
  var donor=getDonorFields();
  await addPrize({name:name,cat:cat,
    itemType:document.getElementById('pm-item-type')?.value||'Misc',
    value:parseMoney(document.getElementById('pm-value')?.value),
    paid:parseMoney(document.getElementById('pm-paid')?.value),
    qty:parseInt(document.getElementById('pm-qty')?.value)||1,
    loc:document.getElementById('pm-loc')?.value?.trim()||'',
    notes:document.getElementById('pm-notes')?.value?.trim()||'',
    photos:[..._pendingPhotos],...donor});
  _pendingPhotos=[]; _editMode=false; _currentPrizeId=0;
  closeModal(); renderPrizes(); renderGoals();
}

async function doEditPrize(id){
  var name=document.getElementById('pm-name')?.value?.trim();
  if(!name){showToast('Please enter a prize name','error');return;}
  var donor=getDonorFields();
  var tagFields={
    tagMade:document.getElementById('pm-tagMade')?.checked||false,
    tagPrinted:document.getElementById('pm-tagPrinted')?.checked||false,
    tagAttached:document.getElementById('pm-tagAttached')?.checked||false,
    onTote:document.getElementById('pm-onTote')?.checked||false,
  };
  await updatePrize(id,{name:name,
    cat:document.getElementById('pm-cat')?.value||'',
    itemType:document.getElementById('pm-item-type')?.value||'Misc',
    value:parseMoney(document.getElementById('pm-value')?.value),
    paid:parseMoney(document.getElementById('pm-paid')?.value),
    qty:parseInt(document.getElementById('pm-qty')?.value)||1,
    loc:document.getElementById('pm-loc')?.value?.trim()||'',
    notes:document.getElementById('pm-notes')?.value?.trim()||'',
    photos:[..._pendingPhotos],...donor,...tagFields});
  _pendingPhotos=[]; _editMode=false; _currentPrizeId=0;
  closeModal(); showToast('Prize saved!'); renderPrizes(); renderGoals();
}

function confirmDeletePrize(id){
  var p=getPrize(id);
  if(!p)return;
  if(confirm('Delete "'+escHtml(p.name||'this prize')+'"? This cannot be undone.')){
    deletePrize(id).then(function(){closeModal();showToast('Prize deleted');renderPrizes();renderGoals();});
  }
}
