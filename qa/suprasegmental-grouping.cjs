'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/',prefix=process.env.PUBLIC_CHECK?'public':'staged';
fs.mkdirSync('qa-production',{recursive:true});const results=[],failures=[];
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 for(const width of[320,375,393,768,1280]){
  const p=await browser.newPage({viewport:{width,height:844},hasTouch:width<1280,serviceWorkers:'block'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto(app);const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await f.evaluate(()=>document.fonts.ready);
   assert.equal(await f.locator('.v83-ipa-key').count(),235,'entire symbol inventory retained');
   const structure=await f.evaluate(()=>{
    const group=document.getElementById('suprasegmentalGroup'),tone=document.getElementById('tonesAndWordAccents'),pitch=document.getElementById('pitchMovements');
    return{children:[...group.children].map(e=>e.id),heading:group.firstElementChild.tagName,toneHeading:tone.firstElementChild.tagName,toneRows:tone.querySelectorAll('tbody>tr').length,pitchRows:pitch.querySelectorAll('tbody>tr').length,arrows:[...pitch.querySelectorAll('.v83-ipa-key')].map(e=>e.dataset.v83Sym),toneArrows:tone.querySelectorAll('[title^="U+219"]').length};
   });
   assert.deepEqual(structure,{children:['suprasegmentalHeading','suprasegmentals','tonesAndWordAccents','pitchMovements'],heading:'H2',toneHeading:'H3',toneRows:5,pitchRows:2,arrows:['ꜜ','↗','ꜛ','↘'],toneArrows:0});
   // IPA official symbol list: 517 = U+A71C, 518 = U+A71B.
   assert.deepEqual(structure.arrows.map(x=>x.codePointAt(0)),[0xA71C,0x2197,0xA71B,0x2198]);
   assert.equal(await f.locator('#pitchMovements sup').count(),0,'native raised characters, not CSS superscripts');
   const metrics=await f.evaluate(async()=>{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),all=[];
    for(const font of window.esaIPAFonts.options){
     await window.esaIPAFonts.load(document,font.key);ctx.font='32px "'+font.family+'"';
     for(const [raised,ordinary]of [['ꜜ','\u2193'],['ꜛ','\u2191']]){
      const r=ctx.measureText(raised),o=ctx.measureText(ordinary);
      all.push({font:font.key,codepoint:raised.codePointAt(0),ascent:r.actualBoundingBoxAscent,descent:r.actualBoundingBoxDescent,height:r.actualBoundingBoxAscent+r.actualBoundingBoxDescent,ordinaryHeight:o.actualBoundingBoxAscent+o.actualBoundingBoxDescent});
     }
    }
    return all;
   });
   for(const m of metrics){assert(m.descent<0,'raised arrow is above the baseline '+JSON.stringify(m));assert(m.height>0&&m.height<m.ordinaryHeight*.6,'native half-height glyph '+JSON.stringify(m));}
   const translated=[];
   for(const locale of['ja','en','pt-BR','fa'])for(const dark of[false,true]){
    await p.locator('#languageSelect').selectOption(locale);if((await p.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))await p.locator('#contrastToggle').click();await settle(p);
    const layout=await f.evaluate(()=>{
     const ids=['suprasegmentalHeading','suprasegmentals','tonesAndWordAccents','pitchMovements'];
     return{heading:document.getElementById('suprasegmentalHeading').textContent,tone:document.getElementById('toneHeading').textContent,boxes:ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};}),sizes:[...document.querySelectorAll('#pitchMovements td,#tonesAndWordAccents tbody td')].map(e=>parseFloat(getComputedStyle(e).fontSize))};
    });
    for(let i=1;i<layout.boxes.length;i++)assert(layout.boxes[i].y>=layout.boxes[i-1].bottom-.5,'groups have no vertical overlap '+JSON.stringify(layout));
    for(const box of layout.boxes)assert(box.scrollWidth<=box.clientWidth+1,'translated group fits '+JSON.stringify(box));
    assert(layout.sizes.every(x=>x===32),'existing symbol font size stays 32px');
    if(!dark)translated.push(layout.tone);
    // Every moved symbol still operates, including combining with genuine history.
    const out=p.locator('#out');await out.fill('a');await out.press('End');
    for(const key of await f.locator('#pitchMovements .v83-ipa-key').all()){const before=await out.inputValue(),sym=await key.getAttribute('data-v83-sym');await key.focus();await p.keyboard.press('Space');await settle(p);assert.equal(await out.inputValue(),before+sym,'moved key inserts once');}
    assert.equal(await out.inputValue(),'aꜜ↗ꜛ↘');await p.locator('#undo').click();assert.equal(await out.inputValue(),'aꜜ↗ꜛ');await p.locator('#redo').click();assert.equal(await out.inputValue(),'aꜜ↗ꜛ↘');
    await p.evaluate(()=>scrollTo(0,0));await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');
    const map=p.locator('#zoomMinimap');if(!await map.isVisible())await p.locator('#zoomMapToggle').click();await settle(p);
    assert.equal(await p.locator('#zoomMapCanvas [data-region="suprasegmentalGroup"]').count(),1);assert.equal(await p.locator('#zoomMapCanvas [data-region="tonesAndWordAccents"]').count(),0,'subgroup is not presented as a peer');
    await p.locator('#zoomMapCanvas [data-region="suprasegmentalGroup"]').click();await p.locator('#zoomMapClose').click();
    // Native pointer activation of a moved key (no force / dispatched click).
    const panel=await p.locator('#floatingEditor').boundingBox(),grip=await p.locator('#inputPanelDrag').boundingBox();
    await p.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await p.mouse.down();await p.mouse.move(grip.x+grip.width/2+8-panel.x,grip.y+grip.height/2+80-panel.y,{steps:12});await p.mouse.up();await settle(p);
    const key=f.locator('#pitchMovements .v83-ipa-key').first();await out.press('End');const before=await out.inputValue();
    await key.scrollIntoViewIfNeeded();const hitBox=await key.boundingBox();assert.equal(await p.evaluate(r=>document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id,hitBox),'v83ChartFrame','native click is not covered by the floating editor');
    await f.evaluate(()=>{window.__groupingPointerTrace=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>window.__groupingPointerTrace.push({type,target:e.target.outerHTML?.slice(0,160),gesture:document.documentElement.dataset.chartGesture,x:e.clientX,y:e.clientY}),{capture:true});});
    await key.click();await settle(p);assert.equal(await out.inputValue(),before+'ꜜ',JSON.stringify({trace:await f.evaluate(()=>window.__groupingPointerTrace),selection:await out.evaluate(e=>({start:e.selectionStart,end:e.selectionEnd})),key:await key.boundingBox()}));
    if(locale==='ja'&&[393,1280].includes(width))await f.locator('#suprasegmentalGroup').screenshot({path:`qa-production/${prefix}-suprasegmentals-${name}-${width}-${dark?'dark':'light'}.png`});
    await p.locator('#inputPanelReset').click();await settle(p);
    await p.locator('#chartZoomToggle').click();assert.equal(await out.inputValue(),before+'ꜜ','mode restore retains inserted text');
    assert.deepEqual(errors,[]);results.push({engine:name,width,locale,dark,structure,layout,metrics,pass:true});
   }
   assert.equal(new Set(translated).size,4,'all four real heading translations are applied');
   console.log('PASS SUPRASEGMENTAL GROUPING',name,width);
  }catch(e){failures.push({engine:name,width,error:e.message,errors});console.error(failures.at(-1));await p.screenshot({path:`qa-production/FAIL-suprasegmentals-${name}-${width}.png`});}finally{await p.close();}
 }
 await browser.close();
}fs.writeFileSync('qa-production/suprasegmental-grouping-results.json',JSON.stringify({results,failures},null,2));assert.deepEqual(failures,[]);})().catch(e=>{console.error(e);process.exit(1)});
