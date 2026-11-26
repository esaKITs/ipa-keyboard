'use strict';

const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = process.env.APP_URL || 'http://127.0.0.1:8765/ipa-keyboard/';
const output = 'qa-production/phase3';
fs.mkdirSync(output, {recursive: true});

async function settle(page) {
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function inspect(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const name = header.querySelector('.title-name');
    const subtitle = header.querySelector('.title-subtitle');
    const rect = element => {
      const r = element.getBoundingClientRect();
      return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom};
    };
    const controls = [...header.children].map(element => ({
      tag: element.className || element.id,
      rect: rect(element)
    }));
    return {
      name:name.textContent, subtitle:subtitle.textContent,
      titleRect:rect(name), subtitleRect:rect(subtitle), headerRect:rect(header),
      nameSize:parseFloat(getComputedStyle(name).fontSize),
      subtitleSize:parseFloat(getComputedStyle(subtitle).fontSize),
      subtitleColor:getComputedStyle(subtitle).color,
      controls, width:innerWidth, overflow:header.scrollWidth > header.clientWidth + 1,
      controlsHit:['chartZoomToggle','zoomMapToggle'].map(id => {
        const element = document.getElementById(id);
        const r = element.getBoundingClientRect();
        const target = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return target===element || element.contains(target);
      })
    };
  });
}

function validate(state) {
  assert.equal(state.name, 'IPA Keyboard');
  assert.equal(state.subtitle, 'Designed for Touch');
  assert(state.subtitleSize < state.nameSize);
  assert(state.subtitleRect.y >= state.titleRect.bottom - 0.5, 'subtitle below title');
  assert(state.subtitleRect.bottom <= state.headerRect.bottom + 0.5, 'subtitle inside header');
  assert(!state.overflow, 'header fits viewport');
  assert(state.controlsHit.every(Boolean), 'header icons receive pointer input');
  for (const item of state.controls) {
    assert(item.rect.x >= -0.5 && item.rect.right <= state.width+0.5,
      'header item within viewport '+JSON.stringify(item));
  }
  for (let i=0;i<state.controls.length;i++) {
    for (let j=i+1;j<state.controls.length;j++) {
      const a=state.controls[i].rect, b=state.controls[j].rect;
      const intersectionWidth=Math.min(a.right,b.right)-Math.max(a.x,b.x);
      const intersectionHeight=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);
      assert(intersectionWidth<=0.5 || intersectionHeight<=0.5, 'header items do not overlap');
    }
  }
}

(async () => {
  const results=[], failures=[];
  for (const [engineName, engine] of Object.entries({chromium, webkit})) {
    const browser=await engine.launch();
    for (const width of [320,375,393,768,1280]) {
      const page=await browser.newPage({
        viewport:{width,height:844}, hasTouch:width<600, serviceWorkers:'block'
      });
      const errors=[];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(app);
        const frame=await (await page.locator('#v83ChartFrame').elementHandle()).contentFrame();
        await page.waitForFunction(() => document.getElementById('zoomMapToggle') &&
          !document.getElementById('chartZoomToggle').disabled);
        await page.evaluate(() => document.fonts.ready);
        await frame.waitForFunction(() => window.__ipaLineAudit?.rules.length===7);
        for (const locale of ['ja','en','pt-BR','fa','ja-osaka']) {
          await page.locator('#languageSelect').selectOption(locale);
          for (const dark of [false,true]) {
            if ((await page.locator('#contrastToggle').getAttribute('aria-pressed'))!==String(dark))
              await page.locator('#contrastToggle').click();
            await settle(page);
            const normal=await inspect(page);
            validate(normal);
            await page.locator('.app-header').screenshot({
              path:output+'/'+engineName+'-'+width+'-'+locale+'-'+(dark?'dark':'light')+'.png'
            });
            await page.locator('#chartZoomToggle').click();
            await frame.waitForFunction(() => document.getElementById('chartZoomDialog').dataset.ready==='true');
            await settle(page);
            const expanded=await inspect(page);
            validate(expanded);
            assert.deepEqual(expanded.controls, normal.controls, 'stable controls during expansion');
            if (locale==='ja' && [393,1280].includes(width))
              await page.screenshot({path:output+'/'+engineName+'-'+width+'-'+(dark?'dark':'light')+'-expanded.png'});
            await page.locator('#zoomMapToggle').click();
            assert.equal(await page.locator('#zoomMapToggle').getAttribute('aria-pressed'),'true');
            await page.locator('#zoomMapToggle').click();
            assert.equal(await page.locator('#zoomMapToggle').getAttribute('aria-pressed'),'false');
            await page.locator('#chartZoomToggle').click();
            await frame.waitForFunction(() => document.getElementById('chartZoomDialog').hidden);
            await settle(page);
            assert.deepEqual((await inspect(page)).controls, normal.controls, 'restored header');
            results.push({engine:engineName,width,locale,dark,normal,expanded});
          }
        }
        await page.locator('#out').fill('');
        const key=frame.locator('#pulmonicConsonants [data-v83-sym="p"]').first();
        await key.focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#out').inputValue(),'p');
        await page.locator('#undo').click();
        assert.equal(await page.locator('#out').inputValue(),'');
        await page.locator('#redo').click();
        assert.equal(await page.locator('#out').inputValue(),'p');
        assert.deepEqual(errors,[]);
        console.log('PASS TITLE',engineName,width);
      } catch (error) {
        failures.push({engine:engineName,width,error:error.message,stack:error.stack,errors});
        await page.screenshot({path:output+'/FAIL-'+engineName+'-'+width+'.png'});
        console.error('FAIL TITLE',failures.at(-1));
      } finally {
        await page.close();
      }
    }
    await browser.close();
  }
  fs.writeFileSync(output+'/results.json',JSON.stringify({results,failures},null,2));
  assert.deepEqual(failures,[]);
})().catch(error => { console.error(error); process.exit(1); });
