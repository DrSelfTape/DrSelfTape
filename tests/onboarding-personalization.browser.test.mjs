import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startHarness } from './first-review-sample-harness.mjs';

let puppeteer;
try { ({ default: puppeteer } = await import('puppeteer')); } catch { /* optional local tool */ }
let harness, browser, page;
const errors = [];
before(async () => {
  if (!puppeteer) return;
  harness = await startHarness();
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(harness.url) ? request.continue() : request.abort());
});
after(async () => { await browser?.close(); await harness?.close(); });
const btest = (name, fn) => test(name, t => puppeteer ? fn(t) : t.skip('puppeteer not installed'));

async function click(label) {
  const handle = await page.waitForFunction(text => [...document.querySelectorAll('button')].find(b => b.textContent === text && b.getClientRects().length), {}, label);
  await handle.asElement().click();
  await handle.dispose();
}
async function identity() {
  await page.goto(harness.url);
  await page.evaluate(() => window.mountOffer(0));
  await page.waitForSelector('fieldset');
}
async function offered() {
  await page.waitForFunction(() => window.__events.some(e => e.event === 'first_review_offer_shown'));
}

btest('two optional questions share identity; selecting answers persists and personalizes before the unchanged offer handoff', async () => {
  await identity();
  assert.deepEqual(await page.$$eval('legend', els => els.map(el => el.textContent)), ["What's on your plate?", 'Taped before?']);
  assert.equal(await page.$$eval('input', els => els.every(el => el.readOnly)), true);
  await click('Auditioning now');
  await click('First time');
  await click('Continue');
  await offered();
  assert.match(await page.$eval('h1', el => el.textContent), /before you send your audition/);
  assert.match(await page.$eval('p', el => el.textContent), /a rough take is welcome/);
  const writes = await page.evaluate(() => window.__profileWrites);
  assert.deepEqual(JSON.parse(writes[0].onboarding_personalization), { plate: 'auditioning_now', taped_before: 'first_time' });
  const events = await page.evaluate(() => window.__events);
  assert.deepEqual(events.map(e => e.event), ['onboarding_personalized', 'first_review_offer_shown']);
  assert.deepEqual(events[0].props.$set, { onboarding_plate: 'auditioning_now', onboarding_taped_before: 'first_time' });
  await click('Get my free review →');
  await page.waitForFunction(() => window.__handoffs.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__handoffs), ['record']);
  assert.deepEqual(await page.evaluate(() => window.__events.filter(e => e.event.startsWith('first_review_')).map(e => e.event)), ['first_review_offer_shown', 'first_review_offer_tapped']);
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_step_v3')), null);
});

btest('skip clears selected answers, reaches the generic offer, and preserves the three-screen flow', async () => {
  await identity();
  await click('Between jobs');
  await click('Yes');
  await click('Skip these questions');
  await offered();
  assert.equal(await page.$eval('h1', el => el.textContent), 'Get casting notes on any take. Free.');
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_step_v3')), '1');
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[0].onboarding_personalization)), { plate: '', taped_before: '' });
  await click('Not now');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === '2');
  assert.match(await page.$eval('h1', el => el.textContent), /miss\s*a callback/);
  // Identity (0), offer (1), notifications (2): the next action completes.
  await click('Continue');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === null);
});

btest('continue requires no answers; one answer and deselection work', async () => {
  await identity();
  await click('Continue');
  await offered();
  assert.equal(await page.$eval('h1', el => el.textContent), 'Get casting notes on any take. Free.');
  await identity();
  await click('Building my reel');
  await click('Yes');
  await click('Yes');
  assert.equal(await page.$$eval('[aria-pressed="true"]', els => els.length), 1);
  await click('Continue');
  await offered();
  assert.match(await page.$eval('h1', el => el.textContent), /reel take/);
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[0].onboarding_personalization)), { plate: 'building_reel', taped_before: '' });
});

btest('the full-setup escape saves entered context while still closing immediately', async () => {
  await identity();
  await click('Between jobs');
  await click('SKIP');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === null);
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[0].onboarding_personalization)), { plate: 'between_jobs', taped_before: '' });
  assert.ok(!(await page.evaluate(() => window.__events.map(e => e.event))).includes('first_review_offer_shown'));
});

btest('slow answer persistence never blocks recording and completes before the final name PATCH', async () => {
  await identity();
  await page.evaluate(() => { window.__holdProfileWrite = true; });
  await click('Auditioning now');
  await click('Continue');
  await offered();
  await click('Get my free review →');
  await page.waitForFunction(() => window.__handoffs.length === 1);
  assert.equal(await page.evaluate(() => window.__profileWrites.length), 1);
  assert.deepEqual(await page.evaluate(() => window.__handoffs), ['record']);
  await page.evaluate(() => { window.__holdProfileWrite = false; window.__resolveProfileWrite({}); });
  await page.waitForFunction(() => window.__profileWrites.length === 2);
  assert.equal(await page.evaluate(() => window.__profileWrites[1].first_name), 'Joseph');
});

btest('resume uses this account’s draft and rejects another account’s answers', async () => {
  await identity();
  await click('Between jobs');
  await click('Yes');
  await page.evaluate(() => window.resumeOnboarding());
  await page.waitForFunction(() => document.querySelectorAll('[aria-pressed="true"]').length === 2);
  await page.evaluate(() => { window.__userId = 99; window.resumeOnboarding(); });
  await page.waitForFunction(() => document.querySelectorAll('[aria-pressed="true"]').length === 0);
  await click('Continue');
  await offered();
  assert.equal(await page.$eval('h1', el => el.textContent), 'Get casting notes on any take. Free.');
});

btest('an existing profile seeds answers on another device', async () => {
  await page.goto(harness.url);
  await page.evaluate(() => {
    window.__profile = { id: 42, onboarding_personalization: { plate: 'between_jobs', taped_before: 'yes' } };
    window.mountOffer(0);
  });
  await page.waitForFunction(() => document.querySelectorAll('[aria-pressed="true"]').length === 2);
  await click('Continue');
  await offered();
  assert.match(await page.$eval('h1', el => el.textContent), /Keep your acting in practice/);
  assert.deepEqual(errors, []);
});

btest('flag-off keeps three steps and a terminal offer that can be skipped', async () => {
  const fallback = await startHarness(0, { firstReviewFlow: false });
  const tab = await browser.newPage();
  try {
    await tab.goto(fallback.url);
    await tab.evaluate(() => window.mountOffer(0));
    await tab.waitForSelector('fieldset');
    await tab.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Continue').click());
    await tab.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === '1');
    assert.match(await tab.$eval('h1', el => el.textContent), /callback/);
    await tab.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Continue').click());
    await tab.waitForFunction(() => window.__events.some(e => e.event === 'first_review_offer_shown'));
    assert.equal(await tab.evaluate(() => localStorage.getItem('dst_onb_step_v3')), '2');
    await tab.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Not now').click());
    await tab.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === null);
  } finally {
    await tab.close();
    await fallback.close();
  }
});
