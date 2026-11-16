const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.TEST_BASE||'http://127.0.0.1:8765/';fs.mkdirSync('qa-production',{recursive:true});
const timeout=setTimeout(()=>process.exit(2),150000);
async function chartFrame(p){await p.frameLocator('#v83ChartFrame').locator('.v83-ipa-key').first().waitFor();return await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();}
async function stable(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function metrics(p){return await p.evaluate(()=>{
 const v=visualViewport,s=v.scale,r=document.getElementById('floatingEditor').getBoundingClientRect(),b=document.getElementById('copy').getBoundingClientRect();
 return{scale:s,width:r.width*s,height:r.height*s,button:b.width*s,font:parseFloat(getComputedStyle(document.getElementById('out')).fontSize),x:(r.left-v.offsetLeft)*s,y:(r.top-v.offsetTop)*s,viewW:v.width*s,viewH:v.height*s};
});}
async function touchInFrame(p,f,selector){
 const pt=await f.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),host=frameElement,fr=host.getBoundingClientRect(),v=parent.visualViewport;
  const sx=fr.width/host.clientWidth,sy=fr.height/host.clientHeight;
  return{x:fr.left+(r.left+r.width/2)*sx,y:fr.top+(r.top+r.height/2)*sy,screenX:(fr.left+(r.left+r.width/2)*sx-v.offsetLeft)*v.scale,screenY:(fr.top+(r.top+r.height/2)*sy-v.offsetTop)*v.scale};
 });
 assert(pt.screenX>=0&&pt.screenX<=390&&pt.screenY>=0&&pt.screenY<=844,'touch control must be on screen '+selector+' '+JSON.stringify(pt));
 await p.touchscreen.tap(pt.x,pt.y);
 console.log('FRAME_TOUCH '+selector+' '+JSON.stringify({point:pt,host:await p.evaluate(()=>window.__lastPointer),child:await f.evaluate(()=>window.__lastPointer)}));
}
async function touchPoints(p,points){return await p.evaluate(a=>a.map(t=>({x:visualViewport.offsetLeft+t.x/visualViewport.scale,y:visualViewport.offsetTop+t.y/visualViewport.scale})),points);}
(async()=>{
 for(const[name,type]of Object.entries({chromium,webkit})){
  const b=await type.launch({headless:true}),p=await b.newPage({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  p.setDefaultTimeout(5000);const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addInitScript(()=>{window.__heartbeat=0;setInterval(()=>__heartbeat++,50);document.addEventListener('pointerdown',e=>{window.__lastPointer={id:e.target.closest?.('button')?.id,tag:e.target.tagName,x:e.clientX,y:e.clientY};},true);});
  await p.goto(base+'ipa-keyboard/',{waitUntil:'load'});const f=await chartFrame(p);await p.evaluate(()=>document.fonts.ready);await stable(p);
  const initial=await metrics(p);
  await touchInFrame(p,f,'#chartZoomOpen');await p.waitForFunction(()=>document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');
  await touchInFrame(p,f,'#zoomClose');await p.waitForFunction(()=>!document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));
  let cd;
  if(name==='chromium'){
   cd=await p.context().newCDPSession(p);
   for(const factor of [1.5,2,2.5,1]){
    await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:factor});await p.waitForTimeout(100);await stable(p);
    const m=await metrics(p);assert(Math.abs(m.width-initial.width)<1,'fixed visual editor width '+JSON.stringify(m));assert(Math.abs(m.height-initial.height)<1,'fixed visual editor height '+JSON.stringify(m));assert(Math.abs(m.button-initial.button)<1);assert.equal(m.font,initial.font);assert(m.x>=6&&m.y>=6&&m.x+m.width<=m.viewW-6&&m.y+m.height<=m.viewH-6);
    console.log('NATIVE_PAGE_SCALE '+factor+' '+JSON.stringify(m));
   }
   await cd.send('Input.synthesizePinchGesture',{x:195,y:350,scaleFactor:2,relativeSpeed:800,gestureSourceType:'touch'});
   await p.waitForTimeout(200);let pinch=await metrics(p);console.log('ROOT_PINCH_DRIVER_RESULT '+JSON.stringify(pinch));
   if(pinch.scale<=1.2){console.log('ROOT_BROWSER_PINCH_NOT_EMULATED: exercising actual browser page-scale state through CDP');await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await p.waitForTimeout(100);await stable(p);}
   pinch=await metrics(p);
   assert(Math.abs(pinch.width-initial.width)<1&&Math.abs(pinch.height-initial.height)<1&&Math.abs(pinch.button-initial.button)<1,'browser page zoom leaves editor physical size unchanged');
   const bt=await p.locator('#contrastToggle').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
   await p.touchscreen.tap(bt.x,bt.y);console.log('ROOT_BUTTON_TOUCH '+JSON.stringify({point:bt,target:await p.evaluate(()=>window.__lastPointer)}));assert.equal(await p.locator('#contrastToggle').getAttribute('aria-pressed'),'true');await p.touchscreen.tap(bt.x,bt.y);
   await p.screenshot({path:'qa-production/chromium-native-page-scale-fixed-panel.png'});
  }
  // Open at the retained native page zoom, then exercise visible controls physically.
  await f.locator('#chartZoomOpen').evaluate(el=>el.click());
  await p.waitForFunction(()=>document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));
  await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await stable(p);
  const open=await metrics(p);assert(Math.abs(open.width-initial.width)<1&&Math.abs(open.button-initial.button)<1);
  await touchInFrame(p,f,'#zoomMapToggle');await f.waitForFunction(()=>document.getElementById('zoomMinimap').hidden);
  const entryZoom=Number(await f.locator('#zoomRange').inputValue());assert(Math.abs(entryZoom-Math.min(300,open.scale*100))<2,'entering zoom preserves existing chart magnification');
  await touchInFrame(p,f,'#zoomPlus');assert.equal(Number(await f.locator('#zoomRange').inputValue()),Math.min(300,entryZoom+25));
  await f.locator('#zoomRange').fill('100');
  const beforeInput=await p.locator('#out').inputValue();
  if(cd){
   await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:await touchPoints(p,[{x:145,y:360},{x:245,y:360}])});
   for(const d of [60,70,85,100]){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:await touchPoints(p,[{x:195-d,y:360},{x:195+d,y:360}])});await p.waitForTimeout(25);}
   await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await f.evaluate(()=>{
    const view=document.getElementById('zoomViewport');
    function send(type,points){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([x,y])=>({clientX:x,clientY:y}))});view.dispatchEvent(e);}
    send('touchstart',[[145,360],[245,360]]);send('touchmove',[[95,360],[295,360]]);send('touchend',[]);
   });
  }
  await stable(p);
  const z=Number(await f.locator('#zoomRange').inputValue());assert(z>=180&&z<=220,'two-finger chart pinch '+z);
  const zoomed=await metrics(p);assert(Math.abs(zoomed.width-initial.width)<1&&Math.abs(zoomed.button-initial.button)<1);assert.equal(await p.locator('#out').inputValue(),beforeInput,'pinch does not insert symbols');
  if(cd){
   const before=await f.locator('#zoomViewport').evaluate(e=>e.scrollTop);
   await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:await touchPoints(p,[{x:350,y:610}])});
   for(const y of [580,530,480,430,380]){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:await touchPoints(p,[{x:350,y}])});await p.waitForTimeout(35);}
   await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(100);
   assert((await f.locator('#zoomViewport').evaluate(e=>e.scrollTop))>before+5,'one-finger scrolling works after pinch');
  }
  const heartbeat=await p.evaluate(()=>__heartbeat);await p.waitForTimeout(120);assert((await p.evaluate(()=>__heartbeat))>heartbeat,'event loop remains responsive');
  await p.screenshot({path:'qa-production/'+name+'-chart-pinch-active.png'});
  await touchInFrame(p,f,'#zoomClose');await p.waitForFunction(()=>!document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));
  assert.notEqual(await p.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
  if(cd){await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cd.detach();await stable(p);}
  for(let i=0;i<3;i++){
   await touchInFrame(p,f,'#chartZoomOpen');await p.waitForFunction(()=>document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');
   await touchInFrame(p,f,'#zoomClose');await p.waitForFunction(()=>!document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));
  }
  assert.deepEqual(errors,[]);console.log('PASS GESTURES '+name+': '+(cd?'native page scale + trusted pinch/scroll':'mobile-context touch gesture handlers')+', visible zoom controls, repeated open/close, no accidental input, heartbeat');
  await b.close();
 }clearTimeout(timeout);
})().catch(e=>{console.error(e);process.exit(1)});


