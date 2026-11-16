const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/',live=process.env.PUBLIC_CHECK==='1';
fs.mkdirSync('qa-production',{recursive:true});
async function ready(p){await p.locator('#out').waitFor();const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);return f;}
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'}),p=await context.newPage(),errors=[],badAssets=[];
  p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(/\.(woff2|csv|js|html)(\?|$)/.test(r.url())&&r.status()>=400)badAssets.push(r.status()+' '+r.url());});
  await p.goto(app);const f=await ready(p);
  assert.equal(await p.title(),'IPA Keyboard v83.30 | esaKITs');assert.equal(await p.locator('.v83-label').textContent(),'v83.30');assert.equal(await f.locator('.v83-ipa-key').count(),235);
  for(const surface of[p,f])assert(await surface.evaluate(()=>document.fonts.check('20px "Doulos SIL Local"')&&document.fonts.check('20px "Noto Sans JP Local"')&&document.fonts.check('700 20px "Noto Sans JP Local"')),'local fonts load at production paths');
  for(const locale of ['ja','en','pt-BR','fa','ja-osaka','ja']){await p.locator('#languageSelect').selectOption(locale);await f.waitForFunction(locale=>document.documentElement.lang===(locale==='ja-osaka'?'ja':locale),locale);}
  const key=f.locator('#pulmonicConsonants [data-v83-sym="p"]').first();await key.scrollIntoViewIfNeeded();await key.dispatchEvent('pointerdown',{pointerType:'touch',button:0});assert((await f.evaluate(()=>__v831PopupState())).show,'popup remains enabled');await key.dispatchEvent('pointerup',{pointerType:'touch',button:0});assert.equal(await p.locator('#out').inputValue(),'p');
  await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await f.locator('#zoomPlus').click();assert.equal(await f.locator('#zoomRange').inputValue(),'125');await f.locator('#zoomClose').click();
  await p.locator('#contrastToggle').click();assert.equal(await p.locator('html').getAttribute('data-inverse'),'true');await p.screenshot({path:`qa-production/${live?'public':'staged'}-${name}-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);await context.close();
  console.log(`PASS PRODUCTION ${name} ${width}: stable URL, fonts, five languages, 235 targets, popup, input, viewer and contrast`);
 }
 if(!live){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await context.newPage();
  await p.goto(app+'__upgrade-fixture');await p.evaluate(async app=>{await navigator.serviceWorker.register(app+'sw.js?legacy=1',{scope:app});await navigator.serviceWorker.ready;},app);await p.reload();
  await p.evaluate(async app=>{
   const cache=await caches.open('ipa-keyboard-v4'),body='<!doctype html><title>Legacy IPA</title><h1 id="legacy">Old cached production</h1>';
   await cache.put(app,new Response(body,{headers:{'Content-Type':'text/html'}}));await cache.put(app+'index.html',new Response(body,{headers:{'Content-Type':'text/html'}}));
   await(await caches.open('unrelated-app-cache')).put(app+'other-app-marker',new Response('keep'));
  },app);
  await p.goto(app);await p.locator('#legacy').waitFor();await p.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});});
  try{await p.locator('#out').waitFor({timeout:30000});}catch(error){console.log('UPGRADE DEBUG',await p.evaluate(async()=>({url:location.href,body:document.body.innerText,controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({active:r.active?.state,waiting:r.waiting?.state,installing:r.installing?.state})),caches:await caches.keys()})));await p.screenshot({path:`qa-production/${name}-upgrade-failure.png`});throw error;}await ready(p);
  await p.waitForFunction(async()=>!(await caches.keys()).includes('ipa-keyboard-v4'));
  assert(await p.evaluate(async()=>(await caches.keys()).includes('unrelated-app-cache')),'other apps keep their caches');
  if(name==='chromium')await context.setOffline(true);else await context.addCookies([{name:'ipa_test_network_down',value:'1',url:app}]);
  await p.reload();const f=await ready(p);assert.equal(await p.title(),'IPA Keyboard v83.30 | esaKITs');await p.locator('#languageSelect').selectOption('en');await f.locator('#pulmonicConsonants [data-v83-sym="p"]').first().click();assert.equal(await p.locator('#out').inputValue(),'p');
  await p.locator('#settingsToggle').click();
  for(const key of ['andika','doulos']){await p.locator('#ipaFontChoices button[data-ipa-font="'+key+'"]').click();await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await f.waitForFunction(key=>__ipaLineAudit.fontFamily===esaIPAFonts.family(key),key);}
  assert.equal(await p.evaluate(()=>esaI18n.failed),false,'CSV works offline');assert.equal(await f.locator('.v83-ipa-key').count(),235);await p.screenshot({path:`qa-production/${name}-upgraded-offline.png`,fullPage:true});await context.close();
  console.log(`PASS UPGRADE ${name}: legacy cache-first page replaced automatically, unrelated caches retained, chart/CSV/fonts/input work with ${name==='chromium'?'browser offline mode':'server connection failure'}`);
 }
 await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});
