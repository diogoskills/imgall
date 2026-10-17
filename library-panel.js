(function(root){
 'use strict';const t=(s,v)=>ClickImageI18n.t(s,v);
 async function open(){
  const url=chrome.runtime.getURL('library.html');
  const windows=await chrome.windows.getAll({populate:true});
  const existing=windows.find(w=>w.tabs?.some(tab=>tab.url===url));
  if(existing){await chrome.windows.update(existing.id,{focused:true});return}
  await chrome.windows.create({url,type:'popup',width:1100,height:800,focused:true});
 }
 function chooseFolder(){return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.className='library-dialog';
  dialog.innerHTML='<form method="dialog"><h2></h2><label class="library-destination"><span></span><select required></select></label><label class="destination-label"><span></span><select required></select></label><button type="button" class="new-folder button secondary"></button><p class="dialog-error" role="status"></p><div class="dialog-actions"><button value="cancel" class="button secondary"></button><button value="save" class="button primary"></button></div></form>';
  dialog.querySelector('h2').textContent=t('Salvar na Biblioteca');dialog.querySelector('.destination-label span').textContent=t('Pasta de destino');
  dialog.querySelector('.library-destination span').textContent=t('Biblioteca');
  const libraries=dialog.querySelector('.library-destination select'),select=dialog.querySelector('.destination-label select'),buttons=dialog.querySelectorAll('.dialog-actions button'),add=dialog.querySelector('.new-folder'),error=dialog.querySelector('.dialog-error');
  buttons[0].textContent=t('Cancelar');buttons[0].formNoValidate=true;buttons[1].textContent=t('Salvar');add.textContent=t('Novo grupo');
  let snapshot;
  const loadFolders=selected=>{select.replaceChildren(...snapshot.folders.filter(f=>f.libraryId===libraries.value).map(folder=>new Option(ClickImageTree.ancestors(snapshot.folders,folder.id).map(f=>f.name).join(' / '),folder.id)));if(selected&&[...select.options].some(o=>o.value===selected))select.value=selected};
  const load=async selected=>{
   const previous=libraries.value;snapshot=await ClickImageLibrary.snapshot();let prefs={};try{prefs=await chrome.storage.local.get(['clickimageActiveLibrary','clickimageLibraryDestination'])}catch{}
   const destination=prefs.clickimageLibraryDestination;
   libraries.replaceChildren(...snapshot.libraries.map(l=>new Option(l.name,l.id)));
   const id=previous||prefs.clickimageActiveLibrary||destination?.libraryId;
   if(snapshot.libraries.some(l=>l.id===id))libraries.value=id;
   loadFolders(selected||(destination?.libraryId===libraries.value?destination.folderId:null));
  };
  libraries.onchange=()=>loadFolders();
  add.onclick=async()=>{const name=prompt(t('Nome do grupo'));if(name===null)return;try{const f=await ClickImageLibrary.createFolder(name,libraries.value);await load(f.id);error.textContent=''}catch(e){error.textContent=t(e.message)}};
  dialog.addEventListener('close',()=>{const value=dialog.returnValue==='save'?select.value:null;dialog.remove();resolve(value?{folderId:value,libraryId:libraries.value}:null)},{once:true});
  document.body.append(dialog);load().then(()=>dialog.showModal()).catch(e=>{dialog.remove();reject(e)});
 });}
 function addSaveButton(card,getItem){
  const button=document.createElement('button');button.className='save-library';button.title='Salvar na Biblioteca';button.setAttribute('aria-label','Salvar na Biblioteca');ClickImageI18n.apply(button);
  button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h12v14l-6-4-6 4ZM10 5v5M7.5 7.5h5"/></svg>';card.querySelector('.image-tools').append(button);
  const status=document.createElement('p');status.className='library-save-status';status.setAttribute('role','status');status.hidden=true;card.querySelector('.image-tools').after(status);
  let saving=false;
  button.onclick=async()=>{
   if(saving)return;saving=true;button.disabled=true;const item={...getItem()};
   const feedback=(message,error=false)=>{status.textContent=message;status.hidden=false;status.dataset.error=String(error);const note=document.getElementById('feedback');if(note){note.textContent=(item.title||item.filename||t('Imagem selecionada'))+': '+message;note.hidden=false}};
   try{
    const destination=await chooseFolder();if(!destination)return;
    feedback(t('Salvando original…'));
    const result=await ClickImageLibrary.saveImage(destination.folderId,item);
    try{await chrome.storage.local.set({clickimageLibraryDestination:destination,clickimageActiveLibrary:destination.libraryId})}catch{}
    feedback(t(result.duplicate?'A imagem já está na pasta “{name}” ({count} imagens).':'Salva em “{name}” ({count} imagens).',{name:result.folderName,count:result.count}));
   }catch(e){feedback(t(e.message),true)}finally{saving=false;button.disabled=false}
  };

 }
 root.ClickImageLibraryPanel={open,chooseFolder,addSaveButton};
})(globalThis);
