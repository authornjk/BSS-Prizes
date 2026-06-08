/**
 * ui-goals.js — renders the goals progress bar across the top
 */

function renderGoals() {
  const bar = document.getElementById('goals-bar');
  if (!bar) return;
  const meta = getMeta();
  const prizes = getPrizes();

  const scored = CATS.filter(c => c !== 'Unassigned' && c !== 'SWAG Bag' && (meta.goals[c] || 0) > 0);
  const totalGoal = scored.reduce((s, c) => s + (meta.goals[c] || 0), 0);
  const totalHave = prizes.filter(p => scored.includes(p.cat)).reduce((s, p) => s + (p.qty || 1), 0);
  const totalNeed = Math.max(0, totalGoal - totalHave);
  const swagHave = prizes.filter(p => p.cat === 'SWAG Bag').reduce((s, p) => s + (p.qty || 1), 0);
  const totalVal = prizes.reduce((s, p) => s + (p.value || 0) * (p.qty || 1), 0);

  let html = `
    <div class="goal-card" style="border-color:${totalNeed === 0 && totalGoal > 0 ? 'var(--green-mid)' : 'var(--border)'}">
      <div class="goal-label">All prizes</div>
      <div class="goal-nums">
        <span class="goal-have">${totalHave}</span>
        <span class="goal-of">/ ${totalGoal}</span>
      </div>
      <div class="goal-need ${totalNeed === 0 && totalGoal > 0 ? 'good' : totalNeed <= 20 ? 'warn' : 'bad'}">
        ${totalNeed === 0 && totalGoal > 0 ? 'Goal met!' : totalNeed > 0 ? totalNeed + ' needed' : '—'}
      </div>
      <div class="prog-bar">
        <div class="prog-fill" style="width:${totalGoal > 0 ? Math.min(100, Math.round(totalHave / totalGoal * 100)) : 0}%;background:${totalNeed === 0 && totalGoal > 0 ? 'var(--green-mid)' : 'var(--purple-mid)'}"></div>
      </div>
    </div>`;

  scored.forEach(c => {
    const goal = meta.goals[c] || 0;
    const have = prizes.filter(p => p.cat === c).reduce((s, p) => s + (p.qty || 1), 0);
    const need = Math.max(0, goal - have);
    const pct = goal > 0 ? Math.min(100, Math.round(have / goal * 100)) : 0;
    html += `
      <div class="goal-card">
        <div class="goal-label">${c}</div>
        <div class="goal-nums"><span class="goal-have">${have}</span><span class="goal-of">/ ${goal}</span></div>
        <div class="goal-need ${need === 0 ? 'good' : need <= 5 ? 'warn' : 'bad'}">${need === 0 ? 'Goal met!' : need + ' needed'}</div>
        <div class="prog-bar">
          <div class="prog-fill" style="width:${pct}%;background:${need === 0 ? 'var(--green-mid)' : 'var(--purple-mid)'}"></div>
        </div>
      </div>`;
  });

  html += `
    <div class="goal-card">
      <div class="goal-label">SWAG Bag</div>
      <div class="goal-nums"><span class="goal-have">${swagHave}</span></div>
      <div style="font-size:10px;color:var(--text3);margin-top:1px">No cap</div>
    </div>`;

  bar.innerHTML = html;

  const td = document.getElementById('title-display');
  const yd = document.getElementById('year-display');
  const vd = document.getElementById('total-val');
  if (td) td.textContent = meta.eventName || 'Bookish Summer Soirée';
  if (yd) yd.textContent = (meta.eventYear || '2027') + ' Event';
  if (vd && totalVal > 0) vd.textContent = '$' + Math.round(totalVal).toLocaleString('en-US') + ' total value';
}
