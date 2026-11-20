
const V='fenixcut-v4';
const SHELL=['./','./index.html','./style.css','./fx.js','./export.js','./captions.js','./ai.js','./app.js','./asr-worker.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
const CDN=['cdn.jsdelivr.net','esm.sh','fonts.googleapis.com','fonts.gstatic.com','api.fontshare.com','cdn.fontshare.com'];
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||r.headers.has('range'))return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}return res;}).catch(()=>caches.match(r)));
  }else if(CDN.includes(u.hostname)){
    e.respondWith(caches.match(r).then(m=>{const n=fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}return res;}).catch(()=>m);return m||n;}));
  }
});
