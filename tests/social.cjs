// Representative social-site DOM fixtures. No authenticated/live posts tested.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/lib/chromium/chromium',headless:true});
 try{
  const root=path.resolve(__dirname,'..');
  const instagram={small:'https://scontent.test.cdninstagram.com/photo.jpg?oh=small&stp=preview',large:'https://scontent.test.cdninstagram.com/photo.jpg?oh=original&stp=large'};
  const cases=[
   {site:'https://www.facebook.com/',small:'https://scontent.test.fbcdn.net/photo.jpg?oh=small&oe=123',large:'https://scontent.test.fbcdn.net/photo.jpg?oh=original&oe=123'},
   {site:'https://x.com/',small:'https://pbs.twimg.com/media/fixture?format=jpg&name=small',large:'https://pbs.twimg.com/media/fixture?format=jpg&name=orig'},
   ...['','explore/','reels/','fixture-profile/'].map(area=>({site:'https://www.instagram.com/'+area,...instagram})),
   {site:'https://www.pinterest.com/',small:'https://i.pinimg.com/236x/fixture.png',large:'https://i.pinimg.com/originals/fixture.png'},
   {site:'https://www.pinterest.com/pin/123/',small:'https://i.pinimg.com/236x/fixture.png',large:'https://i.pinimg.com/originals/fixture.png',background:true},
   {site:'https://www.instagram.com/reel/fixture/',...instagram,poster:true}
  ];
  for(const fixture of cases){
   const page=await browser.newPage();const errors=[],consoleErrors=[];page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>{
    if(route.request().url().startsWith(fixture.site)) {
     const esc=url=>url.replaceAll('&','&amp;');
     const image=fixture.background?`<div style="width:200px;height:150px;background-image:url('${esc(fixture.large)}')"></div>`:fixture.poster?`<video poster="${esc(fixture.large)}" style="width:200px;height:150px"></video>`:`<img crossorigin="anonymous" role="presentation" alt="Social photo" src="${esc(fixture.small)}" data-srcset="${esc(fixture.small)} 1x, ${esc(fixture.large)} 2x" style="width:200px;height:150px;pointer-events:none">`;
     return route.fulfill({contentType:'text/html',body:`<html><body><figure style="position:relative;width:200px;height:150px">${image}<a href="/destination" id="overlay" style="position:absolute;inset:0"><span style="position:absolute;inset:0"></span></a></figure></body></html>`});
    }
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
   assert.equal(selected.url,fixture.large);assert.equal(selected.format,'PNG',fixture.site+' '+consoleErrors.join('\n'));assert.ok(selected.sizeBytes>0);
   // Controls with image icons must remain usable while hunting.
   await page.evaluate(url=>{
    window.controlClicks=0;
    const button=document.createElement('button');button.id='control';button.innerHTML=`<img src="${url}" width="40" height="40">`;button.onclick=()=>controlClicks++;document.body.append(button);
   },fixture.small);
   await page.locator('#control img').click();
   assert.equal(await page.evaluate(()=>controlClicks),1);
   assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='CLICKIMAGE_PREVIEW').length),1);
   // A hidden carousel slide overlaps the pointer's bounding box but is
   // outside its parent's overflow clip. It must not replace the visible IMG.
   if(!fixture.background && !fixture.poster){
    await page.evaluate(url=>{
     const clipped=document.createElement('div');clipped.style.cssText='position:absolute;left:250px;top:0;width:20px;height:150px;overflow:hidden;pointer-events:none';
     clipped.innerHTML=`<img alt="Clipped slide" src="${url}" style="position:absolute;left:-250px;width:200px;height:150px;pointer-events:none">`;document.querySelector('figure').append(clipped);
    },fixture.small);
    await page.locator('#overlay').click();
    await page.waitForFunction(()=>messages.filter(m=>m.type==='CLICKIMAGE_PREVIEW').length===2);
    const afterClip=await page.evaluate(()=>messages.filter(m=>m.type==='CLICKIMAGE_PREVIEW').at(-1));
    assert.equal(afterClip.label,'Social photo',JSON.stringify(afterClip));
    assert.equal(afterClip.url,fixture.large);
   }
   // Solid overlays must not intercept navigation as image selections.
   const count=await page.evaluate(()=>messages.length);
   await page.evaluate(()=>{window.overlayClicks=0;const overlay=document.querySelector('#overlay');overlay.style.background='white';overlay.onclick=event=>{event.preventDefault();overlayClicks++}});
   await page.locator('#overlay').click();assert.equal(await page.evaluate(()=>messages.length),count);assert.equal(await page.evaluate(()=>overlayClicks),1);
   await page.keyboard.press('Escape');assert.notEqual(await page.locator('#overlay').evaluate(el=>getComputedStyle(el).cursor),'crosshair');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: 9 synthetic Facebook, X, Instagram (Home, Explore, profiles and Reels posters) and Pinterest fixtures: nested overlays, CSS backgrounds, native controls, clipped slides, opaque blockers, largest declared resource, signed URLs, real format/size and ESC. Live-site access not verified.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
