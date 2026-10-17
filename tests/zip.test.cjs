const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {execFileSync}=require('node:child_process');
const utils=require('../image-utils.js');globalThis.ClickImageUtils=utils;
const zip=require('../zip-utils.js');const actions=require('../panel-actions.js');
test('ZIP preserves original bytes, interoperates with Python, deduplicates URLs and keeps valid files after failures',async()=>{
 const saved=globalThis.fetch;const large=fs.readFileSync(path.join(__dirname,'../icons/128.png')),small=fs.readFileSync(path.join(__dirname,'../icons/48.png'));
 const avif=Buffer.from([0,0,0,20,102,116,121,112,97,118,105,102,0,0,0,0,97,118,105,102]);
 const bodies={a:large,b:small,f:avif};const requests=[],progress=[];
 globalThis.fetch=async url=>{const key=new URL(url).pathname.slice(1);requests.push(key);if(key==='c')return new Response('',{status:403});if(key==='d')return new Response('<html>Login</html>',{headers:{'content-type':'image/png'}});if(key==='e')return new Response(large,{headers:{'content-length':String(33*1024*1024)}});return new Response(bodies[key],{headers:{'content-type':'image/jpeg'}})};
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clickimage-zip-'));
 try{
  const result=await zip.build([{url:'https://img.test/a',title:'Referência'},{url:'https://img.test/a',title:'Duplicate'},...['b','c','d','e','f'].map(key=>({url:'https://img.test/'+key,title:key==='b'?'referência':key}))],{onProgress:value=>progress.push(value)});
  assert.equal(result.included,3);assert.equal(result.failures.length,3);assert.equal(requests.filter(key=>key==='a').length,1);assert.equal(progress.at(-1).finished,6);
  const file=path.join(temp,'images.zip');fs.writeFileSync(file,Buffer.from(await result.blob.arrayBuffer()));
  const extracted=JSON.parse(execFileSync('python3',['-c','import zipfile,sys,json,base64; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps([[i.filename,i.compress_type,base64.b64encode(z.read(i)).decode()] for i in z.infolist()]))',file],{encoding:'utf8'}));
  assert.deepEqual(extracted.map(entry=>entry[0]),['Referência.png','referência (2).png','f.avif']);
  assert.ok(extracted.every(entry=>entry[1]===0));
  [large,small,avif].forEach((bytes,index)=>assert.deepEqual(Buffer.from(extracted[index][2],'base64'),bytes));
 }finally{globalThis.fetch=saved;fs.rmSync(temp,{recursive:true,force:true})}
});
test('ZIP cancellation and total failure never produce an empty successful archive',async()=>{
 const saved=globalThis.fetch;let called=0;globalThis.fetch=async()=>{called++;return new Response('',{status:403})};
 try{const controller=new AbortController();controller.abort();await assert.rejects(zip.build([{url:'https://img.test/a'}],{signal:controller.signal}),{name:'AbortError'});assert.equal(called,0);await assert.rejects(zip.build([{url:'https://img.test/a'}]),/Nenhuma imagem/)}finally{globalThis.fetch=saved}
});
test('open original image applies 100% zoom only to the new tab after loading; failure still opens it',async()=>{
 const calls=[],listeners=new Set();const tabs={create:async options=>{calls.push(['create',options]);return {id:42}},get:async()=>({status:'complete'}),onUpdated:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},setZoomSettings:async(...args)=>calls.push(['settings',...args]),setZoom:async(...args)=>calls.push(['zoom',...args]),update:async(...args)=>calls.push(['update',...args])};
 assert.deepEqual(await actions.openImage('https://img.test/a?signature=keep',tabs),{ok:true,zoomSet:true});
 assert.deepEqual(calls,[['create',{url:'https://img.test/a?signature=keep',active:false}],['settings',42,{mode:'automatic',scope:'per-tab'}],['zoom',42,1]]);assert.equal(listeners.size,0);
 tabs.setZoomSettings=async()=>{throw new Error('unavailable')};assert.deepEqual(await actions.openImage('https://img.test/a',tabs),{ok:true,zoomSet:false});
 await assert.rejects(actions.openImage('javascript:alert(1)',tabs),/inválida/);
});

test('opening waits for this tab completion before applying isolated zoom',async()=>{
 const listeners=new Set(),calls=[];const tabs={create:async()=>({id:9}),get:async()=>({status:'loading'}),onUpdated:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},setZoomSettings:async()=>calls.push('settings'),setZoom:async()=>calls.push('zoom'),update:async()=>calls.push('activate')};
 const opening=actions.openImage('https://img.test/a',tabs);await new Promise(resolve=>setImmediate(resolve));
 for(const listener of listeners)listener(8,{status:'complete'});assert.deepEqual(calls,[]);
 for(const listener of [...listeners])listener(9,{status:'complete'});
 await opening;assert.deepEqual(calls,['settings','zoom']);assert.equal(listeners.size,0);
});

