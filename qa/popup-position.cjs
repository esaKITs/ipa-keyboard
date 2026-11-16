const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';fs.mkdirSync('qa-production',{recursive:true});
(async()=>{for(const[name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true}),p=await b.newPage({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});await p.goto(app);const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await p.locator('#languageSelect').selectOption('en');
 let cd;if(name==='chromium')cd=await p.context().newCDPSession(p);
 for(const pageScale of cd?[1,1.5,2,2.5]:[1]){
  if(cd){await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:pageScale});await p.waitForTimeout(120);}
  await p.locator('#chartZoomToggle').evaluate(e=>e.click());await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await f.locator('#zoomRange').fill('260');await p.waitForTimeout(80);
  for(const target of[40,100,180,280,350]){
   const key=f.locator('#pulmonicConsonants [data-v83-sym="d"]').first();await key.evaluate((el,target)=>{const v=document.getElementById('zoomViewport'),r=el.getBoundingClientRect();v.scrollLeft+=r.left+r.width/2-target;},target);await p.waitForTimeout(40);
   const result=await key.evaluate(el=>{el.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',button:0,bubbles:true,cancelable:true}));const pop=document.getElementById('v831SymbolPopup'),r=pop.getBoundingClientRect(),a=el.getBoundingClientRect(),d=pop.querySelector('path').getAttribute('d'),m=d.match(/79\.5 ([\d.]+) 79\.5H([\d.]+)/),tip=(Number(m[1])+Number(m[2]))/2,fr=frameElement.getBoundingClientRect();return{errorX:r.left+tip-(a.left+a.width/2),symbolX:a.left+a.width/2,tipX:r.left+tip,frameScale:fr.width/frameElement.clientWidth,hostViewport:{offset:parent.visualViewport.offsetLeft,width:parent.visualViewport.width,scale:parent.visualViewport.scale},popup:{left:r.left,right:r.right,placement:pop.dataset.placement}};});
   console.log('POPUP ANCHOR',name,pageScale,target,JSON.stringify(result));
   if(Math.abs(result.errorX)>2)await p.screenshot({path:`qa-production/${name}-popup-anchor-failure-${pageScale}-${target}.png`});
   assert(Math.abs(result.errorX)<=2,'preview stem must remain on the pressed glyph at 260%: '+JSON.stringify(result));await key.dispatchEvent('pointercancel',{pointerType:'touch'});
  }
  await f.locator('#zoomClose').click();
 }
 if(cd)await cd.detach();await b.close();console.log(`PASS POPUP ANCHOR ${name}: 260% chart, pan positions and ${cd?'native page scales 1–2.5':'mobile viewport'} retain the same stem/glyph centre`);
}})().catch(e=>{console.error(e);process.exit(1)});
