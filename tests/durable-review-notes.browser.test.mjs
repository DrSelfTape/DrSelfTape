import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startHistoryHarness } from './durable-review-notes-harness.mjs';

// Matches the existing browser suite: use installed optional Puppeteer, add no
// dependency. A clean checkout without it explicitly skips these tests.
let puppeteer;
try { ({ default: puppeteer } = await import('puppeteer')); } catch { /* optional */ }
let harness, browser, page;
const errors = [];
before(async () => {
  if (!puppeteer) return;
  harness = await startHistoryHarness();
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(harness.url) ? request.continue() : request.abort());
});
after(async () => { await browser?.close(); await harness?.close(); });
const btest = (name, fn) => test(name, async t => puppeteer ? fn() : t.skip('puppeteer not installed'));

async function fresh(paid = true) {
  errors.length = 0;
  await page.goto(harness.url);
  await page.waitForFunction(() => typeof window.mountHistory === 'function');
  if (!paid) await page.evaluate(() => window.mountHistory(false));
  await page.waitForFunction(() => document.body.textContent.includes('Morgan'));
}
async function click(label) {
  const handle = await page.waitForFunction(text => [...document.querySelectorAll('button')].find(b => (b.textContent.includes(text) || b.getAttribute('aria-label') === text) && b.getClientRects().length), {}, label);
  await handle.asElement().click(); await handle.dispose();
}
async function open(role = 'Morgan') {
  await click(role);
  await page.waitForSelector('[role="dialog"] [role="status"]');
  await page.waitForFunction(() => window.__pending.length > 0);
}
async function resolve(feedback) {
  if (feedback === undefined) await page.evaluate(() => window.resolveReview());
  else await page.evaluate(value => window.resolveReview(value), feedback);
  await page.waitForSelector('[role="dialog"] [role="alert"]', { hidden: true });
  await page.waitForSelector('[role="dialog"] [role="status"]', { hidden: true });
}
const text = () => page.$eval('[role="dialog"]', node => node.textContent);

btest('history row fetches durable notes and renders the full real results after the job expired', async () => {
  await fresh(); await open();
  assert.match(await text(), /Loading your review/);
  assert.doesNotMatch(await text(), /CACHED/);
  assert.deepEqual(await page.evaluate(() => window.__requests.map(r => r.url)), ['/v1/ai/session-log/101/']);
  await resolve();
  const full = await text();
  for (const section of ['Quick read', "What's working", 'Your next take', 'Performance read', 'The one thing', 'Tape scores', 'Performance DNA']) assert.ok(full.includes(section), section);
  const fixture = await page.evaluate(() => window.__fullReview);
  for (const value of [fixture.verdict, fixture.the_one_thing, ...Object.values(fixture.performance)]) assert.ok(full.includes(value));
  assert.equal(await page.evaluate(() => localStorage.getItem('dst_personal_bests')), 'UNCHANGED');
  assert.equal(await page.evaluate(() => window.__modalCount), 1);
  assert.deepEqual(errors, []);
});

for (const legacyScores of [false, true]) {
  btest(`free history renders only the server-trimmed notes (legacy scores: ${legacyScores})`, async () => {
    await fresh(false); await open();
    const trimmed = { verdict: 'Your free headline', whats_working: ['An honest pause'], adjustments: [{ note: 'Listen before answering' }], tone_tags: ['Grounded'], headline_score: 7.2 };
    if (legacyScores) trimmed.scores = { framing: 9, eyeline: 9, lighting: 9, energy_commitment: 9, dynamic_range: 9 };
    await resolve(trimmed);
    const content = await text();
    for (const visible of ['Your free headline', 'An honest pause', 'Listen before answering', 'Grounded', '7.2/10', 'Unlock the full read']) assert.ok(content.includes(visible));
    for (const absent of ['CACHED', 'Performance read', 'The one thing', 'Performance DNA', 'Tape scores', '9.0/10']) assert.ok(!content.includes(absent), absent);
    await click('Share to Story');
    await page.waitForFunction(() => window.__saves.length === 1);
    const capture = await page.evaluate(() => window.__captures[0]);
    assert.match(capture.text, /Your free headline/);
    assert.doesNotMatch(capture.text, /CACHED|framing|Performance DNA/);
    assert.deepEqual(capture.dimensions, { width: 1080, height: 1920, scale: 1 });
    assert.deepEqual(errors, []);
  });
}

