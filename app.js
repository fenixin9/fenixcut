
'use strict';
const $=id=>document.getElementById(id);
const S={ratio:[9,16],fit:'cover',clips:[],texts:[],caps:[],
  capStyle:{preset:'pop',size:70,y:72,font:'auto',upper:false,hi:'#ffd23f',color:'#ffffff',offset:0,bgc:'#000000',pal:['#ffffff','#f6e05e','#e8ddc0','#ff6b6b','#111111'],palMode:'multi',one:'#f6e05e',ransomHi:false},
  t:0,total:0,playing:false,sel:null,tab:'clip',pps:60,exporting:false,aiLog:null};
const SRC={};let uid=1;const nid=()=>'i'+(uid++);
const FONTS=['Montserrat','Anton','Bebas Neue','Bangers','Pacifico','Satoshi'];
const ALL_FONTS=[...new Set([...FONTS,...PAPER_FONTS])];
const ICON={
 play:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
 pause:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
 split:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
 trash:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
 undo:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
 plus:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 expand:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 14 5-5 5 5"/></svg>'
};
const fmt=t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=t-m*60;return `${m}:${s.toFixed(1).padStart(4,'0')}`;};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(msg,ms=3500){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),ms);}
const LOG=[];
function logErr(m){LOG.push(new Date().toISOString().slice(11,19)+' '+m);if(LOG.length>40)LOG.shift();}
window.addEventListener('error',e=>{logErr((e.message||'erro')+' @'+String(e.filename||'').split('/').pop()+':'+e.lineno);});
window.addEventListener('unhandledrejection',e=>{logErr('promise: '+((e.reason&&e.reason.message)||e.reason));});
const CFG=(()=>{try{return JSON.parse(localStorage.getItem('fenixcut')||'{}');}catch(e){return{};}})();
const saveCFG=()=>{try{localStorage.setItem('fenixcut',JSON.stringify(CFG));}catch(e){}};
let _cfgImported=false;
(function(){
  const h=location.hash;
  if(h.indexOf('#cfg=')===0){
    try{const o=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(h.slice(5))))));Object.assign(CFG,o);saveCFG();_cfgImported=true;}catch(e){}
    try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  }
})();
const b64enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))));

/* ---------- modelo ---------- */
function layout(){let t=0;for(const c of S.clips){c.tStart=t;c.dur=Math.max(0.05,(c.out-c.in)/c.speed);t+=c.dur;}S.total=t;}
function clipAt(t){for(const c of S.clips)if(t>=c.tStart&&t<c.tStart+c.dur)return c;return null;}
function srcTimeAt(c,t){return Math.min(c.out-0.001,c.in+(t-c.tStart)*c.speed);}
const hist=[];let hi=-1;
const snap=()=>JSON.stringify({clips:S.clips,texts:S.texts,caps:S.caps,capStyle:S.capStyle,ratio:S.ratio,fit:S.fit});
function commit(){const s=snap();if(hist[hi]===s)return;hist.length=hi+1;hist.push(s);hi=hist.length-1;if(hist.length>60){hist.shift();hi--;}}
function undo(){if(hi<=0)return toast('Nada para desfazer.');hi--;const o=JSON.parse(hist[hi]);Object.assign(S,{clips:o.clips,texts:o.texts,caps:o.caps,capStyle:o.capStyle,ratio:o.ratio,fit:o.fit});S.sel=null;$('ratio').value=S.ratio.join(':');initRenderer();refreshAll(true);}
function selClip(){if(S.sel&&S.sel.type==='clip'){const c=S.clips.find(x=>x.id===S.sel.id);if(c)return c;}return clipAt(S.t)||S.clips[0]||null;}
const selText=()=>S.sel&&S.sel.type==='text'?S.texts.find(x=>x.id===S.sel.id):null;

/* ---------- renderer / preview ---------- */
let R=null,dirty=true,thumbDirty=true;
const invalidate=()=>{dirty=true;thumbDirty=true;};
function initRenderer(){
  if(R)R.dispose();
  const[w,h]=dimsFor(480);const cv=$('preview');
  R=createRenderer(w,h,cv);cv.style.aspectRatio=`${w}/${h}`;invalidate();
  if(TRr){TRr.dispose();TRr=null;}
}
function renderScene(r,t,ovr){
  const c=ovr?ovr.clip:clipAt(t);
  if(c){const src=SRC[c.src];r.draw(ovr?ovr.img:src.video,sceneParams(c,t-c.tStart,r.w/r.h,src));}
  else r.black();
  drawOverlays(r.ctx,r.w,r.h,t);
}
function seekVideo(v,t){
  if(Math.abs(v.currentTime-t)<0.01)return;
  const now=performance.now();
  if(v._seeking&&now-v._seekAt<400){v._pending=t;return;}
  v._seeking=true;v._seekAt=now;v.currentTime=t;
}
function hookVideo(v){
  v.addEventListener('seeked',()=>{v._seeking=false;if(v._pending!=null){const p=v._pending;v._pending=null;seekVideo(v,p);}invalidate();});
  v.addEventListener('loadeddata',invalidate);
}
const PREV={id:null};
function syncPlayback(t,act,force){
  const c=clipAt(t);
  if(!c){if(act.id){const o=S.clips.find(x=>x.id===act.id);o&&SRC[o.src].video.pause();act.id=null;}return;}
  const v=SRC[c.src].video,want=srcTimeAt(c,t);
  if(act.id!==c.id||force){
    const prev=S.clips.find(x=>x.id===act.id);
    if(prev&&prev.src!==c.src)SRC[prev.src].video.pause();
    v.muted=false;v.volume=Math.min(1,c.vol);v.playbackRate=c.speed;
    if(Math.abs(v.currentTime-want)>0.25||force)v.currentTime=want;
    v.play().catch(()=>{});act.id=c.id;
  }else if(Math.abs(v.currentTime-want)>0.35){v.currentTime=want;}
}
function unlockAll(){
  const ps=[];
  for(const id in SRC){const v=SRC[id].video;if(v._unl)continue;v._unl=true;v.muted=true;
    ps.push(v.play().then(()=>{v.pause();}).catch(()=>{v._unl=false;}));}
  return Promise.all(ps);
}
let playWall=0,playT0=0;
async function play(){
  if(!S.total||S.exporting)return;
  await unlockAll();
  if(S.t>=S.total-0.05)S.t=0;
  S.playing=true;playWall=performance.now();playT0=S.t;PREV.id=null;syncPlayback(S.t,PREV,true);setPlayIcon();
}
function pause(){S.playing=false;S.clips.forEach(c=>SRC[c.src].video.pause());PREV.id=null;setPlayIcon();invalidate();}
function setT(t){
  S.t=Math.max(0,Math.min(S.total,t));
  if(S.playing){playWall=performance.now();playT0=S.t;syncPlayback(S.t,PREV,true);}
  else{const c=clipAt(S.t);if(c)seekVideo(SRC[c.src].video,srcTimeAt(c,S.t));}
  invalidate();
}
function setPlayIcon(){$('btnPlay').innerHTML=S.playing?ICON.pause:ICON.play;}