test('worker opens only a trusted panel selected original, never a supplied arbitrary URL',async()=>{
 const vm=require('node:vm');let listener;const opened=[];const noop={addListener:()=>{}};
 const chrome={runtime:{id:'extension',getURL:file=>'chrome-extension://extension/'+file,onMessage:{addListener:fn=>listener=fn}},storage:{session:{get:async()=>({'clickimage:7':{status:'idle',items:[{id:'selected',url:'https://img.test/original?signature=keep'}]}})}},action:{onClicked:noop},tabs:{onRemoved:noop},downloads:{onDeterminingFilename:noop,onChanged:noop}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageActions:{openImage:async url=>{opened.push(url);return {ok:true,zoomSet:true}}}});
 const send=(message,sender)=>new Promise(resolve=>{if(listener(message,sender,resolve)!==true)resolve(undefined)});
 const panel={id:'extension',url:'chrome-extension://extension/panel.html'};
 const message={type:'CLICKIMAGE_OPEN_IMAGE',tabId:7,itemId:'selected',url:'https://unrelated.test/'};
 assert.equal((await send(message,panel)).ok,true);assert.deepEqual(opened,['https://img.test/original?signature=keep']);
 assert.equal(await send(message,{id:'extension',tab:{id:7},frameId:0}),undefined);
 assert.equal((await send({...message,itemId:'removed'},panel)).ok,false);assert.equal(opened.length,1);
});

test('YouTube read fallback verifies responses, tries only lower static variants of the same video and preserves signed query',async()=>{
 const saved=globalThis.fetch,calls=[],bytes=fs.readFileSync(path.join(__dirname,'../icons/128.png'));
 globalThis.fetch=async raw=>{const url=new URL(raw);calls.push(url);return url.pathname.endsWith('/hqdefault.jpg')?new Response(bytes):new Response('',{status:404})};
 try{const resource=await zip.readImage('https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg?sqp=signed',null,zip.MAX_FILE);assert.equal(resource.url,'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg?sqp=signed');assert.deepEqual(calls.map(u=>u.pathname.split('/').pop()),['maxresdefault.jpg','sddefault.jpg','hqdefault.jpg']);assert.ok(calls.every(u=>u.hostname==='i.ytimg.com'&&u.search==='?sqp=signed'));assert.deepEqual(Buffer.from(resource.bytes),bytes)}finally{globalThis.fetch=saved}
});
test('read diagnostics preserve HTTP status, avoid fallback for denied/network resources and reject HTML with an image MIME',async()=>{
 const saved=globalThis.fetch;let called=0;
 try{for(const [status,pattern]of [[401,/Autenticação/],[403,/Acesso negado/],[404,/não encontrada/],[500,/HTTP 500/]]){called=0;globalThis.fetch=async()=>{called++;return new Response('',{status})};await assert.rejects(zip.readImage('https://img.test/a'),pattern);assert.equal(called,1)}globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};await assert.rejects(zip.readImage('https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg'),/rede ou permissão/);globalThis.fetch=async()=>new Response('<html>Login</html>',{headers:{'content-type':'image/jpeg'}});await assert.rejects(zip.readImage('https://img.test/a'),/não é uma imagem/)}finally{globalThis.fetch=saved}
});
test('YouTube does not accept a small placeholder as maxres, or probe a different host/video',async()=>{
 const saved=globalThis.fetch,decode=globalThis.createImageBitmap;let calls=0,closed=0;const bytes=fs.readFileSync(path.join(__dirname,'../icons/128.png'));
 globalThis.fetch=async()=>{calls++;return new Response(bytes)};globalThis.createImageBitmap=async()=>({width:120,height:90,close:()=>closed++});
 try{assert.equal(zip.youtubeThumbnail('https://i.ytimg.com.attacker.test/vi/abcdefghijk/maxresdefault.jpg'),null);assert.equal(zip.youtubeThumbnail('https://i.ytimg.com/vi/abcdefghijk/preview.gif'),null);const resource=await zip.readImage('https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg');assert.ok(resource.url.endsWith('hqdefault.jpg'));assert.equal(calls,3);assert.equal(closed,3)}finally{globalThis.fetch=saved;if(decode)globalThis.createImageBitmap=decode;else delete globalThis.createImageBitmap}
});
test('central download naming preserves original extensions, custom titles and predictable archive conflicts',()=>{
 assert.equal(utils.downloadFilename('https://site.test/Original%20name.jpeg','', 'image/jpeg'),'Original name.jpeg');assert.equal(utils.downloadFilename('https://site.test/a.webp','Minha arte','image/png'),'Minha arte.png');const used=new Set();assert.equal(utils.archiveFilename(), 'ClickImage.zip');assert.equal(utils.archiveFilename('Animes',used),'Animes.zip');assert.equal(utils.archiveFilename('Animes',used),'Animes (2).zip');assert.throws(()=>utils.localDownloadName('../escape.zip'));assert.throws(()=>utils.localDownloadName('CON.zip'));
});
test('blob filename registration and download hook survive worker state, reject unsafe paths and content-script senders',async()=>{
 const vm=require('node:vm');let listener,naming;const values={},noop={addListener:()=>{}};
 const chrome={runtime:{id:'ext',getURL:f=>'chrome-extension://ext/'+f,onMessage:{addListener:fn=>listener=fn}},storage:{session:{get:async key=>structuredClone(key===null?values:{[key]:values[key]}),set:async v=>Object.assign(values,v),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete values[k]}}},action:{onClicked:noop},tabs:{onRemoved:noop},downloads:{onDeterminingFilename:{addListener:fn=>naming=fn},onChanged:noop}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:utils});
 const send=(message,sender={id:'ext',url:'chrome-extension://ext/library.html',tab:{id:4}})=>new Promise(resolve=>{if(listener(message,sender,resolve)!==true)resolve(undefined)}),url='blob:chrome-extension://ext/123',msg={type:'CLICKIMAGE_FILE_NAME',url,filename:'Animes.zip'};
 assert.equal((await send(msg)).ok,true);const result=await new Promise(resolve=>naming({byExtensionId:'ext',url,id:1},resolve));assert.equal(result.filename,'Animes.zip');assert.equal(result.conflictAction,'uniquify');assert.equal((await send({...msg,filename:'../bad.zip'})).ok,false);assert.equal(await send(msg,{id:'ext',url:'https://site.test/',tab:{id:4},frameId:0}),undefined);assert.equal(await send({...msg,url:'blob:https://site.test/123'}),undefined);await send({...msg,remove:true});assert.equal(Object.keys(values).length,0);
});

