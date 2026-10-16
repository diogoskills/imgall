'use strict';
importScripts('i18n.js','image-utils.js','panel-actions.js');
const locks = new Map();
function localizeAction(){chrome.action.setTitle({title:globalThis.ClickImageI18n.t('ClickImage — selecionar imagem')}).catch(()=>{})}
globalThis.ClickImageI18n?.onChange(localizeAction);
globalThis.ClickImageI18n?.ready.then(localizeAction);
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
  chrome.action.setTitle({tabId,title:globalThis.ClickImageI18n?.t(title) || title}).catch(()=>{});
}
const panelPorts=new Map();
async function stopSelection(tabId,silent=false) {
  const current=await state(tabId);
  delete current.selectionToken;current.status='idle';current.error=null;
  await chrome.tabs.sendMessage(tabId,{type:'CLICKIMAGE_CANCEL',silent}).catch(()=>{});
  await save(tabId,current);
  return {ok:true};
}
chrome.runtime.onConnect?.addListener(port=>{
  if(port.name!=='clickimage-panel' || !panelSender(port.sender))return;
  const tabs=new Set();panelPorts.set(port,tabs);
  port.onMessage.addListener(message=>{if(message?.type==='bind' && Number.isInteger(message.tabId) && message.tabId>0)tabs.add(message.tabId)});
  port.onDisconnect.addListener(()=>{
    panelPorts.delete(port);
    for(const tabId of tabs){
      if([...panelPorts.values()].some(bound=>bound.has(tabId)))continue;
      locked(tabId,()=>stopSelection(tabId,true)).catch(()=>{});
    }
  });
});
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
    const detected=requests.find(image=>image.id===tracking?.itemId)?.format || (requests.length===1?requests[0].format:null);
    const namingMime=({JPG:'image/jpeg',PNG:'image/png',WEBP:'image/webp',AVIF:'image/avif',GIF:'image/gif'})[detected] || item.mime;
    const name = title ? ClickImageUtils.downloadFilename(item.url,title,namingMime) : requests.length > 1 && item.filename ? ClickImageUtils.filename('https://filename.invalid/'+encodeURIComponent(item.filename.split(/[/\\]/).pop()),namingMime) : ClickImageUtils.filename(item.url,namingMime);
    suggest({filename:name,conflictAction:'uniquify'});
    const format=ClickImageUtils.imageExtension(item.mime)?.toUpperCase();
    const owner=tracking?.tabId || Object.entries(values).find(([key,value])=>key.startsWith('clickimage:') && value.items?.some(image=>image.id===requests[0]?.id))?.[0].split(':')[1];
    if(format && owner) locked(Number(owner),async()=>{
      const current=await state(Number(owner));
      const image=current.items.find(image=>image.id===(tracking?.itemId || requests[0]?.id));
      if(image && !image.format){image.format=format;await save(Number(owner),current);}
    }).catch(()=>{});
  }).catch(()=>suggest());
  return true;
});
async function activate(tabId) {
  const current = await state(tabId);
  if (['selecting','resolving'].includes(current.status)) return {ok:false,error:'A seleção já está ativa. ESC cancela.'};
  try {
    await chrome.scripting.executeScript({target:{tabId},files:['i18n.js','image-utils.js','content.js']});
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
  if(entry.variant==='png'){
    if(item && item.pngDownloadId===id){item.pngStatus=outcome==='complete'?'downloaded':'error';await save(entry.tabId,current);}
    await chrome.storage.session.remove(downloadKey(id));return;
  }
  if (item && item.downloadId === id) {
    item.status=outcome==='complete'?'downloaded':'error';
    if(outcome==='complete'){const [download]=await chrome.downloads.search({id});if(Number.isSafeInteger(download?.fileSize)&&download.fileSize>=0)item.sizeBytes=download.fileSize;}
    item.error=outcome==='complete'?null:'Download interrompido. Confira os downloads do Chrome ou tente novamente.';
    await save(entry.tabId,current);
  }
  if (item?.downloadId === id && current.batch?.running && current.batch.activeId === entry.itemId) {
    current.batch.activeId=null;
    current.batch.finished++;
    if (outcome !== 'complete') current.batch.failed++;
    await save(entry.tabId,current);
    scheduleBatch(entry.tabId);
  }
  await chrome.storage.session.remove(downloadKey(id));
}
async function confirm(tabId, itemId, fromBatch=false) {
  const current=await state(tabId);
  const item=current.items.find(image=>image.id===itemId);
  if (!item || !(fromBatch?['queued']:['ready','error']).includes(item.status)) return {ok:false,error:'Esta imagem já foi solicitada ou não está disponível.'};
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
async function confirmPng(tabId,message){
  const current=await state(tabId),item=current.items.find(image=>image.id===message.itemId);
  if(!item || ['downloading','downloaded'].includes(item.pngStatus))return {ok:false,error:'PNG já solicitado ou imagem removida.'};
  if(!ClickImageActions.isPngDataURL(message.dataURL))return {ok:false,error:'PNG inválido ou grande demais.'};
  const title=ClickImageUtils.safeTitle(message.title || item.title || item.filename);
  if(!title)return {ok:false,error:'Digite um nome válido.'};
  item.pngStatus='downloading';await save(tabId,current);
  let started=false;
  try{
    const id=await chrome.downloads.download({url:message.dataURL,filename:ClickImageUtils.downloadFilename(item.url,title,'image/png'),conflictAction:'uniquify',saveAs:false});started=true;item.pngDownloadId=id;
    const entry={tabId,itemId:item.id,variant:'png'};await chrome.storage.session.set({[downloadKey(id)]:entry});await save(tabId,current);
    const [download]=await chrome.downloads.search({id});if(download && ['complete','interrupted'].includes(download.state))await finishDownload(id,download.state,entry);
    return {ok:true};
  }catch{if(started)return {ok:true};item.pngStatus='error';await save(tabId,current);return {ok:false,error:'Não foi possível iniciar o download PNG.'};}
}
function scheduleBatch(tabId) { locked(tabId,()=>advanceBatch(tabId)).catch(()=>{}); }
async function advanceBatch(tabId) {
  let current=await state(tabId);
  if (!current.batch?.running || current.batch.activeId) return;
  while (current.batch.remaining.length) {
    const id=current.batch.remaining.shift();
    const item=current.items.find(image=>image.id===id && image.status==='queued');
    if (!item) continue;
    current.batch.activeId=id;
    await save(tabId,current);
    const result=await confirm(tabId,id,true);
    if (result.ok) return; // Next file starts after complete/interrupted.
    current=await state(tabId);
    current.batch.activeId=null;current.batch.finished++;current.batch.failed++;
  }
  current.batch.running=false;
  await save(tabId,current);
}
async function startBatch(tabId, titles) {
  const current=await state(tabId);
  if (current.batch?.running) return {ok:false,error:'O download em lote já está em andamento.'};
  if (current.items.length<=3) return {ok:false,error:'Baixar todas está disponível a partir de quatro imagens.'};
  const candidates=current.items.filter(item=>['ready','error'].includes(item.status));
  const seen=new Set();
  const images=candidates.filter(item=>{if(seen.has(item.url))return false;seen.add(item.url);return true});
  if (!images.length) return {ok:false,error:'Não há imagens pendentes para baixar.'};
  if (!Array.isArray(titles)) return {ok:false,error:'Confira os nomes dos arquivos.'};
  for (const item of images) {
    const title=titles.find(value=>value?.itemId===item.id)?.title;
    if (typeof title!=='string' || !ClickImageUtils.safeTitle(title)) return {ok:false,error:'Digite um nome válido para cada imagem.'};
    item.title=ClickImageUtils.safeTitle(title);item.status='queued';item.error=null;
  }
  current.batch={running:true,remaining:images.map(item=>item.id),activeId:null,total:images.length,finished:0,failed:0};
  await save(tabId,current);
  scheduleBatch(tabId);
  return {ok:true};
}
function panelSender(sender) { return sender.id===chrome.runtime.id && sender.url===chrome.runtime.getURL('panel.html') && !sender.tab; }
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if (sender.id!==chrome.runtime.id || !message || typeof message.type!=='string') return;
  const isPanel=panelSender(sender),tabId=isPanel?message.tabId:sender.tab?.id;
  if (!Number.isInteger(tabId) || tabId<=0 || (!isPanel && sender.frameId!==0)) return;
  const panelTypes=['CLICKIMAGE_STATE','CLICKIMAGE_SELECT','CLICKIMAGE_STOP','CLICKIMAGE_CONFIRM','CLICKIMAGE_REMOVE','CLICKIMAGE_RENAME','CLICKIMAGE_CLEAR_ALL','CLICKIMAGE_CONFIRM_ALL','CLICKIMAGE_CONFIRM_PNG','CLICKIMAGE_OPEN_IMAGE'];
  const contentTypes=['CLICKIMAGE_PREVIEW','CLICKIMAGE_CANCELLED','CLICKIMAGE_RESOLVING'];
  if (!(isPanel?panelTypes:contentTypes).includes(message.type)) return;
  // Waiting for a newly opened image must not block collection/download locks.
  if(isPanel && message.type==='CLICKIMAGE_OPEN_IMAGE'){
    state(tabId).then(current=>{
      const image=current.items.find(item=>item.id===message.itemId);
      return image?ClickImageActions.openImage(image.url):{ok:false,error:'Imagem removida.'};
    }).then(reply).catch(()=>reply({ok:false,error:'Não foi possível abrir a imagem.'}));
    return true;
  }
  locked(tabId,async()=>{
    if (isPanel) {
      if (message.type==='CLICKIMAGE_SELECT') return activate(tabId);
      if (message.type==='CLICKIMAGE_CONFIRM') return confirm(tabId,message.itemId);
      if(message.type==='CLICKIMAGE_CONFIRM_PNG')return confirmPng(tabId,message);
      if (message.type==='CLICKIMAGE_CONFIRM_ALL') return startBatch(tabId,message.titles);
      const current=await state(tabId);
      if (message.type==='CLICKIMAGE_CLEAR_ALL') {
        await chrome.tabs.sendMessage(tabId,{type:'CLICKIMAGE_CANCEL'}).catch(()=>{});
        await save(tabId,{status:'idle',items:[]});
        return {ok:true};
      }
      if (message.type==='CLICKIMAGE_STOP') {
        return stopSelection(tabId);
      }
      if (message.type==='CLICKIMAGE_STATE') {
        for (const item of current.items.filter(image=>image.status==='downloading' && Number.isInteger(image.downloadId))) {
          const [download]=await chrome.downloads.search({id:item.downloadId});
          if (download && ['complete','interrupted'].includes(download.state)) await finishDownload(download.id,download.state);
        }
        for(const item of current.items.filter(image=>image.pngStatus==='downloading' && Number.isInteger(image.pngDownloadId))){const [download]=await chrome.downloads.search({id:item.pngDownloadId});if(download && ['complete','interrupted'].includes(download.state))await finishDownload(download.id,download.state);}
        const latest=await state(tabId);
        if (latest.batch?.running && !latest.batch.activeId) scheduleBatch(tabId);
        return {ok:true,state:await state(tabId)};
      }
      const item=current.items.find(image=>image.id===message.itemId);
      if (!item || ['downloading','queued'].includes(item.status)) return {ok:false,error:'Aguarde o download ou selecione uma imagem válida.'};
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
      if (!current.items.some(image=>image.url===url)) current.items.push({id:crypto.randomUUID(),url,filename:ClickImageUtils.filename(url),format:['JPG','PNG','WEBP','AVIF','GIF','SVG','BMP','TIF','ICO'].includes(message.format)?message.format:null,sizeBytes:Number.isSafeInteger(message.sizeBytes)&&message.sizeBytes>=0?message.sizeBytes:null,title:'',status:'ready',label:typeof message.label==='string'?message.label.slice(0,200):'Imagem selecionada'});
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
