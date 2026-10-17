// Physical input against a real page, including an iframe with a sandboxed opaque origin.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'..'),png=fs.readFileSync(path.join(root,'icons/128.png'));
 const wav=Buffer.alloc(44+32000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
 const server=http.createServer((req,res)=>{if(req.url==='/tone.wav'){res.setHeader('Content-Type','audio/wav');res.end(wav);return}if(req.url==='/photo.png'){res.setHeader('Content-Type','image/png');res.end(png);return}res.setHeader('Content-Type','text/html');res.end('<style>body{font:16px system-ui}img,video{width:128px;height:90px}button,a,input,audio,video,iframe{margin:8px}iframe{height:80px;width:200px}#scroller{height:90px;width:250px;overflow:auto;border:1px solid}#scroller div{height:500px}</style><button id="action">Action</button><a id="link" href="#navigation">Link</a><input id="input"><br><img id="image" src="/photo.png"><video id="video" controls poster="/photo.png"></video><audio id="audio" controls src="/tone.wav" preload="auto"></audio><br><iframe id="frame"></iframe><div id="scroller"><div>Scroll while selecting</div></div>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/lib/chromium/chromium',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{window.actions=0;window.mediaActions=0;window.audioPlays=0;document.querySelector('#audio').addEventListener('play',()=>audioPlays++);window.frameActions=0;window.contextActions=0;window.previews=[];document.querySelector('#action').onclick=()=>actions++;for(const el of document.querySelectorAll('video,audio'))el.addEventListener('pointerdown',()=>mediaActions++);window.addEventListener('contextmenu',()=>contextActions++);window.addEventListener('message',e=>{if(e.data==='frame-action')frameActions++});document.querySelector('#frame').setAttribute('sandbox','allow-scripts');document.querySelector('#frame').srcdoc=('<button onclick="parent.postMessage(\'frame-action\',\'*\')">Frame action</button>');window.chrome={runtime:{onMessage:{addListener:cb=>window.message=cb},sendMessage:async msg=>{if(msg.type==='CLICKIMAGE_PREVIEW')previews.push(msg);return {ok:true}}}}});
  await page.frameLocator('#frame').locator('button').waitFor();await page.addScriptTag({path:path.join(root,'image-utils.js')});await page.addScriptTag({path:path.join(root,'content.js')});
  const activate=()=>page.evaluate(()=>message({type:'CLICKIMAGE_ACTIVATE',token:'guard'}));await activate();
  await page.locator('#action').click({force:true});assert.equal(await page.evaluate(()=>actions),0);
  await page.locator('#link').click({force:true});assert.equal(new URL(page.url()).hash,'');await page.locator('#link').click({button:'middle',force:true});assert.equal(page.context().pages().length,1);
  await page.locator('#audio').click({force:true,position:{x:20,y:20}});assert.equal(await page.evaluate(()=>mediaActions),0);assert.equal(await page.evaluate(()=>audioPlays),0);
  await page.frameLocator('#frame').locator('button').click({force:true});assert.equal(await page.evaluate(()=>frameActions),0);
  await page.locator('#action').click({button:'right',force:true});assert.equal(await page.evaluate(()=>contextActions),0);
  await page.locator('#input').focus();await page.keyboard.type('blocked');assert.equal(await page.locator('#input').inputValue(),'');
  await page.locator('#action').focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>actions),0);
  const box=await page.locator('#scroller').boundingBox();await page.mouse.move(box.x+30,box.y+30);await page.mouse.wheel(0,150);await page.waitForFunction(()=>document.querySelector('#scroller').scrollTop>0);
  await page.locator('#image').click({force:true});await page.waitForFunction(()=>previews.length===1);assert.ok((await page.evaluate(()=>previews[0].url)).endsWith('/photo.png'));
  await page.locator('#video').click({force:true});await page.waitForFunction(()=>previews.length===2);assert.equal(await page.evaluate(()=>mediaActions),0);assert.ok((await page.evaluate(()=>previews[1].url)).endsWith('/photo.png'));
  // Synthetic page clicks never become a selection.
  await page.evaluate(()=>document.querySelector('#image').click());assert.equal(await page.evaluate(()=>previews.length),2);
  await page.keyboard.press('Escape');await page.locator('#action').click();assert.equal(await page.evaluate(()=>actions),1);await page.locator('#link').click();assert.equal(new URL(page.url()).hash,'#navigation');
  await page.frameLocator('#frame').locator('button').click();await page.waitForFunction(()=>frameActions===1);await page.locator('#audio').click({position:{x:20,y:20}});await page.waitForFunction(()=>audioPlays===1);
  await activate();await page.evaluate(()=>message({type:'CLICKIMAGE_CANCEL',silent:true}));await page.locator('#action').click();assert.equal(await page.evaluate(()=>actions),2);assert.deepEqual(errors,[]);
  console.log('PASS: only physical clicks on images/posters are captured; controls, links, audio/video interactions, middle/right click, keyboard activation and opaque-origin iframe are blocked during selection; nested scrolling preserved; ESC/panel-close restore page actions; synthetic clicks do not capture.');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
