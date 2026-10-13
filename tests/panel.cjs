// Real Chromium UI, with Chrome extension APIs mocked.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');const http=require('node:http');const fs=require('node:fs');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(data)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:360,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.panelDisconnected=0;Object.defineProperty(navigator,'clipboard',{value:{writeText:async url=>window.copiedURL=url}});window.mockTab=7;window.mockState={status:'idle',items:[]};window.commands=[];window.handlers=[];
   window.chrome={tabs:{create:async options=>{window.searchURL=options.url;return {id:123}},query:async()=>[{id:mockTab}],onActivated:{addListener:cb=>window.tabHandler=cb},onUpdated:{addListener:()=>{}}},storage:{onChanged:{addListener:cb=>handlers.push(cb)}},runtime:{connect:()=>({onDisconnect:{addListener:()=>{}},postMessage:()=>{},disconnect:()=>{panelDisconnected++;setPanelState({...mockState,status:'idle'})}}),sendMessage:async message=>{
    commands.push(message);
    if(message.type==='CLICKIMAGE_STATE')return {ok:true,state:mockState};
    const item=mockState.items.find(image=>image.id===message.itemId);
    if(message.type==='CLICKIMAGE_SELECT')mockState.status='selecting';
    if(message.type==='CLICKIMAGE_STOP')mockState.status='idle';
    if(message.type==='CLICKIMAGE_REMOVE')mockState.items=mockState.items.filter(image=>image.id!==message.itemId);
    if(message.type==='CLICKIMAGE_RENAME')item.title=message.title;
    if(message.type==='CLICKIMAGE_CONFIRM')item.status='downloading';
    if(message.type==='CLICKIMAGE_CLEAR_ALL')mockState={status:'idle',items:[]};
    if(message.type==='CLICKIMAGE_CONFIRM_ALL'){mockState.batch={running:true,total:mockState.items.length,finished:0,failed:0};mockState.items.forEach(image=>image.status='queued');}
    return {ok:true};
   }}};
   window.setPanelState=state=>{mockState=state;handlers.forEach(cb=>cb({['clickimage:'+mockTab]:{newValue:state}},'session'))};
  });
  await page.goto(base+'/panel.html');
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_SELECT').length),0);
  const normalBackground=await page.locator('#select').evaluate(el=>getComputedStyle(el).backgroundImage);
  await page.locator('#select').click();
  await page.locator('#status-label').filter({hasText:'Clique em uma imagem'}).waitFor();
  assert.equal(await page.locator('#select').getAttribute('aria-pressed'),'true');
  assert.notEqual(await page.locator('#select').evaluate(el=>getComputedStyle(el).backgroundImage),normalBackground);
  await page.locator('#select').click();
  assert.equal(await page.locator('#select').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#select').evaluate(el=>getComputedStyle(el).backgroundImage),normalBackground);
  const conversion=await page.evaluate(async base=>{
    const response=await fetch(base+'/icons/128.png');const bitmap=await createImageBitmap(await response.blob());
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
    const webp=await canvas.convertToBlob({type:'image/webp'});const blobURL=URL.createObjectURL(webp);
    const saved=window.fetch;window.fetch=async url=>url===base+'/webp-fixture'?new Response(webp):saved(url);
    try{const result=await ClickImageActions.convertWebpToPng(base+'/webp-fixture');const png=await saved(result.dataURL);return {width:result.width,height:result.height,format:ClickImageUtils.formatFromBytes(new Uint8Array(await (await png.blob()).slice(0,64).arrayBuffer()))};}
    finally{window.fetch=saved;URL.revokeObjectURL(blobURL)}
  },base);
  assert.deepEqual(conversion,{width:128,height:128,format:'PNG'});
  const rejected=await page.evaluate(async base=>{try{await ClickImageActions.convertWebpToPng(base+'/icons/128.png');return false}catch{return true}},base);
  assert.equal(rejected,true);
  const item={id:'first',url:base+'/icons/128.png',filename:'128.png',title:'',status:'ready'};
  await page.evaluate(item=>setPanelState({status:'idle',items:[item]}),item);
  await page.waitForFunction(()=>document.querySelector('.dimensions').textContent.includes('128 × 128 px'));
  assert.equal(await page.locator('#select').isEnabled(),true);
  await page.locator('.copy-url').click();assert.equal(await page.evaluate(()=>copiedURL),item.url);
  await page.locator('.reverse-search').click();assert.equal(new URL(await page.evaluate(()=>searchURL)).searchParams.get('url'),item.url);
  await page.locator('#layout').selectOption('compact');assert.equal(await page.locator('#image-list').getAttribute('data-layout'),'compact');
  await page.locator('#layout').selectOption('grid');assert.equal(await page.locator('#image-list').getAttribute('data-layout'),'grid');
  await page.locator('#layout').selectOption('list');
  assert.equal(await page.locator('.source').textContent(),'Imagem encontrada');
  await page.evaluate(()=>setPanelState({...mockState,items:mockState.items.map(item=>({...item,format:'JPG'}))}));
  assert.equal(await page.locator('.source').textContent(),'Imagem encontrada');
  assert.match(await page.locator('.dimensions').textContent(),/^JPG - 128 × 128 px -/);
  await page.evaluate(()=>setPanelState({...mockState,items:mockState.items.map(item=>({...item,format:null}))}));
  assert.equal(await page.locator('.source').textContent(),'Imagem encontrada');
  assert.equal(await page.locator('#download-all').isVisible(),false);
  assert.equal(await page.locator('.thumbnail').evaluate(el=>el.getBoundingClientRect().width),48);
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_CONFIRM').length),0);
  await page.locator('.title-input').fill('Minha imagem bonita');
  await page.locator('.download').click();
  await page.waitForFunction(()=>document.querySelector('.download').textContent==='Baixando…');
  assert.equal(await page.evaluate(()=>mockState.items[0].title),'Minha imagem bonita');
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_CONFIRM').length),1);
  assert.equal(await page.locator('.download').isEnabled(),false);
  assert.equal(await page.locator('#select').isEnabled(),true);
  const items=Array.from({length:5},(_,i)=>({...item,id:'image-'+i,url:item.url+'?image='+i,title:'Fotografia '+(i+1)}));
  await page.evaluate(items=>setPanelState({status:'idle',items:items.slice(0,3)}),items);
  assert.equal(await page.locator('#image-list').evaluate(el=>el.classList.contains('has-scroll')),false);
  assert.equal(await page.locator('#download-all').isVisible(),false);
  await page.evaluate(items=>setPanelState({status:'idle',items}),items);
  assert.equal(await page.locator('.image-card').count(),5);
  assert.equal(await page.locator('#count').textContent(),'5 imagens');
  const overflow=await page.locator('#image-list').evaluate(el=>({scroll:el.scrollHeight,height:el.clientHeight,overflow:getComputedStyle(el).overflowY}));
  assert.ok(overflow.scroll>overflow.height);assert.equal(overflow.overflow,'scroll');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  assert.equal(await page.locator('#select').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true);
  // Incoming image updates must not destroy a name currently being typed.
  await page.locator('.title-input').first().fill('Rascunho preservado');
  await page.evaluate(()=>setPanelState({...mockState,items:[...mockState.items,{...mockState.items[0],id:'extra'}]}));
  assert.equal(await page.locator('.title-input').first().inputValue(),'Rascunho preservado');
  await page.locator('.title-input').first().press('Enter');
  await page.waitForFunction(()=>mockState.items[0].title==='Rascunho preservado');
  await page.locator('#gallery-toggle').click();
  assert.equal(await page.locator('#gallery').isVisible(),true);
  assert.ok((await page.locator('#gallery').boundingBox()).x<(await page.locator('#image-list').boundingBox()).x);
  assert.ok(await page.locator('#gallery img').first().evaluate(el=>el.getBoundingClientRect().width)>32);
  await page.screenshot({path:'/workspace/scratch/clickimage-gallery.png',fullPage:true});
  await page.locator('#gallery-toggle').click();
  await page.locator('.remove').first().click();await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===5);
  assert.equal(await page.locator('#download-all').isVisible(),true);
  await page.locator('#download-all').click();
  await page.waitForFunction(()=>mockState.batch?.running===true);
  assert.equal(await page.locator('#download-all').isEnabled(),false);
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_CONFIRM_ALL').length),1);
  await page.locator('#clear-all').click();
  await page.locator('#empty').waitFor({state:'visible'});
  assert.equal(await page.locator('.image-card').count(),0);
  assert.equal(await page.locator('#download-all').isVisible(),false);
  await page.evaluate(item=>setPanelState({status:'idle',items:[{...item,id:'broken',url:item.url.replace('128.png','missing.png')}]}),item);
  await page.waitForFunction(()=>document.querySelector('.dimensions').textContent==='Prévia indisponível');
  assert.equal(await page.locator('.download').isEnabled(),true);
  await page.evaluate(()=>{mockTab=8;mockState={status:'idle',items:[]};tabHandler()});
  await page.locator('#empty').waitFor({state:'visible'});
  await page.setViewportSize({width:280,height:600});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#select').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true);
  await page.evaluate(item=>setPanelState({status:'idle',items:[{...item,format:'WEBP'}]}),item);
  await page.locator('#layout').selectOption('grid');
  await page.locator('#gallery-toggle').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('.convert-png').isVisible(),true);
  await page.locator('#gallery-toggle').click();
  await page.locator('#layout').selectOption('list');
  await page.locator('#select').click();
  await page.waitForFunction(()=>mockState.status==='selecting');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.equal(await page.evaluate(()=>panelDisconnected),1);
  assert.equal(await page.locator('#select').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.locator('#select').getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);
  console.log('PASS: manual hunt; multiple previews; editable download titles; no automatic download; continued hunting; vivid active button; trash clears collection; batch button at 4+; hidden CDN domains; 4+ scroll; fixed panel height; draft preservation; per-image removal; preview failure; tab isolation; narrow layout. Copy URL, layout choices, reverse search URL and native WebP-to-PNG codec also passed; original remains available. Chrome APIs mocked.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