btest('history sharing uses both existing card templates and surfaces save failure for retry', async () => {
  await fresh(); await open(); await resolve();
  await page.evaluate(() => { window.__shareFails = true; });
  await click('Square post');
  await page.waitForSelector('[role="alert"]');
  assert.match(await text(), /Could not save your card/);
  await page.evaluate(() => { window.__shareFails = false; });
  await click('Square post');
  await page.waitForFunction(() => window.__saves.length === 2);
  assert.doesNotMatch(await text(), /Could not save your card/);
  const captures = await page.evaluate(() => window.__captures);
  assert.deepEqual(captures[1].dimensions, { width: 1080, height: 1080, scale: 1 });
  assert.ok(captures[1].text.includes((await page.evaluate(() => window.__fullReview.verdict)).slice(0, 30)));
  assert.equal(await page.evaluate(() => window.__saves[1].filename), 'my-tape-review.png');
  assert.deepEqual(await page.evaluate(() => window.__events.map(e => e.props)), [{ format: 'square', source: 'history' }, { format: 'square', source: 'history' }]);
  assert.deepEqual(errors, []);
});

btest('failed, missing and malformed responses show retry without cached notes', async () => {
  for (const failure of ['network', '404', 'empty', 'envelope-null', 'success-false']) {
    await fresh(); await open();
    await page.evaluate(kind => {
      const request = window.__pending[0];
      if (kind === 'network') request.reject(new Error('offline'));
      else if (kind === '404') request.reject({ response: { status: 404 } });
      else request.resolve({ data: kind === 'empty' ? null : kind === 'envelope-null' ? { data: null, success: true } : { success: false, data: { ai_feedback: window.__fullReview } } });
    }, failure);
    await page.waitForSelector('[role="alert"]');
    assert.doesNotMatch(await text(), /CACHED|Performance DNA/);
    if (failure === '404') assert.match(await text(), /no longer available/);
    await click('Try again');
    await page.waitForFunction(() => window.__pending.length === 2);
    await resolve({ verdict: 'Fetched after retry' });
    assert.match(await text(), /Fetched after retry/);
    assert.deepEqual(await page.evaluate(() => window.__requests.map(r => r.url)), ['/v1/ai/session-log/101/', '/v1/ai/session-log/101/']);
    assert.deepEqual(errors, []);
  }
});

btest('closing aborts the request and a late response cannot replace another session', async () => {
  await fresh(); await open();
  await click('Close review');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  assert.equal(await page.evaluate(() => window.__requests[0].options.signal.aborted), true);
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Morgan/);
  await open('Robin');
  await page.waitForFunction(() => window.__pending.length === 2);
  await resolve({ verdict: 'Robin current notes' });
  await page.evaluate(() => window.resolveReview({ verdict: 'Morgan stale response' }, 0));
  assert.match(await text(), /Robin current notes/);
  assert.doesNotMatch(await text(), /Morgan stale response/);
  assert.deepEqual(await page.evaluate(() => window.__requests.map(r => r.url)), ['/v1/ai/session-log/101/', '/v1/ai/session-log/102/']);
  assert.deepEqual(errors, []);
});

btest('reopening after a downgrade fetches fresh trimmed notes instead of prior full detail', async () => {
  await fresh(); await open(); await resolve();
  await click('Close review');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.evaluate(() => { window.__entitlement.isPaid = false; });
  await open();
  assert.doesNotMatch(await text(), /Performance DNA|The one thing/);
  await page.waitForFunction(() => window.__pending.length === 2);
  await resolve({ verdict: 'Fresh free read', headline_score: 6 });
  assert.match(await text(), /Fresh free read/);
  assert.doesNotMatch(await text(), /Performance DNA|The one thing|CACHED/);
  assert.equal(await page.evaluate(() => window.__requests.length), 2);
  assert.deepEqual(errors, []);
});

btest('older unknown, empty, plain-text and partial reviews remain readable', async () => {
  for (const [feedback, expected] of [
    [{ conversation_history: [{ role: 'coach', content: 'A legacy note' }] }, 'A legacy note'],
    [{}, 'No notes stored'], [{ _meta: { job_id: 'expired' } }, 'No notes stored'],
    [{ scores: {}, performance: {}, adjustments: [] }, 'Session Notes'],
    [null, 'No notes stored'], ['Older plain-text note', 'Older plain-text note'],
    [{ tone_tags: ['Grounded'] }, 'Grounded'], [{ adjustments: ['Keep listening'] }, 'Keep listening'],
  ]) {
    await fresh(); await open();
    await page.evaluate(value => window.resolveReview(value, 0, false), feedback);
    await page.waitForSelector('[role="status"]', { hidden: true });
    assert.ok((await text()).includes(expected));
    assert.deepEqual(errors, []);
  }
});

btest('non-review rows stay inert; touch opens once and keyboard focus stays in the sheet', async () => {
  await fresh();
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => /Live Scene|Compare Takes/.test(b.textContent))), false);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Morgan')).dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true })));
  await page.waitForSelector('[role="dialog"]');
  await page.waitForFunction(() => window.__pending.length === 1);
  await resolve();
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close review');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Square post/);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close review');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  assert.equal(await page.evaluate(() => window.__modalCount), 0);
  assert.equal(await page.evaluate(() => window.__requests.length), 1);
  assert.deepEqual(errors, []);
});