test('individual YouTube download uses the verified fallback URL, custom name and detected format',async()=>{
 const vm=require('node:vm'),saved=globalThis.fetch,bytes=fs.readFileSync(path.join(__dirname,'../icons/128.png'));globalThis.fetch=async url=>url.endsWith('/hqdefault.jpg')?new Response(bytes):new Response('',{status:404});let listener;const downloads=[],values={'clickimage:7':{status:'idle',items:[{id:'selected',url:'https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg',title:'Minha thumbnail',format:'JPG',status:'ready'}]}},noop={addListener:()=>{}};
 const chrome={runtime:{id:'ext',getURL:f=>'chrome-extension://ext/'+f,onMessage:{addListener:fn=>listener=fn}},storage:{session:{get:async key=>structuredClone({[key]:values[key]}),set:async v=>Object.assign(values,structuredClone(v))}},action:{onClicked:noop},tabs:{onRemoved:noop},downloads:{onDeterminingFilename:noop,onChanged:noop,download:async options=>{downloads.push(options);return 99},search:async()=>[{state:'in_progress'}]}};
 try{vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:utils,ClickImageZip:zip});const result=await new Promise(resolve=>listener({type:'CLICKIMAGE_CONFIRM',tabId:7,itemId:'selected'},{id:'ext',url:'chrome-extension://ext/panel.html'},resolve));assert.equal(result.ok,true);assert.equal(downloads[0].url,'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');assert.equal(downloads[0].filename,'Minha thumbnail.png');assert.equal(values['clickimage:7'].items[0].url,downloads[0].url);assert.equal(values['clickimage:7'].items[0].format,'PNG');
 values['clickimage:7'].items[0].status='ready';values['clickimage:7'].items[0].url='https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg';globalThis.fetch=async()=>{throw new TypeError('Read blocked')};const fallback=await new Promise(resolve=>listener({type:'CLICKIMAGE_CONFIRM',tabId:7,itemId:'selected'},{id:'ext',url:'chrome-extension://ext/panel.html'},resolve));assert.equal(fallback.ok,true);assert.equal(downloads.at(-1).url,'https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg');await assert.rejects(zip.readImage(downloads.at(-1).url),/rede ou permissão/);
 }finally{globalThis.fetch=saved}
});
test('YouTube reader rejects GIF preview bytes even at a static JPG URL',async()=>{
 const saved=globalThis.fetch,png=fs.readFileSync(path.join(__dirname,'../icons/128.png')),calls=[];
 globalThis.fetch=async url=>{calls.push(url);return new Response(url.endsWith('maxresdefault.jpg')?Buffer.from('GIF89a-preview'):png)};
 try{const resource=await zip.readImage('https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg');assert.ok(resource.url.endsWith('sddefault.jpg'));assert.equal(calls.length,2)}finally{globalThis.fetch=saved}
});
