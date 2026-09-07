import assert from 'node:assert/strict';
import {before, after, test} from 'node:test';
import puppeteer from 'puppeteer';
import {recoveryBundle} from './onboarding-recovery-harness.mjs';

let browser;
const bundles = new Map();
before(async () => {
  browser = await puppeteer.launch({headless: true});
  for (const flag of [true, false]) bundles.set(flag, await recoveryBundle(flag));
});
after(async () => {await browser?.close();});

async function open(t, flag = true) {
  // Pages in the default context share localStorage. A preceding test's draft
  // can preselect (and then toggle off) an answer or auto-retry on mount.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(2500);
  await page.setRequestInterception(true);
  page.on('request', req => req.isNavigationRequest() ? req.respond({status: 200, contentType: 'text/html', body: '<div id="root"></div>'}) : req.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  t.after(async () => {await context.close(); assert.deepEqual(errors, []);});
  await page.goto('https://test.invalid');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), []);
  await page.addScriptTag({content: bundles.get(flag)});
  await page.waitForSelector('input');
  return page;
}
async function click(page, text) {
  const button = await page.waitForFunction(label => [...document.querySelectorAll('button')].find(b => b.textContent === label && !b.disabled), {}, text);
  await button.asElement().evaluate(el => el.click());
  await button.dispose();
}

test('successful same-account refresh through the real HTTP interceptor saves and continues without logout', async t => {
  const page = await open(t);
  await click(page, 'Between jobs');
  await page.evaluate(() => {window.expireNext = true;});
  await click(page, 'Continue');
  await page.waitForFunction(() => sessionStorage.getItem('refreshed') === 'true');
  await page.waitForFunction(() => window.events.some(e => e.event === 'first_review_offer_shown'));
  assert.deepEqual(await page.evaluate(() => window.serverProfile.onboarding_personalization), {plate: 'between_jobs'});
  assert.equal(await page.evaluate(() => window.store.getState().auth.user.token), 'fresh');
  assert.equal(await page.evaluate(() => window.actions.includes('auth/logoutUser')), false);
  assert.equal(await page.evaluate(() => window.purges), 0);
  await click(page, 'Not now');
  await page.waitForFunction(() => localStorage.getItem('dst_onb_step_v3') === '2');
});

test('a successful nine-second refresh saves without session-expired logout', async t => {
  const page = await open(t);
  await click(page, 'Between jobs');
  await page.evaluate(() => {window.expireNext = true; window.refreshDelay = 9000;});
  assert.equal(await page.$eval('button[aria-pressed="true"]', el => el.textContent), 'Between jobs');
  await click(page, 'Continue');
  await page.waitForFunction(() => sessionStorage.getItem('refreshed') === 'true', {timeout: 12000});
  await page.waitForFunction(() => {
    const actions = JSON.parse(sessionStorage.getItem('actions') || '[]');
    return actions.includes('profile/updateProfile/fulfilled') || actions.includes('auth/logoutUser');
  });
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('actions')).includes('auth/logoutUser')), false);
  await page.waitForFunction(() => window.events.some(e => e.event === 'first_review_offer_shown'));
  assert.deepEqual(await page.evaluate(() => window.serverProfile.onboarding_personalization), {plate: 'between_jobs'});
  assert.equal(await page.evaluate(() => window.store.getState().auth.user.token), 'fresh');
  assert.equal(await page.evaluate(() => window.purges), 0);
});

test('QuotaExceededError cannot acknowledge answers before a real profile PATCH', async t => {
  const page = await open(t);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'dst_onb_pending:42') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
    window.holdWrites = true;
  });
  await click(page, 'Building my reel');
  await click(page, 'Yes');
  await click(page, 'Continue');
  await page.waitForFunction(() => window.attempts.length || window.events.some(e => e.event === 'first_review_offer_shown'));
  assert.equal(await page.evaluate(() => window.attempts.length), 1);
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_pending:42')), null);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dst_onb_data')).personalization_pending), true);
  assert.equal(await page.evaluate(() => window.accepted.length), 0);
  await page.evaluate(() => {window.holdWrites = false; window.releaseWrite();});
  await page.waitForFunction(() => window.events.some(e => e.event === 'first_review_offer_shown'));
  assert.deepEqual(await page.evaluate(() => window.serverProfile.onboarding_personalization), {plate: 'building_reel', taped_before: 'yes'});
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dst_onb_data')).personalization_pending), false);
});

