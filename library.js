'use strict';
const $=id=>document.getElementById(id),t=(s,v)=>ClickImageI18n.t(s,v),L=ClickImageLibrary;
let state={libraries:[],folders:[],images:[],links:[]},activeLibrary='main',activeFolder='',selected=new Set(),exportFolders=new Set(),search='',visibleLimit=60,revision=0,busy=false;
const collapsedGroups=new Set();
const cards=new Map(),objectURLs=new Map(),drafts=new Map();
const say=source=>{$('library-feedback').textContent=ClickImageI18n.error(source)};
function librariesFolders(){return state.folders.filter(f=>f.libraryId===activeLibrary)}
function library(){return state.libraries.find(l=>l.id===activeLibrary)}
function folder(){return librariesFolders().find(f=>f.id===activeFolder)}
function entries(folderId=activeFolder){const images=new Map(state.images.map(i=>[i.id,i]));return state.links.filter(l=>l.folderId===folderId).map(l=>({...images.get(l.imageId),...l})).filter(i=>i.mime)}
function filtered(){return entries().filter(i=>i.title.toLocaleLowerCase(ClickImageI18n.language).includes(search.toLocaleLowerCase(ClickImageI18n.language)))}
function chosen(){const ids=new Set(filtered().map(i=>i.id));return entries().filter(i=>selected.has(i.id)&&ids.has(i.id))}
async function refresh(){const token=++revision;try{const d=await L.snapshot();if(token!==revision)return;state=d;if(!library())activeLibrary=d.libraries[0]?.id||'main';if(!folder())activeFolder=librariesFolders()[0]?.id||'';const valid=new Set(entries().map(i=>i.id));selected=new Set([...selected].filter(id=>valid.has(id)));exportFolders=new Set([...exportFolders].filter(id=>librariesFolders().some(f=>f.id===id)));render()}catch(error){say(error.message)}}
function render(){
 $('library-picker').replaceChildren(...state.libraries.map(l=>new Option(l.name,l.id)));$('library-picker').value=activeLibrary;
 const ordered=[];const folders=librariesFolders();
 const byName=(a,b)=>a.name.localeCompare(b.name,ClickImageI18n.language,{numeric:true});
 for(const group of folders.filter(f=>!f.parentId).sort(byName)){ordered.push(group);if(!collapsedGroups.has(group.id))ordered.push(...folders.filter(f=>f.parentId===group.id).sort(byName))}
 $('folders').replaceChildren(...ordered.map(f=>{
  const children=folders.filter(child=>child.parentId===f.id),row=document.createElement('div');row.className='folder-nav'+(f.id===activeFolder?' active':'')+(f.parentId?' folder-child':'');
  const check=document.createElement('input');check.type='checkbox';check.checked=exportFolders.has(f.id);check.disabled=busy;check.setAttribute('aria-label',t('Exportar pasta {name}',{name:f.name}));check.onchange=()=>{check.checked?exportFolders.add(f.id):exportFolders.delete(f.id);controls()};
  if(children.length){const toggle=document.createElement('button');toggle.className='group-toggle';toggle.textContent=collapsedGroups.has(f.id)?'▸':'▾';toggle.setAttribute('aria-label',t('Expandir ou recolher grupo'));toggle.setAttribute('aria-expanded',String(!collapsedGroups.has(f.id)));toggle.disabled=busy;toggle.onclick=()=>{collapsedGroups.has(f.id)?collapsedGroups.delete(f.id):collapsedGroups.add(f.id);render()};row.append(toggle)}
  const button=document.createElement('button');button.className='folder-open';button.disabled=busy;button.setAttribute('aria-current',f.id===activeFolder?'page':'false');
  const name=document.createElement('span');name.className='folder-name';name.textContent=f.name;const count=document.createElement('span');count.className='folder-count';const descendants=L.descendants(folders,f.id);count.textContent=new Set(state.links.filter(l=>descendants.has(l.folderId)).map(l=>l.imageId)).size;button.append(name,count);
  button.onclick=()=>{activeFolder=f.id;selected.clear();drafts.clear();search='';$('search').value='';visibleLimit=60;render()};row.append(check,button);return row;
 }));
 $('new-set').disabled=busy||!folder()||!!folder().parentId;
 $('folder-kind').textContent=t(folder()?.parentId?'Conjunto':'Grupo');
 $('folder-title').textContent=folder()?.name||t('Biblioteca');$('folder-count').textContent=t('{count} imagens',{count:entries().length});
 $('storage-usage').textContent=ClickImageUtils.formatFileSize(state.images.reduce((n,i)=>n+i.sizeBytes,0))+' / 512 MB';
 const previous=$('destination').value;$('destination').replaceChildren(...librariesFolders().filter(f=>f.id!==activeFolder).map(f=>new Option((f.parentId?(librariesFolders().find(parent=>parent.id===f.parentId)?.name+' / '):'')+f.name,f.id)));if([...$('destination').options].some(o=>o.value===previous))$('destination').value=previous;
 const visible=filtered().slice(0,visibleLimit),visibleIds=new Set(visible.map(i=>i.id));
 for(const [id,card]of cards)if(!visibleIds.has(id)){card.remove();cards.delete(id);URL.revokeObjectURL(objectURLs.get(id));objectURLs.delete(id)}
 for(const item of visible){
  let card=cards.get(item.id);
  if(!card){
   card=ClickImageCards.create();card.dataset.id=item.id;
   const label=document.createElement('label');label.className='library-check';const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Selecionar imagem');ClickImageI18n.apply(check);label.append(check);card.prepend(label);
   check.onchange=()=>{check.checked?selected.add(item.id):selected.delete(item.id);controls()};
   const input=card.querySelector('.title-input');input.oninput=()=>drafts.set(item.id,input.value);
   input.onchange=()=>run(async()=>{await L.renameImage(activeFolder,item.id,input.value);drafts.delete(item.id)});input.onkeydown=event=>{if(event.key==='Enter')input.blur()};
   card.querySelector('.copy-url').onclick=()=>run(async()=>{await navigator.clipboard.writeText(card._item.url);say(t('URL original copiada.'))});
   card.querySelector('.reverse-search').onclick=()=>run(()=>chrome.tabs.create({url:ClickImageActions.reverseSearchURL(card._item.url)}));
   card.querySelector('.open-image').onclick=()=>openImage(item.id);
   const img=card.querySelector('.preview');img.onclick=()=>openImage(item.id);img.onauxclick=event=>{if(event.button===1){event.preventDefault();openImage(item.id)}};img.onmousedown=event=>{if(event.button===1)event.preventDefault()};
   img.onerror=()=>{img.hidden=true;card.querySelector('.preview-fallback').hidden=false};
   const remove=document.createElement('button');remove.className='remove-local';remove.title='Remover imagem';remove.setAttribute('aria-label',remove.title);ClickImageI18n.apply(remove);remove.textContent='×';remove.onclick=()=>run(()=>L.removeImages(activeFolder,[item.id]));card.querySelector('.image-tools').append(remove);
   card.querySelector('.download').onclick=()=>downloads([card._item],false);
   cards.set(item.id,card);$('image-list').append(card);
   L.getBlob(item.id).then(blob=>{if(cards.get(item.id)!==card)return;const url=URL.createObjectURL(blob);objectURLs.set(item.id,url);img.src=url}).catch(error=>{img.hidden=true;card.querySelector('.preview-fallback').hidden=false;say(error.message)});
  }
  card._item=item;const input=card.querySelector('.title-input');if(document.activeElement!==input)input.value=drafts.get(item.id)??item.title;input.disabled=busy;
  card.querySelector('.library-check input').checked=selected.has(item.id);card.querySelector('.library-check input').disabled=busy;
  card.querySelector('.source').textContent=t('Imagem encontrada');card.querySelector('.dimensions').textContent=[item.format,item.width&&item.height?`${item.width} × ${item.height} px`:t('Resolução indisponível'),ClickImageUtils.formatFileSize(item.sizeBytes)].join(' - ');
  card.querySelector('.convert-png').hidden=true;card.querySelector('.item-status').textContent=t('Original salvo localmente');card.querySelector('.download').textContent=t('Baixar imagem');
  for(const button of card.querySelectorAll('button'))button.disabled=busy;
  for(const selector of ['.copy-url','.reverse-search']){card.querySelector(selector).disabled=busy||!item.url;card.querySelector(selector).title=t(item.url?(selector==='.copy-url'?'Copiar URL do arquivo encontrado':'Pesquisar no Google Lens (envia a URL)'):'URL de origem não incluída no backup.');}
 }
 $('library-empty').hidden=visible.length>0;$('load-more').hidden=filtered().length<=visible.length;controls();
}
function controls(){
 const items=chosen(),all=filtered();$('selection-count').textContent=t('{count} selecionadas',{count:items.length});
 $('select-all').checked=!!all.length&&items.length===all.length;$('select-all').indeterminate=!!items.length&&items.length<all.length;$('select-all').disabled=busy||!all.length;
 $('download-selected').textContent=t($('zip-mode').checked?'Baixar ZIP':'Baixar imagens');$('download-selected').disabled=busy||!items.length;
 for(const id of ['new-folder','rename-folder','delete-folder','import-library','export-library','library-layout','zip-mode','search','load-more','move-folder','library-picker','new-library','rename-library'])$(id).disabled=busy;
 for(const id of ['copy-selected','move-selected'])$(id).disabled=busy||!items.length||!$('destination').value;
 $('delete-selected').disabled=busy||!items.length;$('export-folders').disabled=busy||!exportFolders.size;
 const folders=librariesFolders();$('select-all-folders').checked=!!folders.length&&exportFolders.size===folders.length;$('select-all-folders').indeterminate=!!exportFolders.size&&exportFolders.size<folders.length;$('select-all-folders').disabled=busy||!folders.length;
}
async function run(action){if(busy)return;busy=true;render();try{await action()}catch(error){say(error.message)}finally{busy=false;await refresh()}}
async function openImage(id){try{await chrome.tabs.create({url:chrome.runtime.getURL('image-view.html')+'?id='+encodeURIComponent(id)})}catch(error){say(error.message)}}
function titleFor(item){return item.folderId===activeFolder?(drafts.get(item.id)??item.title):item.title}
function filename(item){return ClickImageUtils.downloadFilename('https://clickimage.invalid/image',titleFor(item),item.mime)}
function archiveName(name){return (ClickImageUtils.safeTitle(name)||'ClickImage')+'.zip'}
async function localZip(items,name,onProgress){
 const entries=[],failures=[],used=new Set(),seen=new Set();let totalBytes=0,finished=0;
 for(const item of items){
  if(seen.has(item.id))continue;seen.add(item.id);
  try{const blob=await L.getBlob(item.id);if(totalBytes+blob.size>ClickImageZip.MAX_TOTAL)throw new Error('Limite de tamanho do ZIP excedido.');const bytes=new Uint8Array(await blob.arrayBuffer());entries.push({name:ClickImageZip.uniqueName((item.archivePath||'')+filename(item),used),bytes});totalBytes+=bytes.length}catch(error){failures.push(item.title+': '+t(error.message))}
  onProgress?.(++finished,items.length);
 }
 if(!entries.length)throw new Error('Nenhuma imagem pôde ser obtida para o ZIP.');
 await ClickImageFiles.save(ClickImageZip.archive(entries),archiveName(name));return {included:entries.length,failures};
}
async function downloads(items,zip){return run(async()=>{
 const unique=[...new Map(items.map(i=>[i.id,i])).values()];if(!unique.length)return;
 let included=0,failures=[];
 if(zip){const result=await localZip(unique,folder()?.name,(finished,total)=>say(t('Processando {finished} de {total}…',{finished,total})));included=result.included;failures=result.failures}
 else{const used=new Set();for(const item of unique){try{const blob=await L.getBlob(item.id);await ClickImageFiles.save(blob,ClickImageZip.uniqueName(filename(item),used));included++}catch(error){failures.push(item.title+': '+t(error.message))}say(t('Processando {finished} de {total}…',{finished:included+failures.length,total:unique.length}))}}
 say(t('Concluído: {count} imagens.',{count:included})+(failures.length?'\n'+t('Falhas: {count}',{count:failures.length})+'\n'+failures.join('\n'):''));
 })}
