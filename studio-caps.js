/* FenixCut V28: legendas avançadas (karaoke, uma palavra, janela de 3, destaque de palavras-chave, animações do bloco), 26 estilos novos e reagrupar legendas. Não altera fx.js nem app.js: os estilos antigos continuam a usar o desenhador original. */
'use strict';
(function(){
 if(typeof drawOverlays!=='function'||typeof CAP_PRESETS==='undefined'||typeof segWords!=='function'||typeof drawStyleThumb!=='function'||typeof S==='undefined')return;
 const prevOver=drawOverlays,prevThumb=drawStyleThumb;
 const log=m=>{try{if(typeof logErr==='function')logErr('legendas: '+m);}catch(e){}};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const eo=u=>1-Math.pow(1-clamp(u,0,1),3);
 const back=u=>{u=clamp(u,0,1);const c1=1.70158,c3=c1+1,t=u-1;return 1+c3*t*t*t+c1*t*t;};
 const DEF={mode:'all',hl:'color',wp:1.12,wa:'none',ain:'pop',aout:'fade',aind:.22,aoutd:.18,lines:2,sw:.12,sc:'#000000',shb:0,shc:'rgba(0,0,0,.7)',shy:.04,glb:0,glc:null,bshape:'none',bc:'#000000',ba:.65,bp:.4,ls:0,kw:'',kwc:'#ff4d6d',kwauto:0,dim:0,ga:null,gb:null,gd:90,d3:0,d3c:'#000000',pal:null,sizeMul:1,fw:800,it:0,up:0,rgbhl:0,font:'Montserrat'};
 const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
 function blockAnim(st,kind,u,px,W,dir){
  if(!kind||kind==='none'||u>=1)return;
  const e=eo(u);
  if(kind==='fade')st.a*=u;
  else if(kind==='pop'){const s=Math.max(.01,back(u));st.sx*=s;st.sy*=s;st.a*=Math.min(1,u*3);}
  else if(kind==='zoom'){const s=.6+.4*e;st.sx*=s;st.sy*=s;st.a*=u;}
  else if(kind==='rise'){st.dy+=dir*(1-e)*px*.7;st.a*=u;}
  else if(kind==='left'){st.dx-=(1-e)*W*.5;st.a*=Math.min(1,u*2);}
  else if(kind==='right'){st.dx+=(1-e)*W*.5;st.a*=Math.min(1,u*2);}
  else if(kind==='blur'){st.blur+=(1-u)*px*.3;st.a*=Math.min(1,u*2);}
 }
 function drawCap2(ctx,W,H,seg,t,cs){
  const pr=CAP_PRESETS[cs.preset];if(!pr||!pr.v2)return;
  const P=Object.assign({},DEF,pr.v2,cs.cx||{});
  const ws=segWords(seg);if(!ws||!ws.length)return;
  let ai=-1;for(let i=0;i<ws.length;i++){if(t>=ws[i].s&&t<ws[i].e){ai=i;break;}}
  if(ai<0)for(let i=0;i<ws.length;i++)if(ws[i].s<=t)ai=i;
  const cur=Math.max(0,ai);
  const list=[];ws.forEach((w,i)=>{if(P.mode==='single'?i===cur:P.mode==='reveal'?i<=cur:P.mode==='win3'?Math.abs(i-cur)<=1:true)list.push(i);});
  if(!list.length)return;
  const up=!!(cs.upper||P.up),fam=(cs.font&&cs.font!=='auto')?cs.font:P.font;
  let px=Math.max(6,(cs.size||70)*(P.sizeMul||1)*W/1080),lines,sp,ls;
  const maxW=W*.84,fontOf=p=>(P.it?'italic ':'')+(P.fw||800)+' '+p+'px "'+fam+'", sans-serif';
  ctx.save();
  for(let it=0;it<4;it++){
   ctx.font=fontOf(px);ls=(P.ls||0)*px;sp=ctx.measureText(' ').width+ls+((P.hl==='pill'||P.hl==='box')?px*.16:0);
   lines=[];let cl={w:[],w0:0};
   for(const i of list){const raw=up?ws[i].w.toUpperCase():ws[i].w,w=ctx.measureText(raw).width+ls*raw.length;if(cl.w.length&&cl.w0+sp+w>maxW){lines.push(cl);cl={w:[],w0:0};}cl.w.push({i,t:raw,w,x:cl.w.length?cl.w0+sp:0});cl.w0=cl.w[cl.w.length-1].x+w;}
   lines.push(cl);
   if(lines.length<=(P.mode==='single'?1:P.lines)||it===3)break;px*=.9;
  }
  const lh=px*1.22,bw=Math.max(px,...lines.map(q=>q.w0)),bh=lines.length*lh;
  const st={a:1,dx:0,dy:0,sx:1,sy:1,blur:0},dIn=P.aind||.22,dOut=P.aoutd||.18;
  blockAnim(st,P.ain,(t-seg.start)<dIn?(t-seg.start)/dIn:1,px,W,1);
  blockAnim(st,P.aout,(seg.end-t)<dOut?(seg.end-t)/dOut:1,px,W,-1);
  if(st.a<=.003){ctx.restore();return;}
  const cy=H*(cs.y==null?72:cs.y)/100,hi=cs.hi||'#ffd23f',base=cs.color||'#ffffff';
  ctx.translate(W/2+st.dx,cy+st.dy);ctx.scale(st.sx,st.sy);ctx.globalAlpha=clamp(st.a,0,1);
  if(st.blur>.3&&'filter' in ctx)ctx.filter='blur('+st.blur.toFixed(1)+'px)';
  const baseA=ctx.globalAlpha;
  if(P.bshape&&P.bshape!=='none'&&P.ba>0){const pxp=px*P.bp,bx=-bw/2-pxp,by=-bh/2-pxp*.5,bwd=bw+2*pxp,bhd=bh+pxp;ctx.save();ctx.globalAlpha=baseA*P.ba;ctx.fillStyle=P.bc;if(P.bshape==='box')ctx.fillRect(bx,by,bwd,bhd);else if(P.bshape==='pill')rr(ctx,bx,by,bwd,bhd,bhd/2),ctx.fill();else{rr(ctx,bx,by,bwd,bhd,px*.3);ctx.fill();}ctx.restore();}
  let fill0=base;
  if(P.ga&&P.gb){const a=(P.gd||90)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),hl=Math.abs(c)*bw/2+Math.abs(s)*bh/2+.001,g=ctx.createLinearGradient(-c*hl,-s*hl,c*hl,s*hl);g.addColorStop(0,P.ga);g.addColorStop(1,P.gb);fill0=g;}
  const kws=new Set(String(P.kw||'').split(/[,;\n]/).map(norm).filter(Boolean));
  const isKw=raw=>{const n=norm(raw);if(n&&kws.has(n))return true;return !!P.kwauto&&(/\d/.test(raw)||(raw.length>=3&&raw===raw.toUpperCase()&&/[A-ZÀ-Ý]/.test(raw)));};
  const darkText=typeof lum==='function'&&lum(hi)>.5?'#111111':'#ffffff',strokeW=(P.sw||0)*px;
  function paint(str,x,y,w,fill,o){
   ctx.save();ctx.globalAlpha=baseA*(o.a==null?1:o.a);
   if(o.rgb){ctx.save();ctx.globalAlpha*=.85;ctx.fillStyle='rgb(255,0,70)';ctx.fillText(str,x-o.rgb,y);ctx.fillStyle='rgb(0,230,255)';ctx.fillText(str,x+o.rgb,y);ctx.restore();}
   if(P.d3>0){const d=P.d3*px,n=Math.min(30,Math.max(2,Math.round(d/1.5))),step=d/n;ctx.fillStyle=P.d3c;ctx.strokeStyle=P.d3c;ctx.lineJoin='round';ctx.lineWidth=strokeW;for(let i=n;i>=1;i--){if(strokeW>0)ctx.strokeText(str,x+i*step,y+i*step);ctx.fillText(str,x+i*step,y+i*step);}}
   const gl=Math.max(P.glb||0,o.glow||0);
   if(gl>0){ctx.save();ctx.shadowColor=o.glc||P.glc||(typeof fill==='string'?fill:hi);ctx.shadowBlur=gl*px;ctx.fillStyle=fill;ctx.fillText(str,x,y);ctx.fillText(str,x,y);ctx.restore();}
   ctx.save();
   if(P.shb>0||P.shy){ctx.shadowColor=P.shc;ctx.shadowBlur=(P.shb||0)*px;ctx.shadowOffsetY=(P.shy||0)*px;}
   if(strokeW>0){ctx.lineWidth=strokeW;ctx.lineJoin='round';ctx.strokeStyle=P.sc;ctx.strokeText(str,x,y);ctx.shadowColor='transparent';}
   ctx.fillStyle=fill;ctx.fillText(str,x,y);
   ctx.restore();
   if(o.sweep>0){ctx.save();ctx.beginPath();ctx.rect(x-3,y-px,w*o.sweep+3,px*2);ctx.clip();ctx.fillStyle=hi;ctx.fillText(str,x,y);ctx.restore();}
   ctx.restore();
  }
  ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=fontOf(px);
  lines.forEach((ln,j)=>{
   const y=-bh/2+lh/2+j*lh,lx=-ln.w0/2;
   ln.w.forEach(wd=>{
    const i=wd.i,w0=ws[i],act=i===ai,we=clamp((t-w0.s)/.16,0,1),pp=clamp((t-w0.s)/Math.max(.05,w0.e-w0.s),0,1);
    let sc=1,dy=0,a=1,col=P.pal&&P.pal.length?P.pal[i%P.pal.length]:fill0,sweep=0,glow=0,rgb=0;
    const x=lx+wd.x,cx=x+wd.w/2,ky=isKw(w0.w);
    if(P.mode!=='all'&&i===cur){if(P.wa==='pop'){sc*=Math.max(.05,back(we));a*=Math.min(1,we*3);}else if(P.wa==='rise'){dy+=(1-eo(we))*px*.5;a*=we;}else if(P.wa==='fade')a*=we;}
    if(P.dim&&i>cur&&P.mode==='all')a*=.55;
    if(ky){col=P.kwc;sc*=1.1;}
    if(act&&P.hl!=='none'){
     if(P.wp>1)sc*=1+(P.wp-1)*Math.min(1,back(clamp((t-w0.s)/.12,0,1)));
     if(P.hl==='color'||P.hl==='glow')col=ky?col:hi;
     if(P.hl==='glow')glow=.5;
     if(P.hl==='bounce'){col=ky?col:hi;dy-=px*.2*Math.sin(clamp((t-w0.s)/.22,0,1)*Math.PI);}
     if(P.hl==='sweep'){sweep=pp;}
     if(P.hl==='pill'){const pa=eo(we),padX=px*.22,padY=px*.1;ctx.save();ctx.globalAlpha=baseA*pa;ctx.fillStyle=hi;rr(ctx,x-padX,y-lh*.4,wd.w+2*padX,lh*.8,lh*.3);ctx.fill();ctx.restore();col=darkText;}
     if(P.hl==='box'){ctx.save();ctx.globalAlpha=baseA*eo(we);ctx.strokeStyle=hi;ctx.lineWidth=px*.07;rr(ctx,x-px*.18,y-lh*.4,wd.w+px*.36,lh*.8,px*.2);ctx.stroke();ctx.restore();}
     if(P.hl==='under'){ctx.save();ctx.globalAlpha=baseA;ctx.fillStyle=hi;ctx.fillRect(x,y+px*.5,wd.w*eo(we),Math.max(2,px*.1));ctx.restore();}
     if(P.rgbhl)rgb=px*.06;
    }else if(P.hl==='sweep'&&i<cur){sweep=1;}
    else if(P.hl==='sweep'&&i===cur&&ai<0){sweep=0;}
    ctx.save();ctx.translate(cx,y+dy);ctx.scale(sc,sc);ctx.translate(-cx,-y);
    paint(wd.t,x,y,wd.w,col,{a,sweep,glow,rgb});
    ctx.restore();
   });
  });
  ctx.restore();
 }
 drawOverlays=function(ctx,W,H,t){
  const cs=S.capStyle,pr=cs&&CAP_PRESETS[cs.preset];
  if(!pr||!pr.v2)return prevOver(ctx,W,H,t);
  const caps=S.caps;S.caps=[];
  try{prevOver(ctx,W,H,t);}finally{S.caps=caps;}
  try{const tt=t+(cs.offset||0),seg=caps.find(s=>tt>=s.start&&tt<s.end);if(seg)drawCap2(ctx,W,H,seg,tt,cs);}catch(e){log(e.message);}
 };
 drawStyleThumb=function(cv,key,t){
  const pr=CAP_PRESETS[key];
  if(!pr||!pr.v2)return prevThumb(cv,key,t);
  t=t||0;const ctx=thumbBg(cv);
  const words=[{w:'Isto',s:0,e:.7},{w:'é',s:.7,e:1.3},{w:'um',s:1.3,e:1.9},{w:'teste',s:1.9,e:2.8}],text='Isto é um teste';
  const cs=Object.assign({},S.capStyle,{preset:key,y:50,size:Math.min(S.capStyle.size,80),cx:undefined});
  try{drawCap2(ctx,cv.width,cv.height,{start:0,end:3.4,text,words,wt:text},t%3.4,cs);}catch(e){log(e.message);}
  if(typeof thumbProgress==='function')thumbProgress(ctx,cv,t);
 };
 const V=(n,o)=>Object.assign({n,v2:o},{});
 const NEWCAP={
  v2karaoke:V('Karaoke amarelo',{hl:'sweep',sw:.12,up:1,ain:'pop',dim:1}),
  v2ativa:V('Palavra ativa a amarelo',{hl:'color',wp:1.14,sw:.12,up:1,shy:.05}),
  v2uma:V('Uma palavra (pop)',{mode:'single',hl:'none',wa:'pop',sw:.14,up:1,sizeMul:1.35,font:'Anton',ain:'none',aout:'none'}),
  v2umagrande:V('Uma palavra grande',{mode:'single',hl:'color',wa:'pop',wp:1,sw:.16,up:1,sizeMul:1.7,font:'Anton',ain:'none',aout:'none'}),
  v2acumula:V('Acumular com pop',{mode:'reveal',hl:'color',wa:'pop',wp:1,sw:.12,up:1,ain:'none'}),
  v2janela3:V('Janela de 3 palavras',{mode:'win3',hl:'color',wp:1.18,sw:.12,up:1,ain:'none',aout:'none'}),
  v2pilulaverde:V('Pílula na palavra',{hl:'pill',sw:0,shb:.2,up:0,wp:1.06}),
  v2sublinhado:V('Sublinhado animado',{hl:'under',sw:.1,up:0}),
  v2caixa:V('Caixa na palavra',{hl:'box',sw:.1,up:0}),
  v2neon:V('Neon brilhante',{hl:'glow',sw:0,glb:.25,glc:'#00e5ff',shy:0,fw:700,ain:'fade'}),
  v2dourado:V('Dourado',{hl:'color',ga:'#fff3a0',gb:'#d4880b',gd:90,sw:.1,sc:'#3a2200',up:1,font:'Anton',fw:400}),
  v2cinema:V('Cinema',{hl:'none',sw:0,shb:.2,shy:.04,shc:'rgba(0,0,0,.9)',fw:600,ls:.02,ain:'fade',aout:'fade',aind:.3,aoutd:.3}),
  v2classico:V('TikTok clássico',{hl:'color',sw:.14,up:1,shb:.1,wp:1.1}),
  v2hormozi:V('Estilo Hormozi',{mode:'win3',hl:'color',wp:1.2,sw:.2,up:1,font:'Montserrat',fw:900,ain:'none',aout:'none',lines:1}),
  v2beast:V('Estilo MrBeast',{hl:'color',wp:1.18,sw:.2,up:1,font:'Bangers',fw:400,ain:'pop',d3:.05,d3c:'#000000'}),
  v2colorido:V('Palavras coloridas',{hl:'scale',wp:1.2,sw:.12,up:1,pal:['#ffffff','#ffd23f','#3ddc84','#4dabff','#ff4d6d']}),
  v2glitch:V('Glitch',{hl:'color',rgbhl:1,sw:.1,up:1,ain:'none'}),
  v2caixapreta:V('Caixa preta',{hl:'color',sw:0,bshape:'round',bc:'#000000',ba:.7,bp:.45,up:0}),
  v2marcador:V('Marcador',{hl:'pill',sw:0,shb:0,shy:0,up:0,wp:1}),
  v2energia:V('Energia (salta)',{hl:'bounce',wp:1.12,sw:.14,up:1,ain:'rise'}),
  v2minimal:V('Minimal com sombra',{hl:'none',sw:0,shb:.18,shy:.04,fw:600,up:0,ain:'fade'}),
  v2poente:V('Pôr do sol',{hl:'color',ga:'#ffb347',gb:'#ff2e93',gd:0,sw:.1,up:1}),
  v2retro:V('Retro',{hl:'color',sw:.06,font:'Righteous',fw:400,d3:.06,d3c:'#3b0a63',up:1}),
  v2terminal:V('Terminal',{mode:'reveal',hl:'none',sw:0,font:'Special Elite',fw:400,bshape:'box',bc:'#000000',ba:.85,bp:.35,ain:'none'}),
  v2manuscrito:V('Manuscrito',{mode:'reveal',hl:'color',wa:'rise',sw:.08,font:'Caveat',fw:700,sizeMul:1.3,ain:'none'}),
  v2impacto:V('Impacto vermelho',{hl:'color',wp:1.22,sw:.16,up:1,font:'Anton',fw:400,shb:.1})
 };
 for(const k in NEWCAP){if(CAP_PRESETS[k]){log('estilo repetido: '+k);continue;}CAP_PRESETS[k]=NEWCAP[k];}
 const MODE=[['all','Frase completa'],['reveal','Acumular palavras'],['single','Uma palavra de cada vez'],['win3','Janela de 3 palavras']];
 const HL=[['none','Sem destaque'],['color','Cor'],['sweep','Karaoke (preenche)'],['pill','Pílula'],['under','Sublinhado'],['box','Caixa'],['glow','Brilho'],['scale','Aumentar'],['bounce','Saltar']];
 const WA=[['none','Nenhuma'],['pop','Pop'],['rise','Subir'],['fade','Aparecer']];
 const BLK=[['none','Nenhuma'],['fade','Aparecer'],['pop','Pop'],['rise','Subir'],['zoom','Zoom'],['left','Da esquerda'],['right','Da direita'],['blur','Desfocar']];
 const SHP=[['none','Sem fundo'],['box','Caixa'],['round','Arredondado'],['pill','Pílula']];
 const pct=v=>Math.round(v*100)+'%',num=v=>(+v).toFixed(2),sec=v=>(+v).toFixed(2)+'s';
 const hex=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
 const cur=()=>{const pr=CAP_PRESETS[S.capStyle.preset];return Object.assign({},DEF,pr&&pr.v2?pr.v2:{},S.capStyle.cx||{});};
 const sel=(k,o,v)=>'<select data-cx="'+k+'" data-cxt="str">'+o.map(([a,b])=>'<option value="'+a+'"'+(v===a?' selected':'')+'>'+b+'</option>').join('')+'</select>';
 const rg=(k,l,mn,mx,st,v,f)=>'<label class="rg"><span>'+l+'<b data-cxo="'+k+'">'+f(v)+'</b></span><input type="range" data-cx="'+k+'" data-cxt="num" min="'+mn+'" max="'+mx+'" step="'+st+'" value="'+v+'"></label>';
 const clr=(k,l,v)=>'<label class="fld">'+l+'<input type="color" data-cx="'+k+'" data-cxt="str" value="'+v+'"></label>';
 const chk=(k,l,v)=>'<label class="chk"><input type="checkbox" data-cx="'+k+'" data-cxt="chk"'+(v?' checked':'')+'> '+l+'</label>';
 const open=new Set(['mode']);
 function panelHTML(){
  const P=cur(),isNew=!!(CAP_PRESETS[S.capStyle.preset]&&CAP_PRESETS[S.capStyle.preset].v2);
  const note=isNew?'':'<p class="hint">O estilo atual é um dos antigos. Escolhe um dos estilos novos (os últimos da galeria) para usar estes controlos.</p>';
  return '<section class="box" id="cxPro"><h3>Legendas avançadas</h3>'+note
  +'<details data-sec="mode"'+(open.has('mode')?' open':'')+'><summary>Como aparecem as palavras</summary>'
  +'<label class="fld">Modo'+sel('mode',MODE,P.mode)+'</label><label class="fld">Destaque da palavra ativa'+sel('hl',HL,P.hl)+'</label>'
  +rg('wp','Aumento da palavra ativa',1,1.5,.02,P.wp,num)+'<label class="fld">Entrada de cada palavra'+sel('wa',WA,P.wa)+'</label>'
  +rg('lines','Máximo de linhas',1,3,1,P.lines,v=>Math.round(v))+chk('dim','Escurecer palavras ainda por dizer',P.dim)+'</details>'
  +'<details data-sec="blk"'+(open.has('blk')?' open':'')+'><summary>Animação do bloco</summary>'
  +'<label class="fld">Entrada'+sel('ain',BLK,P.ain)+'</label><label class="fld">Saída'+sel('aout',BLK,P.aout)+'</label>'
  +rg('aind','Duração da entrada',.1,.8,.02,P.aind,sec)+rg('aoutd','Duração da saída',.1,.8,.02,P.aoutd,sec)+'</details>'
  +'<details data-sec="look"'+(open.has('look')?' open':'')+'><summary>Contorno, sombra, brilho e fundo</summary>'
  +rg('sw','Contorno',0,.3,.01,P.sw,pct)+clr('sc','Cor do contorno',hex(P.sc,'#000000'))+rg('shb','Sombra',0,.6,.01,P.shb,pct)
  +rg('glb','Brilho',0,1.2,.05,P.glb,pct)+clr('glc','Cor do brilho',hex(P.glc,'#ffffff'))
  +'<label class="fld">Fundo'+sel('bshape',SHP,P.bshape)+'</label>'+clr('bc','Cor do fundo',hex(P.bc,'#000000'))+rg('ba','Opacidade do fundo',0,1,.05,P.ba,pct)
  +rg('ls','Espaço entre letras',-.05,.4,.01,P.ls,pct)+'</details>'
  +'<details data-sec="kw"'+(open.has('kw')?' open':'')+'><summary>Palavras-chave</summary>'
  +'<label class="fld">Palavras a destacar (separadas por vírgulas)<input type="text" data-cx="kw" data-cxt="str" value="'+String(P.kw||'').replace(/"/g,'&quot;')+'" placeholder="dinheiro, grátis, 100"></label>'
  +clr('kwc','Cor das palavras-chave',hex(P.kwc,'#ff4d6d'))+chk('kwauto','Destacar também números e palavras em MAIÚSCULAS',P.kwauto)
  +'<p class="hint">É uma regra simples por texto, não uma análise por IA.</p></details>'
  +'<details data-sec="grp"'+(open.has('grp')?' open':'')+'><summary>Reagrupar legendas</summary>'
  +'<label class="fld">Palavras por bloco<input type="number" id="cxN" min="1" max="8" step="1" value="3"></label>'
  +'<div class="btnrow"><button type="button" class="btn" data-cxgroup="1">Reagrupar todas as legendas</button></div>'
  +'<p class="hint">Reparte as legendas existentes em blocos mais curtos, sem voltar a transcrever. Quebra também em pontuação final e pausas longas. Podes desfazer.</p></details>'
  +'<div class="btnrow"><button type="button" class="btn" data-cxreset="1">Repor opções do estilo</button></div></section>';
 }
 function regroup(n){
  if(!S.caps||!S.caps.length)return toast('Ainda não há legendas para reagrupar.');
  n=clamp(Math.round(+n)||3,1,8);
  const all=[];for(const s of S.caps)segWords(s).forEach(w=>all.push({w:w.w,s:w.s,e:w.e}));
  all.sort((a,b)=>a.s-b.s);
  const runs=[];let run=[];
  all.forEach(w=>{if(run.length){const p=run[run.length-1];if(/[.!?…]$/.test(p.w)||w.s-p.e>.8){runs.push(run);run=[];}}run.push(w);});
  if(run.length)runs.push(run);
  const groups=[];
  runs.forEach(r=>{const k=Math.ceil(r.length/n),base=Math.floor(r.length/k),extra=r.length%k;let i=0;for(let j=0;j<k;j++){const sz=base+(j<extra?1:0);groups.push(r.slice(i,i+sz));i+=sz;}});
  const before=S.caps.length;
  commit();
  S.caps=groups.map((q,k)=>{const text=q.map(w=>w.w).join(' '),start=q[0].s;let end=q[q.length-1].e;const nx=groups[k+1];if(nx&&nx[0].s-end<.3&&nx[0].s>end)end=nx[0].s;end=Math.max(end,start+.2);return{id:nid(),start,end,text,words:q.map(w=>({w:w.w,s:w.s,e:w.e})),wt:text};});
  S.sel=null;commit();refreshAll();
  toast(before+' legendas passaram a '+S.caps.length+' (até '+n+' palavras cada).',5000);
 }
 function apply(el,final){
  const k=el.dataset.cx,t=el.dataset.cxt;if(!k)return;
  const v=t==='chk'?(el.checked?1:0):t==='num'?+el.value:el.value;
  const cs=S.capStyle;cs.cx=cs.cx||{};cs.cx[k]=v;
  const o=document.querySelector('[data-cxo="'+k+'"]');
  if(o){const f={wp:num,aind:sec,aoutd:sec,lines:v=>Math.round(v)}[k]||pct;o.textContent=f(v);}
  invalidate();if(final)commit();
 }
 function enhance(){
  const body=document.getElementById('panelBody');
  if(!body||S.tab!=='caps'||body.querySelector('#cxPro'))return;
  body.insertAdjacentHTML('beforeend',panelHTML());
  if(!body.__cxBound){
   body.__cxBound=true;
   body.addEventListener('input',e=>{const d=e.target.dataset;if(d&&d.cx&&(e.target.type==='range'))apply(e.target,false);});
   body.addEventListener('change',e=>{const d=e.target.dataset;if(d&&d.cx)apply(e.target,true);});
   body.addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.sec){if(d.open)open.add(d.dataset.sec);else open.delete(d.dataset.sec);}},true);
   body.addEventListener('click',e=>{
    const pb=e.target.closest&&e.target.closest('button[data-cappreset]');
    if(pb){delete S.capStyle.cx;return;}
    const gb=e.target.closest&&e.target.closest('button[data-cxgroup]');
    if(gb){const n=document.getElementById('cxN');regroup(n?n.value:3);return;}
    const rb=e.target.closest&&e.target.closest('button[data-cxreset]');
    if(rb){commit();delete S.capStyle.cx;commit();invalidate();renderPanel();}
   },true);
  }
 }
 if(typeof renderPanel==='function'){const prevPanel=renderPanel;renderPanel=function(){const r=prevPanel.apply(this,arguments);try{enhance();}catch(e){log('painel: '+e.message);}return r;};}
 const css=document.createElement('style');css.textContent='#cxPro{max-width:100%;min-width:0}#cxPro details{border:1px solid #37383d;border-radius:12px;margin:8px 0;padding:0 10px}#cxPro summary{min-height:44px;display:flex;align-items:center;font-weight:700;cursor:pointer}#cxPro select,#cxPro input[type=text]{max-width:100%;min-width:0;width:100%}';document.head.append(css);
 window.FenixCaps={NEWKEYS:Object.keys(NEWCAP),drawCap2,regroup,prevOver,prevThumb,DEF};
})();
