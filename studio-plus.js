/* FenixCut V11: visible layouts, partial mobile sheet, sources and layer animation. */
'use strict';
(function(){
 if(typeof LX==='undefined'||typeof lxLayerHTML!=='function'){
  window.addEventListener('DOMContentLoaded',()=>{const d=document.createElement('p');d.textContent='FenixCut: o módulo studio.js não carregou. Mantém os ficheiros da V10 e recarrega a página.';d.style.cssText='background:#5a132b;color:white;padding:12px';document.body.prepend(d);});return;
 }
 const P={editing:null,renderTime:0,source:'',safe:false,snap:true,fold:false,anim:0};
 try{const saved=JSON.parse(localStorage.getItem('fenixcut-plus-ui')||'{}');P.safe=!!saved.safe;P.snap=saved.snap!==false;}catch(e){}
 const props=['x','y','w','h','rotation','opacity'];
 function pref(){try{localStorage.setItem('fenixcut-plus-ui',JSON.stringify({safe:P.safe,snap:P.snap}));}catch(e){}}
 function layerAt(l,t){
  const a=(l.keyframes||[]).filter(k=>Number.isFinite(k.t)).slice().sort((a,b)=>a.t-b.t);if(!a.length||P.editing===l.id)return l;
  const local=t-l.start;if(local<=a[0].t)return {...l,...pick(a[0])};if(local>=a[a.length-1].t)return {...l,...pick(a[a.length-1])};
  let i=0;while(i<a.length-1&&a[i+1].t<local)i++;
  const one=a[i],two=a[i+1];let u=(local-one.t)/Math.max(.000001,two.t-one.t);if(l.keyEase==='smooth')u=u*u*(3-2*u);
  const result={...l};for(const k of props){const x=Number.isFinite(one[k])?one[k]:l[k],y=Number.isFinite(two[k])?two[k]:l[k];result[k]=x+(y-x)*u;}return result;
 }
 function pick(x){const r={};for(const k of props)if(Number.isFinite(x[k]))r[k]=x[k];return r;}
 function keyframe(l,checkpoint=true){
  if(!l||l.kind==='audio')return;
  const t=Math.round((S.t-l.start)*1000)/1000;if(t<0||t>l.dur){toast('Coloca a agulha dentro da duração desta camada.');return;}
  if(checkpoint)lxCheckpoint();l.keyframes=l.keyframes||[];const k={t,...pick(l)},i=l.keyframes.findIndex(x=>Math.abs(x.t-t)<.0011);if(i>=0)l.keyframes[i]=k;else l.keyframes.push(k);l.keyframes.sort((a,b)=>a.t-b.t);lxChanged();
 }
 const originalRender=renderScene;
 renderScene=function(r,t,ovr){
  const raw=S.layers;P.renderTime=t;S.layers=raw.map(l=>layerAt(l,t));
  try{
   const result=originalRender(r,t,ovr);
   if(P.safe&&r===R&&!S.exporting){const x=r.ctx;x.save();x.setTransform(1,0,0,1,0,0);x.strokeStyle='#ffe56a';x.lineWidth=Math.max(2,r.w/400);x.setLineDash([r.w/60,r.w/90]);x.strokeRect(r.w*.06,r.h*.1,r.w*.78,r.h*.68);x.setLineDash([]);x.fillStyle='#ffe56a';x.font=Math.max(11,r.w/55)+'px sans-serif';x.fillText('Guias aproximadas — não exportadas',r.w*.065,r.h*.085);x.restore();}
   return result;
  }finally{S.layers=raw;}
 };
 const originalBox=lxDrawBox;
 lxDrawBox=function(ctx,img,x,y,w,h,fit){
  const l=S.layers.find(l=>{const a=LX.assets.get(l.asset);return a&&a.el===img&&lxActive(l,P.renderTime);});
  if(!l||!l.mask||l.mask==='none')return originalBox(ctx,img,x,y,w,h,fit);
  ctx.save();ctx.beginPath();
  if(l.mask==='circle'){const radius=Math.min(w,h)/2;ctx.arc(x+w/2,y+h/2,radius,0,Math.PI*2);}
  else if(l.mask==='ellipse')ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
  else{const radius=Math.min(w,h)*.12;if(ctx.roundRect)ctx.roundRect(x,y,w,h,radius);else{ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);}}
  ctx.clip();originalBox(ctx,img,x,y,w,h,fit);ctx.restore();
 };
 const oldHit=lxHit;lxHit=function(l,p){return oldHit(layerAt(l,S.t),p);};
 const originalLayout=lxApplyLayout;
 lxApplyLayout=function(type){
  const l=lxSelected()||S.layers.find(x=>x.kind!=='audio');
  const clear=l&&(l.keyframes||[]).length&&type!=='free';
  if(clear&&!confirm('Aplicar este modelo remove os keyframes de posição/tamanho desta camada. Continuar?'))return;
  const result=originalLayout(type);if(clear){l.keyframes=[];lxChanged();renderPanel();}return result;
 };
 const layouts=[['topbottom','Dois vídeos · cima / baixo'],['sides','Dois vídeos · lado a lado'],['pip','Vídeo dentro do vídeo'],['full','Sobreposição em ecrã inteiro'],['free','Composição livre']];
 function cards(){return `<section class="box fxp-models"><h3>Modelos de vídeo</h3><p class="hint">Toca num modelo. Se ainda não houver uma camada visual, podes escolher o segundo vídeo ou uma fotografia.</p><div class="fxp-model-grid">${layouts.map(([key,label])=>`<button type="button" class="fxp-model ${LX.layout===key?'on':''}" data-fxp-layout="${key}"><canvas width="240" height="160" data-fxp-card="${key}" aria-hidden="true"></canvas><span>${label}</span></button>`).join('')}</div></section>`;}
 async function applyLayout(type){
  if(S.exporting)return toast('Aguarda a exportação.');if(!S.clips.length)return toast('Importa primeiro o vídeo principal.');
  let l=lxSelected();if(!l||l.kind==='audio')l=S.layers.find(x=>x.kind!=='audio');
  if(!l&&type!=='free'){
   const input=document.createElement('input');input.type='file';input.accept='video/*,image/*';input.onchange=async()=>{if(!input.files.length)return;try{const layer=await lxImport(input.files[0]);LX.selected=layer.id;lxApplyLayout(type);}catch(e){toast(e.message,6000);}};input.click();return;
  }
  if(l)LX.selected=l.id;lxApplyLayout(type);
 }
 function decorate(){
  document.body.dataset.plusFold='0';P.fold=false;
  if(S.tab==='layers'){
   const body=$('panelBody');body.insertAdjacentHTML('afterbegin',cards());
   body.querySelectorAll('[data-fxp-layout]').forEach(b=>b.onclick=()=>applyLayout(b.dataset.fxpLayout));
   const l=lxSelected();if(l&&l.kind!=='audio'){
    const current=layerAt(l,S.t);body.querySelectorAll('[data-lx-k]').forEach(input=>{const k=input.dataset.lxK;if(props.includes(k))input.value=String(Math.round(current[k]*(['x','y','w','h','opacity'].includes(k)?100:1)*1000)/1000);});
    body.insertAdjacentHTML('beforeend',`<section class="box"><h3>Animação e máscara da camada</h3><p class="hint">Ajusta a camada num instante e guarda um keyframe; noutro instante, ajusta e guarda outro. Após criar keyframes, novos ajustes são guardados no instante atual.</p><div class="btnrow"><button class="btn" id="fxpKey">Guardar keyframe</button><button class="btn" id="fxpPrev">Anterior</button><button class="btn" id="fxpNext">Seguinte</button><button class="btn danger" id="fxpRemove">Apagar neste instante</button><button class="btn" id="fxpClearKeys">Limpar animação</button></div><p class="hint">${(l.keyframes||[]).map(k=>(l.start+k.t).toFixed(3)+' s').join(' · ')||'Ainda sem keyframes.'}</p><div class="row2"><label class="fld">Movimento<select id="fxpEase"><option value="linear">Linear</option><option value="smooth" ${l.keyEase==='smooth'?'selected':''}>Entrada/saída suave</option></select></label><label class="fld">Máscara<select id="fxpMask">${[['none','Retângulo'],['rounded','Cantos arredondados'],['circle','Círculo'],['ellipse','Elipse']].map(([v,n])=>`<option value="${v}" ${l.mask===v?'selected':''}>${n}</option>`).join('')}</select></label></div><p class="hint">Máscaras geométricas; não são remoção de fundo por IA.</p></section>`);
    $('fxpKey').onclick=()=>{Object.assign(l,pick(layerAt(l,S.t)));keyframe(l);renderPanel();};
    const navigate=d=>{const times=(l.keyframes||[]).map(k=>l.start+k.t).sort((a,b)=>a-b),t=d<0?times.filter(x=>x<S.t-.001).pop():times.find(x=>x>S.t+.001);if(t!=null){pause();setT(t);renderPanel();}};
    $('fxpPrev').onclick=()=>navigate(-1);$('fxpNext').onclick=()=>navigate(1);
    $('fxpRemove').onclick=()=>{lxCheckpoint();l.keyframes=(l.keyframes||[]).filter(k=>Math.abs(l.start+k.t-S.t)>.0011);lxChanged();renderPanel();};
    $('fxpClearKeys').onclick=()=>{lxCheckpoint();l.keyframes=[];lxChanged();renderPanel();};
    $('fxpEase').onchange=e=>{lxCheckpoint();l.keyEase=e.target.value;lxChanged();};$('fxpMask').onchange=e=>{lxCheckpoint();l.mask=e.target.value;lxChanged();};
   }
  }
  if(S.tab==='music'){
   const search=$('lxSearch');if(!search)return;
   search.insertAdjacentHTML('afterbegin',`<label class="fld">Biblioteca integrada<select id="fxpSource">${[['','Todas — Openverse'],['jamendo','Jamendo — via Openverse'],['freesound','Freesound — via Openverse'],['wikimedia_audio','Wikimedia Commons — via Openverse']].map(([id,label])=>`<option value="${id}" ${P.source===id?'selected':''}>${label}</option>`).join('')}</select></label>`);
   $('fxpSource').onchange=e=>{P.source=e.target.value;lxSearchMusic({q:$('lxQuery').value.trim(),mode:$('lxSearchMode').value,genre:$('lxGenre').value});};
   search.insertAdjacentHTML('afterend',`<div class="box"><h3>Outras bibliotecas — abrir na origem</h3><p class="hint">Não são downloads integrados. Confirma a licença da faixa, descarrega no fornecedor e usa “Importar música local”. Pixabay e Mixkit têm licenças próprias, não são Creative Commons por defeito.</p><div class="btnrow"><a class="btn" target="_blank" rel="noopener" href="https://pixabay.com/music/">Pixabay Music</a><a class="btn" target="_blank" rel="noopener" href="https://mixkit.co/free-stock-music/">Mixkit Music</a><a class="btn" target="_blank" rel="noopener" href="https://freemusicarchive.org/">Free Music Archive</a></div></div>`);
  }
 }
 const oldPanel=renderPanel;renderPanel=function(){const x=oldPanel();decorate();return x;};
 lxSearchMusic=async function(query,append=false){
  if(LX.catalogAbort)LX.catalogAbort.abort();const controller=new AbortController();LX.catalogAbort=controller;LX.query=query;LX.refreshAt=Date.now();
  const status=$('lxCatalogStatus');if(status)status.textContent='A pesquisar a biblioteca…';
  const page=append?(LX.page||1)+1:1,params=new URLSearchParams({category:'music',license:'cc0,pdm,by',page_size:'20',filter_dead:'true',page:String(page)});
  if(P.source)params.set('source',P.source);if(query.q)params.set(query.mode==='title'?'title':'q',query.q);
  if(query.genre&&query.mode!=='title')params.set('q',[query.q,query.genre].filter(Boolean).join(' '));
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch('https://api.openverse.org/v1/audio/?'+params,{signal:controller.signal});if(!response.ok)throw new Error(response.status===429?'Limite do catálogo atingido; tenta mais tarde.':'Catálogo respondeu '+response.status);
   const j=await response.json();let items=(j.results||[]).filter(r=>['cc0','pdm','by'].includes(r.license)&&lxSafeURL(r.url));
   if(query.genre){const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,''),g=norm(query.genre);items=items.filter(x=>[...(x.genres||[]),...(x.tags||[]).map(t=>t.name||'')].some(t=>norm(t).includes(g)));}
   LX.results=append?[...LX.results,...items.filter(i=>!LX.results.some(x=>x.id===i.id))]:items;LX.page=page;LX.hasMore=page<(j.page_count||1);
   if($('lxResults')){$('lxResults').innerHTML=lxResultsHTML();lxBindResults();}if($('lxMore'))$('lxMore').hidden=!LX.hasMore;
   if(status)status.textContent=`${LX.results.length} resultados · ${new Date().toLocaleTimeString('pt-PT')}. Licenças filtradas; confirma sempre na origem.${query.genre?' Género baseado nos metadados disponíveis.':''}`;
  }catch(e){if(status)status.textContent=e.name==='AbortError'?'Pesquisa interrompida ou sem resposta a tempo.':e.message;}finally{clearTimeout(timer);}
 };
 function paintCard(cv,type,t){
  const ctx=cv.getContext('2d'),W=cv.width,H=cv.height;ctx.fillStyle='#111';ctx.fillRect(0,0,W,H);
  const draw=(x,y,w,h,colour,word,phase)=>{ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=colour;ctx.fillRect(x,y,w,h);ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(x+w*(.15+.7*((t*.25+phase)%1)),y+h*.44,Math.min(w,h)*.15,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='15px sans-serif';ctx.fillText(word,x+8,y+h-9);ctx.restore();};
  if(type==='topbottom'){draw(0,0,W,H/2,'#653ab7','Vídeo 1',0);draw(0,H/2,W,H/2,'#bd2c82','Vídeo 2',.5);}
  else if(type==='sides'){draw(0,0,W/2,H,'#653ab7','Vídeo 1',0);draw(W/2,0,W/2,H,'#bd2c82','Vídeo 2',.5);}
  else{draw(0,0,W,H,'#653ab7','Principal',0);if(type==='pip')draw(W*.57,H*.08,W*.38,H*.4,'#bd2c82','Camada',.5);else if(type==='full')draw(0,0,W,H,'#bd2c82','Camada',.5);else draw(W*(.3+.1*Math.sin(t)),H*.15,W*.45,H*.5,'#bd2c82','Livre',.5);}
 }
 function frame(now){
  if(!document.hidden&&!S.exporting&&now-P.anim>100){P.anim=now;const bound=$('panelBody').getBoundingClientRect();document.querySelectorAll('[data-fxp-card]').forEach(cv=>{const r=cv.getBoundingClientRect();if(r.bottom>=bound.top&&r.top<=bound.bottom)paintCard(cv,cv.dataset.fxpCard,matchMedia('(prefers-reduced-motion: reduce)').matches?0:now/1000);});}
  requestAnimationFrame(frame);
 }
 function css(){return `
 #lxQuery,#lxSearch input[type=text]{color:#000!important;background:#fff!important;caret-color:#000!important;-webkit-text-fill-color:#000!important}#lxQuery::placeholder{color:#444!important;-webkit-text-fill-color:#444!important;opacity:1}
 .fxp-model-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fxp-model{padding:5px;border:2px solid #53414c;border-radius:10px;color:var(--tx);background:var(--s2);font-size:12px;text-align:center;min-width:0}.fxp-model.on{border-color:var(--ac)}.fxp-model canvas{display:block;width:100%;height:auto;margin-bottom:4px}.fxp-models h3{margin-bottom:8px}
 .fxp-sheet-handle{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:2px 10px;min-height:27px;flex-shrink:0}.fxp-sheet-handle::before{content:'';width:35px;height:4px;border-radius:4px;background:#a599a1}.fxp-sheet-handle button{font-size:12px;padding:4px 7px;min-height:27px}.fxp-shortcut{font-size:12px;min-height:28px;padding:0 6px;white-space:nowrap}
 @media(max-width:899px) and (orientation:portrait){
 .app{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr) minmax(0,clamp(125px,30dvh,300px)) auto!important;grid-template-areas:'top' 'stage' 'panel' 'tl'!important}
 .panel{position:relative!important;inset:auto!important;margin-top:-20px!important;height:calc(100% + 20px)!important;min-height:0!important;max-height:calc(45dvh + 20px)!important;z-index:12;border:1px solid var(--bd);border-radius:16px 16px 0 0;box-shadow:0 -8px 24px #0005;overflow:hidden;background:var(--bg)}
 .panel .pbody{min-height:0;overflow-y:auto;overscroll-behavior:contain}.panel .tabs{min-height:38px}.panel .tabs button{min-height:38px;padding:0 12px;font-size:13px}
 .tlscroll{height:90px!important;max-height:115px!important;min-height:65px!important}.tl{z-index:13;min-height:0}.top{z-index:14}.canvasWrap{min-height:0}
 body[data-plus-fold='1'] .app{grid-template-rows:auto minmax(0,1fr) 70px auto!important}body[data-plus-fold='1'] .panel .pbody{display:none!important}
 }
 @media(max-height:700px) and (orientation:portrait){.fxp-model-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.panel .fxp-sheet-handle{min-height:24px}.tlscroll{height:70px!important}}
 `;}
 window.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');style.textContent=css();document.head.appendChild(style);
  const bar=document.querySelector('.tlbar')||document.querySelector('.projbar');
  const model=document.createElement('button');model.className='btn fxp-shortcut';model.id='fxpModels';model.textContent='Modelos';model.onclick=()=>{if(document.body.dataset.focus==='1'&&typeof setFocus==='function')setFocus(false);S.tab='layers';renderPanel();$('panelBody').scrollTop=0;};bar.appendChild(model);
  const guide=document.createElement('button');guide.className='btn fxp-shortcut';guide.id='fxpGuides';guide.textContent='Guias';guide.setAttribute('aria-pressed',String(P.safe));guide.onclick=()=>{P.safe=!P.safe;guide.setAttribute('aria-pressed',String(P.safe));pref();invalidate();};bar.appendChild(guide);
  const handle=document.createElement('div');handle.className='fxp-sheet-handle';handle.innerHTML='<span>Ferramentas</span><button type="button" id="fxpFold">Recolher / abrir</button><button type="button" id="fxpSnap">Alinhar: ligado</button>';
  document.querySelector('.panel').prepend(handle);$('fxpFold').onclick=()=>{P.fold=!P.fold;document.body.dataset.plusFold=P.fold?'1':'0';};$('fxpSnap').textContent='Alinhar: '+(P.snap?'ligado':'desligado');$('fxpSnap').onclick=()=>{P.snap=!P.snap;pref();$('fxpSnap').textContent='Alinhar: '+(P.snap?'ligado':'desligado');};
  const cv=$('preview');
  cv.addEventListener('pointerdown',e=>{
   if(S.exporting)return;const r=cv.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};
   const l=[...S.layers].reverse().find(l=>l.kind!=='audio'&&lxActive(l,S.t)&&lxHit(l,p));
   if(l){const value=layerAt(l,S.t);Object.assign(l,pick(value));P.editing=l.id;}
  },true);
  cv.addEventListener('pointermove',e=>{if(!P.editing||!P.snap||!e.buttons)return;const l=S.layers.find(l=>l.id===P.editing);if(!l)return;const nearest=(v,c)=>c.find(x=>Math.abs(x-v)<.018)??v;l.x=nearest(l.x,[l.w/2,.5,1-l.w/2]);l.y=nearest(l.y,[l.h/2,.5,1-l.h/2]);invalidate();});
  const end=e=>{
   if(S.exporting)return;if(document.body.dataset.focus==='1'&&typeof setFocus==='function')setFocus(false);const id=P.editing;P.editing=null;
   if(id){const l=S.layers.find(l=>l.id===id);if(l&&(l.keyframes||[]).length)keyframe(l,false);LX.selected=id;S.tab='layers';renderPanel();return;}
   if(e.type==='pointercancel')return;
   const r=cv.getBoundingClientRect(),y=(e.clientY-r.top)/r.height,cap=S.caps.find(c=>S.t>=c.start&&S.t<c.end),text=[...S.texts].reverse().find(x=>S.t>=x.start&&S.t<x.start+x.dur&&Math.abs(y-x.y/100)<.1);
   if(text){S.sel={type:'text',id:text.id};S.tab='text';}else if(cap&&Math.abs(y-S.capStyle.y/100)<.1){S.sel={type:'cap',id:cap.id};S.tab='caps';}else{const c=clipAt(S.t);if(c){S.sel={type:'clip',id:c.id};S.tab='clip';}}
   if(document.body.dataset.focus==='1'&&typeof setFocus==='function')setFocus(false);renderPanel();
  };
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  document.addEventListener('change',e=>{if(e.target.dataset&&props.includes(e.target.dataset.lxK)){const l=lxSelected();if(l&&(l.keyframes||[]).length)Object.assign(l,pick(layerAt(l,S.t)));}},true);
  document.addEventListener('change',e=>{if(e.target.dataset&&props.includes(e.target.dataset.lxK)){const l=lxSelected();if(l&&(l.keyframes||[]).length){keyframe(l,false);invalidate();Promise.resolve().then(()=>renderPanel());}}});
  requestAnimationFrame(frame);if(['layers','music'].includes(S.tab))renderPanel();
 });
 window.FenixPlus={layerAt,keyframe,applyLayout,state:P,paintCard};
})();
