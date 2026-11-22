/* FenixCut V17 — Remover fundo de fotos (no aparelho) e fotos de produto. EXPERIMENTAL. Loaded after studio-lab.js. */
'use strict';
(function(){
 if(typeof S==='undefined'||typeof renderPanel!=='function'||typeof window.FenixLab==='undefined'){
  window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-bg.js precisa do separador Estúdio (studio-lab.js).';p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;
 }
 const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm',MODEL='briaai/RMBG-1.4',MAX_SIDE=2048;
 const B={mode:'cpu',busy:false,source:'file',status:'',lib:null,loaded:null,pad:12,bg:'#ffffff',shadow:true,size:'1080x1080'};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hasLayers=()=>typeof LX!=='undefined'&&typeof lxImport==='function'&&typeof lxSelected==='function';
 const projName=()=>((typeof P!=='undefined'&&P.name)||'fenixcut').replace(/[^\w\-]+/g,'_').slice(0,40);
 const toBlob=(cv,type='image/png')=>new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('Não consegui criar a imagem.')),type));
 function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);}
 const say=m=>{B.status=m;const el=document.getElementById('bgStatus');if(el)el.textContent=m;};

 function fitCanvas(img){
  const iw=img.naturalWidth||img.videoWidth||img.width,ih=img.naturalHeight||img.videoHeight||img.height,k=Math.min(1,MAX_SIDE/Math.max(iw,ih));
  const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(iw*k));cv.height=Math.max(1,Math.round(ih*k));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);return cv;
 }
 function applyMask(source,mask){
  const w=source.width,h=source.height;if(mask.length!==w*h)throw new Error('A máscara não tem o tamanho da imagem.');
  const out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.drawImage(source,0,0);
  const data=ctx.getImageData(0,0,w,h),px=data.data;for(let i=0;i<mask.length;i++)px[i*4+3]=mask[i];ctx.putImageData(data,0,0);return out;
 }
 function trimToContent(cv,threshold=8,margin=0){
  const w=cv.width,h=cv.height,d=cv.getContext('2d').getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>threshold){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return null;x0=Math.max(0,x0-margin);y0=Math.max(0,y0-margin);x1=Math.min(w-1,x1+margin);y1=Math.min(h-1,y1+margin);
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;out.getContext('2d').drawImage(cv,x0,y0,out.width,out.height,0,0,out.width,out.height);return out;
 }
 function productCanvas(cut,o){
  const [W,H]=o.size.split('x').map(Number),cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
  ctx.fillStyle=o.bg;ctx.fillRect(0,0,W,H);
  const trimmed=trimToContent(cut)||cut,pad=clamp(o.pad,0,40)/100,aw=W*(1-2*pad),ah=H*(1-2*pad),k=Math.min(aw/trimmed.width,ah/trimmed.height),dw=trimmed.width*k,dh=trimmed.height*k;
  ctx.save();if(o.shadow){ctx.shadowColor='rgba(0,0,0,.32)';ctx.shadowBlur=W*.035;ctx.shadowOffsetY=W*.022;}
  ctx.drawImage(trimmed,(W-dw)/2,(H-dh)/2,dw,dh);ctx.restore();return cv;
 }

 async function loadBackend(onProgress){
  if(B.loaded&&B.loaded.mode===B.mode)return B.loaded;
  say('A carregar o modelo (só na primeira vez; precisa de internet)…');
  if(!B.lib)B.lib=await import(LIB);
  const T=B.lib;T.env.allowLocalModels=false;
  const options={device:B.mode==='gpu'?'webgpu':'wasm',dtype:B.mode==='gpu'?'fp32':'q8',progress_callback:p=>{if(p&&p.status==='progress'&&onProgress)onProgress(p);}};
  const model=await T.AutoModel.from_pretrained(MODEL,Object.assign({config:{model_type:'custom'}},options));
  const processor=await T.AutoProcessor.from_pretrained(MODEL,{config:{do_normalize:true,do_pad:false,do_rescale:true,do_resize:true,image_mean:[.5,.5,.5],feature_extractor_type:'ImageFeatureExtractor',image_std:[1,1,1],resample:2,rescale_factor:.00392156862745098,size:{width:1024,height:1024}}});
  B.loaded={mode:B.mode,async segment(canvas){
   const blob=await toBlob(canvas),url=URL.createObjectURL(blob);
   try{
    const image=await T.RawImage.fromURL(url),{pixel_values}=await processor(image),{output}=await model({input:pixel_values});
    const mask=await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width,image.height);
    return Uint8ClampedArray.from(mask.data);
   }finally{URL.revokeObjectURL(url);}
  }};
  return B.loaded;
 }
 let customBackend=null;
 async function removeBackground(canvas,onProgress){
  const backend=customBackend||await loadBackend(onProgress);
  say('A recortar a imagem…');const source=fitCanvas(canvas),mask=await backend.segment(source);
  return applyMask(source,mask);
 }

 async function pickImage(){
  return new Promise((res,rej)=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return res(null);const u=URL.createObjectURL(f),im=new Image();im.onload=()=>res({el:im,name:f.name});im.onerror=()=>rej(new Error('Não consegui abrir a imagem.'));im.src=u;};i.click();});
 }
 async function getSource(){
  if(B.source==='layer'){
   const l=hasLayers()?lxSelected():null;if(!l||l.kind!=='image')throw new Error('Seleciona primeiro uma camada de foto.');
   const a=LX.assets.get(l.asset);if(!a||!a.el)throw new Error('Não encontro a foto desta camada.');return {el:a.el,layer:l,name:l.name};
  }
  if(B.source==='frame'){const cv=await FenixLab.captureFrame();return {el:cv,name:'frame'};}
  const f=await pickImage();if(!f)return null;return f;
 }
 function checker(){const c=document.createElement('canvas');c.width=c.height=24;const x=c.getContext('2d');x.fillStyle='#bbb';x.fillRect(0,0,24,24);x.fillStyle='#fff';x.fillRect(0,0,12,12);x.fillRect(12,12,12,12);return c;}
 function showResult(cut,info){
  const old=document.getElementById('labModal');if(old)old.remove();
  const m=document.createElement('div');m.id='labModal';m.className='lab-modal';
  m.innerHTML=`<div class="lab-head"><strong>Fundo removido</strong><button type="button" class="btn" id="bgClose">Fechar</button></div><div class="lab-body"><canvas id="bgView" class="lab-cv"></canvas><div class="lab-ctl">
   <div class="btnrow"><button class="btn primary" id="bgSave">Descarregar PNG</button>${hasLayers()&&S.clips.length?'<button class="btn" id="bgLayer">Usar como camada</button>':''}</div>
   <div class="box"><h3>Foto de produto</h3><div class="row2"><label class="fld">Formato<select id="bgSize">${[['1080x1080','1:1 · 1080'],['1080x1350','4:5 · 1080×1350'],['1080x1920','9:16 · 1080×1920'],['1920x1080','16:9 · 1920×1080']].map(([v,n])=>`<option value="${v}" ${B.size===v?'selected':''}>${n}</option>`).join('')}</select></label><label class="fld">Cor de fundo<input type="color" id="bgColor" value="${B.bg}"></label></div>
   <label class="rg"><span>Margem <b id="bgPadOut">${B.pad} %</b></span><input type="range" id="bgPad" min="0" max="40" step="1" value="${B.pad}"></label>
   <div class="checks"><label class="chk"><input type="checkbox" id="bgShadow" ${B.shadow?'checked':''}> Sombra suave</label></div>
   <div class="btnrow"><button class="btn primary" id="bgProduct">Descarregar foto de produto</button></div></div></div></div>`;
  document.body.appendChild(m);
  const view=m.querySelector('#bgView');
  const draw=()=>{const t=trimToContent(cut)||cut,s=Math.min(1,520/t.width);view.width=Math.round(t.width*s);view.height=Math.round(t.height*s);const x=view.getContext('2d');x.fillStyle=x.createPattern(checker(),'repeat');x.fillRect(0,0,view.width,view.height);x.drawImage(t,0,0,view.width,view.height);};
  draw();
  m.querySelector('#bgClose').onclick=()=>m.remove();
  m.querySelector('#bgSave').onclick=async()=>save(await toBlob(trimToContent(cut)||cut),projName()+'-sem-fundo.png');
  const layerBtn=m.querySelector('#bgLayer');
  if(layerBtn)layerBtn.onclick=async()=>{try{
   const png=await toBlob(cut),l=await lxImport(new File([png],projName()+'-sem-fundo.png',{type:'image/png'}));
   if(info&&info.layer){const o=info.layer;Object.assign(l,{x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,opacity:o.opacity,fit:o.fit,start:o.start,dur:o.dur});}
   lxChanged();m.remove();S.tab='layers';renderPanel();toast('Camada sem fundo adicionada. A original continua no projeto.',6000);
  }catch(e){toast(e.message,6000);}};
  m.querySelector('#bgSize').onchange=e=>{B.size=e.target.value;};m.querySelector('#bgColor').oninput=e=>{B.bg=e.target.value;};
  m.querySelector('#bgPad').oninput=e=>{B.pad=+e.target.value;m.querySelector('#bgPadOut').textContent=B.pad+' %';};m.querySelector('#bgShadow').onchange=e=>{B.shadow=e.target.checked;};
  m.querySelector('#bgProduct').onclick=async()=>{try{save(await toBlob(productCanvas(cut,B)),projName()+'-produto.png');}catch(e){toast(e.message,6000);}};
 }
 async function run(){
  if(B.busy)return;
  try{
   B.busy=true;const src=await getSource();if(!src){B.busy=false;return;}
   const result=await removeBackground(src.el,p=>say('A descarregar o modelo: '+Math.round(p.progress||0)+' %'));
   say('Pronto.');showResult(result,src);
  }catch(e){
   const net=/fetch|network|import|Failed|load/i.test(e.message||'');
   say(net?'Não consegui carregar o modelo. Confirma a ligação à internet e tenta outra vez.':(e.message||'Falhou.'));toast(B.status,8000);console.error(e);
  }finally{B.busy=false;}
 }
 function boxHTML(){
  const layerOk=hasLayers()&&(()=>{const l=lxSelected();return l&&l.kind==='image';})();
  return `<div class="box lab-card" id="bgBox"><h3>Remover fundo (experimental)</h3><p class="hint">Recorta o fundo de uma foto com um modelo que corre no telemóvel. A primeira vez descarrega o modelo (cerca de 44 MB no modo leve, cerca de 170 MB no modo rápido); depois fica guardado. Precisa de internet só nessa altura. Fotos grandes são reduzidas para 2048 px.</p>
   <label class="fld">Imagem<select id="bgSource"><option value="file" ${B.source==='file'?'selected':''}>Escolher uma foto</option><option value="frame" ${B.source==='frame'?'selected':''}>Frame do vídeo na agulha</option>${layerOk?`<option value="layer" ${B.source==='layer'?'selected':''}>Camada de foto selecionada</option>`:''}</select></label>
   <label class="fld">Modo<select id="bgMode"><option value="cpu" ${B.mode==='cpu'?'selected':''}>Leve (processador, mais compatível)</option><option value="gpu" ${B.mode==='gpu'?'selected':''}>Rápido (WebGPU, descarrega mais)</option></select></label>
   <div class="btnrow"><button class="btn primary" id="bgRun">Remover fundo</button></div><p class="hint" id="bgStatus">${B.status||''}</p><p class="hint">Vídeo com fundo removido, aumentar resolução e retoque de rosto ainda não existem.</p></div>`;
 }
 const previous=renderPanel;
 renderPanel=function(){
  const result=previous();
  if(S.tab!=='studio')return result;
  const body=$('panelBody');if(!body||body.querySelector('#bgBox'))return result;
  const holder=document.createElement('div');holder.innerHTML=boxHTML();const box=holder.firstElementChild,notes=[...body.querySelectorAll('.box')].pop();
  if(notes)body.insertBefore(box,notes);else body.appendChild(box);
  box.querySelector('#bgSource').onchange=e=>{B.source=e.target.value;};box.querySelector('#bgMode').onchange=e=>{B.mode=e.target.value;B.loaded=null;};
  box.querySelector('#bgRun').onclick=run;return result;
 };
 window.FenixBg={applyMask,trimToContent,productCanvas,fitCanvas,removeBackground,setBackend:b=>{customBackend=b;},state:B};
})();
