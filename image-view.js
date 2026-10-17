'use strict';
(async()=>{try{
 const id=new URL(location.href).searchParams.get('id');if(!/^[a-f0-9]{64}$/.test(id||''))throw new Error('Imagem não encontrada.');
 const blob=await ClickImageLibrary.getBlob(id),url=URL.createObjectURL(blob),img=document.getElementById('original');img.src=url;img.hidden=false;
 window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
 try{const tab=await chrome.tabs.getCurrent();await chrome.tabs.setZoomSettings(tab.id,{mode:'automatic',scope:'per-tab'});await chrome.tabs.setZoom(tab.id,1)}catch{}
}catch(error){document.getElementById('error').textContent=error.message}})();
