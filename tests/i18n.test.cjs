const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const code=fs.readFileSync(require.resolve('../i18n.js'),'utf8');
function load(value){let changed;const saved=[];const context={chrome:{storage:{local:{get:async()=>({clickimageLanguage:value}),set:async value=>saved.push(value)},onChanged:{addListener:callback=>changed=callback}}}};vm.createContext(context);vm.runInContext(code,context);return {i:context.ClickImageI18n,saved,change:(value)=>changed({clickimageLanguage:{newValue:value}},'local')}}
test('language defaults to Brazilian Portuguese, persists an explicit selection and follows cross-context changes',async()=>{
 const {i,saved,change}=load();await i.ready;assert.equal(i.language,'pt-BR');assert.equal(i.t('Imagem encontrada'),'Imagem encontrada');
 await i.setLanguage('en');assert.equal(saved[0].clickimageLanguage,'en');assert.equal(i.t('Imagem encontrada'),'Image found');
 change('es');assert.equal(i.t('Imagem encontrada'),'Imagen encontrada');
 change('unsupported');assert.equal(i.language,'pt-BR');
 const restored=load('en');await restored.i.ready;assert.equal(restored.i.language,'en');
});
test('catalog translations preserve parameters, raw filenames, URLs and safe unknown error fallback',async()=>{
 const {i}=load('en');await i.ready;
 for(const [source,translations] of Object.entries(i.messages))for(const language of ['en','es']){
  assert.ok(translations[language]?.trim(),source+' '+language);
  const tokens=text=>[...text.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort();
  assert.deepEqual(tokens(translations[language]),tokens(source),source+' '+language);
 }
 const name='Imagem encontrada $& < > https://cdn.example/x?sig=a&b=c';
 assert.equal(i.t('Ver {name}',{name}),'View '+name);
 assert.equal(i.error('Nenhuma imagem pôde ser obtida para o ZIP. Tempo de leitura excedido.'),'No images could be retrieved for the ZIP. Reading timed out.');
 assert.equal(i.error('Unrecognized server message'),'Unrecognized server message');
});
test('native extension metadata has a complete locale fallback without extra permissions',()=>{
 const manifest=JSON.parse(fs.readFileSync(require.resolve('../manifest.json')));assert.equal(manifest.default_locale,'pt_BR');
 for(const locale of ['pt_BR','en','es']){
  const messages=JSON.parse(fs.readFileSync(require.resolve('../_locales/'+locale+'/messages.json')));
  for(const value of [manifest.description,manifest.action.default_title])assert.ok(messages[value.slice(6,-2)].message);
 }
});
