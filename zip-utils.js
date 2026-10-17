// ZIP STORE: original bytes, CRC-32 integrity and UTF-8 names. No image codec.
(function(root){
 'use strict';
 const MAX_FILE=32*1024*1024,MAX_TOTAL=128*1024*1024;
 const table=Uint32Array.from({length:256},(_,n)=>{for(let bit=0;bit<8;bit++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
 function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)}}
 function archive(entries){
  const parts=[],directory=[];let offset=0,centralSize=0;
  for(const entry of entries){
   const name=new TextEncoder().encode(entry.name),size=entry.bytes.length,crc=crc32(entry.bytes);
   const local=header(30),central=header(46),l=local.view,c=central.view;
   l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,size,true);l.setUint32(22,size,true);l.setUint16(26,name.length,true);
   c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,size,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
   parts.push(local.bytes,name,entry.bytes);directory.push(central.bytes,name);offset+=30+name.length+size;centralSize+=46+name.length;
  }
  const end=header(22),v=end.view;v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
 }
 function uniqueName(name,used){
  const dot=name.lastIndexOf('.'),base=dot>0?name.slice(0,dot):name,extension=dot>0?name.slice(dot):'';
  let result=name,index=2;while(used.has(result.normalize('NFC').toLowerCase()))result=`${base} (${index++})${extension}`;
  used.add(result.normalize('NFC').toLowerCase());return result;
 }
 function youtubeThumbnail(raw){const url=root.ClickImageUtils.validateUrl(raw);if(!url)return null;const u=new URL(url),match=/^\/(vi|vi_webp)\/([A-Za-z0-9_-]{11})\/(maxresdefault|sddefault|hqdefault|mqdefault|default)\.(jpg|webp)$/.exec(u.pathname);return u.protocol==='https:'&&['i.ytimg.com','img.youtube.com'].includes(u.hostname)&&!u.port&&match?{url:u,match}:null}
 function httpError(status){const error=new Error(status===404||status===410?'Imagem não encontrada (HTTP '+status+').':status===401?'Autenticação necessária (HTTP 401).':status===403?'Acesso negado pelo site (HTTP 403).':'Falha do servidor (HTTP '+status+').');error.status=status;return error}
 async function readImage(url,signal,budget=MAX_FILE){
  if(!root.ClickImageUtils.validateUrl(url))throw Error('URL de imagem inválida.');
  const youtube=youtubeThumbnail(url),variants=['maxresdefault','sddefault','hqdefault','mqdefault','default'];
  const urls=youtube?variants.slice(variants.indexOf(youtube.match[3])).map(variant=>{const next=new URL(youtube.url);next.pathname='/'+youtube.match[1]+'/'+youtube.match[2]+'/'+variant+'.'+youtube.match[4];return next.href}):[url];
  let failure;for(const candidate of urls){try{const resource=await readResource(candidate,signal,budget);if(youtube&&(root.ClickImageUtils.formatFromBytes(resource.bytes.subarray(0,64))==='GIF'||(String.fromCharCode(...resource.bytes.subarray(12,16))==='VP8X'&&(resource.bytes[20]&2)))){const e=Error('Prévia animada não é uma thumbnail estática.');e.status=404;throw e}if(youtube&&typeof createImageBitmap==='function'){let bitmap;try{bitmap=await createImageBitmap(new Blob([resource.bytes],{type:resource.mime}));const variant=youtubeThumbnail(candidate).match[3];if(['maxresdefault','sddefault'].includes(variant)&&bitmap.width<480){const e=Error('Prévia indisponível nesta resolução.');e.status=404;throw e}}finally{bitmap?.close()}}return resource}catch(error){if(!youtube||![404,410].includes(error.status))throw error;failure=error}}throw failure;
 }
 async function readResource(url,signal,budget){
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();const timer=setTimeout(cancel,20000);let reader;
  try{
   const response=await fetch(url,{signal:abort.signal,credentials:'same-origin'});
   if(!response.ok)throw httpError(response.status);if(!response.body)throw Error('O site retornou um arquivo vazio.');
   if(!root.ClickImageUtils.validateUrl(response.url || url))throw new Error('Redirecionamento inválido.');
   const limit=Math.min(MAX_FILE,budget);
   if(Number(response.headers.get('content-length'))>limit)throw new Error('Limite de tamanho do ZIP excedido.');
   reader=response.body.getReader();const chunks=[];let total=0;
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit)throw new Error('Limite de tamanho do ZIP excedido.');chunks.push(value)}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
   let format=root.ClickImageUtils.formatFromBytes(bytes.subarray(0,64));
   if(!format && bytes[0]===66 && bytes[1]===77)format='BMP';
   if(!format && ((bytes[0]===73 && bytes[1]===73 && bytes[2]===42 && bytes[3]===0) || (bytes[0]===77 && bytes[1]===77 && bytes[2]===0 && bytes[3]===42)))format='TIF';
   if(!format && bytes[0]===0 && bytes[1]===0 && bytes[2]===1 && bytes[3]===0)format='ICO';
   const mime=({JPG:'image/jpeg',PNG:'image/png',WEBP:'image/webp',AVIF:'image/avif',GIF:'image/gif',BMP:'image/bmp',ICO:'image/x-icon',TIF:'image/tiff'})[format] || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
   if(!total || !root.ClickImageUtils.imageExtension(mime) || (!format && mime!=='image/svg+xml'))throw new Error('O recurso recebido não é uma imagem reconhecida.');
   if(!format && !/<svg[\s>]/i.test(new TextDecoder().decode(bytes.subarray(0,4096))))throw new Error('SVG inválido.');
   return {bytes,mime,url:response.url||url};
  }catch(error){if(signal?.aborted)throw new DOMException('ZIP cancelado.','AbortError');if(error.name==='AbortError')throw new Error('Tempo de leitura excedido.');if(error.name==='TypeError'){const failure=new Error(root.navigator?.onLine===false?'Sem conexão com a internet.':'Não foi possível ler a imagem: falha de rede ou permissão de leitura (CORS). O navegador não informa qual das duas ocorreu. O download individual pode funcionar.');failure.code='READ_UNAVAILABLE';throw failure;}throw error}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(reader)await reader.cancel().catch(()=>{})}
 }
 async function build(items,{signal,onProgress=()=>{}}={}){
  const seen=new Set(),used=new Set(),entries=[],failures=[];
  const selected=items.filter(item=>{const url=root.ClickImageUtils.validateUrl(item.url);if(!url || seen.has(url))return false;seen.add(url);return true});
  if(selected.length>1000)throw new Error('O ZIP aceita até 1.000 imagens por vez.');
  let totalBytes=0,finished=0;
  for(const item of selected){
   if(signal?.aborted)throw new DOMException('ZIP cancelado.','AbortError');
   try{
    const resource=await readImage(item.url,signal,MAX_TOTAL-totalBytes);
    const name=uniqueName(root.ClickImageUtils.downloadFilename(item.url,item.title,resource.mime),used);
    entries.push({name,bytes:resource.bytes});totalBytes+=resource.bytes.length;
   }catch(error){if(signal?.aborted)throw error;failures.push({name:item.title || item.filename || 'Imagem',error:error.message})}
   onProgress({finished:++finished,total:selected.length,included:entries.length,failed:failures.length});
  }
  if(!entries.length)throw new Error('Nenhuma imagem pôde ser obtida para o ZIP. '+(failures[0]?.error || ''));
  return {blob:archive(entries),included:entries.length,failures};
 }
 root.ClickImageZip={build,archive,crc32,uniqueName,readImage,youtubeThumbnail,MAX_FILE,MAX_TOTAL};
 if(typeof module!=='undefined')module.exports=root.ClickImageZip;
})(globalThis);
