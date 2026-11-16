const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';fs.mkdirSync('qa-production',{recursive:true});
async function compact(p,f,label){
 await f.waitForFunction(()=>{const c=document.getElementById('chartScaleContent').getBoundingClientRect(),d=document.querySelector('#chartScaleContent>details').getBoundingClientRect(),end=Math.max(c.bottom,d.bottom),h=frameElement.clientHeight;return h-end>=10&&h-end<=20;},null,{timeout:6000});
 const box=await f.evaluate(()=>{const c=document.getElementById('chartScaleContent').getBoundingClientRect(),d=document.querySelector('#chartScaleContent>details').getBoundingClientRect(),shell=document.getElementById('chartScaleShell').getBoundingClientRect(),r=frameElement.getBoundingClientRect();return{height:frameElement.clientHeight,tail:frameElement.clientHeight-Math.max(c.bottom,d.bottom),clipped:shell.bottom<d.bottom-1,brandGap:parent.document.querySelector('.esakits-bottom').getBoundingClientRect().top-r.top-Math.max(c.bottom,d.bottom)};});
 assert(!box.clipped,'license text stays inside the chart: '+label+' '+JSON.stringify(box));assert(box.brandGap>=10&&box.brandGap<=36,'brand follows the license without a blank area: '+label+' '+JSON.stringify(box));return box;
}
(async()=>{for(const[name,type]of Object.entries({chromium,webkit})){
 const b=await type.launch({headless:true});
 for(const width of[320,390,1280]){
  const p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(app);
  const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.waitForFunction(()=>typeof esaSetLocale==='function');await f.evaluate(()=>document.fonts.ready);
  const baseline=await compact(p,f,'initial');
  for(const locale of['en','pt-BR','fa','ja-osaka','ja']){await p.locator('#languageSelect').selectOption(locale);await compact(p,f,locale);}
  await f.locator('#chartScaleContent>details').evaluate(e=>e.open=true);const expanded=await compact(p,f,'license expanded');assert(expanded.height>baseline.height+40,'opening the license increases frame height');
  await f.locator('#chartScaleContent>details').evaluate(e=>e.open=false);const closed=await compact(p,f,'license closed');assert(Math.abs(closed.height-baseline.height)<2,'closing the license shrinks the frame again');
  await p.screenshot({path:`qa-production/${process.env.PUBLIC_CHECK?'public':'staged'}-${name}-${width}-license-footer.png`,fullPage:true});
  await f.evaluate(()=>{const shell=document.getElementById('chartScaleShell'),r=shell.getBoundingClientRect();function send(type,points){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:points.map(([x,y])=>({clientX:x,clientY:y}))});shell.dispatchEvent(e);}send('touchstart',[[100,r.top+100],[200,r.top+100]]);send('touchmove',[[50,r.top+100],[250,r.top+100]]);send('touchend',[]);});
  await compact(p,f,'inline pinch');
  await f.locator('#chartZoomOpen').evaluate(e=>e.click());await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await f.locator('#zoomClose').click();await compact(p,f,'viewer closed');assert.deepEqual(errors,[]);
  console.log(`PASS FOOTER ${name} ${width}: ${baseline.height}px content-sized frame, ${baseline.tail}px tail; five languages, license open/close, inline pinch and viewer restore`);await p.close();
 }
 await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});