for (const flag of [false, true]) test(`flag ${flag}: completion closes and really unmounts before a delayed profile save is acknowledged`, async t => {
  const page = await open(t, flag);
  await click(page, 'SAG-AFTRA');
  await click(page, 'she/her');
  await click(page, 'Continue');
  if (flag) await click(page, 'Not now');
  else await click(page, 'Continue');
  await page.evaluate(() => {window.holdWrites = true;});
  await click(page, flag ? 'Continue' : 'Not now');
  await page.waitForFunction(() => !!window.releaseWrite);
  await page.waitForSelector('[data-testid="closed"]');
  assert.equal(await page.$('h1'), null);
  if (!flag) await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 9000)));
  assert.equal(await page.evaluate(() => window.accepted.some(p => p.union_status)), false);
  await page.evaluate(() => {window.holdWrites = false; window.releaseWrite();});
  await page.waitForFunction(() => window.serverProfile.union_status === 'SAG-AFTRA');
  assert.equal(await page.evaluate(() => window.store.getState().profile.profile.pronouns), 'she/her');
  await page.waitForFunction(() => window.serverSettings.reader_onboarding_seen === true);
});

test('failed local answers flush from App despite the real desktop Home marking onboarding seen and routing away', async t => {
  const page = await open(t);
  await click(page, 'Building my reel');
  await click(page, 'Yes');
  await page.evaluate(() => {window.failWrites = true;});
  await click(page, 'Continue');
  await page.waitForFunction(() => window.events.some(e => e.event === 'first_review_offer_shown'));
  assert.ok(await page.evaluate(() => localStorage.getItem('dst_onb_pending:42')));
  await click(page, 'Parent closes onboarding');
  await page.waitForSelector('[data-testid="closed"]');
  await page.evaluate(() => {window.failWrites = false; window.mountApp();});
  await page.waitForSelector('[data-testid="jericho"]');
  await page.waitForFunction(() => window.serverSettings.reader_onboarding_seen === true);
  await page.waitForFunction(() => !!window.serverProfile.onboarding_personalization);
  assert.deepEqual(await page.evaluate(() => window.serverProfile.onboarding_personalization), {plate: 'building_reel', taped_before: 'yes'});
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_pending:42')), null);
  assert.equal(await page.$('fieldset'), null);
});

test('App leaves another actor’s pending answers alone and retries only when that actor authenticates', async t => {
  const page = await open(t);
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_onb_pending:42')), null);
  await page.evaluate(() => {
    localStorage.setItem('dst_onb_pending:99', JSON.stringify({plate: 'auditioning_now'}));
    window.serverSettings.reader_onboarding_seen = true;
    window.mountApp();
  });
  await page.waitForFunction(() => window.store.getState().userSettings.loaded);
  assert.deepEqual(await page.evaluate(() => window.attempts), []);
  assert.ok(await page.evaluate(() => localStorage.getItem('dst_onb_pending:99')));
  await page.evaluate(() => {window.logout(); window.serverProfile = {id: 99}; window.signIn(99);});
  await page.waitForFunction(() => localStorage.getItem('dst_onb_pending:99') === null);
  assert.deepEqual(await page.evaluate(() => window.serverProfile.onboarding_personalization), {plate: 'auditioning_now'});
});

