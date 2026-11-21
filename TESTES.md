# Validação V9

Executado em Chromium automatizado / WebGL software, vídeo sintético 360x640, 24 fps, áudio de teste. Pedidos remotos bloqueados; sem API real Groq.

Confirmado:
- Sintaxe dos 8 JavaScript; referências locais e ícones PNG.
- Navegação a 1,234 segundos, 567 milissegundos e incremento de 1 ms para 568 ms.
- Arredondamento de 59,9999 s para 00:01:00.000; rejeita minutos inválidos.
- Zoom máximo: rótulos a cada 1 ms e apenas seis rótulos na região visível testada.
- Todos os estilos de jornal: fonte uniforme herdada do modelo e peso normal, sem fontes aleatórias por palavra.
- Imagens das miniaturas alteram-se entre amostras nas galerias Efeitos, Transições, Texto e Legendas.
- Dois pedidos de gravação consecutivos preservam a versão mais recente.
- Testes SIMULADOS da resposta ASR: compensação de 600 ms de silêncio, recuperação de palavra ao segundo zero e janelas consecutivas com tempos globais 0, 28 e 56 segundos.
- Duas exportações REAIS seguidas em modo Compatível, com áudio: ficheiros não vazios, metadados lidos e resolução 360x640 confirmada. Codec efetivo reportado VP9/Opus em MP4 neste navegador.
- Sem overflow horizontal nos tamanhos 360x640, 390x844, 768x1024, 844x390 e 1280x800; ajuste automático do preview ao espaço disponível.
- Nenhum erro JS não tratado nos testes funcionais concluídos.

Não validado:
- Qualidade linguística e deteção do início com Groq real: testes de lógica usam respostas simuladas, não resultados de reconhecimento de fala.
- Motores Mediabunny/mp4-muxer reais carregados da rede, exportações reais 1080p/2K/4K e HEVC.
- Android/iPhone físicos, vídeos longos ou comparação visual original versus exportação desfocada do utilizador.
- Super-resolução por IA: não implementada. Não afirmar que exportar em 4K recupera detalhe de 1080p.

Não é garantia de correção de todo o desfoque relatado; é necessário comparar o mesmo original com o resultado exportado para identificar a perda real.
