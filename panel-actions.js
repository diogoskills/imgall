(function(root){
 'use strict';
 function reverseSearchURL(raw){
  const url=root.ClickImageUtils.validateUrl(raw);
  if(!url)throw new Error('URL de imagem inválida.');
  return 'https://lens.google.com/uploadbyurl?url='+encodeURIComponent(url);
 }
 async function openImage(raw,tabs=root.chrome.tabs){
  const url=root.ClickImageUtils.validateUrl(raw);
  if(!url)throw new Error('URL de imagem inválida.');
  const tab=await tabs.create({url,active:false});
  // Apply after navigation: the image host's saved zoom could otherwise win.
  await new Promise(resolve=>{
   let timer;const done=()=>{clearTimeout(timer);tabs.onUpdated.removeListener(updated);resolve()};
   const updated=(id,change)=>{if(id===tab.id && change.status==='complete')done()};
   tabs.onUpdated.addListener(updated);timer=setTimeout(done,15000);
   tabs.get(tab.id).then(current=>{if(current.status==='complete')done()}).catch(done);
  });
  let zoomSet=true;
  try{await tabs.setZoomSettings(tab.id,{mode:'automatic',scope:'per-tab'});await tabs.setZoom(tab.id,1)}catch{zoomSet=false}
  return {ok:true,zoomSet};
 }
 root.ClickImageActions={reverseSearchURL,openImage};
 if(typeof module!=='undefined')module.exports=root.ClickImageActions;
})(globalThis);
