'use strict';
const $ = id => document.getElementById(id);
let tabId=null,request=0;
const cards=new Map();
function notice(text) { $('feedback').textContent=text||'';$('feedback').hidden=!text; }
function render(value) {
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
      img.addEventListener('load',()=>{card.querySelector('.dimensions').textContent=`${img.naturalWidth} × ${img.naturalHeight} px`});
      img.addEventListener('error',()=>{img.hidden=true;card.querySelector('.preview-fallback').hidden=false;card.querySelector('.dimensions').textContent='Prévia indisponível'});
      img.src=item.url;
      $('image-list').append(card);cards.set(item.id,card);
    }
    const input=card.querySelector('.title-input');
    if(document.activeElement!==input)input.value=item.title || item.filename.replace(/\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i,'');
    input.disabled=['downloading','downloaded'].includes(item.status);
    card.querySelector('.source').textContent=new URL(item.url).hostname;
    const ready=['ready','error'].includes(item.status);
    card.querySelector('.download').disabled=!ready;
    card.querySelector('.download').textContent=item.status==='downloading'?'Baixando…':item.status==='downloaded'?'Salva ✓':'Baixar imagem';
    card.querySelector('.remove').disabled=item.status==='downloading';
    card.querySelector('.item-status').textContent=item.status==='downloaded'?'Arquivo salvo':item.status==='downloading'?'Download solicitado':item.status==='error'?'Tente novamente':'Sem compressão extra';
    card.querySelector('.item-error').hidden=!item.error;card.querySelector('.item-error').textContent=item.error || '';
  }
}
async function refresh(){
  const revision=++request;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(revision!==request)return;
    if(tabId!==tab?.id){for(const card of cards.values())card.remove();cards.clear()}
    tabId=tab?.id || null;
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
$('help').addEventListener('click',()=>{$('help-text').hidden=!$('help-text').hidden});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session' && tabId && changes[`clickimage:${tabId}`])render(changes[`clickimage:${tabId}`].newValue || {status:'idle',items:[]})});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((id,change)=>{if(id===tabId && change.status==='complete')refresh()});
refresh();
