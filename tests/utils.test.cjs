const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const u = require('../image-utils.js');
test('Manifest V3 references existing resources and minimal permissions', () => {
  const m = JSON.parse(fs.readFileSync(require.resolve('../manifest.json')));
  assert.equal(m.manifest_version, 3);
  assert.deepEqual(m.permissions, ['activeTab', 'scripting', 'downloads', 'sidePanel', 'storage']);
  for (const f of [m.background.service_worker, m.side_panel.default_path, 'panel.css', 'panel.js', ...Object.values(m.icons)]) assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', f)));
});
test('URLs reject unsupported protocols and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'blob:https://example.org/id', 'data:image/png;base64,abc', 'https://user:pass@example.org/x', 'invalid']) assert.equal(u.validateUrl(url), null);
  assert.equal(u.validateUrl('../a.png?q=1', 'https://example.org/path/'), 'https://example.org/a.png?q=1');
});
test('srcset upgrades only a matching homogeneous candidate set', () => {
  const base = 'https://example.org/';
  assert.equal(u.imageUrl({ currentSrc: base+'a.png', srcset: 'a.png 1x, b.png 2x' }, base), base+'b.png');
  for (const set of ['a.png 1x, b.png 200w','a.png 1x, b.png 1x','a.png 1w, b.png 1.5w']) assert.deepEqual(u.parseSrcset(set, base), []);
  assert.equal(u.imageUrl({ currentSrc: base+'c.png', srcset: 'a.png 1x, b.png 2x' }, base), base+'c.png');
  const source = {srcset:'a.webp 400w, b.webp 1200w'};
  assert.equal(u.imageUrl({currentSrc:base+'a.webp',parentElement:{tagName:'PICTURE',querySelectorAll:()=>[source]}},base),base+'b.webp');
});
test('single CSS background URL and safe filename preserve query in download URL', () => {
  assert.equal(u.backgroundUrl('url("/a.webp?size=4")','https://example.org'), 'https://example.org/a.webp?size=4');
  assert.equal(u.backgroundUrl('url(a.png),url(b.png)','https://example.org'), null);
  assert.equal(u.filename('https://example.org/a.webp?size=4'), 'a.webp');
  assert.equal(u.filename('https://example.org/CON.png'), 'imagem');
  assert.equal(u.filename('https://example.org/a%2Fb.png'), 'a_b.png');
});
test('toolbar only opens panel; hunting accumulates images and titles reach confirmed downloads', async () => {
  let action, listener, changed, determine, opened=0, executions=0, generation=0;
  const downloads=[],values={};
  const noop={addListener:()=>{}};
  const chrome={
    storage:{session:{get:async key=>structuredClone(key===null?values:{[key]:values[key]}),set:async obj=>Object.assign(values,structuredClone(obj)),remove:async key=>delete values[key]}},
    sidePanel:{open:async()=>{opened++}},
    runtime:{id:'extension',getURL:file=>'chrome-extension://extension/'+file,onMessage:{addListener:cb=>listener=cb}},
    action:{onClicked:{addListener:cb=>action=cb},setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{},setTitle:async()=>{}},
    scripting:{executeScript:async()=>{executions++}},tabs:{sendMessage:async()=>({accepted:true}),onRemoved:noop},
    downloads:{search:async()=>[{id:1,state:'in_progress'}],download:async options=>{downloads.push(options);return 1},onChanged:{addListener:cb=>changed=cb},onDeterminingFilename:{addListener:cb=>determine=cb}}
  };
  const load=()=>vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:u,crypto:{randomUUID:()=> 'id-'+(++generation)}});
  load();
  const send=(message,sender)=>new Promise(resolve=>{if(listener(message,sender,resolve)!==true)resolve(undefined)});
  const content={id:'extension',tab:{id:1},frameId:0};
  const panel={id:'extension',url:'chrome-extension://extension/panel.html'};
  action({id:1});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(opened,1);assert.equal(executions,0);
  async function select(url){
    if(values['clickimage:1']?.status!=='selecting')assert.equal((await send({type:'CLICKIMAGE_SELECT',tabId:1},panel)).ok,true);
    const token=values['clickimage:1'].selectionToken;
    return send({type:'CLICKIMAGE_PREVIEW',token,url},content);
  }
  await select('https://example.org/a.jpg');
  await select('https://example.org/b.png');
  assert.equal(values['clickimage:1'].items.length,2);assert.equal(downloads.length,0);
  const first=values['clickimage:1'].items[0];
  await send({type:'CLICKIMAGE_RENAME',tabId:1,itemId:first.id,title:'Foto bonita.jpg'},panel);
  assert.equal(values['clickimage:1'].items[0].title,'Foto bonita');
  // Starting and cancelling a new hunt preserves every collected image.
  const token=values['clickimage:1'].selectionToken;
  await send({type:'CLICKIMAGE_CANCELLED',token},content);
  assert.equal(values['clickimage:1'].items.length,2);
  load(); // Queue and title survive worker suspension.
  const confirm={type:'CLICKIMAGE_CONFIRM',tabId:1,itemId:first.id};
  assert.equal(await send(confirm,content),undefined);
  const results=await Promise.all([send(confirm,panel),send(confirm,panel)]);
  assert.equal(results.filter(r=>r.ok).length,1);assert.equal(downloads.length,1);
  assert.equal(downloads[0].filename,'Foto bonita.jpg');assert.equal(downloads[0].conflictAction,'uniquify');
  const suggestion=await new Promise(resolve=>determine({byExtensionId:'extension',id:1,url:first.url,mime:'image/jpeg'},resolve));
  assert.equal(suggestion.filename,'Foto bonita.jpg');
  assert.equal(values['clickimage:1'].items[1].status,'ready');
  changed({id:1,state:{current:'complete'}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(values['clickimage:1'].items[0].status,'downloaded');
  await send({type:'CLICKIMAGE_REMOVE',tabId:1,itemId:first.id},panel);
  assert.equal(values['clickimage:1'].items.length,1);
  await select('https://example.org/b.png');assert.equal(values['clickimage:1'].items.length,1);
});

