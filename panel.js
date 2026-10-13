'use strict';
const $ = id => document.getElementById(id);
let tabId = null, current = { status: 'idle', item: null }, request = 0, displayed = null;
function notice(text) { $('feedback').textContent = text || ''; $('feedback').hidden = !text; }
function render(value) {
  current = value;
  const item = value.item;
  $('count').textContent = item ? '1 imagem' : '0 imagens';
  $('empty').hidden = !!item;
  $('selection').hidden = !item;
  const selecting = value.status === 'selecting';
  const resolving = value.status === 'resolving';
  $('dot').classList.toggle('active', selecting || resolving || value.status === 'downloading');
  $('status-label').textContent = ({ idle: 'Pronto para selecionar', selecting: 'Selecione uma imagem na página', resolving: 'Buscando a maior imagem disponível', ready: 'Confira antes de baixar', downloading: 'Download solicitado', downloaded: 'Imagem salva', error: 'Precisamos da sua atenção' })[value.status] || 'Pronto para selecionar';
  $('empty-title').innerHTML = selecting ? 'Um clique na página.<br>A prévia aparece aqui.' : 'Sua próxima imagem<br>começa com um clique.';
  $('empty-description').textContent = selecting ? 'Passe o mouse sobre a foto e clique para selecionar. Nenhum arquivo será baixado ainda.' : 'Use “Selecionar imagem” e clique na foto que chamou sua atenção.';
  if (resolving) { $('empty-title').textContent = 'Procurando a melhor versão.'; $('empty-description').textContent = 'Aguarde alguns segundos. Vamos conferir o arquivo antes de mostrar sua prévia.'; }
  $('select').disabled = selecting || resolving || value.status === 'downloading' || !tabId;
  $('remove').disabled = value.status === 'downloading';
  $('download').disabled = !item || !['ready', 'error'].includes(value.status);
  $('download-label').textContent = value.status === 'downloading' ? 'Baixando…' : value.status === 'downloaded' ? 'Imagem salva ✓' : 'Baixar imagem';
  notice(value.error);
  if (!item) { displayed = null; $('preview').removeAttribute('src'); return; }
  $('filename').textContent = item.filename;
  $('filename').title = item.filename;
  $('source').textContent = new URL(item.url).hostname;
  $('source').title = new URL(item.url).hostname;
  const ext = /\.(jpg|jpeg|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i.exec(item.filename)?.[1];
  $('format').textContent = ext ? ext.toUpperCase() : 'IMAGEM';
  if (displayed !== item.id) {
    displayed = item.id;
    $('dimensions').textContent = 'Verificando prévia…';
    $('preview').hidden = false; $('preview-fallback').hidden = true;
    // Display the chosen high-resolution resource at a small CSS size only.
    $('preview').src = item.url;
  }
}
$('preview').addEventListener('load', () => {
  $('dimensions').textContent = `${$('preview').naturalWidth} × ${$('preview').naturalHeight} px`;
});
$('preview').addEventListener('error', () => {
  $('preview').hidden = true; $('preview-fallback').hidden = false;
  $('dimensions').textContent = 'Prévia indisponível';
});
async function refresh() {
  const revision = ++request;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (revision !== request) return;
    tabId = tab?.id || null;
    if (!tabId) { render({ status: 'idle', item: null }); return; }
    const response = await chrome.runtime.sendMessage({ type: 'CLICKIMAGE_STATE', tabId });
    if (revision !== request) return;
    if (!response?.ok) throw new Error(response?.error || 'Não foi possível ler a seleção.');
    render(response.state);
  } catch (error) { notice(error.message); }
}
async function command(type, extra = {}) {
  if (!tabId) return;
  try {
    const response = await chrome.runtime.sendMessage({ type, tabId, ...extra });
    await refresh();
    if (!response?.ok) notice(response?.error || 'Não foi possível concluir a ação.');
  } catch { notice('A extensão foi atualizada. Feche e abra o painel novamente.'); }
}
$('select').addEventListener('click', () => { $('select').disabled = true; command('CLICKIMAGE_SELECT'); });
$('remove').addEventListener('click', () => command('CLICKIMAGE_CLEAR'));
$('download').addEventListener('click', () => {
  if (!current.item || $('download').disabled) return;
  $('download').disabled = true;
  command('CLICKIMAGE_CONFIRM', { itemId: current.item.id });
});
$('help').addEventListener('click', () => { $('help-text').hidden = !$('help-text').hidden; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && tabId && changes[`clickimage:${tabId}`]) render(changes[`clickimage:${tabId}`].newValue || { status: 'idle', item: null });
});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((id, change) => { if (id === tabId && change.status === 'complete') refresh(); });
refresh();
