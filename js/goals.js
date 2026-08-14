// goals.js — goals bar with notes
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
function openGoalPrizeList(cat) {
  // Load current list from localStorage
  var key = 'goal_prize_list_'+cat;
  var items = JSON.parse(localStorage.getItem(key)||'[]');

  function renderListModal() {
    var mc = document.getElementById('modal-container');
    mc.innerHTML = '';
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-bg';
    overlay.onclick = function(e){ if(e.target===overlay) closeModal(); };
    var box = document.createElement('div');
    box.className = 'modal';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '<i class="ti ti-x"></i>';
    closeBtn.onclick = closeModal;
    var h3 = document.createElement('h3');
    h3.textContent = cat+' prizes ('+items.length+')';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:var(--text2);margin-bottom:10px';
    sub.textContent = 'Each line = one prize slot. Count drives the goal number.';
    var listDiv = document.createElement('div');
    listDiv.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:10px;max-height:300px;overflow-y:auto';
    items.forEach(function(item, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border-radius:var(--radius-sm)';
      var num = document.createElement('span');
      num.style.cssText = 'font-size:12px;color:var(--text3);font-weight:600;min-width:20px';
      num.textContent = (i+1)+'.';
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.value = item;
      inp.placeholder = 'Prize description…';
      inp.style.cssText = 'flex:1;font-size:13px;border:none;background:transparent;color:var(--text);font-family:inherit;padding:0';
      inp.onblur = (function(idx){ return function(){ items[idx]=this.value; localStorage.setItem(key,JSON.stringify(items)); }; })(i);
      var del = document.createElement('button');
      del.innerHTML = '<i class="ti ti-trash" style="font-size:13px"></i>';
      del.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3)';
      del.onclick = function(){ items.splice(i,1); localStorage.setItem(key,JSON.stringify(items)); saveGoal(cat,items.length); renderGoals(); renderListModal(); };
      row.appendChild(num); row.appendChild(inp); row.appendChild(del);
      listDiv.appendChild(row);
    });
    var addBtn = document.createElement('button');
    addBtn.className = 'btn primary';
    addBtn.innerHTML = '<i class="ti ti-plus"></i> Add prize slot';
    addBtn.onclick = function(){ items.push(''); localStorage.setItem(key,JSON.stringify(items)); saveGoal(cat,items.length); renderGoals(); renderListModal(); };
    var actions = document.createElement('div');
    actions.className = 'm-actions';
    var doneBtn = document.createElement('button');
    doneBtn.className = 'btn primary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = function(){ saveGoal(cat,items.length); renderGoals(); closeModal(); };
    actions.appendChild(doneBtn);
    box.appendChild(closeBtn);
    box.appendChild(h3);
    box.appendChild(sub);
    box.appendChild(listDiv);
    box.appendChild(addBtn);
    box.appendChild(actions);
    overlay.appendChild(box);
    mc.appendChild(overlay);
  }
  renderListModal();
}

