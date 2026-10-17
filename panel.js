'use strict';
const t=(source,values)=>ClickImageI18n.t(source,values);
const $ = id => document.getElementById(id);
let tabId=null,request=0,collection={items:[]},batchRequest=false,zipJob=null,zipProgress=null,lifecyclePort=null,closing=false;
function connectPanel(){
  if(closing)return;
  try{lifecyclePort=chrome.runtime.connect({name:"clickimage-panel"});
    lifecyclePort.onDisconnect.addListener(()=>{lifecyclePort=null;if(!closing)setTimeout(connectPanel,250)});
    if(tabId)lifecyclePort.postMessage({type:"bind",tabId});
  }catch{lifecyclePort=null;}
}
function bindPanel(){try{if(!lifecyclePort)connectPanel();if(tabId)lifecyclePort?.postMessage({type:"bind",tabId})}catch{lifecyclePort=null;}}
let heartbeat=setInterval(bindPanel,20000);
function closePanelConnection(){zipJob?.abort();closing=true;clearInterval(heartbeat);try{lifecyclePort?.disconnect()}catch{}lifecyclePort=null;}
window.addEventListener("pagehide",closePanelConnection);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)closePanelConnection();
  else if(closing){closing=false;connectPanel();heartbeat=setInterval(bindPanel,20000);refresh();}
});
const cards=new Map(),galleryImages=new Map(),converting=new Set();let galleryOpen=false;
function details(card){
 const item=card._item;if(!item)return;
 const type=["JPG","PNG","WEBP","AVIF","GIF","SVG","BMP","TIF","ICO"].includes(item.format)?item.format:null;
 const dimensions=card._dimensions?`${card._dimensions.width} × ${card._dimensions.height} px`:t("Resolução indisponível");
 card.querySelector(".dimensions").textContent=[type,dimensions,t(ClickImageUtils.formatFileSize(item.sizeBytes))].filter(Boolean).join(" - ");
}
function renderGallery(items){
 $("gallery").hidden=!galleryOpen;$("collection-body").classList.toggle("gallery-open",galleryOpen);
 for(const [id,image] of galleryImages)if(!items.some(item=>item.id===id)){image.remove();galleryImages.delete(id)}
 if(!galleryOpen)return;
 for(const item of items){if(galleryImages.has(item.id)){galleryImages.get(item.id).setAttribute("aria-label",t("Ver {name}",{name:item.title||item.filename}));galleryImages.get(item.id).querySelector("img").alt=item.label||t("Imagem selecionada");continue;}
   const button=document.createElement("button");button.className="gallery-entry";button.setAttribute("aria-label",t("Ver {name}",{name:item.title||item.filename}));
   const image=document.createElement("img");image.src=item.url;image.alt=item.label||t("Imagem selecionada");image.referrerPolicy="no-referrer";
   button.append(image);button.addEventListener("click",()=>cards.get(item.id)?.scrollIntoView({block:"nearest"}));
   button.addEventListener("auxclick",event=>{if(event.button===1){event.preventDefault();openImage(item.id)}});
   button.addEventListener("mousedown",event=>{if(event.button===1)event.preventDefault()});$("gallery").append(button);galleryImages.set(item.id,button);
 }
}
function notice(text) { $('feedback').textContent=ClickImageI18n.error(text)||'';$('feedback').hidden=!text; }
function render(value) {
  collection=value;
  const items=value.items || (value.item?[value.item]:[]);
  $('count').textContent=t(items.length===1?'{count} imagem':'{count} imagens',{count:items.length});
  $('selected-total').textContent=String(items.length).padStart(2,'0');
  $('empty').hidden=items.length>0;$('selection').hidden=items.length===0;
  const hunting=['selecting','resolving'].includes(value.status);
  $('dot').classList.toggle('active',hunting);
  $('status-label').textContent=({selecting:t('Clique em uma imagem na página'),resolving:t('Buscando a maior imagem disponível'),error:t('Precisamos da sua atenção')})[value.status] || (items.length?t('Pronto para caçar mais imagens'):t('Pronto para começar'));
  $('empty-title').innerHTML=value.status==='selecting'?t('Um clique na página.')+'<br>'+t('A prévia aparece aqui.'):t('Sua próxima imagem')+'<br>'+t('começa com um clique.');
  $('empty-description').textContent=value.status==='selecting'?t('Passe o mouse sobre a foto e clique. Nenhum download começa automaticamente.'):t('Use “Caçar imagem” para ativar a seleção na página.');
  if(value.status==='resolving'){$('empty-title').textContent=t('Procurando a melhor versão.');$('empty-description').textContent=t('Aguarde alguns segundos para conferir a prévia.')}
  $('select').disabled=!tabId;
  $('select').dataset.hunting=String(hunting);
  $('select').setAttribute('aria-pressed',String(hunting));
  $('clear-all').disabled=!items.length;
  $('download-all').hidden=items.length<=3;
  const batchRunning=!!value.batch?.running;
  $('download-all').disabled=batchRequest || batchRunning || !!zipJob;
  $('batch-individual').disabled=!items.some(item=>['ready','error'].includes(item.status));
  if(items.length<=3 || $('download-all').disabled){$('batch-options').hidden=true;$('download-all').setAttribute('aria-expanded','false')}
  $('download-all').querySelector('span').textContent=batchRunning?t('Baixando em sequência…'):t('Baixar todas');
  $('batch-progress').hidden=!value.batch;
  $('batch-progress').textContent=value.batch ? (batchRunning?t('{finished} de {total} concluídas',value.batch):t('Lote finalizado: {count} salvas',{count:value.batch.total-value.batch.failed})+(value.batch.failed?t(', {count} com erro',{count:value.batch.failed}):'')) : '';
  if(zipProgress){$('batch-progress').hidden=false;$('batch-progress').textContent=zipProgressText()}
  $('select').querySelector('span').textContent=hunting?t('Parar seleção'):t('Caçar imagem');
  notice(value.error);
  for(const [id,card] of cards) if(!items.some(item=>item.id===id)){card.remove();cards.delete(id)}
  $('image-list').classList.toggle('has-scroll',items.length>3);
  for(const item of items){
    let card=cards.get(item.id);
    if(!card){
      card=ClickImageCards.create();card.dataset.id=item.id;
      const input=card.querySelector('.title-input'),img=card.querySelector('.preview');
      input.addEventListener('change',()=>command('CLICKIMAGE_RENAME',{itemId:item.id,title:input.value}));
      input.addEventListener('keydown',event=>{if(event.key==='Enter')input.blur()});
      card.querySelector('.copy-url').addEventListener('click',()=>{
        navigator.clipboard.writeText(card._item.url).then(()=>notice(t('URL original copiada.'))).catch(()=>notice(t('Não foi possível copiar. Confira a permissão de área de transferência.')));
      });
      card.querySelector('.reverse-search').addEventListener('click',()=>{
        chrome.tabs.create({url:ClickImageActions.reverseSearchURL(card._item.url)}).catch(()=>notice(t('Não foi possível abrir a pesquisa reversa.')));
      });
      ClickImageLibraryPanel.addSaveButton(card,()=>({...card._item,title:input.value}));
      card.querySelector('.open-image').addEventListener('click',()=>openImage(item.id));
      card.querySelector('.convert-png').addEventListener('click',async()=>{
        const targetTab=tabId;if(converting.has(item.id))return;converting.add(item.id);render(collection);
        let error=null;
        try{
          const title=input.value;
          const converted=await ClickImageActions.convertWebpToPng(card._item.url);
          const response=await chrome.runtime.sendMessage({type:'CLICKIMAGE_CONFIRM_PNG',tabId:targetTab,itemId:item.id,title,dataURL:converted.dataURL});
          if(!response?.ok)error=response?.error || t('Não foi possível baixar o PNG.');
        }catch(failure){error=failure.message || t('O site bloqueou a conversão. O download original continua disponível.');}
        finally{converting.delete(item.id);await refresh();if(error)notice(error);}
      });
      card.querySelector('.remove').addEventListener('click',()=>command('CLICKIMAGE_REMOVE',{itemId:item.id}));
      card.querySelector('.download').addEventListener('click',async()=>{
        const button=card.querySelector('.download');if(button.disabled)return;button.disabled=true;
        // Save the current input before confirmation even if change/blur has
        // not run yet (keyboard activation and fast clicks included).
        if(!await command('CLICKIMAGE_RENAME',{itemId:item.id,title:input.value}))return;
        await command('CLICKIMAGE_CONFIRM',{itemId:item.id});
      });
      img.addEventListener('load',()=>{card._dimensions={width:img.naturalWidth,height:img.naturalHeight};details(card)});
      img.addEventListener('error',()=>{img.hidden=true;card.querySelector('.preview-fallback').hidden=false;card.querySelector('.dimensions').textContent=t('Prévia indisponível')});
      img.src=item.url;
      $('image-list').append(card);cards.set(item.id,card);
    }
    card._item=item;
    const input=card.querySelector('.title-input');
    if(document.activeElement!==input)input.value=item.title || item.filename.replace(/\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i,'');
    input.disabled=converting.has(item.id)||['queued','downloading','downloaded'].includes(item.status);
    card.querySelector('.source').textContent=t('Imagem encontrada');
    if(card._dimensions)details(card);else card.querySelector('.dimensions').textContent=t(card.querySelector('.preview').hidden?'Prévia indisponível':'Verificando prévia…');
    const pngButton=card.querySelector('.convert-png');pngButton.hidden=item.format!=='WEBP';pngButton.disabled=converting.has(item.id)||['downloading','downloaded'].includes(item.pngStatus);pngButton.textContent=converting.has(item.id)?t('Convertendo…'):item.pngStatus==='downloading'?t('PNG baixando…'):item.pngStatus==='downloaded'?t('PNG salva ✓'):t('PNG (beta)');
    const ready=['ready','error'].includes(item.status);
    card.querySelector('.download').disabled=!ready;
    card.querySelector('.download').textContent=item.status==='downloading'?t('Baixando…'):item.status==='downloaded'?t('Salva ✓'):item.status==='queued'?t('Na fila'):t('Baixar imagem');
    card.querySelector('.remove').disabled=['queued','downloading'].includes(item.status);
    card.querySelector('.item-status').textContent=item.status==='downloaded'?t('Arquivo salvo'):item.status==='downloading'?t('Download solicitado'):item.status==='error'?t('Tente novamente'):item.status==='queued'?t('Aguardando sua vez'):t('Sem compressão extra');
    card.querySelector('.item-error').hidden=!item.error;card.querySelector('.item-error').textContent=ClickImageI18n.error(item.error);
  }
  renderGallery(items);
}
async function refresh(){
  const revision=++request;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(revision!==request)return;
    if(tabId!==tab?.id){zipJob?.abort();zipProgress=null;for(const card of cards.values())card.remove();cards.clear();for(const image of galleryImages.values())image.remove();galleryImages.clear()}
    tabId=tab?.id || null;bindPanel();
    if(!tabId){render({status:'idle',items:[]});return}
    const response=await chrome.runtime.sendMessage({type:'CLICKIMAGE_STATE',tabId});if(revision!==request)return;
    if(!response?.ok)throw new Error(response?.error || t('Não foi possível ler as imagens.'));render(response.state);
  }catch(error){notice(error.message)}
}
async function command(type,extra={}){
  if(!tabId)return false;
  const targetTab=tabId;
  try{
    const response=await chrome.runtime.sendMessage({type,tabId:targetTab,...extra});await refresh();
    if(!response?.ok){notice(response?.error || t('Não foi possível concluir a ação.'));return false}return true;
  }catch{notice(t('Feche e abra o painel novamente.'));return false}
}
$('select').addEventListener('click',()=>{const hunting=$('select').dataset.hunting==='true';$('select').disabled=true;command(hunting?'CLICKIMAGE_STOP':'CLICKIMAGE_SELECT')});
$('clear-all').addEventListener('click',()=>{zipJob?.abort();zipProgress=null; $('clear-all').disabled=true;command('CLICKIMAGE_CLEAR_ALL'); });
$('download-all').addEventListener('click',()=>{if($('download-all').disabled)return;$('batch-options').hidden=!$('batch-options').hidden;$('download-all').setAttribute('aria-expanded',String(!$('batch-options').hidden))});
$('batch-individual').addEventListener('click',async()=>{
  if(batchRequest || zipJob || $('download-all').disabled)return;
  $('batch-options').hidden=true;$('download-all').setAttribute('aria-expanded','false');zipProgress=null;
  const targetTab=tabId;
  const titles=(collection.items||[]).filter(item=>['ready','error'].includes(item.status)).map(item=>({itemId:item.id,title:cards.get(item.id)?.querySelector('.title-input').value || ''}));
  batchRequest=true;$('download-all').disabled=true;let error=null;
  try{
    const response=await chrome.runtime.sendMessage({type:'CLICKIMAGE_CONFIRM_ALL',tabId:targetTab,titles});
    if(!response?.ok)error=response?.error || t('Não foi possível iniciar o lote.');
  }catch{error=t('Não foi possível iniciar o lote.');}
  finally{batchRequest=false;await refresh();if(error)notice(error);}
});
async function openImage(itemId){
 try{
  const response=await chrome.runtime.sendMessage({type:'CLICKIMAGE_OPEN_IMAGE',tabId,itemId});
  if(!response?.ok)notice(response?.error || t('Não foi possível abrir a imagem.'));
  else if(!response.zoomSet)notice(t('Imagem aberta. O Chrome não permitiu ajustar o zoom desta aba.'));
 }catch{notice(t('Não foi possível abrir a imagem.'))}
}
async function saveArchive(blob,signal){return ClickImageFiles.save(blob,'ClickImage.zip',{signal})}
$('batch-zip').addEventListener('click',async()=>{
 if(zipJob || batchRequest || $('download-all').disabled)return;
 const targetTab=tabId,job=new AbortController();zipJob=job;
 const items=(collection.items||[]).map(item=>({...item,title:cards.get(item.id)?.querySelector('.title-input').value || item.title}));
 zipProgress={key:'Preparando ZIP · mantenha o painel aberto…'};render(collection);
 try{
  const result=await ClickImageZip.build(items,{signal:job.signal,onProgress:progress=>{zipProgress={progress};if(tabId===targetTab)render(collection)}});
  if(job.signal.aborted)throw new DOMException(t('ZIP cancelado.'),'AbortError');
  zipProgress={key:'Salvando ZIP…'};render(collection);await saveArchive(result.blob,job.signal);
  zipProgress={result};
 }catch(error){zipProgress=error.name==='AbortError'?null:{error:error.message || 'Não foi possível criar o ZIP.'};}
 finally{if(zipJob===job)zipJob=null;if(tabId===targetTab)render(collection);else zipProgress=null}
});
$('gallery-toggle').addEventListener('click',()=>{galleryOpen=!galleryOpen;$('gallery-toggle').setAttribute('aria-pressed',String(galleryOpen));renderGallery(collection.items||[])});
$('layout').addEventListener('change',()=>{ $('image-list').dataset.layout=$('layout').value;chrome.storage.local?.set({clickimageLayout:$('layout').value}).catch(()=>{}); });
try{chrome.storage.local?.get('clickimageLayout').then(value=>{const layout=value.clickimageLayout==='compact'?'list':value.clickimageLayout;if(['list','grid'].includes(layout)){$('layout').value=layout;$('image-list').dataset.layout=layout;if(value.clickimageLayout==='compact')chrome.storage.local.set({clickimageLayout:'list'}).catch(()=>{})}}).catch(()=>{});}catch{}
$('help').addEventListener('click',()=>{$('help-text').hidden=!$('help-text').hidden});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session' && tabId && changes[`clickimage:${tabId}`])render(changes[`clickimage:${tabId}`].newValue || {status:'idle',items:[]})});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((id,change)=>{if(id===tabId && change.status==='complete')refresh()});
refresh();

