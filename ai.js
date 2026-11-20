
'use strict';
/* ---------- utilitários de timeline ---------- */
function splitAtTime(t){
  const c=clipAt(t);if(!c)return false;
  const st=srcTimeAt(c,t);if(st<c.in+0.03||st>c.out-0.03)return false;
  const n=JSON.parse(JSON.stringify(c));n.id=nid();n.in=st;n.trans={type:'none',dur:0.5};n.kb=0;c.out=st;
  S.clips.splice(S.clips.indexOf(c)+1,0,n);layout();return true;
}
function rippleCut(a,b){
  a=Math.max(0,a);b=Math.min(S.total,b);if(b-a<0.05)return 0;
  splitAtTime(a);splitAtTime(b);
  const eps=0.02;
  S.clips=S.clips.filter(c=>!(c.tStart>=a-eps&&c.tStart+c.dur<=b+eps));
  layout();
  const d=b-a;
  const fix=arr=>{
    const out=[];
    for(const x of arr){
      const s=x.start,e=x.end!=null?x.end:x.start+x.dur;
      if(e<=a){out.push(x);continue;}
      if(s>=b){x.start-=d;if(x.end!=null)x.end-=d;if(x.words)x.words=x.words.map(w=>({w:w.w,s:w.s-d,e:w.e-d}));out.push(x);continue;}
      if(s>=a&&e<=b)continue;
      const ns=s<a?s:a,ne=e>b?e-d:a;
      if(ne-ns<0.15)continue;
      x.start=ns;if(x.end!=null)x.end=ne;else x.dur=ne-ns;
      if(x.words){x.words=null;x.wt=null;}
      out.push(x);
    }
    return out;
  };
  S.caps=fix(S.caps);S.texts=fix(S.texts);
  return d;
}
async function findSilences(minSil,thrDb){
  const ranges=[];
  for(const c of S.clips){
    const buf=await getAB(c.src);if(!buf)continue;
    const sr=buf.sampleRate,ch=buf.getChannelData(0),win=Math.round(sr*0.02);
    const thr=Math.pow(10,thrDb/20);
    let runStart=null;
    const i0=Math.floor(c.in*sr),i1=Math.min(ch.length,Math.floor(c.out*sr));
    for(let i=i0;i+win<=i1;i+=win){
      let s=0;for(let k=0;k<win;k+=4)s+=ch[i+k]*ch[i+k];
      const rms=Math.sqrt(s/(win/4));
      const tSrc=i/sr;
      if(rms<thr){if(runStart==null)runStart=tSrc;}
      else if(runStart!=null){
        if(tSrc-runStart>=minSil)ranges.push([c.tStart+(runStart-c.in)/c.speed,c.tStart+(tSrc-c.in)/c.speed]);
        runStart=null;
      }
    }
    if(runStart!=null&&c.out-runStart>=minSil)ranges.push([c.tStart+(runStart-c.in)/c.speed,c.tStart+c.dur]);
  }
  return ranges;
}
/* ---------- contexto e prompt ---------- */
function aiContext(){
  const c={duracao_total:+S.total.toFixed(2),formato:S.ratio.join(':'),
    clipes:S.clips.map((x,i)=>({n:i+1,nome:x.name,inicio:+x.tStart.toFixed(2),dur:+x.dur.toFixed(2),velocidade:x.speed,efeito:x.fx.preset,transicao:x.trans.type})),
    textos:S.texts.map((x,i)=>({n:i+1,texto:x.text,inicio:+x.start.toFixed(2),dur:+x.dur.toFixed(2)})),
    legendas:{quantidade:S.caps.length,estilo:S.capStyle.preset}};
  let tr='';
  for(const s of S.caps){const l=`[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}\n`;if(tr.length+l.length>5000){tr+='…(cortado)';break;}tr+=l;}
  return JSON.stringify(c)+(tr?('\nTRANSCRICAO:\n'+tr):'');
}
function aiSystem(){
  const fx=Object.keys(PRESETS).join(', '),cp=Object.keys(CAP_PRESETS).join(', '),ts=TEXT_STYLES.join(', ');
  return `És o assistente de edição de um editor de vídeo. Convertes o pedido do utilizador numa lista de ações JSON. Responde APENAS com JSON: {"explicacao":"frase curta em português","acoes":[...]}.
Regras: clipes numerados a partir de 1 ("clip":"todos" ou número). Tempos em segundos da timeline. Coloca primeiro as ações que mudam a estrutura (cortar, dividir, remover_silencios, apagar_clip), depois o resto. Se o pedido não for possível, devolve "acoes":[] e explica.
Ações disponíveis:
{"a":"velocidade","clip":"todos|n","valor":0.25-4}
{"a":"volume","clip":"todos|n","valor":0-1}
{"a":"zoom_lento","clip":"todos|n","valor":0-0.4}
{"a":"efeito","clip":"todos|n","preset":"${fx}","ajustes":{"bright":-0.5..0.5,"contrast":0.5..1.8,"sat":0..2.5,"temp":-1..1,"vig":0..1,"grain":0..0.4}}
{"a":"transicao","clip":"todos|n","tipo":"none|fade|flash|zoom|slide|glitch|blur","dur":0.2-2}
{"a":"cortar","inicio":s,"fim":s}  (remove esse intervalo e junta o resto)
{"a":"dividir","tempo":s}
{"a":"apagar_clip","clip":n}
{"a":"mover_clip","clip":n,"para":n}
{"a":"aparar","clip":n,"in":s_do_ficheiro,"out":s_do_ficheiro}
{"a":"remover_silencios","min_silencio":0.4,"limiar_db":-40}
{"a":"texto","texto":"...","inicio":s,"dur":s,"estilo":"${ts}","cor":"#hex","destaque":"#hex","tamanho":20-200,"y":5-95,"anim":"none|pop|fade|slide|type"}
{"a":"gerar_legendas"}
{"a":"editar_legendas","instrucao":"ex.: traduzir para inglês / corrigir erros / remover palavrões"}
{"a":"legenda_estilo","estilo":"${cp}","destaque":"#hex","cor_texto":"#hex","tamanho":30-140,"y":5-95,"maiusculas":true|false,"fundos":["#hex",...],"modo_fundo":"uma|alternadas|aleatorias","cor_fundo":"#hex"}
{"a":"formato","valor":"9:16|16:9|1:1|4:5"}
{"a":"enquadramento","valor":"cover|contain"}
Estilos "jornal"/"recortes de jornal" = ransom (acumula), ransom1 (1 palavra), ransomAll (frase). Para "fundo de uma só cor" usa modo_fundo "uma" e fundos com 1 cor.`;
}
const HEXRE=/^#[0-9a-f]{6}$/i;
const num=(v,a,b,d)=>{v=parseFloat(v);if(isNaN(v))return d;return Math.max(a,Math.min(b,v));};
function pickClips(sel){
  if(sel==null||sel==='todos'||sel==='all'||sel==='*')return S.clips.slice();
  const n=parseInt(sel,10);return S.clips[n-1]?[S.clips[n-1]]:[];
}
function matchKey(map,k){
  k=String(k||'').toLowerCase().trim();if(map[k])return k;
  for(const key in map){const nm=(map[key].n||map[key]||'').toString().toLowerCase();if(nm===k)return key;}
  for(const key in map){const nm=(map[key].n||map[key]||'').toString().toLowerCase();if(nm.indexOf(k)>=0||k.indexOf(key)>=0)return key;}
  return null;
}
async function execAction(a,status){
  const t=a.a;
  if(t==='velocidade'){const cs=pickClips(a.clip),v=num(a.valor,0.25,4,1);cs.forEach(c=>c.speed=v);layout();return `Velocidade ${v}× em ${cs.length} clipe(s)`;}
  if(t==='volume'){const cs=pickClips(a.clip),v=num(a.valor,0,1,1);cs.forEach(c=>c.vol=v);return `Volume ${Math.round(v*100)}% em ${cs.length} clipe(s)`;}
  if(t==='zoom_lento'){const cs=pickClips(a.clip),v=num(a.valor,0,0.4,0.1);cs.forEach(c=>c.kb=v);return `Zoom lento ${Math.round(v*100)}%`;}
  if(t==='efeito'){
    const cs=pickClips(a.clip),k=matchKey(PRESETS,a.preset);if(!k)throw new Error('efeito desconhecido: '+a.preset);
    cs.forEach(c=>{Object.assign(c.fx,FX_DEFAULT,PRESETS[k].v,{preset:k});
      if(a.ajustes&&typeof a.ajustes==='object')FX_RANGES.forEach(([key,,mn,mx])=>{if(a.ajustes[key]!=null){c.fx[key]=num(a.ajustes[key],mn,mx,c.fx[key]);c.fx.preset='custom';}});});
    return `Efeito ${PRESETS[k].n} em ${cs.length} clipe(s)`;
  }
  if(t==='transicao'){
    const cs=pickClips(a.clip),k=matchKey(TRANS,a.tipo);if(!k)throw new Error('transição desconhecida: '+a.tipo);
    cs.forEach(c=>{c.trans.type=k;c.trans.dur=num(a.dur,0.2,2,0.5);});return `Transição ${TRANS[k]} em ${cs.length} clipe(s)`;
  }
  if(t==='cortar'){const d=rippleCut(num(a.inicio,0,1e6,0),num(a.fim,0,1e6,0));return d?`Cortei ${d.toFixed(1)} s (${a.inicio}–${a.fim})`:'Nada para cortar nesse intervalo';}
  if(t==='dividir'){return splitAtTime(num(a.tempo,0,1e6,0))?`Dividi aos ${a.tempo} s`:'Não foi possível dividir aí';}
  if(t==='apagar_clip'){const c=S.clips[parseInt(a.clip,10)-1];if(!c)throw new Error('clipe inexistente');rippleCut(c.tStart,c.tStart+c.dur);return `Apaguei o clipe ${a.clip}`;}
  if(t==='mover_clip'){const i=parseInt(a.clip,10)-1,j=parseInt(a.para,10)-1;if(!S.clips[i]||j<0||j>=S.clips.length)throw new Error('posição inválida');const[c]=S.clips.splice(i,1);S.clips.splice(j,0,c);layout();return `Movi o clipe ${a.clip} para a posição ${a.para}`;}
  if(t==='aparar'){const c=S.clips[parseInt(a.clip,10)-1];if(!c)throw new Error('clipe inexistente');const sd=SRC[c.src].dur;c.in=num(a.in,0,sd-0.1,c.in);c.out=num(a.out,c.in+0.1,sd,c.out);layout();return `Aparei o clipe ${a.clip}`;}
  if(t==='remover_silencios'){
    status('A analisar silêncios…');
    const r=await findSilences(num(a.min_silencio,0.15,5,0.4),num(a.limiar_db,-70,-20,-40));
    const pad=0.08;let total=0;
    r.map(([x,y])=>[x+pad,y-pad]).filter(([x,y])=>y-x>0.1).sort((p,q)=>q[0]-p[0]).forEach(([x,y])=>{total+=rippleCut(x,y)||0;});
    return total?`Removi ${total.toFixed(1)} s de silêncio (${r.length} pausas)`:'Não encontrei silêncios para remover';
  }
  if(t==='texto'){
    const sty=TEXT_STYLES.includes(a.estilo)?a.estilo:'plain';
    const x={id:nid(),text:String(a.texto||'Texto').slice(0,200),start:num(a.inicio,0,1e6,0),dur:num(a.dur,0.3,600,3),size:num(a.tamanho,20,200,90),color:HEXRE.test(a.cor)?a.cor:'#ffffff',hi:HEXRE.test(a.destaque)?a.destaque:S.capStyle.hi,y:num(a.y,5,95,50),style:sty,font:'auto',anim:['none','pop','fade','slide','type'].includes(a.anim)?a.anim:'pop'};
    S.texts.push(x);return `Texto "${x.text}" aos ${x.start} s`;
  }
  if(t==='gerar_legendas'){
    const segs=await autoCaptions(capOpts(),status);S.caps=segs;return `${segs.length} legendas geradas`;
  }
  if(t==='editar_legendas'){
    if(!S.caps.length)throw new Error('não há legendas — gera-as primeiro');
    status('A editar legendas com IA…');
    const out=[];
    for(let i=0;i<S.caps.length;i+=40){
      const part=S.caps.slice(i,i+40);
      const sys=`Editas legendas de vídeo segundo a instrução do utilizador: "${String(a.instrucao||'').slice(0,300)}". Mantém um item por legenda (mesma ordem e mesma quantidade). Responde só JSON: {"t":["...",...]}.`;
      const txt=await chatLLM([{role:'system',content:sys},{role:'user',content:JSON.stringify(part.map(s=>s.text))}],{temp:0.2,max:3000});
      const arr=parseJSONLoose(txt).t;if(!Array.isArray(arr)||arr.length!==part.length)throw new Error('a IA devolveu um formato inválido');
      out.push(...arr);
    }
    S.caps.forEach((s,i)=>{const nt=String(out[i]||s.text).trim();if(nt!==s.text){s.text=nt;s.words=null;s.wt=null;}});
    return `${S.caps.length} legendas editadas`;
  }
  if(t==='legenda_estilo'){
    const cs=S.capStyle;
    if(a.estilo){const k=matchKey(CAP_PRESETS,a.estilo);if(k)cs.preset=k;}
    if(HEXRE.test(a.destaque))cs.hi=a.destaque;
    if(HEXRE.test(a.cor_texto))cs.color=a.cor_texto;
    if(HEXRE.test(a.cor_fundo))cs.bgc=a.cor_fundo;
    if(a.tamanho!=null)cs.size=num(a.tamanho,30,140,cs.size);
    if(a.y!=null)cs.y=num(a.y,5,95,cs.y);
    if(a.maiusculas!=null)cs.upper=!!a.maiusculas;
    if(Array.isArray(a.fundos)){const f=a.fundos.filter(x=>HEXRE.test(x));if(f.length){cs.pal=f.slice(0,5);cs.one=f[0];}}
    if(a.modo_fundo)cs.palMode=({uma:'one',alternadas:'multi',aleatorias:'rand'})[a.modo_fundo]||cs.palMode;
    return `Estilo de legendas: ${CAP_PRESETS[cs.preset].n}`;
  }
  if(t==='formato'){const v=String(a.valor||'');if(['9:16','16:9','1:1','4:5'].includes(v)){S.ratio=v.split(':').map(Number);$('ratio').value=v;initRenderer();return `Formato ${v}`;}throw new Error('formato inválido');}
  if(t==='enquadramento'){S.fit=a.valor==='contain'?'contain':'cover';return `Enquadramento: ${S.fit}`;}
  throw new Error('ação desconhecida: '+t);
}
async function aiEditRun(prompt,status){
  status('A pensar…');
  const txt=await chatLLM([{role:'system',content:aiSystem()},{role:'user',content:'PROJETO:\n'+aiContext()+'\n\nPEDIDO: '+prompt}],{temp:0.1,max:2500});
  const plan=parseJSONLoose(txt);
  const acts=Array.isArray(plan.acoes)?plan.acoes.slice(0,25):[];
  const log=[];
  for(const a of acts){
    try{status('A executar: '+(a.a||'?')+'…');log.push({ok:true,t:await execAction(a,status)});}
    catch(e){log.push({ok:false,t:`${a.a}: ${e.message}`});}
  }
  return{explicacao:plan.explicacao||'',log,n:acts.length};
}
