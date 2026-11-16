const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';fs.mkdirSync('qa-production',{recursive:true});
const coverage=JSON.parse(fs.readFileSync('fonts/ipa-font-coverage.json','utf8'));
async function frame(p){const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.__ipaLineAudit?.fontFamily);return f;}
async function ready(p,f,key){await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await f.waitForFunction(key=>window.__ipaLineAudit?.fontFamily===esaIPAFonts.family(key),key);}
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});
 for(const width of[320,390,1280]){
  const p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(app);const f=await frame(p);await ready(p,f,'doulos');
  const options=await p.evaluate(()=>esaIPAFonts.options.map(o=>({key:o.key,family:o.family})));
  const glyphs=()=>[...document.querySelectorAll('.vowel-dynamic-glyph')].map(e=>[e.dataset.v83Sym,e.dataset.pdfX,e.dataset.pdfY,e.getAttribute('x'),e.getAttribute('y')]);
  const anchors=await f.evaluate(glyphs),rules=await f.evaluate(()=>__ipaLineAudit.rules.map(r=>r.source));
  const symbols=await f.locator('.v83-ipa-key').evaluateAll(elements=>elements.map(e=>e.dataset.v83Sym));
  for(const {key}of options){const missing=[...new Set(symbols.join(''))].filter(ch=>!(/\s/u.test(ch))&&!coverage[key].some(([a,b])=>ch.codePointAt(0)>=a&&ch.codePointAt(0)<=b));assert.deepEqual(missing,[],key+' covers every input symbol');}
  await p.locator('#settingsToggle').click();
  for(const{key,family}of options){
   await p.locator('#out').fill('ˈpʰãŋ̊');await p.locator('[data-ipa-font="'+key+'"]').click();await ready(p,f,key);
   assert((await p.locator('#out').evaluate(e=>getComputedStyle(e).fontFamily)).includes(family),'common output font');
   const styles=await f.locator('.v83-ipa-key').evaluateAll(a=>a.map(e=>getComputedStyle(e).fontFamily));assert(styles.every(value=>value.includes(family)),'all 235 IPA targets share the chosen font');
   assert.equal(await p.locator('#out').inputValue(),'ˈpʰãŋ̊','changing font preserves Unicode input');assert.deepEqual(await f.evaluate(glyphs),anchors,'PDF anchor coordinates remain fixed');assert.deepEqual(await f.evaluate(()=>__ipaLineAudit.rules.map(r=>r.source)),rules,'base trapezoid and rule geometry remain fixed');
   assert(await f.locator('.vowel-dynamic-glyph').evaluateAll(a=>a.every(e=>{const b=e.getBBox();return b.width>0&&b.height>0&&parseFloat(e.style.fontSize)===32;})),'every vowel renders at the existing size');
   const vowel=f.locator('#vowelQuadrilateral [data-v83-sym="ə"]').first();await vowel.dispatchEvent('pointerdown',{pointerType:'touch',button:0});assert((await f.locator('#v831SymbolPopup .preview-symbol').evaluate(e=>getComputedStyle(e).fontFamily)).includes(family),'popup shares font');await vowel.dispatchEvent('pointercancel',{pointerType:'touch'});
   if(width===390)await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${key}-common-font.png`,fullPage:true});
  }
  await p.locator('[data-ipa-font="andika"]').click();await ready(p,f,'andika');await p.reload();const f2=await frame(p);await ready(p,f2,'andika');assert.equal(await p.locator('#ipaFontSelect').inputValue(),'andika','font selection persists');assert((await p.locator('#out').evaluate(e=>getComputedStyle(e).fontFamily)).includes('Andika Local'));assert((await p.locator('.app-header .title').evaluate(e=>getComputedStyle(e).fontFamily)).startsWith('Arial'),'IPA font does not change UI title');assert.deepEqual(errors,[]);await p.close();
  console.log(`PASS FONTS ${name} ${width}: 2 common fonts, full symbol coverage, 28 fixed vowel anchors and base rules, popup/output synchronisation, unchanged Unicode and saved selection`);
 }
 const p=await b.newPage({serviceWorkers:'block'});await p.route('**/fonts/Andika-Regular.woff2',route=>route.abort());await p.goto(app);const f=await frame(p);await ready(p,f,'doulos');await p.locator('#languageSelect').selectOption('en');await p.locator('#settingsToggle').click();await p.locator('[data-ipa-font="andika"]').click();await ready(p,f,'doulos');assert.equal(await p.locator('#ipaFontSelect').inputValue(),'doulos');await p.waitForFunction(()=>document.getElementById('toast').textContent==='The font could not be loaded. The default font has been restored.');await p.close();console.log(`PASS FONT FALLBACK ${name}: failed webfont returns to working default with a translated panel notice`);await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});
