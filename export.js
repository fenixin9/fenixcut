
'use strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const even=n=>Math.max(2,Math.round(n/2)*2);
const RES_LIST=[['720p',720],['1080p (Full HD)',1080],['2K (1440p)',1440],['4K (2160p)',2160]];
function dimsFor(short){
  const [rw,rh]=S.ratio;let w,h;
  if(rw===rh){w=h=short;}else if(rw>rh){h=short;w=short*rw/rh;}else{w=short;h=short*rh/rw;}
  return[even(w),even(h)];
}
const hasWC=()=>('VideoEncoder' in window)&&('VideoFrame' in window);
async function pickCodec(w,h,fps,bitrate){
  if(!hasWC())return null;
  const big=w*h>2073600*1.05;
  const list=big?(fps>30?['avc1.640034','avc1.640033']:['avc1.640033','avc1.640034','avc1.4d0033']):(fps>30?['avc1.64002A','avc1.640032']:['avc1.64002A','avc1.640028','avc1.4d002A','avc1.42002A']);
  for(const codec of list)for(const hw of['prefer-hardware','no-preference']){
    const cfg={codec,width:w,height:h,bitrate,framerate:fps,hardwareAcceleration:hw};
    try{const s=await VideoEncoder.isConfigSupported(cfg);if(s&&s.supported)return cfg;}catch(e){}
  }
  return null;
}

