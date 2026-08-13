// ui-tags.js — Donation Tags tab with print buttons per type

function renderTags(){
  const el=document.getElementById('tab-tags');
  if(!el) return;
  const prizes=getPrizes().filter(p=>p.needTag&&!p.bundledInto);
  const books=prizes.filter(p=>p.itemType==='Book'||!p.itemType);
  const clothing=prizes.filter(p=>p.itemType==='Clothing');
  const other=prizes.filter(p=>p.itemType!=='Book'&&p.itemType!=='Clothing');

  const countBadge=(list,label)=>{
    const pending=list.filter(p=>!p.tagGenerated).length;
    return `<span style="font-size:11px;color:var(--text2)">${list.length} total · <span style="color:${pending?'var(--amber)':'var(--green)'}">${pending} not yet printed</span></span>`;
  };

  el.innerHTML=`
    <div class="tag-dash">
      <div class="ts"><div class="ts-num">${prizes.length}</div><div class="ts-lbl">Need tags</div></div>
      <div class="ts"><div class="ts-num" style="color:var(--amber)">${prizes.filter(p=>!p.tagMade).length}</div><div class="ts-lbl">Tag not made</div></div>
      <div class="ts"><div class="ts-num" style="color:var(--green)">${prizes.filter(p=>p.tagAttached).length}</div><div class="ts-lbl">Tag attached</div></div>
      <div class="ts"><div class="ts-num" style="color:var(--purple)">${prizes.filter(p=>p.tagGenerated).length}</div><div class="ts-lbl">PDF generated</div></div>
    </div>

    ${tagTypeSection('Book (bookmark 2"×5")', books, 'book', countBadge(books))}
    ${tagTypeSection('Clothing (tag 2.5"×4")', clothing, 'clothing', countBadge(clothing))}
    ${tagTypeSection('Other item (tag 2.5"×3")', other, 'item', countBadge(other))}
  `;
}

function tagTypeSection(title, prizes, type, badge){
  const dbUrl=window.FIREBASE_DB_URL||'';
  const printUrl=`bookmark-print.html?db=${encodeURIComponent(dbUrl)}&type=${type}`;
  return `
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <span>${title}</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${badge}
          <a href="${escHtml(printUrl)}" target="_blank" class="btn purple" style="font-size:12px;padding:4px 11px;text-decoration:none">
            <i class="ti ti-printer"></i> Print ${type} tags
          </a>
        </div>
      </div>
      ${prizes.length===0
        ?`<div class="empty" style="padding:1rem"><i class="ti ti-check" style="font-size:18px;color:var(--green)"></i>No ${type} donation tags needed</div>`
        :`<div>${prizes.map(p=>tagRowHTML(p)).join('')}</div>`}
    </div>`;
}

function tagRowHTML(p){
  const stages=[
    {key:'tagMade',label:'Made'},
    {key:'tagPrinted',label:'Printed'},
    {key:'tagAttached',label:'Attached'},
    {key:'onTote',label:'Tote'},
  ];
  return `<div class="tag-row${p.tagGenerated?' printed':''}">
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name||'Unnamed')}</div>
      <div style="font-size:11px;color:var(--text2)">${escHtml(p.donor||'')}</div>
    </div>
    <div style="display:flex;gap:4px;flex-shrink:0">
      ${stages.map(s=>`<div class="pip${p[s.key]?' done':''}" title="${s.label}" onclick="toggleStage(${p.id},'${s.key}')"></div>`).join('')}
    </div>
    <span class="print-status ${p.tagGenerated?'generated':'pending'}">${p.tagGenerated?'✓ Generated':'Pending'}</span>
  </div>`;
}
