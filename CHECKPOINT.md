# Checkpoint geral — ClickImage 2.6.0

Estado salvo antes das próximas mudanças e da futura etapa de backend.

- Branch de desenvolvimento: `work`.
- Branch de checkpoint: `checkpoint/pre-backend-v2.6.0`.
- Tag de referência: `checkpoint-pre-backend-v2.6.0`.
- Commit da implementação desta versão: `c4fa7c73237ee9d89d0663d6d66f3d371f4fd5f3`.
- A branch e a tag do checkpoint incluem esta documentação em um commit posterior, sem alterações no código da extensão.

## Funcionalidades neste estado

- Seleção ativada pelo botão do painel, com indicador visível, captura contínua e cancelamento por ESC ou fechamento do painel.
- Busca pela maior imagem acessível declarada em HTML, `srcset`, atributos, links e fontes próximas à imagem selecionada, sem screenshot ou redimensionamento.
- Seleção sob overlays transparentes, respeitando recortes e controles; thumbnails estáticas do YouTube e posters estáticos declarados.
- Prévia antes do download, edição de nomes, remoção individual e limpeza da coleção.
- Formato identificado, resolução real e tamanho quando disponíveis.
- Lista e Grade com preferências salvas; espaçamento corrigido e rolagem. Pasta com imagens maiores.
- Copiar URL, pesquisar no Google Lens e abrir o original em nova aba; clique do meio na Pasta e tentativa de zoom de 100% limitada à nova aba.
- Conversão de WebP estático para PNG em beta, preservando a opção de baixar o original.
- Lote individual sequencial ou ZIP com bytes originais, nomes únicos, deduplicação por URL, progresso e tratamento de falhas parciais.

## Verificação e limites conhecidos

Na entrega 2.6.0, passaram 34 testes unitários, verificações de sintaxe e os testes de interface no Chromium. A integridade do ZIP foi conferida pela biblioteca `zipfile` do Python, incluindo CRC, nomes UTF-8 e igualdade dos bytes extraídos.

As APIs Chrome são simuladas nos testes deste ambiente. Downloads nativos, ciclo de vida do painel instalado e zoom devem ser conferidos no Chrome local. Testes anteriores de compatibilidade usaram cenários sintéticos; tentativas de acesso aos sites reais receberam HTTP 403 do proxy. Não há garantia de acesso a originais privados, não publicados ou bloqueados pelo site.

O ZIP depende de leitura autorizada por CORS e exige manter o painel visível na mesma aba até concluir. Limites: 32 MB por recurso, 128 MB no conjunto, 1.000 URLs únicas e 20 segundos por leitura. O zoom de 100% da aba não elimina o ajuste de imagens grandes à janela feito pelo visualizador do Chrome. Consulte o README para os demais detalhes e limites da conversão beta.

## Como retomar este estado

Para inspecionar a versão preservada sem alterar `work`:

```bash
git fetch origin --tags
git switch --detach checkpoint-pre-backend-v2.6.0
```

Para iniciar novas alterações a partir dela, com um nome de branch ainda não utilizado:

```bash
git switch -c retomada/checkpoint-geral checkpoint-pre-backend-v2.6.0
```

Para voltar ao desenvolvimento atual:

```bash
git switch work
```

Guarde ou faça commit de mudanças locais antes de trocar de checkout. A retomada não exige `reset --hard`, force-push ou reescrita de histórico. Preserve a branch e a tag do checkpoint; prossiga com mudanças novas em `work`.

## Próxima etapa

O usuário enviará as instruções no momento certo. Backend, Mercado Pago, e-mail e envio de códigos são assuntos previstos para essa etapa; nenhuma integração, credencial, cobrança ou envio de mensagem foi implementado neste checkpoint.
