/* FenixCut V30: modo Carrossel. Modulo independente (nao altera app.js nem os outros ficheiros).
   Ate 20 slides, fundo (cor, degrade, foto), camadas de texto e imagem, efeitos de imagem,
   exportacao PNG, JPG, PDF e ZIP. Abre por um botao "Carrossel" na barra de projeto. */
(function(){
'use strict';
if(window.FenixCarousel)return;
const MAXS=20,PW=600;
const FORMATS={'4:5':[1080,1350,'4:5 Feed'],'1:1':[1080,1080,'1:1 Quadrado'],'9:16':[1080,1920,'9:16 Stories'],'16:9':[1920,1080,'16:9 Horizontal']};
let FL=['Montserrat','Anton','Bebas Neue','Bangers','Pacifico','Playfair Display','Special Elite','Abril Fatface','Oswald'];
try{if(typeof FONTS!=='undefined'&&Array.isArray(FONTS)&&FONTS.length)FL=FONTS.slice();}catch(e){}
const FX_PRESETS={orig:['Original',{br:1,co:1,sa:1,bl:0,se:0,gr:0,hu:0}],pb:['P&B',{br:1,co:1.1,sa:1,bl:0,se:0,gr:1,hu:0}],vint:['Vintage',{br:1.05,co:.95,sa:.9,bl:0,se:.55,gr:0,hu:0}],quente:['Quente',{br:1.04,co:1,sa:1.25,bl:0,se:.25,gr:0,hu:-10}],frio:['Frio',{br:1,co:1.05,sa:1.1,bl:0,se:0,gr:0,hu:18}],vivido:['Vívido',{br:1,co:1.15,sa:1.6,bl:0,se:0,gr:0,hu:0}],suave:['Suave',{br:1.08,co:.95,sa:1,bl:1.5,se:0,gr:0,hu:0}],drama:['Drama',{br:.9,co:1.4,sa:1.1,bl:0,se:0,gr:0,hu:0}]};
const PALS=[['#1a1018','#ff2e93'],['#0f2027','#2c5364'],['#ff512f','#dd2476'],['#42275a','#734b6d'],['#f7971e','#ffd200'],['#11998e','#38ef7d'],['#232526','#414345'],['#ffffff','#e6e6e6']];
const TEMPLATES={titulo:{text:'Título forte',size:120,font:'Anton',y:35},sub:{text:'Subtítulo ou explicação curta',size:58,font:'Montserrat',y:55,bold:0},num:{text:'01',size:300,font:'Anton',y:40,op:.9},cita:{text:'“Uma frase que faz parar o scroll.”',size:72,font:'Playfair Display',y:50},cta:{text:'Desliza para o lado →',size:52,font:'Montserrat',y:90,box:1,boxc:'#ff2e93',boxa:1,sw:0}};
const ST={fmt:'4:5',slides:[],cur:0,sel:null,tab:'bg',open:false,busy:false,exp:{fmt:'png',scope:'all',q:.92}};
const IMGS={};let uid=1;const nid=p=>(p||'c')+(uid++);
const hist=[];let hi=-1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const log=m=>{try{if(typeof logErr==='function')logErr('carrossel: '+m);}catch(e){}};
function newSlide(from){const s={id:nid('s'),bg:{type:'grad',c1:'#1a1018',c2:'#ff2e93',ang:135,imgId:null,fit:'cover',zoom:1,ox:0,oy:0},fx:Object.assign({},FX_PRESETS.orig[1]),layers:[]};if(from){s.bg=Object.assign({},from.bg);s.fx=Object.assign({},from.fx);}return s;}
function newText(o){return Object.assign({id:nid('l'),type:'text',text:'Toca para editar',x:50,y:50,size:90,color:'#ffffff',font:'Montserrat',bold:1,up:0,align:'c',sw:.08,sc:'#000000',box:0,boxc:'#000000',boxa:.6,sh:1,rot:0,op:1},o||{});}
const cur=()=>ST.slides[ST.cur];
const selL=()=>{const s=cur();return s&&ST.sel?s.layers.find(l=>l.id===ST.sel)||null:null;};
const dims=()=>{const f=FORMATS[ST.fmt];return[f[0],f[1]];};
function snap(){return JSON.stringify({slides:ST.slides,cur:ST.cur,fmt:ST.fmt});}
function commit(){const s=snap();if(hist[hi]===s)return;hist.length=hi+1;hist.push(s);if(hist.length>50)hist.shift();hi=hist.length-1;}
function undo(){if(hi<=0)return;hi--;const o=JSON.parse(hist[hi]);ST.slides=o.slides;ST.cur=Math.min(o.cur,o.slides.length-1);ST.fmt=o.fmt;ST.sel=null;sizeMain();renderAll(true);}
function filterStr(f){return 'brightness('+f.br+') contrast('+f.co+') saturate('+f.sa+') blur('+(+f.bl||0)+'px) sepia('+f.se+') grayscale('+f.gr+') hue-rotate('+f.hu+'deg)';}
function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
const scratch=document.createElement('canvas').getContext('2d');
function layoutText(c,L,W){
 const px=Math.max(4,L.size*W/1080);c.font=(L.bold?800:500)+' '+px+'px "'+L.font+'", sans-serif';
 const maxW=W*.86,lines=[];let src=String(L.text==null?'':L.text);if(L.up)src=src.toUpperCase();
 src.split('\n').forEach(par=>{const words=par.split(/\s+/).filter(Boolean);if(!words.length){lines.push('');return;}let curL='';
  for(const w of words){const t=curL?curL+' '+w:w;if(curL&&c.measureText(t).width>maxW){lines.push(curL);curL=w;}else curL=t;}lines.push(curL);});
 const w=Math.max(px*.5,...lines.map(l=>c.measureText(l).width)),lh=px*1.18;
 return{px,lines,w,h:lines.length*lh,lh};}
function bounds(L,W){
 if(L.type==='text'){const m=layoutText(scratch,L,W),pad=m.px*.35;return{w:m.w+pad*2,h:m.h+pad*1.2};}
 const im=IMGS[L.imgId];if(!im)return{w:10,h:10};const w=L.w/100*W;return{w,h:w*(im.height/im.width)};}
function drawLayer(c,L,W,H){
 c.save();c.translate(L.x/100*W,L.y/100*H);c.rotate((L.rot||0)*Math.PI/180);
 if(L.type==='text'){
  const m=layoutText(c,L,W),pad=m.px*.35;
  if(L.box){c.save();c.globalAlpha=clamp(L.op*L.boxa,0,1);c.fillStyle=L.boxc;rr(c,-m.w/2-pad,-m.h/2-pad*.6,m.w+pad*2,m.h+pad*1.2,m.px*.25);c.fill();c.restore();}
  c.globalAlpha=clamp(L.op,0,1);c.textBaseline='middle';c.lineJoin='round';
  m.lines.forEach((ln,i)=>{const y=-m.h/2+m.lh*(i+.5);let x=0,al='center';if(L.align==='l'){x=-m.w/2;al='left';}else if(L.align==='r'){x=m.w/2;al='right';}
   c.textAlign=al;
   if(L.sw>0){c.lineWidth=m.px*L.sw*1.6;c.strokeStyle=L.sc;c.strokeText(ln,x,y);}
   if(L.sh&&!L.box){c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=m.px*.12;c.shadowOffsetY=m.px*.04;}
   c.fillStyle=L.color;c.fillText(ln,x,y);c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;});
 }else{
  const im=IMGS[L.imgId];if(im){const b=bounds(L,W);c.globalAlpha=clamp(L.op,0,1);if(L.rad>0){rr(c,-b.w/2,-b.h/2,b.w,b.h,Math.min(b.w,b.h)*L.rad/100);c.clip();}c.drawImage(im,-b.w/2,-b.h/2,b.w,b.h);}
 }
 c.restore();}
function drawBg(c,s,W,H){
 const b=s.bg;c.save();c.fillStyle=b.c1;c.fillRect(0,0,W,H);
 try{c.filter=filterStr(s.fx);}catch(e){}
 if(b.type==='color'){c.fillStyle=b.c1;c.fillRect(-W*.1,-H*.1,W*1.2,H*1.2);}
 else if(b.type==='grad'){const a=b.ang*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),hl=Math.abs(dx)*W/2+Math.abs(dy)*H/2,cx=W/2,cy=H/2;
  const g=c.createLinearGradient(cx-dx*hl,cy-dy*hl,cx+dx*hl,cy+dy*hl);g.addColorStop(0,b.c1);g.addColorStop(1,b.c2);c.fillStyle=g;c.fillRect(-W*.1,-H*.1,W*1.2,H*1.2);}
 else if(b.type==='image'){const im=IMGS[b.imgId];if(im){const sc=(b.fit==='contain'?Math.min(W/im.width,H/im.height):Math.max(W/im.width,H/im.height))*b.zoom,dw=im.width*sc,dh=im.height*sc;c.drawImage(im,(W-dw)/2+b.ox*W,(H-dh)/2+b.oy*H,dw,dh);}}
 c.restore();}
function renderSlide(c,s,W,H,guide){
 c.save();c.clearRect(0,0,W,H);drawBg(c,s,W,H);s.layers.forEach(L=>drawLayer(c,L,W,H));
 if(guide&&ST.sel){const L=s.layers.find(l=>l.id===ST.sel);if(L){const b=bounds(L,W);c.save();c.translate(L.x/100*W,L.y/100*H);c.rotate((L.rot||0)*Math.PI/180);c.strokeStyle='#ffd23f';c.lineWidth=Math.max(2,W/300);c.setLineDash([W/60,W/90]);c.strokeRect(-b.w/2,-b.h/2,b.w,b.h);c.restore();}}
 c.restore();}
let root,main,mctx,strip,body,tabsEl,statusEl,rafId=0;
const CSS='#fcCar{position:fixed;inset:0;z-index:9999;background:#14090f;color:#f4eef1;display:none;flex-direction:column;font-family:Satoshi,Montserrat,system-ui,sans-serif;height:100dvh}#fcCar.on{display:flex}#fcCar button,#fcCar select,#fcCar input,#fcCar textarea{font:inherit;color:inherit}#fcCar .fchead{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #37283a;flex:0 0 auto}#fcCar .fchead b{flex:1;font-size:16px}#fcCar .b{background:#2a1c2d;border:1px solid #4a3550;border-radius:10px;padding:8px 12px;min-height:40px;cursor:pointer}#fcCar .b.p{background:#ff2e93;border-color:#ff2e93;color:#fff;font-weight:700}#fcCar .b.d{color:#ff8a8a}#fcCar .b.on{outline:2px solid #ffd23f}#fcCar .b:disabled{opacity:.45}#fcCar select,#fcCar input[type=text],#fcCar input[type=number],#fcCar textarea{background:#241727;border:1px solid #4a3550;border-radius:10px;padding:8px;width:100%;box-sizing:border-box}#fcCar .fcstage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:8px;background:#0d060a}#fcCar #fcMain{max-width:100%;max-height:100%;touch-action:none;background:#000;box-shadow:0 0 0 1px #37283a}#fcCar .fcstrip{display:flex;gap:8px;overflow-x:auto;padding:8px;flex:0 0 auto;border-top:1px solid #37283a;align-items:center}#fcCar .fcth{flex:0 0 auto;border:2px solid transparent;border-radius:6px;padding:0;background:none;position:relative}#fcCar .fcth.on{border-color:#ff2e93}#fcCar .fcth canvas{display:block;height:64px;width:auto;border-radius:4px}#fcCar .fcth i{position:absolute;left:3px;top:2px;font:700 11px sans-serif;background:#000a;border-radius:4px;padding:0 4px;font-style:normal}#fcCar .fctools{display:flex;gap:6px;flex-wrap:wrap;padding:0 8px 6px;flex:0 0 auto}#fcCar .fctabs{display:flex;gap:4px;padding:0 8px;overflow-x:auto;flex:0 0 auto}#fcCar .fctabs button{flex:1 0 auto}#fcCar .fcbody{flex:0 0 auto;max-height:38dvh;overflow-y:auto;padding:8px 10px 14px;border-top:1px solid #37283a;background:#1a1018}#fcCar label{display:block;margin:8px 0;font-size:13px;color:#cdbfd0}#fcCar label.rg span{display:flex;justify-content:space-between}#fcCar input[type=range]{width:100%}#fcCar input[type=color]{width:100%;height:40px;border:1px solid #4a3550;border-radius:10px;background:#241727;padding:2px}#fcCar .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}#fcCar .fcsw{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}#fcCar .fcsw button{width:44px;height:44px;border-radius:10px;border:2px solid #4a3550}#fcCar .hint{font-size:12px;color:#a893ad;margin:6px 0}#fcCar .chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}';
function build(){
 const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
 root=document.createElement('div');root.id='fcCar';root.setAttribute('role','dialog');root.setAttribute('aria-label','Carrossel');
 root.innerHTML='<div class="fchead"><button class="b" data-act="close" aria-label="Fechar">✕</button><b>Carrossel</b><button class="b" data-act="undo" aria-label="Desfazer">↶</button><select id="fcFmt" aria-label="Formato" style="width:auto"></select><button class="b p" data-act="gotoexp">Exportar</button></div><div class="fcstage"><canvas id="fcMain"></canvas></div><div class="fcstrip" id="fcStrip"></div><div class="fctools"><button class="b" data-act="add">+ Slide</button><button class="b" data-act="dup">Duplicar</button><button class="b" data-act="left">◀</button><button class="b" data-act="right">▶</button><button class="b d" data-act="del">Apagar</button></div><div class="fctabs" id="fcTabs"></div><div class="fcbody" id="fcBody"></div>';
 document.body.appendChild(root);
 main=root.querySelector('#fcMain');mctx=main.getContext('2d');strip=root.querySelector('#fcStrip');body=root.querySelector('#fcBody');tabsEl=root.querySelector('#fcTabs');
 root.querySelector('#fcFmt').innerHTML=Object.entries(FORMATS).map(([k,v])=>'<option value="'+k+'">'+v[2]+'</option>').join('');
 root.addEventListener('click',onClick);root.addEventListener('input',onInput);root.addEventListener('change',onChange);
 main.addEventListener('pointerdown',pDown);main.addEventListener('pointermove',pMove);['pointerup','pointercancel'].forEach(n=>main.addEventListener(n,pUp));
 root.querySelector('#fcFmt').addEventListener('change',e=>{ST.fmt=e.target.value;sizeMain();commit();renderAll(true);});
}
function sizeMain(){const[W,H]=dims();main.width=PW;main.height=Math.round(PW*H/W);main.style.aspectRatio=W+'/'+H;const f=root.querySelector('#fcFmt');if(f)f.value=ST.fmt;}
function renderMain(){const s=cur();if(!s)return;renderSlide(mctx,s,main.width,main.height,true);}
function renderStrip(){
 const[W,H]=dims();const th=Math.round(120*H/W);
 strip.innerHTML=ST.slides.map((s,i)=>'<button class="fcth'+(i===ST.cur?' on':'')+'" data-act="go" data-i="'+i+'" aria-label="Slide '+(i+1)+'"><i>'+(i+1)+'</i><canvas width="120" height="'+th+'" data-i="'+i+'"></canvas></button>').join('');
 strip.querySelectorAll('canvas').forEach(cv=>{renderSlide(cv.getContext('2d'),ST.slides[+cv.dataset.i],cv.width,cv.height,false);});
 const sel=strip.querySelector('.fcth.on');if(sel&&sel.scrollIntoView)try{sel.scrollIntoView({inline:'nearest',block:'nearest'});}catch(e){}
}
function renderTabs(){const T=[['bg','Fundo'],['txt','Texto'],['img','Imagem'],['fx','Efeitos'],['exp','Exportar']];tabsEl.innerHTML=T.map(([k,n])=>'<button class="b'+(ST.tab===k?' on':'')+'" data-act="tab" data-k="'+k+'">'+n+'</button>').join('');}
function rg(t,k,label,min,max,step,v,fmt){return '<label class="rg"><span>'+label+'<b>'+(fmt?fmt(v):v)+'</b></span><input type="range" data-t="'+t+'" data-k="'+k+'" data-n="1" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></label>';}
function clr(t,k,label,v){return '<label>'+label+'<input type="color" data-t="'+t+'" data-k="'+k+'" value="'+v+'"></label>';}
function sel(t,k,label,opts,v){return '<label>'+label+'<select data-t="'+t+'" data-k="'+k+'">'+opts.map(([a,b])=>'<option value="'+a+'"'+(String(v)===String(a)?' selected':'')+'>'+b+'</option>').join('')+'</select></label>';}
function chk(t,k,label,v){return '<label><input type="checkbox" data-t="'+t+'" data-k="'+k+'" data-c="1"'+(v?' checked':'')+'> '+label+'</label>';}
const pct=v=>Math.round(v*100)+'%',n2=v=>(+v).toFixed(2);
function layerList(type){const s=cur();const arr=s.layers.filter(l=>l.type===type);if(!arr.length)return '<p class="hint">Sem camadas deste tipo neste slide.</p>';return '<div class="chips">'+arr.map(l=>'<button class="b'+(ST.sel===l.id?' on':'')+'" data-act="selL" data-id="'+l.id+'">'+esc(type==='text'?String(l.text).slice(0,18)||'(vazio)':'Imagem')+'</button>').join('')+'</div>';}
function panelBg(){const s=cur(),b=s.bg;
 let h=sel('bg','type','Tipo de fundo',[['color','Cor'],['grad','Degradê'],['image','Foto']],b.type);
 if(b.type==='color')h+=clr('bg','c1','Cor',b.c1);
 if(b.type==='grad')h+='<div class="row2">'+clr('bg','c1','Cor 1',b.c1)+clr('bg','c2','Cor 2',b.c2)+'</div>'+rg('bg','ang','Ângulo',0,360,5,b.ang,v=>Math.round(v)+'°');
 if(b.type!=='image')h+='<div class="fcsw">'+PALS.map((p,i)=>'<button data-act="pal" data-i="'+i+'" style="background:linear-gradient(135deg,'+p[0]+','+p[1]+')" aria-label="Paleta '+(i+1)+'"></button>').join('')+'</div>';
 if(b.type==='image'){h+='<div class="chips"><button class="b p" data-act="bgimg">'+(b.imgId?'Trocar foto':'Escolher foto')+'</button></div>'+sel('bg','fit','Ajuste',[['cover','Preencher'],['contain','Caber']],b.fit)+rg('bg','zoom','Zoom',1,3,.05,b.zoom,n2)+rg('bg','ox','Mover na horizontal',-.5,.5,.01,b.ox,pct)+rg('bg','oy','Mover na vertical',-.5,.5,.01,b.oy,pct);if(!b.imgId)h+='<p class="hint">Escolhe uma foto da galeria.</p>';}
 h+='<div class="chips"><button class="b" data-act="bgall">Aplicar este fundo a todos os slides</button></div>';return h;}
function panelText(){
 let h='<div class="chips"><button class="b p" data-act="addtext">+ Texto</button>'+Object.entries(TEMPLATES).map(([k,t])=>'<button class="b" data-act="tpl" data-k="'+k+'">'+({titulo:'Título',sub:'Subtítulo',num:'Número',cita:'Citação',cta:'Chamada'})[k]+'</button>').join('')+'</div>'+layerList('text');
 const L=selL();if(!L||L.type!=='text')return h+'<p class="hint">Toca num texto no slide ou na lista para o editar. Arrasta-o no slide para o mover.</p>';
 h+='<label>Texto<textarea rows="3" data-t="layer" data-k="text">'+esc(L.text)+'</textarea></label>'+rg('layer','size','Tamanho',20,400,1,L.size)+sel('layer','font','Fonte',FL.map(f=>[f,f]),L.font)+'<div class="row2">'+clr('layer','color','Cor',L.color)+sel('layer','align','Alinhamento',[['c','Centro'],['l','Esquerda'],['r','Direita']],L.align)+'</div>'+'<div class="row2">'+chk('layer','bold','Negrito',L.bold)+chk('layer','up','Maiúsculas',L.up)+'</div>'+rg('layer','sw','Contorno',0,.4,.01,L.sw,pct)+(L.sw>0?clr('layer','sc','Cor do contorno',L.sc):'')+chk('layer','sh','Sombra',L.sh)+chk('layer','box','Caixa atrás',L.box)+(L.box?'<div class="row2">'+clr('layer','boxc','Cor da caixa',L.boxc)+rg('layer','boxa','Opacidade',0,1,.05,L.boxa,pct)+'</div>':'')+rg('layer','x','Posição horizontal',0,100,1,L.x,v=>Math.round(v)+'%')+rg('layer','y','Posição vertical',0,100,1,L.y,v=>Math.round(v)+'%')+rg('layer','rot','Rotação',-180,180,1,L.rot,v=>Math.round(v)+'°')+rg('layer','op','Opacidade',0,1,.05,L.op,pct)+layerBtns();return h;}
function layerBtns(){return '<div class="chips"><button class="b" data-act="ldup">Duplicar</button><button class="b" data-act="lfront">Para a frente</button><button class="b" data-act="lback">Para trás</button><button class="b d" data-act="ldel">Apagar camada</button></div>';}
function panelImg(){
 let h='<div class="chips"><button class="b p" data-act="addimg">+ Imagem / logótipo</button></div>'+layerList('img');
 const L=selL();if(!L||L.type!=='img')return h+'<p class="hint">Adiciona uma imagem ou toca numa para a editar. Arrasta-a no slide para a mover.</p>';
 return h+rg('layer','w','Largura',5,150,1,L.w,v=>Math.round(v)+'%')+rg('layer','x','Posição horizontal',0,100,1,L.x,v=>Math.round(v)+'%')+rg('layer','y','Posição vertical',0,100,1,L.y,v=>Math.round(v)+'%')+rg('layer','rot','Rotação',-180,180,1,L.rot,v=>Math.round(v)+'°')+rg('layer','op','Opacidade',0,1,.05,L.op,pct)+rg('layer','rad','Cantos redondos',0,50,1,L.rad||0,v=>Math.round(v)+'%')+layerBtns();}
function panelFx(){const s=cur(),f=s.fx;
 return '<p class="hint">Os efeitos aplicam-se ao fundo do slide (cor, degradê ou foto).</p><div class="chips">'+Object.entries(FX_PRESETS).map(([k,v])=>'<button class="b" data-act="fxp" data-k="'+k+'">'+v[0]+'</button>').join('')+'</div>'+rg('fx','br','Brilho',.4,1.8,.01,f.br,n2)+rg('fx','co','Contraste',.4,1.8,.01,f.co,n2)+rg('fx','sa','Saturação',0,2.5,.01,f.sa,n2)+rg('fx','hu','Matiz',-180,180,1,f.hu,v=>Math.round(v)+'°')+rg('fx','se','Sépia',0,1,.01,f.se,pct)+rg('fx','gr','Preto e branco',0,1,.01,f.gr,pct)+rg('fx','bl','Desfocar',0,12,.1,f.bl,v=>(+v).toFixed(1)+'px')+'<div class="chips"><button class="b" data-act="fxall">Aplicar efeitos a todos os slides</button></div>';}
function panelExp(){const e=ST.exp,[W,H]=dims();
 return sel('exp','fmt','Formato do ficheiro',[['png','PNG (imagens)'],['jpg','JPG (imagens, mais leve)'],['pdf','PDF (um ficheiro)'],['zip','ZIP (todas as imagens)']],e.fmt)+sel('exp','scope','Slides',[['all','Todos ('+ST.slides.length+')'],['cur','Só o atual']],e.scope)+(e.fmt==='jpg'||e.fmt==='pdf'||e.fmt==='zip'?rg('exp','q','Qualidade JPG',.5,1,.01,e.q,pct):'')+'<p class="hint">Tamanho: '+W+'×'+H+' px. PNG e JPG descarregam um ficheiro por slide.</p><div class="chips"><button class="b p" data-act="export"'+(ST.busy?' disabled':'')+'>Exportar</button><button class="b" data-act="share"'+(ST.busy?' disabled':'')+'>Partilhar</button></div><p class="hint" id="fcStatus"></p>';}
function renderPanel(){renderTabs();const fn={bg:panelBg,txt:panelText,img:panelImg,fx:panelFx,exp:panelExp}[ST.tab];body.innerHTML=fn();statusEl=body.querySelector('#fcStatus');}
function renderAll(full){renderMain();renderStrip();if(full)renderPanel();}
function schedule(){if(rafId)return;rafId=requestAnimationFrame(()=>{rafId=0;renderMain();renderStrip();});}
const fileIn=document.createElement('input');fileIn.type='file';fileIn.accept='image/*';fileIn.hidden=true;
async function loadFile(f){
 const url=URL.createObjectURL(f);try{
  const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Imagem não suportada: '+f.name));i.src=url;});
  const mx=2400,sc=Math.min(1,mx/Math.max(im.naturalWidth,im.naturalHeight)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(im.naturalWidth*sc));cv.height=Math.max(1,Math.round(im.naturalHeight*sc));cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
  const id=nid('m');IMGS[id]=cv;return id;}finally{URL.revokeObjectURL(url);}}
function pickImage(){return new Promise(res=>{fileIn.value='';fileIn.onchange=async()=>{const f=fileIn.files&&fileIn.files[0];if(!f)return res(null);try{res(await loadFile(f));}catch(e){toastMsg(e.message);res(null);}};fileIn.click();});}
function toastMsg(m){try{if(typeof toast==='function'){toast(m,4000);return;}}catch(e){}if(statusEl)statusEl.textContent=m;else alert(m);}
async function onClick(e){
 const b=e.target.closest('[data-act]');if(!b||ST.busy&&b.dataset.act!=='close')return;const a=b.dataset.act,s=cur();
 if(a==='close'){close();return;}
 if(a==='undo'){undo();return;}
 if(a==='go'){ST.cur=+b.dataset.i;ST.sel=null;renderAll(true);return;}
 if(a==='add'){if(ST.slides.length>=MAXS)return toastMsg('Máximo de '+MAXS+' slides.');ST.slides.splice(ST.cur+1,0,newSlide(s));ST.cur++;ST.sel=null;commit();renderAll(true);return;}
 if(a==='dup'){if(ST.slides.length>=MAXS)return toastMsg('Máximo de '+MAXS+' slides.');const c=JSON.parse(JSON.stringify(s));c.id=nid('s');c.layers.forEach(l=>{l.id=nid('l');});ST.slides.splice(ST.cur+1,0,c);ST.cur++;ST.sel=null;commit();renderAll(true);return;}
 if(a==='del'){if(ST.slides.length<=1){ST.slides[0]=newSlide();}else{ST.slides.splice(ST.cur,1);ST.cur=Math.min(ST.cur,ST.slides.length-1);}ST.sel=null;commit();renderAll(true);return;}
 if(a==='left'||a==='right'){const j=ST.cur+(a==='left'?-1:1);if(j<0||j>=ST.slides.length)return;const t=ST.slides[ST.cur];ST.slides[ST.cur]=ST.slides[j];ST.slides[j]=t;ST.cur=j;commit();renderAll(true);return;}
 if(a==='tab'){ST.tab=b.dataset.k;renderPanel();return;}
 if(a==='gotoexp'){ST.tab='exp';renderPanel();body.scrollTop=0;return;}
 if(a==='pal'){const p=PALS[+b.dataset.i];s.bg.c1=p[0];s.bg.c2=p[1];if(s.bg.type==='color')s.bg.type='grad';commit();renderAll(true);return;}
 if(a==='bgimg'){const id=await pickImage();if(id){s.bg.imgId=id;s.bg.type='image';commit();renderAll(true);}return;}
 if(a==='bgall'){ST.slides.forEach(x=>{x.bg=Object.assign({},s.bg);});commit();renderAll(true);toastMsg('Fundo aplicado a todos.');return;}
 if(a==='fxp'){Object.assign(s.fx,FX_PRESETS[b.dataset.k][1]);commit();renderAll(true);return;}
 if(a==='fxall'){ST.slides.forEach(x=>{x.fx=Object.assign({},s.fx);});commit();renderAll(true);toastMsg('Efeitos aplicados a todos.');return;}
 if(a==='addtext'||a==='tpl'){const L=newText(a==='tpl'?TEMPLATES[b.dataset.k]:{});s.layers.push(L);ST.sel=L.id;ST.tab='txt';commit();renderAll(true);return;}
 if(a==='addimg'){const id=await pickImage();if(!id)return;const im=IMGS[id],L={id:nid('l'),type:'img',imgId:id,x:50,y:50,w:im.width>=im.height?60:40,rot:0,op:1,rad:0};s.layers.push(L);ST.sel=L.id;ST.tab='img';commit();renderAll(true);return;}
 if(a==='selL'){ST.sel=b.dataset.id;renderAll(true);return;}
 const L=selL();
 if(a==='ldel'&&L){s.layers=s.layers.filter(x=>x!==L);ST.sel=null;commit();renderAll(true);return;}
 if(a==='ldup'&&L){const c=JSON.parse(JSON.stringify(L));c.id=nid('l');c.x=clamp(c.x+4,0,100);c.y=clamp(c.y+4,0,100);s.layers.push(c);ST.sel=c.id;commit();renderAll(true);return;}
 if(a==='lfront'&&L){s.layers=s.layers.filter(x=>x!==L).concat(L);commit();renderAll(true);return;}
 if(a==='lback'&&L){s.layers=[L].concat(s.layers.filter(x=>x!==L));commit();renderAll(true);return;}
 if(a==='export'){exportAll(false);return;}
 if(a==='share'){exportAll(true);return;}
}
function targetObj(t){const s=cur();if(t==='bg')return s.bg;if(t==='fx')return s.fx;if(t==='layer')return selL();if(t==='exp')return ST.exp;return null;}
function onInput(e){const el=e.target;if(!el.dataset||!el.dataset.t)return;const o=targetObj(el.dataset.t);if(!o)return;const k=el.dataset.k;
 let v=el.dataset.c?(el.checked?1:0):el.dataset.n?parseFloat(el.value):el.value;if(typeof v==='number'&&isNaN(v))return;
 o[k]=v;const out=el.closest('label')&&el.closest('label').querySelector('b');if(out&&el.type==='range'){const m=el.value;out.textContent=({size:m,x:Math.round(m)+'%',y:Math.round(m)+'%',w:Math.round(m)+'%',rot:Math.round(m)+'°',ang:Math.round(m)+'°',hu:Math.round(m)+'°',bl:(+m).toFixed(1)+'px',rad:Math.round(m)+'%'})[k]||(['op','sw','boxa','se','gr','ox','oy','q'].includes(k)?Math.round(m*100)+'%':(+m).toFixed(2));}
 if(el.type==='range'||el.type==='color'||el.tagName==='TEXTAREA'||el.type==='text')schedule();}
function onChange(e){const el=e.target;if(!el.dataset||!el.dataset.t)return;onInput(e);commit();
 if(el.tagName==='SELECT'||el.type==='checkbox'||el.dataset.k==='sw'||el.dataset.k==='type'){renderAll(true);}else{renderAll(false);}}
let drag=null;
function ptr(e){const r=main.getBoundingClientRect();return{x:(e.clientX-r.left)*main.width/r.width,y:(e.clientY-r.top)*main.height/r.height};}
function hit(p){const s=cur(),W=main.width,H=main.height;for(let i=s.layers.length-1;i>=0;i--){const L=s.layers[i],b=bounds(L,W),dx=p.x-L.x/100*W,dy=p.y-L.y/100*H,a=-(L.rot||0)*Math.PI/180,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a),pad=W*.02;if(Math.abs(lx)<=b.w/2+pad&&Math.abs(ly)<=b.h/2+pad)return L;}return null;}
function pDown(e){const p=ptr(e),L=hit(p);if(!L){if(ST.sel){ST.sel=null;renderAll(true);}return;}
 ST.sel=L.id;if(L.type==='text'&&ST.tab!=='txt')ST.tab='txt';if(L.type==='img'&&ST.tab!=='img')ST.tab='img';
 drag={id:L.id,sx:p.x,sy:p.y,ox:L.x,oy:L.y,moved:false};try{main.setPointerCapture(e.pointerId);}catch(x){}renderAll(true);}
