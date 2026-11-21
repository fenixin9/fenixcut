
'use strict';
const FX_DEFAULT={bright:0,contrast:1,sat:1,temp:0,vig:0,grain:0,rgb:0,bw:0,sepia:0,blur:0,mirror:0,pix:0,invert:0,poster:0,wave:0};
const PRESETS={
original:{n:'Original',v:{}},
vivid:{n:'Vívido',v:{contrast:1.12,sat:1.4,bright:0.02}},
cinema:{n:'Cinema',v:{contrast:1.2,sat:1.1,temp:-0.25,vig:0.4,bright:-0.03}},
golden:{n:'Hora dourada',v:{temp:0.7,sat:1.2,bright:0.04,vig:0.2}},
cold:{n:'Frio',v:{temp:-0.7,contrast:1.08,sat:0.95}},
warm:{n:'Quente',v:{temp:0.5,sat:1.1}},
bw:{n:'Preto e branco',v:{bw:1,contrast:1.1}},
noir:{n:'Noir',v:{bw:1,contrast:1.5,vig:0.6,grain:0.08,bright:-0.05}},
sepia:{n:'Sépia',v:{sepia:1,contrast:1.05}},
vintage:{n:'Vintage',v:{sepia:0.5,sat:0.8,vig:0.45,grain:0.07,contrast:0.95}},
film:{n:'Película',v:{grain:0.12,vig:0.3,contrast:1.1,sat:0.9}},
vhs:{n:'VHS',v:{rgb:0.006,grain:0.1,sat:1.2,contrast:1.1,blur:0.6}},
glitch:{n:'Glitch RGB',v:{rgb:0.014,contrast:1.15,sat:1.2}},
dramatic:{n:'Dramático',v:{contrast:1.45,sat:0.85,vig:0.5,bright:-0.06}},
soft:{n:'Suave',v:{contrast:0.88,bright:0.06,sat:0.95,blur:0.8}},
dream:{n:'Sonho',v:{blur:2.2,bright:0.1,sat:1.15,contrast:0.9}},
matte:{n:'Mate',v:{contrast:0.85,bright:0.05,sat:0.85}},
pastel:{n:'Pastel',v:{contrast:0.82,bright:0.1,sat:0.75,temp:0.1}},
neon:{n:'Néon',v:{sat:2,contrast:1.3,bright:-0.03,rgb:0.004}},
cyber:{n:'Cyber',v:{temp:-0.6,sat:1.6,contrast:1.25,rgb:0.008}},
moody:{n:'Sombrio',v:{bright:-0.12,contrast:1.3,sat:0.8,temp:-0.2,vig:0.55}},
pop:{n:'Pop',v:{sat:1.7,contrast:1.15,bright:0.03}},
mirror:{n:'Espelho',v:{mirror:1}},
pixel:{n:'Pixelizado',v:{pix:24}},
negative:{n:'Negativo',v:{invert:1}},
poster:{n:'Pôster',v:{poster:5,sat:1.4,contrast:1.2}},
cartoon:{n:'Desenho animado',v:{poster:7,sat:1.6,contrast:1.3}},
popart:{n:'Pop art',v:{poster:4,sat:2.2,contrast:1.4}},
wavefx:{n:'Onda',v:{wave:1.5}},
drunk:{n:'Tontura',v:{wave:3,blur:1.5,sat:1.2}},
thermal:{n:'Térmico',v:{poster:6,temp:0.9,sat:2,contrast:1.4}},
xray:{n:'Raio X',v:{invert:1,bw:1,contrast:1.4}},
duotone:{n:'Duotone',v:{contrast:1.25,sat:1.4,temp:-0.5,vig:0.3}},
sunset:{n:'Pôr do sol',v:{temp:0.9,sat:1.3,contrast:1.1,vig:0.25}},
teal:{n:'Teal e laranja',v:{temp:0.4,contrast:1.25,sat:1.15,vig:0.2}},
bleach:{n:'Branqueado',v:{sat:0.55,contrast:1.3,bright:0.08}},
crisp:{n:'Nítido',v:{contrast:1.35,sat:1.1,bright:-0.02}},
hazy:{n:'Nevoeiro',v:{blur:1.6,bright:0.08,contrast:0.9,sat:0.9}},
infrared:{n:'Infravermelho',v:{temp:-0.9,sat:1.5,contrast:1.3,rgb:0.004}},
flicker:{n:'Cintilar',v:{grain:0.15,contrast:1.2,bright:0.03}},
party:{n:'Festa',v:{sat:2.2,contrast:1.2,rgb:0.008,grain:0.06}},
retro3:{n:'Retro 70s',v:{sepia:0.7,sat:0.9,contrast:1.05,grain:0.1,vig:0.4}},
clean:{n:'Limpo',v:{contrast:1.08,sat:1.15,bright:0.02}},
softglow:{n:'Brilho suave',v:{blur:1.2,bright:0.07,contrast:0.95,sat:1.1}},
dark:{n:'Escuro',v:{bright:-0.15,contrast:1.25,sat:0.9,vig:0.5}},
warmglow:{n:'Brilho quente',v:{temp:0.7,blur:1,bright:0.06,sat:1.2,vig:0.3}},
coldglow:{n:'Brilho frio',v:{temp:-0.7,blur:1,bright:0.06,sat:1.1,vig:0.3}},
vivid2:{n:'Ultra vívido',v:{sat:2.5,contrast:1.3,bright:0.04}},
mono2:{n:'Mono forte',v:{bw:1,contrast:1.7,vig:0.5}},
chrome:{n:'Cromado',v:{contrast:1.5,sat:0.7,bright:0.05,temp:-0.2}},
ember:{n:'Brasa',v:{temp:0.8,contrast:1.35,sat:1.3,vig:0.5,bright:-0.05}},
arctic:{n:'Ártico',v:{temp:-0.9,bright:0.1,sat:0.8,contrast:1.1}}
};
const TRANS={none:'Nenhuma',fade:'Fade',flash:'Flash',zoom:'Zoom dentro',zoomout:'Zoom fora',slide:'Deslizar ←',slider:'Deslizar →',slideup:'Subir',slidedown:'Descer',glitch:'Glitch',blur:'Desfocar',spin:'Rodar',spinfast:'Rodar rápido',swing:'Baloiçar',flip:'Virar',shake:'Tremor',whip:'Whip pan',roll:'Rolar',dip:'Mergulho',rgb:'RGB split',bloom:'Brilho',pixel:'Pixel',wave:'Onda',ripple:'Ondulação',invert:'Inverter',poster:'Pôster',strobe:'Estroboscópio',heartbeat:'Batimento',stretch:'Esticar',dolly:'Dolly',drop:'Cair',pop:'Pop',glow:'Resplendor',vhs:'VHS',quake:'Terramoto',zoomblur:'Zoom desfocado'};
const FX_RANGES=[['bright','Brilho',-0.5,0.5,0.01],['contrast','Contraste',0.5,1.8,0.01],['sat','Saturação',0,2.5,0.01],['temp','Temperatura',-1,1,0.01],['vig','Vinheta',0,1,0.01],['grain','Grão',0,0.4,0.005],['blur','Desfoque',0,8,0.1],['rgb','Glitch RGB',0,0.03,0.001],['bw','Preto e branco',0,1,0.01],['sepia','Sépia',0,1,0.01],['invert','Negativo',0,1,0.01],['poster','Pôster (níveis)',0,16,1],['wave','Onda',0,4,0.1]];

