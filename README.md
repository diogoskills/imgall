# ClickImage

## Biblioteca permanente — versão 2.8.0

O painel mantém sua área de coleta temporária por aba. **Biblioteca** abre uma janela própria que pode continuar aberta enquanto você navega e usa o painel. O Chrome permite mover essa janela manualmente; a extensão não consegue acoplar uma segunda janela ao side panel nem garantir que fique sempre por cima.

**Salvar referências:** em cada cartão do painel, clique no ícone de marcador **Salvar na Biblioteca**, escolha a pasta e confirme. O diálogo permite criar uma pasta. A Biblioteca começa com **Minhas referências**, que pode ser renomeada ou excluída. Se a última pasta for excluída, uma nova pasta padrão vazia será criada. Todas as exclusões de pasta pedem confirmação. A coleta da sessão e as preferências existentes não são migradas, apagadas nem sobrescritas.

A Biblioteca oferece:

- Busca por nome dentro da pasta aberta, modos Grade e Lista e preferências próprias.
- Caixas de seleção por imagem e **Selecionar todas** (considera o resultado atual da pesquisa). Mudar a busca limpa a seleção para evitar operações em itens ocultos.
- **Organizar** → mover, copiar ou excluir selecionadas. O nome pode ser editado por pasta, sem alterar o arquivo ou os nomes das cópias em outras pastas.
- Contagens por pasta e deduplicação por SHA-256 dos bytes. Arquivos iguais com URLs diferentes não são repetidos na mesma pasta; cópias entre pastas compartilham os mesmos bytes locais.
- Abertura local em nova aba por botão ou clique do meio na imagem, em tamanho natural e zoom por aba de 100%, sem alterar o zoom global. O painel continua abrindo o arquivo remoto diretamente como antes.
- URLs originais e pesquisa Lens quando a origem está disponível. A pesquisa envia a URL ao Google somente após o clique.

### Persistência e privacidade

`library-store.js` usa IndexedDB (`clickimage-library`, esquema 1): pastas, metadados de imagens, arquivos Blob separados e referências entre pastas. `chrome.storage.local` contém preferências e um sinal de atualização; arquivos de imagem não são guardados em localStorage. Janelas da extensão compartilham o IndexedDB e recebem atualização automática via BroadcastChannel/storage. Não há servidores próprios, login, contas ou sincronização em nuvem.

O arquivo é realmente obtido antes de confirmar o salvamento; não criamos referências permanentes que dependam só da URL. A assinatura identifica o formato, e os formatos decodificáveis pelo navegador são também verificados com o codec nativo. Os bytes originais são mantidos sem recompressão ou redimensionamento. Sites podem bloquear a leitura por CORS, autenticação ou URL expirada. Nesses casos, o salvamento falha com mensagem; o download remoto já existente continua disponível. Nenhuma restrição é contornada e nenhuma permissão global de acesso a sites foi adicionada.

Limites desta versão: **32 MB por imagem, 512 MB por Biblioteca, 5.000 arquivos únicos, 20.000 referências e 200 pastas**. O espaço realmente disponível depende do Chrome e do disco. Falhas de quota são apresentadas; transações abortadas preservam o estado anterior. A lista monta 60 cartões por vez e oferece **Mostrar mais imagens**; URLs Blob de prévias removidas são liberadas. A Biblioteca aceita JPG, PNG, WEBP, AVIF, GIF, BMP, ICO e TIF; a decodificação/visualização de TIF depende do navegador. SVG fica fora da Biblioteca/backups nesta versão, para impedir conteúdo vetorial ativo importado; o download original e a coleta existentes não mudam.

Os dados persistem ao fechar/reabrir o navegador, mas **remover a extensão, excluir seus dados, perder o perfil ou o disco pode apagá-los**. Mantenha backups. Armazenamento local não é sincronização entre dispositivos.

### Downloads e ZIPs