test('a held PATCH returning 401 after login as another actor cannot refresh, replay or leave profile saving disabled', async t => {
  const page = await open(t);
  await click(page, 'Between jobs');
  await page.evaluate(() => {window.holdWrites = true; window.late401AfterHold = true;});
  await click(page, 'Continue');
  await page.waitForFunction(() => !!window.releaseWrite);
  assert.equal(await page.evaluate(() => window.store.getState().profile.updateLoading), true);
  // Join the existing writer so the assertion waits for its terminal result.
  await page.evaluate(() => {window.pendingSave = window.flushPersonalization();});
  await click(page, 'Parent closes onboarding');
  await page.waitForSelector('[data-testid="closed"]');
  assert.equal(await page.evaluate(async () => {
    window.logout(); window.serverProfile = {id: 99, first_name: 'B'}; window.signIn(99);
    window.holdWrites = false; window.releaseWrite();
    return await window.pendingSave;
  }), false);
  assert.equal(await page.evaluate(() => window.refreshes), 0);
  assert.equal(await page.evaluate(() => window.attempts.length), 1);
  assert.deepEqual(await page.evaluate(() => window.serverProfile), {id: 99, first_name: 'B'});
  assert.deepEqual(await page.evaluate(() => window.store.getState().profile), {profile: null, loading: false, updateLoading: false, error: null});
  assert.equal(await page.evaluate(() => window.actions.filter(a => a === 'auth/logoutUser').length), 1);
  assert.equal(await page.evaluate(() => window.purges), 0);
});

test('App retries on connectivity recovery with onboarding already seen, preserving newer pending answers during the request', async t => {
  const page = await open(t);
  await page.evaluate(() => {
    localStorage.setItem('dst_onb_pending:42', JSON.stringify({plate: 'building_reel'}));
    window.serverSettings.reader_onboarding_seen = true;
    window.failWrites = true;
    window.mountApp();
  });
  await page.waitForFunction(() => window.actions.includes('profile/updateProfile/rejected'));
  await page.evaluate(() => {window.failWrites = false; window.holdWrites = true; window.dispatchEvent(new Event('online'));});
  await page.waitForFunction(() => !!window.releaseWrite);
  await page.evaluate(() => {
    localStorage.setItem('dst_onb_pending:42', JSON.stringify({plate: 'between_jobs', taped_before: 'yes'}));
    window.holdWrites = false; window.releaseWrite();
  });
  await page.waitForFunction(() => localStorage.getItem('dst_onb_pending:42') === null);
  assert.deepEqual(await page.evaluate(() => window.serverProfile.onboarding_personalization), {plate: 'between_jobs', taped_before: 'yes'});
  assert.equal(await page.evaluate(() => window.accepted.length), 2);
});

test('closing then switching accounts cannot apply a delayed completion to the next account or mark it seen', async t => {
  const page = await open(t);
  await click(page, 'Continue');
  await click(page, 'Not now');
  await page.evaluate(() => {window.holdWrites = true;});
  await click(page, 'Continue');
  await page.waitForSelector('[data-testid="closed"]');
  await page.waitForFunction(() => !!window.releaseWrite);
  const fulfilledBefore = await page.evaluate(() => window.actions.filter(a => a === 'profile/updateProfile/fulfilled').length);
  await page.evaluate(() => {window.logout(); window.signIn(99); window.holdWrites = false; window.releaseWrite();});
  await page.waitForFunction(() => window.accepted.some(p => p.first_name));
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 20)));
  assert.equal(await page.evaluate(() => window.actions.filter(a => a === 'profile/updateProfile/fulfilled').length), fulfilledBefore);
  assert.equal(await page.evaluate(() => window.serverSettings.reader_onboarding_seen), undefined);
  assert.equal(await page.evaluate(() => window.store.getState().auth.user.id), 99);
});

test('unmount during personalization still observes logout and login to the same actor before any deferred identity save', async t => {
  const page = await open(t);
  await click(page, 'Between jobs');
  await page.evaluate(() => {window.holdWrites = true;});
  await click(page, 'SKIP');
  await page.waitForFunction(() => !!window.releaseWrite);
  await click(page, 'Parent closes onboarding');
  await page.waitForSelector('[data-testid="closed"]');
  await page.evaluate(() => {window.logout(); window.signIn(42); window.holdWrites = false; window.releaseWrite();});
  await page.waitForFunction(() => window.accepted.length === 1);
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 20)));
  assert.equal(await page.evaluate(() => window.attempts.length), 1);
  assert.equal(await page.evaluate(() => window.actions.includes('profile/updateProfile/fulfilled')), false);
  assert.ok(await page.evaluate(() => localStorage.getItem('dst_onb_pending:42')));
  assert.equal(await page.evaluate(() => window.serverSettings.reader_onboarding_seen), undefined);
});
