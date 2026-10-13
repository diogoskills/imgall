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

Abra uma página HTTP/HTTPS, clique no ícone ClickImage e passe o mouse sobre uma imagem. O contorno azul indica a seleção. Clique para iniciar o download na pasta padrão do Chrome; a seleção encerra automaticamente. Pressione **ESC** ou clique novamente no ícone para cancelar. Arquivos existentes recebem um nome diferente, sem sobrescrita.

A extensão usa somente `activeTab`, `scripting` e `downloads`. O acesso à página começa com sua ação no ícone, sem permissão permanente para todos os sites.

## Recursos

- Imagens `<img>`, `<picture>`, lazy loading já disponível, imagens em links e inseridas dinamicamente.
- `currentSrc` como referência; candidato de maior resolução somente dentro de um `srcset` válido e homogêneo que contenha o recurso escolhido pelo navegador. Listas ambíguas mantêm `currentSrc`; não são inventadas URLs.
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

Para testar manualmente, execute `python3 -m http.server 8000 --bind 127.0.0.1` na pasta do projeto e abra `http://127.0.0.1:8000/tests/manual.html` no Chrome local. Teste uma nova ativação para cada imagem, ESC, botão normal, imagem em link, srcset, picture, background, imagem dinâmica e Shadow DOM. Confirme os arquivos na lista de downloads e o link funcionando após desativar. Confira erros na página da extensão e no console do service worker em `chrome://extensions`.

## Limitações conhecidas

- Páginas `chrome://`, Chrome Web Store e outras páginas protegidas impedem injeção. O ícone mostra `!` e seu título explica a restrição.
- Somente o frame principal; conteúdo de iframes não é selecionado.
- Shadow DOM aberto é reconhecido pelo caminho dos eventos; componentes fechados podem ocultar as imagens.
- `blob:`, `data:`, canvas, gradientes, múltiplos backgrounds e recursos sem URL HTTP/HTTPS direta não são baixados. Imagens HTML incompatíveis mostram feedback ao clicar.
- Elementos menores que 32×32 pixels, `aria-hidden="true"` ou `role="presentation"` são ignorados como decoração. Essa heurística pode excluir imagens pequenas úteis.
- Downloads dependem das políticas, cookies e respostas do site. Não há bypass de autenticação, DRM ou bloqueios. Uma URL HTTP pode responder HTML ou erro; não é possível garantir o tipo ou a resolução do servidor sem permissões adicionais. Confira o arquivo recebido.
- O navegador pode transcodificar/exibir variantes: apenas URLs disponibilizadas pelo site são usadas, sem conversão de formato.
- Suspensão/reinício do service worker pode expirar a seleção ou perder o feedback de um download em andamento; a lista de downloads do Chrome continua sendo a referência. Reative pelo ícone se necessário.
- Sites que bloqueiam eventos antes do listener da extensão podem interferir na seleção.

## Melhorias planejadas

Seleção opcional de imagens pequenas, suporte cuidadoso a frames autorizados, persistência do acompanhamento de downloads e seleção explícita entre candidatos de resolução.