Marque imagens; o botão principal fica desativado sem seleção. **ZIP** desligado baixa arquivos individuais em sequência, aguardando o resultado do download anterior; ligado gera **Baixar ZIP**. O ZIP recebe o nome seguro da pasta, usa o codificador STORE existente e preserva os bytes e formatos. Nomes repetidos ganham sufixos; cada imagem selecionada entra uma vez. Arquivos indisponíveis ficam fora, com resumo de falhas; se nenhum puder ser obtido, não é gerado ZIP vazio de imagens.

Marque pastas na coluna esquerda e abra **••• → Exportar pastas em ZIPs** para baixar um ZIP por pasta. Pastas vazias são indicadas e ignoradas. ZIPs comuns aceitam até **128 MB de imagens por arquivo**. Mantenha a janela aberta durante o processamento e até o download ser confirmado. Ao fechá-la, operações que ainda não terminaram não serão retomadas automaticamente. Downloads remotos da coleta continuam usando o fluxo anterior.

### Backup e restauração

**••• → Exportar Biblioteca** cria `ClickImage-backup.zip`, inclusive para uma Biblioteca vazia. Esse arquivo contém `manifest.json` interno com formato `clickimage-library`, versão 1, pastas, nomes por pasta, datas, formatos implícitos pelos arquivos e dimensões, além dos arquivos originais em `images/<sha256>.<extensão>`. Este manifesto interno não é o manifesto da extensão. Os formatos e tamanhos são revalidados na importação. **URLs de origem não entram no backup**, porque links assinados podem conter tokens. Após restaurar em um acervo vazio, copiar URL/pesquisar ficam desativados para essas referências; visualizar e baixar o arquivo local continuam funcionando.

**••• → Importar Biblioteca** oferece:

- **Mesclar:** combina pastas de mesmo nome (sem diferenciar maiúsculas/minúsculas), preserva itens existentes e evita conteúdo duplicado por pasta.
- **Substituir:** exige confirmação explícita e só apaga o acervo anterior dentro da mesma transação que restaura o backup validado.

A validação acontece completamente antes da escrita. Quota, falha ou interrupção da transação impedem alterações parciais. Caminhos inseguros, conteúdo extra, corrupção CRC, hashes incompatíveis, formatos/versões desconhecidos e ZIPs que não seguem o backup STORE gerado pelo ClickImage são rejeitados. Não se executa código importado nem se extrai conteúdo para caminhos no disco.

Backups completos têm limite de **128 MB de imagens + 4 MB de metadados**, com limites adicionais de entradas. A implementação não descompacta ZIPs externos e não aceita ZIPs arbitrários de fotos. Para acervos maiores, os ZIPs por pasta permitem guardar os arquivos, mas **não substituem um backup restaurável completo**. Exportação de backup falha se faltar um arquivo, em vez de produzir uma restauração incompleta. Ainda não há backup incremental nem leitura em streaming; respeitamos esses limites para conter uso de memória.

### Links e publicação

Edite apenas `config.js` para alterar `donateURL` (Livepix preservado) e `socialURL` (X de diogoskills). Donate e X usam HTML/CSS/SVG locais com `target="_blank"` e `rel="noopener noreferrer"`. Não há Ko-fi, widgets, scripts remotos nem pagamentos internos.

```sh
npm run check
npm test
node tests/panel.cjs
node tests/browser.cjs
node tests/youtube.cjs
node tests/social.cjs
npm run test:library
npm run build
```

`npm run build` gera **`dist/ClickImage-2.8.0.zip`** a partir de lista explícita de arquivos. Testes, documentos, scripts de build, Git, dados locais e credenciais não entram no pacote. Extraia o ZIP para carregar sem compactação no Chrome; selecione a pasta que contém diretamente `manifest.json`. Para atualizar uma instalação de desenvolvimento e preservar dados, mantenha a mesma pasta/ID da extensão e use **Recarregar**, sem remover a extensão. O ZIP está pronto para revisão e upload manual; nenhuma publicação na Chrome Web Store é feita automaticamente.

