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
  for (const set of ['a.png 1x, b.png 200w','a.png 1x, b.png 1x','a.png, b.png 2x','a.png 1w, b.png 1.5w']) assert.deepEqual(u.parseSrcset(set, base), []);
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
  const event = cb => {listener = cb};
  const chrome = {
    runtime:{id:'extension',onMessage:{addListener:event}},
    action:{onClicked:{addListener:cb=>action=cb},setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{},setTitle:async()=>{}},
    scripting:{executeScript:async()=>{}},tabs:{sendMessage:async()=>{},onRemoved:{addListener:()=>{}}},
    downloads:{download:async options=>{downloads.push(options);return 1},onChanged:{addListener:()=>{}}}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'), {chrome,importScripts:()=>{},ClickImageUtils:u,crypto:{randomUUID:()=> 'token'}});
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
