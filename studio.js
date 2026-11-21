/* FenixCut Studio V10 — layers, layouts and licensed-audio discovery. */
'use strict';
const LX={assets:new Map(),selected:null,layout:'free',busy:false,exporting:false,loading:false,db:null,results:[],query:null,refreshAt:0,history:[],redo:[],catalogAbort:null};
S.layers=[];
const lxId=()=>globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():'lx'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const lxEsc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lxSafeURL=u=>{try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)?x.href:'';}catch(e){return '';}};
function lxDB(){return LX.db||(LX.db=new Promise((res,rej)=>{const r=indexedDB.open('fenixcut-layer-assets',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
async function lxAssetStore(rec){const db=await lxDB();return new Promise((res,rej)=>{const t=db.transaction('assets','readwrite');t.objectStore('assets').put(rec);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
async function lxAssetRead(id){const db=await lxDB();return new Promise((res,rej)=>{const r=db.transaction('assets').objectStore('assets').get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function lxLoad(rec){
 if(LX.assets.has(rec.id))return LX.assets.get(rec.id);
 const url=URL.createObjectURL(rec.blob);let el;
 try{
  if(rec.kind==='image'){el=new Image();el.src=url;await el.decode();}
  else{el=document.createElement(rec.kind==='audio'?'audio':'video');el.preload='auto';el.playsInline=true;el.muted=true;$('hiddenVideos').appendChild(el);await new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('Tempo excedido a abrir '+rec.name)),15000);el.onloadeddata=()=>{clearTimeout(t);res();};el.onerror=()=>{clearTimeout(t);rej(new Error('Formato não suportado: '+rec.name));};el.src=url;el.load();});}
  const a={...rec,url,el,buffer:null,w:el.videoWidth||el.naturalWidth||0,h:el.videoHeight||el.naturalHeight||0,duration:rec.kind==='image'?Infinity:el.duration};
  el.addEventListener('seeked',invalidate);LX.assets.set(rec.id,a);return a;
 }catch(e){if(el&&el.remove)el.remove();URL.revokeObjectURL(url);throw e;}
}
function lxStop(){document.querySelectorAll('#lxResults audio').forEach(a=>a.pause());for(const a of LX.assets.values())if(a.kind!=='image')a.el.pause();}
function lxRelease(){LX.lastSync=-1;lxStop();for(const a of LX.assets.values()){if(a.kind!=='image'){a.el.removeAttribute('src');a.el.load();a.el.remove();}URL.revokeObjectURL(a.url);}LX.assets.clear();}
function lxSnapshot(){return JSON.stringify({layers:S.layers,layout:LX.layout});}
function lxCheckpoint(){LX.history.push(lxSnapshot());if(LX.history.length>50)LX.history.shift();LX.redo=[];}
function lxChanged(){LX.lastSync=-1;if(typeof ensureProject==='function')ensureProject();if(typeof scheduleSave==='function')scheduleSave();invalidate();renderTimeline();}
function lxUndo(){if(!LX.history.length)return;LX.redo.push(lxSnapshot());const x=JSON.parse(LX.history.pop());S.layers=x.layers;LX.layout=x.layout;LX.selected=null;lxChanged();lxPanel();}
function lxSelected(){return S.layers.find(l=>l.id===LX.selected);}
function lxActive(l,t){return t>=l.start&&t<l.start+l.dur;}
function lxTime(l,t){const a=LX.assets.get(l.asset);return Math.min(Math.max(0,(a&&a.duration||Infinity)-.002),l.in+Math.max(0,t-l.start));}
async function lxImport(file,license){
 if(LX.busy||S.exporting)throw new Error('Aguarda a operação atual.');
 if(!S.clips.length)throw new Error('Importa primeiro o vídeo principal.');
 if(file.size>250*1024*1024)throw new Error('Esta versão limita cada camada a 250 MB para proteger a memória.');
 const kind=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':null;
 if(!kind)throw new Error('Escolhe uma imagem, vídeo ou áudio suportado.');
 LX.busy=true;
 try{
  const rec={id:lxId(),name:file.name,kind,blob:file,license:license||null},a=await lxLoad(rec);
  await lxAssetStore(rec);lxCheckpoint();
  const duration=kind==='image'?Math.max(.1,S.total-S.t):Math.min(a.duration,Math.max(.1,S.total-S.t));
  const l={id:lxId(),asset:a.id,name:file.name,kind,start:S.t,in:0,dur:duration,x:.7,y:.25,w:.4,h:kind==='image'||kind==='video'?(.4*(S.ratio[0]/S.ratio[1])/(a.w/a.h)):0,opacity:1,rotation:0,fit:'contain',vol:kind==='audio'?.3:0,fadeIn:0,fadeOut:0,license:license||null};
  if(kind!=='audio')l.h=Math.min(.9,Math.max(.05,l.h));S.layers.push(l);LX.selected=l.id;lxChanged();lxPanel();return l;
 }finally{LX.busy=false;}
}
function lxBaseRect(){if(LX.layout==='topbottom')return{x:0,y:0,w:1,h:.5};if(LX.layout==='sides')return{x:0,y:0,w:.5,h:1};return{x:0,y:0,w:1,h:1};}
function lxApplyLayout(name){
 const l=lxSelected()||S.layers.find(x=>x.kind!=='audio');if(name!=='free'&&(!l||l.kind==='audio'))return toast('Adiciona ou seleciona uma camada de foto/vídeo.');
 lxCheckpoint();LX.layout=name;
 if(l&&name!=='free'){
  LX.selected=l.id;l.rotation=0;l.fit='cover';
  if(name==='topbottom')Object.assign(l,{x:.5,y:.75,w:1,h:.5});
  if(name==='sides')Object.assign(l,{x:.75,y:.5,w:.5,h:1});
  if(name==='pip')Object.assign(l,{x:.76,y:.24,w:.4,h:.3,fit:'contain'});
  if(name==='full')Object.assign(l,{x:.5,y:.5,w:1,h:1});
 }
 lxChanged();lxPanel();
}
function lxDrawBox(ctx,img,x,y,w,h,fit){
 const iw=img.videoWidth||img.naturalWidth||img.width,ih=img.videoHeight||img.naturalHeight||img.height;if(!iw||!ih)return;
 if(fit==='cover'){const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale;ctx.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h);}
 else{const scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
}
const lxOriginalRender=renderScene;
let lxScratch=null;
renderScene=function(r,t,ovr){
 if(!S.layers.length&&LX.layout==='free')return lxOriginalRender(r,t,ovr);
 const c=ovr?ovr.clip:clipAt(t),box=lxBaseRect(),ctx=r.ctx,W=r.w,H=r.h;
 ctx.save();ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);
 if(c){const src=SRC[c.src],img=ovr?ovr.img:src.video;
  r.draw(img,sceneParams(c,t-c.tStart,(W*box.w)/(H*box.h),src));
  if(box.w!==1||box.h!==1){
   if(!lxScratch)lxScratch=document.createElement('canvas');if(lxScratch.width!==W)lxScratch.width=W;if(lxScratch.height!==H)lxScratch.height=H;
   lxScratch.getContext('2d').drawImage(r.out,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.drawImage(lxScratch,box.x*W,box.y*H,box.w*W,box.h*H);
  }
 }else r.black();
 for(const l of S.layers){
  if(l.kind==='audio'||!lxActive(l,t))continue;const a=LX.assets.get(l.asset);if(!a||(a.kind==='video'&&a.el.readyState<2))continue;
  ctx.save();ctx.translate(l.x*W,l.y*H);ctx.rotate(l.rotation*Math.PI/180);ctx.globalAlpha=l.opacity;ctx.beginPath();ctx.rect(-l.w*W/2,-l.h*H/2,l.w*W,l.h*H);ctx.clip();
  lxDrawBox(ctx,a.el,-l.w*W/2,-l.h*H/2,l.w*W,l.h*H,l.fit);ctx.restore();
 }
 drawOverlays(ctx,W,H,t);
 const selected=lxSelected();
 if(r===R&&!S.exporting&&selected&&selected.kind!=='audio'&&lxActive(selected,t)){
  ctx.save();ctx.translate(selected.x*W,selected.y*H);ctx.rotate(selected.rotation*Math.PI/180);ctx.strokeStyle='#ff39ae';ctx.lineWidth=Math.max(2,W/320);ctx.strokeRect(-selected.w*W/2,-selected.h*H/2,selected.w*W,selected.h*H);ctx.fillStyle='#fff';const k=W/60;ctx.fillRect(selected.w*W/2-k/2,selected.h*H/2-k/2,k,k);ctx.restore();
 }
 ctx.restore();
};
async function lxPrepare(t){
 for(const l of S.layers){const a=LX.assets.get(l.asset);if(!a)throw new Error('Falta o ficheiro da camada '+l.name);if(a.kind==='video'&&lxActive(l,t)){a.el.pause();a.el.muted=true;await seekTo(a.el,lxTime(l,t));}}
}
function lxSync(t,playing,audible){
 for(const l of S.layers){const a=LX.assets.get(l.asset);if(!a||a.kind==='image')continue;const v=a.el;
  if(!lxActive(l,t)){v.pause();continue;}
  const want=lxTime(l,t);v.muted=!audible||l.vol<=0;const elapsed=t-l.start,left=l.start+l.dur-t,gain=Math.min(1,l.fadeIn?elapsed/l.fadeIn:1,l.fadeOut?left/l.fadeOut:1);v.volume=Math.max(0,Math.min(1,(l.vol||0)*gain));
  if(!v.seeking&&Math.abs(v.currentTime-want)>(playing?.2:.003))v.currentTime=want;
  if(playing&&v.paused)v.play().catch(()=>{});if(!playing&&!v.paused)v.pause();
 }
}
async function lxAudio(a){
 if(a.buffer)return a.buffer;const ac=new(window.AudioContext||window.webkitAudioContext)();try{a.buffer=await ac.decodeAudioData(await a.blob.arrayBuffer());return a.buffer;}finally{await ac.close();}
}
const lxOriginalMix=mixAudio;
mixAudio=async function(sr,ch){
 const base=await lxOriginalMix(sr,ch);if(!LX.exporting)return base;
 const audible=S.layers.filter(l=>l.kind!=='image'&&l.vol>0&&l.start<S.total);if(!audible.length)return base;
 const off=new OfflineAudioContext(ch,Math.max(1,Math.ceil(S.total*sr)),sr);
 if(base){const b=off.createBufferSource();b.buffer=base;b.connect(off.destination);b.start(0);}
 for(const l of audible){
  const a=LX.assets.get(l.asset);if(!a)throw new Error('Falta o áudio '+l.name);const buf=await lxAudio(a),s=off.createBufferSource(),g=off.createGain();s.buffer=buf;s.connect(g);g.connect(off.destination);
  const dur=Math.min(l.dur,S.total-l.start,buf.duration-l.in);if(dur<=0)continue;
  const fi=Math.min(l.fadeIn||0,dur/2),fo=Math.min(l.fadeOut||0,dur/2);g.gain.setValueAtTime(fi?0:l.vol,l.start);if(fi)g.gain.linearRampToValueAtTime(l.vol,l.start+fi);if(fo){g.gain.setValueAtTime(l.vol,l.start+dur-fo);g.gain.linearRampToValueAtTime(0,l.start+dur);}
  s.start(l.start,l.in,dur);
 }
 return off.startRendering();
};
const lxOriginalRecord=buildRecord;
buildRecord=function(){const rec=lxOriginalRecord();rec.state.studio={layers:JSON.parse(JSON.stringify(S.layers)),layout:LX.layout};return rec;};
const lxOriginalClear=clearProject;
clearProject=function(){lxRelease();S.layers=[];LX.layout='free';LX.selected=null;LX.history=[];LX.redo=[];return lxOriginalClear();};
const lxOriginalOpen=openProject;
openProject=async function(id,quiet){
 const result=await lxOriginalOpen(id,quiet);if(P.id!==id)return result;
 const rec=await idbGet('projects',id),st=rec&&rec.state&&rec.state.studio;if(!st)return result;
 LX.loading=true;try{
  S.layers=st.layers||[];LX.layout=st.layout||'free';const missing=[];
  for(const id of new Set(S.layers.map(l=>l.asset))){const a=await lxAssetRead(id);if(a){try{await lxLoad(a);}catch(e){missing.push(a.name);}}else missing.push(id);}
  if(missing.length)toast('Faltam ficheiros de camadas: '+missing.join(', '),7000);
  invalidate();renderTimeline();
 }finally{LX.loading=false;}return result;
};
const lxOriginalPause=pause;
pause=function(){lxStop();return lxOriginalPause();};

function lxNum(l,k,label,min,max,step=0.01,factor=1){return `<label class="fld">${label}<input type="number" data-lx-k="${k}" min="${min}" max="${max}" step="${step}" value="${Math.round(l[k]*factor*1000)/1000}"></label>`;}
function lxLayerHTML(){
 const l=lxSelected();return `<div class="box"><h3>Camadas de foto, vídeo e áudio</h3><div class="btnrow"><button class="btn primary" id="lxAddVisual">+ Foto / vídeo</button><button class="btn" id="lxAddAudio">+ Áudio local</button><button class="btn" id="lxUndo">Desfazer camada</button></div><p class="hint">Arrasta a camada no vídeo. Arrasta o canto branco para aumentar/diminuir, ou usa dois dedos. Os tempos são segundos e referem-se ao projeto. As camadas não prolongam o vídeo principal.</p>
 <label class="fld">Composição<select id="lxLayout">${[['free','Livre'],['topbottom','Principal em cima + camada em baixo'],['sides','Principal à esquerda + camada à direita'],['pip','Imagem dentro da imagem'],['full','Camada em ecrã inteiro']].map(([v,n])=>`<option value="${v}" ${LX.layout===v?'selected':''}>${n}</option>`).join('')}</select></label>
 <div class="lx-list">${S.layers.map((x,i)=>`<button class="btn ${x.id===LX.selected?'primary':''}" data-lx-select="${x.id}">${i+1}. ${lxEsc(x.name)} · ${x.start.toFixed(3)}–${(x.start+x.dur).toFixed(3)} s</button>`).join('')||'<p class="hint">Sem camadas.</p>'}</div></div>
 ${l?`<div class="box"><h3>${lxEsc(l.name)}</h3><div class="btnrow"><button class="btn" id="lxRaise">Trazer à frente</button><button class="btn" id="lxLower">Enviar atrás</button><button class="btn danger" id="lxDelete">Apagar camada</button></div>
 <div class="row3">${lxNum(l,'start','Início no projeto',0,86400,.001)}${lxNum(l,'in','Corte na origem',0,86400,.001)}${lxNum(l,'dur','Duração',.05,86400,.001)}</div>
 ${l.kind!=='audio'?`<div class="row2">${lxNum(l,'x','Centro X (%)',-100,200,.1,100)}${lxNum(l,'y','Centro Y (%)',-100,200,.1,100)}${lxNum(l,'w','Largura (%)',1,300,.1,100)}${lxNum(l,'h','Altura (%)',1,300,.1,100)}${lxNum(l,'rotation','Rotação (graus)',-180,180,1)}${lxNum(l,'opacity','Opacidade (%)',0,100,1,100)}</div><label class="fld">Enquadramento<select id="lxFit"><option value="contain" ${l.fit==='contain'?'selected':''}>Mostrar tudo</option><option value="cover" ${l.fit==='cover'?'selected':''}>Preencher e recortar</option></select></label>`:''}
 ${l.kind!=='image'?`<div class="row2">${lxNum(l,'vol','Volume (%)',0,100,1,100)}${lxNum(l,'fadeIn','Entrada suave (s)',0,60,.1)}${lxNum(l,'fadeOut','Saída suave (s)',0,60,.1)}</div>`:''}
 ${l.license?`<p class="hint">${lxEsc(l.license.title)} — ${lxEsc(l.license.creator)} · ${lxEsc(l.license.license.toUpperCase())} ${lxEsc(l.license.license_version||'')}<br><a target="_blank" rel="noopener" href="${lxEsc(lxSafeURL(l.license.foreign_landing_url))}">Origem</a> · <a target="_blank" rel="noopener" href="${lxEsc(lxSafeURL(l.license.license_url))}">Licença</a></p>`:''}</div>`:''}`;
}
function lxCredits(){return S.layers.filter(l=>l.license).map(l=>{const a=l.license;return `${a.title} — ${a.creator||'Autor não indicado'}\n${a.foreign_landing_url}\nLicença: ${a.license} ${a.license_version||''} — ${a.license_url}\nConsulta: ${a.checkedAt}\nAlterações: corte, sincronização com vídeo e ajuste de volume.\n`;}).join('\n');}
function lxMusicHTML(){return `<div class="box"><h3>Biblioteca de música — Openverse</h3><p class="hint">Catálogo online, consultado novamente em cada pesquisa e a cada 15 minutos enquanto este separador estiver aberto. Filtra CC0, domínio público e CC BY. A licença tem de ser confirmada na origem; royalty free não significa sem condições. Algumas faixas exigem créditos e podem ter outros direitos associados.</p>
 <form id="lxSearch"><label class="fld">Nome ou palavras-chave<input id="lxQuery" maxlength="180" placeholder="piano, cinematic, corporate…" value="${lxEsc(LX.query&&LX.query.q||'')}"></label><div class="row2"><label class="fld">Procurar por<select id="lxSearchMode"><option value="q">Palavras-chave</option><option value="title" ${LX.query&&LX.query.mode==='title'?'selected':''}>Nome da faixa</option></select></label><label class="fld">Género / estilo<select id="lxGenre">${['','ambient','classical','cinematic','electronic','jazz','rock','pop','acoustic','hip hop','corporate'].map(g=>`<option ${LX.query&&LX.query.genre===g?'selected':''} value="${g}">${g||'Todos'}</option>`).join('')}</select></label></div><button class="btn primary" type="submit">Pesquisar / atualizar</button></form>
 <p id="lxCatalogStatus" class="hint" aria-live="polite"></p><div class="btnrow"><button class="btn" id="lxLocalMusic">Importar música local</button><button class="btn" id="lxCredits">Exportar créditos</button></div><p class="hint">Se um servidor bloquear o download (CORS), abre a origem, descarrega a faixa e importa-a como áudio local. Não existem chaves secretas no catálogo. Limites de pedidos e disponibilidade dependem do serviço.</p><p class="hint"><a href="https://openverse.org" target="_blank" rel="noopener">Resultados fornecidos pelo Openverse</a></p><div id="lxResults">${lxResultsHTML()}</div><button class="btn wide" id="lxMore" ${LX.hasMore?'':'hidden'}>Carregar mais resultados</button></div>`;}
function lxResultsHTML(){return LX.results.map((r,i)=>`<div class="box"><h3>${lxEsc(r.title||'Sem título')}</h3><p class="hint">${lxEsc(r.creator||'Autor não indicado')} · ${lxEsc(r.license.toUpperCase())} ${lxEsc(r.license_version||'')} · ${lxEsc((r.genres||[]).join(', '))}</p><audio controls preload="none" src="${lxEsc(lxSafeURL(r.url))}" aria-label="Ouvir ${lxEsc(r.title)}"></audio><div class="btnrow"><a class="btn" href="${lxEsc(lxSafeURL(r.foreign_landing_url))}" target="_blank" rel="noopener">Ver origem</a><a class="btn" href="${lxEsc(lxSafeURL(r.license_url))}" target="_blank" rel="noopener">Licença</a><button class="btn" data-lx-use="${i}">Usar faixa</button></div></div>`).join('');}
async function lxSearchMusic(query,append=false){
 if(LX.catalogAbort)LX.catalogAbort.abort();LX.catalogAbort=new AbortController();LX.query=query;LX.refreshAt=Date.now();
 const status=$('lxCatalogStatus');if(status)status.textContent='A consultar o catálogo…';
 const page=append?(LX.page||1)+1:1;const params=new URLSearchParams({category:'music',license:'cc0,pdm,by',page_size:'20',filter_dead:'true',page:String(page)});
 if(query.q)params.set(query.mode==='title'?'title':'q',query.q);
 if(query.genre){if(query.mode!=='title')params.set('q',[query.q,query.genre].filter(Boolean).join(' '));}
 const controller=LX.catalogAbort,timer=setTimeout(()=>controller.abort(),20000);
 try{
  const r=await fetch('https://api.openverse.org/v1/audio/?'+params,{signal:controller.signal});if(!r.ok)throw new Error(r.status===429?'Limite do catálogo atingido; tenta mais tarde.':'Catálogo respondeu '+r.status);
  const j=await r.json();let items=(j.results||[]).filter(x=>['cc0','pdm','by'].includes(x.license)&&lxSafeURL(x.url));
  if(query.genre){const g=query.genre.toLowerCase();items=items.filter(x=>[...(x.genres||[]),...(x.tags||[]).map(t=>t.name||'')].some(t=>t.toLowerCase().replace(/[^a-z0-9]/g,'').includes(g.replace(/[^a-z0-9]/g,''))));}
  LX.results=append?[...LX.results,...items.filter(i=>!LX.results.some(x=>x.id===i.id))]:items;LX.page=page;LX.hasMore=page<(j.page_count||1);
  if($('lxResults')){$('lxResults').innerHTML=lxResultsHTML();lxBindResults();}if($('lxMore'))$('lxMore').hidden=!LX.hasMore;
  if(status)status.textContent=`${LX.results.length} faixas nesta página · atualizado ${new Date().toLocaleTimeString('pt-PT')}. ${query.genre?'O género é filtrado pelos metadados disponíveis.':''}`;
 }catch(e){if(status)status.textContent=e.name==='AbortError'?'Pesquisa interrompida ou sem resposta a tempo.':e.message;}finally{clearTimeout(timer);}
}
async function lxDownloadAudio(url){
 const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),60000),max=100*1024*1024;
 try{
  const response=await fetch(url,{signal:ctrl.signal});if(!response.ok)throw new Error('Download bloqueado pelo fornecedor.');
  if(Number(response.headers.get('Content-Length'))>max)throw new Error('Faixa demasiado grande.');
  if(!response.body){const blob=await response.blob();if(blob.size>max)throw new Error('Faixa demasiado grande.');return blob;}
  const reader=response.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('Faixa demasiado grande.');}chunks.push(value);}
  return new Blob(chunks,{type:response.headers.get('Content-Type')||'audio/mpeg'});
 }finally{clearTimeout(tm);}
}
function lxBindResults(){document.querySelectorAll('[data-lx-use]').forEach(b=>b.onclick=async()=>{
 const result=LX.results[+b.dataset.lxUse];if(!result)return;b.disabled=true;
 try{
  const response=await fetch('https://api.openverse.org/v1/audio/'+encodeURIComponent(result.id)+'/');if(!response.ok)throw new Error('Não foi possível rever a licença atual da faixa.');
  const r=await response.json();if(!['cc0','pdm','by'].includes(r.license))throw new Error('A licença atual não passa o filtro de utilização.');
  if(!confirm(`Adicionar “${r.title}”, de ${r.creator||'autor não indicado'}?\nLicença declarada: ${r.license} ${r.license_version||''}.\nConfirma os direitos na origem. CC BY exige créditos; o catálogo não garante ausência de reclamações.\nA faixa será descarregada para o aparelho.`))return;
  const url=lxSafeURL(r.url);if(!url)throw new Error('URL de áudio inválido.');
  const blob=await lxDownloadAudio(url);
  await lxImport(new File([blob],(r.title||'musica')+'.'+(r.filetype||'mp3'),{type:blob.type.startsWith('audio/')?blob.type:'audio/mpeg'}),{id:r.id,title:r.title,creator:r.creator,license:r.license,license_version:r.license_version,license_url:r.license_url,foreign_landing_url:r.foreign_landing_url,checkedAt:new Date().toISOString()});
 }catch(e){toast(e.message,7000);}finally{b.disabled=false;}
});}
function lxPick(accept){const i=document.createElement('input');i.type='file';i.accept=accept;i.multiple=true;i.onchange=async()=>{for(const f of i.files)try{await lxImport(f);}catch(e){toast(e.message,6000);}};i.click();}
function lxPanel(){S.tab='layers';renderPanel();}
TABS.splice(TABS.length-1,0,['layers','Camadas'],['music','Música']);
const lxOriginalPanel=renderPanel;
renderPanel=function(){
 if(!['layers','music'].includes(S.tab))return lxOriginalPanel();
 renderTabs();const b=$('panelBody');b.innerHTML=S.tab==='layers'?lxLayerHTML():lxMusicHTML();
 if(S.tab==='music'){
  $('lxSearch').onsubmit=e=>{e.preventDefault();lxSearchMusic({q:$('lxQuery').value.trim(),mode:$('lxSearchMode').value,genre:$('lxGenre').value});};
  $('lxMore').onclick=()=>lxSearchMusic(LX.query,true);$('lxLocalMusic').onclick=()=>lxPick('audio/*');$('lxCredits').onclick=()=>download('creditos-musicais.txt',lxCredits()||'Sem faixas de catálogo neste projeto.','text/plain');lxBindResults();
  if(!LX.query)lxSearchMusic({q:'instrumental',mode:'q',genre:''});return;
 }
 $('lxAddVisual').onclick=()=>lxPick('image/*,video/*');$('lxAddAudio').onclick=()=>lxPick('audio/*');$('lxUndo').onclick=lxUndo;$('lxLayout').onchange=e=>lxApplyLayout(e.target.value);
 b.querySelectorAll('[data-lx-select]').forEach(el=>el.onclick=()=>{LX.selected=el.dataset.lxSelect;lxPanel();invalidate();});
 const l=lxSelected();if(!l)return;
 $('lxDelete').onclick=()=>{lxCheckpoint();S.layers=S.layers.filter(x=>x.id!==l.id);LX.selected=null;if(!S.layers.some(x=>x.kind!=='audio'))LX.layout='free';lxChanged();lxPanel();};
 const reorder=d=>{const i=S.layers.indexOf(l),j=Math.max(0,Math.min(S.layers.length-1,i+d));lxCheckpoint();S.layers.splice(i,1);S.layers.splice(j,0,l);lxChanged();lxPanel();};
 $('lxRaise').onclick=()=>reorder(1);$('lxLower').onclick=()=>reorder(-1);
 if($('lxFit'))$('lxFit').onchange=e=>{lxCheckpoint();l.fit=e.target.value;lxChanged();};
 b.querySelectorAll('[data-lx-k]').forEach(el=>el.onchange=()=>{
  if(S.exporting)return;let v=Number(el.value),k=el.dataset.lxK;if(!Number.isFinite(v))return;
  const percent=['x','y','w','h','opacity','vol'].includes(k);if(percent)v/=100;
  v=Math.max(Number(el.min)/(percent?100:1),Math.min(Number(el.max)/(percent?100:1),v));
  const a=LX.assets.get(l.asset);
  if(a&&a.kind!=='image'&&(k==='in'||k==='dur')){
   if(k==='in')v=Math.min(v,Math.max(0,a.duration-.05));else v=Math.min(v,Math.max(.05,a.duration-l.in));
  }
  lxCheckpoint();l[k]=v;if(k==='in'&&a&&a.kind!=='image')l.dur=Math.min(l.dur,a.duration-l.in);lxChanged();lxPanel();
 });
};
const lxOriginalTimeline=renderTimeline;
renderTimeline=function(){
 lxOriginalTimeline();let host=$('lxTracks');if(!host){host=document.createElement('div');host.id='lxTracks';$('tlInner').insertBefore(host,$('playhead'));}
 host.innerHTML=S.layers.map((l,i)=>`<div class="lx-track"><button data-lx-track="${l.id}" style="left:${l.start*S.pps}px;width:${Math.max(10,l.dur*S.pps-2)}px" class="lx-block ${l.id===LX.selected?'on':''}">${l.kind==='audio'?'♫':'▣'} ${i+1}. ${lxEsc(l.name)}</button></div>`).join('');
 $('tlInner').style.height=(Math.max(108,$('trCaps').offsetTop+$('trCaps').offsetHeight+6)+S.layers.length*27)+'px';
 host.onclick=e=>{e.stopPropagation();const b=e.target.closest('[data-lx-track]');if(!b)return;LX.selected=b.dataset.lxTrack;const l=lxSelected();pause();setT(l.start);lxPanel();invalidate();};
};
function lxHit(l,p){const dx=p.x-l.x,dy=p.y-l.y,an=-l.rotation*Math.PI/180,x=dx*Math.cos(an)-dy*Math.sin(an),y=dx*Math.sin(an)+dy*Math.cos(an);return Math.abs(x)<=l.w/2+.02&&Math.abs(y)<=l.h/2+.02;}
function lxGestures(){
 const cv=$('preview'),points=new Map();let drag=null;
 const point=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
 cv.addEventListener('pointerdown',e=>{
  if(S.exporting||LX.loading)return;const p=point(e);points.set(e.pointerId,p);
  let l=lxSelected();if(!l||l.kind==='audio'||!lxHit(l,p))l=[...S.layers].reverse().find(x=>x.kind!=='audio'&&lxActive(x,S.t)&&lxHit(x,p));
  if(!l){points.clear();return;}
  e.preventDefault();cv.setPointerCapture(e.pointerId);pause();LX.selected=l.id;
  if(!drag){lxCheckpoint();drag={id:l.id,p,old:{...l},scale:Math.abs(p.x-(l.x+l.w/2))<.05&&Math.abs(p.y-(l.y+l.h/2))<.05};}
  if(points.size===2){const [a,b]=[...points.values()];drag.pinch=Math.hypot(a.x-b.x,a.y-b.y);drag.old={...l};}invalidate();
 });
 cv.addEventListener('pointermove',e=>{
  if(!drag||!points.has(e.pointerId))return;e.preventDefault();const p=point(e);points.set(e.pointerId,p);const l=S.layers.find(x=>x.id===drag.id);if(!l)return;
  if(points.size===2&&drag.pinch){const [a,b]=[...points.values()],z=Math.max(.05,Math.min(8,Math.hypot(a.x-b.x,a.y-b.y)/drag.pinch));l.w=Math.min(3,Math.max(.01,drag.old.w*z));l.h=Math.min(3,Math.max(.01,drag.old.h*z));}
  else if(drag.scale){const z=Math.max(.05,Math.min(8,(p.x-drag.old.x)/(drag.old.w/2)));l.w=Math.min(3,drag.old.w*z);l.h=Math.min(3,drag.old.h*z);}
  else{l.x=Math.max(-1,Math.min(2,drag.old.x+p.x-drag.p.x));l.y=Math.max(-1,Math.min(2,drag.old.y+p.y-drag.p.y));}
  invalidate();
 });
 const end=e=>{points.delete(e.pointerId);if(drag){drag=null;points.clear();lxChanged();if(S.tab==='layers')lxPanel();}};
 cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
}

async function lxFrame(r,t,baseVideos){
 const c=clipAt(t);await lxPrepare(t);
 if(c){const v=baseVideos?baseVideos.get(c.src):SRC[c.src].video;v.pause();v.muted=true;await seekTo(v,srcTimeAt(c,t));renderScene(r,t,{clip:c,img:v});}else renderScene(r,t,{clip:null,img:null});
}
async function lxExportMB(o,set,ctl){
 const MB=await loadMB(),format=new MB.Mp4OutputFormat(),supported=format.getSupportedVideoCodecs();
 let codecs=o.codec&&o.codec!=='auto'?[o.codec]:supported;
 if(codecs.some(c=>!supported.includes(c)))throw new Error('Codec não suportado neste contentor.');
 const codec=await MB.getFirstEncodableVideoCodec(codecs,{width:o.w,height:o.h});if(!codec)throw new Error('Resolução/codec indisponível.');
 let renderer,output,vs,as;
 try{
  renderer=createRenderer(o.w,o.h);output=new MB.Output({format,target:new MB.BufferTarget()});vs=new MB.CanvasSource(renderer.out,{codec,bitrate:o.bitrate,latencyMode:'quality',bitrateMode:o.bm||'variable',keyFrameInterval:2});output.addVideoTrack(vs,{frameRate:o.fps});
  let audio=null;
  if(o.audio){audio=await mixAudio(48000,2);if(audio){const ac=await MB.getFirstEncodableAudioCodec(format.getSupportedAudioCodecs());if(!ac)throw new Error('Sem codificador áudio compatível.');as=new MB.AudioBufferSource({codec:ac,bitrate:192000});output.addAudioTrack(as);}}
  await output.start();const n=Math.max(1,Math.ceil(S.total*o.fps));
  for(let i=0;i<n;i++){
   if(ctl.cancel)throw new Error('cancelado');await lxFrame(renderer,i/o.fps);await vs.add(i/o.fps,1/o.fps);
   if(i%3===0){set(i/n*.92,`Composição: frame ${i+1}/${n}`);await sleep(0);}
  }
  if(as){set(.94,'A juntar som das camadas e música…');await as.add(audio);if(as.close)as.close();}if(vs.close)vs.close();
  set(.98,'A finalizar composição…');await output.finalize();
  return{blob:new Blob([output.target.buffer],{type:'video/mp4'}),ext:'mp4',info:{method:'camadas — frame a frame',codec,bitrate:o.bitrate,sharp:0}};
 }catch(e){if(output)try{await output.cancel();}catch(_){}throw e;}
 finally{if(renderer)renderer.dispose();}
}
async function lxExportWC(o,set,ctl){
 if(o.codec&&!['auto','avc'].includes(o.codec))throw new Error('O modo alternativo de camadas só suporta H.264.');
 const cfg=await pickCodec(o.w,o.h,o.fps,o.bitrate);if(!cfg)throw new Error('H.264 não suportado neste aparelho.');
 const {Muxer,ArrayBufferTarget}=await loadMuxer();let enc,aenc,renderer,fail=null,abuf=null;
 const acfg={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000};
 if(o.audio){abuf=await mixAudio(48000,2);if(abuf&&(!globalThis.AudioEncoder||!(await AudioEncoder.isConfigSupported(acfg)).supported))throw new Error('Sem codificador AAC; não foi removido o áudio silenciosamente.');}
 const target=new ArrayBufferTarget(),mux=new Muxer({target,video:{codec:'avc',width:o.w,height:o.h},...(abuf?{audio:{codec:'aac',numberOfChannels:2,sampleRate:48000}}:{}),fastStart:'in-memory'});
 try{
  enc=new VideoEncoder({output:(chunk,meta)=>mux.addVideoChunk(chunk,meta),error:e=>fail=e});enc.configure({...cfg,latencyMode:'quality',bitrateMode:o.bm||'variable'});renderer=createRenderer(o.w,o.h);
  const n=Math.ceil(S.total*o.fps);
  for(let i=0;i<n;i++){
   if(ctl.cancel)throw new Error('cancelado');if(fail)throw fail;
   await lxFrame(renderer,i/o.fps);const frame=new VideoFrame(renderer.out,{timestamp:Math.round(i*1e6/o.fps),duration:Math.round(1e6/o.fps)});
   try{enc.encode(frame,{keyFrame:i%(o.fps*2)===0});}finally{frame.close();}
   while(enc.encodeQueueSize>6){await sleep(3);if(fail)throw fail;if(ctl.cancel)throw new Error('cancelado');}
   if(i%3===0){set(i/n*.9,`Composição alternativa: ${i+1}/${n}`);await sleep(0);}
  }
  await enc.flush();if(fail)throw fail;
  if(abuf){
   aenc=new AudioEncoder({output:(chunk,meta)=>mux.addAudioChunk(chunk,meta),error:e=>fail=e});aenc.configure(acfg);
   const left=abuf.getChannelData(0),right=abuf.getChannelData(1);
   for(let i=0;i<abuf.length;i+=48000){if(ctl.cancel)throw new Error('cancelado');const n=Math.min(48000,abuf.length-i),data=new Float32Array(n*2);data.set(left.subarray(i,i+n));data.set(right.subarray(i,i+n),n);const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(i/48000*1e6),data});try{aenc.encode(ad);}finally{ad.close();}while(aenc.encodeQueueSize>4){await sleep(2);if(fail)throw fail;}}
   await aenc.flush();if(fail)throw fail;
  }
  mux.finalize();return{blob:new Blob([target.buffer],{type:'video/mp4'}),ext:'mp4',info:{method:'camadas — H.264 frame a frame',codec:cfg.codec,bitrate:o.bitrate,sharp:0}};
 }finally{if(enc&&enc.state!=='closed')enc.close();if(aenc&&aenc.state!=='closed')aenc.close();if(renderer)renderer.dispose();}
}
async function lxExportRT(o,set,ctl){
 const choices={avc:['video/mp4;codecs=avc1.42002A,mp4a.40.2','video/mp4;codecs=avc1'],vp9:['video/webm;codecs=vp9,opus'],av1:['video/webm;codecs=av01,opus'],auto:['video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus']};
 if(!window.MediaRecorder)throw new Error('MediaRecorder indisponível.');
 const mime=(choices[o.codec||'auto']||[]).find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw new Error('Codec não suportado no modo Compatível.');
 let renderer,stream,ac,dest,audioSrc,rec,stopped,raf;const base=new Map(),chunks=[];let fail=null,active=null;
 try{
  const abuf=o.audio?await mixAudio(48000,2):null;
  if(abuf){ac=new(window.AudioContext||window.webkitAudioContext)();dest=ac.createMediaStreamDestination();audioSrc=ac.createBufferSource();audioSrc.buffer=abuf;audioSrc.connect(dest);await ac.resume();}
  for(const id of new Set(S.clips.map(c=>c.src))){const v=document.createElement('video');v.preload='auto';v.playsInline=true;v.muted=true;base.set(id,v);$('hiddenVideos').appendChild(v);await new Promise((res,rej)=>{const tm=setTimeout(()=>rej(new Error('Vídeo principal não carregou')),15000);v.onloadeddata=()=>{clearTimeout(tm);res();};v.onerror=()=>{clearTimeout(tm);rej(new Error('Vídeo principal não suportado'));};v.src=SRC[id].url;v.load();});}
  renderer=createRenderer(o.w,o.h);await lxFrame(renderer,0,base);stream=renderer.out.captureStream(o.fps);
  for(let k=0;k<3;k++){await lxFrame(renderer,0,base);const track=stream.getVideoTracks()[0];if(track.requestFrame)track.requestFrame();await sleep(50);}
  rec=new MediaRecorder(new MediaStream([...stream.getVideoTracks(),...(dest?dest.stream.getAudioTracks():[])]),{mimeType:mime,videoBitsPerSecond:o.bitrate,audioBitsPerSecond:192000});
  if(o.codec==='avc'&&!/avc|h264/i.test(rec.mimeType))throw new Error('H.264 não foi respeitado pelo navegador.');
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};stopped=new Promise(r=>rec.onstop=r);rec.onerror=e=>fail=e.error||new Error('Falha de gravação');
  rec.start(200);{const track=stream.getVideoTracks()[0];if(track.requestFrame)track.requestFrame();}if(audioSrc)audioSrc.start();const t0=performance.now();
  await new Promise((res,rej)=>{
   const loop=async()=>{try{
    if(ctl.cancel)throw new Error('cancelado');if(fail)throw fail;if(document.hidden)throw new Error('Mantém a página visível para gravar.');
    const t=(performance.now()-t0)/1000;if(t>=S.total){res();return;}const c=clipAt(t);
    if((c&&c.id)!==active){for(const v of base.values())v.pause();if(c){const v=base.get(c.src);await seekTo(v,srcTimeAt(c,t));v.playbackRate=c.speed;await v.play();}active=c&&c.id;}
    lxSync(t,true,false);renderScene(renderer,t,{clip:c,img:c?base.get(c.src):null});{const track=stream.getVideoTracks()[0];if(track.requestFrame)track.requestFrame();}set(t/S.total,'A gravar composição em tempo real — mantém a página visível');raf=requestAnimationFrame(loop);
   }catch(e){rej(e);}};loop();
  });
  await lxFrame(renderer,Math.max(0,S.total-.001),base);{const track=stream.getVideoTracks()[0];if(track.requestFrame)track.requestFrame();}await sleep(70);rec.stop();await stopped;if(fail)throw fail;
  const blob=new Blob(chunks,{type:mime.split(';')[0]});return{blob,ext:mime.includes('mp4')?'mp4':'webm',info:{method:'camadas — Compatível (tempo real)',codec:rec.mimeType||mime,bitrate:o.bitrate,sharp:0}};
 }finally{
  cancelAnimationFrame(raf);if(rec&&rec.state!=='inactive'){rec.stop();if(stopped)await stopped;}
  lxStop();for(const v of base.values()){v.pause();v.removeAttribute('src');v.load();v.remove();}
  if(stream)stream.getTracks().forEach(t=>t.stop());if(dest)dest.stream.getTracks().forEach(t=>t.stop());if(audioSrc)try{audioSrc.stop();}catch(e){}if(ac&&ac.state!=='closed')await ac.close();if(renderer)renderer.dispose();
 }
}
const lxOriginalExport=runExport;
runExport=async function(options,set,ctl){
 if(!S.layers.length&&LX.layout==='free')return lxOriginalExport(options,set,ctl);
 if(LX.exporting)throw new Error('Uma exportação já está em curso.');
 if(LX.busy||LX.loading)throw new Error('Aguarda o carregamento das camadas.');
 const o={...options};o.bitrate=o.mbps>0?Math.round(o.mbps*1e6):Math.min(90000000,Math.max(o.bitrate*2,o.w*o.h*6));
 const saved=Object.values(SRC).map(s=>({v:s.video,m:s.video.muted,vol:s.video.volume,rate:s.video.playbackRate}));
 const oldExporting=S.exporting;LX.exporting=true;S.exporting=true;lxStop();
 try{
  for(const l of S.layers){if(!LX.assets.has(l.asset))throw new Error('Camada em falta: '+l.name);}
  if(document.fonts)await document.fonts.ready;let result;
  if(o.method==='rt')result=await lxExportRT(o,set,ctl);
  else{
   try{result=await lxExportMB(o,set,ctl);}catch(e){if(e.message==='cancelado')throw e;logErr('camadas MB: '+e.message);try{result=await lxExportWC(o,set,ctl);}catch(err){if(err.message==='cancelado')throw err;logErr('camadas WC: '+err.message);throw new Error('Os motores frame a frame falharam. Não foi usado tempo real automaticamente. Consulta o diagnóstico ou escolhe Compatível.');}}
  }
  if(!result.blob||!result.blob.size)throw new Error('Ficheiro final vazio');
  const v=document.createElement('video'),url=URL.createObjectURL(result.blob);
  try{await new Promise((res,rej)=>{const tm=setTimeout(()=>rej(new Error('Não foi possível verificar o ficheiro final')),10000);v.onloadedmetadata=()=>{clearTimeout(tm);res();};v.onerror=()=>{clearTimeout(tm);rej(new Error('Ficheiro final ilegível'));};v.preload='metadata';v.src=url;});
   if(v.videoWidth!==o.w||v.videoHeight!==o.h)throw new Error('A resolução gerada não corresponde à pedida.');
   if(Number.isFinite(v.duration)&&Math.abs(v.duration-S.total)>Math.max(.3,S.total*.03))throw new Error('Duração exportada incorreta: '+v.duration.toFixed(3)+' s; esperado '+S.total.toFixed(3)+' s.');
   result.info={...result.info,width:v.videoWidth,height:v.videoHeight,duration:v.duration,averageMbps:Number.isFinite(v.duration)&&v.duration>0?result.blob.size*8/v.duration/1e6:null};
  }finally{v.removeAttribute('src');v.load();URL.revokeObjectURL(url);}
  set(1,'Composição exportada. Verifica os créditos das músicas antes de publicar.');return result;
 }finally{LX.exporting=false;LX.lastSync=-1;S.exporting=oldExporting;lxStop();for(const a of LX.assets.values())if(a.kind!=='image')a.el.muted=true;for(const s of saved){s.v.pause();s.v.muted=s.m;s.v.volume=s.vol;s.v.playbackRate=s.rate;}invalidate();}
};
const lxOriginalASR=autoCaptions;
autoCaptions=async function(o,status){if(LX.exporting||S.exporting)throw new Error('Aguarda o fim da exportação antes de transcrever.');return lxOriginalASR(o,status);};
window.addEventListener('DOMContentLoaded',()=>{
 const style=document.createElement('style');style.textContent=`.lx-list{display:flex;flex-direction:column;gap:6px}.lx-list .btn{justify-content:flex-start;overflow:hidden;text-overflow:ellipsis;display:block;text-align:left}.lx-track{position:relative;height:27px;border-top:1px solid var(--bd)}.lx-block{position:absolute;top:2px;height:23px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:#62224e;border:1px solid #ba3d8d;border-radius:4px;padding:2px 6px;font-size:11px}.lx-block.on{outline:2px solid #ff39ae}.tlscroll{overflow-y:auto!important}.pbody audio{width:100%;height:36px}.pbody [data-lx-k]{min-width:0}#preview{touch-action:none}.pbody .row3:has([data-lx-k]){grid-template-columns:repeat(3,minmax(0,1fr))}`;
 document.head.appendChild(style);lxGestures();
 LX.lastSync=-1;
 const update=()=>{if(!S.exporting&&!LX.loading){if(S.t!==LX.lastSync||S.playing){lxSync(S.t,S.playing,true);LX.lastSync=S.t;} }requestAnimationFrame(update);};requestAnimationFrame(update);
 setInterval(()=>{if(S.tab==='music'&&!document.hidden&&LX.query&&Date.now()-LX.refreshAt>15*60*1000)lxSearchMusic(LX.query);},60000);
 document.addEventListener('play',e=>{if(e.target.matches&&e.target.matches('#lxResults audio'))document.querySelectorAll('#lxResults audio').forEach(a=>{if(a!==e.target)a.pause();});},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)lxStop();});
});