/* ---------- miniaturas (efeitos, transições, textos) ---------- */
let TRr=null,SNAP=null,lastTh=0,lastAnim=0,lastSnap=0;
function thumbDims(){const[w,h]=dimsFor(110);return[w,h];}
function ensureTR(){const[tw,th]=thumbDims();if(!TRr||TRr.w!==tw||TRr.h!==th){if(TRr)TRr.dispose();TRr=createRenderer(tw,th);}}
function snapFrame(){
  const c=selClip();if(!c)return null;const v=SRC[c.src].video;if(v.readyState<2||!v.videoWidth)return null;
  const w=240,h=Math.max(2,Math.round(240*v.videoHeight/v.videoWidth));
  if(!SNAP||SNAP.width!==w||SNAP.height!==h){SNAP=document.createElement('canvas');SNAP.width=w;SNAP.height=h;}
  try{SNAP.getContext('2d').drawImage(v,0,0,w,h);}catch(e){return null;}
  return{img:SNAP,vw:w,vh:h,clip:c};
}
function sizeThumbs(sel){const[tw,th]=thumbDims();document.querySelectorAll(sel).forEach(cv=>{if(cv.width!==tw||cv.height!==th){cv.width=tw;cv.height=th;}});}
function placeholder(cv){const ctx=thumbBG(cv);ctx.fillStyle='rgba(255,255,255,.35)';ctx.font=`${Math.round(cv.height/9)}px sans-serif`;ctx.textAlign='center';ctx.fillText('sem vídeo',cv.width/2,cv.height/2);}
function drawFxThumbs(){
  const cvs=document.querySelectorAll('canvas[data-fx]');if(!cvs.length)return;
  sizeThumbs('canvas[data-fx]');
  const sf=snapFrame();if(!sf){cvs.forEach(placeholder);return;}
  ensureTR();const asp=TRr.w/TRr.h;
  cvs.forEach(cv=>{
    const p=PRESETS[cv.dataset.fx];if(!p)return;
    const fake={fx:Object.assign({},FX_DEFAULT,p.v),trans:{type:'none',dur:0.5},kb:0,dur:1};
    TRr.draw(sf.img,sceneParams(fake,0.5,asp,{vw:sf.vw,vh:sf.vh}));
    cv.getContext('2d').drawImage(TRr.out,0,0);
  });
}
function drawTransThumbs(now){
  const cvs=document.querySelectorAll('canvas[data-tr]');if(!cvs.length)return;
  sizeThumbs('canvas[data-tr]');
  if(now-lastSnap>500||!SNAP){lastSnap=now;snapFrame();}
  const sf=SNAP&&selClip()?{img:SNAP,vw:SNAP.width,vh:SNAP.height}:null;if(!sf){cvs.forEach(placeholder);return;}
  ensureTR();const asp=TRr.w/TRr.h,c=selClip();
  const cyc=(now/1000)%2.2,local=cyc<1.1?cyc:9;
  cvs.forEach(cv=>{
    const fake={fx:c.fx,trans:{type:cv.dataset.tr,dur:1.1},kb:0,dur:1};
    TRr.draw(sf.img,sceneParams(fake,local,asp,{vw:sf.vw,vh:sf.vh}));
    cv.getContext('2d').drawImage(TRr.out,0,0);
  });
}
function drawAnimThumbs(now){
  const x=selText();const st=x?x.style:'impact';
  document.querySelectorAll('canvas[data-anim]').forEach(cv=>drawAnimThumb(cv,cv.dataset.anim,now/1000,st));
}
function drawThumbs(){
  document.querySelectorAll('canvas[data-style]').forEach(cv=>{try{drawStyleThumb(cv,cv.dataset.style);}catch(e){}});
  document.querySelectorAll('canvas[data-tstyle]').forEach(cv=>{try{drawTextStyleThumb(cv,cv.dataset.tstyle);}catch(e){}});
}
let lastTT='',lastPH=-1;
function tick(now){
  if(!S.exporting){
    if(S.playing){
      let t=playT0+(now-playWall)/1000;
      const c=clipAt(S.t),v=c&&SRC[c.src].video;
      if(v){
        if(!v.paused&&!v.seeking&&v.readyState>=3){
          const vt=c.tStart+(v.currentTime-c.in)/c.speed;
          if(Math.abs(vt-t)<0.6){t=vt;}
        }else if(v.seeking||(!v.paused&&v.readyState<3)){t=S.t;}
      }
      playT0=t;playWall=now;S.t=t;
      if(S.t>=S.total){S.t=S.total;pause();}else syncPlayback(S.t,PREV,false);
      dirty=true;
    }
    if(dirty&&R){dirty=false;try{renderScene(R,S.t);}catch(e){logErr('render: '+e.message);}}
    try{
      if(S.tab==='fx'&&thumbDirty&&!S.playing&&now-lastTh>300){thumbDirty=false;lastTh=now;drawFxThumbs();}
      else if(S.tab==='trans'&&now-lastAnim>60){lastAnim=now;drawTransThumbs(now);}
      else if(S.tab==='text'&&now-lastAnim>60){lastAnim=now;drawAnimThumbs(now);}
    }catch(e){logErr('miniaturas: '+e.message);}
    const tt=`${fmt(S.t)} / ${fmt(S.total)}`;if(tt!==lastTT){lastTT=tt;$('time').textContent=tt;}
    const px=Math.round(S.t*S.pps);if(px!==lastPH){lastPH=px;$('playhead').style.transform=`translateX(${px}px)`;}
    if(S.playing){const sc=$('tlScroll');if(px>sc.scrollLeft+sc.clientWidth-40||px<sc.scrollLeft)sc.scrollLeft=px-60;}
  }
  requestAnimationFrame(tick);
}

/* ---------- importação ---------- */
async function importFiles(files){
  for(const f of files){
    try{
      const id=nid(),url=URL.createObjectURL(f),v=document.createElement('video');
      v.src=url;v.preload='auto';v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
      hookVideo(v);$('hiddenVideos').appendChild(v);
      await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=()=>rej(new Error('Formato não suportado neste navegador: '+f.name));});
      if(!isFinite(v.duration))throw new Error('Duração desconhecida: '+f.name);
      SRC[id]={id,file:f,url,video:v,dur:v.duration,vw:v.videoWidth,vh:v.videoHeight,name:f.name};
      if(!S.clips.length){S.ratio=v.videoWidth>=v.videoHeight?[16,9]:[9,16];$('ratio').value=S.ratio.join(':');initRenderer();}
      S.clips.push({id:nid(),src:id,name:f.name.replace(/\.[^.]+$/,''),in:0,out:v.duration,speed:1,vol:1,fx:Object.assign({preset:'original'},FX_DEFAULT),trans:{type:'none',dur:0.5},kb:0});
    }catch(e){logErr(e.message);toast(e.message,5000);}
  }
  commit();refreshAll(true);
}

