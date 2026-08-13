// ui-goals.js — editable goals, auto-BINGO from attendance, budget bar from HQ

const DEFAULT_GOALS = { BINGO: 260, Raffle: 7, Medium: 10, Small: 10 };

function getGoals() {
  return { ...DEFAULT_GOALS, ...(window._prizeGoals || {}) };
}

async function loadGoalsAndBudget() {
  if (!window.FIREBASE_DB_URL) return;
  try {
    // Load editable goals
    const goals = await dbGet('meta/goals');
    if (goals) window._prizeGoals = goals;

    // Load attendance from HQ for BINGO calc
    const att = await dbGet('hq/attendance');
    if (att && att.total) {
      if (!window._prizeGoals) window._prizeGoals = {};
      window._prizeGoals.BINGO = (+att.total || 250) + 10;
    }

    // Load prize + raffle budget from HQ
    const expenses = await dbGet('hq/expenses');
    if (expenses) {
      const arr = Object.values(expenses);
      const prizeLine  = arr.find(e => e.id === 'prizes');
      const raffleLine = arr.find(e => e.id === 'raffle');
      window._prizeBudget  = prizeLine  ? (+prizeLine.fixedAmt  || 0) : 0;
      window._raffleBudget = raffleLine ? (+raffleLine.fixedAmt || 0) : 0;
    }
  } catch(e) { console.warn('Goals/budget load failed:', e); }
}

async function saveGoal(cat, val) {
  if (!window._prizeGoals) window._prizeGoals = {};
  window._prizeGoals[cat] = +val;
  if (window.FIREBASE_DB_URL) {
    await dbSet('meta/goals/' + cat, +val);
  }
  renderGoals();
}

function renderGoals() {
  const el = document.getElementById('goals-bar');
  if (!el) return;

  const prizes = getPrizes().filter(p => !p.bundledInto);
  const goals  = getGoals();
  const cats   = ['BINGO', 'Raffle', 'Medium', 'Small'];

  // Budget bar
  const prizeBudget  = window._prizeBudget  || 0;
  const raffleBudget = window._raffleBudget || 0;
  const totalBudget  = prizeBudget + raffleBudget;
  const totalSpent   = prizes.reduce((s,p) => s + (+p.paid||0), 0);
  const remaining    = totalBudget - totalSpent;
  const budgetBar = totalBudget > 0 ? `
    <div style="background:var(--bg);border:.5px solid var(--border);border-radius:var(--radius-md);padding:8px 12px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      <div style="flex:1;min-width:160px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text2);margin-bottom:4px">Prize budget</div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="height:100%;background:${remaining>=0?'var(--green)':'var(--red)'};width:${Math.min(100,Math.round(totalSpent/totalBudget*100))}%;border-radius:3px"></div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-shrink:0;font-size:12px">
        <div><div style="color:var(--text2);font-size:10px">BINGO budget</div><div style="font-weight:600">$${prizeBudget.toFixed(0)}</div></div>
        <div><div style="color:var(--text2);font-size:10px">Raffle budget</div><div style="font-weight:600">$${raffleBudget.toFixed(0)}</div></div>
        <div><div style="color:var(--text2);font-size:10px">Spent</div><div style="font-weight:600;color:var(--amber)">$${totalSpent.toFixed(0)}</div></div>
        <div><div style="color:var(--text2);font-size:10px">Left</div><div style="font-weight:600;color:${remaining>=0?'var(--green)':'var(--red)'}">$${remaining.toFixed(0)}</div></div>
      </div>
    </div>` : '';

  el.innerHTML = budgetBar + `<div class="goals-bar">` + cats.map(cat => {
    const goal = goals[cat] || 0;
    const have = prizes.filter(p => p.cat===cat).reduce((s,p) => s + (+p.qty||1), 0);
    const need = Math.max(0, goal - have);
    const cls  = have >= goal ? 'good' : need <= 10 ? 'warn' : 'bad';
    const isAuto   = cat === 'BINGO';
    const isList   = cat === 'Medium' || cat === 'Small';
    const isRaffle = cat === 'Raffle';

    return `<div class="goal-card${isList ? ' goal-card-tap' : ''}" ${isList ? `onclick="openPrizeListSheet('${cat}')"` : ''}>
      <div class="goal-label" style="display:flex;align-items:center;justify-content:space-between">
        <span>${cat}${isAuto ? ` <span style="font-size:9px;color:var(--text3)">(auto)</span>` : ''}</span>
        ${isList ? `<i class="ti ti-chevron-right" style="font-size:11px;color:var(--text3)"></i>` : ''}
      </div>
      <div class="goal-nums">
        <span class="goal-have">${have}</span>
        <span class="goal-of">/</span>
        ${isAuto || isList
          ? `<span class="goal-of">${goal}</span>`
          : `<input type="number" value="${goal}" min="1"
              style="width:44px;font-size:16px;font-weight:600;border:none;border-bottom:1.5px solid var(--border2);background:transparent;color:var(--text);text-align:center;padding:0"
              onclick="event.stopPropagation()"
              onblur="saveGoal('${cat}',this.value)"
              onkeydown="if(event.key==='Enter')this.blur()">`}
      </div>
      <div class="goal-need ${cls}">${need > 0 ? need + ' needed' : '✓ Done'}</div>
      ${isList ? `<div style="font-size:9px;color:var(--text3);margin-top:2px">Tap to manage</div>` : ''}
    </div>`;
  }).join('') + `
    <div class="goal-card">
      <div class="goal-label">SWAG Bag</div>
      <div class="goal-nums"><span class="goal-have">${prizes.filter(p=>p.cat==='SWAG Bag').length}</span></div>
      <div class="goal-need" style="color:var(--text3)">No cap</div>
    </div>
  </div>`;
}


