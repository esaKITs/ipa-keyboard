'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';
fs.mkdirSync('qa-production',{recursive:true});
(async()=>{const results=[];for(const[name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch(),context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto(app+'__upgrade-fixture');
  await page.evaluate(async app=>{await fetch(app+'__cache-probe-state?rev=old');await navigator.serviceWorker.register(app+'sw.js?network-first=1',{scope:app,updateViaCache:'none'});await navigator.serviceWorker.ready;},app);
  await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('?network-first=1'));
  const old=await page.evaluate(async app=>(await fetch(app+'chart.html')).text(),app);assert(old.includes('old-http-chart'),'old chart warmed');
  await page.evaluate(async app=>{await fetch(app+'__cache-probe-state?rev=new');await(await caches.open('unrelated-app-cache')).put(app+'marker',new Response('keep'));},app);
  const stale=await page.evaluate(async app=>(await fetch(app+'chart.html')).text(),app);
  const reproduced=stale.includes('old-http-chart');
  await page.evaluate(async app=>{await navigator.serviceWorker.register(app+'sw.js?cache-fix=1',{scope:app,updateViaCache:'none'});},app);
  await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('?cache-fix=1'));
  const fresh=await page.evaluate(async app=>(await fetch(app+'chart.html')).text(),app);
  assert(fresh.includes('mapManuallyPlaced')&&!fresh.includes('old-http-chart'),'network fetch uses current chart');
  const cached=await page.evaluate(async app=>{const r=await(await caches.open('esakits-ipa-keyboard-v83.34')).match(app+'chart.html');return r.text();},app);
  assert(cached.includes('mapManuallyPlaced'),'installation replaces stale CORE chart');
  assert(await page.evaluate(async()=>(await caches.keys()).includes('unrelated-app-cache')),'unrelated cache retained');
  if(name==='chromium')await context.setOffline(true);else await context.addCookies([{name:'ipa_test_network_down',value:'1',url:app}]);
  const offline=await page.evaluate(async app=>(await fetch(app+'chart.html')).text(),app);assert(offline.includes('mapManuallyPlaced'),'updated offline fallback retained');
  results.push({engine:name,reproducedOldHttpCache:reproduced,updatedNetwork:true,updatedInstallCache:true,updatedOfflineFallback:true,unrelatedCacheRetained:true,pass:true});console.log('PASS CACHE REFRESH',JSON.stringify(results.at(-1)));
 }finally{await context.setOffline(false);await context.clearCookies();await page.evaluate(async app=>{await fetch(app+'__cache-probe-state?rev=clear');},app).catch(()=>{});await context.close();await browser.close();}
}fs.writeFileSync('qa-production/cache-refresh-results.json',JSON.stringify({results},null,2));})().catch(e=>{console.error(e);process.exit(1)});
