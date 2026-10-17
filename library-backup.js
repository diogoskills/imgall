// Backup v2: JSON + Base64 for small libraries; ZIP STORE for larger ones.
// Legacy v1 ZIPs remain importable. Restore always creates a separate library.
(function(root){
 'use strict';
 const LIMIT=128*1024*1024,MAX_MANIFEST=4*1024*1024,MAX_ENTRIES=5001,JSON_IMAGES=16*1024*1024,JSON_LIMIT=28*1024*1024;
 function invalid(){throw new Error('Backup inválido, corrompido ou de versão não suportada.');}
 function safePath(name){return typeof name==='string'&&name.length<=180&&!name.startsWith('/')&&!/[\\:\x00-\x1f]/.test(name)&&!name.split('/').some(p=>!p||p==='.'||p==='..')}
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
 async function exportLibrary(onProgress=()=>{},libraryId='main'){
  const d=await root.ClickImageLibrary.backupData(libraryId),entries=[],images=[];
  const assets=new Map(d.assets.map(a=>[a.id,a.blob])),json=d.images.reduce((n,i)=>n+i.sizeBytes,0)<=JSON_IMAGES;let total=0,failed=0;
  for(const image of d.images){
   const blob=assets.get(image.id);if(!blob){failed++;images.push({id:image.id,path:'images/'+image.id+'.'+root.ClickImageUtils.imageExtension(image.mime),mime:image.mime,format:image.format,sizeBytes:image.sizeBytes,width:image.width,height:image.height,createdAt:image.createdAt,unavailable:true,...(json?{encoding:'base64',data:null}:{})});onProgress({finished:images.length,total:d.images.length,failed});continue}total+=blob.size;if(total>LIMIT)throw new Error('O backup aceita até 128 MB.');
   const path='images/'+image.id+'.'+root.ClickImageUtils.imageExtension(image.mime),bytes=new Uint8Array(await blob.arrayBuffer());
   const record=await root.ClickImageLibrary.prepare(bytes,{width:image.width,height:image.height});if(record.image.id!==image.id)invalid();
   if(!json)entries.push({name:path,bytes});
   images.push({id:image.id,path,mime:image.mime,format:image.format,sizeBytes:image.sizeBytes,width:image.width,height:image.height,createdAt:image.createdAt,...(json?{encoding:'base64',data:encodeBase64(bytes)}:{})});onProgress({finished:images.length,total:d.images.length,failed});
  }
  // Signed source URLs never enter backups. Names and memberships remain local metadata.
  const manifest={format:'clickimage-library',version:2,library:{id:d.library.id,name:d.library.name},exportedAt:Date.now(),folders:d.folders.map(({id,name,parentId,createdAt})=>({id,name,parentId:parentId||null,createdAt})),images,links:d.links};
  const metadata={...manifest,images:images.map(({data,...image})=>image)};
  if(new TextEncoder().encode(JSON.stringify(metadata)).length>MAX_MANIFEST)throw new Error('Metadados do backup excederam o limite.');
  const bytes=new TextEncoder().encode(JSON.stringify(manifest));
  if(json){if(bytes.length>JSON_LIMIT)invalid();return new Blob([bytes],{type:'application/json'})}
  entries.unshift({name:'manifest.json',bytes});return root.ClickImageZip.archive(entries);
 }
 async function validate(blob,onProgress=()=>{}){
  if(!blob || blob.size>LIMIT+MAX_MANIFEST+2*1024*1024)throw new Error('O backup excede o limite de 128 MB de imagens.');
  const head=new Uint8Array(await blob.slice(0,2).arrayBuffer()),isZip=head[0]===80&&head[1]===75;let files,m;
  if(isZip){files=unpack(new Uint8Array(await blob.arrayBuffer()));try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files.get('manifest.json')))}catch{invalid()}}
  else{if(blob.size>JSON_LIMIT)throw new Error('Backups JSON devem ter até 28 MB.');try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await blob.arrayBuffer()))}catch{invalid()}}
  if(m?.format!=='clickimage-library'||![1,2].includes(m.version)||(!isZip&&m.version!==2)||!Array.isArray(m.folders)||!Array.isArray(m.images)||!Array.isArray(m.links)||m.folders.length>200||m.images.length>5000||m.links.length>20000)invalid();
  const name=m.version===1?'Minhas referências':root.ClickImageLibrary.libraryName(m.library?.name);
  if(m.version===2&&(typeof m.library?.id!=='string'||!m.library.id||m.library.id.length>80))invalid();
  const folders=[],images=[],links=[],folderIds=new Set(),imageIds=new Set(),usedPaths=new Set(['manifest.json']),names=new Set();
  for(const f of m.folders){
   if(!f||typeof f.id!=='string'||!f.id||f.id.length>80||folderIds.has(f.id)||(f.parentId!==undefined&&f.parentId!==null&&(typeof f.parentId!=='string'||!f.parentId||f.parentId.length>80)))invalid();
   const parentId=f.parentId||null,folderName=root.ClickImageLibrary.folderName(f.name),key=JSON.stringify([parentId,folderName.toLocaleLowerCase()]);if(names.has(key))invalid();names.add(key);folderIds.add(f.id);folders.push({id:f.id,name:folderName,parentId,createdAt:timestamp(f.createdAt)});
  }
  const byId=new Map(folders.map(f=>[f.id,f]));for(const folder of folders){const seen=new Set([folder.id]);let parent=folder.parentId;while(parent){if(seen.size>=2||!byId.has(parent)||seen.has(parent))invalid();seen.add(parent);parent=byId.get(parent).parentId}}
  let size=0;const failures=[],unavailable=new Set();
  for(const image of m.images){
   if(!image||typeof image.id!=='string'||!/^[a-f0-9]{64}$/.test(image.id)||imageIds.has(image.id)||typeof image.path!=='string'||!new RegExp('^images/'+image.id+'\\.(jpg|png|webp|avif|gif|bmp|tif|ico)$').test(image.path)||usedPaths.has(image.path))invalid();
   if(!isZip&&image.encoding!=='base64')invalid();
   let bytes;if(isZip)bytes=files.get(image.path);else if(image.data!==null)bytes=decodeBase64(image.data);
   if(!bytes){if(image.unavailable!==true)invalid();unavailable.add(image.id);imageIds.add(image.id);failures.push({id:image.id,error:'Arquivo não incluído no backup.'});continue}
   size+=bytes.length;if(size>(isZip?LIMIT:JSON_IMAGES))invalid();
   const record=await root.ClickImageLibrary.prepare(bytes,{width:image.width,height:image.height,createdAt:timestamp(image.createdAt)});
   if((m.version===2&&(image.mime!==record.image.mime||image.format!==record.image.format||image.sizeBytes!==bytes.length))||record.image.id!==image.id||image.path!==`images/${image.id}.${root.ClickImageUtils.imageExtension(record.image.mime)}`)invalid();
   imageIds.add(image.id);usedPaths.add(image.path);images.push(record);onProgress({finished:images.length,total:m.images.length});
  }
  const keys=new Set(),referenced=new Set();for(const link of m.links){
   if(!link||!folderIds.has(link.folderId)||!imageIds.has(link.imageId)||typeof link.title!=='string'||link.title.length>80)invalid();
   const title=root.ClickImageUtils.safeTitle(link.title);if(!title)invalid();if(unavailable.has(link.imageId)){const failure=failures.find(f=>f.id===link.imageId);if(failure)failure.name=title;continue}const key=JSON.stringify([link.folderId,link.imageId]);if(keys.has(key))continue;keys.add(key);referenced.add(link.imageId);links.push({folderId:link.folderId,imageId:link.imageId,title,createdAt:timestamp(link.createdAt)});
  }
  if((isZip&&files.size!==usedPaths.size)||images.some(i=>!referenced.has(i.image.id)))invalid();return {name,folders,images,links,failures};
 }
 async function importLibrary(blob,{onProgress,replace=false}={}){
  if(replace)throw new Error('A importação cria uma nova Biblioteca e preserva as existentes.');
  const prepared=await validate(blob,onProgress);return root.ClickImageLibrary.restore(prepared);
 }

 root.ClickImageBackup={exportLibrary,importLibrary,validate,unpack};
})(globalThis);
