const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){const context={URL,Blob,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,Map,Set,Promise,DOMException,crypto:require('node:crypto').webcrypto,BroadcastChannel:undefined};vm.createContext(context);for(const file of ['image-utils.js','zip-utils.js','library-store.js','library-backup.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);return context}
test('backup ZIP reader checks structure, CRC, traversal, duplicate paths, unsupported compression and bounded input',async()=>{
 const c=setup(),z=c.ClickImageZip,b=c.ClickImageBackup,encoder=new TextEncoder();
 const entry={name:'manifest.json',bytes:encoder.encode('{}')},raw=new Uint8Array(await z.archive([entry]).arrayBuffer());
 assert.equal(new TextDecoder().decode(b.unpack(raw).get('manifest.json')),'{}');
 for(const name of ['../escape','/absolute','a\\b','a//b','a/./b','C:/bad']){const unsafe=new Uint8Array(await z.archive([{name,bytes:new Uint8Array([1])}]).arrayBuffer());assert.throws(()=>b.unpack(unsafe),/Backup inválido/)}
 assert.throws(()=>b.unpack(new Uint8Array([1,2,3])),/inválido/);
 assert.throws(()=>b.unpack(new Uint8Array(135*1024*1024)),/inválido/);
 assert.throws(()=>b.unpack(raw.slice(0,-1)),/inválido/);
 const corrupted=raw.slice();corrupted[30+entry.name.length]^=1;assert.throws(()=>b.unpack(corrupted),/inválido/);
 const duplicate=new Uint8Array(await z.archive([entry,entry]).arrayBuffer());assert.throws(()=>b.unpack(duplicate),/inválido/);
 const compressed=raw.slice();compressed[8]=8;assert.throws(()=>b.unpack(compressed),/inválido/);
});
test('backup validation rejects unexpected files and versions; empty library backup is supported without IndexedDB',async()=>{
 const c=setup(),b=c.ClickImageBackup,z=c.ClickImageZip;
 const m={format:'clickimage-library',version:1,folders:[],images:[],links:[]};
 const make=(manifest,extra=[])=>z.archive([{name:'manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest))},...extra]);
 const empty=await b.validate(make(m));assert.equal(empty.images.length,0);
 await assert.rejects(b.validate(make({...m,version:2})),/inválido/);
 await assert.rejects(b.validate(make(m,[{name:'extra.js',bytes:new Uint8Array([1])} ])),/inválido/);
 await assert.rejects(b.importLibrary(make(m),{replace:true}),/confirmação/);
});
test('library file signatures reject HTML/SVG scripts; hashes and safe titles preserve raster originals byte-for-byte',async()=>{
 const c=setup(),l=c.ClickImageLibrary;
 for(const text of ['<html>not an image</html>','<svg onload="alert(1)"></svg>'])await assert.rejects(l.prepare(new TextEncoder().encode(text)),/inválido/);
 const bytes=new Uint8Array(fs.readFileSync(path.join(__dirname,'../icons/128.png'))),p=await l.prepare(bytes,{url:'https://example.test/img?signature=preserve',title:'../Referência.png'});
 assert.equal(p.image.format,'PNG');assert.equal(p.image.sizeBytes,bytes.length);assert.equal(p.image.url,'https://example.test/img?signature=preserve');assert.match(p.image.id,/^[a-f0-9]{64}$/);assert.ok(!p.title.includes('/'));
 assert.deepEqual(new Uint8Array(await p.asset.blob.arrayBuffer()),bytes);
});
