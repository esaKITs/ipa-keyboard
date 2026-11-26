'use strict';
const PREFIX='esakits-ipa-keyboard-';
const CACHE=PREFIX+'v83.34';
const LEGACY='ipa-keyboard-v4';
const CORE=['./','./index.html','./chart.html','./apple-touch-icon.png','./i18n.js','./ipa-fonts.js','./editor-gestures.js','./diacritic-display.js','./language-picker.js','./fonts/positioned-diacritics.json','./fonts/Andika-Regular.woff2','./translations.csv','./CREDITS.md','./LICENSE-MIT.txt','./fonts/OFL-Andika.txt','./fonts/DoulosSIL-Regular.woff2','./fonts/NotoSansJP-Regular.woff2','./fonts/NotoSansJP-Bold.woff2','./fonts/OFL-DoulosSIL.txt','./fonts/OFL-NotoSansJP.txt'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 const old=keys.filter(key=>key===LEGACY||(key.startsWith(PREFIX)&&key!==CACHE));
 await Promise.all(old.map(key=>caches.delete(key)));
 await self.clients.claim();
 // An existing cache-first worker may have delivered the old page for this visit.
 // Reload only this app's open windows after that worker has been replaced.
 if(old.length){
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  // Navigation waits for activation; do not make activation wait for navigation.
  for(const client of clients.filter(client=>client.url.startsWith(self.registration.scope)))client.navigate(client.url).catch(()=>null);
 }
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);
   if(response.ok)await cache.put(request,response.clone());
   return response;
  }catch(error){
   const cached=await cache.match(request);
   if(cached)return cached;
   // Only navigations fall back to the entry page; CSV/fonts never receive HTML.
   if(request.mode==='navigate'&&url.pathname===new URL(self.registration.scope).pathname)return cache.match('./index.html');
   throw error;
  }
 })());
});
