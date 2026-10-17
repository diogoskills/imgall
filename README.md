# ClickImage

## Bibliotecas e organização — versão 2.9.0

O painel mantém a coleta temporária por aba. **Biblioteca** abre uma janela independente que pode ficar aberta durante a navegação. O Chrome permite posicioná-la manualmente; não é possível acoplar outra janela ao side panel ou garantir que fique sempre por cima.

### Grupos → Conjuntos → Itens

Use o seletor **Biblioteca** para alternar entre acervos independentes. **Nova Biblioteca** cria um acervo vazio e o lápis altera seu nome. Cada um tem suas próprias pastas, nomes e referências.

- **+** na seção **Grupos** cria um grupo no primeiro nível. As pastas existentes da 2.8 viram grupos, mantendo nomes, IDs e imagens.
- **Novo conjunto** no cabeçalho do grupo cria uma pasta dentro dele. A seta ao lado do grupo expande/recolhe seus conjuntos.
- Os **itens** são as imagens. Um grupo também pode manter imagens diretamente, preservando a organização anterior. Conjuntos não contêm outros conjuntos.
- **Mover grupo ou conjunto** permite colocar um conjunto em outro grupo ou no primeiro nível. Ciclos e níveis extras são rejeitados. Renomear/excluir continuam disponíveis; excluir um grupo pede confirmação e também remove seus conjuntos. Imagens referenciadas por outras pastas ou Bibliotecas permanecem disponíveis.
- Busca por nome na pasta aberta, Grade/Lista, seleção múltipla, nomes editáveis, mover/copiar/remover imagens e abertura local em tamanho natural continuam funcionando.

### Seleção exclusiva de imagens

Enquanto **Caçar imagem** está ativo, uma camada transparente captura os cliques na página e só aceita imagens/posters identificados. Links, botões, controles de vídeo/áudio, cliques do meio/direito e frames de outras origens não recebem os cliques. O cursor fica bloqueado sobre áreas não selecionáveis e a mensagem orienta a usar **Parar seleção** ou **ESC** para navegar normalmente. Cliques sintéticos disparados pelo site não entram na coleta.

A rolagem continua disponível, inclusive em contêineres internos. O inspetor lê os elementos reais sob a camada e raízes Shadow DOM abertas. ESC, Parar seleção, fechamento do painel ou desconexão removem o bloqueio e seus listeners. Tab e atalhos do navegador permanecem disponíveis; teclas de ação/edição na página são bloqueadas durante a caça. Vídeos não são capturados como arquivo: somente posters estáticos continuam elegíveis.

### Salvar pelo painel

Clique no marcador **Salvar na Biblioteca**, escolha **Biblioteca** e **Pasta de destino**, e confirme. O diálogo mostra `Grupo / Conjunto` e permite criar um grupo. O último destino utilizado é lembrado. Cada cartão mostra salvando, sucesso com pasta/contagem, duplicidade ou erro; um erro não apaga sucessos anteriores. A duplicidade considera o **SHA-256 dos bytes**, sem usar nomes de arquivos. Arquivos diferentes com o mesmo nome podem coexistir.

A investigação da 2.8 não reproduziu perda no armazenamento com 2, 5 e 10 imagens distintas de nomes iguais, nem com 10 gravações simultâneas. A 2.9 reforça o destino explícito e o feedback individual; esses mesmos cenários são executados na versão nova com PNGs visualmente diferentes. Bloqueio de leitura pelo site (CORS), URL expirada e falta de espaço continuam possíveis e são reportados, sem marcar o item como salvo.

### ZIPs de imagens

Marque grupos/conjuntos na coluna esquerda ou use **Selecionar todas** para marcar/desmarcar todos. O botão **.ZIP**, fixo abaixo da lista e acima do armazenamento, só habilita com seleção. Apenas a lista rola.

Cada raiz selecionada gera um ZIP com seu próprio nome. Um grupo inclui as imagens de seus conjuntos em subdiretórios. Se o grupo e um de seus conjuntos estiverem marcados, o conjunto já incluído não gera um segundo download. Cada arquivo idêntico entra uma vez por ZIP; nomes repetidos recebem sufixos. A hierarquia e todas as referências, inclusive cópias em várias pastas, são preservadas integralmente no backup estruturado.

O botão principal sobre as imagens continua oferecendo arquivos individuais em sequência ou ZIP da seleção. Os dois fluxos usam o mesmo codificador ZIP STORE e o monitor de downloads existentes. Arquivos não são redimensionados ou recomprimidos; erros individuais não interrompem os demais. Pastas vazias são indicadas. Mantenha a janela aberta até finalizar: tarefas de preparação ainda em andamento não são retomadas após fechá-la.

### Exportar e Importar Biblioteca

