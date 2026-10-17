// Shared by the temporary collection and permanent Library.
(function(root){
 'use strict';
 async function save(blob,filename,{signal}={}){
  if(signal?.aborted)throw new DOMException('Cancelado.','AbortError');
  filename=root.ClickImageUtils.localDownloadName(filename);
  const url=URL.createObjectURL(blob);let timer;
  // Register before download so onDeterminingFilename never falls back to a blob UUID.
  const registered=root.chrome?.runtime?.sendMessage&&root.chrome?.runtime?.getURL;

  try{
   if(registered){const result=await chrome.runtime.sendMessage({type:'CLICKIMAGE_FILE_NAME',url,filename});if(!result?.ok)throw Error(result?.error||'Não foi possível preparar o nome do download.')}
   const id=await chrome.downloads.download({url,filename,conflictAction:'uniquify',saveAs:false});
   await new Promise((resolve,reject)=>{
    let settled=false;
    const clean=()=>{settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);chrome.downloads.onChanged.removeListener(changed)};
    const finish=state=>{if(settled)return;if(state==='complete'){clean();resolve()}else if(state==='interrupted'){clean();reject(new Error('Download interrompido. Confira os downloads do Chrome.'))}};
    const cancel=()=>{clean();reject(new DOMException('Cancelado.','AbortError'))};
    const changed=delta=>{if(delta.id===id)finish(delta.state?.current)};
    async function poll(){try{const [download]=await chrome.downloads.search({id});if(!download)throw new Error('Download não encontrado.');finish(download.state);if(!settled)timer=setTimeout(poll,2000)}catch{clean();reject(new Error('Não foi possível conferir o download.'))}}
    chrome.downloads.onChanged.addListener(changed);signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();else void poll();
   });
  }finally{clearTimeout(timer);URL.revokeObjectURL(url);if(registered)await chrome.runtime.sendMessage({type:'CLICKIMAGE_FILE_NAME',url,remove:true}).catch(()=>{})}
 }
 function links(scope=document){
  scope.querySelectorAll('[data-project-link]').forEach(link=>link.href=root.ClickImageConfig[link.dataset.projectLink]);
 }
 root.ClickImageFiles={save,links};
})(globalThis);
