'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';
const baseline=process.env.FLOATING_BASELINE_URL||'http://127.0.0.1:8776/';
const output='qa-production/floating-fix';
fs.mkdirSync(output,{recursive:true});
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

async function open(page,url){
 await page.goto(url);
 await page.waitForFunction(()=>window.esaPanelGeometry&&document.getElementById('zoomMapToggle'));
 const frame=await(await page.locator('#v83ChartFrame').elementHandle()).contentFrame();
 await frame.waitForFunction(()=>window.__ipaLineAudit?.rules.length===7);
 await page.locator('#zoomMapToggle').click();
 await page.locator('#zoomMinimap').waitFor({state:'visible'});
 await page.evaluate(()=>esaPanelGeometry.move(8,300,true));
 await settle(page);
 return frame;
}
async function highlight(page){
 return page.locator('#inputPanelDrag,#zoomMapDrag,#zoomMapClose,#zoomMapIncrease').evaluateAll(es=>es.map(e=>({
  id:e.id,color:getComputedStyle(e).getPropertyValue('-webkit-tap-highlight-color'),
  shadow:getComputedStyle(e).boxShadow
 })));
}
async function beginDrag(page,id,nativeTouch){
 const handle=page.locator(id),hr=await handle.boundingBox();
 const selector=id==='#zoomMapDrag'?'#zoomMinimap':'#floatingEditor';
 const box=await page.locator(selector).boundingBox();
 const start={x:hr.x+Math.min(28,hr.width/2),y:hr.y+hr.height/2};
 const offset={x:start.x-box.x,y:start.y-box.y};
 const session=nativeTouch?await page.context().newCDPSession(page):null;
 if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
 else{await page.mouse.move(start.x,start.y);await page.mouse.down();}
 let previous=start;
 return {
  async move(x,y){
   const end={x:x+offset.x,y:y+offset.y};
   if(session){
    for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{
     x:previous.x+(end.x-previous.x)*i/8,y:previous.y+(end.y-previous.y)*i/8
    }]});
   }else await page.mouse.move(end.x,end.y,{steps:8});
   previous=end;await settle(page);
  },
  async end(){
   if(session){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
   else await page.mouse.up();
   await settle(page);
  }
 };
}
function near(actual,expected,label){
 assert(Math.abs(actual.x-expected.x)<2&&Math.abs(actual.y-expected.y)<2,label+' '+JSON.stringify({actual,expected}));
}
function intersects(a,b){
 return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}
