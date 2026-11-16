const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
fs.mkdirSync('qa-production',{recursive:true});
(async()=>{
 for(const [name,type]of Object.entries({chromium,webkit}))for(const width of [390,320]){
  const b=await type.launch({headless:true}),p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  p.setDefaultTimeout(8000);const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto((process.env.TEST_BASE||'http://127.0.0.1:8765/')+'ipa-keyboard/');
  const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.locator('.v83-ipa-key').first().waitFor();await f.evaluate(()=>document.fonts.ready);
  const panel=()=>p.locator('#floatingEditor').evaluate(e=>{const r=e.getBoundingClientRect(),btn=document.getElementById('copy').getBoundingClientRect();return{width:r.width,height:r.height,button:btn.width,scale:visualViewport.scale};});
  // Verify compact and wide panel spacing for each available language.
  for(const panelWidth of [240,300,320]){
   await p.locator('#panelWidthSlider').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},panelWidth);
   for(const locale of ['ja','en','pt-BR','fa']){
    await p.locator('#languageSelect').selectOption(locale);await p.waitForTimeout(60);
    const layout=await p.locator('#floatingEditor').evaluate(e=>{
     const row=e.querySelector('.main-controls'),r=row.getBoundingClientRect(),items=[...row.children].filter(x=>x.matches('.ctl,.dia-control')).map(x=>x.getBoundingClientRect());
     const gaps=items.slice(1).flatMap((b,i)=>Math.abs(b.top-items[i].top)<1?[Math.min(Math.abs(b.left-items[i].right),Math.abs(items[i].left-b.right))]:[]);
     return{inside:items.every(b=>b.left>=r.left-.5&&b.right<=r.right+.5),gaps:gaps.map(Math.abs),height:e.querySelector('#copy').getBoundingClientRect().height};
    });
    assert(layout.inside,'all controls inside panel');assert(layout.gaps.every(x=>Math.abs(x-3)<.6),'every adjacent control gap is 3px: '+JSON.stringify(layout));assert.equal(layout.height,28,'phone button height unchanged');
   }
   await p.locator('#languageSelect').selectOption('ja');await p.screenshot({path:`qa-production/${name}-${width}-panel-${panelWidth}.png`});
  }
  await p.locator('#panelWidthSlider').evaluate(e=>{e.value='320';e.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(80);
  const before=await panel(),input=await p.locator('#out').inputValue();
  const top=await f.locator('#chartScaleShell').evaluate(e=>frameElement.getBoundingClientRect().top+e.getBoundingClientRect().top+parent.scrollY);await p.evaluate(y=>scrollTo(0,y-180),top);await p.waitForTimeout(100);
  let cd;
  if(name==='chromium'){
   cd=await p.context().newCDPSession(p);const mid=width/2;
   await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mid-45,y:350},{x:mid+45,y:350}]});
   for(const d of [50,60,75,90]){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mid-d,y:350},{x:mid+d,y:350}]});await p.waitForTimeout(30);}
   await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await f.evaluate(()=>{
    const shell=document.getElementById('chartScaleShell');function send(type,points){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([x,y])=>({clientX:x,clientY:y}))});shell.dispatchEvent(e);}
    const r=shell.getBoundingClientRect();send('touchstart',[[100,r.top+170],[200,r.top+170]]);send('touchmove',[[50,r.top+170],[250,r.top+170]]);send('touchend',[]);
   });
  }
  await p.waitForTimeout(200);const zoom=Number(await f.locator('#chartScaleShell').getAttribute('data-zoom'));assert(zoom>1.8&&zoom<2.2,'inline chart actually zoomed '+zoom);
  assert.deepEqual(await panel(),before,'inline pinch leaves physical panel and buttons unchanged');assert.equal(await p.locator('#out').inputValue(),input,'pinch does not enter IPA');
  // All controls must remain inside the panel and must not overlap each other.
  const layout=await p.locator('#floatingEditor').evaluate(e=>{const r=e.getBoundingClientRect(),a=[...e.querySelectorAll('.main-controls>.ctl')].map(b=>b.getBoundingClientRect());return a.every(b=>b.left>=r.left&&b.right<=r.right)&&a.every((b,i)=>a.slice(i+1).every(c=>b.right<=c.left||c.right<=b.left||b.bottom<=c.top||c.bottom<=b.top));});assert(layout,'panel buttons remain inside panel without overlap');
  const transform=await f.locator('#chartScaleContent').evaluate(e=>e.style.transform);
  await f.evaluate(()=>{const s=document.getElementById('chartScaleShell'),r=s.getBoundingClientRect();function send(type,points){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([x,y])=>({clientX:x,clientY:y}))});s.dispatchEvent(e);}send('touchstart',[[180,r.top+80]]);send('touchmove',[[100,r.top+80]]);send('touchend',[]);});
  assert.notEqual(await f.locator('#chartScaleContent').evaluate(e=>e.style.transform),transform,'horizontal chart pan works');
  const scroll=await p.evaluate(()=>scrollY);await p.evaluate(()=>scrollBy(0,160));assert((await p.evaluate(()=>scrollY))>scroll+100,'page remains scrollable after pinch');
  await p.screenshot({path:`qa-production/${name}-${width}-inline-pinch.png`});
  await f.locator('#chartZoomOpen').evaluate(e=>e.click());await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await f.locator('#zoomPlus').click();assert.equal(await f.locator('#zoomRange').inputValue(),'125');
  await f.locator('#zoomClose').click();await p.waitForFunction(()=>!document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));assert.deepEqual(await panel(),before);assert.equal(Number(await f.locator('#chartScaleShell').getAttribute('data-zoom')),zoom,'inline zoom restored after closing viewer');
  assert.deepEqual(errors,[]);console.log(`PASS INLINE ${name} ${width}: ${cd?'trusted two-finger pinch':'touch event handlers'}, fixed panel, no overlapping controls, pan, open/close, no accidental IPA`);await b.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});

