'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/',prefix=process.env.PUBLIC_CHECK?'public':'staged';
const baseline=process.env.OVERVIEW_BASELINE_URL;
fs.mkdirSync('qa-production',{recursive:true});
const results=[],failures=[];
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
async function reachable(l,width){assert(await l.isVisible(),'visible '+l);const r=await l.boundingBox();assert(r.x>=-.5&&r.y>=-.5&&r.x+r.width<=width+.5&&r.y+r.height<=844.5,'on screen '+JSON.stringify(r));assert(await l.evaluate(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h);}), 'actual hit '+l);return r;}
async function moveTo(p,block,grip,x,y){const b=await block.boundingBox(),r=await grip.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+x-b.x,r.y+r.height/2+y-b.y,{steps:12});await p.mouse.up();await settle(p);}
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
 if(baseline){
  const p=await browser.newPage({viewport:{width:1280,height:844},serviceWorkers:'block'});
  await p.goto(baseline);await p.waitForFunction(()=>document.getElementById('zoomMinimap')?.classList.contains('is-parent-map'));
  const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');
  await f.locator('#chartZoomDecrease').focus();await p.keyboard.press('Tab');
  assert.equal(await p.locator('#zoomMapDrag').evaluate(e=>e===document.activeElement),false,'preserved portal baseline cannot tab to overview');
  assert.equal(await f.locator('#chartZoomDecrease').evaluate(e=>e===document.activeElement),true,'reproduced focus stall at last chart control');
  console.log('REPRODUCED PORTAL TAB STALL',name,'8eabe88163a3acbde7c694268ce97640a33bd3a9');await p.close();
 }
 for(const width of[320,375,393,768,1280]){
 const p=await browser.newPage({viewport:{width,height:844},hasTouch:width<=768,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 try{
 await p.goto(app);const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await p.waitForFunction(()=>document.getElementById('zoomMinimap')?.classList.contains('is-parent-map'));await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);
 const map=p.locator('#zoomMinimap'),grip=p.locator('#zoomMapDrag'),panel=p.locator('#floatingEditor');assert.equal(await f.locator('#zoomMinimap').count(),0,'one real overview is hosted above the iframe');assert.equal(await map.count(),1);assert.equal(await map.isVisible(),false,'overview hidden in ordinary view');
 await p.waitForFunction(()=>{const i=document.querySelector('.panel-brand-logo');return i.complete&&i.naturalWidth>0;});assert.equal(await p.locator('#inputPanelTitle').textContent(),'IPA Keyboard');
 await p.locator('#out').fill('pə');await p.locator('#out').press('End');await p.locator('#out').press('x');await p.locator('#out').press('ArrowLeft');const saved=await p.locator('#out').evaluate(e=>({text:e.value,start:e.selectionStart,end:e.selectionEnd}));
 for(const locale of['ja','en','pt-BR','fa'])for(const dark of[false,true]){
 await p.locator('#languageSelect').selectOption(locale);if((await p.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))await p.locator('#contrastToggle').click();await settle(p);
 await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');if(!await map.isVisible())await p.locator('#zoomMapToggle').click();await settle(p);
 const header=await p.locator('.app-header').boundingBox();if(locale==='ja'&&!dark){const mr=await reachable(map,width);assert(mr.y>=header.y+header.height,'default overview leaves header clear');}
 const labels=await p.locator('#zoomMapCanvas .map-region').evaluateAll(es=>es.map(e=>{const s=e.querySelector('.map-label');return{text:s.textContent,font:parseFloat(getComputedStyle(e).fontSize),fits:s.scrollHeight<=e.clientHeight-2&&s.scrollWidth<=e.clientWidth-2,box:getComputedStyle(e).boxSizing,left:parseFloat(e.style.left),top:parseFloat(e.style.top),width:parseFloat(e.style.width),height:parseFloat(e.style.height)};}));
 assert.equal(labels.length,6);assert.deepEqual(await p.locator('#zoomMapCanvas .map-region').evaluateAll(es=>es.map(e=>e.dataset.region).sort()),['pulmonicConsonants','nonPulmonicConsonants','vowels','otherSymbols','suprasegmentalGroup','diacritics'].sort(),'overview represents the whole suprasegmental group once');for(const l of labels){assert(l.font>=8,'labels are larger than the former 5/7px '+JSON.stringify(l));assert(l.fits,'full translated label fits '+JSON.stringify(l));assert.equal(l.box,'border-box','borders do not enlarge projected geometry');assert(l.left>=-.01&&l.top>=-.01&&l.left+l.width<=100.01&&l.top+l.height<=100.01,'region inside canvas');}
 assert(Math.min(...labels.map(l=>l.top))<.01,'no unused title band above regions');assert(Math.max(...labels.map(l=>l.top+l.height))>99.99,'no unused trailing band');
 const outer=await map.boundingBox(),canvas=await p.locator('#zoomMapCanvas').boundingBox();assert(canvas.x-outer.x<=1.5&&outer.x+outer.width-canvas.x-canvas.width<=1.5&&outer.y+outer.height-canvas.y-canvas.height<=1.5,'canvas uses the card edges without nested gutters');
 if(locale==='ja'&&!dark){
  const last=f.locator('#chartZoomDialog button:not([disabled]):visible,#chartZoomDialog input:not([disabled]):visible,#chartZoomDialog [tabindex="0"]:visible').last();
  await last.focus();await p.keyboard.press('Tab');assert(await grip.evaluate(e=>e===document.activeElement),'Tab reaches the parent-hosted overview grip');
  await p.keyboard.press('Tab');if(await p.locator('#zoomMapDecrease').isEnabled()){assert(await p.locator('#zoomMapDecrease').evaluate(e=>e===document.activeElement),'Tab reaches enabled decrease');await p.keyboard.press('Tab');}assert(await p.locator('#zoomMapIncrease').evaluate(e=>e===document.activeElement),'Tab reaches enabled map zoom');await p.keyboard.press('Tab');assert(await p.locator('#zoomMapClose').evaluate(e=>e===document.activeElement),'Tab reaches overview close');
  await p.keyboard.press('Tab');assert(await f.locator('#zoomViewport').evaluate(e=>e===document.activeElement),'Tab returns to chart');
  await p.keyboard.press('Shift+Tab');assert(await p.locator('#zoomMapClose').evaluate(e=>e===document.activeElement),'reverse Tab reaches close');
  await p.keyboard.press('Shift+Tab');assert(await p.locator('#zoomMapIncrease').evaluate(e=>e===document.activeElement),'reverse Tab reaches map zoom');await p.keyboard.press('Shift+Tab');if(await p.locator('#zoomMapDecrease').isEnabled()){assert(await p.locator('#zoomMapDecrease').evaluate(e=>e===document.activeElement),'reverse Tab reaches enabled decrease');await p.keyboard.press('Shift+Tab');}assert(await grip.evaluate(e=>e===document.activeElement),'reverse Tab reaches grip');
  await p.keyboard.press('Shift+Tab');assert(await last.evaluate(e=>e===document.activeElement),'reverse Tab returns to last chart control');
 }
 // Enlarge the real chart, then tap each real overview region and check the
 // actual corresponding chart section is centred in the viewport.
 const vr=await f.locator('#zoomViewport').boundingBox();await p.mouse.move(vr.x+20,vr.y+400);await p.keyboard.down('Control');await p.mouse.wheel(0,-1400);await p.keyboard.up('Control');await f.waitForFunction(()=>Number(document.getElementById('chartZoomSlider').value)===4);await settle(p);
 for(const id of['pulmonicConsonants','vowels','diacritics']){
  const tile=p.locator('#zoomMapCanvas [data-region="'+id+'"]'),tr=await tile.boundingBox(),cr=await p.locator('#zoomMapCanvas').boundingBox();
  await p.evaluate(()=>document.getElementById('zoomMapCanvas').addEventListener('pointerdown',e=>{window.__mapTapPoint={x:e.clientX,y:e.clientY};},{once:true}));
  await tile.click();await settle(p);const tap=await p.evaluate(()=>window.__mapTapPoint);
  const d=await f.evaluate(id=>{const v=document.getElementById('zoomViewport'),a=v.getBoundingClientRect(),r=document.getElementById(id).getBoundingClientRect(),c=document.getElementById('chart').getBoundingClientRect(),parts=['pulmonicConsonants','nonPulmonicConsonants','vowels','otherSymbols','suprasegmentalGroup','diacritics'].map(x=>document.getElementById(x).getBoundingClientRect());return{dx:r.left+r.width/2-a.left-v.clientWidth/2,dy:r.top+r.height/2-a.top-v.clientHeight/2,chartWidth:c.width,extentHeight:Math.max(...parts.map(p=>p.bottom))-Math.min(...parts.map(p=>p.top)),scrollX:v.scrollLeft,scrollY:v.scrollTop,maxX:v.scrollWidth-v.clientWidth,maxY:v.scrollHeight-v.clientHeight};},id);
  // Account for native pointer-coordinate quantisation in this small overview;
  // the navigation error itself must still stay below 1.6 CSS pixels.
  const dx=d.dx+(tap.x-tr.x-tr.width/2)*d.chartWidth/cr.width,dy=d.dy+(tap.y-tr.y-tr.height/2)*d.extentHeight/cr.height;
  // At a real chart edge the nearest valid scroll position replaces centring;
  // this must be the exact boundary, not an arbitrary offset or empty overscroll.
  const expectedX=Math.max(0,Math.min(d.maxX,d.scrollX+dx)),expectedY=Math.max(0,Math.min(d.maxY,d.scrollY+dy));
  assert(Math.abs(d.scrollX-expectedX)<1.6&&Math.abs(d.scrollY-expectedY)<1.6,'overview accurate centre or exact chart boundary '+id+' '+JSON.stringify({dx,dy,expectedX,expectedY,d,tap}));
 }
 // User-driven placement can cover the header; its own controls remain usable.
 await moveTo(p,map,grip,8,6);const upper=await reachable(map,width);assert(upper.y<=10&&overlaps(upper,header),'overview reaches header area');await reachable(grip,width);await reachable(p.locator('#zoomMapClose'),width);
 if(locale==='ja'&&[320,393,1280].includes(width))await p.screenshot({path:`qa-production/${prefix}-map-over-header-${name}-${width}-${dark?'dark':'light'}.png`});
 await p.locator('#zoomMapClose').click();assert.equal(await map.isVisible(),false);await reachable(p.locator('#zoomMapToggle'),width);await p.locator('#zoomMapToggle').click();assert(await map.isVisible(),'closed overview reopens');
 await moveTo(p,map,grip,Math.max(8,width-outer.width-80),header.y+header.height+22);
 // Move the editor across the header and retain its branded grip, controls and edits.
 await moveTo(p,panel,p.locator('#inputPanelDrag'),8,8);const upperPanel=await reachable(panel,width);assert(upperPanel.y<=10&&overlaps(upperPanel,header),'editor reaches header area');await reachable(p.locator('#inputPanelDrag'),width);assert.equal(await p.locator('#inputPanelReset').count(),0);assert.equal(await p.locator('#inputPanelTitle').textContent(),'IPA Keyboard');assert(await p.locator('.panel-brand-logo').isVisible());
 if(locale==='ja'&&[320,393,1280].includes(width))await p.screenshot({path:`qa-production/${prefix}-editor-over-header-${name}-${width}-${dark?'dark':'light'}.png`});
 await p.locator('#inputPanelDrag').focus();await p.keyboard.press('Home');await settle(p);await reachable(p.locator('#chartZoomToggle'),width);await reachable(p.locator('#zoomMapToggle'),width);
 if(locale==='ja'&&[320,393,1280].includes(width))await p.screenshot({path:`qa-production/${prefix}-floating-overview-${name}-${width}-${dark?'dark':'light'}.png`});
 await p.locator('#chartZoomToggle').click();await p.waitForFunction(()=>document.getElementById('chartZoomToggle').getAttribute('aria-expanded')==='false');assert.equal(await map.isVisible(),false,'no orphan overview outside enlarged mode');assert.deepEqual(await p.locator('#out').evaluate(e=>({text:e.value,start:e.selectionStart,end:e.selectionEnd})),saved,'text and caret survive overview operations');assert.equal(await p.locator('.v83-label').textContent(),'v83.34');
 results.push({engine:name,width,locale,dark,labels,pass:true});console.log('PASS FLOATING OVERVIEW',name,width,locale,dark);
 }
 await p.locator('#undo').click();assert.equal(await p.locator('#out').inputValue(),'pə');await p.locator('#redo').click();assert.equal(await p.locator('#out').inputValue(),'pəx');assert.deepEqual(errors,[]);
 }catch(e){failures.push({engine:name,width,error:e.message,errors});console.error('FAIL FLOATING OVERVIEW',failures.at(-1));await p.screenshot({path:`qa-production/FAIL-floating-overview-${name}-${width}.png`});}finally{await p.close();}
 }}finally{await browser.close();}
}fs.writeFileSync('qa-production/floating-overview-results.json',JSON.stringify({results,failures},null,2));assert.deepEqual(failures,[]);})().catch(e=>{console.error(e);process.exit(1)});
