const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const u = require('../image-utils.js');
test('Manifest V3 references existing resources and minimal permissions', () => {
  const m = JSON.parse(fs.readFileSync(require.resolve('../manifest.json')));
  assert.equal(m.manifest_version, 3);
  assert.deepEqual(m.permissions, ['activeTab', 'scripting', 'downloads']);
  for (const f of [m.background.service_worker, ...Object.values(m.icons)]) assert.ok(fs.existsSync(require('node:path').join(__dirname, '..', f)));
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
test('worker consumes activation once and rejects forged or unsupported requests', async () => {
  let action, listener, downloads = [];
  let accepted = true, generation = 0;
  const event = cb => {listener = cb};
  const chrome = {
    runtime:{id:'extension',onMessage:{addListener:event}},
    action:{onClicked:{addListener:cb=>action=cb},setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{},setTitle:async()=>{}},
    scripting:{executeScript:async()=>{}},tabs:{sendMessage:async()=>({accepted}),onRemoved:{addListener:()=>{}}},
    downloads:{download:async options=>{downloads.push(options);return 1},onChanged:{addListener:()=>{}}}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'), {chrome,importScripts:()=>{},ClickImageUtils:u,crypto:{randomUUID:()=> generation++ === 0 ? 'token' : 'replacement'}});
  await action({id:1});
  // A toolbar click while content resolves an original must keep its token.
  accepted = false;
  await action({id:1});
  const sender={id:'extension',tab:{id:1},frameId:0};
  let results=[];
  const msg={type:'CLICKIMAGE_DOWNLOAD',token:'token',url:'https://example.org/a.png'};
  listener({...msg,token:'forged'},sender,r=>results.push(r));
  listener({...msg,url:'data:image/png,abc'},sender,r=>results.push(r));
  listener(msg,sender,r=>results.push(r));
  listener(msg,sender,r=>results.push(r));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(downloads.length,1);
  assert.equal(downloads[0].conflictAction,'uniquify');
  assert.equal(results.filter(r=>r.ok).length,1);
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