function pMove(e){if(!drag)return;const p=ptr(e),L=selL();if(!L)return;const W=main.width,H=main.height;L.x=clamp(drag.ox+(p.x-drag.sx)/W*100,0,100);L.y=clamp(drag.oy+(p.y-drag.sy)/H*100,0,100);drag.moved=true;renderMain();}
function pUp(){if(!drag)return;const m=drag.moved;drag=null;if(m){commit();renderAll(true);}}
async function slideBlob(s,type,q){const[W,H]=dims(),cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');renderSlide(c,s,W,H,false);return await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('Falhou a gerar a imagem.')),type,q));}
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=t[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};})();
function makeZip(files){
 const enc=new TextEncoder(),parts=[],central=[];let off=0;
 for(const f of files){const nm=enc.encode(f.name),crc=CRC(f.data),sz=f.data.length;
  const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nm.length,true);
  parts.push(new Uint8Array(lh.buffer),nm,f.data);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(14,0x21,true);ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
  central.push(new Uint8Array(ch.buffer),nm);off+=30+nm.length+sz;}
 let cl=0;central.forEach(p=>{cl+=p.length;});
 const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cl,true);end.setUint32(16,off,true);
 return new Blob(parts.concat(central,[new Uint8Array(end.buffer)]),{type:'application/zip'});}
