# Changelog

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
