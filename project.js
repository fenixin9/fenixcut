
'use strict';
/* ---------- projetos (IndexedDB) ---------- */
const P={id:null,name:'Projeto sem nome',created:0,timer:null,busy:false};
let _db=null;
function idb(){
  return _db||(_db=new Promise((res,rej)=>{
    if(!window.indexedDB){rej(new Error('IndexedDB indisponível'));return;}
    const r=indexedDB.open('fenixcut-db',1);
    r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('projects',{keyPath:'id'});d.createObjectStore('files',{keyPath:'key'});};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  }));
}
function idbReq(store,mode,fn){
  return idb().then(d=>new Promise((res,rej)=>{
    const t=d.transaction(store,mode),s=t.objectStore(store),rq=fn(s);
    t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);
  }));
}
const idbGet=(s,k)=>idbReq(s,'readonly',o=>o.get(k));
const idbPut=(s,v)=>idbReq(s,'readwrite',o=>o.put(v));
const idbDel=(s,k)=>idbReq(s,'readwrite',o=>o.delete(k));
const idbAll=s=>idbReq(s,'readonly',o=>o.getAll());
const idbKeys=s=>idbReq(s,'readonly',o=>o.getAllKeys());
function defaultCapStyle(){return{preset:'pop',size:70,y:72,font:'auto',upper:false,hi:'#ffd23f',color:'#ffffff',offset:0,bgColors:BG_PALETTES.jornal.c.slice(),bgMode:'multi'};}
function setSaveState(st,msg){
  const e=$('saveState');if(!e)return;
  e.className='save '+st;
  e.textContent=st==='saving'?'A guardar…':st==='saved'?'Guardado ✓':st==='dirty'?'Por guardar':st==='error'?('Erro: '+(msg||'não guardou')):'';
  e.title=msg||'';
}
function ensureProject(firstName){
  if(P.id)return;
  P.id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);P.created=Date.now();
  if(!P.named)P.name=(firstName?firstName.replace(/\.[^.]+$/,''):'Projeto').slice(0,40);
  $('projName').value=P.name;try{localStorage.setItem('fenixcut_last',P.id);}catch(e){}
}
function scheduleSave(){
  if(!P.id)return;
  setSaveState('dirty');clearTimeout(P.timer);P.timer=setTimeout(saveNow,1200);
}
function buildRecord(){
  let thumb=null;
  try{const c=document.createElement('canvas'),src=$('preview');c.width=120;c.height=Math.round(120*src.height/src.width);c.getContext('2d').drawImage(src,0,0,c.width,c.height);thumb=c.toDataURL('image/jpeg',0.6);}catch(e){}
  return{id:P.id,name:P.name,created:P.created,updated:Date.now(),dur:S.total,state:JSON.parse(snap()),uid,thumb,
    sources:Object.values(SRC).map(s=>({id:s.id,name:s.name,type:s.file.type,dur:s.dur,vw:s.vw,vh:s.vh,size:s.file.size}))};
}
let saveQueue=Promise.resolve(),saveRevision=0;
function saveNow(){
  if(!P.id)return Promise.resolve(true);
  clearTimeout(P.timer);
  const revision=++saveRevision,rec=buildRecord();
  const files=Object.values(SRC).filter(s=>!s.saved).map(s=>({source:s,key:rec.id+':'+s.id,blob:s.file,name:s.name,type:s.file.type}));
  setSaveState('saving');
  const task=saveQueue.then(async()=>{
    P.busy=true;
    try{
      const db=await idb();
      await new Promise((resolve,reject)=>{
        const t=db.transaction(['files','projects'],'readwrite');
        for(const f of files)t.objectStore('files').put({key:f.key,blob:f.blob,name:f.name,type:f.type});
        t.objectStore('projects').put(rec);
        t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Gravação interrompida'));
      });
      for(const f of files)f.source.saved=true;
      if(revision===saveRevision&&P.id===rec.id)setSaveState('saved');
      return true;
    }catch(err){logErr('guardar: '+err.message);setSaveState('error',err.name==='QuotaExceededError'?'sem espaço no aparelho':err.message);return false;}
    finally{P.busy=false;}
  });
  saveQueue=task.then(()=>{},()=>{});return task;
}
async function loadSrc(file,id,saved){
  const url=URL.createObjectURL(file),v=document.createElement('video');
  v.src=url;v.preload='auto';v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
  hookVideo(v);$('hiddenVideos').appendChild(v);
  await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=()=>rej(new Error('Formato não suportado: '+file.name));});
  SRC[id]={id,file,url,video:v,dur:v.duration,vw:v.videoWidth,vh:v.videoHeight,name:file.name,saved:!!saved};
  return SRC[id];
}
function clearProject(){
  pause();clearTimeout(P.timer);
  for(const id in SRC){try{SRC[id].video.remove();URL.revokeObjectURL(SRC[id].url);}catch(e){}delete SRC[id];}
  for(const k in _abCache)delete _abCache[k];
  for(const k in _sinks)delete _sinks[k];
  S.clips=[];S.texts=[];S.caps=[];S.capStyle=defaultCapStyle();S.sel=null;S.t=0;S.fit='cover';
  hist.length=0;hi=-1;
}
async function newProject(){
  if(S.exporting){toast('Aguarda o fim da exportação.');return;}
  if(!await saveNow()){toast('Não foi possível guardar. O projeto atual foi mantido.');return;}clearProject();
  P.id=null;P.named=false;P.name='Projeto '+new Date().toLocaleDateString('pt-PT');P.created=0;
  $('projName').value=P.name;S.ratio=[9,16];$('ratio').value='9:16';initRenderer();
  try{localStorage.removeItem('fenixcut_last');}catch(e){}
  commit();refreshAll(true);setSaveState('');closeSheet();toast('Projeto novo. Importa um vídeo para começar.');
}
async function openProject(id,quiet){
  if(S.exporting){toast('Aguarda o fim da exportação.');return;}
  try{
    if(P.id&&!await saveNow())throw new Error('O projeto atual não foi guardado; abertura cancelada.');
    const rec=await idbGet('projects',id);if(!rec)throw new Error('projeto não encontrado');
    clearProject();
    const missing=[];
    for(const m of rec.sources){
      const f=await idbGet('files',id+':'+m.id);
      if(!f){missing.push(m.name);continue;}
      try{await loadSrc(new File([f.blob],m.name,{type:m.type||f.type}),m.id,true);}catch(e){missing.push(m.name);}
    }
    const st=rec.state;
    S.clips=(st.clips||[]).filter(c=>SRC[c.src]);S.texts=st.texts||[];S.caps=st.caps||[];
    S.capStyle=Object.assign(defaultCapStyle(),st.capStyle||{});S.ratio=st.ratio||[9,16];S.fit=st.fit||'cover';
    uid=Math.max(uid,rec.uid||1);
    P.id=rec.id;P.name=rec.name;P.created=rec.created;P.named=true;
    $('projName').value=P.name;$('ratio').value=S.ratio.join(':');initRenderer();
    commit();refreshAll(true);setSaveState('saved');
    try{localStorage.setItem('fenixcut_last',P.id);}catch(e){}
    closeSheet();
    if(!quiet)toast(missing.length?('Aberto, mas faltam vídeos: '+missing.join(', ')):('Projeto "'+rec.name+'" aberto.'),4500);
  }catch(e){logErr('abrir: '+e.message);toast('Não consegui abrir: '+e.message,5000);}
}
async function dupProject(id){
  if(P.id===id&&!await saveNow())return;
  const rec=await idbGet('projects',id);if(!rec)return;
  const nid2='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  for(const m of rec.sources){const f=await idbGet('files',id+':'+m.id);if(f)await idbPut('files',{key:nid2+':'+m.id,blob:f.blob,name:f.name,type:f.type});}
  await idbPut('projects',Object.assign({},rec,{id:nid2,name:rec.name+' (cópia)',created:Date.now(),updated:Date.now()}));
  renderSheet();
}
async function delProject(id){
  if(S.exporting){toast('Aguarda o fim da exportação.');return;}
  if(!confirm('Apagar este projeto e os vídeos guardados nele?'))return;
  clearTimeout(P.timer);await saveQueue;
  const keys=await idbKeys('files');
  for(const k of keys)if(String(k).startsWith(id+':'))await idbDel('files',k);
  await idbDel('projects',id);
  if(P.id===id){clearProject();P.id=null;P.name='Projeto sem nome';$('projName').value=P.name;initRenderer();commit();refreshAll(true);setSaveState('');try{localStorage.removeItem('fenixcut_last');}catch(e){}}
  renderSheet();
}
async function exportBackup(id){
  if(P.id===id&&!await saveNow())return;
  const rec=await idbGet('projects',id);if(!rec)return;
  const r=Object.assign({},rec);delete r.thumb;
  download((rec.name||'projeto').replace(/[^\w\-]+/g,'_')+'.fenixcut.json',JSON.stringify(r,null,1),'application/json');
}
function openSheet(){$('projSheet').hidden=false;renderSheet();}
function closeSheet(){$('projSheet').hidden=true;}
async function renderSheet(){
  const box=$('projList');box.innerHTML='<p class="hint">A carregar…</p>';
  let list=[];try{list=(await idbAll('projects')).sort((a,b)=>b.updated-a.updated);}catch(e){box.innerHTML='<p class="hint">Armazenamento indisponível neste navegador.</p>';return;}
  let usage='';
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();usage=`Espaço usado: ${(e.usage/1048576).toFixed(0)} MB de ${(e.quota/1048576).toFixed(0)} MB`;}}catch(e){}
  $('projUsage').textContent=usage;
  box.innerHTML=list.length?list.map(r=>`<div class="proj${r.id===P.id?' cur':''}">
    <button class="pthumb" data-open="${r.id}" aria-label="Abrir ${esc(r.name)}">${r.thumb?`<img src="${r.thumb}" alt="">`:''}</button>
    <div class="pinfo"><b>${esc(r.name)}</b><small>${new Date(r.updated).toLocaleString('pt-PT')} · ${fmt(r.dur||0)} · ${(r.state.clips||[]).length} clipes</small>
    <div class="pbtns"><button class="btn" data-open="${r.id}">Abrir</button><button class="btn" data-dup="${r.id}">Duplicar</button><button class="btn" data-bk="${r.id}">Cópia .json</button><button class="btn danger" data-del="${r.id}">Apagar</button></div></div></div>`).join(''):'<p class="hint">Ainda não há projetos guardados. O projeto atual é guardado automaticamente.</p>';
  box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openProject(b.dataset.open));
  box.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>dupProject(b.dataset.dup));
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delProject(b.dataset.del));
  box.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>exportBackup(b.dataset.bk));
}
function applyViewport(){
  const vv=window.visualViewport,h=vv?vv.height:window.innerHeight;
  document.documentElement.style.setProperty('--appH',Math.round(h)+'px');
  invalidate();
}
function setPanelSize(n){
  document.body.dataset.panel=n;try{localStorage.setItem('fenixcut_panel',n);}catch(e){}
  invalidate();
}
function setFocus(on){
  document.body.dataset.focus=on?'1':'0';
  $('btnFocus').classList.toggle('on',on);
  setTimeout(invalidate,60);
}
async function initProjects(){
  $('projName').value=P.name;
  $('projName').onchange=e=>{P.name=(e.target.value||'Projeto sem nome').trim().slice(0,60);P.named=true;e.target.value=P.name;if(!P.id)ensureProject();scheduleSave();};
  $('btnProj').onclick=openSheet;$('projClose').onclick=closeSheet;$('projNew').onclick=newProject;
  $('projSheet').addEventListener('click',e=>{if(e.target.id==='projSheet')closeSheet();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow();});
  window.addEventListener('pagehide',()=>{saveNow();});
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
  applyViewport();if(window.visualViewport){visualViewport.addEventListener('resize',applyViewport);}
  window.addEventListener('resize',applyViewport);window.addEventListener('orientationchange',()=>setTimeout(applyViewport,300));
  let ps='md';try{ps=localStorage.getItem('fenixcut_panel')||'md';}catch(e){}
  setPanelSize(ps);
  $('panelSize').onclick=()=>{if(document.body.dataset.focus==='1')setFocus(false);const o={sm:'md',md:'lg',lg:'sm'};setPanelSize(o[document.body.dataset.panel||'md']);};
  $('btnFocus').onclick=()=>setFocus(document.body.dataset.focus!=='1');
  $('tabs').addEventListener('click',()=>{if(document.body.dataset.focus==='1')setFocus(false);});
  let last=null;try{last=localStorage.getItem('fenixcut_last');}catch(e){}
  if(last&&!_cfgImported){try{const r=await idbGet('projects',last);if(r){await openProject(last,true);toast('Projeto "'+r.name+'" reaberto.',3500);}}catch(e){}}
}
