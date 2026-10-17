const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){const context={btoa,atob,URL,Blob,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,Map,Set,Promise,DOMException,crypto:require('node:crypto').webcrypto,BroadcastChannel:undefined};vm.createContext(context);for(const file of ['image-utils.js','zip-utils.js','library-store.js','library-backup.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);return context}
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
 await assert.rejects(b.validate(make({...m,version:3})),/inválido/);
 await assert.rejects(b.validate(make(m,[{name:'extra.js',bytes:new Uint8Array([1])} ])),/inválido/);
 await assert.rejects(b.importLibrary(make(m),{replace:true}),/nova Biblioteca/);
});
test('library file signatures reject HTML/SVG scripts; hashes and safe titles preserve raster originals byte-for-byte',async()=>{
 const c=setup(),l=c.ClickImageLibrary;
 for(const text of ['<html>not an image</html>','<svg onload="alert(1)"></svg>'])await assert.rejects(l.prepare(new TextEncoder().encode(text)),/inválido/);
 const bytes=new Uint8Array(fs.readFileSync(path.join(__dirname,'../icons/128.png'))),p=await l.prepare(bytes,{url:'https://example.test/img?signature=preserve',title:'../Referência.png'});
 assert.equal(p.image.format,'PNG');assert.equal(p.image.sizeBytes,bytes.length);assert.equal(p.image.url,'https://example.test/img?signature=preserve');assert.match(p.image.id,/^[a-f0-9]{64}$/);assert.ok(!p.title.includes('/'));
 assert.deepEqual(new Uint8Array(await p.asset.blob.arrayBuffer()),bytes);
});

test('v2 JSON contains original bytes and hierarchy; legacy ZIP and large ZIP fallback validate with the same importer',async()=>{
 const c=setup(),L=c.ClickImageLibrary,B=c.ClickImageBackup,Z=c.ClickImageZip;
 const png=new Uint8Array(fs.readFileSync(path.join(__dirname,'../icons/128.png'))),record=await L.prepare(png,{title:'Original'});
 const folders=[{id:'group',name:'Grupo',parentId:null},{id:'set',name:'Conjunto',parentId:'group'}],links=[{folderId:'set',imageId:record.image.id,title:'Original',createdAt:1}];
 L.backupData=async()=>({library:{id:'main',name:'Design'},folders,images:[record.image],assets:[record.asset],links});
 const blob=await B.exportLibrary();assert.equal(blob.type,'application/json');const m=JSON.parse(await blob.text());assert.equal(m.library.name,'Design');assert.equal(m.version,2);assert.equal(m.images[0].data,Buffer.from(png).toString('base64'));assert.equal(m.folders[1].parentId,'group');
 L.backupData=async()=>({library:{id:'main',name:'Design'},folders,images:[record.image],assets:[],links});let failures=0;const missingExport=await B.exportLibrary(p=>failures=p.failed);assert.equal(failures,1);assert.equal((await B.validate(missingExport)).failures.length,1);
 const parsed=await B.validate(blob);assert.equal(parsed.name,'Design');assert.equal(parsed.links.length,1);assert.deepEqual(new Uint8Array(await parsed.images[0].asset.blob.arrayBuffer()),png);
 for(const patch of [{version:3},{folders:m.folders.map(f=>({...f,parentId:f.id}))},{images:m.images.map(i=>({...i,data:'%%%%'}))},{images:m.images.map(i=>({...i,sizeBytes:9999}))}])await assert.rejects(B.validate(new Blob([JSON.stringify({...m,...patch})])),/inválido/);
 const missing={...m,images:m.images.map(i=>({...i,data:null,unavailable:true}))};const partial=await B.validate(new Blob([JSON.stringify(missing)]));assert.equal(partial.images.length,0);assert.equal(partial.failures[0].name,'Original');
 const large=new Uint8Array(16*1024*1024+1);large.set(png);const big=await L.prepare(large);L.backupData=async()=>({library:{id:'big',name:'Grande'},folders,images:[big.image],assets:[big.asset],links:[{...links[0],imageId:big.image.id}]});
 const zip=await B.exportLibrary();assert.equal(zip.type,'application/zip');const validated=await B.validate(zip);assert.equal(validated.name,'Grande');assert.equal(validated.images[0].image.sizeBytes,large.length);assert.equal(Z.crc32(new Uint8Array(await validated.images[0].asset.blob.arrayBuffer())),Z.crc32(large));
 const legacy={format:'clickimage-library',version:1,folders:[{id:'old',name:'Antiga'}],images:[{id:record.image.id,path:'images/'+record.image.id+'.png'}],links:[{...links[0],folderId:'old'}]};
 const oldZip=Z.archive([{name:'manifest.json',bytes:new TextEncoder().encode(JSON.stringify(legacy))},{name:legacy.images[0].path,bytes:png}]);const old=await B.validate(oldZip);assert.equal(old.name,'Minhas referências');assert.equal(old.images.length,1);
});

test('imports ignore remote URL/prototype payloads, treat names as data and reject active file payloads',async()=>{
 const c=setup(),L=c.ClickImageLibrary,B=c.ClickImageBackup;
 const png=new Uint8Array(fs.readFileSync(path.join(__dirname,'../icons/128.png'))),record=await L.prepare(png);
 const m={format:'clickimage-library',version:2,library:{id:'untrusted',name:'<img src=x onerror=alert(1)>'},folders:[{id:'g',name:'<script>alert(1)</script>',parentId:null}],images:[{...record.image,path:'images/'+record.image.id+'.png',encoding:'base64',data:Buffer.from(png).toString('base64'),url:'https://attacker.invalid/exfiltrate'}],links:[{folderId:'g',imageId:record.image.id,title:'<img onerror=alert(1)>'}]};
 c.fetch=()=>{throw Error('Unexpected import network request')};
 const text=JSON.stringify(m).replace('{','{"__proto__":{"polluted":true},');const prepared=await B.validate(new Blob([text]));assert.equal(prepared.images[0].image.url,'');assert.equal(prepared.name,m.library.name);assert.equal(({}).polluted,undefined);
 for(const content of ['<svg onload="alert(1)"></svg>','<script>alert(1)</script>'])await assert.rejects(B.validate(new Blob([JSON.stringify({...m,images:m.images.map(i=>({...i,data:Buffer.from(content).toString('base64')}))})])));
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.json'))),policy=manifest.content_security_policy.extension_pages;assert.ok(policy.includes("script-src 'self'"));assert.ok(policy.includes("object-src 'none'"));assert.ok(!policy.includes('unsafe-inline'));assert.ok(!manifest.externally_connectable);assert.ok(!manifest.web_accessible_resources);
});

test('image dimensions in compressed raster headers are bounded before native decode',async()=>{
 const c=setup(),L=c.ClickImageLibrary;
 const png=new Uint8Array(fs.readFileSync(path.join(__dirname,'../icons/128.png')));new DataView(png.buffer).setUint32(16,100000);await assert.rejects(L.prepare(png),/64 megapixels/);
 const gif=new Uint8Array(12);gif.set(new TextEncoder().encode('GIF89a'));new DataView(gif.buffer).setUint16(6,20000,true);new DataView(gif.buffer).setUint16(8,20000,true);await assert.rejects(L.prepare(gif),/64 megapixels/);
 const webp=new Uint8Array(30);webp.set(new TextEncoder().encode('RIFF'));webp.set(new TextEncoder().encode('WEBPVP8X'),8);webp[24]=255;webp[25]=255;webp[26]=255;webp[27]=255;webp[28]=255;webp[29]=255;await assert.rejects(L.prepare(webp),/64 megapixels/);
 const jpeg=new Uint8Array([255,216,255,192,0,7,8,255,255,255,255,255,217]);await assert.rejects(L.prepare(jpeg),/64 megapixels/);
});