function createRenderer(w,h,outCanvas){
  const gc=document.createElement('canvas');gc.width=w;gc.height=h;
  const gl=gc.getContext('webgl',{alpha:false,preserveDrawingBuffer:true,antialias:false,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL não disponível neste navegador');
  const vs='attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,1.-(p.y*.5+.5));gl_Position=vec4(p,0.,1.);}';
  const fs=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;uniform sampler2D tex;uniform vec2 uRes,uScale,uOff;
uniform float uBright,uContrast,uSat,uTemp,uVig,uGrain,uRgb,uBw,uSepia,uBlur,uFade,uFlash,uTime,uMirror,uPix,uRot,uWave,uInvert,uPoster;
uniform vec2 uTexSize;uniform float uBic;
vec3 S(vec2 c){
 if(uBic<0.5)return texture2D(tex,c).rgb;
 vec2 pos=c*uTexSize;vec2 c1=floor(pos-0.5)+0.5;vec2 f=pos-c1;
 vec2 w0=f*(-0.5+f*(1.0-0.5*f));vec2 w1=1.0+f*f*(-2.5+1.5*f);vec2 w2=f*(0.5+f*(2.0-1.5*f));vec2 w3=f*f*(-0.5+0.5*f);
 vec2 w12=w1+w2;vec2 t0=(c1-1.0)/uTexSize;vec2 t12=(c1+w2/w12)/uTexSize;vec2 t3=(c1+2.0)/uTexSize;
 vec3 r=texture2D(tex,vec2(t0.x,t0.y)).rgb*(w0.x*w0.y)+texture2D(tex,vec2(t12.x,t0.y)).rgb*(w12.x*w0.y)+texture2D(tex,vec2(t3.x,t0.y)).rgb*(w3.x*w0.y)
 +texture2D(tex,vec2(t0.x,t12.y)).rgb*(w0.x*w12.y)+texture2D(tex,vec2(t12.x,t12.y)).rgb*(w12.x*w12.y)+texture2D(tex,vec2(t3.x,t12.y)).rgb*(w3.x*w12.y)
 +texture2D(tex,vec2(t0.x,t3.y)).rgb*(w0.x*w3.y)+texture2D(tex,vec2(t12.x,t3.y)).rgb*(w12.x*w3.y)+texture2D(tex,vec2(t3.x,t3.y)).rgb*(w3.x*w3.y);
 return clamp(r,0.0,1.0);
}
void main(){
 vec2 q=uv;
 if(uMirror>0.5&&q.x>0.5)q.x=1.0-q.x;
 if(uWave>0.0)q.x+=uWave*0.015*sin(q.y*40.0+uTime*0.5);
 if(abs(uRot)>0.0001){vec2 cq=q-0.5;float ar=uRes.x/uRes.y;cq.x*=ar;float cs=cos(uRot),sn=sin(uRot);cq=vec2(cs*cq.x-sn*cq.y,sn*cq.x+cs*cq.y);cq.x/=ar;q=cq+0.5;}
 if(uPix>1.0){vec2 g=uRes/uPix;q=floor(q*g)/g;}
 vec2 c=(q-0.5)*uScale+0.5+uOff;
 float inside=step(0.0,c.x)*step(c.x,1.0)*step(0.0,c.y)*step(c.y,1.0);
 vec2 cc=clamp(c,0.0,1.0);
 vec3 col;
 if(uBlur>0.05||uRgb>0.0005){
  vec2 d=vec2(uRgb,0.0);vec3 acc=vec3(0.0);float w=0.0;
  float bl=uBlur>0.05?uBlur:0.0;
  for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){
   vec2 o=vec2(float(i),float(j))*bl/uRes*2.0;
   acc+=vec3(S(clamp(cc+o+d,0.0,1.0)).r,S(clamp(cc+o,0.0,1.0)).g,S(clamp(cc+o-d,0.0,1.0)).b);w+=1.0;}}
  col=acc/w;
 } else col=S(cc);
 col+=uBright;
 col=(col-0.5)*uContrast+0.5;
 float l=dot(col,vec3(0.299,0.587,0.114));
 col=mix(vec3(l),col,uSat);
 col.r+=uTemp*0.1;col.b-=uTemp*0.1;
 col=mix(col,vec3(l),uBw);
 vec3 sp=vec3(dot(col,vec3(0.393,0.769,0.189)),dot(col,vec3(0.349,0.686,0.168)),dot(col,vec3(0.272,0.534,0.131)));
 col=mix(col,sp,uSepia);
 col=mix(col,1.0-col,uInvert);
 if(uPoster>1.0)col=floor(col*uPoster)/uPoster;
 float dd=distance(uv,vec2(0.5));
 col*=1.0-uVig*smoothstep(0.25,0.85,dd);
 float n=fract(sin(dot(uv*uRes+uTime,vec2(12.9898,78.233)))*43758.5453);
 col+=(n-0.5)*uGrain;
 col*=(1.0-uFade);col+=uFlash;
 col*=inside;
 gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  [[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR]].forEach(a=>gl.texParameteri(gl.TEXTURE_2D,a[0],a[1]));
  const U={};['uRes','uScale','uOff','uBright','uContrast','uSat','uTemp','uVig','uGrain','uRgb','uBw','uSepia','uBlur','uFade','uFlash','uTime','uMirror','uPix','uRot','uWave','uInvert','uPoster','uTexSize','uBic'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
  const out=outCanvas||document.createElement('canvas');out.width=w;out.height=h;
  const ctx=out.getContext('2d');
  return{w,h,out,ctx,
    black(){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);},
    draw(img,p){
      gl.viewport(0,0,w,h);
      if(img&&(img.readyState===undefined||img.readyState>=2)){gl.bindTexture(gl.TEXTURE_2D,tex);try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);}catch(e){}}
      {const iw=img&&(img.videoWidth||img.naturalWidth||img.width)||0,ih=img&&(img.videoHeight||img.naturalHeight||img.height)||0;
       gl.uniform2f(U.uTexSize,iw||1,ih||1);gl.uniform1f(U.uBic,(iw&&w/(iw*Math.abs(p.sx))>1.05)?1:0);}
      gl.uniform2f(U.uRes,w,h);gl.uniform2f(U.uScale,p.sx,p.sy);gl.uniform2f(U.uOff,p.ox,p.oy);
      const f=p.fx;
      gl.uniform1f(U.uBright,f.bright);gl.uniform1f(U.uContrast,f.contrast);gl.uniform1f(U.uSat,f.sat);gl.uniform1f(U.uTemp,f.temp);
      gl.uniform1f(U.uVig,f.vig);gl.uniform1f(U.uGrain,f.grain);gl.uniform1f(U.uRgb,p.rgb);gl.uniform1f(U.uBw,f.bw);gl.uniform1f(U.uSepia,f.sepia);
      gl.uniform1f(U.uBlur,p.blur);gl.uniform1f(U.uFade,p.fade);gl.uniform1f(U.uFlash,p.flash);gl.uniform1f(U.uTime,p.time%100);
      gl.uniform1f(U.uMirror,f.mirror||0);gl.uniform1f(U.uPix,f.pix||0);gl.uniform1f(U.uRot,p.rot||0);gl.uniform1f(U.uWave,(f.wave||0)+(p.wave||0));gl.uniform1f(U.uInvert,f.invert||0);gl.uniform1f(U.uPoster,f.poster||0);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      ctx.drawImage(gc,0,0);
    },
    dispose(){const e=gl.getExtension('WEBGL_lose_context');if(e)e.loseContext();}
  };
}

