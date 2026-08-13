function renderAuthorsTab(){
  const el=document.getElementById('tab-authors');
  if(!el) return;
  const meta=getMeta();
  const authors=meta.authors||[];
  el.innerHTML=`
    <div class="card">
      <div class="card-title">Author list <span style="font-size:11px;font-weight:400;color:var(--text3)">(shared with prize donor dropdown)</span></div>
      <div class="author-edit-list" id="author-list">
        ${authors.map((a,i)=>`<div class="author-item">
          <input type="text" value="${escHtml(a)}" onblur="updateAuthorName(${i},this.value)">
          <button class="del-btn" onclick="removeAuthor(${i})"><i class="ti ti-x"></i></button>
        </div>`).join('')}
      </div>
      <button class="btn" onclick="addAuthor()"><i class="ti ti-plus"></i> Add author</button>
    </div>`;
}
function updateAuthorName(i,val){
  const m=getMeta();m.authors[i]=val;
  dbSet('meta/authors',m.authors);
}
function removeAuthor(i){
  const m=getMeta();m.authors.splice(i,1);
  dbSet('meta/authors',m.authors);
  renderAuthorsTab();
}
function addAuthor(){
  const m=getMeta();
  if(!m.authors) m.authors=[];
  m.authors.push('New Author');
  dbSet('meta/authors',m.authors);
  renderAuthorsTab();
  const inputs=document.querySelectorAll('#author-list input');
  if(inputs.length) inputs[inputs.length-1].focus();
}
