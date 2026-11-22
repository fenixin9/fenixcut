/* FenixCut V16 — Estúdio: ferramentas que correm no aparelho, sem IA externa. Loaded after studio-edit.js. */
'use strict';
(function(){
 const need=['S','TABS','toast','esc','SRC','clipAt','srcTimeAt','commit','refreshAll','layout','nid','renderTabs','renderPanel','createRenderer','dimsFor','seekTo','pause'];
 const missing=need.filter(n=>{try{return typeof (0,eval)(n)==='undefined';}catch(e){return true;}});
 if(missing.length){window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-lab.js não encontrou: '+missing.join(', ');p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hasLayers=()=>typeof LX!=='undefined'&&typeof lxImport==='function';
 const L={sil:null,busy:false,tpText:'Escreve aqui o teu guião. O texto vai deslizar por cima da câmara enquanto gravas.',tpSpeed:45,tpSize:30,tpMirror:false,facing:'user'};
 const blobOf=(cv,type='image/png',q)=>new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('Não consegui criar a imagem.')),type,q));
 function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);}
 const projName=()=>((typeof P!=='undefined'&&P.name)||'fenixcut').replace(/[^\w\-]+/g,'_').slice(0,40);
 const dimsOf=res=>{const d=dimsFor(res);return {w:d.w||d[0],h:d.h||d[1]};};

 /* ---------- Cortar silêncios ---------- */
 function analyzeSilence(data,rate,o={}){
  const win=Math.max(1,Math.round(rate*.02)),n=Math.floor(data.length/win);if(!n)return {ranges:[],threshold:-50,duration:data.length/rate,floor:-90};
  const db=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;const a=i*win;for(let j=0;j<win;j++){const v=data[a+j];s+=v*v;}db[i]=20*Math.log10(Math.sqrt(s/win)+1e-9);}
  const sorted=Float32Array.from(db).sort(),floor=sorted[Math.floor(n*.1)];
  const threshold=o.threshold==null?clamp(floor+10,-55,-30):o.threshold;
  const minSilence=o.minSilence==null?.45:o.minSilence,pad=o.pad==null?.1:o.pad,minVoice=o.minVoice==null?.12:o.minVoice,step=win/rate;
  let runs=[],start=-1;
  for(let i=0;i<=n;i++){const on=i<n&&db[i]>threshold;if(on&&start<0)start=i;if(!on&&start>=0){runs.push([start*step,i*step]);start=-1;}}
  const merged=[];
  for(const r of runs){const last=merged[merged.length-1];if(last&&r[0]-last[1]<minSilence)last[1]=r[1];else merged.push([r[0],r[1]]);}
  const duration=data.length/rate,out=[];
  for(const r of merged){if(r[1]-r[0]<minVoice)continue;const a=Math.max(0,r[0]-pad),b=Math.min(duration,r[1]+pad),last=out[out.length-1];if(last&&a<=last[1])last[1]=Math.max(last[1],b);else out.push([a,b]);}
  return {ranges:out,threshold,duration,floor};
 }
 const decodeCache=new Map();
 async function decodeSource(srcId){
  if(decodeCache.has(srcId))return decodeCache.get(srcId);
  const file=SRC[srcId].file;if(file.size>500*1024*1024)throw new Error('O ficheiro é grande demais para analisar o áudio no aparelho (máximo 500 MB).');
  const ac=new (window.AudioContext||window.webkitAudioContext)();
  try{const buf=await ac.decodeAudioData(await file.arrayBuffer());const a=buf.getChannelData(0),b=buf.numberOfChannels>1?buf.getChannelData(1):null,mono=new Float32Array(a.length);for(let i=0;i<a.length;i++)mono[i]=b?(a[i]+b[i])/2:a[i];const r={data:mono,rate:buf.sampleRate};decodeCache.set(srcId,r);return r;}
  catch(e){throw new Error('Não consegui ler o áudio de '+SRC[srcId].name+'. O ficheiro pode não ter som.');}
  finally{await ac.close();}
 }
 function piecesFor(clip,ranges){
  const out=[];for(const [a,b] of ranges){const s=Math.max(a,clip.in),e=Math.min(b,clip.out);if(e-s>=.08)out.push([s,e]);}return out;
 }
 async function analyzeAll(){
  if(!S.clips.length)throw new Error('Importa primeiro um vídeo.');
  const opts={threshold:L.autoThr===false?L.thr:null,minSilence:L.minSil,pad:L.pad},perSrc={};let removed=0,total=0,pauses=0;
  for(const c of S.clips){
   if(!perSrc[c.src]){const d=await decodeSource(c.src);perSrc[c.src]=analyzeSilence(d.data,d.rate,opts);}
   const kept=piecesFor(c,perSrc[c.src].ranges),span=(c.out-c.in)/(c.speed||1),keptSpan=kept.reduce((s,p)=>s+(p[1]-p[0]),0)/(c.speed||1);
   total+=span;removed+=span-keptSpan;pauses+=Math.max(0,kept.length-1)+(kept.length?0:1);
  }
  L.sil={perSrc,removed,total,pauses};return L.sil;
 }
 function applySilence(){
  const sil=L.sil;if(!sil)throw new Error('Analisa primeiro.');
  const next=[];
  for(const c of S.clips){
   const pieces=piecesFor(c,sil.perSrc[c.src].ranges);
   pieces.forEach((p,i)=>{const n=JSON.parse(JSON.stringify(c));n.id=i?nid():c.id;n.in=p[0];n.out=p[1];if(i)n.trans={type:'none',dur:.5};next.push(n);});
  }
  if(!next.length)throw new Error('Tudo foi considerado silêncio. Baixa o limite e tenta outra vez.');
  S.clips=next;layout();S.t=Math.min(S.t,S.total);S.sel=null;L.sil=null;commit();refreshAll(true);
 }

 /* ---------- Aprimorar automaticamente ---------- */
 function frameStats(img){
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,96,96);
  const d=x.getImageData(0,0,96,96).data;let sum=0,sum2=0,sat=0;const n=d.length/4;
  for(let i=0;i<d.length;i+=4){const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,l=.299*r+.587*g+.114*b,mx=Math.max(r,g,b),mn=Math.min(r,g,b);sum+=l;sum2+=l*l;sat+=mx?(mx-mn)/mx:0;}
  const mean=sum/n;return {mean,std:Math.sqrt(Math.max(0,sum2/n-mean*mean)),sat:sat/n};
 }
 function suggestFx(s){return {bright:clamp((.46-s.mean)*.7,-.2,.2),contrast:clamp(.23/Math.max(.05,s.std),.88,1.3),sat:clamp(.32/Math.max(.05,s.sat),.95,1.35)};}
 function suggestLayer(s){return {bright:clamp(.46/Math.max(.05,s.mean),.8,1.35),contrast:clamp(.23/Math.max(.05,s.std),.88,1.3),sat:clamp(.32/Math.max(.05,s.sat),.95,1.35)};}
 function enhance(){
  const sel=typeof LX!=='undefined'&&typeof lxSelected==='function'?lxSelected():null;
  if(sel&&sel.kind!=='audio'&&S.tab==='studio'&&L.target==='layer'){
   const a=LX.assets.get(sel.asset);if(!a||!a.el)throw new Error('Camada sem imagem.');
   const g=suggestLayer(frameStats(a.el));lxCheckpoint();Object.assign(sel,{bright:+g.bright.toFixed(3),contrast:+g.contrast.toFixed(3),sat:+g.sat.toFixed(3)});lxChanged();return 'Camada ajustada: brilho '+Math.round(g.bright*100)+' %, contraste '+Math.round(g.contrast*100)+' %, saturação '+Math.round(g.sat*100)+' %.';
  }
  const c=clipAt(S.t)||S.clips[0];if(!c)throw new Error('Importa primeiro um vídeo.');
  const v=SRC[c.src].video;if(v.readyState<2)throw new Error('Espera que o vídeo carregue e tenta outra vez.');
  const g=suggestFx(frameStats(v));c.fx=Object.assign({},c.fx,{bright:+g.bright.toFixed(3),contrast:+g.contrast.toFixed(3),sat:+g.sat.toFixed(3)});c.fx.preset='custom';commit();refreshAll(true);
  return 'Clipe ajustado: brilho '+(g.bright>=0?'+':'')+g.bright.toFixed(2)+', contraste '+Math.round(g.contrast*100)+' %, saturação '+Math.round(g.sat*100)+' %.';
 }

 /* ---------- Transcrição ---------- */
 const ts=(t,sep)=>{t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60),ms=Math.round((t-Math.floor(t))*1000);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+sep+String(ms).padStart(3,'0');};
 function transcript(kind,caps){
  const rows=caps.filter(c=>c.text&&c.text.trim());
  if(kind==='txt')return rows.map(c=>c.text.trim().replace(/\s+/g,' ')).join('\n');
  if(kind==='vtt')return 'WEBVTT\n\n'+rows.map(c=>ts(c.start,'.')+' --> '+ts(c.end,'.')+'\n'+c.text.trim()).join('\n\n')+'\n';
  return rows.map((c,i)=>(i+1)+'\n'+ts(c.start,',')+' --> '+ts(c.end,',')+'\n'+c.text.trim()).join('\n\n')+'\n';
 }
 function exportTranscript(kind){
  if(!S.caps.length)throw new Error('Ainda não há legendas. Gera-as primeiro no separador Legendas.');
  saveBlob(new Blob([transcript(kind,S.caps)],{type:'text/plain;charset=utf-8'}),projName()+'.'+kind);
 }

 /* ---------- Captura de quadro ---------- */
 async function captureFrame(){
  if(!S.clips.length)throw new Error('Importa primeiro um vídeo.');
  pause();const {w,h}=dimsOf(1080),r=createRenderer(w,h);
  try{
   if(typeof lxFrame==='function')await lxFrame(r,S.t);
   else{const c=clipAt(S.t)||S.clips[0],v=SRC[c.src].video;await seekTo(v,srcTimeAt(c,S.t));renderScene(r,S.t,{clip:c,img:v});}
   const out=document.createElement('canvas');out.width=w;out.height=h;out.getContext('2d').drawImage(r.out,0,0);return out;
  }finally{if(r.dispose)r.dispose();}
 }

 /* ---------- Editor de imagem: capa, texto, pôster, colagem ---------- */
 const SIZES=[['1080×1920 · vertical 9:16',1080,1920],['1080×1350 · feed 4:5',1080,1350],['1080×1080 · quadrado',1080,1080],['1920×1080 · horizontal 16:9',1920,1080]];
 const TEMPLATES={2:[['Lado a lado',{cols:[1,1]}],['Empilhado',{rows:[1,1]}]],3:[['1 grande + 2',{cols:[1,2]}],['1 grande em cima + 2',{rows:[1,2]}],['3 linhas',{rows:[1,1,1]}]],4:[['Grelha 2×2',{rows:[2,2]}],['1 grande + 3',{cols:[1,3]}],['1 larga + 3',{rows:[1,3]}]],5:[['2 + 3',{rows:[2,3]}],['2 colunas 2 + 3',{cols:[2,3]}]],6:[['Grelha 3×2',{rows:[3,3]}],['Grelha 2×3',{rows:[2,2,2]}],['2 colunas de 3',{cols:[3,3]}]]};
 function layoutSlots(tpl,W,H,gap,margin){
  const slots=[],inner={x:margin,y:margin,w:W-2*margin,h:H-2*margin};
  if(tpl.rows){const R=tpl.rows.length,rh=(inner.h-gap*(R-1))/R;tpl.rows.forEach((k,r)=>{const cw=(inner.w-gap*(k-1))/k;for(let i=0;i<k;i++)slots.push({x:inner.x+i*(cw+gap),y:inner.y+r*(rh+gap),w:cw,h:rh});});}
  else{const C=tpl.cols.length,cw=(inner.w-gap*(C-1))/C;tpl.cols.forEach((k,c)=>{const rh=(inner.h-gap*(k-1))/k;for(let i=0;i<k;i++)slots.push({x:inner.x+c*(cw+gap),y:inner.y+i*(rh+gap),w:cw,h:rh});});}
  return slots;
 }
 const FILTERS=[['none','Sem filtro',''],['vivid','Vivo','saturate(1.4) contrast(1.1)'],['bw','Preto e branco','grayscale(1) contrast(1.1)'],['warm','Quente','sepia(.25) saturate(1.2) brightness(1.03)'],['cold','Frio','hue-rotate(-12deg) saturate(1.1)'],['drama','Dramático','contrast(1.35) saturate(.85) brightness(.95)']];
 const canFilter=(()=>{try{return 'filter' in document.createElement('canvas').getContext('2d');}catch(e){return false;}})();
 function coverDraw(ctx,img,x,y,w,h,zoom=1,ox=0,oy=0){
  const iw=img.width||img.videoWidth||img.naturalWidth,ih=img.height||img.videoHeight||img.naturalHeight;if(!iw||!ih)return;
  const k=Math.max(w/iw,h/ih)*zoom,dw=iw*k,dh=ih*k;ctx.drawImage(img,x+(w-dw)/2+ox*w,y+(h-dh)/2+oy*h,dw,dh);
 }
 function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
 function wrapLines(ctx,text,maxW){
  const out=[];for(const para of String(text).split('\n')){let cur='';for(const word of para.split(/\s+/).filter(Boolean)){const t=cur?cur+' '+word:word;if(cur&&ctx.measureText(t).width>maxW){out.push(cur);cur=word;}else cur=t;}out.push(cur);}return out;
 }
 function drawText(ctx,W,H,t){
  if(!t.text||!t.text.trim())return;
  const px=t.size/100*W;ctx.save();ctx.font=`${t.weight||800} ${px}px "${t.font}", sans-serif`;ctx.textBaseline='middle';
  const text=t.upper?t.text.toUpperCase():t.text,lines=wrapLines(ctx,text,W*.88),lh=px*1.18,y0=t.y/100*H-(lines.length*lh)/2+lh/2;
  const ax=t.align==='left'?W*.06:t.align==='right'?W*.94:W/2;ctx.textAlign=t.align||'center';
  lines.forEach((line,i)=>{
   const y=y0+i*lh,w=ctx.measureText(line).width;
   if(t.box){const pad=px*.28,bx=t.align==='left'?ax-pad:t.align==='right'?ax-w-pad:ax-w/2-pad;ctx.fillStyle=t.boxColor||'#000';rr(ctx,bx,y-lh/2+px*.04,w+pad*2,lh*.96,px*.2);ctx.fill();}
   if(t.stroke){ctx.lineWidth=px*.14;ctx.lineJoin='round';ctx.strokeStyle=t.strokeColor||'#000';ctx.strokeText(line,ax,y);}
   else if(!t.box){ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=px*.18;ctx.shadowOffsetY=px*.05;}
   ctx.fillStyle=t.color||'#fff';ctx.fillText(line,ax,y);ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  });
  ctx.restore();
 }
 function renderDoc(cv,doc,W){
  const H=Math.round(W*doc.h/doc.w);cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
  ctx.fillStyle=doc.bg;ctx.fillRect(0,0,W,H);
  if(doc.mode==='collage'){
   const tpl=(TEMPLATES[doc.images.length]||[])[doc.template||0];
   if(tpl){const s=W/1080,slots=layoutSlots(tpl[1],W,H,doc.gap*s,doc.margin*s);slots.forEach((r,i)=>{const img=doc.images[i];ctx.save();rr(ctx,r.x,r.y,r.w,r.h,doc.radius*s);ctx.clip();ctx.fillStyle='#222';ctx.fillRect(r.x,r.y,r.w,r.h);if(img)coverDraw(ctx,img.el,r.x,r.y,r.w,r.h);ctx.restore();});}
  }else if(doc.images[0]){
   ctx.save();const f=FILTERS.find(x=>x[0]===doc.filter);if(canFilter&&f&&f[2])ctx.filter=f[2];
   coverDraw(ctx,doc.images[0].el,0,0,W,H,doc.zoom,doc.ox,doc.oy);ctx.restore();
   if(doc.dim>0){ctx.fillStyle=`rgba(0,0,0,${doc.dim})`;ctx.fillRect(0,0,W,H);}
   if(doc.grad>0){const g=ctx.createLinearGradient(0,H*.45,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${doc.grad})`);ctx.fillStyle=g;ctx.fillRect(0,H*.45,W,H*.55);}
  }
  if(doc.mode!=='collage')doc.texts.forEach(t=>drawText(ctx,W,H,t));
  return cv;
 }
 const newText=(o={})=>Object.assign({text:'O teu título',font:'Anton',size:11,color:'#ffffff',stroke:true,strokeColor:'#000000',box:false,boxColor:'#000000',y:50,align:'center',upper:true,weight:800},o);
 const fileImage=file=>new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>res({el:im,w:im.naturalWidth,h:im.naturalHeight,name:file.name});im.onerror=()=>rej(new Error('Não consegui abrir '+file.name));im.src=url;});
 const pickFiles=(accept,multiple)=>new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept=accept;i.multiple=!!multiple;i.onchange=()=>res([...i.files]);i.click();});
 function closeModal(){const m=document.getElementById('labModal');if(m){if(m._cleanup)m._cleanup();m.remove();}}
 function openModal(title,html){
  closeModal();const m=document.createElement('div');m.id='labModal';m.className='lab-modal';m.innerHTML=`<div class="lab-head"><strong>${esc(title)}</strong><button type="button" class="btn" id="labClose">Fechar</button></div><div class="lab-body">${html}</div>`;
  document.body.appendChild(m);m.querySelector('#labClose').onclick=closeModal;return m;
 }
 async function openImageEditor(mode,seed){
  const preset=SIZES[0];
  const doc={mode,w:preset[1],h:preset[2],bg:'#14101a',images:seed?[seed]:[],zoom:1,ox:0,oy:0,dim:mode==='poster'?.25:.15,grad:mode==='cover'?.55:0,filter:'none',texts:mode==='collage'?[]:[newText({text:mode==='poster'?'Título do pôster':mode==='cover'?'Título da capa':'O teu texto',y:mode==='cover'?78:50})],template:0,gap:16,margin:16,radius:18};
  const titles={cover:'Criador de capas',text:'Texto em imagem',poster:'Pôster',collage:'Colagem'};
  const m=openModal(titles[mode],`<canvas id="labCv" class="lab-cv"></canvas><div id="labCtl" class="lab-ctl"></div>`);
  const cv=m.querySelector('#labCv'),ctl=m.querySelector('#labCtl');let timer=0;
  const draw=()=>{cancelAnimationFrame(timer);timer=requestAnimationFrame(()=>renderDoc(cv,doc,Math.min(540,Math.round(window.innerWidth*.9))));};
  const fonts=(typeof FONTS!=='undefined'?FONTS:['Montserrat','Anton','Bebas Neue','Bangers','Pacifico','Playfair Display','Special Elite','Abril Fatface','Oswald']);
  const loadFonts=()=>Promise.all(doc.texts.map(t=>document.fonts?document.fonts.load(`${t.weight||800} 40px "${t.font}"`).catch(()=>{}):0));
  const rng=(label,key,min,max,step,fmt)=>`<label class="rg"><span>${label} <b>${fmt(doc[key])}</b></span><input type="range" data-d="${key}" min="${min}" max="${max}" step="${step}" value="${doc[key]}"></label>`;
  const pct=v=>Math.round(v*100)+' %';
  function build(){
   const textBlocks=doc.texts.map((t,i)=>`<div class="box"><h3>Texto ${i+1}</h3><label class="fld">Texto<textarea rows="2" data-t="${i}" data-k="text">${esc(t.text)}</textarea></label>
    <div class="row2"><label class="fld">Fonte<select data-t="${i}" data-k="font">${fonts.map(f=>`<option ${f===t.font?'selected':''}>${esc(f)}</option>`).join('')}</select></label><label class="fld">Alinhamento<select data-t="${i}" data-k="align">${[['center','Centro'],['left','Esquerda'],['right','Direita']].map(([v,n])=>`<option value="${v}" ${t.align===v?'selected':''}>${n}</option>`).join('')}</select></label></div>
    <label class="rg"><span>Tamanho <b>${t.size}</b></span><input type="range" data-t="${i}" data-k="size" min="3" max="24" step=".5" value="${t.size}"></label>
    <label class="rg"><span>Posição vertical <b>${t.y} %</b></span><input type="range" data-t="${i}" data-k="y" min="4" max="96" step="1" value="${t.y}"></label>
    <div class="row2"><label class="fld">Cor<input type="color" data-t="${i}" data-k="color" value="${t.color}"></label><label class="fld">Cor do contorno / caixa<input type="color" data-t="${i}" data-k="strokeColor" value="${t.strokeColor}"></label></div>
    <div class="checks"><label class="chk"><input type="checkbox" data-t="${i}" data-k="stroke" ${t.stroke?'checked':''}> Contorno</label><label class="chk"><input type="checkbox" data-t="${i}" data-k="box" ${t.box?'checked':''}> Caixa atrás</label><label class="chk"><input type="checkbox" data-t="${i}" data-k="upper" ${t.upper?'checked':''}> MAIÚSCULAS</label></div>
    <div class="btnrow"><button type="button" class="btn danger" data-del="${i}">Apagar texto</button></div></div>`).join('');
   const collage=mode==='collage'?`<div class="box"><h3>Fotos (${doc.images.length}/6)</h3><div class="btnrow"><button type="button" class="btn primary" id="labAddImgs">Escolher fotos</button><button type="button" class="btn" id="labAddFrame">Juntar frame do vídeo</button><button type="button" class="btn danger" id="labClearImgs">Limpar</button></div>
    ${TEMPLATES[doc.images.length]?`<label class="fld">Disposição<select id="labTpl">${TEMPLATES[doc.images.length].map(([n],i)=>`<option value="${i}" ${doc.template===i?'selected':''}>${n}</option>`).join('')}</select></label>`:'<p class="hint">Escolhe entre 2 e 6 fotos.</p>'}
    ${rng('Espaço entre fotos','gap',0,60,1,v=>v+' px')}${rng('Margem','margin',0,80,1,v=>v+' px')}${rng('Cantos arredondados','radius',0,80,1,v=>v+' px')}</div>`
    :`<div class="box"><h3>Imagem de fundo</h3><div class="btnrow"><button type="button" class="btn primary" id="labPickImg">Escolher imagem</button><button type="button" class="btn" id="labFrame">Frame do vídeo</button></div>
    ${rng('Zoom','zoom',1,3,.01,v=>v.toFixed(2)+'×')}${rng('Mover na horizontal','ox',-.5,.5,.01,pct)}${rng('Mover na vertical','oy',-.5,.5,.01,pct)}${rng('Escurecer','dim',0,.8,.01,pct)}${rng('Degradê em baixo','grad',0,1,.01,pct)}
    <label class="fld">Filtro<select id="labFilter">${FILTERS.map(([v,n])=>`<option value="${v}" ${doc.filter===v?'selected':''}>${n}</option>`).join('')}</select></label>${canFilter?'':'<p class="hint">Este navegador não suporta filtros.</p>'}</div>`;
   ctl.innerHTML=`<div class="box"><h3>Formato</h3><div class="row2"><label class="fld">Tamanho<select id="labSize">${SIZES.map(([n,w,h],i)=>`<option value="${i}" ${doc.w===w&&doc.h===h?'selected':''}>${n}</option>`).join('')}</select></label><label class="fld">Cor de fundo<input type="color" id="labBg" value="${doc.bg}"></label></div></div>${collage}${textBlocks}
    ${mode==='collage'?'':`<div class="btnrow"><button type="button" class="btn" id="labAddText" ${doc.texts.length>=4?'disabled':''}>+ Texto</button></div>`}
    <div class="btnrow"><button type="button" class="btn primary" id="labSave">Descarregar PNG</button>${hasLayers()?'<button type="button" class="btn" id="labUse">Usar como foto no projeto</button>':''}</div>`;
   wire();
  }
  async function exportBlob(){await loadFonts();const out=document.createElement('canvas');renderDoc(out,doc,doc.w);return blobOf(out);}
  function wire(){
   ctl.querySelectorAll('[data-d]').forEach(el=>el.oninput=()=>{doc[el.dataset.d]=Number(el.value);el.previousElementSibling.querySelector('b').textContent=el.dataset.d==='zoom'?doc.zoom.toFixed(2)+'×':['gap','margin','radius'].includes(el.dataset.d)?doc[el.dataset.d]+' px':Math.round(doc[el.dataset.d]*100)+' %';draw();});
   ctl.querySelectorAll('[data-t]').forEach(el=>{const t=doc.texts[+el.dataset.t],k=el.dataset.k;const h=async()=>{t[k]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(k==='font')await loadFonts();if(el.type==='range'){const b=el.previousElementSibling&&el.previousElementSibling.querySelector('b');if(b)b.textContent=k==='y'?t.y+' %':t.size;}draw();};el.addEventListener(el.type==='range'||el.tagName==='TEXTAREA'||el.type==='color'?'input':'change',h);});
   ctl.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{doc.texts.splice(+b.dataset.del,1);build();draw();});
   const on=(id,fn)=>{const e=ctl.querySelector('#'+id);if(e)e.onclick=fn;};
   const size=ctl.querySelector('#labSize');size.onchange=()=>{const s=SIZES[+size.value];doc.w=s[1];doc.h=s[2];draw();};
   ctl.querySelector('#labBg').oninput=e=>{doc.bg=e.target.value;draw();};
   const filter=ctl.querySelector('#labFilter');if(filter)filter.onchange=()=>{doc.filter=filter.value;draw();};
   const tpl=ctl.querySelector('#labTpl');if(tpl)tpl.onchange=()=>{doc.template=+tpl.value;draw();};
   on('labAddText',()=>{doc.texts.push(newText({text:'Novo texto',y:Math.min(90,30+doc.texts.length*20),size:7}));build();draw();});
   on('labPickImg',async()=>{try{const f=(await pickFiles('image/*'))[0];if(!f)return;doc.images=[await fileImage(f)];draw();}catch(e){toast(e.message,5000);}});
   on('labFrame',async()=>{try{const cv2=await captureFrame();doc.images=[{el:cv2,w:cv2.width,h:cv2.height,name:'frame'}];draw();}catch(e){toast(e.message,5000);}});
   on('labAddImgs',async()=>{try{const fs=await pickFiles('image/*',true);for(const f of fs){if(doc.images.length>=6)break;doc.images.push(await fileImage(f));}doc.template=0;build();draw();}catch(e){toast(e.message,5000);}});
   on('labAddFrame',async()=>{try{if(doc.images.length>=6)return toast('Máximo de 6 fotos.');const c2=await captureFrame();doc.images.push({el:c2,w:c2.width,h:c2.height,name:'frame'});doc.template=0;build();draw();}catch(e){toast(e.message,5000);}});
   on('labClearImgs',()=>{doc.images=[];build();draw();});
   on('labSave',async()=>{try{saveBlob(await exportBlob(),projName()+'-'+mode+'.png');}catch(e){toast(e.message,5000);}});
   on('labUse',async()=>{try{if(!S.clips.length)return toast('Importa primeiro o vídeo principal para usar a imagem como camada.',6000);const blob=await exportBlob();await lxImport(new File([blob],projName()+'-'+mode+'.png',{type:'image/png'}));closeModal();S.tab='layers';renderPanel();toast('Imagem adicionada como camada.');}catch(e){toast(e.message,6000);}});
  }
  await loadFonts();build();draw();m._cleanup=()=>cancelAnimationFrame(timer);
  return {doc,renderDoc};
 }

 /* ---------- Gravar e teleprompter ---------- */
 function pickMime(video){
  const list=video?['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm'];
  return list.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
 }
 async function openRecorder(video){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder)throw new Error('Este navegador não permite gravar.');
  pause();
  const m=openModal(video?'Câmara e teleprompter':'Gravar áudio',`<div class="lab-stage"><video id="recPrev" playsinline muted autoplay></video>${video?'<div id="tpBox" class="tp-box"><div id="tpText" class="tp-text"></div></div>':''}<div id="recTimer" class="rec-timer">0:00</div></div><div class="lab-ctl" id="recCtl"></div>`);
  const prev=m.querySelector('#recPrev'),ctl=m.querySelector('#recCtl');let stream=null,rec=null,chunks=[],t0=0,tick=0,tp=0,tpY=0,tpOn=false,tpLast=0,result=null;
  const stopStream=()=>{if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;};
  async function start(){
   stopStream();
   try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:video?{facingMode:L.facing,width:{ideal:1920},height:{ideal:1080}}:false});}
   catch(e){throw new Error('Sem permissão para usar '+(video?'a câmara e o microfone':'o microfone')+'.');}
   prev.srcObject=stream;prev.style.display=video?'block':'none';if(video)prev.style.transform=L.facing==='user'?'scaleX(-1)':'none';
  }
  const tpApply=()=>{const t=m.querySelector('#tpText'),b=m.querySelector('#tpBox');if(!t)return;t.textContent=L.tpText;t.style.fontSize=L.tpSize+'px';t.style.transform=`translateY(${-tpY}px) scaleX(${L.tpMirror?-1:1})`;if(b)b.style.display=L.tpText.trim()?'block':'none';};
  function tpLoop(now){if(!tpOn)return;const dt=Math.min(.1,(now-tpLast)/1000);tpLast=now;tpY+=L.tpSpeed*dt;tpApply();tp=requestAnimationFrame(tpLoop);}
  const tpStart=()=>{if(tpOn)return;tpOn=true;tpLast=performance.now();tp=requestAnimationFrame(tpLoop);};
  const tpStop=()=>{tpOn=false;cancelAnimationFrame(tp);};
  function ui(state){
   const tpUi=video?`<div class="box"><h3>Teleprompter</h3><label class="fld">Guião<textarea id="tpIn" rows="4">${esc(L.tpText)}</textarea></label><label class="rg"><span>Velocidade <b>${L.tpSpeed}</b></span><input type="range" id="tpSpeed" min="10" max="160" step="5" value="${L.tpSpeed}"></label><label class="rg"><span>Tamanho do texto <b>${L.tpSize}</b></span><input type="range" id="tpSize" min="16" max="64" step="1" value="${L.tpSize}"></label><div class="checks"><label class="chk"><input type="checkbox" id="tpMirror" ${L.tpMirror?'checked':''}> Espelhar texto</label></div><div class="btnrow"><button type="button" class="btn" id="tpPlay">Ensaiar</button><button type="button" class="btn" id="tpReset">Voltar ao início</button><button type="button" class="btn" id="camFlip">Trocar câmara</button></div></div>`:'';
   const main=state==='done'?`<div class="box"><h3>Gravação pronta</h3>${video?'<video id="recOut" controls playsinline></video>':'<audio id="recOut" controls></audio>'}<div class="btnrow"><button type="button" class="btn primary" id="recUse">${video?'Usar como vídeo principal':'Usar como áudio no projeto'}</button><button type="button" class="btn" id="recSave">Descarregar</button><button type="button" class="btn" id="recAgain">Gravar de novo</button></div></div>`
    :`<div class="btnrow"><button type="button" class="btn primary" id="recGo">${state==='rec'?'Parar gravação':'Gravar'}</button></div>`;
   ctl.innerHTML=main+tpUi;
   if(state==='done'){const out=ctl.querySelector('#recOut');out.src=URL.createObjectURL(result.blob);
    ctl.querySelector('#recSave').onclick=()=>saveBlob(result.blob,projName()+'-gravacao.'+result.ext);
    ctl.querySelector('#recAgain').onclick=async()=>{try{result=null;await start();ui('idle');}catch(e){toast(e.message,6000);}};
    ctl.querySelector('#recUse').onclick=async()=>{try{const f=new File([result.blob],'gravacao-'+Date.now()+'.'+result.ext,{type:result.blob.type});
     if(video){if(typeof importFiles!=='function')throw new Error('Importação indisponível.');await importFiles([f]);}else{if(!hasLayers())throw new Error('Camadas indisponíveis.');if(!S.clips.length)throw new Error('Importa primeiro o vídeo principal.');await lxImport(f);S.tab='layers';}
     closeModal();renderPanel();toast('Gravação adicionada ao projeto.');}catch(e){toast(e.message,6000);}};}
   else ctl.querySelector('#recGo').onclick=state==='rec'?stopRec:startRec;
   if(video){
    ctl.querySelector('#tpIn').oninput=e=>{L.tpText=e.target.value;tpApply();};
    ctl.querySelector('#tpSpeed').oninput=e=>{L.tpSpeed=+e.target.value;e.target.previousElementSibling.querySelector('b').textContent=L.tpSpeed;};
    ctl.querySelector('#tpSize').oninput=e=>{L.tpSize=+e.target.value;e.target.previousElementSibling.querySelector('b').textContent=L.tpSize;tpApply();};
    ctl.querySelector('#tpMirror').onchange=e=>{L.tpMirror=e.target.checked;tpApply();};
    ctl.querySelector('#tpPlay').onclick=()=>{if(tpOn)tpStop();else tpStart();};
    ctl.querySelector('#tpReset').onclick=()=>{tpY=0;tpApply();};
    ctl.querySelector('#camFlip').onclick=async()=>{L.facing=L.facing==='user'?'environment':'user';try{await start();}catch(e){toast(e.message,6000);}};
    tpApply();
   }
  }
  function startRec(){
   const mime=pickMime(video);chunks=[];rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
   rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
   rec.onstop=()=>{clearInterval(tick);tpStop();const type=rec.mimeType||mime||(video?'video/webm':'audio/webm'),blob=new Blob(chunks,{type});result={blob,ext:type.includes('mp4')?(video?'mp4':'m4a'):'webm'};stopStream();ui('done');};
   rec.start(500);t0=Date.now();tick=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);m.querySelector('#recTimer').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');},250);
   if(video){tpY=0;tpStart();}ui('rec');
  }
  function stopRec(){if(rec&&rec.state!=='inactive')rec.stop();}
  m._cleanup=()=>{clearInterval(tick);tpStop();if(rec&&rec.state!=='inactive'){rec.onstop=null;try{rec.stop();}catch(e){}}stopStream();};
  await start();ui('idle');
  return {stop:stopRec};
 }

 /* ---------- Separador Estúdio ---------- */
 function css(){return `.lab-modal{position:fixed;inset:0;z-index:200;background:#0d0a0cf2;display:flex;flex-direction:column;color:var(--tx,#fff)}.lab-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #ffffff22}.lab-body{flex:1;min-height:0;overflow:auto;padding:10px 12px 40px;display:flex;flex-direction:column;gap:10px}.lab-cv{width:100%;max-width:420px;margin:0 auto;display:block;background:#000;border-radius:8px;max-height:50dvh;object-fit:contain}.lab-ctl{display:flex;flex-direction:column;gap:10px;max-width:520px;width:100%;margin:0 auto}.lab-stage{position:relative;max-width:420px;width:100%;margin:0 auto;background:#000;border-radius:8px;overflow:hidden;min-height:120px}.lab-stage video{width:100%;max-height:50dvh;display:block}.rec-timer{position:absolute;top:8px;left:8px;background:#000a;padding:2px 8px;border-radius:10px;font-size:13px}.tp-box{position:absolute;inset:8% 6% 8% 6%;overflow:hidden;background:#0007;border-radius:8px;pointer-events:none}.tp-text{padding:30% 6% 60%;white-space:pre-wrap;text-align:center;font-weight:700;line-height:1.35;text-shadow:0 1px 3px #000}.lab-card{display:flex;flex-direction:column;gap:6px}.lab-card p{margin:0}`;}
 function sliderHTML(label,id,min,max,step,val,fmt){return `<label class="rg"><span>${label} <b id="${id}Out">${fmt(val)}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;}
 L.autoThr=true;L.thr=-38;L.minSil=.45;L.pad=.1;L.target='clip';
 function studioHTML(){
  const sil=L.sil,layerSel=hasLayers()&&typeof lxSelected==='function'?lxSelected():null;
  return `<div class="box lab-card"><h3>Imagem</h3><p class="hint">Ferramentas de imagem que correm no aparelho.</p>
   <div class="btnrow"><button class="btn" data-lab="frame">Capturar frame</button><button class="btn" data-lab="cover">Criador de capas</button><button class="btn" data-lab="text">Texto em imagem</button><button class="btn" data-lab="poster">Pôster</button><button class="btn" data-lab="collage">Colagem</button></div></div>
  <div class="box lab-card"><h3>Cortar silêncios</h3><p class="hint">Analisa o som do vídeo e remove as pausas, sem IA externa. Os textos, as legendas e as camadas não acompanham o corte: gera as legendas depois.</p>
   <label class="chk"><input type="checkbox" id="silAuto" ${L.autoThr?'checked':''}> Limite automático</label>
   ${sliderHTML('Limite de silêncio','silThr',-60,-20,1,L.thr,v=>v+' dB')}${sliderHTML('Pausa mínima a cortar','silMin',.2,2,.05,L.minSil,v=>v.toFixed(2)+' s')}${sliderHTML('Folga à volta da fala','silPad',0,.4,.01,L.pad,v=>v.toFixed(2)+' s')}
   <div class="btnrow"><button class="btn" data-lab="analyze" ${L.busy?'disabled':''}>Analisar</button><button class="btn primary" data-lab="applysil" ${sil?'':'disabled'}>Cortar silêncios</button></div>
   <p class="hint" id="silInfo">${sil?`Vai remover ${sil.removed.toFixed(1)} s de ${sil.total.toFixed(1)} s (${sil.pauses} cortes). Podes desfazer.`:'Ainda sem análise.'}</p></div>
  <div class="box lab-card"><h3>Aprimorar automaticamente</h3><p class="hint">Mede a luz e a cor do frame atual e ajusta brilho, contraste e saturação. É um ajuste automático simples, não IA generativa.</p>
   ${layerSel&&layerSel.kind!=='audio'?`<label class="fld">Aplicar a<select id="enhTarget"><option value="clip" ${L.target==='clip'?'selected':''}>Clipe principal</option><option value="layer" ${L.target==='layer'?'selected':''}>Camada selecionada</option></select></label>`:''}
   <div class="btnrow"><button class="btn" data-lab="enhance">Aprimorar</button></div></div>
  <div class="box lab-card"><h3>Transcrição</h3><p class="hint">Exporta as legendas do projeto como texto ou ficheiro de legendas.</p>
   <div class="btnrow"><button class="btn" data-lab="txt">Texto (.txt)</button><button class="btn" data-lab="srt">Legendas (.srt)</button><button class="btn" data-lab="vtt">Web (.vtt)</button></div></div>
  <div class="box lab-card"><h3>Gravar</h3><p class="hint">A gravação usa a câmara e o microfone do aparelho e pede permissão. O teleprompter só aparece no ecrã durante a gravação, não fica no ficheiro.</p>
   <div class="btnrow"><button class="btn" data-lab="rec-video">Câmara com teleprompter</button><button class="btn" data-lab="rec-audio">Gravar áudio</button></div></div>
  <div class="box lab-card"><h3>Não incluído</h3><p class="hint">Avatares, vídeo e imagem de IA, expansão por IA, efeitos de IA e remoção de objetos precisam de modelos externos e ficaram de fora.</p></div>`;
 }
 async function guard(fn,busyMsg){try{return await fn();}catch(e){toast(e.message||String(e),7000);}}
 function bindStudio(){
  const body=$('panelBody');
  const num=(id,key,fmt)=>{const el=body.querySelector('#'+id);if(!el)return;el.oninput=()=>{L[key]=Number(el.value);body.querySelector('#'+id+'Out').textContent=fmt(L[key]);L.sil=null;const b=body.querySelector('[data-lab=applysil]');if(b)b.disabled=true;};};
  num('silThr','thr',v=>v+' dB');num('silMin','minSil',v=>v.toFixed(2)+' s');num('silPad','pad',v=>v.toFixed(2)+' s');
  const auto=body.querySelector('#silAuto');if(auto)auto.onchange=()=>{L.autoThr=auto.checked;L.sil=null;};
  const tgt=body.querySelector('#enhTarget');if(tgt)tgt.onchange=()=>{L.target=tgt.value;};
  body.querySelectorAll('[data-lab]').forEach(b=>b.onclick=()=>guard(async()=>{
   const k=b.dataset.lab;
   if(k==='frame'){const c=await captureFrame();const blob=await blobOf(c);saveBlob(blob,projName()+'-frame-'+S.t.toFixed(2)+'s.png');toast('Frame guardado em PNG.');}
   else if(['cover','text','poster','collage'].includes(k)){let seed=null;if((k==='cover'||k==='poster'||k==='text')&&S.clips.length&&k==='cover'){const c=await captureFrame();seed={el:c,w:c.width,h:c.height,name:'frame'};}await openImageEditor(k,seed);}
   else if(k==='analyze'){L.busy=true;body.querySelector('#silInfo').textContent='A analisar o som…';try{await analyzeAll();}finally{L.busy=false;}renderPanel();}
   else if(k==='applysil'){applySilence();toast('Silêncios removidos. Podes desfazer.',5000);S.tab='studio';renderPanel();}
   else if(k==='enhance'){toast(enhance(),6000);}
   else if(['txt','srt','vtt'].includes(k))exportTranscript(k);
   else if(k==='rec-video')await openRecorder(true);
   else if(k==='rec-audio')await openRecorder(false);
  }));
 }
 TABS.splice(TABS.length-1,0,['studio','Estúdio']);
 const panelPrevious=renderPanel;
 renderPanel=function(){
  if(S.tab!=='studio')return panelPrevious();
  renderTabs();$('panelBody').innerHTML=studioHTML();bindStudio();
 };
 window.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css();document.head.appendChild(s);});
 window.FenixLab={analyzeSilence,piecesFor,frameStats,suggestFx,suggestLayer,transcript,layoutSlots,TEMPLATES,renderDoc,drawText,openImageEditor,openRecorder,captureFrame,closeModal,pickMime,applySilence,_state:L};
})();
