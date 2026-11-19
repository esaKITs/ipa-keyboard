const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('qa/seo.cjs','utf8');
const h=Function('require',source.slice(0,source.lastIndexOf('\n(async()=>{'))+'\nreturn {chromium,ready,settledChart,geometry};')(require);
const urls=['http://127.0.0.1:8772/ipa-keyboard/','http://127.0.0.1:8772/ipa-keyboard/','https://esakits.github.io/ipa-keyboard/'];
const compact=g=>({font:g.vowels.audit.fontFamily,chart:g.chart[0].rect,letters:g.vowels.letters.map(e=>({text:e.text,dy:e.dy,w:e.rect.width,h:e.rect.height}))});
(async()=>{const b=await h.chromium.launch(),results=[];
 for(let trial=0;trial<3;trial++)for(const [locale,dark] of [['ja',false],['pt-BR',true]]){
  const contexts=[],pages=[],frames=[],normal=[],expanded=[],reapplied=[],openerFocus=[];
  try{
   for(const url of urls){const c=await b.newContext({viewport:{width:393,height:844},hasTouch:true,serviceWorkers:'block'});contexts.push(c);const p=await c.newPage();pages.push(p);frames.push(await h.ready(p,url,locale,dark));}
   for(let i=0;i<3;i++){
    const p=pages[i],f=frames[i];await p.bringToFront();await h.settledChart(p,f);normal.push(compact(await h.geometry(p,f)));
    if(i===0)await pages[2].bringToFront();openerFocus.push(await p.evaluate(()=>document.hasFocus()));await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await p.bringToFront();await h.settledChart(p,f);expanded.push(compact(await h.geometry(p,f)));
    await p.locator('#settingsToggle').click();await p.locator('#ipaFontChoices button[data-ipa-font="doulos"]').click();await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await h.settledChart(p,f);await p.locator('#settingsToggle').click();await h.settledChart(p,f);reapplied.push(compact(await h.geometry(p,f)));
    if(trial===0)await p.screenshot({path:`qa-production/probe-${locale}-${i}-reapplied.png`,fullPage:true});
   }
   const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),r={trial,locale,dark,openerFocus,normal,expanded,reapplied,normalAA:same(normal[0],normal[1]),expandedAA:same(expanded[0],expanded[1]),expandedSEO:same(expanded[0],expanded[2]),reappliedAA:same(reapplied[0],reapplied[1]),reappliedSEO:same(reapplied[0],reapplied[2])};results.push(r);console.log('SVG_PROBE '+JSON.stringify(r));
  }finally{for(const c of contexts)await c.close();}
 }
 await b.close();fs.writeFileSync('qa-production/seo-font-probe-results.json',JSON.stringify(results,null,2));console.log('PROBE_SUMMARY '+JSON.stringify(results.map(({trial,locale,normalAA,expandedAA,expandedSEO,reappliedAA,reappliedSEO})=>({trial,locale,normalAA,expandedAA,expandedSEO,reappliedAA,reappliedSEO}))));
})().catch(e=>{console.error(e);process.exit(1)});
