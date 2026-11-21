
'use strict';
/* ---------- edição por IA (prompt) ---------- */
const AI_EXAMPLES=['Remove os silêncios','Corta os primeiros 3 segundos','Acelera o vídeo para 1.2x e aplica o filtro cinema','Legendas estilo jornal, fundos amarelo e branco','Põe o texto "Promoção só hoje" a amarelo no início','Aplica fade em todos os clipes','Passa tudo para formato horizontal'];
function aiCfg(){const engine=CFG.engine==='openai'?'openai':'groq';return{engine,key:(CFG['key_'+engine]||'').trim()};}
function splitAtTime(t){
  const c=clipAt(t);if(!c)return false;
  const st=srcTimeAt(c,t);if(st<=c.in+0.02||st>=c.out-0.02)return false;
  const n=JSON.parse(JSON.stringify(c));n.id=nid();n.in=st;n.trans={type:'none',dur:0.5};n.kb=0;c.out=st;
  S.clips.splice(S.clips.indexOf(c)+1,0,n);layout();return true;
}
function rippleDelete(a,b){
  a=Math.max(0,a);b=Math.min(S.total,b);if(b-a<0.05)return false;
  splitAtTime(a);splitAtTime(b);
  S.clips=S.clips.filter(c=>!(c.tStart>=a-1e-3&&c.tStart+c.dur<=b+1e-3));
  const d=b-a;
  const shift=arr=>{const out=[];for(const x of arr){
    const isC=x.end!==undefined;const s=x.start,e=isC?x.end:x.start+x.dur;
    if(e<=a+1e-3){out.push(x);continue;}
    if(s>=a-1e-3&&e<=b+1e-3)continue;
    let ns=s,ne=e,pure=false;
    if(s>=b-1e-3){ns=s-d;ne=e-d;pure=true;}
    else if(s<a&&e>b){ne=e-d;}
    else if(s<a){ne=a;}
    else{ns=a;ne=e-d;}
    x.start=ns;
    if(isC){x.end=Math.max(ne,ns+0.1);if(x.words){if(pure)x.words=x.words.map(w=>({w:w.w,s:w.s-d,e:w.e-d}));else{x.words=null;x.wt=null;}}}
    else x.dur=Math.max(0.2,ne-ns);
    out.push(x);}return out;};
  S.caps=shift(S.caps);S.texts=shift(S.texts);
  layout();return true;
}
async function removeSilence(minS,thrDb,keep){
  const ab=await mixAudio(16000,1);if(!ab)throw new Error('sem áudio');
  const d=ab.getChannelData(0),sr=16000,win=320,n=Math.floor(d.length/win),thr=Math.pow(10,thrDb/20);
  const ranges=[];let st=null;
  for(let i=0;i<n;i++){
    let s=0;for(let k=0;k<win;k++){const v=d[i*win+k];s+=v*v;}
    const rms=Math.sqrt(s/win);
    if(rms<thr){if(st==null)st=i*win/sr;}
    else if(st!=null){const en=i*win/sr;if(en-st>=minS)ranges.push([st+keep,en-keep]);st=null;}
  }
  if(st!=null){const en=n*win/sr;if(en-st>=minS)ranges.push([st+keep,en]);}
  const r=ranges.filter(x=>x[1]-x[0]>0.1);
  for(let i=r.length-1;i>=0;i--)rippleDelete(r[i][0],r[i][1]);
  return r.length;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,+v));