const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3);
function sceneParams(c,local,aspect,src){
  const sa=src.vw/src.vh;let sx=1,sy=1;
  if(S.fit==='cover'){if(sa>aspect)sx=aspect/sa;else sy=sa/aspect;}
  else{if(sa>aspect)sy=sa/aspect;else sx=aspect/sa;}
  const p={sx,sy,ox:0,oy:0,rot:0,wave:0,fx:c.fx,rgb:c.fx.rgb,blur:c.fx.blur,fade:0,flash:0,time:local*24};
  if(c.kb>0){const z=1-c.kb*Math.min(1,local/c.dur);p.sx*=z;p.sy*=z;}
  const tr=c.trans;
  if(tr&&tr.type!=='none'&&local<tr.dur){
    const u=local/tr.dur,k=ease(u),r=1-k,t=tr.type;
    const fxo=o=>{p.fx=Object.assign({},c.fx,o);};
    const zin=a=>{p.sx*=1-a;p.sy*=1-a;};
    switch(t){
      case'fade':p.fade=r;break;
      case'flash':p.flash=r;break;
      case'zoom':zin(0.45*r);p.fade=r*0.6;break;
      case'zoomout':p.sx*=1+0.6*r;p.sy*=1+0.6*r;p.fade=r*0.6;break;
      case'slide':p.ox=r;break;
      case'slider':p.ox=-r;break;
      case'slideup':p.oy=r;break;
      case'slidedown':p.oy=-r;break;
      case'glitch':p.rgb+=r*0.04;p.ox=(Math.sin(local*90)*0.03)*r;p.flash=r*0.15;break;
      case'blur':p.blur+=r*8;p.fade=r*0.4;break;
      case'spin':p.rot=r*3.1416;zin(0.4*r);p.fade=r*0.5;break;
      case'spinfast':p.rot=r*6.2832;zin(0.6*r);p.fade=r*0.6;break;
      case'swing':p.rot=Math.sin(u*9)*0.25*r;p.ox=Math.sin(u*7)*0.1*r;break;
      case'flip':p.sx*=-1;p.fade=r*0.6;break;
      case'shake':p.ox=(Math.sin(local*60)*0.04)*r;p.rgb+=r*0.01;break;
      case'whip':p.ox=r*2;p.blur+=r*6;p.fade=r*0.3;break;
      case'roll':p.rot=r*1.5708;p.oy=r*0.5;p.fade=r*0.4;break;
      case'dip':p.fade=r;p.blur+=r*4;break;
      case'rgb':p.rgb+=r*0.03;p.ox=(Math.sin(local*80)*0.05)*r;break;
      case'bloom':p.blur+=r*5;fxo({bright:c.fx.bright+r*0.15});p.fade=r*0.3;break;
      case'pixel':fxo({pix:24+Math.round(r*90)});break;
      case'wave':p.wave=r*3;p.blur+=r*1.5;break;
      case'ripple':p.wave=r*5;p.rot=Math.sin(u*10)*0.05*r;break;
      case'invert':fxo({invert:r});p.flash=r*0.1;break;
      case'poster':fxo({poster:k<0.7?4:0});p.fade=r*0.3;break;
      case'strobe':p.flash=(Math.floor(local*14)%2)?r:0;break;
      case'heartbeat':zin(0.15*Math.abs(Math.sin(u*12))*r);break;
      case'stretch':p.sx*=1-0.5*r;p.fade=r*0.3;break;
      case'dolly':zin(0.35*r);p.blur+=r*3;break;
      case'drop':p.oy=-r+Math.sin(u*14)*0.03*r;break;
      case'pop':zin(0.6*r);p.fade=r*0.2;break;
      case'glow':p.blur+=r*3;fxo({bright:c.fx.bright+r*0.2,sat:c.fx.sat*(1+r*0.5)});break;
      case'vhs':p.rgb+=r*0.02;p.wave=r*2;fxo({grain:c.fx.grain+r*0.15});break;
      case'quake':p.ox=(Math.sin(local*70)*0.05)*r;p.oy=(Math.cos(local*65)*0.05)*r;p.rot=Math.sin(local*50)*0.03*r;break;
      case'zoomblur':zin(0.5*r);p.blur+=r*8;p.fade=r*0.2;break;
    }
  }
  return p;
}

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
const hashStr=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
function rng32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function lum(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return 1;const n=parseInt(m[1],16),f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(n>>16)+0.7152*f((n>>8)&255)+0.0722*f(n&255);}
function drawCutout(ctx,x,y,w,h,color,seed,px){
  const r=rng32(seed),j=px*0.07,st=Math.max(px*0.3,6);
  const pts=[];
  for(let a=0;a<=w;a+=st)pts.push([x+Math.min(a,w),y+(r()-0.5)*j]);
  for(let a=0;a<=h;a+=st)pts.push([x+w+(r()-0.5)*j,y+Math.min(a,h)]);
  for(let a=w;a>=0;a-=st)pts.push([x+Math.max(a,0),y+h+(r()-0.5)*j]);
  for(let a=h;a>=0;a-=st)pts.push([x+(r()-0.5)*j,y+Math.max(a,0)]);
  ctx.save();ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=px*0.16;ctx.shadowOffsetY=px*0.06;
  ctx.fillStyle=color;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore();
}
function drawRich(ctx,W,H,tokens,o){
  if(!tokens.length)return;
  let px=o.px*(W/1080);const maxW=W*(o.maxW||0.84);
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';
  const wt=o.normal?400:(o.bold?800:600);
  const fnt=(k,p)=>`${wt} ${p}px "${(k&&k.font)||o.font}", sans-serif`;
  let lines,sp,anyCut=tokens.some(k=>k.cut),anyBox=tokens.some(k=>k.box);
  for(let it=0;it<8;it++){
    ctx.font=fnt(null,px);sp=ctx.measureText(' ').width;
    if(anyCut)sp+=px*0.12;
    if(anyBox)sp+=px*0.16;
    lines=[];let cur=[],cw=0;
    for(const k of tokens){
      if(k.t==='\n'){lines.push({tk:cur,w:cw});cur=[];cw=0;continue;}
      ctx.font=fnt(k,px);k._w=ctx.measureText(k.t).width+(k.cut||k.box?px*0.5:0);
      const add=(cur.length?sp:0)+k._w;
      if(cw+add>maxW&&cur.length){lines.push({tk:cur,w:cw});cur=[k];cw=k._w;}else{cur.push(k);cw+=add;}
    }
    lines.push({tk:cur,w:cw});
    if(!o.maxLines||lines.length<=o.maxLines)break;
    px*=0.9;
  }
  const lh=px*(anyCut?1.6:(anyBox?1.5:1.25)),bh=lines.length*lh,cy=H*o.y/100;
  ctx.globalAlpha=o.alpha==null?1:o.alpha;
  ctx.translate(W/2,cy+(o.dy||0)*px);const sc=o.scale||1;ctx.scale(sc,sc);ctx.translate(-W/2,-cy);
  const padX=px*0.45,padY=px*0.2;
  if(o.bg){const bw=Math.max(...lines.map(l=>l.w))+padX*2;ctx.fillStyle=typeof o.bg==='string'?o.bg:'rgba(0,0,0,0.62)';roundRect(ctx,W/2-bw/2,cy-bh/2-padY,bw,bh+padY*2,px*0.3);ctx.fill();}
  let y=cy-bh/2+lh/2;
  const sw=px*0.16*(o.stroke===true?1:(o.stroke||0));
  for(const l of lines){
    let x=W/2-l.w/2;
    for(const k of l.tk){
      ctx.save();
      const cx=x+k._w/2;
      if((k.sc&&k.sc!==1)||k.rot){ctx.translate(cx,y);if(k.rot)ctx.rotate(k.rot);const s=k.sc||1;ctx.scale(s,s);ctx.translate(-cx,-y);}
      if(k.cut)drawCutout(ctx,x,y-lh*0.4,k._w,lh*0.8,k.cut,k.seed||1,px);
      else if(k.box){ctx.fillStyle=k.bg;ctx.fillRect(x,y-lh*0.42,k._w,lh*0.84);}
      else if(k.bg){ctx.fillStyle=k.bg;roundRect(ctx,x-px*0.2,y-lh*0.46,k._w+px*0.4,lh*0.92,px*0.28);ctx.fill();}
      ctx.font=fnt(k,px);
      const tx=x+(k.cut||k.box?px*0.25:0);
      if(k.trot){ctx.translate(cx,y);ctx.rotate(k.trot);ctx.translate(-cx,-y);}
      if(o.offset3d){ctx.fillStyle='#000';ctx.fillText(k.t,tx+px*0.06,y+px*0.08);}
      if(sw>0&&!k.cut){ctx.lineWidth=sw;ctx.strokeStyle='#000';ctx.lineJoin='round';ctx.strokeText(k.t,tx,y);}
      if(o.glow){ctx.shadowColor=o.glowColor||k.c||o.glow;ctx.shadowBlur=px*0.5;}
      else if(o.shadow&&!k.cut){ctx.shadowColor='rgba(0,0,0,0.75)';ctx.shadowBlur=px*0.22;ctx.shadowOffsetY=px*0.04;}
      ctx.fillStyle=k.c||o.color;ctx.fillText(k.t,tx,y);
      if(o.glow)ctx.fillText(k.t,tx,y);
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      if(k.ul){ctx.fillStyle=k.ul;ctx.fillRect(tx,y+px*0.48,k._w,Math.max(2,px*0.09));}
      ctx.restore();
      x+=k._w+sp;
    }
    y+=lh;
  }
  ctx.restore();
}
function segWords(seg){
  if(seg.words&&seg.wt===seg.text)return seg.words;
  const ws=seg.text.split(/\s+/).filter(Boolean);if(!ws.length)return[];
  const tot=ws.reduce((a,w)=>a+w.length+2,0);let t=seg.start;const d=seg.end-seg.start;
  return ws.map(w=>{const e=t+d*(w.length+2)/tot;const o={w,s:t,e};t=e;return o;});
}
const HI_COLORS=['#ffd23f','#3ddc84','#ff4d6d','#4dabff','#ff8a1f','#c77dff','#22e6d4','#ffffff'];
const BG_PALETTES={
  jornal:{n:'Jornal',c:['#f4efe1','#e6dcc0','#ffffff','#d8cfb4','#f4efe1']},
  cores:{n:'Colorido',c:['#ffd23f','#ff4d6d','#4dabff','#3ddc84','#ffffff']},
  pb:{n:'Preto e branco',c:['#ffffff','#111111','#ffffff','#111111','#ffffff']},
  neon:{n:'Néon',c:['#ff2ea6','#22e6d4','#c4ff00','#ffe600','#7b61ff']},
  amarelo:{n:'Amarelo',c:['#ffd23f','#ffd23f','#ffd23f','#ffd23f','#ffd23f']}
};
const NEWS_FONTS=['Playfair Display','Special Elite','Oswald','Montserrat','Satoshi'];
const CAP_PRESETS={
  pop:{n:'Pop',upper:1,stroke:1,hiMode:'color',pop:1,font:'Montserrat'},
  impact:{n:'Impacto',upper:1,stroke:2,hiMode:'color',pop:1,font:'Anton'},
  news:{n:'Jornal (acumula)',news:1,reveal:1,upper:1,hiMode:'none',font:'Playfair Display'},
  news1:{n:'Jornal (1 palavra)',news:1,single:1,upper:1,hiMode:'none',font:'Playfair Display'},
  news2:{n:'Jornal · caixas retas',news2:1,reveal:1,upper:1,hiMode:'none',font:'Playfair Display'},
  news3:{n:'Jornal · caixa 1 palavra',news2:1,single:1,upper:1,hiMode:'none',font:'Playfair Display'},
  news4:{n:'Jornal · destaque em caixa',news2:2,upper:1,hiMode:'none',font:'Playfair Display'},
  news5:{n:'Jornal · fita',strip:1,upper:1,hiMode:'none',font:'Playfair Display'},
  news6:{n:'Jornal · máquina de escrever',news2:1,reveal:1,upper:1,hiMode:'none',font:'Special Elite'},
  news7:{n:'Jornal · condensado',news2:1,reveal:1,upper:1,hiMode:'none',font:'Oswald'},
  news8:{n:'Jornal · moderno',news2:1,reveal:1,upper:1,hiMode:'none',font:'Montserrat'},
  pill:{n:'Pílula',hiMode:'pill',pop:1,font:'Montserrat'},
  wordbox:{n:'Caixas',wordBox:1,hiMode:'pill',font:'Montserrat'},
  karaoke:{n:'Karaoke',upper:1,stroke:1,hiMode:'color',font:'Montserrat'},
  single:{n:'Uma palavra',single:1,upper:1,stroke:2,hiMode:'color',pop:1,font:'Anton'},
  reveal:{n:'Aparece a falar',reveal:1,upper:1,stroke:1,hiMode:'color',font:'Montserrat'},
  neon:{n:'Néon',glow:1,upper:1,hiMode:'color',font:'Montserrat'},
  under:{n:'Sublinhado',hiMode:'underline',shadow:1,font:'Montserrat'},
  fill:{n:'Fundo de cor',bgHi:1,hiMode:'none',font:'Montserrat'},
  bold:{n:'Cor total',upper:1,stroke:1,hiMode:'none',colorHi:1,font:'Bebas Neue'},
  comic:{n:'Cómico',upper:1,stroke:2,hiMode:'none',colorHi:1,retro:1,font:'Bangers'},
  classic:{n:'Clássico',boxBg:1,hiMode:'none',font:'Montserrat'},
  minimal:{n:'Minimalista',shadow:1,hiMode:'none',font:'Satoshi',plain:1}
};
const TEXT_STYLES={
  clean:{n:'Limpo',color:'#ffffff',stroke:true,bg:false,font:'Montserrat',glow:'',cut:false,bold:true},
  yellow:{n:'Amarelo forte',color:'#ffd23f',stroke:true,bg:false,font:'Anton',glow:'',cut:false,bold:true},
  box:{n:'Caixa',color:'#ffffff',stroke:false,bg:true,font:'Montserrat',glow:'',cut:false,bold:true},
  neon:{n:'Néon rosa',color:'#ffffff',stroke:false,bg:false,font:'Montserrat',glow:'#ff2ea6',cut:false,bold:true},
  comic:{n:'Cómico',color:'#ffd23f',stroke:true,bg:false,font:'Bangers',glow:'',cut:false,bold:true},
  elegant:{n:'Elegante',color:'#ffffff',stroke:false,bg:false,font:'Playfair Display',glow:'',cut:false,bold:true},
  type:{n:'Máquina',color:'#ffffff',stroke:false,bg:true,font:'Special Elite',glow:'',cut:false,bold:false},
  news:{n:'Jornal',color:'#111111',stroke:false,bg:false,font:'Playfair Display',glow:'',cut:true,bold:false},
  bebas:{n:'Alto e fino',color:'#ffffff',stroke:true,bg:false,font:'Bebas Neue',glow:'',cut:false,bold:true}
};
function newsToken(word,i,pal,active,upper){
  const h=hashStr(word+'#'+i),col=pal[i%pal.length];
  return{t:upper?word.toUpperCase():word,bg:col,box:1,c:lum(col)>0.5?'#111111':'#ffffff',trot:((h%1000)/1000-0.5)*0.04,seed:h,sc:1};
}
function palOf(cs){const a=(cs.bgColors&&cs.bgColors.length?cs.bgColors:BG_PALETTES.jornal.c);return cs.bgMode==='single'?[a[0]]:a;}
function buildCaption(ws,t,cs){
  const pr=CAP_PRESETS[cs.preset]||CAP_PRESETS.pop,hi=cs.hi||'#ffd23f',base=cs.color||'#ffffff';
  let ai=-1;
  for(let i=0;i<ws.length;i++){if(t>=ws[i].s&&t<ws[i].e){ai=i;break;}}
  if(ai<0)for(let i=0;i<ws.length;i++)if(ws[i].s<=t)ai=i;
  let list=ws.map((w,i)=>({w,i}));
  const cur=Math.max(0,ai);
  if(pr.single)list=list.filter(x=>x.i===cur);
  else if(pr.reveal)list=list.filter(x=>x.i<=cur);
  const dark=pr.bgHi,pal=palOf(cs);
  const tokens=list.map(({w,i})=>{
    const act=i===ai,up=!!(pr.upper||cs.upper);
    if(pr.news)return newsToken(w.w,i,pal,act,up);
    if(pr.news2){
      const h=hashStr(w.w+'#'+i);let col=pal[i%pal.length];
      if(pr.news2===2)col=act?hi:pal[0];
      return{t:up?w.w.toUpperCase():w.w,bg:col,box:1,c:lum(col)>0.5?'#111111':'#ffffff',trot:((h%1000)/1000-0.5)*0.04,sc:1};
    }
    if(pr.strip){
      const h=hashStr(w.w+'#'+i);
      return{t:up?w.w.toUpperCase():w.w,c:lum(pal[0])>0.5?'#111111':'#ffffff',trot:((h%1000)/1000-0.5)*0.04,sc:1};
    }
    const tk={t:up?w.w.toUpperCase():w.w,c:dark?'#111111':(pr.colorHi?hi:base),sc:1};
    if(pr.wordBox)tk.bg='rgba(0,0,0,0.62)';
    if(act){
      if(pr.hiMode==='color')tk.c=hi;
      else if(pr.hiMode==='pill'){tk.bg=hi;tk.c='#111111';}
      else if(pr.hiMode==='underline')tk.ul=hi;
      if(pr.pop)tk.sc=1.12;
    }
    return tk;
  });
  const opts={px:cs.size*(pr.single?1.35:1),font:(cs.font&&cs.font!=='auto')?cs.font:pr.font,bold:!(pr.plain||pr.news||pr.news2||pr.strip),normal:!!(pr.news||pr.news2||pr.strip),color:base,stroke:pr.stroke||0,shadow:!!pr.shadow,glow:pr.glow?hi:null,
    bg:pr.boxBg?'rgba(0,0,0,0.62)':(pr.bgHi?hi:(pr.strip?pal[0]:null)),y:cs.y,maxLines:pr.single?1:2,maxW:pr.news?0.88:0.82,offset3d:!!pr.retro};
  return{tokens,opts};
}
function drawTextObj(ctx,W,H,x,l){
  let alpha=1,scale=1,dy=0,txt=x.text;
  if(x.anim==='pop'){scale=0.7+0.3*Math.min(1,ease(l/0.3)*1.1);alpha=Math.min(1,l/0.15);}
  else if(x.anim==='fade'){alpha=Math.min(1,l/0.4)*Math.min(1,(x.dur-l)/0.3);}
  else if(x.anim==='slide'){dy=(1-ease(l/0.35))*1.2;alpha=Math.min(1,l/0.2);}
  else if(x.anim==='type'){txt=x.text.slice(0,Math.floor(x.text.length*Math.min(1,l/Math.max(0.3,Math.min(x.dur*0.6,2)))));}
  const tk=[],pal=palOf(S.capStyle);let wi=0;
  txt.split('\n').forEach((ln,i)=>{if(i)tk.push({t:'\n'});ln.split(/\s+/).filter(Boolean).forEach(w=>{tk.push(x.cut?newsToken(w,wi,pal,false,false):{t:w});wi++;});});
  drawRich(ctx,W,H,tk,{normal:!!x.cut,px:x.size,font:x.font,bold:x.bold&&!x.cut,color:x.color,bg:x.bg,stroke:x.stroke?1:0,shadow:!x.bg&&!x.stroke&&!x.cut,y:x.y,alpha,scale,dy,glow:x.glow||null,glowColor:x.glow||null});
}
function drawOverlays(ctx,W,H,t){
  for(const x of S.texts){const l=t-x.start;if(l<0||l>=x.dur)continue;drawTextObj(ctx,W,H,x,l);}
  const cs=S.capStyle,tt=t+(cs.offset||0);
  const seg=S.caps.find(s=>tt>=s.start&&tt<s.end);
  if(seg){const b=buildCaption(segWords(seg),tt,cs);drawRich(ctx,W,H,b.tokens,b.opts);}
}
/* ---------- miniaturas (estilos visíveis em todas as funções) ---------- */
function thumbBg(cv){
  const W=cv.width,H=cv.height,ctx=cv.getContext('2d');
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#3a4a5a');g.addColorStop(1,'#1b222b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return ctx;
}
function drawStyleThumb(cv,key,t){
  t=t||0;const ctx=thumbBg(cv);
  const ws=[{w:'Isto',s:0,e:0.7},{w:'é',s:0.7,e:1.3},{w:'um',s:1.3,e:1.9},{w:'teste',s:1.9,e:2.8}];
  const cs=Object.assign({},S.capStyle,{preset:key,y:50,size:Math.min(S.capStyle.size,80)});
  const b=buildCaption(ws,t%3.4,cs);b.opts.maxW=0.94;drawRich(ctx,cv.width,cv.height,b.tokens,b.opts);
}
function drawTextThumb(cv,key,t){
  t=t||0;const ctx=thumbBg(cv),st=TEXT_STYLES[key];
  const x=Object.assign({text:'Texto novo',size:90,y:50,start:0,dur:3,anim:'type'},st);
  drawTextObj(ctx,cv.width,cv.height,x,Math.min(t%3.6,2.99));
}
let _tc=null,TH=null;
function testCard(t){
  t=t||0;
  if(!_tc){_tc=document.createElement('canvas');_tc.width=256;_tc.height=144;}
  const x=_tc.getContext('2d');
  const g=x.createLinearGradient(0,0,0,144);g.addColorStop(0,'#5aa9e6');g.addColorStop(0.6,'#f6c177');g.addColorStop(1,'#2d6a4f');x.fillStyle=g;x.fillRect(0,0,256,144);
  x.fillStyle='#ffe066';x.beginPath();x.arc(30+((t*28)%200),42,20,0,7);x.fill();
  x.fillStyle='#1b4332';x.beginPath();x.moveTo(0,144);x.lineTo(90,70);x.lineTo(170,144);x.fill();
  x.fillStyle='#d8572a';x.fillRect(150,88,60,40);x.fillStyle='#8c2f1b';x.beginPath();x.moveTo(144,88);x.lineTo(180,62);x.lineTo(216,88);x.fill();
  x.fillStyle='#e63da0';x.beginPath();x.arc(60+Math.abs(Math.sin(t*2))*0+((t*40)%140),118-Math.abs(Math.sin(t*3.2))*46,10,0,7);x.fill();
  return _tc;
}
function thumbSource(t){
  const c=typeof selClip==='function'?selClip():null;
  if(c){const s=SRC[c.src];if(s&&s.video.readyState>=2)return{img:s.video,vw:s.vw,vh:s.vh};}
  return{img:testCard(t),vw:256,vh:144};
}
function drawFxThumb(cv,fx,trType,t){
  t=t||0;if(!TH)TH=createRenderer(cv.width,cv.height);
  const src=thumbSource(t),full=Object.assign({},FX_DEFAULT,fx);
  const isTr=!!trType&&trType!=='none';
  const fake={fx:full,trans:{type:trType||'none',dur:1},kb:0,dur:5};
  const p=sceneParams(fake,isTr?(t%1.9):1.5,cv.width/cv.height,src);
  if(!isTr){p.ox+=0.04*Math.sin(t*1.7);p.oy+=0.03*Math.cos(t*1.3);const z=0.94-0.04*Math.sin(t*1.1);p.sx*=z;p.sy*=z;p.time=t*24;}
  TH.draw(src.img,p);
  cv.getContext('2d').drawImage(TH.out,0,0);
}
