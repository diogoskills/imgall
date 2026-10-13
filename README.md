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

Abra uma página HTTP/HTTPS, clique no ícone ClickImage e passe o mouse sobre uma imagem. O contorno azul indica a seleção. Clique para buscar a maior imagem acessível e iniciar o download na pasta padrão do Chrome; a seleção encerra automaticamente. A busca pode levar até oito segundos e o indicador informa seu andamento. Pressione **ESC** ou clique novamente no ícone para cancelar. Arquivos existentes recebem um nome diferente, sem sobrescrita.

A extensão usa somente `activeTab`, `scripting` e `downloads`. O acesso à página começa com sua ação no ícone, sem permissão permanente para todos os sites.

## Recursos

- Imagens `<img>`, `<picture>`, lazy loading já disponível, imagens em links e inseridas dinamicamente.
- Busca de alta resolução em `src`, `currentSrc`, `srcset`, todos os `<source>` do `<picture>`, `data-srcset` e `data-lazy-srcset`, inclusive variantes que não foram selecionadas pelo viewport.
- Originais declarados por atributos de galerias: `data-original`, `data-original-src`, `data-orig-file`, `data-full`, `data-full-src`, `data-full-url`, `data-large`, `data-large-src`, `data-large-file`, `data-zoom-image`, `data-hires` e `data-high-res`. `data-src` e `data-lazy-src` também são considerados.
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
```

Este teste verifica o seletor em uma página real, com a comunicação Chrome simulada; não comprova carregamento da extensão nem downloads pela API real. O caminho padrão do navegador é `/usr/lib/chromium/chromium`; use `CHROMIUM_PATH` para alterá-lo. O teste cria um servidor temporário restrito ao loopback, fecha o navegador e remove o perfil de teste. Esse servidor serve somente os testes e não faz parte da extensão.

Para testar manualmente, execute `python3 -m http.server 8000 --bind 127.0.0.1` na pasta do projeto e abra `http://127.0.0.1:8000/tests/manual.html` no Chrome local. Teste uma nova ativação para cada imagem, ESC, botão normal, imagem em link, srcset, picture, background, imagem dinâmica e Shadow DOM. A seção **Busca da imagem original** inclui preview de 48px com original de 128px em link/atributo, thumbnail de 24px no CSS, original indisponível e link HTML; confirme que o arquivo tem 128px de resolução real. Confirme os arquivos na lista de downloads e o link funcionando após desativar. Confira erros na página da extensão e no console do service worker em `chrome://extensions`.

## Limitações conhecidas

- Páginas `chrome://`, Chrome Web Store e outras páginas protegidas impedem injeção. O ícone mostra `!` e seu título explica a restrição.
- Somente o frame principal; conteúdo de iframes não é selecionado.
- Shadow DOM aberto é reconhecido pelo caminho dos eventos; componentes fechados podem ocultar as imagens.
- `blob:`, `data:`, canvas, gradientes, múltiplos backgrounds e recursos sem URL HTTP/HTTPS direta não são baixados. Imagens HTML incompatíveis mostram feedback ao clicar.
- Elementos sem área visível, `aria-hidden="true"` ou `role="presentation"` são ignorados. Imagens pequenas continuam selecionáveis: o tamanho exibido não define a resolução a baixar.
- Downloads dependem das políticas, cookies e respostas do site. Não há bypass de autenticação, DRM ou bloqueios. Uma URL HTTP pode responder HTML ou erro; não é possível garantir o tipo ou a resolução do servidor sem permissões adicionais. Confira o arquivo recebido.
- Só é possível encontrar originais declarados junto à imagem, seu `<picture>` ou link envolvente. Não são consultados metadados globais que possam pertencer a outra imagem, APIs privadas ou URLs inventadas. Sistemas de galeria com atributos próprios ainda podem exigir suporte adicional.
- Limites de tempo/candidatos, políticas CSP, autenticação, recursos enormes ou formatos não decodificáveis pelo navegador podem impedir a verificação de uma variante maior. A maior resolução encontrada não é uma garantia de acesso ao arquivo mestre do site; resolução em pixels também não permite medir a compressão ou qualidade perceptual.
- A verificação gera solicitações adicionais aos recursos candidatos e pode consumir banda. O download final usa a URL escolhida diretamente e preserva os bytes que o servidor fornece, sem transformação local.
- Suspensão/reinício do service worker pode expirar a seleção ou perder o feedback de um download em andamento; a lista de downloads do Chrome continua sendo a referência. Reative pelo ícone se necessário.
- Sites que bloqueiam eventos antes do listener da extensão podem interferir na seleção.

## Melhorias planejadas

Suporte cuidadoso a frames autorizados, persistência do acompanhamento de downloads, integração com atributos de outras galerias e seleção explícita entre candidatos de resolução.
