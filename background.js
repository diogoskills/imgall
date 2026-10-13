'use strict';
importScripts('image-utils.js');
const pending = new Map();
const sessions = new Map();
const activating = new Set();
const busy = new Set();
const processing = new Set();
const downloadKey = id => `clickimage-download:${id}`;
const stateKey = tabId => `clickimage:${tabId}`;
async function state(tabId) {
  return (await chrome.storage.session.get(stateKey(tabId)))[stateKey(tabId)] || { status: 'idle', item: null };
}
async function save(tabId, value) {
  await chrome.storage.session.set({ [stateKey(tabId)]: value });
}
function badge(tabId, text, title) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#8b5cf6' }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  chrome.action.setTitle({ tabId, title }).catch(() => {});
}
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.byExtensionId !== chrome.runtime.id) { suggest(); return; }
  const url = ClickImageUtils.validateUrl(item.url);
  if (!url) { suggest(); return; }
  suggest({ filename: ClickImageUtils.filename(url, item.mime), conflictAction: 'uniquify' });
});
async function activate(tabId) {
  if (activating.has(tabId) || busy.has(tabId)) return { ok: false, error: 'Aguarde a operação atual.' };
  activating.add(tabId);
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['image-utils.js', 'content.js'] });
    const token = crypto.randomUUID();
    const result = await chrome.tabs.sendMessage(tabId, { type: 'CLICKIMAGE_ACTIVATE', token });
    if (result?.accepted === false) return { ok: false, error: 'Seleção cancelada ou busca em andamento.' };
    sessions.set(tabId, token);
    await save(tabId, { status: 'selecting', item: null, selectionToken: token });
    badge(tabId, '', 'ClickImage — selecione uma imagem');
    return { ok: true };
  } catch {
    const error = 'Esta página não permite seleção. Abra uma página HTTP/HTTPS e clique no ícone da extensão.';
    await save(tabId, { status: 'error', item: null, error });
    badge(tabId, '!', error);
    return { ok: false, error };
  } finally { activating.delete(tabId); }
}
chrome.action.onClicked.addListener(tab => {
  if (!tab.id) return;
  // Call open directly within the toolbar gesture (Chrome 116+).
  chrome.sidePanel.open({ tabId: tab.id }).then(async () => {
    // Reopening the panel must preserve an image awaiting confirmation.
    const current = await state(tab.id);
    if (!current.item) await activate(tab.id);
  }).catch(() => {
    badge(tab.id, '!', 'Não foi possível abrir o painel ClickImage.');
  });
});
function panelSender(sender) {
  return sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('panel.html') && !sender.tab;
}
async function confirm(tabId, itemId) {
  if (busy.has(tabId)) return { ok: false, error: 'Download já solicitado.' };
  busy.add(tabId);
  try {
    const current = await state(tabId);
    if (!current.item || current.item.id !== itemId || !['ready', 'error'].includes(current.status)) return { ok: false, error: 'Selecione uma imagem antes de baixar.' };
    const url = ClickImageUtils.validateUrl(current.item.url);
    if (!url) return { ok: false, error: 'URL de imagem inválida.' };
    await save(tabId, { ...current, status: 'downloading', error: null });
    let started = false;
    try {
      const id = await chrome.downloads.download({ url, filename: ClickImageUtils.filename(url), conflictAction: 'uniquify', saveAs: false });
      started = true;
      pending.set(id, { tabId, itemId });
      await chrome.storage.session.set({[downloadKey(id)]:{tabId,itemId}});
      await save(tabId, {...current,status:'downloading',error:null,downloadId:id});
      const [download] = await chrome.downloads.search({id});
      if (download && ['complete','interrupted'].includes(download.state)) await finishDownload(id,download.state);
      return { ok: true };
    } catch {
      if (started) return {ok:true}; // Never retry a started download automatically.
      const error = 'Não foi possível baixar. O site pode restringir o arquivo ou a URL pode ter expirado.';
      await save(tabId, { ...current, status: 'error', error });
      return { ok: false, error };
    }
  } finally { busy.delete(tabId); }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message.type !== 'string') return;
  if (panelSender(sender)) {
    const tabId = message.tabId;
    if (!Number.isInteger(tabId) || tabId <= 0) { reply({ ok: false, error: 'Aba indisponível.' }); return; }
    let operation;
    if (message.type === 'CLICKIMAGE_STATE') operation = (async()=>{
      const value = await state(tabId);
      if (value.status === 'downloading' && Number.isInteger(value.downloadId)) {
        const [download] = await chrome.downloads.search({id:value.downloadId});
        if (download && ['complete','interrupted'].includes(download.state)) await finishDownload(download.id,download.state);
      }
      return {ok:true,state:await state(tabId)};
    })();
    else if (message.type === 'CLICKIMAGE_SELECT') operation = activate(tabId);
    else if (message.type === 'CLICKIMAGE_CONFIRM' && typeof message.itemId === 'string') operation = confirm(tabId, message.itemId);
    else if (message.type === 'CLICKIMAGE_CLEAR') operation = (async () => {
      if (busy.has(tabId)) return { ok: false, error: 'Aguarde o download.' };
      sessions.delete(tabId);
      await chrome.tabs.sendMessage(tabId, { type: 'CLICKIMAGE_CANCEL' }).catch(() => {});
      await save(tabId, { status: 'idle', item: null });
      return { ok: true };
    })();
    else return;
    operation.then(reply).catch(() => reply({ ok: false, error: 'Não foi possível atualizar o painel.' }));
    return true;
  }
  const tabId = sender.tab?.id;
  if (!tabId || sender.frameId !== 0 || typeof message.token !== 'string') return;
  if (processing.has(tabId)) { reply({ok:false,error:'Seleção já processada.'}); return; }
  // Restore an active selection after worker suspension. Session storage is
  // restricted to trusted extension contexts, never exposed to the page.
  if (!sessions.has(tabId)) {
    if (!['CLICKIMAGE_PREVIEW', 'CLICKIMAGE_CANCELLED', 'CLICKIMAGE_RESOLVING'].includes(message.type)) return;
    state(tabId).then(current => {
      if (!['selecting','resolving'].includes(current.status) || current.selectionToken !== message.token) { reply({ok:false,error:'Seleção expirada. Selecione novamente.'}); return; }
      sessions.set(tabId, message.token);
      handleSelection(message, tabId, reply);
    }).catch(() => reply({ok:false,error:'Selecione novamente.'}));
    return true;
  }
  if (sessions.get(tabId) !== message.token) return;
  return handleSelection(message, tabId, reply);
});
function handleSelection(message, tabId, reply) {
  if (sessions.get(tabId) !== message.token) { reply({ok:false,error:'Seleção já processada.'}); return; }
  if (message.type === 'CLICKIMAGE_RESOLVING') {
    save(tabId,{status:'resolving',item:null,selectionToken:message.token}).then(()=>reply({ok:true})).catch(()=>reply({ok:false}));
    return true;
  }
  if (message.type === 'CLICKIMAGE_CANCELLED') {
    processing.add(tabId);
    sessions.delete(tabId);
    save(tabId, { status: 'idle', item: null }).then(() => reply({ ok: true })).catch(()=>reply({ok:false})).finally(()=>processing.delete(tabId));
    return true;
  }
  if (message.type !== 'CLICKIMAGE_PREVIEW') return;
  processing.add(tabId);
  const url = ClickImageUtils.validateUrl(message.url);
  sessions.delete(tabId);
  if (!url) { const error = 'A imagem não possui endereço direto compatível.'; save(tabId,{status:'error',item:null,error}).then(()=>reply({ok:false,error})).catch(()=>reply({ok:false,error})).finally(()=>processing.delete(tabId)); return true; }
  const item = { id: crypto.randomUUID(), url, previewUrl: ClickImageUtils.validateUrl(message.previewUrl) || url, filename: ClickImageUtils.filename(url), label: typeof message.label === 'string' ? message.label.slice(0, 200) : 'Imagem selecionada' };
  save(tabId, { status: 'ready', item }).then(() => reply({ ok: true })).catch(() => reply({ ok: false, error: 'Não foi possível guardar a prévia.' })).finally(()=>processing.delete(tabId));
  return true;
}
async function finishDownload(id, outcome) {
  const entry = pending.get(id) || (await chrome.storage.session.get(downloadKey(id)))[downloadKey(id)];
  if (!entry) return;
  const current = await state(entry.tabId);
  if (current.item?.id === entry.itemId && current.downloadId !== id) return;
  pending.delete(id);
  await chrome.storage.session.remove(downloadKey(id));
  if (current.item?.id !== entry.itemId) return;
  const failed = outcome === 'interrupted';
  await save(entry.tabId, { ...current, status: failed ? 'error' : 'downloaded', error: failed ? 'Download interrompido. Tente novamente ou confira os downloads do Chrome.' : null });
}
chrome.downloads.onChanged.addListener(delta => {
  if (['complete', 'interrupted'].includes(delta.state?.current)) finishDownload(delta.id,delta.state.current).catch(()=>{});
});
chrome.tabs.onRemoved.addListener(tabId => {
  sessions.delete(tabId);
  chrome.storage.session.remove(stateKey(tabId)).catch(() => {});
});
