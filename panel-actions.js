(function(root){
 'use strict';
 const MAX_BYTES=16*1024*1024;
 function reverseSearchURL(raw){
  const url=root.ClickImageUtils.validateUrl(raw);
  if(!url)throw new Error('URL de imagem inválida.');
  return 'https://lens.google.com/uploadbyurl?url='+encodeURIComponent(url);
 }
 function isPngDataURL(raw){return typeof raw==='string' && raw.length<24*1024*1024 && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(raw);}
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
  await tabs.update(tab.id,{active:true});
  return {ok:true,zoomSet};
 }
 async function convertWebpToPng(url){
  if(!root.ClickImageUtils.validateUrl(url))throw new Error('URL inválida.');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  let reader,bitmap;
  try{
   const response=await fetch(url,{signal:abort.signal,credentials:'same-origin'});
   if(!response.ok || !response.body)throw new Error('O site não permitiu obter o WebP para conversão.');
   if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new Error('A beta aceita arquivos de até 16 MB.');
   reader=response.body.getReader();const chunks=[];let total=0;
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_BYTES)throw new Error('A beta aceita arquivos de até 16 MB.');chunks.push(value);}
   const blob=new Blob(chunks,{type:'image/webp'});
   const header=new Uint8Array(await blob.slice(0,64).arrayBuffer());
   if(root.ClickImageUtils.formatFromBytes(header)!=='WEBP')throw new Error('O recurso recebido não é WebP.');
   if(String.fromCharCode(...header.slice(12,16))==='VP8X' && (header[20]&2))throw new Error('WebP animado ainda não é suportado na conversão beta.');
   bitmap=await createImageBitmap(blob);
   if(bitmap.width*bitmap.height>16000000)throw new Error('A beta aceita imagens de até 16 megapixels.');
   const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,0,0);
   const png=await canvas.convertToBlob({type:'image/png'});
   if(png.size>MAX_BYTES)throw new Error('O PNG resultante ultrapassou o limite de 16 MB da beta.');
   const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Não foi possível preparar o PNG.'));reader.readAsDataURL(png)});
   return {dataURL,width:bitmap.width,height:bitmap.height,sizeBytes:png.size};
  }catch(error){if(error.name==='AbortError')throw new Error('A conversão demorou demais. Tente baixar o original.');if(error.name==='TypeError')throw new Error('O site bloqueou a leitura para conversão. Use o download original.');throw error;}
  finally{clearTimeout(timer);bitmap?.close();if(reader)await reader.cancel().catch(()=>{});}
 }
 root.ClickImageActions={reverseSearchURL,isPngDataURL,convertWebpToPng,openImage};
 if(typeof module!=='undefined')module.exports=root.ClickImageActions;
})(globalThis);
