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
  dialog.innerHTML='<form method="dialog"><h2></h2><label class="destination-label"><span></span><select required></select></label><button type="button" class="new-folder button secondary"></button><p class="dialog-error" role="status"></p><div class="dialog-actions"><button value="cancel" class="button secondary"></button><button value="save" class="button primary"></button></div></form>';
  dialog.querySelector('h2').textContent=t('Salvar na Biblioteca');dialog.querySelector('.destination-label span').textContent=t('Pasta de destino');
  const select=dialog.querySelector('select'),buttons=dialog.querySelectorAll('.dialog-actions button'),add=dialog.querySelector('.new-folder'),error=dialog.querySelector('.dialog-error');
  buttons[0].textContent=t('Cancelar');buttons[0].formNoValidate=true;buttons[1].textContent=t('Salvar');add.textContent=t('Nova pasta');
  const load=async selected=>{const d=await ClickImageLibrary.snapshot();select.replaceChildren(...d.folders.map(folder=>{const option=new Option(folder.name,folder.id);return option}));if(selected)select.value=selected};
  add.onclick=async()=>{const name=prompt(t('Nome da pasta'));if(name===null)return;try{const f=await ClickImageLibrary.createFolder(name);await load(f.id);error.textContent=''}catch(e){error.textContent=t(e.message)}};
  dialog.addEventListener('close',()=>{const value=dialog.returnValue==='save'?select.value:null;dialog.remove();resolve(value)},{once:true});
  document.body.append(dialog);load().then(()=>dialog.showModal()).catch(e=>{dialog.remove();reject(e)});
 });}
 function addSaveButton(card,getItem){
  const button=document.createElement('button');button.className='save-library';button.title='Salvar na Biblioteca';button.setAttribute('aria-label','Salvar na Biblioteca');ClickImageI18n.apply(button);
  button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h12v14l-6-4-6 4ZM10 5v5M7.5 7.5h5"/></svg>';card.querySelector('.image-tools').append(button);
  button.onclick=async()=>{button.disabled=true;let item=getItem();try{const folderId=await chooseFolder();if(!folderId)return;button.title=t('Salvando original…');const result=await ClickImageLibrary.saveImage(folderId,item);button.title=t(result.duplicate?'A imagem já está nesta pasta.':'Imagem salva na Biblioteca.');const note=document.getElementById('feedback');note.textContent=button.title;note.hidden=false}catch(e){const note=document.getElementById('feedback');note.textContent=t(e.message);note.hidden=false}finally{button.disabled=false}};
 }
 root.ClickImageLibraryPanel={open,chooseFolder,addSaveButton};
})(globalThis);
