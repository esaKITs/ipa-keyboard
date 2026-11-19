const fs=require('node:fs');
const source=fs.readFileSync('qa/seo.cjs','utf8');
const h=Function('require',source.slice(0,source.lastIndexOf('\n(async()=>{'))+'\nreturn {chromium,ready,settledChart,geometry,compare};')(require);
const base='http://127.0.0.1:8772/ipa-keyboard/',app='https://esakits.github.io/ipa-keyboard/';
(async()=>{const browser=await h.chromium.launch(),results=[];
 for(let trial=0;trial<6;trial++)for(const [locale,dark] of [['ja',false],['pt-BR',true]])for(const kind of ['AA','SEO']){
  const contexts=[],pages=[],frames=[],label=`probe-${kind}-${trial}-${locale}`,r={trial,locale,dark,kind};
  try{
   for(const url of [base,kind==='AA'?base:app]){const c=await browser.newContext({viewport:{width:393,height:844},hasTouch:true,serviceWorkers:'block'});contexts.push(c);const p=await c.newPage();pages.push(p);frames.push(await h.ready(p,url,locale,dark));}
   try{await h.compare(pages,frames,label,'normal');r.normal=true;}catch(e){r.normal=e.message.slice(0,160);}
   for(let i=0;i<2;i++){await pages[i].locator('#chartZoomToggle').click();await frames[i].waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');}
   try{await h.compare(pages,frames,label,'expanded');r.expanded=true;}catch(e){r.expanded=e.message.slice(0,160);}
   r.before=[];r.after=[];
   for(let i=0;i<2;i++){
    const p=pages[i],f=frames[i];await p.bringToFront();r.before.push((await h.geometry(p,f)).vowels.letters.find(x=>x.text==='i').dy);
    await p.locator('#settingsToggle').click();await p.locator('#ipaFontChoices button[data-ipa-font="doulos"]').click();await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await h.settledChart(p,f);await p.locator('#settingsToggle').click();await h.settledChart(p,f);r.after.push((await h.geometry(p,f)).vowels.letters.find(x=>x.text==='i').dy);
   }
   try{await h.compare(pages,frames,label,'expanded-font-confirmed');r.confirmed=true;}catch(e){r.confirmed=e.message.slice(0,160);}
   results.push(r);console.log('SVG_CONTROL '+JSON.stringify(r));
  }finally{for(const c of contexts)await c.close();}
 }
 await browser.close();fs.writeFileSync('qa-production/seo-font-probe-results.json',JSON.stringify(results,null,2));console.log('PROBE_SUMMARY '+JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
