const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');fs.mkdirSync('qa-production',{recursive:true});
(async()=>{for(const[name,type]of Object.entries({chromium,webkit}))for(const width of [390,1280]){
 const b=await type.launch({headless:true}),p=await b.newPage({serviceWorkers:'block',viewport:{width,height:844},hasTouch:true});p.setDefaultTimeout(8000);
 const url=(process.env.TEST_BASE||'http://127.0.0.1:8765/')+'ipa-keyboard/';await p.goto(url);let f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.locator('.v83-ipa-key').first().waitFor();
 await p.locator('#settingsToggle').click();const slider=p.locator('#glowStrengthSlider');assert.equal(await slider.inputValue(),'60');assert.equal(await p.locator('#glowStrengthValue').textContent(),'60%');
 async function set(v){await slider.fill(String(v));assert.equal(await p.locator('#glowStrengthValue').textContent(),v+'%');assert.equal(await slider.getAttribute('aria-valuetext'),v+'%');}
 async function press(id,strength){
  const key=f.locator('#'+id+' .v83-ipa-key').first();await key.scrollIntoViewIfNeeded();await key.focus();const before=await p.locator('#out').inputValue();await p.keyboard.down('Space');
  await f.locator('.v83-purple-flash').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  const bg=await f.locator('.v83-purple-flash').evaluate(e=>getComputedStyle(e).backgroundImage),stops=[...bg.matchAll(/rgba?\(([^)]+)\)/g)].map(m=>{const a=m[1].split(',');return a.length===4?Number(a[3]):1;});
  assert(stops.length>=6,bg);assert(Math.abs(stops[0]-strength/100)<.001,bg);if(strength===0)assert(stops.every(a=>a===0),'zero hides the whole glow');
  await p.keyboard.up('Space');await p.waitForTimeout(350);assert.notEqual(await p.locator('#out').inputValue(),before,'IPA still enters at every intensity');
  const dot=await f.evaluate(()=>__v839DotState());const alpha=Number(dot.background.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1]??1);assert(Math.abs(alpha-strength/100*.75)<.001,JSON.stringify(dot));
 }
 await press('vowels',60);await set(100);await press('vowels',100);await set(0);
 for(const id of ['pulmonicConsonants','nonPulmonicConsonants','vowels','otherSymbols','diacritics','suprasegmentals','tonesAndWordAccents'])await press(id,0);
 await set(35);await press('vowels',35);await p.locator('#contrastToggle').evaluate(e=>e.click());await press('vowels',35);assert((await f.evaluate(()=>__v839DotState().background)).includes('255, 190, 128'));assert.equal(await p.locator('.glow-setting-row').evaluate(e=>getComputedStyle(e).color),'rgb(34, 34, 34)','settings text stays legible through dark-mode inversion');
 // Changes reach an already selected symbol immediately.
 await set(80);assert((await f.evaluate(()=>__v839DotState().background)).endsWith('0.6)'));
 const svg=await f.locator('#vowelQuadrilateral').evaluate(e=>e.outerHTML),panel=await p.locator('#floatingEditor').evaluate(e=>e.getBoundingClientRect().width);await set(50);assert.equal(await f.locator('#vowelQuadrilateral').evaluate(e=>e.outerHTML),svg);assert.equal(await p.locator('#floatingEditor').evaluate(e=>e.getBoundingClientRect().width),panel);
 for(const[lang,label]of [['en','Glow strength'],['pt-BR','Intensidade do brilho'],['fa','شدت درخشش'],['ja-osaka','光の濃さ'],['ja','光の濃さ']]){await p.locator('#languageSelect').selectOption(lang);assert.equal(await p.locator('.glow-setting-row .setting-label').textContent(),label);assert.equal(await slider.inputValue(),'50');}
 await p.screenshot({path:`qa-production/${name}-${width}-glow-settings.png`});await p.reload();f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.locator('.v83-ipa-key').first().waitFor();assert.equal(await slider.inputValue(),'50');assert.equal(await f.locator('html').evaluate(e=>e.style.getPropertyValue('--feedback-strength')),'0.5');
 await p.locator('#settingsToggle').click();await set(0);await p.reload();f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.locator('.v83-ipa-key').first().waitFor();assert.equal(await slider.inputValue(),'0');await press('vowels',0);
 await p.evaluate(()=>localStorage.setItem('esakits.ipa.glow-strength.v1','bad'));await p.reload();assert.equal(await slider.inputValue(),'60','invalid stored preference falls back safely');
 console.log(`PASS INTENSITY ${name} ${width}: stronger default 60%, 0/35/50/80/100%, no glow at zero across all sections, live selected dot, both themes, saved zero/nonzero, translations, independent layout`);await b.close();
}})().catch(e=>{console.error(e);process.exit(1)});

