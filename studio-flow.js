/* FenixCut V14 — duplicar a seguir, dividir, linhas e transições de camadas. Loaded after studio-tools.js. */
'use strict';
(function(){
 if(typeof LX==='undefined'||typeof lxLoad!=='function'||typeof lxAssetStore!=='function'||typeof lxSelected!=='function'||typeof renderPanel!=='function'||typeof renderScene!=='function'){
  window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-flow.js não encontrou o módulo de camadas.';p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;
 }
 const TYPES=[['none','Nenhuma'],['fade','Aparecer'],['zoom','Zoom'],['pop','Pop'],['left','Deslizar da esquerda'],['right','Deslizar da direita'],['up','Deslizar de cima'],['down','Deslizar de baixo'],['spin','Rodar'],['squash','Esticar'],['drop','Cair com salto']];
 const label=Object.fromEntries(TYPES);
 let mode='in';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const smooth=u=>u*u*(3-2*u);
 const back=u=>{const c1=1.70158,c3=c1+1,x=u-1;return 1+c3*x*x*x+c1*x*x;};
 const bounce=u=>{const n=7.5625,d=2.75;if(u<1/d)return n*u*u;if(u<2/d){u-=1.5/d;return n*u*u+.75;}if(u<2.5/d){u-=2.25/d;return n*u*u+.9375;}u-=2.625/d;return n*u*u+.984375;};
 function setting(l,which){const s=l&&l[which];return s&&s.type&&s.type!=='none'?{type:s.type,dur:clamp(Number(s.dur)||.5,.1,Math.max(.1,l.dur/2))}:null;}
 function apply(base,type,k){
  const o={x:base.x,y:base.y,w:base.w,h:base.h,rotation:base.rotation||0,opacity:base.opacity==null?1:base.opacity};
  const e=smooth(clamp(k,0,1));
  if(type==='fade')o.opacity*=e;
  else if(type==='zoom'){const s=.15+.85*e;o.w*=s;o.h*=s;o.opacity*=Math.min(1,e*2);}
  else if(type==='pop'){const s=Math.max(.01,back(clamp(k,0,1)));o.w*=s;o.h*=s;o.opacity*=Math.min(1,k*3);}
  else if(type==='left')o.x=base.x+((-base.w/2-.03)-base.x)*(1-e);
  else if(type==='right')o.x=base.x+((1+base.w/2+.03)-base.x)*(1-e);
  else if(type==='up')o.y=base.y+((-base.h/2-.03)-base.y)*(1-e);
  else if(type==='down')o.y=base.y+((1+base.h/2+.03)-base.y)*(1-e);
  else if(type==='spin'){const s=Math.max(.01,e);o.rotation-=(1-e)*360;o.w*=s;o.h*=s;o.opacity*=Math.min(1,e*2);}
  else if(type==='squash'){o.w*=Math.max(.02,e);o.opacity*=Math.min(1,e*2);}
  else if(type==='drop'){o.y=base.y+((-base.h/2-.03)-base.y)*(1-bounce(clamp(k,0,1)));o.opacity*=Math.min(1,k*4);}
  return o;
 }
 function stateAt(layer,t){
  if(!layer||layer.kind==='audio')return null;
  const input=setting(layer,'trIn'),output=setting(layer,'trOut'),local=t-layer.start,remaining=layer.start+layer.dur-t;
  if(input&&local>=0&&local<input.dur)return apply(layer,input.type,local/input.dur);
  if(output&&remaining>=0&&remaining<output.dur)return apply(layer,output.type,remaining/output.dur);
  return null;
 }
 const renderOriginal=renderScene;
 renderScene=function(r,t,ovr){
  const raw=S.layers;let changed=false;
  const mapped=raw.map(l=>{
   if(l.kind==='audio'||(!l.trIn&&!l.trOut))return l;
   const base=window.FenixPlus&&FenixPlus.layerAt?FenixPlus.layerAt(l,t):l,state=stateAt(base,t);
   if(!state)return l;changed=true;return {...base,...state,keyframes:[]};
  });
  if(!changed)return renderOriginal(r,t,ovr);
  S.layers=mapped;try{return renderOriginal(r,t,ovr);}finally{S.layers=raw;}
 };
 const id=()=>typeof lxId==='function'?lxId():'flow'+Date.now().toString(36)+Math.random().toString(36).slice(2);
 async function cloneAsset(layer){
  const asset=LX.assets.get(layer.asset);if(!asset)throw new Error('O ficheiro desta camada não está disponível.');
  if(layer.kind==='image')return layer.asset;
  const record={id:id(),name:asset.name,kind:asset.kind,blob:asset.blob,license:asset.license||null};
  await lxLoad(record);await lxAssetStore(record);return record.id;
 }
 async function guarded(task){
  if(S.exporting||LX.busy||LX.loading)return toast('Aguarda a operação atual.');
  LX.busy=true;try{await task();}catch(e){toast('Não foi possível concluir: '+e.message,7000);}finally{LX.busy=false;}
 }
 function cloneLayer(layer,assetId){const copy=JSON.parse(JSON.stringify(layer));copy.id=id();copy.asset=assetId;return copy;}
 function lane(layer){layer.lane=layer.lane||layer.id;return layer.lane;}
 function duplicateAfter(layer){
  return guarded(async()=>{
   const start=layer.start+layer.dur,room=S.total-start;
   if(room<.05)return toast('A camada já termina no fim do projeto. As camadas não prolongam o vídeo principal.',7000);
   const assetId=await cloneAsset(layer);lxCheckpoint();
   const copy=cloneLayer(layer,assetId);copy.lane=lane(layer);copy.start=start;copy.dur=Math.min(layer.dur,room);
   S.layers.splice(S.layers.indexOf(layer)+1,0,copy);LX.selected=copy.id;lxChanged();S.tab='layers';renderPanel();
   toast(copy.dur<layer.dur?'Cópia criada a seguir, cortada no fim do projeto.':'Cópia criada a seguir, na mesma linha.',5000);
  });
 }
 function splitLayer(layer){
  return guarded(async()=>{
   const cut=S.t,local=cut-layer.start;
   if(local<=.05||local>=layer.dur-.05)return toast('Coloca a agulha dentro da camada, longe das extremidades.');
   const assetId=await cloneAsset(layer);lxCheckpoint();
   const before=layer.keyframes||[],base=window.FenixPlus&&FenixPlus.layerAt?FenixPlus.layerAt(layer,cut):layer;
   const second=cloneLayer(layer,assetId);second.lane=lane(layer);second.start=cut;second.dur=layer.dur-local;
   if(layer.kind!=='image')second.in=(layer.in||0)+local;
   second.keyframes=before.length?[{t:0,x:base.x,y:base.y,w:base.w,h:base.h,rotation:base.rotation,opacity:base.opacity},...before.filter(k=>k.t>local+.001).map(k=>({...k,t:k.t-local}))]:[];
   layer.keyframes=before.length?[...before.filter(k=>k.t<local-.001),{t:local,x:base.x,y:base.y,w:base.w,h:base.h,rotation:base.rotation,opacity:base.opacity}]:[];
   layer.dur=local;second.trIn=null;layer.trOut=null;
   S.layers.splice(S.layers.indexOf(layer)+1,0,second);LX.selected=second.id;lxChanged();S.tab='layers';renderPanel();toast('Camada dividida na agulha.',4000);
  });
 }
 function currentTransition(layer){return layer&&layer[mode==='in'?'trIn':'trOut']||{type:'none',dur:.5};}
 function transitionHTML(layer){
  const current=currentTransition(layer);
  return `<section class="box flow-transitions"><h3>Transições da camada</h3><p class="hint">Entrada e saída são independentes. Escolhe uma animação e ajusta a duração. Para ligar duas camadas seguidas, põe saída na primeira e entrada na segunda.</p>
  <div class="btnrow"><button type="button" class="btn ${mode==='in'?'primary':''}" data-flow-mode="in">Entrada</button><button type="button" class="btn ${mode==='out'?'primary':''}" data-flow-mode="out">Saída</button></div>
  <div class="fxp-model-grid">${TYPES.map(([key,name])=>`<button type="button" class="fxp-model ${current.type===key?'on':''}" data-flow-type="${key}"><canvas width="220" height="140" data-flow-card="${key}" aria-hidden="true"></canvas><span>${name}</span></button>`).join('')}</div>
  <label class="fld">Duração (s)<input type="number" id="flowDuration" min="0.1" max="${Math.max(.1,layer.dur/2).toFixed(2)}" step="0.05" value="${(current.dur||.5).toFixed(2)}"></label>
  <div class="btnrow"><button type="button" class="btn" id="flowCopyLane">Copiar estas transições para a linha</button></div></section>`;
 }
 function paint(canvas,type,time){
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;ctx.fillStyle='#17131a';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,255,255,.28)';ctx.strokeRect(10.5,10.5,W-21,H-21);
  const phase=time%2.6,layer={kind:'image',start:0,dur:2.6,x:.5,y:.5,w:.42,h:.42,rotation:0,opacity:1,trIn:{type:'none',dur:.8},trOut:{type:'none',dur:.8}};
  layer[phase<1.3?'trIn':'trOut']={type,dur:.8};
  const state=stateAt(layer,phase)||{x:layer.x,y:layer.y,w:layer.w,h:layer.h,rotation:0,opacity:1};
  const inner={x:10,y:10,w:W-20,h:H-20};ctx.save();ctx.beginPath();ctx.rect(inner.x,inner.y,inner.w,inner.h);ctx.clip();ctx.translate(inner.x+state.x*inner.w,inner.y+state.y*inner.h);ctx.rotate(state.rotation*Math.PI/180);ctx.globalAlpha=clamp(state.opacity,0,1);ctx.fillStyle='#e63da0';ctx.fillRect(-state.w*inner.w/2,-state.h*inner.h/2,state.w*inner.w,state.h*inner.h);ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('A',0,6);ctx.restore();
 }
 let last=0;
 function frame(now){
  if(!document.hidden&&!S.exporting&&now-last>100){last=now;const panel=$('panelBody');if(panel){const box=panel.getBoundingClientRect(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;document.querySelectorAll('[data-flow-card]').forEach(c=>{const r=c.getBoundingClientRect();if(r.bottom>=box.top&&r.top<=box.bottom)paint(c,c.dataset.flowCard,reduce?.2:now/1000);});}}
  requestAnimationFrame(frame);
 }
 const previousPanel=renderPanel;
 renderPanel=function(){
  const result=previousPanel();
  if(S.tab!=='layers')return result;
  const selected=lxSelected(),raise=$('lxRaise'),body=$('panelBody');
  if(selected&&raise&&!$('flowAfter')){
   raise.parentElement.insertAdjacentHTML('beforeend','<button class="btn" id="flowAfter" type="button">Duplicar a seguir</button><button class="btn" id="flowSplit" type="button">Dividir na agulha</button>');
   $('flowAfter').onclick=()=>duplicateAfter(lxSelected());$('flowSplit').onclick=()=>splitLayer(lxSelected());
  }
  if(selected&&selected.kind!=='audio'&&body&&!body.querySelector('.flow-transitions')){
   body.insertAdjacentHTML('beforeend',transitionHTML(selected));
   body.querySelectorAll('[data-flow-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.flowMode;renderPanel();});
   body.querySelectorAll('[data-flow-type]').forEach(b=>b.onclick=()=>{
    const layer=lxSelected();if(!layer)return;lxCheckpoint();const key=mode==='in'?'trIn':'trOut',type=b.dataset.flowType;
    layer[key]=type==='none'?null:{type,dur:currentTransition(layer).dur||.5};lxChanged();renderPanel();
    if(type!=='none'){pause();setT(mode==='in'?layer.start:Math.max(layer.start,layer.start+layer.dur-(layer[key].dur||.5)));}
   });
   $('flowDuration').onchange=e=>{const layer=lxSelected();if(!layer)return;const key=mode==='in'?'trIn':'trOut';if(!layer[key]){toast('Escolhe primeiro uma transição.');return;}lxCheckpoint();layer[key].dur=clamp(Number(e.target.value)||.5,.1,Math.max(.1,layer.dur/2));lxChanged();renderPanel();};
   $('flowCopyLane').onclick=()=>{const layer=lxSelected();if(!layer)return;const key=layer.lane||layer.id;lxCheckpoint();S.layers.filter(l=>l.kind!=='audio'&&(l.lane||l.id)===key).forEach(l=>{l.trIn=layer.trIn?{...layer.trIn}:null;l.trOut=layer.trOut?{...layer.trOut}:null;});lxChanged();toast('Transições copiadas para as camadas da mesma linha.');};
  }
  return result;
 };
 const timelineOriginal=renderTimeline;
 renderTimeline=function(){
  const result=timelineOriginal(),host=$('lxTracks');if(!host)return result;
  const rows=new Map();S.layers.forEach((layer,index)=>{const key=layer.lane||layer.id;if(!rows.has(key))rows.set(key,[]);rows.get(key).push([layer,index]);});
  host.innerHTML=[...rows.values()].map(items=>`<div class="lx-track">${items.map(([l,i])=>`<button data-lx-track="${l.id}" style="left:${l.start*S.pps}px;width:${Math.max(10,l.dur*S.pps-2)}px" class="lx-block ${l.id===LX.selected?'on':''}">${l.kind==='audio'?'♫':'▣'} ${i+1}. ${lxEsc(l.name)}${l.trIn||l.trOut?' ⇄':''}</button>`).join('')}</div>`).join('');
  $('tlInner').style.height=(Math.max(108,$('trCaps').offsetTop+$('trCaps').offsetHeight+6)+rows.size*27)+'px';
  return result;
 };
 window.addEventListener('DOMContentLoaded',()=>{requestAnimationFrame(frame);try{renderTimeline();}catch(e){}});
 window.FenixFlow={duplicateAfter,splitLayer,stateAt,paint,TYPES};
})();