// ── Prize list sheet for Medium / Small ──────────────────────────────────────

function openPrizeListSheet(cat) {
  const prizes = getPrizes().filter(p => p.cat === cat && !p.bundledInto);
  
  const rows = prizes.map(p => prizeSheetRow(p)).join('');

  showModal(`
    <h3 style="display:flex;align-items:center;justify-content:space-between">
      <span>${cat} prizes <span style="font-size:12px;font-weight:400;color:var(--text2)">(${prizes.length} needed)</span></span>
      <button class="btn primary" style="font-size:11px;padding:4px 10px" onclick="closeModal();openAddPrizeModalForCat('${cat}')">
        <i class="ti ti-plus"></i> Add
      </button>
    </h3>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px">
      The number of items here = the goal shown on the goals bar. Swipe left to delete.
    </div>
    <div id="prize-sheet-list" style="display:flex;flex-direction:column;gap:5px;max-height:65vh;overflow-y:auto">
      ${rows || '<div style="text-align:center;padding:1.5rem;color:var(--text3)">No ' + cat + ' prizes yet. Tap Add to add one.</div>'}
    </div>
    <div class="m-actions">
      <button class="btn" onclick="closeModal()">Done</button>
    </div>
  `);
}

let _sheetSwipedId = null, _sheetSwipeX = 0;

function prizeSheetRow(p) {
  const isOpen = _sheetSwipedId === p.id;
  const expanded = p._sheetExpanded;
  return `<div class="swipe-row${isOpen?' open':''}" id="spr-${p.id}" style="background:var(--bg);border:.5px solid var(--border);border-radius:var(--radius-sm)">
    <div class="swipe-content" style="background:transparent"
      ontouchstart="_sheetSwipeX=event.touches[0].clientX"
      ontouchend="sheetSwipeEnd(event,${p.id})">
      <div style="padding:9px 12px;cursor:pointer" onclick="toggleSheetExpand(${p.id})">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${escHtml(p.name||'Unnamed')}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">
              ${p.value?`$${(+p.value).toFixed(2)}`:'No value'} 
              ${p.donor?`· <span style="color:var(--purple-text)">${escHtml(p.donor)}</span>`:''}
              ${p.loc?`· ${escHtml(p.loc)}`:''}
            </div>
          </div>
          <i class="ti ti-chevron-${expanded?'up':'down'}" style="font-size:12px;color:var(--text3);flex-shrink:0"></i>
        </div>
        ${expanded ? prizeSheetDetail(p) : ''}
      </div>
    </div>
    <div class="swipe-delete" onclick="deleteSheetPrize(${p.id},'${p.cat}')">
      <i class="ti ti-trash"></i> Delete
    </div>
  </div>`;
}

