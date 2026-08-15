// goals.js — goals bar with notes and numbered prize lists
var CAT_GOALS_KEY = 'prize_goals';

function getGoals() {
  var saved = JSON.parse(localStorage.getItem(CAT_GOALS_KEY)||'{}');
  return Object.assign({BINGO:185, Raffle:7, Medium:10, Small:10}, saved);
}
function saveGoal(cat, val) {
  var goals = getGoals();
  goals[cat] = +val;
  localStorage.setItem(CAT_GOALS_KEY, JSON.stringify(goals));
}
async function loadBINGOGoal() {
  try {
    var att = await dbGet('hq/attendance');
    if (att && att.total) {
      var goals = getGoals();
      goals.BINGO = (+att.total||175) + 10;
      localStorage.setItem(CAT_GOALS_KEY, JSON.stringify(goals));
    }
  } catch(e) {}
}
function getGoalNotes(cat) {
  return localStorage.getItem('goal_notes_'+cat)||'';
}
function getGoalPrizeList(cat) {
  return JSON.parse(localStorage.getItem('goal_prize_list_'+cat)||'[]');
}
function saveGoalPrizeList(cat, items) {
  localStorage.setItem('goal_prize_list_'+cat, JSON.stringify(items));
  saveGoal(cat, items.length);
}

// Notes modal for Raffle
function openGoalNotes(cat) {
  var current = getGoalNotes(cat);
  var mc = document.getElementById('modal-container');
  mc.innerHTML = '';
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'modal-bg';
  overlay.onclick = function(e){ if(e.target===overlay) closeModal(); };
  var box = document.createElement('div'); box.className = 'modal';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<i class="ti ti-x"></i>';
  closeBtn.onclick = closeModal;
  var h3 = document.createElement('h3'); h3.textContent = cat+' notes';
  var label = document.createElement('label');
  label.style.cssText = 'font-size:11px;color:var(--text2);display:block;margin-bottom:4px';
  label.textContent = 'Notes for '+cat+' prizes';
  var ta = document.createElement('textarea');
  ta.id = 'gn-notes'; ta.rows = 4; ta.style.width = '100%';
  ta.placeholder = 'e.g. Farthest traveled, Book bingo winner\u2026';
  ta.value = current;
  var actions = document.createElement('div'); actions.className = 'm-actions';
  var cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = 'Cancel'; cancelBtn.onclick = closeModal;
  var saveBtn = document.createElement('button'); saveBtn.className = 'btn primary';
  saveBtn.innerHTML = '<i class="ti ti-check"></i> Save';
  saveBtn.onclick = function(){ localStorage.setItem('goal_notes_'+cat, ta.value.trim()); closeModal(); showToast('Notes saved'); renderGoals(); };
  actions.appendChild(cancelBtn); actions.appendChild(saveBtn);
  box.appendChild(closeBtn); box.appendChild(h3); box.appendChild(label); box.appendChild(ta); box.appendChild(actions);
  overlay.appendChild(box); mc.appendChild(overlay);
  setTimeout(function(){ ta.focus(); }, 50);
}

