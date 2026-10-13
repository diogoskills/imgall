# ClickImage

Extensão Manifest V3 para baixar o recurso de uma imagem selecionada na página, sem screenshots, recortes ou processamento do arquivo. JavaScript puro, HTML5, CSS3 e APIs do Chrome; sem servidor, banco de dados, telemetria ou código remoto.

## Instalação no Chrome

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor** no canto superior direito.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta deste projeto (`imgall`), que contém `manifest.json`. Se estiver usando o ambiente na nuvem, copie primeiro a pasta para seu computador.
5. Fixe ClickImage na barra de extensões, se desejar.

Nenhuma compilação ou instalação npm é necessária para usar a extensão.

## Como usar

Requer Chrome **116 ou superior**. Abra uma página HTTP/HTTPS e clique no ícone ClickImage: ele **somente abre o painel**, sem ativar a seleção automaticamente. Clique em **Caçar imagem** dentro da interface para começar.

O contorno roxo mostra a foto sob o mouse. Cada clique busca a maior variante acessível e adiciona uma miniatura à lista, **sem iniciar download**. O modo continua ativo para selecionar outras imagens; use **ESC** na página ou **Parar seleção** no painel para encerrar. As imagens coletadas são preservadas. Selecionar a mesma URL novamente não duplica o cartão.

Edite o campo **Nome do arquivo** de cada imagem e clique em seu próprio **Baixar imagem**. O nome é salvo antes de confirmar o download; caracteres inválidos são tratados e a extensão correta segue o MIME quando disponível. O título aceita até 60 caracteres Unicode e preserva acentos. Use **×** para remover apenas aquela imagem. É possível caçar novas imagens enquanto outras são baixadas.

A partir de quatro imagens a lista ganha rolagem, com altura limitada à área de três cartões. Em janelas menores a área se ajusta ao espaço disponível. O cabeçalho e o botão de caça continuam visíveis, sem aumentar a altura do painel.

Cada aba mantém sua própria coleção durante a sessão do navegador; fechar o painel não apaga as prévias. Uma URL pode expirar com o tempo.

A busca pode levar até oito segundos. A miniatura de 48px só é reduzida visualmente com CSS; o download recebe o arquivo encontrado sem transformação. Se o servidor bloquear a prévia, o painel informa isso e permite confirmar a URL mesmo assim. O nome e o formato final continuam seguindo o MIME informado pelo Chrome.

Permissões: `activeTab` e `scripting` para selecionar após sua ação; `downloads` para baixar após confirmação; `sidePanel` para a interface lateral; `storage` para guardar seleção e estado de download em `chrome.storage.session`. Não é usado armazenamento persistente nem acesso permanente a todos os sites.

## Recursos

- Imagens `<img>`, `<picture>`, lazy loading já disponível, imagens em links e inseridas dinamicamente.
- Busca de alta resolução em `src`, `currentSrc`, `srcset`, todos os `<source>` do `<picture>`, `data-srcset` e `data-lazy-srcset`, inclusive variantes que não foram selecionadas pelo viewport.
- Originais declarados por atributos de galerias: `data-original`, `data-original-src`, `data-orig-file`, `data-full`, `data-full-src`, `data-full-url`, `data-large`, `data-large-src`, `data-large-file`, `data-zoom-image`, `data-hires` e `data-high-res`. `data-src` e `data-lazy-src` também são considerados.
- HTML do elemento clicado e até quatro containers próximos, somente enquanto contêm exatamente essa imagem. Atributos `data-image`/`data-zoom` em JSON são lidos como dados; campos `original`, `full`, `large`, `src` e `url` são reconhecidos. Metadados `contentUrl` e links de download nesse contexto também são consultados. A busca para antes de containers com outras imagens.
- No YouTube, o ID da miniatura deve coincidir com o vídeo do link. A extensão lê o JSON `ytInitialPlayerResponse` já presente no HTML ou solicita a página ligada na mesma origem; só considera URLs de miniaturas declaradas para esse ID. Não inventa caminhos `maxresdefault`, não executa scripts e mantém o fallback em erros de acesso.
- No Instagram, analisa o HTML renderizado da imagem escolhida e as variantes publicadas em seus atributos/srcset. Não consulta APIs privadas nem usa a imagem global de um post para substituir uma foto de carrossel.
- Links que envolvem a imagem são verificados como possíveis arquivos originais, inclusive endpoints sem extensão. Páginas HTML e recursos que não decodificam como imagem são descartados; links para âncoras da própria página não são consultados.
- Os candidatos são carregados como imagens para comparar `naturalWidth × naturalHeight`, independentemente do CSS, `sizes`, div ou container. O maior número de pixels vence; em empate, fontes declaradas como original e links têm preferência. Não há screenshot, redimensionamento, recompressão ou alteração de parâmetros.
- Originais inacessíveis são descartados em favor da maior variante que carregar. Se nenhuma verificação funcionar, mantém-se a URL HTTP/HTTPS da imagem exibida. A busca ocorre somente no clique, com até 24 candidatos, quatro verificações simultâneas e limite total de oito segundos.
- `srcset` respeita descritores homogêneos `w` ou `x`, inclusive `1x` implícito, sem comparar unidades diferentes. Listas inválidas são ignoradas; não são inventadas URLs de originais.
- Background CSS com uma única URL HTTP/HTTPS direta.
- Caminhos relativos resolvidos com `document.baseURI`; parâmetros de URL preservados na solicitação.
- Nomes seguros, uma solicitação por ativação e tratamento de erros.
- Overlay isolado em Shadow DOM e remoção dos listeners de seleção e do cursor ao encerrar.