/* ---------- ações ---------- */
function splitAt(){
  const c=clipAt(S.t);if(!c)return toast('Põe a agulha sobre um clipe.');
  const st=srcTimeAt(c,S.t);if(st<c.in+0.1||st>c.out-0.1)return toast('Muito perto do início/fim do clipe.');
  const n=JSON.parse(JSON.stringify(c));n.id=nid();n.in=st;n.trans={type:'none',dur:0.5};n.kb=0;c.out=st;
  S.clips.splice(S.clips.indexOf(c)+1,0,n);commit();refreshAll();
}
function deleteSel(){
  const s=S.sel;
  if(s&&s.type==='text')S.texts=S.texts.filter(x=>x.id!==s.id);
  else if(s&&s.type==='cap')S.caps=S.caps.filter(x=>x.id!==s.id);
  else{const c=selClip();if(!c)return;S.clips=S.clips.filter(x=>x!==c);}
  S.sel=null;layout();if(S.t>S.total)S.t=0;commit();refreshAll(true);
}
function moveClip(d){const c=selClip();if(!c)return;const i=S.clips.indexOf(c),j=i+d;if(j<0||j>=S.clips.length)return;S.clips.splice(i,1);S.clips.splice(j,0,c);commit();refreshAll();}
function dupClip(){const c=selClip();if(!c)return;const n=JSON.parse(JSON.stringify(c));n.id=nid();S.clips.splice(S.clips.indexOf(c)+1,0,n);commit();refreshAll();}

/* ---------- timeline ---------- */
function renderTimeline(){
  const pps=S.pps,W=Math.max(S.total,6)*pps+120;$('tlInner').style.width=W+'px';
  let rl='';const step=pps>=80?1:pps>=40?2:5;
  for(let s=0;s<=Math.max(S.total,6)+2;s+=step)rl+=`<span style="left:${s*pps}px">${s}s</span>`;
  $('ruler').innerHTML=rl;
  const sel=S.sel,selId=sel?sel.id:(selClip()||{}).id;
  $('trClips').innerHTML=S.clips.map(c=>`<div class="blk clip${c.id===selId&&(!sel||sel.type==='clip')?' sel':''}" data-t="clip" data-id="${c.id}" style="left:${c.tStart*pps}px;width:${Math.max(8,c.dur*pps-2)}px"><span>${esc(c.name)}</span><small>${fmt(c.dur)}${c.speed!==1?' · '+c.speed+'×':''}</small></div>`).join('');
  $('trTexts').innerHTML=S.texts.map(x=>`<div class="blk text${sel&&sel.id===x.id?' sel':''}" data-t="text" data-id="${x.id}" style="left:${x.start*pps}px;width:${Math.max(8,x.dur*pps-2)}px"><span>${esc(x.text)}</span></div>`).join('');
  $('trCaps').innerHTML=S.caps.map(x=>`<div class="blk cap${sel&&sel.id===x.id?' sel':''}" data-t="cap" data-id="${x.id}" style="left:${x.start*pps}px;width:${Math.max(6,(x.end-x.start)*pps-1)}px"><span>${esc(x.text)}</span></div>`).join('');
  lastPH=-1;
}
function bindTimeline(){
  const inner=$('tlInner'),ruler=$('ruler');let drag=false;
  const at=e=>Math.max(0,(e.clientX-inner.getBoundingClientRect().left)/S.pps);
  ruler.addEventListener('pointerdown',e=>{drag=true;ruler.setPointerCapture(e.pointerId);setT(at(e));});
  ruler.addEventListener('pointermove',e=>{if(drag)setT(at(e));});
  ['pointerup','pointercancel'].forEach(n=>ruler.addEventListener(n,()=>{drag=false;}));
  inner.addEventListener('click',e=>{
    if(e.target.closest('#ruler'))return;
    const b=e.target.closest('.blk'),prev=S.sel?S.sel.id:null;
    if(b){S.sel={type:b.dataset.t,id:b.dataset.id};if(b.dataset.t==='text')S.tab='text';else if(b.dataset.t==='cap')S.tab='caps';else if(S.tab==='text'||S.tab==='caps')S.tab='clip';}
    else S.sel=null;
    setT(at(e));renderTimeline();
    if(b||prev)renderPanel();
  });
  $('zoom').addEventListener('input',e=>{S.pps=+e.target.value;renderTimeline();});
}

