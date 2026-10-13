// Representative social-site DOM fixtures. No authenticated/live posts tested.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true});
 try{
  const root=path.resolve(__dirname,'..');
  const cases=[
   {site:'https://www.facebook.com/',small:'https://scontent.test.fbcdn.net/photo.jpg?oh=small&oe=123',large:'https://scontent.test.fbcdn.net/photo.jpg?oh=original&oe=123'},
   {site:'https://x.com/',small:'https://pbs.twimg.com/media/fixture?format=jpg&name=small',large:'https://pbs.twimg.com/media/fixture?format=jpg&name=orig'},
   {site:'https://www.instagram.com/',small:'https://scontent.test.cdninstagram.com/photo.jpg?oh=small&stp=preview',large:'https://scontent.test.cdninstagram.com/photo.jpg?oh=original&stp=large'}
  ];
  for(const fixture of cases){
   const page=await browser.newPage();const errors=[],consoleErrors=[];page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>{
    if(route.request().url().startsWith(fixture.site))return route.fulfill({contentType:'text/html',body:`<html><body><figure style="position:relative;width:200px;height:150px"><img crossorigin="anonymous" alt="Social photo" src="${fixture.small.replaceAll('&','&amp;')}" data-srcset="${fixture.small.replaceAll('&','&amp;')} 1x, ${fixture.large.replaceAll('&','&amp;')} 2x" style="width:200px;height:150px;pointer-events:none"><div id="overlay" style="position:absolute;inset:0"></div></figure></body></html>`});
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Range','Access-Control-Allow-Methods':'GET, OPTIONS'}});
    const large=route.request().url()===fixture.large;
    const body=fs.readFileSync(path.join(root,'icons',large?'128.png':'48.png'));
    return route.fulfill({status:route.request().headers().range?206:200,contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Range','Access-Control-Expose-Headers':'Content-Range','Content-Range':`bytes 0-${body.length-1}/${body.length}`},body});
   });
   await page.goto(fixture.site);
   await page.evaluate(()=>{window.messages=[];window.listeners=[];window.chrome={runtime:{onMessage:{addListener:cb=>listeners.push(cb)},sendMessage:async message=>{messages.push(message);return {ok:true}}}}});
   await page.addScriptTag({path:path.join(root,'image-utils.js')});await page.addScriptTag({path:path.join(root,'content.js')});
   await page.evaluate(()=>listeners[0]({type:'CLICKIMAGE_ACTIVATE',token:'social'}));
   await page.locator('#overlay').hover();await page.locator('#overlay').click();
   await page.waitForFunction(()=>messages.some(message=>message.type==='CLICKIMAGE_PREVIEW'));
   const selected=await page.evaluate(()=>messages.find(message=>message.type==='CLICKIMAGE_PREVIEW'));
   assert.equal(selected.url,fixture.large);assert.equal(selected.format,'PNG',consoleErrors.join('\n'));assert.ok(selected.sizeBytes>0);
   await page.keyboard.press('Escape');assert.notEqual(await page.locator('img').evaluate(img=>getComputedStyle(img).cursor),'crosshair');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: Facebook, X and Instagram representative fixtures: overlay, lazy srcset, highest declared resource, signed parameters preserved, real format/size and ESC. Live-site access not verified.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
