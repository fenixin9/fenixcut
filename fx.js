
'use strict';
const FX_DEFAULT={bright:0,contrast:1,sat:1,temp:0,vig:0,grain:0,rgb:0,bw:0,sepia:0,blur:0,mirror:0,pix:0};
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
pixel:{n:'Pixelizado',v:{pix:24}}
};
const TRANS={none:'Nenhuma',fade:'Fade (preto)',flash:'Flash branco',zoom:'Zoom',slide:'Deslizar',glitch:'Glitch',blur:'Desfocar'};
const FX_RANGES=[['bright','Brilho',-0.5,0.5,0.01],['contrast','Contraste',0.5,1.8,0.01],['sat','Saturação',0,2.5,0.01],['temp','Temperatura',-1,1,0.01],['vig','Vinheta',0,1,0.01],['grain','Grão',0,0.4,0.005],['blur','Desfoque',0,8,0.1],['rgb','Glitch RGB',0,0.03,0.001],['bw','Preto e branco',0,1,0.01],['sepia','Sépia',0,1,0.01]];

function createRenderer(w,h,outCanvas){
  const gc=document.createElement('canvas');gc.width=w;gc.height=h;
  const gl=gc.getContext('webgl',{alpha:false,preserveDrawingBuffer:true,antialias:false});
  if(!gl)throw new Error('WebGL não disponível neste navegador');
  const vs='attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,1.-(p.y*.5+.5));gl_Position=vec4(p,0.,1.);}';
  const fs=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;uniform sampler2D tex;uniform vec2 uRes,uScale,uOff;
uniform float uBright,uContrast,uSat,uTemp,uVig,uGrain,uRgb,uBw,uSepia,uBlur,uFade,uFlash,uTime,uMirror,uPix;
vec3 S(vec2 c){return texture2D(tex,c).rgb;}
void main(){
 vec2 q=uv;
 if(uMirror>0.5&&q.x>0.5)q.x=1.0-q.x;
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
  const U={};['uRes','uScale','uOff','uBright','uContrast','uSat','uTemp','uVig','uGrain','uRgb','uBw','uSepia','uBlur','uFade','uFlash','uTime','uMirror','uPix'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
  const out=outCanvas||document.createElement('canvas');out.width=w;out.height=h;
  const ctx=out.getContext('2d');
  const R={w,h,out,ctx,
    black(){ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);},
    draw(video,p){
      gl.viewport(0,0,w,h);
      if(video&&video.readyState>=2){gl.bindTexture(gl.TEXTURE_2D,tex);try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);}catch(e){}}
      gl.uniform2f(U.uRes,w,h);gl.uniform2f(U.uScale,p.sx,p.sy);gl.uniform2f(U.uOff,p.ox,p.oy);
      const f=p.fx;
      gl.uniform1f(U.uBright,f.bright);gl.uniform1f(U.uContrast,f.contrast);gl.uniform1f(U.uSat,f.sat);gl.uniform1f(U.uTemp,f.temp);
      gl.uniform1f(U.uVig,f.vig);gl.uniform1f(U.uGrain,f.grain);gl.uniform1f(U.uRgb,p.rgb);gl.uniform1f(U.uBw,f.bw);gl.uniform1f(U.uSepia,f.sepia);
      gl.uniform1f(U.uBlur,p.blur);gl.uniform1f(U.uFade,p.fade);gl.uniform1f(U.uFlash,p.flash);gl.uniform1f(U.uTime,p.time%100);
      gl.uniform1f(U.uMirror,f.mirror);gl.uniform1f(U.uPix,f.pix);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      ctx.drawImage(gc,0,0);
    },
    dispose(){const e=gl.getExtension('WEBGL_lose_context');if(e)e.loseContext();}
  };
  return R;
}

