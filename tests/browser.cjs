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
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'text/html');if(req.url.includes('slow=1'))setTimeout(()=>res.end(data),300);else res.end(data)});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const profile = fs.mkdtempSync('/tmp/clickimage-browser-');
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {executablePath:process.env.CHROMIUM_PATH || '/usr/lib/chromium/chromium',headless:true});

    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/tests/manual.html`);
    await page.evaluate(() => {
      window.ciMessages = []; window.ciListeners = [];
      window.chrome = {runtime:{onMessage:{addListener:cb=>ciListeners.push(cb)},sendMessage:async msg=>{if(msg.type==='CLICKIMAGE_PREVIEW')ciMessages.push(msg);return {ok:true}}}};
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
    await page.waitForFunction(expected => ciMessages.length === expected,1);
    assert.match(await page.evaluate(()=>ciMessages[0].url), /icons\/128.png\?link=1$/);
    assert.equal(new URL(page.url()).hash,'');assert.equal(await cursor(),'crosshair');
    await page.keyboard.press('Escape');assert.notEqual(await cursor(),'crosshair');
    await page.locator('#link img').click();assert.equal(new URL(page.url()).hash,'#navegou');
    await activate('dynamic');await page.locator('#add').click();
    await page.locator('img[alt="Dinâmica"]').click();
    await page.waitForFunction(expected => ciMessages.length === expected,2);
    await page.keyboard.press('Escape');
    await activate('shadow');await page.locator('#shadow img').click();
    await page.waitForFunction(expected => ciMessages.length === expected,3);
    await page.keyboard.press('Escape');
    await activate('background');await page.locator('.background').click();
    await page.waitForFunction(expected => ciMessages.length === expected,4);
    await page.keyboard.press('Escape');
    await activate('unsupported');await page.locator('img[alt="Data não suportada"]').click();
    await page.waitForFunction(expected => ciMessages.length === expected,4);
    await page.waitForTimeout(100);
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
    async function selectOriginal(alt, expected) {
      const count=await page.evaluate(()=>ciMessages.length);
      await activate(alt);
      await page.locator(`img[alt="${alt}"]`).click();
      await page.waitForFunction(count=>ciMessages.length===count+1,count);
      assert.match(await page.evaluate(()=>ciMessages.at(-1).url),expected);
      assert.equal(await cursor(),'crosshair');
      await page.keyboard.press('Escape');
      assert.notEqual(await cursor(),'crosshair');
      assert.equal(await page.evaluate(()=>ciTracked.size),0);
    }
    await selectOriginal('HTML do container', /128.png\?wrapper=exact$/);
    await selectOriginal('Galeria imagem um', /48.png$/);
    await selectOriginal('Original no link', /128.png\?original=link$/);
    await selectOriginal('Original no atributo', /128.png\?original=data$/);
    await selectOriginal('Original indisponível', /128.png\?fallback=1$/);
    await selectOriginal('Picture de alta resolução', /128.png\?picture=large$/);
    await selectOriginal('Link HTML ignorado', /128.png\?html-fallback=1$/);
    const count = await page.evaluate(()=>ciMessages.length);
    await page.locator('img[alt="Original no atributo"]').evaluate(el=>el.setAttribute('data-original','../icons/128.png?slow=1'));
    await activate('slow-original');
    await page.locator('img[alt="Original no atributo"]').click();
    const accepted = await page.evaluate(()=>{
      let result;
      ciListeners[0]({type:'CLICKIMAGE_ACTIVATE',token:'should-not-replace'},null,reply=>result=reply);
      return result.accepted;
    });
    assert.equal(accepted,false);
    await page.waitForFunction(count=>ciMessages.length===count+1,count);
    assert.equal(await page.evaluate(()=>ciMessages.at(-1).token),'slow-original');
    assert.match(await page.evaluate(()=>ciMessages.at(-1).url), /128.png\?slow=1$/);
    await page.keyboard.press('Escape');
    const overlayCount = await page.evaluate(()=>ciMessages.length);
    await activate('instagram-overlay');
    await page.locator('#photo-overlay').hover();
    await page.locator('#photo-overlay').click();
    await page.waitForFunction(count=>ciMessages.length===count+1,overlayCount);
    const overlayUrl = new URL(await page.evaluate(()=>ciMessages.at(-1).url));
    assert.equal(overlayUrl.searchParams.get('stp'),'dst-jpg_e35_tt6');
    assert.equal(overlayUrl.searchParams.get('oh'),'signed-value');
    assert.equal(overlayUrl.searchParams.get('oe'),'6AD34BE4');
    assert.equal(await page.evaluate(()=>ciTracked.size),5);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>ciTracked.size),0);
    await page.evaluate(()=>{
      document.querySelector('#photo-overlay').style.background='white';
      window.overlayClicks=0;
      document.querySelector('#photo-overlay').addEventListener('click',()=>overlayClicks++);
    });
    await activate('opaque-overlay');await page.locator('#photo-overlay').click();
    assert.equal(await page.evaluate(()=>ciMessages.length),overlayCount+1);
    assert.equal(await page.evaluate(()=>overlayClicks),1);
    await page.keyboard.press('Escape');
    const continuousCount=await page.evaluate(()=>ciMessages.length);
    await activate('continuous-hunt');
    await page.locator('img[alt="Galeria imagem um"]').click();
    await page.waitForFunction(count=>ciMessages.length===count+1,continuousCount);
    await page.locator('img[alt="Original no link"]').click();
    await page.waitForFunction(count=>ciMessages.length===count+2,continuousCount);
    assert.equal(await page.evaluate(()=>ciMessages.at(-2).token),'continuous-hunt');
    assert.equal(await page.evaluate(()=>ciMessages.at(-1).token),'continuous-hunt');
    assert.equal(await cursor(),'crosshair');
    await page.keyboard.press('Escape');
    assert.notEqual(await cursor(),'crosshair');
    assert.deepEqual(errors,[]);
    console.log('PASS: real Chromium image decoding selects 128px originals over 48px previews, including a 24px CSS thumbnail, original link/attribute, inactive picture source, lazy srcset, inaccessible-original fallback and HTML-link rejection. ESC, one request, dynamic images, Shadow DOM, background and listener cleanup also passed. Chrome messaging is mocked; actual extension loading/download API not tested.');
  } finally {await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
