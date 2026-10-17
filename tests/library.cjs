// Real Chromium + disk IndexedDB. Chrome window/download/storage APIs are simulated.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'clickimage-library-')),png=fs.readFileSync(path.join(root,'icons/128.png'));
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');res.setHeader('Access-Control-Allow-Origin','*');if(url.pathname==='/fixture.png'){res.setHeader('Content-Type','image/png');res.end(Buffer.concat([png,Buffer.from(url.searchParams.get('variant')||'')]));return}if(url.pathname==='/denied'){res.writeHead(403).end();return}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(data)})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 let context;const errors=[];
 async function launch(){
  context=await chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true,viewport:{width:1100,height:800}});
  await context.addInitScript(()=>{
   const listeners=[];window.downloadLog=[];window.createdTabs=[];window.createdWindows=[];window.mockState={status:'idle',items:[]};let count=0;
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>window.copied=value}});
   window.chrome={runtime:{getURL:p=>location.origin+'/'+p,connect:()=>({onDisconnect:{addListener:()=>{}},postMessage:()=>{},disconnect:()=>{}}),sendMessage:async m=>m.type==='CLICKIMAGE_STATE'?{ok:true,state:mockState}:{ok:true}},windows:{getAll:async()=>[],create:async o=>{createdWindows.push(o);return {id:4}},update:async()=>{}},tabs:{create:async o=>{createdTabs.push(o);return {id:3}},query:async()=>[{id:7}],onActivated:{addListener:()=>{}},onUpdated:{addListener:()=>{}},getCurrent:async()=>({id:3}),setZoomSettings:async(id,settings)=>window.zoomSettings=settings,setZoom:async(id,zoom)=>window.zoom=zoom},storage:{local:{get:async()=>JSON.parse(localStorage.getItem('test-preferences')||'{}'),set:async value=>{const before=JSON.parse(localStorage.getItem('test-preferences')||'{}');localStorage.setItem('test-preferences',JSON.stringify({...before,...value}));const changes=Object.fromEntries(Object.entries(value).map(([key,newValue])=>[key,{newValue}]));listeners.forEach(fn=>fn(changes,'local'))}},onChanged:{addListener:fn=>listeners.push(fn)}},downloads:{download:async options=>{const blob=await(await fetch(options.url)).blob();const bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));downloadLog.push({...options,bytes});return ++count},search:async()=>[{state:'complete'}],onChanged:{addListener:()=>{},removeListener:()=>{}}}};
  });context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 }
 async function menu(page,id){await page.locator('#library-menu summary').click();await page.locator('#'+id).click()}
 async function folders(page){return page.evaluate(()=>ClickImageLibrary.snapshot())}
 async function summary(page){return page.evaluate(async()=>{const d=await ClickImageLibrary.snapshot();return {folders:d.folders.map(f=>({name:f.name,count:d.links.filter(l=>l.folderId===f.id).length})),images:d.images.length,links:d.links.length}})}
 try{
  await launch();let page=await context.newPage();await page.goto(base+'/library.html');await page.locator('#folder-title').filter({hasText:'Minhas referências'}).waitFor();
  assert.equal(await page.locator('#download-selected').isDisabled(),true);
  await menu(page,'export-library');await page.waitForFunction(()=>downloadLog.length===1);
  const emptyBackup=await page.evaluate(()=>downloadLog[0].bytes);assert.ok(emptyBackup.length>100);
  assert.equal(await page.evaluate(async bytes=>(await ClickImageBackup.validate(new Blob([new Uint8Array(bytes)]))).images.length,emptyBackup),0);
  // Panel integration, destination dialog, permanent save, hash dedup and sync.
  const panel=await context.newPage();await panel.addInitScript(base=>{window.addEventListener('DOMContentLoaded',()=>{mockState={status:'idle',items:[{id:'first',url:base+'/fixture.png?signature=private',filename:'Original.png',title:'Original',status:'ready'}]}})},base);
  await panel.goto(base+'/panel.html');await panel.evaluate(async base=>{mockState={status:'idle',items:[{id:'first',url:base+'/fixture.png?signature=private',filename:'Original.png',title:'Original',status:'ready'}]};await refresh()},base);await panel.locator('.save-library').waitFor();await panel.locator('#open-library').click();assert.equal(await panel.evaluate(()=>createdWindows[0].url),base+'/library.html');
  await panel.locator('.save-library').click();await panel.locator('dialog[open] .dialog-actions [value=save]').click();await panel.locator('#feedback').filter({hasText:'Imagem salva'}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===1);
  await panel.locator('.save-library').click();await panel.locator('dialog[open] .dialog-actions [value=save]').click();await panel.locator('#feedback').filter({hasText:'já está'}).waitFor();assert.equal((await summary(page)).images,1);
  console.log('Library: initial save, dedup and panel synchronization passed.');
  const failedSave=await page.evaluate(async base=>{const d=await ClickImageLibrary.snapshot();try{await ClickImageLibrary.saveImage(d.folders[0].id,{url:base+'/denied',title:'Blocked'});return false}catch{return (await ClickImageLibrary.snapshot()).images.length===1}},base);assert.equal(failedSave,true);
  // New destination can be created in the save dialog.
  await panel.locator('.save-library').click();panel.once('dialog',d=>d.accept('Inspiração'));await panel.locator('.new-folder').click();await panel.locator('dialog select option').filter({hasText:'Inspiração'}).waitFor({state:'attached'});await panel.locator('dialog[open] .dialog-actions [value=save]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.folder-nav').length===2);assert.equal((await summary(page)).images,1);
  page.once('dialog',d=>d.accept('Referências renomeadas'));await page.locator('#rename-folder').click();await page.locator('#folder-title').filter({hasText:'Referências renomeadas'}).waitFor();
  // Save additional distinct originals, including a URL whose query must not enter backup.
  await page.evaluate(async base=>{const d=await ClickImageLibrary.snapshot();const f=d.folders.find(f=>f.name==='Referências renomeadas');for(let i=1;i<=4;i++)await ClickImageLibrary.saveImage(f.id,{url:base+'/fixture.png?variant='+i+'&token=secret',title:'Referência '+i})},base);
  await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===5);
  await page.locator('#select-all').check();assert.equal(await page.locator('.library-check input:checked').count(),5);
  await page.locator('#library-layout').selectOption('list');assert.equal(await page.locator('#image-list').getAttribute('data-layout'),'list');await page.locator('#library-layout').selectOption('grid');
  const gaps=await page.locator('.image-card').evaluateAll(els=>els.slice(1).map(el=>{const r=el.getBoundingClientRect();const above=els.map(e=>e.getBoundingClientRect()).filter(p=>p.top<r.top-5&&Math.abs(p.left-r.left)<5).sort((a,b)=>b.top-a.top)[0];return above?r.top-above.bottom:null}).filter(n=>n!==null));assert.ok(gaps.length&&gaps.every(n=>n>=19));
  await page.locator('#search').fill('Referência 2');assert.equal(await page.locator('.image-card').count(),1);await page.locator('#search').fill('');
  await page.locator('.title-input').first().fill('Nome bonito');await page.locator('.title-input').first().press('Enter');await page.waitForFunction(async()=>{const d=await ClickImageLibrary.snapshot();return d.links.some(l=>l.title==='Nome bonito')});
  await page.screenshot({path:'/workspace/scratch/clickimage-library-populated.png',fullPage:true});
  for(const width of [360,700,1100]){await page.setViewportSize({width,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}await page.setViewportSize({width:1100,height:800});
  // Selected copy deduplicates against existing target membership; move removes source only.
  await page.locator('#select-all').check();await page.locator('#organize summary').click();await page.locator('#copy-selected').click();await page.waitForFunction(async()=>{const d=await ClickImageLibrary.snapshot();return d.links.length===10});
  await page.locator('#organize summary').click();await page.locator('#move-selected').click();await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===0);assert.equal((await summary(page)).images,5);
  await page.locator('.folder-nav button').filter({hasText:'Inspiração'}).click();await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===5);
  await page.locator('.copy-url').first().click();assert.ok((await page.evaluate(()=>copied)).startsWith(base));await page.locator('.reverse-search').first().click();assert.ok((await page.evaluate(()=>createdTabs.at(-1).url)).startsWith('https://lens.google.com/'));
  await page.locator('.preview').first().click({button:'middle'});const viewURL=await page.evaluate(()=>createdTabs.at(-1).url);assert.ok(viewURL.includes('image-view.html?id='));const viewer=await context.newPage();await viewer.goto(viewURL);await viewer.locator('#original:not([hidden])').waitFor();await viewer.waitForFunction(()=>window.zoom===1);assert.equal(await viewer.evaluate(()=>zoomSettings.scope),'per-tab');assert.equal(await viewer.locator('#original').evaluate(i=>i.naturalWidth),128);await viewer.close();
  await page.locator('#select-all').check();await page.locator('#download-selected').click();await page.waitForFunction(()=>downloadLog.length===6);let downloads=await page.evaluate(()=>downloadLog);assert.equal(downloads.slice(1).length,5);assert.equal(new Set(downloads.slice(1).map(d=>d.filename)).size,5);assert.ok(downloads.slice(1).some(d=>Buffer.from(d.bytes).equals(png)));
  await page.locator('#zip-mode').check();await page.locator('#download-selected').click();await page.waitForFunction(()=>downloadLog.length===7);assert.equal(await page.evaluate(()=>downloadLog.at(-1).filename),'Inspiração.zip');
  // Partial unavailable originals are skipped, other local files remain downloadable.
  await page.evaluate(async()=>{const d=await ClickImageLibrary.snapshot();window.missingID=d.images[0].id;window.realGetBlob=ClickImageLibrary.getBlob;ClickImageLibrary.getBlob=async id=>{if(id===missingID)throw Error('Arquivo indisponível');return realGetBlob(id)}});
  await page.locator('#download-selected').click();await page.waitForFunction(()=>downloadLog.length===8);await page.locator('#library-feedback').filter({hasText:'Falhas: 1'}).waitFor();await page.evaluate(()=>ClickImageLibrary.getBlob=realGetBlob);
  // Several folders produce separate named ZIPs, including empty-folder feedback.
  for(const checkbox of await page.locator('.folder-nav input').all())await checkbox.check();await menu(page,'export-folders');await page.locator('#library-feedback').filter({hasText:'ZIPs salvos: 1'}).waitFor();assert.equal(await page.evaluate(()=>downloadLog.length),9);
  await menu(page,'export-library');await page.waitForFunction(()=>downloadLog.length===10);const backup=await page.evaluate(()=>downloadLog.at(-1).bytes);const details=await page.evaluate(async bytes=>{const raw=new Uint8Array(bytes),files=ClickImageBackup.unpack(raw),manifest=JSON.parse(new TextDecoder().decode(files.get('manifest.json')));return {names:[...files.keys()],manifest}},backup);
  assert.equal(details.manifest.folders.length,2);assert.equal(details.manifest.images.length,5);assert.equal(JSON.stringify(details.manifest).includes('secret'),false);assert.equal(JSON.stringify(details.manifest).includes('signature'),false);
  console.log('Library: folder organization, local downloads and ZIPs passed.');
  // Merge import UI never overwrites; confirmation is mandatory for replace.
  await menu(page,'import-library');await page.locator('#backup-file').setInputFiles({name:'backup.zip',mimeType:'application/zip',buffer:Buffer.from(backup)});await page.locator('#import-dialog [value=import]').click();await page.locator('#library-feedback').filter({hasText:'Duplicidades evitadas: 5'}).waitFor();assert.equal((await summary(page)).links,5);
  const replaceDenied=await page.evaluate(async bytes=>{try{await ClickImageBackup.importLibrary(new Blob([new Uint8Array(bytes)]),{replace:true});return false}catch{return true}},backup);assert.equal(replaceDenied,true);
  await menu(page,'import-library');await page.locator('#backup-file').setInputFiles({name:'backup.zip',mimeType:'application/zip',buffer:Buffer.from(backup)});await page.locator('#import-dialog [value=replace]').check();page.once('dialog',d=>d.dismiss());await page.locator('#import-dialog [value=import]').click();assert.equal((await summary(page)).images,5);
  // Reject corruption, unsafe paths, unsupported versions, extra files, bad image/hash before mutation.
  const security=await page.evaluate(async backup=>{
   const bytes=new Uint8Array(backup),original=ClickImageBackup.unpack(bytes),m=JSON.parse(new TextDecoder().decode(original.get('manifest.json'))),cases=[];
   const make=(manifest,extra=[])=>ClickImageZip.archive([...original].filter(([n])=>n!=='manifest.json').map(([name,bytes])=>({name,bytes})).concat([{name:'manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest))}],extra));
   cases.push(new Blob(['not zip']),make({...m,version:99}),make(m,[{name:'../evil.js',bytes:new Uint8Array([1])}]),make(m,[{name:'evil.js',bytes:new Uint8Array([1])}]),make({...m,images:m.images.map((i,n)=>n?i:{...i,id:'0'.repeat(64)})}));
   const damaged=bytes.slice();damaged[40]^=1;cases.push(new Blob([damaged]));
   const results=[];for(const blob of cases){try{await ClickImageBackup.importLibrary(blob,{replace:true,confirmed:true});results.push(false)}catch{results.push(true)}}return results;
  },backup);assert.ok(security.every(Boolean));assert.equal((await summary(page)).images,5);
  // Induced quota failure after clear/puts: transaction abort preserves old data.
  const rollback=await page.evaluate(async backup=>{
   const original=IDBObjectStore.prototype.put;let injected=false;
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='assets'&&!injected){injected=true;this.transaction.abort();throw new DOMException('quota','QuotaExceededError')}return original.call(this,value,...args)};
   try{await ClickImageBackup.importLibrary(new Blob([new Uint8Array(backup)]),{replace:true,confirmed:true});return false}catch{return injected}finally{IDBObjectStore.prototype.put=original}
  },backup);assert.equal(rollback,true);assert.equal((await summary(page)).images,5);
  // Restore empty, then populated backup and check exact byte hashes.
  await page.evaluate(async bytes=>ClickImageBackup.importLibrary(new Blob([new Uint8Array(bytes)]),{replace:true,confirmed:true}),emptyBackup);assert.equal((await summary(page)).images,0);
  await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===0);await menu(page,'import-library');await page.locator('#backup-file').setInputFiles({name:'backup.zip',mimeType:'application/zip',buffer:Buffer.from(backup)});await page.locator('#import-dialog [value=replace]').check();page.once('dialog',d=>d.accept());await page.locator('#import-dialog [value=import]').click();await page.locator('#library-feedback').filter({hasText:'Restauradas: 2 pastas, 5 imagens'}).waitFor();assert.equal((await summary(page)).images,5);
  const integrity=await page.evaluate(async()=>{const d=await ClickImageLibrary.snapshot();for(const image of d.images){const blob=await ClickImageLibrary.getBlob(image.id),p=await ClickImageLibrary.prepare(new Uint8Array(await blob.arrayBuffer()));if(p.image.id!==image.id)return false}return true});assert.equal(integrity,true);
  console.log('Library: backup validation, merge, replace, quota rollback and byte integrity passed.');
  // Disk persistence through a full browser process restart (same test profile).
  await context.close();await launch();page=await context.newPage();await page.goto(base+'/library.html');await page.waitForFunction(async()=>{const d=await ClickImageLibrary.snapshot();return d.images.length===5});assert.equal((await summary(page)).folders.length,2);
  // Delete group and folder; unrelated originals survive. Default folder is recreated if all deleted.
  const d=await folders(page),populated=d.folders.find(f=>d.links.some(l=>l.folderId===f.id));await page.locator('.folder-nav button').filter({hasText:populated.name}).click();await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===5);await page.locator('#select-all').check();await page.locator('#organize summary').click();page.once('dialog',d=>d.accept());await page.locator('#delete-selected').click();await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===0);assert.equal((await summary(page)).images,0);
  page.once('dialog',d=>d.accept());await page.locator('#delete-folder').click();await page.waitForFunction(()=>document.querySelectorAll('.folder-nav').length===1);
  assert.equal(await page.locator('.donate').getAttribute('href'),'https://livepix.gg/zepoula');assert.equal(await page.locator('.donate').getAttribute('target'),'_blank');assert.equal(await page.locator('.social-link').getAttribute('href'),'https://x.com/diogoskills');
  await page.evaluate(()=>ClickImageI18n.setLanguage('en'));await page.locator('#download-selected').filter({hasText:'Download ZIP'}).waitFor();assert.equal(await page.locator('#export-library').textContent(),'Export Library');await page.evaluate(()=>ClickImageI18n.setLanguage('es'));await page.locator('#download-selected').filter({hasText:'Descargar ZIP'}).waitFor();assert.equal(await page.locator('#export-library').textContent(),'Exportar Biblioteca');
  await page.screenshot({path:'/workspace/scratch/clickimage-library.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: Library CRUD; panel save/new folder/dedup/sync; grid/list/gaps/search; multiple selection/copy/move/delete; exact original downloads; ZIP partial failure/names/multiple folders; empty/full backup; merge/confirmed replace; corrupt/unsafe/version/hash rejection; rollback after quota failure; original byte integrity; browser restart persistence; local viewer/100% per-tab zoom; links/localization. Chrome APIs mocked; disk IndexedDB and Chromium real.');
 }finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
