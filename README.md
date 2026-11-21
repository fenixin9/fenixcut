# FenixCut — V8 correções

## Instalar
Substitui TODOS os ficheiros na raiz do repositório pelos deste ZIP. Não substituas só export.js. Mantém o GitHub Pages ativo. Fecha a PWA, abre o site no navegador e recarrega. Cache: fenixcut-v8-fix1.
NÃO apagues os dados do site: isso pode eliminar os projetos e os vídeos guardados em IndexedDB. Os ficheiros de código e o cache offline são diferentes dos dados dos projetos.

## Corrigido
- PNG verdadeiros com os nomes e dimensões do manifesto.
- Cache offline versionado; limpeza limitada aos caches fenixcut-*.
- Gravações de projetos em fila, com snapshot e transação conjunta para ficheiros e metadados.
- Falhas de gravação impedem abrir um projeto diferente ou criar um novo por cima do atual.
- Áudio do modo tempo real usa elementos e AudioContext próprios em cada operação. Liberta pistas, vídeos e contexto ao terminar/cancelar.
- Codec explícito nunca é trocado silenciosamente. HEVC exige o motor principal; alternativa H.264 apenas quando escolhido ou em Automático.
- O modo Automático não cai silenciosamente para gravação em tempo real. Em caso de falha, pede escolher Compatível.
- Exportação valida dimensões do vídeo gerado e, quando disponível, duração. Mostra débito pedido e média real do ficheiro (inclui áudio e contentor).
- Sem reforço artificial de nitidez por defeito. Usa a origem, não o canvas reduzido do preview.
- Frames de origem ausentes e timeout de procura geram erro em vez de repetir frames silenciosamente.
- Todos os modos de legendas de jornal com palavras/caixas usam peso normal e caixa reta. Inclinação reduzida a cerca de 1,15 graus. Fita mantém fundo em faixa.
- Mantido tema magenta, responsividade, foco e régua com subdivisões.

## Limitações
Uma exportação editada é recodificada; não é uma cópia sem perdas. Não se recupera detalhe ausente da origem. Efeitos de desfoque escolhidos pelo utilizador continuam ativos. Tempo real pode perder frames em dispositivos lentos e é interrompido se a página for ocultada. Codec, 2K/4K e débito dependem do aparelho. A média real inclui áudio/contentor e não é o débito isolado da pista de vídeo.

## Segurança
Nenhuma chave de API incluída. Não publiques a tua chave ou links de configuração que a contenham. Um site público não consegue manter secreta uma chave colocada no navegador; para uso por terceiros usa um backend.
