import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {startConsentHarness} from './consent-recovery-harness.mjs';
import {launchBrowser} from './browser.mjs';
let h,browser,page;
before(async()=>{h=await startConsentHarness();browser=await launchBrowser();page=await browser.newPage();await page.setViewport({width:375,height:812});await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(h.url)?r.continue():r.abort());});
after(async()=>{await browser?.close();await h?.close();});
async function fresh(){await page.goto(h.url);await page.waitForSelector('aside button');}
async function click(text){const el=await page.waitForFunction(t=>[...document.querySelectorAll('button')].find(b=>b.textContent===t),{},text);await el.asElement().click();await el.dispose();}
async function closed(){await page.waitForSelector('[role="dialog"]',{hidden:true});}

test('two simultaneous requests settle on decline; reopening and accepting posts once',async()=>{
  await fresh();await click('Open twice');await page.waitForSelector('[role="dialog"]');
  await click('Decline');await closed();assert.deepEqual(await page.evaluate(()=>window.__answers),[false,false]);
  await click('Open twice');await click('I Agree & Continue');await closed();
  assert.deepEqual(await page.evaluate(()=>window.__answers),[false,false,true,true]);
  assert.deepEqual(await page.evaluate(()=>window.__calls),['POST']);
  await click('Open consent');assert.deepEqual(await page.evaluate(()=>window.__answers),[false,false,true,true,true]);
  assert.equal(await page.$('[role="dialog"]'),null);
});
test('Escape and Back decline, preserve focus, and never post consent',async()=>{
  await fresh();await click('Open consent');await page.waitForSelector('[role="dialog"]');
  await page.keyboard.press('Escape');await closed();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Open consent');
  await click('Open consent');await page.waitForSelector('[role="dialog"]');
  const consumed=await page.evaluate(()=>!window.dispatchEvent(new CustomEvent('drst-back',{cancelable:true})));
  assert.equal(consumed,true);await closed();assert.deepEqual(await page.evaluate(()=>window.__answers),[false,false]);
  assert.deepEqual(await page.evaluate(()=>window.__calls),[]);
});
test('server-required recovery bypasses stale local grant; revoke is acknowledged and can be re-enabled',async()=>{
  await fresh();await click('Open consent');await click('I Agree & Continue');await closed();
  await click('Server requires consent');await page.waitForSelector('[role="dialog"]');
  assert.equal(await page.evaluate(()=>window.__store.getState().auth.user.ai_consent_accepted_at),null);
  await click('Decline');await closed();await click('Review AI consent');await click('I Agree & Continue');await closed();
  await click('Turn off AI consent');await page.waitForFunction(()=>document.body.textContent.includes('AI consent is off.'));
  assert.deepEqual(await page.evaluate(()=>window.__calls),['POST','POST','DELETE']);
});
test('failed save stays in modal; repeated taps during save cannot post twice; account switch cancels pending answer',async()=>{
  await fresh();await page.evaluate(()=>{window.__fail=true;});await click('Open consent');await click('I Agree & Continue');
  await page.waitForFunction(()=>document.body.textContent.includes('Could not record consent'));
  assert.deepEqual(await page.evaluate(()=>window.__answers),[]);
  await page.evaluate(()=>{window.__fail=false;window.__hold=true;});await click('I Agree & Continue');
  await page.waitForFunction(()=>document.body.textContent.includes('Saving…'));
  await page.evaluate(()=>{document.querySelector('[role="dialog"] button:last-child').click();window.__store.dispatch({type:'switch',payload:{id:99}});});
  await closed();await page.evaluate(()=>window.__release());
  assert.deepEqual(await page.evaluate(()=>window.__answers),[false]);
  assert.equal(await page.evaluate(()=>window.__store.getState().auth.user.ai_consent_accepted_at),undefined);
  assert.deepEqual(await page.evaluate(()=>window.__calls),['POST','POST']);
});
test('failed revoke retains granted state; delivery labels and degraded notice are truthful',async()=>{
  await fresh();await click('Open consent');await click('I Agree & Continue');await closed();
  await page.evaluate(()=>{window.__fail=true;});await click('Turn off AI consent');
  await page.waitForSelector('[role="alert"]');assert.ok(await page.evaluate(()=>window.__store.getState().auth.user.ai_consent_accepted_at));
  assert.equal(await page.$eval('[aria-label="Tape without notes"] button',e=>e.textContent.trim()),'Watch your tape');
  assert.equal(await page.$eval('[aria-label="Tape with notes"] button',e=>e.textContent.trim()),'Watch your tape & notes');
  assert.match(await page.$eval('[role="status"]',e=>e.textContent),/backup AI/);
});
