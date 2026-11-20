
'use strict';
let ASR=null,ASRkey='';
function groupWords(words,maxWords){
  const segs=[];let cur=null;
  const push=()=>{if(cur&&cur.words.length){cur.start=cur.words[0].s;cur.end=cur.words[cur.words.length-1].e;cur.text=cur.words.map(x=>x.w).join(' ');cur.wt=cur.text;segs.push(cur);}cur=null;};
  for(const w of words){
    if(cur){
      const gap=w.s-cur.words[cur.words.length-1].e,dur=w.e-cur.words[0].s;
      if(cur.words.length>=maxWords||gap>0.7||dur>3.2)push();
    }
    if(!cur)cur={id:nid(),words:[]};
    cur.words.push(w);
    if(/[.!?]$/.test(w.w)&&cur.words.length>=2)push();
  }
  push();
  for(let i=0;i<segs.length-1;i++){const g=segs[i+1].start-segs[i].end;if(g>0&&g<0.35)segs[i].end=segs[i+1].start;}
  return segs;
}
async function autoCaptions(opts,status){
  status('A misturar áudio…');
  const ab=await mixAudio(16000,1);
  if(!ab)throw new Error('Sem áudio para transcrever (volume a 0 ou formato não suportado).');
  const audio=ab.getChannelData(0);
  status('A carregar o motor de transcrição…');
  const T=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3');
  if(!ASR||ASRkey!==opts.model){
    ASR=await T.pipeline('automatic-speech-recognition',opts.model,{device:'wasm',progress_callback:p=>{
      if(p.status==='progress')status(`A descarregar modelo (só na 1ª vez)… ${Math.round(p.progress||0)}%`);
    }});
    ASRkey=opts.model;
  }
  status('A transcrever… (pode demorar alguns minutos)');
  const o={task:'transcribe',return_timestamps:'word',chunk_length_s:30,stride_length_s:5};
  if(opts.lang)o.language=opts.lang;
  const res=await ASR(audio,o);
  const words=(res.chunks||[]).map(c=>({w:String(c.text).trim(),s:c.timestamp[0],e:c.timestamp[1]==null?c.timestamp[0]+0.35:c.timestamp[1]})).filter(x=>x.w);
  if(!words.length)throw new Error('Não foi detetada fala.');
  return groupWords(words,opts.maxWords);
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
