/** ui-authors.js */
function renderAuthors() {
  const el = document.getElementById('authors-content');
  if (!el) return;
  const meta = getMeta();
  const prizes = getPrizes();
  const confirmed = meta.authors.filter(a => a.trim());
  const remaining = Math.max(0, 25 - confirmed.length);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding:10px 14px;background:var(--bg2);border-radius:var(--radius-md);flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:22px;font-weight:600">${confirmed.length}</div><div style="font-size:11px;color:var(--text2)">Confirmed</div></div>
      <div style="width:0.5px;height:36px;background:var(--border)"></div>
      <div style="text-align:center"><div style="font-size:22px;font-weight:600;color:var(--amber-mid)">${remaining}</div><div style="font-size:11px;color:var(--text2)">Open spots</div></div>
      <div style="width:0.5px;height:36px;background:var(--border)"></div>
      <div style="text-align:center"><div style="font-size:22px;font-weight:600">25</div><div style="font-size:11px;color:var(--text2)">Total</div></div>
      ${isAdmin() ? `<button class="btn" style="margin-left:auto" onclick="showTab('settings')"><i class="ti ti-edit"></i> Edit list</button>` : ''}
    </div>
    <div class="author-grid">
      ${confirmed.map(a => {
        const donated = prizes.filter(p => p.donor === a);
        const val = donated.reduce((s, p) => s + (p.value || 0) * (p.qty || 1), 0);
        const ini = a.split(' ').map(x => x[0]).join('').slice(0, 2);
        return `<div class="author-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div class="avatar">${escHtml(ini)}</div>
            <span style="font-weight:600;font-size:13px">${escHtml(a)}</span>
          </div>
          <div style="font-size:11px;color:var(--text2)">${donated.length ? donated.length + ' prize' + (donated.length !== 1 ? 's' : '') + ' · ' + fmtMoney(val) : 'No prizes yet'}</div>
          ${donated.slice(0, 2).map(p => `<div style="font-size:10px;color:var(--text3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</div>`).join('')}
          ${donated.length > 2 ? `<div style="font-size:10px;color:var(--text3)">+${donated.length - 2} more</div>` : ''}
        </div>`;
      }).join('')}
      ${Array.from({ length: remaining }).map((_, i) => `
        <div class="author-card slot" style="display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--bg);border:0.5px dashed var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="ti ti-user" style="font-size:13px;color:var(--text3)"></i>
          </div>
          <span style="font-size:12px;color:var(--text3)">Slot ${i + confirmed.length + 1}</span>
        </div>`).join('')}
    </div>`;
}
