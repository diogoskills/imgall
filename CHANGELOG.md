# Changelog

## 2.10.0 — 2026-10-17

- Biblioteca com exportação/importação explicitamente .json, validada no seletor e no conteúdo. A orientação JSON-only substitui a alternância automática para ZIP; JSON até 16 MB de imagens/28 MB de arquivo.
- Todos os ZIPs da Biblioteca incluem manifest.json validado, árvore completa, vínculos e metadados, com nomes seguros, bytes originais e seleção sem sobreposição.
- Hierarquia até 32 níveis com guias, recuos, ícones, referências de imagens, contagens e expansão persistida; esquema IndexedDB preservado.
- Seleção compartilhada, Ctrl/clique, Shift/clique, Ctrl+G no ancestral comum, Delete com confirmação e menus contextuais de grupos/imagens. Operações de mover/excluir reutilizadas nas ações antigas.
- Limpeza total transacional com confirmação APAGAR, preservando preferências gerais e Downloads.
- Grade 1/2/3 colunas responsiva e persistida; Donate com animação leve e reduced-motion.
- Documentação, traduções, testes de hierarquia/seleção/exportação/segurança e pacote atualizados.

## 2.9.0 — 2026-10-17

- Seleção exclusiva de imagens: bloqueio de interações com links, áudio/vídeo, controles e iframes enquanto ativo; rolagem e Shadow DOM preservados, liberação por ESC/Parar seleção/fechamento do painel, cliques sintéticos ignorados.
- Feedback de salvamento por imagem com destino/contagem, lembrança de Biblioteca/pasta e nomes iguais permitidos para conteúdos distintos. Investigação não reproduziu perda nas gravações da 2.8; regressão executa 2/5/10 imagens e 10 gravações simultâneas nas duas versões.
- Organização Grupos → Conjuntos → Itens (imagens), árvore expansível, mover conjuntos e exclusão com confirmação; dados anteriores mantidos.
- Selecionar/desmarcar todas as pastas e botão .ZIP fixo; grupos incluem conjuntos e não geram ZIPs repetidos quando pai/filho estão marcados.
- Exportar/Importar Biblioteca visíveis; JSON v2 com Base64 até 16 MB, ZIP com JSON e originais acima disso. ZIPs v1 continuam importáveis.
- Importação sempre cria uma Biblioteca independente, com nome único, sem substituir anteriores. Esquema IndexedDB 2 migra o acervo principal sem regravar imagens; arquivos idênticos são compartilhados entre Bibliotecas.
- Limites de resolução para novos arquivos da Biblioteca (64 MP/32.768 px por lado), com inspeção antecipada de cabeçalhos raster comuns contra imagens de dimensões abusivas; download direto anterior preservado.
- Revisão de segurança: CSP explícita bloqueia scripts remotos/inline, objetos e frames; nomes importados tratados como texto; URLs do backup ignoradas; testes de injeção e isolamento.
- Validação de Base64, formatos, metadados, hashes, hierarquia e limites; importação atômica e relatório de arquivos explicitamente indisponíveis.
- Donate atualizado para Ko-fi de diogoskills em config.js, mantendo o botão próprio e nenhuma dependência remota.
- Documentação, traduções PT-BR/EN/ES e pacote de publicação 2.9.0 atualizados.

## 2.8.0 — 2026-10-17

- Biblioteca permanente em janela independente: pastas, contagens, busca, Grade/Lista, seleção múltipla, mover, copiar, renomear e excluir referências.
- Salvamento dos arquivos originais em IndexedDB pelo painel, com criação de pasta no diálogo e sincronização entre interfaces. SHA-256 identifica conteúdo duplicado; uma imagem ocupa um único arquivo local mesmo em várias pastas.
- Downloads locais individuais em sequência, ZIP por seleção e exportação de várias pastas em ZIPs separados, com progresso, nomes únicos e falhas parciais.
- Exportar/Importar Biblioteca: backup ZIP STORE v1 com metadados, validação de estrutura, caminhos, CRC, assinaturas, hashes e limites; mesclagem sem sobrescrever e substituição confirmada em transação atômica.
- Mesmo componente de cartão, codificador ZIP e monitor de download nas duas interfaces. Seleção e coleta temporária anteriores preservadas.
- Donate próprio com borda neon discreta; ícone X; links públicos centralizados em `config.js`. Sem scripts remotos, contas ou novas permissões.
- Interface nova em português brasileiro, inglês e espanhol, respeitando o idioma já escolhido.
- Processo reproduzível `npm run build` gera pacote de publicação com lista explícita de arquivos.

## 2.7.0

- Português brasileiro padrão, inglês/espanhol e preferência de idioma persistente.
- Donate com abertura da página Livepix em nova aba.

O histórico detalhado anterior permanece em README.md, CHECKPOINT.md e Git.
