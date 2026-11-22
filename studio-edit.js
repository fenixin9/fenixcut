/* FenixCut V15 — editor completo da camada: velocidade, recorte, espelhar, cor, estilo e mistura. Loaded after studio-flow.js. */
'use strict';
(function(){
 const ready=typeof LX!=='undefined'&&typeof lxDrawBox==='function'&&typeof lxTime==='function'&&typeof lxSync==='function'&&typeof lxActive==='function'&&typeof lxSelected==='function'&&typeof renderScene==='function'&&typeof renderPanel==='function'&&typeof mixAudio==='function'&&typeof lxAudio==='function'&&typeof lxCheckpoint==='function'&&typeof lxChanged==='function';
 if(!ready){window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-edit.js não encontrou o módulo de camadas.';p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;}
 const DEF={flipH:0,flipV:0,cropL:0,cropT:0,cropR:0,cropB:0,bright:1,contrast:1,sat:1,hue:0,blur:0,gray:0,sepia:0,invert:0,radius:0,borderW:0,borderColor:'#ffffff',blend:'source-over',speed:1};
 const COLOR_KEYS=['bright','contrast','sat','hue','blur','gray','sepia','invert'];
 const BLENDS=[['source-over','Normal'],['multiply','Multiplicar'],['screen','Ecrã (clarear)'],['overlay','Sobrepor'],['soft-light','Luz suave'],['hard-light','Luz forte'],['darken','Escurecer'],['lighten','Clarear'],['color-dodge','Subexpor'],['difference','Diferença']];
 const PRESETS=[['Original',{}],['Vivo',{sat:1.45,contrast:1.1}],['Preto e branco',{gray:1,contrast:1.1}],['Sépia',{sepia:1}],['Frio',{hue:-12,sat:1.1,bright:1.02}],['Quente',{hue:10,sat:1.15,bright:1.03}],['Dramático',{contrast:1.35,sat:.85,bright:.95}],['Desbotado',{contrast:.85,bright:1.08,sat:.8}]];
 const SLIDERS={
  transform:[['cropL','Cortar à esquerda',0,.8,.01],['cropR','Cortar à direita',0,.8,.01],['cropT','Cortar em cima',0,.8,.01],['cropB','Cortar em baixo',0,.8,.01]],
  color:[['bright','Brilho',0,2,.01],['contrast','Contraste',0,2,.01],['sat','Saturação',0,3,.01],['hue','Matiz',-180,180,1],['blur','Desfoque',0,20,.5],['gray','Preto e branco',0,1,.01],['sepia','Sépia',0,1,.01],['invert','Negativo',0,1,.01]],
  style:[['radius','Cantos arredondados',0,50,1],['borderW','Contorno',0,40,1]]
 };
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const val=(l,k)=>l[k]==null?DEF[k]:l[k];
 const canFilter=(()=>{try{const c=document.createElement('canvas').getContext('2d');return !!c&&'filter' in c;}catch(e){return false;}})();
 const colorActive=l=>COLOR_KEYS.some(k=>Math.abs(val(l,k)-DEF[k])>.0005);
 const cropActive=l=>['cropL','cropT','cropR','cropB'].some(k=>val(l,k)>.0005);
 const needsCustom=l=>!!(l.flipH||l.flipV||cropActive(l)||colorActive(l)||val(l,'radius')>0||val(l,'borderW')>0||val(l,'blend')!=='source-over'||(l.mask&&l.mask!=='none'));
 function filterString(l,scale){
  const parts=[];
  if(val(l,'bright')!==1)parts.push(`brightness(${val(l,'bright')})`);
  if(val(l,'contrast')!==1)parts.push(`contrast(${val(l,'contrast')})`);
  if(val(l,'sat')!==1)parts.push(`saturate(${val(l,'sat')})`);
  if(val(l,'hue')!==0)parts.push(`hue-rotate(${val(l,'hue')}deg)`);
  if(val(l,'blur')>0)parts.push(`blur(${(val(l,'blur')*scale).toFixed(2)}px)`);
  if(val(l,'gray')>0)parts.push(`grayscale(${val(l,'gray')})`);
  if(val(l,'sepia')>0)parts.push(`sepia(${val(l,'sepia')})`);
  if(val(l,'invert')>0)parts.push(`invert(${val(l,'invert')})`);
  return parts.join(' ');
 }
 function roundedPath(p,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath();}
 function shapePath(l,x,y,w,h){
  const p=new Path2D(),radius=val(l,'radius');
  if(l.mask==='circle'){p.arc(x+w/2,y+h/2,Math.min(w,h)/2,0,Math.PI*2);return p;}
  if(l.mask==='ellipse'){p.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);return p;}
  if(radius>0){roundedPath(p,x,y,w,h,Math.min(w,h)*radius/100);return p;}
  if(l.mask==='rounded'){roundedPath(p,x,y,w,h,Math.min(w,h)*.12);return p;}
  p.rect(x,y,w,h);return p;
 }
 function drawLayer(ctx,img,x,y,w,h,fit,l){
  const iw=img.videoWidth||img.naturalWidth||img.width,ih=img.videoHeight||img.naturalHeight||img.height;if(!iw||!ih)return;
  const cl=clamp(val(l,'cropL'),0,.9),ct=clamp(val(l,'cropT'),0,.9),cr=Math.min(clamp(val(l,'cropR'),0,.9),.95-cl),cb=Math.min(clamp(val(l,'cropB'),0,.9),.95-ct);
  const sx=iw*cl,sy=ih*ct,sw=iw*(1-cl-cr),sh=ih*(1-ct-cb),scaleRes=ctx.canvas.width/1080;
  ctx.save();
  const blend=val(l,'blend');if(blend!=='source-over')ctx.globalCompositeOperation=blend;
  if(canFilter){const f=filterString(l,scaleRes);if(f)ctx.filter=f;}
  const path=shapePath(l,x,y,w,h);ctx.clip(path);
  if(l.flipH||l.flipV){ctx.translate(x+w/2,y+h/2);ctx.scale(l.flipH?-1:1,l.flipV?-1:1);ctx.translate(-(x+w/2),-(y+h/2));}
  if(fit==='cover'){const k=Math.max(w/sw,h/sh),vw=w/k,vh=h/k;ctx.drawImage(img,sx+(sw-vw)/2,sy+(sh-vh)/2,vw,vh,x,y,w,h);}
  else{const k=Math.min(w/sw,h/sh),dw=sw*k,dh=sh*k;ctx.drawImage(img,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
  ctx.restore();
  const border=val(l,'borderW');
  if(border>0){ctx.save();ctx.clip(path);ctx.lineWidth=border*2*scaleRes;ctx.strokeStyle=val(l,'borderColor');ctx.stroke(path);ctx.restore();}
 }
 let queue=null,cursor=0;
 const boxPrevious=lxDrawBox;
 lxDrawBox=function(ctx,img,x,y,w,h,fit){
  let l=queue?queue[cursor++]:null;
  if(l){const a=LX.assets.get(l.asset);if(!a||a.el!==img)l=null;}
  if(!l||!needsCustom(l))return boxPrevious(ctx,img,x,y,w,h,fit);
  return drawLayer(ctx,img,x,y,w,h,fit,l);
 };
 const speedOf=l=>clamp(Number(l&&l.speed)||1,.25,4);
 const timePrevious=lxTime;
 lxTime=function(l,t){
  if(speedOf(l)===1)return timePrevious(l,t);
  const a=LX.assets.get(l.asset);return Math.min(Math.max(0,(a&&a.duration||Infinity)-.002),(l.in||0)+Math.max(0,t-l.start)*speedOf(l));
 };
 function applyRates(t){
  for(const l of S.layers){if(l.kind==='image')continue;const a=LX.assets.get(l.asset);if(!a||!a.el||!lxActive(l,t))continue;const rate=speedOf(l);if(a.el.playbackRate!==rate)a.el.playbackRate=rate;if('preservesPitch' in a.el)a.el.preservesPitch=false;}
 }
 const syncPrevious=lxSync;
 lxSync=function(t,playing,audible){const result=syncPrevious(t,playing,audible);applyRates(t);return result;};
 const renderPrevious=renderScene;
 renderScene=function(r,t,ovr){
  const raw=S.layers;
  queue=raw.filter(l=>{if(l.kind==='audio'||!lxActive(l,t))return false;const a=LX.assets.get(l.asset);return !!a&&!(a.kind==='video'&&a.el.readyState<2);});cursor=0;
  applyRates(t);
  try{return renderPrevious(r,t,ovr);}finally{queue=null;}
 };
 const mixPrevious=mixAudio;
 mixAudio=async function(sampleRate,channels){
  const changed=LX.exporting?S.layers.filter(l=>l.kind!=='image'&&speedOf(l)!==1&&l.vol>0&&l.start<S.total):[];
  if(!changed.length)return mixPrevious(sampleRate,channels);
  const volumes=changed.map(l=>l.vol);changed.forEach(l=>{l.vol=0;});
  let base;try{base=await mixPrevious(sampleRate,channels);}finally{changed.forEach((l,i)=>{l.vol=volumes[i];});}
  const off=new OfflineAudioContext(channels,Math.max(1,Math.ceil(S.total*sampleRate)),sampleRate);
  if(base){const b=off.createBufferSource();b.buffer=base;b.connect(off.destination);b.start(0);}
  for(const l of changed){
   const a=LX.assets.get(l.asset);if(!a)throw new Error('Falta o áudio '+l.name);
   const buffer=await lxAudio(a),rate=speedOf(l),source=off.createBufferSource(),gain=off.createGain();
   source.buffer=buffer;source.playbackRate.value=rate;source.connect(gain);gain.connect(off.destination);
   const sourceSpan=Math.min(l.dur*rate,(S.total-l.start)*rate,buffer.duration-(l.in||0));if(sourceSpan<=0)continue;
   const wall=sourceSpan/rate,fi=Math.min(l.fadeIn||0,wall/2),fo=Math.min(l.fadeOut||0,wall/2);
   gain.gain.setValueAtTime(fi?0:l.vol,l.start);if(fi)gain.gain.linearRampToValueAtTime(l.vol,l.start+fi);
   if(fo){gain.gain.setValueAtTime(l.vol,l.start+wall-fo);gain.gain.linearRampToValueAtTime(0,l.start+wall);}
   source.start(l.start,l.in||0,sourceSpan);
  }
  return off.startRendering();
 };
 const pct=v=>Math.round(v*100)+' %';
 function format(k,v){if(k==='speed')return Number(v).toFixed(2)+'×';if(k==='hue')return Math.round(v)+'°';if(k==='blur'||k==='borderW')return v+' px';if(k==='radius')return Math.round(v)+' %';return pct(v);}
 function slider(l,[k,label,min,max,step]){const v=val(l,k);return `<label class="rg"><span>${label} <b data-ed-out="${k}">${format(k,v)}</b></span><input type="range" data-ed-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;}
 function editorHTML(l){
  const visual=l.kind!=='audio',timed=l.kind!=='image';
  const speed=timed?`<h4>Velocidade</h4>${slider(l,['speed','Velocidade',.25,4,.05])}<p class="hint">A duração na timeline mantém-se; ao acelerar, a camada consome mais do ficheiro original. O tom do som acompanha a velocidade, tanto na pré-visualização como na exportação.</p>`:'';
  if(!visual)return `<section class="box ed-box" data-ed="1"><h3>Editor da camada</h3>${speed}<div class="btnrow"><button type="button" class="btn" id="edReset">Repor edição</button></div></section>`;
  return `<section class="box ed-box" data-ed="1"><h3>Editor completo da camada</h3>
  ${speed}
  <h4>Posição e enquadramento</h4>
  <div class="btnrow"><button type="button" class="btn" id="edCenter">Centrar</button><button type="button" class="btn" id="edFill">Ecrã inteiro</button><button type="button" class="btn" id="edAspect">Repor proporção</button></div>
  <div class="checks"><label class="chk"><input type="checkbox" data-ed-k="flipH" ${l.flipH?'checked':''}> Espelhar na horizontal</label><label class="chk"><input type="checkbox" data-ed-k="flipV" ${l.flipV?'checked':''}> Espelhar na vertical</label></div>
  ${SLIDERS.transform.map(s=>slider(l,s)).join('')}
  <h4>Cor e efeitos</h4>
  ${canFilter?'':'<p class="hint">Este navegador não suporta filtros de cor na tela, por isso estes controlos não terão efeito aqui.</p>'}
  <div class="btnrow">${PRESETS.map(([name],i)=>`<button type="button" class="btn" data-ed-preset="${i}">${name}</button>`).join('')}</div>
  ${SLIDERS.color.map(s=>slider(l,s)).join('')}
  <h4>Estilo</h4>
  ${SLIDERS.style.map(s=>slider(l,s)).join('')}
  <div class="row2"><label class="fld">Cor do contorno<input type="color" data-ed-k="borderColor" value="${val(l,'borderColor')}"></label><label class="fld">Mistura com o fundo<select data-ed-k="blend">${BLENDS.map(([v,n])=>`<option value="${v}" ${val(l,'blend')===v?'selected':''}>${n}</option>`).join('')}</select></label></div>
  <div class="btnrow"><button type="button" class="btn" id="edReset">Repor edição</button></div></section>`;
 }
 function sourceAspect(l){
  const a=LX.assets.get(l.asset);if(!a||!a.w||!a.h)return null;
  const cropped=(a.w*(1-val(l,'cropL')-val(l,'cropR')))/(a.h*(1-val(l,'cropT')-val(l,'cropB')));return cropped>0?cropped:null;
 }
 function bind(box,layer){
  let marked=false;
  const mark=()=>{if(!marked){lxCheckpoint();marked=true;}};
  const current=()=>lxSelected()||layer;
  box.addEventListener('input',e=>{
   const el=e.target,k=el.dataset&&el.dataset.edK;if(!k||el.type==='checkbox'||el.tagName==='SELECT'||el.type==='color')return;
   mark();const l=current();l[k]=Number(el.value);const out=box.querySelector(`[data-ed-out="${k}"]`);if(out)out.textContent=format(k,l[k]);invalidate();
  });
  box.addEventListener('change',e=>{
   const el=e.target,k=el.dataset&&el.dataset.edK;if(!k)return;const l=current();mark();
   if(el.type==='checkbox')l[k]=el.checked?1:0;else if(el.type==='color'||el.tagName==='SELECT')l[k]=el.value;else l[k]=Number(el.value);
   if(k==='speed'){const a=LX.assets.get(l.asset);if(a&&a.kind!=='image'&&Number.isFinite(a.duration)){l.dur=Math.max(.05,Math.min(l.dur,(a.duration-(l.in||0))/speedOf(l)));}}
   marked=false;lxChanged();if(k==='speed')renderPanel();
  });
  const act=(id,fn)=>{const b=box.querySelector('#'+id);if(b)b.onclick=()=>{const l=current();lxCheckpoint();fn(l);lxChanged();renderPanel();};};
  act('edCenter',l=>{l.x=.5;l.y=.5;if(l.keyframes)l.keyframes=[];});
  act('edFill',l=>{Object.assign(l,{x:.5,y:.5,w:1,h:1,rotation:0,fit:'cover'});l.keyframes=[];});
  act('edAspect',l=>{const asp=sourceAspect(l);if(!asp)return toast('Não consegui ler as dimensões do original.');l.h=Math.min(3,Math.max(.01,l.w*(S.ratio[0]/S.ratio[1])/asp));l.keyframes=[];});
  act('edReset',l=>{Object.keys(DEF).forEach(k=>{delete l[k];});});
  box.querySelectorAll('[data-ed-preset]').forEach(b=>b.onclick=()=>{const l=current();lxCheckpoint();COLOR_KEYS.forEach(k=>{delete l[k];});Object.assign(l,PRESETS[+b.dataset.edPreset][1]);lxChanged();renderPanel();});
 }
 const panelPrevious=renderPanel;
 renderPanel=function(){
  const result=panelPrevious();
  if(S.tab!=='layers')return result;
  const l=lxSelected(),body=$('panelBody');
  if(!l||!body||body.querySelector('[data-ed]'))return result;
  const holder=document.createElement('div');holder.innerHTML=editorHTML(l);const box=holder.firstElementChild;
  const anchor=body.querySelector('.flow-transitions');if(anchor)body.insertBefore(box,anchor);else body.appendChild(box);
  bind(box,l);return result;
 };
 window.FenixEdit={needsCustom,drawLayer,filterString,speedOf,DEF,canFilter};
})();
