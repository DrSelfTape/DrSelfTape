import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startHarness } from './first-review-sample-harness.mjs';
import { execFileSync } from 'node:child_process';

let puppeteer;
try { ({ default: puppeteer } = await import('puppeteer')); } catch { /* optional local tool */ }
let harness, browser, page;
const errors = [];
before(async () => {
  if (!puppeteer) return;
  harness = await startHarness();
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  page.setDefaultTimeout(2000);
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

btest('the full-setup escape saves entered context and omits answers not loaded yet', async () => {
  await identity();
  await click('Between jobs');
  await click('SKIP');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === null);
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[0].onboarding_personalization)), { plate: 'between_jobs' });
  assert.ok(!(await page.evaluate(() => window.__events.map(e => e.event))).includes('first_review_offer_shown'));
});

btest('a pending personalization PATCH settles before the offer or consent can open', async () => {
  await identity();
  await page.evaluate(() => { window.__holdProfileWrite = true; });
  await click('Auditioning now');
  await click('Continue');
  await page.waitForFunction(() => window.__profileWrites.length === 1);
  assert.equal(await page.evaluate(() => window.__consentCalls), 0);
  assert.equal(await page.evaluate(() => window.__events.some(e => e.event === 'first_review_offer_shown')), false);
  await page.evaluate(() => { window.__holdProfileWrite = false; window.__resolveProfileWrite({}); });
  await offered();
  await click('Get my free review →');
  await page.waitForFunction(() => window.__handoffs.length === 1);
  assert.deepEqual(await page.evaluate(() => window.__handoffs), ['record']);
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
    await tab.waitForSelector('input');
    assert.equal(await tab.$('fieldset'), null);
    assert.ok(!(await tab.$eval('body', el => el.textContent)).includes('Skip these questions'));
    for (const label of ['SAG-AFTRA', 'she/her']) {
      await tab.evaluate(text => [...document.querySelectorAll('button')].find(b => b.textContent === text).click(), label);
    }
    await tab.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Continue').click());
    await tab.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === '1');
    assert.match(await tab.$eval('h1', el => el.textContent), /callback/);
    await tab.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Continue').click());
    await tab.waitForFunction(() => window.__events.some(e => e.event === 'first_review_offer_shown'));
    assert.equal(await tab.evaluate(() => localStorage.getItem('dst_onb_step_v3')), '2');
    assert.equal(await tab.$eval('h1', el => el.innerHTML), 'Get casting notes<br>on any take. Free.');
    assert.deepEqual(await tab.evaluate(() => window.__profileWrites), []);
    await tab.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Not now').click());
    await tab.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === null);
    await tab.waitForFunction(() => window.__profileWrites.length === 1);
    assert.equal(await tab.evaluate(() => window.__profileWrites[0].union_status), 'SAG-AFTRA');
    assert.equal(await tab.evaluate(() => window.__profileWrites[0].pronouns), 'she/her');
    assert.equal(await tab.evaluate(() => 'onboarding_personalization' in window.__profileWrites[0]), false);
    assert.equal(await tab.evaluate(() => window.__events.some(e => e.event === 'onboarding_personalized')), false);
  } finally {
    await tab.close();
    await fallback.close();
  }
});

btest('identity retains the original union and pronoun chips before the new questions', async () => {
  await identity();
  await click('SAG-AFTRA');
  await click('they/them');
  assert.match(await page.$eval('body', el => el.textContent), /UNION STATUS.*PRONOUNS.*What's on your plate\?/s);
  await click('Continue');
  await offered();
  await click('Get my free review →');
  await page.waitForFunction(() => window.__profileWrites.some(w => w.union_status === 'SAG-AFTRA' && w.pronouns === 'they/them'));
});

btest('an account switch during a pending save prevents deferred writes without aborting the request', async () => {
  await identity();
  await page.evaluate(() => { window.__holdProfileWrite = true; });
  await click('Between jobs');
  await click('SKIP');
  await page.waitForFunction(() => window.__profileWrites.length === 1);
  await page.evaluate(() => {
    window.unmountOnboarding();
    window.updateAccountState({ __userId: null, __token: null });
    window.updateAccountState({ __userId: 99, __token: 'session-b' });
    window.__holdProfileWrite = false;
    window.__resolveProfileWrite({});
  });
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));
  assert.equal(await page.evaluate(() => window.__profileWrites.length), 1);
  assert.equal(await page.evaluate(() => window.__settingsWrites.length), 0);
  assert.equal(await page.evaluate(() => window.__abortedWrites), 0);
});

btest('late matching profile hydrates untouched answers without replacing an edited answer', async () => {
  await identity();
  await click('Building my reel');
  await page.evaluate(() => window.updateAccountState({__profile: {id: 42, onboarding_personalization: {plate: 'between_jobs', taped_before: 'yes'}}}));
  await page.waitForFunction(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Yes')?.getAttribute('aria-pressed') === 'true');
  await click('Continue');
  await offered();
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[0].onboarding_personalization)), {plate: 'building_reel', taped_before: 'yes'});
});

