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

  var searchFilter = function(p) { return true; };
  if (_searchQ.trim()) {
    var q = _searchQ.toLowerCase();
    searchFilter = function(p) {
      return (p.name||'').toLowerCase().includes(q) ||
             (p.donor||'').toLowerCase().includes(q) ||
             (p.cat||'').toLowerCase().includes(q) ||
             (p.notes||'').toLowerCase().includes(q);
    };
  }

  const allPrizes = getPrizes().filter(p => p && p.id !== undefined);
  const bundles = allPrizes.filter(p => p.isBundle);
  const individualPrizes = allPrizes.filter(p => !p.isBundle && !p.bundledInto && (!_filterCat || p.cat===_filterCat));
  const bundledPrizes = allPrizes.filter(p => !p.isBundle && !!p.bundledInto && (!_filterCat || p.cat===_filterCat));
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
      <div style="font-size:13px;color:var(--text2)">${individualPrizes.length} prizes · ${bundledPrizes.length} bundled · ${bundles.length} bundles</div>
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

    <div style="display:flex;flex-direction:column;gap:8px" id="prize-list-inner">
    </div>
    <div style="height:300px"></div>`;
  // Build list separately to avoid template literal nesting issues
  buildPrizeList(allPrizes, bundles, searchFilter);
}

function buildPrizeList(allPrizes, bundles, searchFilter) {
  var el = document.getElementById('prize-list-inner');
  if (!el) return;
  var filterCat = _filterCat;
  var bundsFiltered = bundles.filter(function(b){ return !filterCat || b.cat===filterCat; });
  var individual = allPrizes.filter(function(p){ return !p.isBundle && !p.bundledInto && (!filterCat || p.cat===filterCat) && searchFilter(p); });
  var bundled    = allPrizes.filter(function(p){ return !p.isBundle && !!p.bundledInto && (!filterCat || p.cat===filterCat) && searchFilter(p); });
  var html = bundsFiltered.map(function(b){ return bundleCard(b); }).join('') +
             individual.map(function(p){ return prizeCard(p); }).join('') +
             bundled.map(function(p){ return prizeCard(p); }).join('');
  if (!html) html = '<div style="text-align:center;padding:3rem;color:var(--text3)">No prizes found.</div>';
  el.innerHTML = html;
}

function debouncePrizeSearch(val) {
  _searchQ = val;
  clearTimeout(_prizeDebounce);
  _prizeDebounce = setTimeout(renderPrizes, 150);
}

function prizeCard(p) {
  const thumb    = p.photos && p.photos[0] ? p.photos[0].thumb : null;
  const tagStage = p.tagGenerated ? 'Tagged' :
                   p.onTote       ? '4. On tote' :
                   p.tagAttached  ? '3. Attached' :
                   p.tagPrinted   ? '2. Printed' :
                   p.tagMade      ? '1. Made' : '';
  const isBundled  = !!p.bundledInto;
  const isSelected = _bundleSelected.has(p.id);
  const isAnchor   = _bundleAnchor === p.id;
  const clickFn    = _bundleMode
    ? (isBundled ? '' : 'toggleBundleSelect('+p.id+')')
    : 'openEditPrize('+p.id+')';
  const opacity    = isBundled ? 'opacity:0.45;' : '';
  const border     = (isSelected||isAnchor) ? 'border-color:var(--purple);' : '';
  const bg         = (isSelected||isAnchor) ? 'background:var(--purple-bg);' : 'background:var(--bg);';
  const cardStyle  = opacity + border + bg;

  // Checkbox for bundle mode
  let checkbox = '';
  if (_bundleMode && !isBundled) {
    const checked = isSelected || isAnchor;
    checkbox = '<div style="width:22px;height:22px;border-radius:50%;border:2px solid '+(checked?'var(--purple)':'var(--border2)')+';background:'+(checked?'var(--purple)':'transparent')+';display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(checked?'<i class="ti ti-check" style="font-size:12px;color:white"></i>':'')+'</div>';
  }

  // Bundle button (not in bundle mode, not already bundled)
  let bundleBtn = '';
  if (!_bundleMode && !isBundled) {
    bundleBtn = '<button onclick="event.stopPropagation();startBundle('+p.id+')" style="font-size:10px;padding:2px 7px;border:.5px solid var(--border2);border-radius:8px;background:transparent;color:var(--text3);cursor:pointer;white-space:nowrap;font-family:inherit"><i class="ti ti-packages" style="font-size:10px"></i> Bundle</button>';
  }

  // Bundled-with label
  const bundleLabel = isBundled
    ? '<div style="text-align:right;font-size:10px;color:var(--text3);margin-top:4px;font-style:italic">Bundled with '+escHtml(p.bundledInto||'')+'</div>'
    : '';

  // Photo strip for multiple photos
  let extraPhotos = '';
  if (p.photos && p.photos.length > 1) {
    extraPhotos = '<div style="display:flex;gap:4px;margin-top:8px;padding-left:70px;overflow-x:auto">';
    p.photos.slice(1,5).forEach(function(ph, i) {
      extraPhotos += '<img src="'+ph.thumb+'" style="width:44px;height:44px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();viewPhoto('+p.id+','+(i+1)+')">';
    });
    if (p.photos.length > 5) {
      extraPhotos += '<div style="width:44px;height:44px;border-radius:4px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text2)">+'+( p.photos.length-5)+'</div>';
    }
    extraPhotos += '</div>';
  }

  const thumbHtml = thumb
    ? '<img src="'+thumb+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();viewPhoto('+p.id+',0)">'
    : '<div style="width:60px;height:60px;border-radius:6px;background:var(--bg2);border:.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center"><i class="ti ti-photo" style="font-size:20px;color:var(--text3)"></i></div>';

  return '<div class="prize-card" style="'+cardStyle+'" onclick="'+clickFn+'">'+
    '<div style="display:flex;gap:10px;align-items:flex-start">'+
      checkbox+
      thumbHtml+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">'+
          '<span class="cat-pill cat-'+(p.cat||'').toLowerCase().replace(' ','-')+'">'+escHtml(p.cat||'')+'</span>'+
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
        (p.notes?'<div style="font-size:11px;color:var(--text3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(p.notes)+'</div>':'')+
      '</div>'+
      '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">'+
        bundleBtn+
        '<i class="ti ti-chevron-right" style="font-size:14px;color:var(--text3)"></i>'+
      '</div>'+
    '</div>'+
    bundleLabel+
    extraPhotos+
  '</div>';
}


