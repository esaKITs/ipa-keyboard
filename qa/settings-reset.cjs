const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=process.env.APP_URL||'http://127.0.0.1:8765/ipa-keyboard/';fs.mkdirSync('qa-production',{recursive:true});
const labels={ja:'設定を初期値に戻す',en:'Reset settings','pt-BR':'Redefinir configurações',fa:'بازنشانی تنظیمات','ja-osaka':'設定を初期値に戻す'};
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{const results=[];for(const[name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch();for(const width of[320,375,393,768,1280]){
  const p=await b.newPage({viewport:{width,height:1000},hasTouch:width<700,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(app);await p.waitForFunction(()=>window.esaPanelGeometry&&document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await p.evaluate(()=>window.esaI18n.ready);
  const phone=width<700,profile=phone?'phone':'desktop',other=phone?'desktop':'phone',size=phone?22:32,baselineWidth=phone?320:440;
  const out=p.locator('#out'),reset=p.locator('#settingsReset'),toggle=p.locator('#settingsToggle');
  assert.equal(await p.locator('#inputPanelReset').count(),0);
  assert.equal(await p.locator('.input-panel-grip > button').last().getAttribute('id'),'contrastToggle');
  // Keep another device's saved geometry and the user's position intact.
  await p.evaluate(({other})=>{localStorage.setItem(`esakits.ipa.input-font.${other}.v1`,'48');localStorage.setItem(`esakits.ipa.panel-width.${other}.v1`,'500');}, {other});
  await p.locator('#inputPanelDrag').focus();await p.keyboard.press('ArrowLeft');const position=await p.evaluate(()=>localStorage.getItem('esakits.ipa.floating-editor.v1'));
  await out.fill('ˈpʰãŋ̊');await toggle.click();await p.locator('#inputSizeSlider').fill('48');await settle(p);
  await p.locator('#panelWidthSlider').fill(String(Math.min(width-16,600)));await p.locator('#glowStrengthSlider').fill('85');await p.locator('[data-ipa-font="andika"]').click();await p.waitForFunction(()=>document.documentElement.dataset.ipaFont==='andika'&&document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await p.locator('#inputColorPicker').fill('#bb3322');await p.locator('#warnToggle').uncheck();
  await p.evaluate(({profile})=>{localStorage.setItem(`esakits.ipa.input-height.${profile}.v1`,'150');localStorage.setItem(`esakits.ipa.input-height-font.${profile}.v1`,'48');window.esaEditorGeometry.apply();},{profile});
  for(const[locale,label]of Object.entries(labels))for(const dark of[false,true]){
   await p.locator('#languageSelect').selectOption(locale);await settle(p);if((await p.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))await p.locator('#contrastToggle').click();
   if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
   assert.equal(await reset.textContent(),label);assert.equal(await reset.getAttribute('aria-label'),label);
   const r=await reset.boundingBox(),s=await p.locator('#settingsPanel').boundingBox();assert(r.x>=s.x&&r.y>=s.y&&r.x+r.width<=s.x+s.width+1&&r.y+r.height<=s.y+s.height+1,'reset inside settings');assert(r.x+r.width<=width&&r.y+r.height<=1000,'reset reachable');
   if(locale==='ja'||(locale==='fa'&&width===393))await p.screenshot({path:`qa-production/reset-${name}-${width}-${locale}-${dark?'dark':'light'}-before.png`});
  }
  // Snapshot through the real input path, then verify Undo/Redo survives reset.
  await out.press('End');await out.press('x');const text=await out.inputValue();await toggle.click();await reset.click();await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await settle(p);
  assert.equal(await out.inputValue(),text);assert.equal(await p.locator('#inputSizeSlider').inputValue(),String(size));assert.equal(await p.locator('#panelWidthSlider').inputValue(),String(Math.min(baselineWidth,Math.floor((width-16)/10)*10)));
  assert.equal(await p.locator('#glowStrengthSlider').inputValue(),'60');assert.equal(await p.locator('#ipaFontSelect').inputValue(),'doulos');assert.equal(await p.locator('#inputColorPicker').inputValue(),'#17365d');assert(await p.locator('#warnToggle').isChecked());assert.equal(await out.evaluate(e=>e.dataset.manualHeight||''),'');assert.equal(await p.locator('#contrastToggle').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#languageSelect').inputValue(),'ja-osaka');
  assert.equal(await p.evaluate(()=>localStorage.getItem('esakits.ipa.floating-editor.v1')),position);
  assert.deepEqual(await p.evaluate(({other})=>['input-font','panel-width'].map(k=>localStorage.getItem(`esakits.ipa.${k}.${other}.v1`)),{other}),['48','500']);
  await p.locator('#undo').click();assert.equal(await out.inputValue(),'ˈpʰãŋ̊');await p.locator('#redo').click();assert.equal(await out.inputValue(),text);
  await toggle.click();await p.screenshot({path:`qa-production/reset-${name}-${width}-after.png`});await p.reload();await p.waitForFunction(()=>document.getElementById('ipaFontSelect').getAttribute('aria-busy')==='false');await settle(p);
  assert.equal(await out.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),size);assert.equal(await p.locator('#ipaFontSelect').inputValue(),'doulos');assert.equal(await p.locator('#inputColorPicker').inputValue(),'#17365d');assert.equal(await p.locator('#glowStrengthSlider').inputValue(),'60');assert(await p.locator('#warnToggle').isChecked());assert.deepEqual(errors,[]);
  results.push({browser:name,width,locales:5,themes:2,reset:'passed',textAndHistory:'preserved',otherDeviceProfile:'preserved'});console.log('PASS SETTINGS RESET',name,width);await p.close();
 }await b.close();}fs.writeFileSync('qa-production/settings-reset-results.json',JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
