/* FenixCut UX preview — additive navigation and caption tools. */
'use strict';
(function(){
 if(typeof S==='undefined'||typeof renderPanel!=='function')return;
 const css=`
 body.fc-ux{margin:0;overflow:hidden;background:#101113;color:#f4f4f5}
 .fc-ux .app{height:100dvh;min-height:0;display:flex;flex-direction:column;overflow:hidden}
 .fc-ux .top{flex:none;padding:6px 10px;background:#151619;border-bottom:1px solid #303136}
 .fc-ux .toprow{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
 .fc-ux .brand{font-size:15px}.fc-ux .brand svg{width:22px;height:22px}
 .fc-ux .topr{display:flex;gap:6px;align-items:center}.fc-ux #ratio{max-width:110px}
 .fc-ux .projbar{margin-top:4px;gap:6px}.fc-ux #projName{min-width:40px;width:110px;flex:1}
 .fc-ux .stage{flex:1;min-height:120px;display:flex;flex-direction:column;padding:8px 10px 0;overflow:hidden;background:#0c0d0f}
 .fc-ux .canvasWrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;width:100%}
 .fc-ux #preview{max-height:100%;max-width:100%;width:auto;height:auto;object-fit:contain}
 .fc-ux .transport{flex:none;display:flex;align-items:center;gap:3px;min-height:44px;margin:4px 0}
 .fc-ux .timein{width:88px;font-size:11px}.fc-ux #timeTot{font-size:10px}
 .fc-ux .tl{flex:none;max-height:27dvh;overflow:auto;background:#191a1d;padding:4px 0;border-top:1px solid #303136}
 .fc-ux .tlbar{padding:0 10px;min-height:36px;display:flex;align-items:center}
 .fc-ux .seekbar{display:none}.fc-ux.ux-precision .seekbar{display:flex;flex-wrap:wrap;padding:8px}
 .fc-ux .tlscroll{max-height:19dvh;overflow:auto}.fc-ux .track{min-height:44px}.fc-ux .track.small{min-height:28px}
 .fc-ux .blk{border-radius:6px}.fc-ux .blk.sel{outline:2px solid #52d9c4;outline-offset:-2px}
 .fc-ux .panel{flex:none;min-height:0;display:flex;flex-direction:column;background:#202125;border-top:1px solid #37383d;overflow:hidden}
 .fc-ux #tabs{order:3;flex:none;display:flex;overflow-x:auto;gap:2px;padding:5px 6px calc(6px + env(safe-area-inset-bottom));background:#191a1d;scrollbar-width:none}
 .fc-ux #tabs button{min-width:66px;min-height:60px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:0;background:transparent;color:#bdbfc7;border-radius:10px;font-size:11px;padding:5px 9px}
 .fc-ux #tabs button.on{background:#2c3736;color:#75ead6}.fc-ux #tabs svg{width:22px;height:22px}
 .fc-ux #panelBody{display:none;min-height:0;max-height:38dvh;overflow:auto;overscroll-behavior:contain;padding:12px}
 .fc-ux.ux-open #panelBody{display:block}.fc-ux #uxPanelHead{display:none}
 .fc-ux.ux-open #uxPanelHead{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;border-bottom:1px solid #393a3e;flex:none;min-height:40px}
 .fc-ux .btn,.fc-ux select,.fc-ux input:not([type=range]):not([type=checkbox]),.fc-ux textarea{border-radius:9px}
 .fc-ux button,.fc-ux select{touch-action:manipulation}.fc-ux .btn{min-height:42px}
 .fc-ux .primary{background:#57d8c2;color:#0d2420;border-color:#57d8c2}
 .fc-ux .box{background:#292a2f;border:1px solid #38393f;border-radius:12px;padding:12px;margin-bottom:10px}
 .fc-ux .stylegrid,.fc-ux .fxgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 .fc-ux .stylecard,.fc-ux .fxcard{border-radius:10px;overflow:hidden;min-width:0}
 .fc-ux details.ux-group{border:1px solid #3b3c43;background:#27282d;border-radius:12px;margin-bottom:10px}
 .fc-ux .ux-group>summary{padding:14px;cursor:pointer;font-weight:600;min-height:44px;box-sizing:border-box}
 .fc-ux .ux-group>.box{border:0;margin:0;background:transparent}
 .fc-ux #toast{z-index:1000;bottom:90px}.fc-ux .lab-modal{z-index:600}
 .fc-ux .ux-actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
 @media(min-width:850px){.fc-ux #panelBody{max-height:40dvh}.fc-ux .stylegrid,.fc-ux .fxgrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
 `;
 const paths={clip:'M4 4h16v16H4z M9 4v16 M15 4v16',fx:'m12 3 2 6 7 3-7 2-2 7-2-7-7-2 7-3z',text:'M4 5h16 M12 5v15 M8 20h8',caps:'M3 5h18v14H3z M7 10H5v4h2 M12 10h-2v4h2 M15 11h4 M15 14h4',layers:'m12 3 10 6-10 6L2 9z M2 13l10 6 10-6 M2 17l10 6 10-6',studio:'M3 8h18v13H3z M7 8V4h10v4 M9 13h6 M12 10v6',trans:'M3 5h7v14H3z M14 5h7v14h-7z M8 12h8',ai:'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M8 8h8v8H8z',exp:'M12 16V3 M7 8l5-5 5 5 M4 14v7h16v-7'};
 function icon(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[k]||paths.studio)+'"/></svg>';}
 const oldTabs=renderTabs;
 renderTabs=function(){oldTabs();document.querySelectorAll('#tabs [data-tab]').forEach(b=>{const label=b.textContent;b.textContent='';b.insertAdjacentHTML('beforeend',icon(b.dataset.tab));const span=document.createElement('span');span.textContent=label;b.appendChild(span);b.setAttribute('aria-selected',String(b.dataset.tab===S.tab));});};
 function opened(v){document.body.classList.toggle('ux-open',v);const h=document.getElementById('uxPanelTitle');if(h){const t=TABS.find(t=>t[0]===S.tab);h.textContent=t?t[1]:'Ferramentas';}}
 function changeCaps(fn){try{commit();const next=fn(JSON.parse(JSON.stringify(S.caps)));if(!next)return;S.caps=next.sort((a,b)=>a.start-b.start);commit();refreshAll();opened(true);}catch(e){toast(e.message||String(e),6000);}}
 function selected(caps){const c=S.sel&&S.sel.type==='cap'?caps.find(c=>c.id===S.sel.id):caps.find(c=>S.t>=c.start&&S.t<c.end);if(!c)throw new Error('Seleciona uma legenda na timeline.');return c;}
 function words(c){const tokens=String(c.text||'').trim().split(/\s+/).filter(Boolean);if(!tokens.length)throw new Error('Legenda vazia.');if(c.words&&c.wt===c.text&&c.words.length===tokens.length)return c.words;return tokens.map((w,i)=>({w,s:c.start+(c.end-c.start)*i/tokens.length,e:c.start+(c.end-c.start)*(i+1)/tokens.length,approx:true}));}
 const actions={
 add:()=>{if(!S.total)return toast('Importa primeiro um vídeo.');const text=prompt('Texto da nova legenda:');if(!text||!text.trim())return;changeCaps(a=>{const start=Math.min(S.t,Math.max(0,S.total-.2)),c={id:nid(),start,end:Math.min(S.total,start+2),text:text.trim()};a.push(c);S.sel={type:'cap',id:c.id};return a;});},
 split:()=>changeCaps(a=>{const c=selected(a),ws=words(c);if(ws.length<2)throw new Error('São precisas pelo menos duas palavras.');let k=ws.findIndex(w=>w.s>=S.t);if(k<=0||k>=ws.length)throw new Error('Coloca a agulha entre palavras, dentro da legenda.');const t=ws[k].s;if(t<=c.start||t>=c.end)throw new Error('Ponto de divisão inválido.');const right={...c,id:nid(),start:t,words:ws.slice(k)};c.words=ws.slice(0,k);c.end=t;for(const z of [c,right]){z.text=z.words.map(w=>w.w).join(' ');z.wt=z.text;}a.splice(a.indexOf(c)+1,0,right);return a;}),
 merge:()=>changeCaps(a=>{a.sort((a,b)=>a.start-b.start);const c=selected(a),i=a.indexOf(c),n=a[i+1];if(!n)throw new Error('Não existe legenda seguinte.');c.words=words(c).concat(words(n));c.end=Math.max(c.end,n.end);c.text=c.text.trim()+' '+n.text.trim();c.wt=c.text;a.splice(i+1,1);return a;}),
 replace:()=>{const find=prompt('Procurar nas legendas (texto exato):');if(!find)return;const repl=prompt('Substituir por:');if(repl===null)return;changeCaps(a=>{let count=0;for(const c of a){if(!c.text.includes(find))continue;const text=c.text.split(find).join(repl).trim();if(!text)throw new Error('A substituição deixaria uma legenda vazia.');c.words=alignTimes(words(c),text.split(/\s+/),c.start,c.end);c.text=text;c.wt=text;count++;}if(!count)throw new Error('Texto não encontrado.');toast(count+' legendas alteradas.');return a;});}
 };
 function extras(){if(S.tab!=='caps')return;const b=document.getElementById('panelBody');if(!b||b.querySelector('#uxCapTools'))return;const box=document.createElement('div');box.id='uxCapTools';box.className='box';box.innerHTML='<h3>Edição rápida de legendas</h3><div class="ux-actions"><button class="btn" data-uxcap="add">Inserir legenda</button><button class="btn" data-uxcap="split">Dividir entre palavras</button><button class="btn" data-uxcap="merge">Juntar à seguinte</button><button class="btn" data-uxcap="replace">Procurar e substituir</button></div><p class="hint">Dividir e juntar usam a legenda selecionada. Tempos de palavras novas são estimados. Usa Desfazer para reverter.</p>';b.prepend(box);box.querySelectorAll('[data-uxcap]').forEach(el=>el.onclick=actions[el.dataset.uxcap]);
 b.querySelectorAll(':scope > .box').forEach(node=>{if(node===box)return;const heading=node.querySelector('h3');if(!heading)return;const d=document.createElement('details');d.className='ux-group';d.open=/automáticas/i.test(heading.textContent);const summary=document.createElement('summary');summary.textContent=heading.textContent;node.before(d);d.append(summary,node);heading.hidden=true;});}
 const oldPanel=renderPanel;renderPanel=function(){const r=oldPanel.apply(this,arguments);extras();opened(document.body.classList.contains('ux-open'));return r;};
 function init(){const st=document.createElement('style');st.textContent=css;document.head.append(st);document.body.classList.add('fc-ux');const p=document.querySelector('.panel');if(!p)return;const head=document.createElement('div');head.id='uxPanelHead';head.innerHTML='<span id="uxPanelTitle">Ferramentas</span><button type="button" class="btn" id="uxClose">Concluído</button>';p.prepend(head);document.getElementById('uxClose').onclick=()=>opened(false);document.getElementById('tabs').addEventListener('click',()=>opened(true),true);document.getElementById('tlInner').addEventListener('click',e=>{if(e.target.closest('.blk'))opened(true);},true);const exp=document.getElementById('btnExport');if(exp)exp.addEventListener('click',()=>opened(true),true);const bar=document.querySelector('.tlbar');if(bar){const btn=document.createElement('button');btn.className='btn sm';btn.textContent='Precisão';btn.type='button';btn.setAttribute('aria-pressed','false');btn.onclick=()=>{const on=document.body.classList.toggle('ux-precision');btn.setAttribute('aria-pressed',String(on));};bar.append(btn);}renderTabs();extras();opened(false);}
 window.FenixUX={actions,words,opened};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
