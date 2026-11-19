const fs=require('node:fs'),{PNG}=require('pngjs');
const source=fs.readFileSync('qa/seo.cjs','utf8');
const h=Function('require',source.slice(0,source.lastIndexOf('\n(async()=>{'))+'\nreturn {chromium,ready,settledChart,geometry,confirmFont};')(require);
function diff(a,b){a=PNG.sync.read(a);b=PNG.sync.read(b);let n=0,points=[];for(let i=0;i<a.data.length;i+=4)if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3]){n++;if(points.length<20)points.push({x:i/4%a.width,y:Math.floor(i/4/a.width),a:[...a.data.slice(i,i+4)],b:[...b.data.slice(i,i+4)]});}return{n,points};}
(async()=>{const results=[];
 for(const mode of ['default','cpu']){const browser=await h.chromium.launch(mode==='cpu'?{args:['--disable-gpu','--disable-gpu-compositing']}:{});
  for(let trial=0;trial<3;trial++)for(const [width,locale,dark,expanded] of [[320,'ja',false,false],[320,'en',true,true],[375,'ja',false,false]])for(const kind of ['AA','SEO']){
   const contexts=[],shots=[],geometries=[],r={mode,trial,width,locale,dark,expanded,kind,temporal:[]};
   try{for(let i=0;i<2;i++){
    const c=await browser.newContext({viewport:{width,height:844},hasTouch:true,serviceWorkers:'block'});contexts.push(c);const p=await c.newPage();const url=i&&kind==='SEO'?'https://esakits.github.io/ipa-keyboard/':'http://127.0.0.1:8772/ipa-keyboard/';const f=await h.ready(p,url,locale,dark);
    if(expanded){await p.locator('#chartZoomToggle').click();await f.waitForFunction(()=>document.getElementById('chartZoomDialog').dataset.ready==='true');await h.confirmFont(p,f);}
    await p.bringToFront();await h.settledChart(p,f);geometries.push(await h.geometry(p,f));const s=[];
    for(let j=0;j<3;j++)s.push(await p.screenshot({path:`qa-production/edge-${mode}-${trial}-${width}-${locale}-${kind}-${i}-${j}.png`,fullPage:true,caret:'hide'}));
    shots.push(s);r.temporal.push([diff(s[0],s[1]).n,diff(s[1],s[2]).n]);
   }
   r.geometryEqual=JSON.stringify(geometries[0])===JSON.stringify(geometries[1]);r.cross=shots[0].map((s,j)=>diff(s,shots[1][j]));results.push(r);console.log('EDGE_CONTROL '+JSON.stringify(r));
   }finally{for(const c of contexts)await c.close();}
  }await browser.close();
 }fs.writeFileSync('qa-production/edge-probe-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