async function makePdf(jpgs,W,H){
 const enc=new TextEncoder(),chunks=[],offs=[];let pos=0;
 const push=u=>{chunks.push(u);pos+=u.length;},str=s=>push(enc.encode(s));
 const obj=(id,fn)=>{offs[id]=pos;str(id+' 0 obj\n');fn();str('\nendobj\n');};
 const n=jpgs.length,pw=(W*.75).toFixed(2),ph=(H*.75).toFixed(2);
 str('%PDF-1.4\n');push(new Uint8Array([37,226,227,207,211,10]));
 obj(1,()=>str('<< /Type /Catalog /Pages 2 0 R >>'));
 const kids=[];for(let i=0;i<n;i++)kids.push((3+3*i)+' 0 R');
 obj(2,()=>str('<< /Type /Pages /Count '+n+' /Kids ['+kids.join(' ')+'] >>'));
 for(let i=0;i<n;i++){const data=new Uint8Array(await jpgs[i].arrayBuffer()),pg=3+3*i,ct=4+3*i,im=5+3*i,cs='q '+pw+' 0 0 '+ph+' 0 0 cm /Im0 Do Q';
  obj(pg,()=>str('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pw+' '+ph+'] /Resources << /XObject << /Im0 '+im+' 0 R >> >> /Contents '+ct+' 0 R >>'));
  obj(ct,()=>str('<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream'));
  obj(im,()=>{str('<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+data.length+' >>\nstream\n');push(data);str('\nendstream');});}
 const total=3+3*n,xr=pos;str('xref\n0 '+total+'\n0000000000 65535 f \n');
 for(let id=1;id<total;id++)str(String(offs[id]).padStart(10,'0')+' 00000 n \n');
 str('trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF');
 return new Blob(chunks,{type:'application/pdf'});}
function setStatus(m){if(statusEl)statusEl.textContent=m;}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),20000);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function exportAll(share){
 if(ST.busy)return;ST.busy=true;renderPanel();const e=ST.exp,list=e.scope==='cur'?[cur()]:ST.slides.slice(),[W,H]=dims(),jpg=e.fmt!=='png',type=jpg?'image/jpeg':'image/png',ext=jpg?'jpg':'png',pad=String(list.length).length;
 try{
  const name=i=>'carrossel-'+String(i+1).padStart(Math.max(2,pad),'0')+'.'+ext;
  const blobs=[];for(let i=0;i<list.length;i++){setStatus('A gerar slide '+(i+1)+' de '+list.length+'…');blobs.push(await slideBlob(list[i],e.fmt==='pdf'?'image/jpeg':type,e.fmt==='pdf'||jpg?e.q:undefined));await sleep(0);}
  let files=[];
  if(e.fmt==='pdf')files=[new File([await makePdf(blobs,W,H)],'carrossel.pdf',{type:'application/pdf'})];
  else if(e.fmt==='zip'){const fl=[];for(let i=0;i<blobs.length;i++)fl.push({name:'carrossel-'+String(i+1).padStart(Math.max(2,pad),'0')+'.jpg',data:new Uint8Array(await blobs[i].arrayBuffer())});files=[new File([makeZip(fl)],'carrossel.zip',{type:'application/zip'})];}
  else files=blobs.map((b,i)=>new File([b],name(i),{type}));
  if(share){if(navigator.canShare&&navigator.canShare({files})){await navigator.share({files,title:'Carrossel'});setStatus('Partilhado.');}else{setStatus('Partilha de ficheiros não suportada aqui. Usa Exportar.');}}
  else{for(let i=0;i<files.length;i++){dl(files[i],files[i].name);if(files.length>1)await sleep(450);}setStatus('Concluído: '+files.length+(files.length===1?' ficheiro.':' ficheiros.'));}
 }catch(err){log(err.message);setStatus('Erro: '+err.message);}
 finally{ST.busy=false;const msg=statusEl?statusEl.textContent:'';renderPanel();setStatus(msg);}
}
function open(){if(!root)init();if(!ST.slides.length){const s=newSlide();s.layers.push(newText({text:'Título do carrossel',size:130,font:'Anton',y:42}),newText({text:'Desliza para ver mais →',size:52,y:88,sw:0,box:1,boxc:'#000000',boxa:.55}));ST.slides.push(s);ST.cur=0;commit();}
 try{if(typeof S!=='undefined'&&S.playing&&typeof pause==='function')pause();}catch(e){}
 ST.open=true;root.classList.add('on');document.documentElement.style.overflow='hidden';sizeMain();renderAll(true);
 if(document.fonts&&document.fonts.load){Promise.all(FL.map(f=>document.fonts.load('700 40px "'+f+'"'))).then(()=>{if(ST.open)renderAll(false);}).catch(()=>{});}}
function close(){ST.open=false;if(root)root.classList.remove('on');document.documentElement.style.overflow='';}
function addButton(){
 if(document.getElementById('btnCarousel'))return true;
 const host=document.querySelector('.projbar')||document.querySelector('.topr');
 const b=document.createElement('button');b.id='btnCarousel';b.type='button';b.className='btn sm';b.textContent='Carrossel';b.setAttribute('aria-label','Abrir modo Carrossel');b.addEventListener('click',open);
 if(host){const first=host.querySelector('#btnProj');if(first&&first.nextSibling)host.insertBefore(b,first.nextSibling);else host.appendChild(b);return true;}
 b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:900';document.body.appendChild(b);return true;}
let inited=false;
function init(){if(inited)return;inited=true;build();document.body.appendChild(fileIn);}
addButton();setTimeout(addButton,800);setTimeout(addButton,2500);
window.addEventListener('keydown',e=>{if(ST.open&&e.key==='Escape')close();});
window.FenixCarousel={open,close,ST,renderSlide,makeZip,makePdf,slideBlob,FORMATS,IMGS};
})();
