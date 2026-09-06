// Browser regression tests. Uses the already-installed local Puppeteer and
// Chrome; no production account, API, camera, or analytics service is used.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startHarness } from './first-review-sample-harness.mjs';

// Puppeteer is optional tooling, not a declared dependency: a clean checkout
// without it skips this file instead of failing the run.
let puppeteer = null;
try { ({ default: puppeteer } = await import('puppeteer')); } catch { /* not installed */ }

let harness;
let browser;
let page;
const errors = [];
before(async () => {
  if (!puppeteer) return; // cases skip themselves below
  harness = await startHarness();
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(harness.url) ? request.continue() : request.abort());
});
after(async () => { await browser?.close(); await harness?.close(); });

// Each case skips (not fails) when the optional browser tooling is absent.
const btest = (name, fn) => test(name, async (t) => (puppeteer ? fn(t) : t.skip('puppeteer not installed')));

async function fresh() {
  errors.length = 0;
  await page.goto(harness.url);
  await page.waitForFunction(() => window.__events.some(e => e.event === 'first_review_offer_shown'));
}
async function click(text) {
  const button = await page.waitForFunction(label => [...document.querySelectorAll('button')].find(b => b.textContent.includes(label) && b.getClientRects().length), {}, text);
  await button.asElement().click();
  await button.dispose();
}
async function openSample() {
  await click('See what a review looks like');
  await page.waitForSelector('[role="dialog"]');
  await page.waitForFunction(() => window.__events.some(e => e.event === 'first_review_sample_viewed'));
}
async function eventNames() { return page.evaluate(() => window.__events.map(e => e.event)); }

btest('sample is reachable only on the offer; closing preserves selection, progress and funnel', async () => {
  await fresh();
  await click('I have my own tape or sides');
  await openSample();
  assert.match(await page.$eval('[role="dialog"]', el => el.textContent), /Joseph, here’s how a review reads/);
  assert.equal(await page.evaluate(() => window.__modalCount), 2);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '← Back to the free review offer');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Upload my own tape/);
  await page.keyboard.press('Tab');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Back to the free review offer/);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.waitForFunction(() => document.activeElement.textContent === 'See what a review looks like');
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_step_v3')), '1');
  assert.equal(await page.evaluate(() => window.__modalCount), 1);
  assert.deepEqual(await eventNames(), ['first_review_offer_shown', 'first_review_sample_viewed']);
  assert.equal(await page.evaluate(() => window.__consentCalls), 0);
  assert.deepEqual(await page.evaluate(() => window.__handoffs), []);
  await click('Get my free review');
  await page.waitForFunction(() => window.__handoffs.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__handoffs), ['upload']);
  assert.ok(!(await eventNames()).includes('first_review_started'));

  await fresh();
  await openSample();
  await click('Back to the free review offer');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await click('Not now');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === '2');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('See what a review looks like'))), false);
  assert.ok((await eventNames()).includes('first_review_skipped'));
  await page.evaluate(() => window.mountOffer(0));
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].some(b => b.textContent.includes('Not now')));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('See what a review looks like'))), false);
  assert.deepEqual(errors, []);
});

for (const variant of ['record', 'upload']) {
  btest(`sample ${variant} CTA uses the original consent and first-review handoff exactly once`, async () => {
    await fresh();
    await openSample();
    await page.evaluate(() => { window.__holdConsent = true; });
    await click(variant === 'record' ? 'Record the practice scene' : 'Upload my own tape');
    await page.waitForFunction(() => window.__consentCalls === 1);
    assert.equal(await page.$$eval('[role="dialog"] button', buttons => buttons.every(b => b.disabled)), true);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('dst_first_review')), null);
    await page.evaluate(() => window.__resolveConsent(true));
    await page.waitForFunction(() => window.__handoffs.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__handoffs), [variant]);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('dst_first_review')), '1');
    const events = await page.evaluate(() => window.__events);
    assert.deepEqual(events.map(e => e.event), ['first_review_offer_shown', 'first_review_sample_viewed', 'first_review_sample_cta', 'first_review_offer_tapped']);
    assert.deepEqual(events.slice(-2).map(e => e.props.variant), [variant, variant]);
    assert.equal(await page.evaluate(() => localStorage.getItem('dst_personal_bests')), null);
    assert.deepEqual(errors, []);
  });
}

btest('sample consent decline keeps the existing decline event and next onboarding step', async () => {
  await fresh();
  await openSample();
  await page.evaluate(() => { window.__consent = false; });
  await click('Record the practice scene');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === '2');
  assert.deepEqual(await page.evaluate(() => window.__handoffs), []);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('dst_first_review')), null);
  const events = await eventNames();
  assert.ok(events.includes('first_review_consent_declined'));
  assert.ok(!events.includes('first_review_skipped'));
  assert.ok(!events.includes('first_review_started'));
  assert.deepEqual(errors, []);
});

btest('reopening the sample records another view without repeating offer_shown', async () => {
  await fresh();
  await openSample();
  await click('Back to the free review offer');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await openSample();
  await page.waitForFunction(() => window.__events.length === 3);
  assert.deepEqual(await eventNames(), ['first_review_offer_shown', 'first_review_sample_viewed', 'first_review_sample_viewed']);
  assert.deepEqual(errors, []);
});
