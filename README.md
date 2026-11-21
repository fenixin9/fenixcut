# FenixCut V9

## Atualizar
Substitui os ficheiros correspondentes na raiz do repositório por TODOS os ficheiros deste ZIP. Fecha a PWA, abre o site e recarrega. Cache: fenixcut-v9-fix1.
Não apagues os dados do site: os projetos/vídeos estão em IndexedDB e podem ser eliminados. A atualização do código e do cache não exige apagar esses dados.

## Novidades
- Régua com hh:mm:ss.mmm; zoom até marcas de 1 ms (dependendo do nível). Só desenha os rótulos da região visível.
- Campos Tempo (hh:mm:ss.mmm) e ms (milissegundos totais), botão Ir e passos +/-1 ms. Em ecrãs pequenos a barra de tempo pode ser deslizada horizontalmente.
- A imagem mostra o frame existente mais próximo do instante solicitado; 1 ms na interface não cria frames que não existem na origem.
- Transcrição em janelas até 30 segundos com 2 segundos de sobreposição e propriedade temporal por janela; silêncio antes/depois do pedido com tempos compensados.
- Nova verificação independente dos primeiros 8 segundos quando necessário (ou em vídeos mais longos). Mantém a fala do início, sem a cortar artificialmente. Não é garantia de reconhecimento correto de toda a fala.
- Modelos Groq: Whisper Large V3 e Turbo para áudio; restantes modelos de linguagem para revisão e edição por prompt. Lista dinâmica através do botão Atualizar modelos, com a chave do utilizador.
- Pedir uma revisão extra pode consumir mais quota. Nunca inventa uma transcrição usando um modelo apenas de texto como se tivesse ouvido o áudio.
- Uma fonte por modelo de jornal: Playfair, Special Elite, Montserrat ou Oswald; sem troca por palavra, sem negrito/itálico, caixas retas e inclinação ligeira da palavra. Uma fonte escolhida manualmente sobrepõe a do modelo, uniformemente.
- Miniaturas animadas nas quatro galerias; demonstração com movimento para efeitos/transições, texto de exemplo e progressão temporal nas legendas. Pausa/reprodução manual. Só anima as miniaturas visíveis, e respeita reduzir movimento por defeito.
- Preservadas as correções de gravação em fila, ícones PNG, exportações repetidas com recursos próprios e sem troca silenciosa de método/codec.
- Exportação mostra dimensões verificadas e débito pedido separado da média real do ficheiro (vídeo + áudio + contentor).

## Qualidade
O preview pequeno não é usado como origem da exportação. O motor recebe as dimensões pedidas e lê o vídeo original. 2K/4K é ampliação por interpolação, NÃO super-resolução por IA. Não foi adicionado um modelo de reconstrução de detalhe. Exportação editada é recodificada e não é sem perdas. Efeitos de desfoque aplicados pelo utilizador continuam ativos.

## Segurança
Sem chaves API incluídas. Não publiques chaves nem links de configuração com chaves. Para terceiros usa um backend. Os projetos guardados no navegador não são uma cópia de segurança na nuvem.