const hexOk=h=>typeof h==='string'&&/^#[0-9a-f]{6}$/i.test(h);
function targets(idx){
  if(idx==='all'||idx==='todos'||idx==null)return S.clips.slice();
  const arr=Array.isArray(idx)?idx:[idx];
  const out=arr.map(i=>S.clips[(+i)-1]).filter(Boolean);
  if(!out.length)throw new Error('clipe inexistente');return out;
}
async function applyOp(op){
  const k=op.op;
  if(k==='clip'){
    const cs=targets(op.index);
    cs.forEach(c=>{
      const src=SRC[c.src];
      if(op.speed!=null)c.speed=clamp(op.speed,0.25,4);
      if(op.volume!=null)c.vol=clamp(op.volume,0,1);
      if(op.kb!=null)c.kb=clamp(op.kb,0,0.4);
      if(op.in!=null)c.in=clamp(op.in,0,c.out-0.1);
      if(op.out!=null)c.out=clamp(op.out,c.in+0.1,src.dur);
      if(op.fx&&PRESETS[op.fx]){Object.assign(c.fx,FX_DEFAULT,PRESETS[op.fx].v,{preset:op.fx});}
      if(op.fx_params&&typeof op.fx_params==='object'){for(const[r,l,mn,mx]of FX_RANGES)if(op.fx_params[r]!=null)c.fx[r]=clamp(op.fx_params[r],mn,mx);c.fx.preset='custom';}
      if(op.trans&&TRANS[op.trans]){c.trans.type=op.trans;if(op.trans_dur!=null)c.trans.dur=clamp(op.trans_dur,0.2,2);}
    });
    layout();return`${cs.length} clipe(s) ajustado(s)`;
  }
  if(k==='split'){layout();if(!splitAtTime(+op.time))throw new Error('tempo inválido');return`dividido aos ${(+op.time).toFixed(1)}s`;}
  if(k==='delete_clip'){const cs=targets(op.index);S.clips=S.clips.filter(c=>!cs.includes(c));layout();return`${cs.length} clipe(s) apagado(s)`;}
  if(k==='move_clip'){const c=targets(op.index)[0],to=clamp(op.to,1,S.clips.length)-1;S.clips.splice(S.clips.indexOf(c),1);S.clips.splice(to,0,c);layout();return'clipe movido';}
  if(k==='cut'){layout();if(!rippleDelete(+op.start,+op.end))throw new Error('intervalo inválido');return`cortado ${(+op.start).toFixed(1)}s–${(+op.end).toFixed(1)}s`;}
  if(k==='remove_silence'){const n=await removeSilence(clamp(op.min_silence||0.5,0.2,5),clamp(op.threshold_db||-35,-60,-15),0.1);return`${n} silêncio(s) removido(s)`;}
  if(k==='add_text'){
    const st=TEXT_STYLES[op.style]||{},x=Object.assign({id:nid(),text:String(op.text||'Texto'),start:clamp(op.start==null?S.t:op.start,0,9999),dur:clamp(op.duration||3,0.3,60),size:clamp(op.size||80,20,200),color:hexOk(op.color)?op.color:'#ffffff',y:clamp(op.y==null?50:op.y,5,95),bg:!!op.bg,stroke:op.stroke!==false,bold:true,font:FONTS.includes(op.font)?op.font:'Montserrat',anim:['none','pop','fade','slide','type'].includes(op.anim)?op.anim:'pop',glow:'',cut:false},st);
    if(op.style&&TEXT_STYLES[op.style]){if(hexOk(op.color))x.color=op.color;if(FONTS.includes(op.font))x.font=op.font;}
    delete x.n;S.texts.push(x);return`texto "${x.text}" adicionado`;
  }
  if(k==='edit_text'){const x=S.texts[(+op.index)-1];if(!x)throw new Error('texto inexistente');
    if(op.text!=null)x.text=String(op.text);if(op.start!=null)x.start=clamp(op.start,0,9999);if(op.duration!=null)x.dur=clamp(op.duration,0.3,60);
    if(hexOk(op.color))x.color=op.color;if(op.size!=null)x.size=clamp(op.size,20,200);if(op.y!=null)x.y=clamp(op.y,5,95);
    if(FONTS.includes(op.font))x.font=op.font;if(['none','pop','fade','slide','type'].includes(op.anim))x.anim=op.anim;
    if(TEXT_STYLES[op.style]){const s=Object.assign({},TEXT_STYLES[op.style]);delete s.n;if(hexOk(op.color))s.color=op.color;Object.assign(x,s);}
    return'texto editado';}
  if(k==='delete_text'){const x=S.texts[(+op.index)-1];if(!x)throw new Error('texto inexistente');S.texts=S.texts.filter(y=>y!==x);return'texto apagado';}
  if(k==='caption_style'){
    const cs=S.capStyle;
    if(CAP_PRESETS[op.preset])cs.preset=op.preset;
    if(hexOk(op.hi))cs.hi=op.hi;if(hexOk(op.color))cs.color=op.color;
    if(op.size!=null)cs.size=clamp(op.size,30,140);if(op.y!=null)cs.y=clamp(op.y,5,95);
    if(op.font&&(op.font==='auto'||FONTS.includes(op.font)))cs.font=op.font;
    if(op.upper!=null)cs.upper=!!op.upper;if(op.offset!=null)cs.offset=clamp(op.offset,-1,1);
    if(Array.isArray(op.bg_colors)){const a=op.bg_colors.filter(hexOk);if(a.length){const base=a.slice();while(a.length<5)a.push(base[a.length%base.length]);cs.bgColors=a.slice(0,5);}}
    if(op.bg_mode==='single'||op.bg_mode==='multi')cs.bgMode=op.bg_mode;
    return'estilo das legendas alterado';
  }
  if(k==='caption_replace'){
    const f=String(op.find||'');if(!f)throw new Error('texto a procurar vazio');let n=0;const re=new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    S.caps.forEach(s=>{if(re.test(s.text)){re.lastIndex=0;const ws=segWords(s).map(w=>({w:w.w,s:w.s,e:w.e}));s.text=s.text.replace(re,String(op.replace||''));const nw=s.text.split(/\s+/).filter(Boolean);s.words=alignTimes(ws,nw,s.start,s.end);s.wt=s.text;n++;}re.lastIndex=0;});
    return`${n} legenda(s) corrigida(s)`;
  }
  if(k==='caption_edit'){const s=S.caps[(+op.index)-1];if(!s)throw new Error('legenda inexistente');
    if(op.text!=null){const ws=segWords(s).map(w=>({w:w.w,s:w.s,e:w.e}));s.text=String(op.text);s.words=alignTimes(ws,s.text.split(/\s+/).filter(Boolean),s.start,s.end);s.wt=s.text;}
    if(op.start!=null)s.start=Math.max(0,+op.start);if(op.end!=null)s.end=Math.max(s.start+0.1,+op.end);return'legenda editada';}
  if(k==='caption_delete'){const s=S.caps[(+op.index)-1];if(!s)throw new Error('legenda inexistente');S.caps=S.caps.filter(x=>x!==s);return'legenda apagada';}
  if(k==='ratio'){if(!['9:16','16:9','1:1','4:5'].includes(op.value))throw new Error('formato inválido');S.ratio=op.value.split(':').map(Number);$('ratio').value=op.value;initRenderer();return'formato '+op.value;}
  if(k==='fit'){if(op.value==='cover'||op.value==='contain'){S.fit=op.value;return'enquadramento '+op.value;}throw new Error('valor inválido');}
  if(k==='generate_captions')return'caps';
  throw new Error('operação desconhecida: '+k);
}
function projectContext(){
  return{duracao_s:+S.total.toFixed(2),formato:S.ratio.join(':'),enquadramento:S.fit,
    clipes:S.clips.map((c,i)=>({i:i+1,nome:c.name,inicio_timeline:+c.tStart.toFixed(2),duracao:+c.dur.toFixed(2),velocidade:c.speed,volume:c.vol,efeito:c.fx.preset,transicao:c.trans.type})),
    textos:S.texts.map((x,i)=>({i:i+1,texto:x.text,inicio:+x.start.toFixed(2),duracao:+x.dur.toFixed(2)})),
    legendas:S.caps.slice(0,150).map((s,i)=>({i:i+1,ini:+s.start.toFixed(2),fim:+s.end.toFixed(2),texto:s.text})),
    legendas_total:S.caps.length,estilo_legendas:{preset:S.capStyle.preset,hi:S.capStyle.hi,cor:S.capStyle.color,tamanho:S.capStyle.size,y:S.capStyle.y,fonte:S.capStyle.font,fundos:S.capStyle.bgColors,modo_fundos:S.capStyle.bgMode}};
}
function aiSystem(){
  return `És o assistente de edição de vídeo da app FenixCut. O utilizador escreve um pedido em português; respondes SÓ com JSON: {"say":"resposta curta em português","ops":[...]}.
Cada op é um objeto com "op" e argumentos. Tempos em segundos da timeline. Índices de clipes/textos/legendas começam em 1 (usa "all" para todos os clipes).
Operações disponíveis:
- {"op":"clip","index":1|"all","speed":0.25-4,"volume":0-1,"in":seg_da_fonte,"out":seg_da_fonte,"fx":"<efeito>","fx_params":{"bright":-0.5..0.5,"contrast":0.5..1.8,"sat":0..2.5,"temp":-1..1,"vig":0..1,"grain":0..0.4,"blur":0..8,"bw":0..1,"sepia":0..1},"trans":"<transicao>","trans_dur":0.2-2,"kb":0-0.4}
- {"op":"split","time":s} | {"op":"delete_clip","index":n} | {"op":"move_clip","index":n,"to":m}
- {"op":"cut","start":s,"end":s}  (apaga esse intervalo da timeline e junta o resto)
- {"op":"remove_silence","min_silence":0.5,"threshold_db":-35}
- {"op":"add_text","text":"...","start":s,"duration":s,"y":5-95,"size":20-200,"color":"#rrggbb","anim":"none|pop|fade|slide|type","font":"<fonte>","style":"<estilo_texto>","bg":false}
- {"op":"edit_text","index":n,"text":"...","color":"#rrggbb","style":"<estilo_texto>",...} | {"op":"delete_text","index":n}
- {"op":"caption_style","preset":"<estilo_legenda>","hi":"#rrggbb","color":"#rrggbb","size":30-140,"y":5-95,"font":"<fonte>|auto","upper":true|false,"offset":-1..1,"bg_colors":["#rrggbb",...até 5],"bg_mode":"multi|single"}
- {"op":"caption_replace","find":"texto","replace":"texto"} | {"op":"caption_edit","index":n,"text":"..."} | {"op":"caption_delete","index":n}
- {"op":"ratio","value":"9:16|16:9|1:1|4:5"} | {"op":"fit","value":"cover|contain"}
- {"op":"generate_captions"}  (gera legendas automáticas depois das outras operações)
Efeitos: ${Object.keys(PRESETS).join(', ')}.
Transições: ${Object.keys(TRANS).join(', ')}.
Estilos de legenda: ${Object.entries(CAP_PRESETS).map(([k,p])=>k+' ('+p.n+')').join(', ')}. "jornal/recortes" = news (acumula palavras) ou news1 (uma palavra).
Estilos de texto: ${Object.keys(TEXT_STYLES).join(', ')}.
Fontes: ${FONTS.join(', ')}.
Regras: faz exatamente o pedido, sem inventar extras. Para cortar partes faladas usa as legendas (ini/fim) para achar os tempos. Se o pedido for impossível ou ambíguo, devolve ops vazio e explica em "say". Cores sempre em hexadecimal.`;
}
async function runAIEdit(prompt,status){
  const o=aiCfg();if(!o.key)throw new Error('Cola a chave API (Groq) no separador Legendas.');
  if(!S.clips.length)throw new Error('Importa um vídeo primeiro.');
  status('A pensar…');
  const j=await chatJSON(o,aiSystem(),JSON.stringify({pedido:prompt,projeto:projectContext()}));
  const ops=Array.isArray(j.ops)?j.ops:[];const log=[];let wantCaps=false;
  for(const op of ops){
    try{const r=await applyOp(op);if(r==='caps')wantCaps=true;else log.push('✓ '+r);}
    catch(e){log.push('✗ '+(op&&op.op)+': '+e.message);}
  }
  layout();commit();refreshAll(true);
  return{say:j.say||'',log,wantCaps};
}
