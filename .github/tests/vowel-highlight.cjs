const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const assert = require('assert/strict');
const vowels = ['i','y','ɨ','ʉ','ɯ','u','ɪ','ʏ','ʊ','e','ø','ɘ','ɵ','ɤ','o','ə','ɛ','œ','ɜ','ɞ','ʌ','ɔ','æ','ɐ','a','ɶ','ɑ','ɒ'];
const dir = path.resolve('test-artifacts');
fs.mkdirSync(dir,{recursive:true});
const baseline = path.join(dir,'baseline-v70.html');
fs.writeFileSync(baseline,cp.execFileSync('git',['show','origin/main:index.html'],{encoding:'utf8'}));
const versions=[['v70',baseline],['v71',path.resolve('index.html')]];
(async()=>{
const browser=await chromium.launch({headless:true});
try{
for(const [version,file] of versions){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+file);
 await page.locator('#vowels').scrollIntoViewIfNeeded();
 assert.equal(await page.locator('#vowels .key[data-sym]').count(),28);
 for(const sym of vowels){
  const btn=page.locator('#vowels .key[data-sym]').filter({hasText:sym}).first();
  const actual=page.locator('#vowels .key[data-sym="'+sym+'"]');
  assert.equal(await actual.count(),1,'missing vowel '+sym);
  await actual.scrollIntoViewIfNeeded();
  await actual.dispatchEvent('touchstart',{bubbles:true,cancelable:true});
  const held=await page.evaluate(()=>{const e=document.querySelector('#vowel-highlight');const r=e.getBoundingClientRect();return {display:getComputedStyle(e).display,width:r.width,height:r.height,border:getComputedStyle(e).borderBottomWidth}});
  assert.equal(held.display,'block',version+' '+sym+' highlight missing on hold');
  assert(held.width>0&&held.height>0,version+' '+sym+' invalid highlight rectangle');
  if(version==='v71')assert.equal(held.border,'1px',version+' '+sym+' bottom border not defined');
  await page.screenshot({path:path.join(dir,version+'-'+encodeURIComponent(sym)+'-held.png')});
  await actual.dispatchEvent('touchend',{bubbles:true,cancelable:true});
  const released=await page.evaluate(()=>getComputedStyle(document.querySelector('#vowel-highlight')).display);
  assert.equal(released,'block',version+' '+sym+' highlight missing on release');
  await page.waitForTimeout(450);
  const gone=await page.evaluate(()=>getComputedStyle(document.querySelector('#vowel-highlight')).display);
  assert.equal(gone,'none',version+' '+sym+' highlight not cleared');
 }
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await page.evaluate(()=>{document.body.style.zoom='1.25'});
 const zoomed=page.locator('#vowels .key[data-sym="ɞ"]');
 await zoomed.scrollIntoViewIfNeeded();
 await zoomed.dispatchEvent('touchstart',{bubbles:true,cancelable:true});
 assert.equal(await page.locator('#vowel-highlight').evaluate(e=>getComputedStyle(e).display),'block',version+' zoom highlight');
 await page.screenshot({path:path.join(dir,version+'-zoom-125.png')});
 await zoomed.dispatchEvent('touchend',{bubbles:true,cancelable:true});
 await page.waitForTimeout(450);
 await page.screenshot({path:path.join(dir,version+'-scroll.png'),fullPage:true});
 assert.deepEqual(errors,[],version+' JavaScript errors');
 console.log('PASS '+version+' all 28 vowels touch hold/release, 420ms, scrolling, JS errors');
 await context.close();
}
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