function prizeSheetDetail(p) {
  return `<div style="margin-top:10px;padding-top:10px;border-top:.5px solid var(--border)" onclick="event.stopPropagation()">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Name</div>
        <input type="text" value="${escHtml(p.name||'')}" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'name',this.value)">
      </div>
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Item type</div>
        <select style="width:100%;font-size:12px;padding:3px 6px"
          onchange="updateSheetPrize(${p.id},'itemType',this.value)">
          ${['Other','Book','Clothing'].map(t=>`<option${(p.itemType||'Other')===t?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Est. value ($)</div>
        <input type="text" inputmode="decimal" value="${p.value||''}" placeholder="0.00" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'value',parseFloat(this.value)||0)">
      </div>
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Paid ($)</div>
        <input type="text" inputmode="decimal" value="${p.paid||''}" placeholder="0.00" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'paid',parseFloat(this.value)||0)">
      </div>
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Qty</div>
        <input type="number" value="${p.qty||1}" min="1" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'qty',+this.value||1)">
      </div>
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Location</div>
        <input type="text" value="${escHtml(p.loc||'')}" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'loc',this.value)">
      </div>
    </div>
    <!-- Donor -->
    <div style="font-size:10px;color:var(--text2);margin-bottom:4px">Donor</div>
    <div style="display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap">
      ${['none','author','business'].map(dt=>`
        <button class="dt-opt${(p.donorType||'none')===dt?' active':''}" style="font-size:11px;padding:3px 9px"
          onclick="updateSheetPrize(${p.id},'donorType','${dt}');toggleSheetExpand(${p.id},true)">
          ${dt==='none'?'None':dt.charAt(0).toUpperCase()+dt.slice(1)}
        </button>`).join('')}
    </div>
    ${p.donorType&&p.donorType!=='none'?`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div style="grid-column:1/-1">
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Donor name</div>
        <input type="text" value="${escHtml(p.donor||'')}" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'donor',this.value)">
      </div>
      <div style="grid-column:1/-1">
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Website / URL (for QR code)</div>
        <input type="text" value="${escHtml(p.donorQRDest||p.url||'')}" placeholder="https://…" style="width:100%;font-size:12px;padding:3px 7px"
          onblur="updateSheetPrize(${p.id},'donorQRDest',this.value)">
      </div>
      <div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Pronoun</div>
        <select style="width:100%;font-size:12px;padding:3px 6px"
          onchange="updateSheetPrize(${p.id},'donorPronoun',this.value)">
          ${['their','her','his'].map(pr=>`<option${(p.donorPronoun||'their')===pr?' selected':''}>${pr}</option>`).join('')}
        </select>
      </div>
    </div>`:'' }
    <div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:2px">Notes</div>
      <textarea style="width:100%;font-size:12px;padding:3px 7px;min-height:48px;font-family:inherit;border:.5px solid var(--border2);border-radius:var(--radius-sm);background:var(--bg);color:var(--text)"
        onblur="updateSheetPrize(${p.id},'notes',this.value)">${escHtml(p.notes||'')}</textarea>
    </div>
  </div>`;
}

function toggleSheetExpand(id, keep) {
  const prizes = getPrizes();
  const p = prizes.find(x=>x.id===id);
  if (!p) return;
  if (!keep) p._sheetExpanded = !p._sheetExpanded;
  // Re-render just this row
  const el = document.getElementById('spr-'+id);
  if (el) {
    const cat = p.cat;
    // Rebuild the full list
    const catPrizes = prizes.filter(x=>x.cat===cat&&!x.bundledInto);
    const listEl = document.getElementById('prize-sheet-list');
    if (listEl) listEl.innerHTML = catPrizes.map(x=>prizeSheetRow(x)).join('');
  }
}

async function updateSheetPrize(id, field, val) {
  await updatePrize(id, {[field]: val});
  // Refresh list
  const p = getPrize(id);
  if (p) {
    const listEl = document.getElementById('prize-sheet-list');
    if (listEl) {
      const prizes = getPrizes().filter(x=>x.cat===p.cat&&!x.bundledInto);
      listEl.innerHTML = prizes.map(x=>prizeSheetRow(x)).join('');
    }
  }
  renderGoals();
}

async function deleteSheetPrize(id, cat) {
  if (!confirm('Delete this prize?')) return;
  await deletePrize(id);
  _sheetSwipedId = null;
  const listEl = document.getElementById('prize-sheet-list');
  if (listEl) {
    const prizes = getPrizes().filter(p=>p.cat===cat&&!p.bundledInto);
    listEl.innerHTML = prizes.length
      ? prizes.map(p=>prizeSheetRow(p)).join('')
      : `<div style="text-align:center;padding:1.5rem;color:var(--text3)">No ${cat} prizes yet.</div>`;
  }
  renderGoals();
}

function sheetSwipeEnd(e, id) {
  const dx = e.changedTouches[0].clientX - _sheetSwipeX;
  _sheetSwipedId = dx < -50 ? id : (dx > 20 ? null : _sheetSwipedId);
  // Re-render list
  const p = getPrize(id);
  if (!p) return;
  const listEl = document.getElementById('prize-sheet-list');
  if (listEl) {
    const prizes = getPrizes().filter(x=>x.cat===p.cat&&!x.bundledInto);
    listEl.innerHTML = prizes.map(x=>prizeSheetRow(x)).join('');
  }
}

async function openAddPrizeModalForCat(cat) {
  // Pre-set category when opening add modal
  await openAddPrizeModal();
  setTimeout(() => {
    const catSel = document.getElementById('ap-cat');
    if (catSel) catSel.value = cat;
  }, 100);
}
