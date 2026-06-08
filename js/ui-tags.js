/** ui-tags.js */
function renderTags() {
  const prizes = getPrizes();
  const need = prizes.filter(p => p.needTag);
  const dash = document.getElementById('tag-dash');
  if (dash) dash.innerHTML = [
    { l: 'Need a tag', n: need.length, c: 'var(--coral-bg)' },
    { l: 'Tag made', n: need.filter(p => p.tagMade).length, c: 'var(--purple-bg)' },
    { l: 'Tag printed', n: need.filter(p => p.tagPrinted).length, c: 'var(--green-bg)' },
    { l: 'Tag attached', n: need.filter(p => p.tagAttached).length, c: 'var(--amber-bg)' },
    { l: 'On tote paper', n: need.filter(p => p.onTote).length, c: '#EAF3DE' },
    { l: 'Fully done', n: need.filter(p => STAGES.every(s => p[s])).length, c: 'var(--green-bg)' },
  ].map(s => `<div class="ts" style="background:${s.c}"><div class="ts-num">${s.n}</div><div class="ts-lbl">${s.l}</div></div>`).join('');

  const list = document.getElementById('tag-list');
  if (!list) return;
  list.innerHTML = need.length ? need.map(p => {
    const pips = STAGES.map((s, i) => `<div class="pip ${p[s] ? 'done' : ''}" title="${STAGE_LABELS[i]}"></div>`).join('');
    return `<div class="tag-row">
      <span class="cat-pill ${catClass(p.cat)}" style="font-size:10px">${p.cat}</span>
      <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</span>
      ${pips}
      ${STAGES.every(s => p[s]) ? `<span style="font-size:10px;color:var(--green-mid);font-weight:600"><i class="ti ti-check"></i> Done</span>` : ''}
    </div>`;
  }).join('') : `<div class="empty"><i class="ti ti-tag"></i><span>No items need donation tags yet</span></div>`;
}