**Validação automatizada:** `tests/library.cjs` executa Chromium real com IndexedDB no disco e reinicia o processo usando o mesmo perfil. As APIs de janelas, armazenamento de preferências e downloads do Chrome são simuladas; isso não substitui homologação nativa. Os testes incluem persistência, CRUD, sincronização com o painel, seleção/organização, integridade dos bytes, downloads, ZIP parcial, exportação de pastas, backup vazio/cheio, mesclagem, confirmação de substituição, rejeições de segurança e rollback após falha de quota simulada. `tests/backup.test.cjs` acrescenta verificações unitárias de estrutura e segurança ao `npm test`. A instalação nativa via carregamento automático de extensão não ficou disponível no Chromium deste ambiente. Sites reais autenticados e publicação na loja precisam de validação manual; fixtures sintéticas não provam acesso em todos os sites.

Arquivos principais novos: `library.html/css/js`, `library-store.js`, `library-backup.js`, `library-panel.js`, `image-view.html/css/js`, `image-card.js`, `files.js`, `config.js`, scripts e testes. O restante deste README registra os comportamentos e decisões das versões anteriores; os limites e fluxos acima prevalecem para a Biblioteca 2.8.


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
node tests/youtube.cjs
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

### Extensão atualizada enquanto a aba está aberta

Recarregar ou atualizar a extensão invalida o contexto dos scripts antigos nas abas abertas. A comunicação trata tanto exceções síncronas quanto rejeições de Promise: encerra a seleção, remove os listeners e o cursor, evita reenviar cancelamentos pelo contexto invalidado e mostra uma orientação local. **Recarregue a aba do site** para usar a versão nova; reabrir apenas o painel não substitui o script antigo. Depois disso, erros históricos podem ser removidos em `chrome://extensions`.

O teste do seletor reproduz essa falha no clique, ao enviar a prévia e ao pressionar ESC, inclusive quando a tentativa de limpeza também falha. Esses cenários são simulados no Chromium e verificam ausência de erros não tratados.

### Painel fechado, thumbnails estáticas e formato (2.3)

- Fechar/ocultar o painel encerra a caça nas abas associadas ao painel e remove imediatamente cursor, contorno e indicador da página. Abrir novamente mantém o modo desligado; a coleção e os downloads em andamento são preservados. A conexão de ciclo de vida usa `runtime.connect` e o cancelamento já existente, sem novas permissões.
- Nas thumbnails do YouTube, o alvo é associado ao ID do link do vídeo, mesmo quando o ponteiro está sobre uma camada de vídeo ou imagem animada. Apenas posters estáticos declarados em caminhos `vi`/`vi_webp` do mesmo vídeo entram na busca. Caminhos de prévia `an_webp`, GIFs e vídeos são excluídos. Se não houver thumbnail estática acessível, a extensão informa a indisponibilidade em vez de baixar a animação. Avatares e imagens de outros sites mantêm o fluxo genérico.
- Ao lado de **Imagem encontrada**, JPG/PNG/WEBP/AVIF (e formatos reconhecidos) aparecem somente com evidência: assinatura dos bytes iniciais lidos por uma solicitação limitada e sujeita a CORS, ou MIME recebido pelo Chrome no download. Não é feita inferência pela aparência, nome editado ou extensão da URL. Se a leitura não for autorizada ou a assinatura não for reconhecida, o formato não é exibido. A verificação pode acrescentar até 1,5 segundo à busca e não altera o arquivo.

O teste `tests/youtube.cjs` usa HTML e respostas sintéticas no Chromium para reproduzir vídeo sobreposto e poster animado, medir as variantes estáticas, rejeitar prévias e conferir um PNG servido sob URL `.jpg`. Os testes de painel e worker verificam desconexão, cancelamento silencioso, coleção preservada e modo desligado ao reabrir. A abertura/fechamento do painel nativo e os sites reais ainda devem ser conferidos no Chrome local; APIs da extensão e respostas do YouTube são simuladas no ambiente.

### V1 — informações do arquivo e galeria (2.4)

