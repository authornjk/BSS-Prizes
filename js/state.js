// state.js — prize CRUD and Firebase sync
const GOALS = {BINGO:260,Raffle:7,Medium:10,Small:10};
let _prizes = {};
let _meta = {nextId:1, authors:['Jessica Scarlett','Aspen Hadley','Jentry Flint','Amanda P Jones','Sarah M Eden','Shannon Castelton']};
let _syncStop = null;
let _onChangeCb = null;
let _sharedAuthors = null;

function getPrizes(){return Object.values(_prizes);}
function getPrize(id){return _prizes[id]||null;}
function getMeta(){return _meta;}

async function getAuthors(){
  if(_sharedAuthors) return _sharedAuthors;
  const fromDb = await loadSharedAuthors();
  if(fromDb&&fromDb.length){_sharedAuthors=fromDb;return fromDb;}
  return _meta.authors||DEFAULT_USERS.map(u=>u.displayName);
}

async function loadPrizes(){
  const data = await dbGet('prizes');
  _prizes = data||{};
}
async function loadMeta(){
  const data = await dbGet('meta');
  if(data) _meta={..._meta,...data};
}

async function addPrize(fields){
  await loadMeta();
  const id = _meta.nextId||1;
  const now = Date.now();
  const prize = {
    id, cat:'Unassigned', name:'', qty:1, paid:0, value:0,
    loc:'', donor:'', donorType:'author',
    donorHeadline:'', donorPronoun:'their',
    donorQRDest:'', donorQRType:'website',
    donorLogoUrl:'',
    itemType:'Other', clothingSize:'', clothingSizeCustom:'',
    needTag:false, tagMade:false, tagPrinted:false, tagAttached:false, onTote:false,
    tagGenerated:false,
    notes:'', url:'', photo:null,
    bundledInto:null, bundledIntoName:'', isBundle:false, bundleContains:[],
    addedBy:currentUser()?.displayName||'',
    updatedBy:currentUser()?.displayName||'',
    _mod:now, _created:now,
    ...fields
  };
  // Auto-set needTag if donor present
  if(prize.donor&&prize.donor.trim()) prize.needTag=true;
  _prizes[id] = prize;
  await dbSet('prizes/'+id, prize);
  await dbSet('meta/nextId', id+1);
  _meta.nextId = id+1;
  return prize;
}

async function updatePrize(id, fields){
  if(!_prizes[id]) return;
  const updated = {..._prizes[id], ...fields,
    updatedBy:currentUser()?.displayName||'', _mod:Date.now()};
  // Auto-set needTag if donor present/cleared
  if('donor' in fields){
    updated.needTag = !!(updated.donor&&updated.donor.trim());
  }
  _prizes[id] = updated;
  await dbSet('prizes/'+id, updated);
  return updated;
}

async function deletePrize(id){
  delete _prizes[id];
  await dbDelete('prizes/'+id);
}

function startSync(onChange){
  _onChangeCb = onChange;
  if(!window.FIREBASE_DB_URL) return;
  _syncStop = true;
  const poll = async()=>{
    if(!_syncStop) return;
    try{
      const data = await dbGet('prizes');
      _prizes = data||{};
      if(_onChangeCb) _onChangeCb();
    }catch(e){}
    setTimeout(poll,15000);
  };
  poll();
}
function stopSync(){_syncStop=false;}
