// Synthetic YouTube DOM and responses in real Chromium; no live site access.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const id='abcdefghijk',root=path.resolve(__dirname,'..');let metadata=true;
  const html=()=>`<html><body><ytd-thumbnail><a id="thumbnail" href="/watch?v=${id}" style="display:block;position:relative;width:240px;height:140px"><img id="static" src="https://i.ytimg.com/vi/${id}/small.jpg" style="display:none"><img id="animated" src="https://i.ytimg.com/an_webp/${id}/preview.webp" style="position:absolute;width:240px;height:140px"><video id="preview" style="position:absolute;width:240px;height:140px"></video></a></ytd-thumbnail>${metadata?`<script>var ytInitialPlayerResponse=${JSON.stringify({videoDetails:{videoId:id,thumbnail:{thumbnails:[{url:`https://i.ytimg.com/vi/${id}/small.jpg`,width:48,height:48},{url:`https://i.ytimg.com/vi/${id}/full.jpg`,width:128,height:128}]}}})};</script>`:''}</body></html>`;
  await page.route('https://www.youtube.com/**',route=>route.fulfill({contentType:'text/html',body:html()}));
  await page.route('https://i.ytimg.com/**',route=>route.fulfill({contentType:route.request().url().includes('an_webp')?'image/gif':'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:route.request().url().includes('an_webp')?Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64'):fs.readFileSync(path.join(root,'icons',route.request().url().includes('full.jpg')?'128.png':'48.png'))}));
  await page.goto('https://www.youtube.com/');
  await page.evaluate(()=>{window.listeners=[];window.messages=[];window.chrome={runtime:{onMessage:{addListener:cb=>listeners.push(cb)},sendMessage:async msg=>{messages.push(msg);return {ok:true}}}}});
  await page.addScriptTag({path:path.join(root,'image-utils.js')});await page.addScriptTag({path:path.join(root,'content.js')});
  await page.evaluate(()=>listeners[0]({type:'CLICKIMAGE_ACTIVATE',token:'video'}));
  await page.locator('#preview').hover({force:true});await page.locator('#preview').click({force:true});
  await page.waitForFunction(()=>messages.filter(msg=>msg.type==='CLICKIMAGE_PREVIEW').length===1);
  const video=await page.evaluate(()=>messages.find(msg=>msg.type==='CLICKIMAGE_PREVIEW'));
  assert.equal(video.url,`https://i.ytimg.com/vi/${id}/full.jpg`);
  assert.equal(video.format,'PNG'); // Bytes win over the misleading .jpg suffix.
  await page.evaluate(()=>document.querySelector('#preview').remove());
  await page.locator('#animated').hover({force:true});await page.locator('#animated').click({force:true});
  await page.waitForFunction(()=>messages.filter(msg=>msg.type==='CLICKIMAGE_PREVIEW').length===2);
  assert.equal(await page.evaluate(()=>messages.filter(msg=>msg.type==='CLICKIMAGE_PREVIEW').at(-1).url),video.url);
  await page.evaluate(()=>listeners[0]({type:'CLICKIMAGE_CANCEL',silent:true}));
  assert.notEqual(await page.locator('#animated').evaluate(el=>getComputedStyle(el).cursor),'crosshair');
  assert.equal(await page.locator('html > div').count(),0);
  metadata=false;
  await page.evaluate(()=>{document.querySelector('#static').remove();document.querySelectorAll('script').forEach(script=>script.remove());listeners[0]({type:'CLICKIMAGE_ACTIVATE',token:'unavailable'})});
  await page.locator('#animated').click({force:true});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#animated')).cursor!=='crosshair');
  assert.equal(await page.evaluate(()=>messages.filter(msg=>msg.type==='CLICKIMAGE_PREVIEW').length),2);
  assert.deepEqual(errors,[]);
  console.log('PASS: video overlay and animated poster both choose highest static thumbnail; PNG signature defeats .jpg suffix; silent close removes UI; unavailable static thumbnail never selects GIF/video. Synthetic site, mocked Chrome messaging.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