async function topAtOverlap(page){
 return page.evaluate(()=>{
  const editor=document.getElementById('floatingEditor').getBoundingClientRect();
  const map=document.getElementById('zoomMinimap').getBoundingClientRect();
  const x=(Math.max(editor.left,map.left)+Math.min(editor.right,map.right))/2;
  const y=(Math.max(editor.top,map.top)+Math.min(editor.bottom,map.bottom))/2;
  return document.elementFromPoint(x,y)?.closest('#floatingEditor,#zoomMinimap')?.id;
 });
}
(async()=>{
 const results=[],failures=[];
 for(const[name,engine]of Object.entries({chromium,webkit})){
  const browser=await engine.launch();
  for(const width of[320,375,393,768,1280]){
   const options={viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'};
   const old=await browser.newPage(options);
   try{
    await open(old,baseline);
    const before=await highlight(old);
    assert(before.every(x=>x.color!=='rgba(0, 0, 0, 0)'),'baseline browser highlight remains enabled');
    const drag=await beginDrag(old,'#zoomMapDrag',name==='chromium'&&width<600);
    await drag.move(10,330);
    const moved=await old.locator('#zoomMinimap').boundingBox();
    assert(Math.abs(moved.y-330)>10,'baseline pushes the map away from the editor');
    if([393,1280].includes(width))await old.screenshot({path:output+'/before-'+name+'-'+width+'.png'});
    await drag.end();
    results.push({engine:name,width,baseline:{highlight:before,requested:{x:10,y:330},actual:moved}});
   }finally{await old.close();}
   const page=await browser.newPage(options),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    const frame=await open(page,app);
    for(const locale of['ja','en','pt-BR','fa','ja-osaka'])for(const dark of[false,true]){
     // Hide the map so the editor controls remain directly accessible during setup.
     await page.locator('#zoomMapClose').click();
     await page.locator('#languageSelect').selectOption(locale);
     if((await page.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))
      await page.locator('#contrastToggle').click();
     await page.evaluate(()=>esaPanelGeometry.move(8,300,true));
     await page.locator('#zoomMapToggle').click();
     await settle(page);
     const state=await highlight(page);
     assert(state.every(x=>x.color==='rgba(0, 0, 0, 0)'),'transparent native touch feedback');
     const editor=await page.locator('#floatingEditor').boundingBox();
     // Start each drag from the map's exposed header, above the editor.
     for(let i=0;i<22;i++)await page.locator('#zoomMapDrag').press('Shift+ArrowUp');
     const useTouch=name==='chromium'&&width<600;
     const drag=await beginDrag(page,'#zoomMapDrag',useTouch);
     await drag.move(10,330);
     const overlap=await page.locator('#zoomMinimap').boundingBox();
     near(overlap,{x:10,y:330},'map follows pointer through editor');
     assert(intersects(overlap,editor),'map can overlap editor');
     assert.equal(await topAtOverlap(page),'zoomMinimap','dragged map is in front');
     near(await page.locator('#floatingEditor').boundingBox(),editor,'editor stays in place');
     if(locale==='ja'&&[393,1280].includes(width))
      await page.screenshot({path:output+'/crossing-'+name+'-'+width+'-'+(dark?'dark':'light')+'.png'});
     await drag.move(10,560);
     near(await page.locator('#zoomMinimap').boundingBox(),{x:10,y:560},'map passes below editor');
     await drag.move(10,330);
     await drag.end();
     await page.locator('#inputPanelDrag').press('Shift+ArrowDown');
     assert.equal(await topAtOverlap(page),'floatingEditor','active editor comes in front');
     near(await page.locator('#zoomMinimap').boundingBox(),overlap,'editor movement does not displace manually placed map');
     // Keyboard focus can raise a map whose grip is covered by the editor.
     await page.locator('#zoomMapDrag').focus();
     assert.equal(await topAtOverlap(page),'zoomMinimap','focused map comes in front');
     const focus=await page.locator('#zoomMapDrag').evaluate(e=>getComputedStyle(e).outlineStyle);
     assert.notEqual(focus,'none','keyboard focus stays visible');
     await page.locator('#zoomMapClose').click();
     await page.locator('#chartZoomToggle').click();
     await page.locator('#out').fill('');
     const key=frame.locator('#pulmonicConsonants [data-v83-sym="p"]').first();
     await key.focus();await page.keyboard.press('Space');
     assert.equal(await page.locator('#out').inputValue(),'p');
     await page.locator('#undo').click();assert.equal(await page.locator('#out').inputValue(),'');
     await page.locator('#redo').click();assert.equal(await page.locator('#out').inputValue(),'p');
     await page.locator('#zoomMapToggle').click();
     results.push({engine:name,width,locale,dark,input:useTouch?'native CDP touch drag':'mouse drag',pass:true});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS FLOATING CROSSING',name,width);
   }catch(error){
    failures.push({engine:name,width,error:error.message,stack:error.stack,errors});
    await page.screenshot({path:output+'/FAIL-'+name+'-'+width+'.png'});
    console.error('FAIL FLOATING CROSSING',failures.at(-1));
   }finally{await page.close();}
  }
  await browser.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify({results,failures},null,2));
 assert.deepEqual(failures,[]);
})().catch(error=>{console.error(error);process.exit(1)});
