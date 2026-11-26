'use strict';
const {chromium,webkit}=require('playwright'),{PNG}=require('pngjs'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/',baseline='http://127.0.0.1:8778/';
const dir='qa-production/map-theme';fs.mkdirSync(dir,{recursive:true});
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function open(p,url,width,dark,locale='ja'){
 await p.goto(url);const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.__ipaLineAudit?.rules?.length===7);
 await p.locator('#languageSelect').selectOption(locale);if((await p.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))await p.locator('#contrastToggle').click();
 await Promise.all([p.evaluate(()=>document.fonts.ready),f.evaluate(()=>document.fonts.ready)]);await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');
 if(!await p.locator('#zoomMinimap').isVisible())await p.locator('#zoomMapToggle').click();
 await f.locator('#chartZoomSlider').evaluate(e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}));});await settle(p);await p.waitForFunction(()=>{const r=document.getElementById('zoomMapWindow').getBoundingClientRect(),v=[r.x,r.y,r.width,r.height].join(',');if(window.__qaMapRect===v)window.__qaMapStable=(window.__qaMapStable||0)+1;else{window.__qaMapRect=v;window.__qaMapStable=0;}return window.__qaMapStable>=5;});return f;
}
function closestBorder(im,rect,target){let best={distance:Infinity};const cx=rect.x+rect.width*.55;for(let y=Math.floor(rect.y)-1;y<=Math.ceil(rect.y)+2;y++)for(let x=Math.floor(cx)-2;x<=Math.ceil(cx)+2;x++){if(x<0||y<0||x>=im.width||y>=im.height)continue;const i=(y*im.width+x)*4,c=[...im.data.subarray(i,i+3)],d=Math.hypot(...c.map((v,k)=>v-target[k]));if(d<best.distance)best={distance:d,rgb:c};}return best;}
(async()=>{const colors=[],focus=[],comparisons=[];for(const[name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 for(const width of[320,375,393,768,1280])for(const dark of[false,true]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:width<600,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const frame=await open(page,app,width,dark),map=page.locator('#zoomMinimap'),window=page.locator('#zoomMapWindow'),r=await window.boundingBox();
   const state=await window.evaluate(e=>({border:getComputedStyle(e).borderTopColor,fill:getComputedStyle(e).backgroundColor,corner:getComputedStyle(e.querySelector('.map-window-resize'),'::after').borderTopColor}));
   assert.equal(state.border,dark?'rgb(104, 66, 28)':'rgb(166, 128, 222)');assert.equal(state.corner,state.border);
   const shot=await page.screenshot(),pixel=closestBorder(PNG.sync.read(shot),r,dark?[216,178,140]:[166,128,222]);assert(pixel.distance<7,'rendered border '+JSON.stringify({name,width,dark,pixel,r}));
   // The same palette change must not change movement, scaling or input.
   const beforeScale=await frame.locator('#chartZoomSlider').inputValue();await page.locator('#zoomMapIncrease').click();assert(+await frame.locator('#chartZoomSlider').inputValue()>+beforeScale);
   await page.locator('#zoomMapDrag').press('ArrowDown');await settle(page);const moved=await map.boundingBox();assert(moved.y>=0&&moved.x>=0);
   const before=await page.locator('#out').inputValue();await frame.locator('#pulmonicConsonants [data-v83-sym="p"]').first().focus();await page.keyboard.press('Space');assert.equal(await page.locator('#out').inputValue(),before+'p');
   if([393,1280].includes(width))await map.screenshot({path:`${dir}/${name}-${width}-${dark?'dark':'light'}.png`});
   colors.push({engine:name,width,dark,state,renderedBorder:pixel.rgb,distance:pixel.distance,pass:true});assert.deepEqual(errors,[]);
   if([393,1280].includes(width)){
    const old=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});try{
     await open(old,baseline,width,dark);const oldRect=await old.locator('#zoomMapWindow').boundingBox();
     // Compare initial geometry on a fresh candidate, before the interaction checks.
     const fresh=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});try{
      await open(fresh,app,width,dark);const newRect=await fresh.locator('#zoomMapWindow').boundingBox();for(const k of['x','y','width','height'])assert(Math.abs(newRect[k]-oldRect[k])<.1,'selection geometry unchanged '+JSON.stringify({name,width,dark,k,oldRect,newRect}));
      const oldMap=PNG.sync.read(await old.locator('#zoomMinimap').screenshot({path:`${dir}/before-${name}-${width}-${dark?'dark':'light'}.png`})),newMap=PNG.sync.read(await fresh.locator('#zoomMinimap').screenshot());assert.equal(oldMap.width,newMap.width);assert.equal(oldMap.height,newMap.height);
      const outer=await fresh.locator('#zoomMinimap').boundingBox();let changed=0,outside=0;
      for(let y=0;y<newMap.height;y++)for(let x=0;x<newMap.width;x++){const i=(y*newMap.width+x)*4,d=Math.max(...[0,1,2].map(k=>Math.abs(oldMap.data[i+k]-newMap.data[i+k])));if(d>3){changed++;if(x<newRect.x-outer.x-2||x>newRect.x-outer.x+newRect.width+2||y<newRect.y-outer.y-2||y>newRect.y-outer.y+newRect.height+2)outside++;}}
      assert.equal(outside,0,'map outside selection unchanged');if(dark)assert(changed>30,'visible orange change');else assert.equal(changed,0,'light palette unchanged');comparisons.push({engine:name,width,dark,changedPixels:changed,outsideChangedPixels:outside,geometryUnchanged:true});
     }finally{await fresh.close();}
    }finally{await old.close();}
   }
  }finally{await page.close();}
 }
 for(const width of[393,1280])for(const locale of['ja','en','pt-BR','fa','ja-osaka'])for(const dark of[false,true]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:width<600,serviceWorkers:'block'});try{
   await page.goto(app);await page.waitForFunction(()=>document.getElementById('zoomMapToggle'));
   await page.locator('#languageSelect').selectOption(locale);if((await page.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))await page.locator('#contrastToggle').click();
   await page.locator('#zoomMapToggle').focus();await page.keyboard.press('Shift+Tab');await settle(page);
   const state=await page.evaluate(()=>{const s=document.getElementById('languageSelect'),b=document.getElementById('languagePickerButton'),cs=getComputedStyle(s),cb=getComputedStyle(b);return{active:document.activeElement.id,native:{outlineColor:cs.outlineColor,outlineStyle:cs.outlineStyle,opacity:cs.opacity,tap:cs.webkitTapHighlightColor},custom:{outlineColor:cb.outlineColor,outlineStyle:cb.outlineStyle,display:cb.display,tap:cb.webkitTapHighlightColor},portuguese:!!s.closest('.mobile-portuguese')}});
   assert.equal(state.active,width<561?'languageSelect':'languagePickerButton');const expected=dark?'rgb(216, 178, 140)':'rgb(152, 121, 211)',tap=dark?'rgba(216, 178, 140, 0.25)':'rgba(152, 121, 211, 0.25)';assert.equal(state.native.outlineColor,expected);assert.equal(state.native.outlineStyle,'solid');assert.equal(state.native.tap,tap);if(width>=561||locale==='pt-BR')assert.equal(state.custom.outlineColor,expected);assert.equal(state.custom.tap,tap);assert.equal(await page.locator('#languageSelect').inputValue(),locale);
   if(width===393&&['ja','pt-BR'].includes(locale))await page.screenshot({path:`${dir}/focus-${name}-${locale}-${dark?'dark':'light'}.png`});
   focus.push({engine:name,width,locale,dark,...state});
  }finally{await page.close();}
 }
 await browser.close();
}fs.writeFileSync(`${dir}/results.json`,JSON.stringify({colors,comparisons,focus},null,2));console.log('PASS MAP THEME',colors.length,comparisons.length,'comparisons;',focus.length,'language focus observations');})().catch(e=>{console.error(e);process.exit(1)});
