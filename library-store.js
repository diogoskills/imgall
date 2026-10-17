// Permanent local originals. All mutations use one read/write transaction;
// hashing/network/backup validation happens before it, so interruption rolls back.
(function(root){
 'use strict';
 const DB='clickimage-library',VERSION=2,DEFAULT='references',MAIN='main',MAX_BYTES=512*1024*1024,MAX_IMAGES=5000,MAX_FOLDERS=200,MAX_LINKS=20000;
 const stores=['libraries','folders','images','assets','links'];let connection;
 const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 function open(){
  if(connection)return connection;
  connection=new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,VERSION);
   req.onupgradeneeded=event=>{
    const db=req.result,tx=req.transaction;
    if(event.oldVersion<1){db.createObjectStore('folders',{keyPath:'id'});db.createObjectStore('images',{keyPath:'id'});db.createObjectStore('assets',{keyPath:'id'});db.createObjectStore('links',{keyPath:['folderId','imageId']});tx.objectStore('folders').put({id:DEFAULT,name:'Minhas referências',libraryId:MAIN,parentId:null,createdAt:Date.now()})}
    if(event.oldVersion<2){
     db.createObjectStore('libraries',{keyPath:'id'});tx.objectStore('libraries').put({id:MAIN,name:'Minhas referências',createdAt:Date.now()});
     const cursor=tx.objectStore('folders').openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(row){row.update({...row.value,libraryId:MAIN,parentId:null});row.continue()}};
    }
   };
   req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();connection=null};resolve(req.result)};
   req.onerror=()=>{connection=null;reject(req.error)};req.onblocked=()=>{connection=null;reject(new Error('Feche as outras janelas do ClickImage para atualizar a Biblioteca.'))};
  });return connection;
 }
 function storageError(error){if(['QuotaExceededError','UnknownError'].includes(error?.name))return new Error('Não foi possível gravar. O armazenamento local pode estar cheio. Exporte um backup ou libere espaço.');return error}
 async function notify(){try{await root.chrome?.storage?.local?.set({clickimageLibraryRevision:crypto.randomUUID()})}catch{}try{channel?.postMessage('changed')}catch{}for(const listener of listeners){try{listener()}catch{}}}
 const listeners=new Set(),channel=typeof BroadcastChannel==='function'?new BroadcastChannel('clickimage-library'):null;
 if(channel)channel.onmessage=()=>{for(const listener of listeners)listener()};
 root.chrome?.storage?.onChanged?.addListener((changes,area)=>{if(area==='local' && changes.clickimageLibraryRevision)for(const listener of listeners)listener()});
 async function transaction(mode,fn){
  const db=await open(),tx=db.transaction(stores,mode),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error || new Error('A alteração foi cancelada. Os dados anteriores foram preservados.'));tx.onerror=()=>{}});
  const api=Object.fromEntries(stores.map(name=>[name,tx.objectStore(name)]));
  try{const result=await fn(api);await done;if(mode==='readwrite')await notify();return result}catch(error){try{tx.abort()}catch{}await done.catch(()=>{});throw storageError(error)}
 }
 async function data(api){const [libraries,folders,images,links]=await Promise.all(['libraries','folders','images','links'].map(name=>request(api[name].getAll())));return {libraries,folders,images,links}}
 function folderName(raw){const name=typeof raw==='string'?raw.trim().normalize('NFC'):'';if(!name || name.length>80 || /[\x00-\x1f]/.test(name))throw new Error('Digite um nome de pasta de até 80 caracteres.');return name}
 function descendants(folders,id){const found=new Set([id]);let changed=true;while(changed){changed=false;for(const folder of folders)if(folder.parentId&&found.has(folder.parentId)&&!found.has(folder.id)){found.add(folder.id);changed=true}}return found}
 function requireFolder(d,id){if(!d.folders.some(f=>f.id===id))throw new Error('Pasta não encontrada.');}
 function limits(d){if(d.libraries.length>50 || d.folders.length>MAX_FOLDERS || d.links.length>MAX_LINKS || d.images.length>MAX_IMAGES || d.images.reduce((n,i)=>n+i.sizeBytes,0)>MAX_BYTES)throw new Error('Limite local: 50 Bibliotecas, 200 pastas, 5.000 imagens, 20.000 referências e 512 MB. Exporte um backup ou remova referências.');}
 function cleanOrphans(api,d){const kept=new Set(d.links.map(l=>l.imageId));for(const image of d.images)if(!kept.has(image.id)){api.images.delete(image.id);api.assets.delete(image.id)}}
 async function snapshot(){return transaction('readonly',data)}
 function libraryName(raw){return folderName(raw)}
 function uniqueLibraryName(name,libraries){let next=name,index=2;while(libraries.some(l=>l.name.toLocaleLowerCase()===next.toLocaleLowerCase())){const suffix=` (${index++})`;next=name.slice(0,80-suffix.length)+suffix}return next}
 function requireLibrary(d,id){if(!d.libraries.some(l=>l.id===id))throw new Error('Biblioteca não encontrada.');}
 async function createLibrary(name){name=libraryName(name);return transaction('readwrite',async api=>{const d=await data(api),library={id:crypto.randomUUID(),name:uniqueLibraryName(name,d.libraries),createdAt:Date.now()};d.libraries.push(library);const f={id:crypto.randomUUID(),libraryId:library.id,parentId:null,name:'Minhas referências',createdAt:Date.now()};d.folders.push(f);limits(d);api.libraries.put(library);api.folders.put(f);return library})}
 async function renameLibrary(id,name){name=libraryName(name);return transaction('readwrite',async api=>{const d=await data(api);requireLibrary(d,id);if(d.libraries.some(l=>l.id!==id&&l.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Já existe uma Biblioteca com esse nome.');api.libraries.put({...d.libraries.find(l=>l.id===id),name})})}
 async function createFolder(name,libraryId=MAIN,parentId=null){name=folderName(name);return transaction('readwrite',async api=>{const d=await data(api);requireLibrary(d,libraryId);if(parentId){requireFolder(d,parentId);if(d.folders.find(f=>f.id===parentId).parentId)throw new Error('Crie conjuntos dentro de um grupo.');if(d.folders.find(f=>f.id===parentId).libraryId!==libraryId)throw new Error('Pasta de destino inválida.')}if(d.folders.some(f=>f.libraryId===libraryId&&(f.parentId||null)===parentId&&f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Já existe uma pasta com esse nome.');const folder={id:crypto.randomUUID(),name,libraryId,parentId,createdAt:Date.now()};d.folders.push(folder);limits(d);api.folders.put(folder);return folder})}
 async function renameFolder(id,name){name=folderName(name);return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,id);const folder=d.folders.find(f=>f.id===id);if(d.folders.some(f=>f.id!==id&&f.libraryId===folder.libraryId&&(f.parentId||null)===(folder.parentId||null)&&f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Já existe uma pasta com esse nome.');api.folders.put({...folder,name})})}
 async function moveFolder(id,parentId=null){return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,id);const folder=d.folders.find(f=>f.id===id);if(parentId){requireFolder(d,parentId);if(d.folders.find(f=>f.id===parentId).parentId||d.folders.some(f=>f.parentId===id)||d.folders.find(f=>f.id===parentId).libraryId!==folder.libraryId||descendants(d.folders,id).has(parentId))throw new Error('Uma pasta não pode ficar dentro dela mesma ou de suas subpastas.')}if(d.folders.some(f=>f.id!==id&&f.libraryId===folder.libraryId&&(f.parentId||null)===parentId&&f.name.toLocaleLowerCase()===folder.name.toLocaleLowerCase()))throw new Error('Já existe uma pasta com esse nome.');api.folders.put({...folder,parentId})})}
 async function deleteFolders(ids){return transaction('readwrite',async api=>{const d=await data(api),selected=new Set(ids.flatMap(id=>[...descendants(d.folders,id)])),affected=new Set(d.folders.filter(f=>selected.has(f.id)).map(f=>f.libraryId));d.folders=d.folders.filter(f=>!selected.has(f.id));for(const id of selected)api.folders.delete(id);for(const link of d.links)if(selected.has(link.folderId))api.links.delete([link.folderId,link.imageId]);d.links=d.links.filter(l=>!selected.has(l.folderId));for(const libraryId of affected)if(!d.folders.some(f=>f.libraryId===libraryId))api.folders.put({id:crypto.randomUUID(),libraryId,parentId:null,name:'Minhas referências',createdAt:Date.now()});cleanOrphans(api,d)})}

 function identify(bytes){
  let format=root.ClickImageUtils.formatFromBytes(bytes.subarray(0,64));
  if(!format && bytes[0]===66&&bytes[1]===77)format='BMP';
  if(!format && ((bytes[0]===73&&bytes[1]===73&&bytes[2]===42&&bytes[3]===0)||(bytes[0]===77&&bytes[1]===77&&bytes[2]===0&&bytes[3]===42)))format='TIF';
  if(!format && bytes[0]===0&&bytes[1]===0&&bytes[2]===1&&bytes[3]===0)format='ICO';
  const mime=({JPG:'image/jpeg',PNG:'image/png',WEBP:'image/webp',AVIF:'image/avif',GIF:'image/gif',BMP:'image/bmp',TIF:'image/tiff',ICO:'image/x-icon'})[format];
  if(!mime || bytes.length<12)throw new Error('Arquivo de imagem inválido ou formato não suportado na Biblioteca.');return {format,mime};
 }
 // Inspect common raster headers before asking a native codec to decode them.
 // File-size limits alone do not stop a tiny compressed image with enormous dimensions.
 const MAX_PIXELS=64000000,MAX_SIDE=32768;
 function checkPixels(width,height){if(width>MAX_SIDE||height>MAX_SIDE||width*height>MAX_PIXELS)throw new Error('A Biblioteca aceita imagens de até 64 megapixels e 32.768 px por lado. O download original continua disponível.')}
 function checkHeaderPixels(bytes,format){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0;
  if(format==='PNG'&&bytes.length>=24){width=v.getUint32(16);height=v.getUint32(20)}
  else if(format==='GIF'&&bytes.length>=10){width=v.getUint16(6,true);height=v.getUint16(8,true)}
  else if(format==='BMP'&&bytes.length>=26&&v.getUint32(14,true)>=40){width=Math.abs(v.getInt32(18,true));height=Math.abs(v.getInt32(22,true))}
  else if(format==='WEBP'&&bytes.length>=30){const chunk=String.fromCharCode(...bytes.subarray(12,16));if(chunk==='VP8X'){width=1+bytes[24]+256*bytes[25]+65536*bytes[26];height=1+bytes[27]+256*bytes[28]+65536*bytes[29]}else if(chunk==='VP8L'&&bytes[20]===47){const bits=v.getUint32(21,true);width=1+(bits&16383);height=1+((bits>>>14)&16383)}else if(chunk==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383}}
  else if(format==='JPG'){
   let offset=2;while(offset+4<=bytes.length){if(bytes[offset++]!==255)break;while(offset<bytes.length&&bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===217||marker===218)break;if(marker===216||marker===1||(marker>=208&&marker<=215))continue;if(offset+2>bytes.length)break;const length=v.getUint16(offset);if(length<2||offset+length>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=7){height=v.getUint16(offset+3);width=v.getUint16(offset+5);break}offset+=length}
  }
  checkPixels(width,height);
 }
 async function prepare(bytes,{title='',url='',width=0,height=0,createdAt=Date.now()}={}){
  if(!(bytes instanceof Uint8Array) || !bytes.length || bytes.length>root.ClickImageZip.MAX_FILE)throw new Error('Cada imagem da Biblioteca deve ter até 32 MB.');
  const {format,mime}=identify(bytes);checkHeaderPixels(bytes,format);const digest=await crypto.subtle.digest('SHA-256',bytes),id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(typeof createImageBitmap==='function' && format!=='TIF'){let bitmap;try{bitmap=await createImageBitmap(new Blob([bytes],{type:mime}));width=bitmap.width;height=bitmap.height;checkPixels(width,height)}catch(error){if(error.message.startsWith('A Biblioteca aceita'))throw error;throw new Error('Arquivo de imagem inválido ou formato não suportado na Biblioteca.')}finally{bitmap?.close()}}
  checkPixels(width,height);
  return {image:{id,format,mime,sizeBytes:bytes.length,width:Number.isSafeInteger(width)&&width>0&&width<=100000?width:0,height:Number.isSafeInteger(height)&&height>0&&height<=100000?height:0,url:root.ClickImageUtils.validateUrl(url)||'',createdAt:Number.isSafeInteger(createdAt)&&createdAt>0?createdAt:Date.now()},asset:{id,blob:new Blob([bytes],{type:mime})},title:root.ClickImageUtils.safeTitle(title)||'Imagem'};
 }
 async function saveImage(folderId,item,{signal}={}){
  const resource=await root.ClickImageZip.readImage(item.url,signal,root.ClickImageZip.MAX_FILE);
  const prepared=await prepare(resource.bytes,item);
  if(signal?.aborted)throw new DOMException('Cancelado.','AbortError');
  return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,folderId);if(d.links.some(l=>l.folderId===folderId&&l.imageId===prepared.image.id))return {duplicate:true,imageId:prepared.image.id,folderId,folderName:d.folders.find(f=>f.id===folderId).name,count:d.links.filter(l=>l.folderId===folderId).length};if(!d.images.some(i=>i.id===prepared.image.id)){d.images.push(prepared.image);limits(d);api.images.put(prepared.image);api.assets.put(prepared.asset)}const link={folderId,imageId:prepared.image.id,title:prepared.title,createdAt:Date.now()};d.links.push(link);limits(d);api.links.put(link);return {duplicate:false,imageId:prepared.image.id,folderId,folderName:d.folders.find(f=>f.id===folderId).name,count:d.links.filter(l=>l.folderId===folderId).length}});
 }
 async function getBlob(id){return transaction('readonly',async api=>{const record=await request(api.assets.get(id));if(!record?.blob)throw new Error('O arquivo local está indisponível. Restaure um backup.');return record.blob})}
 async function renameImage(folderId,imageId,title){title=root.ClickImageUtils.safeTitle(title);if(!title)throw new Error('Digite um nome válido.');return transaction('readwrite',async api=>{const link=await request(api.links.get([folderId,imageId]));if(!link)throw new Error('Imagem removida.');api.links.put({...link,title})})}
 async function removeImages(folderId,ids){return transaction('readwrite',async api=>{const d=await data(api),selected=new Set(ids);for(const id of selected)api.links.delete([folderId,id]);d.links=d.links.filter(l=>l.folderId!==folderId||!selected.has(l.imageId));cleanOrphans(api,d)})}
 async function transfer(from,to,ids,move){return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,from);requireFolder(d,to);if(from===to)return;const selected=new Set(ids),sources=d.links.filter(l=>l.folderId===from&&selected.has(l.imageId));for(const link of sources){if(!d.links.some(l=>l.folderId===to&&l.imageId===link.imageId)){const next={...link,folderId:to};d.links.push(next);api.links.put(next)}if(move){api.links.delete([from,link.imageId]);d.links=d.links.filter(l=>l!==link)}}limits(d)})}
 async function backupData(libraryId=MAIN){return transaction('readonly',async api=>{
  const d=await data(api);requireLibrary(d,libraryId);const library=d.libraries.find(l=>l.id===libraryId),folders=d.folders.filter(f=>f.libraryId===libraryId),folderIds=new Set(folders.map(f=>f.id)),links=d.links.filter(l=>folderIds.has(l.folderId)),ids=new Set(links.map(l=>l.imageId)),images=d.images.filter(i=>ids.has(i.id));
  if(images.reduce((n,i)=>n+i.sizeBytes,0)>root.ClickImageZip.MAX_TOTAL)throw new Error('O backup aceita até 128 MB. Exporte pastas separadamente para guardar as imagens.');
  const assets=await Promise.all(images.map(i=>request(api.assets.get(i.id))));return {library,folders,images,links,assets:assets.filter(Boolean)};
 })}
 async function restore(prepared,options={}){
  if(options.replace)throw new Error('A importação cria uma nova Biblioteca e preserva as existentes.');
  return transaction('readwrite',async api=>{
   const d=await data(api),library={id:crypto.randomUUID(),name:uniqueLibraryName(libraryName(prepared.name||'Minhas referências'),d.libraries),createdAt:Date.now()};
   d.libraries.push(library);api.libraries.put(library);
   const folderMap=new Map();let folderCount=0,imageCount=0;
   for(const folder of prepared.folders)folderMap.set(folder.id,crypto.randomUUID());
   for(const folder of prepared.folders){const next={id:folderMap.get(folder.id),libraryId:library.id,parentId:folder.parentId?folderMap.get(folder.parentId):null,name:folder.name,createdAt:folder.createdAt};d.folders.push(next);api.folders.put(next);folderCount++}
   for(const record of prepared.images){if(!d.images.some(i=>i.id===record.image.id)){d.images.push(record.image);api.images.put(record.image)}api.assets.put(record.asset)}
   for(const link of prepared.links){const next={...link,folderId:folderMap.get(link.folderId)};if(d.links.some(l=>l.folderId===next.folderId&&l.imageId===next.imageId))continue;d.links.push(next);api.links.put(next);imageCount++}
   if(!prepared.folders.length){const f={id:crypto.randomUUID(),libraryId:library.id,parentId:null,name:'Minhas referências',createdAt:Date.now()};d.folders.push(f);api.folders.put(f);folderCount++}
   limits(d);return {libraryId:library.id,name:library.name,folders:folderCount,images:imageCount,failed:prepared.failures?.length||0,failures:prepared.failures||[]};
  });
 }

 root.ClickImageLibrary={snapshot,createLibrary,renameLibrary,libraryName,descendants,moveFolder,createFolder,renameFolder,deleteFolders,saveImage,getBlob,renameImage,removeImages,transfer,prepare,identify,folderName,backupData,restore,onChange:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},limits:{MAX_BYTES,MAX_IMAGES,MAX_FOLDERS}};
})(globalThis);
