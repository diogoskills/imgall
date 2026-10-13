'use strict';
const $ = id => document.getElementById(id);
let tabId=null,request=0,collection={items:[]},batchRequest=false,lifecyclePort=null,closing=false;
function connectPanel(){
  if(closing)return;
  try{lifecyclePort=chrome.runtime.connect({name:"clickimage-panel"});
    lifecyclePort.onDisconnect.addListener(()=>{lifecyclePort=null;if(!closing)setTimeout(connectPanel,250)});
    if(tabId)lifecyclePort.postMessage({type:"bind",tabId});
  }catch{lifecyclePort=null;}
}
function bindPanel(){try{if(!lifecyclePort)connectPanel();if(tabId)lifecyclePort?.postMessage({type:"bind",tabId})}catch{lifecyclePort=null;}}
let heartbeat=setInterval(bindPanel,20000);
function closePanelConnection(){closing=true;clearInterval(heartbeat);try{lifecyclePort?.disconnect()}catch{}lifecyclePort=null;}
window.addEventListener("pagehide",closePanelConnection);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)closePanelConnection();
  else if(closing){closing=false;connectPanel();heartbeat=setInterval(bindPanel,20000);refresh();}
});
const cards=new Map(),galleryImages=new Map();let galleryOpen=false;
function details(card){
 const item=card._item;if(!item)return;
 const type=["JPG","PNG","WEBP","AVIF","GIF","SVG","BMP","TIF","ICO"].includes(item.format)?item.format:null;
 const dimensions=card._dimensions?`${card._dimensions.width} × ${card._dimensions.height} px`:"Resolução indisponível";
 card.querySelector(".dimensions").textContent=[type,dimensions,ClickImageUtils.formatFileSize(item.sizeBytes)].filter(Boolean).join(" - ");
}
function renderGallery(items){
 $("gallery").hidden=!galleryOpen;$("collection-body").classList.toggle("gallery-open",galleryOpen);
 for(const [id,image] of galleryImages)if(!items.some(item=>item.id===id)){image.remove();galleryImages.delete(id)}
 if(!galleryOpen)return;
 for(const item of items){if(galleryImages.has(item.id))continue;
   const button=document.createElement("button");button.className="gallery-entry";button.setAttribute("aria-label","Ver "+(item.title||item.filename));
   const image=document.createElement("img");image.src=item.url;image.alt=item.label||"Imagem selecionada";image.referrerPolicy="no-referrer";
   button.append(image);button.addEventListener("click",()=>cards.get(item.id)?.scrollIntoView({block:"nearest"}));$("gallery").append(button);galleryImages.set(item.id,button);
 }
}
function notice(text) { $('feedback').textContent=text||'';$('feedback').hidden=!text; }
function render(value) {
  collection=value;
  const items=value.items || (value.item?[value.item]:[]);
  $('count').textContent=`${items.length} ${items.length===1?'imagem':'imagens'}`;
  $('selected-total').textContent=String(items.length).padStart(2,'0');
  $('empty').hidden=items.length>0;$('selection').hidden=items.length===0;
  const hunting=['selecting','resolving'].includes(value.status);
  $('dot').classList.toggle('active',hunting);
  $('status-label').textContent=({selecting:'Clique em uma imagem na página',resolving:'Buscando a maior imagem disponível',error:'Precisamos da sua atenção'})[value.status] || (items.length?'Pronto para caçar mais imagens':'Pronto para começar');
  $('empty-title').innerHTML=value.status==='selecting'?'Um clique na página.<br>A prévia aparece aqui.':'Sua próxima imagem<br>começa com um clique.';
  $('empty-description').textContent=value.status==='selecting'?'Passe o mouse sobre a foto e clique. Nenhum download começa automaticamente.':'Use “Caçar imagem” para ativar a seleção na página.';
  if(value.status==='resolving'){$('empty-title').textContent='Procurando a melhor versão.';$('empty-description').textContent='Aguarde alguns segundos para conferir a prévia.'}
  $('select').disabled=!tabId;
  $('select').dataset.hunting=String(hunting);
  $('select').setAttribute('aria-pressed',String(hunting));
  $('clear-all').disabled=!items.length;
  $('download-all').hidden=items.length<=3;
  const batchRunning=!!value.batch?.running;
  $('download-all').disabled=batchRequest || batchRunning || !items.some(item=>['ready','error'].includes(item.status));
  $('download-all').querySelector('span').textContent=batchRunning?'Baixando em sequência…':'Baixar todas';
  $('batch-progress').hidden=!value.batch;
  $('batch-progress').textContent=value.batch ? (batchRunning?`${value.batch.finished} de ${value.batch.total} concluídas`:`Lote finalizado: ${value.batch.total-value.batch.failed} salvas${value.batch.failed?`, ${value.batch.failed} com erro`:''}`) : '';
  $('select').querySelector('span').textContent=hunting?'Parar seleção':'Caçar imagem';
  notice(value.error);
  for(const [id,card] of cards) if(!items.some(item=>item.id===id)){card.remove();cards.delete(id)}
  $('image-list').classList.toggle('has-scroll',items.length>3);
  for(const item of items){
    let card=cards.get(item.id);
    if(!card){
      card=$('image-template').content.firstElementChild.cloneNode(true);card.dataset.id=item.id;
      const input=card.querySelector('.title-input'),img=card.querySelector('.preview');
      input.addEventListener('change',()=>command('CLICKIMAGE_RENAME',{itemId:item.id,title:input.value}));
      input.addEventListener('keydown',event=>{if(event.key==='Enter')input.blur()});
      card.querySelector('.remove').addEventListener('click',()=>command('CLICKIMAGE_REMOVE',{itemId:item.id}));
      card.querySelector('.download').addEventListener('click',async()=>{
        const button=card.querySelector('.download');if(button.disabled)return;button.disabled=true;
        // Save the current input before confirmation even if change/blur has
        // not run yet (keyboard activation and fast clicks included).
        if(!await command('CLICKIMAGE_RENAME',{itemId:item.id,title:input.value}))return;
        await command('CLICKIMAGE_CONFIRM',{itemId:item.id});
      });
      img.addEventListener('load',()=>{card._dimensions={width:img.naturalWidth,height:img.naturalHeight};details(card)});
      img.addEventListener('error',()=>{img.hidden=true;card.querySelector('.preview-fallback').hidden=false;card.querySelector('.dimensions').textContent='Prévia indisponível'});
      img.src=item.url;
      $('image-list').append(card);cards.set(item.id,card);
    }
    card._item=item;
    const input=card.querySelector('.title-input');
    if(document.activeElement!==input)input.value=item.title || item.filename.replace(/\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i,'');
    input.disabled=['queued','downloading','downloaded'].includes(item.status);
    card.querySelector('.source').textContent='Imagem encontrada';
    if(card._dimensions)details(card);
    const ready=['ready','error'].includes(item.status);
    card.querySelector('.download').disabled=!ready;
    card.querySelector('.download').textContent=item.status==='downloading'?'Baixando…':item.status==='downloaded'?'Salva ✓':item.status==='queued'?'Na fila':'Baixar imagem';
    card.querySelector('.remove').disabled=['queued','downloading'].includes(item.status);
    card.querySelector('.item-status').textContent=item.status==='downloaded'?'Arquivo salvo':item.status==='downloading'?'Download solicitado':item.status==='error'?'Tente novamente':item.status==='queued'?'Aguardando sua vez':'Sem compressão extra';
    card.querySelector('.item-error').hidden=!item.error;card.querySelector('.item-error').textContent=item.error || '';
  }
  renderGallery(items);
}
async function refresh(){
  const revision=++request;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(revision!==request)return;
    if(tabId!==tab?.id){for(const card of cards.values())card.remove();cards.clear();for(const image of galleryImages.values())image.remove();galleryImages.clear()}
    tabId=tab?.id || null;bindPanel();
    if(!tabId){render({status:'idle',items:[]});return}
    const response=await chrome.runtime.sendMessage({type:'CLICKIMAGE_STATE',tabId});if(revision!==request)return;
    if(!response?.ok)throw new Error(response?.error || 'Não foi possível ler as imagens.');render(response.state);
  }catch(error){notice(error.message)}
}
async function command(type,extra={}){
  if(!tabId)return false;
  const targetTab=tabId;
  try{
    const response=await chrome.runtime.sendMessage({type,tabId:targetTab,...extra});await refresh();
    if(!response?.ok){notice(response?.error || 'Não foi possível concluir a ação.');return false}return true;
  }catch{notice('Feche e abra o painel novamente.');return false}
}
$('select').addEventListener('click',()=>{const hunting=$('select').dataset.hunting==='true';$('select').disabled=true;command(hunting?'CLICKIMAGE_STOP':'CLICKIMAGE_SELECT')});
$('clear-all').addEventListener('click',()=>{ $('clear-all').disabled=true;command('CLICKIMAGE_CLEAR_ALL'); });
$('download-all').addEventListener('click',async()=>{
  if(batchRequest || $('download-all').disabled)return;
  const targetTab=tabId;
  const titles=(collection.items||[]).filter(item=>['ready','error'].includes(item.status)).map(item=>({itemId:item.id,title:cards.get(item.id)?.querySelector('.title-input').value || ''}));
  batchRequest=true;$('download-all').disabled=true;let error=null;
  try{
    const response=await chrome.runtime.sendMessage({type:'CLICKIMAGE_CONFIRM_ALL',tabId:targetTab,titles});
    if(!response?.ok)error=response?.error || 'Não foi possível iniciar o lote.';
  }catch{error='Não foi possível iniciar o lote.';}
  finally{batchRequest=false;await refresh();if(error)notice(error);}
});
$('gallery-toggle').addEventListener('click',()=>{galleryOpen=!galleryOpen;$('gallery-toggle').setAttribute('aria-pressed',String(galleryOpen));renderGallery(collection.items||[])});
$('help').addEventListener('click',()=>{$('help-text').hidden=!$('help-text').hidden});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session' && tabId && changes[`clickimage:${tabId}`])render(changes[`clickimage:${tabId}`].newValue || {status:'idle',items:[]})});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((id,change)=>{if(id===tabId && change.status==='complete')refresh()});
refresh();
