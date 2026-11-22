/* FenixCut V12 — more video models and retention checklist. Loaded after studio-plus.js. */
'use strict';
(function(){
 if(typeof LX==='undefined'||typeof lxBaseRect!=='function'||typeof lxApplyLayout!=='function'||typeof renderPanel!=='function'){
  window.addEventListener('DOMContentLoaded',()=>{const p=document.createElement('p');p.textContent='FenixCut: studio-models.js não encontrou o módulo de camadas. Confirma que studio.js e studio-plus.js estão no repositório.';p.style.cssText='background:#5a132b;color:#fff;padding:10px';document.body.prepend(p);});return;
 }
 const R=(x,y,w,h)=>({x,y,w,h});
 const MODELS={
  bottomMain:{label:'Principal em baixo · camada em cima',base:R(0,.5,1,.5),layers:[{x:.5,y:.25,w:1,h:.5}]},
  rightMain:{label:'Principal à direita · camada à esquerda',base:R(.5,0,.5,1),layers:[{x:.25,y:.5,w:.5,h:1}]},
  top65:{label:'Principal grande em cima · camada em baixo',base:R(0,0,1,.65),layers:[{x:.5,y:.825,w:1,h:.35}]},
  bottom65:{label:'Principal grande em baixo · camada em cima',base:R(0,.35,1,.65),layers:[{x:.5,y:.175,w:1,h:.35}]},
  stack3:{label:'Três faixas · principal em cima',base:R(0,0,1,1/3),layers:[{x:.5,y:.5,w:1,h:1/3},{x:.5,y:5/6,w:1,h:1/3}]},
  stack3mid:{label:'Três faixas · principal ao centro',base:R(0,1/3,1,1/3),layers:[{x:.5,y:1/6,w:1,h:1/3},{x:.5,y:5/6,w:1,h:1/3}]},
  reactLeft:{label:'Reação · miniatura à esquerda',base:R(0,0,1,1),layers:[{x:.27,y:.6,w:.42,h:.28}]},
  reactRight:{label:'Reação · miniatura à direita',base:R(0,0,1,1),layers:[{x:.73,y:.6,w:.42,h:.28}]}
 };
 const uiGroups=[['bottomMain','top65','bottom65','rightMain'],['stack3','stack3mid','reactLeft','reactRight']];
 const visual=()=>S.layers.filter(l=>l.kind!=='audio');
 const baseOriginal=lxBaseRect;
 lxBaseRect=function(){const m=MODELS[LX.layout];return m?{...m.base}:baseOriginal();};
 const applyOriginal=lxApplyLayout;
 lxApplyLayout=function(name){
  const m=MODELS[name];if(!m)return applyOriginal(name);
  const selected=lxSelected(),ordered=selected&&selected.kind!=='audio'?[selected,...visual().filter(l=>l!==selected)]:visual();
  if(!ordered.length){toast('Adiciona primeiro uma foto ou vídeo como camada.');return;}
  const used=ordered.slice(0,m.layers.length);
  if(used.some(l=>(l.keyframes||[]).length)&&!confirm('Este modelo remove os keyframes das camadas que vai reposicionar. Continuar?'))return;
  lxCheckpoint();LX.layout=name;
  m.layers.forEach((g,i)=>{const l=ordered[i];if(l)Object.assign(l,{x:g.x,y:g.y,w:g.w,h:g.h,rotation:0,fit:'cover',keyframes:[]});});
  if(ordered.length<m.layers.length)toast(`Este modelo usa ${m.layers.length} camadas visuais. Adiciona mais ${m.layers.length-ordered.length} e toca outra vez no modelo.`,6500);
  LX.selected=ordered[0].id;lxChanged();renderPanel();
 };
 function choose(key){
  if(S.exporting)return toast('Aguarda a exportação.');if(!S.clips.length)return toast('Importa primeiro o vídeo principal.');
  if(visual().length){lxApplyLayout(key);return;}
  const input=document.createElement('input');input.type='file';input.accept='video/*,image/*';
  input.onchange=async()=>{if(!input.files.length)return;try{const l=await lxImport(input.files[0]);LX.selected=l.id;lxApplyLayout(key);}catch(e){toast(e.message,6000);}};input.click();
 }
 function card(key){return `<button type="button" class="fxp-model ${LX.layout===key?'on':''}" data-fxm-layout="${key}"><canvas width="240" height="160" data-fxm-card="${key}" aria-hidden="true"></canvas><span>${MODELS[key].label}</span></button>`;}
 function modelsHTML(){return `<section class="box fxm-models"><h3>Mais modelos de vídeo</h3><p class="hint">Estes modelos reposicionam as tuas camadas e o vídeo principal. Os de três faixas e a reação usam fotografias ou vídeos já adicionados como camadas; se faltarem camadas, a app avisa. Evita colocar informação importante na parte inferior, onde a interface do Instagram costuma cobrir o vídeo.</p><div class="fxp-model-grid">${uiGroups.flat().map(card).join('')}</div></section>`;}
 function paint(cv,key,t){
  const m=MODELS[key],ctx=cv.getContext('2d'),W=cv.width,H=cv.height;ctx.fillStyle='#101010';ctx.fillRect(0,0,W,H);
  const pane=(x,y,w,h,col,label,ph)=>{ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.fillStyle='rgba(255,255,255,.82)';ctx.beginPath();ctx.arc(x+w*(.2+.6*((t*.28+ph)%1)),y+h*.5,Math.max(5,Math.min(w,h)*.12),0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 17px sans-serif';ctx.fillText(label,x+8,y+22);ctx.restore();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.strokeRect(x+.5,y+.5,w-1,h-1);};
  pane(m.base.x*W,m.base.y*H,m.base.w*W,m.base.h*H,'#6540b8','Principal',0);
  m.layers.forEach((g,i)=>pane((g.x-g.w/2)*W,(g.y-g.h/2)*H,g.w*W,g.h*H,i?'#d56a22':'#c02a86','Camada '+(i+1),.35+i*.22));
 }
 let last=0;
 function frame(now){
  if(!document.hidden&&!S.exporting&&now-last>110){last=now;const box=$('panelBody').getBoundingClientRect(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
   document.querySelectorAll('[data-fxm-card]').forEach(cv=>{const r=cv.getBoundingClientRect();if(r.bottom>=box.top&&r.top<=box.bottom)paint(cv,cv.dataset.fxmCard,reduce?0:now/1000);});}
  requestAnimationFrame(frame);
 }
 function analyse(){
  const total=S.total||0,visualLayers=visual(),switches=Math.max(0,S.clips.length-1)+visualLayers.filter(l=>l.start>.05).length;
  const average=total/Math.max(1,switches+1),starts=[...S.caps.map(c=>c.start),...S.texts.map(t=>t.start)].filter(Number.isFinite),firstText=starts.length?Math.min(...starts):null;
  const lowCaption=S.caps.length&&S.capStyle.y>76,lowText=S.texts.some(t=>t.y>76),musicOrAudio=S.layers.some(l=>l.kind==='audio'&&l.vol>0)||S.clips.some(c=>c.vol>0);
  return [
   {ok:total>0&&total<=90,text:total?`Duração: ${total.toFixed(1)} s. O Instagram refere 15–60 s como zona recomendada em vários guias, mas aceita vídeos mais longos; o tema deve justificar a duração.`:'Importa um vídeo para analisar a duração.'},
   {ok:firstText!==null&&firstText<=1,text:firstText===null?'Sem texto nem legendas. Põe uma frase que explique o assunto nos primeiros 3 s.':`Primeiro texto/legenda aos ${firstText.toFixed(2)} s. ${firstText<=1?'Bom para o gancho.':'Tenta mostrar uma promessa visível mais cedo.'}`},
   {ok:total>0&&average<=3.5,text:`Mudança visual média: ${average.toFixed(1)} s (cortes e entradas de camadas). Guias do setor sugerem renovar o plano a cada 2–3 s quando o conteúdo permitir; não é regra oficial.`},
   {ok:musicOrAudio,text:musicOrAudio?'Existe áudio audível no projeto.':'Sem áudio audível. Confirma se o projeto deve ter voz, música ou som.'},
   {ok:!lowCaption&&!lowText,text:lowCaption||lowText?'Há legendas ou textos muito em baixo; podem ficar sob botões e descrição da publicação.':'Textos e legendas estão fora da zona mais baixa.'}
  ];
 }
 function retentionHTML(){
  const items=analyse();return `<section class="box"><h3>Verificador de retenção</h3><p class="hint">Heurística local. O Instagram indica que o tempo de visualização é um sinal importante e recomenda um início forte, mas não publica uma fórmula, nem identifica qual modelo de ecrã mantém mais audiência. [1]</p><ul class="fxm-checks">${items.map(i=>`<li class="${i.ok?'ok':'warn'}"><b>${i.ok?'✓':'!'}</b><span>${i.text}</span></li>`).join('')}</ul><div class="btnrow"><button class="btn" id="fxmFirst3">Ir ao início</button><button class="btn" id="fxmModels">Abrir modelos</button></div><p class="hint">[1] Resumo de orientações públicas do Instagram e comentários do seu responsável; sem garantia de resultados.</p></section>`;
 }
 TABS.splice(Math.max(0,TABS.length-1),0,['retention','Retenção']);
 const previous=renderPanel;
 renderPanel=function(){
  if(S.tab==='retention'){
   renderTabs();$('panelBody').innerHTML=retentionHTML();
   $('fxmFirst3').onclick=()=>{pause();setT(0);};$('fxmModels').onclick=()=>{S.tab='layers';renderPanel();};return;
  }
  const result=previous();
  if(S.tab==='layers'){
   const body=$('panelBody'),anchor=body.querySelector('.fxp-models');
   if(anchor)anchor.insertAdjacentHTML('afterend',modelsHTML());else body.insertAdjacentHTML('afterbegin',modelsHTML());
   body.querySelectorAll('[data-fxm-layout]').forEach(b=>b.onclick=()=>choose(b.dataset.fxmLayout));
  }
  return result;
 };
 window.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');style.textContent='.fxm-checks{list-style:none;display:grid;gap:8px;margin:8px 0}.fxm-checks li{display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid var(--bd);border-radius:8px}.fxm-checks li.ok b{color:#78d27b}.fxm-checks li.warn b{color:#ffd166}.fxm-models{margin-top:10px}';
  document.head.appendChild(style);requestAnimationFrame(frame);renderTabs();if(['layers','retention'].includes(S.tab))renderPanel();
 });
 window.FenixModels={MODELS,analyse,choose,paint};
})();
