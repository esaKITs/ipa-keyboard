'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const fixture=require('./fixtures/official-vowels-2026.json'),app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';
fs.mkdirSync('qa-production',{recursive:true});const results=[],failures=[];
const sc=fixture.projection.svgTopWidth/Number(fixture.projection.topWidth),origin=fixture.projection.origin.map(Number);
const project=p=>p.map((n,i)=>fixture.projection.svgOrigin[i]+(Number(n)-origin[i])*sc);
const source=shape=>shape.flatMap(seg=>seg.slice(1).flatMap(project));
const nums=s=>[...s.matchAll(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)].map(x=>Number(x[0]));
const close=(a,b,label,tolerance=1e-9)=>{assert.equal(a.length,b.length,label+' length');a.forEach((x,i)=>assert(Math.abs(x-b[i])<tolerance,label+' '+i+' '+x+' != '+b[i]));};
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
const b=await engine.launch();for(const width of[320,375,393,768,1280]){
const p=await b.newPage({viewport:{width,height:844},hasTouch:width<600,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));try{
 await p.goto(app);const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.__ipaLineAudit?.rules?.length===7);
 const initial=await f.locator('.v83-ipa-key').evaluateAll(es=>es.map(e=>e.dataset.v83Sym));assert.equal(initial.length,235);
 for(const font of['doulos','andika']){
 await p.locator('#settingsToggle').click();await p.locator(`#ipaFontChoices button[data-ipa-font="${font}"]`).click();await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await f.waitForFunction(font=>window.__ipaLineAudit?.fontFamily===esaIPAFonts.family(font),font);await p.locator('#settingsToggle').click();
 for(const locale of['ja','en','pt-BR','fa','ja-osaka'])for(const dark of[false,true]){
 await p.locator('#languageSelect').selectOption(locale);if((await p.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))await p.locator('#contrastToggle').click();
 await f.waitForFunction(()=>window.__ipaLineAudit?.rules?.length===7);await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const state=await f.evaluate(()=>({rules:__ipaLineAudit.rules.map(r=>({id:r.id,source:r.source,visible:r.visible})),dots:[...document.querySelectorAll('.official-vowel-dot')].map(e=>({d:e.getAttribute('d'),transform:e.parentElement.getAttribute('transform'),matrix:[...['a','b','c','d','e','f'].map(k=>e.parentElement.transform.baseVal.consolidate().matrix[k])]})),anchors:[...document.querySelectorAll('.vowel-dynamic-glyph')].map(e=>({pdf:[e.dataset.pdfX,e.dataset.pdfY],xy:[+e.getAttribute('x'),+e.getAttribute('y')]})),groups:['pulmonicConsonants','nonPulmonicConsonants','otherSymbols','diacritics','suprasegmentals','tonesAndWordAccents','pitchMovements'].map(id=>{const e=document.getElementById(id);return{id,width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.getBoundingClientRect().height};}),sizes:['#pulmonicConsonants .v83-ipa-key','#nonPulmonicConsonants .v83-ipa-key','#otherSymbols td .v83-ipa-key','#diacritics .v83-ipa-key'].map(s=>getComputedStyle(document.querySelector(s)).fontSize)}));
 assert.equal(state.rules.length,7);for(const r of fixture.rules){const actual=state.rules.find(x=>x.id===r.id);assert(actual,'source PDF rule '+r.id);close(nums(actual.source),source(r.path),'source-decimal PDF projection '+r.id);assert(actual.visible.length>0);}
 assert.equal(state.dots.length,11);for(let i=0;i<11;i++){const a=state.dots[i],e=fixture.dots[i];close(nums(a.d),e.path.flatMap(seg=>seg.slice(1).flatMap(p=>p.map(Number))),'exact cubic dot '+i);close(nums(a.transform),[143.153,26.843,sc,-origin[0],-origin[1]],'source uniform transform');close(a.matrix,[sc,0,0,sc,143.153-origin[0]*sc,26.843-origin[1]*sc],'browser SVGMatrix float32 projection',0.0002);}
 for(const a of state.anchors)close(a.xy,project(a.pdf),'glyph anchor');assert(state.sizes.every(x=>x==='32px'),'audited chart ink scale matches main symbols');
 for(const g of state.groups)assert(g.scrollWidth<=g.width+1,'no translated section overflow '+JSON.stringify({font,locale,width,g}));assert.deepEqual(await f.locator('.v83-ipa-key').evaluateAll(es=>es.map(e=>e.dataset.v83Sym)),initial,'symbol inventory preserved');
 results.push({engine:name,width,font,locale,dark,rules:7,dots:11,anchors:28,maxCoordinateError:Math.max(...state.rules.flatMap(a=>{const e=fixture.rules.find(x=>x.id===a.id);return nums(a.source).map((x,i)=>Math.abs(x-source(e.path)[i]));})),pass:true});
 }
 // Actual input and editing across changed sections and vowels.
 await p.locator('#out').fill('');for(const selector of['#nonPulmonicConsonants .v83-ipa-key','#otherSymbols .v83-ipa-key','#vowels .v83-ipa-key','#diacritics .v83-ipa-key','#pitchMovements .v83-ipa-key']){const k=f.locator(selector).first(),sym=await k.getAttribute('data-v83-sym'),before=await p.locator('#out').inputValue();await k.focus();await p.keyboard.press('Space');assert((await p.locator('#out').inputValue()).length>before.length,'operable symbol '+sym);}
 const value=await p.locator('#out').inputValue();await p.locator('#undo').click();assert.notEqual(await p.locator('#out').inputValue(),value);await p.locator('#redo').click();assert.equal(await p.locator('#out').inputValue(),value);
 if([393,1280].includes(width)){await p.locator('#languageSelect').selectOption('ja');if((await p.locator('#contrastToggle').getAttribute('aria-pressed'))==='true')await p.locator('#contrastToggle').click();for(let i=0;i<25;i++)await p.locator('#inputPanelDrag').press('Shift+ArrowUp');await f.locator('#vowels').screenshot({path:`qa-production/phase2-vowels-${name}-${width}-${font}.png`});await p.locator("#inputPanelReset").click();}
 await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');for(const z of[1,2,4]){await f.locator('#chartZoomSlider').evaluate((e,z)=>{e.value=String(z);e.dispatchEvent(new Event('input',{bubbles:true}));},z);const m=await f.locator('.vowel-chart-svg').evaluate(e=>{const m=e.getScreenCTM();return{sx:Math.hypot(m.a,m.b),sy:Math.hypot(m.c,m.d)}});assert(m.sx>0&&Math.abs(m.sx-m.sy)<1e-6*m.sx,'zoom preserves SVG geometry at '+z+'×: '+JSON.stringify(m));}await p.locator('#chartZoomToggle').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS PHASE2',name,width);
}catch(e){failures.push({engine:name,width,error:e.message,stack:e.stack,errors});await p.screenshot({path:`qa-production/FAIL-phase2-${name}-${width}.png`});console.error('FAIL PHASE2',failures.at(-1));}finally{await p.close();}
}await b.close();}fs.writeFileSync('qa-production/phase2-results.json',JSON.stringify({fixture:fixture.sha256,results,failures},null,2));assert.deepEqual(failures,[]);})().catch(e=>{console.error(e);process.exit(1)});