O cartão mostra formato identificado, resolução real e tamanho do recurso, por exemplo `JPG - 150 × 150 px - 4 KB`. O tamanho vem do total de `Content-Range`, de `Content-Length` de uma resposta completa sem codificação adicional, ou do tamanho final informado pelo Chrome. Respostas parciais não são confundidas com o tamanho total. Quando os dados não estão disponíveis por CORS ou pelo servidor, aparece **Tamanho indisponível**.

A **pasta**, ao lado da lixeira, abre uma coluna de imagens maiores à esquerda da lista. A galeria tem rolagem própria e não aumenta a altura do painel. Clique em uma imagem para localizar seu cartão; aumente a largura do painel no Chrome se desejar mais espaço.

Esta etapa tem um checkpoint independente na branch `checkpoint/v1-media-gallery`. A V2 será entregue em um commit posterior de `work`; o checkpoint permite retomar o código da V1 sem sobrescrever o histórico.

### V2 — ações e layouts (2.5)

- O ícone de cópia copia a URL completa do recurso original encontrado, preservando seus parâmetros. A assinatura dessa URL pode expirar; não são copiados nomes ou URLs do PNG convertido.
- Os layouts **Lista**, **Compacto** e **Grade** mantêm a mesma coleção, nomes e controles. A preferência de layout é guardada localmente; as imagens continuam apenas na sessão. A galeria da V1 permanece disponível em todos os layouts.
- A lupa abre uma **pesquisa reversa no Google Lens**. Essa ação envia a URL ao Google somente após seu clique; imagens privadas que dependem de login podem não ser acessíveis ao buscador. Não há pesquisa automática nem envio silencioso de arquivos.
- **PNG (beta)** aparece para WebP identificado. A conversão usa os codecs locais do Chrome e mantém a resolução; produz um PNG separado e preserva a possibilidade de baixar o original. Não usa servidor, não redimensiona e não requer permissões de acesso permanente aos sites.
- A beta aceita WebP estático de até 16 MB e 16 megapixels, com PNG resultante de até 16 MB. WebP animado não é convertido. Bloqueios CORS, autenticação e expiração de URL são respeitados: a interface informa a falha e o download original continua disponível. PNG pode ficar maior; perfis de cor e metadados são tratados pelo codec do navegador, sem promessa de preservar metadados do WebP.

**Verificação de redes sociais:** tentativas reais de acesso a Facebook, Twitter e X receberam HTTP 403 do proxy do ambiente. Isso impede afirmar validação de posts reais ou de sessões autenticadas. `tests/social.cjs` reproduz estruturas representativas de Facebook, X e Instagram para testar camada transparente, lazy srcset, maior variante declarada, parâmetros assinados e cancelamento. O seletor genérico continua sem regras invasivas específicas de cada site; apenas recursos publicados no HTML e acessíveis ao navegador são usados. Sites com canvas, frames inacessíveis, galerias privadas ou originais não declarados continuam sujeitos às limitações documentadas.

Para testar as ações e a conversão local, execute `node tests/panel.cjs`. Para as estruturas de redes sociais, execute `node tests/social.cjs`. As APIs Chrome são simuladas nos testes de interface; a abertura de tabs, área de transferência e downloads nativos ainda devem ser conferidos no Chrome local.

**Retomar a V1:** use a branch publicada `checkpoint/v1-media-gallery`, commit `344f2b15ea7172c1e7e00009b3406faf8e45c409`. Ela contém somente tamanho do recurso e coluna de galeria sobre as funcionalidades anteriores. A V2 é um commit separado em `work`; nenhuma reescrita de histórico foi feita.


### Grade e seleção sob overlays (2.5.1)

A Grade mantém linhas com a altura necessária para seus cartões e **16 px de espaçamento vertical**, inclusive ao acrescentar imagens e abrir a galeria. A correção evita a compressão das linhas na área com scroll e preserva as colunas responsivas. O teste do painel mede o espaço entre os cartões em larguras de 280, 360 e 700 px, com ações diferentes e imagens adicionadas depois.

