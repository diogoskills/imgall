# Revisão de segurança — ClickImage 2.11.0

Escopo: código da extensão, importação/exportação de Bibliotecas, armazenamento local e modo de seleção. Esta é uma revisão de implementação com testes automatizados, não uma auditoria independente do navegador.

## Isolamento e alcance

A extensão usa IndexedDB e chrome.storage.local dentro do perfil do Chrome. Não existe banco remoto compartilhado, API própria, conta ou sincronização entre usuários. Os eventos BroadcastChannel/storage ficam no mesmo contexto de origem/perfil. Uma importação não oferece um fluxo para escrever nas Bibliotecas de outra pessoa.

Um arquivo distribuído a terceiros ainda será entrada não confiável para cada destinatário que o importar. Por isso danos locais também foram tratados: perda de dados, código ativo, vazamento de URLs e abuso de memória. Não se pressupõe que um arquivo seja seguro por estar no disco do usuário.

## Caminhos verificados

| Entrada ou risco | Proteção | Verificação executada |
| --- | --- | --- |
| HTML/scripts em nomes | Nomes viram textContent, Option ou valor de input; templates HTML são constantes do pacote | Payloads com tags/onerror não criam elementos nem executam código |
| URLs maliciosas no backup | Campos de URL importados são ignorados; restauração usa somente bytes incorporados | Nenhum fetch de importação; nenhuma requisição ao domínio do payload |
| Alteração de protótipo | Campos conhecidos mapeados explicitamente; IDs em Map/Set | `__proto__` no JSON não polui objetos |
| SVG/HTML disfarçado | Assinatura de arquivo, formatos raster permitidos, MIME derivado dos bytes e SHA-256 | Arquivos ativos e tipos falsos rejeitados |
| ZIP com `../`, caminhos absolutos, entradas extras ou CRC inválido | Leitor STORE estrito, caminhos validados e arquivos esperados | Casos de travessia, duplicidade, corrupção e compressão desconhecida rejeitados |
| Backup grande ou imagem de dimensões abusivas | Limites de bytes/entradas, Base64 canônico, cabeçalhos raster comuns inspecionados antes do codec, limite de resolução | JSON/ZIP e cabeçalhos PNG/GIF/JPEG/WebP abusivos testados |
| Sobrescrita de Bibliotecas | Importação gera IDs novos e nome único; não existe substituição automática | Bibliotecas repetidas preservadas; IDs remapeados e bytes iguais compartilhados |
| Interrupção/falta de espaço | Validação completa antes de uma única transação de escrita | Falha de quota induzida aborta também criação de Biblioteca/pastas, preservando dados anteriores |
| Execução remota/embutida na interface | CSP com script-src self, object-src none, base-uri none, frame-src none e form-action none | Manifesto inspecionado e interface executada sob a política no Chromium |
| Interações acidentais ao caçar imagens | Escudo transparente, captura de eventos e cliques físicos somente em imagens/posters | Áudio real, links, controles, cliques especiais e iframe de origem opaca bloqueados; ESC e fechamento do painel restauram a página |

A extensão não executa JavaScript, HTML, SVG ou comandos encontrados no backup. O ZIP de imagens é criado em memória e entregue ao gerenciador de downloads; a importação não extrai arquivos em caminhos do sistema. URLs assinadas não são exportadas, porque podem conter tokens. Arquivos de imagem preservam seus bytes e, consequentemente, metadados próprios como EXIF; o usuário deve considerar isso antes de compartilhar um backup.

## Limites e validação prática

- 50 Bibliotecas, 200 grupos/conjuntos, 5.000 arquivos únicos, 20.000 referências, 512 MB locais e 32 MB por imagem.
- Novos arquivos da Biblioteca: até 64 MP e 32.768 px por lado. Os downloads diretos anteriores não são redimensionados nem limitados por esse decodificador da Biblioteca.
- JSON: 16 MB de imagens decodificadas e até 28 MB de arquivo; o backup JSON não muda automaticamente de formato; arquivos maiores são recusados com orientação para exportação ZIP separada, até 128 MB de imagens + 4 MB de metadados nos ZIPs de imagens, com manifesto. O botão Importar Biblioteca aceita somente JSON; ZIPs são revalidados internamente durante a própria exportação.
- Não há descompressor de ZIP arbitrário: apenas STORE, sem expansão de conteúdo comprimido.
- Cabeçalhos PNG/GIF/BMP/JPEG/WebP recebem inspeção antecipada. A validação dos demais formatos depende também do codec nativo; TIF permanece com visualização dependente do navegador. Não se afirma imunidade a vulnerabilidades do próprio Chromium ou de seus codecs.
- IndexedDB, armazenamento no disco, imagens, CSP HTTP e eventos físicos são reais nos testes. APIs de janelas/downloads/preferências da extensão são simuladas. A instalação nativa e sites reais autenticados precisam de homologação no Chrome do usuário.
- A revisão não cobre uma instalação modificada por terceiros, acesso administrativo ao perfil/disco nem futuras integrações de backend. Servidores/contas/pagamentos exigirão revisão própria de autenticação, autorização e isolamento antes de serem integrados.

A árvore tem limite de 32 níveis e valida pais/ciclos. A limpeza total só executa após confirmação APAGAR na interface; o arquivo importado não controla essa operação. IDs novos no estado inicial impedem salvamentos antigos em trânsito de atingir a pasta removida.

Testes relacionados: `npm test`, `tests/library.cjs`, `tests/library-storage.cjs`, `tests/selection-guard.cjs` e regressões do painel/seletor/YouTube/social.

## Leitura e tipos de pastas na 2.11

As novas permissões de host limitam-se a `https://i.ytimg.com/*` e `https://img.youtube.com/*`. Os outros hosts não recebem autorização global; não há proxy externo. Fallback usa apenas nomes estáticos conhecidos no mesmo vídeo/host, preserva os parâmetros e exige resposta/bytes válidos. 401/403 não provocam tentativas de versões alternativas; falha CORS/rede não é relatada falsamente como arquivo inexistente. O individual pode continuar usando a API nativa quando a leitura para ZIP for indisponível.

O registro de nomes de blobs aceita somente mensagens da origem da extensão vindas de `panel.html` e `library.html`, com blob da própria extensão e nome sem caminhos/caracteres inválidos. O registro fica em storage.session, expira e é removido após a operação. O gancho de nomes só atua nos downloads iniciados por esta extensão. Não concede execução, escrita arbitrária ou acesso a dados de outros perfis.

`kind` só aceita collection/group/subgroup na criação e na importação. Conjuntos não podem receber links diretos por salvamento, movimentação ou restauração; mudanças inválidas abortam a transação. Dados sem tipo continuam sendo lidos sem migração destrutiva. O ZIP e o JSON incluem esse campo opcional para reconstrução; nomes importados continuam sendo texto e URLs não são obtidas.

As mensagens de CDN, APIs Chrome e gancho de download foram testadas com respostas/APIs simuladas; o Chromium desta máquina não disponibilizou carregamento nativo da extensão. Concessão efetiva de host, downloads nativos e nomes finais no Chrome instalado continuam como homologação manual documentada.
