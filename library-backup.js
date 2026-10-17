// Backup v2: JSON + Base64 for small libraries; ZIP STORE for larger ones.
// Legacy v1 ZIPs remain importable. Restore always creates a separate library.
(function(root){
 'use strict';
 const LIMIT=128*1024*1024,MAX_MANIFEST=4*1024*1024,MAX_ENTRIES=5001,JSON_IMAGES=16*1024*1024,JSON_LIMIT=28*1024*1024;
 function invalid(){throw new Error('Backup inválido, corrompido ou de versão não suportada.');}
 function safePath(name){return typeof name==='string'&&name.length<=4096&&!name.startsWith('/')&&!/[\\:\x00-\x1f]/.test(name)&&!name.split('/').some(p=>!p||p==='.'||p==='..')}
 function unpack(bytes){
  if(bytes.length<22 || bytes.length>LIMIT+MAX_MANIFEST+2*1024*1024)invalid();
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
  if(v.getUint32(end,true)!==0x06054b50 || v.getUint16(end+4,true)!==0 || v.getUint16(end+6,true)!==0 || v.getUint16(end+20,true)!==0)invalid();
  const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
  if(count!==v.getUint16(end+8,true)||!count||count>MAX_ENTRIES||start+size!==end)invalid();
  const files=new Map(),decoder=new TextDecoder('utf-8',{fatal:true});let offset=start,localEnd=0,total=0;
  try{for(let n=0;n<count;n++){
   if(offset+46>end||v.getUint32(offset,true)!==0x02014b50)invalid();
   const flags=v.getUint16(offset+8,true),method=v.getUint16(offset+10,true),crc=v.getUint32(offset+16,true),packed=v.getUint32(offset+20,true),length=v.getUint32(offset+24,true),nameLength=v.getUint16(offset+28,true),extra=v.getUint16(offset+30,true),comment=v.getUint16(offset+32,true),local=v.getUint32(offset+42,true);
   if(flags!==0x800||method!==0||packed!==length||extra||comment||v.getUint16(offset+34,true)||offset+46+nameLength>end||local!==localEnd||local+30>start)invalid();
   const nameBytes=bytes.subarray(offset+46,offset+46+nameLength),name=decoder.decode(nameBytes);
   if(!safePath(name)||files.has(name)||v.getUint32(local,true)!==0x04034b50||v.getUint16(local+6,true)!==flags||v.getUint16(local+8,true)!==0||v.getUint32(local+14,true)!==crc||v.getUint32(local+18,true)!==length||v.getUint32(local+22,true)!==length||v.getUint16(local+26,true)!==nameLength||v.getUint16(local+28,true)!==0)invalid();
   if(decoder.decode(bytes.subarray(local+30,local+30+nameLength))!==name)invalid();
   const contentStart=local+30+nameLength;localEnd=contentStart+length;
   if(localEnd>start||length>(name==='manifest.json'?MAX_MANIFEST:root.ClickImageZip.MAX_FILE))invalid();
   total+=length;if(total>LIMIT+MAX_MANIFEST)invalid();const data=bytes.subarray(contentStart,localEnd);if(root.ClickImageZip.crc32(data)!==crc)invalid();files.set(name,data);offset+=46+nameLength;
  }}catch{invalid()}
  if(offset!==end||localEnd!==start)invalid();return files;
 }
 function timestamp(n){return Number.isSafeInteger(n)&&n>0?n:Date.now()}
 function encodeBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
 function decodeBase64(text){
  if(typeof text!=='string'||text.length>Math.ceil(root.ClickImageZip.MAX_FILE/3)*4||text.length%4||/[^A-Za-z0-9+/=]/.test(text))invalid();
  const padding=text.indexOf('=');if(padding!==-1&&!/^={1,2}$/.test(text.slice(padding)))invalid();
  let binary;try{binary=atob(text)}catch{invalid()}if(btoa(binary)!==text)invalid();return Uint8Array.from(binary,c=>c.charCodeAt(0));
 }
 function metadata(d,images){return {format:'clickimage-library',version:3,library:{id:d.library.id,name:d.library.name},exportedAt:Date.now(),folders:d.folders.map(({id,name,parentId,kind,createdAt,order})=>({id,name,parentId:parentId||null,kind:root.ClickImageTree.kind({kind,parentId}),createdAt,order})),images,links:d.links}}
 async function exportLibrary(onProgress=()=>{},libraryId='main'){
  const d=await root.ClickImageLibrary.backupData(libraryId),images=[],assets=new Map(d.assets.map(a=>[a.id,a.blob]));let total=0,failed=0;
  if(d.images.reduce((n,i)=>n+i.sizeBytes,0)>JSON_IMAGES)throw Error('O backup JSON aceita até 16 MB de imagens. Use ZIP para exportar coleções maiores.');
  for(const image of d.images){const blob=assets.get(image.id),base={id:image.id,path:'images/'+image.id+'.'+root.ClickImageUtils.imageExtension(image.mime),mime:image.mime,format:image.format,sizeBytes:image.sizeBytes,width:image.width,height:image.height,createdAt:image.createdAt,encoding:'base64'};
   if(!blob){failed++;images.push({...base,data:null,unavailable:true})}else{total+=blob.size;if(total>JSON_IMAGES)invalid();const bytes=new Uint8Array(await blob.arrayBuffer()),record=await root.ClickImageLibrary.prepare(bytes);if(record.image.id!==image.id)invalid();images.push({...base,data:encodeBase64(bytes)})}onProgress({finished:images.length,total:d.images.length,failed});
  }
  const m=metadata(d,images),meta={...m,images:images.map(({data,...image})=>image)};if(new TextEncoder().encode(JSON.stringify(meta)).length>MAX_MANIFEST)invalid();const bytes=new TextEncoder().encode(JSON.stringify(m));if(bytes.length>JSON_LIMIT)invalid();const blob=new Blob([bytes],{type:'application/json'});await validate(blob);return blob;
 }
 async function exportSelection(libraryId,selection,{onProgress=()=>{}}={}){
  const d=await root.ClickImageLibrary.backupData(libraryId,selection),T=root.ClickImageTree,paths=new Map(),directoryNames=new Map(),used=new Set(),entries=[],images=[],failures=[],assets=new Map(d.assets.map(a=>[a.id,a.blob]));
  function path(id){if(paths.has(id))return paths.get(id);const f=d.folders.find(f=>f.id===id);if(!f)invalid();const parent=f.parentId?path(f.parentId):'';let names=directoryNames.get(f.parentId||'');if(!names){names=new Set();directoryNames.set(f.parentId||'',names)}const name=root.ClickImageZip.uniqueName(root.ClickImageUtils.safeTitle(f.name)||'Grupo',names);const result=parent+name+'/';paths.set(id,result);return result}
  for(const folder of T.ordered(d.folders))path(folder.id);
  let total=0,finished=0;for(const image of d.images){const blob=assets.get(image.id),link=d.links.find(l=>l.imageId===image.id),base={id:image.id,path:path(link.folderId)+root.ClickImageUtils.downloadFilename('https://clickimage.invalid/image',link.title,image.mime),mime:image.mime,format:image.format,sizeBytes:image.sizeBytes,width:image.width,height:image.height,createdAt:image.createdAt};
   if(!blob){base.unavailable=true;failures.push({name:link.title,error:'Arquivo não incluído no backup.'})}else{total+=blob.size;if(total>LIMIT)throw Error('Limite de tamanho do ZIP excedido.');const bytes=new Uint8Array(await blob.arrayBuffer()),record=await root.ClickImageLibrary.prepare(bytes);if(record.image.id!==image.id)invalid();base.path=root.ClickImageZip.uniqueName(base.path,used);entries.push({name:base.path,bytes})}images.push(base);onProgress({finished:++finished,total:d.images.length,failed:failures.length});
  }
  const m=metadata(d,images),bytes=new TextEncoder().encode(JSON.stringify(m));if(bytes.length>MAX_MANIFEST)invalid();entries.unshift({name:'manifest.json',bytes});const blob=root.ClickImageZip.archive(entries);await validate(blob,()=>{},{allowZip:true});return {blob,included:entries.length-1,failures};
 }
 async function validate(blob,onProgress=()=>{},{allowZip=false}={}){
  if(!blob || blob.size>LIMIT+MAX_MANIFEST+2*1024*1024)throw new Error('O backup excede o limite de 128 MB de imagens.');
  const head=new Uint8Array(await blob.slice(0,2).arrayBuffer()),isZip=head[0]===80&&head[1]===75;let files,m;if(isZip&&!allowZip)throw Error('Selecione um backup .json do ClickImage. Arquivos ZIP não são aceitos na importação.');
  if(isZip){files=unpack(new Uint8Array(await blob.arrayBuffer()));try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files.get('manifest.json')))}catch{invalid()}}
  else{if(blob.size>JSON_LIMIT)throw new Error('Backups JSON devem ter até 28 MB.');try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await blob.arrayBuffer()))}catch{invalid()}}
  if(m?.format!=='clickimage-library'||![1,2,3].includes(m.version)||(!isZip&&![2,3].includes(m.version))||!Array.isArray(m.folders)||!Array.isArray(m.images)||!Array.isArray(m.links)||m.folders.length>200||m.images.length>5000||m.links.length>20000)invalid();
  const name=m.version===1?'Minhas referências':root.ClickImageLibrary.libraryName(m.library?.name);
  if(m.version>=2&&(typeof m.library?.id!=='string'||!m.library.id||m.library.id.length>80))invalid();
  const folders=[],images=[],links=[],folderIds=new Set(),imageIds=new Set(),usedPaths=new Set(['manifest.json']),names=new Set();
  for(const f of m.folders){
   if(!f||typeof f.id!=='string'||!f.id||f.id.length>80||folderIds.has(f.id)||(f.parentId!==undefined&&f.parentId!==null&&(typeof f.parentId!=='string'||!f.parentId||f.parentId.length>80)))invalid();
   if(f.kind!==undefined&&!['collection','group','subgroup'].includes(f.kind))invalid();
   const parentId=f.parentId||null,folderName=root.ClickImageLibrary.folderName(f.name),key=JSON.stringify([parentId,folderName.toLocaleLowerCase()]);if(names.has(key))invalid();names.add(key);folderIds.add(f.id);folders.push({id:f.id,name:folderName,parentId,kind:f.kind===undefined?root.ClickImageTree.kind({parentId}):f.kind,createdAt:timestamp(f.createdAt),order:Number.isFinite(f.order)?f.order:undefined});
  }
  const byId=new Map(folders.map(f=>[f.id,f]));for(const folder of folders){const seen=new Set([folder.id]);let parent=folder.parentId;while(parent){if(seen.size>=32||!byId.has(parent)||seen.has(parent))invalid();seen.add(parent);parent=byId.get(parent).parentId}}
  let size=0;const failures=[],unavailable=new Set();
  for(const image of m.images){
   if(!image||typeof image.id!=='string'||!/^[a-f0-9]{64}$/.test(image.id)||imageIds.has(image.id)||typeof image.path!=='string'||!(m.version>=3?safePath(image.path)&&image.path!=='manifest.json':new RegExp('^images/'+image.id+'\\.(jpg|png|webp|avif|gif|bmp|tif|ico)$').test(image.path))||usedPaths.has(image.path))invalid();
   if(!isZip&&image.encoding!=='base64')invalid();
   let bytes;if(isZip)bytes=files.get(image.path);else if(image.data!==null)bytes=decodeBase64(image.data);
   if(!bytes){if(image.unavailable!==true)invalid();unavailable.add(image.id);imageIds.add(image.id);failures.push({id:image.id,error:'Arquivo não incluído no backup.'});continue}
   size+=bytes.length;if(size>(isZip?LIMIT:JSON_IMAGES))invalid();
   const record=await root.ClickImageLibrary.prepare(bytes,{width:image.width,height:image.height,createdAt:timestamp(image.createdAt)});
   if((m.version>=2&&(image.mime!==record.image.mime||image.format!==record.image.format||image.sizeBytes!==bytes.length))||record.image.id!==image.id||(m.version<3&&image.path!==`images/${image.id}.${root.ClickImageUtils.imageExtension(record.image.mime)}`))invalid();
   imageIds.add(image.id);usedPaths.add(image.path);images.push(record);onProgress({finished:images.length,total:m.images.length});
  }
  const keys=new Set(),referenced=new Set();for(const link of m.links){
   if(!link||!folderIds.has(link.folderId)||!root.ClickImageTree.acceptsImages(byId.get(link.folderId))||!imageIds.has(link.imageId)||typeof link.title!=='string'||link.title.length>80)invalid();
   const title=root.ClickImageUtils.safeTitle(link.title);if(!title)invalid();if(unavailable.has(link.imageId)){const failure=failures.find(f=>f.id===link.imageId);if(failure)failure.name=title;continue}const key=JSON.stringify([link.folderId,link.imageId]);if(keys.has(key))continue;keys.add(key);referenced.add(link.imageId);links.push({folderId:link.folderId,imageId:link.imageId,title,createdAt:timestamp(link.createdAt),order:Number.isFinite(link.order)?link.order:undefined});
  }
  if((isZip&&files.size!==usedPaths.size)||images.some(i=>!referenced.has(i.image.id)))invalid();return {name,folders,images,links,failures};
 }
 async function importLibrary(blob,{onProgress,replace=false}={}){
  if(replace)throw new Error('A importação cria uma nova Biblioteca e preserva as existentes.');
  if(blob.name&&!/\.json$/i.test(blob.name))throw Error('Selecione um backup .json do ClickImage. Arquivos ZIP não são aceitos na importação.');
  const prepared=await validate(blob,onProgress);return root.ClickImageLibrary.restore(prepared);
 }

 root.ClickImageBackup={exportLibrary,exportSelection,importLibrary,validate,unpack};
})(globalThis);
