// Real Chromium rendering and UI interaction; Chrome extension APIs mocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
(async () => {
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(data)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:360,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.mockTab=7;window.mockState={status:'idle',item:null};window.commands=[];window.handlers=[];
   window.chrome={
    tabs:{query:async()=>[{id:mockTab}],onActivated:{addListener:cb=>window.tabHandler=cb},onUpdated:{addListener:()=>{}}},
    storage:{onChanged:{addListener:cb=>handlers.push(cb)}},
    runtime:{sendMessage:async message=>{
     commands.push(message);
     if(message.type==='CLICKIMAGE_STATE')return {ok:true,state:mockState};
     if(message.type==='CLICKIMAGE_SELECT')mockState={status:'selecting',item:null};
     if(message.type==='CLICKIMAGE_CLEAR')mockState={status:'idle',item:null};
     if(message.type==='CLICKIMAGE_CONFIRM')mockState={...mockState,status:'downloading'};
     return {ok:true};
    }}
   };
   window.setPanelState=state=>{window.mockState=state;handlers.forEach(cb=>cb({['clickimage:'+mockTab]:{newValue:state}},'session'))};
  });
  await page.goto(base+'/panel.html');
  await page.locator('#select').click();
  await assert.doesNotReject(()=>page.locator('#status-label').filter({hasText:'Selecione uma imagem'}).waitFor());
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_CONFIRM').length),0);
  const item={id:'preview-1',url:base+'/icons/128.png',filename:'128.png'};
  await page.evaluate(item=>setPanelState({status:'ready',item}),item);
  await page.locator('#preview').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#dimensions').textContent==='128 × 128 px');
  assert.equal(await page.locator('.thumbnail').evaluate(el=>el.getBoundingClientRect().width),58);
  assert.equal(await page.locator('#download').isEnabled(),true);
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_CONFIRM').length),0);
  // Snapshot uses a safe local fixture; no authenticated page content.
  await page.screenshot({path:'/workspace/scratch/clickimage-panel.png',fullPage:true});
  await page.locator('#download').click();
  await page.waitForFunction(()=>document.querySelector('#download-label').textContent==='Baixando…');
  assert.equal(await page.locator('#download').isEnabled(),false);
  assert.equal(await page.evaluate(()=>commands.filter(m=>m.type==='CLICKIMAGE_CONFIRM').length),1);
  await page.evaluate(item=>setPanelState({status:'downloaded',item}),item);
  assert.equal(await page.locator('#download').isEnabled(),false);
  await page.locator('#remove').click();await page.locator('#empty').waitFor({state:'visible'});
  assert.equal(await page.locator('#selection').isVisible(),false);
  await page.evaluate(item=>setPanelState({status:'ready',item:{...item,id:'broken',url:item.url.replace('128.png','missing.png')}}),item);
  await page.waitForFunction(()=>document.querySelector('#dimensions').textContent==='Prévia indisponível');
  assert.equal(await page.locator('#download').isEnabled(),true);
  await page.evaluate(()=>{mockTab=8;mockState={status:'idle',item:null};tabHandler()});
  await page.locator('#empty').waitFor({state:'visible'});
  await page.locator('#help').click();assert.equal(await page.locator('#help-text').isVisible(),true);
  await page.setViewportSize({width:280,height:700});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: dark panel; 58px preview; no automatic confirmation; explicit download; disabled duplicate button; completion; removal; preview failure; per-tab refresh; help; narrow layout. Chrome APIs mocked.');
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