// Numbered prize list modal for Medium and Small
function openGoalPrizeList(cat) {
  var items = getGoalPrizeList(cat);

  function render() {
    var mc = document.getElementById('modal-container');
    mc.innerHTML = '';
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay'; overlay.id = 'modal-bg';
    overlay.onclick = function(e){ if(e.target===overlay) closeModal(); };
    var box = document.createElement('div'); box.className = 'modal';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close'; closeBtn.innerHTML = '<i class="ti ti-x"></i>'; closeBtn.onclick = closeModal;
    var h3 = document.createElement('h3'); h3.textContent = cat+' prizes ('+items.length+')';
    var sub = document.createElement('p');
    sub.style.cssText = 'font-size:11px;color:var(--text2);margin-bottom:10px';
    sub.textContent = 'Each line = one prize slot. The count sets your goal.';
    var listDiv = document.createElement('div');
    listDiv.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:12px;max-height:320px;overflow-y:auto';

    if (items.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'color:var(--text3);font-size:13px;text-align:center;padding:20px';
      empty.textContent = 'No prizes yet. Tap "+ Add prize slot" below.';
      listDiv.appendChild(empty);
    }

    items.forEach(function(item, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg2);border-radius:var(--radius-sm);border:.5px solid var(--border)';
      var num = document.createElement('span');
      num.style.cssText = 'font-size:12px;color:var(--text3);font-weight:600;min-width:24px;flex-shrink:0';
      num.textContent = (i+1)+'.';
      var inp = document.createElement('input');
      inp.type = 'text'; inp.value = item;
      inp.placeholder = 'Prize description\u2026';
      inp.style.cssText = 'flex:1;font-size:13px;border:none;background:transparent;color:var(--text);font-family:inherit;padding:0;outline:none';
      inp.onblur = (function(idx){ return function(){ items[idx] = this.value; saveGoalPrizeList(cat, items); renderGoals(); }; })(i);
      inp.onkeydown = function(e){ if(e.key==='Enter') this.blur(); };
      var del = document.createElement('button');
      del.innerHTML = '<i class="ti ti-trash" style="font-size:13px"></i>';
      del.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3);padding:2px;flex-shrink:0';
      del.title = 'Delete';
      del.onclick = function(){ items.splice(i,1); saveGoalPrizeList(cat,items); renderGoals(); render(); };
      row.appendChild(num); row.appendChild(inp); row.appendChild(del);
      listDiv.appendChild(row);
    });

    var addBtn = document.createElement('button');
    addBtn.className = 'btn primary';
    addBtn.style.cssText = 'width:100%;justify-content:center;margin-bottom:4px';
    addBtn.innerHTML = '<i class="ti ti-plus"></i> Add prize slot';
    addBtn.onclick = function(){ items.push(''); saveGoalPrizeList(cat,items); renderGoals(); render(); setTimeout(function(){ var inputs = listDiv.querySelectorAll('input'); if(inputs.length) inputs[inputs.length-1].focus(); }, 100); };

    var actions = document.createElement('div'); actions.className = 'm-actions';
    var doneBtn = document.createElement('button'); doneBtn.className = 'btn primary'; doneBtn.textContent = 'Done';
    doneBtn.onclick = function(){ saveGoalPrizeList(cat,items); renderGoals(); closeModal(); };
    actions.appendChild(doneBtn);

    box.appendChild(closeBtn); box.appendChild(h3); box.appendChild(sub);
    box.appendChild(listDiv); box.appendChild(addBtn); box.appendChild(actions);
    overlay.appendChild(box); mc.appendChild(overlay);
  }
  render();
}

