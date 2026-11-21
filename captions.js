
'use strict';
let ASRW=null;
const LANG_NAMES={pt:'portuguese',en:'english',es:'spanish',fr:'french',de:'german',it:'italian','':''};
const CLOUD={
  groq:{url:'https://api.groq.com/openai/v1/audio/transcriptions',chat:'https://api.groq.com/openai/v1/chat/completions',models:'https://api.groq.com/openai/v1/models',label:'Groq',pref:['openai/gpt-oss-120b','llama-3.3-70b-versatile','openai/gpt-oss-20b','qwen/qwen3-32b','llama-3.1-8b-instant']},
  openai:{url:'https://api.openai.com/v1/audio/transcriptions',chat:'https://api.openai.com/v1/chat/completions',models:'https://api.openai.com/v1/models',label:'OpenAI',pref:['gpt-4o-mini','gpt-4.1-mini','gpt-4o']}
};
function encodeWav(f32,sr){
  const n=f32.length,buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
  const W=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  W(0,'RIFF');v.setUint32(4,36+n*2,true);W(8,'WAVE');W(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const s=Math.max(-1,Math.min(1,f32[i]));v.setInt16(44+i*2,s<0?s*0x8000:s*0x7fff,true);}
  return buf;
}
const _modelCache={};
async function chatModels(o){
  const P=CLOUD[o.engine];
  const pick=(typeof CFG!=='undefined'&&CFG.chat&&CFG.chat!=='auto')?[CFG.chat]:[];
  if(pick.length)return pick;
  if(_modelCache[o.engine])return _modelCache[o.engine];
  let ids=[];
  try{const r=await fetch(P.models,{headers:{Authorization:'Bearer '+o.key}});if(r.ok){const j=await r.json();ids=(j.data||[]).map(m=>m.id);}else if(r.status===401)throw new Error('Chave API inválida.');}
  catch(e){if(e.message==='Chave API inválida.')throw e;}
  let list=P.pref.filter(m=>!ids.length||ids.includes(m));
  const others=ids.filter(m=>!NOT_CHAT.test(m)&&!list.includes(m));list=list.concat(others);
  if(!list.length)list=P.pref;
  _modelCache[o.engine]=list;return pick.concat(list.filter(m=>m!==pick[0]));
}
async function chatJSON(o,system,user){
  const P=CLOUD[o.engine],models=await chatModels(o);let lastErr=null;
  for(const m of models){
    for(const rf of[true,false]){
      try{
        const body={model:m,temperature:0,messages:[{role:'system',content:system},{role:'user',content:user}]};
        if(rf)body.response_format={type:'json_object'};
        const r=await fetch(P.chat,{method:'POST',headers:{Authorization:'Bearer '+o.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(!r.ok){
          const tx=(await r.text()).slice(0,160);lastErr=new Error(`${m}: ${r.status} ${tx}`);
          if(r.status===401)throw new Error('Chave API inválida.');
          if(r.status===429)throw new Error('Limite de pedidos atingido. Espera um minuto e tenta de novo.');
          if(r.status===400&&rf)continue;
          break;
        }
        const j=await r.json(),txt=(j.choices&&j.choices[0]&&j.choices[0].message.content)||'';
        const mt=txt.match(/\{[\s\S]*\}/);return JSON.parse(mt?mt[0]:txt);
      }catch(e){lastErr=e;if(/inválida|Limite/.test(e.message))throw e;}
    }
  }
  throw lastErr||new Error('IA indisponível');
}
const NOT_CHAT=/whisper|tts|orpheus|guard|safeguard|embed|moderation|transcribe|distil/i;
async function listModels(o){
  const P=CLOUD[o.engine];if(!o.key)throw new Error('Cola a chave API primeiro.');
  const r=await fetch(P.models,{headers:{Authorization:'Bearer '+o.key}});
  if(!r.ok)throw new Error(r.status===401?'Chave API inválida.':'Erro '+r.status);
  const j=await r.json(),ids=(j.data||[]).map(m=>m.id).sort();
  CFG.modelIds=ids;CFG.modelsEngine=o.engine;CFG.modelsAt=Date.now();delete _modelCache[o.engine];saveCFG();return ids;
}
const sttOptions=()=>CFG.engine==='openai'?['whisper-1']:['whisper-large-v3','whisper-large-v3-turbo'];
const chatOptions=()=>{
 const engine=CFG.engine==='openai'?'openai':'groq';
 const ids=CFG.modelsEngine&&CFG.modelsEngine!==engine?[]:(CFG.modelIds||[]);
 return [...new Set([...(CLOUD[engine].pref),...ids.filter(x=>!NOT_CHAT.test(x))])];
};
function normalizeAudio(a){
 let pk=0;for(const v of a)pk=Math.max(pk,Math.abs(v));
 if(pk<.003||pk>.8)return new Float32Array(a);
 const g=Math.min(.85/pk,3),r=new Float32Array(a.length);for(let i=0;i<a.length;i++)r[i]=a[i]*g;return r;
}
function whisperPrompt(o){
  /* sem frase-modelo: o Whisper pode repeti-la/perder o início. Só vocabulário. */
  return o.prompt?('Vocabulário: '+o.prompt+'.').slice(0,500):'';
}
async function cloudASR(audio,o,status){
 const P=CLOUD[o.engine];if(!P||!o.key)throw new Error('Falta a chave do serviço de transcrição.');
 const model=o.engine==='openai'?'whisper-1':(o.cloudModel||'whisper-large-v3');
 if(o.engine==='groq'&&!['whisper-large-v3','whisper-large-v3-turbo'].includes(model))throw new Error('Esse modelo não é um transcritor de áudio Groq. Escolhe um dos Whisper; os restantes modelos são para revisão.');
 const sr=16000,hop=28,windowS=30,prefix=.6,duration=audio.length/sr;
 async function request(start,end){
   const pcm=new Float32Array(Math.round(prefix*sr)+(end-start)+Math.round(.2*sr));pcm.set(audio.subarray(start,end),Math.round(prefix*sr));
   const fd=new FormData();fd.append('file',new File([encodeWav(pcm,sr)],'audio.wav',{type:'audio/wav'}));fd.append('model',model);fd.append('response_format','verbose_json');
   fd.append('timestamp_granularities[]','word');fd.append('timestamp_granularities[]','segment');fd.append('temperature','0');
   if(o.lang)fd.append('language',o.lang);if(whisperPrompt(o))fd.append('prompt',whisperPrompt(o));
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),120000);let response;
   try{response=await fetch(P.url,{method:'POST',headers:{Authorization:'Bearer '+o.key},body:fd,signal:ctrl.signal});}
   catch(err){throw new Error(err.name==='AbortError'?'A transcrição excedeu 2 minutos.':'Falha de rede na transcrição.');}finally{clearTimeout(timer);}
   if(!response.ok)throw new Error('Transcrição '+response.status+': '+(await response.text()).slice(0,160));
   const j=await response.json(),base=start/sr-prefix,words=[];
   for(const w of j.words||[]){const text=String(w.word||'').trim(),s=Number(w.start)+base,e=Number(w.end)+base;
     if(text&&Number.isFinite(s)&&Number.isFinite(e)&&e>0&&s<duration)words.push({w:text,s:Math.max(0,s),e:Math.min(duration,Math.max(s+.01,e))});}
   for(const seg of j.segments||[]){
     const s=Math.max(0,seg.start+base),e=Math.min(duration,seg.end+base);
     if(e<=s||words.some(w=>w.s<e&&w.e>s))continue;
     if(seg.no_speech_prob>.98&&seg.avg_logprob<-2)continue;
     const ws=String(seg.text||'').trim().split(/\s+/).filter(Boolean);
     ws.forEach((w,k)=>words.push({w,s:s+(e-s)*k/ws.length,e:s+(e-s)*(k+1)/ws.length,approx:true}));
   }
   return words.sort((a,b)=>a.s-b.s);
 }
 const all=[];
 for(let off=0,n=0;off<audio.length;off+=hop*sr,n++){
   const begin=off/sr,start=Math.max(0,off-sr),end=Math.min(audio.length,off+(hop+1)*sr),last=end===audio.length;
   status(`A transcrever desde ${begin.toFixed(1)} s — janela ${n+1}/${Math.ceil(duration/hop)} (${model})`);
   const ws=await request(start,end),ownEnd=last?duration:begin+hop;
   all.push(...ws.filter(w=>{const mid=(w.s+w.e)/2;return mid>=begin&&mid<ownEnd;}));
   if(last)break;
 }
 all.sort((a,b)=>a.s-b.s);
 // Retry the opening with a short independent context when recognition starts late.
 if(!all.length||all[0].s>.35||duration>8){
   status('A verificar novamente o início do áudio…');
   const early=await request(0,Math.min(audio.length,8*sr));
   const first=all.length?all[0].s:duration,cut=Math.max(0,first-.08);
   const extra=early.filter(w=>w.e<=cut);
   all.unshift(...extra);all.sort((a,b)=>a.s-b.s);
 }
 return all;
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
/* alinha as palavras corrigidas com os tempos originais (permite juntar/separar/acrescentar palavras) */
function alignTimes(old,nw,s0,s1){
  const n=old.length,m=nw.length,norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const D=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=0;i<=n;i++)D[i][0]=i;for(let j=0;j<=m;j++)D[0][j]=j;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
    const c=norm(old[i-1].w)===norm(nw[j-1])?0:1;
    D[i][j]=Math.min(D[i-1][j]+1,D[i][j-1]+1,D[i-1][j-1]+c);
  }
  const map=new Array(m).fill(-1);let i=n,j=m;
  while(i>0&&j>0){
    const c=norm(old[i-1].w)===norm(nw[j-1])?0:1;
    if(D[i][j]===D[i-1][j-1]+c){map[j-1]=i-1;i--;j--;}
    else if(D[i][j]===D[i-1][j]+1)i--;else j--;
  }
  const res=nw.map((w,k)=>map[k]>=0?{w,s:old[map[k]].s,e:old[map[k]].e,k:1}:{w,s:null,e:null,k:0});
  for(let k=0;k<m;){
    if(res[k].k){k++;continue;}
    let q=k;while(q<m&&!res[q].k)q++;
    const a=k>0?res[k-1].e:s0,b=q<m?res[q].s:s1,cnt=q-k,st=Math.max(0,(b-a))/cnt;
    for(let z=0;z<cnt;z++){res[k+z].s=a+st*z;res[k+z].e=a+st*(z+1);}
    k=q;
  }
  return res.map(x=>({w:x.w,s:x.s,e:Math.max(x.e,x.s+0.05)}));
}
const VARIANT={
  pt:'português europeu (Portugal), ortografia do Acordo Ortográfico de 1990 e vocabulário de Portugal (ex.: "autocarro", "telemóvel", "estou" em vez de "tô", "a gente"→"agente" só quando for o substantivo)',
  br:'português do Brasil',
  keep:'a variante do português que foi falada, sem a alterar'
};
async function aiFix(segs,o,status){
  let fixed=0;const vt=VARIANT[o.variant||'pt'];
  const sys='És revisor profissional de legendas em português. Recebes legendas transcritas automaticamente (podem ter erros). Corrige: palavras mal reconhecidas (usa o contexto das legendas vizinhas), acentuação, concordância, maiúsculas em nomes próprios e pontuação mínima. NÃO resumas, NÃO reescrevas o sentido e NÃO formalizes o estilo falado. Só juntas, separas, acrescentas ou removes palavras quando for realmente necessário para corrigir um erro. Variante: '+vt+'. '+(o.prompt?('Vocabulário/nomes esperados: '+o.prompt+'. '):'')+'Responde só com JSON: {"t":["legenda 1","legenda 2",...]} com EXATAMENTE o mesmo número de itens que recebeste em "legendas".';
  for(let i=0;i<segs.length;i+=30){
    status(`A corrigir ortografia com IA… ${Math.min(segs.length,i+30)}/${segs.length}`);
    const part=segs.slice(i,i+30),prev=segs.slice(Math.max(0,i-2),i).map(s=>s.text);
    try{
      const j=await chatJSON(o,sys,JSON.stringify({anteriores:prev,legendas:part.map(s=>s.text)}));
      const arr=j.t;
      if(!Array.isArray(arr)||arr.length!==part.length)throw new Error('formato inesperado');
      part.forEach((s,k)=>{
        const nt=String(arr[k]==null?'':arr[k]).trim();if(!nt||nt===s.text)return;
        const nw=nt.split(/\s+/).filter(Boolean);if(!nw.length||nw.length>s.words.length*2+2)return;
        s.words=alignTimes(s.words,nw,s.start,s.end);s.text=nw.join(' ');s.wt=s.text;fixed++;
      });
    }catch(e){logErr('correção IA: '+e.message);if(/inválida|Limite/.test(e.message))throw e;}
  }
  return fixed;
}
async function autoCaptions(o,status){
  status('A preparar o áudio…');
  const ab=await mixAudio(16000,1);
  if(!ab)throw new Error('Sem áudio para transcrever (volume a 0 ou formato não suportado).');
  const audio=normalizeAudio(ab.getChannelData(0));
  const words=o.engine==='local'?await localASR(audio,o,status):await cloudASR(audio,o,status);
  if(!words.length)throw new Error('Não foi detetada fala.');
  const segs=groupWords(words,o);
  status(`Primeira palavra aos ${words[0].s.toFixed(2)} s · ${words.length} palavras.`);
  if(words.some(w=>w.approx))status('Alguns tempos foram estimados por segmento; revê a sincronização.');
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