function openGoalNotes(cat) {
  var current = getGoalNotes(cat);
  var mc = document.getElementById('modal-container');
  mc.innerHTML = '';
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-bg';
  overlay.onclick = function(e){ if(e.target===overlay) closeModal(); };
  var box = document.createElement('div');
  box.className = 'modal';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<i class="ti ti-x"></i>';
  closeBtn.onclick = closeModal;
  var h3 = document.createElement('h3');
  h3.textContent = cat + ' notes';
  var label = document.createElement('label');
  label.style.fontSize = '11px';
  label.style.color = 'var(--text2)';
  label.textContent = 'Notes for ' + cat + ' prizes (e.g. who wins, how awarded)';
  var ta = document.createElement('textarea');
  ta.id = 'gn-notes';
  ta.rows = 4;
  ta.placeholder = 'e.g. Farthest traveled, Book bingo winner…';
  ta.value = current;
  ta.style.width = '100%';
  ta.style.marginTop = '4px';
  var actions = document.createElement('div');
  actions.className = 'm-actions';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = closeModal;
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.innerHTML = '<i class="ti ti-check"></i> Save';
  saveBtn.onclick = function(){ saveGoalNotes(cat); };
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  box.appendChild(closeBtn);
  box.appendChild(h3);
  box.appendChild(label);
  box.appendChild(ta);
  box.appendChild(actions);
  overlay.appendChild(box);
  mc.appendChild(overlay);
  setTimeout(function(){ ta.focus(); }, 50);
}
function saveGoalNotes(cat) {
  var notes = document.getElementById('gn-notes')?.value?.trim()||'';
  localStorage.setItem('goal_notes_'+cat, notes);
  closeModal();
  showToast('Notes saved');
  renderGoals();
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
    var listKey = 'goal_prize_list_'+cat;
    var prizeListItems = (cat==='Medium'||cat==='Small') ? JSON.parse(localStorage.getItem(listKey)||'[]') : null;
    var goal = prizeListItems ? prizeListItems.length : (goals[cat] || 0);
    if (prizeListItems && goals[cat] !== prizeListItems.length) saveGoal(cat, prizeListItems.length);
    var have = prizes.filter(function(p){ return p.cat===cat; }).reduce(function(s,p){ return s+(+p.qty||1); }, 0);
    var need = Math.max(0, goal-have);
    var cls  = have>=goal ? 'green' : need<=5 ? 'amber' : 'red';
    var isAuto = cat==='BINGO';
    var notes = getGoalNotes(cat);
    var goalDisplay = isAuto ? String(goal) :
      '<input type="number" value="'+goal+'" min="1" '+
      'style="width:36px;font-size:12px;border:none;border-bottom:1px solid var(--border2);background:transparent;color:var(--text);text-align:center;padding:0" '+
      'onblur="saveGoal(\''+cat+'\',this.value);renderGoals()" '+
      'onkeydown="if(event.key===\'Enter\')this.blur()" '+
      'onclick="event.stopPropagation()">';
    var footer = isAuto
      ? '<div style="font-size:9px;color:var(--text3)">attendees+10</div>'
      : '<button onclick="openGoalNotes(\''+cat+'\')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:2px;margin-top:2px" title="Notes">'+
          '<i class="ti ti-pencil" style="font-size:11px"></i></button>'+
        (notes ? '<div style="font-size:9px;color:var(--text3);margin-top:2px;text-align:left;word-break:break-word">'+
          escHtml(notes.substring(0,50))+(notes.length>50?'…':'')+'</div>' : '');
    html +=
      '<div class="goal-card" style="border-color:var(--'+cls+')">'+
        '<div style="font-size:11px;font-weight:600;color:var(--text2)">'+( cat==='BINGO' ? 'Prizes' : cat)+'</div>'+
        '<div style="display:flex;align-items:baseline;gap:3px;margin:4px 0">'+
          '<span style="font-size:22px;font-weight:700;color:var(--'+cls+')">'+have+'</span>'+
          '<span style="font-size:12px;color:var(--text3)">/ '+goalDisplay+'</span>'+
        '</div>'+
        '<div style="font-size:10px;color:var(--'+cls+')">'+(need>0?need+' needed':'✓ Done')+'</div>'+
        footer+
      '</div>';
  });
  var swagCount = prizes.filter(function(p){ return p.cat==='SWAG Bag'; }).length;
  html += '<div class="goal-card"><div style="font-size:11px;font-weight:600;color:var(--text2)">SWAG Bag</div>'+
    '<div style="font-size:22px;font-weight:700;margin:4px 0">'+swagCount+'</div>'+
    '<div style="font-size:10px;color:var(--text3)">no limit</div></div>';
  el.innerHTML = html;
}
async function renderBudgetBar(prizes, el) {
  try {
    var expenses = await dbGet('hq/expenses');
    if (!expenses) { el.innerHTML=''; return; }
    var arr = Object.values(expenses);
    var prizeLine  = arr.find(function(e){ return e.id==='prizes_budget'; });
    var raffleLine = arr.find(function(e){ return e.id==='raffle'; });
    var prizeBudget  = +(prizeLine?.fixedAmt||0);
    var raffleBudget = +(raffleLine?.fixedAmt||0);
    var totalBudget  = prizeBudget + raffleBudget;
    var totalSpent   = prizes.reduce(function(s,p){ return s+(+p.paid||0); }, 0);
    var left = totalBudget - totalSpent;
    if (totalBudget <= 0) { el.innerHTML=''; return; }
    el.innerHTML =
      '<div style="background:var(--bg);border:.5px solid var(--border);border-radius:var(--radius-md);padding:8px 12px;margin-bottom:10px">'+
        '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">Prize budget (from HQ)</div>'+
        '<div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:6px">'+
          '<div style="height:100%;background:'+(left>=0?'var(--green)':'var(--red)')+';width:'+
            Math.min(100,totalBudget>0?Math.round(totalSpent/totalBudget*100):0)+'%;border-radius:3px"></div>'+
        '</div>'+
        '<div style="display:flex;gap:12px;font-size:12px;flex-wrap:wrap">'+
          '<span>BINGO: <strong>'+fmt$(prizeBudget)+'</strong></span>'+
          '<span>Raffle: <strong>'+fmt$(raffleBudget)+'</strong></span>'+
          '<span>Spent: <strong style="color:var(--amber)">'+fmt$(totalSpent)+'</strong></span>'+
          '<span>Left: <strong style="color:'+(left>=0?'var(--green)':'var(--red)')+'">'+fmt$(left)+'</strong></span>'+
        '</div>'+
      '</div>';
  } catch(e) { el.innerHTML=''; }
}