function image(attributes = {}, extra = {}) {
  return { tagName: 'IMG', currentSrc: 'https://example.org/thumb.png', src: 'https://example.org/thumb.png', getAttribute: name => attributes[name] ?? null, ...extra };
}
test('srcset supports implicit 1x and comma-bearing URLs without stripping query', () => {
  assert.deepEqual(u.parseSrcset('thumb.png, full.png 2x', 'https://example.org/').map(c=>c.size), [1,2]);
  assert.equal(u.parseSrcset('photo.png?crop=1,2 400w, full.png 1600w','https://example.org/')[0].url, 'https://example.org/photo.png?crop=1,2');
  assert.deepEqual(u.parseSrcset('a.png 0w, b.png 300w','https://example.org/'), []);
  assert.equal(u.validateUrl(null, 'https://example.org/'), null);
  assert.equal(u.validateUrl(' ', 'https://example.org/'), null);
});
test('collects originals, lazy sets, all picture sources and extensionless image links', () => {
  const source = image({'data-srcset':'medium.png 400w, wide.png 2000w'});
  const link = {getAttribute:name=>name==='href'?'/image?id=original':null};
  const el = image({'data-original':'/original.png','data-srcset':'thumb.png 100w, high.png 3000w','data-src':'/lazy.png'}, {parentElement:{tagName:'PICTURE',querySelectorAll:()=>[source]},closest:()=>link});
  const urls = u.imageCandidates(el,'https://example.org/',el.currentSrc).map(c=>c.url);
  for (const file of ['original.png','image?id=original','lazy.png','high.png','wide.png','thumb.png']) assert.ok(urls.includes('https://example.org/'+file));
  assert.equal(urls.length,new Set(urls).size);
});
test('uses intrinsic pixel area, not CSS size or the largest srcset label', async () => {
  const el=image({'data-original':'/original.png'}, {srcset:'thumb.png 300w, mislabeled.png 3000w',width:20,height:20});
  const size={ 'original.png': [2400,1600], 'mislabeled.png':[200,150], 'thumb.png':[300,200] };
  const url=await u.resolveImage(el,'https://example.org/',el.currentSrc,async url=>{const [width,height]=size[new URL(url).pathname.slice(1)];return {width,height}});
  assert.equal(url,'https://example.org/original.png');
});
test('unavailable original or HTML link falls back to largest successfully decoded candidate', async () => {
  const el=image({'data-original':'/blocked.png','data-srcset':'thumb.png 300w, available.png 1600w'}, {closest:()=>({getAttribute:name=>name==='href'?'/gallery':null})});
  const url=await u.resolveImage(el,'https://example.org/',el.currentSrc,async url=>{
    if(url.endsWith('/blocked.png')) throw new Error('access denied');
    if(url.endsWith('/gallery')) return null;
    return {width:url.endsWith('/available.png')?1600:300,height:900};
  });
  assert.equal(url,'https://example.org/available.png');
  assert.equal(await u.resolveImage(el,'https://example.org/',el.currentSrc,async()=>null),el.currentSrc);
});
test('original wins equal-resolution tie; invalid sources never get probed', async () => {
  const el=image({'data-original':'/original.png','data-full':'javascript:alert(1)','data-hires':'https://u:p@example.org/private'});
  const seen=[];
  assert.equal(await u.resolveImage(el,'https://example.org/',el.currentSrc,async url=>{seen.push(url);return {width:100,height:100}}),'https://example.org/original.png');
  assert.equal(seen.length,2);
});
test('bounds candidate count while retaining the displayed fallback', () => {
  const el=image({}, {srcset:Array.from({length:50},(_,i)=>`img${i}.png ${i+1}w`).join(', ')});
  const candidates=u.imageCandidates(el,'https://example.org/',el.currentSrc);
  assert.equal(candidates.length,24);
  assert.ok(candidates.some(c=>c.url===el.currentSrc));
  assert.ok(candidates.some(c=>c.url.endsWith('/img49.png')));
});
test('reads the selected image wrapper without crossing into a multi-image gallery', () => {
  const el=image();
  const gallery={tagName:'DIV',getAttribute:n=>n==='data-original'?'/wrong.png':null,querySelectorAll:()=>[el,image()]};
  const wrapper={tagName:'FIGURE',parentElement:gallery,getAttribute:n=>n==='data-image'?JSON.stringify({original:'/exact.png',images:['/other.png']}):null,querySelectorAll:selector=>selector==='img'?[el]:[]};
  el.parentElement=wrapper;
  const urls=u.imageCandidates(el,'https://example.org/',el.currentSrc).map(c=>c.url);
  assert.ok(urls.includes('https://example.org/exact.png'));
  assert.ok(!urls.includes('https://example.org/wrong.png'));
  assert.ok(!urls.includes('https://example.org/other.png'));
});
test('does not use a shared link original or unrelated page metadata', () => {
  const el=image();
  const link={getAttribute:n=>n==='href'?'/wrong.png':null,querySelectorAll:()=>[el,image()]};
  el.closest=()=>link;
  el.parentElement={tagName:'BODY',getAttribute:()=>'/global.png',querySelectorAll:()=>[el]};
  assert.deepEqual(u.imageCandidates(el,'https://example.org/',el.currentSrc).map(c=>c.url),[el.currentSrc]);
});
test('invalid structured metadata is ignored and scoped contentUrl is supported', () => {
  const el=image({'data-image':'{broken','data-zoom':'[{"url":"/unrelated.png"}]'});
  el.parentElement={tagName:'FIGURE',getAttribute:()=>null,querySelectorAll:selector=>selector==='img'?[el]:selector.startsWith('meta')?[{getAttribute:()=>'/exact.png'}]:[]};
  const urls=u.imageCandidates(el,'https://example.org/',el.currentSrc).map(c=>c.url);
  assert.deepEqual(urls,['https://example.org/exact.png',el.currentSrc]);
});
const videoId='abcdefghijk';
const playerHtml=(id=videoId)=>`<script>var ytInitialPlayerResponse = ${JSON.stringify({videoDetails:{videoId:id,title:'Escaped " } brace',thumbnail:{thumbnails:[{url:`https://i.ytimg.com/vi/${id}/small.jpg`,width:120,height:90},{url:`https://i.ytimg.com/vi/${id}/full.jpg`,width:1280,height:720},{url:'https://i.ytimg.com/vi/otherabcdef/wrong.jpg',width:4000,height:3000}]}}})};</script>`;
test('YouTube matches the clicked thumbnail to its exact linked video',()=>{
 const el=image({}, {currentSrc:`https://i.ytimg.com/vi/${videoId}/small.jpg`,closest:()=>({getAttribute:()=>`/watch?v=${videoId}`})});
 const context=u.youtubeContext(el,'https://www.youtube.com/',el.currentSrc);
 assert.equal(context.id,videoId);
 assert.equal(u.youtubeContext(el,'https://www.instagram.com/',el.currentSrc),null);
 el.closest=()=>({getAttribute:()=>'/watch?v=otherabcdef'});
 assert.equal(u.youtubeContext(el,'https://www.youtube.com/',el.currentSrc),null);
});
test('player JSON only yields declared images of that exact video and never executes code',()=>{
 const urls=u.youtubeImageUrls(playerHtml(),videoId,'https://www.youtube.com/');
 assert.deepEqual(urls,[`https://i.ytimg.com/vi/${videoId}/full.jpg`,`https://i.ytimg.com/vi/${videoId}/small.jpg`]);
 assert.deepEqual(u.youtubeImageUrls(playerHtml('otherabcdef'),videoId,'https://www.youtube.com/'),[]);
 assert.deepEqual(u.youtubeImageUrls('ytInitialPlayerResponse = { bad }; alert(1)',videoId,'https://www.youtube.com/'),[]);
});
test('YouTube uses linked HTML metadata; access failure retains the current image',async()=>{
 let fetched=[];
 const sandbox={module:{exports:{}},URL,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{fetched.push(url);assert.equal(options.credentials,'same-origin');return {ok:true,url,headers:{get:n=>n==='content-type'?'text/html':null},text:async()=>playerHtml()}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../image-utils.js'),'utf8'),sandbox);
 const api=sandbox.module.exports;
 const el=image({}, {src:`https://i.ytimg.com/vi/${videoId}/small.jpg`,currentSrc:`https://i.ytimg.com/vi/${videoId}/small.jpg`,closest:()=>({getAttribute:()=>`/watch?v=${videoId}`})});
 const probe=async url=>new URL(url).hostname==='i.ytimg.com'?{width:url.endsWith('full.jpg')?1280:120,height:720}:null;
 assert.equal(await api.resolveImage(el,'https://www.youtube.com/',el.currentSrc,probe),`https://i.ytimg.com/vi/${videoId}/full.jpg`);
 assert.deepEqual(fetched,[`https://www.youtube.com/watch?v=${videoId}`]);
 sandbox.fetch=async()=>{throw new Error('403')};
 assert.equal(await api.resolveImage(el,'https://www.youtube.com/',el.currentSrc,probe),el.currentSrc);
});
test('response MIME adds the right extension for extensionless CDN image URLs',()=>{
 const raw='https://yt3.example.org/9t6uZTdW=s176-c-k-c0x00ffffff-no-rj-mo';
 assert.equal(u.filename(raw,'image/jpeg'),'9t6uZTdW=s176-c-k-c0x00ffffff-no-rj-mo.jpg');
 assert.equal(u.filename('https://example.org/112290980','image/png'),'112290980.png');
 assert.equal(u.filename('https://example.org/a.png','image/jpeg'),'a.jpg');
 assert.equal(u.filename('https://example.org/a.jpeg','IMAGE/JPEG; charset=binary'),'a.jpeg');
 assert.equal(u.filename('https://example.org/download?oh=signed','image/webp'),'download.webp');
 assert.equal(u.filename('https://example.org/download','application/octet-stream'),'download');
 assert.equal(u.imageExtension('text/html'),null);
});
test('filename hook only renames this extension downloads using Chrome response MIME',async()=>{
 let determine;
 const noop={addListener:()=>{}};
 const chrome={storage:{session:{get:async()=>({})}},runtime:{id:'clickimage',onMessage:noop},action:{onClicked:noop},tabs:{onRemoved:noop},downloads:{onChanged:noop,onDeterminingFilename:{addListener:cb=>determine=cb}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:u});
 const result=await new Promise(resolve=>determine({byExtensionId:'clickimage',url:'https://example.org/112290980',mime:'image/jpeg'},resolve));
 assert.equal(result.filename,'112290980.jpg');assert.equal(result.conflictAction,'uniquify');
 let foreign='pending';determine({byExtensionId:'other'},value=>foreign=value);assert.equal(foreign,undefined);
});

test('custom titles are safe, preserve accents, and follow actual image format',()=>{
 assert.equal(u.downloadFilename('https://example.org/a.png','Minha foto.jpg','image/webp'),'Minha foto.webp');
 assert.equal(u.safeTitle('  São Paulo / Centro  '),'São Paulo _ Centro');
 assert.equal(u.safeTitle('CON'), '_CON');
 assert.equal(u.safeTitle('..'), '');
 assert.ok(Array.from(u.safeTitle('😀'.repeat(100))).length<=60);
 assert.equal(u.downloadFilename('https://example.org/a.jpg',''),'a.jpg');
});
test('batch waits for each outcome, skips saved images, resumes after suspension and clear stops its queue',async()=>{
 let listener,changed;const values={},calls=[];const noop={addListener:()=>{}};
 const chrome={
  storage:{session:{get:async key=>structuredClone(key===null?values:{[key]:values[key]}),set:async obj=>Object.assign(values,structuredClone(obj)),remove:async key=>delete values[key]}},
  runtime:{id:'ext',getURL:file=>'chrome-extension://ext/'+file,onMessage:{addListener:cb=>listener=cb}},
  action:{onClicked:noop},tabs:{sendMessage:async()=>{},onRemoved:noop},
  downloads:{download:async options=>{calls.push(options);return calls.length},search:async({id})=>[{id,state:'in_progress'}],onChanged:{addListener:cb=>changed=cb},onDeterminingFilename:noop}
 };
 const load=()=>vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:u});
 load();const panel={id:'ext',url:'chrome-extension://ext/panel.html'};
 const send=message=>new Promise(resolve=>listener({tabId:5,...message},panel,resolve));
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const items=Array.from({length:5},(_,i)=>({id:'image-'+i,url:`https://example.org/${i}.jpg`,filename:i+'.jpg',title:'',status:i===0?'downloaded':'ready'}));
 values['clickimage:5']={status:'idle',items};
 const batch={type:'CLICKIMAGE_CONFIRM_ALL',titles:items.map(item=>({itemId:item.id,title:'Foto '+item.id}))};
 const results=await Promise.all([send(batch),send(batch)]);await tick();
 assert.equal(results.filter(r=>r.ok).length,1);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://example.org/1.jpg');
 assert.equal(calls[0].filename,'Foto image-1.jpg');
 const queued=values['clickimage:5'].items[2];
 assert.equal(queued.status,'queued');
 assert.equal((await send({type:'CLICKIMAGE_CONFIRM',itemId:queued.id})).ok,false);
 await tick();assert.equal(calls.length,1); // No second file before completion.
 changed({id:1,state:{current:'complete'}});await tick();
 assert.equal(calls.length,2);assert.equal(calls[1].url,'https://example.org/2.jpg');
 load(); // Next download can finish after the worker was suspended.
 changed({id:2,state:{current:'interrupted'}});await tick();
 assert.equal(calls.length,3);assert.equal(calls[2].url,'https://example.org/3.jpg');
 changed({id:3,state:{current:'complete'}});await tick();
 assert.equal(calls.length,4);
 changed({id:4,state:{current:'complete'}});await tick();
 assert.equal(values['clickimage:5'].batch.running,false);
 assert.equal(values['clickimage:5'].batch.failed,1);
 assert.equal(calls.filter(call=>call.url==='https://example.org/0.jpg').length,0);
 // Explicit retry includes only the failed image, never the saved ones.
 assert.equal((await send(batch)).ok,true);await tick();assert.equal(calls.length,5);
 changed({id:5,state:{current:'complete'}});await tick();
 assert.equal((await send(batch)).ok,false);assert.equal(calls.length,5);
 values['clickimage:5']={status:'selecting',selectionToken:'hunt',items:items.map(item=>({...item,status:'ready'}))};
 assert.equal((await send(batch)).ok,true);await tick();assert.equal(calls.length,6);
 await send({type:'CLICKIMAGE_CLEAR_ALL'});
 assert.equal(values['clickimage:5'].items.length,0);assert.equal(values['clickimage:5'].selectionToken,undefined);
 changed({id:6,state:{current:'complete'}});await tick();
 assert.equal(calls.length,6);assert.equal(values['clickimage:5'].items.length,0);
});
test('panel disconnect stops selection silently, keeps collected images and rejects late previews',async()=>{
 let connected,listener;const values={'clickimage:4':{status:'resolving',selectionToken:'live',items:[{id:'keep',url:'https://example.org/a.jpg',status:'ready'}]}};const messages=[];const noop={addListener:()=>{}};
 const chrome={runtime:{id:'ext',getURL:f=>'chrome-extension://ext/'+f,onConnect:{addListener:cb=>connected=cb},onMessage:{addListener:cb=>listener=cb}},storage:{session:{get:async key=>structuredClone({[key]:values[key]}),set:async obj=>Object.assign(values,structuredClone(obj))}},tabs:{sendMessage:async(tabId,message)=>messages.push({tabId,message}),onRemoved:noop},action:{onClicked:noop},downloads:{onChanged:noop,onDeterminingFilename:noop}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:u});
 let bind,close;
 connected({name:'clickimage-panel',sender:{id:'ext',url:'chrome-extension://ext/panel.html'},onMessage:{addListener:cb=>bind=cb},onDisconnect:{addListener:cb=>close=cb}});
 bind({type:'bind',tabId:4});close();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(values['clickimage:4'].status,'idle');assert.equal(values['clickimage:4'].selectionToken,undefined);assert.equal(values['clickimage:4'].items.length,1);
 assert.equal(messages[0].message.type,'CLICKIMAGE_CANCEL');assert.equal(messages[0].message.silent,true);
 const response=await new Promise(resolve=>listener({type:'CLICKIMAGE_PREVIEW',token:'live',url:'https://example.org/late.png'},{id:'ext',tab:{id:4},frameId:0},resolve));
 assert.equal(response.ok,false);assert.equal(values['clickimage:4'].items.length,1);
});
test('YouTube preview context uses the linked ID and permits only static poster paths',()=>{
 const el={tagName:'VIDEO',closest:selector=>selector==='a[href]'?{getAttribute:()=>'/watch?v=abcdefghijk'}:null};
 const context=u.youtubeContext(el,'https://www.youtube.com/','blob:https://www.youtube.com/preview');
 assert.equal(context.id,'abcdefghijk');
 for(const path of ['an_webp/abcdefghijk/preview.webp','vi/abcdefghijk/preview.gif','vi/abcdefghijk/preview.mp4','vi/otherabcdef/full.jpg'])assert.equal(u.staticYoutubeUrl('https://i.ytimg.com/'+path,context.id),false);
 assert.equal(u.staticYoutubeUrl('https://i.ytimg.com/vi/abcdefghijk/full.jpg',context.id),true);
 assert.equal(u.youtubeContext(el,'https://example.org/','blob:https://example.org/preview'),null);
});
test('format comes from response bytes, not URL suffix or Content-Type alone',async()=>{
 assert.equal(u.formatFromBytes(Uint8Array.from([255,216,255,224])),'JPG');
 assert.equal(u.formatFromBytes(Uint8Array.from([137,80,78,71,13,10,26,10])),'PNG');
 assert.equal(u.formatFromBytes(Buffer.from('RIFF1234WEBPVP8 ')),'WEBP');
 assert.equal(u.formatFromBytes(Buffer.from('\x00\x00\x00\x18ftypavif\x00\x00\x00\x00')),'AVIF');
 assert.equal(u.formatFromBytes(Buffer.from('<html>not an image</html>')),null);
 const fetcher=async()=>new Response(Uint8Array.from([137,80,78,71,13,10,26,10]),{headers:{'Content-Type':'image/jpeg'}});
 assert.equal(await u.detectImageFormat('https://example.org/misleading.jpg',fetcher),'PNG');
 assert.equal(await u.detectImageFormat('https://example.org/blocked.png',async()=>{throw new Error('CORS')}),null);
});
test('animated YouTube poster is replaced by highest available static metadata image, never by preview',async()=>{
 const link={getAttribute:()=>'/watch?v=abcdefghijk'};
 const el={tagName:'VIDEO',src:'https://preview.example/video.mp4',closest:()=>link,ownerDocument:{querySelectorAll:()=>[{textContent:playerHtml()}]}};
 const preview='https://i.ytimg.com/an_webp/abcdefghijk/preview.webp';
 const probed=[];
 const probe=async url=>{probed.push(url);return {width:url.endsWith('full.jpg')?1280:120,height:720}};
 assert.equal(await u.resolveImage(el,'https://www.youtube.com/',preview,probe),'https://i.ytimg.com/vi/abcdefghijk/full.jpg');
 assert.ok(probed.every(url=>u.staticYoutubeUrl(url,'abcdefghijk')));
 assert.equal(await u.resolveImage(el,'https://www.youtube.com/',preview,async url=>url.endsWith('full.jpg')?null:{width:120,height:90}),'https://i.ytimg.com/vi/abcdefghijk/small.jpg');
 assert.equal(await u.resolveImage(el,'https://www.youtube.com/',preview,async()=>null),null);
 const generic=image({}, {src:'https://example.org/photo.gif',currentSrc:'https://example.org/photo.gif'});
 assert.equal(await u.resolveImage(generic,'https://example.org/',generic.src,async()=>({width:100,height:100})),generic.src);
});
test('verified byte format is preserved over a contradictory download MIME',async()=>{
 let determine;const noop={addListener:()=>{}};
 const image={id:'known',url:'https://example.org/photo.jpg',title:'Minha foto',format:'PNG',status:'downloading',downloadId:9};
 const values={'clickimage:3':{status:'idle',items:[image]},'clickimage-download:9':{tabId:3,itemId:'known',title:'Minha foto'}};
 const chrome={runtime:{id:'ext',onMessage:noop},storage:{session:{get:async()=>structuredClone(values),set:async obj=>Object.assign(values,structuredClone(obj))}},action:{onClicked:noop},tabs:{onRemoved:noop},downloads:{onChanged:noop,onDeterminingFilename:{addListener:cb=>determine=cb}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),{chrome,importScripts:()=>{},ClickImageUtils:u});
 const suggestion=await new Promise(resolve=>determine({id:9,byExtensionId:'ext',url:image.url,mime:'image/jpeg'},resolve));
 assert.equal(suggestion.filename,'Minha foto.png');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(values['clickimage:3'].items[0].format,'PNG');
});