Os dois botões ficam **visíveis acima da pesquisa**, sem menu secundário. Exportam a Biblioteca ativa, sem misturar outros acervos.

**Exportar Biblioteca** gera `<nome>-backup.json` para até **16 MB de imagens originais**. O JSON contém formato `clickimage-library`, versão **2**, nome/ID da Biblioteca, grupos/conjuntos com IDs e `parentId`, nomes por pasta, referências, datas, formato, MIME, dimensões, tamanho, SHA-256 e o conteúdo dos arquivos em Base64. Base64 não altera a qualidade; os bytes são reconstituídos na importação.

Acima de 16 MB, o mesmo botão gera automaticamente `<nome>-backup.zip`, com um JSON de metadados e os arquivos originais em `images/<sha256>.<extensão>`. A interface explica a alternativa. Base64 aumenta o arquivo em aproximadamente 33%, e o texto JSON também ocupa memória ao ser serializado; manter os arquivos binários no ZIP reduz esse custo. O ZIP não recomprime imagens. Há um limite de **128 MB de imagens + 4 MB de metadados** por backup; importações JSON aceitam até **28 MB de arquivo** e 16 MB de imagens decodificadas. Ainda não há backup incremental nem streaming.

**Importar Biblioteca** aceita JSON v2, ZIP v2 e backups ZIP v1 feitos pela 2.8. Cada importação cria **uma nova Biblioteca**, mesmo que o nome já exista: `Nome`, `Nome (2)`, `Nome (3)`. Nunca mescla, substitui ou apaga automaticamente a anterior. IDs de Biblioteca/pastas são remapeados, referências são preservadas, e os arquivos de mesmo conteúdo são compartilhados localmente entre acervos para evitar armazenamento redundante.

A estrutura, versão, caminhos ZIP, CRC, Base64, formato real, tamanho, SHA-256 e hierarquia são validados antes da gravação. Formatos desconhecidos, corrupção e hierarquias cíclicas ou com níveis extras são rejeitados. Falhas de quota ou interrupção abortam a transação completa, sem deixar uma Biblioteca parcialmente criada nem alterar as anteriores. Não se executa código importado e não se extrai conteúdo para caminhos do sistema.

Se o arquivo já estiver indisponível no acervo, a exportação registra a referência como `unavailable`, sem inventar conteúdo. Na importação, referências explicitamente indisponíveis são informadas por nome e contagem; somente imagens recuperadas são criadas. Conteúdo presente mas corrompido causa rejeição do backup. **URLs de origem não entram no backup**, pois links assinados podem conter tokens. Se o navegador já conhecer o mesmo arquivo, sua URL existente continua utilizável; caso contrário, copiar URL/Lens ficam desativados após importar, mas visualizar e baixar o arquivo local funcionam.

### Persistência, limites e privacidade

IndexedDB `clickimage-library`, esquema **2**, contém Bibliotecas, pastas, metadados, Blobs e referências. A atualização do esquema 1 ocorre em uma transação de migração que atribui as pastas antigas à Biblioteca principal, sem alterar seus arquivos ou referências. `chrome.storage.local` guarda preferências, destino recente e sinais de atualização. Arquivos não são guardados em localStorage. BroadcastChannel/storage atualizam as interfaces automaticamente.

Os limites são **globais no navegador**, não por Biblioteca: **50 Bibliotecas, 200 grupos/conjuntos, 5.000 arquivos únicos, 20.000 referências e 512 MB**, com até **32 MB por imagem, 64 megapixels e 32.768 px por lado** para novos arquivos. Imagens maiores continuam disponíveis para download direto pelo painel, sem conversão. A quota real depende do navegador/disco. A lista monta 60 cartões por vez com **Mostrar mais imagens** e libera URLs Blob de prévias removidas.

A Biblioteca aceita JPG, PNG, WEBP, AVIF, GIF, BMP, ICO e TIF; a visualização de TIF depende do navegador. SVG permanece fora da Biblioteca por segurança de conteúdo vetorial ativo importado; a coleta/download anteriores continuam funcionando. Não há servidores próprios, contas, sincronização em nuvem, scripts remotos nem novas permissões globais de sites. Os arquivos locais persistem ao reiniciar o navegador, mas remover a extensão, excluir seus dados ou perder o perfil/disco pode apagá-los. Mantenha backups.

### Segurança e alcance dos dados

Cada perfil do Chrome tem seu próprio IndexedDB. Não há banco compartilhado, API própria, contas ou sincronização entre usuários; BroadcastChannel e eventos de storage alcançam somente o contexto da extensão naquele perfil. Uma importação não escreve no navegador de outras pessoas. Um arquivo distribuído a terceiros precisa ser importado por cada destinatário, e por isso também tratamos perda e exposição de dados locais como riscos reais.

