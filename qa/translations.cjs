const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.TEST_BASE||'http://127.0.0.1:8765/';fs.mkdirSync('qa-production',{recursive:true});
async function chart(p){await p.frameLocator('#v83ChartFrame').locator('.v83-ipa-key').first().waitFor();const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof window.esaSetLocale==='function');return f;}
(async()=>{for(const[name,type]of Object.entries({chromium,webkit})){
 const b=await type.launch({headless:true});
 for(const width of [320,390,1280]){
  const p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},hasTouch:true});
  const errors=[];p.on('pageerror',e=>errors.push(String(e)));let downloads=0;p.on('request',r=>{if(r.url().split('?')[0].endsWith('/translations.csv'))downloads++;});
  await p.goto(base+'ipa-keyboard/');const f=await chart(p);await p.evaluate(()=>esaI18n.ready);
  assert(await f.evaluate(()=>esaI18n===parent.esaI18n),'chart and panel share one catalog object');
  assert.equal(await p.evaluate(async()=>{await esaI18n.ready;return new Set(['ui','chart','panel'].flatMap(s=>esaI18n.rows(s).map(r=>r.ja))).size;}),203);
  await f.waitForFunction(()=>[...document.querySelectorAll('.vowel-dynamic-glyph')].every(e=>e.style.fontSize==='32px'));
  const glyphs=()=>[...document.querySelectorAll('.vowel-dynamic-glyph')].map(e=>[e.dataset.v83Sym,e.textContent,e.getAttribute('x'),e.getAttribute('y'),e.style.fontSize]);const originalGlyphs=await f.evaluate(glyphs);
  for(const locale of ['ja','en','pt-BR','fa','ja-osaka','en','ja']){
await p.locator('#languageSelect').selectOption(locale);
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   // Check concrete translations against the master, rather than accepting old translation defects.
   const bindings=await f.evaluate(()=>[...document.querySelectorAll('[data-i18n-key],[data-i18n-template]')].map(e=>({key:e.dataset.i18nKey||e.dataset.i18nTemplate,text:e.textContent,template:e.hasAttribute('data-i18n-template')})));
   if(!locale.startsWith('ja')){
    for(const row of bindings){if(!row.template){const expected=await p.evaluate(({key,locale})=>esaI18n.t(key,locale,'chart'),{key:row.key,locale});assert.equal(row.text.trim(),expected.trim(),'bound label '+row.key);}}
    const leftovers=await f.evaluate(()=>{const roots=[document.querySelector('#chart'),...document.querySelectorAll('.source-note'),document.querySelector('.chart-tool-row')];return roots.flatMap(root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode()){const n=w.currentNode;if(!n.parentElement.closest('script,style')&&/[\u3040-\u30ff\u4e00-\u9fff]/.test(n.nodeValue))a.push(n.nodeValue);}return a;});});
    assert.deepEqual(leftovers,[],'all chart prose translates, with no Japanese or partial-word remnants');
    assert(!/[\u3040-\u30ff\u4e00-\u9fff]/.test(await p.locator('.v83-label').textContent()));
   }
   assert.equal(await f.locator('.v83-ipa-key').count(),235,'all IPA targets survive locale changes');
   assert.equal(await f.locator('#diacriticsNote .v83-ipa-key').count(),1,'one real diacritic example remains');
   assert.equal(await p.locator('.dia-label').isVisible(),false,'redundant label cannot overflow beside icons');
   const expected=await p.evaluate(lang=>['IPA入力','入力パネルを移動。矢印キーでも移動できます','入力パネルの位置を戻す','白黒反転'].map(key=>esaI18n.t(key,lang,'panel')),locale);
   const actual=await p.evaluate(()=>['floatingEditor','inputPanelDrag','inputPanelReset','contrastToggle'].map(id=>document.getElementById(id).getAttribute('aria-label')));
   assert.deepEqual(actual,expected,'formerly overridden panel accessibility labels use the shared master in every language');
   assert.equal(await p.locator('#inputPanelReset').getAttribute('title'),expected[2]);assert.equal(await p.locator('#contrastToggle').getAttribute('title'),expected[3]);
   const axisKeys=['前舌','中舌','後舌','狭','半狭','半広','広'];
   const expectedAxes=await p.evaluate(({keys,lang})=>keys.map(k=>esaI18n.t(k,lang,'chart')),{keys:axisKeys,lang:locale});assert.deepEqual(await f.locator('.vowel-measured-label').allTextContents(),expectedAxes,'all seven vowel axes translate and restore');
   const noteKey='記号が対になっている場合、右側の記号が円唇母音を表す。';const expectedNote=await p.evaluate(({key,lang})=>esaI18n.t(key,lang,'chart'),{key:noteKey,lang:locale});
   assert.equal((await f.locator('.vowel-note').textContent()).replace(/\s+/g,' ').trim(),expectedNote.replace(/\s+/g,' ').trim());assert.equal(await f.locator('.vowel-note').getAttribute('aria-label'),expectedNote);
   assert.deepEqual(await f.evaluate(glyphs),originalGlyphs,'IPA symbols, font sizes and source positions remain unchanged');
   const boxes=await f.evaluate(()=>{const svg=document.querySelector('#vowelQuadrilateral svg').getBoundingClientRect();return[...document.querySelectorAll('.vowel-measured-label,.vowel-note')].map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,left:r.left-svg.left,right:r.right-svg.right};});});
   assert(boxes.every(r=>r.left>=-.5&&r.right<=.5),'translated vowel labels fit inside the SVG: '+JSON.stringify(boxes));
   for(const pos of ['above','below']){const btn=p.locator('#diaPosition [data-pos="'+pos+'"]');assert.equal(await btn.locator('svg.placement-icon').count(),1);assert.equal((await btn.textContent()).trim(),'');assert.equal(await btn.getAttribute('aria-label'),await p.evaluate(({key,lang})=>esaI18n.t(key,lang),{key:pos==='above'?'次の補助記号だけ上':'次の補助記号だけ下',lang:locale}));}
  }
  assert.equal(downloads,1,'one CSV download per app load, including all language switches');assert.deepEqual(errors,[]);
  await p.locator('#languageSelect').selectOption('fa');await p.screenshot({path:`qa-production/${name}-${width}-shared-persian.png`});
  await p.locator('#languageSelect').selectOption('en');await p.screenshot({path:`qa-production/${name}-${width}-english.png`,fullPage:true});
  for(const[pos,mark]of [['above','\u030a'],['below','\u0325']]){
   await p.locator('#out').fill('a');await p.locator('#out').press('End');await p.locator('#diaPosition [data-pos="'+pos+'"] svg').click();assert.equal(await p.locator('#diaPosition [data-pos="'+pos+'"]').getAttribute('aria-pressed'),'true');assert((await p.locator('#status').textContent()).includes(pos));
   await f.locator('#diacritics [data-v83-sym="\u0325"]').first().click();assert.equal((await p.locator('#out').inputValue()).normalize('NFD'),'a'+mark);assert.equal(await p.locator('#diaPosition [data-pos="auto"]').getAttribute('aria-pressed'),'true','placement choice is consumed by one diacritic');
  }
  await f.locator('#chartZoomOpen').evaluate(e=>e.click());await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await f.locator('#zoomRange').fill('300');assert.equal(await f.locator('#zoomMapToggle').textContent(),'Hide overview');await f.locator('#zoomMapToggle').click();assert.equal(await f.locator('#zoomMapToggle').textContent(),'Show overview');await f.locator('#zoomMapToggle').click();assert(!/[\u3040-\u30ff\u4e00-\u9fff]/.test(await f.locator('#zoomMapCanvas').textContent()));await p.locator('#languageSelect').selectOption('fa');await p.waitForTimeout(100);assert.equal(await f.locator('#chart').getAttribute('data-feedback-scale'),'3','changing vowel labels in enlarged view preserves glow scale');
  await f.locator('#vowelQuadrilateral').scrollIntoViewIfNeeded();await p.screenshot({path:`qa-production/${name}-${width}-vowel-fa-zoom.png`});await f.locator('#zoomClose').click();await p.locator('#contrastToggle').evaluate(e=>e.click());await p.screenshot({path:`qa-production/${name}-${width}-placement-icons-dark.png`});
  await p.close();console.log(`PASS TRANSLATIONS ${name} ${width}: 203 shared entries, complete labels in all 5 languages, UI and chart share a single CSV fetch`);
 }
 // Changing only the CSV must update both surfaces, including escaped commas, quotes and line breaks.
 const p=await b.newPage({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 const csv=fs.readFileSync('translations.csv','utf8');let release;const gate=new Promise(r=>release=r);
 await p.route('**/translations.csv',async route=>{await gate;await route.fulfill({contentType:'text/csv; charset=utf-8',body:csv.replace('"Glow strength"','"CSV, ""quoted""\nGlow"').replace('"VOWELS"','"CSV VOWELS"')});});
 await p.goto(base+'ipa-keyboard/',{waitUntil:'domcontentloaded'});await p.locator('#languageSelect').selectOption('en');release();const f=await chart(p);await p.evaluate(()=>esaI18n.ready);
 await p.waitForFunction(()=>document.querySelector('.glow-setting-row .setting-label').textContent==='CSV, "quoted"\nGlow');
 assert((await f.locator('#vowels h2').textContent()).includes('CSV VOWELS'));assert.deepEqual(errors,[]);await p.close();
 const missing=await b.newPage({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});const missingErrors=[];missing.on('pageerror',e=>missingErrors.push(String(e)));
 await missing.route('**/translations.csv',r=>r.abort());await missing.goto(base+'ipa-keyboard/');const mf=await chart(missing);assert(await missing.evaluate(()=>esaI18n.failed));assert(await missing.locator('#languageSelect').isDisabled());
 await mf.locator('.v83-ipa-key').first().click();assert.equal(await missing.locator('#out').inputValue(),'p','missing translation file does not stop IPA input');assert.deepEqual(missingErrors,[]);await missing.close();
 const direct=await b.newPage({serviceWorkers:'block'});await direct.goto(base+'ipa-keyboard/chart.html');await direct.waitForFunction(()=>typeof esaSetLocale==='function');await direct.evaluate(()=>esaSetLocale('en'));assert((await direct.locator('#vowels h2').textContent()).includes('VOWELS'));await direct.close();
 console.log(`PASS CATALOG ${name}: CSV edits update both surfaces, slow-load language selection, escaped CSV fields, Japanese fallback on download failure, standalone chart`);await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});
