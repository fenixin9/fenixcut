
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
  if(_modelCache[o.engine])return pick.concat(_modelCache[o.engine].filter(m=>m!==pick[0]));
  let ids=[];
  try{const r=await fetch(P.models,{headers:{Authorization:'Bearer '+o.key}});if(r.ok){const j=await r.json();ids=(j.data||[]).map(m=>m.id);}else if(r.status===401)throw new Error('Chave API inválida.');}
  catch(e){if(e.message==='Chave API inválida.')throw e;}
  let list=P.pref.filter(m=>!ids.length||ids.includes(m));
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
  CFG.modelIds=ids;CFG.modelsAt=Date.now();saveCFG();return ids;
}
const sttOptions=()=>{const a=(CFG.modelIds||[]).filter(x=>/whisper|transcribe|stt/i.test(x));return a.length?a:['whisper-large-v3','whisper-large-v3-turbo'];};
const chatOptions=()=>(CFG.modelIds||[]).filter(x=>!NOT_CHAT.test(x));
function normalizeAudio(a){
  let pk=0;for(let i=0;i<a.length;i+=8){const v=Math.abs(a[i]);if(v>pk)pk=v;}
  if(pk<0.02||pk>0.7)return a;
  const g=Math.min(0.9/pk,10),o=new Float32Array(a.length);
  for(let i=0;i<a.length;i++)o[i]=Math.max(-1,Math.min(1,a[i]*g));
  return o;
}
function whisperPrompt(o){
  /* sem frase-modelo: o Whisper pode repeti-la/perder o início. Só vocabulário. */
  return o.prompt?('Vocabulário: '+o.prompt+'.').slice(0,500):'';
}
async function cloudASR(audio,o,status){
  const P=CLOUD[o.engine];if(!o.key)throw new Error('Cola a chave API da '+P.label+'.');
  const model=o.engine==='openai'?'whisper-1':(o.cloudModel||'whisper-large-v3');
  status('Modelo: '+model+' · a enviar áudio…');
  const sr=16000,CH=600*sr,words=[],prompt=whisperPrompt(o);
  for(let off=0,i=0;off<audio.length;off+=CH,i++){
    status(`A enviar áudio para ${P.label} (parte ${i+1}/${Math.ceil(audio.length/CH)})…`);
    const wav=encodeWav(audio.subarray(off,off+CH),sr);
    const fd=new FormData();
    fd.append('file',new File([wav],'audio.wav',{type:'audio/wav'}));
    fd.append('model',model);fd.append('response_format','verbose_json');
    fd.append('timestamp_granularities[]','word');fd.append('timestamp_granularities[]','segment');
    fd.append('temperature','0');
    if(o.lang)fd.append('language',o.lang);
    if(prompt)fd.append('prompt',prompt);
    let r;
    try{r=await fetch(P.url,{method:'POST',headers:{Authorization:'Bearer '+o.key},body:fd});}
    catch(e){throw new Error('Sem ligação ao serviço '+P.label+' (rede ou bloqueio do navegador).');}
    if(!r.ok){const tx=(await r.text()).slice(0,200);throw new Error(r.status===401?'Chave API inválida.':r.status===429?'Limite do Groq atingido (aguarda um pouco).':`Erro ${r.status}: ${tx}`);}
    const j=await r.json(),base=off/sr;
    const bad=(j.segments||[]).filter(s=>(s.no_speech_prob>0.9&&s.avg_logprob<-1.3)||s.compression_ratio>3.5);
    const isBad=t=>bad.some(s=>t>=s.start-0.05&&t<=s.end+0.05);
    const cw=[];
    if(j.words&&j.words.length)j.words.forEach(w=>{const t=String(w.word).trim();if(t&&!isBad(w.start))cw.push({w:t,s:w.start+base,e:w.end+base});});
    /* cobertura: segmentos sem palavras (ex.: início do vídeo) entram a partir do texto do segmento */
    (j.segments||[]).filter(s=>!bad.includes(s)).forEach(sg=>{
      const a=sg.start+base,b2=sg.end+base;
      if(cw.some(w=>w.s>=a-0.1&&w.s<b2-0.05))return;
      const ws=String(sg.text).trim().split(/\s+/).filter(Boolean);if(!ws.length)return;
      const d=(b2-a)/ws.length;ws.forEach((w,k)=>cw.push({w,s:a+k*d,e:a+(k+1)*d}));
    });
    cw.sort((p,q)=>p.s-q.s);words.push(...cw);
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