/* ---------- painéis ---------- */
const TABS=[['clip','Clipe'],['fx','Efeitos'],['trans','Transições'],['text','Texto'],['caps','Legendas'],['ai','IA'],['exp','Exportar']];
function renderTabs(){$('tabs').innerHTML=TABS.map(([k,n])=>`<button role="tab" class="${S.tab===k?'on':''}" data-tab="${k}">${n}</button>`).join('');}
const rng=(sc,k,label,min,max,step,val,f)=>`<label class="rg"><span>${label}<b data-out="${sc}.${k}">${f?f(val):val}</b></span><input type="range" data-sc="${sc}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
const fmtX=v=>(+v).toFixed(2)+'×',fmtP=v=>Math.round(v*100)+'%',fmtN=v=>(+v).toFixed(2),fmtS=v=>(v>0?'+':'')+(+v).toFixed(2)+'s';
const empty=m=>`<div class="emptyp"><p>${m}</p></div>`;
let lastTab=null;
function renderPanel(){
  renderTabs();const b=$('panelBody');const keep=lastTab===S.tab?b.scrollTop:0;
  const fn={clip:pClip,fx:pFx,trans:pTrans,text:pText,caps:pCaps,ai:pAI,exp:pExp}[S.tab];
  try{b.innerHTML=fn();bindPanel(b);}catch(e){logErr('painel: '+e.message);b.innerHTML=empty('Erro no painel: '+esc(e.message));}
  b.scrollTop=keep;lastTab=S.tab;
  if(S.tab==='exp')probeExport();
  if(S.tab==='caps'||S.tab==='text')drawThumbs();
  if(S.tab==='fx'){thumbDirty=true;lastTh=0;}
}
function pClip(){
  const c=selClip();if(!c)return empty('Importa um ou mais vídeos para começar a editar.');
  const src=SRC[c.src];
  return `<div class="btnrow"><button class="btn" data-act="split">${ICON.split} Dividir</button><button class="btn" data-act="dup">Duplicar</button><button class="btn" data-act="left">◀ Mover</button><button class="btn" data-act="right">Mover ▶</button><button class="btn danger" data-act="del">${ICON.trash} Apagar</button></div>
  ${rng('clip','speed','Velocidade',0.25,4,0.05,c.speed,fmtX)}
  ${rng('clip','vol','Volume',0,1,0.01,Math.min(1,c.vol),fmtP)}
  ${rng('clip','kb','Zoom lento (Ken Burns)',0,0.4,0.01,c.kb,fmtP)}
  <div class="row2"><label class="fld">Início (s)<input type="number" data-sc="clip" data-k="in" data-int="1" min="0" max="${src.dur.toFixed(2)}" step="0.1" value="${c.in.toFixed(2)}"></label>
  <label class="fld">Fim (s)<input type="number" data-sc="clip" data-k="out" data-int="1" min="0" max="${src.dur.toFixed(2)}" step="0.1" value="${c.out.toFixed(2)}"></label></div>
  <label class="fld">Enquadramento do projeto<select data-sc="proj" data-k="fit"><option value="cover" ${S.fit==='cover'?'selected':''}>Preencher (corta)</option><option value="contain" ${S.fit==='contain'?'selected':''}>Caber (barras pretas)</option></select></label>
  <p class="hint">Fonte: ${esc(src.name)} · ${src.vw}×${src.vh} · ${fmt(src.dur)}</p>`;
}
function pFx(){
  const c=selClip();if(!c)return empty('Importa um vídeo para aplicar efeitos.');
  return `<div class="thumbgrid">${Object.entries(PRESETS).map(([k,p])=>`<button class="thumbcard ${c.fx.preset===k?'on':''}" data-preset="${k}" aria-label="${p.n}"><canvas data-fx="${k}" width="110" height="196"></canvas><span>${p.n}</span></button>`).join('')}</div>
  <div class="btnrow"><button class="btn" data-act="fxall">Aplicar a todos os clipes</button></div>
  ${FX_RANGES.map(([k,l,mn,mx,st])=>rng('fx',k,l,mn,mx,st,c.fx[k],fmtN)).join('')}
  <label class="chk"><input type="checkbox" data-sc="fx" data-k="mirror" data-num="1" ${c.fx.mirror?'checked':''}> Espelhar</label>`;
}
function pTrans(){
  const c=selClip();if(!c)return empty('Importa um vídeo para escolher transições.');
  return `<p class="hint">A transição aplica-se ao início do clipe selecionado (entrada). As miniaturas mostram o movimento.</p>
  <div class="thumbgrid">${Object.entries(TRANS).map(([k,n])=>`<button class="thumbcard ${c.trans.type===k?'on':''}" data-trans="${k}" aria-label="${n}"><canvas data-tr="${k}" width="110" height="196"></canvas><span>${n}</span></button>`).join('')}</div>
  ${rng('trans','dur','Duração',0.2,2,0.05,c.trans.dur,v=>(+v).toFixed(2)+'s')}
  <div class="btnrow"><button class="btn" data-act="transall">Aplicar a todos os clipes</button></div>`;
}
function pText(){
  const x=selText();
  let h=`<div class="btnrow"><button class="btn primary" data-act="addtext">${ICON.plus} Adicionar texto</button>${x?`<button class="btn danger" data-act="del">${ICON.trash} Apagar</button>`:''}</div>`;
  if(!x)return h+empty(S.texts.length?'Toca num texto na timeline para o editar.':'Ainda sem textos. Adiciona o primeiro.');
  const styles=TEXT_STYLES.map(k=>`<button class="stylecard ${x.style===k?'on':''}" data-tstyle="${k}" aria-label="${TEXT_STYLE_NAMES[k]}"><canvas data-tstyle="${k}" width="300" height="130"></canvas><span>${TEXT_STYLE_NAMES[k]}</span></button>`).join('');
  const anims=[['none','Nenhuma'],['pop','Pop'],['fade','Fade'],['slide','Subir'],['type','Máquina']].map(([k,n])=>`<button class="stylecard ${x.anim===k?'on':''}" data-tanim="${k}" aria-label="${n}"><canvas data-anim="${k}" width="300" height="130"></canvas><span>${n}</span></button>`).join('');
  const sw=HI_COLORS.map(c=>`<button class="swatch ${x.hi===c?'on':''}" data-thi="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('');
  return h+`<label class="fld">Texto<textarea data-sc="text" data-k="text" rows="2">${esc(x.text)}</textarea></label>
  <p class="hint">Estilo</p><div class="stylegrid">${styles}</div>
  <p class="hint">Animação</p><div class="stylegrid">${anims}</div>
  <p class="hint">Cor de destaque / fundo</p><div class="swatches">${sw}<input type="color" data-sc="text" data-k="hi" value="${x.hi}" aria-label="Cor personalizada"></div>
  <div class="row2"><label class="fld">Cor do texto<input type="color" data-sc="text" data-k="color" value="${x.color}"></label>
  <label class="fld">Fonte<select data-sc="text" data-k="font"><option value="auto" ${x.font==='auto'?'selected':''}>Automática</option>${FONTS.map(f=>`<option ${x.font===f?'selected':''}>${f}</option>`).join('')}</select></label></div>
  <div class="row2"><label class="fld">Início (s)<input type="number" data-sc="text" data-k="start" data-num="1" min="0" step="0.1" value="${x.start.toFixed(2)}"></label>
  <label class="fld">Duração (s)<input type="number" data-sc="text" data-k="dur" data-num="1" min="0.2" step="0.1" value="${x.dur.toFixed(2)}"></label></div>
  ${rng('text','size','Tamanho',20,200,1,x.size,v=>v)}${rng('text','y','Posição vertical',5,95,1,x.y,v=>v+'%')}`;
}
function pCaps(){
  const cs=S.capStyle,eng=CFG.engine||'groq',lang=CFG.lang==null?'pt':CFG.lang;
  const rows=S.caps.map(s=>`<div class="cap-row ${S.sel&&S.sel.id===s.id?'sel':''}" data-cap="${s.id}">
   <div class="row3"><input type="number" step="0.1" min="0" data-cap="${s.id}" data-f="start" value="${s.start.toFixed(2)}" aria-label="Início"><input type="number" step="0.1" min="0" data-cap="${s.id}" data-f="end" value="${s.end.toFixed(2)}" aria-label="Fim"><button class="icon" data-capdel="${s.id}" aria-label="Apagar legenda">${ICON.trash}</button></div>
   <textarea rows="2" data-cap="${s.id}" data-f="text">${esc(s.text)}</textarea></div>`).join('');
  const L=[['pt','Português'],['en','Inglês'],['es','Espanhol'],['fr','Francês'],['de','Alemão'],['it','Italiano'],['','Detetar automaticamente']];
  const styles=Object.entries(CAP_PRESETS).map(([k,p])=>`<button class="stylecard ${cs.preset===k?'on':''}" data-cappreset="${k}" aria-label="${p.n}"><canvas data-style="${k}" width="300" height="130"></canvas><span>${p.n}</span></button>`).join('');
  const sw=HI_COLORS.map(c=>`<button class="swatch ${cs.hi===c?'on':''}" data-hi="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('');
  const pal=cs.pal.map((c,i)=>`<input type="color" data-pal="${i}" value="${c}" aria-label="Cor ${i+1} da paleta">`).join('');
  const paperOpen=(CAP_PRESETS[cs.preset]||{}).paper||cs.preset==='classic'||cs.preset==='wordbox';
  return `<div class="box"><h3>Estilo das legendas</h3>
  <div class="stylegrid">${styles}</div>
  <p class="hint">Cor de destaque (palavra a ser dita)</p>
  <div class="swatches">${sw}<input type="color" data-sc="capStyle" data-k="hi" value="${cs.hi}" aria-label="Cor personalizada"></div>
  <details class="paper" ${paperOpen?'open':''}><summary>Fundos e papéis (Jornal, Clássico, Caixas)</summary>
   <label class="fld">Modo dos fundos "Jornal"<select data-sc="capStyle" data-k="palMode"><option value="multi" ${cs.palMode==='multi'?'selected':''}>Cores alternadas (paleta)</option><option value="rand" ${cs.palMode==='rand'?'selected':''}>Uma cor aleatória por palavra</option><option value="one" ${cs.palMode==='one'?'selected':''}>Uma só cor em todos os fundos</option></select></label>
   <div class="row2"><label class="fld">Cor única<input type="color" data-sc="capStyle" data-k="one" value="${cs.one}"></label>
   <label class="fld">Fundo (Clássico/Caixas)<input type="color" data-sc="capStyle" data-k="bgc" value="${cs.bgc}"></label></div>
   <p class="hint">Paleta do Jornal (5 cores, uma por papel)</p><div class="swatches">${pal}</div>
   <label class="chk"><input type="checkbox" data-sc="capStyle" data-k="ransomHi" ${cs.ransomHi?'checked':''}> Palavra ativa usa a cor de destaque</label>
  </details>
  <div class="row2"><label class="fld">Cor do texto<input type="color" data-sc="capStyle" data-k="color" value="${cs.color}"></label>
  <label class="fld">Fonte<select data-sc="capStyle" data-k="font"><option value="auto" ${cs.font==='auto'?'selected':''}>Automática (do estilo)</option>${FONTS.map(f=>`<option ${cs.font===f?'selected':''}>${f}</option>`).join('')}</select></label></div>
  ${rng('capStyle','size','Tamanho',30,140,1,cs.size,v=>v)}${rng('capStyle','y','Posição vertical',5,95,1,cs.y,v=>v+'%')}
  ${rng('capStyle','offset','Sincronia (+ mais cedo, − mais tarde)',-1,1,0.02,cs.offset||0,fmtS)}
  <label class="chk"><input type="checkbox" data-sc="capStyle" data-k="upper" ${cs.upper?'checked':''}> MAIÚSCULAS</label></div>
  <div class="box"><h3>Legendas automáticas</h3>
  <label class="fld">Motor<select id="aiEngine"><option value="groq" ${eng==='groq'?'selected':''}>Nuvem Groq (rápido e preciso, recomendado)</option><option value="openai" ${eng==='openai'?'selected':''}>Nuvem OpenAI</option><option value="local" ${eng==='local'?'selected':''}>No aparelho (grátis, mais lento)</option></select></label>
  <label class="fld" id="keyWrap">Chave API <input type="password" id="aiKey" autocomplete="off" placeholder="gsk_… (Groq) ou sk-… (OpenAI)" value="${esc(CFG['key_'+eng]||'')}"></label>
  <p class="hint" id="engHint"></p>
  <div class="row2"><label class="fld">Idioma<select id="aiLang">${L.map(([k,n])=>`<option value="${k}" ${lang===k?'selected':''}>${n}</option>`).join('')}</select></label>
  <label class="fld">Palavras por legenda<input type="number" id="aiMax" min="1" max="10" value="${CFG.max||3}"></label></div>
  <label class="fld" id="cmWrap">Qualidade (Groq)<select id="aiCM"><option value="whisper-large-v3" ${(CFG.cm||'whisper-large-v3')==='whisper-large-v3'?'selected':''}>Máxima (whisper-large-v3)</option><option value="whisper-large-v3-turbo" ${CFG.cm==='whisper-large-v3-turbo'?'selected':''}>Rápida (large-v3-turbo)</option></select></label>
  <label class="fld" id="modelWrap">Modelo local<select id="aiModel"><option value="Xenova/whisper-tiny">Tiny (rápido, menos preciso)</option><option value="Xenova/whisper-base" selected>Base (equilibrado)</option><option value="Xenova/whisper-small">Small (melhor, lento)</option></select></label>
  <label class="fld">Nomes/palavras difíceis (opcional, ajuda muito)<input type="text" id="aiPrompt" placeholder="ex.: Pinhal Novo, Pladur, FenixCut" value="${esc(CFG.prompt||'')}"></label>
  <label class="chk" id="fixWrap"><input type="checkbox" id="aiFix" ${CFG.fix===false?'':'checked'}> Corrigir ortografia com IA</label>
  <button class="btn primary wide" data-act="autocap">Gerar legendas automáticas</button>
  <p class="hint" id="aiStatus"></p>
  <button class="btn wide" data-act="cfglink">Copiar link para configurar outro aparelho</button></div>
  <div class="btnrow"><button class="btn" data-act="addcap">${ICON.plus} Legenda aqui</button><button class="btn" data-act="capm">−0,1s todas</button><button class="btn" data-act="capp">+0,1s todas</button></div>
  <div class="btnrow"><label class="btn">Importar .srt<input type="file" id="srtIn" accept=".srt,text/plain" hidden></label><button class="btn" data-act="srtout">Exportar .srt</button><button class="btn danger" data-act="clearcaps">Limpar</button></div>
  <p class="hint">Corrige o texto e os tempos abaixo. Gera as legendas depois de acabares de cortar e mudar velocidades, porque os tempos seguem a timeline.</p>
  <div class="caplist">${rows||empty('Sem legendas ainda.')}</div>`;
}
const AI_EXAMPLES=['Remove os silêncios','Aplica o efeito Cinema e transição zoom em todos os clipes','Acelera tudo 1.3x e põe legendas estilo jornal com fundos amarelos','Traduz as legendas para inglês','Corta do segundo 5 ao 8','Adiciona o título "Casa T3 em Setúbal" nos primeiros 3 segundos'];
function pAI(){
  const L=S.aiLog;
  const hasKey=!!(CFG.key_groq||CFG.key_openai);
  return `<div class="box"><h3>Editar com IA</h3>
  <p class="hint">Escreve o que queres em português. A IA lê o teu projeto (clipes, legendas e transcrição) e faz as alterações. Podes desfazer.${hasKey?'':' <b>Falta a chave API:</b> cola-a no separador Legendas.'}</p>
  <textarea id="aiPromptEdit" rows="3" placeholder="ex.: Remove os silêncios, aplica o efeito Cinema e põe legendas estilo jornal com fundo amarelo">${esc(L?L.prompt:'')}</textarea>
  <div class="chips" style="margin-top:8px">${AI_EXAMPLES.map((e,i)=>`<button class="chip" data-aiex="${i}">${esc(e)}</button>`).join('')}</div>
  <button class="btn primary wide" data-act="airun">Executar</button>
  <p class="hint" id="aiEditStatus"></p>
  ${L?`<div class="ailog"><p class="hint"><b>${esc(L.explicacao||'Feito.')}</b></p>${L.log.map(x=>`<div class="${x.ok?'ok':'no'}">${x.ok?'✓':'✕'} ${esc(x.t)}</div>`).join('')||'<div class="no">Nenhuma ação executada.</div>'}<button class="btn" data-act="undoai">Desfazer tudo isto</button></div>`:''}
  </div>`;
}
const EXP={res:1080,fps:30,q:'high',audio:true,method:'auto',cancel:false,busy:false,support:{},result:null};
function pExp(){
  const rs=RES_LIST.map(([n,s])=>{const[w,h]=dimsFor(s);return `<label class="radio"><input type="radio" name="res" value="${s}" ${EXP.res===s?'checked':''}><span>${n}<small>${w}×${h}</small></span><em id="sup${s}">…</em></label>`;}).join('');
  return `<div class="box"><h3>Resolução</h3><div class="radios">${rs}</div>
  <div class="row2"><label class="fld">Imagens/seg<select id="expFps"><option ${EXP.fps===24?'selected':''}>24</option><option ${EXP.fps===30?'selected':''}>30</option><option ${EXP.fps===60?'selected':''}>60</option></select></label>
  <label class="fld">Qualidade<select id="expQ"><option value="normal" ${EXP.q==='normal'?'selected':''}>Normal</option><option value="high" ${EXP.q==='high'?'selected':''}>Alta</option><option value="max" ${EXP.q==='max'?'selected':''}>Máxima</option></select></label></div>
  <label class="fld">Método<select id="expMethod"><option value="auto">Automático (rápido, com alternativas)</option><option value="rt">Compatível (tempo real)</option></select></label>
  <label class="chk"><input type="checkbox" id="expAudio" ${EXP.audio?'checked':''}> Incluir áudio</label>
  <button class="btn primary wide" id="expGo">Exportar vídeo</button>
  <button class="btn wide" id="expCancel" hidden>Cancelar</button>
  <div class="prog" id="expProg" hidden><div id="expBar"></div></div><p class="hint" id="expMsg">${S.clips.length?`Duração do projeto: ${fmt(S.total)}`:'Importa um vídeo primeiro.'}</p></div>
  <div id="expRes"></div>
  <p class="hint">2K/4K só aparecem como disponíveis se o teu aparelho conseguir codificar essa resolução.</p>
  <button class="btn wide" data-act="diag">Copiar diagnóstico (para me enviares se algo falhar)</button>`;
}
const bitrateFor=(w,h,fps,q)=>Math.round(w*h*fps*({normal:0.07,high:0.1,max:0.16}[q]||0.1));
async function probeExport(){
  for(const[,s]of RES_LIST){
    const[w,h]=dimsFor(s);if(!$('sup'+s))continue;
    const cfg=await pickCodec(w,h,EXP.fps,bitrateFor(w,h,EXP.fps,EXP.q));
    EXP.support[s]=!!cfg;const e2=$('sup'+s);
    if(e2){e2.textContent=cfg?'✓ disponível':(hasWC()?'✕ não suportado':'só modo compatível');e2.className=cfg?'ok':'no';}
  }
}
async function doExport(){
  if(!S.clips.length)return toast('Importa um vídeo primeiro.');
  pause();EXP.cancel=false;EXP.busy=true;S.exporting=true;
  const[w,h]=dimsFor(EXP.res),fps=EXP.fps,bitrate=bitrateFor(w,h,fps,EXP.q);
  const set=(p,m)=>{const b=$('expBar');if(b)b.style.width=Math.round(p*100)+'%';const e=$('expMsg');if(e&&m)e.textContent=m;};
  $('expGo').hidden=true;$('expCancel').hidden=false;$('expProg').hidden=false;$('expRes').innerHTML='';
  try{
    const out=await runExport({w,h,fps,bitrate,audio:EXP.audio,method:EXP.method},set,EXP);
    EXP.result={url:URL.createObjectURL(out.blob),blob:out.blob,ext:out.ext,w,h};
    const name=`fenixcut-${w}x${h}.${out.ext}`;
    if($('expRes')){
      $('expRes').innerHTML=`<div class="box"><h3>Pronto: ${w}×${h} · ${(out.blob.size/1048576).toFixed(1)} MB</h3><video controls playsinline src="${EXP.result.url}" class="resvid"></video>
      <div class="btnrow"><a class="btn primary" href="${EXP.result.url}" download="${name}">Descarregar</a><button class="btn" id="expShare">Partilhar / guardar na galeria</button></div></div>`;
      $('expShare').onclick=async()=>{try{const f=new File([out.blob],name,{type:out.blob.type});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f]});else toast('Partilha não suportada. Usa Descarregar.');}catch(e){}};
    }
    set(1,'Concluído.');
  }catch(e){console.error(e);logErr('export: '+e.message);set(0,e.message==='cancelado'?'Cancelado.':'Erro: '+e.message);if(e.message!=='cancelado')toast('Falhou: '+e.message+'. Tenta o método Compatível ou uma resolução menor.',6000);}
  finally{EXP.busy=false;S.exporting=false;if($('expGo')){$('expGo').hidden=false;$('expCancel').hidden=true;}S.clips.forEach(c=>SRC[c.src].video.pause());setT(S.t);}
}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();}
async function copyText(txt,ok){
  try{await navigator.clipboard.writeText(txt);toast(ok);}
  catch(e){const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();try{document.execCommand('copy');toast(ok);}catch(_){toast('Não consegui copiar.');}t.remove();}
}
function copyDiag(){
  const d={ua:navigator.userAgent,viewport:innerWidth+'x'+innerHeight,webcodecs:hasWC(),audioEncoder:'AudioEncoder' in window,mediaRecorder:!!window.MediaRecorder,isolated:window.crossOriginIsolated,
    ratio:S.ratio.join(':'),clips:S.clips.map(c=>({n:c.name,dur:+c.dur.toFixed(1),speed:c.speed,w:SRC[c.src].vw,h:SRC[c.src].vh,type:SRC[c.src].file.type})),caps:S.caps.length,texts:S.texts.length,exp:{res:EXP.res,fps:EXP.fps,sup:EXP.support},chatModel:CFG.chatModel,erros:LOG};
  copyText(JSON.stringify(d,null,1),'Diagnóstico copiado. Cola-o na conversa.');
}
function copyCfgLink(){
  const o={engine:CFG.engine,lang:CFG.lang,max:CFG.max,prompt:CFG.prompt,fix:CFG.fix,cm:CFG.cm,key_groq:CFG.key_groq,key_openai:CFG.key_openai};
  const link=location.origin+location.pathname+'#cfg='+encodeURIComponent(b64enc(o));
  copyText(link,'Link copiado. Abre-o no outro aparelho (contém a tua chave: não partilhes).');
}

function target(sc){
  if(sc==='clip')return selClip();if(sc==='fx')return(selClip()||{}).fx;if(sc==='trans')return(selClip()||{}).trans;
  if(sc==='text')return selText();if(sc==='capStyle')return S.capStyle;if(sc==='proj')return S;return null;
}
function bindPanel(root){
  root.querySelectorAll('[data-sc]').forEach(el=>{
    const upd=()=>{
      const o=target(el.dataset.sc);if(!o)return;const k=el.dataset.k;let v;
      if(el.type==='checkbox')v=el.checked;else if(el.type==='range'||el.type==='number'||el.dataset.num)v=parseFloat(el.value);else v=el.value;
      if(el.type==='checkbox'&&el.dataset.num)v=el.checked?1:0;
      if(typeof v==='number'&&isNaN(v))return;
      if(el.dataset.int&&el.dataset.sc==='clip'){
        const c=o,src=SRC[c.src];if(k==='in')v=Math.max(0,Math.min(v,c.out-0.1));if(k==='out')v=Math.min(src.dur,Math.max(v,c.in+0.1));
      }
      o[k]=v;
      const out=root.querySelector(`[data-out="${el.dataset.sc}.${k}"]`);
      if(out){const f=({speed:fmtX,vol:fmtP,kb:fmtP,offset:fmtS,dur:x=>(+x).toFixed(2)+'s',y:x=>x+'%'}[k])||(el.dataset.sc==='fx'?fmtN:null);out.textContent=f?f(v):v;}
      if(el.dataset.sc==='fx')o.preset='custom';
      layout();renderTimeline();invalidate();
    };
    el.addEventListener('input',upd);
    el.addEventListener('change',()=>{upd();commit();if(el.dataset.sc==='fx')renderPanel();else if(el.dataset.sc==='capStyle'||el.dataset.sc==='text')drawThumbs();});
  });
  root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const c=selClip();if(!c)return;Object.assign(c.fx,FX_DEFAULT,PRESETS[b.dataset.preset].v,{preset:b.dataset.preset});commit();renderPanel();invalidate();});
  root.querySelectorAll('[data-trans]').forEach(b=>b.onclick=()=>{const c=selClip();if(!c)return;c.trans.type=b.dataset.trans;commit();renderPanel();if(b.dataset.trans!=='none'){setT(c.tStart+0.05);}});
  root.querySelectorAll('[data-cappreset]').forEach(b=>b.onclick=()=>{S.capStyle.preset=b.dataset.cappreset;commit();root.querySelectorAll('.stylecard[data-cappreset]').forEach(x=>x.classList.toggle('on',x===b));const d=root.querySelector('details.paper');if(d&&(CAP_PRESETS[b.dataset.cappreset]||{}).paper)d.open=true;invalidate();});
  root.querySelectorAll('[data-hi]').forEach(b=>b.onclick=()=>{S.capStyle.hi=b.dataset.hi;commit();root.querySelectorAll('[data-hi]').forEach(x=>x.classList.toggle('on',x===b));drawThumbs();invalidate();});
  root.querySelectorAll('[data-pal]').forEach(el=>{el.addEventListener('input',()=>{S.capStyle.pal[+el.dataset.pal]=el.value;invalidate();});el.addEventListener('change',()=>{commit();drawThumbs();});});
  root.querySelectorAll('[data-tstyle].stylecard').forEach(b=>b.onclick=()=>{const x=selText();if(!x)return;x.style=b.dataset.tstyle;commit();root.querySelectorAll('.stylecard[data-tstyle]').forEach(y=>y.classList.toggle('on',y===b));invalidate();});
  root.querySelectorAll('[data-tanim]').forEach(b=>b.onclick=()=>{const x=selText();if(!x)return;x.anim=b.dataset.tanim;commit();root.querySelectorAll('.stylecard[data-tanim]').forEach(y=>y.classList.toggle('on',y===b));invalidate();});
  root.querySelectorAll('[data-thi]').forEach(b=>b.onclick=()=>{const x=selText();if(!x)return;x.hi=b.dataset.thi;commit();root.querySelectorAll('[data-thi]').forEach(y=>y.classList.toggle('on',y===b));drawThumbs();invalidate();});
  root.querySelectorAll('[data-aiex]').forEach(b=>b.onclick=()=>{$('aiPromptEdit').value=AI_EXAMPLES[+b.dataset.aiex];});
  root.querySelectorAll('[data-capdel]').forEach(b=>b.onclick=()=>{S.caps=S.caps.filter(x=>x.id!==b.dataset.capdel);commit();refreshAll();});
  root.querySelectorAll('.cap-row').forEach(r=>{
    r.addEventListener('focusin',()=>{const s=S.caps.find(x=>x.id===r.dataset.cap);if(s){S.sel={type:'cap',id:s.id};if(!S.playing)setT(s.start+0.01);renderTimeline();}});
  });
  root.querySelectorAll('[data-f]').forEach(el=>{
    el.addEventListener('input',()=>{const s=S.caps.find(x=>x.id===el.dataset.cap);if(!s)return;const f=el.dataset.f;
      if(f==='text'){s.text=el.value;}else{const v=parseFloat(el.value);if(!isNaN(v))s[f]=v;}renderTimeline();invalidate();});
    el.addEventListener('change',commit);
  });
  root.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));
  const sin=$('srtIn');if(sin)sin.onchange=async e=>{const f=e.target.files[0];if(!f)return;const arr=parseSRT(await f.text());if(!arr.length)return toast('SRT inválido.');S.caps=arr;commit();refreshAll();};
  const eng=$('aiEngine');if(eng){
    const sync=()=>{const e=eng.value;$('keyWrap').hidden=e==='local';$('modelWrap').hidden=e!=='local';$('cmWrap').hidden=e!=='groq';$('fixWrap').hidden=e==='local';$('aiKey').value=CFG['key_'+e]||'';
      $('engHint').innerHTML=e==='groq'?'Chave grátis em <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>. Só o áudio é enviado, não o vídeo. Fica guardada neste aparelho.':e==='openai'?'Chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com</a> (pago por minuto). Só o áudio é enviado.':'Corre no teu aparelho, sem enviar nada. O modelo descarrega-se uma vez. É mais lento e menos preciso que a nuvem.';};
    eng.onchange=()=>{CFG.engine=eng.value;saveCFG();sync();};sync();
    $('aiKey').onchange=e=>{CFG['key_'+eng.value]=e.target.value.trim();saveCFG();};
    $('aiLang').onchange=e=>{CFG.lang=e.target.value;saveCFG();};
    $('aiMax').onchange=e=>{CFG.max=+e.target.value;saveCFG();};
    $('aiPrompt').onchange=e=>{CFG.prompt=e.target.value;saveCFG();};
    $('aiCM').onchange=e=>{CFG.cm=e.target.value;saveCFG();};
    $('aiFix').onchange=e=>{CFG.fix=e.target.checked;saveCFG();};
    if(CFG.model)$('aiModel').value=CFG.model;$('aiModel').onchange=e=>{CFG.model=e.target.value;saveCFG();};
  }
  const g=$('expGo');if(g){
    g.onclick=doExport;$('expCancel').onclick=()=>{EXP.cancel=true;};
    root.querySelectorAll('input[name=res]').forEach(r=>r.onchange=()=>{EXP.res=+r.value;});
    $('expFps').onchange=e=>{EXP.fps=+e.target.value;probeExport();};$('expQ').onchange=e=>{EXP.q=e.target.value;probeExport();};
    $('expMethod').value=EXP.method;$('expMethod').onchange=e=>{EXP.method=e.target.value;};$('expAudio').onchange=e=>{EXP.audio=e.target.checked;};
  }
}
async function act(a){
  if(a==='split')splitAt();else if(a==='dup')dupClip();else if(a==='left')moveClip(-1);else if(a==='right')moveClip(1);else if(a==='del')deleteSel();
  else if(a==='fxall'){const c=selClip();S.clips.forEach(x=>{x.fx=JSON.parse(JSON.stringify(c.fx));});commit();toast('Efeito aplicado a todos.');}
  else if(a==='transall'){const c=selClip();S.clips.forEach(x=>{x.trans=JSON.parse(JSON.stringify(c.trans));});commit();toast('Transição aplicada a todos.');}
  else if(a==='addtext'){const x={id:nid(),text:'Escreve aqui',start:S.t,dur:3,size:90,color:'#ffffff',hi:S.capStyle.hi,y:50,style:'impact',font:'auto',anim:'pop'};S.texts.push(x);S.sel={type:'text',id:x.id};commit();refreshAll();}
  else if(a==='addcap'){const s={id:nid(),start:S.t,end:S.t+2,text:'Nova legenda',wt:null};S.caps.push(s);S.caps.sort((p,q)=>p.start-q.start);S.sel={type:'cap',id:s.id};commit();refreshAll();}
  else if(a==='capm'||a==='capp'){const d=a==='capm'?-0.1:0.1;S.caps.forEach(s=>{s.start=Math.max(0,s.start+d);s.end=Math.max(s.start+0.1,s.end+d);if(s.words){s.words=s.words.map(w=>({w:w.w,s:Math.max(0,w.s+d),e:Math.max(0,w.e+d)}));}});commit();refreshAll();return;}
  else if(a==='clearcaps'){S.caps=[];commit();refreshAll();}
  else if(a==='srtout'){if(!S.caps.length)return toast('Sem legendas.');download('legendas.srt',toSRT(),'text/plain');}
  else if(a==='diag'){copyDiag();return;}
  else if(a==='cfglink'){copyCfgLink();return;}
  else if(a==='undoai'){undo();S.aiLog=null;renderPanel();return;}
  else if(a==='airun'){
    const p=($('aiPromptEdit').value||'').trim();if(!p)return toast('Escreve o que queres que a IA faça.');
    const st=m=>{const e=$('aiEditStatus');if(e)e.textContent=m;};
    commit();let r=null;
    try{r=await aiEditRun(p,st);}
    catch(e){console.error(e);logErr('IA: '+e.message);st('Erro: '+e.message);toast('Falhou: '+e.message,6000);}
    if(r){S.aiLog={prompt:p,explicacao:r.explicacao,log:r.log};commit();S.sel=null;refreshAll(true);}
    return;
  }
  else if(a==='autocap'){
    if(!S.clips.length)return toast('Importa um vídeo primeiro.');
    const st=m=>{const e=$('aiStatus');if(e)e.textContent=m;};
    const engine=$('aiEngine').value;
    try{
      const segs=await autoCaptions({engine,key:($('aiKey').value||'').trim(),cloudModel:$('aiCM').value,fix:$('aiFix').checked,lang:$('aiLang').value,model:$('aiModel').value,maxWords:Math.max(1,+$('aiMax').value||3),prompt:$('aiPrompt').value.trim()},st);
      S.caps=segs;commit();refreshAll();toast(`${segs.length} legendas geradas. Corrige o que for preciso.`);
    }catch(e){console.error(e);logErr('legendas: '+e.message);st('Erro: '+e.message);toast('Falhou: '+e.message,6000);}
    return;
  }
  refreshAll();
}
function refreshAll(full){layout();S.t=Math.min(S.t,S.total);renderTimeline();renderPanel();$('empty').hidden=S.clips.length>0;if(full&&!S.playing)setT(S.t);invalidate();}

/* ---------- arranque ---------- */
function init(){
  initRenderer();bindTimeline();
  $('btnImport').onclick=()=>$('fileIn').click();$('emptyImport').onclick=()=>$('fileIn').click();
  $('fileIn').onchange=e=>{importFiles([...e.target.files]);e.target.value='';};
  $('btnPlay').onclick=()=>S.playing?pause():play();$('btnPlay').innerHTML=ICON.play;
  $('btnSplit').onclick=splitAt;$('btnSplit').innerHTML=ICON.split;$('btnDel').onclick=deleteSel;$('btnDel').innerHTML=ICON.trash;$('btnUndo').onclick=undo;$('btnUndo').innerHTML=ICON.undo;
  $('panelToggle').innerHTML=ICON.expand;$('panelToggle').onclick=()=>{const a=document.querySelector('.app'),b=$('panelToggle');if(a.classList.contains('tall')){a.classList.remove('tall');a.classList.add('mini');b.classList.remove('flip');b.classList.add('mini');}else if(a.classList.contains('mini')){a.classList.remove('mini');b.classList.remove('mini');}else{a.classList.add('tall');b.classList.add('flip');}setTimeout(invalidate,50);};
  $('ratio').onchange=e=>{S.ratio=e.target.value.split(':').map(Number);initRenderer();commit();if(S.tab==='exp')renderPanel();};
  $('tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){S.tab=b.dataset.tab;renderPanel();}};
  $('btnExport').onclick=()=>{S.tab='exp';renderPanel();$('panelBody').scrollTop=0;};
  document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();S.playing?pause():play();}else if(e.key==='s')splitAt();else if(e.key==='Delete'||e.key==='Backspace')deleteSel();else if((e.ctrlKey||e.metaKey)&&e.key==='z')undo();});
  if(document.fonts){ALL_FONTS.forEach(f=>document.fonts.load(`800 40px "${f}"`).then(()=>{invalidate();if(S.tab==='caps'||S.tab==='text')drawThumbs();}).catch(()=>{}));document.fonts.ready.then(()=>{invalidate();if(S.tab==='caps'||S.tab==='text')drawThumbs();});}
  window.addEventListener('resize',()=>{invalidate();});
  commit();layout();renderTimeline();renderPanel();requestAnimationFrame(tick);
  if(_cfgImported){S.tab='caps';renderPanel();toast('Configuração importada ✓ (chave e preferências guardadas)',5000);}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
window.addEventListener('DOMContentLoaded',init);