function renderGoals() {
  var el = document.getElementById('goals-bar');
  if (!el) return;
  var prizes = getPrizes().filter(function(p){ return !p.bundledInto; });
  var goals = getGoals();
  var budgetEl = document.getElementById('budget-bar');
  if (budgetEl) renderBudgetBar(prizes, budgetEl);
  var cats = ['BINGO','Raffle','Medium','Small'];
  var html = '';
  cats.forEach(function(cat) {
    // For Medium/Small, goal = number of items in prize list
    var isList = (cat==='Medium' || cat==='Small');
    var isAuto = (cat==='BINGO');
    var listItems = isList ? getGoalPrizeList(cat) : null;
    var goal = listItems ? listItems.length : (goals[cat] || 0);
    var have = prizes.filter(function(p){ return p.cat===cat; }).reduce(function(s,p){ return s+(+p.qty||1); }, 0);
    var need = Math.max(0, goal-have);
    var cls  = have>=goal ? 'green' : need<=5 ? 'amber' : 'red';
    var notes = getGoalNotes(cat);
    var goalDisplay = isAuto
      ? String(goal)
      : '<input type="number" value="'+goal+'" min="0" style="width:32px;font-size:14px;font-weight:600;border:none;border-bottom:1px solid var(--border2);background:transparent;color:var(--text);text-align:center;padding:0" onblur="saveGoal(\''+cat+'\',this.value);renderGoals()" onkeydown="if(event.key===\'Enter\')this.blur()" onclick="event.stopPropagation()">';
    var footer = '';
    if (isAuto) {
      footer = '<div style="font-size:8px;color:var(--text3)">attendees+10</div>';
    } else if (isList) {
      footer = '<button onclick="openGoalPrizeList(\''+cat+'\')" style="background:none;border:none;cursor:pointer;color:var(--purple-text);padding:2px;margin-top:1px" title="Edit list"><i class="ti ti-pencil" style="font-size:11px"></i></button>';
    } else {
      footer = '<button onclick="openGoalNotes(\''+cat+'\')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:2px;margin-top:1px" title="Notes"><i class="ti ti-pencil" style="font-size:11px"></i></button>'+
        (notes?'<div style="font-size:9px;color:var(--text3);margin-top:2px;text-align:left;word-break:break-word">'+escHtml(notes.substring(0,50))+(notes.length>50?'\u2026':'')+'</div>':'');
    }
    html += '<div class="goal-card" style="border-color:var(--'+cls+')">'+
      '<div style="font-size:10px;font-weight:600;color:var(--text2)">'+(cat==='BINGO'?'Prizes':cat)+'</div>'+
      '<div style="display:flex;align-items:baseline;justify-content:center;gap:2px;margin:2px 0">'+
        '<span style="font-size:14px;font-weight:600;color:var(--text)">'+have+'</span>'+
        '<span style="font-size:14px;font-weight:600;color:var(--text)">/ '+goalDisplay+'</span>'+
      '</div>'+
      '<div style="font-size:12px;font-weight:700;color:var(--'+cls+')">'+(need>0?need+' needed':'\u2713 Done')+'</div>'+
      footer+
    '</div>';
  });
  var swagCount = prizes.filter(function(p){ return p.cat==='SWAG Bag'; }).length;
  html += '<div class="goal-card"><div style="font-size:10px;font-weight:600;color:var(--text2)">SWAG Bag</div><div style="font-size:14px;font-weight:600;margin:2px 0">'+swagCount+'</div><div style="font-size:9px;color:var(--text3)">no limit</div></div>';
  el.innerHTML = html;
}

function budgetRow(label, budget, spent) {
  var left = budget - spent;
  var pct = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : 0;
  var color = left >= 0 ? 'var(--green)' : 'var(--red)';
  return '<div style="background:var(--bg);border:.5px solid var(--border);border-radius:var(--radius-md);padding:8px 12px;margin-bottom:6px">'+
    '<div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:6px">'+
      '<div style="height:100%;background:'+color+';width:'+pct+'%;border-radius:3px"></div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;font-size:12px;flex-wrap:wrap;align-items:center">'+
      '<span style="font-weight:600;min-width:50px">'+label+':</span>'+
      '<span>Spent: <strong style="color:var(--amber)">'+fmt$(spent)+'</strong></span>'+
      '<span style="color:var(--text3)">\u00b7</span>'+
      '<span>Budget: <strong>'+fmt$(budget)+'</strong></span>'+
      '<span style="color:var(--text3)">\u00b7</span>'+
      '<span>Left: <strong style="color:'+color+'">'+fmt$(left)+'</strong></span>'+
    '</div>'+
  '</div>';
}

async function renderBudgetBar(prizes, el) {
  try {
    var expenses = await dbGet('hq/expenses');
    if (!expenses) { el.innerHTML=''; return; }
    var arr = typeof expenses==='object' ? Object.values(expenses) : [];
    var prizeLine  = arr.find(function(e){ return e && e.id==='prizes_budget'; });
    var raffleLine = arr.find(function(e){ return e && e.id==='raffle'; });
    var prizeBudget  = +(prizeLine?.fixedAmt||0);
    var raffleBudget = +(raffleLine?.fixedAmt||0);
    var prizeSpent  = prizes.filter(function(p){ return p.cat!=='Raffle'; }).reduce(function(s,p){ return s+(+p.paid||0); }, 0);
    var raffleSpent = prizes.filter(function(p){ return p.cat==='Raffle'; }).reduce(function(s,p){ return s+(+p.paid||0); }, 0);
    var html = '';
    if (prizeBudget  > 0) html += budgetRow('Prizes',  prizeBudget,  prizeSpent);
    if (raffleBudget > 0) html += budgetRow('Raffle',  raffleBudget, raffleSpent);
    el.innerHTML = html;
  } catch(e) { el.innerHTML=''; }
}
