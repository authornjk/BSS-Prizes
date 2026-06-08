/** ui-budget.js */
function renderBudget() {
  const el = document.getElementById('budget-content');
  if (!el) return;
  const meta = getMeta();
  const prizes = getPrizes();
  const catSpent = {};
  prizes.forEach(p => { catSpent[p.cat] = (catSpent[p.cat] || 0) + (p.paid || 0); });
  const bCats = Object.keys(meta.budgets);
  const totalB = bCats.reduce((s, c) => s + (meta.budgets[c] || 0), 0);
  const totalS = bCats.reduce((s, c) => s + (catSpent[c] || 0), 0);
  const totalLeft = totalB - totalS;
  const totalVal = prizes.reduce((s, p) => s + (p.value || 0) * (p.qty || 1), 0);

  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-lbl">Total budget</div><div class="stat-val">${fmtMoney(totalB) || '—'}</div></div>
      <div class="stat-card"><div class="stat-lbl">Spent</div><div class="stat-val">${totalS > 0 ? fmtMoney(totalS) : '$0.00'}</div></div>
      <div class="stat-card"><div class="stat-lbl">${totalLeft >= 0 ? 'Remaining' : 'Over budget'}</div><div class="stat-val" style="color:${totalLeft < 0 ? 'var(--red)' : 'var(--green-mid)'}">${totalB > 0 ? fmtMoney(Math.abs(totalLeft)) : '—'}</div></div>
      <div class="stat-card"><div class="stat-lbl">Donated value</div><div class="stat-val">$${Math.round(totalVal).toLocaleString('en-US')}</div></div>
    </div>
    ${totalB === 0
      ? `<div class="empty"><i class="ti ti-settings"></i><span>Set budgets in the Settings tab</span></div>`
      : bCats.map(c => {
          const b = meta.budgets[c] || 0, sp = catSpent[c] || 0, left = b - sp;
          const pct = b > 0 ? Math.min(100, Math.round(sp / b * 100)) : 0;
          return `<div class="bcard">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <span style="font-weight:600;font-size:14px">${c}</span>
              <span style="font-size:12px;color:var(--text2)">${fmtMoney(sp)} of ${fmtMoney(b)}</span>
            </div>
            <div class="prog-bar">
              <div class="prog-fill" style="width:${pct}%;background:${left >= 0 ? 'var(--purple-mid)' : 'var(--red)'}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:var(--text2)">
              <span>${pct}% used</span>
              <span style="color:${left >= 0 ? 'var(--green-mid)' : 'var(--red)'};font-weight:600">${left >= 0 ? fmtMoney(left) + ' left' : fmtMoney(Math.abs(left)) + ' over'}</span>
            </div>
          </div>`;
        }).join('')}`;
}
