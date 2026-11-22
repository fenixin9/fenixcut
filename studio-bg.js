/* FenixCut V19 — Remover fundo: assistente com modelo no aparelho + modo sem IA (fundo liso e varinha), pincel e fundos. Loaded after studio-lab.js. */
'use strict';
(function(){
 if(typeof S==='undefined'||typeof renderPanel!=='function'||typeof window.FenixLab==='undefined'){
  window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-bg.js precisa do separador Estúdio (studio-lab.js).';p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;
 }
 const nativeClick=HTMLInputElement.prototype.click;
 HTMLInputElement.prototype.click=function(){
  if(this.type==='file'&&!this.isConnected){
   this.style.cssText+=';position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';document.body.appendChild(this);
   const drop=()=>setTimeout(()=>{if(this.isConnected)this.remove();},60000);this.addEventListener('change',drop,{once:true});this.addEventListener('cancel',()=>setTimeout(()=>{if(this.isConnected)this.remove();},500),{once:true});
  }
  return nativeClick.call(this);
 };
 const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1',MAX_SRC=2048,MAX_MASK=1024;
 const MODELS={
  general:{id:'briaai/RMBG-1.4',cfg:{config:{model_type:'custom'}},proc:{config:{do_normalize:true,do_pad:false,do_rescale:true,do_resize:true,image_mean:[.5,.5,.5],feature_extractor_type:'ImageFeatureExtractor',image_std:[1,1,1],resample:2,rescale_factor:.00392156862745098,size:{width:1024,height:1024}}}},
  people:{id:'Xenova/modnet',cfg:{},proc:{}}
 };
 const B={model:'people',quality:'light',lib:null,backends:{},log:[],bg:{mode:'transparent',color:'#ffffff',blur:14,size:'1080x1080',pad:12,shadow:true}};
 let customBackend=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hasLayers=()=>typeof LX!=='undefined'&&typeof lxImport==='function'&&typeof lxSelected==='function';
 const projName=()=>((typeof P!=='undefined'&&P.name)||'fenixcut').replace(/[^\w\-]+/g,'_').slice(0,40);
 const toBlob=(cv,type='image/png')=>new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('Não consegui criar a imagem.')),type));
 const dlog=m=>{B.log.push(new Date().toISOString().slice(11,19)+' '+m);if(B.log.length>60)B.log.shift();};
 const withTimeout=(p,ms,msg)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error(msg)),ms);p.then(v=>{clearTimeout(t);res(v);},e=>{clearTimeout(t);rej(e);});});
 function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);}
 const canFilter=(()=>{try{return 'filter' in document.createElement('canvas').getContext('2d');}catch(e){return false;}})();

 /* ---------- máscara: funções puras ---------- */
 function morph(a,w,h,r,dilate){
  if(!r)return a;const tmp=new Uint8ClampedArray(a.length),out=new Uint8ClampedArray(a.length);
  for(let y=0;y<h;y++){const row=y*w;for(let x=0;x<w;x++){let v=dilate?0:255;const x0=Math.max(0,x-r),x1=Math.min(w-1,x+r);for(let k=x0;k<=x1;k++){const p=a[row+k];if(dilate?p>v:p<v)v=p;}tmp[row+x]=v;}}
  for(let x=0;x<w;x++){for(let y=0;y<h;y++){let v=dilate?0:255;const y0=Math.max(0,y-r),y1=Math.min(h-1,y+r);for(let k=y0;k<=y1;k++){const p=tmp[k*w+x];if(dilate?p>v:p<v)v=p;}out[y*w+x]=v;}}
  return out;
 }
 function boxBlur(a,w,h,r){
  if(!r)return a;const tmp=new Float32Array(a.length),out=new Uint8ClampedArray(a.length),n=2*r+1;
  for(let y=0;y<h;y++){let s=0;const row=y*w;for(let k=-r;k<=r;k++)s+=a[row+clamp(k,0,w-1)];for(let x=0;x<w;x++){tmp[row+x]=s/n;s+=a[row+Math.min(w-1,x+r+1)]-a[row+Math.max(0,x-r)];}}
  for(let x=0;x<w;x++){let s=0;for(let k=-r;k<=r;k++)s+=tmp[clamp(k,0,h-1)*w+x];for(let y=0;y<h;y++){out[y*w+x]=Math.round(s/n);s+=tmp[Math.min(h-1,y+r+1)*w+x]-tmp[Math.max(0,y-r)*w+x];}}
  return out;
 }
 function removeSmall(a,w,h,minArea){
  const n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n);
  for(let s=0;s<n;s++){
   if(seen[s])continue;const fg=a[s]>=128;let head=0,tail=0,touches=false;queue[tail++]=s;seen[s]=1;
   while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w;if(x===0||y===0||x===w-1||y===h-1)touches=true;
    if(x>0){const q=p-1;if(!seen[q]&&(a[q]>=128)===fg){seen[q]=1;queue[tail++]=q;}}
    if(x<w-1){const q=p+1;if(!seen[q]&&(a[q]>=128)===fg){seen[q]=1;queue[tail++]=q;}}
    if(y>0){const q=p-w;if(!seen[q]&&(a[q]>=128)===fg){seen[q]=1;queue[tail++]=q;}}
    if(y<h-1){const q=p+w;if(!seen[q]&&(a[q]>=128)===fg){seen[q]=1;queue[tail++]=q;}}}
   if(tail<minArea&&(fg||!touches)){const v=fg?0:255;for(let i=0;i<tail;i++)a[queue[i]]=v;}
  }
  return a;
 }
 function refine(raw,w,h,p){
  const out=new Uint8ClampedArray(w*h),lo=clamp(p.cut-p.soft,0,.98)*255,hi=Math.max(lo+1,clamp(p.cut+p.soft,.02,1)*255);
  for(let i=0;i<out.length;i++){let v=p.invert?255-raw[i]:raw[i];let t=clamp((v-lo)/(hi-lo),0,1);out[i]=Math.round(t*t*(3-2*t)*255);}
  let a=out;if(p.clean)a=removeSmall(a,w,h,Math.max(30,Math.round(w*h*.0015)));
  if(p.grow>0)a=morph(a,w,h,Math.round(p.grow),true);else if(p.grow<0)a=morph(a,w,h,Math.round(-p.grow),false);
  if(p.feather>0)a=boxBlur(a,w,h,Math.round(p.feather));
  return a;
 }
 function combine(auto,erase,keep,out){
  for(let i=0;i<auto.length;i++){const a1=auto[i]*(1-erase[i]);out[i]=a1+(255-a1)*keep[i];}return out;
 }
 const dist2=(d,i,r,g,b)=>{const dr=d[i*4]-r,dg=d[i*4+1]-g,db=d[i*4+2]-b;return dr*dr+dg*dg+db*db;};
 function floodRegion(data,w,h,sx,sy,tol){
  sx=clamp(Math.round(sx),0,w-1);sy=clamp(Math.round(sy),0,h-1);
  let r=0,g=0,b=0,n=0;for(let y=Math.max(0,sy-1);y<=Math.min(h-1,sy+1);y++)for(let x=Math.max(0,sx-1);x<=Math.min(w-1,sx+1);x++){const i=y*w+x;r+=data[i*4];g+=data[i*4+1];b+=data[i*4+2];n++;}
  r/=n;g/=n;b/=n;const t2=tol*tol,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;const s=sy*w+sx;queue[tail++]=s;seen[s]=1;
  while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w;
   const tryAdd=q=>{if(!seen[q]&&dist2(data,q,r,g,b)<=t2){seen[q]=1;queue[tail++]=q;}};
   if(x>0)tryAdd(p-1);if(x<w-1)tryAdd(p+1);if(y>0)tryAdd(p-w);if(y<h-1)tryAdd(p+w);}
  return queue.slice(0,tail);
 }
 function borderBackgroundMask(data,w,h,tol){
  const rs=[],gs=[],bs=[];const push=i=>{rs.push(data[i*4]);gs.push(data[i*4+1]);bs.push(data[i*4+2]);};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  const med=a=>a.slice().sort((p,q)=>p-q)[a.length>>1],r=med(rs),g=med(gs),b=med(bs),t2=tol*tol,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const seed=i=>{if(!seen[i]&&dist2(data,i,r,g,b)<=t2){seen[i]=1;queue[tail++]=i;}};
  for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
  while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w;if(x>0)seed(p-1);if(x<w-1)seed(p+1);if(y>0)seed(p-w);if(y<h-1)seed(p+w);}
  const out=new Uint8ClampedArray(w*h);for(let i=0;i<out.length;i++)out[i]=seen[i]?0:255;return out;
 }
 function stamp(E,x,y,r,mode){
  const {w,h}=E,x0=Math.max(0,Math.floor(x-r)),x1=Math.min(w-1,Math.ceil(x+r)),y0=Math.max(0,Math.floor(y-r)),y1=Math.min(h-1,Math.ceil(y+r));
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){
   const d=Math.hypot(i-x,j-y);if(d>r)continue;const s=d<=r*.6?1:1-(d-r*.6)/(r*.4),k=j*w+i;
   if(mode==='erase'){E.erase[k]=Math.max(E.erase[k],s);E.keep[k]=Math.min(E.keep[k],1-s);}
   else{E.keep[k]=Math.max(E.keep[k],s);E.erase[k]=Math.min(E.erase[k],1-s);}
  }
 }
 function applyRegion(E,idx,mode){for(let i=0;i<idx.length;i++){const k=idx[i];if(mode==='erase'){E.erase[k]=1;E.keep[k]=0;}else{E.keep[k]=1;E.erase[k]=0;}}}
 function replay(E){E.erase.fill(0);E.keep.fill(0);for(const stroke of E.strokes)for(const s of stroke){if(s[0]==='R')applyRegion(E,s[1],s[2]);else stamp(E,s[0],s[1],s[2],s[3]);}}
 function fitCanvas(img,max){
  const iw=img.naturalWidth||img.videoWidth||img.width,ih=img.naturalHeight||img.videoHeight||img.height,k=Math.min(1,max/Math.max(iw,ih));
  const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(iw*k));cv.height=Math.max(1,Math.round(ih*k));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);return cv;
 }
 function cutFrom(srcCanvas,alpha,aw,ah){
  const w=srcCanvas.width,h=srcCanvas.height,out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.drawImage(srcCanvas,0,0);
  let a=alpha;
  if(aw!==w||ah!==h){
   const m=document.createElement('canvas');m.width=aw;m.height=ah;const mc=m.getContext('2d'),md=mc.createImageData(aw,ah);
   for(let i=0;i<alpha.length;i++){const v=alpha[i];md.data[i*4]=v;md.data[i*4+1]=v;md.data[i*4+2]=v;md.data[i*4+3]=255;}mc.putImageData(md,0,0);
   const big=document.createElement('canvas');big.width=w;big.height=h;const bc=big.getContext('2d');bc.imageSmoothingEnabled=true;bc.imageSmoothingQuality='high';bc.drawImage(m,0,0,w,h);
   const bd=bc.getImageData(0,0,w,h).data;a=new Uint8ClampedArray(w*h);for(let i=0;i<a.length;i++)a[i]=bd[i*4];
  }
  const data=ctx.getImageData(0,0,w,h),px=data.data;for(let i=0;i<a.length;i++)px[i*4+3]=a[i];ctx.putImageData(data,0,0);return out;
 }
 function trimToContent(cv,threshold=8){
  const w=cv.width,h=cv.height,d=cv.getContext('2d').getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>threshold){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return null;const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;out.getContext('2d').drawImage(cv,x0,y0,out.width,out.height,0,0,out.width,out.height);return out;
 }
 function productCanvas(cut,o,scale=1){
  const [W0,H0]=o.size.split('x').map(Number),W=Math.round(W0*scale),H=Math.round(H0*scale),cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
  ctx.fillStyle=o.color;ctx.fillRect(0,0,W,H);
  const t=trimToContent(cut)||cut,pad=clamp(o.pad,0,40)/100,k=Math.min(W*(1-2*pad)/t.width,H*(1-2*pad)/t.height),dw=t.width*k,dh=t.height*k;
  ctx.save();if(o.shadow){ctx.shadowColor='rgba(0,0,0,.32)';ctx.shadowBlur=W*.035;ctx.shadowOffsetY=W*.022;}ctx.drawImage(t,(W-dw)/2,(H-dh)/2,dw,dh);ctx.restore();return cv;
 }
 function finalCanvas(src,cut,bg,scale=1){
  if(bg.mode==='product')return productCanvas(cut,bg,scale);
  if(bg.mode==='transparent')return cut;
  const out=document.createElement('canvas');out.width=cut.width;out.height=cut.height;const ctx=out.getContext('2d');
  if(bg.mode==='blur'&&canFilter){ctx.save();ctx.filter=`blur(${Math.max(1,bg.blur*cut.width/720)}px)`;const m=bg.blur*cut.width/720*2;ctx.drawImage(src,-m,-m,cut.width+2*m,cut.height+2*m);ctx.restore();}
  else{ctx.fillStyle=bg.color;ctx.fillRect(0,0,out.width,out.height);}
  ctx.drawImage(cut,0,0);return out;
 }

 /* ---------- modelo no aparelho ---------- */
 function alphaFromImage(img,w,h){
  const iw=img.width,ih=img.height,c=img.channels||4,d=img.data;let a=new Uint8ClampedArray(iw*ih);
  if(c===4)for(let i=0;i<a.length;i++)a[i]=d[i*4+3];else if(c===1)for(let i=0;i<a.length;i++)a[i]=d[i];else throw new Error('Formato de saída do modelo inesperado ('+c+' canais).');
  if(iw===w&&ih===h)return a;
  const m=document.createElement('canvas');m.width=iw;m.height=ih;const mc=m.getContext('2d'),md=mc.createImageData(iw,ih);for(let i=0;i<a.length;i++){md.data[i*4]=md.data[i*4+1]=md.data[i*4+2]=a[i];md.data[i*4+3]=255;}mc.putImageData(md,0,0);
  const o=document.createElement('canvas');o.width=w;o.height=h;const oc=o.getContext('2d');oc.drawImage(m,0,0,w,h);const od=oc.getImageData(0,0,w,h).data;a=new Uint8ClampedArray(w*h);for(let i=0;i<a.length;i++)a[i]=od[i*4];return a;
 }
 async function getLib(){
  if(B.lib)return B.lib;dlog('a importar '+LIB);
  try{B.lib=await withTimeout(import(LIB),60000,'A biblioteca do modelo demorou demasiado a carregar.');}catch(e){dlog('import falhou: '+(e&&e.message));throw e;}
  dlog('biblioteca carregada');return B.lib;
 }
 async function makeBackend(model,quality,onProgress){
  const key=model+':'+quality;if(B.backends[key])return B.backends[key];
  const T=await getLib(),def=MODELS[model];T.env.allowLocalModels=false;
  const files={},report=p=>{if(!p)return;if(p.status==='progress'&&p.total){files[p.file]={l:p.loaded,t:p.total};let l=0,t=0;for(const f of Object.values(files)){l+=f.l;t+=f.t;}if(onProgress)onProgress(l/t,t);}};
  const gpu=quality==='high',base={device:gpu?'webgpu':'wasm',dtype:gpu?'fp32':'q8',progress_callback:report},errors=[];
  try{
   dlog('pipeline '+def.id+' '+base.device+'/'+base.dtype);
   const pipe=await T.pipeline('background-removal',def.id,base);
   return B.backends[key]={async segment(canvas){const blob=await toBlob(canvas),url=URL.createObjectURL(blob);try{const out=await pipe(url),img=Array.isArray(out)?out[0]:out;return alphaFromImage(img,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}}};
  }catch(e){errors.push('pipeline: '+(e&&e.message||e));dlog(errors[errors.length-1]);}
  try{
   dlog('AutoModel '+def.id);
   const m=await T.AutoModel.from_pretrained(def.id,Object.assign({},def.cfg,base)),proc=await T.AutoProcessor.from_pretrained(def.id,def.proc);
   return B.backends[key]={async segment(canvas){const blob=await toBlob(canvas),url=URL.createObjectURL(blob);try{const image=await T.RawImage.fromURL(url),{pixel_values}=await proc(image),{output}=await m({input:pixel_values});
    const mask=await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width,image.height);return alphaFromImage({width:mask.width,height:mask.height,channels:mask.channels||1,data:mask.data},canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}}};
  }catch(e){errors.push('AutoModel: '+(e&&e.message||e));dlog(errors[errors.length-1]);throw new Error(errors.join(' | '));}
 }
 async function segment(canvas,onProgress,say){
  if(customBackend)return customBackend.segment(canvas);
  const attempt=async q=>{const be=await makeBackend(B.model,q,onProgress);say('A recortar a imagem…');dlog('a segmentar ('+q+')');return withTimeout(be.segment(canvas),q==='high'?120000:240000,'O recorte demorou demasiado neste aparelho.');};
  try{return await attempt(B.quality);}
  catch(e){
   if(B.quality==='high'){dlog('modo alto falhou: '+(e&&e.message));say('O modo rápido (WebGPU) falhou. A tentar o modo leve…');B.quality='light';return await attempt('light');}
   throw e;
  }
 }

 /* ---------- interface ---------- */
 const css=`.bgm-stage{position:relative;max-width:520px;width:100%;margin:0 auto;background:#000;border-radius:10px;overflow:hidden;touch-action:pan-y}.bgm-stage canvas{display:block;width:100%;height:auto;max-height:52dvh;object-fit:contain;margin:0 auto}.bgm-stage.brush canvas{touch-action:none}.bgm-big{display:flex;flex-direction:column;gap:10px;max-width:520px;margin:0 auto;width:100%}.bgm-big .btn{min-height:52px;font-size:16px}.bgm-bar{height:10px;border-radius:6px;background:#ffffff22;overflow:hidden}.bgm-bar i{display:block;height:100%;width:0;background:var(--ac,#e63da0);transition:width .2s}.bgm-tabs{display:flex;gap:6px;flex-wrap:wrap}.bgm-tabs .btn{flex:1;min-width:70px}.bgm-msg{background:#5a132b;color:#fff;padding:8px 10px;border-radius:8px;margin:0}.bgm-thumb{max-width:260px;max-height:34dvh;margin:0 auto;display:block;border-radius:8px}#toast{z-index:500!important}`;
 let modal=null,E=null,raf=0,timer=0;
 const $m=s=>modal&&modal.querySelector(s);
 function msg(t){const el=$m('#bgmMsg');if(!el)return;el.textContent=t||'';el.hidden=!t;if(t&&typeof toast==='function')toast(t,5000);}
 function closeAll(){cancelAnimationFrame(raf);raf=0;clearInterval(timer);if(modal){modal.remove();modal=null;}E=null;const old=document.getElementById('labModal');if(old&&old.dataset.bg)old.remove();}
 function openShell(title){
  const old=document.getElementById('labModal');if(old)old.remove();
  modal=document.createElement('div');modal.id='labModal';modal.dataset.bg='1';modal.className='lab-modal';
  modal.innerHTML=`<div class="lab-head"><strong>${title}</strong><button type="button" class="btn" id="bgmClose">Fechar</button></div><div class="lab-body"><p class="bgm-msg" id="bgmMsg" hidden></p><div id="bgmMain" style="display:flex;flex-direction:column;gap:10px"></div></div>`;
  document.body.appendChild(modal);$m('#bgmClose').onclick=()=>{if(E)E.cancelled=true;closeAll();};return $m('#bgmMain');
 }
 const pickPhoto=()=>new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.addEventListener('change',()=>res(i.files[0]||null));i.addEventListener('cancel',()=>res(null));i.click();});
 async function loadFile(file){
  try{if(window.createImageBitmap){const bmp=await createImageBitmap(file);const c=fitCanvas(bmp,MAX_SRC);if(bmp.close)bmp.close();return c;}}catch(e){}
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{const c=fitCanvas(im,MAX_SRC);URL.revokeObjectURL(url);res(c);};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Não consegui abrir '+file.name+'. Se for HEIC/HEIF, converte para JPG ou PNG.'));};im.src=url;});
 }
 function chooseScreen(){
  const main=$m('#bgmMain'),layer=hasLayers()?lxSelected():null,layerOk=layer&&layer.kind==='image';
  main.innerHTML=`<div class="bgm-big"><p class="hint">Escolhe a imagem. Podes recortar com o modelo no telemóvel ou, se a imagem tiver fundo liso, sem IA.</p>
   <button class="btn primary" id="bgmFile">Escolher foto da galeria</button><button class="btn" id="bgmFrame" ${S.clips.length?'':'disabled'}>Usar o frame do vídeo na agulha</button>${layerOk?'<button class="btn" id="bgmLayer">Usar a camada de foto selecionada</button>':''}
   <div class="box"><h3>Modo de recorte</h3><div class="btnrow"><button class="btn ${B.model==='people'?'primary':''}" data-model="people">Pessoas</button><button class="btn ${B.model==='general'?'primary':''}" data-model="general">Objetos e geral</button><button class="btn ${B.model==='noai'?'primary':''}" data-model="noai">Sem IA (fundo liso)</button></div>
   ${B.model==='noai'?'':`<h3>Qualidade</h3><div class="btnrow"><button class="btn ${B.quality==='light'?'primary':''}" data-quality="light">Leve (recomendado)</button><button class="btn ${B.quality==='high'?'primary':''}" data-quality="high">Alta (WebGPU)</button></div>`}
   <p class="hint">${B.model==='noai'?'Sem IA: remove a cor do fundo ligada às bordas e recorta já, sem descarregar nada. Funciona bem com fundos lisos; depois podes usar a varinha e o pincel.':'A primeira vez descarrega o modelo e fica guardado (precisa de internet). "Pessoas" usa o MODNet, que é leve e serve para retratos. "Objetos e geral" usa o RMBG 1.4, que só é livre para uso não comercial. A qualidade alta usa o WebGPU e passa ao modo leve se falhar.'}</p></div></div>`;
  main.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{B.model=b.dataset.model;chooseScreen();});
  main.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{B.quality=b.dataset.quality;chooseScreen();});
  const go=async fn=>{msg('');try{const c=await fn();if(c)startProcess(c);}catch(e){msg(e.message||String(e));}};
  main.querySelector('#bgmFile').onclick=()=>go(async()=>{const f=await pickPhoto();if(!f)return null;msg('A abrir a foto…');const c=await loadFile(f);msg('');return c;});
  main.querySelector('#bgmFrame').onclick=()=>go(async()=>fitCanvas(await FenixLab.captureFrame(),MAX_SRC));
  const lb=main.querySelector('#bgmLayer');if(lb)lb.onclick=()=>go(async()=>{const a=LX.assets.get(layer.asset);if(!a||!a.el)throw new Error('Não encontro a foto desta camada.');const c=fitCanvas(a.el,MAX_SRC);c._layer=layer;return c;});
 }
 function newState(src){
  const small=fitCanvas(src,MAX_MASK),w=small.width,h=small.height;
  return {src,small,w,h,data:small.getContext('2d').getImageData(0,0,w,h).data,layer:src._layer||null,raw:null,noai:false,tol:36,params:{cut:.5,soft:.18,grow:0,feather:1,clean:true,invert:false},erase:new Float32Array(w*h),keep:new Float32Array(w*h),strokes:[],auto:null,alpha:new Uint8ClampedArray(w*h),tool:'adjust',brush:{mode:'erase',size:Math.max(8,Math.round(w*.04)),showRemoved:true,wandTol:30},showOriginal:false,cancelled:false};
 }
 function startNoAI(src){
  E=newState(src);E.noai=true;E.raw=borderBackgroundMask(E.data,E.w,E.h,E.tol);editorScreen();
 }
 async function startProcess(src){
  if(B.model==='noai')return startNoAI(src);
  E=newState(src);const me=E,main=$m('#bgmMain'),t0=Date.now();
  main.innerHTML=`<div class="bgm-big"><img class="bgm-thumb" id="bgmThumb"><div class="bgm-bar"><i id="bgmBar"></i></div><p class="hint" id="bgmStatus">A preparar…</p><p class="hint" id="bgmClock"></p><div class="btnrow"><button class="btn" id="bgmCancel">Cancelar</button><button class="btn" id="bgmNoAI">Recortar sem IA</button></div></div>`;
  $m('#bgmThumb').src=me.small.toDataURL('image/jpeg',.8);
  clearInterval(timer);timer=setInterval(()=>{const c=$m('#bgmClock');if(c)c.textContent='A trabalhar há '+Math.round((Date.now()-t0)/1000)+' s. Na primeira vez o descarregamento do modelo pode demorar.';},1000);
  $m('#bgmCancel').onclick=()=>{me.cancelled=true;E=null;clearInterval(timer);chooseScreen();};
  $m('#bgmNoAI').onclick=()=>{me.cancelled=true;clearInterval(timer);startNoAI(src);};
  const status=t=>{const s=$m('#bgmStatus');if(s)s.textContent=t;},bar=f=>{const b=$m('#bgmBar');if(b)b.style.width=Math.round(f*100)+'%';};
  try{
   status('A carregar o modelo (só na primeira vez; precisa de internet)…');dlog('início: '+B.model+' '+B.quality+' '+me.w+'x'+me.h);
   const raw=await segment(me.small,(f,t)=>{status('A descarregar o modelo: '+Math.round(f*100)+' % de '+(t/1048576).toFixed(0)+' MB');bar(f);},status);
   if(me.cancelled||E!==me)return;
   if(raw.length!==me.w*me.h)throw new Error('O modelo devolveu um recorte com tamanho inesperado.');
   clearInterval(timer);me.raw=raw;bar(1);dlog('recorte pronto');editorScreen();
  }catch(e){
   clearInterval(timer);if(me.cancelled||E!==me)return;dlog('erro: '+(e&&e.message||e));console.error(e);
   const m=String(e&&e.message||e).replace(/[<>&]/g,'').slice(0,400),net=/Failed to fetch|NetworkError|dynamically imported|Load failed|carregar a biblioteca/i.test(m);
   main.innerHTML=`<div class="bgm-big"><p class="bgm-msg">${net?'Não consegui descarregar o modelo. Confirma a ligação à internet. Também podes recortar sem IA.':'O recorte com IA falhou: '+m}</p><button class="btn primary" id="bgmNoAI2">Recortar sem IA (fundo liso)</button><button class="btn" id="bgmRetry">Tentar outra vez</button><button class="btn" id="bgmLight">Tentar modo leve</button><button class="btn" id="bgmCopy">Copiar diagnóstico</button><button class="btn" id="bgmBack">Voltar</button></div>`;
   $m('#bgmNoAI2').onclick=()=>startNoAI(src);$m('#bgmRetry').onclick=()=>startProcess(src);$m('#bgmLight').onclick=()=>{B.quality='light';startProcess(src);};
   $m('#bgmCopy').onclick=async()=>{const txt='FenixCut remover fundo\n'+navigator.userAgent+'\nWebGPU: '+(!!navigator.gpu)+'\n'+B.log.join('\n');try{await navigator.clipboard.writeText(txt);msg('Diagnóstico copiado. Cola-o na conversa.');}catch(x){msg(txt.slice(0,300));}};
   $m('#bgmBack').onclick=()=>{E=null;chooseScreen();};
  }
 }
 function recompute(full){
  if(full||!E.auto)E.auto=refine(E.raw,E.w,E.h,E.params);
  combine(E.auto,E.erase,E.keep,E.alpha);
 }
 function schedule(full){if(full)E.dirty=true;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(!E)return;if(E.dirty){recompute(true);E.dirty=false;}else recompute(false);draw();});}
 function draw(){
  const st=$m('#bgmStage');if(!st||!E)return;const ctx=st.getContext('2d');
  let w=E.w,h=E.h,bgv=B.bg;
  const inProduct=E.tool==='bg'&&bgv.mode==='product';
  if(E.showOriginal){st.width=w;st.height=h;ctx.drawImage(E.small,0,0,w,h);return;}
  const cut=cutFrom(E.small,E.alpha,w,h);
  if(E.tool==='brush'&&E.brush.showRemoved){
   st.width=w;st.height=h;ctx.drawImage(E.small,0,0);const d=ctx.getImageData(0,0,w,h),px=d.data;
   for(let i=0;i<E.alpha.length;i++){const k=1-E.alpha[i]/255;if(k>0){px[i*4]=px[i*4]*(1-.55*k)+255*.55*k;px[i*4+1]=px[i*4+1]*(1-.55*k);px[i*4+2]=px[i*4+2]*(1-.55*k)+60*.55*k;}}
   ctx.putImageData(d,0,0);
  }else{
   const out=inProduct?finalCanvas(E.small,cut,bgv,Math.min(1,720/Math.max(...bgv.size.split('x').map(Number)))):finalCanvas(E.small,cut,E.tool==='bg'||E.tool==='save'?bgv:{mode:'transparent'},1);
   st.width=out.width;st.height=out.height;
   if(bgv.mode==='transparent'||E.tool==='adjust'){const p=document.createElement('canvas');p.width=p.height=24;const pc=p.getContext('2d');pc.fillStyle='#bbb';pc.fillRect(0,0,24,24);pc.fillStyle='#fff';pc.fillRect(0,0,12,12);pc.fillRect(12,12,12,12);ctx.fillStyle=ctx.createPattern(p,'repeat');ctx.fillRect(0,0,st.width,st.height);}
   ctx.drawImage(out,0,0);
  }
  if(E.tool==='brush'&&E.cursor&&E.brush.mode.indexOf('wand')<0){ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,w/400);ctx.beginPath();ctx.arc(E.cursor.x,E.cursor.y,E.brush.size,0,Math.PI*2);ctx.stroke();}
 }
 function slider(label,id,min,max,step,val,fmt){return `<label class="rg"><span>${label} <b id="${id}Out">${fmt(val)}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;}
 function panelHTML(){
  const p=E.params,b=E.brush,g=B.bg;
  if(E.tool==='adjust')return `<div class="box"><h3>Ajustar o recorte</h3><p class="hint">${E.noai?'Se sobrou fundo, aumenta a tolerância. Se foi comido o objeto, baixa-a.':'Se sobrou fundo, aumenta o corte. Se foi comida parte do objeto, baixa-o.'}</p>
   ${E.noai?slider('Tolerância da cor do fundo','pTol',5,120,1,E.tol,v=>v+''):slider('Corte','pCut',.15,.85,.01,p.cut,v=>Math.round(v*100)+' %')}${slider('Suavidade da transição','pSoft',.02,.4,.01,p.soft,v=>Math.round(v*100)+' %')}${slider('Expandir (+) / reduzir (−)','pGrow',-8,8,1,p.grow,v=>v+' px')}${slider('Bordas suaves','pFeather',0,5,1,p.feather,v=>v+' px')}
   <div class="checks"><label class="chk"><input type="checkbox" id="pClean" ${p.clean?'checked':''}> Limpar manchas soltas e buracos pequenos</label></div>
   <div class="btnrow"><button class="btn" id="pInvert">Inverter seleção</button><button class="btn" id="pReset">Repor ajustes</button></div></div>`;
  if(E.tool==='brush')return `<div class="box"><h3>Retoque</h3><p class="hint">Pincel: arrasta sobre a imagem. Varinha: toca numa zona para a apagar ou restaurar. A zona vermelha é o que está removido.</p>
   <div class="btnrow"><button class="btn ${b.mode==='erase'?'primary':''}" data-bm="erase">Pincel: apagar</button><button class="btn ${b.mode==='keep'?'primary':''}" data-bm="keep">Pincel: restaurar</button><button class="btn ${b.mode==='wand-erase'?'primary':''}" data-bm="wand-erase">Varinha: apagar</button><button class="btn ${b.mode==='wand-keep'?'primary':''}" data-bm="wand-keep">Varinha: restaurar</button></div>
   ${b.mode.indexOf('wand')===0?slider('Tolerância da varinha','bWand',5,120,1,b.wandTol,v=>v+''):slider('Tamanho do pincel','bSize',4,Math.round(E.w*.15),1,b.size,v=>v+' px')}
   <div class="checks"><label class="chk"><input type="checkbox" id="bShow" ${b.showRemoved?'checked':''}> Mostrar removido a vermelho</label></div>
   <div class="btnrow"><button class="btn" id="bUndo">Desfazer último</button><button class="btn" id="bClear">Limpar retoques</button></div></div>`;
  if(E.tool==='bg')return `<div class="box"><h3>Fundo</h3><label class="fld">Tipo<select id="gMode">${[['transparent','Transparente'],['color','Cor sólida'],['blur','Foto original desfocada'],['product','Foto de produto']].map(([v,n])=>`<option value="${v}" ${g.mode===v?'selected':''}>${n}</option>`).join('')}</select></label>
   ${g.mode!=='transparent'&&g.mode!=='blur'?`<label class="fld">Cor<input type="color" id="gColor" value="${g.color}"></label>`:''}
   ${g.mode==='blur'?slider('Desfoque','gBlur',2,40,1,g.blur,v=>v+'')+(canFilter?'':'<p class="hint">Este navegador não suporta desfoque; vai usar cor sólida.</p>'):''}
   ${g.mode==='product'?`<label class="fld">Formato<select id="gSize">${[['1080x1080','1:1 · 1080'],['1080x1350','4:5 · 1080×1350'],['1080x1920','9:16 · 1080×1920'],['1920x1080','16:9 · 1920×1080']].map(([v,n])=>`<option value="${v}" ${g.size===v?'selected':''}>${n}</option>`).join('')}</select></label>${slider('Margem','gPad',0,40,1,g.pad,v=>v+' %')}<div class="checks"><label class="chk"><input type="checkbox" id="gShadow" ${g.shadow?'checked':''}> Sombra suave</label></div>`:''}</div>`;
  return `<div class="box"><h3>Guardar</h3><div class="bgm-big"><button class="btn primary" id="sPng">Descarregar PNG${g.mode==='transparent'?' (transparente)':' (com o fundo escolhido)'}</button>${g.mode!=='transparent'?'<button class="btn" id="sCut">Descarregar só o recorte (transparente)</button>':''}${hasLayers()&&S.clips.length?'<button class="btn" id="sLayer">Usar como camada no projeto</button>':''}<button class="btn" id="sNew">Recortar outra imagem</button></div></div>`;
 }
 function bindPanel(){
  const root=$m('#bgmPanel');if(!root||!E)return;const p=E.params,b=E.brush,g=B.bg;
  const num=(id,fn,fmt,full)=>{const el=root.querySelector('#'+id);if(!el)return;el.oninput=()=>{const v=Number(el.value);fn(v);root.querySelector('#'+id+'Out').textContent=fmt(v);schedule(full);};};
  num('pCut',v=>p.cut=v,v=>Math.round(v*100)+' %',true);num('pSoft',v=>p.soft=v,v=>Math.round(v*100)+' %',true);num('pGrow',v=>p.grow=v,v=>v+' px',true);num('pFeather',v=>p.feather=v,v=>v+' px',true);
  num('pTol',v=>{E.tol=v;E.raw=borderBackgroundMask(E.data,E.w,E.h,E.tol);},v=>v+'',true);
  num('bSize',v=>b.size=v,v=>v+' px',false);num('bWand',v=>b.wandTol=v,v=>v+'',false);num('gBlur',v=>g.blur=v,v=>v+'',false);num('gPad',v=>g.pad=v,v=>v+' %',false);
  const on=(id,fn)=>{const el=root.querySelector('#'+id);if(el)el.onclick=fn;};
  const chk=(id,fn)=>{const el=root.querySelector('#'+id);if(el)el.onchange=()=>fn(el.checked);};
  chk('pClean',v=>{p.clean=v;schedule(true);});chk('bShow',v=>{b.showRemoved=v;schedule(false);});chk('gShadow',v=>{g.shadow=v;schedule(false);});
  on('pInvert',()=>{p.invert=!p.invert;schedule(true);});on('pReset',()=>{E.params=Object.assign(E.params,{cut:.5,soft:.18,grow:0,feather:1,clean:true,invert:false});panel();schedule(true);});
  root.querySelectorAll('[data-bm]').forEach(x=>x.onclick=()=>{b.mode=x.dataset.bm;panel();});
  on('bUndo',()=>{E.strokes.pop();replay(E);schedule(false);});on('bClear',()=>{E.strokes=[];replay(E);schedule(false);});
  const sel=(id,fn)=>{const el=root.querySelector('#'+id);if(el)el.onchange=()=>{fn(el.value);panel();schedule(false);};};
  sel('gMode',v=>{g.mode=v;});sel('gSize',v=>{g.size=v;});const col=root.querySelector('#gColor');if(col)col.oninput=()=>{g.color=col.value;schedule(false);};
  on('sPng',async()=>{try{const cut=cutFrom(E.src,E.alpha,E.w,E.h),out=finalCanvas(E.src,cut,g,1);save(await toBlob(out),projName()+(g.mode==='product'?'-produto':'-sem-fundo')+'.png');}catch(e){msg(e.message);}});
  on('sCut',async()=>{try{save(await toBlob(cutFrom(E.src,E.alpha,E.w,E.h)),projName()+'-recorte.png');}catch(e){msg(e.message);}});
  on('sLayer',async()=>{try{const png=await toBlob(cutFrom(E.src,E.alpha,E.w,E.h)),l=await lxImport(new File([png],projName()+'-sem-fundo.png',{type:'image/png'}));
   if(E.layer){const o=E.layer;Object.assign(l,{x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,opacity:o.opacity,fit:o.fit,start:o.start,dur:o.dur});}
   lxChanged();closeAll();S.tab='layers';renderPanel();toast('Camada sem fundo adicionada. A original continua no projeto.',6000);}catch(e){msg(e.message);}});
  on('sNew',()=>{E=null;chooseScreen();});
 }
 function panel(){const el=$m('#bgmPanel');if(!el||!E)return;el.innerHTML=panelHTML();bindPanel();const stage=$m('.bgm-stage');if(stage)stage.classList.toggle('brush',E.tool==='brush');}
 function editorScreen(){
  const main=$m('#bgmMain');
  main.innerHTML=`<div class="bgm-stage"><canvas id="bgmStage"></canvas></div>
   <div class="btnrow"><button class="btn" id="bgmOrig">Segurar para ver o original</button></div>
   <div class="bgm-tabs">${[['adjust','Ajustar'],['brush','Retoque'],['bg','Fundo'],['save','Guardar']].map(([k,n])=>`<button class="btn ${E.tool===k?'primary':''}" data-tool="${k}">${n}</button>`).join('')}</div><div id="bgmPanel"></div>`;
  main.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{E.tool=b.dataset.tool;main.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('primary',x===b));panel();schedule(false);});
  const orig=$m('#bgmOrig'),hold=v=>{E.showOriginal=v;draw();};
  orig.addEventListener('pointerdown',e=>{e.preventDefault();hold(true);});['pointerup','pointercancel','pointerleave'].forEach(t=>orig.addEventListener(t,()=>hold(false)));
  const st=$m('#bgmStage');let down=false,last=null,stroke=null;
  const pos=e=>{const r=st.getBoundingClientRect();return {x:(e.clientX-r.left)*E.w/r.width,y:(e.clientY-r.top)*E.h/r.height};};
  const paintTo=(pt)=>{const r=E.brush.size,mode=E.brush.mode,step=Math.max(1,r/3);let from=last||pt;const dist=Math.hypot(pt.x-from.x,pt.y-from.y),n=Math.max(1,Math.ceil(dist/step));
   for(let i=1;i<=n;i++){const x=from.x+(pt.x-from.x)*i/n,y=from.y+(pt.y-from.y)*i/n;stamp(E,x,y,r,mode);stroke.push([x,y,r,mode]);}last=pt;};
  st.addEventListener('pointerdown',e=>{if(E.tool!=='brush')return;e.preventDefault();const pt=pos(e),mode=E.brush.mode;
   if(mode.indexOf('wand')===0){const idx=floodRegion(E.data,E.w,E.h,pt.x,pt.y,E.brush.wandTol),m=mode==='wand-erase'?'erase':'keep';applyRegion(E,idx,m);E.strokes.push([['R',idx,m]]);schedule(false);return;}
   st.setPointerCapture(e.pointerId);down=true;stroke=[];last=null;E.cursor=pt;paintTo(pt);schedule(false);});
  st.addEventListener('pointermove',e=>{if(E.tool!=='brush')return;const pt=pos(e);E.cursor=pt;if(down){e.preventDefault();paintTo(pt);}schedule(false);});
  const end=()=>{if(down&&stroke&&stroke.length)E.strokes.push(stroke);down=false;stroke=null;last=null;};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);st.addEventListener('pointerleave',()=>{if(!down){E.cursor=null;schedule(false);}});
  panel();E.dirty=true;schedule(true);
 }
 function open(){openShell('Remover fundo');chooseScreen();}
 function cardHTML(){return `<div class="box lab-card" id="bgBox"><h3>Remover fundo (experimental)</h3><p class="hint">Recorta o fundo de uma foto com um modelo no telemóvel ou, se o fundo for liso, sem IA. Depois afinas com sliders, pincel e varinha, escolhes o fundo e guardas.</p><div class="btnrow"><button class="btn primary" id="bgOpen">Abrir o removedor de fundo</button></div><p class="hint">Vídeo com fundo removido, aumentar resolução e retoque de rosto ainda não existem.</p></div>`;}
 const previous=renderPanel;
 renderPanel=function(){
  const result=previous();
  if(S.tab!=='studio')return result;
  const body=$('panelBody');if(!body||body.querySelector('#bgBox'))return result;
  const holder=document.createElement('div');holder.innerHTML=cardHTML();const box=holder.firstElementChild,notes=[...body.querySelectorAll('.box')].pop();
  if(notes)body.insertBefore(box,notes);else body.appendChild(box);box.querySelector('#bgOpen').onclick=open;return result;
 };
 window.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);});
 if(document.readyState!=='loading'){const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);}
 window.FenixBg={refine,morph,boxBlur,removeSmall,combine,stamp,replay,floodRegion,borderBackgroundMask,alphaFromImage,cutFrom,trimToContent,productCanvas,finalCanvas,fitCanvas,setBackend:b=>{customBackend=b;},open,state:B,_E:()=>E};
})();
