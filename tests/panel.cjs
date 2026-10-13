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
   window.mockTab=7;window.mockState={status:'idle',items:[]};window.commands=[];window.handlers=[];
   window.chrome={tabs:{query:async()=>[{id:mockTab}],onActivated:{addListener:cb=>window.tabHandler=cb},onUpdated:{addListener:()=>{}}},storage:{onChanged:{addListener:cb=>handlers.push(cb)}},runtime:{sendMessage:async message=>{
    commands.push(message);
    if(message.type==='CLICKIMAGE_STATE')return {ok:true,state:mockState};
    const item=mockState.items.find(image=>image.id===message.itemId);
    if(message.type==='CLICKIMAGE_SELECT')mockState.status='selecting';
    if(message.type==='CLICKIMAGE_STOP')mockState.status='idle';
    if(message.type==='CLICKIMAGE_REMOVE')mockState.items=mockState.items.filter(image=>image.id!==message.itemId);
    if(message.type==='CLICKIMAGE_RENAME')item.title=message.title;
    if(message.type==='CLICKIMAGE_CONFIRM')item.status='downloading';
    return {ok:true};
   }}};
   window.setPanelState=state=>{mockState=state;handlers.forEach(cb=>cb({['clickimage:'+mockTab]:{newValue:state}},'session'))};
  });
  await page.goto(base+'/panel.html');
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_SELECT').length),0);
  await page.locator('#select').click();
  await page.locator('#status-label').filter({hasText:'Clique em uma imagem'}).waitFor();
  const item={id:'first',url:base+'/icons/128.png',filename:'128.png',title:'',status:'ready'};
  await page.evaluate(item=>setPanelState({status:'idle',items:[item]}),item);
  await page.waitForFunction(()=>document.querySelector('.dimensions').textContent==='128 × 128 px');
  assert.equal(await page.locator('#select').isEnabled(),true);
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
  await page.screenshot({path:'/workspace/scratch/clickimage-gallery.png',fullPage:true});
  await page.locator('.remove').first().click();await page.waitForFunction(()=>document.querySelectorAll('.image-card').length===5);
  await page.evaluate(item=>setPanelState({status:'idle',items:[{...item,id:'broken',url:item.url.replace('128.png','missing.png')}]}),item);
  await page.waitForFunction(()=>document.querySelector('.dimensions').textContent==='Prévia indisponível');
  assert.equal(await page.locator('.download').isEnabled(),true);
  await page.evaluate(()=>{mockTab=8;mockState={status:'idle',items:[]};tabHandler()});
  await page.locator('#empty').waitFor({state:'visible'});
  await page.setViewportSize({width:280,height:600});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#select').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: manual hunt; multiple previews; editable download titles; no automatic download; continued hunting; 4+ scroll; fixed panel height; draft preservation; per-image removal; preview failure; tab isolation; narrow layout. Chrome APIs mocked.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
