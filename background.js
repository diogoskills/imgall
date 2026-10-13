'use strict';
importScripts('image-utils.js');
const pending = new Map();
const sessions = new Map();
const activating = new Set();
const busy = new Set();
function badge(tabId, text, title) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  chrome.action.setTitle({ tabId, title }).catch(() => {});
}
// Chrome supplies the response MIME here, before the final filename is chosen.
// Restrict suggestions to downloads initiated by this extension.
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.byExtensionId !== chrome.runtime.id) { suggest(); return; }
  const url = ClickImageUtils.validateUrl(item.url);
  if (!url) { suggest(); return; }
  suggest({ filename: ClickImageUtils.filename(url, item.mime), conflictAction: 'uniquify' });
});
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || activating.has(tab.id) || busy.has(tab.id)) return;
  activating.add(tab.id);
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['image-utils.js', 'content.js'] });
    const token = crypto.randomUUID();
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'CLICKIMAGE_ACTIVATE', token });
    if (result?.accepted === false) return;
    sessions.set(tab.id, token);
    badge(tab.id, '', 'ClickImage — selecionar imagem');
  } catch {
    badge(tab.id, '!', 'ClickImage: esta página não permite extensões. Abra uma página HTTP/HTTPS.');
  } finally { activating.delete(tab.id); }
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const tabId = sender.tab?.id;
  if (sender.id !== chrome.runtime.id || !tabId || sender.frameId !== 0 || message?.type !== 'CLICKIMAGE_DOWNLOAD') return;
  const url = ClickImageUtils.validateUrl(message.url);
  if (!url || typeof message.token !== 'string' || sessions.get(tabId) !== message.token) {
    reply({ ok: false, error: 'A imagem não possui um endereço compatível ou a seleção expirou.' });
    return;
  }
  sessions.delete(tabId); // Consume before awaiting: one download per activation.
  busy.add(tabId);
  chrome.downloads.download({ url, filename: ClickImageUtils.filename(url), conflictAction: 'uniquify', saveAs: false }).then(id => {
    pending.set(id, tabId);
    reply({ ok: true });
  }).catch(() => reply({ ok: false, error: 'Não foi possível iniciar o download. O site pode restringir esse recurso.' })).finally(() => busy.delete(tabId));
  return true;
});
chrome.downloads.onChanged.addListener(delta => {
  if (!pending.has(delta.id)) return;
  const tabId = pending.get(delta.id);
  if (delta.state?.current === 'interrupted') {
    chrome.tabs.sendMessage(tabId, { type: 'CLICKIMAGE_ERROR', error: 'Download interrompido. Confira a lista de downloads do Chrome.' }).catch(() => {});
    badge(tabId, '!', 'ClickImage: download interrompido; confira os downloads do Chrome.');
  }
  if (['complete', 'interrupted'].includes(delta.state?.current)) pending.delete(delta.id);
});
chrome.tabs.onRemoved.addListener(id => sessions.delete(id));
