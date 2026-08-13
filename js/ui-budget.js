function renderBudget(){
  const el=document.getElementById('tab-budget');
  if(!el) return;
  const prizes=getPrizes().filter(p=>!p.bundledInto);
  const totalVal=prizes.reduce((s,p)=>s+((+p.value||0)*(+p.qty||1)),0);
  const totalPaid=prizes.reduce((s,p)=>s+(+p.paid||0),0);
  const unpaid=prizes.filter(p=>!p.paid&&p.value>0).length;
  el.innerHTML=`
    <div class="stat-grid">
      <div class="stat"><div class="stat-lbl">Total prizes</div><div class="stat-val">${prizes.length}</div></div>
      <div class="stat"><div class="stat-lbl">Total value</div><div class="stat-val">${fmt$(totalVal)}</div></div>
      <div class="stat"><div class="stat-lbl">Total paid</div><div class="stat-val">${fmt$(totalPaid)}</div></div>
      <div class="stat"><div class="stat-lbl">Unpaid items</div><div class="stat-val" style="color:${unpaid?'var(--amber)':'var(--green)'}">${unpaid}</div></div>
    </div>
    <div class="card">
      <div class="card-title">By category</div>
      ${Object.keys(GOALS).concat(['SWAG Bag','Unassigned']).map(cat=>{
        const rows=prizes.filter(p=>p.cat===cat);
        if(!rows.length) return '';
        const val=rows.reduce((s,p)=>s+((+p.value||0)*(+p.qty||1)),0);
        const paid=rows.reduce((s,p)=>s+(+p.paid||0),0);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:.5px solid var(--border)">
          <div><span class="cat-pill cat-${cat.replace(/\s/g,'')}">${cat}</span> <span style="font-size:12px;color:var(--text2);margin-left:4px">${rows.length} prize${rows.length!==1?'s':''}</span></div>
          <div style="font-size:12px;text-align:right"><div style="font-weight:600">${fmt$(val)}</div><div style="color:var(--text3)">paid: ${fmt$(paid)}</div></div>
        </div>`;
      }).join('')}
    </div>`;
}
