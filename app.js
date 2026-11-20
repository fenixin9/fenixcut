
'use strict';
const $=id=>document.getElementById(id);
const S={ratio:[9,16],fit:'cover',clips:[],texts:[],caps:[],capStyle:{preset:'pop',size:70,y:72,font:'auto',upper:false,hi:'#ffd23f',color:'#ffffff',offset:0},t:0,total:0,playing:false,sel:null,tab:'clip',pps:60,exporting:false};
const SRC={};let uid=1;const nid=()=>'i'+(uid++);
const FONTS=['Montserrat','Anton','Bebas Neue','Bangers','Pacifico','Satoshi'];
const ICON={
 play:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
 pause:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
 split:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
 trash:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
 undo:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
 plus:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
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
function undo(){if(hi<=0)return;hi--;const o=JSON.parse(hist[hi]);Object.assign(S,{clips:o.clips,texts:o.texts,caps:o.caps,capStyle:o.capStyle,ratio:o.ratio,fit:o.fit});S.sel=null;$('ratio').value=S.ratio.join(':');initRenderer();refreshAll(true);}
function selClip(){if(S.sel&&S.sel.type==='clip'){const c=S.clips.find(x=>x.id===S.sel.id);if(c)return c;}return clipAt(S.t)||S.clips[0]||null;}
const selText=()=>S.sel&&S.sel.type==='text'?S.texts.find(x=>x.id===S.sel.id):null;

/* ---------- renderer / preview ---------- */
let R=null,dirty=true;
const invalidate=()=>{dirty=true;};
function initRenderer(){
  if(R)R.dispose();
  const[w,h]=dimsFor(480);const cv=$('preview');
  R=createRenderer(w,h,cv);cv.style.aspectRatio=`${w}/${h}`;invalidate();
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
const TABS=[['clip','Clipe'],['fx','Efeitos'],['trans','Transições'],['text','Texto'],['caps','Legendas'],['exp','Exportar']];
function renderTabs(){$('tabs').innerHTML=TABS.map(([k,n])=>`<button role="tab" class="${S.tab===k?'on':''}" data-tab="${k}">${n}</button>`).join('');}
const rng=(sc,k,label,min,max,step,val,f)=>`<label class="rg"><span>${label}<b data-out="${sc}.${k}">${f?f(val):val}</b></span><input type="range" data-sc="${sc}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
const fmtX=v=>(+v).toFixed(2)+'×',fmtP=v=>Math.round(v*100)+'%',fmtN=v=>(+v).toFixed(2),fmtS=v=>(v>0?'+':'')+(+v).toFixed(2)+'s';
const empty=m=>`<div class="emptyp"><p>${m}</p></div>`;
function renderPanel(){
  renderTabs();const b=$('panelBody');
  const fn={clip:pClip,fx:pFx,trans:pTrans,text:pText,caps:pCaps,exp:pExp}[S.tab];
  try{b.innerHTML=fn();bindPanel(b);}catch(e){logErr('painel: '+e.message);b.innerHTML=empty('Erro no painel: '+esc(e.message));}
  if(S.tab==='exp')probeExport();
  if(S.tab==='caps')drawThumbs();
}
function drawThumbs(){
  document.querySelectorAll('canvas[data-style]').forEach(cv=>{try{drawStyleThumb(cv,cv.dataset.style);}catch(e){}});
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
  return `<div class="chips">${Object.entries(PRESETS).map(([k,p])=>`<button class="chip ${c.fx.preset===k?'on':''}" data-preset="${k}">${p.n}</button>`).join('')}</div>
  <div class="btnrow"><button class="btn" data-act="fxall">Aplicar a todos os clipes</button></div>
  ${FX_RANGES.map(([k,l,mn,mx,st])=>rng('fx',k,l,mn,mx,st,c.fx[k],fmtN)).join('')}
  <label class="chk"><input type="checkbox" data-sc="fx" data-k="mirror" data-num="1" ${c.fx.mirror?'checked':''}> Espelhar</label>`;
}
function pTrans(){
  const c=selClip();if(!c)return empty('Importa um vídeo para escolher transições.');
  return `<p class="hint">A transição aplica-se ao início do clipe selecionado (entrada).</p>
  <div class="chips">${Object.entries(TRANS).map(([k,n])=>`<button class="chip ${c.trans.type===k?'on':''}" data-trans="${k}">${n}</button>`).join('')}</div>
  ${rng('trans','dur','Duração',0.2,2,0.05,c.trans.dur,v=>(+v).toFixed(2)+'s')}
  <div class="btnrow"><button class="btn" data-act="transall">Aplicar a todos os clipes</button></div>`;
}
function pText(){
  const x=selText();
  let h=`<div class="btnrow"><button class="btn primary" data-act="addtext">${ICON.plus} Adicionar texto</button>${x?`<button class="btn danger" data-act="del">${ICON.trash} Apagar</button>`:''}</div>`;
  if(!x)return h+empty(S.texts.length?'Toca num texto na timeline para o editar.':'Ainda sem textos. Adiciona o primeiro.');
  const opt=(a,v)=>a.map(([k,n])=>`<option value="${k}" ${v===k?'selected':''}>${n}</option>`).join('');
  return h+`<label class="fld">Texto<textarea data-sc="text" data-k="text" rows="2">${esc(x.text)}</textarea></label>
  <div class="row2"><label class="fld">Início (s)<input type="number" data-sc="text" data-k="start" data-num="1" min="0" step="0.1" value="${x.start.toFixed(2)}"></label>
  <label class="fld">Duração (s)<input type="number" data-sc="text" data-k="dur" data-num="1" min="0.2" step="0.1" value="${x.dur.toFixed(2)}"></label></div>
  ${rng('text','size','Tamanho',20,200,1,x.size,v=>v)}${rng('text','y','Posição vertical',5,95,1,x.y,v=>v+'%')}
  <div class="row2"><label class="fld">Fonte<select data-sc="text" data-k="font">${opt(FONTS.map(f=>[f,f]),x.font)}</select></label>
  <label class="fld">Animação<select data-sc="text" data-k="anim">${opt([['none','Nenhuma'],['pop','Pop'],['fade','Fade'],['slide','Subir'],['type','Máquina de escrever']],x.anim)}</select></label></div>
  <div class="row2"><label class="fld">Cor<input type="color" data-sc="text" data-k="color" value="${x.color}"></label>
  <div class="checks"><label class="chk"><input type="checkbox" data-sc="text" data-k="bg" ${x.bg?'checked':''}> Caixa</label><label class="chk"><input type="checkbox" data-sc="text" data-k="stroke" ${x.stroke?'checked':''}> Contorno</label><label class="chk"><input type="checkbox" data-sc="text" data-k="bold" ${x.bold?'checked':''}> Negrito</label></div></div>`;
}
function pCaps(){
  const cs=S.capStyle,eng=CFG.engine||'groq',lang=CFG.lang==null?'pt':CFG.lang;
  const rows=S.caps.map(s=>`<div class="cap-row ${S.sel&&S.sel.id===s.id?'sel':''}" data-cap="${s.id}">
   <div class="row3"><input type="number" step="0.1" min="0" data-cap="${s.id}" data-f="start" value="${s.start.toFixed(2)}" aria-label="Início"><input type="number" step="0.1" min="0" data-cap="${s.id}" data-f="end" value="${s.end.toFixed(2)}" aria-label="Fim"><button class="icon" data-capdel="${s.id}" aria-label="Apagar legenda">${ICON.trash}</button></div>
   <textarea rows="2" data-cap="${s.id}" data-f="text">${esc(s.text)}</textarea></div>`).join('');
  const L=[['pt','Português'],['en','Inglês'],['es','Espanhol'],['fr','Francês'],['de','Alemão'],['it','Italiano'],['','Detetar automaticamente']];
  const styles=Object.entries(CAP_PRESETS).map(([k,p])=>`<button class="stylecard ${cs.preset===k?'on':''}" data-cappreset="${k}" aria-label="${p.n}"><canvas data-style="${k}" width="300" height="130"></canvas><span>${p.n}</span></button>`).join('');
  const sw=HI_COLORS.map(c=>`<button class="swatch ${cs.hi===c?'on':''}" data-hi="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('');
  return `<div class="box"><h3>Estilo das legendas</h3>
  <div class="stylegrid">${styles}</div>
  <p class="hint">Cor de destaque (palavra a ser dita)</p>
  <div class="swatches">${sw}<input type="color" data-sc="capStyle" data-k="hi" value="${cs.hi}" aria-label="Cor personalizada"></div>
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
  const d={ua:navigator.userAgent,webcodecs:hasWC(),audioEncoder:'AudioEncoder' in window,mediaRecorder:!!window.MediaRecorder,isolated:window.crossOriginIsolated,
    ratio:S.ratio.join(':'),clips:S.clips.map(c=>({n:c.name,dur:+c.dur.toFixed(1),speed:c.speed,w:SRC[c.src].vw,h:SRC[c.src].vh,type:SRC[c.src].file.type})),caps:S.caps.length,texts:S.texts.length,exp:{res:EXP.res,fps:EXP.fps,sup:EXP.support},erros:LOG};
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
    el.addEventListener('change',()=>{upd();commit();if(el.dataset.sc==='fx')renderPanel();else if(el.dataset.sc==='capStyle'&&['hi','color','font','upper','size'].includes(el.dataset.k))drawThumbs();});
  });
  root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const c=selClip();if(!c)return;Object.assign(c.fx,FX_DEFAULT,PRESETS[b.dataset.preset].v,{preset:b.dataset.preset});commit();renderPanel();invalidate();});
  root.querySelectorAll('[data-trans]').forEach(b=>b.onclick=()=>{const c=selClip();if(!c)return;c.trans.type=b.dataset.trans;commit();renderPanel();if(b.dataset.trans!=='none'){setT(c.tStart+0.05);}});
  root.querySelectorAll('[data-cappreset]').forEach(b=>b.onclick=()=>{S.capStyle.preset=b.dataset.cappreset;commit();root.querySelectorAll('.stylecard').forEach(x=>x.classList.toggle('on',x===b));invalidate();});
  root.querySelectorAll('[data-hi]').forEach(b=>b.onclick=()=>{S.capStyle.hi=b.dataset.hi;commit();root.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('on',x===b));drawThumbs();invalidate();});
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
  else if(a==='addtext'){const x={id:nid(),text:'Escreve aqui',start:S.t,dur:3,size:80,color:'#ffffff',y:50,bg:false,stroke:true,bold:true,font:'Montserrat',anim:'pop'};S.texts.push(x);S.sel={type:'text',id:x.id};commit();refreshAll();}
  else if(a==='addcap'){const s={id:nid(),start:S.t,end:S.t+2,text:'Nova legenda',wt:null};S.caps.push(s);S.caps.sort((p,q)=>p.start-q.start);S.sel={type:'cap',id:s.id};commit();refreshAll();}
  else if(a==='capm'||a==='capp'){const d=a==='capm'?-0.1:0.1;S.caps.forEach(s=>{s.start=Math.max(0,s.start+d);s.end=Math.max(s.start+0.1,s.end+d);if(s.words){s.words=s.words.map(w=>({w:w.w,s:Math.max(0,w.s+d),e:Math.max(0,w.e+d)}));}});commit();refreshAll();return;}
  else if(a==='clearcaps'){S.caps=[];commit();refreshAll();}
  else if(a==='srtout'){if(!S.caps.length)return toast('Sem legendas.');download('legendas.srt',toSRT(),'text/plain');}
  else if(a==='diag'){copyDiag();return;}
  else if(a==='cfglink'){copyCfgLink();return;}
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
  $('ratio').onchange=e=>{S.ratio=e.target.value.split(':').map(Number);initRenderer();commit();if(S.tab==='exp')renderPanel();};
  $('tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){S.tab=b.dataset.tab;renderPanel();}};
  $('btnExport').onclick=()=>{S.tab='exp';renderPanel();$('panelBody').scrollTop=0;};
  document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();S.playing?pause():play();}else if(e.key==='s')splitAt();else if(e.key==='Delete'||e.key==='Backspace')deleteSel();else if((e.ctrlKey||e.metaKey)&&e.key==='z')undo();});
  if(document.fonts){FONTS.forEach(f=>document.fonts.load(`700 40px "${f}"`).then(()=>{invalidate();if(S.tab==='caps')drawThumbs();}).catch(()=>{}));document.fonts.ready.then(()=>{invalidate();if(S.tab==='caps')drawThumbs();});}
  commit();layout();renderTimeline();renderPanel();requestAnimationFrame(tick);
  if(_cfgImported){S.tab='caps';renderPanel();toast('Configuração importada ✓ (chave e preferências guardadas)',5000);}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
window.addEventListener('DOMContentLoaded',init);