btest('failed answers retry on completion and remain resumable until acknowledged', async () => {
  await identity();
  await page.evaluate(() => { window.__failProfileWrite = true; });
  await click('Between jobs');
  await click('Yes');
  await click('Continue');
  await offered();
  await click('Not now');
  await click('Continue');
  await page.waitForFunction(() => window.__profileWrites.length >= 2);
  assert.ok(await page.evaluate(() => localStorage.getItem('dst_onb_data')));
  assert.equal(await page.evaluate(() => window.__settingsWrites.length), 0);
  const attempts = await page.evaluate(() => window.__profileWrites.length);
  await page.evaluate(() => { window.__failProfileWrite = false; window.resumeOnboarding(); });
  await page.waitForFunction(count => window.__profileWrites.length > count, {}, attempts);
  await click('Continue');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_data') === null);
  assert.ok(await page.evaluate(() => window.__settingsWrites.length > 0));
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites.findLast(w => w.onboarding_personalization).onboarding_personalization)), {plate: 'between_jobs', taped_before: 'yes'});
});

btest('completion retries a rejected identity save successfully before clearing the draft', async () => {
  await identity();
  await page.evaluate(() => { window.__failProfileWrite = true; });
  await click('Auditioning now');
  await click('Continue');
  await offered();
  await page.evaluate(() => { window.__failProfileWrite = false; });
  await click('Get my free review →');
  await page.waitForFunction(() => window.__handoffs.length === 1);
  assert.equal(await page.evaluate(() => window.__profileWrites.filter(w => w.onboarding_personalization).length), 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_data')), null);
});

btest('resuming on the offer retries pending answers before accepting consent', async () => {
  await identity();
  await page.evaluate(() => { window.__failProfileWrite = true; });
  await click('Between jobs');
  await click('Continue');
  await offered();
  await page.evaluate(() => { window.__failProfileWrite = false; window.__holdProfileWrite = true; window.resumeOnboarding(); });
  await page.waitForFunction(() => window.__profileWrites.length === 2);
  await click('Get my free review →');
  assert.equal(await page.evaluate(() => window.__consentCalls), 0);
  await page.evaluate(() => { window.__holdProfileWrite = false; window.__resolveProfileWrite({}); });
  await page.waitForFunction(() => window.__handoffs.length === 1);
  assert.equal(await page.evaluate(() => window.__consentCalls), 1);
});

btest('a profile that has not loaded never turns untouched answers into explicit clears', async () => {
  await identity();
  await click('Continue');
  await offered();
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[0].onboarding_personalization)), {});
});

btest('logout preserves unacknowledged answers only for their originating account', async () => {
  await identity();
  await page.evaluate(() => { window.__failProfileWrite = true; });
  await click('Building my reel');
  await click('Continue');
  await offered();
  await page.evaluate(() => {
    window.unmountOnboarding();
    window.updateAccountState({__userId: null, __token: null});
    localStorage.removeItem('dst_onb_data');
    localStorage.removeItem('dst_onb_step_v3');
    window.updateAccountState({__userId: 99, __token: 'b'});
    window.resumeOnboarding();
  });
  await page.waitForSelector('fieldset');
  assert.equal(await page.evaluate(() => window.__profileWrites.length), 1);
  assert.equal(await page.$$eval('[aria-pressed="true"]', els => els.length), 0);
  await page.evaluate(() => {
    window.updateAccountState({__userId: null, __token: null});
    window.updateAccountState({__userId: 42, __token: 'a-new'});
    window.__failProfileWrite = false;
    window.resumeOnboarding();
  });
  await page.waitForFunction(() => window.__profileWrites.length === 2);
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.__profileWrites[1].onboarding_personalization)), {plate: 'building_reel'});
  await page.waitForFunction(() => localStorage.getItem('dst_onb_pending:42') === null);
});

btest('flag-off markup, draft, writes, and event payloads match the pre-ticket main flow', async () => {
  const onboardingSource = execFileSync('git', ['show', '4080179:src/panels/Onboarding/AuroraOnboarding.jsx'], {encoding: 'utf8', cwd: new URL('../', import.meta.url)});
  const baseline = await startHarness(0, {firstReviewFlow: false, onboardingSource});
  const current = await startHarness(0, {firstReviewFlow: false});
  async function capture(url) {
    const tab = await browser.newPage();
    try {
      await tab.goto(url);
      await tab.evaluate(() => window.mountOffer(0));
      await tab.waitForSelector('input');
      const snapshots = [];
      for (const step of [0, 1, 2]) {
        snapshots.push(await tab.$eval('#root', el => el.innerHTML));
        if (step === 0) {
          await tab.evaluate(() => {
            for (const text of ['SAG-AFTRA', 'she/her']) [...document.querySelectorAll('button')].find(b => b.textContent === text).click();
          });
        }
        await tab.evaluate(text => [...document.querySelectorAll('button')].find(b => b.textContent === text).click(), step === 2 ? 'Not now' : 'Continue');
        await tab.waitForFunction(expected => localStorage.getItem('dst_onb_step_v3') === expected, {}, step === 2 ? null : String(step + 1));
      }
      await tab.waitForFunction(() => window.__profileWrites.length === 1);
      return {snapshots, state: await tab.evaluate(() => ({writes: window.__profileWrites, events: window.__events, keys: Object.keys(localStorage)}))};
    } finally { await tab.close(); }
  }
  try { assert.deepEqual(await capture(current.url), await capture(baseline.url)); }
  finally { await baseline.close(); await current.close(); }
});
