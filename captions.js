
'use strict';
let ASRW=null;
const LANG_NAMES={pt:'portuguese',en:'english',es:'spanish',fr:'french',de:'german',it:'italian','':''};
const CLOUD={
  groq:{url:'https://api.groq.com/openai/v1/audio/transcriptions',chat:'https://api.groq.com/openai/v1/chat/completions',chatModel:'llama-3.3-70b-versatile',label:'Groq'},
  openai:{url:'https://api.openai.com/v1/audio/transcriptions',chat:'https://api.openai.com/v1/chat/completions',chatModel:'gpt-4o-mini',label:'OpenAI'}
};
function encodeWav(f32,sr){
  const n=f32.length,buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
  const W=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  W(0,'RIFF');v.setUint32(4,36+n*2,true);W(8,'WAVE');W(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const s=Math.max(-1,Math.min(1,f32[i]));v.setInt16(44+i*2,s<0?s*0x8000:s*0x7fff,true);}
  return buf;
}
async function cloudASR(audio,o,status){
  const P=CLOUD[o.engine];if(!o.key)throw new Error('Cola a chave API da '+P.label+'.');
  const model=o.engine==='openai'?'whisper-1':(o.cloudModel||'whisper-large-v3');
  const sr=16000,CH=600*sr,words=[];
  for(let off=0,i=0;off<audio.length;off+=CH,i++){
    status(`A enviar áudio para ${P.label} (parte ${i+1}/${Math.ceil(audio.length/CH)})…`);
    const wav=encodeWav(audio.subarray(off,off+CH),sr);
    const fd=new FormData();
    fd.append('file',new File([wav],'audio.wav',{type:'audio/wav'}));
    fd.append('model',model);fd.append('response_format','verbose_json');
    fd.append('timestamp_granularities[]','word');fd.append('timestamp_granularities[]','segment');
    fd.append('temperature','0');
    if(o.lang)fd.append('language',o.lang);
    if(o.prompt)fd.append('prompt',o.prompt);
    let r;
    try{r=await fetch(P.url,{method:'POST',headers:{Authorization:'Bearer '+o.key},body:fd});}
    catch(e){throw new Error('Sem ligação ao serviço '+P.label+' (rede ou bloqueio do navegador).');}
    if(!r.ok){const tx=(await r.text()).slice(0,200);throw new Error(r.status===401?'Chave API inválida.':`Erro ${r.status}: ${tx}`);}
    const j=await r.json(),base=off/sr;
    const bad=(j.segments||[]).filter(s=>(s.no_speech_prob>0.6&&s.avg_logprob<-0.7)||s.compression_ratio>2.4);
    const isBad=t=>bad.some(s=>t>=s.start-0.05&&t<=s.end+0.05);
    if(j.words&&j.words.length)j.words.forEach(w=>{const t=String(w.word).trim();if(t&&!isBad(w.start))words.push({w:t,s:w.start+base,e:w.end+base});});
    else if(j.segments)j.segments.filter(s=>!bad.includes(s)).forEach(sg=>{const ws=String(sg.text).trim().split(/\s+/).filter(Boolean);const d=(sg.end-sg.start)/Math.max(1,ws.length);ws.forEach((w,k)=>words.push({w,s:sg.start+base+k*d,e:sg.start+base+(k+1)*d}));});
  }
  return words;
}
function localASR(audio,o,status){
  return new Promise((res,rej)=>{
    if(!ASRW)ASRW=new Worker('asr-worker.js',{type:'module'});
    const w=ASRW;
    w.onmessage=e=>{
      const m=e.data;
      if(m.type==='status')status(m.text);
      else if(m.type==='progress')status(`A descarregar modelo (só na 1ª vez)… ${Math.round(m.progress)}%`);
      else if(m.type==='done')res(m.chunks.map(c=>({w:String(c.text).trim(),s:c.timestamp[0],e:c.timestamp[1]==null?c.timestamp[0]+0.35:c.timestamp[1]})).filter(x=>x.w));
      else if(m.type==='error')rej(new Error(m.message));
    };
    w.onerror=e=>{ASRW=null;rej(new Error('Falha a iniciar o motor local: '+(e.message||'sem detalhe')));};
    const a=new Float32Array(audio);
    w.postMessage({audio:a,model:o.model,lang:LANG_NAMES[o.lang]||''},[a.buffer]);
  });
}
function groupWords(words,o){
  const maxW=o.maxWords||3,maxC=o.maxChars||28,segs=[];let cur=[];
  const push=()=>{
    if(!cur.length)return;
    const text=cur.map(x=>x.w).join(' ');
    segs.push({id:nid(),start:cur[0].s,end:Math.max(cur[cur.length-1].e,cur[0].s+0.35),words:cur,text,wt:text});
    cur=[];
  };
  for(const w of words){
    if(cur.length){
      const gap=w.s-cur[cur.length-1].e,chars=cur.reduce((a,x)=>a+x.w.length+1,0)+w.w.length;
      if(cur.length>=maxW||chars>maxC||gap>0.6)push();
    }
    cur.push(w);
    if(/[.!?…]$/.test(w.w))push();
    else if(/[,;:]$/.test(w.w)&&cur.length>=2)push();
  }
  push();
  for(let i=0;i<segs.length;i++){
    const nx=segs[i+1];
    if(nx){const g=nx.start-segs[i].end;if(g<0)segs[i].end=nx.start;else if(g<0.4)segs[i].end=nx.start;else segs[i].end+=0.12;}
    else segs[i].end+=0.12;
  }
  return segs;
}
async function aiFix(segs,o,status){
  const P=CLOUD[o.engine];let fixed=0;
  for(let i=0;i<segs.length;i+=40){
    status(`A corrigir ortografia com IA… ${Math.min(segs.length,i+40)}/${segs.length}`);
    const part=segs.slice(i,i+40);
    const sys='És revisor de legendas em português europeu. Corrige erros de reconhecimento de fala (palavras mal ouvidas, acentos, nomes próprios) usando o contexto da lista completa. REGRA CRÍTICA: cada legenda tem de manter EXATAMENTE o mesmo número de palavras (separadas por espaços); não juntes, não dividas, não acrescentes nem removas palavras. Mantém a pontuação existente. '+(o.prompt?('Vocabulário esperado: '+o.prompt+'. '):'')+'Responde só com JSON: {"t":["legenda 1","legenda 2",...]} com o mesmo número de itens.';
    try{
      const r=await fetch(P.chat,{method:'POST',headers:{Authorization:'Bearer '+o.key,'Content-Type':'application/json'},body:JSON.stringify({model:P.chatModel,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:sys},{role:'user',content:JSON.stringify(part.map(s=>s.text))}]})});
      if(!r.ok)throw new Error('chat '+r.status);
      const j=await r.json(),arr=JSON.parse(j.choices[0].message.content).t;
      if(!Array.isArray(arr)||arr.length!==part.length)throw new Error('formato');
      part.forEach((s,k)=>{
        const nt=String(arr[k]||'').trim(),nw=nt.split(/\s+/).filter(Boolean),ow=s.words;
        if(nw.length===ow.length&&nt!==s.text){s.words=ow.map((w,m)=>({w:nw[m],s:w.s,e:w.e}));s.text=nw.join(' ');s.wt=s.text;fixed++;}
      });
    }catch(e){logErr('correção IA: '+e.message);}
  }
  return fixed;
}
async function autoCaptions(o,status){
  status('A preparar o áudio…');
  const ab=await mixAudio(16000,1);
  if(!ab)throw new Error('Sem áudio para transcrever (volume a 0 ou formato não suportado).');
  const audio=ab.getChannelData(0);
  const words=o.engine==='local'?await localASR(audio,o,status):await cloudASR(audio,o,status);
  if(!words.length)throw new Error('Não foi detetada fala.');
  const segs=groupWords(words,o);
  if(o.engine!=='local'&&o.fix){const n=await aiFix(segs,o,status);status(`Pronto. ${n} legendas corrigidas pela IA.`);}
  return segs;
}
const pad=(n,l=2)=>String(n).padStart(l,'0');
function srtTime(t){t=Math.max(0,t);const ms=Math.round(t*1000);return `${pad(Math.floor(ms/3600000))}:${pad(Math.floor(ms/60000)%60)}:${pad(Math.floor(ms/1000)%60)},${pad(ms%1000,3)}`;}
function toSRT(){return S.caps.map((s,i)=>`${i+1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join('\n');}
function parseSRT(txt){
  const out=[];const tm=x=>{const m=x.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);return m?(+m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000):0;};
  txt.replace(/\r/g,'').split(/\n\n+/).forEach(b=>{
    const l=b.split('\n').filter(Boolean);const i=l.findIndex(x=>x.includes('-->'));if(i<0)return;
    const[a,c]=l[i].split('-->');const text=l.slice(i+1).join(' ').replace(/<[^>]+>/g,'').trim();
    if(text)out.push({id:nid(),start:tm(a),end:tm(c),text,wt:null});
  });
  return out;
}