O seletor reutiliza o hit-test existente para encontrar imagens e fundos CSS atrás de links e camadas transparentes. Imagens decorativas visíveis (`role="presentation"` ou `aria-hidden`) também podem ser referências; esses atributos de acessibilidade não significam que a imagem esteja oculta. A verificação de visibilidade respeita ancestrais ocultos e recortes de overflow, evitando slides de carrosséis fora da região visível. Controles nativos, mesmo com ícones de imagem, e camadas opacas mantêm seus cliques normais.

Posters estáticos declarados em `video[poster]` podem ser selecionados pelo fluxo genérico. Vídeos sem poster não fornecem uma imagem por esse caminho: não há screenshot, extração de frames nem tentativa de acessar conteúdo protegido. O tratamento de thumbnails estáticas do YouTube continua prioritário e independente desse fallback.

**Compatibilidade verificada em cenários sintéticos:** `tests/social.cjs` cobre Home, Explorar, perfis e posters de Reels do Instagram, cartões e fundos CSS do Pinterest, além de Facebook e X. São nove fixtures com DOM e recursos controlados no Chromium, incluindo overlays aninhados, variantes declaradas, URLs assinadas, recortes e controles. Os testes do YouTube e do seletor geral verificam regressões dos fluxos existentes. Não há reescrita de URLs de CDN nem regras novas por plataforma: a extensão usa somente recursos declarados e acessíveis.

**Limitação de verificação real:** em 13/10/2026, as tentativas de acesso a YouTube, Instagram (Explorar, Reels e perfil), Pinterest, Facebook e X receberam `Tunnel connection failed: 403 Forbidden` do proxy deste ambiente. Portanto, não foi possível confirmar os layouts atuais, posts reais, contas autenticadas ou downloads nativos nesses sites. Faça essa conferência no Chrome local após recarregar a extensão e as abas; formatos e tamanhos podem continuar indisponíveis quando o servidor bloqueia CORS. Canvas, shadow roots fechados, iframes sem acesso e originais não publicados permanecem limitações.


### Abrir originais e escolher o lote (2.6)

- **Abrir imagem**, ao lado de Copiar URL e Pesquisar, abre diretamente a URL completa do arquivo original em uma nova aba. Na Pasta, o clique normal continua localizando o cartão; o **botão do meio** abre o arquivo. Nenhuma URL é reescrita e nenhum download começa por essa ação.
- A aba é criada em segundo plano, aguarda o carregamento (até 15 segundos), recebe `setZoomSettings` com escopo **per-tab** e zoom **100%**, e então é ativada. Se o Chrome não permitir configurar o zoom, a imagem ainda abre e há feedback. Não há alteração de zoom global ou por domínio. **100% de zoom da aba não desativa o ajuste nativo de imagens grandes à janela:** no visualizador do Chrome, clique na imagem para alternar entre ajuste e tamanho real. Escala do sistema, densidade da tela, carregamentos demorados e políticas do navegador também limitam a garantia de pixels físicos em 1:1. O arquivo original permanece intacto.
- A visualização oferece apenas **Lista** e **Grade**. As duas preferências existentes são preservadas; uma preferência antiga de Compacto é migrada e salva como Lista. A Pasta continua disponível nos dois modos.
- **Baixar todas** (a partir de quatro imagens, como antes) abre duas opções. **Imagens individuais** reutiliza a fila existente: downloads em sequência, nomes do usuário, arquivos já baixados ignorados, URLs repetidas excluídas e `conflictAction: uniquify`. **Arquivo ZIP** inclui os arquivos selecionados, inclusive aqueles já baixados individualmente, sem alterar o estado desses downloads. Não há conversão WebP para PNG automática.

O ZIP usa o método **STORE**, com os bytes originais, CRC-32 e nomes UTF-8. Não passa por canvas, codecs, redimensionamento ou recompressão. URLs iguais são incluídas uma vez; nomes iguais (ignorando caixa e normalizando Unicode) recebem sufixos como `Nome (2).png`. O formato reconhecido nos bytes tem precedência sobre um MIME contraditório. O arquivo final é salvo como `ClickImage.zip`; o Chrome evita sobrescrever ZIPs anteriores.

