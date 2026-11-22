/* FenixCut V13 — duplicar camadas de fotografia, vídeo e áudio. Loaded after studio-models.js. */
'use strict';
(function(){
 if(typeof LX==='undefined'||typeof lxLoad!=='function'||typeof lxAssetStore!=='function'||typeof lxSelected!=='function'||typeof renderPanel!=='function'){
  window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-tools.js não encontrou o módulo de camadas.';p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;
 }
 const newId=()=>typeof lxId==='function'?lxId():'dup'+Date.now().toString(36)+Math.random().toString(36).slice(2);
 async function duplicateLayer(layer,atPlayhead){
  if(!layer)return toast('Seleciona primeiro uma camada.');
  if(S.exporting||LX.busy||LX.loading)return toast('Aguarda a operação atual.');
  const asset=LX.assets.get(layer.asset);if(!asset)return toast('O ficheiro desta camada não está disponível.',6000);
  LX.busy=true;
  try{
   let assetId=layer.asset;
   if(layer.kind!=='image'){
    assetId=newId();
    const record={id:assetId,name:asset.name,kind:asset.kind,blob:asset.blob,license:asset.license||null};
    await lxLoad(record);await lxAssetStore(record);
   }
   lxCheckpoint();
   const copy=JSON.parse(JSON.stringify(layer));copy.id=newId();copy.asset=assetId;
   if(atPlayhead){
    copy.start=Math.max(0,Math.min(S.t,Math.max(0,S.total-.05)));
    copy.dur=Math.max(.05,Math.min(layer.dur,S.total-copy.start));
   }else if(layer.kind!=='audio'){
    const dx=.06,dy=.06;copy.x=Math.max(-1,Math.min(2,layer.x+dx));copy.y=Math.max(-1,Math.min(2,layer.y+dy));
    if(Array.isArray(copy.keyframes))copy.keyframes=copy.keyframes.map(k=>({...k,...(Number.isFinite(k.x)?{x:Math.max(-1,Math.min(2,k.x+dx))}:{}),...(Number.isFinite(k.y)?{y:Math.max(-1,Math.min(2,k.y+dy))}:{})}));
   }
   const index=S.layers.indexOf(layer);S.layers.splice(index+1,0,copy);LX.selected=copy.id;
   lxChanged();S.tab='layers';renderPanel();
   toast(layer.kind==='image'?'Camada duplicada.':'Camada duplicada. O ficheiro foi guardado de novo para a cópia ter reprodução independente.',5000);
  }catch(e){toast('Não foi possível duplicar: '+e.message,7000);}
  finally{LX.busy=false;}
 }
 const previous=renderPanel;
 renderPanel=function(){
  const result=previous();
  if(S.tab==='layers'){
   const selected=lxSelected(),raise=$('lxRaise');
   if(selected&&raise&&!$('toolsDuplicate')){
    raise.parentElement.insertAdjacentHTML('beforeend','<button class="btn" id="toolsDuplicate" type="button">Duplicar</button><button class="btn" id="toolsDuplicateHere" type="button">Duplicar na agulha</button>');
    $('toolsDuplicate').onclick=()=>duplicateLayer(lxSelected(),false);
    $('toolsDuplicateHere').onclick=()=>duplicateLayer(lxSelected(),true);
   }
  }
  return result;
 };
 if(typeof lxCredits==='function'){
  const original=lxCredits;
  lxCredits=function(){
   const all=S.layers,seen=new Set();
   try{S.layers=all.filter(l=>{if(!l.license)return false;const key=l.license.id||l.license.foreign_landing_url||l.name;if(seen.has(key))return false;seen.add(key);return true;});return original();}
   finally{S.layers=all;}
  };
 }
 window.addEventListener('keydown',event=>{
  const target=event.target,typing=target&&(/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||target.isContentEditable);
  if(typing||!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='d')return;
  const selected=lxSelected();if(!selected)return;event.preventDefault();duplicateLayer(selected,event.shiftKey);
 });
 window.FenixTools={duplicateLayer};
})();
