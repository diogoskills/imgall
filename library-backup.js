// ClickImage backup v1: bounded ZIP STORE, validated before an atomic IDB restore.
(function(root){
 'use strict';
 const LIMIT=128*1024*1024,MAX_MANIFEST=4*1024*1024,MAX_ENTRIES=5001;
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
 async function exportLibrary(onProgress=()=>{}){
  const d=await root.ClickImageLibrary.backupData(),entries=[],images=[];
  const assets=new Map(d.assets.map(a=>[a.id,a.blob]));let total=0;
  for(const image of d.images){
   const blob=assets.get(image.id);if(!blob)throw new Error('O arquivo local está indisponível. Restaure um backup.');total+=blob.size;if(total>LIMIT)throw new Error('O backup aceita até 128 MB.');
   const path='images/'+image.id+'.'+root.ClickImageUtils.imageExtension(image.mime),bytes=new Uint8Array(await blob.arrayBuffer());
   entries.push({name:path,bytes});images.push({id:image.id,path,width:image.width,height:image.height,createdAt:image.createdAt});onProgress({finished:images.length,total:d.images.length});
  }
  // Source URLs are intentionally excluded: signed URLs can contain credentials.
  const manifest={format:'clickimage-library',version:1,exportedAt:Date.now(),folders:d.folders,images,links:d.links};
  const bytes=new TextEncoder().encode(JSON.stringify(manifest));if(bytes.length>MAX_MANIFEST)throw new Error('Metadados do backup excederam o limite.');entries.unshift({name:'manifest.json',bytes});
  return root.ClickImageZip.archive(entries);
 }
 async function validate(blob,onProgress=()=>{}){
  if(!blob || blob.size>LIMIT+MAX_MANIFEST+2*1024*1024)throw new Error('O backup excede o limite de 128 MB de imagens.');
  const files=unpack(new Uint8Array(await blob.arrayBuffer()));let m;
  try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files.get('manifest.json')))}catch{invalid()}
  if(m?.format!=='clickimage-library'||m.version!==1||!Array.isArray(m.folders)||!Array.isArray(m.images)||!Array.isArray(m.links)||m.folders.length>200||m.images.length>5000||m.links.length>20000)invalid();
  const folders=[],images=[],links=[],folderIds=new Set(),imageIds=new Set(),usedPaths=new Set(['manifest.json']),names=new Set();
  for(const f of m.folders){if(!f||typeof f.id!=='string'||f.id.length>80||folderIds.has(f.id))invalid();const name=root.ClickImageLibrary.folderName(f.name);if(names.has(name.toLocaleLowerCase()))invalid();names.add(name.toLocaleLowerCase());folderIds.add(f.id);folders.push({id:f.id,name,createdAt:timestamp(f.createdAt)})}
  let size=0;
  for(const image of m.images){
   if(!image||typeof image.id!=='string'||!/^[a-f0-9]{64}$/.test(image.id)||imageIds.has(image.id)||typeof image.path!=='string'||!new RegExp('^images/'+image.id+'\\.(jpg|png|webp|avif|gif|bmp|tif|ico)$').test(image.path)||usedPaths.has(image.path))invalid();
   const bytes=files.get(image.path);if(!bytes)invalid();size+=bytes.length;if(size>LIMIT)invalid();
   const record=await root.ClickImageLibrary.prepare(bytes,{width:image.width,height:image.height,createdAt:timestamp(image.createdAt)});
   if(record.image.id!==image.id||image.path!==`images/${image.id}.${root.ClickImageUtils.imageExtension(record.image.mime)}`)invalid();
   imageIds.add(image.id);usedPaths.add(image.path);images.push(record);onProgress({finished:images.length,total:m.images.length});
  }
  const keys=new Set(),referenced=new Set();for(const link of m.links){
   if(!link||!folderIds.has(link.folderId)||!imageIds.has(link.imageId)||typeof link.title!=='string'||link.title.length>80)invalid();
   const title=root.ClickImageUtils.safeTitle(link.title);if(!title)invalid();const key=JSON.stringify([link.folderId,link.imageId]);if(keys.has(key))continue;keys.add(key);referenced.add(link.imageId);links.push({folderId:link.folderId,imageId:link.imageId,title,createdAt:timestamp(link.createdAt)});
  }
  if(files.size!==usedPaths.size||images.some(i=>!referenced.has(i.image.id)))invalid();return {folders,images,links};
 }
 async function importLibrary(blob,{replace=false,confirmed=false,onProgress}={}){
  if(replace&&!confirmed)throw new Error('A substituição exige confirmação explícita.');
  const prepared=await validate(blob,onProgress);return root.ClickImageLibrary.restore(prepared,{replace});
 }
 root.ClickImageBackup={exportLibrary,importLibrary,validate,unpack};
})(globalThis);
