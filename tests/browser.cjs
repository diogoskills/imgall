// Browser selector integration with mocked Chrome messaging; not a real extension-load test.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req,res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'text/html');res.end(data)});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const profile = fs.mkdtempSync('/tmp/clickimage-browser-');
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {executablePath:process.env.CHROMIUM_PATH || '/usr/lib/chromium/chromium',headless:true,ignoreDefaultArgs:["--disable-extensions"],acceptDownloads:true,args:["--disable-features=DisableLoadExtensionCommandLineSwitch",`--disable-extensions-except=${root}`,`--load-extension=${root}`]});

    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/tests/manual.html`);
    await page.evaluate(() => {
      window.ciMessages = []; window.ciListeners = [];
      window.chrome = {runtime:{onMessage:{addListener:cb=>ciListeners.push(cb)},sendMessage:async msg=>{ciMessages.push(msg);return {ok:true}}}};
    });
    await page.addScriptTag({path:path.join(root,'image-utils.js')});
    await page.addScriptTag({path:path.join(root,'content.js')});
    await page.addScriptTag({path:path.join(root,'content.js')});
    assert.equal(await page.evaluate(()=>ciListeners.length),1);
    async function activate(token) {
      await page.evaluate(token=>ciListeners[0]({type:'CLICKIMAGE_ACTIVATE',token}),token);
    }
    const cursor=()=>page.locator('body > img').first().evaluate(el=>getComputedStyle(el).cursor);
    await activate('esc');assert.equal(await cursor(),'crosshair');
    await page.keyboard.press('Escape');assert.notEqual(await cursor(),'crosshair');
    await page.locator('#normal').click();assert.equal(await page.locator('#count').textContent(),'1');
    await activate('download');
    await page.locator('#link img').hover();
    await page.locator('#link img').click();
    assert.equal(await page.evaluate(()=>ciMessages.length),1);
    assert.match(await page.evaluate(()=>ciMessages[0].url), /icons\/128.png\?link=1$/);
    assert.equal(new URL(page.url()).hash,'');assert.notEqual(await cursor(),'crosshair');
    await page.locator('#link img').click();assert.equal(new URL(page.url()).hash,'#navegou');
    await activate('dynamic');await page.locator('#add').click();
    await page.locator('img[alt="Dinâmica"]').click();
    assert.equal(await page.evaluate(()=>ciMessages.length),2);
    await activate('shadow');await page.locator('#shadow img').click();
    assert.equal(await page.evaluate(()=>ciMessages.length),3);
    await activate('background');await page.locator('.background').click();
    assert.equal(await page.evaluate(()=>ciMessages.length),4);
    await activate('unsupported');await page.locator('img[alt="Data não suportada"]').click();
    assert.equal(await page.evaluate(()=>ciMessages.length),4);
    assert.notEqual(await cursor(),'crosshair');
    // Explicit listener accounting catches leaked selection handlers.
    await page.evaluate(()=>{
      window.ciTracked=new Set();
      const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
      window.addEventListener=(t,cb,o)=>{if(['pointermove','click','keydown','scroll','resize'].includes(t)) ciTracked.add(t);return add(t,cb,o)};
      window.removeEventListener=(t,cb,o)=>{ciTracked.delete(t);return remove(t,cb,o)};
    });
    await activate('cleanup');assert.equal(await page.evaluate(()=>ciTracked.size),5);
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>ciTracked.size),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: selector in real Chromium with mocked extension messaging: ESC; inactive buttons/links; one linked-image request; dynamic image; open Shadow DOM; background; unsupported URL; reinjection; listener/cursor cleanup; no page errors. Actual extension loading/download API not tested.');
  } finally {await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
