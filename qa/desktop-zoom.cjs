'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';
const baseline=process.env.ZOOM_BASELINE_URL;
fs.mkdirSync('qa-production',{recursive:true});
const results=[];
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const scale=f=>f.locator('#chart').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
async function open(p,url,width=1280,touch=false){
 await p.setViewportSize({width,height:844});await p.goto(url);
 const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();
 await f.waitForFunction(()=>typeof esaSetLocale==='function');await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);
 await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await settle(p);
 if(await p.locator('#zoomMinimap').isVisible())await p.locator('#zoomMapClose').click();return f;
}
async function point(p,f){const r=await f.locator('#zoomViewport').boundingBox();await p.mouse.move(r.x+r.width*.42,r.y+180);return f.evaluate(()=>{const v=document.getElementById('zoomViewport'),r=v.getBoundingClientRect(),c=document.getElementById('chart').getBoundingClientRect(),s=new DOMMatrix(getComputedStyle(document.getElementById('chart')).transform).a;const x=r.left+v.clientWidth*.42,y=r.top+180;return {x,y,cx:(x-c.left)/s,cy:(y-c.top)/s};});}
async function drift(f,a){return f.evaluate(a=>{const c=document.getElementById('chart'),r=c.getBoundingClientRect(),s=new DOMMatrix(getComputedStyle(c).transform).a;return {dx:r.left+a.cx*s-a.x,dy:r.top+a.cy*s-a.y};},a);}
async function anchored(f,a,label){const d=await drift(f,a);assert(Math.abs(d.dx)<1.6&&Math.abs(d.dy)<1.6,label+' anchor drift '+JSON.stringify(d));return d;}
async function gesture(f,type,value){return f.locator('#zoomViewport').evaluate((v,{type,value})=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'scale',{value});v.dispatchEvent(e);return e.defaultPrevented;},{type,value});}
async function nativeWheel(p,delta){const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame(),old=await scale(f);await p.keyboard.down('Control');await p.mouse.wheel(0,delta);await p.keyboard.up('Control');await f.waitForFunction(old=>new DOMMatrix(getComputedStyle(document.getElementById('chart')).transform).a!==old,old);await settle(p);}
async function hit(l){assert(await l.isVisible(),'visible '+l);assert(await l.evaluate(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===h||e.contains(h);}), 'uncovered '+l);}
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{for(const [name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch();
 try{
 if(baseline){
  const p=await b.newPage({viewport:{width:1280,height:844},serviceWorkers:'block'}),f=await open(p,baseline);await point(p,f);const initial=await scale(f);
  await f.locator('#zoomViewport').focus();await p.keyboard.press('Control+=');await settle(p);const key=await scale(f);
  await gesture(f,'gesturestart',1);await gesture(f,'gesturechange',1.5);await gesture(f,'gestureend',1.5);const pinch=await scale(f);
  const a=await point(p,f);await nativeWheel(p,-120);const wheel=await scale(f);const offset=await drift(f,a);assert(Math.abs(offset.dx)>10,'baseline reproduces pointer anchor clamping at entry scale');
  assert.equal(key,initial,'baseline reproduces missing Ctrl +/- handler');assert.equal(pinch,initial,'baseline reproduces missing desktop GestureEvent handler');assert(wheel>initial,'existing Ctrl wheel path actually works');
  results.push({name,baseline:{initial,key,pinch,wheel,offset}});console.log('REPRODUCED BASELINE',name,{initial,key,pinch,wheel,offset});fs.writeFileSync('qa-production/desktop-zoom-results.json',JSON.stringify(results,null,2));await p.screenshot({path:`qa-production/${name}-desktop-zoom-before.png`});await p.close();
 }
 for(const width of [768,1280]){
 const p=await b.newPage({viewport:{width,height:844},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 try{
 let f=await open(p,app,width);await p.locator('#chartZoomToggle').click();await p.locator('#out').fill('abc');await p.locator('#out').press('ArrowLeft');
 const saved=await p.locator('#out').evaluate(e=>({text:e.value,start:e.selectionStart,end:e.selectionEnd}));
 for(const lang of ['ja','en','pt-BR','fa'])for(const dark of [false,true]){
 await p.locator('#languageSelect').selectOption(lang);if((await p.locator('html').getAttribute('data-inverse'))!==String(dark))await p.locator('#contrastToggle').click();
 const oldScroll=await p.evaluate(()=>({x:scrollX,y:scrollY}));await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await settle(p);
 if(await p.locator('#zoomMinimap').isVisible())await p.locator('#zoomMapClose').click();
 const rail=f.locator('#chartZoomControls'),slider=f.locator('#chartZoomSlider');await hit(rail);await hit(slider);assert.equal(await slider.getAttribute('max'),'4');
 const rb=await rail.boundingBox(),vb=await f.locator('#zoomViewport').boundingBox(),pb=await p.locator('#floatingEditor').boundingBox();assert(rb.x>=vb.x+vb.width,'slider has a separate gutter');assert(!overlap(rb,pb),'editor leaves controls free');assert(rb.y>=vb.y&&rb.y+rb.height<=844,'slider fits screen');
 await p.locator('#out').focus();let a=await point(p,f),s=await scale(f);await gesture(f,'gesturestart',1);await gesture(f,'gesturechange',1.002);await gesture(f,'gestureend',1.002);await anchored(f,a,'tiny initial pinch');a=await point(p,f);s=await scale(f);await p.keyboard.press('Control+=');await settle(p);assert(await scale(f)>s,'Ctrl + zooms only chart even with retained editor focus');await anchored(f,a,'Ctrl +');
 a=await point(p,f);s=await scale(f);await nativeWheel(p,-160);assert(await scale(f)>s,'native Ctrl wheel/pinch input');await anchored(f,a,'native wheel');
 a=await point(p,f);s=await scale(f);await p.keyboard.press('Control+-');await settle(p);assert(await scale(f)<s,'Ctrl -');await anchored(f,a,'Ctrl -');
 // Safari event routing is synthetic: this is handler coverage, not a hardware claim.
 a=await point(p,f);s=await scale(f);assert(await gesture(f,'gesturestart',1));assert(await gesture(f,'gesturechange',1.15));assert(Math.abs(await scale(f)/s-1.15)<.001);await anchored(f,a,'Safari gesture');
 const during=await scale(f);await f.locator('#zoomViewport').dispatchEvent('wheel',{ctrlKey:true,deltaY:-100,clientX:a.x,clientY:a.y});assert.equal(await scale(f),during,'no double zoom while Safari gesture is active');await gesture(f,'gestureend',1.15);
 // Ordinary wheel scrolls without changing zoom.
 const beforeScroll=await f.locator('#zoomViewport').evaluate(v=>v.scrollTop);await p.mouse.wheel(0,60);await p.waitForTimeout(100);assert.equal(await scale(f),during);assert(await f.locator('#zoomViewport').evaluate(v=>v.scrollTop)>beforeScroll,'ordinary wheel scrolls');
 // Native range dragging must produce multiple increasing values, not jump in coarse steps.
 await slider.evaluate(e=>{window.__rangeValues=[];e.addEventListener('input',()=>window.__rangeValues.push(Number(e.value)));});
 const sr=await slider.boundingBox(),value=Number(await slider.inputValue()),thumb=sr.y+11+(1-(value-1)/3)*(sr.height-22);
 await p.mouse.move(sr.x+sr.width/2,thumb);await p.mouse.down();await p.mouse.move(sr.x+sr.width/2,sr.y+12,{steps:18});await p.mouse.up();await settle(p);
 const values=await f.evaluate(()=>window.__rangeValues);assert(values.length>=5,'continuous native slider input '+JSON.stringify(values));assert(values.at(-1)>value+.3);assert(values.every((v,i)=>i===0||v>=values[i-1]-.002));
 await slider.focus();await p.keyboard.press('End');await settle(p);assert.equal(Number(await slider.inputValue()),4);const maximum=await scale(f);assert(Math.abs(maximum/(vb.width/1040)-4)<.02,'fourfold maximum');
 await p.keyboard.press('Home');await settle(p);assert.equal(Number(await slider.inputValue()),1);const minimum=await scale(f);await f.locator('#chartZoomIncrease').click();assert(await scale(f)>minimum);await f.locator('#chartZoomDecrease').click();assert(Math.abs(await scale(f)-minimum)<.001);
 // Slider zoom preserves visible centre (within scroll limits).
 await slider.focus();await p.keyboard.press('End');await settle(p);await f.locator('#zoomViewport').evaluate(v=>{v.scrollLeft=300;v.scrollTop=300});await settle(p);
 const center=await f.evaluate(()=>{const v=document.getElementById('zoomViewport'),r=v.getBoundingClientRect(),c=document.getElementById('chart').getBoundingClientRect(),s=new DOMMatrix(getComputedStyle(document.getElementById('chart')).transform).a,x=r.left+v.clientWidth/2,y=r.top+v.clientHeight/2;return{x,y,cx:(x-c.left)/s,cy:(y-c.top)/s};});
 await p.keyboard.press('PageDown');await settle(p);await anchored(f,center,'slider centre');
 // Dragging the chart pans without inserting a symbol.
 const out=await p.locator('#out').inputValue(),vrect=await f.locator('#zoomViewport').boundingBox(),beforePan=await f.locator('#zoomViewport').evaluate(v=>({x:v.scrollLeft,y:v.scrollTop}));
 await p.mouse.move(vrect.x+120,vrect.y+140);await p.mouse.down();await p.mouse.move(vrect.x+70,vrect.y+100,{steps:10});await p.mouse.up();await settle(p);const afterPan=await f.locator('#zoomViewport').evaluate(v=>({x:v.scrollLeft,y:v.scrollTop}));assert(afterPan.x>beforePan.x+30&&afterPan.y>beforePan.y+25,'mouse drag pans chart');assert.equal(await p.locator('#out').inputValue(),out,'pan never inputs symbols');
 // Overview can be moved to the right edge without covering the slider.
 await p.locator('#zoomMapToggle').click();await p.locator('#zoomMapDrag').focus();for(let i=0;i<40;i++)await p.keyboard.press('Shift+ArrowRight');await settle(p);assert(!overlap(await p.locator('#zoomMinimap').boundingBox(),await rail.boundingBox()));await hit(slider);
 if(lang==='ja')await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-desktop-slider-${dark?'dark':'light'}.png`});
 await p.locator('#chartZoomToggle').click();await settle(p);assert.equal(await rail.isVisible(),false);assert.deepEqual(await p.evaluate(()=>({x:scrollX,y:scrollY})),oldScroll);assert.deepEqual(await p.locator('#out').evaluate(e=>({text:e.value,start:e.selectionStart,end:e.selectionEnd})),saved);assert.equal(await p.locator('.v83-label').textContent(),'v83.34');
 results.push({name,width,lang,dark,pass:true,rangeEvents:values.length});console.log('PASS DESKTOP ZOOM',name,width,lang,dark);
 }
 assert.deepEqual(errors,[]);
 }catch(e){await p.screenshot({path:`qa-production/FAIL-desktop-zoom-${name}-${width}.png`});throw e;}finally{await p.close();}
 }
 // Touch profiles retain their full width, with no visible slider in portrait or landscape.
 for(const width of [320,375,393,844]){
 const p=await b.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'}),f=await open(p,app,width,true);
 assert.equal(await f.locator('#chartZoomControls').isVisible(),false,'touch-only profile has no slider');assert.equal(await f.locator('#zoomViewport').evaluate(e=>getComputedStyle(e).marginRight),'0px');
 const before=await scale(f);await f.locator('#zoomViewport').evaluate(v=>{const r=v.getBoundingClientRect();for(const [type,pts]of [['touchstart',[[80,180],[160,180]]],['touchmove',[[40,180],[200,180]]],['touchend',[]]]){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:pts.map(([x,y])=>({clientX:r.x+x,clientY:r.y+y}))});v.dispatchEvent(e);}});assert(await scale(f)>before*1.8,'existing mobile touch pinch');
 await p.locator('#chartZoomToggle').click();await p.close();console.log('PASS MOBILE NO SLIDER',name,width);
 }
 }finally{await b.close();}
}fs.writeFileSync('qa-production/desktop-zoom-results.json',JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
