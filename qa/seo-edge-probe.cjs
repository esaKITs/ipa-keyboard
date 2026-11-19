const fs=require('node:fs'),{PNG}=require('pngjs');
const source=fs.readFileSync('qa/seo.cjs','utf8');
const h=Function('require',source.slice(0,source.lastIndexOf('\n(async()=>{'))+'\nreturn {chromium,ready,settledChart,geometry,confirmFont};')(require);
const app='https://esakits.github.io/ipa-keyboard/',old=fs.readFileSync('/tmp/ipa-seo-reference/ipa-keyboard/index.html','utf8'),current=fs.readFileSync('index.html','utf8');
function diff(a,b){a=PNG.sync.read(a);b=PNG.sync.read(b);let n=0;for(let i=0;i<a.data.length;i+=4)if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3])n++;return n;}
(async()=>{const results=[];
 for(let trial=0;trial<3;trial++)for(const[width,locale,dark,expanded]of[[320,'ja',false,false],[320,'en',true,true],[375,'ja',false,false]])for(const kind of ['same-current-source','SEO','original-SEO']){
 const contexts=[],browsers=[],shots=[],layouts=[],r={trial,width,locale,dark,expanded,kind};
 try{for(let i=0;i<2;i++){
 const browser=await h.chromium.launch();browsers.push(browser);const c=await browser.newContext({viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'});contexts.push(c);
 if(i===0&&kind!=='original-SEO')await c.route(app,route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:kind==='SEO'?old:current}));
 const p=await c.newPage(),f=await h.ready(p,i===0&&kind==='original-SEO'?'http://127.0.0.1:8772/ipa-keyboard/':app,locale,dark);
 if(expanded){await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await h.confirmFont(p,f);}
 await p.bringToFront();await h.settledChart(p,f);layouts.push(await h.geometry(p,f));shots.push(await p.screenshot({path:`qa-production/origin-${trial}-${width}-${locale}-${kind}-${i}.png`,fullPage:true,caret:'hide'}));
 }r.geometryEqual=JSON.stringify(layouts[0])===JSON.stringify(layouts[1]);r.changedPixels=diff(shots[0],shots[1]);results.push(r);console.log('ORIGIN_CONTROL '+JSON.stringify(r));
 }finally{for(const c of contexts)await c.close();for(const b of browsers)await b.close();}
 }fs.writeFileSync('qa-production/origin-probe-results.json',JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
