// auth.js — no-password, name-select login
const DEFAULT_USERS = [
  {username:'nicole',      displayName:'Nicole',            role:'admin',       avatar:'NI'},
  {username:'coordinator', displayName:'Prize Coordinator', role:'coordinator', avatar:'PC'},
];
let _currentUser = null;

async function loadUsers() {
  try {
    const data = await dbGet('users');
    if (data) return Object.values(data).map(u=>({...u,pwHash:undefined}));
  } catch(e) {}
  const obj={};
  DEFAULT_USERS.forEach(u=>{obj[u.username]=u;});
  await dbSet('users',obj).catch(()=>{});
  return [...DEFAULT_USERS];
}

async function login(username) {
  const users = await loadUsers();
  const user = users.find(u=>u.username===username);
  if (!user) return {ok:false,error:'User not found'};
  _currentUser = user;
  try{localStorage.setItem('soiree_session_prize',username);}catch(e){}
  return {ok:true,user};
}

async function restoreSession() {
  try {
    const saved = localStorage.getItem('soiree_session_prize');
    if (!saved) return false;
    const users = await loadUsers();
    const user = users.find(u=>u.username===saved);
    if (!user) return false;
    _currentUser = user;
    return true;
  } catch(e){return false;}
}

function currentUser(){return _currentUser;}
function isAdmin(){return _currentUser?.role==='admin';}
function signOut(){
  _currentUser=null;
  try{localStorage.removeItem('soiree_session_prize');}catch(e){}
}
