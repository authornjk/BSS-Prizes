// v20260802.1 — bump this version to bust cache on all devices
const CACHE='soiree-prizes-v20260802.1';
const ASSETS=['./','./index.html','./manifest.json','./css/app.css',
  './js/storage.js','./js/auth.js','./js/state.js','./js/ui-goals.js',
  './js/ui-prizes.js','./js/ui-tags.js','./js/ui-budget.js',
  './js/ui-authors.js','./js/ui-settings.js','./js/app.js',
  './js/logo.js',
  './icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>{const net=fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>cached);return cached||net;}));});
