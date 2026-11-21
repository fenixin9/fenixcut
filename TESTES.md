# Validação executada nesta revisão

Ambiente: Chromium automatizado com WebGL por software, sem acesso às bibliotecas/fontes externas durante os testes. Vídeo sintético WebM de 360x640 a 24 fps, com áudio.

PASSOU:
- Sintaxe de todos os 8 ficheiros JavaScript (node --check).
- Todas as referências locais HTML e os ícones PNG presentes.
- Instalação real do service worker e cache fenixcut-v8-fix1.
- Duas gravações simultaneamente solicitadas: última versão preservada.
- Falha de armazenamento simulada: projeto atual mantido ao pedir Novo.
- Recarregar e reabrir nome, clipe e vídeo guardados.
- Duas exportações reais seguidas em modo Compatível com áudio: ficheiros não vazios e resolução 360x640 validada pelo navegador. O codec reportado pelo navegador foi VP9/Opus em MP4, apesar de este ser Chromium: o resultado apresenta o codec efetivo.
- Cancelamento: vídeos temporários removidos; elemento original preservado.
- HEVC recusado explicitamente no modo Compatível.
- Caixa reta, peso normal e inclinação reduzida nos modos de jornal.
- Sem overflow horizontal em 360x640, 390x844, 768x1024, 844x390 e 1280x800.
- Nenhum erro JavaScript não tratado nos testes concluídos.

NÃO VALIDADO:
- Motores Mediabunny e mp4-muxer com bibliotecas reais carregadas da rede.
- Exportação H.264/HEVC real via esses motores.
- Aparelhos físicos Android/iPhone, vídeos longos, 2K/4K.
- Comparação perceptual do original do utilizador com um ficheiro desfocado do mesmo projeto.
- Qualidade da transcrição real com a API.

O MP4 H.264/AAC anexado não foi descodificado neste Chromium de teste. Os testes de importação usaram o vídeo sintético descrito acima. Não se deve interpretar estes resultados como garantia de qualidade em todos os dispositivos.
