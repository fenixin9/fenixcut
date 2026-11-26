/* FenixCut V27: texto avançado (animações de entrada/saída/loop, contorno, sombra, brilho, gradiente, balões, 3D), estilos novos e fontes. Não altera fx.js nem app.js: textos antigos continuam a usar o desenhador original. */
'use strict';
(function(){
 if(typeof drawTextObj!=='function'||typeof TEXT_STYLES==='undefined'||typeof drawRich!=='function')return;
 const orig=drawTextObj;
 const log=m=>{try{if(typeof logErr==='function')logErr('texto: '+m);}catch(e){}};
 const EXT=['ain','aout','aloop','aind','aoutd','alps','ax','rot','op','al','ls','lh','it','ul','up','sw','sc','shb','shc','shx','shy','glb','glc','ga','gb','gd','fa','bc','ba','bshape','bp','d3','d3c'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const eo=u=>1-Math.pow(1-clamp(u,0,1),3);
 const back=u=>{u=clamp(u,0,1);const c1=1.70158,c3=c1+1,t=u-1;return 1+c3*t*t*t+c1*t*t;};
 const bnc=u=>{u=clamp(u,0,1);const n=7.5625,d=2.75;if(u<1/d)return n*u*u;if(u<2/d){u-=1.5/d;return n*u*u+.75;}if(u<2.5/d){u-=2.25/d;return n*u*u+.9375;}u-=2.625/d;return n*u*u+.984375;};
 const hash=n=>{const s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s);};
 function applyAnim(st,kind,u,px,W,l,dir){
  if(!kind||kind==='none'||u>=1)return;
  const e=eo(u);
  switch(kind){
   case 'fade':st.a*=u;break;
   case 'zoom':{const s=.3+.7*e;st.sx*=s;st.sy*=s;st.a*=Math.min(1,u*2);break;}
   case 'big':{const s=1+1.2*(1-e);st.sx*=s;st.sy*=s;st.a*=u;break;}
   case 'pop':{const s=Math.max(.01,back(u));st.sx*=s;st.sy*=s;st.a*=Math.min(1,u*3);break;}
   case 'rise':st.dy+=dir*(1-e)*px*.9;st.a*=u;break;
   case 'fall':st.dy-=dir*(1-e)*px*.9;st.a*=u;break;
   case 'left':st.dx-=(1-e)*W*.6;st.a*=Math.min(1,u*2);break;
   case 'right':st.dx+=(1-e)*W*.6;st.a*=Math.min(1,u*2);break;
   case 'blur':st.blur+=(1-u)*px*.35;st.a*=Math.min(1,u*2);break;
   case 'spin':{const s=Math.max(.02,e);st.rot-=dir*(1-e)*Math.PI*2;st.sx*=s;st.sy*=s;st.a*=Math.min(1,u*2);break;}
   case 'flip':st.sy*=Math.max(.02,e);st.a*=Math.min(1,u*3);break;
   case 'wipe':st.wipe=Math.min(st.wipe,e);break;
   case 'stretch':st.sx*=1+(1-e)*2.2;st.a*=e;break;
   case 'glitch':{const k=1-u;st.rgb+=k*px*.22;st.dx+=Math.sin(l*90)*k*px*.25;st.a*=Math.min(1,u*4);break;}
   case 'flicker':st.a*=hash(Math.floor(l*24)+7)>(1-u)*.85?1:.12;break;
   case 'bounce':st.dy-=dir*(1-bnc(u))*px*1.5;st.a*=Math.min(1,u*4);break;
   case 'spread':st.lsx+=(1-e)*.3;st.a*=u;break;
   case 'type':case 'words':case 'cascade':st.per.push({k:kind,u});break;
  }
 }
 function applyLoop(st,kind,t,px,sp){
  if(!kind||kind==='none')return;
  const w=2*Math.PI*sp,f=Math.floor(t*24);
  switch(kind){
   case 'pulse':{const s=1+.07*Math.sin(t*w*1.1);st.sx*=s;st.sy*=s;break;}
   case 'heartbeat':{const s=1+.14*Math.pow(Math.max(0,Math.sin(t*w*1.6)),6);st.sx*=s;st.sy*=s;break;}
   case 'float':st.dy+=Math.sin(t*w*.8)*px*.12;break;
   case 'wiggle':st.rot+=Math.sin(t*w*1.6)*.07;break;
   case 'swing':st.rot+=Math.sin(t*w*.8)*.14;break;
   case 'shake':st.dx+=(hash(f)-.5)*px*.08;st.dy+=(hash(f+50)-.5)*px*.08;break;
   case 'blink':st.a*=Math.sin(t*w*1.3)>-.25?1:.12;break;
   case 'flicker':st.a*=hash(f+3)>.15?1:.25;break;
   case 'neon':st.glowm*=.55+.9*(.5+.5*Math.sin(t*w*1.4));st.a*=hash(Math.floor(t*12)+9)>.04?1:.6;break;
   case 'wave':st.per.push({k:'wave'});break;
   case 'rainbow':st.per.push({k:'rainbow'});break;
   case 'glitch':if(hash(Math.floor(t*8)+11)>.72){st.rgb+=px*.12;st.dx+=(hash(Math.floor(t*30))-.5)*px*.2;}break;
  }
 }
 function glyphState(st,i,n,wi,wn){
  let a=1,dy=0,hue=null,vis=true;
  for(const p of st.per){
   if(p.k==='type'){if(!(i<Math.floor(p.u*n+1e-6)))vis=false;}
   else if(p.k==='words'){if(!(wi<Math.floor(p.u*wn+1e-6)))vis=false;}
   else if(p.k==='cascade'){const s=.6,q=clamp(p.u*(1+s)-s*i/Math.max(1,n),0,1);a*=Math.min(1,q*3);dy-=(1-eo(q))*st.px;}
   else if(p.k==='wave'){dy+=Math.sin(st.t*6.5*st.sp-i*.55)*st.px*.14;}
   else if(p.k==='rainbow'){hue=(st.t*140*st.sp+i*28)%360;}
  }
  return{a,dy,hue,vis,sc:1,rot:0};
 }
 function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
 function drawShape(c,shape,bx,by,bw,bh,px){
  if(shape==='box'){c.fillRect(bx,by,bw,bh);}
  else if(shape==='round'){rr(c,bx,by,bw,bh,px*.3);c.fill();}
  else if(shape==='pill'){rr(c,bx,by,bw,bh,bh/2);c.fill();}
  else if(shape==='speech'){rr(c,bx,by,bw,bh,px*.3);c.fill();c.beginPath();c.moveTo(-px*.3,by+bh-1);c.lineTo(-px*.05,by+bh+px*.5);c.lineTo(px*.3,by+bh-1);c.closePath();c.fill();}
  else if(shape==='burst'){const cx=bx+bw/2,cy=by+bh/2,rx=bw/2*1.1+px*.3,ry=bh/2*1.3+px*.3;c.beginPath();for(let i=0;i<32;i++){const a=i*Math.PI/16,r=i%2?.8:1;const X=cx+Math.cos(a)*rx*r,Y=cy+Math.sin(a)*ry*r;if(i)c.lineTo(X,Y);else c.moveTo(X,Y);}c.closePath();c.fill();}
  else if(shape==='banner'){const n=bh*.3;c.beginPath();c.moveTo(bx-n,by);c.lineTo(bx+bw+n,by);c.lineTo(bx+bw,by+bh/2);c.lineTo(bx+bw+n,by+bh);c.lineTo(bx-n,by+bh);c.lineTo(bx,by+bh/2);c.closePath();c.fill();}
 }
 function draw2(ctx,W,H,x,l){
  let text=String(x.text==null?'':x.text);if(x.up)text=text.toUpperCase();
  if(!text.trim())return;
  const px=Math.max(4,(x.size||80)*W/1080),dur=Math.max(.2,x.dur||3),legacy=x.anim;
  const ain=x.ain!==undefined?x.ain:(legacy==='pop'?'pop':legacy==='fade'?'fade':legacy==='slide'?'rise':legacy==='type'?'type':'none');
  const aout=x.aout!==undefined?x.aout:(legacy==='fade'?'fade':'none');
  const dIn=clamp(x.aind||((ain==='type'&&x.ain===undefined)?clamp(dur*.6,.3,2):.5),.1,Math.max(.1,dur*.8));
  const dOut=clamp(x.aoutd||.4,.1,Math.max(.1,dur*.8));
  const sp=clamp(x.alps||1,.2,4);
  const st={a:1,dx:0,dy:0,sx:1,sy:1,rot:0,blur:0,wipe:1,rgb:0,lsx:0,glowm:1,per:[],px,t:l,sp};
  applyAnim(st,ain,l<dIn?l/dIn:1,px,W,l,1);
  applyAnim(st,aout,(dur-l)<dOut?(dur-l)/dOut:1,px,W,l,-1);
  applyLoop(st,x.aloop,l,px,sp);
  const op=x.op==null?1:x.op;
  if(st.a*op<=.003)return;
  const family=x.font||'Montserrat';
  ctx.save();
  ctx.font=(x.it?'italic ':'')+(x.bold?800:600)+' '+px+'px "'+family+'", sans-serif';
  ctx.textBaseline='middle';ctx.textAlign='left';
  const ls=((x.ls||0)+st.lsx)*px,lh=px*(x.lh||1.2),maxW=W*.84,spw=ctx.measureText(' ').width+ls;
  const lines=[];let gn=0,wn=0;
  for(const para of text.split('\n')){
   let cur={words:[],w:0};
   for(const word of para.split(/\s+/).filter(Boolean)){
    const chars=Array.from(word),w=ctx.measureText(word).width+ls*chars.length;
    if(cur.words.length&&cur.w+spw+w>maxW){lines.push(cur);cur={words:[],w:0};}
    const wd={t:word,chars,w,x:cur.words.length?cur.w+spw:0,g0:gn,wi:wn};
    gn+=chars.length;wn++;cur.words.push(wd);cur.w=wd.x+w;
   }
   lines.push(cur);
  }
  const bw=Math.max(px*.5,...lines.map(q=>q.w)),bh=lines.length*lh;
  const cx=W*(x.ax==null?50:x.ax)/100,cy=H*(x.y==null?50:x.y)/100;
  ctx.globalAlpha=clamp(op*st.a,0,1);const baseA=ctx.globalAlpha;
  ctx.translate(cx+st.dx,cy+st.dy);ctx.rotate((x.rot||0)*Math.PI/180+st.rot);ctx.scale(st.sx,st.sy);
  if(st.blur>.3&&'filter' in ctx)ctx.filter='blur('+st.blur.toFixed(1)+'px)';
  if(st.wipe<1){const pad=px*.8;ctx.beginPath();ctx.rect(-bw/2-pad,-bh/2-pad,(bw+2*pad)*st.wipe,bh+2*pad);ctx.clip();}
  const shape=x.bshape||(x.bg?'round':'none');
  const ba=x.ba!==undefined?x.ba:(x.bg?.62:(shape!=='none'?1:0));
  const bc=x.bc||'#000000',padX=px*(x.bp==null?.45:x.bp),padY=padX*.45;
  const align=x.al||'c',lineLeft=q=>align==='l'?-bw/2:align==='r'?bw/2-q.w:-q.w/2;
  if(shape!=='none'&&ba>0){
   ctx.save();ctx.globalAlpha=baseA*ba;ctx.fillStyle=bc;
   if(shape==='marker'){lines.forEach((q,j)=>{if(!q.words.length)return;const yc=-bh/2+lh/2+j*lh;rr(ctx,lineLeft(q)-px*.2,yc-lh*.26,q.w+px*.4,lh*.68,px*.08);ctx.fill();});}
   else drawShape(ctx,shape,-bw/2-padX,-bh/2-padY,bw+2*padX,bh+2*padY,px);
   ctx.restore();
  }
  let fill=x.color||'#ffffff';
  if(x.ga&&x.gb){const ang=(x.gd==null?90:x.gd)*Math.PI/180,c=Math.cos(ang),s=Math.sin(ang),hl=Math.abs(c)*bw/2+Math.abs(s)*bh/2+.001,g=ctx.createLinearGradient(-c*hl,-s*hl,c*hl,s*hl);g.addColorStop(0,x.ga);g.addColorStop(1,x.gb);fill=g;}
  const strokeW=(x.sw!==undefined?x.sw:(x.stroke?.16:0))*px,strokeC=x.sc||'#000000';
  const glc=x.glc||(typeof x.glow==='string'&&x.glow)||(typeof fill==='string'?fill:'#ffffff');
  const glb=(x.glb!==undefined?x.glb:(x.glow?.5:0))*st.glowm;
  const cfgShadow=x.shb!==undefined||x.shx!==undefined||x.shy!==undefined;
  const defShadow=!cfgShadow&&!x.stroke&&!(strokeW>0)&&shape==='none'&&!(glb>0)&&!(x.ga&&x.gb);
  const shC=x.shc||'rgba(0,0,0,.75)',shB=(cfgShadow?(x.shb||0):.22)*px,shX=cfgShadow?(x.shx||0)*px:0,shY=cfgShadow?(x.shy||0)*px:.04*px;
  const fa=x.fa==null?1:x.fa,d3=(x.d3||0)*px;
  const perChar=ls!==0||st.per.length>0;
  function run(str,rx,ry,w,g){
   if(!g.vis)return;
   ctx.save();ctx.globalAlpha=baseA*g.a;
   const gx=rx,gy=ry+g.dy;
   const ink=g.hue!=null?'hsl('+g.hue+',92%,62%)':fill;
   if(st.rgb>.5){ctx.save();ctx.globalAlpha*=.8;ctx.fillStyle='rgb(255,0,70)';ctx.fillText(str,gx-st.rgb,gy);ctx.fillStyle='rgb(0,230,255)';ctx.fillText(str,gx+st.rgb,gy);ctx.restore();}
   if(d3>0){const n=Math.min(40,Math.max(2,Math.round(d3/1.5))),step=d3/n;ctx.fillStyle=x.d3c||'#000000';ctx.strokeStyle=x.d3c||'#000000';ctx.lineJoin='round';ctx.lineWidth=strokeW;for(let i=n;i>=1;i--){if(strokeW>0)ctx.strokeText(str,gx+i*step,gy+i*step);ctx.fillText(str,gx+i*step,gy+i*step);}}
   if(glb>0){ctx.save();ctx.shadowColor=glc;ctx.shadowBlur=glb*px;ctx.fillStyle=ink;ctx.fillText(str,gx,gy);ctx.fillText(str,gx,gy);ctx.restore();}
   ctx.save();
   if(cfgShadow||defShadow){ctx.shadowColor=shC;ctx.shadowBlur=shB;ctx.shadowOffsetX=shX;ctx.shadowOffsetY=shY;}
   if(strokeW>0){ctx.lineWidth=strokeW;ctx.lineJoin='round';ctx.strokeStyle=strokeC;ctx.strokeText(str,gx,gy);ctx.shadowColor='transparent';}
   ctx.globalAlpha*=fa;ctx.fillStyle=ink;ctx.fillText(str,gx,gy);
   ctx.restore();ctx.restore();
  }
  lines.forEach((q,j)=>{
   const y=-bh/2+lh/2+j*lh,lx=lineLeft(q);
   q.words.forEach(wd=>{
    const wx=lx+wd.x;
    if(!perChar){run(wd.t,wx,y,wd.w,glyphState(st,wd.g0,gn,wd.wi,wn));}
    else wd.chars.forEach((ch,i)=>{const off=ctx.measureText(wd.chars.slice(0,i).join('')).width+i*ls;run(ch,wx+off,y,0,glyphState(st,wd.g0+i,gn,wd.wi,wn));});
   });
   if(x.ul&&q.words.length){ctx.save();ctx.globalAlpha=baseA;ctx.fillStyle=typeof fill==='string'?fill:'#ffffff';ctx.fillRect(lx,y+px*.5,q.w-ls,Math.max(2,px*.08));ctx.restore();}
  });
  ctx.restore();
 }
 drawTextObj=function(ctx,W,H,x,l){
  if(x.cut||!EXT.some(k=>x[k]!==undefined))return orig(ctx,W,H,x,l);
  try{draw2(ctx,W,H,x,l);}catch(e){log(e.message);try{orig(ctx,W,H,x,l);}catch(e2){}}
 };
 const B={bold:true,stroke:false,bg:false,glow:'',cut:false,anim:'none'};
 const N=(n,o)=>Object.assign({n,color:'#ffffff',font:'Montserrat'},B,o);
 const NEWST={
  neonciano:N('Néon ciano',{color:'#e8ffff',glc:'#00e5ff',glb:.55,ain:'flicker',aind:.7,aloop:'neon',aout:'fade'}),
  neonrosa:N('Néon rosa',{color:'#fff0fa',glc:'#ff2ea6',glb:.6,ain:'fade',aloop:'neon',aout:'fade'}),
  ouro3d:N('Ouro 3D',{font:'Anton',ga:'#fff3a0',gb:'#d4880b',gd:90,sw:.05,sc:'#3a2200',d3:.05,d3c:'#7a4a00',ain:'zoom',aout:'fade'}),
  cromado:N('Cromado',{font:'Anton',ga:'#ffffff',gb:'#8a95a5',gd:90,sw:.05,sc:'#111111',shb:.15,shy:.05,shc:'rgba(0,0,0,.6)',ain:'wipe',aout:'fade'}),
  fogo:N('Fogo',{font:'Bebas Neue',ga:'#fff176',gb:'#ff3d00',gd:90,glc:'#ff6a00',glb:.45,aloop:'flicker',ain:'rise',aout:'fade'}),
  gelo:N('Gelo',{ga:'#ffffff',gb:'#6fd3ff',gd:90,glc:'#aeeaff',glb:.35,sw:.04,sc:'#0b4a73',ain:'fade',aout:'fade'}),
  poente:N('Pôr do sol',{font:'Pacifico',ga:'#ffb347',gb:'#ff2e93',gd:0,sw:.04,sc:'rgba(0,0,0,.35)',ain:'left',aout:'right'}),
  arcoiris:N('Arco-íris',{font:'Bangers',sw:.1,sc:'#000000',aloop:'rainbow',ain:'pop',aout:'fade'}),
  glitchrgb:N('Glitch RGB',{ain:'glitch',aloop:'glitch',aout:'glitch',shb:.1,shc:'#000000'}),
  glitchtipo:N('Glitch tipográfico',{font:'Rubik Glitch',ain:'flicker',aloop:'glitch',shb:.08,shc:'#000000'}),
  maquina:N('Máquina de escrever',{color:'#f4efe1',font:'Special Elite',bold:false,bshape:'box',bc:'#111111',ba:.85,ain:'type',aind:1.2,aout:'fade'}),
  cinema:N('Legenda de cinema',{bold:false,shb:.25,shc:'rgba(0,0,0,.9)',ls:.03,ain:'fade',aout:'fade',aind:.6}),
  marcador:N('Marcador amarelo',{color:'#111111',bshape:'marker',bc:'#ffe14d',ba:1,ain:'wipe',aout:'fade'}),
  balao:N('Balão de fala',{color:'#111111',font:'Fredoka',bshape:'speech',bc:'#ffffff',ba:1,bp:.55,ain:'pop',aout:'zoom'}),
  explosao:N('Explosão',{color:'#ffe600',font:'Bangers',sw:.1,sc:'#000000',bshape:'burst',bc:'#e0201b',ba:1,bp:.5,ain:'pop',aloop:'pulse',aout:'fade'}),
  faixa:N('Faixa vermelha',{font:'Oswald',up:1,ls:.05,bshape:'banner',bc:'#d90429',ba:1,bp:.5,ain:'left',aout:'right'}),
  pilula:N('Pílula escura',{bshape:'pill',bc:'#000000',ba:.65,bp:.6,ain:'rise',aout:'fade'}),
  caixa:N('Legenda em caixa',{bshape:'round',bc:'#000000',ba:.6,bp:.4,ain:'fade',aout:'fade'}),
  vazado:N('Contorno vazado',{font:'Anton',fa:0,sw:.07,sc:'#ffffff',ain:'wipe',aout:'fade'}),
  retro80:N('Retro anos 80',{font:'Righteous',ga:'#ff5fd2',gb:'#4de1ff',gd:90,d3:.06,d3c:'#3b0a63',glc:'#ff5fd2',glb:.25,ain:'zoom',aloop:'float',aout:'fade'}),
  comico3d:N('Cómico 3D',{color:'#ffe600',font:'Bangers',sw:.1,sc:'#000000',d3:.07,d3c:'#e63946',ain:'bounce',aloop:'pulse',aout:'fade'}),
  cascata:N('Cascata de letras',{sw:.08,sc:'#000000',ain:'cascade',aind:1,aout:'fade'}),
  onda:N('Onda de letras',{sw:.1,sc:'#000000',aloop:'wave',ain:'fade',aout:'fade'}),
  revelar:N('Revelar',{font:'Playfair Display',shb:.2,shc:'#000000',ain:'wipe',aout:'wipe',aind:.8}),
  palavras:N('Palavra a palavra',{sw:.1,sc:'#000000',ain:'words',aind:1.2,aout:'fade'}),
  cinematico:N('Cinemático',{font:'Oswald',up:1,ls:.22,shb:.2,shc:'#000000',ain:'spread',aind:1,aout:'fade'}),
  manuscrito:N('Manuscrito',{font:'Caveat',sw:.05,sc:'#000000',ain:'wipe',aind:1,aout:'fade'}),
  pixel:N('Pixel',{color:'#7cfc00',font:'Press Start 2P',bold:false,bshape:'box',bc:'#000000',ba:.8,aloop:'blink',ain:'type',aout:'fade'}),
  terror:N('Terror',{color:'#d00000',font:'Creepster',bold:false,glc:'#ff0000',glb:.4,aloop:'flicker',ain:'blur',aout:'fade'}),
  douradoelegante:N('Elegante dourado',{font:'Playfair Display',ga:'#fff2b0',gb:'#c99a2e',gd:90,ls:.06,up:1,shb:.15,shc:'rgba(0,0,0,.6)',ain:'fade',aout:'fade',aind:1}),
  graffiti:N('Graffiti',{font:'Permanent Marker',sw:.1,sc:'#111111',d3:.04,d3c:'#ff2e93',rot:-4,ain:'spin',aloop:'wiggle',aout:'fade'}),
  letreiro:N('Letreiro néon',{font:'Bungee',glc:'#ffb300',glb:.5,aloop:'neon',ain:'flicker',aout:'fade'}),
  impacto:N('Impacto',{font:'Anton',up:1,sw:.1,sc:'#000000',ain:'big',aloop:'heartbeat',aout:'fade'}),
  titulo:N('Título forte',{font:'Staatliches',up:1,ls:.04,sw:.06,sc:'#000000',ain:'zoom',aout:'fade'}),
  elegante:N('Cursiva Lobster',{font:'Lobster',bold:false,shb:.18,shc:'rgba(0,0,0,.7)',ain:'rise',aout:'fade'}),
  stencil:N('Estêncil',{font:'Black Ops One',bold:false,sw:.05,sc:'#000000',ain:'stretch',aout:'fade'}),
  linhas:N('Linhas retro',{font:'Monoton',bold:false,color:'#ff5fd2',glc:'#ff5fd2',glb:.3,ain:'fade',aloop:'neon',aout:'fade'})
 };
 for(const k in NEWST){if(TEXT_STYLES[k]){log('estilo repetido: '+k);continue;}TEXT_STYLES[k]=NEWST[k];}
 const FONTS_NEW=['Permanent Marker','Lobster','Righteous','Press Start 2P','Bungee','Caveat','Staatliches','Monoton','Creepster','Fredoka','Rubik Glitch','Black Ops One'];
 if(typeof FONTS!=='undefined'&&Array.isArray(FONTS))FONTS_NEW.forEach(f=>{if(!FONTS.includes(f))FONTS.push(f);});
 const IN=[['none','Nenhuma'],['fade','Aparecer'],['zoom','Zoom dentro'],['big','Zoom fora'],['pop','Pop'],['rise','Subir'],['fall','Cair'],['left','Da esquerda'],['right','Da direita'],['blur','Desfocar'],['spin','Rodar'],['flip','Virar'],['wipe','Revelar'],['stretch','Esticar'],['glitch','Glitch'],['flicker','Cintilar'],['bounce','Salto'],['spread','Espaçar letras'],['type','Máquina de escrever'],['words','Palavra a palavra'],['cascade','Cascata de letras']];
 const OUTL={fade:'Desaparecer',zoom:'Encolher',big:'Ampliar',left:'Para a esquerda',right:'Para a direita',wipe:'Apagar',type:'Apagar letras'};
 const OUT=IN.map(([k,n])=>[k,OUTL[k]||n]);
 const LOOP=[['none','Nenhum'],['pulse','Pulsar'],['heartbeat','Batimento'],['float','Flutuar'],['wiggle','Abanar'],['swing','Baloíçar'],['shake','Tremer'],['blink','Piscar'],['flicker','Cintilar'],['neon','Néon'],['wave','Onda de letras'],['rainbow','Arco-íris'],['glitch','Glitch']];
 const SHAPES=[['none','Nenhum'],['box','Caixa'],['round','Arredondada'],['pill','Pílula'],['marker','Marcador'],['speech','Balão de fala'],['burst','Explosão'],['banner','Faixa']];
 const ALIGN=[['c','Centro'],['l','Esquerda'],['r','Direita']];
 const pct=v=>Math.round(v*100)+'%',sec=v=>(+v).toFixed(2)+'s',deg=v=>Math.round(v)+'°',num=v=>(+v).toFixed(2);
 const V=(x,k,d)=>x[k]===undefined?d:x[k];
 const hex=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
 const sel=(k,opts,v)=>'<select data-tx="'+k+'" data-txt="str">'+opts.map(([a,b])=>'<option value="'+a+'"'+(v===a?' selected':'')+'>'+b+'</option>').join('')+'</select>';
 const rg=(k,label,min,max,step,v,f)=>'<label class="rg"><span>'+label+'<b data-txo="'+k+'">'+f(v)+'</b></span><input type="range" data-tx="'+k+'" data-txt="num" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></label>';
 const clr=(k,label,v)=>'<label class="fld">'+label+'<input type="color" data-tx="'+k+'" data-txt="str" value="'+v+'"></label>';
 const chk=(k,label,v)=>'<label class="chk"><input type="checkbox" data-tx="'+k+'" data-txt="chk"'+(v?' checked':'')+'> '+label+'</label>';
 const open=new Set(['anim']);
 function panelHTML(x){
  const fillHex=hex(x.color,'#ffffff');
  return '<section class="box" id="txPro"><h3>Texto avançado</h3>'
  +'<details data-sec="anim"'+(open.has('anim')?' open':'')+'><summary>Animação (entrada, saída, loop)</summary>'
  +'<label class="fld">Entrada'+sel('ain',IN,V(x,'ain','none'))+'</label>'+rg('aind','Duração da entrada',.1,2,.05,V(x,'aind',.5),sec)
  +'<label class="fld">Saída'+sel('aout',OUT,V(x,'aout','none'))+'</label>'+rg('aoutd','Duração da saída',.1,2,.05,V(x,'aoutd',.4),sec)
  +'<label class="fld">Loop (enquanto aparece)'+sel('aloop',LOOP,V(x,'aloop','none'))+'</label>'+rg('alps','Velocidade do loop',.3,3,.1,V(x,'alps',1),num)
  +'<p class="hint">Se escolheres uma entrada ou saída aqui, ela substitui a animação simples acima.</p></details>'
  +'<details data-sec="look"'+(open.has('look')?' open':'')+'><summary>Contorno, sombra, brilho e 3D</summary>'
  +rg('sw','Contorno',0,.3,.01,V(x,'sw',x.stroke?.16:0),pct)+clr('sc','Cor do contorno',hex(x.sc,'#000000'))
  +rg('shb','Sombra (desfoque)',0,.6,.01,V(x,'shb',0),pct)+rg('shx','Sombra (horizontal)',-.3,.3,.01,V(x,'shx',0),pct)+rg('shy','Sombra (vertical)',-.3,.3,.01,V(x,'shy',0),pct)+clr('shc','Cor da sombra',hex(x.shc,'#000000'))
  +rg('glb','Brilho',0,1.2,.05,V(x,'glb',x.glow?.5:0),pct)+clr('glc','Cor do brilho',hex(x.glc||x.glow,'#ffffff'))
  +rg('d3','Profundidade 3D',0,.2,.01,V(x,'d3',0),pct)+clr('d3c','Cor do 3D',hex(x.d3c,'#000000'))+'</details>'
  +'<details data-sec="fill"'+(open.has('fill')?' open':'')+'><summary>Cor e gradiente</summary>'
  +'<div class="row2">'+clr('ga','Gradiente: início',hex(x.ga,fillHex))+clr('gb','Gradiente: fim',hex(x.gb,'#ff2e93'))+'</div>'
  +rg('gd','Ângulo do gradiente',0,360,5,V(x,'gd',90),deg)+rg('fa','Opacidade do preenchimento',0,1,.05,V(x,'fa',1),pct)
  +'<div class="btnrow"><button type="button" class="btn" data-txclear="grad">Remover gradiente</button></div></details>'
  +'<details data-sec="bg"'+(open.has('bg')?' open':'')+'><summary>Fundo e balões</summary>'
  +'<label class="fld">Forma'+sel('bshape',SHAPES,V(x,'bshape',x.bg?'round':'none'))+'</label>'+clr('bc','Cor do fundo',hex(x.bc,'#000000'))
  +rg('ba','Opacidade do fundo',0,1,.05,V(x,'ba',x.bg?.62:1),pct)+rg('bp','Margem do fundo',.1,1.2,.05,V(x,'bp',.45),num)+'</details>'
  +'<details data-sec="txt"'+(open.has('txt')?' open':'')+'><summary>Texto e posição</summary>'
  +'<div class="checks">'+chk('it','Itálico',x.it)+chk('ul','Sublinhado',x.ul)+chk('up','Maiúsculas',x.up)+'</div>'
  +'<label class="fld">Alinhamento'+sel('al',ALIGN,V(x,'al','c'))+'</label>'
  +rg('ls','Espaço entre letras',-.05,.5,.01,V(x,'ls',0),pct)+rg('lh','Altura da linha',.8,2,.05,V(x,'lh',1.2),num)
  +rg('ax','Posição horizontal',0,100,1,V(x,'ax',50),v=>Math.round(v)+'%')+rg('rot','Rotação',-180,180,1,V(x,'rot',0),deg)+rg('op','Opacidade',0,1,.05,V(x,'op',1),pct)+'</details>'
  +'<div class="btnrow"><button type="button" class="btn" data-txclear="all">Repor texto avançado</button></div></section>';
 }
 function apply(el,final){
  const x=typeof selText==='function'?selText():null;if(!x||!el.dataset||!el.dataset.tx)return;
  const k=el.dataset.tx,t=el.dataset.txt;
  const v=t==='chk'?(el.checked?1:0):t==='num'?+el.value:el.value;
  if((k==='ga'||k==='gb')){if(!x.ga)x.ga=hex(x.color,'#ffffff');if(!x.gb)x.gb='#ff2e93';}
  x[k]=v;
  const out=document.querySelector('[data-txo="'+k+'"]');
  if(out){const f={aind:sec,aoutd:sec,alps:num,gd:deg,rot:deg,lh:num,bp:num,ax:v=>Math.round(v)+'%'}[k]||pct;out.textContent=f(v);}
  invalidate();
  if(final){
   commit();
   if(k==='ain'||k==='aout'||k==='aloop'||k==='aind'||k==='aoutd'){try{pause();setT(k==='aout'||k==='aoutd'?Math.max(x.start,x.start+x.dur-(x.aoutd||.4)):x.start);}catch(e){}}
  }
 }
 function enhance(){
  const body=document.getElementById('panelBody');
  if(!body||typeof S==='undefined'||S.tab!=='text')return;
  const x=typeof selText==='function'?selText():null;if(!x||body.querySelector('#txPro'))return;
  body.insertAdjacentHTML('beforeend',panelHTML(x));
  if(!body.__txBound){
   body.__txBound=true;
   body.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.tx&&e.target.type==='range')apply(e.target,false);});
   body.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.tx)apply(e.target,true);});
   body.addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.sec){if(d.open)open.add(d.dataset.sec);else open.delete(d.dataset.sec);}},true);
   body.addEventListener('click',e=>{
    const sb=e.target.closest&&e.target.closest('button[data-tstyle]');
    if(sb){const t=selText();if(t)EXT.forEach(k=>{delete t[k];});return;}
    const cb=e.target.closest&&e.target.closest('button[data-txclear]');
    if(cb){const t=selText();if(!t)return;commit();if(cb.dataset.txclear==='all')EXT.forEach(k=>{delete t[k];});else{delete t.ga;delete t.gb;delete t.gd;}commit();invalidate();renderPanel();}
   },true);
  }
 }
 if(typeof renderPanel==='function'){const prev=renderPanel;renderPanel=function(){const res=prev.apply(this,arguments);try{enhance();}catch(e){log('painel: '+e.message);}return res;};}
 const css=document.createElement('style');css.textContent='#txPro{max-width:100%;min-width:0}#txPro details{border:1px solid #37383d;border-radius:12px;margin:8px 0;padding:0 10px}#txPro summary{min-height:44px;display:flex;align-items:center;font-weight:700;cursor:pointer}#txPro select{max-width:100%;min-width:0}';document.head.append(css);
 window.FenixText={orig,EXT,NEWKEYS:Object.keys(NEWST),FONTS_NEW,IN,OUT,LOOP,SHAPES,draw2};
})();
