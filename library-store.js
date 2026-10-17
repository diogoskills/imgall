// Permanent local originals. All mutations use one read/write transaction;
// hashing/network/backup validation happens before it, so interruption rolls back.
(function(root){
 'use strict';
 const DB='clickimage-library',VERSION=1,DEFAULT='references',MAX_BYTES=512*1024*1024,MAX_IMAGES=5000,MAX_FOLDERS=200,MAX_LINKS=20000;
 const stores=['folders','images','assets','links'];let connection;
 const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 function open(){
  if(connection)return connection;
  connection=new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,VERSION);
   req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('folders',{keyPath:'id'});db.createObjectStore('images',{keyPath:'id'});db.createObjectStore('assets',{keyPath:'id'});db.createObjectStore('links',{keyPath:['folderId','imageId']});req.transaction.objectStore('folders').put({id:DEFAULT,name:'Minhas referências',createdAt:Date.now()})};
   req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();connection=null};resolve(req.result)};
   req.onerror=()=>{connection=null;reject(req.error)};req.onblocked=()=>{connection=null;reject(new Error('Feche as outras janelas do ClickImage para atualizar a Biblioteca.'))};
  });return connection;
 }
 function storageError(error){if(['QuotaExceededError','UnknownError'].includes(error?.name))return new Error('Não foi possível gravar. O armazenamento local pode estar cheio. Exporte um backup ou libere espaço.');return error}
 async function notify(){try{await root.chrome?.storage?.local?.set({clickimageLibraryRevision:crypto.randomUUID()})}catch{}channel?.postMessage('changed');for(const listener of listeners)listener()}
 const listeners=new Set(),channel=typeof BroadcastChannel==='function'?new BroadcastChannel('clickimage-library'):null;
 if(channel)channel.onmessage=()=>{for(const listener of listeners)listener()};
 root.chrome?.storage?.onChanged?.addListener((changes,area)=>{if(area==='local' && changes.clickimageLibraryRevision)for(const listener of listeners)listener()});
 async function transaction(mode,fn){
  const db=await open(),tx=db.transaction(stores,mode),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error || new Error('A alteração foi cancelada. Os dados anteriores foram preservados.'));tx.onerror=()=>{}});
  const api=Object.fromEntries(stores.map(name=>[name,tx.objectStore(name)]));
  try{const result=await fn(api);await done;if(mode==='readwrite')await notify();return result}catch(error){try{tx.abort()}catch{}await done.catch(()=>{});throw storageError(error)}
 }
 async function data(api){const [folders,images,links]=await Promise.all(['folders','images','links'].map(name=>request(api[name].getAll())));return {folders,images,links}}
 function folderName(raw){const name=typeof raw==='string'?raw.trim().normalize('NFC'):'';if(!name || name.length>80 || /[\x00-\x1f]/.test(name))throw new Error('Digite um nome de pasta de até 80 caracteres.');return name}
 function requireFolder(d,id){if(!d.folders.some(f=>f.id===id))throw new Error('Pasta não encontrada.');}
 function limits(d){if(d.folders.length>MAX_FOLDERS || d.links.length>MAX_LINKS || d.images.length>MAX_IMAGES || d.images.reduce((n,i)=>n+i.sizeBytes,0)>MAX_BYTES)throw new Error('Limite da Biblioteca: 200 pastas, 5.000 imagens, 20.000 referências e 512 MB. Exporte um backup ou remova referências.');}
 function cleanOrphans(api,d){const kept=new Set(d.links.map(l=>l.imageId));for(const image of d.images)if(!kept.has(image.id)){api.images.delete(image.id);api.assets.delete(image.id)}}
 async function snapshot(){return transaction('readonly',data)}
 async function createFolder(name){name=folderName(name);return transaction('readwrite',async api=>{const d=await data(api);if(d.folders.some(f=>f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Já existe uma pasta com esse nome.');const folder={id:crypto.randomUUID(),name,createdAt:Date.now()};d.folders.push(folder);limits(d);api.folders.put(folder);return folder})}
 async function renameFolder(id,name){name=folderName(name);return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,id);if(d.folders.some(f=>f.id!==id&&f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Já existe uma pasta com esse nome.');api.folders.put({...d.folders.find(f=>f.id===id),name})})}
 async function deleteFolders(ids){return transaction('readwrite',async api=>{const d=await data(api),selected=new Set(ids);d.folders=d.folders.filter(f=>!selected.has(f.id));for(const id of selected)api.folders.delete(id);for(const link of d.links)if(selected.has(link.folderId))api.links.delete([link.folderId,link.imageId]);d.links=d.links.filter(l=>!selected.has(l.folderId));if(!d.folders.length)api.folders.put({id:DEFAULT,name:'Minhas referências',createdAt:Date.now()});cleanOrphans(api,d)})}
 function identify(bytes){
  let format=root.ClickImageUtils.formatFromBytes(bytes.subarray(0,64));
  if(!format && bytes[0]===66&&bytes[1]===77)format='BMP';
  if(!format && ((bytes[0]===73&&bytes[1]===73&&bytes[2]===42&&bytes[3]===0)||(bytes[0]===77&&bytes[1]===77&&bytes[2]===0&&bytes[3]===42)))format='TIF';
  if(!format && bytes[0]===0&&bytes[1]===0&&bytes[2]===1&&bytes[3]===0)format='ICO';
  const mime=({JPG:'image/jpeg',PNG:'image/png',WEBP:'image/webp',AVIF:'image/avif',GIF:'image/gif',BMP:'image/bmp',TIF:'image/tiff',ICO:'image/x-icon'})[format];
  if(!mime || bytes.length<12)throw new Error('Arquivo de imagem inválido ou formato não suportado na Biblioteca.');return {format,mime};
 }
 async function prepare(bytes,{title='',url='',width=0,height=0,createdAt=Date.now()}={}){
  if(!(bytes instanceof Uint8Array) || !bytes.length || bytes.length>root.ClickImageZip.MAX_FILE)throw new Error('Cada imagem da Biblioteca deve ter até 32 MB.');
  const {format,mime}=identify(bytes),digest=await crypto.subtle.digest('SHA-256',bytes),id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(typeof createImageBitmap==='function' && format!=='TIF'){let bitmap;try{bitmap=await createImageBitmap(new Blob([bytes],{type:mime}));width=bitmap.width;height=bitmap.height}catch{throw new Error('Arquivo de imagem inválido ou formato não suportado na Biblioteca.')}finally{bitmap?.close()}}
  return {image:{id,format,mime,sizeBytes:bytes.length,width:Number.isSafeInteger(width)&&width>0&&width<=100000?width:0,height:Number.isSafeInteger(height)&&height>0&&height<=100000?height:0,url:root.ClickImageUtils.validateUrl(url)||'',createdAt:Number.isSafeInteger(createdAt)&&createdAt>0?createdAt:Date.now()},asset:{id,blob:new Blob([bytes],{type:mime})},title:root.ClickImageUtils.safeTitle(title)||'Imagem'};
 }
 async function saveImage(folderId,item,{signal}={}){
  const resource=await root.ClickImageZip.readImage(item.url,signal,root.ClickImageZip.MAX_FILE);
  const prepared=await prepare(resource.bytes,item);
  if(signal?.aborted)throw new DOMException('Cancelado.','AbortError');
  return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,folderId);if(d.links.some(l=>l.folderId===folderId&&l.imageId===prepared.image.id))return {duplicate:true};if(!d.images.some(i=>i.id===prepared.image.id)){d.images.push(prepared.image);limits(d);api.images.put(prepared.image);api.assets.put(prepared.asset)}const link={folderId,imageId:prepared.image.id,title:prepared.title,createdAt:Date.now()};d.links.push(link);limits(d);api.links.put(link);return {duplicate:false}});
 }
 async function getBlob(id){return transaction('readonly',async api=>{const record=await request(api.assets.get(id));if(!record?.blob)throw new Error('O arquivo local está indisponível. Restaure um backup.');return record.blob})}
 async function renameImage(folderId,imageId,title){title=root.ClickImageUtils.safeTitle(title);if(!title)throw new Error('Digite um nome válido.');return transaction('readwrite',async api=>{const link=await request(api.links.get([folderId,imageId]));if(!link)throw new Error('Imagem removida.');api.links.put({...link,title})})}
 async function removeImages(folderId,ids){return transaction('readwrite',async api=>{const d=await data(api),selected=new Set(ids);for(const id of selected)api.links.delete([folderId,id]);d.links=d.links.filter(l=>l.folderId!==folderId||!selected.has(l.imageId));cleanOrphans(api,d)})}
 async function transfer(from,to,ids,move){return transaction('readwrite',async api=>{const d=await data(api);requireFolder(d,from);requireFolder(d,to);if(from===to)return;const selected=new Set(ids),sources=d.links.filter(l=>l.folderId===from&&selected.has(l.imageId));for(const link of sources){if(!d.links.some(l=>l.folderId===to&&l.imageId===link.imageId)){const next={...link,folderId:to};d.links.push(next);api.links.put(next)}if(move){api.links.delete([from,link.imageId]);d.links=d.links.filter(l=>l!==link)}}limits(d)})}
 async function backupData(){return transaction('readonly',async api=>{const d=await data(api);if(d.images.reduce((n,i)=>n+i.sizeBytes,0)>root.ClickImageZip.MAX_TOTAL)throw new Error('O backup aceita até 128 MB. Exporte pastas separadamente para guardar as imagens.');const assets=await request(api.assets.getAll());return {...d,assets}})}
 async function restore(prepared,{replace=false}={}){
  // prepared has already been fully validated before any existing data changes.
  return transaction('readwrite',async api=>{
   const d=replace?{folders:[],images:[],links:[]}:await data(api);if(replace)for(const name of stores)api[name].clear();
   const folderMap=new Map();let folderCount=0,imageCount=0,duplicates=0;
   for(const folder of prepared.folders){let existing=d.folders.find(f=>f.name.toLocaleLowerCase()===folder.name.toLocaleLowerCase());if(!existing){existing={id:crypto.randomUUID(),name:folder.name,createdAt:folder.createdAt};d.folders.push(existing);api.folders.put(existing);folderCount++}folderMap.set(folder.id,existing.id)}
   for(const record of prepared.images){if(!d.images.some(i=>i.id===record.image.id)){d.images.push(record.image);api.images.put(record.image);api.assets.put(record.asset)}}
   for(const link of prepared.links){const next={...link,folderId:folderMap.get(link.folderId)};if(d.links.some(l=>l.folderId===next.folderId&&l.imageId===next.imageId)){duplicates++;continue}d.links.push(next);api.links.put(next);imageCount++}
   if(!d.folders.length){const f={id:DEFAULT,name:'Minhas referências',createdAt:Date.now()};d.folders.push(f);api.folders.put(f)}limits(d);return {folders:folderCount,images:imageCount,duplicates};
  });
 }
 root.ClickImageLibrary={snapshot,createFolder,renameFolder,deleteFolders,saveImage,getBlob,renameImage,removeImages,transfer,prepare,identify,folderName,backupData,restore,onChange:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},limits:{MAX_BYTES,MAX_IMAGES,MAX_FOLDERS}};
})(globalThis);