A preparação lê um arquivo por vez e mostra quantidade verificada, incluída e falhas. Recursos bloqueados por CORS, expirados, não reconhecidos, respostas de login/HTML e falhas de rede ficam fora do ZIP; os demais continuam sendo incluídos. O resumo informa nomes e motivos. Se todos falharem, não é baixado um ZIP vazio. O modo individual continua disponível para recursos que o Chrome consegue baixar mas que a extensão não pode ler.

**Limites e ciclo de vida:** para limitar consumo de memória, cada recurso pode ter até **32 MB**, o conjunto até **128 MB** (mais cabeçalhos ZIP) e até **1.000 URLs únicas**; a leitura de cada recurso tem limite de 20 segundos. Arquivos que ultrapassam esses limites geram falhas individuais, preservando os já incluídos. A preparação roda no painel: mantenha-o visível na mesma aba até aparecer **ZIP salvo**. Fechar/ocultar o painel, trocar a aba ou limpar a coleção cancela a preparação; ZIPs já solicitados podem continuar no Chrome, mas devem ser conferidos nos downloads se o painel for fechado durante a gravação. O ZIP não é retomado após o fechamento. Clicar novamente após concluir solicita uma nova exportação; enquanto ela está em andamento, o botão fica bloqueado.

**Testes:** `npm test` verifica interoperabilidade com `zipfile` do Python, CRC, bytes intactos, nomes Unicode, deduplicação por URL, falhas parciais, cancelamento e zoom isolado com APIs simuladas. `node tests/panel.cjs` verifica o botão de abrir, clique do meio, migração de layout, escolha de lote e geração de ZIP no Chromium. Downloads nativos, comportamento do visualizador e zoom de uma extensão instalada precisam ser conferidos no Chrome local: neste ambiente, as APIs Chrome são simuladas nos testes de interface. Nenhuma permissão nova foi adicionada.

### Checkpoint geral antes do backend

A versão 2.6.0 está preservada na branch `checkpoint/pre-backend-v2.6.0` e na tag `checkpoint-pre-backend-v2.6.0`. Veja [CHECKPOINT.md](CHECKPOINT.md) para o inventário de funcionalidades, validação, limitações e instruções de retomada. As próximas alterações continuam em `work`; as integrações de backend aguardam as instruções do usuário.

### Idiomas e apoio ao projeto (2.7)

O seletor no rodapé oferece **Português (Brasil)**, **English** e **Español**. O padrão da interface é sempre português do Brasil, mesmo quando o Chrome usa outro idioma. A escolha é guardada em `chrome.storage.local` e aplicada ao painel, textos de acessibilidade, estados de download, erros conhecidos, progresso do ZIP e indicadores de seleção na página. Trocar o idioma não reinicia a seleção, não altera a coleção, os nomes digitados, arquivos ou URLs. A formatação dos tamanhos acompanha o idioma. Mensagens externas desconhecidas são preservadas em vez de ocultadas.

As traduções são empacotadas em `i18n.js`, sem serviços remotos nem novas permissões. Os metadados nativos usam `_locales` e o fallback `pt_BR`; a descrição mostrada pelo gerenciador do Chrome segue o idioma do navegador, independentemente do seletor interno. Após atualizar a extensão, recarregue as abas já abertas para atualizar os scripts de seleção e seus textos.

O botão **Donate** mantém o estilo dark/roxo e abre `https://livepix.gg/zepoula` em uma nova aba com `noopener noreferrer`. O link não interfere em downloads e não inicia pagamento automaticamente; a contribuição é feita pelo usuário no site externo. A integração Premium/Mercado Pago permanece fora desta alteração.

`npm test` cobre fallback, persistência, mensagens parametrizadas e metadados nativos. `node tests/panel.cjs` verifica os três idiomas, preferência após recarregar, acessibilidade, preservação de nomes, layout estreito e destino da doação. `node tests/browser.cjs` verifica a troca de idioma do indicador na página e o cancelamento sem reinjeção; nesse cenário controlado, a shadow root da interface é aberta apenas pelo teste para inspecionar seu texto. As APIs Chrome continuam simuladas nesses testes.
