const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';
fs.mkdirSync('qa-production',{recursive:true});
const overlap=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
async function settle(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function drag(p,l,dx,dy){const r=await l.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+dx,r.y+r.height/2+dy,{steps:8});await p.mouse.up();await settle(p);}
async function reachable(l,width,height){assert(await l.isVisible(),'visible '+l);const r=await l.boundingBox();assert(r&&r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,'on screen '+JSON.stringify(r));const hit=await l.evaluate(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h)});assert(hit,'not covered '+await l.getAttribute('id'));return r;}
async function gesture(p,f,name,points){
 const viewport=f.locator('#zoomViewport');
 if(name==='chromium'){
  const cd=await p.context().newCDPSession(p),r=await viewport.boundingBox();
  for(let i=0;i<points.length;i++){const a=points[i].map(([x,y],id)=>({id,x:r.x+x,y:r.y+y}));await cd.send('Input.dispatchTouchEvent',{type:i===0?'touchStart':a.length?'touchMove':'touchEnd',touchPoints:a});}
  await cd.detach();
 }else{
  // WebKit does not expose native multi-touch injection: exercise its TouchEvent handlers.
  await viewport.evaluate((v,steps)=>{const r=v.getBoundingClientRect();for(let i=0;i<steps.length;i++){const e=new Event(i===0?'touchstart':steps[i].length?'touchmove':'touchend',{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:steps[i].map(([x,y])=>({clientX:r.x+x,clientY:r.y+y}))});v.dispatchEvent(e);}},points);
 }
 await settle(p);
}
(async()=>{let scenarios=0,failures=[];for(const[name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch();for(const width of[320,375,393,768,1280]){
 const p=await b.newPage({viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'}),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(/\.(js|csv|woff2|html)(\?|$)/.test(r.url())&&r.status()>=400)bad.push(r.url());});
 try{
 await p.goto(app);const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);await settle(p);
 assert.equal(await f.locator('.v83-ipa-key').count(),235);assert.equal(await p.locator('.title').textContent(),'IPA Keyboard');assert.equal(await p.locator('.v83-label').textContent(),'v83.34');
 // Keep genuine edit history across every mode change.
 await p.locator('#out').fill('ab');await p.locator('#out').press('End');await p.locator('#out').press('c');await p.locator('#out').press('ArrowLeft');
 const saved=await p.locator('#out').evaluate(e=>({value:e.value,start:e.selectionStart,end:e.selectionEnd}));
 const outward=await p.locator('#chartZoomToggle path').getAttribute('d');
 for(const locale of['ja','en','pt-BR','fa','ja-osaka']){await p.locator('#languageSelect').selectOption(locale);await settle(p);
 for(const dark of[false,true]){if((await p.locator('html').getAttribute('data-inverse'))!==String(dark))await p.locator('#contrastToggle').click();
 await reachable(p.locator('#chartZoomToggle'),width,844);
 const scroll=await p.evaluate(()=>({x:scrollX,y:scrollY}));
 await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await settle(p);
 const header=await reachable(p.locator('.app-header'),width,844);await reachable(p.locator('.title'),width,844);await reachable(p.locator('#chartZoomToggle'),width,844);
 const language=p.locator(width>=561?'#languagePickerButton':'#languageSelect');await reachable(language,width,844);
 const fr=await p.locator('#v83ChartFrame').boundingBox(),vp=await f.locator('#zoomViewport').boundingBox();assert(Math.abs(fr.y-(header.y+header.height))<=1,'frame starts immediately below header');assert(Math.abs(vp.y-fr.y)<=1,'no empty toolbar band');
 assert.notEqual(await p.locator('#chartZoomToggle path').getAttribute('d'),outward);assert.equal(await p.locator('#chartZoomToggle').getAttribute('aria-label'),await f.evaluate(l=>esaI18n.t('通常表示に戻る',l,'chart'),locale));assert.equal(await f.locator('#zoomClose').isVisible(),false,'single restore button');assert.equal(await f.locator('#zoomPlus,#zoomMinus,#zoomRange').count(),0,'no obsolete controls');
 const mapButton=await reachable(p.locator('#zoomMapToggle'),width,844),panel=await reachable(p.locator('#floatingEditor'),width,844);assert(!overlap(header,panel));assert(!overlap(mapButton,panel));
 // Reset overview to shown, check real close and reopen plus preserved geometry.
 if(!(await p.locator('#zoomMinimap').isVisible()))await p.locator('#zoomMapToggle').click();await settle(p);
 assert.equal(await p.locator('#zoomMapToggle').getAttribute('aria-pressed'),'true');let map=await reachable(p.locator('#zoomMinimap'),width,844);assert(!overlap(map,panel),'overview clear of editor');assert(!overlap(map,mapButton),'overview clear of launcher');
 assert.notEqual(await p.locator('#zoomMapToggle').evaluate(e=>getComputedStyle(e).boxShadow),'none');
 const beforeMap=await p.locator('#zoomMinimap').boundingBox();await drag(p,p.locator('#zoomMapDrag'),beforeMap.x>width/2?-25:25,beforeMap.y<300?40:-40);const movedMap=await p.locator('#zoomMinimap').boundingBox();assert(Math.abs(movedMap.x-beforeMap.x)>10||Math.abs(movedMap.y-beforeMap.y)>10,'map drag changes position');
 if(locale==='ja'&&!dark){await drag(p,p.locator('#inputPanelDrag'),0,-500);const ep=await reachable(p.locator('#floatingEditor'),width,844);assert(overlap(ep,header),'user-directed editor drag can overlap the header');await reachable(p.locator('#inputPanelDrag'),width,844);await reachable(p.locator('#inputPanelReset'),width,844);assert.equal(await p.locator('#inputPanelTitle').textContent(),'IPA Keyboard');assert(!overlap(await reachable(p.locator('#zoomMinimap'),width,844),ep),'overview moves clear of dragged editor');await p.locator('#inputPanelReset').click();await settle(p);}
 await p.locator('#zoomMapClose').click();assert.equal(await p.locator('#zoomMinimap').isVisible(),false);await reachable(p.locator('#zoomMapToggle'),width,844);assert.equal(await p.locator('#zoomMapToggle').evaluate(e=>getComputedStyle(e).boxShadow),'none');await p.locator('#zoomMapToggle').click();assert.equal(await p.locator('#zoomMinimap').isVisible(),true);
 // Keep chart gesture path free of the map and editor.
 await p.locator('#zoomMapClose').click();const before=await f.locator('#chart').evaluate(e=>parseFloat(e.style.transform.match(/scale\(([^)]+)/)[1]));
 if(width<700){await gesture(p,f,name,[[[80,220],[160,220]],[[60,220],[180,220]],[[40,220],[200,220]],[]]);}else{const vr=await f.locator('#zoomViewport').boundingBox();await p.mouse.move(vr.x+300,vr.y+200);await p.keyboard.down('Control');await p.mouse.wheel(0,-300);await p.keyboard.up('Control');await f.waitForFunction(old=>parseFloat(document.getElementById('chart').style.transform.match(/scale\(([^)]+)/)[1])>old*1.5,before);}
 const after=await f.locator('#chart').evaluate(e=>parseFloat(e.style.transform.match(/scale\(([^)]+)/)[1]));assert(after>before*1.5,'chart zoom changes scale');
 const pan=await f.locator('#zoomViewport').evaluate(e=>({y:e.scrollTop,max:e.scrollHeight-e.clientHeight}));assert(pan.max>30,'zoomed chart has pan space');const dy=pan.y>pan.max/2?90:-90;await gesture(p,f,name,[[[100,240]],[[100,240+dy/2]],[[100,240+dy]],[]]);assert(Math.abs((await f.locator('#zoomViewport').evaluate(e=>e.scrollTop))-pan.y)>30,'one finger pans in an available direction');
 if(width<700){await gesture(p,f,name,[[[40,220],[200,220]],[[80,220],[160,220]],[]]);assert((await f.locator('#chart').evaluate(e=>parseFloat(e.style.transform.match(/scale\(([^)]+)/)[1])))<after*.7,'pinch in reduces scale');}
 if(locale==='ja')await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-${dark?'dark':'light'}-expanded.png`});
 await p.locator('#chartZoomToggle').click();await p.waitForFunction(()=>document.getElementById('chartZoomToggle').getAttribute('aria-expanded')==='false');await settle(p);assert.equal(await f.locator('#chartScaleContent #chart').count(),1);assert.equal(await p.locator('#chartZoomToggle path').getAttribute('d'),outward);assert.deepEqual(await p.evaluate(()=>({x:scrollX,y:scrollY})),scroll,'scroll restored');assert.deepEqual(await p.locator('#out').evaluate(e=>({value:e.value,start:e.selectionStart,end:e.selectionEnd})),saved,'text and selection retained');scenarios++;
 }}
 // Existing undo/redo and real symbol click, with panel moved away from the target.
 await p.locator('#undo').click();assert.equal(await p.locator('#out').inputValue(),'ab');await p.locator('#redo').click();assert.equal(await p.locator('#out').inputValue(),'abc');
 const key=f.locator('#pulmonicConsonants [data-v83-sym="p"]').first();await key.click();assert((await p.locator('#out').inputValue()).includes('p'),'real symbol click inserts IPA');
 await p.locator('#settingsToggle').click();await p.locator('#panelWidthSlider').press('Home');await p.locator('#inputSizeSlider').press('Home');await settle(p);const small=await p.locator('#floatingEditor').boundingBox();await p.locator('#inputSizeSlider').press('End');await settle(p);const large=await p.locator('#floatingEditor').boundingBox();assert(large.width>small.width+20,'font increases panel width');assert(large.height>small.height+5,'font increases panel height');await p.locator('#settingsToggle').click();
 const pb=await p.locator('#floatingEditor').boundingBox();await drag(p,p.locator('#inputPanelDrag'),width>700?-60:20,-70);const pa=await p.locator('#floatingEditor').boundingBox();assert(Math.abs(pa.y-pb.y)>30,'panel drag works');assert(!overlap(pa,await p.locator('.app-header').boundingBox()),'normal editor stays below header');
 await p.locator('#panelResizeW').focus();await p.keyboard.press('ArrowLeft');await settle(p);const narrow=await p.locator('#floatingEditor').boundingBox();assert(narrow.width<pa.width,'manual width works');
 const oh=await p.locator('#out').evaluate(e=>e.getBoundingClientRect().height);await p.locator('#inputHeightHandle').focus();await p.keyboard.press('ArrowDown');assert((await p.locator('#out').evaluate(e=>e.getBoundingClientRect().height))>oh,'manual height works');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log(`PASS RECOVERY ${name} ${width}: 10 locale/theme scenarios, reachable header, single restore, zoom/pan, draggable overview, retained edits, font and manual panel geometry; gesture=${name==='chromium'?'native CDP touch':'synthetic WebKit TouchEvent handlers'}`);
 }catch(e){await p.screenshot({path:`qa-production/FAIL-${name}-${width}.png`});console.log('FAIL METRICS',await p.evaluate(()=>({errors:[],body:document.body.innerText.slice(0,200),header:document.querySelector('.app-header').getBoundingClientRect().toJSON(),panel:document.querySelector('#floatingEditor').getBoundingClientRect().toJSON()})));console.log('PAGE ERRORS',errors);console.error(e);failures.push(name+' '+width+': '+e.message);}finally{await p.close();}
 }await b.close();}console.log('TOTAL PASS',scenarios);assert.deepEqual(failures,[]);})().catch(e=>{console.error(e);process.exit(1)});
