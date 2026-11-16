const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';fs.mkdirSync('qa-production',{recursive:true});
const message='無声子音に無声化記号が付いています。冗長な指定になっていないか確認してください。';
async function warn(p){await p.locator('#out').fill('p');await p.locator('#out').press('End');await p.evaluate(()=>esaChartInsert('\u0325'));await p.waitForFunction(()=>document.getElementById('toast').classList.contains('show'));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function anchored(p,label){
 const box=await p.evaluate(()=>{const n=document.getElementById('toast'),r=n.getBoundingClientRect(),p=document.getElementById('floatingEditor').getBoundingClientRect(),v=visualViewport,s=v.scale;return{placement:n.dataset.placement,left:(r.left-v.offsetLeft)*s,right:(r.right-v.offsetLeft)*s,top:(r.top-v.offsetTop)*s,bottom:(r.bottom-v.offsetTop)*s,viewW:v.width*s,viewH:v.height*s,gap:n.dataset.placement==='above'?(p.top-r.bottom)*s:n.dataset.placement==='below'?(r.top-p.bottom)*s:n.dataset.placement==='left'?(p.left-r.right)*s:(r.left-p.right)*s,width:r.width*s,font:parseFloat(getComputedStyle(n).fontSize)};});
 assert(box.left>=7&&box.right<=box.viewW-7&&box.top>=7&&box.bottom<=box.viewH-7,'notice inside visible viewport: '+label+' '+JSON.stringify(box));assert(Math.abs(box.gap-8)<1,'notice stays 8px from panel: '+label+' '+JSON.stringify(box));return box;
}
async function move(p,direction,times){const handle=p.locator('#inputPanelDrag');await handle.focus();for(let i=0;i<times;i++)await handle.press('Shift+Arrow'+direction);await p.waitForTimeout(40);}
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});
 for(const width of[320,390,1280]){
  const p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(app);await p.frameLocator('#v83ChartFrame').locator('.v83-ipa-key').first().waitFor();await p.evaluate(()=>esaI18n.ready);
  assert((await p.locator('.app-header .title').evaluate(e=>getComputedStyle(e).fontFamily)).startsWith('Arial'),'app title uses Arial');
  await warn(p);await anchored(p,'default');
  for(const locale of['ja','en','pt-BR','fa','ja-osaka']){await p.locator('#languageSelect').selectOption(locale);await warn(p);const expected=await p.evaluate(({key,locale})=>esaI18n.t(key,locale),{key:message,locale});assert.equal(await p.locator('#toast').textContent(),expected);await anchored(p,locale);}
  await p.locator('#languageSelect').selectOption('ja');
  await move(p,'Up',30);await warn(p);assert.equal((await anchored(p,'top')).placement,'below');
  await move(p,'Right',40);await warn(p);await anchored(p,'right');
  await move(p,'Down',30);await warn(p);assert.equal((await anchored(p,'bottom')).placement,'above');
  // A warning already on screen follows a real drag, rather than only the next warning.
  const before=await p.locator('#floatingEditor').boundingBox(),grip=await p.locator('#inputPanelDrag').boundingBox();await p.mouse.move(grip.x+20,grip.y+10);await p.mouse.down();await p.mouse.move(grip.x+10,grip.y-70,{steps:5});await p.mouse.up();await p.waitForTimeout(60);await anchored(p,'drag while shown');const after=await p.locator('#floatingEditor').boundingBox();assert(after.y<before.y-30,'panel actually dragged');
  await p.locator('#contrastToggle').click();await warn(p);await anchored(p,'dark');await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-panel-notice-dark.png`});
  await p.setViewportSize({width,height:360});await warn(p);await anchored(p,'short viewport');await p.locator('#contrastToggle').click();await warn(p);await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-panel-notice-short.png`});
  if(name==='chromium'){
   await p.setViewportSize({width,height:844});const cd=await p.context().newCDPSession(p);await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await p.waitForTimeout(120);await warn(p);const scaled=await anchored(p,'browser page zoom');assert.equal(scaled.font,12);assert(scaled.width<=360.5,'notice retains its physical width at page zoom');await cd.detach();
  }
  await p.locator('#warnToggle').uncheck({force:true});await p.waitForFunction(()=>!document.getElementById('toast').classList.contains('show'));await p.locator('#out').fill('p');await p.locator('#out').press('End');await p.evaluate(()=>esaChartInsert('\u0325'));assert.equal(await p.locator('#toast').evaluate(e=>e.classList.contains('show')),false,'warnings off still respected');assert.deepEqual(errors,[]);await p.close();
  console.log(`PASS NOTICE ${name} ${width}: near panel, real drag tracking, top/bottom/right, five languages, dark mode, short viewport${name==='chromium'?', native browser zoom':''}, warning toggle and Arial title`);
 }
 await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});
