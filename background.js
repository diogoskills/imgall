'use strict';
importScripts('image-utils.js');
const locks = new Map();
const stateKey = id => `clickimage:${id}`;
const downloadKey = id => `clickimage-download:${id}`;
function locked(tabId, action) {
  const result = (locks.get(tabId) || Promise.resolve()).catch(() => {}).then(action);
  locks.set(tabId, result);
  result.finally(() => { if (locks.get(tabId) === result) locks.delete(tabId); }).catch(() => {});
  return result;
}
async function state(tabId) {
  const value = (await chrome.storage.session.get(stateKey(tabId)))[stateKey(tabId)] || { status: 'idle', items: [] };
  // Migrate previews from ClickImage 2.0 within the current browser session.
  if (!Array.isArray(value.items)) value.items = value.item ? [{ ...value.item, status: value.status === 'downloaded' ? 'downloaded' : 'ready' }] : [];
  delete value.item;
  return value;
}
async function save(tabId, value) { await chrome.storage.session.set({ [stateKey(tabId)]: value }); }
function badge(tabId, text, title) {
  chrome.action.setBadgeBackgroundColor({tabId,color:'#8b5cf6'}).catch(()=>{});
  chrome.action.setBadgeText({tabId,text}).catch(()=>{});
  chrome.action.setTitle({tabId,title}).catch(()=>{});
}
chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.sidePanel.open({tabId:tab.id}).catch(()=>badge(tab.id,'!','Não foi possível abrir o painel ClickImage.'));
});
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.byExtensionId !== chrome.runtime.id) { suggest(); return; }
  if (!ClickImageUtils.validateUrl(item.url)) { suggest(); return; }
  // Use the saved requested title, including when the worker was suspended.
  chrome.storage.session.get(null).then(values => {
    const tracking = values[downloadKey(item.id)];
    const requests = Object.entries(values).filter(([key])=>key.startsWith('clickimage:')).flatMap(([,value])=>value.items || []).filter(image=>image.url===item.url && image.status==='downloading');
    const title = tracking?.title ?? (requests.length === 1 ? requests[0].title : null);
    const name = title ? ClickImageUtils.downloadFilename(item.url,title,item.mime) : requests.length > 1 && item.filename ? ClickImageUtils.filename('https://filename.invalid/'+encodeURIComponent(item.filename.split(/[/\\]/).pop()),item.mime) : ClickImageUtils.filename(item.url,item.mime);
    suggest({filename:name,conflictAction:'uniquify'});
  }).catch(()=>suggest());
  return true;
});
async function activate(tabId) {
  const current = await state(tabId);
  if (['selecting','resolving'].includes(current.status)) return {ok:false,error:'A seleção já está ativa. ESC cancela.'};
  try {
    await chrome.scripting.executeScript({target:{tabId},files:['image-utils.js','content.js']});
    const token = crypto.randomUUID();
    const result = await chrome.tabs.sendMessage(tabId,{type:'CLICKIMAGE_ACTIVATE',token});
    if (result?.accepted === false) return {ok:false,error:'Aguarde a busca atual.'};
    await save(tabId,{...current,status:'selecting',selectionToken:token,error:null});
    return {ok:true};
  } catch {
    const error='Abra uma página HTTP/HTTPS e clique no ícone da extensão nessa aba para permitir a seleção.';
    await save(tabId,{...current,status:'error',error});
    return {ok:false,error};
  }
}
async function finishDownload(id, outcome, entry) {
  entry ||= (await chrome.storage.session.get(downloadKey(id)))[downloadKey(id)];
  if (!entry) return;
  const current = await state(entry.tabId);
  const item=current.items.find(image=>image.id===entry.itemId);
  if (item) {
    item.status=outcome==='complete'?'downloaded':'error';
    item.error=outcome==='complete'?null:'Download interrompido. Confira os downloads do Chrome ou tente novamente.';
    await save(entry.tabId,current);
  }
  await chrome.storage.session.remove(downloadKey(id));
}
async function confirm(tabId, itemId) {
  const current=await state(tabId);
  const item=current.items.find(image=>image.id===itemId);
  if (!item || !['ready','error'].includes(item.status)) return {ok:false,error:'Esta imagem já foi solicitada ou não está disponível.'};
  const url=ClickImageUtils.validateUrl(item.url);
  if (!url) return {ok:false,error:'URL inválida.'};
  item.status='downloading';item.error=null;
  await save(tabId,current);
  let started=false;
  try {
    const id=await chrome.downloads.download({url,filename:ClickImageUtils.downloadFilename(url,item.title),conflictAction:'uniquify',saveAs:false});
    started=true;item.downloadId=id;
    const entry={tabId,itemId,title:item.title || ''};
    await chrome.storage.session.set({[downloadKey(id)]:entry});
    await save(tabId,current);
    const [download]=await chrome.downloads.search({id});
    if (download && ['complete','interrupted'].includes(download.state)) await finishDownload(id,download.state,entry);
    return {ok:true};
  } catch {
    if (started) return {ok:true};
    item.status='error';item.error='Não foi possível iniciar o download. A URL pode ter expirado.';
    await save(tabId,current);return {ok:false,error:item.error};
  }
}
function panelSender(sender) { return sender.id===chrome.runtime.id && sender.url===chrome.runtime.getURL('panel.html') && !sender.tab; }
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if (sender.id!==chrome.runtime.id || !message || typeof message.type!=='string') return;
  const isPanel=panelSender(sender),tabId=isPanel?message.tabId:sender.tab?.id;
  if (!Number.isInteger(tabId) || tabId<=0 || (!isPanel && sender.frameId!==0)) return;
  const panelTypes=['CLICKIMAGE_STATE','CLICKIMAGE_SELECT','CLICKIMAGE_STOP','CLICKIMAGE_CONFIRM','CLICKIMAGE_REMOVE','CLICKIMAGE_RENAME'];
  const contentTypes=['CLICKIMAGE_PREVIEW','CLICKIMAGE_CANCELLED','CLICKIMAGE_RESOLVING'];
  if (!(isPanel?panelTypes:contentTypes).includes(message.type)) return;
  locked(tabId,async()=>{
    if (isPanel) {
      if (message.type==='CLICKIMAGE_SELECT') return activate(tabId);
      if (message.type==='CLICKIMAGE_CONFIRM') return confirm(tabId,message.itemId);
      const current=await state(tabId);
      if (message.type==='CLICKIMAGE_STOP') {
        delete current.selectionToken;current.status='idle';current.error=null;
        await chrome.tabs.sendMessage(tabId,{type:'CLICKIMAGE_CANCEL'}).catch(()=>{});
        await save(tabId,current);return {ok:true};
      }
      if (message.type==='CLICKIMAGE_STATE') {
        for (const item of current.items.filter(image=>image.status==='downloading' && Number.isInteger(image.downloadId))) {
          const [download]=await chrome.downloads.search({id:item.downloadId});
          if (download && ['complete','interrupted'].includes(download.state)) await finishDownload(download.id,download.state);
        }
        return {ok:true,state:await state(tabId)};
      }
      const item=current.items.find(image=>image.id===message.itemId);
      if (!item || item.status==='downloading') return {ok:false,error:'Aguarde o download ou selecione uma imagem válida.'};
      if (message.type==='CLICKIMAGE_RENAME') {
        if (typeof message.title!=='string' || !ClickImageUtils.safeTitle(message.title)) return {ok:false,error:'Digite um nome válido para a imagem.'};
        item.title=ClickImageUtils.safeTitle(message.title);
      } else current.items=current.items.filter(image=>image.id!==message.itemId);
      await save(tabId,current);return {ok:true};
    }
    const current=await state(tabId);
    if (!['selecting','resolving'].includes(current.status) || typeof message.token!=='string' || current.selectionToken!==message.token) return {ok:false,error:'Seleção expirada. Clique em Caçar imagem.'};
    if (message.type==='CLICKIMAGE_RESOLVING') { await save(tabId,{...current,status:'resolving'});return {ok:true}; }
    current.error=null;
    if (message.type==='CLICKIMAGE_CANCELLED') { delete current.selectionToken;current.status='idle'; }
    if (message.type==='CLICKIMAGE_PREVIEW') {
      const url=ClickImageUtils.validateUrl(message.url);
      if (!url) {await save(tabId,current);return {ok:false,error:'Imagem sem URL direta válida.'};}
      // Repeated selections should not fill the list with the same resource.
      if (!current.items.some(image=>image.url===url)) current.items.push({id:crypto.randomUUID(),url,filename:ClickImageUtils.filename(url),title:'',status:'ready',label:typeof message.label==='string'?message.label.slice(0,200):'Imagem selecionada'});
      current.status='selecting';
    }
    await save(tabId,current);return {ok:true};
  }).then(reply).catch(()=>reply({ok:false,error:'Não foi possível atualizar o painel. Tente novamente.'}));
  return true;
});
chrome.downloads.onChanged.addListener(delta=>{
  if (!['complete','interrupted'].includes(delta.state?.current)) return;
  chrome.storage.session.get(downloadKey(delta.id)).then(values=>{
    const entry=values[downloadKey(delta.id)];
    if (entry) return locked(entry.tabId,()=>finishDownload(delta.id,delta.state.current,entry));
  }).catch(()=>{});
});
chrome.tabs.onRemoved.addListener(tabId=>{
  locked(tabId,()=>chrome.storage.session.remove(stateKey(tabId))).catch(()=>{});
});