const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3);
function sceneParams(c,local,aspect,src){
  const sa=src.vw/src.vh;let sx=1,sy=1;
  if(S.fit==='cover'){if(sa>aspect)sx=aspect/sa;else sy=sa/aspect;}
  else{if(sa>aspect)sy=sa/aspect;else sx=aspect/sa;}
  const p={sx,sy,ox:0,oy:0,fx:c.fx,rgb:c.fx.rgb,blur:c.fx.blur,fade:0,flash:0,time:local*24};
  if(c.kb>0){const z=1-c.kb*Math.min(1,local/c.dur);p.sx*=z;p.sy*=z;}
  const tr=c.trans;
  if(tr&&tr.type!=='none'&&local<tr.dur){
    const k=ease(local/tr.dur),r=1-k;
    if(tr.type==='fade')p.fade=r;
    else if(tr.type==='flash')p.flash=r;
    else if(tr.type==='zoom'){p.sx*=1-0.45*r;p.sy*=1-0.45*r;p.fade=r*0.6;}
    else if(tr.type==='slide')p.ox=r;
    else if(tr.type==='glitch'){p.rgb+=r*0.04;p.ox=(Math.sin(local*90)*0.03)*r;p.flash=r*0.15;}
    else if(tr.type==='blur'){p.blur+=r*8;p.fade=r*0.4;}
  }
  return p;
}

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawRich(ctx,W,H,tokens,o){
  const px=o.px*(W/1080);
  ctx.save();
  ctx.font=`${o.bold?800:600} ${px}px "${o.font}", sans-serif`;ctx.textBaseline='middle';ctx.textAlign='left';
  const maxW=W*0.88,sp=ctx.measureText(' ').width,lines=[];let cur=[],cw=0;
  for(const k of tokens){
    if(k.t==='\n'){lines.push({tk:cur,w:cw});cur=[];cw=0;continue;}
    k._w=ctx.measureText(k.t).width;const add=(cur.length?sp:0)+k._w;
    if(cw+add>maxW&&cur.length){lines.push({tk:cur,w:cw});cur=[k];cw=k._w;}else{cur.push(k);cw+=add;}
  }
  lines.push({tk:cur,w:cw});
  const lh=px*1.25,bh=lines.length*lh,cy=H*o.y/100;
  ctx.globalAlpha=o.alpha==null?1:o.alpha;
  ctx.translate(W/2,cy+(o.dy||0)*px);const sc=o.scale||1;ctx.scale(sc,sc);ctx.translate(-W/2,-cy);
  const padX=px*0.45,padY=px*0.2;
  if(o.bg){const bw=Math.max(...lines.map(l=>l.w))+padX*2;ctx.fillStyle='rgba(0,0,0,0.62)';roundRect(ctx,W/2-bw/2,cy-bh/2-padY,bw,bh+padY*2,px*0.3);ctx.fill();}
  let y=cy-bh/2+lh/2;
  for(const l of lines){
    let x=W/2-l.w/2;
    for(const k of l.tk){
      if(o.stroke){ctx.lineWidth=px*0.16;ctx.strokeStyle='#000';ctx.lineJoin='round';ctx.strokeText(k.t,x,y);}
      if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.75)';ctx.shadowBlur=px*0.22;ctx.shadowOffsetY=px*0.04;}
      ctx.fillStyle=k.c||o.color;ctx.fillText(k.t,x,y);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
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
const CAP_PRESETS={
  classic:{n:'Clássico',bg:true,stroke:false,shadow:false,color:'#ffffff',bold:true,hi:null},
  karaoke:{n:'Karaoke',bg:false,stroke:true,shadow:false,color:'#ffffff',bold:true,hi:'#ffd23f',upper:true},
  bold:{n:'Destaque',bg:false,stroke:true,shadow:false,color:'#ffd23f',bold:true,hi:null,upper:true},
  minimal:{n:'Minimalista',bg:false,stroke:false,shadow:true,color:'#ffffff',bold:false,hi:null}
};
function drawOverlays(ctx,W,H,t){
  for(const x of S.texts){
    const l=t-x.start;if(l<0||l>=x.dur)continue;
    let alpha=1,scale=1,dy=0,txt=x.text;
    if(x.anim==='pop'){scale=0.7+0.3*Math.min(1,ease(l/0.3)*1.1);alpha=Math.min(1,l/0.15);}
    else if(x.anim==='fade'){alpha=Math.min(1,l/0.4)*Math.min(1,(x.dur-l)/0.3);}
    else if(x.anim==='slide'){dy=(1-ease(l/0.35))*1.2;alpha=Math.min(1,l/0.2);}
    else if(x.anim==='type'){txt=x.text.slice(0,Math.floor(x.text.length*Math.min(1,l/Math.max(0.3,Math.min(x.dur*0.6,2)))));}
    const tk=[];txt.split('\n').forEach((ln,i)=>{if(i)tk.push({t:'\n'});ln.split(/\s+/).filter(Boolean).forEach(w=>tk.push({t:w}));});
    if(tk.length)drawRich(ctx,W,H,tk,{px:x.size,font:x.font,bold:x.bold,color:x.color,bg:x.bg,stroke:x.stroke,shadow:!x.bg&&!x.stroke,y:x.y,alpha,scale,dy});
  }
  const seg=S.caps.find(s=>t>=s.start&&t<s.end);
  if(seg){
    const cs=S.capStyle,pr=CAP_PRESETS[cs.preset]||CAP_PRESETS.classic;
    const ws=segWords(seg);
    const tk=ws.map(w=>({t:(pr.upper||cs.upper)?w.w.toUpperCase():w.w,c:(pr.hi&&t>=w.s&&t<w.e)?pr.hi:null}));
    if(tk.length)drawRich(ctx,W,H,tk,{px:cs.size,font:cs.font,bold:pr.bold,color:pr.color,bg:pr.bg,stroke:pr.stroke,shadow:pr.shadow,y:cs.y});
  }
}
