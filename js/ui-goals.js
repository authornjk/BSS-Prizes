// ui-goals.js
function renderGoals(){
  const el=document.getElementById('goals-bar');
  if(!el) return;
  const prizes=getPrizes().filter(p=>!p.bundledInto);
  const cats=Object.keys(GOALS);
  el.innerHTML=cats.map(cat=>{
    const goal=GOALS[cat];
    const have=prizes.filter(p=>p.cat===cat).reduce((s,p)=>s+(+p.qty||1),0);
    const need=Math.max(0,goal-have);
    const cls=have>=goal?'good':need<=10?'warn':'bad';
    return `<div class="goal-card">
      <div class="goal-label">${cat}</div>
      <div class="goal-nums"><span class="goal-have">${have}</span><span class="goal-of">/${goal}</span></div>
      <div class="goal-need ${cls}">${need>0?need+' needed':'✓ Done'}</div>
    </div>`;
  }).join('')+`<div class="goal-card">
    <div class="goal-label">SWAG Bag</div>
    <div class="goal-nums"><span class="goal-have">${prizes.filter(p=>p.cat==='SWAG Bag').length}</span></div>
    <div class="goal-need" style="color:var(--text3)">No cap</div>
  </div>`;
}
