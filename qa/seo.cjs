const {chromium,webkit,request}=require('playwright');
const {PNG}=require('pngjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';
const reference='http://127.0.0.1:8772/ipa-keyboard/';
const prefix=process.env.PUBLIC_CHECK?'public':'staged';
const title='Free Online IPA Keyboard – Interactive IPA Chart | esaKITs';
const canonical='https://esakits.github.io/ipa-keyboard/';
fs.mkdirSync('qa-production',{recursive:true});
async function settle(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));}
async function settledChart(p,f){
 await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');
 await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);
 await f.waitForFunction(()=>window.__ipaLineAudit?.fontFamily===esaIPAFonts.family(document.documentElement.dataset.ipaFont));
 // A locale/font/layout notification can follow the first ready flag. Observe
 // the actual SVG and frame geometry, without changing styles or the clock.
 await f.waitForFunction(async()=>{
  const sample=()=>JSON.stringify({svg:document.querySelector('#vowelQuadrilateral svg').outerHTML,audit:window.__ipaLineAudit,chart:document.getElementById('chart').getBoundingClientRect().toJSON(),frame:frameElement.getBoundingClientRect().toJSON(),viewport:document.getElementById('zoomViewport').getBoundingClientRect().toJSON(),fonts:document.fonts.status});
  let last=sample(),stable=0;
  while(stable<8){await new Promise(requestAnimationFrame);const now=sample();stable=now===last?stable+1:0;last=now;}
  return true;
 },null,{timeout:15000});
}
async function ready(p,url,locale,dark){
 const response=await p.goto(url);assert.equal(response.status(),200);assert(!/noindex/i.test(response.headers()['x-robots-tag']||''));
 await p.waitForFunction(()=>document.getElementById('zoomMapToggle')&&!document.getElementById('chartZoomToggle').disabled);
 const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();
 await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);await f.waitForFunction(()=>window.__ipaLineAudit?.fontFamily);
 await p.locator('#languageSelect').selectOption(locale);await f.waitForFunction(l=>document.documentElement.lang===l,locale);
 if(dark)await p.locator('#contrastToggle').click();await settledChart(p,f);await settle(p);await settle(f);return f;
}
async function metadata(p){
 assert.equal(await p.title(),title);
 for(const [selector,attr,value]of[['meta[name="description"]','content',null],['link[rel="canonical"]','href',canonical],['meta[property="og:title"]','content',title],['meta[property="og:url"]','content',canonical],['meta[property="og:type"]','content','website'],['meta[name="twitter:card"]','content','summary']]){
  const l=p.locator(selector);assert.equal(await l.count(),1,selector);const v=await l.getAttribute(attr);assert(v);if(value!==null)assert.equal(v,value);else assert(v.includes('International Phonetic Alphabet'));
 }
 const l=p.locator('script[type="application/ld+json"]');assert.equal(await l.count(),1);const s=JSON.parse(await l.textContent());assert.equal(s['@type'],'WebApplication');assert.deepEqual(s.inLanguage,['ja','en','pt-BR','fa']);assert.equal(s.offers.price,0);assert.equal(s.url,canonical);assert.equal(await p.locator('.v83-label').textContent(),'v83.34');
}
async function geometry(p,f){
 const collect=(doc,selectors)=>selectors.map(s=>{const e=doc.querySelector(s);if(!e)return{s,missing:true};const r=e.getBoundingClientRect(),c=getComputedStyle(e);return{s,rect:[r.x,r.y,r.width,r.height],display:c.display,color:c.color,background:c.backgroundColor,shadow:c.boxShadow,font:c.font,transform:c.transform,visibility:c.visibility};});
 const script=collect.toString();
 return{root:await p.evaluate(s=>eval('('+s+')')(document,['.app-header','.title','.v83-label','#languageSelect','#zoomMapToggle','#chartZoomToggle','#v83ChartFrame','#floatingEditor','#out','#contrastToggle']),script),chart:await f.evaluate(s=>eval('('+s+')')(document,['#chart','#pulmonicConsonants','#vowels','#vowelQuadrilateral','#zoomViewport','#zoomMinimap','#v831SymbolPopup','.v83-purple-flash']),script),vowels:await f.evaluate(()=>({audit:window.__ipaLineAudit,letters:[...document.querySelectorAll('#vowelQuadrilateral .vowel-dynamic-glyph,#vowelQuadrilateral .vowel-measured-label')].map(e=>({text:e.textContent,x:e.getAttribute('x'),y:e.getAttribute('y'),dx:e.getAttribute('dx'),dy:e.getAttribute('dy'),rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,baseline:getComputedStyle(e).dominantBaseline}))}))};
}
async function compare(pages,frames,label,state){
 const snapshots=[];
 for(let i=0;i<2;i++){
  const p=pages[i],f=frames[i];await p.bringToFront();await p.waitForFunction(()=>document.hasFocus());await settledChart(p,f);
  if(state==='held'){await f.locator('#vowels .v83-ipa-key').first().focus();await p.keyboard.down('Space');await f.locator('.v83-purple-flash').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));}
  await settle(p);await settle(f);snapshots.push({focused:await p.evaluate(()=>document.hasFocus()),layout:await geometry(p,f),image:await p.screenshot({path:`qa-production/${prefix}-seo-${label}-${state}-${i?'after':'before'}.png`,fullPage:true,caret:'hide'})});
  if(state==='held'){await p.keyboard.up('Space');await p.waitForTimeout(360);}
 }
 if(JSON.stringify(snapshots[1].layout)!==JSON.stringify(snapshots[0].layout))fs.writeFileSync(`qa-production/${prefix}-seo-${label}-${state}-metrics.json`,JSON.stringify(snapshots.map(s=>({focused:s.focused,layout:s.layout})),null,2));
 assert.deepEqual(snapshots[1].layout,snapshots[0].layout,label+' '+state+' geometry/styles/SVG glyph coordinates');
 const a=PNG.sync.read(snapshots[0].image),b=PNG.sync.read(snapshots[1].image);assert.equal(b.width,a.width);assert.equal(b.height,a.height);
 let changed=0;for(let i=0;i<a.data.length;i+=4)if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3])changed++;
 if(changed)fs.writeFileSync(`qa-production/${prefix}-seo-${label}-${state}-metrics.json`,JSON.stringify(snapshots.map(s=>({focused:s.focused,layout:s.layout})),null,2));
 assert.equal(changed,0,label+' '+state+' exact pixels');return{state,width:a.width,height:a.height,changedPixels:changed};
}
async function functional(p,f,name){
 await p.bringToFront();await p.waitForFunction(()=>document.hasFocus());const out=p.locator('#out');await out.fill('ab');await out.press('End');await out.press('c');await p.locator('#undo').click();assert.equal(await out.inputValue(),'ab');await p.locator('#redo').click();assert.equal(await out.inputValue(),'abc');
 await out.press('End');assert.equal(await out.evaluate(e=>e.selectionStart),3,'explicit end position after focusing the textarea');await out.press('ArrowLeft');assert.equal(await out.evaluate(e=>e.selectionStart),2,'native cursor movement');await out.press('X');assert.equal(await out.inputValue(),'abXc');assert.equal(await out.evaluate(e=>e.selectionStart),3);
 const symbols=[];
 for(const id of['pulmonicConsonants','vowels','diacritics','suprasegmentals']){const key=f.locator('#'+id+' .v83-ipa-key').first(),sym=await key.getAttribute('data-v83-sym'),before=await out.inputValue();await out.press('End');await key.focus();await p.keyboard.press('Space');await p.waitForTimeout(340);assert.equal(await out.inputValue(),before+sym);symbols.push(sym);}
 // Use the actual system clipboard and native paste; no Clipboard API mocks.
 const copied=await out.inputValue();await p.locator('#copy').click();await p.waitForTimeout(120);await out.fill('');await out.focus();await p.keyboard.press('Control+V');await p.waitForFunction(v=>document.getElementById('out').value===v,copied,{timeout:5000});assert.equal(await out.inputValue(),copied);
 return{symbols,clipboard:'native copy/paste PASS',editing:'PASS',engine:name};
}
(async()=>{
 const results=[],failures=[],functionalResults=[];
 for(const[name,engine]of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  for(const width of[320,375,393,768,1280])for(const locale of['ja','en','pt-BR','fa'])for(const dark of[false,true]){
   const label=`${name}-${width}-${locale}-${dark?'dark':'light'}`,contexts=[],pages=[],frames=[],errors=[];
   try{
    for(const url of[reference,app]){const c=await browser.newContext({viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'});contexts.push(c);const p=await c.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));frames.push(await ready(p,url,locale,dark));}
    await metadata(pages[1]);const comparisons=[];
    comparisons.push(await compare(pages,frames,label,'normal'));
    for(let i=0;i<2;i++){await pages[i].locator('#chartZoomToggle').click();await frames[i].waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');}
    comparisons.push(await compare(pages,frames,label,'expanded'));
    comparisons.push(await compare(pages,frames,label,'held'));
    comparisons.push(await compare(pages,frames,label,'released'));
    for(let i=0;i<2;i++)await pages[i].locator('#chartZoomToggle').click();
    assert.equal(await pages[1].title(),title,'language switching/viewer must not overwrite SEO title');
    if(width===393&&locale==='ja'&&!dark){const before=await functional(pages[0],frames[0],name),after=await functional(pages[1],frames[1],name);assert.deepEqual(after,before,'same native editing/copy behavior on immutable baseline and candidate');functionalResults.push({before,after});}
    assert.deepEqual(errors,[]);results.push({engine:name,width,locale,dark,comparisons,errors});console.log('PASS SEO VISUAL',label,'four states, zero changed pixels');
   }catch(e){failures.push({label,error:e.message,stack:e.stack,errors});console.error('FAIL SEO',JSON.stringify(failures.at(-1)));}
   finally{for(const c of contexts)await c.close();}
  }
  await browser.close();
 }
 const http=await request.newContext();const s=await http.get(new URL('sitemap.xml',app).href);assert.equal(s.status(),200);const xml=await s.text();assert.equal((xml.match(/<loc>/g)||[]).length,1);assert(xml.includes('<loc>'+canonical+'</loc>'));await http.dispose();
 fs.writeFileSync('qa-production/seo-results.json',JSON.stringify({app,reference,results,functionalResults,failures},null,2));assert.deepEqual(failures,[]);assert.equal(results.length,80);assert.equal(functionalResults.length,2);
})().catch(e=>{console.error(e);process.exit(1)});
