const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.js')))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));if(m.manifest_version!==3)throw Error('Manifest V3 required');
for(const locale of ['pt_BR','en','es'])JSON.parse(fs.readFileSync(path.join(root,'_locales',locale,'messages.json')));
console.log('JavaScript syntax, manifest and locales valid.');
