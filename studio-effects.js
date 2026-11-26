/* FenixCut V26: pacote de efeitos por shader + categorias. Não altera fx.js: corrige o renderizador em tempo de execução e desliga-se sozinho se algo não encaixar. */
'use strict';
(function(){
 if(typeof createRenderer!=='function'||typeof PRESETS==='undefined'||typeof FX_DEFAULT==='undefined')return;
 const log=m=>{try{if(typeof logErr==='function')logErr('efeitos: '+m);}catch(e){}};
 const HELP='uniform vec4 uA,uB,uC,uD,uE,uF;\nconst vec3 LW=vec3(0.299,0.587,0.114);\nfloat H1(float n){return fract(sin(n*127.1)*43758.5453);}\nfloat H2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\nvec3 HUE(float h){return clamp(abs(fract(h+vec3(0.0,0.6667,0.3333))*6.0-3.0)-1.0,0.0,1.0);}';
 const GEO=[
  'float tf=floor(uTime);',
  'if(uD.y>1.5)q=fract(q*uD.y);',
  'if(uE.x>0.0){float pz=1.0+uE.x*0.12*pow(abs(sin(uTime*0.50265)),3.0);q=(q-0.5)/pz+0.5;}',
  'if(uA.x>0.0){q=(q-0.5)/(1.0+uA.x*0.07)+0.5+(vec2(H1(tf*1.7),H1(tf*2.3+9.0))-0.5)*0.04*uA.x;}',
  'if(uA.y>0.0&&H1(floor(uTime/3.0)*5.1)>0.45){float bd=floor(q.y*18.0)+tf*7.0;if(H1(bd)>1.0-0.4*uA.y)q.x+=(H1(bd+3.0)-0.5)*0.3*uA.y;float b2=floor(q.y*70.0)+tf*3.0;if(H1(b2)>1.0-0.12*uA.y)q.x+=(H1(b2+1.0)-0.5)*0.08*uA.y;}',
  'if(uF.y>0.0){float tb=fract(uTime*0.02);if(abs(q.y-tb)<0.05)q.x+=uF.y*0.03*sin(q.y*180.0+uTime*1.3);q.x+=uF.y*0.002*(H1(floor(q.y*240.0)+tf)-0.5);}',
  'if(uF.x>0.0){vec2 rd=q-0.5;q+=rd/(length(rd)+0.0001)*uF.x*0.012*sin(length(rd)*60.0-uTime*0.6283);}',
  'if(abs(uA.z)>0.001){vec2 d=q-0.5;float r2=dot(d,d);q=0.5+d*(1.0+uA.z*r2*2.0)/(1.0+max(uA.z,0.0));}',
  'if(abs(uA.w)>0.001){vec2 d=q-0.5;float ar=uRes.x/uRes.y;d.x*=ar;float r=length(d);float k=uA.w*(1.0-smoothstep(0.0,0.5,r));float cs=cos(k),sn=sin(k);d=vec2(cs*d.x-sn*d.y,sn*d.x+cs*d.y);d.x/=ar;q=d+0.5;}',
  'if(uD.x>1.5){vec2 d=q-0.5;float ar=uRes.x/uRes.y;d.x*=ar;float an=atan(d.y,d.x),rd=length(d);float sg=6.2831853/uD.x;an=abs(mod(an,sg)-sg*0.5);d=rd*0.7*vec2(cos(an),sin(an));d.x/=ar;q=d+0.5;}'
 ].join('\n ');
 const SAMPLE=[
  'if(uB.x>0.001){vec3 za=col;for(int i=1;i<8;i++){float s=1.0-uB.x*0.3*float(i)/7.0;za+=S(clamp((cc-0.5)*s+0.5,0.0,1.0));}col=za/8.0;}',
  'if(uB.y>0.0005){vec2 dc=(cc-0.5)*uB.y;col=vec3(S(clamp(cc+dc,0.0,1.0)).r,col.g,S(clamp(cc-dc,0.0,1.0)).b);}',
  'if(uC.x>0.001){vec3 bl=vec3(0.0);vec2 bs=vec2(uRes.y/uRes.x,1.0)*0.014;for(int i=0;i<8;i++){float a=float(i)*0.7854;vec2 o=vec2(cos(a),sin(a))*bs;bl+=texture2D(tex,clamp(cc+o,0.0,1.0)).rgb+texture2D(tex,clamp(cc+o*2.2,0.0,1.0)).rgb;}bl/=16.0;col+=max(bl-0.42,0.0)*uC.x*2.4;}',
  'if(uC.w>0.001){vec2 px=vec2(1.0)/uRes;vec3 av=(texture2D(tex,clamp(cc+vec2(px.x,0.0),0.0,1.0)).rgb+texture2D(tex,clamp(cc-vec2(px.x,0.0),0.0,1.0)).rgb+texture2D(tex,clamp(cc+vec2(0.0,px.y),0.0,1.0)).rgb+texture2D(tex,clamp(cc-vec2(0.0,px.y),0.0,1.0)).rgb)*0.25;col+=(col-av)*uC.w*1.5;}',
  'if(abs(uC.y)>0.001||uF.w>0.001){vec2 px=vec2(1.4)/uRes;float el=dot(texture2D(tex,clamp(cc-vec2(px.x,0.0),0.0,1.0)).rgb,LW),er=dot(texture2D(tex,clamp(cc+vec2(px.x,0.0),0.0,1.0)).rgb,LW),eu=dot(texture2D(tex,clamp(cc-vec2(0.0,px.y),0.0,1.0)).rgb,LW),ed=dot(texture2D(tex,clamp(cc+vec2(0.0,px.y),0.0,1.0)).rgb,LW);float eg=clamp(length(vec2(er-el,ed-eu))*4.0,0.0,1.0);',
  ' if(uC.y>0.0)col=mix(col*(1.0-0.6*uC.y),vec3(1.0),eg*uC.y);else if(uC.y<0.0)col=mix(col,vec3(0.0),eg*(-uC.y));',
  ' if(uF.w>0.001)col=mix(col,vec3(1.0-eg*1.4),uF.w);}'
 ].join('\n ');
 const COLOR=[
  'if(uE.y>0.001){float lm=dot(col,LW);vec3 dc=mix(HUE(uE.z)*0.32,HUE(uE.w)*0.98+0.06,smoothstep(0.0,1.0,lm));col=mix(col,dc,uE.y);}',
  'if(uC.z>1.0){vec2 gp=uv*vec2(uRes.x/uRes.y,1.0)*uC.z;gp=vec2(0.7071*gp.x-0.7071*gp.y,0.7071*gp.x+0.7071*gp.y);vec2 fp=fract(gp)-0.5;float lm=clamp(dot(col,LW),0.0,1.0);float rd=sqrt(lm)*0.66;float dm=smoothstep(rd+0.07,rd-0.07,length(fp));col=mix(vec3(0.05),col*1.15,dm);}',
  'if(uB.z>0.001)col*=1.0-uB.z*0.5*(0.5+0.5*sin(uv.y*1100.0));',
  'if(uB.w>0.001){float lk=pow(max(0.0,0.5+0.5*sin(uv.x*2.4-uv.y*1.2+uTime*0.062832)),2.5)*smoothstep(1.0,0.0,uv.x*0.55+uv.y*0.35);col+=uB.w*lk*vec3(1.0,0.5,0.18)*0.85;}',
  'if(uD.w>0.001)col*=1.0+uD.w*(H1(tf*3.7)-0.5)*2.0;',
  'if(uF.z>0.001)col+=uF.z*(H2(uv*uRes+tf)-0.5)*1.2;'
 ].join('\n ');
 const DRAW="{const I=f.fxi==null?1:f.fxi,on=I>0.01,g=k=>(f[k]||0)*I;gl.uniform4f(U.uA,g('shake'),g('glitch'),g('fish'),g('swirl'));gl.uniform4f(U.uB,g('zblur'),g('chroma'),g('scan'),g('leak'));gl.uniform4f(U.uC,g('bloom'),g('edge'),on&&f.half?f.half:0,g('sharp'));gl.uniform4f(U.uD,on&&f.kal?Math.round(f.kal):0,on&&f.tile?Math.max(1,Math.round(f.tile)):0,g('letter'),g('flick'));gl.uniform4f(U.uE,g('pulse'),g('duo'),f.duoa||0,f.duob||0);gl.uniform4f(U.uF,g('ripple'),g('tape'),g('snow'),g('sketch'));}";
 const EDITS=[
  ["uniform vec2 uTexSize;uniform float uBic;","uniform vec2 uTexSize;uniform float uBic;\n"+HELP],
  ["if(uMirror>0.5&&q.x>0.5)q.x=1.0-q.x;","if(uMirror>0.5&&q.x>0.5)q.x=1.0-q.x;\n "+GEO],
  ["} else col=S(cc);","} else col=S(cc);\n "+SAMPLE],
  ["float dd=distance(uv,vec2(0.5));",COLOR+"\n float dd=distance(uv,vec2(0.5));"],
  ["col*=inside;","col*=step(abs(uv.y-0.5),0.5-uD.z);\n col*=inside;"],
  ["'uTexSize','uBic']","'uTexSize','uBic','uA','uB','uC','uD','uE','uF']"],
  ["gl.uniform1f(U.uPoster,f.poster||0);","gl.uniform1f(U.uPoster,f.poster||0);\n      "+DRAW]
 ];
 const original=createRenderer;let patched=null,failed=false;
 try{
  let src=original.toString();
  for(const [find,put] of EDITS){if(src.split(find).length!==2)throw new Error('ponto de encaixe em falta: '+find.slice(0,32));src=src.replace(find,()=>put);}
  patched=(new Function('return '+src))();
 }catch(e){log(e.message);}
 if(!patched)return;
 createRenderer=function(w,h,c){
  if(!failed){try{return patched(w,h,c);}catch(e){failed=true;log('shader recusado: '+e.message);if(typeof toast==='function')toast('Efeitos novos indisponíveis neste aparelho; a usar o modo normal.',6000);}}
  return original(w,h,c);
 };
 const NEW={shake:0,glitch:0,fish:0,swirl:0,zblur:0,chroma:0,scan:0,leak:0,bloom:0,edge:0,half:0,sharp:0,kal:0,tile:0,letter:0,flick:0,pulse:0,duo:0,duoa:0,duob:0,ripple:0,tape:0,snow:0,sketch:0,fxi:1};
 const LIST={
  glitchblk:['Glitch digital','Glitch',{glitch:.8,rgb:.012,chroma:.01}],
  sinal:['Falha de sinal','Glitch',{glitch:1,tape:.8,snow:.12,rgb:.016,contrast:1.15}],
  fita:['Fita danificada','Glitch',{tape:1,snow:.1,scan:.5,rgb:.008,sat:1.15}],
  desvio:['Desvio cromático','Glitch',{chroma:.03}],
  tremglitch:['Tremor glitch','Glitch',{shake:.7,glitch:.6,chroma:.015}],
  fisheye:['Olho de peixe','Distorção',{fish:.8}],
  beliscar:['Beliscar','Distorção',{fish:-.8}],
  swirl:['Redemoinho','Distorção',{swirl:2.2}],
  agua:['Água (ondas)','Distorção',{ripple:1.2,blur:.3}],
  kal6:['Caleidoscópio','Distorção',{kal:6}],
  kal3:['Triângulos','Distorção',{kal:3}],
  tile2:['Mosaico 2×2','Distorção',{tile:2}],
  tile3:['Mosaico 3×3','Distorção',{tile:3}],
  zoomrad:['Zoom radial','Desfoque',{zblur:.9}],
  zoomrad2:['Zoom radial brilhante','Desfoque',{zblur:.7,bloom:.5}],
  nevoa:['Névoa luminosa','Desfoque',{blur:2,bloom:.7,bright:.03}],
  bloom:['Brilho intenso','Luz',{bloom:1,contrast:1.05}],
  halo:['Halo','Luz',{bloom:.7,blur:1,sat:1.1}],
  fuga:['Fuga de luz','Luz',{leak:.9,bloom:.3}],
  fugaold:['Fuga de luz antiga','Luz',{leak:.8,sepia:.3,grain:.06}],
  cintila:['Cintilação','Luz',{flick:.45,bloom:.3}],
  pulso:['Pulsação','Luz',{pulse:1}],
  pulsoluz:['Pulsação luminosa','Luz',{pulse:.8,bloom:.6,sat:1.2}],
  lente:['Lente cromática','Lente',{chroma:.02,vig:.35,sharp:.4}],
  nitidez:['Nitidez extra','Lente',{sharp:1.2,contrast:1.05}],
  barras:['Barras de cinema','Lente',{letter:.12,contrast:1.15,temp:-.2,vig:.35,sat:1.05}],
  barras2:['Barras largas','Lente',{letter:.2,contrast:1.1,vig:.3}],
  crt:['Ecrã CRT','Retro',{scan:.9,rgb:.004,vig:.5,fish:.3,contrast:1.15,sat:1.2}],
  vhsplus:['VHS gasto','Retro',{tape:.7,scan:.4,snow:.08,rgb:.01,sat:1.25,blur:.5}],
  filmeold:['Filme antigo','Retro',{sepia:.65,grain:.18,vig:.5,flick:.25,contrast:1.1}],
  mudo:['Cinema mudo','Retro',{bw:1,grain:.2,flick:.3,vig:.55,contrast:1.2}],
  y2k:['Câmara anos 2000','Retro',{sat:1.3,contrast:1.15,bloom:.4,scan:.2,chroma:.01,bright:.04}],
  polaroid:['Polaroid','Retro',{temp:.35,sat:.85,contrast:.9,bright:.07,vig:.35,leak:.4,grain:.05}],
  mao:['Câmara à mão','Tremor',{shake:.5}],
  tremor:['Tremor forte','Tremor',{shake:1,blur:.6,rgb:.006}],
  esboco:['Esboço','Desenho',{sketch:1,contrast:1.1}],
  tinta:['Tinta','Desenho',{edge:-1,poster:6,sat:1.5,contrast:1.2}],
  bd:['Banda desenhada','Desenho',{half:70,sat:1.6,contrast:1.2,edge:-.8}],
  meiotom:['Meio-tom','Desenho',{half:90,contrast:1.3}],
  neonedge:['Contorno néon','Noite',{edge:1,bright:-.1,sat:1.5,bloom:.5}],
  duo1:['Duotone magenta/ciano','Noite',{duo:1,duoa:.83,duob:.5}],
  duo2:['Duotone azul/laranja','Noite',{duo:1,duoa:.62,duob:.08}],
  disco:['Discoteca','Noite',{pulse:.6,leak:.6,bloom:.6,sat:1.6,chroma:.012,flick:.2}],
  neonnight:['Noite néon','Noite',{bloom:.8,sat:1.8,contrast:1.25,bright:-.08,chroma:.01,vig:.4}],
  sonho:['Sonho brilhante','Luz',{bloom:.9,blur:1.4,bright:.06,sat:1.2}]
 };
 Object.assign(FX_DEFAULT,NEW);
 const CAT={},NEWKEYS=[];
 for(const k in LIST){if(PRESETS[k]){log('predefinição repetida: '+k);continue;}PRESETS[k]={n:LIST[k][0],v:LIST[k][2]};CAT[k]=LIST[k][1];NEWKEYS.push(k);}
 const OLD={Cor:['original','vivid','cinema','golden','cold','warm','dramatic','matte','pastel','pop','moody','duotone','sunset','teal','bleach','crisp','clean','dark','vivid2','chrome','ember','arctic','bw','noir','mono2'],Retro:['sepia','vintage','film','retro3','vhs'],Glitch:['glitch'],'Distorção':['mirror','pixel','negative','poster','wavefx','drunk','xray','thermal','infrared'],Luz:['soft','dream','hazy','softglow','warmglow','coldglow','flicker'],'Desenho':['cartoon','popart'],Noite:['neon','cyber','party']};
 for(const c in OLD)OLD[c].forEach(k=>{if(!CAT[k])CAT[k]=c;});
 const CATS=['Tudo','Novos','Cor','Retro','Glitch','Distorção','Desfoque','Luz','Lente','Tremor','Desenho','Noite'];
 let cat='Tudo';
 function apply(root){root.querySelectorAll('[data-preset]').forEach(b=>{const k=b.dataset.preset;b.hidden=!(cat==='Tudo'||(cat==='Novos'?NEWKEYS.includes(k):(CAT[k]||'Cor')===cat));});root.querySelectorAll('[data-fxcat]').forEach(b=>b.classList.toggle('on',b.dataset.fxcat===cat));}
 function enhance(){
  const body=document.getElementById('panelBody');if(!body||S.tab!=='fx'||body.querySelector('#fxCats'))return;
  const grid=body.querySelector('.fxgrid'),c=typeof selClip==='function'?selClip():null;if(!grid||!c)return;
  const v=c.fx.fxi==null?1:c.fx.fxi,box=document.createElement('div');box.id='fxCats';
  box.innerHTML='<div class="chips fx-cats">'+CATS.map(n=>'<button type="button" class="chip" data-fxcat="'+n+'">'+n+'</button>').join('')+'</div><label class="rg"><span>Intensidade dos efeitos novos <b id="fxiOut">'+Math.round(v*100)+'%</b></span><input type="range" id="fxiRange" min="0" max="1.5" step="0.05" value="'+v+'"></label><p class="hint">Os efeitos aplicam-se ao clipe inteiro. A intensidade só atua nos efeitos novos (glitch, luz, lente, tremor, desenho…).</p>';
  grid.before(box);apply(body);
  box.querySelectorAll('[data-fxcat]').forEach(b=>b.onclick=()=>{cat=b.dataset.fxcat;apply(body);});
  const r=box.querySelector('#fxiRange');
  r.oninput=()=>{const cl=selClip();if(!cl)return;cl.fx.fxi=+r.value;box.querySelector('#fxiOut').textContent=Math.round(r.value*100)+'%';invalidate();};
  r.onchange=()=>{commit();};
 }
 if(typeof renderPanel==='function'){const prev=renderPanel;renderPanel=function(){const res=prev.apply(this,arguments);try{enhance();}catch(e){log('painel: '+e.message);}return res;};}
 const st=document.createElement('style');st.textContent='.fx-cats{flex-wrap:nowrap!important;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}.fx-cats .chip{flex:none}';document.head.append(st);
 window.FenixFX={patched:true,CAT,NEWKEYS,CATS,original,PRESETS_ADDED:NEWKEYS.length};
})();
