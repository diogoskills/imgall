// Dependency-free, deterministic package allowlist. Never include tests or secrets.
const fs=require('node:fs'),path=require('node:path'),zip=require('../zip-utils.js');
(async()=>{
 const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
 const files=['manifest.json','background.js','content.js','image-utils.js','i18n.js','config.js','panel-actions.js','zip-utils.js','files.js','image-card.js','panel.html','panel.css','panel.js','library-panel.js','library-tree.js','library-store.js','library-backup.js','library.html','library.css','library.js','image-view.html','image-view.css','image-view.js',...['16','32','48','128'].map(size=>`icons/${size}.png`),...['pt_BR','en','es'].map(locale=>`_locales/${locale}/messages.json`)];
 const blob=zip.archive(files.map(name=>({name,bytes:new Uint8Array(fs.readFileSync(path.join(root,name)))})));
 const dir=path.join(root,'dist');fs.mkdirSync(dir,{recursive:true});const target=path.join(dir,`ClickImage-${m.version}.zip`);fs.writeFileSync(target,Buffer.from(await blob.arrayBuffer()));console.log(target);
})().catch(e=>{console.error(e);process.exitCode=1});