## Estrutura

| Arquivo | Finalidade |
| --- | --- |
| `manifest.json` | Configuração e permissões Manifest V3 |
| `background.js` | Ativação, validação de mensagens e API de downloads |
| `content.js` | Seleção, destaque, feedback e cancelamento |
| `panel.html`, `panel.css`, `panel.js` | Painel lateral dark/roxo, prévia e confirmação |
| `image-utils.js` | Validação de URLs, srcset e nomes de arquivo |
| `icons/` | Ícones PNG locais |
| `tests/utils.test.cjs` | Testes automatizados sem dependências |
| `tests/browser.cjs` | Teste do seletor em Chromium com mensagens simuladas |
| `tests/manual.html` | Página de cenários para testes manuais |

## Desenvolvimento e testes

Requer Node.js 20 ou superior para os testes; não há dependências de produção.

```sh
npm test
npm run check
```

A integração opcional requer Playwright disponível no Node e Chromium:

```sh
node tests/browser.cjs
node tests/panel.cjs
```

Os testes de navegador verificam o seletor e o painel em páginas reais, com as APIs Chrome simuladas; não comprova carregamento da extensão nem downloads pela API real. O caminho padrão do navegador é `/usr/lib/chromium/chromium`; use `CHROMIUM_PATH` para alterá-lo. O teste cria um servidor temporário restrito ao loopback, fecha o navegador e remove o perfil de teste. Esse servidor serve somente os testes e não faz parte da extensão.

Para testar manualmente, execute `python3 -m http.server 8000 --bind 127.0.0.1` na pasta do projeto e abra `http://127.0.0.1:8000/tests/manual.html` no Chrome local. Teste uma nova ativação para cada imagem, ESC, botão normal, imagem em link, srcset, picture, background, imagem dinâmica e Shadow DOM. A seção **Busca da imagem original** inclui preview de 48px com original de 128px em link/atributo, thumbnail de 24px no CSS, original indisponível e link HTML; confirme a prévia no painel e clique em **Baixar imagem**, verificando que o arquivo tem 128px de resolução real. Antes da confirmação, não deve aparecer nenhum download. Confirme os arquivos na lista de downloads e o link funcionando após desativar. Confira erros na página da extensão e no console do service worker em `chrome://extensions`.

## Limitações conhecidas

- Páginas `chrome://`, Chrome Web Store e outras páginas protegidas impedem injeção. O ícone mostra `!` e seu título explica a restrição.
- Somente o frame principal; conteúdo de iframes não é selecionado.
- Shadow DOM aberto é reconhecido pelo caminho dos eventos; componentes fechados podem ocultar as imagens.
- `blob:`, `data:`, canvas, gradientes, múltiplos backgrounds e recursos sem URL HTTP/HTTPS direta não são baixados. Imagens HTML incompatíveis mostram feedback ao clicar.
- Elementos sem área visível, `aria-hidden="true"` ou `role="presentation"` são ignorados. Imagens pequenas continuam selecionáveis: o tamanho exibido não define a resolução a baixar.
- Downloads dependem das políticas, cookies e respostas do site. Não há bypass de autenticação, DRM ou bloqueios. Uma URL HTTP pode responder HTML ou erro; não é possível garantir o tipo ou a resolução do servidor sem permissões adicionais. Confira o arquivo recebido.
- Só é possível encontrar originais declarados junto à imagem, seu `<picture>`, containers exclusivos ou link envolvente; o YouTube também usa metadados da página do vídeo correspondente. Não são consultados metadados globais que possam pertencer a outra imagem, APIs privadas ou URLs inventadas. Sistemas de galeria com atributos próprios ainda podem exigir suporte adicional.
- Limites de tempo/candidatos, políticas CSP, autenticação, recursos enormes ou formatos não decodificáveis pelo navegador podem impedir a verificação de uma variante maior. A maior resolução encontrada não é uma garantia de acesso ao arquivo mestre do site; resolução em pixels também não permite medir a compressão ou qualidade perceptual.
- A verificação gera solicitações adicionais aos recursos candidatos e pode consumir banda. O download final usa a URL escolhida diretamente e preserva os bytes que o servidor fornece, sem transformação local.
- Estados e seleções são guardados na memória da sessão do Chrome e podem ser restaurados após suspensão do service worker. Reiniciar o navegador, recarregar a extensão ou fechar a aba limpa o contexto correspondente. A lista de downloads do Chrome continua sendo a referência para os arquivos já baixados.
- Sites que bloqueiam eventos antes do listener da extensão podem interferir na seleção.