$('download-selected').onclick=()=>downloads(chosen(),$('zip-mode').checked);
$('zip-mode').onchange=()=>{controls();chrome.storage.local.set({clickimageLibraryZip:$('zip-mode').checked}).catch(()=>{})};
$('select-all').onchange=()=>{const checked=$('select-all').checked;for(const item of filtered())checked?selected.add(item.id):selected.delete(item.id);render()};
$('search').oninput=()=>{search=$('search').value;visibleLimit=60;selected.clear();render()};
$('load-more').onclick=()=>{visibleLimit+=60;render()};
$('new-set').onclick=()=>{const parent=folder();if(!parent||parent.parentId)return;const name=prompt(t('Nome do conjunto'));if(name!==null)run(async()=>{const f=await L.createFolder(name,activeLibrary,parent.id);collapsedGroups.delete(parent.id);activeFolder=f.id;selected.clear()})};
$('move-folder').onclick=()=>{const current=folder();if(!current)return;const blocked=L.descendants(librariesFolders(),current.id);$('folder-parent').replaceChildren(new Option(t('Primeiro nível (grupo)'),''),...librariesFolders().filter(f=>!f.parentId&&!blocked.has(f.id)&&!librariesFolders().some(child=>child.parentId===current.id)).map(f=>new Option(f.name,f.id)));$('folder-parent').value=current.parentId||'';$('folder-parent-dialog').showModal()};
$('folder-parent-dialog').addEventListener('close',()=>{if($('folder-parent-dialog').returnValue==='save')run(()=>L.moveFolder(activeFolder,$('folder-parent').value||null))});
$('new-folder').onclick=()=>{const name=prompt(t('Nome do grupo'));if(name!==null)run(async()=>{const f=await L.createFolder(name,activeLibrary);activeFolder=f.id;selected.clear()})};
$('rename-folder').onclick=()=>{const name=prompt(t('Nome da pasta'),folder()?.name);if(name!==null)run(()=>L.renameFolder(activeFolder,name))};
$('delete-folder').onclick=()=>{if(confirm(t('Excluir esta pasta, seus conjuntos e suas referências? As outras pastas serão preservadas.')))run(()=>L.deleteFolders([activeFolder]))};
$('delete-selected').onclick=()=>{if(confirm(t('Excluir as imagens selecionadas desta pasta?')))run(async()=>{await L.removeImages(activeFolder,chosen().map(i=>i.id));selected.clear()})};
for(const mode of ['copy','move'])$(mode+'-selected').onclick=()=>run(async()=>{await L.transfer(activeFolder,$('destination').value,chosen().map(i=>i.id),mode==='move');$('organize').open=false;say(t('Organização concluída.'))});
$('library-layout').onchange=()=>{const layout=$('library-layout').value;$('image-list').dataset.layout=layout;chrome.storage.local.set({clickimageLibraryLayout:layout}).catch(()=>{})};
$('export-folders').onclick=()=>run(async()=>{
 const failures=[];let saved=0;
 const folders=librariesFolders();const roots=folders.filter(f=>exportFolders.has(f.id)&&!(f.parentId&&exportFolders.has(f.parentId)));
 for(const f of roots){const ids=L.descendants(folders,f.id),items=[...ids].flatMap(id=>entries(id).map(item=>({...item,archivePath:id===f.id?'':(ClickImageUtils.safeTitle(folders.find(child=>child.id===id).name)||'Conjunto')+'/'})));if(!items.length){failures.push(f.name+': '+t('Pasta vazia.'));continue}try{const result=await localZip(items,f.name,(finished,total)=>say(f.name+' · '+t('Processando {finished} de {total}…',{finished,total})));saved++;failures.push(...result.failures)}catch(error){failures.push(f.name+': '+t(error.message))}}
 say(t('ZIPs salvos: {count}',{count:saved})+(failures.length?'\n'+failures.join('\n'):''));
});
$('select-all-folders').onchange=()=>{const checked=$('select-all-folders').checked;exportFolders=new Set(checked?librariesFolders().map(f=>f.id):[]);render()};
function switchLibrary(id){activeLibrary=id;activeFolder='';selected.clear();exportFolders.clear();drafts.clear();search='';$('search').value='';visibleLimit=60;say('');activeFolder=librariesFolders()[0]?.id||'';render();chrome.storage.local.set({clickimageActiveLibrary:id}).catch(()=>{});refresh()}
$('library-picker').onchange=()=>switchLibrary($('library-picker').value);
$('new-library').onclick=()=>{const name=prompt(t('Nome da Biblioteca'));if(name!==null)run(async()=>{const created=await L.createLibrary(name);activeLibrary=created.id;activeFolder='';selected.clear();exportFolders.clear();drafts.clear();await chrome.storage.local.set({clickimageActiveLibrary:created.id})})};
$('rename-library').onclick=()=>{const name=prompt(t('Nome da Biblioteca'),library()?.name);if(name!==null)run(()=>L.renameLibrary(activeLibrary,name))};
$('export-library').onclick=()=>run(async()=>{
 let failed=0;const blob=await ClickImageBackup.exportLibrary(p=>{failed=p.failed||0;say(t('Processando {finished} de {total}…',p))},activeLibrary);say(t('Salvando backup…'));
 const json=blob.type==='application/json';
 const name=(ClickImageUtils.safeTitle(library()?.name)||'ClickImage')+'-backup.'+(json?'json':'zip');
 if(!json)say(t('Biblioteca acima de 16 MB: usando ZIP com JSON e imagens para reduzir o uso de memória.'));
 await ClickImageFiles.save(blob,name);say(t('Backup salvo. Guarde este arquivo em um local seguro.')+(failed?' '+t('Arquivos indisponíveis: {count}.',{count:failed}):'')+(!json?' '+t('Biblioteca acima de 16 MB: usando ZIP com JSON e imagens para reduzir o uso de memória.'):''));
});
$('import-library').onclick=()=>{$('backup-file').value='';$('backup-file').click()};
$('backup-file').onchange=()=>{
 const file=$('backup-file').files[0];if(!file)return;
 run(async()=>{
  const result=await ClickImageBackup.importLibrary(file,{onProgress:p=>say(t('Validando {finished} de {total}…',p))});
  activeLibrary=result.libraryId;activeFolder='';selected.clear();exportFolders.clear();drafts.clear();search='';$('search').value='';
  try{await chrome.storage.local.set({clickimageActiveLibrary:result.libraryId})}catch{}
  say(t('Biblioteca “{name}” importada: {folders} pastas e {images} imagens. Indisponíveis: {failed}.',result)+(result.failures.length?'\n'+result.failures.map(f=>(f.name||f.id)+': '+t(f.error)).join('\n'):''));
 });
};
window.addEventListener('pagehide',()=>{for(const url of objectURLs.values())URL.revokeObjectURL(url)});
let refreshTimer;L.onChange(()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,60)});
function language(){document.documentElement.lang=ClickImageI18n.language;ClickImageI18n.apply(document);render()}
ClickImageI18n.onChange(language);ClickImageI18n.ready.then(language);ClickImageFiles.links();
chrome.storage.local.get(['clickimageLibraryLayout','clickimageLibraryZip','clickimageActiveLibrary']).then(p=>{activeLibrary=p.clickimageActiveLibrary||'main';const layout=['grid','list'].includes(p.clickimageLibraryLayout)?p.clickimageLibraryLayout:'grid';$('library-layout').value=layout;$('image-list').dataset.layout=layout;$('zip-mode').checked=p.clickimageLibraryZip===true;controls();return refresh()}).catch(()=>refresh());