Backups são dados: nomes viram texto/valores de campos, nunca HTML executável; URLs de arquivos importados são ignoradas e a restauração não faz requisições externas. Scripts, HTML/SVG ativos, alterações de protótipo, caminhos inseguros e arquivos corrompidos não são executados. A extensão só escreve no seu armazenamento local e nos downloads solicitados. A CSP explícita permite scripts somente do pacote e bloqueia scripts inline, eval, objetos, frames, mudança de base e submissão de formulários. As exceções de rede continuam limitadas às ações já existentes: obter a imagem escolhida, abrir o link Donate/X e abrir Lens após o clique do usuário.

Limites de entradas/tamanho/dimensões, leitura antecipada de dimensões nos cabeçalhos raster comuns e validação sem descompactação de conteúdo comprimido reduzem abuso de memória e ZIP bombs. Uma falha não deve substituir acervos: importações usam transação atômica e Biblioteca nova. Essa revisão não equivale a uma auditoria independente do Chrome, dos codecs nativos ou de futuras funções de backend. Se houver servidores/contas no futuro, exigirão revisão própria de autorização e isolamento.

### Donate, validação e publicação

Os links públicos ficam exclusivamente em `config.js`: Donate abre **https://ko-fi.com/diogoskills** e X abre **https://x.com/diogoskills**. Os botões usam HTML/CSS/SVG próprios, o neon foi preservado e as novas abas usam `noopener noreferrer`. Nenhum widget ou script externo do Ko-fi é carregado.

```sh
npm run check
npm test
node tests/panel.cjs
node tests/browser.cjs
node tests/youtube.cjs
node tests/social.cjs
npm run test:library
npm run test:storage
npm run test:selection
npm run build
```

`tests/library-storage.cjs` cria dados com o código real da 2.8, testa migração, bytes, 2/5/10 salvamentos consecutivos e 10 simultâneos nas duas versões, nomes iguais, deduplicação, grupos/conjuntos e reinício do processo de Chromium com o mesmo perfil em disco. `tests/library.cjs` cobre os controles visíveis, salvamento/erros por cartão, contagens, ZIP fixo, seleção, hierarquia, JSON, importações independentes com nomes repetidos, conteúdo indisponível, quota, integridade e persistência. Testes unitários cobrem JSON, ZIP grande, importação legada e rejeições de segurança.

**Limite da validação automatizada:** IndexedDB, arquivos e codecs são reais; as APIs Chrome de janelas/downloads/preferências são simuladas. Instalação nativa, atualização no Chrome do usuário e sites reais autenticados ainda precisam de homologação manual. Fixtures não provam acesso em todos os sites.

`npm run build` gera **`dist/ClickImage-2.9.0.zip`**, com lista explícita de arquivos e manifesto na raiz, sem testes, documentos, Git, dados locais ou credenciais. Para carregar sem compactação, extraia e escolha a pasta que contém diretamente `manifest.json`. **Atualize na mesma pasta/ID e use Recarregar, sem remover a extensão**, para preservar dados. Feche janelas antigas da Biblioteca e reabra depois da atualização. Nenhuma publicação automática na Chrome Web Store é feita.

O restante deste README registra o seletor, os downloads e decisões de versões anteriores; os fluxos acima prevalecem para as Bibliotecas 2.9.


Extensão Manifest V3 para baixar o recurso de uma imagem selecionada na página, sem screenshots, recortes ou processamento do arquivo. JavaScript puro, HTML5, CSS3 e APIs do Chrome; sem servidor, telemetria ou código remoto; a Biblioteca usa IndexedDB local.

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

Permissões: `activeTab` e `scripting` para selecionar após sua ação; `downloads` para baixar após confirmação; `sidePanel` para a interface lateral; `storage` para guardar seleção e estado de download em `chrome.storage.session`. Preferências e Bibliotecas usam armazenamento local persistente; não há acesso permanente a todos os sites.

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

Na versão atual, o botão **Donate** mantém o estilo dark/roxo e abre o endereço configurado em `config.js` (`https://ko-fi.com/diogoskills`) em uma nova aba com `noopener noreferrer`. O link não interfere em downloads e não inicia pagamento automaticamente; a contribuição é feita pelo usuário no site externo. A integração Premium/Mercado Pago permanece fora desta alteração.

`npm test` cobre fallback, persistência, mensagens parametrizadas e metadados nativos. `node tests/panel.cjs` verifica os três idiomas, preferência após recarregar, acessibilidade, preservação de nomes, layout estreito e destino da doação. `node tests/browser.cjs` verifica a troca de idioma do indicador na página e o cancelamento sem reinjeção; nesse cenário controlado, a shadow root da interface é aberta apenas pelo teste para inspecionar seu texto. As APIs Chrome continuam simuladas nesses testes.