## Melhorias planejadas

Suporte cuidadoso a frames autorizados, organização da coleção em grupos, integração com atributos de outras galerias e seleção explícita entre candidatos de resolução.

Após atualizar, recarregue a extensão em `chrome://extensions` e recarregue as abas dos sites para substituir os scripts já injetados.

### Seleção com camadas sobrepostas

O seletor inspeciona os elementos no ponto do clique (`elementsFromPoint`) e o HTML local para alcançar fotos sob overlays transparentes, como no Instagram, inclusive `<img>` com `pointer-events: none`. O contorno corresponde à foto encontrada; sua URL `src/currentSrc` e os links associados seguem para a busca de resolução. Camadas opacas e controles nativos não são atravessados. URLs assinadas do CDN mantêm todos os parâmetros; `&amp;` do HTML é decodificado pelo próprio DOM. O recurso não abre o DevTools nem exige permissões de debugger. Uma URL expirada ou bloqueada pelo servidor ainda pode falhar.

### Arquivos sem extensão na URL

O nome final usa o MIME da resposta informado pelo Chrome em `onDeterminingFilename`. Endereços de CDN sem `.jpg`/`.png` recebem a extensão de imagem correspondente (JPEG, PNG, WebP e outros formatos reconhecidos), sem modificar os bytes nem a URL assinada. Extensões incompatíveis também são corrigidas. A sugestão aplica-se somente a downloads iniciados por ClickImage e mantém `uniquify`. MIME ausente ou genérico não permite inferir o formato com segurança: nesse caso, o nome original é mantido. O cabeçalho MIME não é uma inspeção dos bytes nem uma garantia de integridade do servidor.

### Validação do painel

Os testes automatizados verificam que seleção só gera prévia, mensagens da página não autorizam downloads, apenas a confirmação do painel inicia um arquivo e cliques repetidos são rejeitados. O teste visual verifica miniaturas de 48px, edição do nome antes do download, lista com várias imagens, rolagem a partir da quarta, altura fixa, preservação de rascunhos, remoção individual, troca de aba, falha da prévia e layout estreito. O carregamento real como extensão e a API nativa de painel lateral ainda exigem validação no Chrome local: o Chromium deste ambiente não permite carregar extensões pelo mecanismo de automação disponível.

### Controles da coleção (2.2)

- **Parar seleção** ganha um fundo roxo vivo enquanto a caça está ativa. Ao encerrar com o botão ou ESC, volta ao estilo normal; essa mudança visual afeta somente o indicador, não as imagens.
- A **lixeira** limpa todas as imagens da aba e encerra a caça. Não apaga arquivos já salvos. Se um lote estiver em andamento, cancela o restante da fila; downloads já iniciados continuam no Chrome.
- Com **quatro ou mais imagens**, aparece **Baixar todas** junto à lista com scroll. Os nomes editados são guardados antes de iniciar a fila. Cada arquivo aguarda a conclusão ou interrupção do anterior; um erro não impede os próximos. O progresso fica visível no painel.
- Imagens já salvas ou com download solicitado não são repetidas. Cliques duplicados no lote são rejeitados. A fila fica na memória da sessão e pode continuar após suspensão do service worker; reiniciar o navegador ou recarregar a extensão limpa a sessão.
- As informações abaixo do nome mostram **Imagem encontrada**, sem os domínios técnicos do CDN. Resolução, miniatura, nome editável e download individual continuam disponíveis.

Os testes de lote simulam conclusão, interrupção, retomada do worker, cliques concorrentes e limpeza da fila. A integração nativa no Chrome continua exigindo conferência local; no ambiente, as APIs Chrome são simuladas nos testes.
