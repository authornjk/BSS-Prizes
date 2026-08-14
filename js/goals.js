// goals.js — goals bar with editable targets

const CAT_GOALS_KEY = 'prize_goals';

function getGoals() {
  const saved = JSON.parse(localStorage.getItem(CAT_GOALS_KEY)||'{}');
  return {BINGO:185, Raffle:7, Medium:10, Small:10, ...saved};
}
function saveGoal(cat, val) {
  const goals = getGoals();
  goals[cat] = +val;
  localStorage.setItem(CAT_GOALS_KEY, JSON.stringify(goals));
}

async function loadBINGOGoal() {
  try {
    const att = await dbGet('hq/attendance');
    if (att && att.total) {
      const goals = getGoals();
      goals.BINGO = (+att.total||175) + 10;
      localStorage.setItem(CAT_GOALS_KEY, JSON.stringify(goals));
    }
  } catch(e) {}
}

function renderGoals() {
  const el = document.getElementById('goals-bar');
  if (!el) return;

  const prizes = getPrizes().filter(p => !p.bundledInto);
  const goals  = getGoals();

  // Budget bar from HQ
  const budgetEl = document.getElementById('budget-bar');
  if (budgetEl) renderBudgetBar(prizes, budgetEl);

  const cats = ['BINGO','Raffle','Medium','Small'];
  el.innerHTML = cats.map(cat => {
    const goal = goals[cat] || 0;
    const have = prizes.filter(p => p.cat===cat).reduce((s,p) => s+(+p.qty||1), 0);
    const need = Math.max(0, goal-have);
    const cls  = have>=goal ? 'green' : need<=5 ? 'amber' : 'red';
    const isAuto = cat==='BINGO';
    return `<div class="goal-card" style="border-color:var(--${cls})">
      <div style="font-size:11px;font-weight:600;color:var(--text2)">${cat}</div>
      <div style="display:flex;align-items:baseline;gap:3px;margin:4px 0">
        <span style="font-size:22px;font-weight:700;color:var(--${cls})">${have}</span>
        <span style="font-size:12px;color:var(--text3)">/ ${isAuto
          ? goal
          : `<input type="number" value="${goal}" min="1" style="width:40px;font-size:12px;border:none;border-bottom:1px solid var(--border2);background:transparent;color:var(--text);text-align:center;padding:0"
              onblur="saveGoal('${cat}',this.value);renderGoals()"
              onkeydown="if(event.key==='Enter')this.blur()"
              onclick="event.stopPropagation()">`
        }</span>
      </div>
      <div style="font-size:10px;color:var(--${cls})">${need>0?need+' needed':'✓ Done'}</div>
      ${isAuto?'<div style="font-size:9px;color:var(--text3)">attendees+10</div>':''}
    </div>`;
  }).join('') + `
    <div class="goal-card">
      <div style="font-size:11px;font-weight:600;color:var(--text2)">SWAG Bag</div>
      <div style="font-size:22px;font-weight:700;margin:4px 0">${prizes.filter(p=>p.cat==='SWAG Bag').length}</div>
      <div style="font-size:10px;color:var(--text3)">no limit</div>
    </div>`;
}

async function renderBudgetBar(prizes, el) {
  try {
    const expenses = await dbGet('hq/expenses');
    if (!expenses) { el.innerHTML=''; return; }
    const arr = Object.values(expenses);
    const prizeLine  = arr.find(e => e.id==='prizes_budget');
    const raffleLine = arr.find(e => e.id==='raffle');
    const prizeBudget  = +(prizeLine?.fixedAmt||0);
    const raffleBudget = +(raffleLine?.fixedAmt||0);
    const totalBudget  = prizeBudget + raffleBudget;
    const totalSpent   = prizes.reduce((s,p) => s+(+p.paid||0), 0);
    const left         = totalBudget - totalSpent;

    el.innerHTML = totalBudget > 0 ? `
      <div style="background:var(--bg);border:.5px solid var(--border);border-radius:var(--radius-md);padding:8px 12px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px">Prize budget (from HQ)</div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;background:${left>=0?'var(--green)':'var(--red)'};width:${Math.min(100,totalBudget>0?Math.round(totalSpent/totalBudget*100):0)}%;border-radius:3px"></div>
        </div>
        <div style="display:flex;gap:12px;font-size:12px;flex-wrap:wrap">
          <span>BINGO: <strong>${fmt$(prizeBudget)}</strong></span>
          <span>Raffle: <strong>${fmt$(raffleBudget)}</strong></span>
          <span>Spent: <strong style="color:var(--amber)">${fmt$(totalSpent)}</strong></span>
          <span>Left: <strong style="color:${left>=0?'var(--green)':'var(--red)'}">${fmt$(left)}</strong></span>
        </div>
      </div>` : '';
  } catch(e) { el.innerHTML=''; }
}
