// Persistence/migration tests use real IndexedDB and native image bytes in Chromium.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),{execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),legacy=execFileSync('git',['show','58cbe14053f3ba9b423f85bcde9473abf0ce77f3:library-store.js'],{cwd:root,encoding:'utf8'}),profile=fs.mkdtempSync(path.join(os.tmpdir(),'clickimage-migration-'));
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/legacy.js'){res.setHeader('Content-Type','text/javascript');res.end(legacy);return}if(pathname==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end('<script src="image-utils.js"></script><script src="zip-utils.js"></script><script src="library-tree.js"></script><script src="'+(req.url.includes('legacy')?'legacy.js':'library-store.js')+'"></script>');return}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/plain');res.end(data)})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let context;
 try{
  context=await chromium.launchPersistentContext(profile,{executablePath:'/usr/lib/chromium/chromium',headless:true});let page=await context.newPage();await page.goto(base+'/fixture.html?legacy');
  const baseline=await page.evaluate(async()=>{
   const L=ClickImageLibrary;window.seedFixture=async id=>{const canvas=new OffscreenCanvas(2,2),ctx=canvas.getContext('2d');ctx.fillStyle=`rgb(${id*17%256},${id*31%256},${id*47%256})`;ctx.fillRect(0,0,2,2);return canvas.convertToBlob({type:'image/png'})};
   const nativeFetch=fetch,blobs=new Map();window.fetch=async url=>blobs.has(url)?new Response(blobs.get(url)):nativeFetch(url);
   const results=[];for(const count of [2,5,10]){const f=await L.createFolder('Sequential '+count);for(let i=0;i<count;i++){const url=location.origin+'/image/'+i;blobs.set(url,await seedFixture(i));await L.saveImage(f.id,{url,title:'Mesmo nome'})}const d=await L.snapshot();results.push(d.links.filter(l=>l.folderId===f.id).length)}
   const f=await L.createFolder('Concurrent');await Promise.all(Array.from({length:10},async(_,i)=>{const url=location.origin+'/parallel/'+i;blobs.set(url,await seedFixture(i+20));return L.saveImage(f.id,{url,title:'Mesmo nome'})}));
   const d=await L.snapshot(),folder=d.folders.find(f=>f.name==='Sequential 2');const bytes=Array.from(new Uint8Array(await(await L.getBlob(d.links.find(l=>l.folderId===folder.id).imageId)).arrayBuffer()));
   return {results,concurrent:d.links.filter(l=>l.folderId===f.id).length,folders:d.folders.length,images:d.images.length,links:d.links.length,folderId:folder.id,bytes};
  });assert.deepEqual(baseline.results,[2,5,10]);assert.equal(baseline.concurrent,10);console.log('Baseline 2.8: saved 2/5/10 different images with identical titles and 10 concurrent writes without data loss.');
  await page.close();page=await context.newPage();await page.goto(base+'/fixture.html');
  const migrated=await page.evaluate(async()=>{const d=await ClickImageLibrary.snapshot();return {folders:d.folders.length,images:d.images.length,links:d.links.length,libraries:d.libraries?.length,libraryId:d.folders[0].libraryId}});
  assert.equal(migrated.folders,baseline.folders);assert.equal(migrated.images,baseline.images);assert.equal(migrated.links,baseline.links);
  if(migrated.libraries){
   const updated=await page.evaluate(async()=>{
    const L=ClickImageLibrary,nativeFetch=fetch,blobs=new Map();window.fetch=async url=>blobs.has(url)?new Response(blobs.get(url)):nativeFetch(url);
    async function save(folder,index){const canvas=new OffscreenCanvas(2,2),ctx=canvas.getContext('2d');ctx.fillStyle=`rgb(${index*17%256},${index*31%256},${index*47%256})`;ctx.fillRect(0,0,2,2);const url=location.origin+'/updated/'+index;blobs.set(url,await canvas.convertToBlob({type:'image/png'}));return L.saveImage(folder,{url,title:'Mesmo nome'})}
    const counts=[];try{for(const count of [2,5,10]){const folder=await L.createFolder('Updated '+count);for(let i=0;i<count;i++)await save(folder.id,100+i);const d=await L.snapshot();counts.push(d.links.filter(l=>l.folderId===folder.id).length)}const folder=await L.createFolder('Updated parallel');await Promise.all(Array.from({length:10},(_,i)=>save(folder.id,150+i)));const d=await L.snapshot();return {counts,parallel:d.links.filter(l=>l.folderId===folder.id).length,images:d.images.length,links:d.links.length}}finally{window.fetch=nativeFetch}
   });assert.deepEqual(updated.counts,[2,5,10]);assert.equal(updated.parallel,10);baseline.images=updated.images;baseline.links=updated.links;
   const hierarchy=await page.evaluate(async()=>{const L=ClickImageLibrary,g=await L.createFolder('Grupo A'),b=await L.createFolder('Grupo B'),set=await L.createFolder('Conjunto','main',g.id);let deep=false,cycle=false;try{const leaf=await L.createFolder('Mais um nível','main',set.id);deep=leaf.parentId===set.id}catch{}try{await L.moveFolder(g.id,set.id)}catch{cycle=true}await L.moveFolder(set.id,b.id);const d=await L.snapshot();return {deep,cycle,moved:d.folders.find(f=>f.id===set.id).parentId===b.id}});assert.deepEqual(hierarchy,{deep:true,cycle:true,moved:true});

   assert.equal(migrated.libraries,1);assert.ok(migrated.libraryId);
   const result=await page.evaluate(async baseline=>{
    const L=ClickImageLibrary,d=await L.snapshot();const original=d.links.find(l=>l.folderId===baseline.folderId),blob=await L.getBlob(original.imageId);
    if(JSON.stringify(Array.from(new Uint8Array(await blob.arrayBuffer())))!==JSON.stringify(baseline.bytes))throw Error('Migration changed original bytes');
    const duplicatePrepared=await L.prepare(new Uint8Array(await blob.arrayBuffer()),{title:'Outro nome'});
    const realFetch=fetch;window.fetch=async()=>new Response(blob);let duplicate;try{duplicate=await L.saveImage(baseline.folderId,{url:location.origin+'/other-url',title:'Outro nome'})}finally{window.fetch=realFetch}
    const imported=await L.restore({name:d.libraries[0].name,folders:d.folders.filter(f=>f.id===baseline.folderId),images:[duplicatePrepared],links:[original]});
    const next=await L.snapshot();return {duplicate:duplicate.duplicate,libraries:next.libraries.map(l=>l.name),images:next.images.length,links:next.links.length,imported};
   },baseline);assert.equal(result.duplicate,true);assert.equal(result.libraries.length,2);assert.equal(result.libraries.some(name=>name.endsWith('(2)')),true);assert.equal(result.images,baseline.images);assert.equal(result.links,baseline.links+1);
  }
  await context.close();context=await chromium.launchPersistentContext(profile,{executablePath:'/usr/lib/chromium/chromium',headless:true});page=await context.newPage();await page.goto(base+'/fixture.html');const persisted=await page.evaluate(async()=>{const d=await ClickImageLibrary.snapshot();return {images:d.images.length,links:d.links.length,libraries:d.libraries?.length}});assert.equal(persisted.images,baseline.images);assert.equal(persisted.links,baseline.links+(migrated.libraries?1:0));if(migrated.libraries)assert.equal(persisted.libraries,2);
  console.log('PASS: actual v1 IndexedDB data and bytes preserved, consecutive/concurrent saves, content dedup, independent library import without duplicated assets and browser restart persistence.');
 }finally{await context?.close();await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
