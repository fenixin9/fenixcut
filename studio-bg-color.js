/* FenixCut V21 — Recuperar roupa e zonas apagadas no removedor de fundo, por cor. Loaded after studio-bg.js. */
'use strict';
(function(){
 if(typeof window.FenixBg==='undefined'||typeof window.FenixBg._E!=='function')return;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function morphBin(a,w,h,r,dilate){
  const tmp=new Uint8Array(a.length),out=new Uint8Array(a.length);
  for(let y=0;y<h;y++){const row=y*w;for(let x=0;x<w;x++){let v=dilate?0:1;const x0=Math.max(0,x-r),x1=Math.min(w-1,x+r);for(let k=x0;k<=x1;k++){const p=a[row+k];if(dilate?p>v:p<v){v=p;if(dilate?v:!v)break;}}tmp[row+x]=v;}}
  for(let x=0;x<w;x++){for(let y=0;y<h;y++){let v=dilate?0:1;const y0=Math.max(0,y-r),y1=Math.min(h-1,y+r);for(let k=y0;k<=y1;k++){const p=tmp[k*w+x];if(dilate?p>v:p<v){v=p;if(dilate?v:!v)break;}}out[y*w+x]=v;}}
  return out;
 }
 function blurF(a,w,h,r){
  const n=2*r+1,tmp=new Float32Array(a.length),out=new Float32Array(a.length);
  for(let y=0;y<h;y++){let s=0;const row=y*w;for(let k=-r;k<=r;k++)s+=a[row+clamp(k,0,w-1)];for(let x=0;x<w;x++){tmp[row+x]=s/n;s+=a[row+Math.min(w-1,x+r+1)]-a[row+Math.max(0,x-r)];}}
  for(let x=0;x<w;x++){let s=0;for(let k=-r;k<=r;k++)s+=tmp[clamp(k,0,h-1)*w+x];for(let y=0;y<h;y++){out[y*w+x]=s/n;s+=tmp[Math.min(h-1,y+r+1)*w+x]-tmp[Math.max(0,y-r)*w+x];}}
  return out;
 }
 function bigComponents(m,w,h,minArea){
  const n=w*h,id=new Int32Array(n),queue=new Int32Array(n),keep=new Uint8Array(n);let comp=0;
  for(let s=0;s<n;s++){
   if(!m[s]||id[s])continue;comp++;let head=0,tail=0;queue[tail++]=s;id[s]=comp;
   while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w;
    if(x>0&&m[p-1]&&!id[p-1]){id[p-1]=comp;queue[tail++]=p-1;}
    if(x<w-1&&m[p+1]&&!id[p+1]){id[p+1]=comp;queue[tail++]=p+1;}
    if(y>0&&m[p-w]&&!id[p-w]){id[p-w]=comp;queue[tail++]=p-w;}
    if(y<h-1&&m[p+w]&&!id[p+w]){id[p+w]=comp;queue[tail++]=p+w;}}
   if(tail>=minArea)for(let i=0;i<tail;i++)keep[queue[i]]=1;
  }
  return keep;
 }
 function hullMask(big,w,h){
  const pts=[],rowMin=new Int32Array(h).fill(-1),rowMax=new Int32Array(h).fill(-1),colMin=new Int32Array(w).fill(-1),colMax=new Int32Array(w).fill(-1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(big[y*w+x]){if(rowMin[y]<0)rowMin[y]=x;rowMax[y]=x;if(colMin[x]<0)colMin[x]=y;colMax[x]=y;}
  for(let y=0;y<h;y++)if(rowMin[y]>=0){pts.push([rowMin[y],y],[rowMax[y]+1,y+1]);}
  for(let x=0;x<w;x++)if(colMin[x]>=0){pts.push([x,colMin[x]],[x+1,colMax[x]+1]);}
  if(pts.length<3)return null;
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];
  for(const p of pts){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
  const poly=lower.slice(0,-1).concat(upper.slice(0,-1)),cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d');
  ctx.fillStyle='#fff';ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();
  const d=ctx.getImageData(0,0,w,h).data,out=new Uint8Array(w*h);for(let i=0;i<out.length;i++)out[i]=d[i*4+3]>128?1:0;return out;
 }
 function colorRestore(data,w,h,raw,thr,info){
  const n=w*h,m=new Uint8Array(n);for(let i=0;i<n;i++)m[i]=raw[i]>=128?1:0;
  const big=bigComponents(m,w,h,Math.round(n*.02)),hull=hullMask(big,w,h);
  if(!hull)return raw;
  const core=morphBin(big,w,h,8,false),hullFar=morphBin(hull,w,h,12,true);
  const fg=new Float64Array(4096).fill(.5),bg=new Float64Array(4096).fill(.5);let nf=0,nb=0;
  const bin=i=>((data[i*4]>>4)<<8)|((data[i*4+1]>>4)<<4)|(data[i*4+2]>>4);
  for(let i=0;i<n;i++){if(core[i]){fg[bin(i)]++;nf++;}else if(!hullFar[i]){bg[bin(i)]++;nb++;}}
  if(info){info.coreSamples=nf;info.bgSamples=nb;}
  if(nf<500||nb<500)return raw;
  let sf=0,sb=0;for(let k=0;k<4096;k++){sf+=fg[k];sb+=bg[k];}
  const lr=new Float32Array(n);for(let i=0;i<n;i++){if(hull[i]){const k=bin(i),pf=fg[k]/sf,pb=bg[k]/sb;lr[i]=pf/(pf+pb);}}
  const lrs=blurF(lr,w,h,2),cand=new Uint8Array(n);for(let i=0;i<n;i++)if(hull[i]&&!m[i]&&lrs[i]>thr)cand[i]=1;
  const out=Uint8ClampedArray.from(raw),queue=new Int32Array(n),seen=new Uint8Array(n),rest=new Float32Array(n);let head=0,tail=0,added=0;
  for(let i=0;i<n;i++)if(big[i]){seen[i]=1;queue[tail++]=i;}
  while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w;
   const add=q=>{if(!seen[q]&&cand[q]){seen[q]=1;rest[q]=255;added++;queue[tail++]=q;}};
   if(x>0)add(p-1);if(x<w-1)add(p+1);if(y>0)add(p-w);if(y<h-1)add(p+w);}
  const soft=added?blurF(rest,w,h,2):null;if(soft)for(let i=0;i<n;i++){const v=soft[i];if(v>out[i])out[i]=Math.min(255,Math.round(v*1.15));}
  if(info)info.restored=added;
  return out;
 }
 const STATE=new WeakMap();
 function apply(E){
  const s=STATE.get(E)||{on:true,thr:.55,base:E.raw};STATE.set(E,s);
  if(!s.base)s.base=E.raw;
  const info={};E.raw=s.on?colorRestore(E.data,E.w,E.h,s.base,s.thr,info):s.base;s.info=info;return info;
 }
 function nudge(){const el=document.getElementById('pCut');if(el)el.dispatchEvent(new Event('input',{bubbles:true}));}
 function boxHTML(s){return `<div class="box" id="colorBox"><h3>Recuperar roupa e partes apagadas</h3><p class="hint">Se o recorte comeu parte da roupa ou do corpo, esta correção compara as cores com as do resto da pessoa e do fundo e devolve o que se parece com a pessoa.</p><div class="checks"><label class="chk"><input type="checkbox" id="colorOn" ${s.on?'checked':''}> Recuperar por cor</label></div><label class="rg"><span>Sensibilidade <b id="colorThrOut">${Math.round((1-s.thr)*100)} %</b></span><input type="range" id="colorThr" min="0.3" max="0.85" step="0.01" value="${s.thr}"></label><p class="hint" id="colorInfo">${s.error?'Erro: '+s.error:(s.info&&s.info.restored!=null?'Recuperados '+s.info.restored+' pontos.':'')}</p></div>`;}
 function injectUI(){
  const E=window.FenixBg._E();if(!E||E.noai)return;const panel=document.getElementById('bgmPanel');
  if(!panel||!panel.querySelector('#pClean')||panel.querySelector('#colorBox'))return;
  const s=STATE.get(E);if(!s)return;
  panel.insertAdjacentHTML('beforeend',boxHTML(s));
  const on=panel.querySelector('#colorOn'),thr=panel.querySelector('#colorThr'),out=panel.querySelector('#colorThrOut'),info=panel.querySelector('#colorInfo');
  const run=()=>{try{const i=apply(E);info.textContent=i.restored!=null?'Recuperados '+i.restored+' pontos.':'';}catch(err){info.textContent='Erro: '+String(err&&err.message||err);}nudge();};
  on.onchange=()=>{s.on=on.checked;run();};
  thr.oninput=()=>{out.textContent=Math.round((1-Number(thr.value))*100)+' %';};
  thr.onchange=()=>{s.thr=Number(thr.value);run();};
 }
 function check(){
  const E=window.FenixBg._E();if(!E||E.noai||!E.raw||!document.getElementById('bgmStage'))return;
  if(!STATE.has(E)){let info={};try{info=apply(E);}catch(err){console.error(err);STATE.set(E,{on:false,thr:.55,base:E.raw,error:String(err&&err.message||err)});}
   nudge();if(typeof toast==='function')toast(info.restored?'Recuperei '+info.restored+' pontos de roupa por cor. Podes ajustar em "Recuperar roupa".':'Recuperação por cor: nada a recuperar.',4500);}
  injectUI();
 }
 let queued=false;
 const mo=new MutationObserver(()=>{if(queued)return;queued=true;Promise.resolve().then(()=>{queued=false;try{check();}catch(e){console.error(e);}});});
 mo.observe(document.body,{childList:true,subtree:true});
 setInterval(()=>{try{check();}catch(e){}},700);
 window.FenixBgColor={blurF,colorRestore,bigComponents,hullMask,morphBin,apply};
})();
