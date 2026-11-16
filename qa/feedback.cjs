const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');fs.mkdirSync('qa-production',{recursive:true});
(async()=>{for(const[name,type]of Object.entries({chromium,webkit})){
 const b=await type.launch({headless:true}),p=await b.newPage({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await p.goto((process.env.TEST_BASE||'http://127.0.0.1:8765/')+'ipa-keyboard/');const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.locator('.v83-ipa-key').first().waitFor();assert.equal(await f.locator('#vowelFontSize, #vowelFontValue, .vowel-font-control').count(),0);await f.waitForFunction(()=>[...document.querySelectorAll('#vowelQuadrilateral .vowel-dynamic-glyph')].length===28&&[...document.querySelectorAll('#vowelQuadrilateral .vowel-dynamic-glyph')].every(e=>e.style.fontSize==='32px'));
 async function press(expected,color,label){
  const key=f.locator('#vowelQuadrilateral .v83-ipa-key').first();await key.scrollIntoViewIfNeeded();await key.focus();await p.keyboard.down('Space');
  await f.locator('.v83-purple-flash').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  const g=await f.locator('.v83-purple-flash').evaluate(e=>({width:e.getBoundingClientRect().width,bg:getComputedStyle(e).backgroundImage,filter:getComputedStyle(e).filter}));
  assert(Math.abs(g.width-expected*2)<.1,JSON.stringify(g));assert(g.bg.includes(color));assert.equal(g.filter,'none');
  await p.screenshot({path:`qa-production/${name}-${label}-held.png`});await p.keyboard.up('Space');await p.waitForTimeout(350);
  const d=await f.evaluate(()=>__v839DotState());assert(Math.abs(d.diameter-expected)<.1);assert(d.background.includes(color));assert(d.visible);
  await p.screenshot({path:`qa-production/${name}-${label}-dot.png`});
 }
 await press(13,'166, 128, 222','white-normal');
 // Zoom the normal chart without zooming the document or the floating editor.
 await f.evaluate(()=>{const s=document.getElementById('chartScaleShell'),r=s.getBoundingClientRect();function send(type,points){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([x,y])=>({clientX:x,clientY:y}))});s.dispatchEvent(e);}send('touchstart',[[100,r.top+80],[200,r.top+80]]);send('touchmove',[[50,r.top+80],[250,r.top+80]]);send('touchend',[]);});
 await press(26,'166, 128, 222','white-inline-200');
 await p.locator('#contrastToggle').evaluate(e=>e.click());assert.equal(await f.locator('html').getAttribute('data-inverse'),'true');
 // Existing selected dot changes colour immediately, including after reload.
 assert((await f.evaluate(()=>__v839DotState().background)).includes('255, 190, 128'));
 await press(26,'255, 190, 128','orange-inline-200');
 await f.locator('#chartZoomOpen').evaluate(e=>e.click());await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');
 await f.locator('#zoomMapToggle').click();await f.locator('#zoomRange').fill('200');await press(26,'255, 190, 128','orange-viewer-200');
 await f.locator('#zoomRange').fill('300');await f.locator('#vowelQuadrilateral .v83-ipa-key').first().scrollIntoViewIfNeeded();await p.waitForTimeout(100);assert(Math.abs((await f.evaluate(()=>__v839DotState())).diameter-39)<.1,'existing selection scales as zoom changes');
 await press(39,'255, 190, 128','orange-viewer-300');
 await p.locator('#contrastToggle').evaluate(e=>e.click());await press(39,'166, 128, 222','white-viewer-300');
 await f.locator('#zoomClose').click();await press(26,'166, 128, 222','white-inline-restored');
 await p.locator('#contrastToggle').evaluate(e=>e.click());await p.reload();await p.frameLocator('#v83ChartFrame').locator('.v83-ipa-key').first().waitFor();assert.equal(await p.frameLocator('#v83ChartFrame').locator('html').getAttribute('data-inverse'),'true');
 console.log(`PASS FEEDBACK ${name}: glow 26/52/78px, dot 13/26/39px, normal and viewer zoom, live selection resizing, lavender/orange themes, saved theme`);await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});

