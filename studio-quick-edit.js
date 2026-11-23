/* FenixCut V25: quick editing for the main clip; no renderer changes. */
'use strict';
(function(){
 if(typeof S==='undefined'||typeof renderPanel!=='function')return;
 let copied=null,busy=false;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function clip(){if(S.exporting)throw new Error('Aguarda o fim da exportação.');const c=selClip();if(!c)throw new Error('Seleciona primeiro um clipe.');return c;}
 function changed(c,fn){pause();commit();fn(c);layout();S.t=Math.min(S.t,S.total);commit();setT(S.t);refreshAll();}
 function trim(side){const c=clip();if(S.t<=c.tStart+.05||S.t>=c.tStart+c.dur-.05)throw new Error('Coloca a agulha dentro do clipe, longe das extremidades.');const cut=srcTimeAt(c,S.t);changed(c,()=>{c[side==='start'?'in':'out']=cut;});toast('Clipe cortado. Textos, legendas e camadas não foram deslocados; revê a sincronização.',7000);}
 function wav(buffer){const ch=Math.min(2,buffer.numberOfChannels),n=buffer.length,bytes=n*ch*2,out=new ArrayBuffer(44+bytes),v=new DataView(out);const str=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+bytes,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,bytes,true);const data=Array.from({length:ch},(_,i)=>buffer.getChannelData(i));let p=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(p,Math.round(x*(x<0?32768:32767)),true);p+=2;}return new Blob([out],{type:'audio/wav'});}
 async function extract(){
  if(busy)return toast('A extração de áudio já está em curso.');
  const c=clone(clip()),src=SRC[c.src];
  if(!src||!src.file)throw new Error('O ficheiro de origem não está disponível.');
  if(c.dur>120||src.dur>300||src.file.size>100*1024*1024)throw new Error('Para proteger a memória: clipe até 2 minutos, origem até 5 minutos e 100 MB.');
  const AC=window.AudioContext||window.webkitAudioContext,OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!AC||!OC)throw new Error('Extração de áudio indisponível neste navegador.');
  pause();busy=true;renderPanel();let ac;
  try{
   toast('A extrair áudio localmente…',10000);ac=new AC();const audio=await ac.decodeAudioData(await src.file.arrayBuffer());
   const start=Math.max(0,c.in),span=Math.min(c.out,audio.duration)-start,rate=Number(c.speed)||1;
   if(span<=0)throw new Error('Não existe áudio neste intervalo.');
   const off=new OC(Math.min(2,audio.numberOfChannels),Math.max(1,Math.round(span/rate*48000)),48000),node=off.createBufferSource();node.buffer=audio;node.playbackRate.value=rate;node.connect(off.destination);node.start(0,start,span);
   const blob=wav(await off.startRendering()),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(c.name||'clipe').replace(/[^\w-]+/g,'_').slice(0,60)+'-audio.wav';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   toast('WAV descarregado. O som do clipe original não foi alterado.',6000);
  }catch(e){throw new Error('Não consegui extrair o áudio: '+e.message);}finally{if(ac)await ac.close().catch(()=>{});busy=false;renderPanel();}
 }
 const actions={
 split:()=>{const c=clip();S.sel={type:'clip',id:c.id};splitAt();},
 dup:()=>{const c=clip();S.sel={type:'clip',id:c.id};dupClip();},
 mute:()=>{const c=clip();changed(c,()=>{c.vol=c.vol>0?0:1;});toast(c.vol?'Som ativado a 100%.':'Clipe sem som.');},
 start:()=>trim('start'),end:()=>trim('end'),
 copy:()=>{copied=clone(clip().fx);renderPanel();toast('Ajustes e filtro copiados.');},
 paste:()=>{const c=clip();if(!copied)throw new Error('Copia primeiro os ajustes de outro clipe.');changed(c,()=>{c.fx=clone(copied);});},
 reset:()=>{const c=clip();changed(c,()=>{c.fx=Object.assign({},FX_DEFAULT,{preset:'original'});});},
 audio:extract
 };
 async function run(key){try{if(busy)return toast('Aguarda o fim da extração.');await actions[key]();}catch(e){toast(e.message,6500);}}
 const tools=[['split','Dividir','M4 4l16 16M4 20 20 4'],['dup','Duplicar','M8 8h13v13H8z M3 16V3h13'],['mute','Som on/off','M3 9h4l5-5v16l-5-5H3z M16 8l5 8M21 8l-5 8'],['start','Cortar início','M4 3v18M20 5 8 12l12 7'],['end','Cortar fim','M20 3v18M4 5l12 7-12 7'],['copy','Copiar ajustes','M8 8h13v13H8z M3 16V3h13'],['paste','Colar ajustes','M8 4h8v4H8z M7 6H4v15h16V6h-3'],['reset','Repor ajustes','M4 9a8 8 0 1 1 0 7M4 3v6h6'],['audio','Extrair WAV','M9 18V5l11-2v13M3 18a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M14 16a3 3 0 1 0 6 0 3 3 0 1 0-6 0']];
 function enhance(){
  const host=document.getElementById('panelBody');if(S.tab!=='clip'||!host||host.querySelector('#quickEdit25')||!selClip())return;
  const box=document.createElement('section');box.id='quickEdit25';box.className='box';box.innerHTML='<h3>Editar clipe</h3><div class="qe25-tools" role="group" aria-label="Edição rápida">'+tools.map(([key,label,path])=>'<button class="btn" type="button" data-qe25="'+key+'" '+((key==='paste'&&!copied)||busy?'disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg><span>'+label+'</span></button>').join('')+'</div><p class="hint">Cortar início/fim usa a posição da agulha. Os cortes não deslocam legendas, textos ou camadas. Copiar/colar transfere o filtro e os ajustes de imagem, não a velocidade ou o som.</p><p class="hint">Extrair WAV descarrega só o áudio deste clipe, com os cortes e a velocidade aplicados, sem silenciar o original. Alterar a velocidade pode mudar o tom. Limite local: clipe 2 min; origem 5 min e 100 MB.</p>';
  host.prepend(box);box.querySelectorAll('[data-qe25]').forEach(b=>b.onclick=()=>run(b.dataset.qe25));
 }
 const previous=renderPanel;renderPanel=function(){const result=previous.apply(this,arguments);enhance();return result;};
 function init(){const style=document.createElement('style');style.textContent='#quickEdit25{max-width:100%;min-width:0}#quickEdit25 .qe25-tools{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;padding:4px 0 10px;max-width:100%}#quickEdit25 .qe25-tools .btn{flex:0 0 82px;min-height:70px;display:flex;flex-direction:column;gap:6px;padding:6px 4px;font-size:11px;white-space:normal;text-align:center}#quickEdit25 svg{width:22px;height:22px;flex:none}';document.head.append(style);enhance();}
 window.FenixQuickEdit={actions,run,wav};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