/* ---------- nitidez (evita vídeo "mole" no ficheiro final) ---------- */
function makeSharpener(w,h,amount){
  try{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const gl=c.getContext('webgl',{alpha:false,preserveDrawingBuffer:true,antialias:false});
    if(!gl)return null;
    const vs='attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,1.-(p.y*.5+.5));gl_Position=vec4(p,0.,1.);}';
    const fs='precision highp float;varying vec2 uv;uniform sampler2D tex;uniform vec2 px;uniform float a;void main(){vec3 c=texture2D(tex,uv).rgb;vec3 s=texture2D(tex,uv+vec2(px.x,0.)).rgb+texture2D(tex,uv-vec2(px.x,0.)).rgb+texture2D(tex,uv+vec2(0.,px.y)).rgb+texture2D(tex,uv-vec2(0.,px.y)).rgb;gl_FragColor=vec4(clamp(c*(1.+4.*a)-a*s,0.,1.),1.);}';
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error('link');
    gl.useProgram(pr);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const l=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    [[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST]].forEach(x=>gl.texParameteri(gl.TEXTURE_2D,x[0],x[1]));
    gl.uniform2f(gl.getUniformLocation(pr,'px'),1/w,1/h);gl.uniform1f(gl.getUniformLocation(pr,'a'),amount);
    gl.viewport(0,0,w,h);
    return{out:c,run(src){gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);},
      dispose(){const x=gl.getExtension('WEBGL_lose_context');if(x)x.loseContext();}};
  }catch(err){console.warn('sharpener',err);return null;}
}
function sharpAmount(w,h){
  let src=0;for(const id in SRC)src=Math.max(src,Math.min(SRC[id].vw,SRC[id].vh));
  if(!src)return 0.25;
  const ratio=Math.min(w,h)/src;
  return ratio>1.1?0.55:(ratio<0.8?0.3:0.25);
}
async function importAny(urls,test){
  for(const u of urls){try{const m=await import(u);if(test(m))return m;}catch(e){console.warn('import falhou',u,e);}}
  return null;
}
let _mux=null,_mb=null;
async function loadMuxer(){
  if(_mux)return _mux;
  _mux=await importAny(['https://esm.sh/mp4-muxer@5.2.1','https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm'],m=>m.Muxer);
  if(!_mux)throw new Error('Módulo MP4 indisponível (verifica a internet).');return _mux;
}
async function loadMB(){
  if(_mb)return _mb;
  _mb=await importAny(['https://esm.sh/mediabunny@1.59.1','https://cdn.jsdelivr.net/npm/mediabunny@1.59.1/+esm'],m=>m.Output&&m.CanvasSource);
  if(!_mb)throw new Error('Módulo de exportação indisponível (verifica a internet).');return _mb;
}
let _dctx=null;const _abCache={};
async function getAB(srcId){
  if(srcId in _abCache)return _abCache[srcId];
  let buf=null;
  try{
    _dctx=_dctx||new(window.AudioContext||window.webkitAudioContext)();
    const ab=await SRC[srcId].file.arrayBuffer();
    buf=await _dctx.decodeAudioData(ab);
  }catch(e){console.warn('Áudio não descodificado',SRC[srcId].name,e);logErr('áudio: '+SRC[srcId].name+' '+e.message);}
  _abCache[srcId]=buf;return buf;
}
async function mixAudio(sr,ch){
  if(!S.clips.length)return null;
  const off=new OfflineAudioContext(ch,Math.max(1,Math.ceil(S.total*sr)),sr);let any=false;
  for(const c of S.clips){
    if(c.vol<=0)continue;const buf=await getAB(c.src);if(!buf)continue;
    const s=off.createBufferSource();s.buffer=buf;s.playbackRate.value=c.speed;
    const g=off.createGain();g.gain.value=c.vol;s.connect(g);g.connect(off.destination);
    s.start(c.tStart,c.in,c.out-c.in);any=true;
  }
  return any?await off.startRendering():null;
}
function seekTo(v,t){
  return new Promise(res=>{
    if(Math.abs(v.currentTime-t)<0.002&&v.readyState>=2){res();return;}
    let done=false;const fin=()=>{if(done)return;done=true;v.removeEventListener('seeked',fin);res();};
    v.addEventListener('seeked',fin);setTimeout(fin,1500);v.currentTime=t;
  });
}
const _sinks={};
async function getSink(MB,id){
  if(id in _sinks)return _sinks[id];
  let r=null;
  try{
    const inp=new MB.Input({formats:MB.ALL_FORMATS,source:new MB.BlobSource(SRC[id].file)});
    const tr=await inp.getPrimaryVideoTrack();
    if(tr&&await tr.canDecode())r=new MB.CanvasSink(tr);
  }catch(e){console.warn('sink',e);}
  _sinks[id]=r;return r;
}
async function exportMB(o,onProg,ctl){
  if(!hasWC())throw new Error('WebCodecs indisponível');
  const{w,h,fps}=o;const MB=await loadMB();
  onProg(0,'A preparar…');
  const format=new MB.Mp4OutputFormat();
  const vcodec=await MB.getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(),{width:w,height:h});
  if(!vcodec)throw new Error(`Este aparelho não codifica ${w}×${h}`);
  const R=createRenderer(w,h);
  const SH=makeSharpener(w,h,sharpAmount(w,h)),srcCv=SH?SH.out:R.out;
  const output=new MB.Output({format,target:new MB.BufferTarget()});
  let vs;
  const cfgs=[{codec:vcodec,bitrate:o.bitrate,latencyMode:'quality',bitrateMode:'variable',keyFrameInterval:2},{codec:vcodec,bitrate:o.bitrate}];
  for(const cf of cfgs){try{vs=new MB.CanvasSource(srcCv,cf);break;}catch(err){console.warn('CanvasSource',err);}}
  if(!vs)vs=new MB.CanvasSource(srcCv,{codec:vcodec,quality:new MB.Quality('very-high')});
  output.addVideoTrack(vs,{frameRate:fps});
  let abuf=null,as=null;
  if(o.audio){
    try{
      const ac=await MB.getFirstEncodableAudioCodec(format.getSupportedAudioCodecs());
      if(ac){onProg(0,'A processar áudio…');abuf=await mixAudio(48000,2);if(abuf){as=new MB.AudioBufferSource({codec:ac,bitrate:160000});output.addAudioTrack(as);}}
    }catch(e){console.warn('áudio',e);}
  }
  try{
    await output.start();
    const N=Math.max(1,Math.ceil(S.total*fps-1e-6));let done=0;
    for(const c of S.clips){
      const i0=Math.max(0,Math.ceil(c.tStart*fps-1e-6)),i1=Math.min(N,Math.ceil((c.tStart+c.dur)*fps-1e-6));
      if(i1<=i0)continue;
      const idx=[],times=[];for(let i=i0;i<i1;i++){idx.push(i);times.push(srcTimeAt(c,i/fps));}
      const sk=await getSink(MB,c.src);
      const emit=async(i,img)=>{
        if(ctl.cancel)throw new Error('cancelado');
        renderScene(R,i/fps,{clip:c,img});
        if(SH)SH.run(R.out);
        await vs.add(i/fps,1/fps);
        done++;if(done%3===0){onProg(done/N*(abuf?0.94:0.98),`A processar frame ${done}/${N}`);await sleep(0);}
      };
      if(sk){
        let k=0,last=null;
        for await(const r of sk.canvasesAtTimestamps(times)){
          const img=r?r.canvas:last;last=img;
          await emit(idx[k++],img||SRC[c.src].video);
        }
        while(k<idx.length)await emit(idx[k++],last||SRC[c.src].video);
      }else{
        const v=SRC[c.src].video;v.pause();v.muted=true;
        for(let k=0;k<idx.length;k++){await seekTo(v,times[k]);await emit(idx[k],v);}
      }
    }
    if(as){onProg(0.95,'A juntar áudio…');await as.add(abuf);}
    onProg(0.98,'A finalizar ficheiro…');
    await output.finalize();
    onProg(1,'Concluído');
    return{blob:new Blob([output.target.buffer],{type:'video/mp4'}),ext:'mp4'};
  }catch(e){try{await output.cancel();}catch(_){}throw e;}
  finally{R.dispose();if(SH)SH.dispose();}
}
async function exportWebCodecs(o,onProg,ctl){
  const{w,h,fps,cfg}=o;const total=S.total,N=Math.max(1,Math.ceil(total*fps-1e-6));
  onProg(0,'A preparar (modo alternativo)…');
  const{Muxer,ArrayBufferTarget}=await loadMuxer();
  let abuf=null;const ac={codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:160000};
  if(o.audio&&('AudioEncoder' in window)){
    try{const s=await AudioEncoder.isConfigSupported(ac);if(s.supported){onProg(0,'A processar áudio…');abuf=await mixAudio(48000,2);}}catch(e){console.warn(e);}
  }
  const target=new ArrayBufferTarget();
  const muxer=new Muxer({target,video:{codec:'avc',width:w,height:h},...(abuf?{audio:{codec:'aac',numberOfChannels:2,sampleRate:48000}}:{}),fastStart:'in-memory'});
  let fail=null;
  const venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{fail=e;}});
  venc.configure(Object.assign({},cfg,{latencyMode:'quality',bitrateMode:'variable'}));
  const R=createRenderer(w,h);
  const SH=makeSharpener(w,h,sharpAmount(w,h));
  try{
    for(let n=0;n<N;n++){
      if(ctl.cancel)throw new Error('cancelado');
      if(fail)throw fail;
      const t=n/fps,c=clipAt(t);
      if(c){const v=SRC[c.src].video;v.pause();v.muted=true;await seekTo(v,srcTimeAt(c,t));}
      renderScene(R,t);
      if(SH)SH.run(R.out);
      const vf=new VideoFrame(SH?SH.out:R.out,{timestamp:Math.round(n*1e6/fps),duration:Math.round(1e6/fps)});
      venc.encode(vf,{keyFrame:n%(fps*2)===0});vf.close();
      while(venc.encodeQueueSize>8){await sleep(4);if(fail)throw fail;}
      if(n%4===0){onProg(n/N*(abuf?0.92:0.97),`A codificar frame ${n+1}/${N}`);await sleep(0);}
    }
    await venc.flush();
    if(abuf){
      onProg(0.93,'A codificar áudio…');
      const aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{fail=e;}});
      aenc.configure(ac);
      const L=abuf.getChannelData(0),Rr=abuf.numberOfChannels>1?abuf.getChannelData(1):L,fr=abuf.length,ch=48000;
      for(let i=0;i<fr;i+=ch){
        const n=Math.min(ch,fr-i),data=new Float32Array(n*2);data.set(L.subarray(i,i+n),0);data.set(Rr.subarray(i,i+n),n);
        const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(i/48000*1e6),data});
        aenc.encode(ad);ad.close();
      }
      await aenc.flush();aenc.close();
    }
    if(fail)throw fail;
    muxer.finalize();venc.close();
    onProg(1,'Concluído');
    return{blob:new Blob([target.buffer],{type:'video/mp4'}),ext:'mp4'};
  }finally{R.dispose();if(SH)SH.dispose();try{venc.state!=='closed'&&venc.close();}catch(e){}}
}
const _nodes={};
async function exportRealtime(o,onProg,ctl){
  const{w,h,fps,bitrate}=o;const total=S.total;
  const R=createRenderer(w,h);
  const SH=makeSharpener(w,h,sharpAmount(w,h));
  const stream=(SH?SH.out:R.out).captureStream(fps);
  const AC=new(window.AudioContext||window.webkitAudioContext)();
  const dest=AC.createMediaStreamDestination();
  const used=[...new Set(S.clips.map(c=>c.src))];
  for(const id of used){const v=SRC[id].video;if(!_nodes[id])_nodes[id]=AC.createMediaElementSource(v);_nodes[id].disconnect();_nodes[id].connect(dest);}
  if(AC.state==='suspended')await AC.resume();
  const tracks=[...stream.getVideoTracks()];if(o.audio)tracks.push(...dest.stream.getAudioTracks());
  const mime=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('Este navegador não suporta gravação de vídeo.');
  const rec=new MediaRecorder(new MediaStream(tracks),{mimeType:mime,videoBitsPerSecond:bitrate});
  const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const stopped=new Promise(r=>{rec.onstop=r;});
  rec.start(500);
  const ACT={id:null};const t0=performance.now();
  try{
    await new Promise((res,rej)=>{
      const loop=()=>{
        if(ctl.cancel){rej(new Error('cancelado'));return;}
        const t=(performance.now()-t0)/1000;
        if(t>=total){res();return;}
        syncPlayback(t,ACT,false);renderScene(R,t);if(SH)SH.run(R.out);
        onProg(t/total,`Gravação em tempo real ${Math.round(t)}s / ${Math.round(total)}s (não saias desta página)`);
        requestAnimationFrame(loop);
      };
      loop();
    });
  }finally{
    rec.state!=='inactive'&&rec.stop();await stopped;
    S.clips.forEach(c=>SRC[c.src].video.pause());
    for(const id of used){_nodes[id].disconnect();_nodes[id].connect(AC.destination);}
    R.dispose();if(SH)SH.dispose();
  }
  return{blob:new Blob(chunks,{type:mime.split(';')[0]}),ext:mime.includes('mp4')?'mp4':'webm'};
}
async function runExport(o,set,ctl){
  /* débito mais alto: o anterior deixava o vídeo desfocado */
  const mp=o.w*o.h/1e6;
  o.bitrate=Math.round(Math.min(Math.max(o.bitrate*2,mp*6e6),mp*22e6,90e6));
  let srcShort=0;for(const id in SRC)srcShort=Math.max(srcShort,Math.min(SRC[id].vw,SRC[id].vh));
  if(srcShort&&Math.min(o.w,o.h)>srcShort*1.15)toast(`O vídeo original tem ${srcShort}p; exportar em ${Math.min(o.w,o.h)}p aumenta o tamanho mas não cria detalhe. Para máxima nitidez exporta na resolução original.`,7000);
  if(o.method!=='rt'){
    try{return await exportMB(o,set,ctl);}catch(e){if(e.message==='cancelado')throw e;console.warn('MB',e);logErr('export rápido: '+e.message);}
    const cfg=await pickCodec(o.w,o.h,o.fps,o.bitrate);
    if(cfg){try{o.cfg=cfg;set(0,'A tentar modo alternativo…');return await exportWebCodecs(o,set,ctl);}catch(e){if(e.message==='cancelado')throw e;console.warn('WC',e);logErr('export alternativo: '+e.message);}}
    toast('Exportação rápida indisponível aqui. A usar modo compatível (tempo real, máx. qualidade do navegador).',6000);
  }
  return await exportRealtime(o,set,ctl);
}
