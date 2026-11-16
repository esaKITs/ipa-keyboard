const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';fs.mkdirSync('qa-production',{recursive:true});
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});
 for(const width of[320,390,480,481,560,561,768,1280]){
  const p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(app);
  const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await p.evaluate(()=>document.fonts.ready);await f.evaluate(()=>document.fonts.ready);
  for(const locale of['ja','en','pt-BR','fa','ja-osaka','ja']){
   await p.locator('#languageSelect').selectOption(locale);
   const box=await p.locator('.app-header').evaluate(e=>{const r=e.getBoundingClientRect(),items=[...e.children].map(x=>x.getBoundingClientRect());return{height:r.height,inside:items.every(x=>x.left>=r.left&&x.right<=r.right),row:items.every(x=>Math.abs(x.top+x.height/2-(r.top+r.height/2))<1),overlap:items.some((x,i)=>items.slice(i+1).some(y=>Math.min(x.right,y.right)>Math.max(x.left,y.left)+.5&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top)+.5)),twoRows:items[2].top>=Math.max(items[0].bottom,items[1].bottom,items[3].bottom),frameGap:document.getElementById('v83ChartFrame').getBoundingClientRect().top-r.bottom};});
   const twoRows=locale==='pt-BR'&&width<=560;assert(box.height<=(twoRows?90:54)&&box.inside&&(twoRows?box.twoRows:box.row)&&!box.overlap&&box.frameGap<=1,'compact header with complete language name: '+locale+' '+JSON.stringify(box));
   if(locale==='pt-BR'){
    assert.equal(await p.locator('#languageSelect option:checked').textContent(),'Português brasileiro');
    const fits=await p.locator('#languageSelect').evaluate(e=>{const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(e).font;return c.measureText(e.selectedOptions[0].textContent).width+32<=e.clientWidth;});assert(fits,'full Brazilian Portuguese label fits the closed select');
    if(width>=561){
     const checks=await p.locator('#languageSelect').evaluate(e=>{
      const saved=e.getAttribute('style'),c=document.createElement('canvas').getContext('2d');
      const measure=()=>{const st=getComputedStyle(e);c.font=st.font;return {text:c.measureText(e.selectedOptions[0].textContent).width,available:e.clientWidth-parseFloat(st.paddingLeft)-parseFloat(st.paddingRight)-24};};
      e.style.fontSize='20px';const large=measure();
      e.style.width='180px';e.style.flexBasis='180px';e.style.padding='0 5px';const prior=measure();
      if(saved===null)e.removeAttribute('style');else e.setAttribute('style',saved);
      return {large,prior};
     });
     assert(checks.prior.text>checks.prior.available,'old fixed-width select reproduces clipping with enlarged desktop text: '+JSON.stringify(checks));
     assert(checks.large.text<=checks.large.available,'desktop text retains room for the native arrow: '+JSON.stringify(checks));
     console.log('PASS DESKTOP SELECT',name,width,JSON.stringify(checks));
    }
    await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-portugues-brasileiro.png`});
   }
   assert.equal(await p.locator('.language-caption').textContent(),'Language');assert.equal(await p.locator('.language-caption').getAttribute('for'),'languageSelect');assert((await p.locator('.language-caption').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)))<=10,'small fixed Language label');
   const expected=await p.evaluate(lang=>esaI18n.t('⛶ 拡大表示',lang,'chart').replace(/^⛶\s*/,''),locale);assert.equal(await p.locator('#chartZoomToggle').getAttribute('aria-label'),expected);
  }
  assert.equal(await p.locator('.v83-integrated>.v83-label').count(),0,'no duplicate version row');assert.equal(await p.locator('.app-header .ipa-standard').count(),0);
  assert.equal(await f.locator('#chart #appVersion,#chart #alphabetRevision').count(),0,'chart version and reference moved out of the heading');assert.equal(await f.locator('.chart-reference #appVersion').textContent(),'0.2.98');assert.equal(await f.locator('.chart-tool-row').isVisible(),false);
  const gap=await f.evaluate(()=>document.querySelector('#pulmonicConsonants h2').getBoundingClientRect().top-document.querySelector('#title').getBoundingClientRect().bottom);assert(gap>=0&&gap<=7,'tight second and third rows: '+gap);
  await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-compact-header.png`,fullPage:true});
  await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');assert.equal(await p.locator('#chartZoomToggle').getAttribute('aria-expanded'),'true');await f.locator('#zoomPlus').click();assert.equal(await f.locator('#zoomRange').inputValue(),'125');await f.locator('#zoomClose').click();await p.waitForFunction(()=>document.querySelector('#chartZoomToggle').getAttribute('aria-expanded')==='false');
  await p.locator('#chartZoomToggle').focus();await p.keyboard.press('Enter');await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await f.locator('#zoomClose').click();assert.equal(await f.locator('.v83-ipa-key').count(),235);
  await p.locator('#contrastToggle').click();await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-compact-header-dark.png`,fullPage:true});assert.deepEqual(errors,[]);await p.close();
  console.log(`PASS HEADER ${name} ${width}: full Português brasileiro label with two mobile rows, other languages in one row, icon click and keyboard, readable labels, source metadata retained, tight chart heading, both themes`);
 }
 await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});
