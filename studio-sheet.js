/* FenixCut V29: painel de ferramentas como folha que sobe (estilo CapCut). Só em telemóvel na vertical; ecrã largo e horizontal ficam como estavam. */
'use strict';
(function(){
 if(!document.body||typeof matchMedia!=='function')return;
 const KEY='fenixcut-sheet',SIZES=['s','m','l'];
 const mq=matchMedia('(max-width:899px) and (orientation:portrait)');
 const root=document.documentElement;
 let size='m';
 try{const v=localStorage.getItem(KEY);if(SIZES.includes(v))size=v;}catch(e){}
 const css=`
 @media (max-width:899px) and (orientation:portrait){
  html body.fc-ux.ux-open .app{grid-template-rows:auto minmax(0,1fr) var(--fcTl,0px) var(--fcSheet,56dvh)!important}
  html body.fc-ux.ux-open .app>.tl{overflow:hidden!important}
  html body.fc-ux.ux-open.fc-tl0 .app>.tl{visibility:hidden}
  html body.fc-ux.ux-open .app>.panel{border-radius:18px 18px 0 0!important;box-shadow:0 -14px 34px rgba(0,0,0,.55);background:#202125;z-index:6;overflow:hidden!important;border-top:1px solid #3b3c43!important}
  html body.fc-ux.ux-open #uxSheetHandle{display:flex}
  html body.fc-ux.ux-open #tabs{flex:0 0 calc(58px + env(safe-area-inset-bottom))!important;height:calc(58px + env(safe-area-inset-bottom))!important;padding:3px 4px calc(3px + env(safe-area-inset-bottom))!important}
  html body.fc-ux.ux-open #tabs button{height:52px!important}
  html body.fc-ux.ux-open #uxPanelHead{flex:0 0 42px!important;min-height:42px!important}
  html body.fc-ux.ux-open #panelBody{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
  html body.fc-ux{overscroll-behavior:none}
 }
 #uxSheetHandle{display:none;flex:0 0 24px;align-items:center;justify-content:center;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
 #uxSheetHandle::before{content:'';width:44px;height:5px;border-radius:3px;background:#5e6068}
 #uxSheetHandle:active::before,#uxSheetHandle.drag::before{background:#57d8c2}
 #uxSheetHandle:focus-visible{outline:2px solid #57d8c2;outline-offset:-2px}
 @media (min-width:900px),(orientation:landscape){#uxSheetHandle{display:none!important}}
 `;
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 const H=()=>window.innerHeight;
 const topH=()=>{const t=document.querySelector('.app>.top');return t?Math.round(t.getBoundingClientRect().height):92;};
 const limits=()=>{const h=H(),tp=topH(),max=Math.max(270,h-tp-130);return{h,tp,min:Math.min(270,max),max};};
 function heights(){const {h,max,min}=limits();const c=v=>Math.round(Math.max(min,Math.min(max,v)));return{s:c(h*.40),m:c(h*.56),l:max};}
 function apply(px){
  const {h,tp,min,max}=limits();px=Math.round(Math.max(min,Math.min(max,px)));
  const rem=h-tp-px,tl=rem>=330?Math.round(Math.max(64,Math.min(96,rem*.22))):0;
  root.style.setProperty('--fcSheet',px+'px');root.style.setProperty('--fcTl',tl+'px');
  document.body.classList.toggle('fc-tl0',tl===0);
  return px;
 }
 function refresh(){if(!mq.matches)return;apply(heights()[size]);}
 function save(){try{localStorage.setItem(KEY,size);}catch(e){}}
 function nearest(px){const hs=heights();return SIZES.reduce((a,k)=>Math.abs(hs[k]-px)<Math.abs(hs[a]-px)?k:a,'m');}
 function mount(){
  const p=document.querySelector('.panel');if(!p||document.getElementById('uxSheetHandle'))return;
  const hd=document.createElement('div');hd.id='uxSheetHandle';hd.setAttribute('role','separator');hd.setAttribute('aria-orientation','horizontal');hd.setAttribute('aria-label','Alterar a altura do painel');hd.tabIndex=0;
  p.prepend(hd);
  let drag=null;
  hd.addEventListener('pointerdown',e=>{
   if(!document.body.classList.contains('ux-open'))return;
   const panel=document.querySelector('.panel');drag={y:e.clientY,h:panel.getBoundingClientRect().height,moved:false};
   try{hd.setPointerCapture(e.pointerId);}catch(x){}hd.classList.add('drag');e.preventDefault();
  });
  hd.addEventListener('pointermove',e=>{if(!drag)return;const dy=drag.y-e.clientY;if(Math.abs(dy)>6)drag.moved=true;if(drag.moved)apply(drag.h+dy);});
  const end=e=>{
   if(!drag)return;const d=drag;drag=null;hd.classList.remove('drag');
   if(d.moved){const panel=document.querySelector('.panel');size=nearest(panel.getBoundingClientRect().height);}
   else size=SIZES[(SIZES.indexOf(size)+1)%SIZES.length];
   save();refresh();
  };
  hd.addEventListener('pointerup',end);hd.addEventListener('pointercancel',end);
  hd.addEventListener('keydown',e=>{
   if(e.key==='ArrowUp'||e.key==='ArrowDown'){const i=SIZES.indexOf(size)+(e.key==='ArrowUp'?1:-1);size=SIZES[Math.max(0,Math.min(2,i))];save();refresh();e.preventDefault();}
   else if(e.key==='Enter'||e.key===' '){size=SIZES[(SIZES.indexOf(size)+1)%3];save();refresh();e.preventDefault();}
  });
 }
 function init(){
  mount();refresh();
  let wasOpen=document.body.classList.contains('ux-open');
  new MutationObserver(()=>{const now=document.body.classList.contains('ux-open');if(now&&!wasOpen)refresh();wasOpen=now;}).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',refresh);window.addEventListener('orientationchange',()=>setTimeout(refresh,250));
  if(mq.addEventListener)mq.addEventListener('change',refresh);
 }
 window.FenixSheet={refresh,heights,get size(){return size;},set size(v){if(SIZES.includes(v)){size=v;refresh();}}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
})();