function zipProgressText(){
 if(zipProgress?.key)return t(zipProgress.key);
 if(zipProgress?.error)return ClickImageI18n.error(zipProgress.error);
 if(zipProgress?.progress){const p=zipProgress.progress;return t('ZIP: {finished} de {total} verificadas · {included} incluídas',p)+(p.failed?t(' · {count} com erro',{count:p.failed}):'')}
 if(zipProgress?.result){const r=zipProgress.result;return t('ZIP salvo: {count} imagens',{count:r.included})+(r.failures.length?t(' · {count} não incluídas: ',{count:r.failures.length})+r.failures.map(f=>f.name+' ('+ClickImageI18n.error(f.error)+')').join('; '):'')}
 return '';
}
function applyLanguage(){
 document.documentElement.lang=ClickImageI18n.language;
 $('language').value=ClickImageI18n.language;
 ClickImageI18n.apply(document);render(collection);
}
$('language').addEventListener('change',()=>{ClickImageI18n.setLanguage($('language').value).catch(error=>notice(error.message))});
ClickImageI18n.onChange(applyLanguage);
ClickImageI18n.ready.then(applyLanguage);

ClickImageFiles.links();
$('open-library').addEventListener('click',()=>ClickImageLibraryPanel.open().catch(error=>notice(error.message)));
